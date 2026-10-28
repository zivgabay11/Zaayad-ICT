import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { HeadquartersKind } from '../utilities/types';

// A request from the "מפקדות וחפ"קים" overview (שליטה וניהול) for the map to collect a
// position: either to add a new headquarters/command post straight into ניהו"ק for a given
// unit, or to move an existing one. The overview can't place anything itself — it asks, the
// app switches to the map, MapPanel fulfils the request with the same place/move plumbing the
// Link Planning tools already use, and the app returns to the overview once it's done.

export type HeadquartersMapRequest =
    | { type: 'add'; kind: HeadquartersKind; unitCode: number }
    | { type: 'move'; entityId: string };

interface HeadquartersMapRequestContextType {
    request: HeadquartersMapRequest | null;
    requestAdd: (kind: HeadquartersKind, unitCode: number) => void;
    requestMove: (entityId: string) => void;
    // Finished (placed/moved) or abandoned from the map's own banner: back to the overview.
    completeRequest: () => void;
    cancelRequest: () => void;
    // The user left the map by some other route (e.g. clicked another nav item): clear the
    // request without steering them anywhere.
    dropRequest: () => void;
}

const HeadquartersMapRequestContext = createContext<HeadquartersMapRequestContextType | undefined>(undefined);

interface ProviderProps {
    children: ReactNode;
    onStart: () => void;
    onEnd: () => void;
}

export const HeadquartersMapRequestProvider: React.FC<ProviderProps> = ({ children, onStart, onEnd }) => {
    const [request, setRequest] = useState<HeadquartersMapRequest | null>(null);

    const start = useCallback((next: HeadquartersMapRequest) => {
        setRequest(next);
        onStart();
    }, [onStart]);

    const finish = useCallback(() => {
        setRequest(null);
        onEnd();
    }, [onEnd]);

    return (
        <HeadquartersMapRequestContext.Provider value={{
            request,
            requestAdd: (kind, unitCode) => start({ type: 'add', kind, unitCode }),
            requestMove: (entityId) => start({ type: 'move', entityId }),
            completeRequest: finish,
            cancelRequest: finish,
            dropRequest: () => setRequest(null),
        }}>
            {children}
        </HeadquartersMapRequestContext.Provider>
    );
};

export const useHeadquartersMapRequestContext = () => {
    const context = useContext(HeadquartersMapRequestContext);
    if (context === undefined) throw new Error('useHeadquartersMapRequestContext must be used within a HeadquartersMapRequestProvider');
    return context;
};
