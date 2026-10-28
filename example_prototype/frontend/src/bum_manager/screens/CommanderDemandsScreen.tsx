import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FigmaIcon } from '../../common/widgets/FigmaIcon';
import { useBumContext, NewBumDemand } from '../../common/context/BumContext';
import { getUnitAndDescendantCodes } from '../../common/utilities/mockData';
import { BumDemand, BumDemandStatus, Cell } from '../../common/utilities/types';
import {
    BUM_STATUS_ORDER, DEFAULT_BUM_FILTERS, BumFilters, computeBumStats, exportBumDemandsToCsv, filterBumDemands,
    formatBumStamp, getBumCategories, resolveBumCategoryKey, BumGroupBy, BUM_GROUP_BYS, getBumRequesterCategories, resolveBumAgentKey,
} from '../utilities/bum';
import { BumToolbar } from '../widgets/BumToolbar';
import { BumSegmented } from '../widgets/BumSegmented';
import { Tile } from '../widgets/BumTile';
import { BumKanbanBoard } from '../widgets/BumKanbanBoard';
import { BumTable } from '../widgets/BumTable';
import { BumCategoryList, BumCategoryTiles } from '../widgets/BumCategoryViews';
import { BumStatusGauges } from '../widgets/BumStatusGauges';
import { DemandFormModal, DeleteDemandModal } from '../widgets/DemandModals';

// Commander demands (דרישות מפקד) — the first sub-section of Bum Manager (בו"ם משימות, שליטה וניהול):
// the commander demands & instructions tracker from
// the PRD "Bum Manager", laid out per the Figma frames: a dashboard that puts the category list,
// the kanban and the status gauges on one screen, and a full-screen tab for each of table,
// kanban ("חלוקה") and category tiles ("קטגוריות"). A user sees the demands of their own unit and
// everything beneath it, plus demands a superior assigned to it; the category list depends on
// whether that unit is a division or a brigade.

type TabId = 'dashboard' | 'table' | 'kanban' | 'categories';
const TABS: Array<{ id: TabId; icon: React.ReactNode }> = [
    { id: 'dashboard', icon: <FigmaIcon name="tab-layout-panel-left" /> },
    { id: 'table', icon: <FigmaIcon name="tab-table" /> },
    { id: 'kanban', icon: <FigmaIcon name="tab-trello" /> },
    { id: 'categories', icon: <FigmaIcon name="tab-card-stack" /> },
];

interface Props {
    sessionUnitCode?: number;
    sessionCell?: Cell;
}

