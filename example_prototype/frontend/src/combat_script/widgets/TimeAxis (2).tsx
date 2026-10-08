import React, { useMemo } from 'react';
import { useTimelineContext } from 'dnd-timeline';
import { useTranslation } from 'react-i18next';
import type { Plan } from '../../common/utilities/types';
import { getBaseTimestamp } from '../utilities/timelineHelpers';
import { mockPhases } from '../../common/utilities/mockData';

interface TimeAxisProps {
    plan: Plan;
}

export const TimeAxis: React.FC<TimeAxisProps> = ({ plan }) => {
    const { range, valueToPixels, sidebarWidth } = useTimelineContext();
    const { t, i18n } = useTranslation();
    const lang = i18n.language;

    const HOUR_MS = 3600000;
    const DAY_MS = 24 * HOUR_MS;

    // Determine scale level based on zoom
    type ScaleLevel = 'hour' | 'day' | 'week' | 'month' | 'year';
    const scaleLevel: ScaleLevel = useMemo(() => {
        const visibleDays = (range.end - range.start) / DAY_MS;
        if (visibleDays <= 4) return 'hour';
        if (visibleDays <= 30) return 'day';
        if (visibleDays <= 120) return 'week';
        if (visibleDays <= 730) return 'month';
        return 'year';
    }, [range]);

    // Determine tick interval in ms based on scale
    const tickIntervalHours = useMemo(() => {
        const visibleHours = (range.end - range.start) / HOUR_MS;
        if (visibleHours <= 12) return 1;
        if (visibleHours <= 24) return 2;
        if (visibleHours <= 48) return 4;
        if (visibleHours <= 96) return 6;
        return 12;
    }, [range]);

    // Generate time markers
    const timeMarkers = useMemo(() => {
        const markers: { time: number; dateLine: string; timeLine: string }[] = [];

        if (scaleLevel === 'hour') {
            const intervalMs = tickIntervalHours * HOUR_MS;
            const startTick = Math.floor(range.start / intervalMs) * intervalMs;
            for (let ts = startTick; ts <= range.end; ts += intervalMs) {
                const d = new Date(ts);
                const dateLine = d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const timeLine = d.toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                markers.push({ time: ts, dateLine, timeLine });
            }
        } else if (scaleLevel === 'day') {
            const startDay = new Date(range.start);
            startDay.setHours(0, 0, 0, 0);
            for (let ts = startDay.getTime(); ts <= range.end; ts += DAY_MS) {
                const d = new Date(ts);
                const dateLine = d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const timeLine = d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { weekday: 'short' });
                markers.push({ time: ts, dateLine, timeLine });
            }
        } else if (scaleLevel === 'week') {
            const startDate = new Date(range.start);
            startDate.setHours(0, 0, 0, 0);
            const dayOfWeek = startDate.getDay();
            startDate.setDate(startDate.getDate() - dayOfWeek);
            for (let ts = startDate.getTime(); ts <= range.end; ts += 7 * DAY_MS) {
                const d = new Date(ts);
                const dateLine = d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' });
                const endWeek = new Date(ts + 6 * DAY_MS);
                const timeLine = `${dateLine} - ${endWeek.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' })}`;
                markers.push({ time: ts, dateLine: d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }), timeLine });
            }
        } else if (scaleLevel === 'month') {
            const startDate = new Date(range.start);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            while (startDate.getTime() <= range.end) {
                const ts = startDate.getTime();
                const dateLine = startDate.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { year: 'numeric' });
                const timeLine = startDate.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'long' });
                markers.push({ time: ts, dateLine, timeLine });
                startDate.setMonth(startDate.getMonth() + 1);
            }
        } else {
            const startDate = new Date(range.start);
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            while (startDate.getTime() <= range.end) {
                const ts = startDate.getTime();
                const dateLine = '';
                const timeLine = startDate.getFullYear().toString();
                markers.push({ time: ts, dateLine, timeLine });
                startDate.setFullYear(startDate.getFullYear() + 1);
            }
        }

        return markers;
    }, [range, scaleLevel, tickIntervalHours, lang]);

    // Generate phase bands
    const phaseBands = useMemo(() => {
        const baseTs = getBaseTimestamp(plan);
        return plan.phases
            .filter(p => p.startOffsetHours != null && p.endOffsetHours != null)
            .sort((a, b) => a.index - b.index)
            .map(phase => {
                const phaseName = phase.title?.[lang] || phase.title?.he || phase.title?.en || '';
                const matchedPhase = mockPhases.find(mp => mp.index === phase.index);
                const phaseCode = matchedPhase
                    ? (matchedPhase.name[lang as 'en' | 'he'] || matchedPhase.name['en'])
                    : `${phase.index}`;

                return {
                    id: phase.id,
                    name: phaseName,
                    phaseCode,
                    startOffsetHours: phase.startOffsetHours!,
                    endOffsetHours: phase.endOffsetHours!,
                    start: baseTs + phase.startOffsetHours! * HOUR_MS,
                    end: baseTs + phase.endOffsetHours! * HOUR_MS,
                };
            });
    }, [plan, lang]);

    const formatOffset = (hours: number) => {
        const d = Math.floor(hours / 24);
        const h = hours % 24;
        if (d === 0) return `${t('H')}${h >= 0 ? '+' : ''}${h}`;
        return `${t('D')}${d >= 0 ? '+' : ''}${d}`;
    };

    return (
        <div className="sticky top-0 z-10 select-none pointer-events-none flex w-full">
            <div
                className="bg-slate-50 dark:bg-zinc-800/20 border-e border-b border-slate-200 dark:border-zinc-800 shrink-0"
                style={{ width: sidebarWidth }}
            />
            <div className="flex-1 min-w-0 flex flex-col relative">
                {/* Time markers row - two lines: date + time */}
                <div className="relative h-10 border-b border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
                    {timeMarkers.map(marker => {
                        const offset = valueToPixels(marker.time - range.start);
                        return (
                            <div
                                key={marker.time}
                                className="absolute top-0 h-full flex items-stretch"
                                style={lang === 'he' ? { right: `${offset}px` } : { left: `${offset}px` }}
                            >
                                <div className="w-px h-full bg-slate-300 dark:bg-zinc-600" />
                                <div className="flex flex-col justify-center ms-1.5">
                                    {marker.dateLine && (
                                        <span className="text-[9px] text-slate-400 dark:text-zinc-500 whitespace-nowrap leading-tight">
                                            {marker.dateLine}
                                        </span>
                                    )}
                                    <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-200 whitespace-nowrap leading-tight">
                                        {marker.timeLine}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Phase bands row */}
                {phaseBands.length > 0 && (
                    <div className="relative h-12 border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 overflow-hidden">
                        {phaseBands.map(band => {
                            const offset = valueToPixels(band.start - range.start);
                            const width = valueToPixels(band.end - band.start);
                            const startLabel = formatOffset(band.startOffsetHours);
                            const endLabel = formatOffset(band.endOffsetHours);

                            // Determine display mode based on pixel width
                            const displayMode = width >= 180 ? 'full' : width >= 60 ? 'compact' : 'marker';

                            if (displayMode === 'marker') {
                                // Vertical line with rotated label
                                return (
                                    <div
                                        key={band.id}
                                        className="absolute top-0 h-full flex items-center"
                                        style={lang === 'he' ? { right: `${offset}px` } : { left: `${offset}px` }}
                                    >
                                        <div className="w-px h-full bg-slate-400 dark:bg-zinc-500" />
                                        <span className="text-[9px] font-medium text-slate-600 dark:text-zinc-300 ms-1 whitespace-nowrap origin-left -rotate-0 truncate max-w-[50px]">
                                            {band.name}
                                        </span>
                                    </div>
                                );
                            }

                            if (displayMode === 'compact') {
                                // Name only with ellipsis
                                return (
                                    <div
                                        key={band.id}
                                        className="absolute top-0 h-full flex items-center justify-center border-x border-slate-200 dark:border-zinc-700 overflow-hidden"
                                        style={lang === 'he' ? { right: `${offset}px`, width: `${width}px` } : { left: `${offset}px`, width: `${width}px` }}
                                    >
                                        <span className="text-[11px] font-bold text-slate-800 dark:text-white truncate px-1">
                                            {band.name}
                                        </span>
                                    </div>
                                );
                            }

                            // Full display: name + badge + offsets
                            return (
                                <div
                                    key={band.id}
                                    className="absolute top-0 h-full flex flex-col items-center justify-center border-x border-slate-200 dark:border-zinc-700"
                                    style={lang === 'he' ? { right: `${offset}px`, width: `${width}px` } : { left: `${offset}px`, width: `${width}px` }}
                                >
                                    <div className="font-bold text-slate-800 dark:text-white text-xs leading-tight truncate px-1">
                                        {band.name}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300">
                                            {t('Phase')} {band.phaseCode}
                                        </span>
                                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                                            {startLabel} {t('to')} {endLabel}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
