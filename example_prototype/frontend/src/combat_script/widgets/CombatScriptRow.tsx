import React from 'react';
import type { RowDefinition } from 'dnd-timeline';
import { useRow } from 'dnd-timeline';

interface CombatScriptRowProps extends RowDefinition {
    children: React.ReactNode;
    sidebar: React.ReactNode;
    isEven: boolean;
    onContextMenu?: (e: React.MouseEvent) => void;
    subrowCount?: number;
}

const SUBROW_HEIGHT = 38;

export const CombatScriptRow: React.FC<CombatScriptRowProps> = ({ id, children, sidebar, isEven, onContextMenu, subrowCount = 1 }) => {
    const { setNodeRef, rowWrapperStyle, rowStyle, rowSidebarStyle } = useRow({ id });

    // Read the document direction or pass it via context if preferred.
    // For simplicity, we can just detect it from the i18n language as done elsewhere.
    const isRtl = document.documentElement.dir === 'rtl';

    // Default fits 2 subrows; expands if more
    const rowContentHeight = Math.max(2, subrowCount) * SUBROW_HEIGHT + 8;

    return (
        <div
            className={isEven ? 'bg-slate-50/60 dark:bg-zinc-800/30' : 'bg-white dark:bg-zinc-900'}
            style={{ ...rowWrapperStyle, minHeight: rowContentHeight }}
        >
            <div style={{ ...rowSidebarStyle, left: isRtl ? 'auto' : 0, right: isRtl ? 0 : 'auto', zIndex: 10 }}>
                {sidebar}
            </div>
            <div
                ref={setNodeRef}
                style={{ ...rowStyle, minHeight: rowContentHeight }}
                onContextMenu={onContextMenu}
            >
                {children}
            </div>
        </div>
    );
};
