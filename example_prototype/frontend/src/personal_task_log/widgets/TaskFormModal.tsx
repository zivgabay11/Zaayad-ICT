import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Link2 } from 'lucide-react';
import { usePersonalTaskLogContext } from '../../common/context/PersonalTaskLogContext';
import { useCombatLogContext } from '../../common/context/CombatLogContext';
import { PersonalTask, PersonalTaskSeverity, PersonalTaskFrequency, PersonalTaskStatus, UserRole, CombatLogType, CombatLogSeverity } from '../../common/utilities/types';
import { LINKABLE_COMBAT_LOG_TYPES, COMBAT_LOG_TYPE_COLORS } from '../../common/utilities/combatLog';
import { PERSONAL_TASK_SEVERITY_ORDER, PERSONAL_TASK_SEVERITY_DOT_COLOR, PERSONAL_TASK_STATUS_ORDER } from '../utilities/personalTaskLog';

interface TaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    ownerRole: UserRole;
    task?: PersonalTask | null; // when set, the modal edits this task instead of creating one
    onLinked?: (eventId: string) => void; // called instead of onClose after "link to combat log" succeeds, so the caller can open the resulting item
}

function toDatetimeLocal(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Only 'high'/'medium'/'low' carry over directly — 'unknown' has no Combat Log equivalent.
function toCombatLogSeverity(severity: PersonalTaskSeverity): CombatLogSeverity | undefined {
    return severity === 'unknown' ? undefined : severity;
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-primary transition-colors";
const labelClass = "text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1 block";

export const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, ownerRole, task, onLinked }) => {
    const { t } = useTranslation();
    const { createTask, updateTask, deleteTask } = usePersonalTaskLogContext();
    const { createEvent } = useCombatLogContext();

    const isEdit = !!task;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<PersonalTaskStatus>('open');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [severity, setSeverity] = useState<PersonalTaskSeverity>('unknown');
    const [notes, setNotes] = useState('');
    const [isPeriodic, setIsPeriodic] = useState(false);
    const [frequency, setFrequency] = useState<PersonalTaskFrequency>('weekly');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    // Which Combat Log type this task should become, if any — just a selected form field
    // like severity; nothing is created/converted until the main Save button is pressed.
    const [linkedType, setLinkedType] = useState<CombatLogType | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setTitle(task?.title || '');
        setDescription(task?.description || '');
        setStatus(task?.status || 'open');
        setStart(toDatetimeLocal(task?.start));
        setEnd(toDatetimeLocal(task?.end));
        setSeverity(task?.severity || 'unknown');
        setNotes(task?.notes || '');
        setIsPeriodic(task?.recurrence === 'periodic');
        setFrequency(task?.recurrenceRule?.frequency || 'weekly');
        setRecurrenceEndDate(task?.recurrenceRule?.endDate?.slice(0, 10) || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
        setErrors({});
        setLinkedType(null);
    }, [isOpen, task]);

    const validate = (): boolean => {
        const nextErrors: Record<string, string> = {};
        if (!title.trim()) nextErrors.title = t('personalTaskLog.form.requiredError');
        if (isPeriodic && !recurrenceEndDate) nextErrors.recurrenceEndDate = t('personalTaskLog.form.requiredError');
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleClose = () => { onClose(); };

    const handleSave = () => {
        if (!validate()) return;

        // Linked to a Combat Log type → this single Save press both creates the shared
        // event (assigned back to this role) and, if converting an existing manual task,
        // removes the old manual row — one atomic action, not two separate steps.
        // assignedToRoles is set in this same createEvent call rather than a follow-up
        // toggleAssignedRole call, since two context mutations chained in one handler would
        // each close over the pre-update array and the second would overwrite the first.
        if (linkedType) {
            const newEvent = createEvent({
                type: linkedType,
                title: title.trim(),
                description: description.trim(),
                start: start ? new Date(start).toISOString() : undefined,
                end: end ? new Date(end).toISOString() : undefined,
                severity: linkedType === 'ict_faults' ? toCombatLogSeverity(severity) : undefined,
                assignedToRoles: [ownerRole],
            });
            if (isEdit && task) deleteTask(task.id);
            if (onLinked) onLinked(newEvent.id);
            else handleClose();
            return;
        }

        const payload = {
            title: title.trim(),
            description: description.trim(),
            status,
            start: start ? new Date(start).toISOString() : undefined,
            end: end ? new Date(end).toISOString() : undefined,
            severity,
            notes: notes.trim() || undefined,
            recurrence: (isPeriodic ? 'periodic' : 'oneTime') as 'periodic' | 'oneTime',
            recurrenceRule: isPeriodic ? { frequency, endDate: new Date(recurrenceEndDate).toISOString() } : undefined,
        };

        if (isEdit && task) {
            updateTask(task.id, payload);
        } else {
            createTask({ ownerRole, ...payload });
        }
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-xl max-h-[88vh] overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-zinc-800 shrink-0 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {isEdit ? t('personalTaskLog.form.editTitle') : t('personalTaskLog.form.createTitle')}
                        </h3>
                    </div>
                    <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div>
                        <label className={labelClass}>{t('personalTaskLog.fields.title')}</label>
                        <input type="text" maxLength={120} value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
                        {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title}</p>}
                    </div>

                    <div>
                        <label className={labelClass}>{t('personalTaskLog.fields.description')}</label>
                        <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={inputClass} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>{t('personalTaskLog.fields.start')}</label>
                            <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('personalTaskLog.fields.end')}</label>
                            <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className={inputClass} />
                        </div>
                    </div>

                    {isEdit && (
                        <div>
                            <label className={labelClass}>{t('personalTaskLog.fields.status')}</label>
                            <select value={status} onChange={e => setStatus(e.target.value as PersonalTaskStatus)} className={inputClass}>
                                {PERSONAL_TASK_STATUS_ORDER.map(s => <option key={s} value={s}>{t(`personalTaskLog.statuses.${s}`)}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className={labelClass}>{t('personalTaskLog.fields.severity')}</label>
                        <div className="flex flex-wrap gap-1.5">
                            {PERSONAL_TASK_SEVERITY_ORDER.map(s => {
                                const color = PERSONAL_TASK_SEVERITY_DOT_COLOR[s];
                                const active = severity === s;
                                return (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setSeverity(s)}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors"
                                        style={active ? { background: `${color}1f`, color, borderColor: `${color}55` } : { borderColor: '#e2e8f0' }}
                                    >
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                                        {t(`personalTaskLog.severity.${s}`)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>{t('personalTaskLog.fields.notes')}</label>
                        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} />
                    </div>

                    <div className="rounded-lg border border-slate-200 dark:border-zinc-700 p-3 space-y-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-zinc-200 cursor-pointer">
                            <input type="checkbox" checked={isPeriodic} onChange={e => setIsPeriodic(e.target.checked)} className="accent-primary w-3.5 h-3.5" />
                            {t('personalTaskLog.fields.isPeriodic')}
                        </label>
                        {isPeriodic && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>{t('personalTaskLog.fields.frequency')}</label>
                                    <select value={frequency} onChange={e => setFrequency(e.target.value as PersonalTaskFrequency)} className={inputClass}>
                                        <option value="daily">{t('personalTaskLog.frequency.daily')}</option>
                                        <option value="weekly">{t('personalTaskLog.frequency.weekly')}</option>
                                        <option value="monthly">{t('personalTaskLog.frequency.monthly')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>{t('personalTaskLog.fields.recurrenceEndDate')}</label>
                                    <input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} className={inputClass} />
                                    {errors.recurrenceEndDate && <p className="text-[11px] text-red-500 mt-1">{errors.recurrenceEndDate}</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 p-3 space-y-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                            <Link2 className="w-3.5 h-3.5" /> {t('personalTaskLog.fields.linkToCombatLog')}
                        </span>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500">{t('personalTaskLog.fields.linkToCombatLogHint')}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {LINKABLE_COMBAT_LOG_TYPES.map(logType => {
                                const color = COMBAT_LOG_TYPE_COLORS[logType];
                                const active = linkedType === logType;
                                return (
                                    <button
                                        key={logType}
                                        type="button"
                                        onClick={() => setLinkedType(prev => (prev === logType ? null : logType))}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors"
                                        style={active ? { background: `${color}1f`, color, borderColor: `${color}55` } : { borderColor: '#e2e8f0' }}
                                    >
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                                        {t(`combatLog.logTypes.${logType}`)}
                                    </button>
                                );
                            })}
                        </div>
                        {linkedType && (
                            <p className="text-[11px] text-primary font-medium">{t('personalTaskLog.fields.linkToCombatLogSelected')}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-zinc-800 shrink-0">
                    <button onClick={handleClose} className="text-sm px-4 py-2 text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors font-medium">
                        {t('personalTaskLog.actions.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        className="text-sm px-4 py-2 bg-primary hover:bg-primary/90 text-white dark:text-zinc-900 rounded-lg transition-colors font-medium shadow-sm"
                    >
                        {t('personalTaskLog.actions.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};
