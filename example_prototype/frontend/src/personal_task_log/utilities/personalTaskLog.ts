import { PersonalTask, PersonalTaskStatus, CombatLogEvent, CombatLogType } from '../../common/utilities/types';

// Domain constants + pure helpers for the Personal Task Log (יומן משימות אישי). Mirrors
// common/utilities/combatLog.ts's shape: constants/colors/pure functions here, React state
// + CRUD in PersonalTaskLogContext.tsx.

// Figma's accordion section order (also the stats-bar / filter-checklist order).
export const PERSONAL_TASK_STATUS_ORDER: PersonalTaskStatus[] = ['open', 'inProgress', 'done', 'blocked', 'cancelled'];

// Card accent bar + badge colors. 'open'/'inProgress' are the exact tokens extracted from
// the Figma design-context response; 'done'/'blocked'/'cancelled' weren't shown on any
// sampled card (flagged in design research), so they reuse the same semantic color system
// (success / neutral / error) already used elsewhere in the app for consistency.
export const PERSONAL_TASK_STATUS_ACCENT: Record<PersonalTaskStatus, string> = {
    open: '#a8eeff',
    inProgress: '#3dd68c',
    done: '#64748b',
    blocked: '#ff9592',
    cancelled: '#94a3b8',
};

export const PERSONAL_TASK_STATUS_BADGE_CLASS: Record<PersonalTaskStatus, string> = {
    open: 'bg-[#128fff]/[0.12] border-[#1db2fe]/40 text-[#2563eb] dark:text-[#7cd3ff]',
    inProgress: 'bg-[#22ff99]/[0.12] border-[#54ffad]/40 text-[#16a34a] dark:text-[#46fea5]',
    done: 'bg-slate-500/10 border-slate-400/40 text-slate-600 dark:text-slate-300',
    blocked: 'bg-[#f22f3e]/[0.07] border-[#ff5361]/50 text-[#dc2626] dark:text-[#ff9592]',
    cancelled: 'bg-slate-400/10 border-slate-400/30 text-slate-500 dark:text-slate-400',
};

export const PERSONAL_TASK_SEVERITY_DOT_COLOR: Record<string, string> = {
    high: '#ef4444',
    low: '#22c55e',
    medium: '#eab308',
    unknown: '#94a3b8',
};

// Unusual but intentional order per the Figma spec — High, Low, Medium, Unknown.
export const PERSONAL_TASK_SEVERITY_ORDER = ['high', 'low', 'medium', 'unknown'] as const;

// A unified display row for the screen: either a manual task (its own record) or a Combat
// Log event pushed to this role (the "single shared record" — no separate copy; editing a
// linked item's status/notes writes straight through to the CombatLogEvent, so the Combat
// Log screen sees the same change immediately). `status` is precomputed on both so the
// screen's grouping/stats logic doesn't need to know which kind it's looking at.
export interface ManualTaskItem {
    kind: 'manual';
    id: string;
    status: PersonalTaskStatus;
    task: PersonalTask;
}

export interface LinkedTaskItem {
    kind: 'linked';
    id: string; // the CombatLogEvent's own id
    status: PersonalTaskStatus;
    event: CombatLogEvent;
}

export type TaskLogItem = ManualTaskItem | LinkedTaskItem;

// Combat Log statuses are a closed, type-specific vocabulary (see COMBAT_LOG_STATUS_OPTIONS
// in combatLog.ts) that doesn't line up with the Personal Task Log's 5 generic buckets.
// These two maps translate between them, only for the 4 linkable types — used to (a) group
// a linked event into the right accordion section, and (b) translate a drag-and-drop or
// status-select change in the Personal Task Log back into a real status on the event.
export const COMBAT_LOG_STATUS_TO_PERSONAL: Partial<Record<CombatLogType, Record<string, PersonalTaskStatus>>> = {
    ict_faults: { 'פתוח': 'open', 'בטיפול': 'inProgress', 'נסגר': 'done' },
    work_future_events: { 'ממתין': 'open', 'בביצוע': 'inProgress', 'בוצע': 'done', 'בוטל': 'cancelled' },
    losses: { 'לא הוגש תחקיר': 'open', 'הוגש תחקיר': 'done' },
    // Reports have a single fixed status (FR-04) — treated as already "done" since there's
    // no further lifecycle to track.
    reports: { 'דווח': 'done' },
};

// Reverse of the above — only the entries that exist above a type's vocabulary allows. A
// target status with no entry here (e.g. "blocked" for any type, or "cancelled" for a
// fault) has no valid real-status equivalent, so the caller should ignore that drop/change
// rather than inventing one.
export const PERSONAL_STATUS_TO_COMBAT_LOG: Partial<Record<CombatLogType, Partial<Record<PersonalTaskStatus, string>>>> = {
    ict_faults: { open: 'פתוח', inProgress: 'בטיפול', done: 'נסגר' },
    work_future_events: { open: 'ממתין', inProgress: 'בביצוע', done: 'בוצע', cancelled: 'בוטל' },
    losses: { open: 'לא הוגש תחקיר', done: 'הוגש תחקיר' },
    reports: {},
};

export function mapCombatLogStatusToPersonal(event: CombatLogEvent): PersonalTaskStatus {
    return COMBAT_LOG_STATUS_TO_PERSONAL[event.type]?.[event.status] ?? 'open';
}

export interface PersonalTaskStats {
    total: number;
    open: number;
    inProgress: number;
    done: number;
    blocked: number;
    cancelled: number;
}

// Single source of truth for the stats panel numbers — one real count per status plus a
// total, nothing fabricated (the Figma mock itself had inconsistent counts/trend numbers
// across frames, so this derives every number from the same task list instead of risking
// that drift in the real implementation).
export function computeTaskStats(items: TaskLogItem[]): PersonalTaskStats {
    return {
        total: items.length,
        open: items.filter(i => i.status === 'open').length,
        inProgress: items.filter(i => i.status === 'inProgress').length,
        done: items.filter(i => i.status === 'done').length,
        blocked: items.filter(i => i.status === 'blocked').length,
        cancelled: items.filter(i => i.status === 'cancelled').length,
    };
}

function startOfDay(ms: number): number {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

// Basic recurrence check for a periodic task — no full RRULE engine, just enough to tell
// whether "today" is one of its recurring occurrences, per its frequency.
export function isRecurringDueToday(task: PersonalTask, nowMs: number): boolean {
    if (task.recurrence !== 'periodic' || !task.recurrenceRule || !task.start) return false;
    const today = startOfDay(nowMs);
    const ruleEnd = startOfDay(new Date(task.recurrenceRule.endDate).getTime());
    if (today > ruleEnd) return false;
    const taskStart = startOfDay(new Date(task.start).getTime());
    if (today < taskStart) return false;
    const dayDiff = Math.round((today - taskStart) / (24 * 60 * 60 * 1000));
    switch (task.recurrenceRule.frequency) {
        case 'daily': return true;
        case 'weekly': return dayDiff % 7 === 0;
        case 'monthly': return new Date(today).getDate() === new Date(taskStart).getDate();
        default: return false;
    }
}
