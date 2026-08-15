import { GeoCoordinate, EnemyEntityType, MockEnemyEntity, MockTarget } from '../../common/utilities/types';
import { mockEnemyEntities, mockEnemyEntitiesAnchor, mockTargets } from '../../common/utilities/mockData';

// Types for analysis results
export interface ElevationGridCell {
    lat: number;
    lng: number;
    elevation: number; // meters
}

export type AxisSegmentKind = 'ridgeCrossing' | 'sharpTurn' | 'urbanEntry' | 'terrainChange';

export interface AxisSubSegment {
    coordinates: GeoCoordinate[];
    kind: AxisSegmentKind;
    label: string;
}

export interface AxisSegment {
    coordinates: GeoCoordinate[];
    importance: 'critical' | 'high' | 'medium' | 'low';
    label: string;
    description: string;
    segments: AxisSubSegment[];
}

export interface ThreatZone {
    coordinates: GeoCoordinate[];
    threatLevel: number; // 0-1
    sourceId: string;
    weaponType: string;
}

export interface LoSZone {
    coordinates: GeoCoordinate[];
    exposure: 'safe' | 'partial' | 'exposed' | 'critical';
}

export interface TargetThreat {
    targetId: string;
    name: Record<string, string>;
    position: GeoCoordinate;
    threatLevel: number; // 0-100
    coveredBy: { entityId: string; name: Record<string, string>; position: GeoCoordinate }[];
}

export type RouteKind = 'fast' | 'secured' | 'rightFlank' | 'leftFlank';

export interface RouteRiskSegment {
    coordinates: GeoCoordinate[];
    severity: 'medium' | 'high';
}

export interface RouteOption {
    id: RouteKind;
    coordinates: GeoCoordinate[];
    score: number; // 0-100
    safetyRating: number; // 0-100
    speedRating: number; // 0-100
    concealmentRating: number; // 0-100
    label: string;
    riskSegments: RouteRiskSegment[];
}

export interface ObservationPosition {
    position: GeoCoordinate;
    fieldOfView: { startAngle: number; endAngle: number; range: number };
    score: number; // 0-100
    label: string;
}

export interface DominanceArea {
    coordinates: GeoCoordinate[];
    dominanceScore: number; // 0-100
    label: string;
}

export interface DominatedArea {
    coordinates: GeoCoordinate[];
    exposure: 'observation' | 'fire';
    observedFrom: string; // label key of dominating feature
}

export type ForceSize = 'company' | 'battalion' | 'brigade';

export interface DeploymentArea {
    coordinates: GeoCoordinate[];
    label: string;
    suitability: number; // 0-100
    capacity: string; // i18n key for capacity description
}

export interface PrioritizedTarget {
    id: string;
    position: GeoCoordinate;
    name: Record<string, string>;
    type: EnemyEntityType;
    priority: number; // 1..n
    score: number; // 0-100
    recommendedAsset: string; // i18n key
}

// Results per tool
export interface ElevationHeatMapResult {
    grid: ElevationGridCell[];
    minElevation: number;
    maxElevation: number;
}

export interface MobilityAxesResult {
    axes: AxisSegment[];
}

export interface CoverageMapResult {
    zones: ThreatZone[];
}

export interface LosThreatResult {
    zones: LoSZone[];
    targetThreats: TargetThreat[];
}

export interface RouteAnalysisResult {
    routes: RouteOption[];
}

export interface ObservationPositionsResult {
    positions: ObservationPosition[];
}

export interface DominatingAreasResult {
    areas: DominanceArea[];
}

export interface DominatedAreasResult {
    areas: DominatedArea[];
}

export interface DeploymentAreasResult {
    areas: DeploymentArea[];
    forceSize: ForceSize;
}

export interface TargetPriorityResult {
    targets: PrioritizedTarget[];
    fireAssetPosition: GeoCoordinate;
}

// Seeded random for reproducible but varied results based on map center
function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };
}

function makeRand(center: GeoCoordinate, salt: number, seedOffset: number): () => number {
    return seededRandom(Math.round(center.lat * salt + center.lng * (salt / 2)) + seedOffset * 7919);
}

function generatePolygon(center: GeoCoordinate, radiusLat: number, radiusLng: number, points: number, rand: () => number): GeoCoordinate[] {
    const coords: GeoCoordinate[] = [];
    for (let i = 0; i < points; i++) {
        const angle = (2 * Math.PI * i) / points + (rand() - 0.5) * 0.4;
        const r = 0.7 + rand() * 0.3;
        coords.push({
            lat: center.lat + Math.sin(angle) * radiusLat * r,
            lng: center.lng + Math.cos(angle) * radiusLng * r,
        });
    }
    return coords;
}

