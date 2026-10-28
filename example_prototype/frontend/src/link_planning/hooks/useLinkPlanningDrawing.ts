import { useCallback, useEffect, useRef, MutableRefObject } from 'react';
import L from 'leaflet';
import { GeoCoordinate } from '../../common/utilities/types';

interface UseLinkPlanningDrawingOptions {
    map: L.Map | null;
    // Shared with useGeoman (the Diagram feature's own polygon tool, on the same Leaflet
    // map instance): we flip this on before starting our own polygon draw so useGeoman's
    // pm:create handler ignores the event (it would otherwise also turn the same draw into
    // a DiagramElement) — and symmetrically, we only react to pm:create ourselves while
    // this same flag is on, so a Diagram-tool draw never gets mistaken for a Link Cell.
    suppressRef: MutableRefObject<boolean>;
    onCellDrawn: (coordinates: GeoCoordinate[]) => void;
    onPlatformPlaced: (position: GeoCoordinate) => void;
    onHeadquartersPlaced: (position: GeoCoordinate) => void;
    // "Change location" flows (right-click → שנה מיקום on a cell/platform/headquarters
    // still under נוה"ק): reuse the exact same draw/click plumbing above, but route the
    // result to an update call for a specific existing id instead of creating a new entity.
    onCellRedrawn: (cellId: string, coordinates: GeoCoordinate[]) => void;
    onPlatformMoved: (platformId: string, position: GeoCoordinate) => void;
    onHeadquartersMoved: (entityId: string, position: GeoCoordinate) => void;
}

export function useLinkPlanningDrawing({
    map, suppressRef, onCellDrawn, onPlatformPlaced, onHeadquartersPlaced, onCellRedrawn, onPlatformMoved, onHeadquartersMoved,
}: UseLinkPlanningDrawingOptions) {
    const onCellDrawnRef = useRef(onCellDrawn);
    onCellDrawnRef.current = onCellDrawn;
    const onPlatformPlacedRef = useRef(onPlatformPlaced);
    onPlatformPlacedRef.current = onPlatformPlaced;
    const onHeadquartersPlacedRef = useRef(onHeadquartersPlaced);
    onHeadquartersPlacedRef.current = onHeadquartersPlaced;
    const onCellRedrawnRef = useRef(onCellRedrawn);
    onCellRedrawnRef.current = onCellRedrawn;
    const onPlatformMovedRef = useRef(onPlatformMoved);
    onPlatformMovedRef.current = onPlatformMoved;
    const onHeadquartersMovedRef = useRef(onHeadquartersMoved);
    onHeadquartersMovedRef.current = onHeadquartersMoved;

    // Non-null while a redraw/move is in progress — identifies which existing entity the
    // next pm:create/click result belongs to. Cleared the moment that result is consumed.
    const redrawTargetCellIdRef = useRef<string | null>(null);
    const movePlatformTargetIdRef = useRef<string | null>(null);
    const moveHeadquartersTargetIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!map) return;
        const handler = (e: any) => {
            if (!suppressRef.current) return;
            if (e.shape !== 'Polygon' && e.shape !== 'Rectangle') return;
            const layer = e.layer as L.Polygon;
            const latlngs = layer.getLatLngs()[0] as L.LatLng[];
            const coordinates: GeoCoordinate[] = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
            map.removeLayer(layer);
            map.pm.disableDraw();
            suppressRef.current = false;
            const targetCellId = redrawTargetCellIdRef.current;
            redrawTargetCellIdRef.current = null;
            if (targetCellId) onCellRedrawnRef.current(targetCellId, coordinates);
            else onCellDrawnRef.current(coordinates);
        };
        map.on('pm:create', handler);
        return () => { map.off('pm:create', handler); };
    }, [map, suppressRef]);

    const enableDrawCell = useCallback(() => {
        if (!map) return;
        suppressRef.current = true;
        map.pm.enableDraw('Polygon', { continueDrawing: false });
    }, [map, suppressRef]);

    const enablePlacePlatform = useCallback(() => {
        if (!map) return;
        map.once('click', (e: L.LeafletMouseEvent) => {
            const targetPlatformId = movePlatformTargetIdRef.current;
            movePlatformTargetIdRef.current = null;
            const position = { lat: e.latlng.lat, lng: e.latlng.lng };
            if (targetPlatformId) onPlatformMovedRef.current(targetPlatformId, position);
            else onPlatformPlacedRef.current(position);
        });
    }, [map]);

    const enableRedrawCell = useCallback((cellId: string) => {
        if (!map) return;
        redrawTargetCellIdRef.current = cellId;
        suppressRef.current = true;
        map.pm.enableDraw('Polygon', { continueDrawing: false });
    }, [map, suppressRef]);

    const enableMovePlatform = useCallback((platformId: string) => {
        if (!map) return;
        movePlatformTargetIdRef.current = platformId;
        enablePlacePlatform();
    }, [map, enablePlacePlatform]);

    // The pending one-shot click listener, kept so a place/move that's abandoned (Esc / banner
    // cancel from the overview-driven flow) can be torn down instead of lingering on the map.
    const headquartersClickHandlerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null);

    const cancelPlaceHeadquarters = useCallback(() => {
        if (map && headquartersClickHandlerRef.current) map.off('click', headquartersClickHandlerRef.current);
        headquartersClickHandlerRef.current = null;
        moveHeadquartersTargetIdRef.current = null;
    }, [map]);

    const enablePlaceHeadquarters = useCallback(() => {
        if (!map) return;
        if (headquartersClickHandlerRef.current) map.off('click', headquartersClickHandlerRef.current);
        const handler = (e: L.LeafletMouseEvent) => {
            headquartersClickHandlerRef.current = null;
            const targetEntityId = moveHeadquartersTargetIdRef.current;
            moveHeadquartersTargetIdRef.current = null;
            const position = { lat: e.latlng.lat, lng: e.latlng.lng };
            if (targetEntityId) onHeadquartersMovedRef.current(targetEntityId, position);
            else onHeadquartersPlacedRef.current(position);
        };
        headquartersClickHandlerRef.current = handler;
        map.once('click', handler);
    }, [map]);

    const enableMoveHeadquarters = useCallback((entityId: string) => {
        if (!map) return;
        moveHeadquartersTargetIdRef.current = entityId;
        enablePlaceHeadquarters();
    }, [map, enablePlaceHeadquarters]);

    return {
        enableDrawCell, enablePlacePlatform, enableRedrawCell, enableMovePlatform,
        enablePlaceHeadquarters, enableMoveHeadquarters, cancelPlaceHeadquarters,
    };
}
