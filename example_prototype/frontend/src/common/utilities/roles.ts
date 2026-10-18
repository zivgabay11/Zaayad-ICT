import { UserRole } from './types';

// Single source of truth for the 10 selectable roles — used by both the header role
// switcher (App.tsx) and the login screen's role picker, so they can never drift apart.
export const ALL_ROLES: UserRole[] = [
    'operationsOfficer',
    'telecomOfficer',
    'logistics',
    'control',
    'space',
    'planning',
    'monitoring',
    'continuity',
    'radioOfficer',
    'spectrumOfficer',
];

// Single source of truth for the SHORT role label shown in the header's role switcher —
// every other place that lists roles as a set of choices (Personal Task Log role badges,
// the Combat Log "assign to cell" pickers) must call this too, so the text is byte-identical
// to the header dropdown everywhere, not just the same 10 underlying values. Only
// 'operationsOfficer' has a distinct short form ("אג\"ם") vs. its long translation ("קצין
// אג\"ם", used e.g. in the login screen and the "מציאות מבצעית" box) — every other role's
// `roles.*` translation is already short, so it's used as-is.
export function getRoleShortLabel(t: (key: string) => string, role: UserRole): string {
    return role === 'operationsOfficer' ? t('header.operations') : t(`roles.${role}`);
}
