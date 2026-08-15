import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plan, Phase } from '../../common/utilities/types';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { mockPhases } from '../../common/utilities/mockData';
import { DurationPicker } from '../../common/widgets/DurationPicker';

interface Props {
    plan: Plan;
    onUpdate: (changes: Partial<Plan>) => void;
}

export const PhasesCard: React.FC<Props> = ({ plan, onUpdate }) => {
    const { t, i18n } = useTranslation();
    const [draggedPhaseId, setDraggedPhaseId] = useState<string | null>(null);

    const addPhase = () => {
        let nextIndex = 0;
        let nextStartOffset = 0;
        if (plan.phases.length > 0) {
            const lastPhase = plan.phases[plan.phases.length - 1];
            const lastIndex = lastPhase.index;
            const currentMockIdx = mockPhases.findIndex(mp => mp.index === lastIndex);
            if (currentMockIdx !== -1 && currentMockIdx + 1 < mockPhases.length) {
                nextIndex = mockPhases[currentMockIdx + 1].index;
            } else {
                nextIndex = lastIndex;
            }
            nextStartOffset = lastPhase.endOffsetHours ?? 0;
        }

        const newPhase: Phase = {
            id: `p-${Date.now()}`,
            index: nextIndex,
            title: { en: '' },
            startOffsetHours: nextStartOffset,
            endOffsetHours: undefined
        };
        onUpdate({ phases: [...plan.phases, newPhase] });
    };

    const updatePhase = (id: string, field: keyof Phase, value: any) => {
        onUpdate({
            phases: plan.phases.map(p => p.id === id ? { ...p, [field]: value } : p)
        });
    };

    const removePhase = (id: string) => {
        onUpdate({ phases: plan.phases.filter(p => p.id !== id) });
    };

    const onDragStart = (e: React.DragEvent, id: string) => {
        setDraggedPhaseId(id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => { }, 0);
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const onDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedPhaseId || draggedPhaseId === targetId) return;

        const phases = [...plan.phases];
        const draggedIndex = phases.findIndex(p => p.id === draggedPhaseId);
        const targetIndex = phases.findIndex(p => p.id === targetId);

        const [draggedPhase] = phases.splice(draggedIndex, 1);
        phases.splice(targetIndex, 0, draggedPhase);

        onUpdate({ phases });
        setDraggedPhaseId(null);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-zinc-400 ml-2">{t('definitions.phases')}</label>
                <button onClick={addPhase} className="p-1 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 rounded-md transition-colors"><Plus className="w-4 h-4" /></button>
            </div>

            <div className="flex flex-col gap-2">
                {plan.phases.map(phase => (
                    <div
                        key={phase.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, phase.id)}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, phase.id)}
                        onDragEnd={() => setDraggedPhaseId(null)}
                        className={`flex flex-col gap-2 bg-slate-50 dark:bg-zinc-800/20 border p-2 rounded-lg transition-all ${draggedPhaseId === phase.id ? 'opacity-50 border-dashed border-cyan-500' : 'border-slate-200 dark:border-zinc-700/50'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1">
                                <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col gap-1 w-[80px] shrink-0">
                                <span className="text-[10px] uppercase text-slate-400 font-semibold px-1">{t('common.time.start')}</span>
                                <DurationPicker
                                    value={phase.startOffsetHours}
                                    onChange={val => updatePhase(phase.id, 'startOffsetHours', val)}
                                />
                            </div>
                            <div className="flex flex-col gap-1 w-[80px] shrink-0">
                                <span className="text-[10px] uppercase text-slate-400 font-semibold px-1">{t('common.time.end')}</span>
                                <DurationPicker
                                    value={phase.endOffsetHours}
                                    onChange={val => updatePhase(phase.id, 'endOffsetHours', val)}
                                />
                            </div>
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <span className="text-[10px] uppercase text-slate-400 font-semibold px-1">{t('definitions.phaseName')}</span>
                                <select
                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-2 py-1 text-xs outline-none focus:border-cyan-500 appearance-none"
                                    value={phase.index}
                                    onChange={e => updatePhase(phase.id, 'index', Number(e.target.value))}
                                >
                                    {mockPhases.map((mp) => (
                                        <option key={mp.index} value={mp.index}>
                                            {mp.name[i18n.language as 'en' | 'he'] || mp.name['en']}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-end gap-2 ps-8">
                            <div className="flex flex-col gap-1 flex-1">
                                <span className="text-[10px] uppercase text-slate-400 font-semibold px-1">{t('definitions.title') || 'Title'}</span>
                                <input
                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-2 py-1 text-xs outline-none focus:border-cyan-500"
                                    value={phase.title?.[i18n.language] || phase.title?.['en'] || ''}
                                    placeholder={t('definitions.phaseTitlePlaceholder') || 'e.g., Preparation'}
                                    onChange={e => updatePhase(phase.id, 'title', { ...phase.title, [i18n.language]: e.target.value })}
                                />
                            </div>
                            <button onClick={() => removePhase(phase.id)} className="p-1.5 self-end mb-0.5 text-slate-400 hover:text-red-500 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded transition-colors shadow-sm cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>
                ))}
                {plan.phases.length === 0 && <div className="text-sm text-slate-400 italic text-center py-2">{t('definitions.noPhases')}</div>}
            </div>
        </div>
    );
};