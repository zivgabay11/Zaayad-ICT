import React from 'react';
import type { Span } from 'dnd-timeline';
import { useItem, useTimelineContext } from 'dnd-timeline';
import { useTranslation } from 'react-i18next';
import type { Task } from '../../common/utilities/types';

interface CombatScriptItemProps {
    id: string;
    span: Span;
    task: Task;
    color: string;
    onClick: (task: Task, e: React.MouseEvent) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    subrowIndex?: number;
    subrowCount?: number;
}

const SUBROW_HEIGHT = 38;

export const CombatScriptItem: React.FC<CombatScriptItemProps> = ({ id, span, task, color, onClick, onContextMenu, subrowIndex = 0, subrowCount = 1 }) => {
    const { i18n } = useTranslation();
    const lang = i18n.language;

    const { setNodeRef, attributes, listeners, itemStyle, itemContentStyle } = useItem({
        id,
        span,
        resizeHandleWidth: 24,
    });

    const taskName = task.name?.[lang] || task.name?.he || task.name?.en || '';
    const isRtl = lang === 'he';

    // Override vertical position based on subrow
    // When there's only 1 subrow, stretch to fill the full row height
    const rowContentHeight = Math.max(2, subrowCount) * SUBROW_HEIGHT + 8;
    const adjustedItemStyle = {
        ...itemStyle,
        top: subrowCount === 1 ? 4 : subrowIndex * SUBROW_HEIGHT + 4,
        height: subrowCount === 1 ? rowContentHeight - 8 : SUBROW_HEIGHT - 4,
    };

    return (
        <div
            ref={setNodeRef}
            style={adjustedItemStyle}
            {...listeners}
            {...attributes}
            data-timeline-item
            onClick={(e) => {
                e.stopPropagation();
                onClick(task, e);
            }}
            onContextMenu={(e) => {
                e.stopPropagation();
                onContextMenu?.(e);
            }}
        >
            {/* Left resize handle cursor zone */}
            <div className="absolute top-0 left-0 w-6 h-full cursor-col-resize z-10" />
            {/* Right resize handle cursor zone */}
            <div className="absolute top-0 right-0 w-6 h-full cursor-col-resize z-10" />
            <div style={itemContentStyle}>
                <div
                    className="select-none h-full w-full rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-sm overflow-hidden flex items-stretch cursor-pointer hover:shadow-md transition-shadow"
                    dir={isRtl ? 'rtl' : 'ltr'}
                >
                    {/* Color side bar */}
                    <div
                        className="w-1.5 shrink-0 rounded-s-md"
                        style={{ backgroundColor: color }}
                    />
                    {/* Content */}
                    <div className="flex-1 min-w-0 px-2 py-1 flex flex-col justify-center text-start">
                        <span className={`font-semibold text-slate-800 dark:text-zinc-100 leading-tight ${subrowCount === 1 ? 'text-sm line-clamp-2' : 'text-xs truncate'}`}>
                            {taskName}
                        </span>
                        {task.primaryUnitId && (
                            <span className={`text-slate-500 dark:text-zinc-400 truncate leading-tight mt-0.5 ${subrowCount === 1 ? 'text-xs' : 'text-[10px]'}`}>
                                {task.primaryUnitId}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
