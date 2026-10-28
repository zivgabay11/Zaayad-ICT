import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FigmaIcon } from '../../common/widgets/FigmaIcon';
import { BumSeverity } from '../../common/utilities/types';
import { BUM_HORIZONS, BUM_SEVERITIES, BUM_SEVERITY_COLOR, BumCategory, BumFilters, BumHorizon, DEFAULT_BUM_FILTERS } from '../utilities/bum';

// The control strip above every Bum Manager view (Figma: search, filter, Excel export and the
// time-phase dropdown), plus the "new demand" action — PRD story 8 wants adding to be
// reachable from any view.

interface Props {
    filters: BumFilters;
    onChange: (filters: BumFilters) => void;
    categories: BumCategory[];
    // Label of a category key and the heading of the list — they follow the active grouping
    // (receiver cells vs. demanding parties).
    categoryLabelOf: (key: string) => string;
    categoriesTitle: string;
    onExport: () => void;
    onNew: () => void;
}

const iconButton = 'h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors relative';

export const BumToolbar: React.FC<Props> = ({ filters, onChange, categories, categoryLabelOf, categoriesTitle, onExport, onNew }) => {
    const { t } = useTranslation();
    const [searchOpen, setSearchOpen] = useState(filters.search !== '');
    const [filterOpen, setFilterOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!filterOpen) return;
        const close = (e: MouseEvent) => { if (!popoverRef.current?.contains(e.target as Node)) setFilterOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [filterOpen]);

    const activeCount = filters.severities.length + filters.categories.length;
    const toggleSeverity = (s: BumSeverity) => onChange({ ...filters, severities: filters.severities.includes(s) ? filters.severities.filter(x => x !== s) : [...filters.severities, s] });
    const toggleCategory = (key: string) => onChange({ ...filters, categories: filters.categories.includes(key) ? filters.categories.filter(x => x !== key) : [...filters.categories, key] });

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={onNew}
                data-new-demand
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
                <FigmaIcon name="tool-plus" /> {t('bumManager.toolbar.newDemand')}
            </button>

            <div className="relative">
                <select
                    value={filters.horizon}
                    onChange={e => onChange({ ...filters, horizon: e.target.value as BumHorizon })}
                    aria-label={t('bumManager.toolbar.horizonLabel')}
                    className="h-8 appearance-none ps-3 pe-8 rounded-md border border-slate-200 dark:border-zinc-700 text-sm text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 outline-none focus:border-primary cursor-pointer"
                >
                    {BUM_HORIZONS.map(h => <option key={h} value={h}>{t(`bumManager.toolbar.horizon.${h}`)}</option>)}
                </select>
                <FigmaIcon name="tool-chevron-down" className="absolute top-1/2 -translate-y-1/2 end-2 pointer-events-none text-slate-400" />
            </div>

            <button onClick={onExport} className={iconButton} title={t('bumManager.toolbar.excel')} aria-label={t('bumManager.toolbar.excel')}>
                <FigmaIcon name="tool-excel" />
            </button>

            <div className="relative" ref={popoverRef}>
                <button onClick={() => setFilterOpen(o => !o)} className={iconButton} title={t('bumManager.toolbar.filter')} aria-label={t('bumManager.toolbar.filter')} aria-expanded={filterOpen}>
                    <FigmaIcon name="tool-filter" />
                    {activeCount > 0 && <span className="absolute -top-1.5 -end-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">{activeCount}</span>}
                </button>
                {filterOpen && (
                    <div className="absolute z-40 top-full mt-2 start-0 w-[300px] rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl p-4 text-sm">
                        <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2">{t('bumManager.toolbar.severity')}</div>
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {BUM_SEVERITIES.map(s => {
                                const on = filters.severities.includes(s);
                                const color = BUM_SEVERITY_COLOR[s];
                                return (
                                    <button
                                        key={s}
                                        onClick={() => toggleSeverity(s)}
                                        aria-pressed={on}
                                        className="px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors"
                                        style={on ? { background: `${color}26`, borderColor: color, color } : { borderColor: 'rgba(148,163,184,0.5)' }}
                                    >
                                        {t('bumManager.severity', { n: s })}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2">{categoriesTitle}</div>
                        <div className="max-h-48 overflow-y-auto flex flex-col gap-1 mb-3">
                            {categories.map(c => (
                                <label key={c.key} className="flex items-center gap-2 py-0.5 cursor-pointer text-slate-700 dark:text-zinc-200">
                                    <input type="checkbox" checked={filters.categories.includes(c.key)} onChange={() => toggleCategory(c.key)} />
                                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                                    {categoryLabelOf(c.key)}
                                </label>
                            ))}
                        </div>
                        <button
                            onClick={() => onChange({ ...filters, severities: [], categories: [] })}
                            disabled={activeCount === 0}
                            className="text-xs font-semibold text-primary disabled:text-slate-400 disabled:cursor-default"
                        >
                            {t('bumManager.toolbar.clearFilters')}
                        </button>
                    </div>
                )}
            </div>

            {searchOpen ? (
                <div className="relative">
                    <FigmaIcon name="tool-search" className="absolute top-1/2 -translate-y-1/2 start-2.5 text-slate-400 pointer-events-none" />
                    <input
                        autoFocus
                        value={filters.search}
                        onChange={e => onChange({ ...filters, search: e.target.value })}
                        placeholder={t('bumManager.toolbar.search')}
                        className="h-8 w-[200px] ps-8 pe-7 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-slate-800 dark:text-zinc-100 outline-none focus:border-primary"
                    />
                    <button
                        onClick={() => { onChange({ ...filters, search: DEFAULT_BUM_FILTERS.search }); setSearchOpen(false); }}
                        aria-label={t('bumManager.toolbar.closeSearch')}
                        className="absolute top-1/2 -translate-y-1/2 end-1.5 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100"
                    >
                        <FigmaIcon name="tool-x" size={14} />
                    </button>
                </div>
            ) : (
                <button onClick={() => setSearchOpen(true)} className={iconButton} title={t('bumManager.toolbar.search')} aria-label={t('bumManager.toolbar.search')}>
                    <FigmaIcon name="tool-search" />
                </button>
            )}
        </div>
    );
};
