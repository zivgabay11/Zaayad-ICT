import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanContext } from '../../common/context/PlanContext';
import { useDocContext } from '../../common/context/DocContext';
import { useMapContext } from '../../common/context/MapContext';
import { useAnalysisContext } from '../../common/context/AnalysisContext';
import { Card } from '../../common/widgets/Card';
import { RichTextEditor } from '../../common/widgets/RichTextEditor';
import { Target, AlertTriangle, Sparkles, UserX, MountainSnow, Upload, Shield, Map } from 'lucide-react';
import { CourseOfAction } from '../../common/utilities/types';
import { pdfjs } from 'react-pdf';

const COACard: React.FC<{
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    coa?: CourseOfAction;
    onChange: (coa: CourseOfAction) => void;
}> = ({ title, subtitle, icon, coa, onChange }) => {
    const { t, i18n } = useTranslation();

    const handleThreatChange = (val: string) => {
        onChange({
            threat: { ...(coa?.threat || {}), [i18n.language]: val },
            sequenceOfEvents: coa?.sequenceOfEvents || [],
            recommendedActions: coa?.recommendedActions || []
        });
    };

    const handleSequenceChange = (val: string) => {
        const lines = val.split('\n');
        // Currently, we map the lines directly. In a real app we might need a better UX for arrays of localized strings.
        // For simplicity, we just rebuild the array with the current language updated line by line.
        // If the lengths don't match, we map over the new lines and persist the old if available.
        const newSequence = lines.map((line, index) => {
            const existing = (coa?.sequenceOfEvents || [])[index] || {};
            return { ...existing, [i18n.language]: line };
        });

        onChange({
            threat: coa?.threat || {},
            sequenceOfEvents: newSequence,
            recommendedActions: coa?.recommendedActions || []
        });
    };

    const handleActionsChange = (val: string) => {
        const lines = val.split('\n');
        const newActions = lines.map((line, index) => {
            const existing = (coa?.recommendedActions || [])[index] || {};
            return { ...existing, [i18n.language]: line };
        });

        onChange({
            threat: coa?.threat || {},
            sequenceOfEvents: coa?.sequenceOfEvents || [],
            recommendedActions: newActions
        });
    };

    return (
        <Card
            title={
                <div className="flex flex-col">
                    <span className="text-base font-bold">{title}</span>
                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-normal">{subtitle}</span>
                </div>
            }
            icon={icon}
        >
            <div className="flex flex-col gap-6">
                <div>
                    <h4 className="font-semibold text-slate-800 dark:text-zinc-200 mb-2 uppercase text-sm tracking-wider">
                        {t('intelligence.labels.threat')}
                    </h4>
                    <RichTextEditor
                        className="w-full min-h-[100px] text-sm text-slate-700 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        value={coa?.threat?.[i18n.language] || ''}
                        onChange={handleThreatChange}
                        placeholder={t('intelligence.labels.threat')}
                    />
                </div>

                <div>
                    <h4 className="font-semibold text-slate-800 dark:text-zinc-200 mb-2 uppercase text-sm tracking-wider">
                        {t('intelligence.labels.sequenceOfEvents')}
                    </h4>
                    <RichTextEditor
                        className="w-full min-h-[120px] text-sm text-slate-700 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        value={(coa?.sequenceOfEvents || []).map(item => item[i18n.language] || '').join('\n')}
                        onChange={handleSequenceChange}
                        placeholder={t('intelligence.labels.sequenceOfEvents')}
                    />
                </div>

                <div>
                    <h4 className="font-semibold text-slate-800 dark:text-zinc-200 mb-2 uppercase text-sm tracking-wider">
                        {t('intelligence.labels.recommendedActions')}
                    </h4>
                    <RichTextEditor
                        className="w-full min-h-[120px] text-sm text-slate-700 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        value={(coa?.recommendedActions || []).map(item => item[i18n.language] || '').join('\n')}
                        onChange={handleActionsChange}
                        placeholder={t('intelligence.labels.recommendedActions')}
                    />
                </div>
            </div>
        </Card>
    );
};

const IntelligenceScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { activePlan, updatePlan, pendingUpdates, commitUpdate, discardUpdate } = usePlanContext();
    const { addFile } = useDocContext();
    const { openMap } = useMapContext();
    const { setPanelOpen, setActiveTab } = useAnalysisContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [view, setView] = useState<'forces' | 'terrain' | 'enemy' | 'coa'>('forces');

    const handleOpenMapAiTools = () => {
        setActiveTab(view === 'enemy' ? 'enemy' : view === 'coa' ? 'mission' : 'terrain');
        setPanelOpen(true);
        openMap();
    };

    if (!activePlan) {
        return (
            <div className="w-full h-full flex items-center justify-center p-6 text-slate-500">
                {t('intelligence.noPlanSelected')}
            </div>
        );
    }

    const handleRephrase = () => {
        if (activePlan) {
            if (view === 'coa') {
                updatePlan(activePlan.id, {
                    mpcoa: activePlan.mpcoa ? {
                        ...activePlan.mpcoa,
                        threat: {
                            ...(activePlan.mpcoa.threat || {}),
                            [i18n.language]: `[AI Rephrased] ${activePlan.mpcoa.threat?.[i18n.language] || ''}`
                        }
                    } : undefined,
                    mdcoa: activePlan.mdcoa ? {
                        ...activePlan.mdcoa,
                        threat: {
                            ...(activePlan.mdcoa.threat || {}),
                            [i18n.language]: `[AI Rephrased] ${activePlan.mdcoa.threat?.[i18n.language] || ''}`
                        }
                    } : undefined
                });
            } else if (view === 'enemy') {
                updatePlan(activePlan.id, {
                    enemy: {
                        ...(activePlan.enemy || {}),
                        [i18n.language]: `[AI Rephrased] ${activePlan.enemy?.[i18n.language] || ''}`
                    }
                });
            } else if (view === 'terrain') {
                updatePlan(activePlan.id, {
                    terrain: {
                        ...(activePlan.terrain || {}),
                        [i18n.language]: `[AI Rephrased] ${activePlan.terrain?.[i18n.language] || ''}`
                    }
                });
            } else if (view === 'forces') {
                updatePlan(activePlan.id, {
                    friendlyForces: {
                        ...(activePlan.friendlyForces || {}),
                        [i18n.language]: `[AI Rephrased] ${activePlan.friendlyForces?.[i18n.language] || ''}`
                    }
                });
            }
        }
    };

    return (
        <div className="w-full h-full p-4 lg:p-8 overflow-y-auto">
            <div className="w-full mx-auto space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-zinc-100">{t('intelligence.title')}</h2>
                        <p className="text-slate-500 dark:text-zinc-400 mt-1">{t('intelligence.subtitle')}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Segmented Control */}
                        <div className="flex bg-slate-100 dark:bg-zinc-900/50 p-1 rounded-xl">
                            {(['forces', 'terrain', 'enemy', 'coa'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setView(tab)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === tab
                                        ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-sm ring-1 ring-slate-200/50 dark:ring-zinc-700/50'
                                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50'
                                        }`}
                                >
                                    {t(`intelligence.tabs.${tab}`)}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleRephrase}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span className="font-semibold text-sm hidden sm:inline">{t('intelligence.aiRephrase')}</span>
                        </button>

                        <button
                            onClick={handleOpenMapAiTools}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/40 dark:text-cyan-400 rounded-lg transition-colors border border-cyan-100 dark:border-cyan-800"
                        >
                            <Map className="w-4 h-4" />
                            <span className="font-semibold text-sm hidden sm:inline">{t('intelligence.mapAiTools')}</span>
                        </button>

                        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const buffer = await file.arrayBuffer();
                            const data = new Uint8Array(buffer);
                            const pdf = await pdfjs.getDocument({ data: data.slice() }).promise;
                            addFile({ name: file.name, data, numPages: pdf.numPages });
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 rounded-lg transition-colors border border-slate-200 dark:border-zinc-700"
                        >
                            <Upload className="w-4 h-4" />
                            <span className="font-semibold text-sm hidden sm:inline">{t('doc.upload')}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {view === 'enemy' && (
                        <Card
                            title={
                                <div className="flex flex-col">
                                    <span className="text-base font-bold">{t('intelligence.enemy.title')}</span>
                                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-normal">{t('intelligence.enemy.subtitle')}</span>
                                </div>
                            }
                            icon={<UserX className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                        >
                            <div className="flex flex-col">
                                <RichTextEditor
                                    className="w-full min-h-[150px] text-sm text-slate-700 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                                    value={activePlan.enemy?.[i18n.language] || ''}
                                    proposedValue={pendingUpdates['enemy']?.[i18n.language]}
                                    onDecision={(keep) => keep ? commitUpdate('enemy') : discardUpdate('enemy')}
                                    onChange={(val) => updatePlan(activePlan.id, {
                                        enemy: {
                                            ...(activePlan.enemy || {}),
                                            [i18n.language]: val
                                        }
                                    })}
                                    placeholder={t('intelligence.enemy.title')}
                                />
                            </div>
                        </Card>
                    )}

                    {view === 'terrain' && (
                        <Card
                            title={
                                <div className="flex flex-col">
                                    <span className="text-base font-bold">{t('intelligence.terrain.title')}</span>
                                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-normal">{t('intelligence.terrain.subtitle')}</span>
                                </div>
                            }
                            icon={<MountainSnow className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                        >
                            <div className="flex flex-col">
                                <RichTextEditor
                                    className="w-full min-h-[150px] text-sm text-slate-700 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    value={activePlan.terrain?.[i18n.language] || ''}
                                    proposedValue={pendingUpdates['terrain']?.[i18n.language]}
                                    onDecision={(keep) => keep ? commitUpdate('terrain') : discardUpdate('terrain')}
                                    onChange={(val) => updatePlan(activePlan.id, {
                                        terrain: {
                                            ...(activePlan.terrain || {}),
                                            [i18n.language]: val
                                        }
                                    })}
                                    placeholder={t('intelligence.terrain.title')}
                                />
                            </div>
                        </Card>
                    )}

                    {view === 'forces' && (
                        <Card
                            title={
                                <div className="flex flex-col">
                                    <span className="text-base font-bold">{t('intelligence.forces.title')}</span>
                                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-normal">{t('intelligence.forces.subtitle')}</span>
                                </div>
                            }
                            icon={<Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                        >
                            <div className="flex flex-col">
                                <RichTextEditor
                                    className="w-full min-h-[150px] text-sm text-slate-700 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    value={activePlan.friendlyForces?.[i18n.language] || ''}
                                    proposedValue={pendingUpdates['friendlyForces']?.[i18n.language]}
                                    onDecision={(keep) => keep ? commitUpdate('friendlyForces') : discardUpdate('friendlyForces')}
                                    onChange={(val) => updatePlan(activePlan.id, {
                                        friendlyForces: {
                                            ...(activePlan.friendlyForces || {}),
                                            [i18n.language]: val
                                        }
                                    })}
                                    placeholder={t('intelligence.forces.title')}
                                />
                            </div>
                        </Card>
                    )}

                    {view === 'coa' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                            <COACard
                                title={t('intelligence.mpcoa.title')}
                                subtitle={t('intelligence.mpcoa.subtitle')}
                                icon={<Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                                coa={activePlan.mpcoa}
                                onChange={(coa) => updatePlan(activePlan.id, { mpcoa: coa })}
                            />

                            <COACard
                                title={t('intelligence.mdcoa.title')}
                                subtitle={t('intelligence.mdcoa.subtitle')}
                                icon={<AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                                coa={activePlan.mdcoa}
                                onChange={(coa) => updatePlan(activePlan.id, { mdcoa: coa })}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntelligenceScreen;
