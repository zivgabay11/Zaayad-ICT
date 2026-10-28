import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GeoCoordinate, HeadquartersEntity, HeadquartersKind, LinkCell, LinkCoverageCut, MobileCommPlatform } from '../utilities/types';

// State for the "Link Planning" (תכנון קשר) feature: user-drawn terrain cells, user-placed
// mobile comm platforms, headquarters/command posts, and the coverage cuts computed over
// them. Unlike the Comm Site catalog (a fixed seeded list), these collections are purely
// user-created — they start empty and are persisted together under one localStorage key,
// mirroring StaticSpaceContext's catalog-selection persistence pattern.

interface LinkPlanningContextType {
    linkCells: LinkCell[];
    mobilePlatforms: MobileCommPlatform[];
    headquartersEntities: HeadquartersEntity[];
    linkCoverageCuts: LinkCoverageCut[];
    // Two independent toggles now that the layer organizer splits this feature across two
    // tree branches: cellsLayerOn gates "תכנון קשר רדיו" (cells + platforms + headquarters/
    // command posts, under the תכנון tab), cutsLayerOn gates "תיק חתכים" (the computed
    // cuts, under ניהו"ק > תקשוב).
    cellsLayerOn: boolean;
    cutsLayerOn: boolean;
    isComputeCutModalOpen: boolean;
    toggleCellsLayer: () => void;
    toggleCutsLayer: () => void;
    addLinkCell: (name: string, coordinates: GeoCoordinate[]) => void;
    addMobilePlatform: (name: string, position: GeoCoordinate) => void;
    addHeadquartersEntity: (kind: HeadquartersKind, unitCode: number, name: string, position: GeoCoordinate) => string;
    addCoverageCut: (cellId: string, commSiteIds: string[], platformIds: string[]) => void;
    toggleCutVisible: (id: string) => void;
    // Editing — scoped to entities still under נוה"ק (a cell always is; a platform or
    // headquarters/command post only until it's transferred into ניהו"ק, see
    // MobileSpaceContext / HeadquartersLayerContext).
    renameLinkCell: (id: string, name: string) => void;
    updateLinkCellCoordinates: (id: string, coordinates: GeoCoordinate[]) => void;
    renameMobilePlatform: (id: string, name: string) => void;
    updateMobilePlatformPosition: (id: string, position: GeoCoordinate) => void;
    renameHeadquartersEntity: (id: string, name: string) => void;
    updateHeadquartersEntityPosition: (id: string, position: GeoCoordinate) => void;
    removeLinkCell: (id: string) => void;
    removeMobilePlatform: (id: string) => void;
    removeHeadquartersEntity: (id: string) => void;
    removeCoverageCut: (id: string) => void;
    openComputeCutModal: () => void;
    closeComputeCutModal: () => void;
}

const STORAGE_KEY = 'horus_link_planning';

interface PersistedState {
    linkCells: LinkCell[];
    mobilePlatforms: MobileCommPlatform[];
    headquartersEntities: HeadquartersEntity[];
    linkCoverageCuts: LinkCoverageCut[];
}

function loadPersisted(): PersistedState {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { headquartersEntities: [], ...parsed };
        }
    } catch { /* ignore, fall through to empty state */ }
    return { linkCells: [], mobilePlatforms: [], headquartersEntities: [], linkCoverageCuts: [] };
}

const LinkPlanningContext = createContext<LinkPlanningContextType | undefined>(undefined);

