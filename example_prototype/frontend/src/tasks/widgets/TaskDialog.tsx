import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Task, Plan, TaskStatus } from '../../common/utilities/types';
import { X, Trash2 } from 'lucide-react';
import { Field } from '../../common/widgets/Field';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Task) => void;
    onDelete?: (taskId: string) => void;
    initialData?: Partial<Task>;
    plan: Plan;
}

export const TaskDialog: React.FC<Props> = ({ isOpen, onClose, onSave, onDelete, initialData, plan }) => {
    const { t, i18n } = useTranslation();
    const [taskData, setTaskData] = useState<Partial<Task>>({});

    useEffect(() => {
        if (isOpen) {
            setTaskData({
                id: `t-${Date.now()}`,

                status: 'To Do',
                ...initialData
            });
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!taskData.name) return;
        onSave(taskData as Task);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 rtl:dir-rtl">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100">
                        {initialData?.id ? t('Edit Task') : t('New Task')}
                    </h2>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase text-slate-500">{t('Name')}</label>
                        <input
                            type="text"
                            value={taskData.name?.[i18n.language] || taskData.name?.['en'] || ''}
                            onChange={e => setTaskData({ ...taskData, name: { ...taskData.name, [i18n.language]: e.target.value } })}
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg outline-none focus:border-primary dark:focus:border-primary-dark"
                            autoFocus
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase text-slate-500">{t('Description')}</label>
                        <textarea
                            rows={3}
                            value={taskData.description?.[i18n.language] || taskData.description?.['en'] || ''}
                            onChange={e => setTaskData({ ...taskData, description: { ...taskData.description, [i18n.language]: e.target.value } })}
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg outline-none focus:border-primary dark:focus:border-primary-dark resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold uppercase text-slate-500">{t('Status')}</label>
                            <select
                                value={taskData.status}
                                onChange={e => setTaskData({ ...taskData, status: e.target.value as TaskStatus })}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg outline-none focus:border-primary dark:focus:border-primary-dark"
                            >
                                <option value="To Do">{t('To Do')}</option>
                                <option value="In Progress">{t('In Progress')}</option>
                                <option value="On Hold">{t('On Hold')}</option>
                                <option value="Cancelled">{t('Cancelled')}</option>
                                <option value="Done">{t('Done')}</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold uppercase text-slate-500">{t('Primary Unit')}</label>
                            <select
                                value={taskData.primaryUnitId || ''}
                                onChange={e => setTaskData({ ...taskData, primaryUnitId: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg outline-none focus:border-primary dark:focus:border-primary-dark"
                            >
                                <option value="">{t('Unassigned')}</option>
                                {plan.units.map(u => (
                                    <option key={u.code?.toString()} value={u.code?.toString()}>{u.code?.toString()}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold uppercase text-slate-500">{t('Phase')}</label>
                            <select
                                value={taskData.phaseId || ''}
                                onChange={e => setTaskData({ ...taskData, phaseId: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg outline-none focus:border-primary dark:focus:border-primary-dark"
                            >
                                <option value="">{t('Unassigned')}</option>
                                {plan.phases.map(p => (
                                    <option key={p.id} value={p.id}>{p.title?.[i18n.language] || p.title?.['en'] || `Phase ${p.index}`}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 shrink-0 flex justify-between items-center">
                    {initialData?.id && onDelete ? (
                        <button
                            onClick={() => {
                                onDelete(initialData.id as string);
                                onClose();
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    ) : <div />}
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            {t('Cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!taskData.name}
                            className="px-6 py-2 bg-primary hover:bg-primary/90 dark:bg-[#186eff] dark:hover:bg-primary/90 disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm"
                        >
                            {t('Save')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};