import React, { useMemo } from 'react';
import { Task, Plan, Phase } from '../../common/utilities/types';
import { useTranslation } from 'react-i18next';
import { mockPhases, mockUnits, mockUsers } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';
import { getUnitColor } from '../../common/utilities/colors';

export const TasksTimeline: React.FC<{
    tasks: Task[];
    plan: Plan;
    onUpdateTask?: (task: Task) => void;
    onOpenDialog?: (initial: Partial<Task>) => void;
    onSwitchToList?: (taskIds: string[]) => void;
}> = ({ tasks, plan, onUpdateTask, onOpenDialog, onSwitchToList }) => {
    const { t, i18n } = useTranslation();

    const currentUser = mockUsers[0];
    const sessionUnit = useMemo(() => mockUnits.find(u => u.code === currentUser.unitCode) || null, [currentUser.unitCode]);
    const planUnitCodes = useMemo(() => plan.units.map(u => Number(u.code)).filter(c => !isNaN(c)), [plan]);

    // The columns are phases
    const sortedPhases = [...plan.phases].sort((a, b) => (a.index || 0) - (b.index || 0));
    const phases = sortedPhases.length > 0 ? sortedPhases : [{ id: 'default', index: 0, title: { en: t('Default Phase') } } as Phase];

    // The rows are units (+ "Unassigned")
    const units = [...plan.units, { code: 'unassigned', type: t('Unassigned') } as any];

    const getUnitName = (unit: any) => {
        if (unit.code === 'unassigned') return t('Unassigned');
        const unitCode = String(unit.code);
        const globalUnit = mockUnits.find(u => String(u.code) === unitCode);
        if (globalUnit) {
            return formatUnitName(globalUnit, t, i18n.language);
        }
        return unitCode;
    };

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            (e.target as HTMLElement).style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.target as HTMLElement).style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetUnitId: string, targetPhaseId: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        if (!taskId) return;

        const task = tasks.find(t => t.id === taskId);
        if (task && onUpdateTask) {
            onUpdateTask({
                ...task,
                primaryUnitId: targetUnitId === 'unassigned' ? undefined : targetUnitId,
                phaseId: targetPhaseId
            });
        }
    };

    const handleCellClick = (unitId: string, phaseId: string) => {
        if (onOpenDialog) {
            onOpenDialog({
                primaryUnitId: unitId === 'unassigned' ? undefined : unitId,
                phaseId: phaseId
            });
        }
    };

    const getStatusChipStyle = (status: Task['status']) => {
        switch (status) {
            case 'In Progress': return 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';
            case 'On Hold': return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
            case 'Done': return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
            case 'Cancelled': return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
            default: return '';
        }
    };

    const formatOffset = (hours?: number) => {
        if (hours === undefined) return '';
        const d = Math.floor(hours / 24);
        const h = hours % 24;
        if (d === 0) return `${t('H')}${h >= 0 ? '+' : ''}${h}`;
        return `${t('D')}${d >= 0 ? '+' : ''}${d}`;
    };

    const getPhaseName = (p: any) => {
        const lang = i18n.language as 'en' | 'he';
        const resolve = (val: any) => typeof val === 'object' ? (val?.[lang] || val?.['en']) : val;

        if (p.title) return resolve(p.title);
        const matched = mockPhases.find(mp => mp.index === p.index);
        return matched ? resolve(matched.name) : (resolve(p.name) || `Phase ${p.index}`);
    };

    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-zinc-900 p-4 text-sm rtl:text-right">
                <div
                    className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 min-w-max h-max"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `150px repeat(${phases.length}, minmax(220px, 1fr))`
                    }}
                >
                    {/* Header Row */}
                    <div className="border-b border-e border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 py-4 px-6 flex flex-col items-center justify-center text-center">
                        <div className="font-semibold text-slate-700 dark:text-zinc-300 mb-1 leading-tight">
                            {t('Unit / Phase')}
                        </div>
                        {/* Invisible placeholder to align with phase subtitles */}
                        <div className="text-xs opacity-0 pointer-events-none select-none">
                            spacer
                        </div>
                    </div>
                    {phases.map((phase) => {
                        const startLabel = formatOffset(phase.startOffsetHours);
                        const endLabel = formatOffset(phase.endOffsetHours);
                        const hasSubtitle = startLabel || endLabel;

                        const matchedIndex = mockPhases.find(mp => mp.index === phase.index);
                        const phaseNamePart = matchedIndex ? (matchedIndex.name[i18n.language as 'en' | 'he'] || matchedIndex.name['en']) : `${phase.index}`;

                        return (
                            <div key={phase.id} className="border-b border-e last:border-e-0 border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 py-3 px-4 text-center flex flex-col items-center justify-center gap-1.5 focus:outline-none">
                                <div className="font-bold text-slate-800 dark:text-white text-base leading-tight">
                                    {getPhaseName(phase)}
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300">
                                        {t('Phase')} {phaseNamePart}
                                    </div>
                                    {hasSubtitle && (
                                        <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                                            {startLabel} {t('to')} {endLabel}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Data Rows */}
                    {units.map((unit) => {
                        const unitCodeStr = String(unit.code);
                        const unitColor = unitCodeStr === 'unassigned'
                            ? '#9CA3AF'
                            : getUnitColor(Number(unit.code), sessionUnit, planUnitCodes, mockUnits);

                        return (
                            <React.Fragment key={unitCodeStr}>
                                <div className="border-b border-e border-slate-200 dark:border-zinc-800 p-4 font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-zinc-800/20 flex flex-col items-center justify-center">
                                    <span className="text-center capitalize">{getUnitName(unit)}</span>
                                </div>
                                {phases.map(phase => {
                                    const cellTasks = tasks.filter(t => {
                                        const tUnit = t.primaryUnitId || 'unassigned';
                                        return tUnit === unitCodeStr && t.phaseId === phase.id;
                                    });

                                    return (
                                        <div
                                            key={`${unitCodeStr}-${phase.id}`}
                                            className="border-b border-e last:border-e-0 border-slate-200 dark:border-zinc-800 p-2 min-h-[100px] transition-colors"
                                            onClick={() => handleCellClick(unitCodeStr, phase.id)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, unitCodeStr, phase.id)}
                                        >
                                            <div className="flex flex-col gap-2">
                                                {cellTasks.map(task => (
                                                    <div
                                                        key={task.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, task)}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onOpenDialog) onOpenDialog(task);
                                                        }}
                                                        className="select-none relative overflow-hidden flex rounded-lg border shadow-sm cursor-move transition-shadow hover:shadow text-start bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                                                    >
                                                        <div className="w-1.5 shrink-0" style={{ backgroundColor: unitColor }} />
                                                        <div className="p-2.5 flex flex-col gap-1.5 overflow-hidden w-full">
                                                            <div className="font-semibold text-sm line-clamp-2 leading-tight">
                                                                {task.name?.[i18n.language] || task.name?.['en']}
                                                            </div>
                                                            {task.description && (
                                                                <div className="text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap overflow-hidden text-ellipsis">
                                                                    {task.description?.[i18n.language] || task.description?.['en']}
                                                                </div>
                                                            )}
                                                            {task.status !== 'To Do' && (
                                                                <div className="mt-1 flex items-center">
                                                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusChipStyle(task.status)}`}>
                                                                        {t(task.status)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
