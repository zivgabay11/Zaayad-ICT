import React from 'react';

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    isDarkMode: boolean;
    isCollapsed?: boolean;
}

// Side-menu entry, per the Figma "side menu 01" component: a 40×40 icon button (radius 6) with a
// 12px / 16px label under it (2px gap). Resting button = Neutral/4, active button = Accent/9 with
// a #5a78ff border and shadow-0, active label is bold. Icons should be 18px (see FigmaIcon).
export function NavItem({ icon, label, active, disabled, onClick, isDarkMode, isCollapsed }: NavItemProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            className={`group w-full flex flex-col items-center gap-0.5 ${disabled ? 'opacity-40 cursor-default' : ''}`}>
            <span
                className={`flex items-center justify-center w-10 h-10 rounded-md border transition-colors ${active
                    ? 'bg-primary border-[#5a78ff] text-white shadow-[0_1px_4px_rgba(0,0,0,0.25)]'
                    : `border-transparent bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 ${disabled ? '' : 'group-hover:bg-slate-200 dark:group-hover:bg-zinc-700'}`
                    }`}>
                {icon}
            </span>
            <span
                className={`text-xs leading-4 tracking-[0.04px] text-center max-w-full px-1 break-words text-slate-700 dark:text-zinc-300 ${active ? 'font-bold' : 'font-semibold'}`}>
                {label}
            </span>
        </button>
    );
}
