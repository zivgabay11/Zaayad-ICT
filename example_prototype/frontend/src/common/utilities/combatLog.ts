import { CombatLogEvent, CombatLogType, CombatLogSeverity, UserRole } from './types';

// Domain constants + pure helpers for the Integrated Combat Log (יומן לחימה מתכלל).
// See PRD v2.0 sections 3, 5.2, 9 for the source-of-truth tables these mirror, and the
// comments below for the cross-log automations added on top of the PRD (documented in
// full in CombatLogContext.tsx, where they're actually triggered).

export const COMBAT_LOG_TYPES: CombatLogType[] = ['reports', 'ict_faults', 'losses', 'work_future_events', 'spectrum', 'other'];

// Personal Task Log integration (my addition): only these 4 sub-logs can be pushed to a
// role's Personal Task Log — spectrum and other are excluded per product decision.
export const LINKABLE_COMBAT_LOG_TYPES: CombatLogType[] = ['ict_faults', 'work_future_events', 'reports', 'losses'];

// PRD Section 3 — one color per log type, used for the badge, the Gantt blocks, and charts.
export const COMBAT_LOG_TYPE_COLORS: Record<CombatLogType, string> = {
    reports: '#2563EB',
    ict_faults: '#DC2626',
    losses: '#7C3AED',
    work_future_events: '#D97706',
    spectrum: '#0D9488',
    other: '#64748B',
};

// Dot/badge color per severity (ict_faults only) — used on the fault table row and reused
// by the Personal Task Log's linked-item cards for the same visual language.
export const COMBAT_LOG_SEVERITY_COLOR: Record<CombatLogSeverity, string> = {
    critical: '#dc2626',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
};

// PRD Section 5.2 — status vocabulary is closed per log type. Reports has exactly one
// value and is never shown as a dropdown (FR-04/FR-06) — it's set automatically.
export const COMBAT_LOG_STATUS_OPTIONS: Record<CombatLogType, string[]> = {
    reports: ['דווח'],
    ict_faults: ['פתוח', 'בטיפול', 'נסגר'],
    losses: ['לא הוגש תחקיר', 'הוגש תחקיר'],
    work_future_events: ['ממתין', 'בביצוע', 'בוצע', 'בוטל'],
    spectrum: ['פעיל', 'לא פעיל', 'בוטל'],
    other: ['פתוח', 'בטיפול', 'נסגר'],
};

// The "terminal" values from PRD 5.2 / 9 — reaching one of these auto-sets end_time.
export const COMBAT_LOG_TERMINAL_STATUSES: Record<CombatLogType, string[]> = {
    reports: ['דווח'],
    ict_faults: ['נסגר'],
    losses: ['הוגש תחקיר'],
    work_future_events: ['בוצע', 'בוטל'],
    spectrum: ['לא פעיל', 'בוטל'],
    other: ['נסגר'],
};

// The specific "successfully completed" terminal value where one exists, as opposed to a
// cancellation — this is what actually drives the work→faults auto-close automation.
export const COMBAT_LOG_DONE_STATUS: Partial<Record<CombatLogType, string>> = {
    ict_faults: 'נסגר',
    work_future_events: 'בוצע',
};

export const COMBAT_LOG_CANCELLED_STATUS: Partial<Record<CombatLogType, string>> = {
    work_future_events: 'בוטל',
    spectrum: 'בוטל',
};

// PRD Section 9 — end_time default (minutes after start) when the user leaves it empty.
// work_future_events has no default: both times are mandatory user input (FR-03).
export const COMBAT_LOG_END_TIME_DEFAULT_MINUTES: Partial<Record<CombatLogType, number>> = {
    reports: 30,
    ict_faults: 60 * 24 * 7, // 7 days
    losses: 30,
    spectrum: 30,
    other: 60,
};

export function isTerminalStatus(type: CombatLogType, status: string): boolean {
    return COMBAT_LOG_TERMINAL_STATUSES[type].includes(status);
}

// Recurring-fault detection (my addition — operationalizes the "Recurring ICT Faults" KPI
// from PRD Section 10): faults sharing the same affected system within a trailing 7-day
// window are grouped so the UI can surface a "חוזר" badge instead of a silent metric.
const RECURRING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function getRecurringFaultGroup(event: CombatLogEvent, allEvents: CombatLogEvent[]): CombatLogEvent[] {
    if (event.type !== 'ict_faults' || !event.affectedSystem) return [];
    const eventTime = new Date(event.start).getTime();
    return allEvents.filter(e =>
        e.type === 'ict_faults' &&
        e.affectedSystem === event.affectedSystem &&
        Math.abs(new Date(e.start).getTime() - eventTime) <= RECURRING_WINDOW_MS
    );
}

// "No Update 2h+" (PRD Section 7.2/10) as a per-event predicate, so it can be shown as a
// badge on each row and not just as a dashboard count.
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

export function isStaleEvent(event: CombatLogEvent, nowMs: number): boolean {
    if (isTerminalStatus(event.type, event.status)) return false;
    return nowMs - new Date(event.updatedAt).getTime() > STALE_THRESHOLD_MS;
}

// Cross-module integration with Static Space Establishment (my addition): every ICT Fault
// tagged against a given Comm Site, open ones first (then newest-first within each group),
// so a site's own table row / map popup can show its live fault plus its fault history —
// a fault "falls into history" automatically the moment it's closed, no separate action.
export function getFaultsForCommSite(siteId: string, allEvents: CombatLogEvent[]): CombatLogEvent[] {
    return allEvents
        .filter(e => e.type === 'ict_faults' && e.relatedCommSiteId === siteId)
        .sort((a, b) => {
            const aOpen = !isTerminalStatus('ict_faults', a.status);
            const bOpen = !isTerminalStatus('ict_faults', b.status);
            if (aOpen !== bOpen) return aOpen ? -1 : 1;
            return new Date(b.start).getTime() - new Date(a.start).getTime();
        });
}

