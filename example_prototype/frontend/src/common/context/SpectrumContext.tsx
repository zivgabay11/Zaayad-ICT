import React, { createContext, useContext, useState, ReactNode } from 'react';
import { JammingStatus } from '../utilities/types';

// State for the "Spectrum" (ספקטרום) map layer: the parent layer toggle, its two filters —
// Jamming (השתקות) and Blocking (חסימות) — and Jamming's own three timing sub-filters
// (ended/active/future). The zone catalog itself lives in mockData.ts; this context only
// tracks which of it is switched on, same division of responsibility as StaticSpaceContext.

const ALL_JAMMING_STATUSES: JammingStatus[] = ['ended', 'active', 'future'];

interface SpectrumContextType {
    layerOn: boolean;
    jammingFilterOn: boolean;
    blockingFilterOn: boolean;
    jammingStatusFilters: Record<JammingStatus, boolean>;
    toggleLayer: () => void;
    toggleJammingFilter: () => void;
    toggleBlockingFilter: () => void;
    toggleJammingStatusFilter: (status: JammingStatus) => void;
}

const SpectrumContext = createContext<SpectrumContextType | undefined>(undefined);

export const SpectrumProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [layerOn, setLayerOn] = useState(true);
    const [jammingFilterOn, setJammingFilterOn] = useState(true);
    const [blockingFilterOn, setBlockingFilterOn] = useState(true);
    const [jammingStatusFilters, setJammingStatusFilters] = useState<Record<JammingStatus, boolean>>(() => {
        const all = {} as Record<JammingStatus, boolean>;
        ALL_JAMMING_STATUSES.forEach(s => { all[s] = true; });
        return all;
    });

    // Turning the parent layer off turns off both sub-filters too (mirrors StaticSpace's
    // layer/topology-filter relationship).
    const toggleLayer = () => {
        setLayerOn(prev => {
            const next = !prev;
            if (!next) {
                setJammingFilterOn(false);
                setBlockingFilterOn(false);
            }
            return next;
        });
    };

    const toggleJammingFilter = () => {
        if (!layerOn) return;
        setJammingFilterOn(prev => !prev);
    };

    const toggleBlockingFilter = () => {
        if (!layerOn) return;
        setBlockingFilterOn(prev => !prev);
    };

    const toggleJammingStatusFilter = (status: JammingStatus) => {
        if (!layerOn || !jammingFilterOn) return;
        setJammingStatusFilters(prev => ({ ...prev, [status]: !prev[status] }));
    };

    return (
        <SpectrumContext.Provider value={{
            layerOn,
            jammingFilterOn,
            blockingFilterOn,
            jammingStatusFilters,
            toggleLayer,
            toggleJammingFilter,
            toggleBlockingFilter,
            toggleJammingStatusFilter,
        }}>
            {children}
        </SpectrumContext.Provider>
    );
};

export const useSpectrumContext = () => {
    const context = useContext(SpectrumContext);
    if (context === undefined) throw new Error('useSpectrumContext must be used within a SpectrumProvider');
    return context;
};
