import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { CustomDashboard, DashboardWidget } from '../utilities/types';
import { normalizeDashboardWidgets } from '../../system_views/utilities/dashboardFeatures';

// State for System Views (תצוגות מערכת): the user's own dashboard repository (CRUD), which
// dashboard is currently open, and whether the repository / builder dialogs are showing.
// Dashboards are stored per user in localStorage — everyone sees only the ones they built.

export interface DashboardInput {
    id?: string; // present when editing an existing dashboard
    name: string;
    widgets: DashboardWidget[];
}

interface DashboardsContextType {
    dashboards: CustomDashboard[]; // the current user's, newest first
    activeDashboard: CustomDashboard | null;
    repositoryOpen: boolean;
    builder: { open: boolean; editingId: string | null };
    openRepository: () => void;
    closeRepository: () => void;
    openBuilder: (editingId?: string) => void;
    closeBuilder: () => void;
    saveDashboard: (input: DashboardInput) => CustomDashboard;
    deleteDashboard: (id: string) => void;
    duplicateDashboard: (id: string) => void;
    openDashboard: (id: string) => void;
}

const STORAGE_KEY = 'horus_custom_dashboards';
const ACTIVE_KEY = 'horus_active_dashboard';

function loadAll(): CustomDashboard[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const parsed: CustomDashboard[] = stored ? JSON.parse(stored) : [];
        return parsed.map(d => ({ ...d, widgets: normalizeDashboardWidgets(d.widgets) }));
    } catch {
        return [];
    }
}

const DashboardsContext = createContext<DashboardsContextType | undefined>(undefined);

interface ProviderProps {
    children: ReactNode;
    ownerUsername: string;
    // Called when a dashboard is opened so the app can switch to its screen.
    onOpenDashboard: () => void;
}

export const DashboardsProvider: React.FC<ProviderProps> = ({ children, ownerUsername, onOpenDashboard }) => {
    const [all, setAll] = useState<CustomDashboard[]>(loadAll);
    const [activeId, setActiveId] = useState<string | null>(() => {
        try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
    });
    const [repositoryOpen, setRepositoryOpen] = useState(false);
    const [builder, setBuilder] = useState<{ open: boolean; editingId: string | null }>({ open: false, editingId: null });

    const mine = useMemo(
        () => all.filter(d => d.ownerUsername === ownerUsername).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        [all, ownerUsername],
    );
    const activeDashboard = mine.find(d => d.id === activeId) ?? null;

    const commit = (update: (prev: CustomDashboard[]) => CustomDashboard[]) => {
        setAll(prev => {
            const next = update(prev);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
            return next;
        });
    };

    const persistActive = (id: string | null) => {
        setActiveId(id);
        try { if (id) localStorage.setItem(ACTIVE_KEY, id); else localStorage.removeItem(ACTIVE_KEY); } catch { /* storage unavailable */ }
    };

    const saveDashboard = (input: DashboardInput): CustomDashboard => {
        const now = new Date().toISOString();
        const existing = input.id ? all.find(d => d.id === input.id) : undefined;
        const saved: CustomDashboard = existing
            ? { ...existing, name: input.name, widgets: input.widgets, updatedAt: now }
            : {
                id: `dash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                ownerUsername,
                name: input.name,
                widgets: input.widgets,
                createdAt: now,
                updatedAt: now,
            };
        commit(prev => existing ? prev.map(d => d.id === saved.id ? saved : d) : [saved, ...prev]);
        return saved;
    };

    const deleteDashboard = (id: string) => {
        commit(prev => prev.filter(d => d.id !== id));
        if (activeId === id) persistActive(null);
    };

    const duplicateDashboard = (id: string) => {
        const source = all.find(d => d.id === id);
        if (!source) return;
        const now = new Date().toISOString();
        const copy: CustomDashboard = {
            ...source,
            id: `dash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: `${source.name} (2)`,
            widgets: source.widgets.map(w => ({ ...w, id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` })),
            createdAt: now,
            updatedAt: now,
        };
        commit(prev => [copy, ...prev]);
    };

    const openDashboard = (id: string) => {
        persistActive(id);
        setRepositoryOpen(false);
        onOpenDashboard();
    };

    return (
        <DashboardsContext.Provider value={{
            dashboards: mine,
            activeDashboard,
            repositoryOpen,
            builder,
            openRepository: () => setRepositoryOpen(true),
            closeRepository: () => setRepositoryOpen(false),
            openBuilder: (editingId) => { setRepositoryOpen(false); setBuilder({ open: true, editingId: editingId ?? null }); },
            closeBuilder: () => setBuilder({ open: false, editingId: null }),
            saveDashboard,
            deleteDashboard,
            duplicateDashboard,
            openDashboard,
        }}>
            {children}
        </DashboardsContext.Provider>
    );
};

export const useDashboardsContext = () => {
    const context = useContext(DashboardsContext);
    if (context === undefined) throw new Error('useDashboardsContext must be used within a DashboardsProvider');
    return context;
};
