import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import L from 'leaflet';

export type AnalysisTab = 'terrain' | 'enemy' | 'mission';

export type AnalysisToolId =
    // Terrain
    | 'elevationHeatMap'
    | 'mobilityAxes'
    | 'dominatingAreas'
    | 'dominatedAreas'
    | 'deploymentAreas'
    // Enemy
    | 'enemyCoverage'
    | 'losThreat'
    // Mission
    | 'routePlanning'
    | 'observationPositions'
    | 'targetPriority';

export const ANALYSIS_TOOL_IDS: AnalysisToolId[] = [
    'elevationHeatMap', 'mobilityAxes', 'dominatingAreas', 'dominatedAreas', 'deploymentAreas',
    'enemyCoverage', 'losThreat',
    'routePlanning', 'observationPositions', 'targetPriority',
];

export type ToolStatus = 'idle' | 'running' | 'done';

export interface AnalysisLegendItem {
    color: string;
    label: string;
}

export interface AnalysisLegendData {
    title: string;
    items: AnalysisLegendItem[];
    type: 'gradient' | 'discrete';
}

export interface ToolState {
    status: ToolStatus;
    visible: boolean;
    seed: number; // bumped on rerun, mixed into the seeded random generators
    legend: AnalysisLegendData | null;
    layerGroup: L.LayerGroup | null;
    result: unknown | null; // raw analysis result (extras UI + export summary)
}

const defaultToolState = (): ToolState => ({
    status: 'idle',
    visible: true,
    seed: 0,
    legend: null,
    layerGroup: null,
    result: null,
});

const buildInitialStates = (): Record<AnalysisToolId, ToolState> =>
    Object.fromEntries(ANALYSIS_TOOL_IDS.map(id => [id, defaultToolState()])) as Record<AnalysisToolId, ToolState>;

interface AnalysisContextType {
    isPanelOpen: boolean;
    setPanelOpen: (open: boolean) => void;
    activeTab: AnalysisTab;
    setActiveTab: (tab: AnalysisTab) => void;
    toolStates: Record<AnalysisToolId, ToolState>;
    setToolRunning: (id: AnalysisToolId) => void;
    setToolResult: (id: AnalysisToolId, layerGroup: L.LayerGroup, legend: AnalysisLegendData | null, result: unknown) => void;
    toggleToolVisibility: (id: AnalysisToolId) => void;
    bumpSeed: (id: AnalysisToolId) => number;
    clearTool: (id: AnalysisToolId) => void;
    clearAll: () => void;
    anyResults: boolean;
    mapInstance: L.Map | null;
    setMapInstance: (map: L.Map | null) => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

interface AnalysisProviderProps {
    children: ReactNode;
}

export const AnalysisProvider: React.FC<AnalysisProviderProps> = ({ children }) => {
    const [isPanelOpen, setPanelOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<AnalysisTab>('terrain');
    const [toolStates, setToolStates] = useState<Record<AnalysisToolId, ToolState>>(buildInitialStates);
    const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

    const setToolRunning = useCallback((id: AnalysisToolId) => {
        setToolStates(prev => ({
            ...prev,
            [id]: { ...prev[id], status: 'running' },
        }));
    }, []);

    const setToolResult = useCallback((id: AnalysisToolId, layerGroup: L.LayerGroup, legend: AnalysisLegendData | null, result: unknown) => {
        setToolStates(prev => {
            const prevGroup = prev[id].layerGroup;
            if (prevGroup && mapInstance) {
                mapInstance.removeLayer(prevGroup);
            }
            if (mapInstance) {
                layerGroup.addTo(mapInstance);
            }
            return {
                ...prev,
                [id]: { ...prev[id], status: 'done', visible: true, legend, layerGroup, result },
            };
        });
    }, [mapInstance]);

    const toggleToolVisibility = useCallback((id: AnalysisToolId) => {
        setToolStates(prev => {
            const state = prev[id];
            if (!state.layerGroup || !mapInstance) return prev;
            if (state.visible) {
                mapInstance.removeLayer(state.layerGroup);
            } else {
                state.layerGroup.addTo(mapInstance);
            }
            return { ...prev, [id]: { ...state, visible: !state.visible } };
        });
    }, [mapInstance]);

    const bumpSeed = useCallback((id: AnalysisToolId) => {
        const next = toolStates[id].seed + 1;
        setToolStates(prev => ({ ...prev, [id]: { ...prev[id], seed: next } }));
        return next;
    }, [toolStates]);

    const clearTool = useCallback((id: AnalysisToolId) => {
        setToolStates(prev => {
            const group = prev[id].layerGroup;
            if (group && mapInstance) {
                mapInstance.removeLayer(group);
            }
            return { ...prev, [id]: { ...defaultToolState(), seed: prev[id].seed } };
        });
    }, [mapInstance]);

    const clearAll = useCallback(() => {
        setToolStates(prev => {
            ANALYSIS_TOOL_IDS.forEach(id => {
                const group = prev[id].layerGroup;
                if (group && mapInstance) {
                    mapInstance.removeLayer(group);
                }
            });
            return buildInitialStates();
        });
    }, [mapInstance]);

    const anyResults = ANALYSIS_TOOL_IDS.some(id => toolStates[id].status === 'done');

    return (
        <AnalysisContext.Provider value={{
            isPanelOpen,
            setPanelOpen,
            activeTab,
            setActiveTab,
            toolStates,
            setToolRunning,
            setToolResult,
            toggleToolVisibility,
            bumpSeed,
            clearTool,
            clearAll,
            anyResults,
            mapInstance,
            setMapInstance,
        }}>
            {children}
        </AnalysisContext.Provider>
    );
};

export const useAnalysisContext = () => {
    const context = useContext(AnalysisContext);
    if (!context) {
        throw new Error('useAnalysisContext must be used within an AnalysisProvider');
    }
    return context;
};
