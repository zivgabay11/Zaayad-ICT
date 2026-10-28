import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FigmaIcon } from '../../common/widgets/FigmaIcon';
import { BumDemand } from '../../common/utilities/types';
import { BUM_STATUS_STRIPE, formatBumDue, isBumOverdue } from '../utilities/bum';
import { NeutralBadge, SeverityBadge, UnitCrests } from './BumBadges';

// A demand as a tile — the Figma kanban card: bold title, severity + category badges, a light
// description, a divider, then the unit crests and the due date. A coloured stripe on the
// leading edge (right, in Hebrew) shows the lifecycle status. `compact` is the slimmer variant
// used inside the category tiles (title, due date and severity only).

interface Props {
    demand: BumDemand;
    categoryLabel: string;
    now: number;
    compact?: boolean;
    // The dashboard's narrow kanban columns: badges move down to the footer row (as in the
    // Figma dashboard) so the title keeps the full width of the card.
    dense?: boolean;
    onOpen: (demand: BumDemand) => void;
    onDelete: (demand: BumDemand) => void;
}

const CardMenu: React.FC<{ demand: BumDemand; onOpen: Props['onOpen']; onDelete: Props['onDelete'] }> = ({ demand, onOpen, onDelete }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    return (
        <div ref={ref} className="relative" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <button
                onClick={() => setOpen(o => !o)}
                aria-label={t('bumManager.menu.actions')}
                className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100 hover:bg-slate-200/60 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            >
                <FigmaIcon name="tool-dots-vertical" />
            </button>
            {open && (
                <div className="absolute z-30 top-full mt-1 start-0 min-w-[130px] rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl py-1 text-sm">
                    <button onClick={() => { setOpen(false); onOpen(demand); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-start text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700">
                        <FigmaIcon name="tool-pencil" size={14} /> {t('bumManager.menu.edit')}
                    </button>
                    <button onClick={() => { setOpen(false); onDelete(demand); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <FigmaIcon name="tool-trash-2" size={14} /> {t('bumManager.menu.delete')}
                    </button>
                </div>
            )}
        </div>
    );
};

export const DemandCard: React.FC<Props> = ({ demand, categoryLabel, now, compact = false, dense = false, onOpen, onDelete }) => {
    const { t } = useTranslation();
    const overdue = isBumOverdue(demand, now);
    const stripe = BUM_STATUS_STRIPE[demand.status];

    if (compact) {
        return (
            <div
                onClick={() => onOpen(demand)}
                className="group relative cursor-pointer rounded-md border border-slate-200 dark:border-white/15 bg-white dark:bg-white/[0.06] ps-3.5 pe-2.5 py-2 hover:border-slate-300 dark:hover:border-white/30 transition-colors"
            >
                <span className="absolute inset-y-0 start-0 w-[4px] rounded-s-md" style={{ background: stripe }} />
                <div className="flex items-start justify-between gap-1">
                    <div className="text-[13px] font-bold leading-snug text-slate-900 dark:text-white line-clamp-2">{demand.title}</div>
                    <CardMenu demand={demand} onOpen={onOpen} onDelete={onDelete} />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px]">
                    <SeverityBadge severity={demand.severity} />
                    <span className={overdue ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-slate-600 dark:text-zinc-300'}>
                        {t('bumManager.due', { date: formatBumDue(demand.dueAt) })}
                    </span>
                </div>
            </div>
        );
    }

    const dueLabel = (
        <span className={`text-[13px] whitespace-nowrap ${overdue ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-slate-700 dark:text-zinc-200'}`}>
            {t('bumManager.due', { date: formatBumDue(demand.dueAt) })}
        </span>
    );

    return (
        <div
            onClick={() => onOpen(demand)}
            className="group relative cursor-pointer rounded-md border border-slate-200 dark:border-white/20 bg-white dark:bg-white/[0.07] shadow-sm ps-5 pe-3 pt-2.5 pb-2 hover:border-slate-300 dark:hover:border-white/35 transition-colors"
        >
            <span className="absolute inset-y-0 start-0 w-[5px] rounded-s-lg" style={{ background: stripe }} />
            {dense ? (
                <>
                    <div className="flex items-start justify-between gap-2">
                        <div className="text-[15px] font-bold leading-6 text-slate-900 dark:text-white min-w-0 break-words">{demand.title}</div>
                        <CardMenu demand={demand} onOpen={onOpen} onDelete={onDelete} />
                    </div>
                    <p className="mt-0.5 mb-2 text-[13px] font-light leading-5 text-slate-600 dark:text-zinc-300 line-clamp-1">{demand.description}</p>
                    <div className="border-t border-slate-200 dark:border-white/15 pt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                        {dueLabel}
                        <span className="flex items-center gap-1.5">
                            <NeutralBadge>{categoryLabel}</NeutralBadge>
                            <SeverityBadge severity={demand.severity} />
                        </span>
                        <UnitCrests demand={demand} />
                    </div>
                </>
            ) : (
                <>
                    {/* The badges wrap onto their own line when the title needs the room. */}
                    <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                        <div className="flex-1 basis-[130px] text-[15px] font-bold leading-6 text-slate-900 dark:text-white min-w-0 break-words">{demand.title}</div>
                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                            <CardMenu demand={demand} onOpen={onOpen} onDelete={onDelete} />
                            <NeutralBadge>{categoryLabel}</NeutralBadge>
                            <SeverityBadge severity={demand.severity} />
                        </div>
                    </div>
                    <p className="mt-1 mb-2 text-[13px] font-light leading-5 text-slate-600 dark:text-zinc-300 line-clamp-2">{demand.description}</p>
                    <div className="border-t border-slate-200 dark:border-white/15 pt-2 flex items-center justify-between gap-2">
                        {dueLabel}
                        <UnitCrests demand={demand} />
                    </div>
                </>
            )}
        </div>
    );
};
