import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plan, Session } from '../../common/utilities/types';
import { mockUnits } from '../../common/utilities/mockData';
import { getUnitColor, LEVEL_0_COLOR, LEVEL_1_COLOR, CHILD_COLORS } from '../../common/utilities/colors';
import { formatUnitName } from '../../common/utilities/formatting';

interface Props {
    plan: Plan;
}

export const ColorLegendCard: React.FC<Props> = ({ plan }) => {
    const { t, i18n } = useTranslation();
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem('session');
        if (stored) {
            try {
                setSession(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse session", e);
            }
        }
    }, []);

    const sessionUnitFull = session ? mockUnits.find(u => u.code === session.unit.code) : null;

    // Build the legend items based on plan units + session perspective
    const legendItems: { name: string; color: string }[] = [];

    if (session && sessionUnitFull) {
        // 1. Level 1 (Parent), if present in mock units (or should we show it only if it exists?)
        // The requirements say "I'll see only 4 items if I added 2 brigades"
        // Wait, "The Legend contents will change in real-time based on the Units defined in the Units column."
        // And "So if, for example, I'm Division 1000, and I added 2 units of type Brigade... I'll see only 4 items:
        // Command (Cyan) - Division (Purple) - Brigade 100 (Green) - Brigade 200 (Blue)"
        
        // Let's add the Parent (Level 1) if it exists
        if (sessionUnitFull.parentCode) {
            const parent = mockUnits.find(u => u.code.toString() === sessionUnitFull.parentCode);
            if (parent) {
                legendItems.push({
                    name: `${t(`definitions.levels.${parent.type}`, { defaultValue: parent.type })}`, // Don't append code? Requirements say "Command (Cyan)" - no code.
                    color: getUnitColor(parent.code, session.unit, plan.units.map(u => u.code), mockUnits)
                });
            }
        }

        // 2. Level 0 (Self)
        legendItems.push({
            name: `${t(`definitions.levels.${sessionUnitFull.type}`, { defaultValue: sessionUnitFull.type })}`, // "Division"
            color: getUnitColor(sessionUnitFull.code, session.unit, plan.units.map(u => u.code), mockUnits)
        });

        // 3. Level -1 (Children added to plan)
        const planChildren = plan.units
            .filter(pu => {
                const fullUnit = mockUnits.find(u => u.code === pu.code);
                return fullUnit && fullUnit.parentCode === session.unit.code.toString();
            })
            .sort((a, b) => a.code - b.code);

        planChildren.forEach((child) => {
            const fullUnit = mockUnits.find(u => u.code === child.code);
            if (fullUnit) {
                legendItems.push({
                    name: formatUnitName(fullUnit, t, i18n.language),
                    color: getUnitColor(fullUnit.code, session.unit, plan.units.map(u => u.code), mockUnits)
                });
            }
        });
    }

    return (
        <div className="flex flex-col gap-3 px-1">
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-2">{t('definitions.colorLegendHelp', { defaultValue: 'Color legend for unit levels.' })}</p>
            {legendItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div
                        className="w-full py-2.5 px-4 rounded-xl text-center text-[13px] font-semibold tracking-wide text-white shadow flex-1"
                        style={{ backgroundColor: item.color }}
                    >
                        {item.name}
                    </div>
                </div>
            ))}
        </div>
    );
};