import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, ArrowRightLeft, Users, Trash2, Minus, Type, Tag, Circle, Ruler, X as XIcon } from 'lucide-react';
import { usePlanContext } from '../../common/context/PlanContext';
import { formatUnitName } from '../../common/utilities/formatting';
import { mockUnits } from '../../common/utilities/mockData';
import { getUnitColor } from '../../common/utilities/colors';
import { SystemUnit } from '../../common/utilities/types';

interface Props {
    elementId: string;
    elementType: string;
    x: number;
    y: number;
    sessionUnit: SystemUnit | null;
    onEdit: (elementId: string) => void;
    onEditText: (elementId: string, text: string) => void;
    onChangePhase: (elementId: string, phaseId: string) => void;
    onChangeUnit: (elementId: string, unitCode: number) => void;
    onChangeStrokeWidth: (elementId: string, weight: number) => void;
    onAddLabel: (elementId: string, text: string) => void;
    onChangeArcDistance: (elementId: string, radiusKm: number) => void;
    onAddArcSecondRing: (elementId: string, radiusMeters: number) => void;
    onChangeArcSecondRing: (elementId: string, radiusKm: number) => void;
    onRemoveArcSecondRing: (elementId: string) => void;
    onDelete: (elementId: string) => void;
    onClose: () => void;
}

const STROKE_OPTIONS = [
    { key: 'thin', weight: 2 },
    { key: 'medium', weight: 4 },
    { key: 'thick', weight: 7 },
];

