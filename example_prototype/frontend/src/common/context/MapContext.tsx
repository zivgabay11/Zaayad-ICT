import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type MapType = 'default' | 'terrain' | 'satellite';

interface MapContextType {
    isMapOpen: boolean;
    mapWidth: number; // percentage of available content width
    activeMapType: MapType;
    opacity: number; // 0-100, 100 is fully visible
    activePhaseId: string | null;
    activeUnitCode: number | null;
    currentSection: string;
    openMap: (width?: number) => void;
    closeMap: () => void;
    setMapWidth: (width: number) => void;
    setActiveMapType: (type: MapType) => void;
    setOpacity: (value: number) => void;
    setActivePhaseId: (phaseId: string | null) => void;
    setActiveUnitCode: (unitCode: number | null) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

interface MapProviderProps {
    children: ReactNode;
    currentSection: string;
}

export const MapProvider: React.FC<MapProviderProps> = ({ children, currentSection }) => {
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [mapWidth, setMapWidth] = useState(100); // percentage
    const [activeMapType, setActiveMapType] = useState<MapType>('satellite');
    const [opacity, setOpacity] = useState(64);
    const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
    const [activeUnitCode, setActiveUnitCode] = useState<number | null>(null);
    const [userClosed, setUserClosed] = useState(false);
    const [userHasTouchedOrderMap, setUserHasTouchedOrderMap] = useState(false);
    const [lastOrderMapOpen, setLastOrderMapOpen] = useState(false);
    const [lastOrderMapWidth, setLastOrderMapWidth] = useState(0);
    const [userHasTouchedCombatScriptMap, setUserHasTouchedCombatScriptMap] = useState(false);
    const [lastCombatScriptMapOpen, setLastCombatScriptMapOpen] = useState(false);
    const [lastCombatScriptMapWidth, setLastCombatScriptMapWidth] = useState(0);

    const orderSections = ['general', 'intelligence', 'objective', 'mission', 'method', 'tasks', 'calendar', 'diagram'];
    const isOrderSection = (section: string) => orderSections.includes(section);

    useEffect(() => {
        const isChatHidden = localStorage.getItem('horus_chat_hidden') === 'true';
        const targetWidth = isChatHidden ? 100 : 70;

        if (currentSection === 'main') {
            setIsMapOpen(true);
            setMapWidth(targetWidth);
            setUserClosed(false);
        } else if (currentSection === 'plans' || currentSection === 'definitions' || currentSection === 'tikshov_cop' || currentSection === 'telecom_journal') {
            setIsMapOpen(false);
            setMapWidth(0);
        } else if (currentSection === 'diagram') {
            setIsMapOpen(true);
            setMapWidth(targetWidth);
        } else if (currentSection === 'combat_script') {
            if (userHasTouchedCombatScriptMap) {
                setIsMapOpen(lastCombatScriptMapOpen);
                setMapWidth(lastCombatScriptMapWidth);
            } else {
                setIsMapOpen(false);
                setMapWidth(0);
            }
        } else if (isOrderSection(currentSection)) {
            if (userHasTouchedOrderMap) {
                setIsMapOpen(lastOrderMapOpen);
                setMapWidth(lastOrderMapWidth);
            } else {
                setIsMapOpen(false);
                setMapWidth(0);
            }
        }
    }, [currentSection]);

    const openMap = (width?: number) => {
        setIsMapOpen(true);
        setUserClosed(false);
        const newWidth = width !== undefined ? width : mapWidth;
        if (width !== undefined) setMapWidth(width);

        if (currentSection === 'combat_script') {
            setUserHasTouchedCombatScriptMap(true);
            setLastCombatScriptMapOpen(true);
            setLastCombatScriptMapWidth(newWidth);
        } else if (isOrderSection(currentSection)) {
            setUserHasTouchedOrderMap(true);
            setLastOrderMapOpen(true);
            setLastOrderMapWidth(newWidth);
        }
    };

    const closeMap = () => {
        setIsMapOpen(false);
        setUserClosed(true);

        if (currentSection === 'combat_script') {
            setUserHasTouchedCombatScriptMap(true);
            setLastCombatScriptMapOpen(false);
        } else if (isOrderSection(currentSection)) {
            setUserHasTouchedOrderMap(true);
            setLastOrderMapOpen(false);
            // We keep the last known width in case it's re-opened
        }
    };

    const handleSetMapWidth = (width: number) => {
        setMapWidth(width);

        if (currentSection === 'combat_script') {
            setUserHasTouchedCombatScriptMap(true);
            setLastCombatScriptMapOpen(true);
            setLastCombatScriptMapWidth(width);
        } else if (isOrderSection(currentSection)) {
            setUserHasTouchedOrderMap(true);
            setLastOrderMapOpen(true);
            setLastOrderMapWidth(width);
        }
    };

    return (
        <MapContext.Provider value={{
            isMapOpen,
            mapWidth,
            activeMapType,
            opacity,
            activePhaseId,
            activeUnitCode,
            currentSection,
            openMap,
            closeMap,
            setMapWidth: handleSetMapWidth,
            setActiveMapType,
            setOpacity,
            setActivePhaseId,
            setActiveUnitCode,
        }}>
            {children}
        </MapContext.Provider>
    );
};

export const useMapContext = () => {
    const context = useContext(MapContext);
    if (context === undefined) throw new Error('useMapContext must be used within a MapProvider');
    return context;
};
