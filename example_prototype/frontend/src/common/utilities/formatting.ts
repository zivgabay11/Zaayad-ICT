import { TFunction } from 'i18next';
import { Unit } from './types';

export const formatUnitName = (unit: Unit, t: TFunction, language: string): string => {
    if (unit.name && unit.name[language]) {
        return unit.name[language];
    }
    return `${t(`definitions.levels.${unit.type}`, { defaultValue: unit.type })} ${unit.code}`;
};

// Buckets a duration into the coarsest sensible unit (seconds/minutes/hours/days) — used
// throughout Tikshov COP for "last report", "inactive since", and "time in current status"
// (PRD 5.2, US-11). Feed minutes*60 in to reuse the same buckets for minute-scale durations.
export const formatRelativeSeconds = (totalSeconds: number, t: TFunction): string => {
    const seconds = Math.max(0, Math.round(totalSeconds));
    if (seconds < 60) return t('tikshovCop.time.secondsAgo', { count: Math.max(1, seconds) });
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return t('tikshovCop.time.minutesAgo', { count: minutes });
    const hours = Math.round(minutes / 60);
    if (hours < 24) return t('tikshovCop.time.hoursAgo', { count: hours });
    const days = Math.round(hours / 24);
    return t('tikshovCop.time.daysAgo', { count: days });
};

export const formatRelativeMinutes = (totalMinutes: number, t: TFunction): string =>
    formatRelativeSeconds(totalMinutes * 60, t);
