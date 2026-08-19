import { SpectrumZone, SpectrumZoneType, JammingStatus } from './types';

// Domain constants + pure helpers for the "Spectrum" map layer (ספקטרום): Jamming zones
// (השתקות) and Blocking zones (חסימות). Jamming colors carry timing meaning (has it
// started/ended yet); Blocking is always red — it never depends on time, only on whether
// the polygon is in effect.

export const SPECTRUM_ZONE_TYPES: SpectrumZoneType[] = ['jamming', 'blocking'];

export const JAMMING_STATUSES: JammingStatus[] = ['ended', 'active', 'future'];

export const JAMMING_STATUS_COLORS: Record<JammingStatus, string> = {
    ended: '#71717a', // gray
    active: '#22c55e', // green
    future: '#7dd3fc', // sky (very light blue)
};

export const BLOCKING_COLOR = '#dc2626'; // red — always, regardless of timing

// A jamming zone's status is derived from its time window rather than stored redundantly —
// mirrors how `combatLog.ts` / `commSiteService.ts` derive state from timestamps instead of
// trusting a separately-set flag that could drift out of sync.
export function computeJammingStatus(startAt?: string, endAt?: string, nowMs: number = Date.now()): JammingStatus {
    if (startAt && nowMs < new Date(startAt).getTime()) return 'future';
    if (endAt && nowMs > new Date(endAt).getTime()) return 'ended';
    return 'active';
}

export function getZoneColor(zone: SpectrumZone, nowMs: number = Date.now()): string {
    if (zone.zoneType === 'blocking') return BLOCKING_COLOR;
    return JAMMING_STATUS_COLORS[computeJammingStatus(zone.startAt, zone.endAt, nowMs)];
}

// A short "X h Y min" / "X min" duration label for how long until a jamming window starts
// or ends — deliberately not routed through formatRelativeSeconds/-Minutes, since those are
// phrased as "...ago" and this is always a forward-looking countdown.
export function formatDurationMinutes(totalMinutes: number, t: (key: string, opts?: any) => string): string {
    const minutes = Math.max(0, Math.round(totalMinutes));
    if (minutes < 60) return t('spectrum.time.minutes', { count: minutes });
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    if (remMinutes === 0) return t('spectrum.time.hours', { count: hours });
    return `${t('spectrum.time.hours', { count: hours })} ${t('spectrum.time.minutes', { count: remMinutes })}`;
}

export function getVisibleZones(
    allZones: SpectrumZone[],
    layerOn: boolean,
    jammingFilterOn: boolean,
    blockingFilterOn: boolean,
    jammingStatusFilters: Record<JammingStatus, boolean>,
    nowMs: number = Date.now(),
): SpectrumZone[] {
    if (!layerOn) return [];
    return allZones.filter(zone => {
        if (zone.zoneType === 'blocking') return blockingFilterOn;
        return jammingFilterOn && jammingStatusFilters[computeJammingStatus(zone.startAt, zone.endAt, nowMs)];
    });
}