export interface MapBounds {
    south: number;
    north: number;
    west: number;
    east: number;
}

// Re-anchor static mock entities to the current map view when it is far from the mock AO,
// preserving their relative layout so the demo works anywhere on the map.
export function getAnchoredEnemyEntities(center: GeoCoordinate): MockEnemyEntity[] {
    const dLat = center.lat - mockEnemyEntitiesAnchor.lat;
    const dLng = center.lng - mockEnemyEntitiesAnchor.lng;
    if (Math.abs(dLat) < 0.15 && Math.abs(dLng) < 0.15) return mockEnemyEntities;
    return mockEnemyEntities.map(e => ({
        ...e,
        position: { lat: e.position.lat + dLat, lng: e.position.lng + dLng },
    }));
}

export function getAnchoredTargets(center: GeoCoordinate): MockTarget[] {
    const dLat = center.lat - mockEnemyEntitiesAnchor.lat;
    const dLng = center.lng - mockEnemyEntitiesAnchor.lng;
    if (Math.abs(dLat) < 0.15 && Math.abs(dLng) < 0.15) return mockTargets;
    return mockTargets.map(tgt => ({
        ...tgt,
        position: { lat: tgt.position.lat + dLat, lng: tgt.position.lng + dLng },
    }));
}

export function analyzeElevationHeatMap(
    bounds: MapBounds,
    seedOffset = 0
): ElevationHeatMapResult {
    const center = { lat: (bounds.south + bounds.north) / 2, lng: (bounds.west + bounds.east) / 2 };
    const rand = makeRand(center, 1000, seedOffset);
    const gridSize = 64;
    const grid: ElevationGridCell[] = [];

    const latSpread = bounds.north - bounds.south;
    const lngSpread = bounds.east - bounds.west;

    const baseElevation = 400 + rand() * 200;
    let minElevation = Infinity;
    let maxElevation = -Infinity;

    // Multi-octave noise for realistic terrain
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const lat = bounds.south + (row / (gridSize - 1)) * latSpread;
            const lng = bounds.west + (col / (gridSize - 1)) * lngSpread;

            const nx = col / gridSize;
            const ny = row / gridSize;

            // Large-scale features: ridgeline + valley
            const ridgeEffect = Math.sin(nx * Math.PI) * 220;
            const valleyEffect = Math.cos(ny * Math.PI * 2) * 90;

            // Medium-scale undulation
            const mid1 = Math.sin(nx * 4.3 + ny * 2.7) * 55;
            const mid2 = Math.cos(ny * 3.8 - nx * 1.9) * 40;

            // Fine-grain noise
            const fine = (rand() - 0.5) * 30;

            const elevation = baseElevation + ridgeEffect + valleyEffect + mid1 + mid2 + fine;

            minElevation = Math.min(minElevation, elevation);
            maxElevation = Math.max(maxElevation, elevation);
            grid.push({ lat, lng, elevation });
        }
    }

    return { grid, minElevation, maxElevation };
}

// Split an axis polyline into logical sub-segments (ridge crossing, sharp turns, urban entry, terrain change)
function segmentAxis(coordinates: GeoCoordinate[], rand: () => number): AxisSubSegment[] {
    const kinds: AxisSegmentKind[] = ['terrainChange', 'ridgeCrossing', 'sharpTurn', 'urbanEntry'];
    const kindLabels: Record<AxisSegmentKind, string> = {
        ridgeCrossing: 'diagram.analysis.labels.seg_ridge_crossing',
        sharpTurn: 'diagram.analysis.labels.seg_sharp_turn',
        urbanEntry: 'diagram.analysis.labels.seg_urban_entry',
        terrainChange: 'diagram.analysis.labels.seg_terrain_change',
    };
    const segments: AxisSubSegment[] = [];
    const segCount = Math.min(coordinates.length - 1, 2 + Math.floor(rand() * 2)); // 2-3 segments
    const pointsPerSeg = (coordinates.length - 1) / segCount;
    let kindIdx = Math.floor(rand() * kinds.length);
    for (let i = 0; i < segCount; i++) {
        const startIdx = Math.round(i * pointsPerSeg);
        const endIdx = Math.round((i + 1) * pointsPerSeg);
        const kind = kinds[kindIdx % kinds.length];
        kindIdx += 1 + Math.floor(rand() * 2);
        segments.push({
            coordinates: coordinates.slice(startIdx, endIdx + 1),
            kind,
            label: kindLabels[kind],
        });
    }
    return segments;
}

