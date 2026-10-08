import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Radio, Ban } from 'lucide-react';
import { mockSpectrumZones } from '../../common/utilities/mockData';
import { JammingStatus, BlockingBand, BlockingStatus } from '../../common/utilities/types';
import {
    JAMMING_STATUSES, BLOCKING_BANDS, BLOCKING_STATUSES,
    JAMMING_STATUS_COLORS, BLOCKING_BAND_COLORS,
    computeJammingStatus, computeBlockingStatus,
} from '../../common/utilities/spectrum';

// Full-screen "Spectrum" (ספקטרום) views, reachable from the "ספקטרום" category bar —
// Jamming Tracking (מעקב השתקות), a table of every jamming zone split by past/present/
// future, and Blocking Tracking (מעקב חסימות), active and ended blocks split by frequency
// band (L1 / שו"ב). Which one renders is chosen in the sidebar category bar, same as every
// other category, rather than an in-page tab switcher.

type Tab = 'jamming' | 'blocking';

interface SpectrumScreenProps {
    tab: Tab;
}

export const SpectrumScreen: React.FC<SpectrumScreenProps> = ({ tab }) => {
    const { t, i18n } = useTranslation();
    const [jammingStatusFilter, setJammingStatusFilter] = useState<JammingStatus | 'all'>('all');
    const [blockingBandFilter, setBlockingBandFilter] = useState<BlockingBand | 'all'>('all');
    const [blockingStatusFilter, setBlockingStatusFilter] = useState<BlockingStatus | 'all'>('all');

    const jammingZones = useMemo(() => mockSpectrumZones.filter(z => z.zoneType === 'jamming'), []);
    const blockingZones = useMemo(() => mockSpectrumZones.filter(z => z.zoneType === 'blocking'), []);

    const filteredJamming = useMemo(() => jammingZones.filter(z =>
        jammingStatusFilter === 'all' || computeJammingStatus(z.startAt, z.endAt) === jammingStatusFilter
    ), [jammingZones, jammingStatusFilter]);

    const filteredBlocking = useMemo(() => blockingZones.filter(z =>
        (blockingBandFilter === 'all' || z.band === blockingBandFilter) &&
        (blockingStatusFilter === 'all' || computeBlockingStatus(z.endAt) === blockingStatusFilter)
    ), [blockingZones, blockingBandFilter, blockingStatusFilter]);

    const pillClass = (active: boolean) => `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${active
        ? 'bg-primary/10 text-primary'
        : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
        }`;
    const headerClass = "px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 whitespace-nowrap";

    return (
        <div className="p-6 h-full flex flex-col w-full min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary shrink-0">
                    {tab === 'jamming' ? <Radio className="w-[18px] h-[18px]" /> : <Ban className="w-[18px] h-[18px]" />}
                </span>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{t(`spectrum.tabs.${tab}`)}</h1>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">{t('spectrum.screenSubtitle')}</p>
                </div>
            </div>

            {tab === 'jamming' ? (
                <>
                    <div className="flex items-center gap-1 mb-3 shrink-0">
                        <button onClick={() => setJammingStatusFilter('all')} className={pillClass(jammingStatusFilter === 'all')}>
                            {t('spectrum.filters.allStatuses')}
                        </button>
                        {JAMMING_STATUSES.map(status => (
                            <button key={status} onClick={() => setJammingStatusFilter(status)} className={pillClass(jammingStatusFilter === status)}>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: JAMMING_STATUS_COLORS[status] }} />
                                    {t(`spectrum.jammingStatus.${status}`)}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 dark:border-zinc-800">
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-slate-50 dark:bg-zinc-800/60 sticky top-0 z-10">
                                <tr>
                                    <th className={headerClass}>{t('spectrum.columns.name')}</th>
                                    <th className={headerClass}>{t('spectrum.freqRange')}</th>
                                    <th className={headerClass}>{t('spectrum.columns.startTime')}</th>
                                    <th className={headerClass}>{t('spectrum.columns.endTime')}</th>
                                    <th className={headerClass}>{t('spectrum.columns.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredJamming.length === 0 ? (
                                    <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-400 dark:text-zinc-500">{t('spectrum.empty')}</td></tr>
                                ) : filteredJamming.map(zone => {
                                    const status = computeJammingStatus(zone.startAt, zone.endAt);
                                    const color = JAMMING_STATUS_COLORS[status];
                                    return (
                                        <tr key={zone.id} className="border-t border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                                            <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">{zone.name[i18n.language] || zone.name.en}</td>
                                            <td className="px-3 py-2 text-xs text-slate-600 dark:text-zinc-300 whitespace-nowrap" dir="ltr">{zone.freqRangeMhz.from}–{zone.freqRangeMhz.to} MHz</td>
                                            <td className="px-3 py-2 text-xs text-slate-600 dark:text-zinc-300 whitespace-nowrap">{zone.startAt ? new Date(zone.startAt).toLocaleString() : '—'}</td>
                                            <td className="px-3 py-2 text-xs text-slate-600 dark:text-zinc-300 whitespace-nowrap">{zone.endAt ? new Date(zone.endAt).toLocaleString() : '—'}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}1f`, color }}>
                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                                                    {t(`spectrum.jammingStatus.${status}`)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex flex-wrap items-center gap-3 mb-3 shrink-0">
                        <div className="flex items-center gap-1">
                            <button onClick={() => setBlockingBandFilter('all')} className={pillClass(blockingBandFilter === 'all')}>
                                {t('spectrum.filters.allBands')}
                            </button>
                            {BLOCKING_BANDS.map(band => (
                                <button key={band} onClick={() => setBlockingBandFilter(band)} className={pillClass(blockingBandFilter === band)}>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: BLOCKING_BAND_COLORS[band] }} />
                                        {t(`spectrum.blockingBands.${band}`)}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-700" />
                        <div className="flex items-center gap-1">
                            <button onClick={() => setBlockingStatusFilter('all')} className={pillClass(blockingStatusFilter === 'all')}>
                                {t('spectrum.filters.allStatuses')}
                            </button>
                            {BLOCKING_STATUSES.map(status => (
                                <button key={status} onClick={() => setBlockingStatusFilter(status)} className={pillClass(blockingStatusFilter === status)}>
                                    {t(`spectrum.jammingStatus.${status}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 dark:border-zinc-800">
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-slate-50 dark:bg-zinc-800/60 sticky top-0 z-10">
                                <tr>
                                    <th className={headerClass}>{t('spectrum.columns.name')}</th>
                                    <th className={headerClass}>{t('spectrum.columns.band')}</th>
                                    <th className={headerClass}>{t('spectrum.freqRange')}</th>
                                    <th className={headerClass}>{t('spectrum.heightRange')}</th>
                                    <th className={headerClass}>{t('spectrum.columns.endTime')}</th>
                                    <th className={headerClass}>{t('spectrum.columns.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBlocking.length === 0 ? (
                                    <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-400 dark:text-zinc-500">{t('spectrum.empty')}</td></tr>
                                ) : filteredBlocking.map(zone => {
                                    const status = computeBlockingStatus(zone.endAt);
                                    const statusColor = JAMMING_STATUS_COLORS[status];
                                    const bandColor = zone.band ? BLOCKING_BAND_COLORS[zone.band] : '#dc2626';
                                    return (
                                        <tr key={zone.id} className="border-t border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                                            <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">{zone.name[i18n.language] || zone.name.en}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {zone.band && (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${bandColor}1f`, color: bandColor }}>
                                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: bandColor }} />
                                                        {t(`spectrum.blockingBands.${zone.band}`)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-600 dark:text-zinc-300 whitespace-nowrap" dir="ltr">{zone.freqRangeMhz.from}–{zone.freqRangeMhz.to} MHz</td>
                                            <td className="px-3 py-2 text-xs text-slate-600 dark:text-zinc-300 whitespace-nowrap" dir="ltr">{zone.heightRangeM ? `${zone.heightRangeM.from}–${zone.heightRangeM.to} ${t('spectrum.metersAbbrev')}` : '—'}</td>
                                            <td className="px-3 py-2 text-xs text-slate-600 dark:text-zinc-300 whitespace-nowrap">{zone.endAt ? new Date(zone.endAt).toLocaleString() : '—'}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${statusColor}1f`, color: statusColor }}>
                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusColor }} />
                                                    {t(`spectrum.jammingStatus.${status}`)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};
