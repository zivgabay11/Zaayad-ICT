import { BumDemand, BumDemandStatus, BumSeverity } from '../../common/utilities/types';
import { mockUnits } from '../../common/utilities/mockData';
import { downloadCsv } from '../../common/utilities/csvExport';

// Domain constants + pure helpers for Bum Manager (בו"ם משימות). See the PRD "Bum Manager"
// (Categories & Cells, Demand interface, Lifecycle of Demand) for the source-of-truth tables
// these mirror; colours and the category order follow the Figma frames (dashboard / kanban /
// table / category tiles).

export const BUM_STATUS_ORDER: BumDemandStatus[] = ['backlog', 'inProgress', 'blocked', 'done', 'canceled'];

// The coloured stripe on a card / table row — one colour per lifecycle status.
export const BUM_STATUS_STRIPE: Record<BumDemandStatus, string> = {
    backlog: '#38bdf8',
    inProgress: '#facc15',
    blocked: '#ef4444',
    done: '#2b9a66',
    canceled: '#64748b',
};

export const BUM_SEVERITIES: BumSeverity[] = [1, 2, 3, 4, 5];

export const BUM_SEVERITY_COLOR: Record<BumSeverity, string> = {
    5: '#ef4444',
    4: '#f97316',
    3: '#eab308',
    2: '#38bdf8',
    1: '#94a3b8',
};

export interface BumCategory {
    key: string;
    color: string;
}

// PRD "Categories & Cells" — Division list (Figma order first, the rest after it).
export const BUM_DIVISION_CATEGORIES: BumCategory[] = [
    { key: 'agam', color: '#2271a8' },
    { key: 'ictCenter', color: '#4a4fa8' },
    { key: 'area', color: '#1d6a99' },
    { key: 'shob', color: '#1f7f6b' },
    { key: 'control', color: '#42602b' },
    { key: 'capabilities', color: '#6a56b3' },
    { key: 'continuity', color: '#9b55a3' },
    { key: 'nob', color: '#7a4aa0' },
    { key: 'palsam', color: '#8f2f56' },
    { key: 'radio', color: '#5b3d0f' },
    { key: 'planning', color: '#7b5a3c' },
    { key: 'spectrum', color: '#2c7a8c' },
    { key: 'operations', color: '#a05a2c' },
    { key: 'subordinateBrigades', color: '#3f6b9a' },
    { key: 'other', color: '#566676' },
];

// PRD "Categories & Cells" — Brigade list.
export const BUM_BRIGADE_CATEGORIES: BumCategory[] = [
    { key: 'computing', color: '#2b6cb0' },
    { key: 'infrastructure', color: '#6b7a2d' },
    { key: 'crypto', color: '#6d4fc2' },
    { key: 'radio', color: '#5b3d0f' },
    { key: 'nob', color: '#7a4aa0' },
    { key: 'admin', color: '#1f7f6b' },
    { key: 'battalions', color: '#3f6b9a' },
    { key: 'other', color: '#566676' },
];

// PRD "Demand interface" — reporting_agent (Commanding Authority) dropdown per echelon.
export const BUM_REPORTING_AGENTS: Record<'division' | 'brigade', string[]> = {
    division: ['magad', 'deputyMagad', 'kAgam', 'manlach', 'other'],
    brigade: ['kashrah', 'other'],
};

export type BumEchelon = 'division' | 'brigade';

// A division gets the division list; every other echelon (brigade, battalion…) the brigade one.
export function getBumEchelon(unitCode: number): BumEchelon {
    return mockUnits.find(u => u.code === unitCode)?.type === 'division' ? 'division' : 'brigade';
}

export function getBumCategories(unitCode: number): BumCategory[] {
    return getBumEchelon(unitCode) === 'division' ? BUM_DIVISION_CATEGORIES : BUM_BRIGADE_CATEGORIES;
}

const ALL_CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
    [...BUM_DIVISION_CATEGORIES, ...BUM_BRIGADE_CATEGORIES].map(c => [c.key, c.color]),
);

export const getBumCategoryColor = (key: string): string => ALL_CATEGORY_COLORS[key] ?? '#566676';

// A subordinate brigade's demand can carry a category the viewing division doesn't list (and
// vice versa) — those are rolled up under "subordinate brigades" (division view) or "other".
export function resolveBumCategoryKey(category: string, available: BumCategory[]): string {
    if (available.some(c => c.key === category)) return category;
    if (available.some(c => c.key === 'subordinateBrigades')) return 'subordinateBrigades';
    return 'other';
}

// "Categories" can be read two ways (the switcher on the categories panel):
//  • receiver  — גורם מקבל: the cell responsible for carrying the demand out (`category`).
//  • requester — גורם דורש: whom the demand came from, i.e. the commander who issued it
//    (`reportingAgent`).
export type BumGroupBy = 'receiver' | 'requester';
export const BUM_GROUP_BYS: BumGroupBy[] = ['requester', 'receiver'];

