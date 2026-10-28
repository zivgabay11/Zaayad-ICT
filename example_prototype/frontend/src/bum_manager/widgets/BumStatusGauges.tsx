import React from 'react';
import { useTranslation } from 'react-i18next';
import { BumStats } from '../utilities/bum';

// "סטטוס משימות" — the dashboard's analytics strip: the total count plus four half-circle
// gauges (all / completed / overdue / not started) as shares of the filtered demands.

const R = 62;
const CX = 80;
const CY = 80;
const ARC = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

const Gauge: React.FC<{ title: string; pct: number; color: string; testId: string }> = ({ title, pct, color, testId }) => (
    <div className="flex flex-col items-center gap-1 min-w-0" data-gauge={testId}>
        <div className="text-[19px] font-bold text-slate-900 dark:text-white text-center">{title}</div>
        <svg viewBox="0 0 160 96" className="w-full max-w-[190px]" role="img" aria-label={`${title} ${pct}%`}>
            <path d={ARC} fill="none" strokeWidth={20} strokeLinecap="butt" className="stroke-slate-200 dark:stroke-slate-700" pathLength={100} />
            {pct > 0 && <path d={ARC} fill="none" stroke={color} strokeWidth={20} strokeLinecap="butt" pathLength={100} strokeDasharray={`${pct} 100`} />}
            <text x={CX} y={CY + 6} textAnchor="middle" className="fill-slate-900 dark:fill-white" style={{ fontSize: 17, fontWeight: 700 }}>{pct}%</text>
        </svg>
    </div>
);

export const BumStatusGauges: React.FC<{ stats: BumStats }> = ({ stats }) => {
    const { t } = useTranslation();
    return (
        <div className="h-full flex items-center justify-between gap-6 px-4">
            <div className="flex items-center gap-4 shrink-0">
                <div className="w-[3px] h-14 bg-primary rounded-full" />
                <div>
                    <div className="text-5xl font-bold leading-none text-slate-900 dark:text-white" data-total-count>{stats.total}</div>
                    <div className="mt-2 text-[15px] font-semibold text-slate-700 dark:text-zinc-200">{t('bumManager.dashboard.totalTasks')}</div>
                </div>
            </div>
            <div className="flex-1 grid grid-cols-4 gap-4 min-w-0">
                <Gauge testId="all" title={t('bumManager.dashboard.gauges.all')} pct={stats.total > 0 ? 100 : 0} color="#a855f7" />
                <Gauge testId="done" title={t('bumManager.dashboard.gauges.done')} pct={stats.donePct} color="#22c55e" />
                <Gauge testId="overdue" title={t('bumManager.dashboard.gauges.overdue')} pct={stats.overduePct} color="#fbbf24" />
                <Gauge testId="notStarted" title={t('bumManager.dashboard.gauges.notStarted')} pct={stats.notStartedPct} color="#f87171" />
            </div>
        </div>
    );
};
