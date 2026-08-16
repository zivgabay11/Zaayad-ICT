import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTikshovContext, TimeRangePreset } from '../../common/context/TikshovContext';

// Global time range control (PRD 3.10/5.6/10.6): one persistent control, shared by the
// map, table, and statistics views, so switching the window updates all three at once.

const PRESETS: Exclude<TimeRangePreset, 'custom'>[] = ['1h', '2h', 'day', 'week'];

export const TikshovTimeRangeControl: React.FC = () => {
    const { t } = useTranslation();
    const { timeRange, setTimeRangePreset, setCustomTimeRangeMinutes } = useTikshovContext();
    const [customHours, setCustomHours] = useState('12');

    return (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg shrink-0">
            {PRESETS.map(preset => (
                <button
                    key={preset}
                    onClick={() => setTimeRangePreset(preset)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${timeRange.preset === preset
                        ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
                        }`}
                >
                    {t(`tikshovCop.timeRange.${preset}`)}
                </button>
            ))}
            <div className={`flex items-center gap-1 ps-1.5 border-s border-slate-200 dark:border-zinc-700 ${timeRange.preset === 'custom' ? '' : ''}`}>
                <input
                    type="number"
                    min={1}
                    value={customHours}
                    onChange={e => setCustomHours(e.target.value)}
                    className="w-12 text-xs px-1.5 py-1 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 outline-none focus:border-primary"
                />
                <button
                    onClick={() => setCustomTimeRangeMinutes(Math.max(1, Number(customHours) || 1) * 60)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${timeRange.preset === 'custom'
                        ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
                        }`}
                >
                    {t('tikshovCop.timeRange.custom')}
                </button>
            </div>
        </div>
    );
};
