import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { TrackedDevice, TrackedDeviceType, ConnectionStatus } from '../../common/utilities/types';
import { mockUnits, getUnitAndDescendantCodes } from '../../common/utilities/mockData';
import { formatUnitName, formatRelativeSeconds, formatRelativeMinutes } from '../../common/utilities/formatting';
import { DEVICE_TYPE_COLORS } from '../../common/utilities/trackedDeviceIcon';
import { wasActiveDuringWindow } from '../../common/context/TikshovContext';
import { UnitTreeSelect } from './UnitTreeSelect';

// Unit force table (PRD 5.2/10.3): every tracked device in scope, sortable/filterable by
// every column, defaulting to inactive/flapping forces first so at-risk forces surface
// immediately (US-3/US-6).

interface TikshovForceTableProps {
    devices: TrackedDevice[]; // already scoped to home + watched units
    timeRangeMinutes: number;
    rootUnitCodes: number[]; // home unit + watched units, for the hierarchical unit picker
    initialUnitFilters?: number[];
    initialStatusFilter?: ConnectionStatus | 'all';
    initialDeviceTypeFilter?: TrackedDeviceType | 'all';
}

type SortField = 'callsign' | 'deviceType' | 'unit' | 'lastReport' | 'status' | 'statusDuration';
type SortDir = 'asc' | 'desc';

const STATUS_PRIORITY: Record<ConnectionStatus, number> = { inactive: 0, flapping: 1, active: 2 };
const STATUS_COLORS: Record<ConnectionStatus, string> = { active: '#34d399', inactive: '#a1a1aa', flapping: '#f0b429' };
const ALL_DEVICE_TYPES: TrackedDeviceType[] = ['sheked', 'dual', 'setz', 'maban', 'setz_modem', 'elad_green'];

