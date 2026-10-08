import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Lock } from 'lucide-react';
import { Plan } from '../../common/utilities/types';
import { Field } from '../../common/widgets/Field';
import { mockPlanStatuses, mockPlanSharedOptions } from '../../common/utilities/mockData';

interface Props {
    plan: Plan;
    onUpdate: (changes: Partial<Plan>) => void;
}

export const PlanDetailsCard: React.FC<Props> = ({ plan, onUpdate }) => {
    const { t, i18n } = useTranslation();

    const currentStatus = mockPlanStatuses.find(s => s.id === (plan.status || 'draft'));
    const statusColor = currentStatus?.color || '#94a3b8';

    return (
        <div className="flex flex-col gap-4">
            <Field label={t('definitions.planName')} value={plan.name?.[i18n.language] || plan.name?.['en'] || ''} onChange={(v) => onUpdate({ name: { ...plan.name, [i18n.language]: v } })} />

            <div className="flex flex-col gap-1.5 ml-1">
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-zinc-400 mb-1">{t('definitions.status') || 'Status'}</label>
                <div
                    className="relative inline-flex items-center justify-center px-4 py-1.5 text-xs font-semibold rounded-full w-fit cursor-pointer transition-colors"
                    style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                >
                    {currentStatus?.name[i18n.language as 'en' | 'he'] || 'Unknown'}
                    <select
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer appearance-none"
                        value={plan.status || 'draft'}
                        onChange={(e) => onUpdate({ status: e.target.value })}
                        title={t('definitions.status') || 'Status'}
                    >
                        {mockPlanStatuses.map(status => (
                            <option key={status.id} value={status.id}>
                                {status.name[i18n.language as 'en' | 'he'] || status.name['en']}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex flex-col gap-1.5 ml-1">
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-zinc-400 mb-1">{t('definitions.sharing') || 'Shared'}</label>
                <div
                    className={`relative inline-flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold rounded-full w-fit cursor-pointer transition-colors ${plan.shared === 'sameUnit'
                            ? 'bg-slate-200 dark:bg-zinc-300 text-black'
                            : 'bg-black text-white'
                        }`}
                >
                    {plan.shared === 'sameUnit' ? <Users className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {t(plan.shared === 'sameUnit' ? 'plans.ribbonShared' : 'plans.ribbonPrivate')}
                    <select
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer appearance-none"
                        value={plan.shared || 'private'}
                        onChange={(e) => onUpdate({ shared: e.target.value as 'private' | 'sameUnit' })}
                        title={t('definitions.sharing') || 'Shared'}
                    >
                        {mockPlanSharedOptions.map(option => (
                            <option key={option.id} value={option.id}>
                                {option.name[i18n.language as 'en' | 'he'] || option.name['en']}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex flex-col gap-1.5 ml-1">
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-zinc-400 mb-1">{t('definitions.description')}</label>
                <textarea
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-lg border transition-all duration-200 outline-none bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 hover:border-slate-300 dark:hover:border-zinc-600 focus:border-cyan-500 dark:focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 resize-none"
                    value={plan.description?.[i18n.language] || plan.description?.['en'] || ''}
                    onChange={(e) => onUpdate({ description: { ...plan.description, [i18n.language]: e.target.value } })}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Field type="date" label={t('definitions.dDay')} value={plan.dDay || ''} onChange={(v) => onUpdate({ dDay: v })} />
                <Field type="time" label={t('definitions.hHour')} value={plan.hHour || ''} onChange={(v) => onUpdate({ hHour: v })} />
            </div>
        </div>
    );
};
