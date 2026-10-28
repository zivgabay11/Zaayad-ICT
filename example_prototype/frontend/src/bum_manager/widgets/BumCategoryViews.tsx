import React from 'react';
import { useTranslation } from 'react-i18next';
import { Target } from 'lucide-react';
import { BumDemand, BumDemandStatus } from '../../common/utilities/types';
import { BumCategory, isBumOpen } from '../utilities/bum';
import { DemandCard } from './DemandCard';
import { SeverityBadge } from './BumBadges';

// The two category-based views of Bum Manager:
//  • BumCategoryTiles — "קטגוריות" tab: one coloured column per category with its in-progress
//    and waiting demands (PRD story 2/3: mini dashboards by category, active demands only).
//  • BumCategoryList  — the dashboard's left panel: one row per category with its open-demand
//    count, the highest severity among them and who is handling the most urgent one. Clicking a
//    row filters the dashboard to that category.

const TILE_STATUSES: BumDemandStatus[] = ['inProgress', 'backlog'];

interface TilesProps {
    categories: BumCategory[];
    labelOf: (key: string) => string;
    demandsByCategory: Map<string, BumDemand[]>;
    now: number;
    onOpen: (demand: BumDemand) => void;
    onDelete: (demand: BumDemand) => void;
}

export const BumCategoryTiles: React.FC<TilesProps> = ({ categories, labelOf, demandsByCategory, now, onOpen, onDelete }) => {
    const { t } = useTranslation();
    return (
        <div className="bum-scroll h-full overflow-y-auto">
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(240px,1fr))] auto-rows-[minmax(320px,auto)]">
                {categories.map(category => {
                    const shown = (demandsByCategory.get(category.key) ?? []).filter(d => TILE_STATUSES.includes(d.status));
                    return (
                        <section key={category.key} data-category-tile={category.key} className="flex flex-col rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.04] max-h-[460px]">
                            <header className="flex items-center justify-between gap-2 px-3 py-3 text-white shrink-0" style={{ background: category.color }}>
                                <Target className="w-4 h-4 opacity-90 shrink-0" />
                                <h3 className="flex-1 text-[17px] font-bold truncate">{labelOf(category.key)}</h3>
                                <span className="text-[13px] opacity-90">({shown.length})</span>
                            </header>
                            <div className="bum-scroll flex-1 min-h-0 overflow-y-auto p-2.5 flex flex-col gap-2">
                                {TILE_STATUSES.map(status => {
                                    const group = shown.filter(d => d.status === status);
                                    if (group.length === 0) return null;
                                    return (
                                        <div key={status} className="flex flex-col gap-2">
                                            <div className="text-[12px] font-semibold text-slate-500 dark:text-zinc-400 pt-1">{t(`bumManager.status.${status}`)}</div>
                                            {group.map(d => (
                                                <DemandCard key={d.id} demand={d} compact categoryLabel="" now={now} onOpen={onOpen} onDelete={onDelete} />
                                            ))}
                                        </div>
                                    );
                                })}
                                {shown.length === 0 && (
                                    <div className="m-auto text-xs text-slate-400 dark:text-zinc-600">{t('bumManager.categoriesView.empty')}</div>
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
};

interface ListProps {
    categories: BumCategory[];
    labelOf: (key: string) => string;
    demandsByCategory: Map<string, BumDemand[]>;
    selectedKeys: string[];
    onToggleCategory: (key: string) => void;
}

export const BumCategoryList: React.FC<ListProps> = ({ categories, labelOf, demandsByCategory, selectedKeys, onToggleCategory }) => {
    const { t } = useTranslation();
    return (
        <div className="bum-scroll h-full overflow-y-auto flex flex-col gap-2.5 pe-1">
            {categories.map(category => {
                const open = (demandsByCategory.get(category.key) ?? []).filter(isBumOpen);
                const top = [...open].sort((a, b) => b.severity - a.severity)[0];
                const isSelected = selectedKeys.includes(category.key);
                return (
                    <button
                        key={category.key}
                        onClick={() => onToggleCategory(category.key)}
                        data-category-row={category.key}
                        className={`w-full text-start rounded-lg border px-3 py-2.5 flex items-center gap-3 transition-colors ${isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-slate-200 dark:border-white/15 bg-white dark:bg-white/[0.06] hover:border-slate-300 dark:hover:border-white/30'}`}
                    >
                        <span className="w-9 h-9 rounded-md flex items-center justify-center text-white shrink-0" style={{ background: category.color }}>
                            <Target className="w-[18px] h-[18px]" />
                        </span>
                        <span className="flex-1 min-w-0 text-[17px] font-bold text-slate-900 dark:text-white truncate">{labelOf(category.key)}</span>
                        <span className="flex items-center gap-4 shrink-0">
                            <span className="flex flex-col items-center gap-0.5 min-w-[64px]">
                                <span className="text-[11px] text-slate-500 dark:text-zinc-400">{t('bumManager.dashboard.executor')}</span>
                                <span className="text-[12px] px-1.5 rounded border border-slate-300 dark:border-zinc-600 text-slate-600 dark:text-zinc-300 max-w-[88px] truncate">{top?.executor ?? '—'}</span>
                            </span>
                            <span className="flex flex-col items-center gap-0.5 min-w-[64px]">
                                <span className="text-[11px] text-slate-500 dark:text-zinc-400">{t('bumManager.dashboard.maxSeverity')}</span>
                                {top ? <SeverityBadge severity={top.severity} /> : <span className="text-[12px] text-slate-400">—</span>}
                            </span>
                            <span className="flex flex-col items-center min-w-[56px]">
                                <span className="text-[11px] text-slate-500 dark:text-zinc-400">{t('bumManager.dashboard.openTasks')}</span>
                                <span className="text-2xl font-bold leading-none text-slate-900 dark:text-white">{open.length}</span>
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
};
