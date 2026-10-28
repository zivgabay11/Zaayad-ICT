import React from 'react';
import { useTranslation } from 'react-i18next';
import { FigmaIcon } from '../../common/widgets/FigmaIcon';

// A titled panel of Bum Manager (Figma "Widgets": rounded, 4% white fill) with an optional
// time stamp, extra header controls and an expand button.
export const Tile: React.FC<{ title: string; stamp?: string; onExpand?: () => void; extra?: React.ReactNode; hideHeader?: boolean; children: React.ReactNode; className?: string }> = ({ title, stamp, onExpand, extra, hideHeader = false, children, className = '' }) => {
    const { t } = useTranslation();
    return (
        <section className={`flex flex-col min-h-0 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-sm p-4 ${className}`}>
            {!hideHeader && <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                <h2 className="flex items-baseline gap-2 text-lg font-bold text-slate-900 dark:text-white">
                    {title}
                    {stamp && <span className="text-[12px] font-normal text-slate-500 dark:text-zinc-400" dir="ltr">({stamp})</span>}
                </h2>
                <div className="flex items-center gap-2">
                    {extra}
                    {onExpand && (
                        <button onClick={onExpand} aria-label={t('bumManager.dashboard.expand')} title={t('bumManager.dashboard.expand')} className="p-1.5 rounded-md text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                            <FigmaIcon name="tool-expand" />
                        </button>
                    )}
                </div>
            </div>}
            <div className="flex-1 min-h-0">{children}</div>
        </section>
    );
};
