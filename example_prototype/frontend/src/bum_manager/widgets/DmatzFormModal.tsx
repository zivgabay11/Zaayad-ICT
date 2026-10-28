import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Paperclip } from 'lucide-react';
import { FigmaIcon } from '../../common/widgets/FigmaIcon';
import { BumAttachment, BumDmatz, BumDmatzStatus, BumSeverity } from '../../common/utilities/types';
import { NewBumDmatz } from '../../common/context/BumContext';
import { BUM_SEVERITIES } from '../utilities/bum';
import { DMATZ_MAX_STORED_FILE_BYTES, DMATZ_STATUS_ORDER, formatFileSize, getSuperiorUnitCode } from '../utilities/dmatz';

// Raise / open a דמ"צ. A new one (or one the viewing unit raised) is fully editable and always
// goes to the unit's superior; one the viewing unit RECEIVED is read-only except for its status
// and the notes (the receiving unit answers it). Files can be attached to a דמ"צ the viewing
// unit raised, and any attached file with stored content can be downloaded again.

const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
const labelClass = 'text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1 block';

function toDatetimeLocal(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
});

interface Props {
    isOpen: boolean;
    viewingUnitCode: number;
    dmatz: BumDmatz | null; // set → open an existing one
    unitLabelOf: (unitCode: number) => string;
    onClose: () => void;
    onSubmit: (data: NewBumDmatz, existingId?: string) => void;
    onDelete?: (dmatz: BumDmatz) => void;
}