export const LinkPlanningProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const initial = loadPersisted();
    const [linkCells, setLinkCells] = useState<LinkCell[]>(initial.linkCells);
    const [mobilePlatforms, setMobilePlatforms] = useState<MobileCommPlatform[]>(initial.mobilePlatforms);
    const [headquartersEntities, setHeadquartersEntities] = useState<HeadquartersEntity[]>(initial.headquartersEntities);
    const [linkCoverageCuts, setLinkCoverageCuts] = useState<LinkCoverageCut[]>(initial.linkCoverageCuts);
    const [cellsLayerOn, setCellsLayerOn] = useState(true);
    const [cutsLayerOn, setCutsLayerOn] = useState(true);
    const [isComputeCutModalOpen, setIsComputeCutModalOpen] = useState(false);

    const persist = (next: Partial<PersistedState>) => {
        const merged: PersistedState = {
            linkCells: next.linkCells ?? linkCells,
            mobilePlatforms: next.mobilePlatforms ?? mobilePlatforms,
            headquartersEntities: next.headquartersEntities ?? headquartersEntities,
            linkCoverageCuts: next.linkCoverageCuts ?? linkCoverageCuts,
        };
        if (next.linkCells) setLinkCells(next.linkCells);
        if (next.mobilePlatforms) setMobilePlatforms(next.mobilePlatforms);
        if (next.headquartersEntities) setHeadquartersEntities(next.headquartersEntities);
        if (next.linkCoverageCuts) setLinkCoverageCuts(next.linkCoverageCuts);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    };

    const addLinkCell = (name: string, coordinates: GeoCoordinate[]) => {
        const cell: LinkCell = { id: `cell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, coordinates, createdAt: new Date().toISOString() };
        persist({ linkCells: [...linkCells, cell] });
    };

    const addMobilePlatform = (name: string, position: GeoCoordinate) => {
        const platform: MobileCommPlatform = { id: `plat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, position, createdAt: new Date().toISOString() };
        persist({ mobilePlatforms: [...mobilePlatforms, platform] });
    };

    const addHeadquartersEntity = (kind: HeadquartersKind, unitCode: number, name: string, position: GeoCoordinate) => {
        const entity: HeadquartersEntity = {
            id: `hq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            kind, unitCode, name, position,
            createdAt: new Date().toISOString(),
        };
        persist({ headquartersEntities: [...headquartersEntities, entity] });
        return entity.id;
    };

    const addCoverageCut = (cellId: string, commSiteIds: string[], platformIds: string[]) => {
        const cut: LinkCoverageCut = {
            id: `cut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            cellId,
            commSiteIds,
            platformIds,
            visible: true,
            createdAt: new Date().toISOString(),
        };
        persist({ linkCoverageCuts: [...linkCoverageCuts, cut] });
    };

    const toggleCutVisible = (id: string) => {
        persist({ linkCoverageCuts: linkCoverageCuts.map(c => c.id === id ? { ...c, visible: !c.visible } : c) });
    };

    const renameLinkCell = (id: string, name: string) => {
        persist({ linkCells: linkCells.map(c => c.id === id ? { ...c, name } : c) });
    };

    const updateLinkCellCoordinates = (id: string, coordinates: GeoCoordinate[]) => {
        persist({ linkCells: linkCells.map(c => c.id === id ? { ...c, coordinates } : c) });
    };

    const renameMobilePlatform = (id: string, name: string) => {
        persist({ mobilePlatforms: mobilePlatforms.map(p => p.id === id ? { ...p, name } : p) });
    };

    const updateMobilePlatformPosition = (id: string, position: GeoCoordinate) => {
        persist({ mobilePlatforms: mobilePlatforms.map(p => p.id === id ? { ...p, position } : p) });
    };

    const renameHeadquartersEntity = (id: string, name: string) => {
        persist({ headquartersEntities: headquartersEntities.map(h => h.id === id ? { ...h, name } : h) });
    };

    const updateHeadquartersEntityPosition = (id: string, position: GeoCoordinate) => {
        persist({ headquartersEntities: headquartersEntities.map(h => h.id === id ? { ...h, position } : h) });
    };

    const removeLinkCell = (id: string) => {
        persist({
            linkCells: linkCells.filter(c => c.id !== id),
            // A cut with no cell is meaningless — remove any cuts computed over this cell too.
            linkCoverageCuts: linkCoverageCuts.filter(c => c.cellId !== id),
        });
    };

    const removeMobilePlatform = (id: string) => {
        persist({ mobilePlatforms: mobilePlatforms.filter(p => p.id !== id) });
    };

    const removeHeadquartersEntity = (id: string) => {
        persist({ headquartersEntities: headquartersEntities.filter(h => h.id !== id) });
    };

    const removeCoverageCut = (id: string) => {
        persist({ linkCoverageCuts: linkCoverageCuts.filter(c => c.id !== id) });
    };

    return (
        <LinkPlanningContext.Provider value={{
            linkCells,
            mobilePlatforms,
            headquartersEntities,
            linkCoverageCuts,
            cellsLayerOn,
            cutsLayerOn,
            isComputeCutModalOpen,
            toggleCellsLayer: () => setCellsLayerOn(prev => !prev),
            toggleCutsLayer: () => setCutsLayerOn(prev => !prev),
            addLinkCell,
            addMobilePlatform,
            addHeadquartersEntity,
            addCoverageCut,
            toggleCutVisible,
            renameLinkCell,
            updateLinkCellCoordinates,
            renameMobilePlatform,
            updateMobilePlatformPosition,
            renameHeadquartersEntity,
            updateHeadquartersEntityPosition,
            removeLinkCell,
            removeMobilePlatform,
            removeHeadquartersEntity,
            removeCoverageCut,
            openComputeCutModal: () => setIsComputeCutModalOpen(true),
            closeComputeCutModal: () => setIsComputeCutModalOpen(false),
        }}>
            {children}
        </LinkPlanningContext.Provider>
    );
};

export const useLinkPlanningContext = () => {
    const context = useContext(LinkPlanningContext);
    if (context === undefined) throw new Error('useLinkPlanningContext must be used within a LinkPlanningProvider');
    return context;
};
