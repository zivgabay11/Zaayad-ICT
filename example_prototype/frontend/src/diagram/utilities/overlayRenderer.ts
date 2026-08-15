import L from 'leaflet';
import {
    ElevationHeatMapResult,
    MobilityAxesResult,
    CoverageMapResult,
    LosThreatResult,
    RouteAnalysisResult,
    RouteKind,
    ObservationPositionsResult,
    DominatingAreasResult,
    DominatedAreasResult,
    DeploymentAreasResult,
    TargetPriorityResult,
} from '../services/analysisAgent';
import { AnalysisLegendData } from '../../common/context/AnalysisContext';

type TFunction = (key: string) => string;

// Color interpolation utility
function interpolateColor(value: number, stops: { pos: number; color: [number, number, number] }[]): string {
    if (value <= stops[0].pos) return `rgb(${stops[0].color.join(',')})`;
    if (value >= stops[stops.length - 1].pos) return `rgb(${stops[stops.length - 1].color.join(',')})`;

    for (let i = 0; i < stops.length - 1; i++) {
        if (value >= stops[i].pos && value <= stops[i + 1].pos) {
            const t = (value - stops[i].pos) / (stops[i + 1].pos - stops[i].pos);
            const r = Math.round(stops[i].color[0] + t * (stops[i + 1].color[0] - stops[i].color[0]));
            const g = Math.round(stops[i].color[1] + t * (stops[i + 1].color[1] - stops[i].color[1]));
            const b = Math.round(stops[i].color[2] + t * (stops[i + 1].color[2] - stops[i].color[2]));
            return `rgb(${r},${g},${b})`;
        }
    }
    return `rgb(${stops[stops.length - 1].color.join(',')})`;
}

const elevationStops: { pos: number; color: [number, number, number] }[] = [
    { pos: 0, color: [34, 139, 34] },     // Green (low)
    { pos: 0.25, color: [144, 238, 144] }, // Light green
    { pos: 0.5, color: [255, 255, 0] },    // Yellow (mid)
    { pos: 0.75, color: [255, 165, 0] },   // Orange
    { pos: 1, color: [220, 20, 20] },      // Red (high)
];

const threatStops: { pos: number; color: [number, number, number] }[] = [
    { pos: 0, color: [255, 255, 200] },    // Light yellow (low threat)
    { pos: 0.33, color: [255, 200, 100] }, // Orange-yellow
    { pos: 0.66, color: [255, 100, 50] },  // Orange-red
    { pos: 1, color: [180, 0, 0] },        // Dark red (high threat)
];

const importanceColors: Record<string, string> = {
    critical: '#dc2626',
    high: '#f97316',
    medium: '#eab308',
    low: '#6b7280',
};

const exposureColors: Record<string, string> = {
    safe: '#22c55e',
    partial: '#eab308',
    exposed: '#f97316',
    critical: '#dc2626',
};

export const routeKindColors: Record<RouteKind, string> = {
    fast: '#22c55e',
    secured: '#f59e0b',
    rightFlank: '#06b6d4',
    leftFlank: '#a855f7',
};

const riskSeverityColors: Record<string, string> = {
    medium: '#f97316',
    high: '#dc2626',
};

function areaLabelTooltip(text: string): L.Tooltip {
    return L.tooltip({
        permanent: true,
        direction: 'center',
        className: 'analysis-area-label',
    }).setContent(text);
}

export function renderElevationHeatMap(result: ElevationHeatMapResult, t: TFunction): { layers: L.Layer[]; legend: AnalysisLegendData } {
    const layers: L.Layer[] = [];
    const { grid, minElevation, maxElevation } = result;
    const range = maxElevation - minElevation || 1;

    // Compute cell size from grid
    const lats = [...new Set(grid.map(p => p.lat))].sort((a, b) => a - b);
    const lngs = [...new Set(grid.map(p => p.lng))].sort((a, b) => a - b);
    const latStep = lats.length > 1 ? (lats[lats.length - 1] - lats[0]) / (lats.length - 1) : 0.005;
    const lngStep = lngs.length > 1 ? (lngs[lngs.length - 1] - lngs[0]) / (lngs.length - 1) : 0.005;

    grid.forEach(cell => {
        const normalized = (cell.elevation - minElevation) / range;
        const color = interpolateColor(normalized, elevationStops);
        const bounds: L.LatLngBoundsExpression = [
            [cell.lat - latStep / 2, cell.lng - lngStep / 2],
            [cell.lat + latStep / 2, cell.lng + lngStep / 2],
        ];
        const rect = L.rectangle(bounds, {
            color: 'transparent',
            fillColor: color,
            fillOpacity: 0.45,
            weight: 0,
        });
        rect.bindTooltip(`${Math.round(cell.elevation)}m`);
        layers.push(rect);
    });

    const legend: AnalysisLegendData = {
        title: t('diagram.analysis.legend.elevation'),
        type: 'gradient',
        items: [
            { color: 'rgb(34,139,34)', label: `${Math.round(minElevation)}m` },
            { color: 'rgb(255,255,0)', label: `${Math.round((minElevation + maxElevation) / 2)}m` },
            { color: 'rgb(220,20,20)', label: `${Math.round(maxElevation)}m` },
        ],
    };

    return { layers, legend };
}

