import { CommSite, GeoCoordinate, LinkCell, LinkCoverageCut, LinkCoverageTier, MobileCommPlatform } from './types';

// Domain constants + pure helpers for the "Link Planning" (תכנון קשר) map layer. Coverage
// is a purely visual mock (no real RF/distance model, per the feature's scope) — a grid of
// tiles clipped to the user-drawn LinkCell polygon, each tile's tier derived deterministically
// from the exact cell + comm site + mobile platform selection a LinkCoverageCut was computed
// with, so the same cut always renders identically (mirrors how computeJammingStatus in
// spectrum.ts derives state instead of trusting a stored flag).

export const LINK_COVERAGE_TIERS: LinkCoverageTier[] = ['good', 'medium', 'low', 'none'];

export const LINK_COVERAGE_TIER_COLORS: Record<LinkCoverageTier, string> = {
    good: '#3b82f6', // blue
    medium: '#22c55e', // green
    low: '#dc2626', // red
    none: '#a855f7', // purple
};

const GRID_SIZE = 10;

// Small deterministic string hash (FNV-1a) feeding a mulberry32 PRNG — good enough for a
// mock visual, no external dependency needed.
function hashString(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Ray-casting point-in-polygon test (lng as x, lat as y) — no turf.js dependency needed for
// this prototype-only mock.
export function isPointInPolygon(point: GeoCoordinate, polygon: GeoCoordinate[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng, yi = polygon[i].lat;
        const xj = polygon[j].lng, yj = polygon[j].lat;
        const intersects = (yi > point.lat) !== (yj > point.lat)
            && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
        if (intersects) inside = !inside;
    }
    return inside;
}

function getPolygonBounds(polygon: GeoCoordinate[]) {
    const lats = polygon.map(p => p.lat);
    const lngs = polygon.map(p => p.lng);
    return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLng: Math.min(...lngs), maxLng: Math.max(...lngs) };
}

// More selected sources (comm sites + mobile platforms) shift the mock odds toward "good"
// coverage — a cheap heuristic to suggest "more sites/platforms = better combined coverage"
// without any real geo/distance modeling.
function computeTierWeights(sourceCount: number): Record<LinkCoverageTier, number> {
    const boost = Math.min(Math.max(sourceCount, 1), 5) * 0.08;
    const good = 0.2 + boost;
    const none = Math.max(0.05, 0.3 - boost);
    const remaining = Math.max(0, 1 - good - none);
    return { good, medium: remaining * 0.55, low: remaining * 0.45, none };
}

function pickTier(value: number, weights: Record<LinkCoverageTier, number>): LinkCoverageTier {
    let acc = 0;
    for (const tier of LINK_COVERAGE_TIERS) {
        acc += weights[tier];
        if (value < acc) return tier;
    }
    return 'none';
}

export interface CoverageGridTile {
    key: string;
    bounds: [[number, number], [number, number]];
    tier: LinkCoverageTier;
}

// "Better" link quality wins when combining overlapping cuts over the same cell — good
// beats medium beats low beats none, since a spot reachable by at least one of the
// combined sites does have a link there.
export const LINK_COVERAGE_TIER_RANK: Record<LinkCoverageTier, number> = { good: 3, medium: 2, low: 1, none: 0 };

function betterTier(a: LinkCoverageTier, b: LinkCoverageTier): LinkCoverageTier {
    return LINK_COVERAGE_TIER_RANK[a] >= LINK_COVERAGE_TIER_RANK[b] ? a : b;
}

