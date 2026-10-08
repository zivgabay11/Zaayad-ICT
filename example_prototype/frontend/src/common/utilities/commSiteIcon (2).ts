// Raw SVG markup for the Comm Site marker (mirrors lucide-react's `RadioTower` glyph).
// Duplicated here as a plain string because Leaflet's L.divIcon renders raw HTML, not a
// React node — keeping the path data identical to lucide's icon keeps the map marker,
// the nav button, and the table/summary-card icons visually identical everywhere.
export const COMM_SITE_ICON_PATHS = '<path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/><path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/><path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/><path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/>';

export function commSiteIconSvg(colorHex: string, sizePx = 18): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" fill="none" stroke="${colorHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${COMM_SITE_ICON_PATHS}</svg>`;
}
