// Raw SVG markup for the Mobile Comm Platform marker: a truck body with two short antenna
// masts, hand-drawn (not copied from a lucide glyph) since this is only ever rendered via
// Leaflet's L.divIcon (raw HTML, not a React node). The toolbar button for this tool uses
// lucide-react's `Truck` icon directly instead — only the map marker needs a string here.
function mobilePlatformIconPaths(): string {
    return [
        '<rect x="2" y="12" width="13" height="7" rx="1"/>',
        '<path d="M15 14h4l3 3.2V19h-7z"/>',
        '<circle cx="6.5" cy="19.5" r="1.5"/>',
        '<circle cx="16.5" cy="19.5" r="1.5"/>',
        '<path d="M6 12V9"/>',
        '<path d="M10 12V7"/>',
        '<circle cx="6" cy="8.2" r="0.9" fill="currentColor"/>',
        '<circle cx="10" cy="6.2" r="0.9" fill="currentColor"/>',
    ].join('');
}

export function mobilePlatformIconSvg(colorHex: string, sizePx = 18): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" fill="none" stroke="${colorHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" color="${colorHex}">${mobilePlatformIconPaths()}</svg>`;
}
