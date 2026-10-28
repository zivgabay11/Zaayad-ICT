import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Right-click menu for table / card rows. Rendered fixed at the cursor, clamped to the
// viewport; closes on outside click, Escape, scroll or resize. Items are either actionable
// rows, small non-clickable section headers (to group the choices of one action), or
// separators.

export type RowContextMenuItem =
    | { kind?: 'item'; key: string; label: string; icon?: React.ReactNode; color?: string; disabled?: boolean; hint?: string; onSelect: () => void }
    | { kind: 'header'; key: string; label: string }
    | { kind: 'separator'; key: string };

export interface RowContextMenuState {
    x: number;
    y: number;
    items: RowContextMenuItem[];
}

interface RowContextMenuProps {
    menu: RowContextMenuState | null;
    onClose: () => void;
}

export const RowContextMenu: React.FC<RowContextMenuProps> = ({ menu, onClose }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

    useLayoutEffect(() => {
        if (!menu || !ref.current) { setPos(null); return; }
        const { width, height } = ref.current.getBoundingClientRect();
        setPos({
            left: Math.max(8, Math.min(menu.x, window.innerWidth - width - 8)),
            top: Math.max(8, Math.min(menu.y, window.innerHeight - height - 8)),
        });
    }, [menu]);

    useEffect(() => {
        if (!menu) return;
        const close = () => onClose();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('resize', close);
        window.addEventListener('scroll', close, true);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('resize', close);
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('keydown', onKey);
        };
    }, [menu, onClose]);

    if (!menu) return null;

    return (
        <div
            className="fixed inset-0 z-[70]"
            onMouseDown={onClose}
            onContextMenu={(e) => { e.preventDefault(); onClose(); }}
        >
            <div
                ref={ref}
                role="menu"
                data-row-context-menu
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.preventDefault()}
                style={{ left: pos?.left ?? menu.x, top: pos?.top ?? menu.y, visibility: pos ? 'visible' : 'hidden' }}
                className="fixed min-w-[220px] max-w-[320px] py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#2a2e37] shadow-xl animate-in fade-in duration-100"
            >
                {menu.items.map(item => {
                    if (item.kind === 'separator') return <div key={item.key} className="my-1 h-px bg-slate-200 dark:bg-white/10" />;
                    if (item.kind === 'header') {
                        return <div key={item.key} className="px-3 pt-1.5 pb-1 text-[11px] font-semibold text-slate-400 dark:text-zinc-400">{item.label}</div>;
                    }
                    return (
                        <button
                            key={item.key}
                            role="menuitem"
                            data-menu-item={item.key}
                            disabled={item.disabled}
                            title={item.hint}
                            onClick={() => { onClose(); item.onSelect(); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-start text-slate-700 dark:text-zinc-100 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                            {item.icon ?? (item.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />)}
                            <span className="truncate">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
