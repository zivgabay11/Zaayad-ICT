import React from 'react';
import { useTranslation } from 'react-i18next';
import { RadioTower, Plus, Trash2 } from 'lucide-react';
import { useStaticSpaceContext } from '../../common/context/StaticSpaceContext';
import { mockCommSites, mockClientDevices } from '../../common/utilities/mockData';
import { CommSiteFaultHistory } from '../../common/widgets/CommSiteFaultHistory';

// Full-screen "Static Space Establishment" (כינון מרחב נייח) view — the unit's curated
// Comm Site table (PRD 6.3 / 11.4), laid out like the app's other full-page sections
// (e.g. TikshovCopScreen / CombatLogScreen) rather than as a side drawer.

const CONFIDENCE_STYLES: Record<string, string> = {
    live: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    stale: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    unknown: 'bg-slate-100 text-slate-500 dark:bg-zinc-700/50 dark:text-zinc-400',
};

function ConfidenceChip({ confidence }: { confidence: string }) {
    const { t } = useTranslation();
    return (
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${CONFIDENCE_STYLES[confidence]}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {t(`staticSpace.confidence.${confidence}`)}
        </span>
    );
}

export const StaticSpaceScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { unitSiteIds, removeSite, openAddSitesModal, openSiteDetail } = useStaticSpaceContext();

    const sites = mockCommSites.filter(s => unitSiteIds.includes(s.id));

    return (
        <div className="p-6 h-full flex flex-col w-full min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-row flex-wrap justify-between items-center gap-3 mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary shrink-0">
                        <RadioTower className="w-[18px] h-[18px]" />
                    </span>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{t('staticSpace.tableTitle')}</h1>
                        <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">{t('staticSpace.tableSubtitle')}</p>
                    </div>
                </div>
                <button
                    onClick={openAddSitesModal}
                    className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-semibold shadow-sm"
                >
                    <Plus className="w-4 h-4" /> {t('staticSpace.addSites')}
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                {sites.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-14 px-2">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center mb-4 text-slate-400 dark:text-zinc-500">
                            <RadioTower className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-200 mb-1.5">{t('staticSpace.emptyTitle')}</h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-500 leading-relaxed max-w-[240px] mb-5">{t('staticSpace.emptyDescription')}</p>
                        <button
                            onClick={openAddSitesModal}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" /> {t('staticSpace.addSites')}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-slate-500 dark:text-zinc-400">
                                <b className="text-slate-800 dark:text-white">{sites.length}</b> {t('staticSpace.sitesInTable')}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {sites.map(site => {
                                const eladCount = mockClientDevices.filter(c => c.parentSiteId === site.id && c.clientType === 'elad').length;
                                const mabanCount = mockClientDevices.filter(c => c.parentSiteId === site.id && c.clientType === 'maban').length;
                                const anchorLabel = [
                                    site.isEladAnchor ? t('staticSpace.eladAnchor') : null,
                                    site.isMabanAnchor ? t('staticSpace.mabanAnchor') : null,
                                ].filter(Boolean).join(' · ') || '—';
                                const antennaLabel = site.tagamDevices.length
                                    ? `${site.tagamDevices.length} (${site.tagamDevices.map(d => `${d.antennaHeightM}${t('staticSpace.meterAbbr')}`).join(', ')})`
                                    : '—';

                                return (
                                    <div
                                        key={site.id}
                                        onDoubleClick={() => openSiteDetail(site.id)}
                                        title={t('commSiteDetail.expand')}
                                        className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 p-3.5 cursor-pointer hover:border-primary/40 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2.5">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary shrink-0">
                                                    <RadioTower className="w-[15px] h-[15px]" />
                                                </span>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                    {site.siteName[i18n.language] || site.siteName.en}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => removeSite(site.id)}
                                                title={t('staticSpace.removeSite')}
                                                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-[15px] h-[15px]" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-white dark:bg-zinc-900 rounded-lg px-2.5 py-1.5">
                                                <div className="text-[10px] text-slate-400 dark:text-zinc-500">{t('staticSpace.anchor')}</div>
                                                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-200">{anchorLabel}</div>
                                            </div>
                                            <div className="bg-white dark:bg-zinc-900 rounded-lg px-2.5 py-1.5">
                                                <div className="text-[10px] text-slate-400 dark:text-zinc-500">{t('staticSpace.tagam')}</div>
                                                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-200">{antennaLabel}</div>
                                            </div>
                                            <div className="bg-white dark:bg-zinc-900 rounded-lg px-2.5 py-1.5">
                                                <div className="text-[10px] text-slate-400 dark:text-zinc-500">{t('staticSpace.clientsShort')}</div>
                                                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                                                    {site.isEladAnchor ? eladCount : '—'} / {site.isMabanAnchor ? mabanCount : '—'}
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-zinc-900 rounded-lg px-2.5 py-1.5">
                                                <div className="text-[10px] text-slate-400 dark:text-zinc-500">{t('staticSpace.lastSync')}</div>
                                                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-200">{site.lastSyncAt}</div>
                                            </div>
                                        </div>
                                        <div className="mt-2.5">
                                            <ConfidenceChip confidence={site.dataConfidence} />
                                        </div>
                                        <CommSiteFaultHistory siteId={site.id} />
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
