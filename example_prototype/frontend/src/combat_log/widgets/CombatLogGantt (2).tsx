import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CombatLogEvent } from '../../common/utilities/types';
import { COMBAT_LOG_TYPES, COMBAT_LOG_TYPE_COLORS } from '../../common/utilities/combatLog';

// Gantt / Timeline view (PRD 6.6): every event appears (FR-22), grouped into one row per
// log type, each block colored per type (FR-24) and labeled with the sub-log name only —
// never the module name (FR-23 / the callout on PRD page 2) — respecting start/end,
// including auto-calculated values (FR-25). The event's own title shows on hover/click.

interface CombatLogGanttProps {
    events: CombatLogEvent[];
    onView: (id: string) => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ROW_HEIGHT = 48; // px, must match h-12 below

export const CombatLogGantt: React.FC<CombatLogGanttProps> = ({ events, onView }) => {
    const { t } = useTranslation();

    const { windowStart, windowEnd, dayTicks } = useMemo(() => {
        const now = Date.now();
        if (events.length === 0) {
            const start = now - 3 * MS_PER_DAY, end = now + 3 * MS_PER_DAY;
            return { windowStart: start, windowEnd: end, dayTicks: buildDayTicks(start, end) };
        }
        const starts = events.map(e => new Date(e.start).getTime());
        const ends = events.map(e => new Date(e.end || e.start).getTime());
        const min = Math.min(...starts, now);
        const max = Math.max(...ends, now);
        const pad = Math.max((max - min) * 0.08, MS_PER_DAY / 2);
        const start = min - pad, end = max + pad;
        return { windowStart: start, windowEnd: end, dayTicks: buildDayTicks(start, end) };
    }, [events]);

    const range = windowEnd - windowStart;
    const pct = (ms: number) => `${Math.min(100, Math.max(0, ((ms - windowStart) / range) * 100))}%`;
    const nowPct = pct(Date.now());

    return (
        <div className="flex-1 min-h-0 flex rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
            {/* Frozen row-label column */}
            <div className="w-32 shrink-0 border-e border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 overflow-hidden">
                <div className="h-8 border-b border-slate-200 dark:border-zinc-800" />
                {COMBAT_LOG_TYPES.map(type => (
                    <div key={type} className="border-b border-slate-100 dark:border-zinc-800 flex items-center px-2.5" style={{ height: ROW_HEIGHT }}>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-zinc-300 truncate">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COMBAT_LOG_TYPE_COLORS[type] }} />
                            {t(`combatLog.logTypes.${type}`)}
                        </span>
                    </div>
                ))}
            </div>

            {/* Scrollable timeline */}
            <div className="flex-1 overflow-auto">
                <div className="min-w-[900px] relative">
                    <div className="h-8 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 sticky top-0 z-10 relative">
                        {dayTicks.map(tick => (
                            <div key={tick.ms} className="absolute top-0 h-full flex items-center text-[10px] text-slate-400 dark:text-zinc-500 border-s border-slate-200 dark:border-zinc-700 ps-1.5" style={{ insetInlineStart: pct(tick.ms) }}>
                                {tick.label}
                            </div>
                        ))}
                    </div>

                    <div className="relative">
                        <div className="absolute top-0 bottom-0 w-px bg-primary/50 z-[1]" style={{ insetInlineStart: nowPct }} />
                        {COMBAT_LOG_TYPES.map(type => {
                            const rowEvents = events.filter(e => e.type === type);
                            const color = COMBAT_LOG_TYPE_COLORS[type];
                            return (
                                <div key={type} className="relative border-b border-slate-100 dark:border-zinc-800" style={{ height: ROW_HEIGHT }}>
                                    {rowEvents.map(event => {
                                        const startMs = new Date(event.start).getTime();
                                        const endMs = new Date(event.end || event.start).getTime();
                                        const left = pct(startMs);
                                        const width = `${Math.max(0.8, ((Math.max(endMs, startMs) - startMs) / range) * 100)}%`;
                                        return (
                                            <button
                                                key={event.id}
                                                onClick={() => onView(event.id)}
                                                title={event.title}
                                                className="absolute top-1.5 bottom-1.5 rounded-md text-[10px] font-semibold text-white flex items-center px-1.5 overflow-hidden hover:brightness-110 transition-all shadow-sm"
                                                style={{ insetInlineStart: left, width, background: color, minWidth: 6 }}
                                            >
                                                <span className="truncate">{t(`combatLog.logTypes.${type}`)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

function buildDayTicks(startMs: number, endMs: number) {
    const ticks: { ms: number; label: string }[] = [];
    const dayMs = MS_PER_DAY;
    let cursor = Math.floor(startMs / dayMs) * dayMs;
    while (cursor <= endMs) {
        ticks.push({ ms: cursor, label: new Date(cursor).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) });
        cursor += dayMs;
    }
    return ticks;
}