export const DmatzFormModal: React.FC<Props> = ({ isOpen, viewingUnitCode, dmatz, unitLabelOf, onClose, onSubmit, onDelete }) => {
    const { t } = useTranslation();
    const fileInput = useRef<HTMLInputElement>(null);

    const isReceived = !!dmatz && dmatz.toUnitCode === viewingUnitCode;
    const superior = dmatz ? dmatz.toUnitCode : getSuperiorUnitCode(viewingUnitCode);
    const canEditFields = !isReceived;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [equipment, setEquipment] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [severity, setSeverity] = useState<BumSeverity>(1);
    const [dueAt, setDueAt] = useState('');
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState<BumDmatzStatus>('submitted');
    const [attachments, setAttachments] = useState<BumAttachment[]>([]);
    const [titleError, setTitleError] = useState(false);
    const [notStoredNames, setNotStoredNames] = useState<string[]>([]);

    // Re-seed every time the modal opens (new one, or a different existing one).
    useEffect(() => {
        if (!isOpen) return;
        setTitle(dmatz?.title ?? '');
        setDescription(dmatz?.description ?? '');
        setEquipment(dmatz?.equipment ?? '');
        setQuantity(dmatz?.quantity ?? 1);
        setSeverity(dmatz?.severity ?? 1);
        setDueAt(toDatetimeLocal(dmatz?.dueAt));
        setNotes(dmatz?.notes ?? '');
        setStatus(dmatz?.status ?? 'submitted');
        setAttachments(dmatz?.attachments ?? []);
        setTitleError(false);
        setNotStoredNames([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, dmatz]);

    if (!isOpen) return null;

    const addFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const added: BumAttachment[] = [];
        const tooBig: string[] = [];
        for (const file of Array.from(files)) {
            const storeContent = file.size <= DMATZ_MAX_STORED_FILE_BYTES;
            let dataUrl: string | undefined;
            if (storeContent) {
                try { dataUrl = await readAsDataUrl(file); } catch { dataUrl = undefined; }
            } else {
                tooBig.push(file.name);
            }
            added.push({ id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: file.name, size: file.size, mimeType: file.type || 'application/octet-stream', dataUrl });
        }
        setAttachments(prev => [...prev, ...added]);
        setNotStoredNames(prev => [...prev, ...tooBig]);
        if (fileInput.current) fileInput.current.value = '';
    };

    const submit = () => {
        if (superior === undefined) return;
        if (!title.trim()) { setTitleError(true); return; }
        onSubmit({
            fromUnitCode: dmatz?.fromUnitCode ?? viewingUnitCode,
            toUnitCode: superior,
            title: title.trim(),
            description: description.trim(),
            equipment: equipment.trim(),
            quantity: Math.max(1, Math.round(quantity) || 1),
            severity,
            status,
            dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
            attachments,
            notes: notes.trim() || undefined,
        }, dmatz?.id);
    };

    const heading = !dmatz ? 'bumManager.dmatz.form.newTitle' : isReceived ? 'bumManager.dmatz.form.receivedTitle' : 'bumManager.dmatz.form.editTitle';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true" data-dmatz-form>
                <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-zinc-800 shrink-0 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{t(heading)}</h3>
                    <button onClick={onClose} aria-label={t('bumManager.form.cancel')} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"><FigmaIcon name="tool-x" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>{t('bumManager.dmatz.form.from')}</label>
                            <div className={`${inputClass} !opacity-100 bg-slate-50 dark:bg-zinc-800/60`}>{unitLabelOf(dmatz?.fromUnitCode ?? viewingUnitCode)}</div>
                        </div>
                        <div>
                            <label className={labelClass}>{t('bumManager.dmatz.form.to')}</label>
                            <div className={`${inputClass} !opacity-100 bg-slate-50 dark:bg-zinc-800/60`}>{superior === undefined ? '—' : unitLabelOf(superior)}</div>
                        </div>
                    </div>
                    {superior === undefined && (
                        <p className="text-xs text-amber-600 dark:text-amber-400" data-no-superior>{t('bumManager.dmatz.form.noSuperior')}</p>
                    )}

                    <div>
                        <label className={labelClass}>{t('bumManager.form.title')}</label>
                        <input type="text" maxLength={256} disabled={!canEditFields} value={title} onChange={e => { setTitle(e.target.value); setTitleError(false); }} placeholder={t('bumManager.dmatz.form.titlePlaceholder')} className={inputClass} name="title" />
                        {titleError && <p className="text-[11px] text-red-500 mt-1">{t('bumManager.form.titleRequired')}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className={labelClass}>{t('bumManager.dmatz.form.equipment')}</label>
                            <input type="text" disabled={!canEditFields} value={equipment} onChange={e => setEquipment(e.target.value)} placeholder={t('bumManager.dmatz.form.equipmentPlaceholder')} className={inputClass} name="equipment" />
                        </div>
                        <div>
                            <label className={labelClass}>{t('bumManager.dmatz.form.quantity')}</label>
                            <input type="number" min={1} disabled={!canEditFields} value={quantity} onChange={e => setQuantity(Number(e.target.value))} className={inputClass} name="quantity" />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>{t('bumManager.form.description')}</label>
                        <textarea rows={3} maxLength={1080} disabled={!canEditFields} value={description} onChange={e => setDescription(e.target.value)} placeholder={t('bumManager.dmatz.form.descriptionPlaceholder')} className={inputClass} name="description" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>{t('bumManager.form.severity')}</label>
                            <select disabled={!canEditFields} value={severity} onChange={e => setSeverity(Number(e.target.value) as BumSeverity)} className={inputClass} name="severity">
                                {BUM_SEVERITIES.map(s => <option key={s} value={s}>{s} - {t(`bumManager.severityLevels.${s}`)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>{t('bumManager.dmatz.form.neededBy')}</label>
                            <input type="datetime-local" disabled={!canEditFields} value={dueAt} onChange={e => setDueAt(e.target.value)} className={inputClass} name="dueAt" />
                        </div>
                    </div>

                    {/* Attachments */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className={`${labelClass} !mb-0`}>{t('bumManager.dmatz.form.attachments')}</label>
                            {canEditFields && (
                                <>
                                    <input ref={fileInput} type="file" multiple onChange={e => addFiles(e.target.files)} className="hidden" data-dmatz-file-input />
                                    <button type="button" onClick={() => fileInput.current?.click()} data-dmatz-add-file className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                                        <Paperclip className="w-3.5 h-3.5" /> {t('bumManager.dmatz.form.addFile')}
                                    </button>
                                </>
                            )}
                        </div>
                        {attachments.length === 0 ? (
                            <p className="text-xs text-slate-400 dark:text-zinc-500">{t('bumManager.dmatz.form.noFiles')}</p>
                        ) : (
                            <ul className="flex flex-col gap-1.5">
                                {attachments.map(a => (
                                    <li key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 px-3 py-1.5 text-sm" data-dmatz-attachment>
                                        <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="flex-1 min-w-0 truncate text-slate-800 dark:text-zinc-100">{a.name}</span>
                                        <span className="text-xs text-slate-500 dark:text-zinc-400 shrink-0">{formatFileSize(a.size)}</span>
                                        {a.dataUrl && (
                                            <a href={a.dataUrl} download={a.name} aria-label={t('bumManager.dmatz.form.download')} title={t('bumManager.dmatz.form.download')} className="p-1 rounded text-slate-500 hover:text-primary hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors">
                                                <Download className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                        {canEditFields && (
                                            <button type="button" onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))} aria-label={t('bumManager.dmatz.form.removeFile')} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors">
                                                <FigmaIcon name="tool-x" size={14} />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {notStoredNames.length > 0 && (
                            <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">{t('bumManager.dmatz.form.tooLarge', { names: notStoredNames.join(', ') })}</p>
                        )}
                    </div>

                    {/* The receiving unit answers: status + notes. The raising unit sees the status read-only. */}
                    {dmatz && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>{t('bumManager.form.status')}</label>
                                <select disabled={!isReceived} value={status} onChange={e => setStatus(e.target.value as BumDmatzStatus)} className={inputClass} name="status">
                                    {DMATZ_STATUS_ORDER.map(s => <option key={s} value={s}>{t(`bumManager.dmatz.status.${s}`)}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className={labelClass}>{t('bumManager.form.notes')}</label>
                        <textarea rows={2} maxLength={1080} value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} name="notes" />
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-slate-200 dark:border-zinc-800 shrink-0 flex items-center gap-2">
                    <button onClick={submit} disabled={superior === undefined} data-submit-dmatz className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-sm">
                        {t(!dmatz ? 'bumManager.dmatz.form.raise' : 'bumManager.form.save')}
                    </button>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-sm font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                        {t('bumManager.form.cancel')}
                    </button>
                    {dmatz && !isReceived && onDelete && (
                        <button onClick={() => onDelete(dmatz)} className="ms-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <FigmaIcon name="tool-trash-2" /> {t('bumManager.menu.delete')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
