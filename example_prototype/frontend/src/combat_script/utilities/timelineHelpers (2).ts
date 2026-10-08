import type { ItemDefinition, Range, RowDefinition } from 'dnd-timeline';
import type { Plan, Task, Phase } from '../../common/utilities/types';

export interface TimelineTaskItem extends ItemDefinition {
    task: Task;
}

/**
 * Compute the base timestamp from the plan's D-Day and H-Hour.
 */
export function getBaseTimestamp(plan: Plan): number {
    const dDay = plan.dDay || '2026-05-15';
    const hHour = plan.hHour || '04:00';
    const [hours, minutes] = hHour.split(':').map(Number);
    const base = new Date(dDay);
    base.setHours(hours, minutes, 0, 0);
    return base.getTime();
}

/**
 * Converts Task[] to TimelineTaskItem[] for dnd-timeline consumption.
 * Uses task-level offsets if available, otherwise falls back to phase offsets.
 */
export function tasksToTimelineItems(tasks: Task[], plan: Plan): TimelineTaskItem[] {
    const baseTs = getBaseTimestamp(plan);
    const HOUR_MS = 3600000;

    return tasks.map((task) => {
        let startMs: number;
        let endMs: number;

        if (task.startOffsetHours != null && task.endOffsetHours != null) {
            // Task has explicit offsets
            startMs = baseTs + task.startOffsetHours * HOUR_MS;
            endMs = baseTs + task.endOffsetHours * HOUR_MS;
        } else {
            // Fallback to phase offsets
            const phase = plan.phases.find(p => p.id === task.phaseId);
            if (phase && phase.startOffsetHours != null && phase.endOffsetHours != null) {
                startMs = baseTs + phase.startOffsetHours * HOUR_MS;
                endMs = baseTs + phase.endOffsetHours * HOUR_MS;
            } else {
                // Last resort: use entire plan range
                const range = computeDefaultRange(plan);
                startMs = range.start;
                endMs = range.start + 2 * HOUR_MS; // 2-hour default span
            }
        }

        // Ensure end > start
        if (endMs <= startMs) {
            endMs = startMs + HOUR_MS;
        }

        return {
            id: task.id,
            rowId: task.primaryUnitId || 'unassigned',
            span: { start: startMs, end: endMs },
            task,
        };
    });
}

/**
 * Converts plan units to RowDefinition[] for dnd-timeline.
 */
export function unitsToRows(plan: Plan): RowDefinition[] {
    const rows: RowDefinition[] = plan.units.map(u => ({
        id: u.code.toString(),
    }));

    // Add unassigned row
    rows.push({ id: 'unassigned' });

    return rows;
}

/**
 * Compute the default visible range from plan phases, centered on H-Hour.
 */
export function computeDefaultRange(plan: Plan): Range {
    const baseTs = getBaseTimestamp(plan);
    const HOUR_MS = 3600000;

    if (plan.phases.length > 0) {
        const sortedPhases = [...plan.phases].sort((a, b) => a.index - b.index);
        const earliest = sortedPhases[0];
        const latest = sortedPhases[sortedPhases.length - 1];

        const start = baseTs + (earliest.startOffsetHours ?? -24) * HOUR_MS;
        const end = baseTs + (latest.endOffsetHours ?? 8) * HOUR_MS;

        // Add some padding
        return { start: start - HOUR_MS, end: end + HOUR_MS };
    }

    // Default: show 24 hours centered on H-Hour
    return { start: baseTs - 12 * HOUR_MS, end: baseTs + 12 * HOUR_MS };
}

/**
 * Convert a drag/resize result back to task offset hours relative to H-Hour.
 */
export function spanToOffsetHours(span: { start: number; end: number }, plan: Plan): {
    startOffsetHours: number;
    endOffsetHours: number;
} {
    const baseTs = getBaseTimestamp(plan);
    const HOUR_MS = 3600000;

    return {
        startOffsetHours: (span.start - baseTs) / HOUR_MS,
        endOffsetHours: (span.end - baseTs) / HOUR_MS,
    };
}

/**
 * Get phase at a given timestamp.
 */
export function getPhaseAtTimestamp(timestamp: number, plan: Plan): Phase | undefined {
    const baseTs = getBaseTimestamp(plan);
    const HOUR_MS = 3600000;
    const offsetHours = (timestamp - baseTs) / HOUR_MS;

    return plan.phases.find(p =>
        p.startOffsetHours != null &&
        p.endOffsetHours != null &&
        offsetHours >= p.startOffsetHours &&
        offsetHours < p.endOffsetHours
    );
}
