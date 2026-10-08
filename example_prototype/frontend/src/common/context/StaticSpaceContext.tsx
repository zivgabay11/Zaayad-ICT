import React, { createContext, useContext, useState, ReactNode } from 'react';
import { mockCommSites } from '../utilities/mockData';

// State for the "Static Space Establishment" (כינון מרחב נייח) feature: the map layer
// toggle + its two topology sub-filters, and the unit's curated Comm Site table
// (PRD sections 6.1-6.3, 11.1). The catalog itself lives in mockData.ts — this
// context only tracks which catalog sites the unit has selected, plus UI state.

interface StaticSpaceContextType {
    unitSiteIds: string[];
    layerOn: boolean;
    eladFilterOn: boolean;
    mabanFilterOn: boolean;
    isAddSitesModalOpen: boolean;
    openSiteDetailId: string | null; // Comm Site Service Monitoring page (PRD 5.1) — set to open it for a site
    toggleLayer: () => void;
    toggleEladFilter: () => void;
    toggleMabanFilter: () => void;
    addSites: (ids: string[]) => void;
    removeSite: (id: string) => void;
    openAddSitesModal: () => void;
    closeAddSitesModal: () => void;
    openSiteDetail: (siteId: string) => void;
    closeSiteDetail: () => void;
}

const STORAGE_KEY = 'horus_static_space_unit_sites';

const StaticSpaceContext = createContext<StaticSpaceContextType | undefined>(undefined);

export const StaticSpaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Per the PRD, a fresh unit's table starts empty (6.3) — but this build pre-seeds it
    // with the full catalog and turns the layer/filters on, so opening the app shows the
    // feature immediately instead of an empty state the user has to populate by hand.
    const [unitSiteIds, setUnitSiteIds] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : mockCommSites.map(s => s.id);
        } catch {
            return mockCommSites.map(s => s.id);
        }
    });
    const [layerOn, setLayerOn] = useState(true);
    const [eladFilterOn, setEladFilterOn] = useState(true);
    const [mabanFilterOn, setMabanFilterOn] = useState(true);
    const [isAddSitesModalOpen, setIsAddSitesModalOpen] = useState(false);
    const [openSiteDetailId, setOpenSiteDetailId] = useState<string | null>(null);

    const persist = (ids: string[]) => {
        setUnitSiteIds(ids);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    };

    // Turning the parent layer off turns off both topology filters too (PRD 6.2 / 11.1).
    const toggleLayer = () => {
        setLayerOn(prev => {
            const next = !prev;
            if (!next) {
                setEladFilterOn(false);
                setMabanFilterOn(false);
            }
            return next;
        });
    };
    const toggleEladFilter = () => {
        if (!layerOn) return;
        setEladFilterOn(prev => !prev);
    };
    const toggleMabanFilter = () => {
        if (!layerOn) return;
        setMabanFilterOn(prev => !prev);
    };

    const addSites = (ids: string[]) => {
        persist(Array.from(new Set([...unitSiteIds, ...ids])));
    };
    const removeSite = (id: string) => {
        persist(unitSiteIds.filter(sid => sid !== id));
    };

    return (
        <StaticSpaceContext.Provider value={{
            unitSiteIds,
            layerOn,
            eladFilterOn,
            mabanFilterOn,
            isAddSitesModalOpen,
            openSiteDetailId,
            toggleLayer,
            toggleEladFilter,
            toggleMabanFilter,
            addSites,
            removeSite,
            openAddSitesModal: () => setIsAddSitesModalOpen(true),
            closeAddSitesModal: () => setIsAddSitesModalOpen(false),
            openSiteDetail: (siteId: string) => setOpenSiteDetailId(siteId),
            closeSiteDetail: () => setOpenSiteDetailId(null),
        }}>
            {children}
        </StaticSpaceContext.Provider>
    );
};

export const useStaticSpaceContext = () => {
    const context = useContext(StaticSpaceContext);
    if (context === undefined) throw new Error('useStaticSpaceContext must be used within a StaticSpaceProvider');
    return context;
};
