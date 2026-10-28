import React, { useMemo } from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { useHeadquartersLayerContext } from '../context/HeadquartersLayerContext';
import { useLinkPlanningContext } from '../context/LinkPlanningContext';
import { getHeadquartersLevel, headquartersMarkerHtml } from '../utilities/headquartersIcon';
import { HeadquartersKind, HeadquartersLevel } from '../utilities/types';

// Renders the "מפקדות וחפ"קים" (Headquarters & Command Posts) map layer: entities the user
// has transferred into it (via the right-click menu on a Link Planning headquarters/
// command-post marker). Blue, once in ניהו"ק — the amber color is reserved for while it's
// still in תכנון (planning), rendered by LinkCoverageMapLayer.tsx instead.

const LAYER_COLOR = '#0ea5e9';
const KINDS: HeadquartersKind[] = ['headquarters', 'commandPost'];
const LEVELS: HeadquartersLevel[] = ['division', 'brigade', 'battalion'];

function buildIconCache() {
    const cache = new Map<string, L.DivIcon>();
    KINDS.forEach(kind => {
        LEVELS.forEach(level => {
            const html = headquartersMarkerHtml(kind, level, LAYER_COLOR, '#4d3a0c', '#302208');
            cache.set(`${kind}-${level}`, L.divIcon({ html, className: '', iconSize: [30, 30], iconAnchor: [15, 30] }));
        });
        // Fallback for the (shouldn't-happen) case a unitCode doesn't resolve to a level.
        const html = headquartersMarkerHtml(kind, undefined, LAYER_COLOR, '#4d3a0c', '#302208');
        cache.set(`${kind}-unknown`, L.divIcon({ html, className: '', iconSize: [30, 30], iconAnchor: [15, 30] }));
    });
    return cache;
}

interface Props {
    onEntityContextMenu?: (entityId: string, x: number, y: number) => void;
}

export const HeadquartersMapLayer: React.FC<Props> = ({ onEntityContextMenu }) => {
    const { t } = useTranslation();
    const { ids, layerOn, showHeadquarters, showCommandPosts, myUnitsOnly, myUnitCodes } = useHeadquartersLayerContext();
    const { headquartersEntities } = useLinkPlanningContext();
    const icons = useMemo(() => buildIconCache(), []);

    if (!layerOn) return null;

    const activeEntities = headquartersEntities.filter(e =>
        ids.includes(e.id) &&
        (e.kind === 'headquarters' ? showHeadquarters : showCommandPosts) &&
        (!myUnitsOnly || myUnitCodes.includes(e.unitCode)),
    );

    return (
        <>
            {activeEntities.map(entity => {
                const level = getHeadquartersLevel(entity.unitCode);
                const icon = icons.get(`${entity.kind}-${level ?? 'unknown'}`)!;
                return (
                    <Marker
                        key={entity.id}
                        position={[entity.position.lat, entity.position.lng]}
                        icon={icon}
                        eventHandlers={onEntityContextMenu ? {
                            contextmenu: (e: L.LeafletMouseEvent) => {
                                L.DomEvent.stopPropagation(e);
                                e.originalEvent?.preventDefault();
                                onEntityContextMenu(entity.id, e.containerPoint.x, e.containerPoint.y);
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
        </>
    );
};
