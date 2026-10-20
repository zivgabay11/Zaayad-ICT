import React, { createContext, useContext, useState, ReactNode } from 'react';

// State for the "Mobile Space Establishment" (כינון מרחב נייד) map layer: the mobile
// comm platform equivalent of StaticSpaceContext's CommSite table. Platforms are created
// via Link Planning's own "add mobile platform" tool (see LinkPlanningContext) — this
// context only tracks which of those platforms the user has promoted into this dedicated
// operational layer via its right-click "add to layer" action, mirroring how
// StaticSpaceContext only tracks selected ids while the catalog itself lives elsewhere.

interface MobileSpaceContextType {
    platformIds: string[];
    layerOn: boolean;
    toggleLayer: () => void;
    addPlatform: (id: string) => void;
    removePlatform: (id: string) => void;
}

const STORAGE_KEY = 'horus_mobile_space_platforms';

const MobileSpaceContext = createContext<MobileSpaceContextType | undefined>(undefined);

export const MobileSpaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [platformIds, setPlatformIds] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });
    const [layerOn, setLayerOn] = useState(true);

    const persist = (ids: string[]) => {
        setPlatformIds(ids);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    };

    return (
        <MobileSpaceContext.Provider value={{
            platformIds,
            layerOn,
            toggleLayer: () => setLayerOn(prev => !prev),
            addPlatform: (id: string) => persist(Array.from(new Set([...platformIds, id]))),
            removePlatform: (id: string) => persist(platformIds.filter(pid => pid !== id)),
        }}>
            {children}
        </MobileSpaceContext.Provider>
    );
};

export const useMobileSpaceContext = () => {
    const context = useContext(MobileSpaceContext);
    if (context === undefined) throw new Error('useMobileSpaceContext must be used within a MobileSpaceProvider');
    return context;
};
