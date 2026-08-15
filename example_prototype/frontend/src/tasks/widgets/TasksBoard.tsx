import React from 'react';
import { Task, Plan, TaskStatus } from '../../common/utilities/types';
import { useTranslation } from 'react-i18next';
import { mockPhases, mockUnits } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';

export const TasksBoard: React.FC<{ tasks: Task[], plan: Plan, onUpdateTask?: (task: Task) => void, onOpenDialog?: (initial: Partial<Task>) => void }> = ({ tasks, plan, onUpdateTask, onOpenDialog }) => {

    const { t, i18n } = useTranslation();

    const getUnitName = (code: string | undefined) => {
        if (!code) return t('Unassigned');
        const globalUnit = mockUnits.find(u => u.code?.toString() === code);
        if (globalUnit) {
            return formatUnitName(globalUnit, t, i18n.language);
        }
        return code;
    };

    const formatOffset = (hours?: number) => {
        if (hours === undefined) return '';
        const d = Math.floor(hours / 24);
        const h = hours % 24;
        if (d === 0) return `${t('H')}${h >= 0 ? '+' : ''}${h}`;
        return `${t('D')}${d >= 0 ? '+' : ''}${d}`;
    };


    const getPhaseDetails = (phaseId?: string) => {
        if (!phaseId) return null;
        const p = plan.phases.find(ph => ph.id === phaseId);
        if (!p) return null;

        const matched = mockPhases.find(mp => mp.index === p.index);
        const localizedName = matched ? (matched.name[(i18n.language as 'en' | 'he')] || matched.name['en']) : p.index.toString();
        const fallbackName = `${t('Phase')} ${localizedName}`;
        const phaseName = p.index === -1 && p.title ? p.title[i18n.language] || p.title['en'] : fallbackName;

        const title = p.title;

        const startLabel = formatOffset(p.startOffsetHours);
        const endLabel = formatOffset(p.endOffsetHours);
        const range = startLabel || endLabel ? `(${startLabel} ${t('to')} ${endLabel})` : '';

        return { title, phaseName, range };
    };


    const getTaskStyle = (status: Task['status']) => {
        switch (status) {
            case 'To Do': return 'bg-slate-100 dark:bg-zinc-700/50 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-600';
            case 'In Progress': return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
            case 'On Hold': return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
            case 'Done': return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
            case 'Cancelled': return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700';
            default: return 'bg-gray-100 dark:bg-gray-800';
        }
    };

    const columns: TaskStatus[] = ['To Do', 'On Hold', 'In Progress', 'Done', 'Cancelled'];

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        const task = tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus && onUpdateTask) {
            onUpdateTask({ ...task, status: newStatus });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className="flex gap-4 h-[600px] overflow-x-auto p-2">
            {columns.map(col => {
                const columnTasks = tasks.filter(t => t.status === col);
                return (
                    <div
                        key={col}
                        onDrop={(e) => handleDrop(e, col)}
                        onDragOver={handleDragOver}
                        className="flex flex-col bg-slate-100 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/50 rounded-xl min-w-[280px] p-3"
                    >
                        <div className="flex justify-between items-center mb-3 px-1">
                            <h3 className="font-semibold text-slate-700 dark:text-zinc-300">{col}</h3>
                            <span className="bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400 text-xs px-2 py-1 rounded-full font-medium">
                                {columnTasks.length}
                            </span>
                        </div>
                        <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                            {columnTasks.map(task => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                    onClick={() => onOpenDialog && onOpenDialog(task)}
                                    className="select-none bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-700 cursor-pointer hover:shadow-md transition-shadow"
                                >
                                    <div className="font-medium text-sm text-slate-900 dark:text-zinc-100 mb-1">{task.name?.[i18n.language] || task.name?.['en']}</div>
                                    <div className="text-xs text-slate-500 dark:text-zinc-400 mb-2 line-clamp-2">{task.description?.[i18n.language] || task.description?.['en']}</div>
                                    <div className="flex flex-col gap-2 mt-3">
                                        {task.phaseId && getPhaseDetails(task.phaseId) && (
                                            <div className="flex">
                                                <div className="flex flex-col text-[10px] font-medium px-2 py-1 bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded leading-tight">
                                                    {getPhaseDetails(task.phaseId)!.title && (
                                                        <span className="font-bold text-slate-700 dark:text-zinc-200">
                                                            {getPhaseDetails(task.phaseId)!.title?.[i18n.language] || getPhaseDetails(task.phaseId)!.title?.['en']}
                                                        </span>
                                                    )}
                                                    <span>
                                                        {getPhaseDetails(task.phaseId)!.phaseName} {getPhaseDetails(task.phaseId)!.range}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-xs">
                                            <span className={`font-medium px-2 py-1 rounded capitalize ${getTaskStyle(task.status)}`}>
                                                {getUnitName(task.primaryUnitId)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {columnTasks.length === 0 && (
                                <div className="text-center p-4 border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-lg text-slate-400 text-sm">
                                    {t('Drop tasks here')}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};