export function analyzeMobilityAxes(
    center: GeoCoordinate,
    seedOffset = 0
): MobilityAxesResult {
    const rand = makeRand(center, 2000, seedOffset);
    const spread = 0.035;

    const axesBase: Omit<AxisSegment, 'segments'>[] = [
        {
            coordinates: [
                { lat: center.lat - spread, lng: center.lng - spread * 0.3 },
                { lat: center.lat - spread * 0.5, lng: center.lng - spread * 0.1 + rand() * 0.005 },
                { lat: center.lat, lng: center.lng + rand() * 0.003 },
                { lat: center.lat + spread * 0.6, lng: center.lng + spread * 0.2 },
                { lat: center.lat + spread, lng: center.lng + spread * 0.4 },
            ],
            importance: 'critical',
            label: 'diagram.analysis.labels.main_axis_alpha',
            description: 'diagram.analysis.labels.main_axis_alpha_desc',
        },
        {
            coordinates: [
                { lat: center.lat - spread * 0.8, lng: center.lng + spread * 0.5 },
                { lat: center.lat - spread * 0.3, lng: center.lng + spread * 0.6 + rand() * 0.003 },
                { lat: center.lat + spread * 0.2, lng: center.lng + spread * 0.7 },
                { lat: center.lat + spread * 0.7, lng: center.lng + spread * 0.6 },
            ],
            importance: 'high',
            label: 'diagram.analysis.labels.flanking_route_bravo',
            description: 'diagram.analysis.labels.flanking_route_bravo_desc',
        },
        {
            coordinates: [
                { lat: center.lat - spread * 0.6, lng: center.lng - spread * 0.7 },
                { lat: center.lat - spread * 0.2, lng: center.lng - spread * 0.8 + rand() * 0.003 },
                { lat: center.lat + spread * 0.3, lng: center.lng - spread * 0.6 },
                { lat: center.lat + spread * 0.8, lng: center.lng - spread * 0.5 },
            ],
            importance: 'medium',
            label: 'diagram.analysis.labels.supply_route_charlie',
            description: 'diagram.analysis.labels.supply_route_charlie_desc',
        },
        {
            coordinates: [
                { lat: center.lat + spread * 0.2, lng: center.lng - spread * 0.3 },
                { lat: center.lat + spread * 0.4, lng: center.lng + rand() * 0.005 },
                { lat: center.lat + spread * 0.5, lng: center.lng + spread * 0.3 },
            ],
            importance: 'low',
            label: 'diagram.analysis.labels.dismounted_path_delta',
            description: 'diagram.analysis.labels.dismounted_path_delta_desc',
        },
    ];

    const axes: AxisSegment[] = axesBase.map(axis => ({
        ...axis,
        segments: segmentAxis(axis.coordinates, rand),
    }));

    return { axes };
}

export function analyzeEnemyCoverage(
    center: GeoCoordinate,
    options: { enabledTypes: EnemyEntityType[] },
    seedOffset = 0
): CoverageMapResult {
    const rand = makeRand(center, 1500, seedOffset);
    const zones: ThreatZone[] = [];

    const entities = getAnchoredEnemyEntities(center)
        .filter(e => options.enabledTypes.includes(e.type));

    entities.forEach(entity => {
        const innerRadius = entity.rangeMeters * 0.4 / 111320;
        zones.push({
            coordinates: generatePolygon(entity.position, innerRadius, innerRadius / Math.cos(entity.position.lat * Math.PI / 180), 7, rand),
            threatLevel: 0.85 + rand() * 0.15,
            sourceId: entity.id,
            weaponType: entity.type,
        });

        const outerRadius = entity.rangeMeters * 0.8 / 111320;
        zones.push({
            coordinates: generatePolygon(entity.position, outerRadius, outerRadius / Math.cos(entity.position.lat * Math.PI / 180), 8, rand),
            threatLevel: 0.4 + rand() * 0.2,
            sourceId: entity.id,
            weaponType: entity.type,
        });
    });

    return { zones };
}

