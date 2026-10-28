import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip } from 'lucide-react';
import { FigmaIcon } from '../../common/widgets/FigmaIcon';
import { BumDmatz } from '../../common/utilities/types';
import { formatBumDue } from '../utilities/bum';
import { DMATZ_STATUS_STRIPE, DmatzDirection } from '../utilities/dmatz';
import { NeutralBadge, SeverityBadge } from './BumBadges';

// A דמ"צ as a kanban tile — same card language as the demands' kanban (bold title, severity badge,
// light description, divider, footer) with the requested equipment, the counterpart unit
// (who it was raised to / came from) and the number of attached files.

interface Props {
    dmatz: BumDmatz;
    direction: DmatzDirection;
    counterpartLabel: string;
    // Only the unit a דמ"צ was raised to may move it through the lifecycle (drag between columns).
    movable: boolean;
    // The unit that raised it can also delete it.
    deletable: boolean;
    onOpen: (dmatz: BumDmatz) => void;
    onDelete: (dmatz: BumDmatz) => void;
}

const CardMenu: React.FC<Pick<Props, 'dmatz' | 'deletable' | 'onOpen' | 'onDelete'>> = ({ dmatz, deletable, onOpen, onDelete }) => {
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
                    <button onClick={() => { setOpen(false); onOpen(dmatz); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-start text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700">
                        <FigmaIcon name="tool-pencil" size={14} /> {t(deletable ? 'bumManager.menu.edit' : 'bumManager.dmatz.menu.open')}
                    </button>
                    {deletable && (
                        <button onClick={() => { setOpen(false); onDelete(dmatz); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <FigmaIcon name="tool-trash-2" size={14} /> {t('bumManager.menu.delete')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export const DmatzCard: React.FC<Props> = ({ dmatz, direction, counterpartLabel, movable, deletable, onOpen, onDelete }) => {
    const { t } = useTranslation();
    const stripe = DMATZ_STATUS_STRIPE[dmatz.status];

    return (
        <div
            onClick={() => onOpen(dmatz)}
            data-dmatz-card={dmatz.id}
            className={`group relative cursor-pointer rounded-md border border-slate-200 dark:border-white/20 bg-white dark:bg-white/[0.07] shadow-sm ps-5 pe-3 pt-2.5 pb-2 hover:border-slate-300 dark:hover:border-white/35 transition-colors ${movable ? '' : 'cursor-default'}`}
        >
            <span className="absolute inset-y-0 start-0 w-[5px] rounded-s-lg" style={{ background: stripe }} />
            <div className="flex items-start justify-between gap-2">
                <div className="text-[15px] font-bold leading-6 text-slate-900 dark:text-white min-w-0 break-words">{dmatz.title}</div>
                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <CardMenu dmatz={dmatz} deletable={deletable} onOpen={onOpen} onDelete={onDelete} />
                    <SeverityBadge severity={dmatz.severity} />
                </div>
            </div>
            <div className="mt-1 text-[13px] font-semibold text-slate-700 dark:text-zinc-200">
                {dmatz.equipment} <span className="font-normal text-slate-500 dark:text-zinc-400">× {dmatz.quantity}</span>
            </div>
            <p className="mt-0.5 mb-2 text-[13px] font-light leading-5 text-slate-600 dark:text-zinc-300 line-clamp-2">{dmatz.description}</p>
            <div className="border-t border-slate-200 dark:border-white/15 pt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                <span className="text-[13px] whitespace-nowrap text-slate-700 dark:text-zinc-200">{t('bumManager.due', { date: formatBumDue(dmatz.dueAt) })}</span>
                <span className="flex items-center gap-1.5">
                    {dmatz.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[12px] text-slate-500 dark:text-zinc-300" title={t('bumManager.dmatz.attachmentsCount', { count: dmatz.attachments.length })}>
                            <Paperclip className="w-3.5 h-3.5" />{dmatz.attachments.length}
                        </span>
                    )}
                    <NeutralBadge>{t(direction === 'raised' ? 'bumManager.dmatz.toUnit' : 'bumManager.dmatz.fromUnit', { unit: counterpartLabel })}</NeutralBadge>
                </span>
            </div>
        </div>
    );
};
