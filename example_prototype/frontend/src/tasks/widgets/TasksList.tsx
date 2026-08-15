import React from 'react';
import { Task, Plan } from '../../common/utilities/types';
import { useTranslation } from 'react-i18next';
import { mockPhases, mockUnits } from '../../common/utilities/mockData'; import { formatUnitName } from '../../common/utilities/formatting';
export const TasksList: React.FC<{ tasks: Task[], plan: Plan, filterIds?: string[] | null, onClearFilter?: () => void, onOpenDialog?: (initial: Partial<Task>) => void }> = ({ tasks, plan, filterIds, onClearFilter, onOpenDialog }) => {
    const { t, i18n } = useTranslation();


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

        const title = p.title || '';

        const startLabel = formatOffset(p.startOffsetHours);
        const endLabel = formatOffset(p.endOffsetHours);
        const range = startLabel || endLabel ? `(${startLabel} ${t('to')} ${endLabel})` : '';

        return { title, phaseName, range };
    };


    const displayTasks = filterIds ? tasks.filter(t => filterIds.includes(t.id)) : tasks;

    return (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-x-auto w-full h-[600px] flex-shrink-0 flex flex-col">
            {filterIds && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 flex justify-between items-center shrink-0">
                    <span className="font-semibold">{t('Showing grouped tasks')}</span>
                    <button onClick={onClearFilter} className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 rounded transition-colors">
                        {t('Clear')}
                    </button>
                </div>
            )}
            <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-zinc-700">
                    <thead className="bg-slate-50 dark:bg-zinc-900 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Name')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Status')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Phase')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Primary Unit')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-800 divide-y divide-slate-200 dark:divide-zinc-700">
                        {displayTasks.map(task => {
                            const globalUnit = mockUnits.find(u => u.code?.toString() === task.primaryUnitId);
                            const primaryUnit = globalUnit ? formatUnitName(globalUnit, t, i18n.language) : (task.primaryUnitId ? task.primaryUnitId : t('Unassigned'));
                            const phaseDetails = getPhaseDetails(task.phaseId);

                            return (
                                <tr key={task.id} onClick={() => onOpenDialog && onOpenDialog(task)} className="hover:bg-slate-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-zinc-100">{task.name?.[i18n.language] || task.name?.['en']}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-zinc-400">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${task.status === 'Done' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                                        ${task.status === 'In Progress' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' : ''}
                                        ${task.status === 'On Hold' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : ''}
                                        ${task.status === 'Cancelled' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : ''}
                                        ${task.status === 'To Do' ? 'bg-slate-100 text-slate-800 dark:bg-zinc-700 dark:text-zinc-300' : ''}`}>
                                            {t(task.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-zinc-400">
                                        {phaseDetails ? (
                                            <div className="flex flex-col text-[11px] font-medium px-2 py-1 bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded leading-tight inline-flex">
                                                {phaseDetails.title && (
                                                    <span className="font-bold text-slate-700 dark:text-zinc-200">
                                                        {phaseDetails.title?.[i18n.language] || phaseDetails.title?.['en']}
                                                    </span>
                                                )}
                                                <span>
                                                    {phaseDetails.phaseName} {phaseDetails.range}
                                                </span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-zinc-400 capitalize">{primaryUnit}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};