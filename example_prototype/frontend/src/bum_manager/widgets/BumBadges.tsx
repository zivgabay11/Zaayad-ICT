import React from 'react';
import { useTranslation } from 'react-i18next';
import { BumDemand, BumSeverity } from '../../common/utilities/types';
import { mockUnits } from '../../common/utilities/mockData';
import { BUM_SEVERITY_COLOR } from '../utilities/bum';

// Small shared pieces of the Bum Manager UI, matching the Figma badges: a coloured
// "דחיפות N" severity badge, a neutral category badge, and the unit crests shown at the foot
// of a card.

export const SeverityBadge: React.FC<{ severity: BumSeverity; className?: string }> = ({ severity, className = '' }) => {
    const { t } = useTranslation();
    const color = BUM_SEVERITY_COLOR[severity];
    return (
        <span
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-[3px] border px-2 py-[1px] text-[12px] font-semibold leading-4 ${className}`}
            style={{ color, borderColor: `${color}99`, background: `${color}14` }}
        >
            {t('bumManager.severity', { n: severity })}
        </span>
    );
};

export const NeutralBadge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-[3px] border border-slate-300 dark:border-zinc-600 bg-slate-100 dark:bg-black/20 px-2 py-[1px] text-[12px] font-medium leading-4 text-slate-600 dark:text-zinc-300 ${className}`}>
        {children}
    </span>
);

// Red crest = a division-level unit, green = a brigade-level one (from the Figma card
// footers). A card shows the crest of the unit that created the demand and, when a division
// assigned it to a brigade, the brigade's crest as well.
export const UnitCrests: React.FC<{ demand: BumDemand }> = ({ demand }) => {
    const codes = [demand.unitCode, demand.assignedUnitCode].filter((c): c is number => c !== undefined);
    const crests = Array.from(new Set(codes.map(code => (mockUnits.find(u => u.code === code)?.type === 'division' ? 'red' : 'green'))));
    return (
        <span className="flex items-center gap-1.5">
            {crests.map(c => (
                <img key={c} src={`/bum/crest-${c}.png`} alt="" className="h-[22px] w-auto object-contain opacity-90" />
            ))}
        </span>
    );
};
