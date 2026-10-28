import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PersonalTaskStatus } from '../../common/utilities/types';
import { TaskLogItem } from '../utilities/personalTaskLog';
import { TaskCard } from './TaskCard';

interface TaskStatusSectionProps {
    status: PersonalTaskStatus;
    items: TaskLogItem[];
    defaultOpen?: boolean;
    onView: (item: TaskLogItem) => void;
    onEdit: (item: TaskLogItem) => void;
    onRemove: (item: TaskLogItem) => void;
    onContextMenu?: (e: React.MouseEvent, item: TaskLogItem) => void;
    onDropItem: (itemId: string, status: PersonalTaskStatus) => void;
}

export const TaskStatusSection: React.FC<TaskStatusSectionProps> = ({ status, items, defaultOpen, onView, onEdit, onRemove, onContextMenu, onDropItem }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(!!defaultOpen);
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const itemId = e.dataTransfer.getData('text/plain');
                if (itemId) onDropItem(itemId, status);
            }}
            className={`rounded-[10px] border overflow-hidden transition-colors ${isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 dark:border-[#383a3f] bg-slate-50/60 dark:bg-white/[0.04]'
                }`}
        >
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 text-start"
            >
                <span className="font-bold text-slate-900 dark:text-white text-lg leading-[26px]">{t(`personalTaskLog.statuses.${status}`)}</span>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400 dark:text-zinc-400">{t('personalTaskLog.taskCount', { count: items.length })}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
            </button>
            {isOpen && (
                <div className="px-3 pb-3 space-y-2">
                    {items.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-zinc-500 px-1 pb-2">{t('personalTaskLog.empty')}</p>
                    ) : (
                        items.map(item => (
                            <TaskCard
                                key={item.id}
                                item={item}
                                onView={() => onView(item)}
                                onEdit={() => onEdit(item)}
                                onRemove={() => onRemove(item)}
                                onContextMenu={onContextMenu ? (e) => onContextMenu(e, item) : undefined}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