export function analyzeLosThreat(
    center: GeoCoordinate,
    targets: MockTarget[],
    seedOffset = 0
): LosThreatResult {
    const rand = makeRand(center, 3000, seedOffset);
    const spread = 0.03;
    const zones: LoSZone[] = [];

    const exposures: Array<'safe' | 'partial' | 'exposed' | 'critical'> = ['safe', 'partial', 'exposed', 'critical'];

    for (let i = 0; i < 10; i++) {
        const offsetLat = (rand() - 0.5) * spread * 2;
        const offsetLng = (rand() - 0.5) * spread * 2;
        const zoneCenter = { lat: center.lat + offsetLat, lng: center.lng + offsetLng };
        const radius = 0.003 + rand() * 0.005;

        const normalizedLat = (offsetLat + spread) / (2 * spread);
        let exposureIdx: number;
        if (normalizedLat > 0.75) exposureIdx = 3;
        else if (normalizedLat > 0.5) exposureIdx = 2;
        else if (normalizedLat > 0.25) exposureIdx = 1;
        else exposureIdx = 0;

        exposureIdx = Math.max(0, Math.min(3, exposureIdx + (rand() > 0.7 ? 1 : 0) - (rand() > 0.7 ? 1 : 0)));

        zones.push({
            coordinates: generatePolygon(zoneCenter, radius, radius / Math.cos(zoneCenter.lat * Math.PI / 180), 6, rand),
            exposure: exposures[exposureIdx],
        });
    }

    // Per-target threat level from the enemy entities that cover it
    const entities = getAnchoredEnemyEntities(center);
    const targetThreats: TargetThreat[] = targets.map(target => {
        const coveredBy = entities
            .filter(e => {
                const dLat = (e.position.lat - target.position.lat) * 111320;
                const dLng = (e.position.lng - target.position.lng) * 111320 * Math.cos(target.position.lat * Math.PI / 180);
                const dist = Math.sqrt(dLat * dLat + dLng * dLng);
                return dist < e.rangeMeters * (0.8 + rand() * 0.4);
            })
            .map(e => ({ entityId: e.id, name: e.name, position: e.position }));
        const threatLevel = Math.min(100, Math.round(coveredBy.length * (25 + rand() * 15) + rand() * 10));
        return {
            targetId: target.id,
            name: target.name,
            position: target.position,
            threatLevel,
            coveredBy,
        };
    });

    return { zones, targetThreats };
}

// Mark 1-2 stretches of a route as risk segments
function buildRiskSegments(coordinates: GeoCoordinate[], rand: () => number): RouteRiskSegment[] {
    const segments: RouteRiskSegment[] = [];
    const count = 1 + (rand() > 0.5 ? 1 : 0);
    for (let i = 0; i < count; i++) {
        const startIdx = Math.floor(rand() * (coordinates.length - 2));
        segments.push({
            coordinates: coordinates.slice(startIdx, startIdx + 2 + Math.floor(rand() * 2)),
            severity: rand() > 0.5 ? 'high' : 'medium',
        });
    }
    return segments;
}