export const MapContextMenu: React.FC<Props> = ({
    elementId, elementType, x, y, sessionUnit, onEdit, onEditText, onChangePhase, onChangeUnit, onChangeStrokeWidth, onAddLabel, onChangeArcDistance, onAddArcSecondRing, onChangeArcSecondRing, onRemoveArcSecondRing, onDelete, onClose,
}) => {
    const { t, i18n } = useTranslation();
    const { activePlan } = usePlanContext();
    const [subMenu, setSubMenu] = useState<'phase' | 'unit' | 'stroke' | 'editText' | 'addLabel' | 'arcDistance' | 'arcSecondRing' | null>(null);
    const [textValue, setTextValue] = useState('');

    const phases = activePlan?.phases || [];
    const units = activePlan?.units || [];
    const planUnitCodes = units.map(u => u.code);

    const menuItemClass = "w-full text-start px-3 py-2 text-sm flex items-center gap-2 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors";

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[2000]" onClick={onClose} />

            {/* Menu */}
            <div
                className="absolute z-[2001] bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-slate-200 dark:border-zinc-600 py-1 min-w-[180px]"
                style={{ left: x, top: y }}
            >
                {subMenu === null && (
                    <>
                        {elementType === 'textLabel' ? (
                            <button
                                onClick={() => {
                                    const el = activePlan?.diagramElements?.find(e => e.id === elementId);
                                    setTextValue(el?.properties?.text || '');
                                    setSubMenu('editText');
                                }}
                                className={menuItemClass}
                            >
                                <Type className="w-4 h-4 text-slate-500" />
                                {t('diagram.edit_text')}
                            </button>
                        ) : (
                            <button
                                onClick={() => { onEdit(elementId); }}
                                className={menuItemClass}
                            >
                                <Pencil className="w-4 h-4 text-slate-500" />
                                {t('diagram.edit')}
                            </button>
                        )}
                        <button
                            onClick={() => setSubMenu('phase')}
                            className={menuItemClass}
                        >
                            <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                            {t('diagram.change_phase')}
                        </button>
                        <button
                            onClick={() => setSubMenu('unit')}
                            className={menuItemClass}
                        >
                            <Users className="w-4 h-4 text-slate-500" />
                            {t('diagram.change_unit')}
                        </button>
                        <button
                            onClick={() => setSubMenu('stroke')}
                            className={menuItemClass}
                        >
                            <Minus className="w-4 h-4 text-slate-500" />
                            {t('diagram.stroke_width')}
                        </button>
                        {elementType !== 'textLabel' && (
                            <button
                                onClick={() => {
                                    const el = activePlan?.diagramElements?.find(e => e.id === elementId);
                                    setTextValue(el?.properties?.label || '');
                                    setSubMenu('addLabel');
                                }}
                                className={menuItemClass}
                            >
                                <Tag className="w-4 h-4 text-slate-500" />
                                {t('diagram.add_label')}
                            </button>
                        )}
                        {elementType === 'arc' && (
                            <>
                                <button
                                    onClick={() => {
                                        const el = activePlan?.diagramElements?.find(e => e.id === elementId);
                                        setTextValue(el?.properties?.radius ? String((el.properties.radius / 1000).toFixed(1)) : '18.5');
                                        setSubMenu('arcDistance');
                                    }}
                                    className={menuItemClass}
                                >
                                    <Ruler className="w-4 h-4 text-slate-500" />
                                    {t('diagram.change_distance')}
                                </button>
                                {(() => {
                                    const el = activePlan?.diagramElements?.find(e => e.id === elementId);
                                    if (el?.properties?.radius2) {
                                        return (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setTextValue(String((el.properties.radius2 / 1000).toFixed(1)));
                                                        setSubMenu('arcSecondRing');
                                                    }}
                                                    className={menuItemClass}
                                                >
                                                    <Circle className="w-4 h-4 text-slate-500" />
                                                    {t('diagram.change_second_ring')}
                                                </button>
                                                <button
                                                    onClick={() => { onRemoveArcSecondRing(elementId); }}
                                                    className={menuItemClass}
                                                >
                                                    <XIcon className="w-4 h-4 text-slate-500" />
                                                    {t('diagram.remove_second_ring')}
                                                </button>
                                            </>
                                        );
                                    } else {
                                        const isM9 = el?.properties?.radius === 18500;
                                        const isM7 = el?.properties?.radius === 13500;
                                        return (
                                            <>
                                                <button
                                                    onClick={() => { onAddArcSecondRing(elementId, 18500); }}
                                                    disabled={isM9}
                                                    className={`${menuItemClass} ${isM9 ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                >
                                                    <Circle className="w-4 h-4 text-slate-500" />
                                                    {t('diagram.add_m9')}
                                                </button>
                                                <button
                                                    onClick={() => { onAddArcSecondRing(elementId, 13500); }}
                                                    disabled={isM7}
                                                    className={`${menuItemClass} ${isM7 ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                >
                                                    <Circle className="w-4 h-4 text-slate-500" />
                                                    {t('diagram.add_m7')}
                                                </button>
                                            </>
                                        );
                                    }
                                })()}
                            </>
                        )}
                        <div className="h-px bg-slate-200 dark:bg-zinc-600 my-1" />
                        <button
                            onClick={() => { onDelete(elementId); }}
                            className="w-full text-start px-3 py-2 text-sm flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            {t('diagram.delete')}
                        </button>
                    </>
                )}

                {subMenu === 'phase' && (
                    <div className="max-h-[200px] overflow-y-auto">
                        {phases.map(phase => (
                            <button
                                key={phase.id}
                                onClick={() => { onChangePhase(elementId, phase.id); }}
                                className={menuItemClass}
                            >
                                {phase.title?.[i18n.language] || phase.title?.['en'] || `Phase ${phase.index + 1}`}
                            </button>
                        ))}
                    </div>
                )}

                {subMenu === 'unit' && (
                    <div className="max-h-[200px] overflow-y-auto">
                        {units.map(unit => {
                            const fullUnit = mockUnits.find(u => u.code === unit.code);
                            const color = getUnitColor(unit.code, sessionUnit, planUnitCodes, mockUnits);
                            return (
                                <button
                                    key={unit.code}
                                    onClick={() => { onChangeUnit(elementId, unit.code); }}
                                    className={`${menuItemClass}`}
                                >
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    {formatUnitName(fullUnit || unit, t, i18n.language)}
                                </button>
                            );
                        })}
                    </div>
                )}

                {subMenu === 'stroke' && (
                    <div>
                        {STROKE_OPTIONS.map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => { onChangeStrokeWidth(elementId, opt.weight); }}
                                className={menuItemClass}
                            >
                                <span className="w-8 flex items-center">
                                    <span className="w-full rounded-full bg-slate-600 dark:bg-zinc-300" style={{ height: opt.weight }} />
                                </span>
                                {t(`diagram.stroke_${opt.key}`)}
                            </button>
                        ))}
                    </div>
                )}

                {subMenu === 'editText' && (
                    <div className="p-3 min-w-[200px]">
                        <input
                            autoFocus
                            type="text"
                            value={textValue}
                            onChange={e => setTextValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && textValue.trim()) {
                                    onEditText(elementId, textValue.trim());
                                }
                            }}
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary mb-2"
                        />
                        <button
                            onClick={() => { if (textValue.trim()) onEditText(elementId, textValue.trim()); }}
                            className="w-full px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            {t('diagram.confirm')}
                        </button>
                    </div>
                )}

                {subMenu === 'addLabel' && (
                    <div className="p-3 min-w-[200px]">
                        <input
                            autoFocus
                            type="text"
                            value={textValue}
                            onChange={e => setTextValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    onAddLabel(elementId, textValue.trim());
                                }
                            }}
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary mb-2"
                            placeholder={t('diagram.add_label')}
                        />
                        <button
                            onClick={() => { onAddLabel(elementId, textValue.trim()); }}
                            className="w-full px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            {t('diagram.confirm')}
                        </button>
                    </div>
                )}

                {subMenu === 'arcDistance' && (
                    <div className="p-3 min-w-[200px]">
                        <div className="flex gap-2 mb-2">
                            <button
                                onClick={() => onChangeArcDistance(elementId, 18.5)}
                                className="flex-1 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                                M9 (18.5)
                            </button>
                            <button
                                onClick={() => onChangeArcDistance(elementId, 13.5)}
                                className="flex-1 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                                M7 (13.5)
                            </button>
                        </div>
                        <input
                            autoFocus
                            type="number"
                            step="0.1"
                            value={textValue}
                            onChange={e => setTextValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && parseFloat(textValue) > 0) {
                                    onChangeArcDistance(elementId, parseFloat(textValue));
                                }
                            }}
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary mb-2"
                            placeholder="km"
                        />
                        <button
                            onClick={() => { if (parseFloat(textValue) > 0) onChangeArcDistance(elementId, parseFloat(textValue)); }}
                            className="w-full px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            {t('diagram.confirm')}
                        </button>
                    </div>
                )}

                {subMenu === 'arcSecondRing' && (
                    <div className="p-3 min-w-[200px]">
                        <input
                            autoFocus
                            type="number"
                            step="0.1"
                            value={textValue}
                            onChange={e => setTextValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && parseFloat(textValue) > 0) {
                                    onChangeArcSecondRing(elementId, parseFloat(textValue));
                                }
                            }}
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary mb-2"
                            placeholder="km"
                        />
                        <button
                            onClick={() => { if (parseFloat(textValue) > 0) onChangeArcSecondRing(elementId, parseFloat(textValue)); }}
                            className="w-full px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            {t('diagram.confirm')}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};
