import React from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, HelpCircle, XCircle } from 'lucide-react';
import { StatusChip } from './StatusChip';

export const Card = ({ title, status, icon, children, isProcessing = false }: { title: string | React.ReactNode, status?: string, icon?: React.ReactNode, children: React.ReactNode, isProcessing?: boolean }) => (
    <div className="bg-white dark:bg-zinc-900 border rounded-xl overflow-visible transition-all duration-300 border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow relative group">
        {isProcessing && (
            <div className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl border border-transparent">
                <RefreshCw className="w-5 h-5 text-cyan-500 animate-spin" />
            </div>
        )}
        <div className="px-5 py-4 border-b rounded-t-xl border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/30">
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="p-1.5 bg-white dark:bg-zinc-800 rounded-md shadow-sm border border-slate-100 dark:border-zinc-700">
                        {icon}
                    </div>
                )}
                <div className="font-semibold text-slate-800 dark:text-zinc-200">{title}</div>
            </div>
            <div className="flex items-center gap-2">
                {status && <StatusChip status={status} />}
            </div>
        </div>
        <div className="p-5 relative">
            {children}
        </div>
    </div>
);
