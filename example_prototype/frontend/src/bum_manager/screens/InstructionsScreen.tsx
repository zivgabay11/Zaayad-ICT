import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
import { FigmaIcon } from '../../common/widgets/FigmaIcon';
import { useBumContext } from '../../common/context/BumContext';
import { mockUnits } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';
import { BumCommanderInstruction } from '../../common/utilities/types';
import { formatBumDateTime } from '../utilities/bum';
import { getCommanderRoleKey, getUnitTree } from '../utilities/instructions';
import { Tile } from '../widgets/BumTile';
import { NeutralBadge } from '../widgets/BumBadges';
import { BumFilterRows } from '../widgets/BumFilterRows';
import { DeleteDemandModal } from '../widgets/DemandModals';

// הנחיות מפקד — the third sub-section of Bum Manager: ONLY rows of the instructions commanders
// pushed down to the field. Each row says which commander issued it, what it says and whether it
// is relevant to the viewing unit itself or to a specific unit beneath it. The category panel
// lists the viewing unit and every unit under it in the echelon tree (multi-select; none =
// everything).

interface Props {
    sessionUnitCode?: number;
}

const DEPTH_COLORS = ['#3f6b9a', '#2b6cb0', '#1f7f6b', '#7a4aa0', '#9b55a3'];

const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-primary transition-colors';
const labelClass = 'text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1 block';