export function analyzeRoutes(
    center: GeoCoordinate,
    seedOffset = 0
): RouteAnalysisResult {
    const rand = makeRand(center, 4000, seedOffset);
    const spread = 0.035;

    const routesBase: Omit<RouteOption, 'riskSegments'>[] = [
        {
            id: 'fast',
            coordinates: [
                { lat: center.lat - spread, lng: center.lng - 0.005 },
                { lat: center.lat - spread * 0.6, lng: center.lng - 0.003 + rand() * 0.002 },
                { lat: center.lat - spread * 0.2, lng: center.lng + 0.001 },
                { lat: center.lat + spread * 0.2, lng: center.lng - 0.002 },
                { lat: center.lat + spread * 0.6, lng: center.lng + 0.003 },
                { lat: center.lat + spread, lng: center.lng + 0.005 },
            ],
            score: 82,
            safetyRating: 70,
            speedRating: 95,
            concealmentRating: 60,
            label: 'diagram.analysis.labels.route_fast',
        },
        {
            id: 'secured',
            coordinates: [
                { lat: center.lat - spread, lng: center.lng + spread * 0.15 },
                { lat: center.lat - spread * 0.5, lng: center.lng + spread * 0.3 + rand() * 0.003 },
                { lat: center.lat - spread * 0.1, lng: center.lng + spread * 0.35 },
                { lat: center.lat + spread * 0.3, lng: center.lng + spread * 0.25 },
                { lat: center.lat + spread * 0.7, lng: center.lng + spread * 0.15 },
                { lat: center.lat + spread, lng: center.lng + spread * 0.1 },
            ],
            score: 88,
            safetyRating: 95,
            speedRating: 60,
            concealmentRating: 85,
            label: 'diagram.analysis.labels.route_secured',
        },
        {
            id: 'rightFlank',
            coordinates: [
                { lat: center.lat - spread, lng: center.lng + spread * 0.5 },
                { lat: center.lat - spread * 0.4, lng: center.lng + spread * 0.75 + rand() * 0.003 },
                { lat: center.lat + spread * 0.1, lng: center.lng + spread * 0.85 },
                { lat: center.lat + spread * 0.5, lng: center.lng + spread * 0.65 },
                { lat: center.lat + spread * 0.85, lng: center.lng + spread * 0.4 },
                { lat: center.lat + spread, lng: center.lng + spread * 0.25 },
            ],
            score: 74,
            safetyRating: 80,
            speedRating: 55,
            concealmentRating: 90,
            label: 'diagram.analysis.labels.route_right_flank',
        },
        {
            id: 'leftFlank',
            coordinates: [
                { lat: center.lat - spread, lng: center.lng - spread * 0.5 },
                { lat: center.lat - spread * 0.6, lng: center.lng - spread * 0.7 + rand() * 0.003 },
                { lat: center.lat - spread * 0.1, lng: center.lng - spread * 0.6 },
                { lat: center.lat + spread * 0.3, lng: center.lng - spread * 0.4 },
                { lat: center.lat + spread * 0.7, lng: center.lng - spread * 0.2 },
                { lat: center.lat + spread, lng: center.lng - spread * 0.1 },
            ],
            score: 68,
            safetyRating: 65,
            speedRating: 70,
            concealmentRating: 80,
            label: 'diagram.analysis.labels.route_left_flank',
        },
    ];

    const routes: RouteOption[] = routesBase.map(route => ({
        ...route,
        riskSegments: buildRiskSegments(route.coordinates, rand),
    }));

    return { routes };
}

export function analyzeObservationPositions(
    center: GeoCoordinate,
    seedOffset = 0
): ObservationPositionsResult {
    const rand = makeRand(center, 5000, seedOffset);
    const spread = 0.025;

    const positions: ObservationPosition[] = [
        {
            position: { lat: center.lat + spread * 0.3, lng: center.lng - spread * 0.4 },
            fieldOfView: { startAngle: 10, endAngle: 80, range: 3500 },
            score: 92,
            label: 'diagram.analysis.labels.op_alpha',
        },
        {
            position: { lat: center.lat + spread * 0.1, lng: center.lng + spread * 0.5 },
            fieldOfView: { startAngle: 320, endAngle: 50, range: 4200 },
            score: 85,
            label: 'diagram.analysis.labels.op_bravo',
        },
        {
            position: { lat: center.lat - spread * 0.2, lng: center.lng - spread * 0.6 },
            fieldOfView: { startAngle: 30, endAngle: 120, range: 2800 },
            score: 78,
            label: 'diagram.analysis.labels.op_charlie',
        },
        {
            position: { lat: center.lat + spread * 0.6, lng: center.lng + spread * 0.1 + rand() * 0.003 },
            fieldOfView: { startAngle: 280, endAngle: 20, range: 5000 },
            score: 71,
            label: 'diagram.analysis.labels.op_delta',
        },
    ];

    return { positions };
}

export function analyzeDominatingAreas(
    center: GeoCoordinate,
    seedOffset = 0
): DominatingAreasResult {
    const rand = makeRand(center, 6000, seedOffset);
    const spread = 0.03;

    const labels = [
        'diagram.analysis.labels.dom_area_1',
        'diagram.analysis.labels.dom_area_2',
        'diagram.analysis.labels.dom_area_3',
        'diagram.analysis.labels.dom_area_4',
    ];

    // High-ground bias: areas concentrate on the northern/elevated side of the view
    const areas: DominanceArea[] = labels.slice(0, 3 + Math.floor(rand() * 2)).map((label, i) => {
        const areaCenter = {
            lat: center.lat + spread * (0.3 + rand() * 0.6),
            lng: center.lng + spread * (i - 1.2) * 0.7 + (rand() - 0.5) * spread * 0.4,
        };
        const radius = 0.004 + rand() * 0.005;
        return {
            coordinates: generatePolygon(areaCenter, radius, radius / Math.cos(areaCenter.lat * Math.PI / 180), 7, rand),
            dominanceScore: Math.round(65 + rand() * 35),
            label,
        };
    });

    return { areas };
}

