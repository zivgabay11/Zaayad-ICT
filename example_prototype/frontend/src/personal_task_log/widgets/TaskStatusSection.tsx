import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PersonalTaskStatus } from '../../common/utilities/types';
import { TaskLogItem } from '../utilities/personalTaskLog';
import { TaskCard } from './TaskCard';

interface TaskStatusSectionProps {
    status: PersonalTaskStatus;
    items: TaskLogItem[];
    onView: (item: TaskLogItem) => void;
    onEdit: (item: TaskLogItem) => void;
    onRemove: (item: TaskLogItem) => void;
    onToggleDone: (item: TaskLogItem) => void;
    onContextMenu?: (e: React.MouseEvent, item: TaskLogItem) => void;
    onDropItem: (itemId: string, status: PersonalTaskStatus) => void;
}

// One status block of the task manager: bold title + muted count, then one full-width row per
// task. The whole block is a drop target for changing a task's status by drag & drop.
export const TaskStatusSection: React.FC<TaskStatusSectionProps> = ({ status, items, onView, onEdit, onRemove, onToggleDone, onContextMenu, onDropItem }) => {
    const { t } = useTranslation();
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <section
            data-status-section={status}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const itemId = e.dataTransfer.getData('text/plain');
                if (itemId) onDropItem(itemId, status);
            }}
            className={`rounded-lg transition-colors ${isDragOver ? 'bg-primary/5 outline outline-1 outline-primary' : ''}`}
        >
            <div className="flex items-baseline gap-2 mb-2">
                <h2 className="text-base font-bold leading-6 text-slate-900 dark:text-white">{t(`personalTaskLog.sectionTitles.${status}`)}</h2>
                <span className="text-xs text-slate-400 dark:text-[var(--figma-ptl-muted)]">{t('personalTaskLog.taskCount', { count: items.length })}</span>
            </div>
            <div className="space-y-2">
                {items.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-[var(--figma-ptl-muted)] px-1">{t('personalTaskLog.empty')}</p>
                ) : (
                    items.map(item => (
                        <TaskCard
                            key={item.id}
                            item={item}
                            onView={() => onView(item)}
                            onEdit={() => onEdit(item)}
                            onRemove={() => onRemove(item)}
                            onToggleDone={() => onToggleDone(item)}
                            onContextMenu={onContextMenu ? (e) => onContextMenu(e, item) : undefined}
                        />
                    ))
                )}
            </div>
        </section>
    );
};
