import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PersonalTaskStats, PERSONAL_TASK_STATUS_ORDER, PERSONAL_TASK_STATUS_ACCENT } from '../utilities/personalTaskLog';
import { PersonalTaskStatus } from '../../common/utilities/types';

interface TaskStatsBarProps {
    stats: PersonalTaskStats;
    onDropItem: (taskId: string, status: PersonalTaskStatus) => void;
}

// Vertical stats panel (per the Figma alternate layout) — one real count per status plus a
// total, stacked at the top-right of the content area instead of a horizontal bar. Doubles
// as a drop target: dragging a task card onto a tile changes its status, same as dropping
// it into the matching accordion section.
export const TaskStatsBar: React.FC<TaskStatsBarProps> = ({ stats, onDropItem }) => {
    const { t } = useTranslation();
    const [dragOverStatus, setDragOverStatus] = useState<PersonalTaskStatus | null>(null);

    return (
        <div className="w-48 shrink-0 space-y-2">
            <div className="flex flex-col justify-center px-3 py-2.5 rounded-2xl border-s-2 border-primary bg-white dark:bg-gradient-to-b dark:from-[#43464d] dark:to-[#333844] border-y border-e border-slate-200 dark:border-y-0 dark:border-e-0 shadow-[0_1px_4px_rgba(0,0,0,0.25)]">
                <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">{t('personalTaskLog.stats.total')}</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stats.total}</span>
            </div>
            {PERSONAL_TASK_STATUS_ORDER.map(status => (
                <div
                    key={status}
                    onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status); }}
                    onDragLeave={() => setDragOverStatus(prev => (prev === status ? null : prev))}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOverStatus(null);
                        const taskId = e.dataTransfer.getData('text/plain');
                        if (taskId) onDropItem(taskId, status);
                    }}
                    className={`relative flex items-center justify-between px-3 py-2.5 rounded-2xl border overflow-hidden transition-colors shadow-[0_1px_4px_rgba(0,0,0,0.25)] ${dragOverStatus === status
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 dark:border-transparent bg-white dark:bg-gradient-to-b dark:from-[#43464d] dark:to-[#333844]'
                        }`}
                >
                    <span className="absolute inset-y-0 start-0 w-1" style={{ background: PERSONAL_TASK_STATUS_ACCENT[status] }} />
                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 ps-1.5">{t(`personalTaskLog.statuses.${status}`)}</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{stats[status]}</span>
                </div>
            ))}
        </div>
    );
};
