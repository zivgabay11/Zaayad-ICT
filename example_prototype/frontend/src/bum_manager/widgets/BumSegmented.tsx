import React from 'react';

// A small segmented switcher (same look as the dashboard's "columns / table" toggle): used for
// the sub-section switch of Bum Manager and for the demanding-party / receiving-party switch on
// the categories panel.

interface Option<K extends string> {
    key: K;
    label: string;
}

interface Props<K extends string> {
    options: Array<Option<K>>;
    value: K;
    onChange: (key: K) => void;
    ariaLabel?: string;
    testId?: string;
    size?: 'sm' | 'md';
}

export function BumSegmented<K extends string>({ options, value, onChange, ariaLabel, testId, size = 'sm' }: Props<K>) {
    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            data-segmented={testId}
            className={`inline-flex rounded-md bg-slate-100 dark:bg-white/10 p-0.5 font-medium ${size === 'md' ? 'text-sm' : 'text-xs'}`}
        >
            {options.map(option => (
                <button
                    key={option.key}
                    role="tab"
                    aria-selected={value === option.key}
                    data-segment={option.key}
                    onClick={() => onChange(option.key)}
                    className={`rounded transition-colors whitespace-nowrap ${size === 'md' ? 'px-4 py-1.5' : 'px-3 py-1'} ${value === option.key
                        ? 'bg-primary text-white font-semibold'
                        : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
