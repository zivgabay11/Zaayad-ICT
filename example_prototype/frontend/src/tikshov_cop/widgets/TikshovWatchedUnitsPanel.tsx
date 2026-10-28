import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Home, Radar } from 'lucide-react';
import { useTikshovContext } from '../../common/context/TikshovContext';
import { mockUnits } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';
import { AddWatchedUnitModal } from './AddWatchedUnitModal';

// Watched units panel (PRD 5.4/10.5): the home unit (fixed, non-removable) plus every
// unit the user has explicitly chosen to also monitor, with the audit trail (2.9/7.5)
// showing who added each one and when.

export const TikshovWatchedUnitsPanel: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { homeUnitCode, watchedUnits, removeWatchedUnit } = useTikshovContext();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const homeUnit = mockUnits.find(u => u.code === homeUnitCode);
    const locale = i18n.language === 'he' ? 'he-IL' : 'en-US';

    return (
        <div className="flex flex-col h-full min-h-0 overflow-y-auto pe-1">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t('tikshovCop.watchedUnitsTitle')}</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">{t('tikshovCop.watchedUnitsSubtitle')}</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shrink-0"
                >
                    <Plus className="w-3.5 h-3.5" /> {t('tikshovCop.addWatchedUnit')}
                </button>
            </div>

            <div className="space-y-2.5">
                {homeUnit && (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                                <Home className="w-4 h-4" />
                            </span>
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{formatUnitName(homeUnit as any, t, i18n.language)}</div>
                                <div className="text-[10.5px] text-slate-500 dark:text-zinc-400">{t('tikshovCop.homeUnitBadge')}</div>
                            </div>
                        </div>
                    </div>
                )}

                {watchedUnits.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-10 px-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center mb-3 text-slate-400 dark:text-zinc-500">
                            <Radar className="w-5 h-5" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-500 leading-relaxed max-w-[260px]">{t('tikshovCop.noWatchedUnits')}</p>
                    </div>
                ) : watchedUnits.map(selection => {
                    const unit = mockUnits.find(u => u.code === selection.watchedUnitCode);
                    if (!unit) return null;
                    return (
                        <div key={selection.selectionId} className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-zinc-300 shrink-0">
                                    <Radar className="w-4 h-4" />
                                </span>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{formatUnitName(unit as any, t, i18n.language)}</div>
                                    <div className="text-[10.5px] text-slate-500 dark:text-zinc-400">
                                        {t('tikshovCop.addedBy', { user: selection.addedByUserName, date: new Date(selection.addedAt).toLocaleString(locale) })}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => removeWatchedUnit(selection.watchedUnitCode)}
                                title={t('tikshovCop.removeWatchedUnit')}
                                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-[15px] h-[15px]" />
                            </button>
                        </div>
                    );
                })}
            </div>

            <AddWatchedUnitModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                excludeCodes={[homeUnitCode, ...watchedUnits.map(w => w.watchedUnitCode)]}
            />
        </div>
    );
};
