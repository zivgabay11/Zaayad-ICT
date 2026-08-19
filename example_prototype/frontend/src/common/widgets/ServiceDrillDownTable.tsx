import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Download, X, ArrowUp, ArrowDown, ArrowUpDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { CommSiteService, ServiceSubItem } from '../utilities/types';
import { SUB_ITEM_PAYLOAD_COLUMNS, SERVICE_TYPE_COLORS } from '../utilities/commSiteService';
import { downloadCsv } from '../utilities/csvExport';

// Per-card drill-down detail table (PRD 5.4/10.3): sortable, filterable, paginated (~5
// rows/page, matching the reference screenshot), with a "download report" export of
// whatever is currently shown (US-6/US-7).

interface ServiceDrillDownTableProps {
    service: CommSiteService;
    subItems: ServiceSubItem[];
    onClose: () => void;
}

const PAGE_SIZE = 5;

export const ServiceDrillDownTable: React.FC<ServiceDrillDownTableProps> = ({ service, subItems, onClose }) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortKey, setSortKey] = useState('status');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);

    const columns = SUB_ITEM_PAYLOAD_COLUMNS[service.serviceType];
    const statusOptions = useMemo(() => Array.from(new Set(subItems.map(i => i.status))), [subItems]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return subItems.filter(item => {
            if (statusFilter !== 'all' && item.status !== statusFilter) return false;
            if (!q) return true;
            const haystack = [item.status, ...columns.map(c => String(item.payload[c] ?? ''))].join(' ').toLowerCase();
            return haystack.includes(q);
        });
    }, [subItems, search, statusFilter, columns]);

    const sorted = useMemo(() => {
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...filtered].sort((a, b) => {
            const av = sortKey === 'status' ? a.status : String(a.payload[sortKey] ?? '');
            const bv = sortKey === 'status' ? b.status : String(b.payload[sortKey] ?? '');
            return av.localeCompare(bv) * dir;
        });
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const clampedPage = Math.min(page, totalPages);
    const pageRows = sorted.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

    const toggleSort = (key: string) => {
        if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
        setPage(1);
    };

    const SortIcon = ({ colKey }: { colKey: string }) => {
        if (sortKey !== colKey) return <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-zinc-600" />;
        return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
    };

    const handleDownload = () => {
        const headers = [...columns.map(c => t(`commSiteDetail.columns.${c}`)), t('commSiteDetail.columns.status')];
        const rows = sorted.map(item => [...columns.map(c => String(item.payload[c] ?? '')), item.status]);
        downloadCsv(headers, rows, `${service.serviceType}-${service.siteId}-report.csv`);
    };

    const color = SERVICE_TYPE_COLORS[service.serviceType];
    const headerClass = "px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 cursor-pointer select-none whitespace-nowrap";

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t(`commSiteDetail.serviceTypes.${service.serviceType}`)}</h3>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 end-2.5 text-slate-400 dark:text-zinc-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder={t('commSiteDetail.drillDown.searchPlaceholder')}
                        className="ps-2.5 pe-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-primary transition-colors w-44"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 outline-none focus:border-primary"
                >
                    <option value="all">{t('commSiteDetail.drillDown.allStatuses')}</option>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors ms-auto"
                >
                    <Download className="w-3.5 h-3.5" /> {t('commSiteDetail.drillDown.downloadReport')}
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-50 dark:bg-zinc-800/60">
                        <tr>
                            {columns.map(c => (
                                <th key={c} className={headerClass} onClick={() => toggleSort(c)}>
                                    <div className="flex items-center gap-1">{t(`commSiteDetail.columns.${c}`)} <SortIcon colKey={c} /></div>
                                </th>
                            ))}
                            <th className={headerClass} onClick={() => toggleSort('status')}>
                                <div className="flex items-center gap-1">{t('commSiteDetail.columns.status')} <SortIcon colKey="status" /></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.length === 0 ? (
                            <tr><td colSpan={columns.length + 1} className="px-3 py-8 text-center text-sm text-slate-400 dark:text-zinc-500">{t('commSiteDetail.drillDown.empty')}</td></tr>
                        ) : pageRows.map(item => (
                            <tr key={item.subItemId} className="border-t border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                                {columns.map(c => (
                                    <td key={c} className="px-3 py-2 text-xs text-slate-700 dark:text-zinc-200 whitespace-nowrap">{item.payload[c]}</td>
                                ))}
                                <td className="px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-700 dark:text-zinc-200">{item.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-zinc-800">
                <span className="text-xs text-slate-400 dark:text-zinc-500">{t('commSiteDetail.drillDown.pageOf', { page: clampedPage, total: totalPages })}</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={clampedPage <= 1}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" /> {t('commSiteDetail.drillDown.prev')}
                    </button>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={clampedPage >= totalPages}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        {t('commSiteDetail.drillDown.next')} <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                    </button>
                </div>
            </div>
        </div>
    );
};
