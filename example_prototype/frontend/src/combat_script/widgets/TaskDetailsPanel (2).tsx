import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Pencil, MapPin, Clock, CalendarDays } from 'lucide-react';
import type { Task, Plan } from '../../common/utilities/types';
import { getBaseTimestamp } from '../utilities/timelineHelpers';

interface TaskDetailsPanelProps {
    task: Task;
    plan: Plan;
    position?: { x: number; y: number };
    onClose: () => void;
    onEdit: (task: Task) => void;
}

export const TaskDetailsPanel: React.FC<TaskDetailsPanelProps> = ({ task, plan, position, onClose, onEdit }) => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;

    const taskName = task.name?.[lang] || task.name?.he || task.name?.en || '';
    const taskDesc = task.description?.[lang] || task.description?.he || task.description?.en || '';

    const HOUR_MS = 3600000;
    const baseTs = getBaseTimestamp(plan);

    // Format time from offset
    const formatTime = (offsetHours?: number) => {
        if (offsetHours == null) return '—';
        const ts = baseTs + offsetHours * HOUR_MS;
        const d = new Date(ts);
        const date = d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        return `${date} | ${time}`;
    };

    // Phase stepper
    const sortedPhases = [...plan.phases].sort((a, b) => a.index - b.index);
    const currentPhaseIndex = sortedPhases.findIndex(p => p.id === task.phaseId);

    // Location
    const location = task.geoCoordinates && task.geoCoordinates.length > 0
        ? `${task.geoCoordinates[0].lat.toFixed(4)}, ${task.geoCoordinates[0].lng.toFixed(4)}`
        : '—';

    const panelRef = useRef<HTMLDivElement>(null);
    const [adjustedPos, setAdjustedPos] = useState<{ top: number; left: number } | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setAdjustedPos(null);
        setVisible(false);
    }, [task]);

    useEffect(() => {
        if (!panelRef.current) return;
        const panel = panelRef.current;
        const parent = panel.offsetParent as HTMLElement;
        if (!parent) return;
        const parentRect = parent.getBoundingClientRect();
        const panelWidth = 380;
        const panelHeight = panel.scrollHeight;

        if (position) {
            let top = position.y - parentRect.top + 12;
            let left = position.x - parentRect.left - panelWidth / 2;

            if (left < 8) left = 8;
            if (left + panelWidth > parentRect.width - 8) left = parentRect.width - panelWidth - 8;
            if (top + panelHeight > parentRect.height - 8) top = position.y - parentRect.top - panelHeight - 12;
            if (top < 8) top = 8;

            setAdjustedPos({ top, left });
        } else {
            setAdjustedPos({ top: parentRect.height - panelHeight - 16, left: (parentRect.width - panelWidth) / 2 });
        }
        setVisible(true);
    }, [position, task]);

    return (
        <div
            ref={panelRef}
            className="absolute z-50 w-[380px] max-w-[90%] bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-700 overflow-hidden transition-opacity duration-75"
            style={{
                top: adjustedPos?.top ?? -9999,
                left: adjustedPos?.left ?? -9999,
                opacity: visible ? 1 : 0,
            }}
        >            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <X size={14} className="text-slate-500 dark:text-zinc-400" />
                    </button>
                    <button
                        onClick={() => onEdit(task)}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <Pencil size={14} className="text-slate-500 dark:text-zinc-400" />
                    </button>
                </div>
            </div>

            {/* Title and description */}
            <div className="px-4 pb-3 text-center">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{taskName}</h3>
                {taskDesc && (
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">{taskDesc}</p>
                )}
            </div>

            {/* Phase stepper */}
            {sortedPhases.length > 0 && (
                <div className="px-4 pb-3">
                    <div className="flex items-center justify-center gap-1">
                        {sortedPhases.map((phase, idx) => {
                            const isActive = idx === currentPhaseIndex;
                            const isPast = currentPhaseIndex >= 0 && idx > currentPhaseIndex;
                            const phaseLabel = phase.title?.[lang] || phase.title?.he || phase.title?.en || `${phase.index}`;

                            return (
                                <React.Fragment key={phase.id}>
                                    {idx > 0 && (
                                        <div className={`h-px w-4 ${isActive || !isPast ? 'bg-slate-300 dark:bg-zinc-600' : 'bg-slate-200 dark:bg-zinc-700'}`} />
                                    )}
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border-2 ${isActive
                                                ? 'border-green-500 bg-green-500 text-white'
                                                : isPast
                                                    ? 'border-slate-300 dark:border-zinc-600 text-slate-400 dark:text-zinc-500'
                                                    : 'border-slate-400 dark:border-zinc-500 text-slate-600 dark:text-zinc-300'
                                                }`}
                                        >
                                            {isActive ? '✓' : String(phase.index).padStart(2, '0')}
                                        </div>
                                        <span className="text-[9px] text-slate-500 dark:text-zinc-400 mt-0.5 whitespace-nowrap">
                                            {t('Phase')} {phaseLabel}
                                        </span>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bottom info row */}
            <div className="flex items-stretch divide-x divide-slate-200 dark:divide-zinc-700/50 border-t border-slate-200 dark:border-zinc-700/50 bg-slate-50 dark:bg-zinc-800/50">
                <div className="flex-[0.7] flex flex-col items-center justify-center p-2 gap-1 text-center">
                    <Clock size={14} className="text-slate-400 dark:text-zinc-500" />
                    <span className="text-[10px] font-medium text-slate-600 dark:text-zinc-300">{t('Actual Execution')}</span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                        {formatTime(task.startOffsetHours)}
                    </span>
                </div>
                <div className="flex-[1.3] flex flex-col items-center justify-center p-2 gap-1 text-center">
                    <CalendarDays size={14} className="text-slate-400 dark:text-zinc-500" />
                    <span className="text-[10px] font-medium text-slate-600 dark:text-zinc-300">{t('Planned Time')}</span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                        {formatTime(task.startOffsetHours)}{task.endOffsetHours != null ? ` - ${formatTime(task.endOffsetHours)}` : ''}
                    </span>
                </div>
                <div className="flex-[0.7] flex flex-col items-center justify-center p-2 gap-1 text-center">
                    <MapPin size={14} className="text-slate-400 dark:text-zinc-500" />
                    <span className="text-[10px] font-medium text-slate-600 dark:text-zinc-300">{t('Location')}</span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">{location}</span>
                </div>
            </div>
        </div>
    );
};
