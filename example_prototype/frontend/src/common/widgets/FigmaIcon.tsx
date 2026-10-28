import React from 'react';

// Icons exported from the Figma file "הורוס תקשוב" (public/icons/figma/*.svg). They are used as a
// CSS mask so the exact Figma glyph is rendered unchanged while its colour follows
// `currentColor` (the SVG files themselves carry a fixed white / grey fill).
//
// The name is the file name without the extension. Prefixes tell where the icon is used in the
// design: side-* (side menu), tab-* (tab bar), header-* (top bar), tool-* (table toolbar),
// menu-* / table-* (other icon-button groups on the Figma icons page), badge-* (stat badges).
export type FigmaIconName =
    | 'side-layout-dashboard' | 'side-layout-grid' | 'side-book-text' | 'side-sliders-horizontal'
    | 'side-radio' | 'side-map' | 'side-kanban'
    | 'tab-map-pin' | 'tab-radius' | 'tab-table' | 'tab-book-text' | 'tab-layout-panel-left'
    | 'tab-layout-list' | 'tab-card-stack' | 'tab-trello' | 'tab-scroll-text' | 'tab-users' | 'tab-file-x'
    | 'header-log-out' | 'header-bell' | 'header-layout-grid' | 'header-chat-z' | 'header-modular'
    | 'tool-expand' | 'tool-excel' | 'tool-columns-3' | 'tool-pencil' | 'tool-search' | 'tool-clock'
    | 'tool-plus' | 'tool-filter' | 'tool-dots-vertical' | 'tool-list-filter' | 'tool-trash-2'
    | 'tool-arrow-up' | 'tool-chevron-down' | 'tool-x'
    | 'menu-monitor' | 'menu-file-spreadsheet' | 'menu-folder-tree'
    | 'table-clipboard-list' | 'table-octagon-alert' | 'table-radio-tower'
    | 'badge-arrow-up' | 'badge-arrow-down'
    | 'palette-book-text' | 'palette-table' | 'palette-map-pin' | 'palette-radio-tower';

interface FigmaIconProps {
    name: FigmaIconName;
    /** Rendered size in px. The Figma side-menu icons are 18, every other icon is 16.
     *  Leave it out to size the icon with w-* / h-* classes instead (default 16). */
    size?: number;
    /** Only for icons that are not square in Figma (e.g. header-modular is 18×16). */
    width?: number;
    height?: number;
    className?: string;
}

export const FigmaIcon: React.FC<FigmaIconProps> = ({ name, size, width, height, className = '' }) => {
    const url = `url(/icons/figma/${name}.svg)`;
    const sized = size !== undefined || width !== undefined || height !== undefined;
    const classSized = /(^|\s)(w|h|size)-/.test(className);
    return (
        <span
            aria-hidden="true"
            className={`inline-block shrink-0 bg-current ${!sized && !classSized ? 'w-4 h-4' : ''} ${className}`}
            style={{
                ...(sized ? { width: width ?? size ?? 16, height: height ?? size ?? 16 } : {}),
                WebkitMaskImage: url,
                maskImage: url,
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
                WebkitMaskSize: '100% 100%',
                maskSize: '100% 100%',
            }}
        />
    );
};
