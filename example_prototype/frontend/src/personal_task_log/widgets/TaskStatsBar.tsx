import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { PersonalTaskStats, PERSONAL_TASK_STATUS_ORDER } from '../utilities/personalTaskLog';
import { PersonalTaskStatus } from '../../common/utilities/types';

interface TaskStatsBarProps {
    stats: PersonalTaskStats;
    visible: Set<PersonalTaskStatus>;
    onToggle: (status: PersonalTaskStatus) => void;
    onDropItem: (taskId: string, status: PersonalTaskStatus) => void;
}

// Status filter panel (Figma "task manager"): one card per status with a checkbox and the real
// count in a small box. Ticking a status shows its section in the list. Each card is also a
// drop target — dragging a task row onto it changes the task's status, as before.
export const TaskStatsBar: React.FC<TaskStatsBarProps> = ({ stats, visible, onToggle, onDropItem }) => {
    const { t } = useTranslation();
    const [dragOverStatus, setDragOverStatus] = useState<PersonalTaskStatus | null>(null);

    return (
        <div className="w-[128px] shrink-0 space-y-2" role="group" aria-label={t('personalTaskLog.filterTitle')}>
            {PERSONAL_TASK_STATUS_ORDER.map(status => {
                const checked = visible.has(status);
                return (
                    <label
                        key={status}
                        onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status); }}
                        onDragLeave={() => setDragOverStatus(prev => (prev === status ? null : prev))}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragOverStatus(null);
                            const taskId = e.dataTransfer.getData('text/plain');
                            if (taskId) onDropItem(taskId, status);
                        }}
                        data-status-filter={status}
                        className={`flex items-center justify-between gap-2 h-8 px-2 rounded-[6px] border cursor-pointer select-none transition-colors ${dragOverStatus === status
                            ? 'border-primary bg-primary/10'
                            : 'border-slate-200 bg-white dark:border-[var(--figma-ptl-filter-border)] dark:bg-[var(--figma-ptl-filter-bg)] hover:border-slate-300 dark:hover:brightness-110'}`}
                    >
                        <span className="flex items-center gap-1.5 min-w-0">
                            <span
                                className={`flex items-center justify-center w-3 h-3 rounded-[3px] border shrink-0 transition-colors ${checked
                                    ? 'bg-[var(--figma-ptl-check)] border-[var(--figma-ptl-check)] text-white'
                                    : 'border-slate-300 dark:border-[var(--figma-ptl-count-border)] dark:bg-[var(--figma-ptl-checkbox-bg)]'}`}
                            >
                                {checked && <Check className="w-2.5 h-2.5" strokeWidth={3.5} />}
                            </span>
                            <input type="checkbox" className="sr-only" checked={checked} onChange={() => onToggle(status)} />
                            <span className="text-xs font-bold leading-4 text-slate-900 dark:text-white truncate">{t(`personalTaskLog.filterLabels.${status}`)}</span>
                        </span>
                        <span className="flex items-center justify-center min-w-[18px] h-4 px-1 rounded-[3px] border text-[10px] leading-none font-medium text-slate-600 dark:text-zinc-300 border-slate-300 bg-slate-50 dark:border-[var(--figma-ptl-count-border)] dark:bg-[var(--figma-ptl-count-bg)]">
                            {stats[status]}
                        </span>
                    </label>
                );
            })}
        </div>
    );
};