export const CommanderDemandsScreen: React.FC<Props> = ({ sessionUnitCode = 1000, sessionCell = 'control' }) => {
    const { t } = useTranslation();
    const { demands, addDemand, updateDemand, deleteDemand, setDemandStatus } = useBumContext();

    const [tab, setTab] = useState<TabId>('dashboard');
    const [filters, setFilters] = useState<BumFilters>(DEFAULT_BUM_FILTERS);
    // What the categories are read as: the cell that must carry the demand out (גורם מקבל) or
    // whom the demand came from (גורם דורש). Several categories of the active reading can be
    // selected at once; switching the reading clears the selection (the keys differ).
    const [groupBy, setGroupBy] = useState<BumGroupBy>('receiver');
    const [dashboardKanbanMode, setDashboardKanbanMode] = useState<'columns' | 'table'>('columns');
    const [now, setNow] = useState(() => Date.now());
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<BumDemand | null>(null);
    const [deleting, setDeleting] = useState<BumDemand[]>([]);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);

    const myUnitCodes = useMemo(() => getUnitAndDescendantCodes(sessionUnitCode), [sessionUnitCode]);
    const receiverCategories = useMemo(() => getBumCategories(sessionUnitCode), [sessionUnitCode]);
    const requesterCategories = useMemo(() => getBumRequesterCategories(sessionUnitCode), [sessionUnitCode]);
    const categories = groupBy === 'receiver' ? receiverCategories : requesterCategories;
    const categoryOf = useCallback(
        (d: BumDemand) => (groupBy === 'receiver' ? resolveBumCategoryKey(d.category, receiverCategories) : resolveBumAgentKey(d.reportingAgent, requesterCategories)),
        [groupBy, receiverCategories, requesterCategories],
    );
    const labelOf = useCallback((key: string) => t(groupBy === 'receiver' ? `bumManager.categories.${key}` : `bumManager.agents.${key}`), [groupBy, t]);
    // The badge on a card / the category column of the table always shows the handling cell.
    const categoryLabelOf = useCallback((d: BumDemand) => t(`bumManager.categories.${resolveBumCategoryKey(d.category, receiverCategories)}`), [receiverCategories, t]);
    const changeGroupBy = (next: BumGroupBy) => { setGroupBy(next); setFilters(prev => ({ ...prev, categories: [] })); };

    const visible = useMemo(
        () => demands.filter(d => myUnitCodes.includes(d.unitCode) || (d.assignedUnitCode !== undefined && myUnitCodes.includes(d.assignedUnitCode))),
        [demands, myUnitCodes],
    );
    const filtered = useMemo(() => {
        const list = filterBumDemands(visible, filters, now, categoryOf);
        // Earliest due date first; demands with no due date go last.
        return [...list].sort((a, b) => (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity));
    }, [visible, filters, now, categoryOf]);

    const demandsByCategory = useMemo(() => {
        const map = new Map<string, BumDemand[]>();
        filtered.forEach(d => {
            const key = categoryOf(d);
            map.set(key, [...(map.get(key) ?? []), d]);
        });
        return map;
    }, [filtered, categoryOf]);

    const stats = useMemo(() => computeBumStats(filtered, now), [filtered, now]);
    const stamp = formatBumStamp(now);

    const openNew = () => { setEditing(null); setFormOpen(true); };
    const openEdit = (d: BumDemand) => { setEditing(d); setFormOpen(true); };
    const closeForm = () => { setFormOpen(false); setEditing(null); };
    const requestDelete = (list: BumDemand[]) => { setFormOpen(false); setDeleting(list); };

    const handleSubmit = (data: NewBumDemand) => {
        if (editing) updateDemand(editing.id, data);
        else addDemand(data);
        closeForm();
    };

    const confirmDelete = () => {
        deleting.forEach(d => deleteDemand(d.id));
        setDeleting([]);
        setEditing(null);
    };

    const exportDemands = (list: BumDemand[]) => exportBumDemandsToCsv(list, {
        status: s => t(`bumManager.status.${s}`),
        category: key => t(`bumManager.categories.${key}`),
        type: v => t(`bumManager.type.${v}`),
        headers: ['#', 'createdAt', 'title', 'description', 'type', 'category', 'severity', 'status', 'executor', 'dueAt', 'reportingPlatform', 'notes'].map(k => t(`bumManager.exportHeaders.${k}`)),
    });

    const toggleCategoryFilter = (key: string) => setFilters(prev => ({
        ...prev,
        categories: prev.categories.includes(key) ? prev.categories.filter(c => c !== key) : [...prev.categories, key],
    }));

    const handleStatusChange = (id: string, status: BumDemandStatus) => setDemandStatus(id, status);

    const kanban = (statuses: BumDemandStatus[], dense = false) => (
        <BumKanbanBoard
            demands={filtered}
            statuses={statuses}
            categoryLabelOf={categoryLabelOf}
            now={now}
            dense={dense}
            onOpen={openEdit}
            onDelete={d => requestDelete([d])}
            onStatusChange={handleStatusChange}
        />
    );

    const table = (compact: boolean) => (
        <BumTable
            demands={filtered}
            categoryLabelOf={categoryLabelOf}
            now={now}
            compact={compact}
            onOpen={openEdit}
            onUpdate={updateDemand}
            onDeleteMany={requestDelete}
            onExport={exportDemands}
        />
    );

    const groupSwitcher = (
        <BumSegmented
            options={BUM_GROUP_BYS.map(key => ({ key, label: t(`bumManager.groupBy.${key}`) }))}
            value={groupBy}
            onChange={changeGroupBy}
            ariaLabel={t('bumManager.groupBy.label')}
            testId="bum-group-by"
        />
    );

    const kanbanModeToggle = (
        <div className="flex rounded-md bg-slate-100 dark:bg-white/10 p-0.5 text-xs font-medium">
            {(['table', 'columns'] as const).map(mode => (
                <button
                    key={mode}
                    onClick={() => setDashboardKanbanMode(mode)}
                    aria-pressed={dashboardKanbanMode === mode}
                    className={`px-3 py-1 rounded transition-colors ${dashboardKanbanMode === mode ? 'bg-primary text-white font-semibold' : 'text-slate-600 dark:text-zinc-300'}`}
                >
                    {t(`bumManager.dashboard.${mode === 'columns' ? 'columnsView' : 'tableView'}`)}
                </button>
            ))}
        </div>
    );

    return (
        <div className="h-full flex flex-col w-full min-w-0 max-w-full overflow-hidden">
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 pt-2 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-1" role="tablist">
                    {TABS.map(({ id, icon }) => (
                        <button
                            key={id}
                            role="tab"
                            aria-selected={tab === id}
                            onClick={() => setTab(id)}
                            data-bum-tab={id}
                            className={`flex items-center gap-1 px-4 py-2.5 text-sm leading-5 border-b-[3px] -mb-px transition-colors ${tab === id
                                ? 'font-bold border-primary text-primary dark:border-[#7ce2fe] dark:text-[#7ce2fe]'
                                : 'font-normal border-transparent text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            {icon} {t(`bumManager.tabs.${id}`)}
                        </button>
                    ))}
                </div>
                <div className="pb-2">
                    <BumToolbar
                        filters={filters}
                        onChange={setFilters}
                        categories={categories}
                        categoryLabelOf={labelOf}
                        categoriesTitle={t(groupBy === 'receiver' ? 'bumManager.toolbar.categories' : 'bumManager.groupBy.requester')}
                        onExport={() => exportDemands(filtered)}
                        onNew={openNew}
                    />
                </div>
            </div>

            <div className="flex-1 min-h-0 p-5">
                {tab === 'dashboard' && (
                    <div className="h-full grid gap-4 grid-cols-[minmax(0,1fr)_minmax(380px,32%)]">
                        <div className="flex flex-col gap-4 min-h-0 min-w-0">
                            <Tile
                                title={t('bumManager.dashboard.taskDistribution')}
                                stamp={stamp}
                                onExpand={() => setTab('kanban')}
                                extra={kanbanModeToggle}
                                className="flex-[1.7]"
                            >
                                {dashboardKanbanMode === 'columns' ? kanban(BUM_STATUS_ORDER.slice(0, 4), true) : table(true)}
                            </Tile>
                            <Tile title={t('bumManager.dashboard.taskStatus')} stamp={stamp} className="flex-1 min-h-[210px]">
                                <BumStatusGauges stats={stats} />
                            </Tile>
                        </div>
                        <Tile title={t('bumManager.dashboard.categories')} stamp={stamp} onExpand={() => setTab('categories')} extra={groupSwitcher}>
                            <BumCategoryList
                                categories={categories}
                                labelOf={labelOf}
                                demandsByCategory={demandsByCategory}
                                selectedKeys={filters.categories}
                                onToggleCategory={toggleCategoryFilter}
                            />
                        </Tile>
                    </div>
                )}

                {tab === 'table' && (
                    <Tile title={t('bumManager.tabs.table')} hideHeader className="h-full">{table(false)}</Tile>
                )}

                {tab === 'kanban' && (
                    <Tile title={t('bumManager.dashboard.taskDistribution')} stamp={stamp} className="h-full">{kanban(BUM_STATUS_ORDER)}</Tile>
                )}

                {tab === 'categories' && (
                    <Tile title={t('bumManager.dashboard.taskDistribution')} stamp={stamp} extra={groupSwitcher} className="h-full">
                        <BumCategoryTiles categories={categories} labelOf={labelOf} demandsByCategory={demandsByCategory} now={now} onOpen={openEdit} onDelete={d => requestDelete([d])} />
                    </Tile>
                )}
            </div>

            <DemandFormModal
                isOpen={formOpen}
                unitCode={sessionUnitCode}
                cell={sessionCell}
                categories={receiverCategories}
                demand={editing}
                onClose={closeForm}
                onSubmit={handleSubmit}
                onDelete={d => requestDelete([d])}
            />
            <DeleteDemandModal demands={deleting} onConfirm={confirmDelete} onCancel={() => setDeleting([])} />
        </div>
    );
};
