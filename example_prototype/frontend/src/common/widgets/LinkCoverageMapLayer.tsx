import React, { useMemo } from 'react';
import { Marker, Polygon, Popup, Rectangle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { useLinkPlanningContext } from '../context/LinkPlanningContext';
import { useHeadquartersLayerContext } from '../context/HeadquartersLayerContext';
import { mockCommSites } from '../utilities/mockData';
import { computeCombinedGridTiles, getCombinedCutsLabel, LINK_COVERAGE_TIER_COLORS } from '../utilities/linkPlanning';
import { mobilePlatformIconSvg } from '../utilities/mobilePlatformIcon';
import { getHeadquartersLevel, headquartersMarkerHtml } from '../utilities/headquartersIcon';
import { HeadquartersKind, HeadquartersLevel, LinkCoverageCut } from '../utilities/types';

// Renders the "Link Planning" (תכנון קשר רדיו) map layer: the user-drawn terrain cells
// (dashed outline so the true shape stays visible under a coverage mosaic), mobile comm
// platform markers, and — per terrain cell with one or more visible cuts — a single
// combined grid of colored tiles (blue=good, green=medium, red=low, purple=none). When
// several cuts over the same cell are visible at once, their tiles are merged by taking
// the best tier any of them reaches per spot (see computeCombinedGridTiles): a spot one
// cut shows "good" and another shows "low" really is linked, so it renders "good". Purely
// a mock visualization, see common/utilities/linkPlanning.ts for the derivation.

// Amber while still in תכנון (planning) — once transferred to ניהו"ק it renders blue via
// MobileSpaceMapLayer.tsx instead (the two are deliberately swapped/distinct colors).
const PLATFORM_COLOR = '#f59e0b';

function platformDivIcon() {
    const html = `
        <div style="width:30px; height:30px; border-radius:8px;
            background:linear-gradient(160deg,#0c3a4d,#082230); border:1.5px solid ${PLATFORM_COLOR};
            display:flex; align-items:center; justify-content:center; color:${PLATFORM_COLOR};
            box-shadow:0 3px 10px rgba(0,0,0,.5);">
            ${mobilePlatformIconSvg(PLATFORM_COLOR, 16)}
        </div>
    `;
    return L.divIcon({ html, className: '', iconSize: [30, 30], iconAnchor: [15, 30] });
}

const HEADQUARTERS_KINDS: HeadquartersKind[] = ['headquarters', 'commandPost'];
const HEADQUARTERS_LEVELS: HeadquartersLevel[] = ['division', 'brigade', 'battalion'];

function buildHeadquartersIconCache() {
    const cache = new Map<string, L.DivIcon>();
    HEADQUARTERS_KINDS.forEach(kind => {
        HEADQUARTERS_LEVELS.forEach(level => {
            const html = headquartersMarkerHtml(kind, level, PLATFORM_COLOR, '#0c3a4d', '#082230');
            cache.set(`${kind}-${level}`, L.divIcon({ html, className: '', iconSize: [30, 30], iconAnchor: [15, 30] }));
        });
        // Fallback for the (shouldn't-happen) case a unitCode doesn't resolve to a level.
        const html = headquartersMarkerHtml(kind, undefined, PLATFORM_COLOR, '#0c3a4d', '#082230');
        cache.set(`${kind}-unknown`, L.divIcon({ html, className: '', iconSize: [30, 30], iconAnchor: [15, 30] }));
    });
    return cache;
}

interface Props {
    onPlatformContextMenu?: (platformId: string, x: number, y: number) => void;
    onCellContextMenu?: (cellId: string, x: number, y: number) => void;
    onHeadquartersContextMenu?: (entityId: string, x: number, y: number) => void;
}

export const LinkCoverageMapLayer: React.FC<Props> = ({ onPlatformContextMenu, onCellContextMenu, onHeadquartersContextMenu }) => {
    const { t, i18n } = useTranslation();
    const { linkCells, mobilePlatforms, headquartersEntities, linkCoverageCuts, cellsLayerOn, cutsLayerOn } = useLinkPlanningContext();
    // Once a headquarters/command post is in ניהו"ק it is drawn blue by HeadquartersMapLayer and
    // must not also be drawn here in the amber נוה"ק colour (the amber marker sits on top and
    // would hide the blue one). This also covers entities added straight into ניהו"ק from the
    // "מפקדות וחפ"קים" overview, which never pass through נוה"ק at all.
    const { ids: transferredHeadquartersIds } = useHeadquartersLayerContext();
    const icon = useMemo(() => platformDivIcon(), []);
    const headquartersIcons = useMemo(() => buildHeadquartersIconCache(), []);

    if (!cellsLayerOn && !cutsLayerOn) return null;

    const visibleCuts = cutsLayerOn ? linkCoverageCuts.filter(c => c.visible) : [];
    const cutsByCellId = new Map<string, LinkCoverageCut[]>();
    for (const cut of visibleCuts) {
        const group = cutsByCellId.get(cut.cellId);
        if (group) group.push(cut); else cutsByCellId.set(cut.cellId, [cut]);
    }

    return (
        <>
            {cellsLayerOn && linkCells.map(cell => (
                <Polygon
                    key={cell.id}
                    positions={cell.coordinates.map(c => [c.lat, c.lng] as [number, number])}
                    pathOptions={{ color: '#64748b', fillOpacity: 0, weight: 2, dashArray: '6 4' }}
                    eventHandlers={onCellContextMenu ? {
                        contextmenu: (e: L.LeafletMouseEvent) => {
                            L.DomEvent.stopPropagation(e);
                            e.originalEvent?.preventDefault();
                            onCellContextMenu(cell.id, e.containerPoint.x, e.containerPoint.y);
                        },
                    } : undefined}
                >
                    <Tooltip sticky>{cell.name}</Tooltip>
                </Polygon>
            ))}

            {cellsLayerOn && mobilePlatforms.map(platform => (
                <Marker
                    key={platform.id}
                    position={[platform.position.lat, platform.position.lng]}
                    icon={icon}
                    eventHandlers={onPlatformContextMenu ? {
                        contextmenu: (e: L.LeafletMouseEvent) => {
                            L.DomEvent.stopPropagation(e);
                            e.originalEvent?.preventDefault();
                            onPlatformContextMenu(platform.id, e.containerPoint.x, e.containerPoint.y);
                        },
                    } : undefined}
                >
                    <Tooltip permanent direction="bottom" offset={[0, 2]} opacity={1} className="commsite-label">{platform.name}</Tooltip>
                    <Popup minWidth={160}>
                        <div className="text-[12px] font-semibold">{platform.name}</div>
                        <div className="text-[10.5px] text-slate-400">{t('linkPlanning.mobilePlatform')}</div>
                    </Popup>
                </Marker>
            ))}

            {cellsLayerOn && headquartersEntities.filter(entity => !transferredHeadquartersIds.includes(entity.id)).map(entity => {
                const level = getHeadquartersLevel(entity.unitCode);
                const icon = headquartersIcons.get(`${entity.kind}-${level ?? 'unknown'}`)!;
                return (
                    <Marker
                        key={entity.id}
                        position={[entity.position.lat, entity.position.lng]}
                        icon={icon}
                        eventHandlers={onHeadquartersContextMenu ? {
                            contextmenu: (e: L.LeafletMouseEvent) => {
                                L.DomEvent.stopPropagation(e);
                                e.originalEvent?.preventDefault();
                                onHeadquartersContextMenu(entity.id, e.containerPoint.x, e.containerPoint.y);
                            },
                        } : undefined}
                    >
                        <Tooltip permanent direction="bottom" offset={[0, 2]} opacity={1} className="commsite-label">{entity.name}</Tooltip>
                        <Popup minWidth={160}>
                            <div className="text-[12px] font-semibold">{entity.name}</div>
                            <div className="text-[10.5px] text-slate-400">{t(entity.kind === 'headquarters' ? 'linkPlanning.headquarters' : 'linkPlanning.commandPost')}</div>
                        </Popup>
                    </Marker>
                );
            })}

            {Array.from(cutsByCellId.entries()).map(([cellId, cuts]) => {
                const cell = linkCells.find(c => c.id === cellId);
                if (!cell) return null;
                const tiles = computeCombinedGridTiles(cuts, cell);
                const label = getCombinedCutsLabel(cuts, cell, mockCommSites, mobilePlatforms, i18n.language);
                return (
                    <React.Fragment key={cellId}>
                        {tiles.map(tile => (
                            <Rectangle
                                key={tile.key}
                                bounds={tile.bounds}
                                pathOptions={{ color: LINK_COVERAGE_TIER_COLORS[tile.tier], fillColor: LINK_COVERAGE_TIER_COLORS[tile.tier], fillOpacity: 0.55, weight: 0 }}
                            >
                                <Tooltip sticky>{label}</Tooltip>
                            </Rectangle>
                        ))}
                    </React.Fragment>
                );
            })}
        </>
    );
};
