import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CombatLogEvent, CombatLogType, CombatLogSeverity, CombatLogAttachment, Cell } from '../utilities/types';
import { mockCombatLogEvents } from '../utilities/mockData';
import {
    COMBAT_LOG_STATUS_OPTIONS,
    COMBAT_LOG_END_TIME_DEFAULT_MINUTES,
    COMBAT_LOG_DONE_STATUS,
    COMBAT_LOG_CANCELLED_STATUS,
    isTerminalStatus,
} from '../utilities/combatLog';
import { mockUnits } from '../utilities/mockData';

// State + CRUD for the Integrated Combat Log (יומן לחימה מתכלל). This is also where the
// cross-log automations live — see the inline comments at each one. All of them are
// additions on top of the PRD, built to make the six logs behave like one connected
// system instead of six independent tables:
//
//   A. Work → Faults auto-close: completing a Work & Future Event closes every ICT Fault
//      linked to it, with end_time set to the moment of completion (not a generic "now"),
//      and leaves an auditable system note on each fault explaining why it closed.
//   B. Cancelling a linked Work event instead leaves a system note on each linked fault
//      (PRD 6.1) — nothing closes silently, and nothing gets left in limbo either.
//   C. Recurring-fault detection (getRecurringFaultGroup, in combatLog.ts) — turns the
//      "Recurring ICT Faults" KPI (PRD Section 10) into a live per-event signal.
//   D. Sharing an event appends a system-authored note recording who shared it, to which
//      unit, and when — so cross-unit visibility itself becomes part of the audit trail
//      (PRD Section 1's "loss of institutional knowledge" problem, applied to sharing).
//   E. Stale-event detection (isStaleEvent, in combatLog.ts) — the "No Update 2h+" KPI
//      exposed as a per-row predicate, not just a dashboard count.

export interface CreateCombatLogEventInput {
    type: CombatLogType;
    title: string;
    description: string;
    start?: string; // ISO — defaults to now if omitted (FR-02)
    end?: string; // ISO — defaults per type if omitted (FR-03), except work_future_events (mandatory)
    status?: string; // AC-01.3 — user-picked at creation for every type except reports (FR-04)
    severity?: CombatLogSeverity;
    affectedSystem?: string;
    linkedFaultIds?: string[];
    relatedCommSiteId?: string;
    attachments?: { fileName: string; fileType: 'word' | 'pdf' | 'excel' }[];
    assignedToCells?: Cell[]; // Personal Task Log integration — assign at creation time
}

export interface UpdateCombatLogEventInput {
    end?: string; // explicit user override (AC-02.5)
    status?: string;
    updateNoteText?: string;
}

interface CombatLogContextType {
    events: CombatLogEvent[];
    homeUnitCode: number;
    createEvent: (input: CreateCombatLogEventInput) => CombatLogEvent;
    updateEvent: (id: string, input: UpdateCombatLogEventInput) => void;
    shareEvent: (id: string, targetUnitCode: number) => void;
    addAttachment: (id: string, fileName: string, fileType: CombatLogAttachment['fileType']) => void;
    // Personal Task Log integration (my addition): toggles whether a cell has this event
    // pushed to its Personal Task Log — the event itself stays the single shared record,
    // this just tracks who it's currently assigned to. Driven by the row right-click menus.
    toggleAssignedCell: (id: string, cell: Cell, unitCode?: number) => void;
}

const STORAGE_KEY = 'horus_combat_log_events';

const CombatLogContext = createContext<CombatLogContextType | undefined>(undefined);

function readSessionUserName(): string {
    try {
        const raw = localStorage.getItem('session');
        const session = raw ? JSON.parse(raw) : null;
        return session?.user?.name?.he || session?.user?.name?.en || session?.user?.username || 'unknown';
    } catch {
        return 'unknown';
    }
}

function readSessionUnitCode(): number {
    try {
        const raw = localStorage.getItem('session');
        const session = raw ? JSON.parse(raw) : null;
        return session?.unit?.code ?? 1000;
    } catch {
        return 1000;
    }
}

