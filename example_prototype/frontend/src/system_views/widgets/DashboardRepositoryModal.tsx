import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, LayoutTemplate, Pencil, Plus, Trash2, TriangleAlert, X } from 'lucide-react';
import { useDashboardsContext } from '../../common/context/DashboardsContext';
import { CustomDashboard } from '../../common/utilities/types';
import { computeTileLayout, getDashboardFeature, tileRectStyle } from '../utilities/dashboardFeatures';

// "תצוגות מערכת" repository (מאגר התצוגות): every dashboard the user has built, as a card with
// a miniature of its layout. Click a card to open that dashboard; each card can also be edited,
// duplicated or deleted (with a confirmation), and a new view is one click away.

const MiniLayout: React.FC<{ dashboard: CustomDashboard }> = ({ dashboard }) => {
    const tiles = computeTileLayout(dashboard.widgets.length, 16 / 9);
    return (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-slate-100 dark:bg-zinc-800">
            {dashboard.widgets.map((w, index) => {
                const Icon = getDashboardFeature(w.featureId).icon;
                return (
                    <div key={w.id} style={tileRectStyle(tiles[index])} className="p-[2px]">
                        <div className="w-full h-full rounded-[3px] bg-primary/20 border border-primary/40 flex items-center justify-center overflow-hidden">
                            <Icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const DashboardRepositoryModal: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { repositoryOpen, closeRepository, dashboards, openDashboard, openBuilder, duplicateDashboard, deleteDashboard } = useDashboardsContext();
    const [deleting, setDeleting] = useState<CustomDashboard | null>(null);

    if (!repositoryOpen) return null;

    const formatDate = (iso: string) => new Date(iso).toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

    return (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div role="dialog" aria-modal="true" data-dashboard-repository className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-700 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-700">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('systemViews.title')}</h2>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t('systemViews.repositorySubtitle')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => openBuilder()} data-new-dashboard className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
                            <Plus className="w-4 h-4" /> {t('systemViews.newView')}
                        </button>
                        <button onClick={closeRepository} aria-label={t('systemViews.close')} className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-6">
                    {dashboards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                            <img src="/dashboards/empty-state.png" alt="" className="w-36 h-36 object-contain opacity-90" />
                            <p className="text-base font-semibold text-slate-700 dark:text-zinc-200">{t('systemViews.noneYet')}</p>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm">{t('systemViews.noneYetHint')}</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
                            {dashboards.map(d => (
                                <article key={d.id} data-dashboard-card={d.id} className="group flex flex-col rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 p-3 hover:border-primary/60 transition-colors">
                                    <button onClick={() => openDashboard(d.id)} data-open-dashboard className="text-start">
                                        <MiniLayout dashboard={d} />
                                        <div className="mt-3 flex items-center gap-2">
                                            <LayoutTemplate className="w-4 h-4 text-primary shrink-0" />
                                            <h3 className="flex-1 min-w-0 truncate text-[15px] font-bold text-slate-900 dark:text-white">{d.name}</h3>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                                            {t('systemViews.cardMeta', { count: d.widgets.length, date: formatDate(d.updatedAt) })}
                                        </p>
                                    </button>
                                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-zinc-700 flex flex-wrap items-center gap-x-1 gap-y-1">
                                        <button onClick={() => openBuilder(d.id)} data-edit-card className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors">
                                            <Pencil className="w-3.5 h-3.5" /> {t('systemViews.edit')}
                                        </button>
                                        <button onClick={() => duplicateDashboard(d.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors">
                                            <Copy className="w-3.5 h-3.5" /> {t('systemViews.duplicate')}
                                        </button>
                                        <button onClick={() => setDeleting(d)} data-delete-card className="ms-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" /> {t('systemViews.delete')}
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {deleting && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div role="alertdialog" aria-modal="true" className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-3 text-red-600 dark:text-red-500">
                                <TriangleAlert className="w-5 h-5 shrink-0" />
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t('systemViews.deleteTitle')}</h3>
                            </div>
                            <p className="text-slate-600 dark:text-zinc-300 mb-6 text-sm">{t('systemViews.deleteDescription', { name: deleting.name })}</p>
                            <div className="flex items-center justify-center gap-3">
                                <button onClick={() => setDeleting(null)} className="text-sm px-4 py-2 text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors font-medium">{t('systemViews.builder.cancel')}</button>
                                <button onClick={() => { deleteDashboard(deleting.id); setDeleting(null); }} data-confirm-delete-dashboard className="text-sm px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-sm">{t('systemViews.delete')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
