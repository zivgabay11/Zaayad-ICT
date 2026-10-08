import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Radar, X, Plus } from 'lucide-react';
import { useTikshovContext } from '../../common/context/TikshovContext';
import { mockTrackedDevices, mockUnits } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';
import { TikshovForceTable } from '../widgets/TikshovForceTable';
import { TikshovStatistics } from '../widgets/TikshovStatistics';
import { TikshovWatchedUnitsPanel } from '../widgets/TikshovWatchedUnitsPanel';
import { TikshovTimeRangeControl } from '../widgets/TikshovTimeRangeControl';
import { AddWatchedUnitModal } from '../widgets/AddWatchedUnitModal';

// Full-screen "Tikshov Common Operational Picture" (תמ"כ תקשוב) view: table, statistics,
// and watched-units management, all scoped to the home unit + watched units and sharing
// the same global time-range control (PRD 5.2/5.3/5.4/5.6).

type Tab = 'table' | 'statistics' | 'watched';

export const TikshovCopScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { homeUnitCode, scopedUnitCodes, watchedUnits, removeWatchedUnit, timeRange } = useTikshovContext();
    const [tab, setTab] = useState<Tab>('table');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const scopedDevices = useMemo(
        () => mockTrackedDevices.filter(d => scopedUnitCodes.includes(d.unitCode)),
        [scopedUnitCodes]
    );

    const rootUnitCodes = useMemo(
        () => [homeUnitCode, ...watchedUnits.map(w => w.watchedUnitCode)],
        [homeUnitCode, watchedUnits]
    );

    const homeUnit = mockUnits.find(u => u.code === homeUnitCode);

    const tabs: { id: Tab; label: string }[] = [
        { id: 'table', label: t('tikshovCop.tabs.table') },
        { id: 'statistics', label: t('tikshovCop.tabs.statistics') },
        { id: 'watched', label: t('tikshovCop.tabs.watched') },
    ];

    return (
        <div className="p-6 h-full flex flex-col w-full min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-row flex-wrap justify-between items-center gap-3 mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary shrink-0">
                        <Radar className="w-[18px] h-[18px]" />
                    </span>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{t('nav.tikshov_cop')}</h1>
                        <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">{t('tikshovCop.screenSubtitle')}</p>
                    </div>
                </div>
                <TikshovTimeRangeControl />
            </div>

            {/* Scope: home unit + watched units */}
            <div className="flex flex-wrap items-center gap-2 mb-4 shrink-0">
                {homeUnit && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary">
                        {formatUnitName(homeUnit as any, t, i18n.language)}
                    </span>
                )}
                {watchedUnits.map(selection => {
                    const unit = mockUnits.find(u => u.code === selection.watchedUnitCode);
                    if (!unit) return null;
                    return (
                        <span key={selection.selectionId} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                            {formatUnitName(unit as any, t, i18n.language)}
                            <button onClick={() => removeWatchedUnit(selection.watchedUnitCode)} className="hover:text-red-500 transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    );
                })}
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:border-primary hover:text-primary transition-colors"
                >
                    <Plus className="w-3 h-3" /> {t('tikshovCop.addWatchedUnit')}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg self-start mb-4 shrink-0">
                {tabs.map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === id
                            ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="flex-1 w-full min-w-0 min-h-0 relative z-0 flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4">
                {tab === 'table' && <TikshovForceTable devices={scopedDevices} timeRangeMinutes={timeRange.minutes} rootUnitCodes={rootUnitCodes} />}
                {tab === 'statistics' && <TikshovStatistics devices={scopedDevices} rootUnitCodes={rootUnitCodes} timeRangeMinutes={timeRange.minutes} />}
                {tab === 'watched' && <TikshovWatchedUnitsPanel />}
            </div>

            <AddWatchedUnitModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                excludeCodes={[homeUnitCode, ...watchedUnits.map(w => w.watchedUnitCode)]}
            />
        </div>
    );
};
