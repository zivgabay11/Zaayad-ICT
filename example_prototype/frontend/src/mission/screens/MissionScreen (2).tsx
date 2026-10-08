import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanContext } from '../../common/context/PlanContext';
import { useDocContext } from '../../common/context/DocContext';
import { Card } from '../../common/widgets/Card';
import { RichTextEditor } from '../../common/widgets/RichTextEditor';
import { Flag, Sparkles, Upload } from 'lucide-react';
import { pdfjs } from 'react-pdf';

const MissionScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { activePlan, updatePlan, pendingUpdates, commitUpdate, discardUpdate } = usePlanContext();
    const { addFile } = useDocContext();
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!activePlan) {
        return (
            <div className="w-full h-full flex items-center justify-center p-6 text-slate-500">
                {t('missionScreen.noPlanSelected')}
            </div>
        );
    }

    const handleRephrase = () => {
        // Implement AI call or GenKit behavior here.
        // For prototype purposes, just mock a small update.
        if (activePlan) {
            updatePlan(activePlan.id, {
                mission: {
                    ...(activePlan.mission || {}),
                    [i18n.language]: `[AI Rephrased] ${activePlan.mission?.[i18n.language] || ''}`
                }
            });
        }
    };

    const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);
        const pdf = await pdfjs.getDocument({ data: data.slice() }).promise;
        addFile({ name: file.name, data, numPages: pdf.numPages });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="w-full h-full p-4 lg:p-8 overflow-y-auto">
            <div className="w-full mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-zinc-100">{t('missionScreen.title')}</h2>
                        <p className="text-slate-500 dark:text-zinc-400 mt-1">{t('missionScreen.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleUploadPdf} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 rounded-lg transition-colors border border-slate-200 dark:border-zinc-700"
                        >
                            <Upload className="w-4 h-4" />
                            <span className="font-semibold text-sm">{t('doc.upload')}</span>
                        </button>
                        <button
                            onClick={handleRephrase}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span className="font-semibold text-sm">{t('missionScreen.aiRephrase')}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <Card
                        title={
                            <div className="flex flex-col">
                                <span className="text-base font-bold">{t('missionScreen.mission.title')}</span>
                                <span className="text-xs text-slate-500 dark:text-zinc-400 font-normal">{t('missionScreen.mission.subtitle')}</span>
                            </div>
                        }
                        icon={<Flag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    >
                        <div className="flex flex-col">
                            <RichTextEditor
                                minHeight="150px"
                                value={activePlan.mission?.[i18n.language] || ''}
                                proposedValue={pendingUpdates['mission']?.[i18n.language]}
                                onDecision={(keep) => keep ? commitUpdate('mission') : discardUpdate('mission')}
                                onChange={(val) => updatePlan(activePlan.id, {
                                    mission: {
                                        ...(activePlan.mission || {}),
                                        [i18n.language]: val
                                    }
                                })}
                                placeholder={t('missionScreen.mission.title')}
                            />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default MissionScreen;