export function renderMobilityAxes(result: MobilityAxesResult, t: TFunction): { layers: L.Layer[]; legend: AnalysisLegendData } {
    const layers: L.Layer[] = [];

    result.axes.forEach(axis => {
        const latlngs = axis.coordinates.map(c => [c.lat, c.lng] as [number, number]);
        const color = importanceColors[axis.importance] || '#6b7280';
        const weight = axis.importance === 'critical' ? 6 : axis.importance === 'high' ? 5 : 4;

        const polyline = L.polyline(latlngs, {
            color,
            weight,
            opacity: 0.8,
            dashArray: axis.importance === 'low' ? '8 4' : undefined,
        });
        polyline.bindTooltip(`${t(axis.label)}<br/><em>${t(axis.description)}</em>`, { sticky: true });
        layers.push(polyline);

        // Logical sub-segments: joint markers + per-segment tooltip overlay
        axis.segments.forEach((segment, idx) => {
            const segLatlngs = segment.coordinates.map(c => [c.lat, c.lng] as [number, number]);
            const segLine = L.polyline(segLatlngs, {
                color: '#ffffff',
                weight: Math.max(2, weight - 3),
                opacity: 0.6,
                dashArray: '2 6',
            });
            segLine.bindTooltip(`${t(axis.label)} — ${t(segment.label)}`, { sticky: true });
            layers.push(segLine);

            // Joint marker at segment start (skip the very first joint)
            if (idx > 0 && segLatlngs.length > 0) {
                const joint = L.circleMarker(segLatlngs[0], {
                    radius: 4,
                    color: '#ffffff',
                    fillColor: color,
                    fillOpacity: 1,
                    weight: 2,
                });
                joint.bindTooltip(t(segment.label));
                layers.push(joint);
            }
        });

        // Arrowhead at end
        if (latlngs.length >= 2) {
            const end = latlngs[latlngs.length - 1];
            const marker = L.circleMarker(end, { radius: 5, color, fillColor: color, fillOpacity: 1, weight: 0 });
            layers.push(marker);
        }
    });

    const legend: AnalysisLegendData = {
        title: t('diagram.analysis.legend.key_axes'),
        type: 'discrete',
        items: [
            { color: importanceColors.critical, label: t('diagram.analysis.legend.critical') },
            { color: importanceColors.high, label: t('diagram.analysis.legend.high') },
            { color: importanceColors.medium, label: t('diagram.analysis.legend.medium') },
            { color: importanceColors.low, label: t('diagram.analysis.legend.low') },
        ],
    };

    return { layers, legend };
}

export function renderCoverageMap(result: CoverageMapResult, t: TFunction): { layers: L.Layer[]; legend: AnalysisLegendData } {
    const layers: L.Layer[] = [];

    result.zones.forEach(zone => {
        const latlngs = zone.coordinates.map(c => [c.lat, c.lng] as [number, number]);
        const color = interpolateColor(zone.threatLevel, threatStops);

        const polygon = L.polygon(latlngs, {
            color: 'transparent',
            fillColor: color,
            fillOpacity: 0.35,
            weight: 1,
        });
        polygon.bindTooltip(`${t(`diagram.aiTools.entity_types.${zone.weaponType}`)} - ${t('diagram.analysis.legend.enemy_threat_coverage')}: ${Math.round(zone.threatLevel * 100)}%`);
        layers.push(polygon);
    });

    const legend: AnalysisLegendData = {
        title: t('diagram.analysis.legend.enemy_threat_coverage'),
        type: 'gradient',
        items: [
            { color: 'rgb(255,255,200)', label: t('diagram.analysis.legend.low') },
            { color: 'rgb(255,100,50)', label: t('diagram.analysis.legend.medium') },
            { color: 'rgb(180,0,0)', label: t('diagram.analysis.legend.high') },
        ],
    };

    return { layers, legend };
}

