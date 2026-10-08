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

export function NavItem({ icon, label, active, disabled, onClick, isDarkMode, isCollapsed }: NavItemProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 gap-1 ${active ? 'bg-primary/10 text-primary font-medium' :
                disabled ? 'text-slate-400 dark:text-zinc-600 cursor-default' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}>
            <div className={`shrink-0 ${active ? 'text-primary' : ''}`}>{icon}</div>
            <span className="text-[10px] leading-tight text-center max-w-full px-0.5 break-words">
                {label}
            </span>
        </button>
    );
}
