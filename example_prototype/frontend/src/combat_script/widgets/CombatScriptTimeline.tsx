import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, Range, ResizeEndEvent } from 'dnd-timeline';
import { TimelineContext, groupItemsToSubrows, useTimelineContext } from 'dnd-timeline';
import { useTranslation } from 'react-i18next';
import type { Plan, Task } from '../../common/utilities/types';
import { mockUnits } from '../../common/utilities/mockData';
import { getUnitColor } from '../../common/utilities/colors';
import {
    tasksToTimelineItems,
    unitsToRows,
    computeDefaultRange,
    spanToOffsetHours,
    getBaseTimestamp,
    type TimelineTaskItem,
} from '../utilities/timelineHelpers';
import { CombatScriptRow } from './CombatScriptRow';
import { CombatScriptSidebar } from './CombatScriptSidebar';
import { CombatScriptItem } from './CombatScriptItem';
import { TimeAxis } from './TimeAxis';
import { TaskDetailsPanel } from './TaskDetailsPanel';
import { GanttContextMenu, type ContextMenuState } from './GanttContextMenu';

interface CombatScriptTimelineProps {
    tasks: Task[];
    plan: Plan;
    sessionUnitCode: number;
    onUpdateTask: (task: Task) => void;
    onEditTask: (task: Task) => void;
    onCreateTask: (defaults: Partial<Task>) => void;
    onDeleteTask: (taskId: string) => void;
}

// Inner timeline component that uses the context
const TimelineInner: React.FC<{
    items: TimelineTaskItem[];
    rows: { id: string }[];
    plan: Plan;
    sessionUnitCode: number;
    dir: 'ltr' | 'rtl';
    onTaskClick: (task: Task, e: React.MouseEvent) => void;
    onRowContextMenu: (e: React.MouseEvent, rowId: string, timeMs: number) => void;
    onItemContextMenu: (e: React.MouseEvent, task: Task, rowId: string, timeMs: number) => void;
}> = ({ items, rows, plan, sessionUnitCode, dir, onTaskClick, onRowContextMenu, onItemContextMenu }) => {
    const { setTimelineRef, style, range, getValueFromScreenX, valueToPixels, sidebarWidth } = useTimelineContext();

    const groupedSubrows = useMemo(
        () => groupItemsToSubrows(items, range),
        [items, range],
    );

    const planUnitCodes = plan.units.map(u => u.code);
    const sessionUnit = mockUnits.find(u => u.code === sessionUnitCode) || null;

    const getColor = useCallback((unitCode: string) => {
        if (unitCode === 'unassigned') return '#9CA3AF';
        const code = parseInt(unitCode, 10);
        if (isNaN(code)) return '#9CA3AF';
        return getUnitColor(code, sessionUnit as any, planUnitCodes, mockUnits);
    }, [sessionUnit, planUnitCodes]);

    const baseTimestamp = getBaseTimestamp(plan);
    const isBaseTimeVisible = baseTimestamp >= range.start && baseTimestamp <= range.end;
    const baseTimeOffset = valueToPixels(baseTimestamp - range.start);

    return (
        <div ref={setTimelineRef} style={{ ...style, direction: dir === 'rtl' ? 'rtl' : 'ltr' }} className="relative" dir={dir}>
            <TimeAxis plan={plan} />

            {/* D-Day / H-Hour Vertical Line */}
            {isBaseTimeVisible && (
                <div
                    className="absolute top-10 bottom-0 w-px bg-sky-400 z-20 pointer-events-none"
                    style={
                        dir === 'rtl'
                            ? { right: sidebarWidth + baseTimeOffset }
                            : { left: sidebarWidth + baseTimeOffset }
                    }
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-sky-400" />
                </div>
            )}

            {rows.map((row, idx) => {
                const color = getColor(row.id);
                return (
                    <CombatScriptRow
                        key={row.id}
                        id={row.id}
                        sidebar={<CombatScriptSidebar unitCode={row.id} color={color} />}
                        isEven={idx % 2 === 0}
                        onContextMenu={(e) => onRowContextMenu(e, row.id, getValueFromScreenX(e.clientX))}
                        subrowCount={groupedSubrows[row.id]?.length || 1}
                    >
                        {groupedSubrows[row.id]?.map((subrow, subIdx) =>
                            subrow.map((item) => {
                                const taskItem = item as TimelineTaskItem;
                                return (
                                    <CombatScriptItem
                                        key={item.id}
                                        id={item.id}
                                        span={item.span}
                                        task={taskItem.task}
                                        color={color}
                                        onClick={onTaskClick}
                                        onContextMenu={(e) => onItemContextMenu(e, taskItem.task, row.id, getValueFromScreenX(e.clientX))}
                                        subrowIndex={subIdx}
                                        subrowCount={groupedSubrows[row.id]?.length || 1}
                                    />
                                );
                            })
                        )}
                    </CombatScriptRow>
                );
            })}
        </div>
    );
};

