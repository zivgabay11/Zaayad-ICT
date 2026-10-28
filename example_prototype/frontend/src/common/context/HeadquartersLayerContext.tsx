import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { getUnitAndDescendantCodes } from '../utilities/mockData';
import { HeadquartersKind } from '../utilities/types';

// State for the "מפקדות וחפ"קים" (Headquarters & Command Posts) map layer — the
// headquarters/command-post equivalent of MobileSpaceContext. Entities themselves are
// created via Link Planning's own "add headquarters"/"add command post" tools (see
// LinkPlanningContext) — this context only tracks which of those the user has promoted
// into this dedicated operational layer via its right-click "transfer to ניהו"ק" action,
// plus the two kind-based sub-filters (מפקדות / חפ"קים) and the "היחידות שלי" scope filter.

interface HeadquartersLayerContextType {
    ids: string[];
    layerOn: boolean;
    showHeadquarters: boolean;
    showCommandPosts: boolean;
    // Default (off) shows every transferred headquarters/command post regardless of whose
    // unit it belongs to — once on, only entities under the session's own unit (itself
    // included) in the org-chart hierarchy remain visible.
    myUnitsOnly: boolean;
    myUnitCodes: number[];
    toggleLayer: () => void;
    toggleShowHeadquarters: () => void;
    toggleShowCommandPosts: () => void;
    toggleMyUnitsOnly: () => void;
    addEntity: (id: string) => void;
    removeEntity: (id: string) => void;
    // Makes sure a just-added/moved entity of this kind is actually drawn: turns the layer and
    // that kind's sub-filter on (leaves everything else as the user set it).
    ensureVisible: (kind: HeadquartersKind) => void;
}

const STORAGE_KEY = 'horus_headquarters_layer';

function readSessionUnitCode(): number {
    try {
        const raw = localStorage.getItem('session');
        const session = raw ? JSON.parse(raw) : null;
        return session?.unit?.code ?? 1000;
    } catch {
        return 1000;
    }
}

const HeadquartersLayerContext = createContext<HeadquartersLayerContextType | undefined>(undefined);

export const HeadquartersLayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [ids, setIds] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });
    const [layerOn, setLayerOn] = useState(true);
    const [showHeadquarters, setShowHeadquarters] = useState(true);
    const [showCommandPosts, setShowCommandPosts] = useState(true);
    const [myUnitsOnly, setMyUnitsOnly] = useState(false);

    const homeUnitCode = useMemo(() => readSessionUnitCode(), []);
    const myUnitCodes = useMemo(() => getUnitAndDescendantCodes(homeUnitCode), [homeUnitCode]);

    const persist = (next: string[]) => {
        setIds(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    };

    // Turning the layer off cascades to every sub-filter too (mirrors Tikshov's
    // parent→child relationship) — turning it back on does not restore them, the user
    // picks which to re-enable.
    const toggleLayer = () => {
        setLayerOn(prev => {
            const next = !prev;
            if (!next) {
                setShowHeadquarters(false);
                setShowCommandPosts(false);
                setMyUnitsOnly(false);
            }
            return next;
        });
    };

    return (
        <HeadquartersLayerContext.Provider value={{
            ids,
            layerOn,
            showHeadquarters,
            showCommandPosts,
            myUnitsOnly,
            myUnitCodes,
            toggleLayer,
            toggleShowHeadquarters: () => setShowHeadquarters(prev => !prev),
            toggleShowCommandPosts: () => setShowCommandPosts(prev => !prev),
            toggleMyUnitsOnly: () => setMyUnitsOnly(prev => !prev),
            addEntity: (id: string) => persist(Array.from(new Set([...ids, id]))),
            removeEntity: (id: string) => persist(ids.filter(eid => eid !== id)),
            ensureVisible: (kind: HeadquartersKind) => {
                setLayerOn(true);
                if (kind === 'headquarters') setShowHeadquarters(true); else setShowCommandPosts(true);
            },
        }}>
            {children}
        </HeadquartersLayerContext.Provider>
    );
};

export const useHeadquartersLayerContext = () => {
    const context = useContext(HeadquartersLayerContext);
    if (context === undefined) throw new Error('useHeadquartersLayerContext must be used within a HeadquartersLayerProvider');
    return context;
};
