import { SpectrumZone, SpectrumZoneType, JammingStatus, BlockingBand, BlockingStatus } from './types';

// Domain constants + pure helpers for the "Spectrum" map layer (ספקטרום): Jamming zones
// (השתקות) and Blocking zones (חסימות). Jamming colors carry timing meaning (has it
// started/ended yet); Blocking colors carry band meaning (L1 vs שו"ב) — each band always
// renders in its own color regardless of whether the block is still active.

export const SPECTRUM_ZONE_TYPES: SpectrumZoneType[] = ['jamming', 'blocking'];

export const JAMMING_STATUSES: JammingStatus[] = ['ended', 'active', 'future'];
export const BLOCKING_STATUSES: BlockingStatus[] = ['active', 'ended'];
export const BLOCKING_BANDS: BlockingBand[] = ['l1', 'comms'];

export const JAMMING_STATUS_COLORS: Record<JammingStatus, string> = {
    ended: '#71717a', // gray
    active: '#22c55e', // green
    future: '#7dd3fc', // sky (very light blue)
};

// Kept as the fallback for a blocking zone with no band set.
export const BLOCKING_COLOR = '#dc2626'; // red

export const BLOCKING_BAND_COLORS: Record<BlockingBand, string> = {
    l1: '#f97316', // orange
    comms: '#a855f7', // purple
};

// A jamming zone's status is derived from its time window rather than stored redundantly —
// mirrors how `combatLog.ts` / `commSiteService.ts` derive state from timestamps instead of
// trusting a separately-set flag that could drift out of sync.
export function computeJammingStatus(startAt?: string, endAt?: string, nowMs: number = Date.now()): JammingStatus {
    if (startAt && nowMs < new Date(startAt).getTime()) return 'future';
    if (endAt && nowMs > new Date(endAt).getTime()) return 'ended';
    return 'active';
}

// A blocking zone with no endAt has no expiry — it's always active.
export function computeBlockingStatus(endAt?: string, nowMs: number = Date.now()): BlockingStatus {
    if (endAt && nowMs > new Date(endAt).getTime()) return 'ended';
    return 'active';
}

export function getZoneColor(zone: SpectrumZone, nowMs: number = Date.now()): string {
    if (zone.zoneType === 'blocking') return zone.band ? BLOCKING_BAND_COLORS[zone.band] : BLOCKING_COLOR;
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
    blockingBandFilters: Record<BlockingBand, boolean>,
    nowMs: number = Date.now(),
): SpectrumZone[] {
    if (!layerOn) return [];
    return allZones.filter(zone => {
        if (zone.zoneType === 'blocking') return blockingFilterOn && (!zone.band || blockingBandFilters[zone.band]);
        return jammingFilterOn && jammingStatusFilters[computeJammingStatus(zone.startAt, zone.endAt, nowMs)];
    });
}
