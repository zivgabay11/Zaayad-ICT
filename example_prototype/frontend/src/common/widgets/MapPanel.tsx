import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapContext } from '../context/MapContext';
import { usePlanContext } from '../context/PlanContext';
import { useAnalysisContext } from '../context/AnalysisContext';
import { MapToolbar } from '../../diagram/widgets/MapToolbar';
import { AnalysisLegend } from '../../diagram/widgets/AnalysisLegend';
import { MapAiToolsPanel } from '../../diagram/widgets/MapAiToolsPanel';
import { useGeoman } from '../../diagram/hooks/useGeoman';
import { DiagramElement, GeoCoordinate, SystemUnit } from '../utilities/types';
import { ElementAssignPopover } from '../../diagram/widgets/ElementAssignPopover';
import { MapContextMenu } from '../../diagram/widgets/MapContextMenu';
import { StaticSpaceMapLayer } from './StaticSpaceMapLayer';
import { TikshovCopMapLayer } from './TikshovCopMapLayer';
import { SpectrumMapLayer } from './SpectrumMapLayer';
import { LinkCoverageMapLayer } from './LinkCoverageMapLayer';
import { MobileSpaceMapLayer } from './MobileSpaceMapLayer';
import { useLinkPlanningContext } from '../context/LinkPlanningContext';
import { useLinkPlanningDrawing } from '../../link_planning/hooks/useLinkPlanningDrawing';
import { NamePromptPopover } from '../../link_planning/widgets/NamePromptPopover';
import { MobilePlatformContextMenu } from '../../link_planning/widgets/MobilePlatformContextMenu';
import { LinkCellContextMenu } from '../../link_planning/widgets/LinkCellContextMenu';

// Fix Leaflet's default icon path issue with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TILE_URLS = {
    default: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

const TILE_ATTRIBUTIONS = {
    default: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    terrain: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
    satellite: '&copy; <a href="https://www.esri.com">Esri</a> World Imagery',
};

// Component to get map instance
function MapInstanceGetter({ onMap }: { onMap: (map: L.Map) => void }) {
    const map = useMap();
    useEffect(() => {
        onMap(map);
    }, [map, onMap]);
    return null;
}

// Component to handle map resize when panel width changes
function MapResizer() {
    const map = useMap();
    useEffect(() => {
        // Invalidate multiple times during animation to ensure tiles load
        const timers = [
            setTimeout(() => map.invalidateSize(), 50),
            setTimeout(() => map.invalidateSize(), 200),
            setTimeout(() => map.invalidateSize(), 400),
            setTimeout(() => map.invalidateSize(), 800),
        ];
        return () => timers.forEach(clearTimeout);
    });
    return null;
}