export function renderLosThreat(result: LosThreatResult, t: TFunction, lang: string): { layers: L.Layer[]; legend: AnalysisLegendData } {
    const layers: L.Layer[] = [];

    result.zones.forEach(zone => {
        const latlngs = zone.coordinates.map(c => [c.lat, c.lng] as [number, number]);
        const color = exposureColors[zone.exposure] || '#6b7280';

        const polygon = L.polygon(latlngs, {
            color: color,
            fillColor: color,
            fillOpacity: 0.3,
            weight: 1.5,
            dashArray: zone.exposure === 'safe' ? '4 4' : undefined,
        });
        polygon.bindTooltip(`${t(`diagram.analysis.legend.${zone.exposure}`)}`);
        layers.push(polygon);
    });

    // Targets with threat level + LoS rays to covering enemy entities
    result.targetThreats.forEach(target => {
        const threatColor = target.threatLevel > 66 ? '#dc2626' : target.threatLevel > 33 ? '#f97316' : '#22c55e';

        target.coveredBy.forEach(source => {
            const ray = L.polyline(
                [[source.position.lat, source.position.lng], [target.position.lat, target.position.lng]],
                { color: '#dc2626', weight: 1, opacity: 0.5, dashArray: '4 4' }
            );
            ray.bindTooltip(`${source.name[lang] || source.name['en']} → ${target.name[lang] || target.name['en']}`);
            layers.push(ray);
        });

        const marker = L.circleMarker([target.position.lat, target.position.lng], {
            radius: 8,
            color: '#ffffff',
            fillColor: threatColor,
            fillOpacity: 1,
            weight: 2,
        });
        marker.bindTooltip(
            `<strong>${target.name[lang] || target.name['en']}</strong><br/>${t('diagram.aiTools.threat_level')}: ${target.threatLevel}%`,
            { permanent: false }
        );
        layers.push(marker);
    });

    const legend: AnalysisLegendData = {
        title: t('diagram.analysis.legend.los_exposure'),
        type: 'discrete',
        items: [
            { color: exposureColors.safe, label: t('diagram.analysis.legend.safe') },
            { color: exposureColors.partial, label: t('diagram.analysis.legend.partial') },
            { color: exposureColors.exposed, label: t('diagram.analysis.legend.exposed') },
            { color: exposureColors.critical, label: t('diagram.analysis.legend.critical') },
        ],
    };

    return { layers, legend };
}

export interface RouteRenderResult {
    layers: L.Layer[];
    legend: AnalysisLegendData;
    routeGroups: Record<RouteKind, L.LayerGroup>;
    riskGroup: L.LayerGroup;
}

export function renderRouteAnalysis(result: RouteAnalysisResult, t: TFunction): RouteRenderResult {
    const routeGroups = {} as Record<RouteKind, L.LayerGroup>;
    const riskLayers: L.Layer[] = [];

    result.routes.forEach(route => {
        const latlngs = route.coordinates.map(c => [c.lat, c.lng] as [number, number]);
        const color = routeKindColors[route.id];
        const routeLayers: L.Layer[] = [];

        const polyline = L.polyline(latlngs, {
            color,
            weight: 5,
            opacity: 0.85,
        });
        polyline.bindTooltip(
            `<strong>${t(route.label)}</strong><br/>${t('diagram.aiTools.score')}: ${route.score}/100<br/>${t('diagram.aiTools.safety')}: ${route.safetyRating} | ${t('diagram.aiTools.speed')}: ${route.speedRating} | ${t('diagram.aiTools.concealment')}: ${route.concealmentRating}`,
            { sticky: true }
        );
        routeLayers.push(polyline);

        // Start/end markers
        if (latlngs.length >= 2) {
            const start = L.circleMarker(latlngs[0], { radius: 6, color, fillColor: '#fff', fillOpacity: 1, weight: 3 });
            const end = L.circleMarker(latlngs[latlngs.length - 1], { radius: 6, color, fillColor: color, fillOpacity: 1, weight: 2 });
            routeLayers.push(start, end);
        }

        routeGroups[route.id] = L.layerGroup(routeLayers);

        // Risk segments rendered as a wide translucent under-stroke
        route.riskSegments.forEach(segment => {
            const segLatlngs = segment.coordinates.map(c => [c.lat, c.lng] as [number, number]);
            const riskLine = L.polyline(segLatlngs, {
                color: riskSeverityColors[segment.severity],
                weight: 12,
                opacity: 0.45,
            });
            riskLine.bindTooltip(t(`diagram.analysis.legend.risk_${segment.severity}`), { sticky: true });
            riskLayers.push(riskLine);
        });
    });

    const riskGroup = L.layerGroup(riskLayers);
    const layers: L.Layer[] = [riskGroup, ...result.routes.map(r => routeGroups[r.id])];

    const legend: AnalysisLegendData = {
        title: t('diagram.analysis.legend.route_options'),
        type: 'discrete',
        items: [
            ...result.routes.map(route => ({
                color: routeKindColors[route.id],
                label: `${t(route.label)} (${route.score})`,
            })),
            { color: riskSeverityColors.medium, label: t('diagram.analysis.legend.risk_medium') },
            { color: riskSeverityColors.high, label: t('diagram.analysis.legend.risk_high') },
        ],
    };

    return { layers, legend, routeGroups, riskGroup };
}

