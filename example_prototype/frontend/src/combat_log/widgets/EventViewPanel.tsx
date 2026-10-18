import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Pencil, Share2, Paperclip, FileText, Cpu, Users } from 'lucide-react';
import { CombatLogEvent, UserRole } from '../../common/utilities/types';
import { COMBAT_LOG_TYPE_COLORS, getEditPermission, LINKABLE_COMBAT_LOG_TYPES } from '../../common/utilities/combatLog';
import { mockUnits, mockCommSites } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';
import { getRoleShortLabel } from '../../common/utilities/roles';

// Read-only view panel (PRD 6.3/US-03): every relevant field, the full update history
// (each entry with author + timestamp, automation-generated ones marked distinctly), and
// attachments — with Edit/Share actions gated by the same permission model as the editor.

interface EventViewPanelProps {
    event: CombatLogEvent | null;
    onClose: () => void;
    onEdit: (id: string) => void;
    onShare: (id: string) => void;
    onAssignRole: (id: string) => void;
    viewingUnitCode: number;
    viewingRole?: UserRole; // set when opened from the Personal Task Log — grants full view/edit rights when the event is assigned to this role
}

export const EventViewPanel: React.FC<EventViewPanelProps> = ({ event, onClose, onEdit, onShare, onAssignRole, viewingUnitCode, viewingRole }) => {
    const { t, i18n } = useTranslation();
    if (!event) return null;
    const isLinkable = LINKABLE_COMBAT_LOG_TYPES.includes(event.type);

    const color = COMBAT_LOG_TYPE_COLORS[event.type];
    const permission = getEditPermission(event, viewingUnitCode, viewingRole);
    const canEdit = permission === 'owner' || permission === 'sharedFull' || permission === 'sharedAttachmentsOnly';
    const reporterUnit = mockUnits.find(u => u.code === event.reporterUnitCode);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-zinc-800 shrink-0 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full mb-2" style={{ background: `${color}1f`, color }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                            {t(`combatLog.logTypes.${event.type}`)}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{event.title}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-zinc-300 whitespace-pre-wrap">{event.description}</p>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-xs text-slate-400 dark:text-zinc-500 block">{t('combatLog.fields.start')}</span>{new Date(event.start).toLocaleString()}</div>
                        <div><span className="text-xs text-slate-400 dark:text-zinc-500 block">{t('combatLog.fields.end')}</span>{event.end ? new Date(event.end).toLocaleString() : '—'}</div>
                        <div><span className="text-xs text-slate-400 dark:text-zinc-500 block">{t('combatLog.fields.status')}</span>{event.status}</div>
                        <div><span className="text-xs text-slate-400 dark:text-zinc-500 block">{t('combatLog.fields.reporter')}</span>{event.reporterUserName} · {reporterUnit ? formatUnitName(reporterUnit as any, t, i18n.language) : event.reporterUnitCode}</div>
                        {event.severity && <div><span className="text-xs text-slate-400 dark:text-zinc-500 block">{t('combatLog.fields.severity')}</span>{t(`combatLog.severity.${event.severity}`)}</div>}
                        {event.affectedSystem && <div><span className="text-xs text-slate-400 dark:text-zinc-500 block">{t('combatLog.fields.affectedSystem')}</span>{event.affectedSystem}</div>}
                        {event.relatedCommSiteId && (() => {
                            const site = mockCommSites.find(s => s.id === event.relatedCommSiteId);
                            return site ? <div><span className="text-xs text-slate-400 dark:text-zinc-500 block">{t('combatLog.fields.relatedCommSite')}</span>{site.siteName[i18n.language] || site.siteName.en}</div> : null;
                        })()}
                        {isLinkable && (event.assignedToRoles?.length ?? 0) > 0 && (
                            <div className="col-span-2">
                                <span className="text-xs text-slate-400 dark:text-zinc-500 block mb-1">{t('combatLog.assignRoleModal.assignedRolesLabel')}</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {event.assignedToRoles!.map(role => (
                                        <span key={role} className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-slate-300/60 dark:border-zinc-600/60 bg-black/5 dark:bg-white/5 text-slate-600 dark:text-zinc-300">
                                            {getRoleShortLabel(t, role)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">{t('combatLog.viewPanel.history')}</h4>
                        {event.updateNotes.length === 0 ? (
                            <p className="text-xs text-slate-400 dark:text-zinc-500">{t('combatLog.viewPanel.noHistory')}</p>
                        ) : (
                            <ul className="space-y-2">
                                {event.updateNotes.map(note => (
                                    <li key={note.id} className="text-sm rounded-lg bg-slate-50 dark:bg-zinc-800/50 px-3 py-2">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            {note.system && <Cpu className="w-3 h-3 text-primary shrink-0" />}
                                            <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">{note.authorUserName}</span>
                                            {note.system && <span className="text-[10px] font-bold text-primary">· {t('combatLog.viewPanel.systemNote')}</span>}
                                            <span className="text-[11px] text-slate-400 dark:text-zinc-500">· {new Date(note.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-slate-700 dark:text-zinc-200">{note.text}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">{t('combatLog.viewPanel.attachments')}</h4>
                        {event.attachments.length === 0 ? (
                            <p className="text-xs text-slate-400 dark:text-zinc-500">{t('combatLog.viewPanel.noAttachments')}</p>
                        ) : (
                            <ul className="space-y-1.5">
                                {event.attachments.map(a => (
                                    <li key={a.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-300">
                                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{a.fileName}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-zinc-800 shrink-0">
                    <button onClick={() => onShare(event.id)} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors font-medium">
                        <Share2 className="w-3.5 h-3.5" /> {t('combatLog.actions.share')}
                    </button>
                    {isLinkable && (
                        <button onClick={() => onAssignRole(event.id)} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors font-medium">
                            <Users className="w-3.5 h-3.5" /> {t('combatLog.actions.assignRole')}
                        </button>
                    )}
                    {canEdit && (
                        <button onClick={() => onEdit(event.id)} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 bg-primary hover:bg-primary/90 text-white dark:text-zinc-900 rounded-lg transition-colors font-medium shadow-sm">
                            <Pencil className="w-3.5 h-3.5" /> {t('combatLog.actions.edit')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