function newId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `evt-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function unitLabel(unitCode: number): string {
    const unit = mockUnits.find(u => u.code === unitCode) as any;
    return unit?.name?.he || unit?.name?.en || `יחידה ${unitCode}`;
}

export const CombatLogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [events, setEvents] = useState<CombatLogEvent[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : mockCombatLogEvents;
        } catch {
            return mockCombatLogEvents;
        }
    });
    const homeUnitCode = readSessionUnitCode();

    const persist = (next: CombatLogEvent[]) => {
        setEvents(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    };

    const createEvent = (input: CreateCombatLogEventInput): CombatLogEvent => {
        const now = new Date().toISOString();
        const start = input.start || now;
        const defaultMinutes = COMBAT_LOG_END_TIME_DEFAULT_MINUTES[input.type];
        const end = input.end || (defaultMinutes !== undefined
            ? new Date(new Date(start).getTime() + defaultMinutes * 60000).toISOString()
            : undefined);
        const status = input.type === 'reports' ? 'דווח' : (input.status || COMBAT_LOG_STATUS_OPTIONS[input.type][0]);

        const event: CombatLogEvent = {
            id: newId(),
            type: input.type,
            title: input.title,
            description: input.description,
            start,
            end,
            status,
            reporterUserName: readSessionUserName(),
            reporterUnitCode: homeUnitCode,
            severity: input.type === 'ict_faults' ? input.severity : undefined,
            affectedSystem: input.type === 'ict_faults' ? input.affectedSystem : undefined,
            relatedCommSiteId: input.type === 'ict_faults' ? input.relatedCommSiteId : undefined,
            updateNotes: [],
            attachments: (input.attachments || []).map(a => ({ id: newId(), ...a })),
            createdAt: now,
            updatedAt: now,
            sharedWithUnitCodes: [],
            linkedFaultIds: input.type === 'work_future_events' ? input.linkedFaultIds : undefined,
            assignedToCells: input.assignedToCells || [],
        };

        persist([event, ...events]);
        return event;
    };

    const updateEvent = (id: string, input: UpdateCombatLogEventInput) => {
        const now = new Date().toISOString();
        const target = events.find(e => e.id === id);
        if (!target) return;

        const wasTerminal = isTerminalStatus(target.type, target.status);
        const nextStatus = input.status ?? target.status;
        const becameTerminal = !wasTerminal && isTerminalStatus(target.type, nextStatus);
        // FR-09: reaching a terminal status auto-sets end_time, unless the user supplied
        // their own value in the same edit (AC-02.5 lets them override it).
        const nextEnd = input.end ?? (becameTerminal ? now : target.end);

        const nextNotes = input.updateNoteText?.trim()
            ? [...target.updateNotes, { id: newId(), text: input.updateNoteText.trim(), authorUserName: readSessionUserName(), timestamp: now }]
            : target.updateNotes;

        let nextEvents = events.map(e => e.id === id
            ? { ...e, status: nextStatus, end: nextEnd, updateNotes: nextNotes, updatedAt: now }
            : e
        );

        // Automation A — Work & Future Events → ICT Faults auto-close cascade.
        const justCompleted = target.type === 'work_future_events'
            && nextStatus === COMBAT_LOG_DONE_STATUS.work_future_events
            && target.status !== COMBAT_LOG_DONE_STATUS.work_future_events;
        // Automation B — cancelling a linked work event notes it on the faults instead.
        const justCancelled = target.type === 'work_future_events'
            && nextStatus === COMBAT_LOG_CANCELLED_STATUS.work_future_events
            && target.status !== COMBAT_LOG_CANCELLED_STATUS.work_future_events;

        if ((justCompleted || justCancelled) && target.linkedFaultIds?.length) {
            const linkedSet = new Set(target.linkedFaultIds);
            nextEvents = nextEvents.map(e => {
                if (!linkedSet.has(e.id) || e.type !== 'ict_faults') return e;
                if (justCompleted && !isTerminalStatus('ict_faults', e.status)) {
                    return {
                        ...e,
                        status: COMBAT_LOG_DONE_STATUS.ict_faults!,
                        end: nextEnd,
                        updatedAt: now,
                        updateNotes: [...e.updateNotes, {
                            id: newId(),
                            text: `נסגרה אוטומטית בעקבות סיום עבודה: "${target.title}"`,
                            authorUserName: readSessionUserName(),
                            timestamp: now,
                            system: true,
                        }],
                    };
                }
                if (justCancelled) {
                    return {
                        ...e,
                        updatedAt: now,
                        updateNotes: [...e.updateNotes, {
                            id: newId(),
                            text: `העבודה שיועדה לטפל בתקלה זו ("${target.title}") בוטלה`,
                            authorUserName: readSessionUserName(),
                            timestamp: now,
                            system: true,
                        }],
                    };
                }
                return e;
            });
        }

        persist(nextEvents);
    };

    const shareEvent = (id: string, targetUnitCode: number) => {
        const now = new Date().toISOString();
        persist(events.map(e => {
            if (e.id !== id || e.sharedWithUnitCodes.includes(targetUnitCode)) return e;
            return {
                ...e,
                sharedWithUnitCodes: [...e.sharedWithUnitCodes, targetUnitCode],
                updatedAt: now,
                updateNotes: [...e.updateNotes, {
                    id: newId(),
                    text: `שותף עם ${unitLabel(targetUnitCode)} על ידי ${readSessionUserName()}`,
                    authorUserName: readSessionUserName(),
                    timestamp: now,
                    system: true,
                }],
            };
        }));
    };

    const addAttachment = (id: string, fileName: string, fileType: CombatLogAttachment['fileType']) => {
        const now = new Date().toISOString();
        persist(events.map(e => e.id === id
            ? { ...e, attachments: [...e.attachments, { id: newId(), fileName, fileType }], updatedAt: now }
            : e
        ));
    };

    const toggleAssignedCell = (id: string, cell: Cell, unitCode: number = homeUnitCode) => {
        const now = new Date().toISOString();
        persist(events.map(e => {
            if (e.id !== id) return e;
            const current = e.assignedToCells || [];
            const isAssigned = current.includes(cell);
            const units = e.assignedUnitCodes || [];
            // A non-reporter unit is remembered so its Personal Task Log can show the event.
            const nextUnits = unitCode === e.reporterUnitCode ? units
                : isAssigned ? units.filter(u => u !== unitCode)
                : (units.includes(unitCode) ? units : [...units, unitCode]);
            return {
                ...e,
                assignedToCells: isAssigned ? current.filter(c => c !== cell) : [...current, cell],
                assignedUnitCodes: nextUnits,
                updatedAt: now,
            };
        }));
    };

    return (
        <CombatLogContext.Provider value={{ events, homeUnitCode, createEvent, updateEvent, shareEvent, addAttachment, toggleAssignedCell }}>
            {children}
        </CombatLogContext.Provider>
    );
};

export const useCombatLogContext = () => {
    const context = useContext(CombatLogContext);
    if (context === undefined) throw new Error('useCombatLogContext must be used within a CombatLogProvider');
    return context;
};
