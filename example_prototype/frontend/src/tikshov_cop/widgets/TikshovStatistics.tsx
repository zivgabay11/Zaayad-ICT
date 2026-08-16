import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { X } from 'lucide-react';
import { Card } from '../../common/widgets/Card';
import { TrackedDevice, TrackedDeviceType, ConnectionStatus } from '../../common/utilities/types';
import { getUnitAndDescendantCodes } from '../../common/utilities/mockData';
import { wasActiveDuringWindow } from '../../common/context/TikshovContext';
import { TikshovForceTable } from './TikshovForceTable';
import { UnitTreeSelect } from './UnitTreeSelect';
import { UnitReadinessExplorer } from './UnitReadinessExplorer';

// Statistics page (PRD 5.3/10.4): active-vs-total by device type, overall status
// distribution, both reflecting the selected time range — selecting a unit or a chart
// segment drills the same page to reveal the filtered force table beneath the charts.

interface TikshovStatisticsProps {
    devices: TrackedDevice[]; // already scoped to home + watched units
    rootUnitCodes: number[]; // home unit + watched units
    timeRangeMinutes: number;
}

const ALL_DEVICE_TYPES: TrackedDeviceType[] = ['sheked', 'dual', 'setz', 'maban', 'setz_modem', 'elad_green'];
const STATUS_ORDER: ConnectionStatus[] = ['active', 'inactive', 'flapping'];
const STATUS_COLORS: Record<ConnectionStatus, string> = { active: '#34d399', inactive: '#a1a1aa', flapping: '#f0b429' };
const TOTAL_BAR_COLOR = '#a1a1aa';
const ACTIVE_BAR_COLOR = '#34d399';

interface Drilldown {
    deviceType?: TrackedDeviceType;
    status?: ConnectionStatus;
}

export const TikshovStatistics: React.FC<TikshovStatisticsProps> = ({ devices, rootUnitCodes, timeRangeMinutes }) => {
    const { t, i18n } = useTranslation();
    const [unitFilters, setUnitFilters] = useState<number[]>([]);
    const [drilldown, setDrilldown] = useState<Drilldown | null>(null);

    const scopedDevices = useMemo(() => {
        if (unitFilters.length === 0) return devices;
        const codes = new Set<number>();
        unitFilters.forEach(code => getUnitAndDescendantCodes(code).forEach(c => codes.add(c)));
        return devices.filter(d => codes.has(d.unitCode));
    }, [devices, unitFilters]);

    const byDeviceType = useMemo(() => ALL_DEVICE_TYPES.map(type => {
        const inType = scopedDevices.filter(d => d.deviceType === type);
        return {
            type,
            label: t(`tikshovCop.deviceTypes.${type}`),
            total: inType.length,
            active: inType.filter(d => d.connectionStatus === 'active').length,
        };
    }), [scopedDevices, t, i18n.language]);

    const byStatus = useMemo(() => STATUS_ORDER.map(status => ({
        status,
        label: t(`tikshovCop.status.${status}`),
        value: scopedDevices.filter(d => d.connectionStatus === status).length,
    })).filter(s => s.value > 0), [scopedDevices, t, i18n.language]);

    const activeNow = scopedDevices.filter(d => d.connectionStatus === 'active').length;
    const activeInRange = scopedDevices.filter(d => wasActiveDuringWindow(d, timeRangeMinutes)).length;

    const drilldownDevices = useMemo(() => {
        if (!drilldown) return [];
        return scopedDevices.filter(d =>
            (!drilldown.deviceType || d.deviceType === drilldown.deviceType) &&
            (!drilldown.status || d.connectionStatus === drilldown.status)
        );
    }, [scopedDevices, drilldown]);

    return (
        <div className="flex flex-col h-full min-h-0 overflow-y-auto pe-1">
            <div className="flex items-center gap-2 mb-4 shrink-0">
                <UnitTreeSelect
                    rootCodes={rootUnitCodes}
                    selected={unitFilters}
                    onChange={codes => { setUnitFilters(codes); setDrilldown(null); }}
                />
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-3 gap-3 mb-4 shrink-0">
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">{t('tikshovCop.stats.totalForces')}</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{scopedDevices.length}</div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">{t('tikshovCop.stats.activeNow')}</div>
                    <div className="text-2xl font-bold" style={{ color: ACTIVE_BAR_COLOR }}>{activeNow}</div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">{t('tikshovCop.stats.activeInRange')}</div>
                    <div className="text-2xl font-bold text-slate-700 dark:text-zinc-200">{activeInRange}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
                <Card title={t('tikshovCop.stats.byDeviceType')}>
                    <div className="h-64" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={byDeviceType} barGap={4} onClick={(e: any) => {
                                const p = e?.activePayload?.[0]?.payload;
                                if (p) setDrilldown({ deviceType: p.type });
                            }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--tikshov-grid, #27272a)" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#71717a" />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#71717a" width={28} />
                                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="total" name={t('tikshovCop.stats.total')} fill={TOTAL_BAR_COLOR} radius={[4, 4, 0, 0]} cursor="pointer" />
                                <Bar dataKey="active" name={t('tikshovCop.status.active')} fill={ACTIVE_BAR_COLOR} radius={[4, 4, 0, 0]} cursor="pointer" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title={t('tikshovCop.stats.statusDistribution')}>
                    <div className="h-64" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={byStatus}
                                    dataKey="value"
                                    nameKey="label"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    cursor="pointer"
                                    onClick={(p: any) => setDrilldown({ status: p.status })}
                                >
                                    {byStatus.map(entry => (
                                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} stroke="var(--tikshov-surface, #18181b)" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className="mt-4 shrink-0">
                <UnitReadinessExplorer rootCodes={rootUnitCodes} allDevices={devices} />
            </div>

            {drilldown && (
                <div className="mt-4 flex-1 min-h-[280px] flex flex-col">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                        <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                            {t('tikshovCop.stats.drilldownTitle')}
                            {drilldown.deviceType && ` · ${t(`tikshovCop.deviceTypes.${drilldown.deviceType}`)}`}
                            {drilldown.status && ` · ${t(`tikshovCop.status.${drilldown.status}`)}`}
                        </span>
                        <button
                            onClick={() => setDrilldown(null)}
                            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" /> {t('tikshovCop.stats.clearDrilldown')}
                        </button>
                    </div>
                    <div className="flex-1 min-h-0">
                        <TikshovForceTable
                            key={`${drilldown.deviceType ?? 'any'}-${drilldown.status ?? 'any'}-${unitFilters.join(',')}`}
                            devices={drilldownDevices}
                            timeRangeMinutes={timeRangeMinutes}
                            rootUnitCodes={rootUnitCodes}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