export function renderObservationPositions(result: ObservationPositionsResult, t: TFunction): { layers: L.Layer[]; legend: AnalysisLegendData } {
    const layers: L.Layer[] = [];

    result.positions.forEach(pos => {
        // Position marker
        const marker = L.circleMarker([pos.position.lat, pos.position.lng], {
            radius: 8,
            color: '#7c3aed',
            fillColor: '#7c3aed',
            fillOpacity: 0.8,
            weight: 2,
        });
        marker.bindTooltip(`<strong>${t(pos.label)}</strong><br/>${t('diagram.aiTools.score')}: ${pos.score}/100`);
        layers.push(marker);

        // Field of view arc
        const { startAngle, endAngle, range } = pos.fieldOfView;
        const arcPoints: [number, number][] = [[pos.position.lat, pos.position.lng]];
        const numPoints = 20;
        const startRad = (startAngle - 90) * Math.PI / 180;
        const endRad = (endAngle - 90) * Math.PI / 180;
        const metersPerDegLat = 111320;
        const metersPerDegLng = 111320 * Math.cos(pos.position.lat * Math.PI / 180);

        for (let i = 0; i <= numPoints; i++) {
            const angle = startRad + (endRad - startRad) * (i / numPoints);
            const dLat = (range * Math.sin(angle)) / metersPerDegLat;
            const dLng = (range * Math.cos(angle)) / metersPerDegLng;
            arcPoints.push([pos.position.lat + dLat, pos.position.lng + dLng]);
        }
        arcPoints.push([pos.position.lat, pos.position.lng]);

        const fovPolygon = L.polygon(arcPoints, {
            color: '#7c3aed',
            fillColor: '#a78bfa',
            fillOpacity: 0.15,
            weight: 1.5,
            dashArray: '4 3',
        });
        layers.push(fovPolygon);
    });

    const legend: AnalysisLegendData = {
        title: t('diagram.analysis.legend.observation_positions'),
        type: 'discrete',
        items: result.positions.map(pos => ({
            color: '#7c3aed',
            label: `${t(pos.label)} (${pos.score})`,
        })),
    };

    return { layers, legend };
}

export function renderDominatingAreas(result: DominatingAreasResult, t: TFunction): { layers: L.Layer[]; legend: AnalysisLegendData } {
    const layers: L.Layer[] = [];

    result.areas.forEach(area => {
        const latlngs = area.coordinates.map(c => [c.lat, c.lng] as [number, number]);
        const polygon = L.polygon(latlngs, {
            color: '#0d9488',
            fillColor: '#14b8a6',
            fillOpacity: 0.15 + (area.dominanceScore / 100) * 0.3,
            weight: 2,
        });
        polygon.bindTooltip(`<strong>${t(area.label)}</strong><br/>${t('diagram.aiTools.dominance')}: ${area.dominanceScore}/100`, { sticky: true });
        const center = polygon.getBounds().getCenter();
        layers.push(polygon);
        layers.push(areaLabelTooltip(t(area.label)).setLatLng(center));
    });

    const legend: AnalysisLegendData = {
        title: t('diagram.analysis.legend.dominating_areas'),
        type: 'discrete',
        items: result.areas.map(area => ({
            color: '#14b8a6',
            label: `${t(area.label)} (${area.dominanceScore})`,
        })),
    };

    return { layers, legend };
}

