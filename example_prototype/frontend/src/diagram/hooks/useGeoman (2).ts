import { useEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { useTranslation } from 'react-i18next';
import { DiagramElement, GeoCoordinate, SystemUnit } from '../../common/utilities/types';
import { getUnitColor } from '../../common/utilities/colors';
import { mockUnits } from '../../common/utilities/mockData';

export interface ContextMenuState {
    elementId: string;
    elementType: string;
    x: number;
    y: number;
}

interface UseGeomanOptions {
    map: L.Map | null;
    diagramElements: DiagramElement[];
    activePhaseId: string | null;
    activeUnitCode: number | null;
    sessionUnit: SystemUnit | null;
    planUnitCodes: number[];
    onElementsChange: (elements: DiagramElement[]) => void;
    onElementCreatedWithoutAssignment?: (element: DiagramElement) => void;
}

export function useGeoman({
    map,
    diagramElements,
    activePhaseId,
    activeUnitCode,
    sessionUnit,
    planUnitCodes,
    onElementsChange,
    onElementCreatedWithoutAssignment,
}: UseGeomanOptions) {
    const layersRef = useRef<Map<string, L.Layer>>(new Map());
    const elementsRef = useRef<DiagramElement[]>(diagramElements);
    const activeToolRef = useRef<string | null>(null);
    const activePhaseIdRef = useRef<string | null>(activePhaseId);
    const activeUnitCodeRef = useRef<number | null>(activeUnitCode);

    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [mapZoom, setMapZoom] = useState<number>(0);
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('isDarkMode') === 'true');

    // Track dark mode changes
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(localStorage.getItem('isDarkMode') === 'true');
        });
        // Observe class changes on the app's root div (parent that gets 'dark' class)
        const target = document.querySelector('[class*="font-sans"]') || document.body;
        observer.observe(target, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Track zoom level for responsive arc label gaps
    useEffect(() => {
        if (!map) return;
        const onZoom = () => setMapZoom(map.getZoom());
        setMapZoom(map.getZoom());
        map.on('zoomend', onZoom);
        return () => { map.off('zoomend', onZoom); };
    }, [map]);

    // Arc drawing state
    const arcDrawStateRef = useRef<'idle' | 'origin' | 'startAngle' | 'endAngle'>('idle');
    const arcOriginRef = useRef<L.LatLng | null>(null);
    const arcStartAnglePointRef = useRef<L.LatLng | null>(null);
    const arcPreviewLayerRef = useRef<L.Layer | null>(null);
    const arcCursorMarkerRef = useRef<L.Marker | null>(null);
    const arcClickHandlerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null);
    const arcMoveHandlerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null);

    // Keep refs in sync
    useEffect(() => { elementsRef.current = diagramElements; }, [diagramElements]);
    useEffect(() => { activePhaseIdRef.current = activePhaseId; }, [activePhaseId]);
    useEffect(() => { activeUnitCodeRef.current = activeUnitCode; }, [activeUnitCode]);

    // Resolve element color from unit assignment
    const getElementColor = useCallback((element: DiagramElement): string => {
        if (element.unitCode) {
            return getUnitColor(element.unitCode, sessionUnit, planUnitCodes, mockUnits);
        }
        // Fallback colors by type
        if (element.type === 'arrow' || element.type === 'line') return '#ef4444';
        if (element.type === 'polygon') return '#00A2C7';
        if (element.type === 'arc') return '#f59e0b';
        return '#64748b';
    }, [sessionUnit, planUnitCodes]);

    // Set Geoman tooltip language
    const { i18n } = useTranslation();
    useEffect(() => {
        if (!map) return;
        if (i18n.language === 'he') {
            map.pm.setLang('he', {
                tooltips: {
                    placeMarker: 'לחץ למיקום סמן',
                    firstVertex: 'לחץ למיקום הנקודה הראשונה',
                    continueLine: 'לחץ להמשך ציור',
                    finishLine: 'לחץ על נקודה קיימת לסיום',
                    finishPoly: 'לחץ על הנקודה הראשונה לסיום',
                    finishRect: 'לחץ לסיום',
                    startCircle: 'לחץ למיקום מרכז העיגול',
                    finishCircle: 'לחץ לסיום העיגול',
                    placeCircleMarker: 'לחץ למיקום סמן עיגול',
                    placeText: 'לחץ למיקום טקסט',
                },
                actions: {
                    finish: 'סיום',
                    cancel: 'ביטול',
                    removeLastVertex: 'הסר נקודה אחרונה',
                },
                buttonTitles: {
                    drawMarkerButton: 'הוסף סמן',
                    drawPolyButton: 'צייר מצולע',
                    drawLineButton: 'צייר קו',
                    drawCircleButton: 'צייר עיגול',
                    drawRectButton: 'צייר מלבן',
                    editButton: 'ערוך שכבות',
                    dragButton: 'גרור שכבות',
                    cutButton: 'חתוך שכבות',
                    deleteButton: 'מחק שכבות',
                    drawCircleMarkerButton: 'צייר סמן עיגול',
                    drawTextButton: 'צייר טקסט',
                },
            } as any, 'en');
        } else {
            map.pm.setLang('en');
        }
    }, [map, i18n.language]);

    // Initialize geoman controls
    useEffect(() => {
        if (!map) return;

        // Disable default geoman toolbar entirely (we use our own)
        map.pm.addControls({
            position: 'topleft',
            drawMarker: false,
            drawCircleMarker: false,
            drawPolyline: false,
            drawRectangle: false,
            drawPolygon: false,
            drawCircle: false,
            drawText: false,
            editMode: false,
            dragMode: false,
            cutPolygon: false,
            removalMode: false,
            rotateMode: false,
        });
        map.pm.removeControls();

        // Handle create events
        map.on('pm:create', (e: any) => {
            const layer = e.layer;
            const id = `elem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

            let type: DiagramElement['type'] = 'polygon';
            let coordinates: GeoCoordinate[] = [];
            const properties: Record<string, any> = {};

            if (e.shape === 'Polygon' || e.shape === 'Rectangle') {
                type = 'polygon';
                const latlngs = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[];
                coordinates = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
                properties.fillOpacity = 0.2;
            } else if (e.shape === 'Line') {
                const isArrow = activeToolRef.current === 'arrow';
                type = isArrow ? 'arrow' : 'line';
                const latlngs = (layer as L.Polyline).getLatLngs() as L.LatLng[];
                coordinates = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
                properties.weight = 4;
                if (isArrow) properties.hasArrowhead = true;
            } else if (e.shape === 'Marker' || e.shape === 'Text') {
                type = 'textLabel';
                const latlng = (layer as L.Marker).getLatLng();
                coordinates = [{ lat: latlng.lat, lng: latlng.lng }];
                properties.text = 'Label';
                properties.fontSize = 14;
            }

            // Remove the geoman-created layer (we re-render from state)
            map.removeLayer(layer);

            const currentPhaseId = activePhaseIdRef.current;
            const currentUnitCode = activeUnitCodeRef.current;

            const newElement: DiagramElement = {
                id,
                type,
                phaseId: currentPhaseId || undefined,
                unitCode: currentUnitCode || undefined,
                coordinates,
                properties,
            };

            const updated = [...elementsRef.current, newElement];
            onElementsChange(updated);

            // If phase or unit not selected, notify for popover
            if (!currentPhaseId || !currentUnitCode) {
                onElementCreatedWithoutAssignment?.(newElement);
            }

            map.pm.disableDraw();
            activeToolRef.current = null;
        });

        // Handle edit events (vertex editing)
        map.on('pm:edit', (e: any) => {
            const layer = e.layer;
            const elementId = (layer as any)._diagramElementId;
            if (!elementId) return;

            let coordinates: GeoCoordinate[] = [];
            if (layer instanceof L.Polygon) {
                const latlngs = layer.getLatLngs()[0] as L.LatLng[];
                coordinates = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
            } else if (layer instanceof L.Polyline) {
                const latlngs = layer.getLatLngs() as L.LatLng[];
                coordinates = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
            } else if (layer instanceof L.Marker) {
                const latlng = layer.getLatLng();
                coordinates = [{ lat: latlng.lat, lng: latlng.lng }];
            }

            const updated = elementsRef.current.map(el =>
                el.id === elementId ? { ...el, coordinates } : el
            );
            onElementsChange(updated);
        });

        // Handle remove events
        map.on('pm:remove', (e: any) => {
            const layer = e.layer;
            const elementId = (layer as any)._diagramElementId;
            if (!elementId) return;
            const updated = elementsRef.current.filter(el => el.id !== elementId);
            onElementsChange(updated);
            layersRef.current.delete(elementId);
        });

        // Click on map background to deselect
        map.on('click', () => {
            setSelectedElementId(null);
            setContextMenu(null);
        });

        return () => {
            map.off('pm:create');
            map.off('pm:edit');
            map.off('pm:remove');
            map.off('click');
        };
    }, [map, onElementsChange, onElementCreatedWithoutAssignment]);

    // Render diagram elements as Leaflet layers
    useEffect(() => {
        if (!map || !map.getContainer()?.isConnected) return;

        // Detect dark mode for label shadows
        const shadowColor = isDarkMode ? 'rgba(0,0,0,0.8)' : 'white';
        const textShadow = `0 0 3px ${shadowColor}, 0 0 3px ${shadowColor}, 0 0 5px ${shadowColor}`;

        // Clear existing layers
        layersRef.current.forEach(layer => {
            (layer as any).pm?.disable?.();
            (layer as any).pm?.disableLayerDrag?.();
            map.removeLayer(layer);
        });
        layersRef.current.clear();

        // Filter by active phase
        const visibleElements = activePhaseId
            ? diagramElements.filter(el => !el.phaseId || el.phaseId === activePhaseId)
            : diagramElements;

        visibleElements.forEach(element => {
            let layer: L.Layer | null = null;
            const color = getElementColor(element);
            const isSelected = element.id === selectedElementId;
            const baseWeight = element.properties.weight || 4; // default Medium
            const renderColor = isSelected ? '#000000' : color;
            const weight = baseWeight;

            if (element.type === 'polygon' && element.coordinates.length >= 3) {
                const latlngs = element.coordinates.map(c => [c.lat, c.lng] as [number, number]);
                layer = L.polygon(latlngs, {
                    color: renderColor,
                    fillColor: renderColor,
                    fillOpacity: element.properties.fillOpacity ?? 0.2,
                    weight,
                });
            } else if ((element.type === 'arrow' || element.type === 'line') && element.coordinates.length >= 2) {
                const latlngs = element.coordinates.map(c => [c.lat, c.lng] as [number, number]);

                // For line elements with a label: split polyline with a gap
                if (element.type === 'line' && element.properties.label && map) {
                    const midIdx = Math.floor(element.coordinates.length / 2);
                    let midLat: number, midLng: number;
                    let segStartIdx: number;
                    if (element.coordinates.length % 2 === 0) {
                        const a = element.coordinates[midIdx - 1];
                        const b = element.coordinates[midIdx];
                        midLat = (a.lat + b.lat) / 2;
                        midLng = (a.lng + b.lng) / 2;
                        segStartIdx = midIdx - 1;
                    } else {
                        midLat = element.coordinates[midIdx].lat;
                        midLng = element.coordinates[midIdx].lng;
                        segStartIdx = midIdx > 0 ? midIdx - 1 : 0;
                    }

                    const segA = element.coordinates[segStartIdx];
                    const segB = element.coordinates[Math.min(segStartIdx + 1, element.coordinates.length - 1)];
                    const segLen = Math.sqrt((segB.lat - segA.lat) ** 2 + (segB.lng - segA.lng) ** 2);

                    // Compute zoom-responsive gap
                    const labelPixelWidth = (element.properties.label!.length * 8) + 16;
                    const midPx = map.latLngToContainerPoint(L.latLng(midLat, midLng));
                    const stepFrac = 0.1;
                    const dirLat = segLen > 0 ? (segB.lat - segA.lat) / segLen : 0;
                    const dirLng = segLen > 0 ? (segB.lng - segA.lng) / segLen : 0;
                    const probeLat = midLat + dirLat * stepFrac * segLen;
                    const probeLng = midLng + dirLng * stepFrac * segLen;
                    const probePx = map.latLngToContainerPoint(L.latLng(probeLat, probeLng));
                    const pxPerStep = Math.sqrt((probePx.x - midPx.x) ** 2 + (probePx.y - midPx.y) ** 2);
                    const halfGapLatLng = pxPerStep > 0 ? (labelPixelWidth * 1.2 * stepFrac * segLen) / (2 * pxPerStep) : segLen * 0.1;

                    // Gap start/end in lat/lng
                    const gapStartLat = midLat - dirLat * halfGapLatLng;
                    const gapStartLng = midLng - dirLng * halfGapLatLng;
                    const gapEndLat = midLat + dirLat * halfGapLatLng;
                    const gapEndLng = midLng + dirLng * halfGapLatLng;

                    // First half: from start to gap start
                    const firstHalf: [number, number][] = [];
                    for (let i = 0; i <= segStartIdx; i++) {
                        firstHalf.push(latlngs[i]);
                    }
                    if (element.coordinates.length % 2 === 0) {
                        firstHalf.push([gapStartLat, gapStartLng]);
                    } else {
                        firstHalf.push([gapStartLat, gapStartLng]);
                    }

                    // Second half: from gap end to end
                    const secondHalf: [number, number][] = [[gapEndLat, gapEndLng]];
                    const resumeIdx = element.coordinates.length % 2 === 0 ? midIdx : midIdx;
                    for (let i = resumeIdx; i < latlngs.length; i++) {
                        secondHalf.push(latlngs[i]);
                    }

                    const polyline1 = L.polyline(firstHalf, { color: renderColor, weight });
                    const polyline2 = L.polyline(secondHalf, { color: renderColor, weight });

                    // Rotated label
                    const lineDirAngle = Math.atan2(segB.lat - segA.lat, segB.lng - segA.lng);
                    let lineRotDeg = -(lineDirAngle * 180 / Math.PI);
                    if (lineRotDeg > 90) lineRotDeg -= 180;
                    if (lineRotDeg < -90) lineRotDeg += 180;

                    const lineLabelIcon = L.divIcon({
                        className: 'diagram-text-label-icon',
                        html: `<div style="position:absolute; left:50%; top:50%; transform: translate(-50%, -50%) rotate(${lineRotDeg}deg); font-size: 12px; font-weight: 600; color: ${renderColor}; text-shadow: ${textShadow}; white-space: nowrap; padding: 2px 4px;">${element.properties.label}</div>`,
                        iconSize: [0, 0],
                        iconAnchor: [0, 0],
                    });
                    const lineLabelMarker = L.marker([midLat, midLng], { icon: lineLabelIcon, interactive: false });

                    layer = L.layerGroup([polyline1, polyline2, lineLabelMarker]);
                } else {
                    const polyline = L.polyline(latlngs, { color: renderColor, weight });

                    if (element.properties.hasArrowhead && element.coordinates.length >= 2) {
                        const lastCoord = element.coordinates[element.coordinates.length - 1];
                        const prevCoord = element.coordinates[element.coordinates.length - 2];
                        const angle = Math.atan2(lastCoord.lat - prevCoord.lat, lastCoord.lng - prevCoord.lng) * (180 / Math.PI);

                        // Scale arrowhead size based on stroke weight
                        const arrowSize = Math.round(baseWeight * 5); // thin=10, medium=20, thick=35
                        const arrowIcon = L.divIcon({
                            className: 'diagram-arrow-head',
                            html: `<div style="transform: rotate(${-angle + 90}deg); color: ${renderColor}; font-size: ${arrowSize}px; line-height: 1;">▲</div>`,
                            iconSize: [arrowSize, arrowSize],
                            iconAnchor: [arrowSize / 2, arrowSize / 2],
                        });

                        const arrowMarker = L.marker([lastCoord.lat, lastCoord.lng], { icon: arrowIcon, interactive: false });
                        layer = L.layerGroup([polyline, arrowMarker]);
                    } else {
                        layer = polyline;
                    }
                }
            } else if (element.type === 'textLabel' && element.coordinates.length >= 1) {
                const coord = element.coordinates[0];
                const selectedStyle = isSelected ? 'outline: 2px solid #000000; outline-offset: 2px; border-radius: 4px;' : '';
                const textColor = isSelected ? '#000000' : color;
                const textIcon = L.divIcon({
                    className: 'diagram-text-label-icon',
                    html: `<div style="display: inline-block; font-size: ${element.properties.fontSize || 14}px; font-weight: 600; color: ${textColor}; text-shadow: ${textShadow}; white-space: nowrap; padding: 2px 4px; ${selectedStyle}">${element.properties.text || 'Label'}</div>`,
                });
                layer = L.marker([coord.lat, coord.lng], { icon: textIcon });
            } else if (element.type === 'arc' && element.coordinates.length >= 3) {
                // Arc: coordinates = [origin, startAnglePoint, endAnglePoint]
                const origin = element.coordinates[0];
                const startPt = element.coordinates[1];
                const endPt = element.coordinates[2];
                const radius = element.properties.radius || 18500; // meters

                // Compute angles
                const cosLat = Math.cos(origin.lat * Math.PI / 180);
                const startAngle = Math.atan2(
                    (startPt.lat - origin.lat),
                    (startPt.lng - origin.lng) * cosLat
                );
                const endAngle = Math.atan2(
                    (endPt.lat - origin.lat),
                    (endPt.lng - origin.lng) * cosLat
                );

                // Determine if we need a gap for the label
                const hasLabel = !!element.properties.label;
                // Gap size as a fraction of the arc, computed from pixel width of text vs pixel arc length
                let gapFraction = 0;
                if (hasLabel && map) {
                    // Estimate label pixel width (~7px per character + padding)
                    const labelPixelWidth = (element.properties.label!.length * 8) + 16;
                    // Compute pixel arc length: distance between start and end on screen
                    let sweep2 = endAngle - startAngle;
                    while (sweep2 > Math.PI) sweep2 -= 2 * Math.PI;
                    while (sweep2 < -Math.PI) sweep2 += 2 * Math.PI;
                    const mPerDegreeLat2 = 111320;
                    const mPerDegreeLng2 = 111320 * cosLat;
                    // Sample two points near midpoint to get pixel-per-radian scale
                    const midAngleForGap = startAngle + sweep2 / 2;
                    const dAngle = 0.05 * Math.abs(sweep2);
                    const ptA = L.latLng(
                        origin.lat + (radius * Math.sin(midAngleForGap - dAngle)) / mPerDegreeLat2,
                        origin.lng + (radius * Math.cos(midAngleForGap - dAngle)) / mPerDegreeLng2
                    );
                    const ptB = L.latLng(
                        origin.lat + (radius * Math.sin(midAngleForGap + dAngle)) / mPerDegreeLat2,
                        origin.lng + (radius * Math.cos(midAngleForGap + dAngle)) / mPerDegreeLng2
                    );
                    const pxA = map.latLngToContainerPoint(ptA);
                    const pxB = map.latLngToContainerPoint(ptB);
                    const pxDist = Math.sqrt((pxB.x - pxA.x) ** 2 + (pxB.y - pxA.y) ** 2);
                    // pxDist corresponds to 2*dAngle fraction of the arc = 2*dAngle / |sweep|
                    const fractionForPxDist = (2 * dAngle) / Math.abs(sweep2);
                    const pixelsPerFraction = pxDist / fractionForPxDist;
                    // Gap fraction = label pixel width / pixels per fraction (with padding)
                    gapFraction = pixelsPerFraction > 0 ? Math.min(0.5, (labelPixelWidth * 1.2) / pixelsPerFraction) : 0.1;
                }

                // Generate arc points (shortest path from start to end)
                const generateArcPoints = (r: number, fromFraction: number, toFraction: number): [number, number][] => {
                    const points: [number, number][] = [];
                    const NUM_POINTS = 64;
                    let sweep = endAngle - startAngle;
                    while (sweep > Math.PI) sweep -= 2 * Math.PI;
                    while (sweep < -Math.PI) sweep += 2 * Math.PI;

                    const mPerDegreeLat = 111320;
                    const mPerDegreeLng = 111320 * cosLat;

                    const startIdx = Math.round(fromFraction * NUM_POINTS);
                    const endIdx = Math.round(toFraction * NUM_POINTS);

                    for (let i = startIdx; i <= endIdx; i++) {
                        const angle = startAngle + (i / NUM_POINTS) * sweep;
                        const lat = origin.lat + (r * Math.sin(angle)) / mPerDegreeLat;
                        const lng = origin.lng + (r * Math.cos(angle)) / mPerDegreeLng;
                        points.push([lat, lng]);
                    }
                    return points;
                };

                // Origin dot marker (placed first as the draggable handle)
                const dotSize = 8;
                const dotIcon = L.divIcon({
                    className: 'diagram-arrow-head',
                    html: `<div style="width:${dotSize}px; height:${dotSize}px; border-radius:50%; background:${renderColor};"></div>`,
                    iconSize: [dotSize, dotSize],
                    iconAnchor: [dotSize / 2, dotSize / 2],
                });
                const originMarker = L.marker([origin.lat, origin.lng], { icon: dotIcon });

                const layers: L.Layer[] = [originMarker];

                if (hasLabel) {
                    // Split arc into two segments with a gap at the midpoint
                    const arc1a = L.polyline(generateArcPoints(radius, 0, 0.5 - gapFraction / 2), { color: renderColor, weight });
                    const arc1b = L.polyline(generateArcPoints(radius, 0.5 + gapFraction / 2, 1), { color: renderColor, weight });
                    layers.push(arc1a, arc1b);

                    if (element.properties.radius2) {
                        const arc2a = L.polyline(generateArcPoints(element.properties.radius2, 0, 0.5 - gapFraction / 2), { color: renderColor, weight, dashArray: '8 4' });
                        const arc2b = L.polyline(generateArcPoints(element.properties.radius2, 0.5 + gapFraction / 2, 1), { color: renderColor, weight, dashArray: '8 4' });
                        layers.push(arc2a, arc2b);
                    }
                } else {
                    // Single continuous arc
                    const arc1 = L.polyline(generateArcPoints(radius, 0, 1), { color: renderColor, weight });
                    layers.push(arc1);

                    if (element.properties.radius2) {
                        const arc2 = L.polyline(generateArcPoints(element.properties.radius2, 0, 1), { color: renderColor, weight, dashArray: '8 4' });
                        layers.push(arc2);
                    }
                }

                layer = L.layerGroup(layers);
            }

            // Attach label marker if element has a label (non-textLabel elements only)
            if (layer && element.type !== 'textLabel' && element.properties.label) {
                if (element.type === 'arc' && element.coordinates.length >= 3) {
                    // Arc gets TWO labels: one on the arc midpoint (rotated), one near origin
                    const origin = element.coordinates[0];
                    const startPt = element.coordinates[1];
                    const endPt = element.coordinates[2];
                    const radius = element.properties.radius || 18500;
                    const cosLat = Math.cos(origin.lat * Math.PI / 180);
                    const startAngle = Math.atan2((startPt.lat - origin.lat), (startPt.lng - origin.lng) * cosLat);
                    const endAngle = Math.atan2((endPt.lat - origin.lat), (endPt.lng - origin.lng) * cosLat);
                    let sweep = endAngle - startAngle;
                    while (sweep > Math.PI) sweep -= 2 * Math.PI;
                    while (sweep < -Math.PI) sweep += 2 * Math.PI;
                    const midAngle = startAngle + sweep / 2;
                    const mPerDegreeLat = 111320;
                    const mPerDegreeLng = 111320 * cosLat;

                    // Label on the arc curve (rotated to follow the tangent)
                    const arcLabelLat = origin.lat + (radius * Math.sin(midAngle)) / mPerDegreeLat;
                    const arcLabelLng = origin.lng + (radius * Math.cos(midAngle)) / mPerDegreeLng;
                    // Tangent angle: perpendicular to the radius at midpoint
                    const tangentAngle = sweep > 0 ? midAngle + Math.PI / 2 : midAngle - Math.PI / 2;
                    // Convert to CSS rotation (screen coords: y is inverted)
                    let rotDeg = -(tangentAngle * 180 / Math.PI);
                    // Keep text readable (not upside down)
                    if (rotDeg > 90) rotDeg -= 180;
                    if (rotDeg < -90) rotDeg += 180;

                    const arcLabelIcon = L.divIcon({
                        className: 'diagram-text-label-icon',
                        html: `<div style="position:absolute; left:50%; top:50%; transform: translate(-50%, -50%) rotate(${rotDeg}deg); font-size: 12px; font-weight: 600; color: ${renderColor}; text-shadow: ${textShadow}; white-space: nowrap; padding: 2px 4px;">${element.properties.label}</div>`,
                        iconSize: [0, 0],
                        iconAnchor: [0, 0],
                    });
                    const arcLabelMarker = L.marker([arcLabelLat, arcLabelLng], { icon: arcLabelIcon, interactive: false });

                    // Label on the second ring (if exists)
                    let arc2LabelMarker: L.Marker | null = null;
                    if (element.properties.radius2) {
                        const arc2LabelLat = origin.lat + (element.properties.radius2 * Math.sin(midAngle)) / mPerDegreeLat;
                        const arc2LabelLng = origin.lng + (element.properties.radius2 * Math.cos(midAngle)) / mPerDegreeLng;
                        const arc2LabelIcon = L.divIcon({
                            className: 'diagram-text-label-icon',
                            html: `<div style="position:absolute; left:50%; top:50%; transform: translate(-50%, -50%) rotate(${rotDeg}deg); font-size: 12px; font-weight: 600; color: ${renderColor}; text-shadow: ${textShadow}; white-space: nowrap; padding: 2px 4px;">${element.properties.label}</div>`,
                            iconSize: [0, 0],
                            iconAnchor: [0, 0],
                        });
                        arc2LabelMarker = L.marker([arc2LabelLat, arc2LabelLng], { icon: arc2LabelIcon, interactive: false });
                    }

                    // Label near the center dot (offset slightly)
                    const centerLabelIcon = L.divIcon({
                        className: 'diagram-text-label-icon',
                        html: `<div style="display: inline-block; font-size: 12px; font-weight: 600; color: ${renderColor}; text-shadow: ${textShadow}; white-space: nowrap; padding: 2px 4px;">${element.properties.label}</div>`,
                        iconAnchor: [-8, 4],
                    });
                    const centerLabelMarker = L.marker([origin.lat, origin.lng], { icon: centerLabelIcon, interactive: false });

                    if (layer instanceof L.LayerGroup) {
                        layer.addLayer(arcLabelMarker);
                        if (arc2LabelMarker) layer.addLayer(arc2LabelMarker);
                        layer.addLayer(centerLabelMarker);
                    } else {
                        const lblLayers: L.Layer[] = [layer, arcLabelMarker];
                        if (arc2LabelMarker) lblLayers.push(arc2LabelMarker);
                        lblLayers.push(centerLabelMarker);
                        layer = L.layerGroup(lblLayers);
                    }
                } else {
                    // Line labels are handled in the rendering block (with gap + rotation)
                    if (element.type === 'line') {
                        // Already rendered — skip
                    } else {
                        let labelLat: number;
                        let labelLng: number;

                        if (element.type === 'polygon' && element.coordinates.length >= 3) {
                            labelLat = element.coordinates.reduce((sum, c) => sum + c.lat, 0) / element.coordinates.length;
                            labelLng = element.coordinates.reduce((sum, c) => sum + c.lng, 0) / element.coordinates.length;
                        } else {
                            // Arrow: midpoint of the polyline
                            const midIdx = Math.floor(element.coordinates.length / 2);
                            if (element.coordinates.length % 2 === 0) {
                                const a = element.coordinates[midIdx - 1];
                                const b = element.coordinates[midIdx];
                                labelLat = (a.lat + b.lat) / 2;
                                labelLng = (a.lng + b.lng) / 2;
                            } else {
                                labelLat = element.coordinates[midIdx].lat;
                                labelLng = element.coordinates[midIdx].lng;
                            }
                        }

                        const labelIcon = L.divIcon({
                            className: 'diagram-text-label-icon',
                            html: `<div style="display: inline-block; font-size: 12px; font-weight: 600; color: ${renderColor}; text-shadow: ${textShadow}; white-space: nowrap; padding: 2px 4px;">${element.properties.label}</div>`,
                        });
                        const labelMarker = L.marker([labelLat, labelLng], { icon: labelIcon, interactive: false });

                        if (layer instanceof L.LayerGroup) {
                            layer.addLayer(labelMarker);
                        } else {
                            layer = L.layerGroup([layer, labelMarker]);
                        }
                    }
                }
            }

            if (layer) {
                (layer as any)._diagramElementId = element.id;

                // Click & contextmenu handlers — attach to all interactive layers in group
                const attachHandlers = (target: L.Layer) => {
                    target.on('click', (e: L.LeafletMouseEvent) => {
                        L.DomEvent.stopPropagation(e);
                        setSelectedElementId(element.id);
                        setContextMenu(null);
                    });
                    target.on('contextmenu', (e: L.LeafletMouseEvent) => {
                        L.DomEvent.stopPropagation(e);
                        if (e.originalEvent) {
                            e.originalEvent.preventDefault();
                        }
                        setSelectedElementId(element.id);
                        const containerPoint = map.latLngToContainerPoint(e.latlng);
                        setContextMenu({ elementId: element.id, elementType: element.type, x: containerPoint.x, y: containerPoint.y });
                    });
                };

                if (layer instanceof L.LayerGroup) {
                    layer.getLayers().forEach(l => {
                        if ((l as any).options?.interactive !== false) {
                            attachHandlers(l);
                        }
                    });
                } else {
                    attachHandlers(layer);
                }

                // Enable drag for selected element
                if (isSelected) {
                    layer.addTo(map);
                    if (layer instanceof L.LayerGroup) {
                        const allLayers = layer.getLayers();

                        // Enable drag on all interactive layers in the group
                        const draggableLayers: L.Layer[] = [];
                        allLayers.forEach(l => {
                            if ((l as any).pm && (l as any).options?.interactive !== false) {
                                (l as any).pm.enableLayerDrag();
                                draggableLayers.push(l);
                            }
                        });

                        // Attach drag sync to EACH draggable layer
                        draggableLayers.forEach(srcLayer => {
                            const siblings = allLayers.filter(l => l !== srcLayer);
                            let startDragLatLng: L.LatLng | null = null;
                            let siblingStartPositions: (L.LatLng | L.LatLng[])[] = [];

                            const getLayerPosition = (l: L.Layer): L.LatLng => {
                                if (l instanceof L.Marker) return l.getLatLng();
                                if (l instanceof L.Polygon) return ((l as L.Polygon).getLatLngs()[0] as L.LatLng[])[0];
                                if (l instanceof L.Polyline) return ((l as L.Polyline).getLatLngs() as L.LatLng[])[0];
                                return L.latLng(0, 0);
                            };

                            srcLayer.on('pm:dragstart', () => {
                                startDragLatLng = getLayerPosition(srcLayer);
                                siblingStartPositions = siblings.map(l => {
                                    if (l instanceof L.Marker) return l.getLatLng();
                                    if (l instanceof L.Polyline) return (l.getLatLngs() as L.LatLng[]).map(ll => L.latLng(ll.lat, ll.lng));
                                    return L.latLng(0, 0);
                                });
                            });

                            srcLayer.on('pm:drag', () => {
                                if (!startDragLatLng) return;
                                const current = getLayerPosition(srcLayer);
                                const deltaLat = current.lat - startDragLatLng!.lat;
                                const deltaLng = current.lng - startDragLatLng!.lng;
                                siblings.forEach((l, i) => {
                                    const startPos = siblingStartPositions[i];
                                    if (l instanceof L.Marker && startPos instanceof L.LatLng) {
                                        l.setLatLng([startPos.lat + deltaLat, startPos.lng + deltaLng]);
                                    } else if (l instanceof L.Polyline && Array.isArray(startPos)) {
                                        const newLatLngs = startPos.map(ll => [ll.lat + deltaLat, ll.lng + deltaLng] as [number, number]);
                                        l.setLatLngs(newLatLngs);
                                    }
                                });
                            });

                            srcLayer.on('pm:dragend', () => {
                                if (!startDragLatLng) return;
                                const current = getLayerPosition(srcLayer);
                                const deltaLat = current.lat - startDragLatLng!.lat;
                                const deltaLng = current.lng - startDragLatLng!.lng;

                                if (element.type === 'arc') {
                                    const coordinates = element.coordinates.map(c => ({
                                        lat: c.lat + deltaLat,
                                        lng: c.lng + deltaLng,
                                    }));
                                    const updated = elementsRef.current.map(el =>
                                        el.id === element.id ? { ...el, coordinates } : el
                                    );
                                    onElementsChange(updated);
                                } else {
                                    let coordinates: GeoCoordinate[] = [];
                                    if (srcLayer instanceof L.Polygon) {
                                        const latlngs = (srcLayer as L.Polygon).getLatLngs()[0] as L.LatLng[];
                                        coordinates = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
                                    } else if (srcLayer instanceof L.Polyline) {
                                        const latlngs = (srcLayer as L.Polyline).getLatLngs() as L.LatLng[];
                                        coordinates = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
                                    }
                                    const updated = elementsRef.current.map(el =>
                                        el.id === element.id ? { ...el, coordinates } : el
                                    );
                                    onElementsChange(updated);
                                }
                            });
                        });
                    } else if ((layer as any).pm) {
                        (layer as any).pm.enableLayerDrag();
                        layer.on('pm:dragend', () => {
                            let coordinates: GeoCoordinate[] = [];
                            if (layer instanceof L.Polygon) {
                                const latlngs = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[];
                                coordinates = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
                            } else if (layer instanceof L.Polyline) {
                                const latlngs = (layer as L.Polyline).getLatLngs() as L.LatLng[];
                                coordinates = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
                            } else if (layer instanceof L.Marker) {
                                const latlng = (layer as L.Marker).getLatLng();
                                coordinates = [{ lat: latlng.lat, lng: latlng.lng }];
                            }
                            const updated = elementsRef.current.map(el =>
                                el.id === element.id ? { ...el, coordinates } : el
                            );
                            onElementsChange(updated);
                        });
                    }
                } else {
                    layer.addTo(map);
                }

                layersRef.current.set(element.id, layer);
            }
        });
    }, [map, diagramElements, activePhaseId, selectedElementId, getElementColor, onElementsChange, mapZoom, isDarkMode]);

    // --- Public Actions ---

    const enableDrawPolygon = useCallback(() => {
        if (!map) return;
        map.pm.disableDraw();
        if (activeToolRef.current === 'polygon') {
            activeToolRef.current = null;
            return;
        }
        map.pm.enableDraw('Polygon', { snappable: true });
        activeToolRef.current = 'polygon';
    }, [map]);

    const enableDrawArrow = useCallback(() => {
        if (!map) return;
        map.pm.disableDraw();
        if (activeToolRef.current === 'arrow') {
            activeToolRef.current = null;
            return;
        }
        map.pm.enableDraw('Line', { snappable: true });
        activeToolRef.current = 'arrow';
    }, [map]);

    const enableDrawLine = useCallback(() => {
        if (!map) return;
        map.pm.disableDraw();
        if (activeToolRef.current === 'line') {
            activeToolRef.current = null;
            return;
        }
        map.pm.enableDraw('Line', { snappable: true });
        activeToolRef.current = 'line';
    }, [map]);

    const enableDrawTextLabel = useCallback(() => {
        if (!map) return;
        map.pm.disableDraw();
        if (activeToolRef.current === 'textLabel') {
            activeToolRef.current = null;
            return;
        }
        map.pm.enableDraw('Marker', { snappable: false });
        activeToolRef.current = 'textLabel';
    }, [map]);

    // Helper to clean up arc drawing state
    const cleanupArcDraw = useCallback(() => {
        if (!map) return;
        if (arcPreviewLayerRef.current) {
            map.removeLayer(arcPreviewLayerRef.current);
            arcPreviewLayerRef.current = null;
        }
        if (arcCursorMarkerRef.current) {
            map.removeLayer(arcCursorMarkerRef.current);
            arcCursorMarkerRef.current = null;
        }
        if (arcClickHandlerRef.current) {
            map.off('click', arcClickHandlerRef.current);
            arcClickHandlerRef.current = null;
        }
        if (arcMoveHandlerRef.current) {
            map.off('mousemove', arcMoveHandlerRef.current);
            arcMoveHandlerRef.current = null;
        }
        arcDrawStateRef.current = 'idle';
        arcOriginRef.current = null;
        arcStartAnglePointRef.current = null;
    }, [map]);

    const enableDrawArc = useCallback(() => {
        if (!map) return;
        map.pm.disableDraw();

        // Toggle off
        if (activeToolRef.current === 'arc') {
            cleanupArcDraw();
            activeToolRef.current = null;
            return;
        }

        cleanupArcDraw();
        activeToolRef.current = 'arc';
        arcDrawStateRef.current = 'origin';

        const handleClick = (e: L.LeafletMouseEvent) => {
            const latlng = e.latlng;

            if (arcDrawStateRef.current === 'origin') {
                // First click: set origin
                arcOriginRef.current = latlng;
                arcDrawStateRef.current = 'startAngle';
            } else if (arcDrawStateRef.current === 'startAngle') {
                if (!arcOriginRef.current) return;
                // Second click: set start angle point (also defines radius)
                arcStartAnglePointRef.current = latlng;
                arcDrawStateRef.current = 'endAngle';
            } else if (arcDrawStateRef.current === 'endAngle') {
                if (!arcStartAnglePointRef.current || !arcOriginRef.current) return;
                // Third click: set end angle point → create arc element
                const origin = arcOriginRef.current;
                const startPt = arcStartAnglePointRef.current;
                const endPt = latlng;

                // Compute radius from origin to startPt in meters
                const radius = map.distance(origin, startPt);

                const id = `elem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const currentPhaseId = activePhaseIdRef.current;
                const currentUnitCode = activeUnitCodeRef.current;

                const newElement: DiagramElement = {
                    id,
                    type: 'arc',
                    phaseId: currentPhaseId || undefined,
                    unitCode: currentUnitCode || undefined,
                    coordinates: [
                        { lat: origin.lat, lng: origin.lng },
                        { lat: startPt.lat, lng: startPt.lng },
                        { lat: endPt.lat, lng: endPt.lng },
                    ],
                    properties: { radius, weight: 4 },
                };

                const updated = [...elementsRef.current, newElement];
                onElementsChange(updated);

                if (!currentPhaseId || !currentUnitCode) {
                    onElementCreatedWithoutAssignment?.(newElement);
                }

                // Cleanup
                cleanupArcDraw();
                activeToolRef.current = null;
            }
        };

        const handleMouseMove = (e: L.LeafletMouseEvent) => {
            if (!map) return;
            const cursor = e.latlng;

            // Show/update cursor dot marker
            if (!arcCursorMarkerRef.current) {
                const cursorIcon = L.divIcon({
                    className: 'arc-cursor-marker',
                    html: `<div style="width:12px; height:12px; border-radius:50%; background:#f59e0b; border:2px solid white; box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6],
                });
                arcCursorMarkerRef.current = L.marker(cursor, { icon: cursorIcon, interactive: false, zIndexOffset: 1000 }).addTo(map);
            } else {
                arcCursorMarkerRef.current.setLatLng(cursor);
            }

            const origin = arcOriginRef.current;
            if (!origin) return;

            // Remove old preview
            if (arcPreviewLayerRef.current) {
                map.removeLayer(arcPreviewLayerRef.current);
                arcPreviewLayerRef.current = null;
            }

            const cosLat = Math.cos(origin.lat * Math.PI / 180);
            const mPerDegreeLat = 111320;
            const mPerDegreeLng = 111320 * cosLat;

            if (arcDrawStateRef.current === 'startAngle') {
                // Show radius line from origin to cursor (setting start point)
                arcPreviewLayerRef.current = L.polyline(
                    [[origin.lat, origin.lng], [cursor.lat, cursor.lng]],
                    { color: '#f59e0b', weight: 2, dashArray: '6 4', opacity: 0.6 }
                ).addTo(map);
            } else if (arcDrawStateRef.current === 'endAngle' && arcStartAnglePointRef.current) {
                // Show arc preview from startAngle to cursor
                const startPt = arcStartAnglePointRef.current;
                const radius = map.distance(origin, startPt);
                const startAngle = Math.atan2(
                    (startPt.lat - origin.lat),
                    (startPt.lng - origin.lng) * cosLat
                );
                const endAngle = Math.atan2(
                    (cursor.lat - origin.lat),
                    (cursor.lng - origin.lng) * cosLat
                );
                // Normalize sweep to [-PI, PI] so arc takes shortest path
                let sweep = endAngle - startAngle;
                while (sweep > Math.PI) sweep -= 2 * Math.PI;
                while (sweep < -Math.PI) sweep += 2 * Math.PI;

                const points: [number, number][] = [];
                for (let i = 0; i <= 64; i++) {
                    const angle = startAngle + (i / 64) * sweep;
                    const lat = origin.lat + (radius * Math.sin(angle)) / mPerDegreeLat;
                    const lng = origin.lng + (radius * Math.cos(angle)) / mPerDegreeLng;
                    points.push([lat, lng]);
                }
                arcPreviewLayerRef.current = L.polyline(points, { color: '#f59e0b', weight: 2, dashArray: '6 4', opacity: 0.6 }).addTo(map);
            }
        };

        arcClickHandlerRef.current = handleClick;
        arcMoveHandlerRef.current = handleMouseMove;
        map.on('click', handleClick);
        map.on('mousemove', handleMouseMove);
    }, [map, onElementsChange, onElementCreatedWithoutAssignment, cleanupArcDraw]);

    // Track arc edit handles so we can remove them later
    const arcEditHandlesRef = useRef<L.Layer[]>([]);

    const cleanupArcEditHandles = useCallback(() => {
        if (map) {
            arcEditHandlesRef.current.forEach(h => map.removeLayer(h));
        }
        arcEditHandlesRef.current = [];
    }, [map]);

    const editElement = useCallback((elementId: string) => {
        const element = elementsRef.current.find(el => el.id === elementId);
        if (!element) return;

        // Arc editing: show draggable handle markers at the 3 control points
        if (element.type === 'arc' && element.coordinates.length >= 3 && map) {
            cleanupArcEditHandles();

            const radius = element.properties.radius || 18500;
            const radius2 = element.properties.radius2;

            const makeHandleIcon = () => L.divIcon({
                className: 'diagram-edit-handle',
                html: `<div style="width:12px;height:12px;border-radius:50%;background:#000;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6],
            });

            const originCoord = element.coordinates[0];
            const startCoord = element.coordinates[1];
            const endCoord = element.coordinates[2];

            // Compute start/end positions on the arc at radius distance
            const cosLat = Math.cos(originCoord.lat * Math.PI / 180);
            const mPerDegreeLat = 111320;
            const mPerDegreeLng = 111320 * cosLat;

            const startAngle = Math.atan2(
                (startCoord.lat - originCoord.lat),
                (startCoord.lng - originCoord.lng) * cosLat
            );
            const endAngle = Math.atan2(
                (endCoord.lat - originCoord.lat),
                (endCoord.lng - originCoord.lng) * cosLat
            );

            const startOnArc: [number, number] = [
                originCoord.lat + (radius * Math.sin(startAngle)) / mPerDegreeLat,
                originCoord.lng + (radius * Math.cos(startAngle)) / mPerDegreeLng,
            ];
            const endOnArc: [number, number] = [
                originCoord.lat + (radius * Math.sin(endAngle)) / mPerDegreeLat,
                originCoord.lng + (radius * Math.cos(endAngle)) / mPerDegreeLng,
            ];

            const originHandle = L.marker([originCoord.lat, originCoord.lng], {
                icon: makeHandleIcon(),
                draggable: true,
            });
            const startHandle = L.marker(startOnArc, {
                icon: makeHandleIcon(),
                draggable: true,
            });
            const endHandle = L.marker(endOnArc, {
                icon: makeHandleIcon(),
                draggable: true,
            });

            const handles = [originHandle, startHandle, endHandle];
            handles.forEach(h => h.addTo(map));
            arcEditHandlesRef.current = handles;

            // Constrain start/end handles to radius distance from origin
            const snapToRadius = (handle: L.Marker) => {
                const origin = originHandle.getLatLng();
                const pos = handle.getLatLng();
                const cLat = Math.cos(origin.lat * Math.PI / 180);
                const angle = Math.atan2(
                    (pos.lat - origin.lat),
                    (pos.lng - origin.lng) * cLat
                );
                const mLat = 111320;
                const mLng = 111320 * cLat;
                const snapped = L.latLng(
                    origin.lat + (radius * Math.sin(angle)) / mLat,
                    origin.lng + (radius * Math.cos(angle)) / mLng
                );
                handle.setLatLng(snapped);
            };

            startHandle.on('drag', () => {
                snapToRadius(startHandle);
                updateArcVisual();
            });
            endHandle.on('drag', () => {
                snapToRadius(endHandle);
                updateArcVisual();
            });

            // Live-update the arc polyline(s) from current handle positions
            const updateArcVisual = () => {
                const arcLayer = layersRef.current.get(elementId);
                if (!arcLayer || !(arcLayer instanceof L.LayerGroup)) return;

                const origin = originHandle.getLatLng();
                const startPt = startHandle.getLatLng();
                const endPt = endHandle.getLatLng();

                const cLat = Math.cos(origin.lat * Math.PI / 180);
                const sAngle = Math.atan2(
                    (startPt.lat - origin.lat),
                    (startPt.lng - origin.lng) * cLat
                );
                const eAngle = Math.atan2(
                    (endPt.lat - origin.lat),
                    (endPt.lng - origin.lng) * cLat
                );

                let sweep = eAngle - sAngle;
                while (sweep > Math.PI) sweep -= 2 * Math.PI;
                while (sweep < -Math.PI) sweep += 2 * Math.PI;

                const mLat = 111320;
                const mLng = 111320 * cLat;
                const NUM_POINTS = 64;

                const generatePts = (r: number, fromFrac: number, toFrac: number): [number, number][] => {
                    const pts: [number, number][] = [];
                    const startIdx = Math.round(fromFrac * NUM_POINTS);
                    const endIdx = Math.round(toFrac * NUM_POINTS);
                    for (let i = startIdx; i <= endIdx; i++) {
                        const angle = sAngle + (i / NUM_POINTS) * sweep;
                        pts.push([
                            origin.lat + (r * Math.sin(angle)) / mLat,
                            origin.lng + (r * Math.cos(angle)) / mLng,
                        ]);
                    }
                    return pts;
                };

                const layers = arcLayer.getLayers();
                // layers[0] = originMarker, then polylines (1 or 2 per ring depending on label)
                const originMarker = layers[0] as L.Marker;
                originMarker.setLatLng(origin);

                // Update all polylines in the group
                const polylines = layers.filter(l => l instanceof L.Polyline) as L.Polyline[];
                const el = elementsRef.current.find(e => e.id === elementId);
                const hasLabel = !!el?.properties?.label;
                let gapFraction = 0;
                if (hasLabel && map) {
                    const labelPixelWidth = (el!.properties.label!.length * 8) + 16;
                    const midAngleGap = sAngle + sweep / 2;
                    const dA = 0.05 * Math.abs(sweep);
                    const pA = L.latLng(
                        origin.lat + (radius * Math.sin(midAngleGap - dA)) / mLat,
                        origin.lng + (radius * Math.cos(midAngleGap - dA)) / mLng
                    );
                    const pB = L.latLng(
                        origin.lat + (radius * Math.sin(midAngleGap + dA)) / mLat,
                        origin.lng + (radius * Math.cos(midAngleGap + dA)) / mLng
                    );
                    const pixA = map.latLngToContainerPoint(pA);
                    const pixB = map.latLngToContainerPoint(pB);
                    const pxDist = Math.sqrt((pixB.x - pixA.x) ** 2 + (pixB.y - pixA.y) ** 2);
                    const fracForPxDist = (2 * dA) / Math.abs(sweep);
                    const pxPerFrac = pxDist / fracForPxDist;
                    gapFraction = pxPerFrac > 0 ? Math.min(0.5, (labelPixelWidth * 1.2) / pxPerFrac) : 0.1;
                }

                if (hasLabel) {
                    // With label: polylines are [arc1a, arc1b, (arc2a, arc2b)]
                    if (polylines[0]) polylines[0].setLatLngs(generatePts(radius, 0, 0.5 - gapFraction / 2));
                    if (polylines[1]) polylines[1].setLatLngs(generatePts(radius, 0.5 + gapFraction / 2, 1));
                    if (radius2 && polylines[2]) polylines[2].setLatLngs(generatePts(radius2, 0, 0.5 - gapFraction / 2));
                    if (radius2 && polylines[3]) polylines[3].setLatLngs(generatePts(radius2, 0.5 + gapFraction / 2, 1));

                    // Update label markers (arc midpoint label + center label)
                    const labelMarkers = layers.filter(l => l instanceof L.Marker && l !== originMarker) as L.Marker[];
                    const midAngleLabel = sAngle + sweep / 2;
                    const tangentAngle = sweep > 0 ? midAngleLabel + Math.PI / 2 : midAngleLabel - Math.PI / 2;
                    let rotDeg = -(tangentAngle * 180 / Math.PI);
                    if (rotDeg > 90) rotDeg -= 180;
                    if (rotDeg < -90) rotDeg += 180;

                    // First label marker = arc midpoint label
                    if (labelMarkers[0]) {
                        const arcLabelLat = origin.lat + (radius * Math.sin(midAngleLabel)) / mLat;
                        const arcLabelLng = origin.lng + (radius * Math.cos(midAngleLabel)) / mLng;
                        labelMarkers[0].setLatLng([arcLabelLat, arcLabelLng]);
                        labelMarkers[0].setIcon(L.divIcon({
                            className: 'diagram-text-label-icon',
                            html: `<div style="position:absolute; left:50%; top:50%; transform: translate(-50%, -50%) rotate(${rotDeg}deg); font-size: 12px; font-weight: 600; color: ${el?.unitCode ? getElementColor(el) : '#000000'}; text-shadow: ${isDarkMode ? '0 0 3px rgba(0,0,0,0.8), 0 0 3px rgba(0,0,0,0.8), 0 0 5px rgba(0,0,0,0.8)' : '0 0 3px white, 0 0 3px white, 0 0 5px white'}; white-space: nowrap; padding: 2px 4px;">${el!.properties.label}</div>`,
                            iconSize: [0, 0],
                            iconAnchor: [0, 0],
                        }));
                    }
                    // Second label marker = center dot label
                    if (labelMarkers[1]) {
                        labelMarkers[1].setLatLng(origin);
                    }
                } else {
                    // No label: polylines are [arc1, (arc2)]
                    if (polylines[0]) polylines[0].setLatLngs(generatePts(radius, 0, 1));
                    if (radius2 && polylines[1]) polylines[1].setLatLngs(generatePts(radius2, 0, 1));
                }
            };

            // When origin is dragged, move start/end handles along with it
            let originDragStart: L.LatLng | null = null;
            let startHandleStart: L.LatLng | null = null;
            let endHandleStart: L.LatLng | null = null;

            originHandle.on('dragstart', () => {
                originDragStart = originHandle.getLatLng();
                startHandleStart = startHandle.getLatLng();
                endHandleStart = endHandle.getLatLng();
            });
            originHandle.on('drag', () => {
                if (!originDragStart || !startHandleStart || !endHandleStart) return;
                const current = originHandle.getLatLng();
                const dLat = current.lat - originDragStart.lat;
                const dLng = current.lng - originDragStart.lng;
                startHandle.setLatLng([startHandleStart.lat + dLat, startHandleStart.lng + dLng]);
                endHandle.setLatLng([endHandleStart.lat + dLat, endHandleStart.lng + dLng]);
                updateArcVisual();
            });

            const rebuildArc = () => {
                const newOrigin = originHandle.getLatLng();
                const newStart = startHandle.getLatLng();
                const newEnd = endHandle.getLatLng();

                const coordinates: GeoCoordinate[] = [
                    { lat: newOrigin.lat, lng: newOrigin.lng },
                    { lat: newStart.lat, lng: newStart.lng },
                    { lat: newEnd.lat, lng: newEnd.lng },
                ];

                const updated = elementsRef.current.map(el =>
                    el.id === elementId ? { ...el, coordinates } : el
                );
                onElementsChange(updated);
            };

            originHandle.on('dragend', rebuildArc);
            startHandle.on('dragend', rebuildArc);
            endHandle.on('dragend', rebuildArc);

            // Clicking anywhere outside the handles finishes editing
            const finishEdit = (e: MouseEvent) => {
                if ((e.target as HTMLElement)?.closest?.('.diagram-edit-handle')) return;
                cleanupArcEditHandles();
                document.removeEventListener('mousedown', finishEdit);
            };
            setTimeout(() => document.addEventListener('mousedown', finishEdit), 100);

            setContextMenu(null);
            return;
        }

        // Non-arc elements: use geoman's built-in edit mode
        const layer = layersRef.current.get(elementId);
        if (!layer) return;

        // For line elements with label (split polylines): merge back into one for editing
        let target: L.Layer;
        let mergedPolyline: L.Polyline | null = null;
        if (layer instanceof L.LayerGroup && element.type === 'line' && element.properties.label) {
            const layers = layer.getLayers();
            const polylines = layers.filter(l => l instanceof L.Polyline) as L.Polyline[];
            if (polylines.length >= 2) {
                const latlngs1 = polylines[0].getLatLngs() as L.LatLng[];
                const latlngs2 = polylines[1].getLatLngs() as L.LatLng[];
                // Merge: use original coordinates (skip gap points)
                const allLatLngs = element.coordinates.map(c => L.latLng(c.lat, c.lng));
                mergedPolyline = L.polyline(allLatLngs.map(ll => [ll.lat, ll.lng] as [number, number]), {
                    color: (polylines[0].options as any).color,
                    weight: (polylines[0].options as any).weight,
                });
                layer.removeLayer(polylines[0]);
                layer.removeLayer(polylines[1]);
                layer.addLayer(mergedPolyline);
                target = mergedPolyline;
            } else {
                target = layers[0];
            }
        } else {
            target = layer instanceof L.LayerGroup ? layer.getLayers()[0] : layer;
        }

        if (target && (target as any).pm) {
            (target as any).pm.enable({ allowSelfIntersection: false });

            // For arrows: sync the arrowhead marker with the last vertex during editing
            let arrowheadMarker: L.Marker | null = null;
            let labelMarker: L.Marker | null = null;
            if (layer instanceof L.LayerGroup) {
                const layers = layer.getLayers();
                if (element?.properties?.hasArrowhead) {
                    arrowheadMarker = layers.find(l => l instanceof L.Marker && (l.options as any).interactive === false && !((l as L.Marker).getIcon()?.options as any)?.className?.includes('diagram-text-label-icon')) as L.Marker | null;
                }
                // Find label marker
                labelMarker = layers.find(l => l instanceof L.Marker && ((l as L.Marker).getIcon()?.options as any)?.className?.includes('diagram-text-label-icon')) as L.Marker | null;
            }

            const syncMarkers = () => {
                if (!(target instanceof L.Polyline)) return;
                const latlngs = target.getLatLngs() as L.LatLng[];
                if (latlngs.length < 2) return;

                // Sync arrowhead
                if (arrowheadMarker) {
                    const last = latlngs[latlngs.length - 1];
                    const prev = latlngs[latlngs.length - 2];
                    arrowheadMarker.setLatLng(last);
                    const angle = Math.atan2(last.lat - prev.lat, last.lng - prev.lng) * (180 / Math.PI);
                    const weight = element?.properties?.weight || 4;
                    const arrowSize = Math.round(weight * 5);
                    const color = getElementColor(element!);
                    const renderColor = selectedElementId === elementId ? '#000000' : color;
                    arrowheadMarker.setIcon(L.divIcon({
                        className: 'diagram-arrow-head',
                        html: `<div style="transform: rotate(${-angle + 90}deg); color: ${renderColor}; font-size: ${arrowSize}px; line-height: 1;">▲</div>`,
                        iconSize: [arrowSize, arrowSize],
                        iconAnchor: [arrowSize / 2, arrowSize / 2],
                    }));
                }

                // Sync line label position and rotation
                if (labelMarker && element?.properties?.label && element.type === 'line') {
                    const midIdx = Math.floor(latlngs.length / 2);
                    let mLat: number, mLng: number;
                    let segIdx: number;
                    if (latlngs.length % 2 === 0) {
                        const a = latlngs[midIdx - 1];
                        const b = latlngs[midIdx];
                        mLat = (a.lat + b.lat) / 2;
                        mLng = (a.lng + b.lng) / 2;
                        segIdx = midIdx - 1;
                    } else {
                        mLat = latlngs[midIdx].lat;
                        mLng = latlngs[midIdx].lng;
                        segIdx = midIdx > 0 ? midIdx - 1 : 0;
                    }
                    const sA = latlngs[segIdx];
                    const sB = latlngs[Math.min(segIdx + 1, latlngs.length - 1)];
                    const dirAngle = Math.atan2(sB.lat - sA.lat, sB.lng - sA.lng);
                    let rotDeg = -(dirAngle * 180 / Math.PI);
                    if (rotDeg > 90) rotDeg -= 180;
                    if (rotDeg < -90) rotDeg += 180;

                    labelMarker.setLatLng(L.latLng(mLat, mLng));
                    const color = getElementColor(element!);
                    const renderColor = selectedElementId === elementId ? '#000000' : color;
                    const textShadow = isDarkMode
                        ? '0 0 3px rgba(0,0,0,0.8), 0 0 3px rgba(0,0,0,0.8), 0 0 5px rgba(0,0,0,0.8)'
                        : '0 0 3px white, 0 0 3px white, 0 0 5px white';
                    labelMarker.setIcon(L.divIcon({
                        className: 'diagram-text-label-icon',
                        html: `<div style="position:absolute; left:50%; top:50%; transform: translate(-50%, -50%) rotate(${rotDeg}deg); font-size: 12px; font-weight: 600; color: ${renderColor}; text-shadow: ${textShadow}; white-space: nowrap; padding: 2px 4px;">${element.properties.label}</div>`,
                        iconSize: [0, 0],
                        iconAnchor: [0, 0],
                    }));
                }
            };

            if (arrowheadMarker || labelMarker) {
                target.on('pm:markerdrag', syncMarkers);
                target.on('pm:vertexadded', syncMarkers);
                target.on('pm:vertexremoved', syncMarkers);
            }

            // Finish edit on click outside the element
            const finishNonArcEdit = () => {
                if (arrowheadMarker || labelMarker) {
                    target.off('pm:markerdrag', syncMarkers);
                    target.off('pm:vertexadded', syncMarkers);
                    target.off('pm:vertexremoved', syncMarkers);
                }
                (target as any).pm.disable();
                let coordinates: GeoCoordinate[] = [];
                if (target instanceof L.Polygon) {
                    const latlngs = target.getLatLngs()[0] as L.LatLng[];
                    coordinates = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
                } else if (target instanceof L.Polyline) {
                    const latlngs = target.getLatLngs() as L.LatLng[];
                    coordinates = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }));
                } else if (target instanceof L.Marker) {
                    const latlng = target.getLatLng();
                    coordinates = [{ lat: latlng.lat, lng: latlng.lng }];
                }
                const updated = elementsRef.current.map(el =>
                    el.id === elementId ? { ...el, coordinates } : el
                );
                onElementsChange(updated);
                map!.off('click', onMapClick);
            };
            const onMapClick = (e: L.LeafletMouseEvent) => {
                // Ignore clicks on the element itself (geoman vertex markers etc.)
                const targetEl = e.originalEvent.target as HTMLElement;
                if (targetEl?.closest?.('.leaflet-marker-icon')) return;
                finishNonArcEdit();
            };
            setTimeout(() => map!.on('click', onMapClick), 100);
        }
        setContextMenu(null);
    }, [map, onElementsChange, cleanupArcEditHandles, selectedElementId, getElementColor, isDarkMode]);

    const editElementText = useCallback((elementId: string, newText: string) => {
        const updated = elementsRef.current.map(el =>
            el.id === elementId ? { ...el, properties: { ...el.properties, text: newText } } : el
        );
        onElementsChange(updated);
        setContextMenu(null);
    }, [onElementsChange]);

    const deleteElement = useCallback((elementId: string) => {
        const updated = elementsRef.current.filter(el => el.id !== elementId);
        onElementsChange(updated);
        setSelectedElementId(null);
        setContextMenu(null);
    }, [onElementsChange]);

    const changeElementPhase = useCallback((elementId: string, phaseId: string) => {
        const updated = elementsRef.current.map(el =>
            el.id === elementId ? { ...el, phaseId } : el
        );
        onElementsChange(updated);
        setContextMenu(null);
    }, [onElementsChange]);

    const changeElementUnit = useCallback((elementId: string, unitCode: number) => {
        const updated = elementsRef.current.map(el =>
            el.id === elementId ? { ...el, unitCode } : el
        );
        onElementsChange(updated);
        setContextMenu(null);
    }, [onElementsChange]);

    const changeElementStrokeWidth = useCallback((elementId: string, weight: number) => {
        const updated = elementsRef.current.map(el =>
            el.id === elementId ? { ...el, properties: { ...el.properties, weight } } : el
        );
        onElementsChange(updated);
        setContextMenu(null);
    }, [onElementsChange]);

    const addElementLabel = useCallback((elementId: string, text: string) => {
        const updated = elementsRef.current.map(el => {
            if (el.id !== elementId) return el;
            const props = { ...el.properties };
            if (text) {
                props.label = text;
            } else {
                delete props.label;
            }
            return { ...el, properties: props };
        });
        onElementsChange(updated);
        setContextMenu(null);
    }, [onElementsChange]);

    // Arc-specific actions
    const changeArcDistance = useCallback((elementId: string, radiusKm: number) => {
        const updated = elementsRef.current.map(el =>
            el.id === elementId ? { ...el, properties: { ...el.properties, radius: radiusKm * 1000 } } : el
        );
        onElementsChange(updated);
        setContextMenu(null);
    }, [onElementsChange]);

    const changeArcSecondRing = useCallback((elementId: string, radiusKm: number) => {
        const updated = elementsRef.current.map(el =>
            el.id === elementId ? { ...el, properties: { ...el.properties, radius2: radiusKm * 1000 } } : el
        );
        onElementsChange(updated);
        setContextMenu(null);
    }, [onElementsChange]);

    const addArcSecondRing = useCallback((elementId: string, radiusMeters: number) => {
        const updated = elementsRef.current.map(el =>
            el.id === elementId ? { ...el, properties: { ...el.properties, radius2: radiusMeters } } : el
        );
        onElementsChange(updated);
        setContextMenu(null);
    }, [onElementsChange]);

    const removeArcSecondRing = useCallback((elementId: string) => {
        const updated = elementsRef.current.map(el => {
            if (el.id !== elementId) return el;
            const props = { ...el.properties };
            delete props.radius2;
            return { ...el, properties: props };
        });
        onElementsChange(updated);
        setContextMenu(null);
    }, [onElementsChange]);

    return {
        enableDrawPolygon,
        enableDrawArrow,
        enableDrawLine,
        enableDrawTextLabel,
        enableDrawArc,
        activeTool: activeToolRef.current,
        selectedElementId,
        setSelectedElementId,
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
    };
}