const BUM_AGENT_COLORS: Record<string, string> = {
    magad: '#2271a8',
    deputyMagad: '#4a4fa8',
    kAgam: '#1f7f6b',
    manlach: '#9b55a3',
    kashrah: '#2b6cb0',
    other: '#566676',
};

// The "demanding party" list for the viewing unit's echelon, in the same shape as the cells.
export function getBumRequesterCategories(unitCode: number): BumCategory[] {
    return BUM_REPORTING_AGENTS[getBumEchelon(unitCode)].map(key => ({ key, color: BUM_AGENT_COLORS[key] ?? '#566676' }));
}

export function resolveBumAgentKey(agent: string, available: BumCategory[]): string {
    return available.some(c => c.key === agent) ? agent : 'other';
}

export const isBumOpen = (d: BumDemand) => d.status === 'backlog' || d.status === 'inProgress' || d.status === 'blocked';

export const isBumOverdue = (d: BumDemand, now: number) =>
    isBumOpen(d) && !!d.dueAt && new Date(d.dueAt).getTime() < now;

export type BumHorizon = 'hour' | 'day' | 'week' | 'all';
export const BUM_HORIZONS: BumHorizon[] = ['hour', 'day', 'week', 'all'];
const HORIZON_MS: Record<Exclude<BumHorizon, 'all'>, number> = {
    hour: 3_600_000,
    day: 86_400_000,
    week: 604_800_000,
};

export type BumScope = 'all' | 'open' | 'overdue' | 'done' | 'canceled';
export const BUM_SCOPES: BumScope[] = ['all', 'open', 'overdue', 'done', 'canceled'];

export interface BumFilters {
    search: string;
    severities: BumSeverity[];
    categories: string[];
    horizon: BumHorizon;
}

export const DEFAULT_BUM_FILTERS: BumFilters = { search: '', severities: [], categories: [], horizon: 'week' };

// "Time phase" (hourly / daily / weekly): keep what is due within the horizon from now —
// including what's already overdue — plus demands that have no due date at all.
export function filterBumDemands(
    demands: BumDemand[],
    filters: BumFilters,
    now: number,
    categoryOf: (d: BumDemand) => string,
): BumDemand[] {
    const q = filters.search.trim().toLowerCase();
    return demands.filter(d => {
        if (filters.severities.length > 0 && !filters.severities.includes(d.severity)) return false;
        if (filters.categories.length > 0 && !filters.categories.includes(categoryOf(d))) return false;
        if (filters.horizon !== 'all' && d.dueAt && new Date(d.dueAt).getTime() > now + HORIZON_MS[filters.horizon]) return false;
        if (q && ![d.title, d.description, d.executor, d.reportingPlatform ?? '', d.notes ?? ''].some(v => v.toLowerCase().includes(q))) return false;
        return true;
    });
}

export function applyBumScope(demands: BumDemand[], scope: BumScope, now: number): BumDemand[] {
    switch (scope) {
        case 'open': return demands.filter(isBumOpen);
        case 'overdue': return demands.filter(d => isBumOverdue(d, now));
        case 'done': return demands.filter(d => d.status === 'done');
        case 'canceled': return demands.filter(d => d.status === 'canceled');
        default: return demands;
    }
}

export interface BumStats {
    total: number;
    open: number;
    donePct: number;
    overduePct: number;
    notStartedPct: number;
}

// The four dashboard gauges are shares of the (filtered) total.
export function computeBumStats(demands: BumDemand[], now: number): BumStats {
    const total = demands.length;
    const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
    return {
        total,
        open: demands.filter(isBumOpen).length,
        donePct: pct(demands.filter(d => d.status === 'done').length),
        overduePct: pct(demands.filter(d => isBumOverdue(d, now)).length),
        notStartedPct: pct(demands.filter(d => d.status === 'backlog').length),
    };
}

// Figma shows the due date as day.month.yy (e.g. 5.1.26).
export function formatBumDue(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(-2)}`;
}

export function formatBumDateTime(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function formatBumStamp(now: number): string {
    const d = new Date(now);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())} | ${p(d.getDate())}.${p(d.getMonth() + 1)}`;
}

// PRD Functional Scope "Export to Excel": the filtered demands as a CSV Excel opens natively.
export function exportBumDemandsToCsv(
    demands: BumDemand[],
    label: { status: (s: BumDemandStatus) => string; category: (key: string) => string; type: (t: string) => string; headers: string[] },
) {
    const rows = demands.map((d, i) => [
        String(i + 1),
        formatBumDateTime(d.createdAt),
        d.title,
        d.description,
        label.type(d.type),
        label.category(d.category),
        String(d.severity),
        label.status(d.status),
        d.executor,
        formatBumDateTime(d.dueAt),
        d.reportingPlatform ?? '',
        d.notes ?? '',
    ]);
    downloadCsv(label.headers, rows, `bum-manager-export-${new Date().toISOString().slice(0, 10)}.csv`);
}