export function renderDominatedAreas(result: DominatedAreasResult, t: TFunction): { layers: L.Layer[]; legend: AnalysisLegendData } {
    const layers: L.Layer[] = [];

    const exposureStyles: Record<string, { color: string; fill: string }> = {
        observation: { color: '#f97316', fill: '#fb923c' },
        fire: { color: '#dc2626', fill: '#ef4444' },
    };

    result.areas.forEach(area => {
        const style = exposureStyles[area.exposure];
        const latlngs = area.coordinates.map(c => [c.lat, c.lng] as [number, number]);
        const polygon = L.polygon(latlngs, {
            color: style.color,
            fillColor: style.fill,
            fillOpacity: 0.25,
            weight: 2,
            dashArray: '6 4',
        });
        polygon.bindTooltip(
            `<strong>${t(`diagram.aiTools.exposure_${area.exposure}`)}</strong><br/>${t('diagram.aiTools.observed_from')}: ${t(area.observedFrom)}`,
            { sticky: true }
        );
        layers.push(polygon);
    });

    const legend: AnalysisLegendData = {
        title: t('diagram.analysis.legend.dominated_areas'),
        type: 'discrete',
        items: [
            { color: '#fb923c', label: t('diagram.aiTools.exposure_observation') },
            { color: '#ef4444', label: t('diagram.aiTools.exposure_fire') },
        ],
    };

    return { layers, legend };
}

export function renderDeploymentAreas(result: DeploymentAreasResult, t: TFunction): { layers: L.Layer[]; legend: AnalysisLegendData } {
    const layers: L.Layer[] = [];

    result.areas.forEach(area => {
        const latlngs = area.coordinates.map(c => [c.lat, c.lng] as [number, number]);
        const polygon = L.polygon(latlngs, {
            color: '#eab308',
            fillColor: '#facc15',
            fillOpacity: 0.2,
            weight: 3,
        });
        polygon.bindTooltip(
            `<strong>${t(area.label)}</strong><br/>${t('diagram.aiTools.suitability')}: ${area.suitability}/100<br/>${t('diagram.aiTools.capacity')}: ${t(area.capacity)}`,
            { sticky: true }
        );
        const center = polygon.getBounds().getCenter();
        layers.push(polygon);
        layers.push(areaLabelTooltip(t(area.label)).setLatLng(center));
    });

    const legend: AnalysisLegendData = {
        title: t('diagram.analysis.legend.deployment_areas'),
        type: 'discrete',
        items: result.areas.map(area => ({
            color: '#facc15',
            label: `${t(area.label)} (${area.suitability})`,
        })),
    };

    return { layers, legend };
}

export function renderTargetPriority(result: TargetPriorityResult, t: TFunction, lang: string): { layers: L.Layer[]; legend: AnalysisLegendData } {
    const layers: L.Layer[] = [];

    const priorityColor = (priority: number) => priority <= 2 ? '#dc2626' : priority <= 4 ? '#f97316' : '#6b7280';

    // Friendly fire-support asset
    const assetMarker = L.circleMarker([result.fireAssetPosition.lat, result.fireAssetPosition.lng], {
        radius: 9,
        color: '#ffffff',
        fillColor: '#2563eb',
        fillOpacity: 1,
        weight: 2,
    });
    assetMarker.bindTooltip(`<strong>${t('diagram.analysis.labels.fire_asset')}</strong>`);
    layers.push(assetMarker);

    result.targets.forEach(target => {
        const color = priorityColor(target.priority);

        // Dashed engagement line from the fire asset to high-priority targets
        if (target.priority <= 3) {
            const line = L.polyline(
                [[result.fireAssetPosition.lat, result.fireAssetPosition.lng], [target.position.lat, target.position.lng]],
                { color, weight: 1.5, opacity: 0.6, dashArray: '6 6' }
            );
            layers.push(line);
        }

        const icon = L.divIcon({
            className: 'analysis-priority-marker',
            html: `<div style="background:${color};color:#fff;width:24px;height:24px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4)">${target.priority}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });
        const marker = L.marker([target.position.lat, target.position.lng], { icon });
        marker.bindTooltip(
            `<strong>#${target.priority} ${target.name[lang] || target.name['en']}</strong><br/>${t(`diagram.aiTools.entity_types.${target.type}`)} — ${t('diagram.aiTools.score')}: ${target.score}<br/>${t('diagram.aiTools.recommended_asset')}: ${t(target.recommendedAsset)}`
        );
        layers.push(marker);
    });

    const legend: AnalysisLegendData = {
        title: t('diagram.analysis.legend.target_priority'),
        type: 'discrete',
        items: result.targets.slice(0, 5).map(target => ({
            color: priorityColor(target.priority),
            label: `#${target.priority} ${target.name[lang] || target.name['en']} (${target.score})`,
        })),
    };

    return { layers, legend };
}