export const InstructionsScreen: React.FC<Props> = ({ sessionUnitCode = 1000 }) => {
    const { t, i18n } = useTranslation();
    const { instructions, addInstruction, updateInstruction, deleteInstruction } = useBumContext();

    const [search, setSearch] = useState('');
    const [unitFilter, setUnitFilter] = useState<string[]>([]);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<BumCommanderInstruction | null>(null);
    const [deleting, setDeleting] = useState<BumCommanderInstruction[]>([]);

    const unitLabelOf = (code: number) => {
        const unit = mockUnits.find(u => u.code === code);
        return unit ? formatUnitName(unit as any, t, i18n.language) : String(code);
    };
    const relevanceLabelOf = (code: number) => (code === sessionUnitCode ? t('bumManager.instructions.myUnit', { unit: unitLabelOf(code) }) : unitLabelOf(code));

    const tree = useMemo(() => getUnitTree(sessionUnitCode), [sessionUnitCode]);
    const treeCodes = useMemo(() => tree.map(n => n.code), [tree]);

    // Everything relevant to the viewing unit or to any unit beneath it.
    const visible = useMemo(() => instructions.filter(i => treeCodes.includes(i.targetUnitCode)), [instructions, treeCodes]);
    const searched = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return visible;
        return visible.filter(i => [i.text, i.commanderName].some(v => v.toLowerCase().includes(q)));
    }, [visible, search]);
    const filtered = useMemo(() => {
        const list = unitFilter.length === 0 ? searched : searched.filter(i => unitFilter.includes(String(i.targetUnitCode)));
        return [...list].sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
    }, [searched, unitFilter]);

    const rows = tree.map(({ code, depth }) => ({
        key: String(code),
        label: relevanceLabelOf(code),
        color: DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)],
        count: searched.filter(i => i.targetUnitCode === code).length,
        depth,
        icon: <Building2 className="w-[18px] h-[18px]" />,
    }));

    const toggleUnit = (key: string) => setUnitFilter(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));

    const openNew = () => { setEditing(null); setFormOpen(true); };
    const openEdit = (i: BumCommanderInstruction) => { setEditing(i); setFormOpen(true); };
    const closeForm = () => { setFormOpen(false); setEditing(null); };
    const confirmDelete = () => { deleting.forEach(i => deleteInstruction(i.id)); setDeleting([]); };

    const roleLabelOf = (unitCode: number) => t(`bumManager.instructions.roles.${getCommanderRoleKey(unitCode)}`, { defaultValue: t('bumManager.instructions.roles.unit') });

    return (
        <div className="h-full flex flex-col w-full min-w-0 max-w-full overflow-hidden" data-instructions-screen>
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-lg font-bold leading-6 text-slate-900 dark:text-white">{t('bumManager.sections.instructions')}</h1>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{t('bumManager.instructions.subtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={openNew}
                        data-new-instruction
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <FigmaIcon name="tool-plus" /> {t('bumManager.instructions.newInstruction')}
                    </button>
                    <div className="relative">
                        <FigmaIcon name="tool-search" className="absolute top-1/2 -translate-y-1/2 start-2.5 text-slate-400 pointer-events-none" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('bumManager.toolbar.search')}
                            className="h-8 w-[220px] ps-8 pe-3 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-slate-800 dark:text-zinc-100 outline-none focus:border-primary"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 p-5">
                <div className="h-full grid gap-4 grid-cols-[minmax(0,1fr)_minmax(320px,28%)]">
                    <Tile title={t('bumManager.instructions.tableTitle', { count: filtered.length })} className="min-w-0">
                        <div className="bum-scroll h-full overflow-auto">
                            <table className="w-full text-sm border-separate border-spacing-0" data-instructions-table>
                                <thead>
                                    <tr className="text-xs text-slate-500 dark:text-zinc-400">
                                        {(['num', 'issuedAt', 'commander', 'text', 'relevance'] as const).map(col => (
                                            <th key={col} className="sticky top-0 z-10 text-start font-semibold px-3 py-2 bg-white dark:bg-[#2a2e37] border-b border-slate-200 dark:border-white/10 whitespace-nowrap">
                                                {t(`bumManager.instructions.cols.${col}`)}
                                            </th>
                                        ))}
                                        <th className="sticky top-0 z-10 bg-white dark:bg-[#2a2e37] border-b border-slate-200 dark:border-white/10 w-[72px]" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 && (
                                        <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-400 dark:text-zinc-500">{t('bumManager.instructions.empty')}</td></tr>
                                    )}
                                    {filtered.map((i, idx) => (
                                        <tr key={i.id} data-instruction-row={i.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
                                            <td className="px-3 py-3 border-b border-slate-100 dark:border-white/10 text-slate-500 dark:text-zinc-400 align-top">{idx + 1}</td>
                                            <td className="px-3 py-3 border-b border-slate-100 dark:border-white/10 whitespace-nowrap text-slate-600 dark:text-zinc-300 align-top">{formatBumDateTime(i.issuedAt)}</td>
                                            <td className="px-3 py-3 border-b border-slate-100 dark:border-white/10 align-top">
                                                <div className="font-semibold text-slate-900 dark:text-white">{i.commanderName}</div>
                                                <div className="text-xs text-slate-500 dark:text-zinc-400">{roleLabelOf(i.issuedByUnitCode)} · {unitLabelOf(i.issuedByUnitCode)}</div>
                                            </td>
                                            <td className="px-3 py-3 border-b border-slate-100 dark:border-white/10 text-slate-800 dark:text-zinc-100 align-top min-w-[260px]">{i.text}</td>
                                            <td className="px-3 py-3 border-b border-slate-100 dark:border-white/10 align-top whitespace-nowrap">
                                                <NeutralBadge>{relevanceLabelOf(i.targetUnitCode)}</NeutralBadge>
                                            </td>
                                            <td className="px-2 py-2 border-b border-slate-100 dark:border-white/10 align-top">
                                                <span className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                    <button onClick={() => openEdit(i)} aria-label={t('bumManager.menu.edit')} title={t('bumManager.menu.edit')} className="flex items-center justify-center w-6 h-6 rounded-[3px] text-slate-400 dark:text-zinc-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                                        <FigmaIcon name="tool-pencil" />
                                                    </button>
                                                    <button onClick={() => setDeleting([{ ...i }])} aria-label={t('bumManager.menu.delete')} title={t('bumManager.menu.delete')} className="flex items-center justify-center w-6 h-6 rounded-[3px] text-slate-400 dark:text-zinc-300 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                                        <FigmaIcon name="tool-trash-2" />
                                                    </button>
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Tile>
                    <Tile title={t('bumManager.instructions.unitsTitle')}>
                        <BumFilterRows rows={rows} selectedKeys={unitFilter} onToggle={toggleUnit} testIdPrefix="instr-unit" />
                    </Tile>
                </div>
            </div>

            <InstructionFormModal
                isOpen={formOpen}
                sessionUnitCode={sessionUnitCode}
                instruction={editing}
                targets={tree.map(n => ({ code: n.code, depth: n.depth, label: relevanceLabelOf(n.code) }))}
                onClose={closeForm}
                onSubmit={(data, id) => {
                    if (id) updateInstruction(id, data);
                    else addInstruction(data);
                    closeForm();
                }}
            />
            <DeleteDemandModal
                demands={deleting.map(i => ({ title: i.text }))}
                onConfirm={confirmDelete}
                onCancel={() => setDeleting([])}
                prefix="bumManager.instructions.delete"
            />
        </div>
    );
};

interface FormProps {
    isOpen: boolean;
    sessionUnitCode: number;
    instruction: BumCommanderInstruction | null;
    targets: Array<{ code: number; depth: number; label: string }>;
    onClose: () => void;
    onSubmit: (data: Omit<BumCommanderInstruction, 'id' | 'issuedAt'>, existingId?: string) => void;
}

// Add / edit an instruction: who the commander is, what the instruction says and which unit —
// the viewing unit or one beneath it — it is relevant to.
const InstructionFormModal: React.FC<FormProps> = ({ isOpen, sessionUnitCode, instruction, targets, onClose, onSubmit }) => {
    const { t } = useTranslation();
    const [commanderName, setCommanderName] = useState('');
    const [text, setText] = useState('');
    const [target, setTarget] = useState(String(sessionUnitCode));
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setCommanderName(instruction?.commanderName ?? '');
        setText(instruction?.text ?? '');
        setTarget(String(instruction?.targetUnitCode ?? sessionUnitCode));
        setError(false);
    }, [isOpen, instruction, sessionUnitCode]);

    if (!isOpen) return null;

    const submit = () => {
        if (!text.trim() || !commanderName.trim()) { setError(true); return; }
        onSubmit({
            issuedByUnitCode: instruction?.issuedByUnitCode ?? sessionUnitCode,
            commanderName: commanderName.trim(),
            text: text.trim(),
            targetUnitCode: Number(target),
        }, instruction?.id);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true" data-instruction-form>
                <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-zinc-800 shrink-0 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{t(instruction ? 'bumManager.instructions.form.editTitle' : 'bumManager.instructions.form.newTitle')}</h3>
                    <button onClick={onClose} aria-label={t('bumManager.form.cancel')} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"><FigmaIcon name="tool-x" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div>
                        <label className={labelClass}>{t('bumManager.instructions.form.commander')}</label>
                        <input type="text" value={commanderName} onChange={e => { setCommanderName(e.target.value); setError(false); }} placeholder={t('bumManager.instructions.form.commanderPlaceholder')} className={inputClass} name="commanderName" />
                    </div>
                    <div>
                        <label className={labelClass}>{t('bumManager.instructions.form.text')}</label>
                        <textarea rows={4} maxLength={1080} value={text} onChange={e => { setText(e.target.value); setError(false); }} placeholder={t('bumManager.instructions.form.textPlaceholder')} className={inputClass} name="text" />
                    </div>
                    <div>
                        <label className={labelClass}>{t('bumManager.instructions.form.relevantTo')}</label>
                        <select value={target} onChange={e => setTarget(e.target.value)} className={inputClass} name="targetUnitCode">
                            {targets.map(opt => (
                                <option key={opt.code} value={opt.code}>{`${'  '.repeat(opt.depth)}${opt.label}`}</option>
                            ))}
                        </select>
                    </div>
                    {error && <p className="text-[11px] text-red-500">{t('bumManager.instructions.form.required')}</p>}
                </div>
                <div className="px-5 py-4 border-t border-slate-200 dark:border-zinc-800 shrink-0 flex items-center gap-2">
                    <button onClick={submit} data-submit-instruction className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
                        {t(instruction ? 'bumManager.form.save' : 'bumManager.instructions.form.create')}
                    </button>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-sm font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                        {t('bumManager.form.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};