// "Already being handled" surfacing (my addition): find the currently-open work event (if
// any) that lists this fault among its linkedFaultIds, so the fault's own row/view can
// show "מטופל במסגרת: [work title]" instead of risking a duplicate work item.
export function getHandlingWorkEvent(faultId: string, allEvents: CombatLogEvent[]): CombatLogEvent | undefined {
    return allEvents.find(e =>
        e.type === 'work_future_events' &&
        !isTerminalStatus('work_future_events', e.status) &&
        e.linkedFaultIds?.includes(faultId)
    );
}

// Edit permission for a given viewing unit (PRD 4.1/4.2): the originating unit always has
// full access to its own three editable fields; any other unit only gets access once the
// event has been explicitly shared with it, and then only per the log type's table in 4.2.
export type CombatLogEditPermission = 'owner' | 'sharedFull' | 'sharedAttachmentsOnly' | 'sharedReadonly' | 'readonly';

export function getEditPermission(event: CombatLogEvent, viewingUnitCode: number, viewingRole?: UserRole): CombatLogEditPermission {
    // A role the event was explicitly assigned to (Personal Task Log integration) gets full
    // owner-equivalent rights — that's a deliberate handoff of responsibility, distinct from
    // the passive cross-unit visibility rules below.
    if (viewingRole && event.assignedToRoles?.includes(viewingRole)) return 'owner';
    if (event.reporterUnitCode === viewingUnitCode) return 'owner';
    if (event.sharedWithUnitCodes.includes(viewingUnitCode)) {
        if (event.type === 'ict_faults' || event.type === 'work_future_events' || event.type === 'other') return 'sharedFull';
        if (event.type === 'losses') return 'sharedAttachmentsOnly';
        return 'sharedReadonly'; // reports, spectrum
    }
    return 'readonly'; // visible to everyone (PRD 4.1), but untouched unless shared
}

function isSameCalendarDay(aMs: number, bMs: number): boolean {
    const a = new Date(aMs), b = new Date(bMs);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export interface SituationPicture {
    totalEvents: { total: number; open: number; closedToday: number; pending: number };
    criticalFaults: { total: number; critical: number; high: number };
    workEvents: { activeNow: number; upcoming: number };
    activeSpectrum: { active: number; cancelled: number };
    closedToday: { count: number; avgHandlingMinutes: number };
    noUpdate: { count: number; percentOfOpen: number };
}

// PRD Section 7.2 — the six-card "Situation Picture" dashboard. Computed off the full
// event list (not the active table filters) since it's meant to be an objective snapshot,
// not a view of whatever the user happens to be filtering to.
export function computeSituationPicture(events: CombatLogEvent[], nowMs: number): SituationPicture {
    const todayEvents = events.filter(e => isSameCalendarDay(new Date(e.start).getTime(), nowMs));
    const open = todayEvents.filter(e => !isTerminalStatus(e.type, e.status));
    const closedToday = todayEvents.filter(e => isTerminalStatus(e.type, e.status) && isSameCalendarDay(new Date(e.updatedAt).getTime(), nowMs));
    const pending = todayEvents.filter(e => e.status === 'ממתין');

    const openFaults = events.filter(e => e.type === 'ict_faults' && !isTerminalStatus('ict_faults', e.status));
    const criticalFaults = openFaults.filter(e => e.severity === 'critical');
    const highFaults = openFaults.filter(e => e.severity === 'high');

    const workEvents = events.filter(e => e.type === 'work_future_events');
    const activeWork = workEvents.filter(e => e.status === 'בביצוע');
    const upcomingWork = workEvents.filter(e => e.status === 'ממתין');

    const spectrumEvents = events.filter(e => e.type === 'spectrum');
    const activeSpectrum = spectrumEvents.filter(e => e.status === 'פעיל');
    const cancelledSpectrum = spectrumEvents.filter(e => e.status === 'בוטל');

    const closedTodayAll = events.filter(e => isTerminalStatus(e.type, e.status) && isSameCalendarDay(new Date(e.updatedAt).getTime(), nowMs));
    const handlingTimes = closedTodayAll.map(e => (new Date(e.updatedAt).getTime() - new Date(e.createdAt).getTime()) / 60000);
    const avgHandlingMinutes = handlingTimes.length ? Math.round(handlingTimes.reduce((a, b) => a + b, 0) / handlingTimes.length) : 0;

    const allOpen = events.filter(e => !isTerminalStatus(e.type, e.status));
    const staleOpen = allOpen.filter(e => isStaleEvent(e, nowMs));

    return {
        totalEvents: { total: todayEvents.length, open: open.length, closedToday: closedToday.length, pending: pending.length },
        criticalFaults: { total: criticalFaults.length + highFaults.length, critical: criticalFaults.length, high: highFaults.length },
        workEvents: { activeNow: activeWork.length, upcoming: upcomingWork.length },
        activeSpectrum: { active: activeSpectrum.length, cancelled: cancelledSpectrum.length },
        closedToday: { count: closedTodayAll.length, avgHandlingMinutes },
        noUpdate: { count: staleOpen.length, percentOfOpen: allOpen.length ? Math.round((staleOpen.length / allOpen.length) * 100) : 0 },
    };
}
