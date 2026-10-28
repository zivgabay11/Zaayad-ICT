import React from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, LayoutTemplate, Pencil, Plus } from 'lucide-react';
import { useDashboardsContext } from '../../common/context/DashboardsContext';
import { Cell } from '../../common/utilities/types';
import { computeTileLayout, getDashboardFeature, tileRectStyle } from '../utilities/dashboardFeatures';
import { useBoxAspect } from '../utilities/useBoxAspect';
import { DashboardFeatureContent } from '../widgets/DashboardFeatureContent';
import { ScaledFeature } from '../widgets/ScaledFeature';

// A user-built dashboard (תצוגות מערכת): a strip to switch between the user's saved
// dashboards, edit the open one, or reach the repository / builder — and below it ONE fixed
// canvas that fills the rest of the screen without scrolling. Each widget is the real screen of
// a feature, placed and sized by the user, and scaled to fit its box (see ScaledFeature).

interface Props {
    sessionUnitCode?: number;
    sessionCell?: Cell;
}

const stripButton = 'inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-slate-200 dark:border-zinc-700 text-sm text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap shrink-0';

export const CustomDashboardScreen: React.FC<Props> = ({ sessionUnitCode, sessionCell }) => {
    const { t } = useTranslation();
    const { dashboards, activeDashboard, openDashboard, openRepository, openBuilder } = useDashboardsContext();
    // The tiles are laid out for the real shape of the screen area, so they always fill it.
    const { ref: canvasRef, aspect } = useBoxAspect();
    const tiles = computeTileLayout(activeDashboard?.widgets.length ?? 0, aspect);

    return (
        <div className="h-full w-full min-w-0 flex flex-col overflow-hidden" data-custom-dashboard>
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 pt-1.5 border-b border-slate-200 dark:border-white/10">
                <div className="bum-scroll flex-1 min-w-0 flex items-center gap-1 overflow-x-auto overflow-y-hidden" role="tablist">
                    {dashboards.map(d => (
                        <button
                            key={d.id}
                            role="tab"
                            aria-selected={activeDashboard?.id === d.id}
                            onClick={() => openDashboard(d.id)}
                            data-dashboard-tab={d.id}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap shrink-0 transition-colors ${activeDashboard?.id === d.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'}`}
                        >
                            <LayoutTemplate className="w-4 h-4 shrink-0" /> {d.name}
                        </button>
                    ))}
                </div>
                <div className="shrink-0 flex items-center gap-2 pb-1.5">
                    {activeDashboard && (
                        <button onClick={() => openBuilder(activeDashboard.id)} data-edit-dashboard className={stripButton}>
                            <Pencil className="w-3.5 h-3.5" /> {t('systemViews.edit')}
                        </button>
                    )}
                    <button onClick={openRepository} className={stripButton}>
                        <FolderOpen className="w-3.5 h-3.5" /> {t('systemViews.repository')}
                    </button>
                    <button onClick={() => openBuilder()} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap shrink-0">
                        <Plus className="w-4 h-4" /> {t('systemViews.newView')}
                    </button>
                </div>
            </div>

            {activeDashboard ? (
                <div className="flex-1 min-h-0 p-2" data-dashboard-viewport>
                    <div ref={canvasRef} className="relative w-full h-full" data-dashboard-canvas={activeDashboard.id}>
                        {activeDashboard.widgets.map((widget, index) => {
                            const feature = getDashboardFeature(widget.featureId);
                            const Icon = feature.icon;
                            return (
                                <div key={widget.id} style={tileRectStyle(tiles[index])} className="p-1.5 min-w-0 min-h-0" data-widget={widget.featureId}>
                                    <section className="w-full h-full flex flex-col rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
                                        <header className="shrink-0 h-8 flex items-center gap-2 px-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04]">
                                            <Icon className="w-4 h-4 text-primary shrink-0" />
                                            <h3 className="min-w-0 truncate text-[13px] font-bold text-slate-800 dark:text-white">{t(feature.labelKey)}</h3>
                                        </header>
                                        <div className="flex-1 min-h-0">
                                            <ScaledFeature>
                                                <DashboardFeatureContent featureId={widget.featureId} sessionUnitCode={sessionUnitCode} sessionCell={sessionCell} />
                                            </ScaledFeature>
                                        </div>
                                    </section>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 text-center p-6 overflow-hidden">
                    <img src="/dashboards/empty-state.png" alt="" className="w-28 h-28 object-contain opacity-90" />
                    <p className="text-base font-semibold text-slate-700 dark:text-zinc-200">{t(dashboards.length === 0 ? 'systemViews.noneYet' : 'systemViews.chooseOne')}</p>
                    <div className="flex items-center gap-2">
                        {dashboards.length > 0 && (
                            <button onClick={openRepository} className={`${stripButton} h-9 px-4`}>
                                <FolderOpen className="w-4 h-4" /> {t('systemViews.repository')}
                            </button>
                        )}
                        <button onClick={() => openBuilder()} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap">
                            <Plus className="w-4 h-4" /> {t('systemViews.newView')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
