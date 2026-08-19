import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Pencil, ArrowUp, ArrowDown, ArrowUpDown, RefreshCw, Link2, Clock } from 'lucide-react';
import { CombatLogEvent } from '../../common/utilities/types';
import { COMBAT_LOG_TYPE_COLORS, isTerminalStatus, isStaleEvent, getRecurringFaultGroup, getHandlingWorkEvent } from '../../common/utilities/combatLog';

// Main table view (PRD 7.1): exactly four columns — Start Time | Log Type | Title |
// Status — plus a color badge and the view/edit row actions. The recurring / handled-by /
// stale automations (Section C/B/E) are surfaced as small inline indicators inside the
// Title and Status cells so the column count stays exactly four, per spec.

interface CombatLogTableProps {
    events: CombatLogEvent[]; // already filtered + in display order
    allEvents: CombatLogEvent[]; // full set, so badges reflect ground truth regardless of filters
    onView: (id: string) => void;
    onEdit: (id: string) => void;
}

type SortField = 'start' | 'type' | 'title' | 'status';

export const CombatLogTable: React.FC<CombatLogTableProps> = ({ events, allEvents, onView, onEdit }) => {
    const { t } = useTranslation();
    const [sortField, setSortField] = useState<SortField>('start');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const now = Date.now();

    const sorted = useMemo(() => {
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...events].sort((a, b) => {
            switch (sortField) {
                case 'type': return a.type.localeCompare(b.type) * dir;
                case 'title': return a.title.localeCompare(b.title) * dir;
                case 'status': return a.status.localeCompare(b.status) * dir;
                case 'start':
                default:
                    return (new Date(a.start).getTime() - new Date(b.start).getTime()) * dir;
            }
        });
    }, [events, sortField, sortDir]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('desc'); }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-zinc-600" />;
        return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
    };

    const headerClass = "px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 cursor-pointer select-none whitespace-nowrap";

    return (
        <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 dark:border-zinc-800">
            <table className="w-full text-sm border-collapse">
                <thead className="bg-slate-50 dark:bg-zinc-800/60 sticky top-0 z-10">
                    <tr>
                        <th className={headerClass} onClick={() => toggleSort('start')}>
                            <div className="flex items-center gap-1">{t('combatLog.columns.startTime')} <SortIcon field="start" /></div>
                        </th>
                        <th className={headerClass} onClick={() => toggleSort('type')}>
                            <div className="flex items-center gap-1">{t('combatLog.columns.logType')} <SortIcon field="type" /></div>
                        </th>
                        <th className={headerClass} onClick={() => toggleSort('title')}>
                            <div className="flex items-center gap-1">{t('combatLog.columns.title')} <SortIcon field="title" /></div>
                        </th>
                        <th className={headerClass} onClick={() => toggleSort('status')}>
                            <div className="flex items-center gap-1">{t('combatLog.columns.status')} <SortIcon field="status" /></div>
                        </th>
                        <th className="px-3 py-2.5 w-20" />
                    </tr>
                </thead>
                <tbody>
                    {sorted.length === 0 ? (
                        <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-400 dark:text-zinc-500">{t('combatLog.empty')}</td></tr>
                    ) : sorted.map(event => {
                        const color = COMBAT_LOG_TYPE_COLORS[event.type];
                        const recurringGroup = getRecurringFaultGroup(event, allEvents);
                        const handlingWork = event.type === 'ict_faults' ? getHandlingWorkEvent(event.id, allEvents) : undefined;
                        const stale = isStaleEvent(event, now);
                        return (
                            <tr key={event.id} className="border-t border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                                <td className="px-3 py-2 text-xs text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                                    {new Date(event.start).toLocaleString()}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}1f`, color }}>
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                                        {t(`combatLog.logTypes.${event.type}`)}
                                    </span>
                                </td>
                                <td className="px-3 py-2 max-w-[360px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-900 dark:text-white truncate">{event.title}</span>
                                        {recurringGroup.length > 1 && (
                                            <span title={t('combatLog.badges.recurring', { count: recurringGroup.length })} className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 shrink-0">
                                                <RefreshCw className="w-2.5 h-2.5" /> {recurringGroup.length}
                                            </span>
                                        )}
                                        {handlingWork && (
                                            <span title={t('combatLog.badges.handledBy', { title: handlingWork.title })} className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 shrink-0">
                                                <Link2 className="w-2.5 h-2.5" />
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-xs font-medium ${isTerminalStatus(event.type, event.status) ? 'text-slate-500 dark:text-zinc-400' : 'text-slate-800 dark:text-zinc-100'}`}>
                                            {event.status}
                                        </span>
                                        {stale && (
                                            <span title={t('combatLog.badges.stale')} className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 animate-pulse">
                                                <Clock className="w-2.5 h-2.5" />
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => onView(event.id)} title={t('combatLog.actions.view')} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors">
                                            <Eye className="w-[15px] h-[15px]" />
                                        </button>
                                        <button onClick={() => onEdit(event.id)} title={t('combatLog.actions.edit')} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors">
                                            <Pencil className="w-[15px] h-[15px]" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
