import React, { createContext, useContext, useState, ReactNode } from 'react';
import { JammingStatus, BlockingBand } from '../utilities/types';

// State for the "Spectrum" (ספקטרום) map layer: the parent layer toggle, its two filters —
// Jamming (השתקות) and Blocking (חסימות) — Jamming's own three timing sub-filters
// (ended/active/future), and Blocking's own two frequency-band sub-filters (L1 / תדרי שו"ב).
// The zone catalog itself lives in mockData.ts; this context only tracks which of it is
// switched on, same division of responsibility as StaticSpaceContext.

const ALL_JAMMING_STATUSES: JammingStatus[] = ['ended', 'active', 'future'];
const ALL_BLOCKING_BANDS: BlockingBand[] = ['l1', 'comms'];

interface SpectrumContextType {
    layerOn: boolean;
    jammingFilterOn: boolean;
    blockingFilterOn: boolean;
    jammingStatusFilters: Record<JammingStatus, boolean>;
    blockingBandFilters: Record<BlockingBand, boolean>;
    toggleLayer: () => void;
    toggleJammingFilter: () => void;
    toggleBlockingFilter: () => void;
    toggleJammingStatusFilter: (status: JammingStatus) => void;
    toggleBlockingBandFilter: (band: BlockingBand) => void;
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
    const [blockingBandFilters, setBlockingBandFilters] = useState<Record<BlockingBand, boolean>>(() => {
        const all = {} as Record<BlockingBand, boolean>;
        ALL_BLOCKING_BANDS.forEach(b => { all[b] = true; });
        return all;
    });

    // Turning a parent off cascades all the way down the tree (not just one level) — every
    // descendant is forced off and, while the parent stays off, locked from being toggled
    // back on individually; turning the parent back on does NOT restore them, the user
    // picks which ones to re-enable, same as StaticSpace's layer/topology relationship.
    const allJammingOff = () => {
        const all = {} as Record<JammingStatus, boolean>;
        ALL_JAMMING_STATUSES.forEach(s => { all[s] = false; });
        return all;
    };
    const allBlockingOff = () => {
        const all = {} as Record<BlockingBand, boolean>;
        ALL_BLOCKING_BANDS.forEach(b => { all[b] = false; });
        return all;
    };

    const toggleLayer = () => {
        setLayerOn(prev => {
            const next = !prev;
            if (!next) {
                setJammingFilterOn(false);
                setBlockingFilterOn(false);
                setJammingStatusFilters(allJammingOff());
                setBlockingBandFilters(allBlockingOff());
            }
            return next;
        });
    };

    const toggleJammingFilter = () => {
        if (!layerOn) return;
        setJammingFilterOn(prev => {
            const next = !prev;
            if (!next) setJammingStatusFilters(allJammingOff());
            return next;
        });
    };

    const toggleBlockingFilter = () => {
        if (!layerOn) return;
        setBlockingFilterOn(prev => {
            const next = !prev;
            if (!next) setBlockingBandFilters(allBlockingOff());
            return next;
        });
    };

    const toggleJammingStatusFilter = (status: JammingStatus) => {
        if (!layerOn || !jammingFilterOn) return;
        setJammingStatusFilters(prev => ({ ...prev, [status]: !prev[status] }));
    };

    const toggleBlockingBandFilter = (band: BlockingBand) => {
        if (!layerOn || !blockingFilterOn) return;
        setBlockingBandFilters(prev => ({ ...prev, [band]: !prev[band] }));
    };

    return (
        <SpectrumContext.Provider value={{
            layerOn,
            jammingFilterOn,
            blockingFilterOn,
            jammingStatusFilters,
            blockingBandFilters,
            toggleLayer,
            toggleJammingFilter,
            toggleBlockingFilter,
            toggleJammingStatusFilter,
            toggleBlockingBandFilter,
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
