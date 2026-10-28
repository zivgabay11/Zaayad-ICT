import React from 'react';

// The category panel of the דמ"צים and הנחיות מפקד sub-sections: one row per category (a
// direction, or a unit of the echelon tree) with its item count. Clicking a row toggles it as a
// filter; several can be selected at once and none selected means "everything" — the same
// multi-select the demands' categories panel has.

export interface BumFilterRow {
    key: string;
    label: string;
    color: string;
    count: number;
    icon?: React.ReactNode;
    depth?: number; // indentation for tree-shaped lists
    hint?: string;
}

interface Props {
    rows: BumFilterRow[];
    selectedKeys: string[];
    onToggle: (key: string) => void;
    testIdPrefix: string;
}

export const BumFilterRows: React.FC<Props> = ({ rows, selectedKeys, onToggle, testIdPrefix }) => (
    <div className="bum-scroll h-full overflow-y-auto flex flex-col gap-2.5 pe-1">
        {rows.map(row => {
            const isSelected = selectedKeys.includes(row.key);
            return (
                <button
                    key={row.key}
                    onClick={() => onToggle(row.key)}
                    aria-pressed={isSelected}
                    data-filter-row={`${testIdPrefix}:${row.key}`}
                    style={row.depth ? { marginInlineStart: `${Math.min(row.depth, 4) * 14}px` } : undefined}
                    className={`text-start rounded-lg border px-3 py-2.5 flex items-center gap-3 transition-colors ${isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-200 dark:border-white/15 bg-white dark:bg-white/[0.06] hover:border-slate-300 dark:hover:border-white/30'}`}
                >
                    <span className="w-9 h-9 rounded-md flex items-center justify-center text-white shrink-0" style={{ background: row.color }}>
                        {row.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                        <span className="block text-base font-bold text-slate-900 dark:text-white truncate">{row.label}</span>
                        {row.hint && <span className="block text-xs text-slate-500 dark:text-zinc-400 truncate">{row.hint}</span>}
                    </span>
                    <span className="text-2xl font-bold leading-none text-slate-900 dark:text-white shrink-0 min-w-[28px] text-center">{row.count}</span>
                </button>
            );
        })}
    </div>
);
