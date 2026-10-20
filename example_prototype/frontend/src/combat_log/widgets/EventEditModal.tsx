import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Paperclip } from 'lucide-react';
import { useCombatLogContext } from '../../common/context/CombatLogContext';
import { CombatLogEvent, Cell } from '../../common/utilities/types';
import { COMBAT_LOG_STATUS_OPTIONS, isTerminalStatus, getEditPermission } from '../../common/utilities/combatLog';

// Edit dialog (PRD 4.3/6.2/7.3/US-02): every original field is locked; only end_time,
// status, and update_notes are interactive, and only for units with edit permission on
// this event (owner, or a unit it was shared to per the log type's PRD 4.2 table).

interface EventEditModalProps {
    event: CombatLogEvent | null;
    onClose: () => void;
    viewingUnitCode: number;
    viewingCell?: Cell; // set when opened from the Personal Task Log — grants full edit rights when the event is assigned to this cell
}

function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const readonlyFieldClass = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-slate-400 dark:text-zinc-500";
const labelClass = "text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1 block";

export const EventEditModal: React.FC<EventEditModalProps> = ({ event, onClose, viewingUnitCode, viewingCell }) => {
    const { t } = useTranslation();
    const { updateEvent, addAttachment } = useCombatLogContext();
    const [status, setStatus] = useState(event?.status || '');
    const [end, setEnd] = useState(event?.end ? toDatetimeLocal(event.end) : '');
    const [endTouched, setEndTouched] = useState(false);
    const [noteText, setNoteText] = useState('');

    // This component never unmounts between edits (the parent always renders it, just
    // with event=null when closed) — reset local state whenever a *different* event is
    // opened, since useState's initial value only applies on first mount.
    useEffect(() => {
        setStatus(event?.status || '');
        setEnd(event?.end ? toDatetimeLocal(event.end) : '');
        setEndTouched(false);
        setNoteText('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event?.id]);

    if (!event) return null;
    const permission = getEditPermission(event, viewingUnitCode, viewingCell);
    const canEditFields = permission === 'owner' || permission === 'sharedFull';
    const canAttachOnly = permission === 'sharedAttachmentsOnly';

    const handleStatusChange = (nextStatus: string) => {
        setStatus(nextStatus);
        // Mirror the auto end_time preview (FR-09) unless the user already touched end manually.
        if (!endTouched && isTerminalStatus(event.type, nextStatus) && !isTerminalStatus(event.type, event.status)) {
            setEnd(toDatetimeLocal(new Date().toISOString()));
        }
    };

    const handleSave = () => {
        updateEvent(event.id, {
            status: status !== event.status ? status : undefined,
            end: end ? new Date(end).toISOString() : undefined,
            updateNoteText: noteText,
        });
        onClose();
    };

    const handleAttachFiles = (fileList: FileList | null) => {
        if (!fileList) return;
        Array.from(fileList).forEach(f => {
            const ext = f.name.split('.').pop()?.toLowerCase();
            const fileType = ext === 'pdf' ? 'pdf' : (ext === 'xlsx' || ext === 'xls') ? 'excel' : 'word';
            addAttachment(event.id, f.name, fileType as any);
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-xl max-h-[88vh] overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-zinc-800 shrink-0 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('combatLog.editModal.title')}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Read-only original fields (PRD 4.3 / AC-02.1) */}
                    <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{t('combatLog.editModal.readonlySection')}</span>
                        <div className="mt-2 space-y-3">
                            <div>
                                <label className={labelClass}>{t('combatLog.fields.title')}</label>
                                <div className={readonlyFieldClass}>{event.title}</div>
                            </div>
                            <div>
                                <label className={labelClass}>{t('combatLog.fields.description')}</label>
                                <div className={`${readonlyFieldClass} whitespace-pre-wrap`}>{event.description}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>{t('combatLog.fields.start')}</label>
                                    <div className={readonlyFieldClass}>{new Date(event.start).toLocaleString()}</div>
                                </div>
                                <div>
                                    <label className={labelClass}>{t('combatLog.fields.reporter')}</label>
                                    <div className={readonlyFieldClass}>{event.reporterUserName}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-slate-200 dark:border-zinc-700 pt-4">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{t('combatLog.editModal.editableSection')}</span>

                        {!canEditFields && !canAttachOnly && (
                            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">{t(`combatLog.permissions.readonly`)}</p>
                        )}

                        {canEditFields && (
                            <div className="mt-2 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    {event.type !== 'reports' && (
                                        <div>
                                            <label className={labelClass}>{t('combatLog.fields.status')}</label>
                                            <select value={status} onChange={e => handleStatusChange(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-primary">
                                                {COMBAT_LOG_STATUS_OPTIONS[event.type].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className={labelClass}>{t('combatLog.fields.end')}</label>
                                        <input
                                            type="datetime-local"
                                            value={end}
                                            onChange={e => { setEnd(e.target.value); setEndTouched(true); }}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400 dark:text-zinc-500">{t('combatLog.editModal.autoEndTimeHint')}</p>

                                <div>
                                    <label className={labelClass}>{t('combatLog.fields.updateNotes')}</label>
                                    <textarea
                                        rows={3}
                                        value={noteText}
                                        onChange={e => setNoteText(e.target.value)}
                                        placeholder={t('combatLog.editModal.updateNotesPlaceholder')}
                                        className="w-full px-3 py-2 text-sm rounded-lg border-2 border-primary/40 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-primary transition-colors"
                                    />
                                </div>
                            </div>
                        )}

                        {canAttachOnly && (
                            <div className="mt-2">
                                <label className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:border-primary hover:text-primary transition-colors cursor-pointer">
                                    <Paperclip className="w-3.5 h-3.5" />
                                    {t('combatLog.fields.attachments')}
                                    <input type="file" multiple className="hidden" onChange={e => handleAttachFiles(e.target.files)} />
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-zinc-800 shrink-0">
                    <button onClick={onClose} className="text-sm px-4 py-2 text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors font-medium">
                        {t('combatLog.actions.cancel')}
                    </button>
                    {canEditFields && (
                        <button onClick={handleSave} className="text-sm px-4 py-2 bg-primary hover:bg-primary/90 text-white dark:text-zinc-900 rounded-lg transition-colors font-medium shadow-sm">
                            {t('combatLog.actions.save')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
