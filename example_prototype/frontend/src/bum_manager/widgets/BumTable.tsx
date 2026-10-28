import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { FigmaIcon } from '../../common/widgets/FigmaIcon';
import { BumDemand, BumDemandStatus, BumDemandType, BumSeverity } from '../../common/utilities/types';
import {
    BUM_SCOPES, BUM_SEVERITIES, BUM_SEVERITY_COLOR, BUM_STATUS_ORDER, BUM_STATUS_STRIPE, BumScope,
    applyBumScope, formatBumDateTime, isBumOverdue,
} from '../utilities/bum';

// Table view ("טבלה") — Figma table: one row per demand with a coloured status stripe on the
// leading edge, sortable columns, inline severity / type / status pickers, row selection (for
// bulk export / delete) and a scope dropdown ("כל המשימות"). `compact` is the slim variant the
// dashboard tile uses: just #, title, severity, status and due date.

type SortKey = 'createdAt' | 'title' | 'severity' | 'status' | 'dueAt' | 'category';

interface Props {
    demands: BumDemand[];
    categoryLabelOf: (demand: BumDemand) => string;
    now: number;
    compact?: boolean;
    onOpen: (demand: BumDemand) => void;
    onUpdate: (id: string, patch: Partial<BumDemand>) => void;
    onDeleteMany: (demands: BumDemand[]) => void;
    onExport: (demands: BumDemand[]) => void;
}

const selectClass = 'h-7 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-[12px] px-1.5 outline-none focus:border-primary cursor-pointer';

