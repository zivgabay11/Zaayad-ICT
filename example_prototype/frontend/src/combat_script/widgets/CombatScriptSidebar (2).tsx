import React from 'react';
import { useTranslation } from 'react-i18next';
import { mockUnits } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';

interface CombatScriptSidebarProps {
    unitCode: string;
    color: string; // Kept for backwards compatibility but unused in the new design
}

export const CombatScriptSidebar: React.FC<CombatScriptSidebarProps> = ({ unitCode }) => {
    const { t, i18n } = useTranslation();

    let label: string;
    if (unitCode === 'unassigned') {
        label = t('Unassigned');
    } else {
        const unit = mockUnits.find(u => u.code.toString() === unitCode);
        if (unit) {
            label = formatUnitName(unit as any, t, i18n.language);
        } else {
            label = unitCode;
        }
    }

    return (
        <div className="w-full h-full p-4 font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-zinc-800/20 border-e border-slate-200 dark:border-zinc-800 flex flex-col items-center justify-center">
            <span className="text-center capitalize">
                {label}
            </span>
        </div>
    );
};
