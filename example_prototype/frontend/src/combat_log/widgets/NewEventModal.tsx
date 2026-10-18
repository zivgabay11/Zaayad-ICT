import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, X } from 'lucide-react';
import { useCombatLogContext } from '../../common/context/CombatLogContext';
import { CombatLogEvent, CombatLogType, CombatLogSeverity, UserRole } from '../../common/utilities/types';
import { COMBAT_LOG_TYPES, COMBAT_LOG_STATUS_OPTIONS, COMBAT_LOG_END_TIME_DEFAULT_MINUTES, COMBAT_LOG_TYPE_COLORS, LINKABLE_COMBAT_LOG_TYPES, isTerminalStatus } from '../../common/utilities/combatLog';
import { mockCommSites } from '../../common/utilities/mockData';
import { ALL_ROLES, getRoleShortLabel } from '../../common/utilities/roles';

// New Event creation dialog (PRD 6.1/US-01): log type first, then the common fields plus
// whatever fields that type needs — including the work→faults linking picker that powers
// the auto-close automation (see CombatLogContext.tsx).

interface NewEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    allEvents: CombatLogEvent[];
}

function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-primary transition-colors";
const labelClass = "text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1 block";

export const NewEventModal: React.FC<NewEventModalProps> = ({ isOpen, onClose, allEvents }) => {
    const { t, i18n } = useTranslation();
    const { createEvent } = useCombatLogContext();

    const [type, setType] = useState<CombatLogType | ''>('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [status, setStatus] = useState('');
    const [severity, setSeverity] = useState<CombatLogSeverity | ''>('');
    const [affectedSystem, setAffectedSystem] = useState('');
    const [relatedCommSiteId, setRelatedCommSiteId] = useState('');
    const [linkedFaultIds, setLinkedFaultIds] = useState<string[]>([]);
    const [attachments, setAttachments] = useState<{ fileName: string; fileType: 'word' | 'pdf' | 'excel' }[]>([]);
    const [assignedRoles, setAssignedRoles] = useState<UserRole[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const openFaults = useMemo(
        () => allEvents.filter(e => e.type === 'ict_faults' && !isTerminalStatus('ict_faults', e.status)),
        [allEvents]
    );

    const reset = () => {
        setType(''); setTitle(''); setDescription(''); setStart(''); setEnd(''); setStatus('');
        setSeverity(''); setAffectedSystem(''); setRelatedCommSiteId(''); setLinkedFaultIds([]); setAttachments([]); setAssignedRoles([]); setErrors({});
    };

    const handleClose = () => { reset(); onClose(); };

    const handleSelectType = (nextType: CombatLogType) => {
        setType(nextType);
        const now = new Date();
        if (nextType === 'work_future_events') {
            setStart(''); setEnd(''); // FR-03: no default — both mandatory
        } else {
            const defaultMinutes = COMBAT_LOG_END_TIME_DEFAULT_MINUTES[nextType] ?? 60;
            setStart(toDatetimeLocal(now.toISOString()));
            setEnd(toDatetimeLocal(new Date(now.getTime() + defaultMinutes * 60000).toISOString()));
        }
        setStatus(nextType === 'reports' ? '' : COMBAT_LOG_STATUS_OPTIONS[nextType][0]);
        setSeverity(''); setAffectedSystem(''); setRelatedCommSiteId(''); setLinkedFaultIds([]); setAssignedRoles([]);
    };

    const handleAttachFiles = (fileList: FileList | null) => {
        if (!fileList) return;
        const next = Array.from(fileList).map(f => {
            const ext = f.name.split('.').pop()?.toLowerCase();
            const fileType: 'word' | 'pdf' | 'excel' = ext === 'pdf' ? 'pdf' : (ext === 'xlsx' || ext === 'xls') ? 'excel' : 'word';
            return { fileName: f.name, fileType };
        });
        setAttachments(prev => [...prev, ...next]);
    };

    const validate = (): boolean => {
        if (!type) return false;
        const nextErrors: Record<string, string> = {};
        if (!title.trim()) nextErrors.title = t('combatLog.newEventModal.requiredError');
        if (!description.trim()) nextErrors.description = t('combatLog.newEventModal.requiredError');
        if (!start) nextErrors.start = t('combatLog.newEventModal.requiredError');
        if (type === 'work_future_events' && !end) nextErrors.end = t('combatLog.newEventModal.requiredError');
        if (type === 'ict_faults' && !severity) nextErrors.severity = t('combatLog.newEventModal.requiredError');
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate() || !type) return;
        createEvent({
            type,
            title: title.trim(),
            description: description.trim(),
            start: new Date(start).toISOString(),
            end: end ? new Date(end).toISOString() : undefined,
            status: type === 'reports' ? undefined : status,
            severity: type === 'ict_faults' ? (severity || undefined) : undefined,
            affectedSystem: type === 'ict_faults' ? (affectedSystem.trim() || undefined) : undefined,
            relatedCommSiteId: type === 'ict_faults' ? (relatedCommSiteId || undefined) : undefined,
            linkedFaultIds: type === 'work_future_events' ? linkedFaultIds : undefined,
            attachments,
            assignedToRoles: LINKABLE_COMBAT_LOG_TYPES.includes(type) ? assignedRoles : undefined,
        });
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-xl max-h-[88vh] overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-zinc-800 shrink-0 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('combatLog.newEventModal.title')}</h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{t('combatLog.newEventModal.subtitle')}</p>
                    </div>
                    <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div>
                        <label className={labelClass}>{t('combatLog.newEventModal.selectType')}</label>
                        <div className="flex flex-wrap gap-1.5">
                            {COMBAT_LOG_TYPES.map(lt => {
                                const color = COMBAT_LOG_TYPE_COLORS[lt];
                                const active = type === lt;
                                return (
                                    <button
                                        key={lt}
                                        onClick={() => handleSelectType(lt)}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors"
                                        style={active ? { background: `${color}1f`, color, borderColor: `${color}55` } : { borderColor: '#e2e8f0' }}
                                    >
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                                        {t(`combatLog.logTypes.${lt}`)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {type && (
                        <>
                            <div>
                                <label className={labelClass}>{t('combatLog.fields.title')}</label>
                                <input type="text" maxLength={120} value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
                                {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>{t('combatLog.fields.description')}</label>
                                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={inputClass} />
                                {errors.description && <p className="text-[11px] text-red-500 mt-1">{errors.description}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>{t('combatLog.fields.start')}</label>
                                    <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className={inputClass} />
                                    {errors.start && <p className="text-[11px] text-red-500 mt-1">{errors.start}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>{t('combatLog.fields.end')}</label>
                                    <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className={inputClass} />
                                    {errors.end && <p className="text-[11px] text-red-500 mt-1">{errors.end}</p>}
                                </div>
                            </div>

                            {type !== 'reports' && (
                                <div>
                                    <label className={labelClass}>{t('combatLog.fields.status')}</label>
                                    <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>
                                        {COMBAT_LOG_STATUS_OPTIONS[type].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}

                            {type === 'ict_faults' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>{t('combatLog.fields.severity')}</label>
                                        <select value={severity} onChange={e => setSeverity(e.target.value as CombatLogSeverity)} className={inputClass}>
                                            <option value="">—</option>
                                            {(['critical', 'high', 'medium', 'low'] as CombatLogSeverity[]).map(s => (
                                                <option key={s} value={s}>{t(`combatLog.severity.${s}`)}</option>
                                            ))}
                                        </select>
                                        {errors.severity && <p className="text-[11px] text-red-500 mt-1">{errors.severity}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass}>{t('combatLog.fields.affectedSystem')}</label>
                                        <input type="text" value={affectedSystem} onChange={e => setAffectedSystem(e.target.value)} className={inputClass} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelClass}>{t('combatLog.fields.relatedCommSite')}</label>
                                        <select value={relatedCommSiteId} onChange={e => setRelatedCommSiteId(e.target.value)} className={inputClass}>
                                            <option value="">—</option>
                                            {mockCommSites.map(site => (
                                                <option key={site.id} value={site.id}>{site.siteName[i18n.language] || site.siteName.en}</option>
                                            ))}
                                        </select>
                                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">{t('combatLog.newEventModal.relatedCommSiteHint')}</p>
                                    </div>
                                </div>
                            )}

                            {type === 'work_future_events' && (
                                <div>
                                    <label className={labelClass}>{t('combatLog.fields.linkedFaults')}</label>
                                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-2">{t('combatLog.newEventModal.linkedFaultsHint')}</p>
                                    {openFaults.length === 0 ? (
                                        <p className="text-xs text-slate-400 dark:text-zinc-500">{t('combatLog.newEventModal.noOpenFaults')}</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-zinc-700 p-2">
                                            {openFaults.map(fault => (
                                                <label key={fault.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={linkedFaultIds.includes(fault.id)}
                                                        onChange={() => setLinkedFaultIds(prev => prev.includes(fault.id) ? prev.filter(id => id !== fault.id) : [...prev, fault.id])}
                                                        className="accent-primary w-3.5 h-3.5"
                                                    />
                                                    <span className="text-slate-700 dark:text-zinc-200">{fault.title}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {LINKABLE_COMBAT_LOG_TYPES.includes(type) && (
                                <div>
                                    <label className={labelClass}>{t('combatLog.actions.assignRole')}</label>
                                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-2">{t('combatLog.newEventModal.assignRoleHint')}</p>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 max-h-32 overflow-y-auto rounded-lg border border-slate-200 dark:border-zinc-700 p-2">
                                        {ALL_ROLES.map(role => (
                                            <label key={role} className="flex items-center gap-2 text-xs cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={assignedRoles.includes(role)}
                                                    onChange={() => setAssignedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])}
                                                    className="accent-primary w-3.5 h-3.5"
                                                />
                                                <span className="text-slate-700 dark:text-zinc-200">{getRoleShortLabel(t, role)}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className={labelClass}>{t('combatLog.fields.attachments')}</label>
                                <label className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:border-primary hover:text-primary transition-colors cursor-pointer">
                                    <Paperclip className="w-3.5 h-3.5" />
                                    {t('combatLog.fields.attachments')}
                                    <input type="file" multiple className="hidden" onChange={e => handleAttachFiles(e.target.files)} />
                                </label>
                                {attachments.length > 0 && (
                                    <ul className="mt-2 space-y-1">
                                        {attachments.map((a, i) => (
                                            <li key={i} className="text-xs text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                                                <span className="truncate">{a.fileName}</span>
                                                <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-zinc-800 shrink-0">
                    <button onClick={handleClose} className="text-sm px-4 py-2 text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors font-medium">
                        {t('combatLog.actions.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!type}
                        className="text-sm px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none text-white dark:text-zinc-900 rounded-lg transition-colors font-medium shadow-sm"
                    >
                        {t('combatLog.actions.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};
