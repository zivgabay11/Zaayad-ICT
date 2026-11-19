import React from 'react';
import { ChevronDown } from 'lucide-react';

// Figma "Badge" component (design file "הורוס תקשוב", frame "יומן מבצעי"): 12/16 semibold,
// 1px border, radius 3, optional 16px chevron. Colours/dimensions live in index.css
// (.figma-badge + .figma-badge--<tone>); this file is just the shared React wrapper so every
// table renders status / severity cells the same way.

export type FigmaBadgeTone = 'info' | 'success' | 'warning' | 'error' | 'neutral';

interface FigmaBadgeProps {
    tone: FigmaBadgeTone;
    children: React.ReactNode;
    title?: string;
    className?: string;
}

export const FigmaBadge: React.FC<FigmaBadgeProps> = ({ tone, children, title, className = '' }) => (
    <span title={title} className={`figma-badge figma-badge--${tone} ${className}`}>{children}</span>
);

interface FigmaBadgeSelectProps {
    tone: FigmaBadgeTone;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    ariaLabel?: string;
}

// A real <select> dressed as the badge, with the chevron on the leading (left) edge exactly
// like the Figma cell. Clicks don't bubble so the row's open/double-click handlers stay quiet.
export const FigmaBadgeSelect: React.FC<FigmaBadgeSelectProps> = ({ tone, value, options, onChange, ariaLabel }) => (
    <div
        dir="ltr"
        className={`figma-badge figma-badge--${tone} relative !p-0`}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
    >
        <ChevronDown className="w-4 h-4 shrink-0 ms-2 pointer-events-none" />
        <select
            dir="rtl"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={ariaLabel}
            className="appearance-none bg-transparent text-inherit font-[inherit] text-[length:inherit] leading-[inherit] tracking-[inherit] cursor-pointer outline-none ps-2 pe-1 py-[3px] focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[3px]"
        >
            {options.map(o => <option key={o.value} value={o.value} className="text-slate-800 bg-white dark:bg-[#2a2e37] dark:text-white">{o.label}</option>)}
        </select>
    </div>
);
