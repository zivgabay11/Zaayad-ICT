import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Flag, ChevronDown, ChevronsDown, ChevronsUp, Network } from 'lucide-react';
import { useLinkPlanningContext } from '../../common/context/LinkPlanningContext';
import { useHeadquartersLayerContext } from '../../common/context/HeadquartersLayerContext';
import { mockUnits } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';
import { LEVEL_BADGE } from '../../common/utilities/headquartersIcon';
import { HeadquartersTreeNode, buildHeadquartersTree, flattenTree } from '../utilities/headquartersTree';
import { HeadquartersEntityCell } from '../widgets/HeadquartersEntityCell';

// "מפקדות וחפ"קים" overview (שליטה וניהול) — a hierarchical table of every headquarters and
// command post that has been transferred into ניהו"ק (the same set the map layer shows),
// laid out along the org chart: each unit is a row with its headquarters on one side and its
// command post beside it, and the brigades/battalions beneath it nested below. Scope is the
// session's own unit and everything under it. Read-only: entities are created and
// transferred from תכנון קשר רדיו on the map.

const GRID = 'grid grid-cols-[minmax(220px,1.1fr)_minmax(200px,1fr)_minmax(200px,1fr)] gap-3';

interface Props {
    sessionUnitCode?: number;
}

const StatTile: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
    <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 shadow-sm">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 shrink-0">{icon}</span>
        <div>
            <div className="text-lg font-bold leading-none text-slate-900 dark:text-white">{value}</div>
            <div className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{label}</div>
        </div>
    </div>
);

export const HeadquartersOverviewScreen: React.FC<Props> = ({ sessionUnitCode = 1000 }) => {
    const { t, i18n } = useTranslation();
    const { headquartersEntities } = useLinkPlanningContext();
    const { ids } = useHeadquartersLayerContext();
    const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

    const tree = useMemo(() => {
        const transferred = headquartersEntities.filter(e => ids.includes(e.id));
        return buildHeadquartersTree(sessionUnitCode, transferred);
    }, [headquartersEntities, ids, sessionUnitCode]);

    const allNodes = useMemo(() => flattenTree(tree), [tree]);
    const expandableCodes = useMemo(() => allNodes.filter(n => n.children.length > 0).map(n => n.unitCode), [allNodes]);
    const totalHeadquarters = allNodes.reduce((sum, n) => sum + n.headquarters.length, 0);
    const totalCommandPosts = allNodes.reduce((sum, n) => sum + n.commandPosts.length, 0);
    const unitsWithNone = allNodes.filter(n => n.headquarters.length === 0 && n.commandPosts.length === 0).length;

    const sessionUnit = mockUnits.find(u => u.code === sessionUnitCode);
    const sessionUnitLabel = sessionUnit ? formatUnitName(sessionUnit as any, t, i18n.language) : String(sessionUnitCode);

    const toggleNode = (code: number) => setCollapsed(prev => {
        const next = new Set(prev);
        if (next.has(code)) next.delete(code); else next.add(code);
        return next;
    });

    const renderNode = (node: HeadquartersTreeNode, depth: number): React.ReactNode => {
        const unit = mockUnits.find(u => u.code === node.unitCode);
        const hasChildren = node.children.length > 0;
        const isOpen = !collapsed.has(node.unitCode);
        const isDivision = node.level === 'division';
        return (
            <React.Fragment key={node.unitCode}>
                <div className={`${GRID} items-start px-4 py-3 border-b border-slate-100 dark:border-zinc-800 ${isDivision ? 'bg-slate-50/80 dark:bg-zinc-800/40' : ''}`}>
                    <div className="flex items-center gap-2 min-w-0 pt-1" style={{ paddingInlineStart: depth * 22 }}>
                        {hasChildren ? (
                            <button
                                onClick={() => toggleNode(node.unitCode)}
                                aria-expanded={isOpen}
                                aria-label={t(isOpen ? 'headquartersOverview.collapseUnit' : 'headquartersOverview.expandUnit')}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-slate-500 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-700 transition-colors shrink-0"
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? '' : 'ltr:-rotate-90 rtl:rotate-90'}`} />
                            </button>
                        ) : (
                            <span className="w-6 h-6 shrink-0" />
                        )}
                        <span className="inline-flex items-center justify-center min-w-[28px] h-5 px-1.5 rounded bg-primary/10 text-primary text-[11px] font-bold tracking-wide shrink-0">
                            {LEVEL_BADGE[node.level]}
                        </span>
                        <div className="min-w-0">
                            <div className={`truncate text-sm text-slate-900 dark:text-white ${isDivision ? 'font-bold' : 'font-semibold'}`}>
                                {unit ? formatUnitName(unit as any, t, i18n.language) : node.unitCode}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-500">{t(`definitions.levels.${node.level}`)}</div>
                        </div>
                    </div>
                    <HeadquartersEntityCell kind="headquarters" unitCode={node.unitCode} entities={node.headquarters} />
                    <HeadquartersEntityCell kind="commandPost" unitCode={node.unitCode} entities={node.commandPosts} />
                </div>
                {hasChildren && isOpen && node.children.map(child => renderNode(child, depth + 1))}
            </React.Fragment>
        );
    };

    return (
        <div className="p-6 h-full flex flex-col w-full min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-row flex-wrap justify-between items-center gap-3 mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary shrink-0">
                        <Network className="w-[18px] h-[18px]" />
                    </span>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{t('headquartersOverview.title')}</h1>
                        <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">{t('headquartersOverview.subtitle', { unit: sessionUnitLabel })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCollapsed(new Set())}
                        className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors font-medium"
                    >
                        <ChevronsDown className="w-4 h-4" /> {t('headquartersOverview.expandAll')}
                    </button>
                    <button
                        onClick={() => setCollapsed(new Set(expandableCodes))}
                        className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors font-medium"
                    >
                        <ChevronsUp className="w-4 h-4" /> {t('headquartersOverview.collapseAll')}
                    </button>
                </div>
            </div>

            <div className="flex flex-row flex-wrap gap-3 mb-4 flex-shrink-0">
                <StatTile icon={<Building2 className="w-4 h-4" />} label={t('headquartersOverview.stats.headquarters')} value={totalHeadquarters} />
                <StatTile icon={<Flag className="w-4 h-4" />} label={t('headquartersOverview.stats.commandPosts')} value={totalCommandPosts} />
                <StatTile icon={<Network className="w-4 h-4" />} label={t('headquartersOverview.stats.unitsWithNone')} value={unitsWithNone} />
            </div>

            <div className="flex-1 min-h-0 overflow-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm">
                {tree.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-10 text-sm text-slate-400 dark:text-zinc-600">
                        {t('headquartersOverview.emptyScope')}
                    </div>
                ) : (
                    <div className="min-w-[760px]">
                        <div className={`${GRID} sticky top-0 z-10 px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-500 dark:text-zinc-400`}>
                            <div>{t('headquartersOverview.columns.unit')}</div>
                            <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {t('headquartersOverview.columns.headquarters')}</div>
                            <div className="flex items-center gap-1.5"><Flag className="w-3.5 h-3.5" /> {t('headquartersOverview.columns.commandPost')}</div>
                        </div>
                        {tree.map(node => renderNode(node, 0))}
                    </div>
                )}
            </div>
        </div>
    );
};