export const CombatScriptTimeline: React.FC<CombatScriptTimelineProps> = ({
    tasks,
    plan,
    sessionUnitCode,
    onUpdateTask,
    onEditTask,
    onCreateTask,
    onDeleteTask,
}) => {
    const { i18n } = useTranslation();
    const [range, setRange] = useState<Range>(() => computeDefaultRange(plan));
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [taskClickPos, setTaskClickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
    );

    const items = useMemo(() => tasksToTimelineItems(tasks, plan), [tasks, plan]);
    const rows = useMemo(() => unitsToRows(plan), [plan]);

    const onDragEnd = useCallback((event: DragEndEvent) => {
        const activeItemId = event.active.id as string;
        const activeRowId = event.over?.id as string;

        if (!activeRowId) return;

        const updatedSpan = event.active.data.current?.getSpanFromDragEvent?.(event);
        if (!updatedSpan) return;

        const task = tasks.find(t => t.id === activeItemId);
        if (!task) return;

        const offsets = spanToOffsetHours(updatedSpan, plan);
        const updatedTask: Task = {
            ...task,
            primaryUnitId: activeRowId === 'unassigned' ? undefined : activeRowId,
            startOffsetHours: offsets.startOffsetHours,
            endOffsetHours: offsets.endOffsetHours,
        };

        onUpdateTask(updatedTask);
    }, [tasks, plan, onUpdateTask]);

    const onResizeEnd = useCallback((event: ResizeEndEvent) => {
        const activeItemId = event.active.id as string;
        const updatedSpan = event.active.data.current?.getSpanFromResizeEvent?.(event);

        if (!updatedSpan) return;

        const task = tasks.find(t => t.id === activeItemId);
        if (!task) return;

        const offsets = spanToOffsetHours(updatedSpan, plan);
        const updatedTask: Task = {
            ...task,
            startOffsetHours: offsets.startOffsetHours,
            endOffsetHours: offsets.endOffsetHours,
        };

        onUpdateTask(updatedTask);
    }, [tasks, plan, onUpdateTask]);

    const onRangeChanged = useCallback((updateFn: (prev: Range) => Range) => {
        setRange(prev => updateFn(prev));
    }, []);

    const handleTaskClick = useCallback((task: Task, e: React.MouseEvent) => {
        setSelectedTask(prev => prev?.id === task.id ? null : task);
        setTaskClickPos({ x: e.clientX, y: e.clientY });
    }, []);

    const handleEmptyClick = useCallback((rowId: string) => {
        const defaults: Partial<Task> = {};
        if (rowId !== 'unassigned') {
            defaults.primaryUnitId = rowId;
        }
        onCreateTask(defaults);
    }, [onCreateTask]);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    const handleRowContextMenu = useCallback((e: React.MouseEvent, rowId: string, timeMs: number) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, rowId, timeMs });
    }, []);

    const handleItemContextMenu = useCallback((e: React.MouseEvent, task: Task, rowId: string, timeMs: number) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, task, rowId, timeMs });
    }, []);

    const handleContextNewTask = useCallback((rowId?: string, timeMs?: number) => {
        const defaults: Partial<Task> = {};
        if (rowId && rowId !== 'unassigned') {
            defaults.primaryUnitId = rowId;
        }

        if (timeMs !== undefined) {
            const HOUR_MS = 3600000;
            const span = { start: timeMs, end: timeMs + 2 * HOUR_MS };
            const offsets = spanToOffsetHours(span, plan);
            defaults.startOffsetHours = offsets.startOffsetHours;
            defaults.endOffsetHours = offsets.endOffsetHours;
        }

        onCreateTask(defaults);
    }, [onCreateTask, plan]);

    const handleContextEditTask = useCallback((task: Task) => {
        onEditTask(task);
    }, [onEditTask]);

    const handleContextDeleteTask = useCallback((task: Task) => {
        onDeleteTask(task.id);
    }, [onDeleteTask]);

    // Panning state
    const isPanning = useRef(false);
    const panStartX = useRef(0);
    const panStartRange = useRef<Range>({ start: 0, end: 0 });

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        // Only pan with primary button on the container background (not on items)
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        // Don't pan if clicking on an interactive item
        if (target.closest('[data-timeline-item]')) return;

        isPanning.current = true;
        panStartX.current = e.clientX;
        panStartRange.current = { ...range };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.style.cursor = 'grabbing';
    }, [range]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isPanning.current) return;
        const deltaX = e.clientX - panStartX.current;
        const duration = panStartRange.current.end - panStartRange.current.start;
        const containerWidth = e.currentTarget.clientWidth - 140; // subtract sidebar

        // Natural pan: drag right → content moves right.
        // In LTR: reveals left side (earlier time) → range decreases
        // In RTL: reveals left side (LATER time) → range increases
        const isRtl = i18n.language === 'he';
        const sign = isRtl ? 1 : -1;
        const timeDelta = sign * (deltaX / containerWidth) * duration;

        setRange({
            start: panStartRange.current.start + timeDelta,
            end: panStartRange.current.end + timeDelta,
        });
    }, [i18n.language]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isPanning.current) return;
        isPanning.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
        e.currentTarget.style.cursor = '';
    }, []);

    return (
        <div className="relative flex-1 min-h-0 overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
            <TimelineContext
                key={i18n.language}
                range={range}
                onDragEnd={onDragEnd}
                onResizeEnd={onResizeEnd}
                onRangeChanged={onRangeChanged}
                sidebarWidth={140}
                sensors={sensors}
            >
                <div
                    className="h-full overflow-auto cursor-grab"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                >
                    <TimelineInner
                        items={items}
                        rows={rows}
                        plan={plan}
                        sessionUnitCode={sessionUnitCode}
                        dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
                        onTaskClick={handleTaskClick}
                        onRowContextMenu={handleRowContextMenu}
                        onItemContextMenu={handleItemContextMenu}
                    />
                </div>
            </TimelineContext>

            {/* Context Menu */}
            {contextMenu && (
                <GanttContextMenu
                    menu={contextMenu}
                    onClose={() => setContextMenu(null)}
                    onNewTask={handleContextNewTask}
                    onEditTask={handleContextEditTask}
                    onDeleteTask={handleContextDeleteTask}
                />
            )}

            {/* Task Details Panel */}
            {selectedTask && (
                <TaskDetailsPanel
                    task={selectedTask}
                    plan={plan}
                    position={taskClickPos}
                    onClose={() => setSelectedTask(null)}
                    onEdit={(task) => {
                        setSelectedTask(null);
                        onEditTask(task);
                    }}
                />
            )}
        </div>
    );
};