export function analyzeDominatedAreas(
    center: GeoCoordinate,
    seedOffset = 0
): DominatedAreasResult {
    const rand = makeRand(center, 6500, seedOffset);
    const spread = 0.03;

    const observedFromLabels = [
        'diagram.analysis.labels.dom_area_1',
        'diagram.analysis.labels.dom_area_2',
        'diagram.analysis.labels.dom_area_3',
    ];

    // Mirror of dominating areas: dominated terrain sits in the lower ground south of the ridge
    const areas: DominatedArea[] = [];
    const count = 3 + Math.floor(rand() * 2);
    for (let i = 0; i < count; i++) {
        const areaCenter = {
            lat: center.lat - spread * (0.2 + rand() * 0.7),
            lng: center.lng + spread * (i - count / 2) * 0.8 + (rand() - 0.5) * spread * 0.4,
        };
        const radius = 0.004 + rand() * 0.006;
        areas.push({
            coordinates: generatePolygon(areaCenter, radius, radius / Math.cos(areaCenter.lat * Math.PI / 180), 7, rand),
            exposure: rand() > 0.45 ? 'fire' : 'observation',
            observedFrom: observedFromLabels[i % observedFromLabels.length],
        });
    }

    return { areas };
}

export function analyzeDeploymentAreas(
    center: GeoCoordinate,
    options: { forceSize: ForceSize },
    seedOffset = 0
): DeploymentAreasResult {
    const rand = makeRand(center, 7000, seedOffset);
    const spread = 0.035;

    const sizeFactor: Record<ForceSize, number> = { company: 0.5, battalion: 1, brigade: 1.8 };
    const factor = sizeFactor[options.forceSize];

    const labels = [
        'diagram.analysis.labels.deploy_area_1',
        'diagram.analysis.labels.deploy_area_2',
        'diagram.analysis.labels.deploy_area_3',
        'diagram.analysis.labels.deploy_area_4',
    ];

    // Deployment areas favor the rear (southern) part of the sector, away from the threat axis
    const count = options.forceSize === 'brigade' ? 3 : 4;
    const areas: DeploymentArea[] = labels.slice(0, count).map((label, i) => {
        const areaCenter = {
            lat: center.lat - spread * (0.3 + rand() * 0.6),
            lng: center.lng + spread * (i - (count - 1) / 2) * 0.85 + (rand() - 0.5) * spread * 0.3,
        };
        const radius = (0.0025 + rand() * 0.002) * factor;
        return {
            coordinates: generatePolygon(areaCenter, radius, radius / Math.cos(areaCenter.lat * Math.PI / 180), 8, rand),
            label,
            suitability: Math.round(60 + rand() * 40),
            capacity: `diagram.aiTools.force_sizes.${options.forceSize}`,
        };
    });

    areas.sort((a, b) => b.suitability - a.suitability);
    return { areas, forceSize: options.forceSize };
}

export function analyzeTargetPriority(
    center: GeoCoordinate,
    seedOffset = 0
): TargetPriorityResult {
    const rand = makeRand(center, 8000, seedOffset);
    const entities = getAnchoredEnemyEntities(center);

    const assetByType: Record<EnemyEntityType, string> = {
        atgm: 'diagram.analysis.labels.asset_mortar',
        artillery: 'diagram.analysis.labels.asset_air',
        tank: 'diagram.analysis.labels.asset_atgm',
        aa: 'diagram.analysis.labels.asset_air',
        smallArms: 'diagram.analysis.labels.asset_direct_fire',
    };

    const typeWeight: Record<EnemyEntityType, number> = {
        artillery: 90,
        atgm: 80,
        aa: 75,
        tank: 65,
        smallArms: 40,
    };

    const scored = entities.map(e => ({
        entity: e,
        score: Math.min(100, Math.round(typeWeight[e.type] + rand() * 15)),
    }));
    scored.sort((a, b) => b.score - a.score);

    const targets: PrioritizedTarget[] = scored.map((s, i) => ({
        id: s.entity.id,
        position: s.entity.position,
        name: s.entity.name,
        type: s.entity.type,
        priority: i + 1,
        score: s.score,
        recommendedAsset: assetByType[s.entity.type],
    }));

    // Mock friendly fire-support asset position south-west of the sector
    const fireAssetPosition = {
        lat: center.lat - 0.04 - rand() * 0.01,
        lng: center.lng - 0.03 - rand() * 0.01,
    };

    return { targets, fireAssetPosition };
}
