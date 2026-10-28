import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { BumDemand, BumDemandStatus } from '../../common/utilities/types';
import { BUM_STATUS_STRIPE } from '../utilities/bum';
import { DemandCard } from './DemandCard';

// Kanban ("חלוקה") — one droppable column per lifecycle status, demands as draggable cards
// (PRD story 11: drag a card between columns to change its status). Cards sit in the order
// the caller passes them (the screen sorts by due date).

interface Props {
    demands: BumDemand[];
    statuses: BumDemandStatus[];
    categoryLabelOf: (demand: BumDemand) => string;
    now: number;
    dense?: boolean;
    onOpen: (demand: BumDemand) => void;
    onDelete: (demand: BumDemand) => void;
    onStatusChange: (id: string, status: BumDemandStatus) => void;
}

const DraggableCard: React.FC<{ demand: BumDemand; props: Omit<Props, 'demands' | 'statuses' | 'onStatusChange' | 'categoryLabelOf'> & { categoryLabel: string } }> = ({ demand, props }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: demand.id });
    return (
        <div ref={setNodeRef} {...listeners} {...attributes} className={`touch-none ${isDragging ? 'opacity-30' : ''}`} data-demand-id={demand.id}>
            <DemandCard demand={demand} categoryLabel={props.categoryLabel} now={props.now} dense={props.dense} onOpen={props.onOpen} onDelete={props.onDelete} />
        </div>
    );
};

const Column: React.FC<{ status: BumDemandStatus; demands: BumDemand[]; categoryLabelOf: Props['categoryLabelOf']; now: number; dense?: boolean; onOpen: Props['onOpen']; onDelete: Props['onDelete'] }> = ({ status, demands, categoryLabelOf, now, dense, onOpen, onDelete }) => {
    const { t } = useTranslation();
    const { setNodeRef, isOver } = useDroppable({ id: status });
    return (
        <div
            ref={setNodeRef}
            data-status-column={status}
            className={`flex-1 ${dense ? 'min-w-[200px]' : 'min-w-[250px]'} flex flex-col rounded-xl border transition-colors ${isOver
                ? 'border-primary bg-primary/10'
                : 'border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.04]'}`}
        >
            <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 shrink-0">
                <h3 className="flex items-center gap-2 text-[17px] font-bold text-slate-900 dark:text-white">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: BUM_STATUS_STRIPE[status] }} />
                    {t(`bumManager.status.${status}`)}
                </h3>
                <span className="text-[13px] text-slate-500 dark:text-zinc-400">{t('bumManager.kanban.tasksCount', { count: demands.length })}</span>
            </div>
            <div className="bum-scroll flex-1 min-h-0 overflow-y-auto px-2.5 pb-3 flex flex-col gap-2.5">
                {demands.length === 0 && (
                    <div className="mt-6 text-center text-xs text-slate-400 dark:text-zinc-600">{t('bumManager.kanban.empty')}</div>
                )}
                {demands.map(d => (
                    <DraggableCard key={d.id} demand={d} props={{ categoryLabel: categoryLabelOf(d), now, dense, onOpen, onDelete }} />
                ))}
            </div>
        </div>
    );
};

export const BumKanbanBoard: React.FC<Props> = ({ demands, statuses, categoryLabelOf, now, dense, onOpen, onDelete, onStatusChange }) => {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    const [activeId, setActiveId] = useState<string | null>(null);
    const active = demands.find(d => d.id === activeId) ?? null;

    const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
    const handleDragEnd = (e: DragEndEvent) => {
        setActiveId(null);
        const target = e.over?.id as BumDemandStatus | undefined;
        const dragged = demands.find(d => d.id === e.active.id);
        if (dragged && target && statuses.includes(target) && target !== dragged.status) onStatusChange(dragged.id, target);
    };

    return (
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
            <div className="bum-scroll h-full flex gap-3 overflow-x-auto">
                {statuses.map(status => (
                    <Column
                        key={status}
                        status={status}
                        demands={demands.filter(d => d.status === status)}
                        categoryLabelOf={categoryLabelOf}
                        now={now}
                        dense={dense}
                        onOpen={onOpen}
                        onDelete={onDelete}
                    />
                ))}
            </div>
            <DragOverlay dropAnimation={null}>
                {active ? (
                    <div className="rotate-1 shadow-2xl">
                        <DemandCard demand={active} categoryLabel={categoryLabelOf(active)} now={now} dense={dense} onOpen={() => undefined} onDelete={() => undefined} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
