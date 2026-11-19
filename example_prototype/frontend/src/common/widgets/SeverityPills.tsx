import React from 'react';

// A row of colour-coded pill buttons for picking a severity/urgency-style value — the one
// shared widget behind every such picker in the app (Bum Manager demands & דמ"צים, Combat
// Log faults, Personal Task Log tasks), so "colours and behaviour" match everywhere instead
// of some screens using this pill row and others a plain <select>. Each feature keeps its
// own severity domain/colour map; only the rendering is shared.

export interface SeverityPillOption<T extends string | number> {
    key: T;
    label: string;
    color: string;
}

interface SeverityPillsProps<T extends string | number> {
    value: T;
    options: SeverityPillOption<T>[];
    onChange: (key: T) => void;
    disabled?: boolean;
    name?: string;
}

export function SeverityPills<T extends string | number>({ value, options, onChange, disabled, name }: SeverityPillsProps<T>) {
    return (
        <div className={`flex flex-wrap gap-1.5 ${disabled ? 'opacity-60 pointer-events-none' : ''}`} role="radiogroup" aria-label={name}>
            {options.map(opt => {
                const active = value === opt.key;
                return (
                    <button
                        key={String(opt.key)}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(opt.key)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors"
                        style={active ? { background: `${opt.color}1f`, color: opt.color, borderColor: `${opt.color}55` } : { borderColor: '#e2e8f0' }}
                    >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: opt.color }} />
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
