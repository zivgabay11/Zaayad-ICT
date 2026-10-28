import React, { createContext, useContext, useState, ReactNode } from 'react';
import { BumCommanderInstruction, BumDemand, BumDemandStatus, BumDmatz, BumDmatzStatus } from '../utilities/types';
import { buildMockBumDemands, buildMockBumDmatzim, buildMockBumInstructions } from '../utilities/mockData';

// State for Bum Manager (בו"ם משימות), which has three sub-sections:
//  • דרישות מפקד  — every commander demand/instruction, with CRUD and a status setter (used by
//    the kanban drag & drop and the table's inline controls).
//  • דמ"צים       — equipment & means requests a unit raises to its superior (with attached
//    files); the receiving unit moves them through their lifecycle.
//  • הנחיות מפקד  — instructions commanders pushed down to the field.
// Persisted to localStorage like the rest of the prototype; seeded from mock data on first
// load. Which items a user actually sees (own unit + everything under it, etc.) is decided by
// the screens from the session unit, not here.

export type NewBumDemand = Omit<BumDemand, 'id' | 'createdAt'>;
export type NewBumDmatz = Omit<BumDmatz, 'id' | 'createdAt'>;
export type NewBumInstruction = Omit<BumCommanderInstruction, 'id' | 'issuedAt'>;

interface BumContextType {
    demands: BumDemand[];
    addDemand: (input: NewBumDemand) => BumDemand;
    updateDemand: (id: string, patch: Partial<Omit<BumDemand, 'id'>>) => void;
    deleteDemand: (id: string) => void;
    setDemandStatus: (id: string, status: BumDemandStatus) => void;

    dmatzim: BumDmatz[];
    addDmatz: (input: NewBumDmatz) => BumDmatz;
    updateDmatz: (id: string, patch: Partial<Omit<BumDmatz, 'id'>>) => void;
    deleteDmatz: (id: string) => void;
    setDmatzStatus: (id: string, status: BumDmatzStatus) => void;

    instructions: BumCommanderInstruction[];
    addInstruction: (input: NewBumInstruction) => BumCommanderInstruction;
    updateInstruction: (id: string, patch: Partial<Omit<BumCommanderInstruction, 'id'>>) => void;
    deleteInstruction: (id: string) => void;
}

const DEMANDS_KEY = 'horus_bum_demands';
const DMATZ_KEY = 'horus_bum_dmatzim';
const INSTRUCTIONS_KEY = 'horus_bum_instructions';

function loadOrSeed<T>(key: string, seed: () => T[]): T[] {
    try {
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
    } catch {
        // fall through to the seed
    }
    const seeded = seed();
    try { localStorage.setItem(key, JSON.stringify(seeded)); } catch { /* storage unavailable */ }
    return seeded;
}

// Functional updates so two quick changes in a row (e.g. a drag right after an edit) never
// overwrite each other with a stale snapshot.
function useStoredList<T>(key: string, seed: () => T[]) {
    const [items, setItems] = useState<T[]>(() => loadOrSeed(key, seed));
    const commit = (update: (prev: T[]) => T[]) => {
        setItems(prev => {
            const next = update(prev);
            try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable (or file data too large) */ }
            return next;
        });
    };
    return [items, commit] as const;
}

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const BumContext = createContext<BumContextType | undefined>(undefined);

export const BumProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [demands, commitDemands] = useStoredList<BumDemand>(DEMANDS_KEY, () => buildMockBumDemands(Date.now()));
    const [dmatzim, commitDmatzim] = useStoredList<BumDmatz>(DMATZ_KEY, () => buildMockBumDmatzim(Date.now()));
    const [instructions, commitInstructions] = useStoredList<BumCommanderInstruction>(INSTRUCTIONS_KEY, () => buildMockBumInstructions(Date.now()));

    const addDemand = (input: NewBumDemand): BumDemand => {
        const demand: BumDemand = { ...input, id: newId('bum'), createdAt: new Date().toISOString() };
        commitDemands(prev => [demand, ...prev]);
        return demand;
    };

    const addDmatz = (input: NewBumDmatz): BumDmatz => {
        const dmatz: BumDmatz = { ...input, id: newId('dmatz'), createdAt: new Date().toISOString() };
        commitDmatzim(prev => [dmatz, ...prev]);
        return dmatz;
    };

    const addInstruction = (input: NewBumInstruction): BumCommanderInstruction => {
        const instruction: BumCommanderInstruction = { ...input, id: newId('instr'), issuedAt: new Date().toISOString() };
        commitInstructions(prev => [instruction, ...prev]);
        return instruction;
    };

    return (
        <BumContext.Provider value={{
            demands,
            addDemand,
            updateDemand: (id, patch) => commitDemands(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d)),
            deleteDemand: (id) => commitDemands(prev => prev.filter(d => d.id !== id)),
            setDemandStatus: (id, status) => commitDemands(prev => prev.map(d => d.id === id ? { ...d, status } : d)),

            dmatzim,
            addDmatz,
            updateDmatz: (id, patch) => commitDmatzim(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d)),
            deleteDmatz: (id) => commitDmatzim(prev => prev.filter(d => d.id !== id)),
            setDmatzStatus: (id, status) => commitDmatzim(prev => prev.map(d => d.id === id ? { ...d, status } : d)),

            instructions,
            addInstruction,
            updateInstruction: (id, patch) => commitInstructions(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i)),
            deleteInstruction: (id) => commitInstructions(prev => prev.filter(i => i.id !== id)),
        }}>
            {children}
        </BumContext.Provider>
    );
};

export const useBumContext = () => {
    const context = useContext(BumContext);
    if (context === undefined) throw new Error('useBumContext must be used within a BumProvider');
    return context;
};
