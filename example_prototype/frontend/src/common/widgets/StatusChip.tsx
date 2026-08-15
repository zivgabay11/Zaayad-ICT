import React from 'react';
import { XCircle, AlertTriangle, RefreshCw, CheckCircle, HelpCircle, Activity } from 'lucide-react';

interface StatusChipProps {
    status: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
    let bgColor = 'bg-slate-100 dark:bg-zinc-800';
    let textColor = 'text-slate-600 dark:text-zinc-400';
    let icon: React.ReactNode = null;

    switch (status) {
        case 'Error':
            bgColor = 'bg-red-100 dark:bg-red-900/40';
            textColor = 'text-red-700 dark:text-red-400';
            icon = <XCircle className="w-3 h-3 shrink-0" />;
            break;
        case 'Action Required':
            bgColor = 'bg-red-100 dark:bg-red-900/40';
            textColor = 'text-red-700 dark:text-red-400';
            icon = <AlertTriangle className="w-3 h-3 shrink-0" />;
            break;
        case 'Validating':
            bgColor = 'bg-blue-100 dark:bg-blue-900/40';
            textColor = 'text-blue-700 dark:text-blue-400';
            icon = <RefreshCw className="w-3 h-3 animate-spin shrink-0" />;
            break;
        case 'In Progress':
            bgColor = 'bg-amber-100 dark:bg-amber-900/40';
            textColor = 'text-amber-700 dark:text-amber-400';
            icon = <RefreshCw className="w-3 h-3 animate-spin shrink-0" />;
            break;
        case 'Active':
        case 'Ready':
        case 'Approved':
        case 'Done':
            bgColor = 'bg-emerald-100 dark:bg-emerald-900/40';
            textColor = 'text-emerald-700 dark:text-emerald-400';
            icon = <CheckCircle className="w-3 h-3 shrink-0" />;
            break;
        case 'Pending':
            bgColor = 'bg-slate-100 dark:bg-zinc-800';
            textColor = 'text-slate-600 dark:text-zinc-400';
            icon = <HelpCircle className="w-3 h-3 shrink-0" />;
            break;
        default:
            bgColor = 'bg-slate-100 dark:bg-zinc-800';
            textColor = 'text-slate-600 dark:text-zinc-400';
            break;
    }

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 w-fit ${bgColor} ${textColor}`}>
            {icon}
            {status}
        </span>
    );
};