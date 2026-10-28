import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanContext } from '../../common/context/PlanContext';
import { PlanDetailsCard } from '../widgets/PlanDetailsCard';
import { PhasesCard } from '../widgets/PhasesCard';
import { UnitsCard } from '../widgets/UnitsCard';
import { PresentationChecklistCard } from '../widgets/PresentationChecklistCard';
import { ColorLegendCard } from '../widgets/ColorLegendCard';
import { Save } from 'lucide-react';
import { Plan } from '../../common/utilities/types';

export const DefinitionsScreen: React.FC = () => {
    const { t } = useTranslation();
    const { activePlan, updatePlan } = usePlanContext();
    const [draftPlan, setDraftPlan] = useState<Plan | null>(null);

    useEffect(() => {
        if (activePlan && (!draftPlan || draftPlan.id !== activePlan.id)) {
            setDraftPlan(activePlan);
        }
    }, [activePlan, draftPlan]);

    if (!activePlan || !draftPlan) {
        return (
            <div className="flex items-center justify-center h-full p-8 text-center text-gray-500 dark:text-gray-400 text-lg">
                {t('definitions.noPlanSelected')}
            </div>
        );
    }

    const handleUpdateDraft = (changes: Partial<Plan>) => {
        setDraftPlan(prev => prev ? { ...prev, ...changes } : null);
    };

    const handleSave = () => {
        if (draftPlan) {
            updatePlan(draftPlan.id, draftPlan);
        }
    };

    const isDirty = JSON.stringify(activePlan) !== JSON.stringify(draftPlan);

    return (
        <div className="flex flex-col h-full overflow-hidden w-full relative">
            <div className="flex justify-between items-center shrink-0 px-6 pt-6 mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t('nav.definitions')}
                </h1>
                <button
                    onClick={handleSave}
                    disabled={!isDirty}
                    className={`flex items-center gap-2 px-4 py-2 text-white rounded-xl font-medium transition-colors ${isDirty
                        ? 'bg-primary-600 hover:bg-primary-700 bg-[#186eff] dark:bg-[#186eff] cursor-pointer'
                        : 'bg-slate-300 dark:bg-zinc-600 opacity-50 cursor-not-allowed text-slate-500 dark:text-zinc-400'
                        }`}
                >
                    <Save className="w-5 h-5 rtl:ml-2 ltr:mr-2" />
                    {t('plans.saveBtn', 'Save')}
                </button>
            </div>
            <div className="flex-1 flex gap-6 overflow-x-auto overflow-y-hidden px-6 pb-6">
                {/* Plan Details Card */}
                <div className="flex-1 min-w-[350px] flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 rounded-t-2xl shrink-0">
                        <h3 className="font-semibold text-slate-800 dark:text-zinc-200">{t('definitions.planDetails')}</h3>
                    </div>
                    <div className="p-5 overflow-y-auto flex-1">
                        <PlanDetailsCard plan={draftPlan} onUpdate={handleUpdateDraft} />
                    </div>
                </div>

                {/* Phases Card */}
                <div className="flex-1 min-w-[350px] flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 rounded-t-2xl shrink-0">
                        <h3 className="font-semibold text-slate-800 dark:text-zinc-200">{t('definitions.phases')}</h3>
                    </div>
                    <div className="p-5 overflow-y-auto flex-1">
                        <PhasesCard plan={draftPlan} onUpdate={handleUpdateDraft} />
                    </div>
                </div>

                {/* Units Card */}
                <div className="flex-1 min-w-[350px] flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 rounded-t-2xl shrink-0">
                        <h3 className="font-semibold text-slate-800 dark:text-zinc-200">{t('definitions.units')}</h3>
                    </div>
                    <div className="p-5 overflow-y-auto flex-1">
                        <UnitsCard plan={draftPlan} onUpdate={handleUpdateDraft} />
                    </div>
                </div>

                {/* Color Legend Card */}
                <div className="w-[220px] shrink-0 flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 rounded-t-2xl shrink-0">
                        <h3 className="font-semibold text-slate-800 dark:text-zinc-200">{t('definitions.colorLegend')}</h3>
                    </div>
                    <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-2">
                        <ColorLegendCard plan={draftPlan} />
                    </div>
                </div>

                {/* Presentation Checklist Card */}
                <div className="w-[280px] shrink-0 flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 rounded-t-2xl shrink-0">
                        <h3 className="font-semibold text-slate-800 dark:text-zinc-200">{t('definitions.presentationChecklist')}</h3>
                    </div>
                    <div className="p-5 overflow-y-auto flex-1">
                        <PresentationChecklistCard plan={draftPlan} onUpdate={handleUpdateDraft} />
                    </div>
                </div>
            </div>
        </div>
    );
};
