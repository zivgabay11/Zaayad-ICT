import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { CombatLogType } from '../../common/utilities/types';
import { COMBAT_LOG_TYPES, COMBAT_LOG_TYPE_COLORS, COMBAT_LOG_STATUS_OPTIONS } from '../../common/utilities/combatLog';
import { UnitTreeSelect } from '../../common/widgets/UnitTreeSelect';

// Filtering & search (PRD 6.5 / US-04): log type is multi-select (FR-18), plus status,
// date range, unit, and free-text search (FR-19/20) — all reflected in the URL by the
// parent screen for shareability (FR-21/AC-04.5).

export interface CombatLogFilters {
    types: CombatLogType[]; // empty = all
    status: string; // 'all' or a specific status value
    unitCodes: number[]; // empty = all
    dateFrom: string; // yyyy-mm-dd or ''
    dateTo: string; // yyyy-mm-dd or ''
    search: string;
}

interface CombatLogFilterBarProps {
    filters: CombatLogFilters;
    onChange: (next: CombatLogFilters) => void;
}

const ROOT_UNIT_CODES = [5000];

export const CombatLogFilterBar: React.FC<CombatLogFilterBarProps> = ({ filters, onChange }) => {
    const { t } = useTranslation();

    const toggleType = (type: CombatLogType) => {
        const isActive = filters.types.includes(type);
        onChange({ ...filters, types: isActive ? filters.types.filter(x => x !== type) : [...filters.types, type] });
    };

    const statusOptions = useMemo(() => {
        const relevantTypes = filters.types.length > 0 ? filters.types : COMBAT_LOG_TYPES;
        return Array.from(new Set(relevantTypes.flatMap(type => COMBAT_LOG_STATUS_OPTIONS[type])));
    }, [filters.types]);

    const hasActiveFilters = filters.types.length > 0 || filters.status !== 'all' || filters.unitCodes.length > 0
        || filters.dateFrom || filters.dateTo || filters.search;

    return (
        <div className="flex flex-col gap-2.5 mb-4 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5">
                {COMBAT_LOG_TYPES.map(type => {
                    const active = filters.types.includes(type);
                    const color = COMBAT_LOG_TYPE_COLORS[type];
                    return (
                        <button
                            key={type}
                            onClick={() => toggleType(type)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors"
                            style={active
                                ? { background: `${color}1f`, color, borderColor: `${color}55` }
                                : { borderColor: 'var(--chip-border, #e2e8f0)' }}
                        >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                            {t(`combatLog.logTypes.${type}`)}
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 end-2.5 text-slate-400 dark:text-zinc-500" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={e => onChange({ ...filters, search: e.target.value })}
                        placeholder={t('combatLog.filters.searchPlaceholder')}
                        className="ps-2.5 pe-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-primary transition-colors w-52"
                    />
                </div>

                <select
                    value={filters.status}
                    onChange={e => onChange({ ...filters, status: e.target.value })}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 outline-none focus:border-primary"
                >
                    <option value="all">{t('combatLog.filters.allStatuses')}</option>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <UnitTreeSelect rootCodes={ROOT_UNIT_CODES} selected={filters.unitCodes} onChange={codes => onChange({ ...filters, unitCodes: codes })} />

                <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
                    title={t('combatLog.filters.dateFrom')}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 outline-none focus:border-primary"
                />
                <input
                    type="date"
                    value={filters.dateTo}
                    onChange={e => onChange({ ...filters, dateTo: e.target.value })}
                    title={t('combatLog.filters.dateTo')}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 outline-none focus:border-primary"
                />

                {hasActiveFilters && (
                    <button
                        onClick={() => onChange({ types: [], status: 'all', unitCodes: [], dateFrom: '', dateTo: '', search: '' })}
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" /> {t('combatLog.filters.clear')}
                    </button>
                )}
            </div>
        </div>
    );
};