export const MapPanel: React.FC = () => {
    const { t } = useTranslation();
    const { isMapOpen, mapWidth, activeMapType, opacity, activePhaseId, activeUnitCode, currentSection } = useMapContext();
    const { activePlan, updatePlan } = usePlanContext();
    const { setMapInstance: setAnalysisMapInstance } = useAnalysisContext();
    const {
        linkCells, mobilePlatforms, addLinkCell, addMobilePlatform,
        renameLinkCell, updateLinkCellCoordinates, renameMobilePlatform, updateMobilePlatformPosition,
        removeLinkCell,
    } = useLinkPlanningContext();
    const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
    const [activeDrawingTool, setActiveDrawingTool] = useState<string | null>(null);
    const [pendingElement, setPendingElement] = useState<DiagramElement | null>(null);
    const [pendingCellCoords, setPendingCellCoords] = useState<GeoCoordinate[] | null>(null);
    const [pendingPlatformPos, setPendingPlatformPos] = useState<GeoCoordinate | null>(null);
    const [platformContextMenu, setPlatformContextMenu] = useState<{ platformId: string; x: number; y: number } | null>(null);
    const [linkCellContextMenu, setLinkCellContextMenu] = useState<{ cellId: string; x: number; y: number } | null>(null);
    const [pendingRename, setPendingRename] = useState<{ kind: 'cell' | 'platform'; id: string; currentName: string } | null>(null);
    const linkPlanningSuppressRef = React.useRef(false);

    const diagramElements = activePlan?.diagramElements || [];
    const planUnitCodes = useMemo(() => (activePlan?.units || []).map(u => u.code), [activePlan?.units]);

    // Get session unit for color resolution
    const sessionUnit: SystemUnit | null = useMemo(() => {
        try {
            const stored = localStorage.getItem('session');
            if (stored) {
                const session = JSON.parse(stored);
                return session?.unit || null;
            }
        } catch { /* ignore */ }
        return null;
    }, []);

    const handleElementsChange = useCallback((elements: DiagramElement[]) => {
        if (activePlan) {
            updatePlan(activePlan.id, { diagramElements: elements });
        }
    }, [activePlan, updatePlan]);

    const handleElementCreatedWithoutAssignment = useCallback((element: DiagramElement) => {
        setPendingElement(element);
    }, []);

    const {
        enableDrawPolygon,
        enableDrawArrow,
        enableDrawLine,
        enableDrawTextLabel,
        enableDrawArc,
        contextMenu,
        setContextMenu,
        editElement,
        editElementText,
        deleteElement,
        changeElementPhase,
        changeElementUnit,
        changeElementStrokeWidth,
        addElementLabel,
        changeArcDistance,
        changeArcSecondRing,
        addArcSecondRing,
        removeArcSecondRing,
    } = useGeoman({
        map: mapInstance,
        diagramElements,
        activePhaseId,
        activeUnitCode,
        sessionUnit,
        planUnitCodes,
        onElementsChange: handleElementsChange,
        onElementCreatedWithoutAssignment: handleElementCreatedWithoutAssignment,
        externalDrawSuppressRef: linkPlanningSuppressRef,
    });

    const { enableDrawCell, enablePlacePlatform, enableRedrawCell, enableMovePlatform } = useLinkPlanningDrawing({
        map: mapInstance,
        suppressRef: linkPlanningSuppressRef,
        onCellDrawn: setPendingCellCoords,
        onPlatformPlaced: setPendingPlatformPos,
        onCellRedrawn: updateLinkCellCoordinates,
        onPlatformMoved: updateMobilePlatformPosition,
    });

    const handleDrawPolygon = useCallback(() => {
        setActiveDrawingTool(prev => prev === 'polygon' ? null : 'polygon');
        enableDrawPolygon();
    }, [enableDrawPolygon]);

    const handleDrawArrow = useCallback(() => {
        setActiveDrawingTool(prev => prev === 'arrow' ? null : 'arrow');
        enableDrawArrow();
    }, [enableDrawArrow]);

    const handleDrawLine = useCallback(() => {
        setActiveDrawingTool(prev => prev === 'line' ? null : 'line');
        enableDrawLine();
    }, [enableDrawLine]);

    const handleDrawTextLabel = useCallback(() => {
        setActiveDrawingTool(prev => prev === 'textLabel' ? null : 'textLabel');
        enableDrawTextLabel();
    }, [enableDrawTextLabel]);

    const handleDrawArc = useCallback(() => {
        setActiveDrawingTool(prev => prev === 'arc' ? null : 'arc');
        enableDrawArc();
    }, [enableDrawArc]);

    // Fit bounds on initial load when map and elements are ready
    const hasFittedRef = React.useRef(false);

    const handleMapReady = useCallback((map: L.Map) => {
        setMapInstance(map);
        setAnalysisMapInstance(map);
        hasFittedRef.current = false;
    }, [setAnalysisMapInstance]);
    useEffect(() => {
        if (!mapInstance || diagramElements.length === 0 || hasFittedRef.current) return;
        hasFittedRef.current = true;
        // Wait for the map to fully load tiles before fitting bounds
        const onReady = () => {
            mapInstance.invalidateSize();
            const boundsPoints: [number, number][] = [];
            diagramElements.forEach(el => {
                if (el.type === 'arc' && el.coordinates.length >= 3) {
                    const origin = el.coordinates[0];
                    const startPt = el.coordinates[1];
                    const endPt = el.coordinates[2];
                    const radius = el.properties.radius || 18500;
                    const maxR = Math.max(radius, el.properties.radius2 || 0);
                    const cosLat = Math.cos(origin.lat * Math.PI / 180);
                    const startAngle = Math.atan2((startPt.lat - origin.lat), (startPt.lng - origin.lng) * cosLat);
                    const endAngle = Math.atan2((endPt.lat - origin.lat), (endPt.lng - origin.lng) * cosLat);
                    let sweep = endAngle - startAngle;
                    while (sweep > Math.PI) sweep -= 2 * Math.PI;
                    while (sweep < -Math.PI) sweep += 2 * Math.PI;
                    const mPerDegreeLat = 111320;
                    const mPerDegreeLng = 111320 * cosLat;
                    for (let i = 0; i <= 16; i++) {
                        const angle = startAngle + (i / 16) * sweep;
                        boundsPoints.push([
                            origin.lat + (maxR * Math.sin(angle)) / mPerDegreeLat,
                            origin.lng + (maxR * Math.cos(angle)) / mPerDegreeLng,
                        ]);
                    }
                    boundsPoints.push([origin.lat, origin.lng]);
                } else {
                    el.coordinates.forEach(c => boundsPoints.push([c.lat, c.lng]));
                }
            });
            if (boundsPoints.length > 0) {
                const bounds = L.latLngBounds(boundsPoints);
                mapInstance.flyToBounds(bounds, { padding: [50, 50], duration: 0.8 });
            }
        };
        // Listen for the map's 'load' event, or use a fallback timeout if already loaded
        if (mapInstance.getContainer()?.clientWidth > 0) {
            // Map container is already sized – wait for tiles to finish loading
            const fallback = setTimeout(onReady, 1500);
            const handler = () => { clearTimeout(fallback); onReady(); };
            mapInstance.once('load', handler);
            return () => { clearTimeout(fallback); mapInstance.off('load', handler); };
        } else {
            // Container not yet sized (animation in progress) – wait longer
            const timer = setTimeout(onReady, 2000);
            return () => clearTimeout(timer);
        }
    }, [mapInstance, diagramElements]);

    const handlePopoverConfirm = useCallback((phaseId: string, unitCode: number) => {
        if (!pendingElement || !activePlan) return;
        const updated = (activePlan.diagramElements || []).map(el =>
            el.id === pendingElement.id ? { ...el, phaseId, unitCode } : el
        );
        updatePlan(activePlan.id, { diagramElements: updated });
        setPendingElement(null);
    }, [pendingElement, activePlan, updatePlan]);

    const handlePopoverCancel = useCallback(() => {
        setPendingElement(null);
    }, []);

    return (
        <AnimatePresence>
            {isMapOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: `${mapWidth}%`, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="h-full flex overflow-hidden isolate"
                    style={['diagram', 'main', 'link_planning'].includes(currentSection) ? undefined : { maxWidth: '70%', flexShrink: 0 }}
                >
                    {/* Map container */}
                    <div className="flex-1 relative rounded-none overflow-hidden shadow-lg border border-e-0 border-slate-200 dark:border-zinc-700 bg-white dark:bg-black">
                        <MapToolbar
                            onDrawPolygon={handleDrawPolygon}
                            onDrawArrow={handleDrawArrow}
                            onDrawLine={handleDrawLine}
                            onDrawArc={handleDrawArc}
                            onDrawTextLabel={handleDrawTextLabel}
                            activeDrawingTool={activeDrawingTool}
                            onDrawLinkCell={enableDrawCell}
                            onPlaceMobilePlatform={enablePlacePlatform}
                            onFitBounds={() => {
                                if (!mapInstance || diagramElements.length === 0) return;
                                const boundsPoints: [number, number][] = [];
                                diagramElements.forEach(el => {
                                    if (el.type === 'arc' && el.coordinates.length >= 3) {
                                        // Compute actual arc extent points
                                        const origin = el.coordinates[0];
                                        const startPt = el.coordinates[1];
                                        const endPt = el.coordinates[2];
                                        const radius = el.properties.radius || 18500;
                                        const maxR = Math.max(radius, el.properties.radius2 || 0);
                                        const cosLat = Math.cos(origin.lat * Math.PI / 180);
                                        const startAngle = Math.atan2((startPt.lat - origin.lat), (startPt.lng - origin.lng) * cosLat);
                                        const endAngle = Math.atan2((endPt.lat - origin.lat), (endPt.lng - origin.lng) * cosLat);
                                        let sweep = endAngle - startAngle;
                                        while (sweep > Math.PI) sweep -= 2 * Math.PI;
                                        while (sweep < -Math.PI) sweep += 2 * Math.PI;
                                        const mPerDegreeLat = 111320;
                                        const mPerDegreeLng = 111320 * cosLat;
                                        // Sample points along the arc
                                        for (let i = 0; i <= 16; i++) {
                                            const angle = startAngle + (i / 16) * sweep;
                                            boundsPoints.push([
                                                origin.lat + (maxR * Math.sin(angle)) / mPerDegreeLat,
                                                origin.lng + (maxR * Math.cos(angle)) / mPerDegreeLng,
                                            ]);
                                        }
                                        boundsPoints.push([origin.lat, origin.lng]);
                                    } else {
                                        el.coordinates.forEach(c => boundsPoints.push([c.lat, c.lng]));
                                    }
                                });
                                if (boundsPoints.length === 0) return;
                                const bounds = L.latLngBounds(boundsPoints);
                                mapInstance.flyToBounds(bounds, { padding: [50, 50], duration: 0.8 });
                            }}
                            onZoomIn={() => mapInstance?.zoomIn()}
                            onZoomOut={() => mapInstance?.zoomOut()}
                        />

                        <div className="w-full h-full">
                            <MapContainer
                                center={[31.5, 35.0]}
                                zoom={10}
                                zoomSnap={0.5}
                                zoomDelta={0.5}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={false}
                                attributionControl={false}
                            >
                                <TileLayer
                                    key={activeMapType}
                                    attribution={TILE_ATTRIBUTIONS[activeMapType]}
                                    url={TILE_URLS[activeMapType]}
                                    opacity={opacity / 100}
                                />
                                <MapInstanceGetter onMap={handleMapReady} />
                                <MapResizer />
                                <StaticSpaceMapLayer />
                                <MobileSpaceMapLayer onPlatformContextMenu={(platformId, x, y) => setPlatformContextMenu({ platformId, x, y })} />
                                <TikshovCopMapLayer />
                                <SpectrumMapLayer />
                                <LinkCoverageMapLayer
                                    onPlatformContextMenu={(platformId, x, y) => setPlatformContextMenu({ platformId, x, y })}
                                    onCellContextMenu={(cellId, x, y) => setLinkCellContextMenu({ cellId, x, y })}
                                />
                            </MapContainer>
                        </div>

                        {/* Context Menu */}
                        {contextMenu && (
                            <MapContextMenu
                                elementId={contextMenu.elementId}
                                elementType={contextMenu.elementType}
                                x={contextMenu.x}
                                y={contextMenu.y}
                                sessionUnit={sessionUnit}
                                onEdit={editElement}
                                onEditText={editElementText}
                                onChangePhase={changeElementPhase}
                                onChangeUnit={changeElementUnit}
                                onChangeStrokeWidth={changeElementStrokeWidth}
                                onAddLabel={addElementLabel}
                                onChangeArcDistance={changeArcDistance}
                                onAddArcSecondRing={addArcSecondRing}
                                onChangeArcSecondRing={changeArcSecondRing}
                                onRemoveArcSecondRing={removeArcSecondRing}
                                onDelete={deleteElement}
                                onClose={() => setContextMenu(null)}
                            />
                        )}

                        {/* Assign Element Popover */}
                        {pendingElement && (
                            <ElementAssignPopover
                                element={pendingElement}
                                sessionUnit={sessionUnit}
                                onConfirm={handlePopoverConfirm}
                                onCancel={handlePopoverCancel}
                            />
                        )}

                        {/* Link Planning: name a just-drawn cell or just-placed platform */}
                        {pendingCellCoords && (
                            <NamePromptPopover
                                title={t('linkPlanning.nameCellTitle')}
                                placeholder={t('linkPlanning.cellNamePlaceholder')}
                                onConfirm={(name) => { addLinkCell(name, pendingCellCoords); setPendingCellCoords(null); }}
                                onCancel={() => setPendingCellCoords(null)}
                            />
                        )}
                        {pendingPlatformPos && (
                            <NamePromptPopover
                                title={t('linkPlanning.namePlatformTitle')}
                                placeholder={t('linkPlanning.platformNamePlaceholder')}
                                onConfirm={(name) => { addMobilePlatform(name, pendingPlatformPos); setPendingPlatformPos(null); }}
                                onCancel={() => setPendingPlatformPos(null)}
                            />
                        )}
                        {pendingRename && (
                            <NamePromptPopover
                                title={t('linkPlanning.renameTitle')}
                                placeholder={pendingRename.kind === 'cell' ? t('linkPlanning.cellNamePlaceholder') : t('linkPlanning.platformNamePlaceholder')}
                                initialValue={pendingRename.currentName}
                                onConfirm={(name) => {
                                    if (pendingRename.kind === 'cell') renameLinkCell(pendingRename.id, name);
                                    else renameMobilePlatform(pendingRename.id, name);
                                    setPendingRename(null);
                                }}
                                onCancel={() => setPendingRename(null)}
                            />
                        )}
                        {platformContextMenu && (
                            <MobilePlatformContextMenu
                                platformId={platformContextMenu.platformId}
                                x={platformContextMenu.x}
                                y={platformContextMenu.y}
                                onRename={() => {
                                    const platform = mobilePlatforms.find(p => p.id === platformContextMenu.platformId);
                                    if (platform) setPendingRename({ kind: 'platform', id: platform.id, currentName: platform.name });
                                }}
                                onChangeLocation={() => enableMovePlatform(platformContextMenu.platformId)}
                                onClose={() => setPlatformContextMenu(null)}
                            />
                        )}
                        {linkCellContextMenu && (
                            <LinkCellContextMenu
                                cellId={linkCellContextMenu.cellId}
                                x={linkCellContextMenu.x}
                                y={linkCellContextMenu.y}
                                onRename={() => {
                                    const cell = linkCells.find(c => c.id === linkCellContextMenu.cellId);
                                    if (cell) setPendingRename({ kind: 'cell', id: cell.id, currentName: cell.name });
                                }}
                                onChangeLocation={() => enableRedrawCell(linkCellContextMenu.cellId)}
                                onDelete={() => removeLinkCell(linkCellContextMenu.cellId)}
                                onClose={() => setLinkCellContextMenu(null)}
                            />
                        )}

                        {/* AI Analysis Tools */}
                        <MapAiToolsPanel />

                        {/* Analysis Legend */}
                        <AnalysisLegend />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
