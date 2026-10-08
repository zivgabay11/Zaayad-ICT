import { TrackedDeviceType } from './types';

// Raw SVG markup for each Tikshov COP device-type icon (mirrors the lucide-react glyphs
// used elsewhere in the app: Radio/Rss/Antenna/Satellite/Router/Wifi), duplicated here as
// plain strings because Leaflet's L.divIcon renders raw HTML, not a React node — see
// commSiteIcon.ts for the same pattern used by the Static Space Establishment layer.

type SvgTag =
    | { tag: 'path'; d: string }
    | { tag: 'circle'; cx: string; cy: string; r: string }
    | { tag: 'rect'; x: string; y: string; width: string; height: string; rx?: string };

const DEVICE_ICON_TAGS: Record<TrackedDeviceType, SvgTag[]> = {
    // Sheked kit — personal, dismounted radio (lucide "radio")
    sheked: [
        { tag: 'path', d: 'M16.247 7.761a6 6 0 0 1 0 8.478' },
        { tag: 'path', d: 'M19.075 4.933a10 10 0 0 1 0 14.134' },
        { tag: 'path', d: 'M4.925 19.067a10 10 0 0 1 0-14.134' },
        { tag: 'path', d: 'M7.753 16.239a6 6 0 0 1 0-8.478' },
        { tag: 'circle', cx: '12', cy: '12', r: '2' },
    ],
    // Dual kit — two concurrent bearer paths (lucide "rss")
    dual: [
        { tag: 'path', d: 'M4 11a9 9 0 0 1 9 9' },
        { tag: 'path', d: 'M4 4a16 16 0 0 1 16 16' },
        { tag: 'circle', cx: '5', cy: '19', r: '1' },
    ],
    // Setz — directly tracked force (lucide "antenna")
    setz: [
        { tag: 'path', d: 'M2 12 7 2' },
        { tag: 'path', d: 'm7 12 5-10' },
        { tag: 'path', d: 'm12 12 5-10' },
        { tag: 'path', d: 'm17 12 5-10' },
        { tag: 'path', d: 'M4.5 7h15' },
        { tag: 'path', d: 'M12 16v6' },
    ],
    // Maban client — data-transmission device carried in the field (lucide "satellite")
    maban: [
        { tag: 'path', d: 'm13.5 6.5-3.148-3.148a1.205 1.205 0 0 0-1.704 0L6.352 5.648a1.205 1.205 0 0 0 0 1.704L9.5 10.5' },
        { tag: 'path', d: 'M16.5 7.5 19 5' },
        { tag: 'path', d: 'm17.5 10.5 3.148 3.148a1.205 1.205 0 0 1 0 1.704l-2.296 2.296a1.205 1.205 0 0 1-1.704 0L13.5 14.5' },
        { tag: 'path', d: 'M9 21a6 6 0 0 0-6-6' },
        { tag: 'path', d: 'M9.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l4.296-4.296a1.205 1.205 0 0 0 0-1.704l-2.296-2.296a1.205 1.205 0 0 0-1.704 0z' },
    ],
    // Setz modem — vehicle/CP-mounted hardware unit (lucide "router")
    setz_modem: [
        { tag: 'rect', x: '2', y: '14', width: '20', height: '8', rx: '2' },
        { tag: 'path', d: 'M6.01 18H6' },
        { tag: 'path', d: 'M10.01 18H10' },
        { tag: 'path', d: 'M15 10v4' },
        { tag: 'path', d: 'M17.84 7.17a4 4 0 0 0-5.66 0' },
        { tag: 'path', d: 'M20.66 4.34a8 8 0 0 0-11.31 0' },
    ],
    // Elad Green — field-deployed Elad client designation (lucide "wifi")
    elad_green: [
        { tag: 'path', d: 'M12 20h.01' },
        { tag: 'path', d: 'M2 8.82a15 15 0 0 1 20 0' },
        { tag: 'path', d: 'M5 12.859a10 10 0 0 1 14 0' },
        { tag: 'path', d: 'M8.5 16.429a5 5 0 0 1 7 0' },
    ],
};

// Distinct hue per device type — purely an identity color (which kind of device this is),
// never a readiness/threat signal; connection status is conveyed separately via the
// marker's ghost/flapping treatment (PRD 10.2 "no color implies operational threat level").
export const DEVICE_TYPE_COLORS: Record<TrackedDeviceType, string> = {
    sheked: '#38bdf8',
    dual: '#a78bfa',
    setz: '#fb923c',
    maban: '#34d399',
    setz_modem: '#f472b6',
    elad_green: '#22c55e',
};

function tagToSvg(tag: SvgTag): string {
    switch (tag.tag) {
        case 'path': return `<path d="${tag.d}"/>`;
        case 'circle': return `<circle cx="${tag.cx}" cy="${tag.cy}" r="${tag.r}"/>`;
        case 'rect': return `<rect x="${tag.x}" y="${tag.y}" width="${tag.width}" height="${tag.height}"${tag.rx ? ` rx="${tag.rx}"` : ''}/>`;
    }
}

export function trackedDeviceIconSvg(type: TrackedDeviceType, colorHex: string, sizePx = 16): string {
    const inner = DEVICE_ICON_TAGS[type].map(tagToSvg).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" fill="none" stroke="${colorHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
