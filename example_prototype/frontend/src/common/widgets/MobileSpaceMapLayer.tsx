import React, { useMemo } from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { useMobileSpaceContext } from '../context/MobileSpaceContext';
import { useLinkPlanningContext } from '../context/LinkPlanningContext';
import { mobilePlatformIconSvg } from '../utilities/mobilePlatformIcon';

// Renders the "Mobile Space Establishment" (כינון מרחב נייד) map layer: mobile comm
// platforms the user has promoted into it (via the right-click menu on a Link Planning
// platform marker). Blue, once in ניהו"ק — the amber color is reserved for while it's
// still in תכנון (planning), rendered by LinkCoverageMapLayer.tsx instead.

const MOBILE_SPACE_COLOR = '#0ea5e9';

function mobileSpaceDivIcon() {
    const html = `
        <div style="width:30px; height:30px; border-radius:8px;
            background:linear-gradient(160deg,#4d3a0c,#302208); border:1.5px solid ${MOBILE_SPACE_COLOR};
            display:flex; align-items:center; justify-content:center; color:${MOBILE_SPACE_COLOR};
            box-shadow:0 3px 10px rgba(0,0,0,.5);">
            ${mobilePlatformIconSvg(MOBILE_SPACE_COLOR, 16)}
        </div>
    `;
    return L.divIcon({ html, className: '', iconSize: [30, 30], iconAnchor: [15, 30] });
}

interface Props {
    // Promoted platforms still render in Link Planning's own layer too (both layers are
    // independently toggleable), so the two markers sit exactly on top of each other —
    // whichever one the browser hands the contextmenu event to, this layer needs the same
    // handler wired too, or a right-click on an already-promoted platform could silently
    // land on this layer's marker (which previously had no handler) and do nothing.
    onPlatformContextMenu?: (platformId: string, x: number, y: number) => void;
}

export const MobileSpaceMapLayer: React.FC<Props> = ({ onPlatformContextMenu }) => {
    const { t } = useTranslation();
    const { platformIds, layerOn } = useMobileSpaceContext();
    const { mobilePlatforms } = useLinkPlanningContext();
    const icon = useMemo(() => mobileSpaceDivIcon(), []);

    if (!layerOn) return null;

    const activePlatforms = mobilePlatforms.filter(p => platformIds.includes(p.id));

    return (
        <>
            {activePlatforms.map(platform => (
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
                        <div className="text-[10.5px] text-slate-400">{t('mobileSpace.layerName')}</div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
};
