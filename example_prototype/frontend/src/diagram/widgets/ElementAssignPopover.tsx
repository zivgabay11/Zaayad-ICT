import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanContext } from '../../common/context/PlanContext';
import { DiagramElement } from '../../common/utilities/types';
import { formatUnitName } from '../../common/utilities/formatting';
import { mockUnits } from '../../common/utilities/mockData';
import { getUnitColor } from '../../common/utilities/colors';
import { SystemUnit } from '../../common/utilities/types';

interface Props {
    element: DiagramElement;
    sessionUnit: SystemUnit | null;
    onConfirm: (phaseId: string, unitCode: number) => void;
    onCancel: () => void;
}

export const ElementAssignPopover: React.FC<Props> = ({ element, sessionUnit, onConfirm, onCancel }) => {
    const { t, i18n } = useTranslation();
    const { activePlan } = usePlanContext();

    const phases = activePlan?.phases || [];
    const units = activePlan?.units || [];
    const planUnitCodes = units.map(u => u.code);

    const [selectedPhaseId, setSelectedPhaseId] = useState<string>(element.phaseId || '');
    const [selectedUnitCode, setSelectedUnitCode] = useState<number>(element.unitCode || 0);

    const handleConfirm = () => {
        if (selectedPhaseId && selectedUnitCode) {
            onConfirm(selectedPhaseId, selectedUnitCode);
        }
    };

    return (
        <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 z-[2000] bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-600 p-4 min-w-[260px]">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-3">
                {t('diagram.assign_element')}
            </h4>

            {/* Phase Selector */}
            {!element.phaseId && (
                <div className="mb-3">
                    <label className="text-xs text-slate-500 dark:text-zinc-400 mb-1 block">
                        {t('diagram.select_phase')}
                    </label>
                    <select
                        value={selectedPhaseId}
                        onChange={e => setSelectedPhaseId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary"
                    >
                        <option value="">{t('diagram.select_phase')}</option>
                        {phases.map(phase => (
                            <option key={phase.id} value={phase.id}>
                                {phase.title?.[i18n.language] || phase.title?.['en'] || `Phase ${phase.index + 1}`}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Unit Selector */}
            {!element.unitCode && (
                <div className="mb-3">
                    <label className="text-xs text-slate-500 dark:text-zinc-400 mb-1 block">
                        {t('diagram.select_unit')}
                    </label>
                    <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
                        {units.map(unit => {
                            const fullUnit = mockUnits.find(u => u.code === unit.code);
                            const color = getUnitColor(unit.code, sessionUnit, planUnitCodes, mockUnits);
                            return (
                                <button
                                    key={unit.code}
                                    onClick={() => setSelectedUnitCode(unit.code)}
                                    className={`w-full text-start px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${selectedUnitCode === unit.code
                                            ? 'bg-primary/10 text-primary font-medium ring-1 ring-primary/30'
                                            : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                                        }`}
                                >
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    {formatUnitName(fullUnit || unit, t, i18n.language)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                <button
                    onClick={onCancel}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-700 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-600 transition-colors"
                >
                    {t('Cancel')}
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={!selectedPhaseId || !selectedUnitCode}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('diagram.confirm')}
                </button>
            </div>
        </div>
    );
};
