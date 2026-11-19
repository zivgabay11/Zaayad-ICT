import React from 'react';
import { useTranslation } from 'react-i18next';
import { TriangleAlert } from 'lucide-react';

// The one destructive-confirmation dialog shared by every table in the app (Bum Manager's
// demands/דמ"צים/instructions, Personal Task Log's tasks, System Views' dashboards, ...) —
// same shell, same centered cancel/confirm pair, just a different i18n prefix per caller
// holding titleOne/titleMany/descriptionOne/descriptionMany.

interface ConfirmDeleteModalProps {
    demands: Array<{ title: string }>;
    onConfirm: () => void;
    onCancel: () => void;
    // i18n namespace holding titleOne / titleMany / descriptionOne / descriptionMany
    prefix: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ demands, onConfirm, onCancel, prefix }) => {
    const { t } = useTranslation();
    if (demands.length === 0) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200" role="alertdialog" aria-modal="true">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-3 text-red-600 dark:text-red-500">
                        <TriangleAlert className="w-5 h-5 shrink-0" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t(demands.length === 1 ? `${prefix}.titleOne` : `${prefix}.titleMany`)}</h3>
                    </div>
                    <p className="text-slate-600 dark:text-zinc-300 mb-6 text-sm">
                        {demands.length === 1 ? t(`${prefix}.descriptionOne`, { name: demands[0].title }) : t(`${prefix}.descriptionMany`, { count: demands.length })}
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <button onClick={onCancel} className="text-sm px-4 py-2 text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors font-medium">{t('common.cancel')}</button>
                        <button onClick={onConfirm} data-confirm-delete className="text-sm px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-sm">{t('common.delete')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
