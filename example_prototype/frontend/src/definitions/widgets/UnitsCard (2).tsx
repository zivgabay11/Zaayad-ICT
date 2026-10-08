import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plan, Unit } from '../../common/utilities/types';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { Reorder, useDragControls } from 'motion/react';
import { mockUnits } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';

interface Props {
    plan: Plan;
    onUpdate: (changes: Partial<Plan>) => void;
}

const UnitItem: React.FC<{
    unit: Unit;
    updateUnit: (code: number, updates: Partial<Unit>) => void;
    removeUnit: (code: number) => void;
}> = ({ unit, updateUnit, removeUnit }) => {
    const { t, i18n } = useTranslation();
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={unit}
            dragListener={false}
            dragControls={dragControls}
            className="select-none flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 p-2.5 rounded-xl shadow-sm group relative"
        >
            <div
                className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-zinc-600 hover:text-slate-500 touch-none"
                onPointerDown={(e) => dragControls.start(e)}
            >
                <GripVertical className="w-4 h-4" />
            </div>
            <select
                className="flex-1 min-w-0 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg ps-3 pe-8 py-1.5 text-sm text-slate-900 dark:text-zinc-100 outline-none focus:border-cyan-500 transition-colors"
                value={mockUnits.some(m => m.code === unit.code) ? unit.code.toString() : ''}
                onChange={(e) => {
                    const selected = mockUnits.find(m => m.code.toString() === e.target.value);
                    if (selected) {
                        updateUnit(unit.code, {
                            code: selected.code,
                            type: selected.type,
                            parentCode: selected.parentCode?.toString()
                        });
                    }
                }}
            >
                <option value="" disabled>{t('definitions.selectUnit', 'Select Unit')}</option>
                {mockUnits.map((mu) => (
                    <option key={mu.code} value={mu.code.toString()}>
                        {formatUnitName(mu, t, i18n.language)}
                    </option>
                ))}
            </select>
            <button onClick={() => removeUnit(unit.code)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
        </Reorder.Item>
    );
};

export const UnitsCard: React.FC<Props> = ({ plan, onUpdate }) => {
    const { t } = useTranslation();

    const addUnit = () => {
        const newUnit: Unit = {
            code: Date.now(), type: "brigade",

        };
        onUpdate({ units: [...plan.units, newUnit] });
    };

    const updateUnit = (code: number, updates: Partial<Unit>) => {
        onUpdate({
            units: plan.units.map(u => u.code === code ? { ...u, ...updates } : u)
        });
    };

    const removeUnit = (code: number) => {
        onUpdate({ units: plan.units.filter(u => u.code !== code) });
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-zinc-800 p-2 rounded-xl sticky top-0 border border-slate-100 dark:border-zinc-800">
                <span className="text-xs uppercase font-bold text-slate-500 tracking-wide px-2">{t('definitions.ourForces')}</span>
                <button onClick={addUnit} className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-white dark:hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-cyan-100 dark:hover:border-cyan-900 shadow-sm"><Plus className="w-3.5 h-3.5" /> {t('definitions.addUnit')}</button>
            </div>

            <div className="flex flex-col gap-3">
                <Reorder.Group axis="y" values={plan.units} onReorder={(newOrder) => onUpdate({ units: newOrder })} className="flex flex-col gap-3">
                    {plan.units.map(unit => (
                        <UnitItem key={unit.code} unit={unit} updateUnit={updateUnit} removeUnit={removeUnit} />
                    ))}
                </Reorder.Group>
                {plan.units.length === 0 && <div className="text-sm text-slate-400 italic text-center py-4">{t('definitions.noUnits')}</div>}
            </div>
        </div>
    );
};