// Combines several LinkCoverageCuts computed over the same LinkCell (same polygon, same
// grid alignment) into one mosaic: per grid tile, the best tier any of the cuts reaches
// wins. This is what powers "turning on several link-planning layers at once" — a spot
// covered 'good' by one site and 'low' by another really does have a link there.
export function computeCombinedGridTiles(cuts: LinkCoverageCut[], cell: LinkCell, gridSize: number = GRID_SIZE): CoverageGridTile[] {
    if (cuts.length === 1) return computeCutGridTiles(cuts[0], cell, gridSize);
    const merged = new Map<string, CoverageGridTile>();
    for (const cut of cuts) {
        for (const tile of computeCutGridTiles(cut, cell, gridSize)) {
            const existing = merged.get(tile.key);
            merged.set(tile.key, existing ? { ...tile, tier: betterTier(tile.tier, existing.tier) } : tile);
        }
    }
    return Array.from(merged.values());
}

export function computeCutGridTiles(cut: LinkCoverageCut, cell: LinkCell, gridSize: number = GRID_SIZE): CoverageGridTile[] {
    const seed = hashString(`${cut.cellId}|${[...cut.commSiteIds].sort().join(',')}|${[...cut.platformIds].sort().join(',')}`);
    const rng = mulberry32(seed);
    const weights = computeTierWeights(cut.commSiteIds.length + cut.platformIds.length);
    const { minLat, maxLat, minLng, maxLng } = getPolygonBounds(cell.coordinates);
    const latStep = (maxLat - minLat) / gridSize;
    const lngStep = (maxLng - minLng) / gridSize;

    const tiles: CoverageGridTile[] = [];
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const tileMinLat = minLat + row * latStep;
            const tileMinLng = minLng + col * lngStep;
            const tileMaxLat = tileMinLat + latStep;
            const tileMaxLng = tileMinLng + lngStep;
            const center: GeoCoordinate = { lat: (tileMinLat + tileMaxLat) / 2, lng: (tileMinLng + tileMaxLng) / 2 };
            const value = rng();
            if (!isPointInPolygon(center, cell.coordinates)) continue;
            tiles.push({
                key: `${row}-${col}`,
                bounds: [[tileMinLat, tileMinLng], [tileMaxLat, tileMaxLng]],
                tier: pickTier(value, weights),
            });
        }
    }
    return tiles;
}

// Human-readable label for a cut: the cell's name plus its contributing comm site /
// mobile platform names — used both for the Layers dropdown sub-row and the map popup.
export function getCutLabel(
    cut: LinkCoverageCut,
    cells: LinkCell[],
    commSites: CommSite[],
    platforms: MobileCommPlatform[],
    lang: string,
): string {
    const cell = cells.find(c => c.id === cut.cellId);
    const siteNames = cut.commSiteIds
        .map(id => commSites.find(s => s.id === id))
        .filter((s): s is CommSite => !!s)
        .map(s => s.siteName[lang] || s.siteName.en);
    const platformNames = cut.platformIds
        .map(id => platforms.find(p => p.id === id))
        .filter((p): p is MobileCommPlatform => !!p)
        .map(p => p.name);
    const sources = [...siteNames, ...platformNames].join(', ');
    return cell ? `${cell.name} — ${sources}` : sources;
}

// Same as getCutLabel but across several cuts combined over one cell (see
// computeCombinedGridTiles) — the union of every contributing cut's sources, deduplicated.
export function getCombinedCutsLabel(
    cuts: LinkCoverageCut[],
    cell: LinkCell,
    commSites: CommSite[],
    platforms: MobileCommPlatform[],
    lang: string,
): string {
    const siteIds = Array.from(new Set(cuts.flatMap(c => c.commSiteIds)));
    const platformIds = Array.from(new Set(cuts.flatMap(c => c.platformIds)));
    const siteNames = siteIds
        .map(id => commSites.find(s => s.id === id))
        .filter((s): s is CommSite => !!s)
        .map(s => s.siteName[lang] || s.siteName.en);
    const platformNames = platformIds
        .map(id => platforms.find(p => p.id === id))
        .filter((p): p is MobileCommPlatform => !!p)
        .map(p => p.name);
    return `${cell.name} — ${[...siteNames, ...platformNames].join(', ')}`;
}
