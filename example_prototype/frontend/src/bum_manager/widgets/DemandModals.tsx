import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TriangleAlert } from 'lucide-react';
import { FigmaIcon } from '../../common/widgets/FigmaIcon';
import { BumDemand, BumDemandStatus, BumDemandType, BumSeverity, Cell } from '../../common/utilities/types';
import { mockUnits } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';
import { BUM_REPORTING_AGENTS, BUM_SEVERITIES, BUM_STATUS_ORDER, BumCategory, getBumEchelon } from '../utilities/bum';
import { NewBumDemand } from '../../common/context/BumContext';

// Add / edit a demand (PRD stories 8–9; fields from the Figma "דרישה חדשה" form: issuing
// authority, category, title, description, executor, severity, due date, reporting platform —
// plus type, status, notes and, for a division, an optional subordinate brigade to assign it
// to) and the delete confirmation (story 10: never a one-click delete).

const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-primary transition-colors';
const labelClass = 'text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1 block';

function toDatetimeLocal(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface FormProps {
    isOpen: boolean;
    unitCode: number;
    cell: Cell;
    categories: BumCategory[];
    demand: BumDemand | null; // set → edit mode
    onClose: () => void;
    onSubmit: (data: NewBumDemand) => void;
    onDelete?: (demand: BumDemand) => void;
}

export const DemandFormModal: React.FC<FormProps> = ({ isOpen, unitCode, cell, categories, demand, onClose, onSubmit, onDelete }) => {
    const { t, i18n } = useTranslation();
    const echelon = getBumEchelon(unitCode);
    const agents = BUM_REPORTING_AGENTS[echelon];
    const brigades = mockUnits.filter(u => Number(u.parentCode) === unitCode && u.type === 'brigade');

    const [reportingAgent, setReportingAgent] = useState(agents[0]);
    const [category, setCategory] = useState(categories[0]?.key ?? 'other');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<BumDemandType>('demand');
    const [executor, setExecutor] = useState('');
    const [severity, setSeverity] = useState<BumSeverity>(1);
    const [status, setStatus] = useState<BumDemandStatus>('backlog');
    const [dueAt, setDueAt] = useState('');
    const [platform, setPlatform] = useState('');
    const [notes, setNotes] = useState('');
    const [assigned, setAssigned] = useState('');
    const [titleError, setTitleError] = useState(false);

    // Re-seed the fields every time the modal opens (for a new demand or a different one).
    useEffect(() => {
        if (!isOpen) return;
        setReportingAgent(demand?.reportingAgent ?? agents[0]);
        setCategory(demand?.category ?? categories[0]?.key ?? 'other');
        setTitle(demand?.title ?? '');
        setDescription(demand?.description ?? '');
        setType(demand?.type ?? 'demand');
        setExecutor(demand?.executor ?? '');
        setSeverity(demand?.severity ?? 1);
        setStatus(demand?.status ?? 'backlog');
        setDueAt(toDatetimeLocal(demand?.dueAt));
        setPlatform(demand?.reportingPlatform ?? '');
        setNotes(demand?.notes ?? '');
        setAssigned(demand?.assignedUnitCode !== undefined ? String(demand.assignedUnitCode) : '');
        setTitleError(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, demand]);

    if (!isOpen) return null;

    const submit = () => {
        if (!title.trim()) { setTitleError(true); return; }
        onSubmit({
            unitCode: demand?.unitCode ?? unitCode,
            assignedUnitCode: assigned ? Number(assigned) : undefined,
            createdByCell: demand?.createdByCell ?? cell,
            reportingAgent,
            category,
            title: title.trim(),
            description: description.trim(),
            type,
            executor: executor.trim(),
            severity,
            status,
            startAt: demand?.startAt ?? new Date().toISOString(),
            dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
            reportingPlatform: platform.trim() || undefined,
            notes: notes.trim() || undefined,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
                <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-zinc-800 shrink-0 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{t(demand ? 'bumManager.form.editTitle' : 'bumManager.form.newTitle')}</h3>
                    <button onClick={onClose} aria-label={t('bumManager.form.cancel')} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"><FigmaIcon name="tool-x" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>{t('bumManager.form.reportingAgent')}</label>
                            <select value={reportingAgent} onChange={e => setReportingAgent(e.target.value)} className={inputClass} name="reportingAgent">
                                {agents.map(a => <option key={a} value={a}>{t(`bumManager.agents.${a}`)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>{t('bumManager.form.category')}</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className={inputClass} name="category">
                                {categories.map(c => <option key={c.key} value={c.key}>{t(`bumManager.categories.${c.key}`)}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>{t('bumManager.form.title')}</label>
                        <input type="text" maxLength={256} value={title} onChange={e => { setTitle(e.target.value); setTitleError(false); }} placeholder={t('bumManager.form.titlePlaceholder')} className={inputClass} name="title" />
                        {titleError && <p className="text-[11px] text-red-500 mt-1">{t('bumManager.form.titleRequired')}</p>}
                    </div>

                    <div>
                        <label className={labelClass}>{t('bumManager.form.description')}</label>
                        <textarea rows={4} maxLength={1080} value={description} onChange={e => setDescription(e.target.value)} placeholder={t('bumManager.form.descriptionPlaceholder')} className={inputClass} name="description" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className={labelClass}>{t('bumManager.form.executor')}</label>
                            <input type="text" value={executor} onChange={e => setExecutor(e.target.value)} className={inputClass} name="executor" />
                        </div>
                        <div>
                            <label className={labelClass}>{t('bumManager.form.severity')}</label>
                            <select value={severity} onChange={e => setSeverity(Number(e.target.value) as BumSeverity)} className={inputClass} name="severity">
                                {BUM_SEVERITIES.map(s => <option key={s} value={s}>{s} - {t(`bumManager.severityLevels.${s}`)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>{t('bumManager.form.dueAt')}</label>
                            <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} className={inputClass} name="dueAt" />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>{t('bumManager.form.reportingPlatform')}</label>
                        <input type="text" value={platform} onChange={e => setPlatform(e.target.value)} placeholder="Teams / Phone / Email / Radio" className={inputClass} name="reportingPlatform" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>{t('bumManager.form.type')}</label>
                            <div className="flex gap-1.5">
                                {(['demand', 'instruction'] as BumDemandType[]).map(v => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setType(v)}
                                        aria-pressed={type === v}
                                        className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${type === v ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'}`}
                                    >
                                        {t(`bumManager.type.${v}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>{t('bumManager.form.status')}</label>
                            <select value={status} onChange={e => setStatus(e.target.value as BumDemandStatus)} className={inputClass} name="status">
                                {BUM_STATUS_ORDER.map(s => <option key={s} value={s}>{t(`bumManager.status.${s}`)}</option>)}
                            </select>
                        </div>
                    </div>

                    {brigades.length > 0 && (
                        <div>
                            <label className={labelClass}>{t('bumManager.form.assignToBrigade')}</label>
                            <select value={assigned} onChange={e => setAssigned(e.target.value)} className={inputClass} name="assignedUnitCode">
                                <option value="">{t('bumManager.form.noAssignment')}</option>
                                {brigades.map(b => <option key={b.code} value={b.code}>{formatUnitName(b as any, t, i18n.language)}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className={labelClass}>{t('bumManager.form.notes')}</label>
                        <textarea rows={2} maxLength={1080} value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} name="notes" />
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-slate-200 dark:border-zinc-800 shrink-0 flex items-center gap-2">
                    <button onClick={submit} data-submit-demand className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
                        {t(demand ? 'bumManager.form.save' : 'bumManager.form.create')}
                    </button>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-sm font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                        {t('bumManager.form.cancel')}
                    </button>
                    {demand && onDelete && (
                        <button onClick={() => onDelete(demand)} className="ms-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <FigmaIcon name="tool-trash-2" /> {t('bumManager.menu.delete')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

interface DeleteProps {
    demands: Array<{ title: string }>;
    onConfirm: () => void;
    onCancel: () => void;
    // i18n namespace holding titleOne / titleMany / descriptionOne / descriptionMany
    prefix?: string;
}

export const DeleteDemandModal: React.FC<DeleteProps> = ({ demands, onConfirm, onCancel, prefix = 'bumManager.delete' }) => {
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
                        <button onClick={onCancel} className="text-sm px-4 py-2 text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors font-medium">{t('bumManager.form.cancel')}</button>
                        <button onClick={onConfirm} data-confirm-delete className="text-sm px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-sm">{t('bumManager.menu.delete')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
