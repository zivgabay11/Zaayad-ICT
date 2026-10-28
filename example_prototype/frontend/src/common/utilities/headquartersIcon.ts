import { HeadquartersKind, HeadquartersLevel } from './types';
import { mockUnits } from './mockData';

// Raw SVG markup for the Headquarters (מפקדה) and Command Post (חפ"ק) map markers — same
// approach as mobilePlatformIcon.ts: lucide's own path data (Building2 / Flag), inlined
// since L.divIcon needs raw HTML, not a React node.

function buildingIconPaths(): string {
    return [
        '<path d="M10 12h4"/>',
        '<path d="M10 8h4"/>',
        '<path d="M14 21v-3a2 2 0 0 0-4 0v3"/>',
        '<path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/>',
        '<path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>',
    ].join('');
}

function flagIconPaths(): string {
    return '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/>';
}

function headquartersIconSvg(kind: HeadquartersKind, colorHex: string, sizePx = 18): string {
    const paths = kind === 'headquarters' ? buildingIconPaths() : flagIconPaths();
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" fill="none" stroke="${colorHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" color="${colorHex}">${paths}</svg>`;
}

// NATO APP-6 unit-size "amplifiers" (the little marks above a map symbol's frame):
// battalion = II, brigade = X, division = XX — a small, standard military distinction
// layered on an otherwise identical icon, rather than a different glyph per level.
export const LEVEL_BADGE: Record<HeadquartersLevel, string> = {
    division: 'XX',
    brigade: 'X',
    battalion: 'II',
};

// Looks up which of the three assignable echelons (see SelectUnitModal's ASSIGNABLE_TYPES)
// a headquarters/command post's unitCode belongs to, straight from the org-chart catalog.
export function getHeadquartersLevel(unitCode: number): HeadquartersLevel | undefined {
    const type = mockUnits.find(u => u.code === unitCode)?.type;
    return type === 'division' || type === 'brigade' || type === 'battalion' ? type : undefined;
}

// Full marker HTML (wrapper + icon + echelon badge) for an L.divIcon — shared by both the
// amber (still-planning) and blue (transferred to ניהו"ק) renderings, which only differ in
// color/background.
export function headquartersMarkerHtml(
    kind: HeadquartersKind,
    level: HeadquartersLevel | undefined,
    colorHex: string,
    bgFrom: string,
    bgTo: string,
): string {
    const badge = level ? LEVEL_BADGE[level] : '';
    return `
        <div style="position:relative; width:30px; height:30px; border-radius:8px;
            background:linear-gradient(160deg,${bgFrom},${bgTo}); border:1.5px solid ${colorHex};
            display:flex; align-items:center; justify-content:center; color:${colorHex};
            box-shadow:0 3px 10px rgba(0,0,0,.5);">
            ${headquartersIconSvg(kind, colorHex, 16)}
            ${badge ? `<span style="position:absolute; bottom:-3px; right:-3px; background:${colorHex}; color:#09090b; font-size:7px; font-weight:800; line-height:1; padding:1px 2px; border-radius:3px; letter-spacing:-0.5px;">${badge}</span>` : ''}
        </div>
    `;
}
