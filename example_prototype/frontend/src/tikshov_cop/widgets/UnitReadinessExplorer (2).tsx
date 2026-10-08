import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell } from 'recharts';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '../../common/widgets/Card';
import { TrackedDevice } from '../../common/utilities/types';
import { mockUnits, getUnitAndDescendantCodes } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';

// Unit readiness explorer: a nested tree of readiness gauges — a division's tile expands
// in place to reveal every one of its brigades (each its own gauge), expanding a brigade
// reveals its battalions, expanding a battalion reveals its companies, and so on — always
// alongside everything already opened above it, rather than replacing the view.

const ACTIVE_COLOR = '#34d399';
const REMAINDER_COLOR = '#3f3f46';

interface UnitReadinessExplorerProps {
    rootCodes: number[]; // home unit + watched units — each rendered as its own tree
    allDevices: TrackedDevice[]; // full home+watched scope, unaffected by the table/stats unit filter
}

function getChildren(code: number) {
    return mockUnits.filter(u => u.parentCode === String(code)).sort((a, b) => a.code - b.code);
}

function readinessOf(devices: TrackedDevice[], unitCode: number) {
    const codes = getUnitAndDescendantCodes(unitCode);
    const inScope = devices.filter(d => codes.includes(d.unitCode));
    const active = inScope.filter(d => d.connectionStatus === 'active').length;
    return { total: inScope.length, active };
}

const ReadinessTile: React.FC<{
    label: string; total: number; active: number; onClick?: () => void; muted?: boolean; expandable?: boolean; expanded?: boolean;
}> = ({ label, total, active, onClick, muted, expandable, expanded }) => {
    const { t } = useTranslation();
    const pct = total > 0 ? Math.round((active / total) * 100) : 0;
    const data = total > 0 ? [{ name: 'active', value: active }, { name: 'rest', value: total - active }] : [{ name: 'empty', value: 1 }];

    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors w-[104px] shrink-0
                ${expanded ? 'border-primary/50 bg-white dark:bg-zinc-800' : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40'}
                ${onClick ? 'hover:border-primary/50 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer' : 'cursor-default'} ${muted ? 'opacity-80' : ''}`}
        >
            {expandable && (
                <span className="absolute top-1.5 end-1.5 text-slate-400 dark:text-zinc-500">
                    {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />}
                </span>
            )}
            <div className="relative w-16 h-16" dir="ltr">
                <PieChart width={64} height={64}>
                    <Pie data={data} dataKey="value" innerRadius={20} outerRadius={30} startAngle={90} endAngle={-270} stroke="none">
                        {total > 0 ? (
                            <>
                                <Cell fill={ACTIVE_COLOR} />
                                <Cell fill={REMAINDER_COLOR} />
                            </>
                        ) : (
                            <Cell fill={REMAINDER_COLOR} />
                        )}
                    </Pie>
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-700 dark:text-zinc-200">
                    {total > 0 ? `${pct}%` : '—'}
                </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-200 text-center truncate w-full" title={label}>{label}</span>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500">{t('tikshovCop.explorer.activeOfTotal', { active, total })}</span>
        </button>
    );
};

interface ReadinessTreeNodeProps {
    code: number;
    allDevices: TrackedDevice[];
    expanded: Set<number>;
    toggle: (code: number) => void;
    depth: number;
}

const ReadinessTreeNode: React.FC<ReadinessTreeNodeProps> = ({ code, allDevices, expanded, toggle, depth }) => {
    const { t, i18n } = useTranslation();
    const unit = mockUnits.find(u => u.code === code);
    if (!unit) return null;
    const children = getChildren(code);
    const directDevices = allDevices.filter(d => d.unitCode === code);
    const isExpanded = expanded.has(code);
    const hasBreakdown = children.length > 0; // a leaf unit has nothing further to expand into

    return (
        <div>
            <ReadinessTile
                label={formatUnitName(unit as any, t, i18n.language)}
                {...readinessOf(allDevices, code)}
                onClick={hasBreakdown ? () => toggle(code) : undefined}
                expandable={hasBreakdown}
                expanded={isExpanded}
            />
            {isExpanded && hasBreakdown && (
                <div
                    className="flex gap-3 flex-wrap mt-3 pt-3 ps-4 border-s-2 border-slate-200 dark:border-zinc-800 overflow-x-auto"
                    style={{ marginInlineStart: 8 }}
                >
                    {children.map(child => (
                        <ReadinessTreeNode key={child.code} code={child.code} allDevices={allDevices} expanded={expanded} toggle={toggle} depth={depth + 1} />
                    ))}
                    {directDevices.length > 0 && (
                        <ReadinessTile
                            label={t('tikshovCop.explorer.direct')}
                            total={directDevices.length}
                            active={directDevices.filter(d => d.connectionStatus === 'active').length}
                            muted
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export const UnitReadinessExplorer: React.FC<UnitReadinessExplorerProps> = ({ rootCodes, allDevices }) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState<Set<number>>(() => new Set(rootCodes));

    const toggle = (code: number) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code); else next.add(code);
            return next;
        });
    };

    return (
        <Card title={t('tikshovCop.explorer.title')}>
            <div className="flex flex-col gap-4">
                {rootCodes.map(code => (
                    <ReadinessTreeNode key={code} code={code} allDevices={allDevices} expanded={expanded} toggle={toggle} depth={0} />
                ))}
            </div>
        </Card>
    );
};
