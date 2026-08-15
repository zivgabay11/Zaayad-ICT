import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Task } from '../../common/utilities/types';

export interface ContextMenuState {
    x: number;
    y: number;
    task?: Task;
    rowId?: string;
    timeMs?: number;
}

interface GanttContextMenuProps {
    menu: ContextMenuState;
    onClose: () => void;
    onNewTask: (rowId?: string, timeMs?: number) => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (task: Task) => void;
}

export const GanttContextMenu: React.FC<GanttContextMenuProps> = ({
    menu,
    onClose,
    onNewTask,
    onEditTask,
    onDeleteTask,
}) => {
    const { t } = useTranslation();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = () => onClose();
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="fixed z-[100] min-w-[160px] py-1 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-slate-200 dark:border-zinc-700"
            style={{ left: menu.x, top: menu.y }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {menu.task && (
                <>
                    <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors text-start"
                        onClick={() => { onEditTask(menu.task!); onClose(); }}
                    >
                        <Pencil size={14} />
                        {t('Edit Task')}
                    </button>
                    <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-start"
                        onClick={() => { onDeleteTask(menu.task!); onClose(); }}
                    >
                        <Trash2 size={14} />
                        {t('Delete Task')}
                    </button>
                    <div className="h-px bg-slate-200 dark:bg-zinc-700 my-1" />
                </>
            )}
            <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors text-start"
                onClick={() => { onNewTask(menu.rowId, menu.timeMs); onClose(); }}
            >
                <Plus size={14} />
                {t('New Task')}
            </button>
        </div>
    );
};
