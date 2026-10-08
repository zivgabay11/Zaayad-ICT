import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { TrackedDeviceType, WatchedUnitSelection, TrackedDevice } from '../utilities/types';
import { getUnitAndDescendantCodes } from '../utilities/mockData';

// State for the "Tikshov Common Operational Picture" (תמ"כ תקשוב) feature: the map layer
// toggle + its per-device-type sub-filters (PRD 5.1/10.1), the unit's watched-units list
// with its audit trail (2.9/5.4/7.5), and the global time-range control shared by the map,
// table, and statistics views (3.10/5.6). The device catalog itself lives in mockData.ts.

export type TimeRangePreset = '1h' | '2h' | 'day' | 'week' | 'custom';

export interface TimeRangeValue {
    preset: TimeRangePreset;
    minutes: number; // resolved window length, used to compute "active at any point in range"
}

const PRESET_MINUTES: Record<Exclude<TimeRangePreset, 'custom'>, number> = {
    '1h': 60,
    '2h': 120,
    day: 60 * 24,
    week: 60 * 24 * 7,
};

const ALL_DEVICE_TYPES: TrackedDeviceType[] = ['sheked', 'dual', 'setz', 'maban', 'setz_modem', 'elad_green'];

function readSessionUnitCode(): number {
    try {
        const raw = localStorage.getItem('session');
        const session = raw ? JSON.parse(raw) : null;
        return session?.unit?.code ?? 1000;
    } catch {
        return 1000;
    }
}

function readSessionUserName(): string {
    try {
        const raw = localStorage.getItem('session');
        const session = raw ? JSON.parse(raw) : null;
        return session?.user?.name?.he || session?.user?.name?.en || session?.user?.username || 'unknown';
    } catch {
        return 'unknown';
    }
}

interface TikshovContextType {
    layerOn: boolean;
    deviceTypeFilters: Record<TrackedDeviceType, boolean>;
    timeRange: TimeRangeValue;
    watchedUnits: WatchedUnitSelection[];
    homeUnitCode: number;
    scopedUnitCodes: number[]; // recursive union of home unit + every watched unit's sub-tree
    toggleLayer: () => void;
    toggleDeviceTypeFilter: (type: TrackedDeviceType) => void;
    setTimeRangePreset: (preset: TimeRangePreset) => void;
    setCustomTimeRangeMinutes: (minutes: number) => void;
    addWatchedUnit: (unitCode: number) => void;
    removeWatchedUnit: (unitCode: number) => void;
}

const STORAGE_KEY_WATCHED = 'horus_tikshov_watched_units';

const TikshovContext = createContext<TikshovContextType | undefined>(undefined);

export const TikshovProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [layerOn, setLayerOn] = useState(true);
    const [deviceTypeFilters, setDeviceTypeFilters] = useState<Record<TrackedDeviceType, boolean>>(() => {
        const all = {} as Record<TrackedDeviceType, boolean>;
        ALL_DEVICE_TYPES.forEach(t => { all[t] = true; });
        return all;
    });
    const [timeRange, setTimeRange] = useState<TimeRangeValue>({ preset: '2h', minutes: PRESET_MINUTES['2h'] });
    const [watchedUnits, setWatchedUnits] = useState<WatchedUnitSelection[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_WATCHED);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    const homeUnitCode = useMemo(() => readSessionUnitCode(), []);

    const persistWatchedUnits = (next: WatchedUnitSelection[]) => {
        setWatchedUnits(next);
        localStorage.setItem(STORAGE_KEY_WATCHED, JSON.stringify(next));
    };

    const toggleLayer = () => setLayerOn(prev => !prev);

    const toggleDeviceTypeFilter = (type: TrackedDeviceType) => {
        if (!layerOn) return;
        setDeviceTypeFilters(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const setTimeRangePreset = (preset: TimeRangePreset) => {
        if (preset === 'custom') return; // custom range is set via setCustomTimeRangeMinutes
        setTimeRange({ preset, minutes: PRESET_MINUTES[preset] });
    };

    const setCustomTimeRangeMinutes = (minutes: number) => {
        setTimeRange({ preset: 'custom', minutes: Math.max(1, minutes) });
    };

    const addWatchedUnit = (unitCode: number) => {
        if (unitCode === homeUnitCode || watchedUnits.some(w => w.watchedUnitCode === unitCode)) return;
        const selection: WatchedUnitSelection = {
            selectionId: `wu-${unitCode}-${watchedUnits.length}-${Math.round(timeRange.minutes)}`,
            watchedUnitCode: unitCode,
            addedByUserName: readSessionUserName(),
            addedAt: new Date().toISOString(),
        };
        persistWatchedUnits([...watchedUnits, selection]);
    };

    const removeWatchedUnit = (unitCode: number) => {
        persistWatchedUnits(watchedUnits.filter(w => w.watchedUnitCode !== unitCode));
    };

    const scopedUnitCodes = useMemo(() => {
        const codes = new Set(getUnitAndDescendantCodes(homeUnitCode));
        watchedUnits.forEach(w => getUnitAndDescendantCodes(w.watchedUnitCode).forEach(c => codes.add(c)));
        return Array.from(codes);
    }, [homeUnitCode, watchedUnits]);

    return (
        <TikshovContext.Provider value={{
            layerOn,
            deviceTypeFilters,
            timeRange,
            watchedUnits,
            homeUnitCode,
            scopedUnitCodes,
            toggleLayer,
            toggleDeviceTypeFilter,
            setTimeRangePreset,
            setCustomTimeRangeMinutes,
            addWatchedUnit,
            removeWatchedUnit,
        }}>
            {children}
        </TikshovContext.Provider>
    );
};

export const useTikshovContext = () => {
    const context = useContext(TikshovContext);
    if (context === undefined) throw new Error('useTikshovContext must be used within a TikshovProvider');
    return context;
};

// A device counts as "active at some point in the selected window" (PRD 3.10) if it's
// active right now, or if it only recently left the active state — i.e. its current
// (non-active) status hasn't held for the full length of the window yet.
export function wasActiveDuringWindow(device: TrackedDevice, windowMinutes: number): boolean {
    if (device.connectionStatus === 'active') return true;
    return device.statusDurationMinutes < windowMinutes;
}
