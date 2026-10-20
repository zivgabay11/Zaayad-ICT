import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Pencil, Repeat } from 'lucide-react';
import { PersonalTask } from '../../common/utilities/types';
import { PERSONAL_TASK_STATUS_BADGE_CLASS, PERSONAL_TASK_SEVERITY_DOT_COLOR } from '../utilities/personalTaskLog';
import { getCellLabel } from '../../common/utilities/cells';

// Read-only summary (double-click, mirrors Combat Log's EventViewPanel) for a manual
// (non-linked) task — every field plus an Edit action into the full form.

interface TaskViewPanelProps {
    task: PersonalTask | null;
    onClose: () => void;
    onEdit: (id: string) => void;
}

export const TaskViewPanel: React.FC<TaskViewPanelProps> = ({ task, onClose, onEdit }) => {
    const { t, i18n } = useTranslation();
    if (!task) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-zinc-800 shrink-0 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full mb-2 border border-slate-300/60 dark:border-zinc-600/60 bg-black/5 dark:bg-white/5 text-slate-600 dark:text-zinc-300">
                            {getCellLabel(t, task.ownerCell)}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{task.title}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {task.description && <p className="text-sm text-slate-600 dark:text-zinc-300 whitespace-pre-wrap">{task.description}</p>}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-xs text-slate-400 dark:text-zinc-500 block">{t('personalTaskLog.fields.start')}</span>{task.start ? new Date(task.start).toLocaleString() : '—'}</div>
                        <div><span className="text-xs text-slate-400 dark:text-zinc-500 block">{t('personalTaskLog.fields.end')}</span>{task.end ? new Date(task.end).toLocaleString() : '—'}</div>
                        <div>
                            <span className="text-xs text-slate-400 dark:text-zinc-500 block">{t('personalTaskLog.fields.status')}</span>
                            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${PERSONAL_TASK_STATUS_BADGE_CLASS[task.status]}`}>
                                {t(`personalTaskLog.statuses.${task.status}`)}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 dark:text-zinc-500 block">{t('personalTaskLog.fields.severity')}</span>
                            <span className="inline-flex items-center gap-1 text-sm mt-0.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PERSONAL_TASK_SEVERITY_DOT_COLOR[task.severity] }} />
                                {t(`personalTaskLog.severity.${task.severity}`)}
                            </span>
                        </div>
                        {task.recurrence === 'periodic' && task.recurrenceRule && (
                            <div className="col-span-2">
                                <span className="text-xs text-slate-400 dark:text-zinc-500 block mb-0.5">{t('personalTaskLog.recurrence.periodic')}</span>
                                <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-zinc-200">
                                    <Repeat className="w-3.5 h-3.5 text-violet-500" />
                                    {t(`personalTaskLog.frequency.${task.recurrenceRule.frequency}`)}
                                    {' · '}
                                    {t('personalTaskLog.fields.recurrenceEndDate')}: {new Date(task.recurrenceRule.endDate).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">{t('personalTaskLog.fields.notes')}</h4>
                        <p className="text-sm text-slate-600 dark:text-zinc-300 whitespace-pre-wrap">{task.notes || t('personalTaskLog.viewPanel.noNotes')}</p>
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                        {t('personalTaskLog.viewPanel.createdBy', { name: task.createdByUserName, date: new Date(task.createdAt).toLocaleString() })}
                    </p>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-zinc-800 shrink-0">
                    <button onClick={() => onEdit(task.id)} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 bg-primary hover:bg-primary/90 text-white dark:text-zinc-900 rounded-lg transition-colors font-medium shadow-sm">
                        <Pencil className="w-3.5 h-3.5" /> {t('personalTaskLog.actions.edit')}
                    </button>
                </div>
            </div>
        </div>
    );
};