export const BumTable: React.FC<Props> = ({ demands, categoryLabelOf, now, compact = false, onOpen, onUpdate, onDeleteMany, onExport }) => {
    const { t } = useTranslation();
    const [scope, setScope] = useState<BumScope>('all');
    const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'dueAt', dir: 'asc' });
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const rows = useMemo(() => {
        const scoped = applyBumScope(demands, scope, now);
        const dir = sort.dir === 'asc' ? 1 : -1;
        const value = (d: BumDemand): string | number => {
            switch (sort.key) {
                case 'title': return d.title;
                case 'severity': return d.severity;
                case 'status': return BUM_STATUS_ORDER.indexOf(d.status);
                case 'category': return categoryLabelOf(d);
                case 'createdAt': return new Date(d.createdAt).getTime();
                default: return d.dueAt ? new Date(d.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
            }
        };
        return [...scoped].sort((a, b) => {
            const va = value(a); const vb = value(b);
            return (typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)) * dir;
        });
    }, [demands, scope, sort, now, categoryLabelOf]);

    const selectedRows = rows.filter(r => selected.has(r.id));
    const allSelected = rows.length > 0 && selectedRows.length === rows.length;

    const toggleSort = (key: SortKey) => setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
    const toggleRow = (id: string) => setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

    const SortHeader: React.FC<{ k: SortKey; children: React.ReactNode }> = ({ k, children }) => (
        <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 font-semibold hover:text-slate-900 dark:hover:text-white">
            {children}
            {sort.key === k && <FigmaIcon name="tool-arrow-up" size={12} className={sort.dir === 'asc' ? '' : 'rotate-180'} />}
        </button>
    );

    const th = 'px-3 py-2.5 text-start text-[12px] text-slate-500 dark:text-zinc-400 whitespace-nowrap';
    const td = 'px-3 py-2 text-[13px] text-slate-800 dark:text-zinc-100 align-middle';

    return (
        <div className="h-full flex flex-col min-h-0">
            {!compact && (
                <div className="flex items-center justify-between gap-3 px-1 pb-3 shrink-0">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('bumManager.table.title', { count: rows.length })}</h2>
                    <div className="flex items-center gap-2">
                        {selectedRows.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
                                <span>{t('bumManager.table.selected', { count: selectedRows.length })}</span>
                                <button onClick={() => onExport(selectedRows)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 dark:border-zinc-600 hover:bg-slate-100 dark:hover:bg-zinc-800"><Download className="w-3.5 h-3.5" />{t('bumManager.table.exportSelected')}</button>
                                <button onClick={() => onDeleteMany(selectedRows)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><FigmaIcon name="tool-trash-2" size={14} />{t('bumManager.table.deleteSelected')}</button>
                                <button onClick={() => setSelected(new Set())} aria-label={t('bumManager.table.clearSelection')} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"><FigmaIcon name="tool-x" size={14} /></button>
                            </div>
                        )}
                        <div className="relative">
                            <select value={scope} onChange={e => setScope(e.target.value as BumScope)} className={`${selectClass} h-8 ps-2 pe-7 appearance-none`}>
                                {BUM_SCOPES.map(s => <option key={s} value={s}>{t(`bumManager.scope.${s}`)}</option>)}
                            </select>
                            <FigmaIcon name="tool-chevron-down" size={14} className="absolute top-1/2 -translate-y-1/2 end-2 pointer-events-none text-slate-400" />
                        </div>
                    </div>
                </div>
            )}

            <div className="bum-scroll flex-1 min-h-0 overflow-auto rounded-lg border border-slate-200 dark:border-white/10">
                {rows.length === 0 ? (
                    <div className="h-full min-h-[120px] flex items-center justify-center text-sm text-slate-400 dark:text-zinc-600">{t('bumManager.table.noRows')}</div>
                ) : (
                    <table className={`w-full border-collapse ${compact ? '' : 'min-w-[1150px]'}`}>
                        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-800">
                            <tr>
                                {!compact && (
                                    <th className={`${th} w-9`}>
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))}
                                            aria-label={t('bumManager.table.selectAll')}
                                        />
                                    </th>
                                )}
                                <th className={th}>{t('bumManager.table.cols.num')}</th>
                                {!compact && <th className={th}><SortHeader k="createdAt">{t('bumManager.table.cols.createdAt')}</SortHeader></th>}
                                <th className={th}><SortHeader k="title">{t('bumManager.table.cols.title')}</SortHeader></th>
                                {!compact && <th className={th}>{t('bumManager.table.cols.description')}</th>}
                                {!compact && <th className={th}>{t('bumManager.table.cols.reporter')}</th>}
                                <th className={th}><SortHeader k="severity">{t('bumManager.table.cols.severity')}</SortHeader></th>
                                {!compact && <th className={th}>{t('bumManager.table.cols.type')}</th>}
                                {!compact && <th className={th}><SortHeader k="category">{t('bumManager.table.cols.category')}</SortHeader></th>}
                                {!compact && <th className={th}>{t('bumManager.table.cols.executor')}</th>}
                                <th className={th}><SortHeader k="status">{t('bumManager.table.cols.status')}</SortHeader></th>
                                <th className={th}><SortHeader k="dueAt">{t('bumManager.table.cols.dueAt')}</SortHeader></th>
                                {!compact && <th className={th}>{t('bumManager.table.cols.notes')}</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((d, i) => {
                                const overdue = isBumOverdue(d, now);
                                return (
                                    <tr
                                        key={d.id}
                                        onClick={() => onOpen(d)}
                                        className="cursor-pointer border-t border-slate-100 dark:border-white/[0.07] hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                                        style={{ boxShadow: `inset 4px 0 0 ${BUM_STATUS_STRIPE[d.status]}` }}
                                        data-demand-row={d.id}
                                    >
                                        {!compact && (
                                            <td className={td} onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleRow(d.id)} aria-label={t('bumManager.table.selectRow')} />
                                            </td>
                                        )}
                                        <td className={`${td} text-slate-500 dark:text-zinc-400`}>{i + 1}</td>
                                        {!compact && <td className={`${td} whitespace-nowrap`} dir="ltr">{formatBumDateTime(d.createdAt)}</td>}
                                        <td className={`${td} font-semibold ${compact ? 'max-w-[220px] truncate' : 'whitespace-nowrap'}`}>{d.title}</td>
                                        {!compact && <td className={`${td} max-w-[300px] truncate text-slate-600 dark:text-zinc-300`} title={d.description}>{d.description}</td>}
                                        {!compact && (
                                            <td className={`${td} whitespace-nowrap`}>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-primary/15 text-primary text-[10px] font-bold">{t(`bumManager.agents.${d.reportingAgent}`).slice(0, 2)}</span>
                                                    {t(`bumManager.agents.${d.reportingAgent}`)}
                                                </span>
                                            </td>
                                        )}
                                        <td className={td} onClick={e => e.stopPropagation()}>
                                            <select
                                                value={d.severity}
                                                onChange={e => onUpdate(d.id, { severity: Number(e.target.value) as BumSeverity })}
                                                className={selectClass}
                                                style={{ color: BUM_SEVERITY_COLOR[d.severity], borderColor: `${BUM_SEVERITY_COLOR[d.severity]}99` }}
                                                aria-label={t('bumManager.table.cols.severity')}
                                            >
                                                {BUM_SEVERITIES.map(s => <option key={s} value={s}>{t('bumManager.severity', { n: s })}</option>)}
                                            </select>
                                        </td>
                                        {!compact && (
                                            <td className={td} onClick={e => e.stopPropagation()}>
                                                <select value={d.type} onChange={e => onUpdate(d.id, { type: e.target.value as BumDemandType })} className={selectClass} aria-label={t('bumManager.table.cols.type')}>
                                                    <option value="demand">{t('bumManager.type.demand')}</option>
                                                    <option value="instruction">{t('bumManager.type.instruction')}</option>
                                                </select>
                                            </td>
                                        )}
                                        {!compact && <td className={`${td} whitespace-nowrap`}>{categoryLabelOf(d)}</td>}
                                        {!compact && (
                                            <td className={`${td} whitespace-nowrap`}>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">{d.executor.slice(0, 2)}</span>
                                                    {d.executor}
                                                </span>
                                            </td>
                                        )}
                                        <td className={td} onClick={e => e.stopPropagation()}>
                                            <select
                                                value={d.status}
                                                onChange={e => onUpdate(d.id, { status: e.target.value as BumDemandStatus })}
                                                className={selectClass}
                                                aria-label={t('bumManager.table.cols.status')}
                                            >
                                                {BUM_STATUS_ORDER.map(s => <option key={s} value={s}>{t(`bumManager.status.${s}`)}</option>)}
                                            </select>
                                        </td>
                                        <td className={`${td} whitespace-nowrap ${overdue ? 'text-red-500 dark:text-red-400 font-semibold' : ''}`} dir="ltr">{formatBumDateTime(d.dueAt)}</td>
                                        {!compact && <td className={`${td} max-w-[180px] truncate text-slate-600 dark:text-zinc-300`} title={d.notes}>{d.notes}</td>}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
