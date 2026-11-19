import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Pencil, ArrowUp, ArrowDown, ArrowUpDown, RefreshCw, Link2, Clock, ListPlus, ListChecks, ChevronDown } from 'lucide-react';
import { CombatLogEvent } from '../../common/utilities/types';
import { FigmaBadge, FigmaBadgeSelect, FigmaBadgeTone } from '../../common/widgets/FigmaBadge';
import { COMBAT_LOG_TYPE_COLORS, isTerminalStatus, isStaleEvent, getRecurringFaultGroup, getHandlingWorkEvent, COMBAT_LOG_STATUS_OPTIONS } from '../../common/utilities/combatLog';

// Main table view (PRD 7.1): exactly four columns — Start Time | Log Type | Title |
// Status — plus a color badge and the view/edit row actions. The recurring / handled-by /
// stale automations (Section C/B/E) are surfaced as small inline indicators inside the
// Title and Status cells so the column count stays exactly four, per spec.

interface CombatLogTableProps {
    events: CombatLogEvent[]; // already filtered + in display order
    allEvents: CombatLogEvent[]; // full set, so badges reflect ground truth regardless of filters
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRowContextMenu?: (e: React.MouseEvent, event: CombatLogEvent) => void;
    // Inline (no right-click) pull into my Personal Task Log: a hover-revealed button that
    // stays visible, highlighted, once the event is in my diary.
    getDiaryState?: (event: CombatLogEvent) => 'in' | 'out' | 'unsupported';
    onToggleDiary?: (event: CombatLogEvent) => void;
    // Inline status dropdown (outlined pill + chevron). Omit canEditStatus to keep it read-only.
    canEditStatus?: (event: CombatLogEvent) => boolean;
    onStatusChange?: (event: CombatLogEvent, status: string) => void;
}

// Status badge = Figma "Badge" (info = new/first status, success = in progress, neutral = finished).
function statusTone(type: CombatLogEvent['type'], status: string): FigmaBadgeTone {
    if (isTerminalStatus(type, status)) return 'neutral';
    return COMBAT_LOG_STATUS_OPTIONS[type][0] === status ? 'info' : 'success';
}

function formatStart(iso: string, lang: string): string {
    const d = new Date(iso);
    const locale = lang === 'he' ? 'he-IL' : 'en-GB';
    const date = d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: '2-digit' });
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return `${date} | ${time}`;
}

type SortField = 'start' | 'type' | 'title' | 'status';

