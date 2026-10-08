import React, { useState } from 'react';
import { Check, X } from 'lucide-react'; import { useTranslation } from 'react-i18next';
export const Field = ({
    label,
    value,
    readOnly = false,
    type = 'text',
    onChange,
    isDarkMode = false,
    isError = false,
    options,
    proposedValue,
    onDecision
}: {
    label: string,
    value: string | undefined,
    readOnly?: boolean,
    type?: string,
    onChange?: (val: string) => void,
    isDarkMode?: boolean,
    isError?: boolean,
    options?: string[],
    proposedValue?: string | undefined,
    onDecision?: (keep: boolean) => void
}) => {
    const { t } = useTranslation();
    const hasDiff = proposedValue !== undefined && proposedValue !== value;

    return (
        <div className="relative">
            <label className="block text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-zinc-400 mb-1.5 ml-1">{label}</label>
            <div className="relative group">
                {type === 'select' && options ? (
                    <select
                        value={hasDiff ? proposedValue : (value || '')}
                        disabled={readOnly}
                        onChange={(e) => onChange && onChange(e.target.value)}
                        className={`w-full px-3 py-2 text-sm rounded-lg border transition-all duration-200 outline-none appearance-none
                ${readOnly ?
                                'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700/50 text-slate-600 dark:text-zinc-400 cursor-not-allowed' :
                                isError ?
                                    'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700/50 text-red-900 dark:text-red-100' :
                                    hasDiff ?
                                        'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/30' :
                                        'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 hover:border-slate-300 dark:hover:border-zinc-600 focus:border-cyan-500'
                            }
              `}
                    >
                        <option value="" disabled hidden>Select {label.toLowerCase()}</option>
                        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                ) : (
                    <input
                        type={type}
                        value={hasDiff ? proposedValue : (value || '')}
                        readOnly={readOnly || hasDiff}
                        onChange={(e) => onChange && onChange(e.target.value)}
                        className={`w-full px-3 py-2 text-sm rounded-lg border transition-all duration-200 outline-none
                ${readOnly ?
                                'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700/50 text-slate-600 dark:text-zinc-400 cursor-not-allowed' :
                                isError ?
                                    'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700/50 text-red-900 dark:text-red-100 placeholder:text-red-400' :
                                    hasDiff ?
                                        'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/30' :
                                        'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 hover:border-slate-300 dark:hover:border-zinc-600 focus:border-cyan-500'
                            }
              `}
                        placeholder={readOnly ? '-' : isError ? 'Value required...' : ''}
                    />
                )}

                {hasDiff && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 flex items-center bg-white dark:bg-zinc-800 shadow-xl border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden shrink-0 p-1 gap-1">
                        <div className="px-3 py-1 flex items-center gap-1.5 rounded cursor-pointer bg-emerald-50 dark:bg-emerald-500/10 text-slate-700 dark:text-zinc-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors" onClick={() => onDecision && onDecision(true)}>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs font-medium">{t('common.keep')}</span>
                        </div>
                        <div className="px-3 py-1 flex items-center gap-1.5 rounded cursor-pointer bg-red-50 dark:bg-red-500/10 text-slate-700 dark:text-zinc-300 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors" onClick={() => onDecision && onDecision(false)}>
                            <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                            <span className="text-xs font-medium">{t('common.undo')}</span>
                        </div>
                    </div>
                )}
            </div>
            {hasDiff && (
                <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400 line-through truncate opacity-50 px-1">
                    Previous: {value}
                </div>
            )}
        </div>
    );
};