function StatusPill({ status }: { status: ConnectionStatus }) {
    const { t } = useTranslation();
    return (
        <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${STATUS_COLORS[status]}1f`, color: STATUS_COLORS[status] }}
        >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[status] }} />
            {t(`tikshovCop.status.${status}`)}
        </span>
    );
}

export const TikshovForceTable: React.FC<TikshovForceTableProps> = ({
    devices, timeRangeMinutes, rootUnitCodes, initialUnitFilters = [], initialStatusFilter = 'all', initialDeviceTypeFilter = 'all',
}) => {
    const { t, i18n } = useTranslation();
    const [search, setSearch] = useState('');
    const [unitFilters, setUnitFilters] = useState<number[]>(initialUnitFilters);
    const [statusFilter, setStatusFilter] = useState<ConnectionStatus | 'all'>(initialStatusFilter);
    const [deviceTypeFilter, setDeviceTypeFilter] = useState<TrackedDeviceType | 'all'>(initialDeviceTypeFilter);
    const [sortField, setSortField] = useState<SortField>('status');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    // A picked unit implicitly includes everything beneath it — the recursive union used
    // everywhere else in Tikshov COP (home/watched scoping, the readiness explorer, etc.).
    const allowedUnitCodes = useMemo(() => {
        if (unitFilters.length === 0) return null;
        const set = new Set<number>();
        unitFilters.forEach(code => getUnitAndDescendantCodes(code).forEach(c => set.add(c)));
        return set;
    }, [unitFilters]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return devices.filter(d =>
            (!allowedUnitCodes || allowedUnitCodes.has(d.unitCode)) &&
            (statusFilter === 'all' || d.connectionStatus === statusFilter) &&
            (deviceTypeFilter === 'all' || d.deviceType === deviceTypeFilter) &&
            (!q || d.callsign.toLowerCase().includes(q))
        );
    }, [devices, allowedUnitCodes, statusFilter, deviceTypeFilter, search]);

    const sorted = useMemo(() => {
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...filtered].sort((a, b) => {
            switch (sortField) {
                case 'callsign': return a.callsign.localeCompare(b.callsign) * dir;
                case 'deviceType': return a.deviceType.localeCompare(b.deviceType) * dir;
                case 'unit': return (a.unitCode - b.unitCode) * dir;
                case 'lastReport': return (a.lastReportSecondsAgo - b.lastReportSecondsAgo) * dir;
                case 'statusDuration': return (a.statusDurationMinutes - b.statusDurationMinutes) * dir;
                case 'status':
                default:
                    return (STATUS_PRIORITY[a.connectionStatus] - STATUS_PRIORITY[b.connectionStatus]) * dir
                        || a.statusDurationMinutes * -1 * dir;
            }
        });
    }, [filtered, sortField, sortDir]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-zinc-600" />;
        return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
    };

    const headerClass = "px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 cursor-pointer select-none whitespace-nowrap";

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-3 shrink-0">
                <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 end-2.5 text-slate-400 dark:text-zinc-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('tikshovCop.searchCallsign')}
                        className="ps-2.5 pe-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-primary transition-colors w-40"
                    />
                </div>
                <UnitTreeSelect rootCodes={rootUnitCodes} selected={unitFilters} onChange={setUnitFilters} />
                <select
                    value={deviceTypeFilter}
                    onChange={e => setDeviceTypeFilter(e.target.value as any)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 outline-none focus:border-primary"
                >
                    <option value="all">{t('tikshovCop.allDeviceTypes')}</option>
                    {ALL_DEVICE_TYPES.map(type => (
                        <option key={type} value={type}>{t(`tikshovCop.deviceTypes.${type}`)}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 outline-none focus:border-primary"
                >
                    <option value="all">{t('tikshovCop.allStatuses')}</option>
                    {(['active', 'inactive', 'flapping'] as ConnectionStatus[]).map(s => (
                        <option key={s} value={s}>{t(`tikshovCop.status.${s}`)}</option>
                    ))}
                </select>
                <span className="text-xs text-slate-400 dark:text-zinc-500 ms-auto">
                    {t('tikshovCop.forcesCount', { count: sorted.length })}
                </span>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-200 dark:border-zinc-800">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-50 dark:bg-zinc-800/60 sticky top-0 z-10">
                        <tr>
                            <th className={headerClass} onClick={() => toggleSort('callsign')}>
                                <div className="flex items-center gap-1">{t('tikshovCop.columns.callsign')} <SortIcon field="callsign" /></div>
                            </th>
                            <th className={headerClass} onClick={() => toggleSort('deviceType')}>
                                <div className="flex items-center gap-1">{t('tikshovCop.columns.deviceType')} <SortIcon field="deviceType" /></div>
                            </th>
                            <th className="px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                                {t('tikshovCop.columns.subtype')}
                            </th>
                            <th className={headerClass} onClick={() => toggleSort('unit')}>
                                <div className="flex items-center gap-1">{t('tikshovCop.columns.unit')} <SortIcon field="unit" /></div>
                            </th>
                            <th className={headerClass} onClick={() => toggleSort('lastReport')}>
                                <div className="flex items-center gap-1">{t('tikshovCop.columns.lastConnection')} <SortIcon field="lastReport" /></div>
                            </th>
                            <th className={headerClass} onClick={() => toggleSort('status')}>
                                <div className="flex items-center gap-1">{t('tikshovCop.columns.status')} <SortIcon field="status" /></div>
                            </th>
                            <th className="px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                                {t('tikshovCop.columns.lastKnownLocation')}
                            </th>
                            <th className={headerClass} onClick={() => toggleSort('statusDuration')}>
                                <div className="flex items-center gap-1">{t('tikshovCop.columns.timeInStatus')} <SortIcon field="statusDuration" /></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-400 dark:text-zinc-500">
                                    {t('tikshovCop.noForces')}
                                </td>
                            </tr>
                        ) : sorted.map(device => {
                            const unit = mockUnits.find(u => u.code === device.unitCode);
                            const activeInRange = device.connectionStatus !== 'active' && wasActiveDuringWindow(device, timeRangeMinutes);
                            return (
                                <tr key={device.deviceId} className="border-t border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                                    <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{device.callsign}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: DEVICE_TYPE_COLORS[device.deviceType] }}>
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DEVICE_TYPE_COLORS[device.deviceType] }} />
                                            {t(`tikshovCop.deviceTypes.${device.deviceType}`)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap">{device.deviceSubtype ?? '—'}</td>
                                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-zinc-300 whitespace-nowrap">{unit ? formatUnitName(unit as any, t, i18n.language) : '—'}</td>
                                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-zinc-300 whitespace-nowrap">{formatRelativeSeconds(device.lastReportSecondsAgo, t)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <StatusPill status={device.connectionStatus} />
                                            {activeInRange && (
                                                <span title={t('tikshovCop.activeInRangeHint')} className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-xs font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                                        {device.position.lat.toFixed(4)}, {device.position.lng.toFixed(4)}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-zinc-300 whitespace-nowrap">{formatRelativeMinutes(device.statusDurationMinutes, t)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
