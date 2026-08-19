import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, AlertTriangle, Hammer, Radio, CheckCircle2, Clock } from 'lucide-react';
import { CombatLogEvent } from '../../common/utilities/types';
import { computeSituationPicture } from '../../common/utilities/combatLog';

// Situation Picture (תמונת מצב) dashboard — PRD Section 7.2. Six cards, always reflecting
// the full event set (not the table's active filters), so a commander gets an objective
// snapshot at a glance regardless of what anyone happens to be filtering to below it.

interface SituationPictureDashboardProps {
    events: CombatLogEvent[];
}

const CARD_ICONS = { total: ClipboardList, critical: AlertTriangle, work: Hammer, spectrum: Radio, closed: CheckCircle2, stale: Clock };

export const SituationPictureDashboard: React.FC<SituationPictureDashboardProps> = ({ events }) => {
    const { t } = useTranslation();
    const picture = useMemo(() => computeSituationPicture(events, Date.now()), [events]);

    const cards = [
        {
            key: 'total', icon: CARD_ICONS.total, value: picture.totalEvents.total,
            title: t('combatLog.dashboard.totalEvents'),
            breakdown: t('combatLog.dashboard.totalEventsBreakdown', { open: picture.totalEvents.open, closed: picture.totalEvents.closedToday, pending: picture.totalEvents.pending }),
            accent: '#2563EB',
        },
        {
            key: 'critical', icon: CARD_ICONS.critical, value: picture.criticalFaults.total,
            title: t('combatLog.dashboard.criticalFaults'),
            breakdown: t('combatLog.dashboard.criticalFaultsBreakdown', { critical: picture.criticalFaults.critical, high: picture.criticalFaults.high }),
            accent: '#DC2626',
        },
        {
            key: 'work', icon: CARD_ICONS.work, value: picture.workEvents.activeNow + picture.workEvents.upcoming,
            title: t('combatLog.dashboard.workEvents'),
            breakdown: t('combatLog.dashboard.workEventsBreakdown', { active: picture.workEvents.activeNow, upcoming: picture.workEvents.upcoming }),
            accent: '#D97706',
        },
        {
            key: 'spectrum', icon: CARD_ICONS.spectrum, value: picture.activeSpectrum.active,
            title: t('combatLog.dashboard.activeSpectrum'),
            breakdown: t('combatLog.dashboard.activeSpectrumBreakdown', { active: picture.activeSpectrum.active, cancelled: picture.activeSpectrum.cancelled }),
            accent: '#0D9488',
        },
        {
            key: 'closed', icon: CARD_ICONS.closed, value: picture.closedToday.count,
            title: t('combatLog.dashboard.closedToday'),
            breakdown: t('combatLog.dashboard.closedTodayBreakdown', { minutes: picture.closedToday.avgHandlingMinutes }),
            accent: '#16A34A',
        },
        {
            key: 'stale', icon: CARD_ICONS.stale, value: picture.noUpdate.count,
            title: t('combatLog.dashboard.noUpdate'),
            breakdown: t('combatLog.dashboard.noUpdateBreakdown', { percent: picture.noUpdate.percentOfOpen }),
            accent: '#F0B429',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4 shrink-0">
            {cards.map(card => {
                const Icon = card.icon;
                return (
                    <div key={card.key} className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide leading-tight">{card.title}</span>
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0" style={{ background: `${card.accent}1f`, color: card.accent }}>
                                <Icon className="w-3.5 h-3.5" />
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white leading-none mb-1.5">{card.value}</div>
                        <div className="text-[11px] text-slate-400 dark:text-zinc-500 leading-snug">{card.breakdown}</div>
                    </div>
                );
            })}
        </div>
    );
};
