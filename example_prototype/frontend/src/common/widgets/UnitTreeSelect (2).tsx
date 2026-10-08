import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, X, Layers } from 'lucide-react';
import { mockUnits, getUnitAndDescendantCodes } from '../utilities/mockData';
import { formatUnitName } from '../utilities/formatting';

// Hierarchical multi-select unit filter, shared across features (Tikshov COP, Combat
// Log, ...): instead of one flat list of every unit, roots expand one echelon at a time
// via a chevron, and picking a unit implicitly includes everything beneath it.

interface UnitTreeSelectProps {
    rootCodes: number[];
    selected: number[];
    onChange: (codes: number[]) => void;
}

function getChildren(code: number) {
    return mockUnits.filter(u => u.parentCode === String(code)).sort((a, b) => a.code - b.code);
}

function ancestorsOf(code: number): number[] {
    const chain: number[] = [];
    let cur = mockUnits.find(u => u.code === code);
    while (cur?.parentCode) {
        const parentCode = Number(cur.parentCode);
        chain.push(parentCode);
        cur = mockUnits.find(u => u.code === parentCode);
    }
    return chain;
}

export const UnitTreeSelect: React.FC<UnitTreeSelectProps> = ({ rootCodes, selected, onChange }) => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [expanded, setExpanded] = useState<Set<number>>(() => new Set(rootCodes));

    const toggleExpand = (code: number) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code); else next.add(code);
            return next;
        });
    };

    const inclusion = (code: number): { included: boolean; viaAncestor: boolean } => {
        if (selected.includes(code)) return { included: true, viaAncestor: false };
        const includedViaAncestor = ancestorsOf(code).some(a => selected.includes(a));
        return { included: includedViaAncestor, viaAncestor: includedViaAncestor };
    };

    const toggleUnit = (code: number) => {
        const { included, viaAncestor } = inclusion(code);
        if (viaAncestor) return; // inherited from a selected ancestor — uncheck the ancestor instead
        if (included) {
            onChange(selected.filter(c => c !== code));
        } else {
            const descendants = new Set(getUnitAndDescendantCodes(code));
            onChange([...selected.filter(c => !descendants.has(c)), code]);
        }
    };

    const label = useMemo(() => {
        if (selected.length === 0) return t('unitPicker.allUnits');
        if (selected.length === 1) {
            const unit = mockUnits.find(u => u.code === selected[0]);
            return unit ? formatUnitName(unit as any, t, i18n.language) : t('unitPicker.allUnits');
        }
        return t('unitPicker.unitsSelectedCount', { count: selected.length });
    }, [selected, t, i18n.language]);

    const renderNode = (code: number, depth: number): React.ReactNode => {
        const unit = mockUnits.find(u => u.code === code);
        if (!unit) return null;
        const children = getChildren(code);
        const { included, viaAncestor } = inclusion(code);
        const isExpanded = expanded.has(code);
        return (
            <div key={code}>
                <div
                    className="flex items-center gap-1.5 py-1.5 pe-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
                    style={{ paddingInlineStart: 8 + depth * 18 }}
                >
                    {children.length > 0 ? (
                        <button onClick={() => toggleExpand(code)} className="shrink-0 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />}
                        </button>
                    ) : <span className="w-3.5 shrink-0" />}
                    <input
                        type="checkbox"
                        checked={included}
                        disabled={viaAncestor}
                        onChange={() => toggleUnit(code)}
                        title={viaAncestor ? t('unitPicker.includedViaAncestor') : undefined}
                        className="accent-primary w-3.5 h-3.5 shrink-0"
                    />
                    <span
                        onClick={() => !viaAncestor && toggleUnit(code)}
                        className={`text-xs truncate ${viaAncestor ? 'text-slate-400 dark:text-zinc-500' : 'text-slate-700 dark:text-zinc-200 cursor-pointer'}`}
                    >
                        {formatUnitName(unit as any, t, i18n.language)}
                    </span>
                </div>
                {isExpanded && children.map(child => renderNode(child.code, depth + 1))}
            </div>
        );
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 outline-none focus:border-primary max-w-[220px]"
            >
                <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />
                <span className="truncate">{label}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full start-0 mt-1.5 z-50 w-72 max-h-80 overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl p-1.5">
                        <div className="flex items-center justify-between px-1.5 pb-1.5 mb-1 border-b border-slate-100 dark:border-zinc-800">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{t('unitPicker.pickerTitle')}</span>
                            {selected.length > 0 && (
                                <button onClick={() => onChange([])} className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500 transition-colors">
                                    <X className="w-3 h-3" /> {t('unitPicker.clearSelection')}
                                </button>
                            )}
                        </div>
                        {rootCodes.map(code => renderNode(code, 0))}
                    </div>
                </>
            )}
        </div>
    );
};
