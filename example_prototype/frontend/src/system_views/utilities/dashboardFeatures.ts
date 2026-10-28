import React from 'react';
import type { CSSProperties } from 'react';
import { LucideIcon, Ban, ListChecks, Radar, Radio, Swords } from 'lucide-react';
import { DashboardFeatureId, DashboardWidget } from '../../common/utilities/types';
import { FigmaIcon, FigmaIconName } from '../../common/widgets/FigmaIcon';

// The registry behind System Views (תצוגות מערכת): every existing feature of שליטה וניהול,
// ניטור and ספקטרום that can be dropped onto a custom dashboard, grouped the way the sidebar
// groups them. Each id maps to the real screen in DashboardFeatureContent.tsx, and its label
// reuses the feature's own navigation label.

// Features that have an icon in the Figma "מודלריות" palette use that exact (20px) Figma glyph; the
// rest keep their Lucide icon. Wrapped so both kinds satisfy the same icon-component type.
const figmaIcon = (name: FigmaIconName): LucideIcon =>
    (({ className }: { className?: string }) => React.createElement(FigmaIcon, { name, className })) as unknown as LucideIcon;

export type DashboardFeatureGroup = 'control' | 'monitoring' | 'spectrum';

export interface DashboardFeature {
    id: DashboardFeatureId;
    labelKey: string;
    icon: LucideIcon;
    group: DashboardFeatureGroup;
}

export const DASHBOARD_FEATURES: DashboardFeature[] = [
    { id: 'combat_log', labelKey: 'nav.telecom_journal', icon: figmaIcon('palette-book-text'), group: 'control' },
    { id: 'combat_script', labelKey: 'nav.combat_script', icon: Swords, group: 'control' },
    { id: 'personal_task_log', labelKey: 'nav.personal_task_log', icon: ListChecks, group: 'control' },
    { id: 'bum_manager', labelKey: 'nav.bum_manager', icon: figmaIcon('palette-table'), group: 'control' },
    { id: 'headquarters_overview', labelKey: 'nav.headquarters_overview', icon: figmaIcon('palette-map-pin'), group: 'control' },
    { id: 'static_space', labelKey: 'nav.static_space', icon: figmaIcon('palette-radio-tower'), group: 'monitoring' },
    { id: 'tikshov_cop', labelKey: 'nav.tikshov_cop', icon: Radar, group: 'monitoring' },
    { id: 'spectrum_jamming', labelKey: 'spectrum.tabs.jamming', icon: Radio, group: 'spectrum' },
    { id: 'spectrum_blocking', labelKey: 'spectrum.tabs.blocking', icon: Ban, group: 'spectrum' },
];

export const DASHBOARD_FEATURE_GROUPS: Array<{ id: DashboardFeatureGroup; labelKey: string }> = [
    { id: 'control', labelKey: 'nav.control' },
    { id: 'monitoring', labelKey: 'nav.monitoring' },
    { id: 'spectrum', labelKey: 'spectrum.layerName' },
];

export const getDashboardFeature = (id: DashboardFeatureId): DashboardFeature =>
    DASHBOARD_FEATURES.find(f => f.id === id) ?? DASHBOARD_FEATURES[0];

// ---- The canvas ----
// A dashboard is ONE fixed rectangle that fills the screen area (it never scrolls). There is no
// free placement: the widgets are tiled automatically so that together they always use 100% of
// the space — one widget fills the whole screen, two sit side by side, three, four… are arranged
// to fill it too, with the tile shapes kept as close to a comfortable aspect ratio as possible.

// Every feature is laid out as if it were a page of at least this many CSS pixels, then scaled
// to its tile — so a tile that gets bigger shows its feature larger, a smaller one shows it
// smaller, and the feature always fills the tile without the dashboard needing to scroll.
export const DASHBOARD_DESIGN_WIDTH = 1200;
export const DASHBOARD_DESIGN_HEIGHT = 750;
export const DASHBOARD_MIN_ZOOM = 0.3;
export const DASHBOARD_MAX_ZOOM = 2;

// A tile as fractions (0..1) of the canvas; x counts from the start edge (right in Hebrew).
export interface TileRect { x: number; y: number; w: number; h: number }

const TARGET_TILE_ASPECT = 1.5;

// Lines of the layout: tiles are either arranged in rows (each row split into equal-width
// tiles) or in columns (each column split into equal-height tiles). The n tiles are shared out
// over `lines` lines as evenly as possible (the first lines get the extra ones).
function buildLines(n: number, lines: number, byRows: boolean): TileRect[] {
    const base = Math.floor(n / lines);
    const extra = n % lines;
    const rects: TileRect[] = [];
    for (let line = 0; line < lines; line++) {
        const count = base + (line < extra ? 1 : 0);
        for (let i = 0; i < count; i++) {
            rects.push(byRows
                ? { x: i / count, y: line / lines, w: 1 / count, h: 1 / lines }
                : { x: line / lines, y: i / count, w: 1 / lines, h: 1 / count });
        }
    }
    return rects;
}

// Mean distance of the tiles' aspect ratios from a comfortable one (in log space, so a tile
// twice too wide and one twice too tall are equally bad).
const layoutPenalty = (rects: TileRect[], canvasAspect: number) =>
    rects.reduce((sum, r) => sum + Math.abs(Math.log(((r.w / r.h) * canvasAspect) / TARGET_TILE_ASPECT)), 0) / rects.length;

// The tile rectangles for `count` widgets on a canvas of the given width / height ratio:
// the best of every rows-or-columns split, so the screen is always filled completely.
export function computeTileLayout(count: number, canvasAspect: number): TileRect[] {
    if (count <= 0) return [];
    if (count === 1) return [{ x: 0, y: 0, w: 1, h: 1 }];
    let best: TileRect[] = buildLines(count, 1, true);
    let bestPenalty = layoutPenalty(best, canvasAspect);
    for (const byRows of [true, false]) {
        for (let lines = 1; lines <= count; lines++) {
            const candidate = buildLines(count, lines, byRows);
            const penalty = layoutPenalty(candidate, canvasAspect);
            if (penalty < bestPenalty - 1e-9) { best = candidate; bestPenalty = penalty; }
        }
    }
    return best;
}

// Percentage rectangle for a tile inside the canvas (logical start edge, so it mirrors in RTL).
export const tileRectStyle = (r: TileRect): CSSProperties => ({
    position: 'absolute',
    insetInlineStart: `${r.x * 100}%`,
    top: `${r.y * 100}%`,
    width: `${r.w * 100}%`,
    height: `${r.h * 100}%`,
});

export function newDashboardWidget(featureId: DashboardFeatureId): DashboardWidget {
    return { id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, featureId };
}

// Dashboards saved with the earlier free-placement format carried x/y/w/h on each widget:
// keep their features, in reading order, and let the layout engine tile them.
export function normalizeDashboardWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
    type Legacy = DashboardWidget & { x?: number; y?: number };
    const ordered = [...(widgets as Legacy[])]
        .map((w, index) => ({ w, index }))
        .sort((a, b) => ((a.w.y ?? 0) - (b.w.y ?? 0)) || ((a.w.x ?? 0) - (b.w.x ?? 0)) || a.index - b.index)
        .map(entry => entry.w);
    const seen = new Set<string>();
    return ordered
        .filter(w => (seen.has(w.featureId) ? false : (seen.add(w.featureId), true)))
        .map(w => ({ id: w.id, featureId: w.featureId }));
}