export const CombatLogTable: React.FC<CombatLogTableProps> = ({ events, allEvents, onView, onEdit, onRowContextMenu, getDiaryState, onToggleDiary, canEditStatus, onStatusChange }) => {
    const { t, i18n } = useTranslation();
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

    const headerInner = 'inline-flex items-center gap-1';

    // Table + cell + badge dimensions come from the shared Figma tokens in index.css
    // (.figma-table / .figma-th / .figma-tr / .figma-td / .figma-badge).
    return (
        <div className="flex-1 min-h-0 overflow-auto">
            <table className="figma-table">
                <thead className="sticky top-0 z-10">
                    <tr>
                        {([['start', 'startTime'], ['type', 'logType'], ['title', 'title'], ['status', 'status']] as [SortField, string][]).map(([field, key]) => (
                            <th key={field} className="figma-th cursor-pointer select-none" onClick={() => toggleSort(field)}>
                                <div className={headerInner}>{t(`combatLog.columns.${key}`)} <SortIcon field={field} /></div>
                            </th>
                        ))}
                        <th className="figma-th w-28" />
                    </tr>
                </thead>
                <tbody>
                    {sorted.length === 0 ? (
                        <tr className="figma-tr"><td colSpan={5} className="figma-td text-center py-10" style={{ color: 'var(--figma-table-text-secondary)' }}>{t('combatLog.empty')}</td></tr>
                    ) : sorted.map(event => {
                        const color = COMBAT_LOG_TYPE_COLORS[event.type];
                        const recurringGroup = getRecurringFaultGroup(event, allEvents);
                        const handlingWork = event.type === 'ict_faults' ? getHandlingWorkEvent(event.id, allEvents) : undefined;
                        const stale = isStaleEvent(event, now);
                        const diaryState = getDiaryState?.(event);
                        const tone = statusTone(event.type, event.status);
                        const editable = !!onStatusChange && !!canEditStatus?.(event) && COMBAT_LOG_STATUS_OPTIONS[event.type].length > 1;
                        return (
                            <tr
                                key={event.id}
                                onDoubleClick={() => onView(event.id)}
                                onContextMenu={onRowContextMenu ? (e) => onRowContextMenu(e, event) : undefined}
                                data-combat-row={event.id}
                                className="figma-tr group cursor-pointer"
                            >
                                <td className="figma-td whitespace-nowrap">{formatStart(event.start, i18n.language)}</td>
                                <td className="figma-td whitespace-nowrap">
                                    <span className="inline-flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                                        {t(`combatLog.logTypes.${event.type}`)}
                                    </span>
                                </td>
                                <td className="figma-td max-w-[360px]">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate">{event.title}</span>
                                        {recurringGroup.length > 1 && (
                                            <FigmaBadge tone="warning" title={t('combatLog.badges.recurring', { count: recurringGroup.length })} className="shrink-0">
                                                <RefreshCw className="w-3 h-3" /> {recurringGroup.length}
                                            </FigmaBadge>
                                        )}
                                        {handlingWork && (
                                            <FigmaBadge tone="info" title={t('combatLog.badges.handledBy', { title: handlingWork.title })} className="shrink-0">
                                                <Link2 className="w-3 h-3" />
                                            </FigmaBadge>
                                        )}
                                    </div>
                                </td>
                                <td className="figma-td whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        {editable ? (
                                            <FigmaBadgeSelect
                                                tone={tone}
                                                value={event.status}
                                                options={COMBAT_LOG_STATUS_OPTIONS[event.type].map(v => ({ value: v, label: v }))}
                                                onChange={(v) => onStatusChange!(event, v)}
                                                ariaLabel={t('combatLog.columns.status')}
                                            />
                                        ) : (
                                            <FigmaBadge tone={tone}>{event.status}</FigmaBadge>
                                        )}
                                        {stale && (
                                            <FigmaBadge tone="error" title={t('combatLog.badges.stale')} className="animate-pulse">
                                                <Clock className="w-3 h-3" />
                                            </FigmaBadge>
                                        )}
                                    </div>
                                </td>
                                <td className="figma-td whitespace-nowrap">
                                    <div className="flex items-center gap-1">
                                        {diaryState && diaryState !== 'unsupported' ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onToggleDiary?.(event); }}
                                                onDoubleClick={(e) => e.stopPropagation()}
                                                data-diary-toggle={event.id}
                                                aria-pressed={diaryState === 'in'}
                                                title={diaryState === 'in' ? t('combatLog.rowMenu.removeFromMyDiary') : t('combatLog.rowMenu.addToMyDiary')}
                                                className={`p-1 rounded-[3px] transition-all ${diaryState === 'in'
                                                    ? 'text-primary bg-primary/10 hover:bg-primary/20 opacity-100'
                                                    : 'text-slate-400 hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}`}
                                            >
                                                {diaryState === 'in' ? <ListChecks className="w-4 h-4" /> : <ListPlus className="w-4 h-4" />}
                                            </button>
                                        ) : <span className="w-6 h-6" aria-hidden />}
                                        <button onClick={() => onView(event.id)} title={t('combatLog.actions.view')} className="p-1 rounded-[3px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onEdit(event.id)} title={t('combatLog.actions.edit')} className="p-1 rounded-[3px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors">
                                            <Pencil className="w-4 h-4" />
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
