import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Flag, ChevronDown, Plus, Pencil, Move, Trash2, Check, X } from 'lucide-react';
import { HeadquartersEntity, HeadquartersKind } from '../../common/utilities/types';
import { mockUnits } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';
import { getHeadquartersLevel } from '../../common/utilities/headquartersIcon';
import { useLinkPlanningContext } from '../../common/context/LinkPlanningContext';
import { useHeadquartersLayerContext } from '../../common/context/HeadquartersLayerContext';
import { useHeadquartersMapRequestContext } from '../../common/context/HeadquartersMapRequestContext';
import { ConfirmDeleteModal } from '../../common/widgets/ConfirmDeleteModal';

// One column of a unit row — every transferred headquarters (or every command post) the unit
// owns. Each entity is its own accordion: the collapsed line shows the name, the drill-down
// shows every field the entity actually carries (nothing invented beyond the data model) plus
// its actions: rename (inline), move (picked on the map) and delete (confirmed). A unit with
// none gets an "add" action that sends the user to the map to place one straight into ניהו"ק.
// Sky-blue matches the colour convention for "already in ניהו"ק" used on the map.

interface Props {
    kind: HeadquartersKind;
    unitCode: number;
    entities: HeadquartersEntity[];
}

const DetailField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="min-w-0">
        <dt className="text-[11px] text-slate-500 dark:text-zinc-500">{label}</dt>
        <dd className="text-sm text-slate-800 dark:text-zinc-200 break-words">{value}</dd>
    </div>
);

const ActionButton: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean }> = ({ onClick, icon, label, danger }) => (
    <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${danger
            ? 'border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
            : 'border-slate-200 dark:border-[var(--figma-ptl-card-border)] text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/10'}`}
    >
        {icon} {label}
    </button>
);

export const HeadquartersEntityCell: React.FC<Props> = ({ kind, unitCode, entities }) => {
    const { t, i18n } = useTranslation();
    const { renameHeadquartersEntity, removeHeadquartersEntity } = useLinkPlanningContext();
    const { removeEntity: removeFromLayer } = useHeadquartersLayerContext();
    const { requestAdd, requestMove } = useHeadquartersMapRequestContext();
    const [openIds, setOpenIds] = useState<Set<string>>(new Set());
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [draftName, setDraftName] = useState('');
    const [deleting, setDeleting] = useState<HeadquartersEntity | null>(null);

    const Icon = kind === 'headquarters' ? Building2 : Flag;

    if (entities.length === 0) {
        return (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1">
                <p className="text-xs italic text-slate-400 dark:text-zinc-600">
                    {t(kind === 'headquarters' ? 'headquartersOverview.noHeadquarters' : 'headquartersOverview.noCommandPost')}
                </p>
                <button
                    onClick={() => requestAdd(kind, unitCode)}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md text-sky-700 dark:text-[var(--figma-info-text)] hover:bg-sky-50 dark:hover:bg-white/5 font-medium transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                    {t(kind === 'headquarters' ? 'headquartersOverview.addHeadquarters' : 'headquartersOverview.addCommandPost')}
                </button>
            </div>
        );
    }

    const toggle = (id: string) => setOpenIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const startRename = (entity: HeadquartersEntity) => {
        setRenamingId(entity.id);
        setDraftName(entity.name);
    };

    const saveRename = () => {
        const trimmed = draftName.trim();
        if (renamingId && trimmed) renameHeadquartersEntity(renamingId, trimmed);
        setRenamingId(null);
    };

    const confirmDelete = () => {
        if (!deleting) return;
        removeHeadquartersEntity(deleting.id);
        removeFromLayer(deleting.id);
        setDeleting(null);
    };

    return (
        <div className="flex flex-col gap-1.5 min-w-0">
            {entities.map(entity => {
                const isOpen = openIds.has(entity.id);
                const isRenaming = renamingId === entity.id;
                const unit = mockUnits.find(u => u.code === entity.unitCode);
                const level = getHeadquartersLevel(entity.unitCode);
                return (
                    <div
                        key={entity.id}
                        className="rounded-lg border border-sky-200 dark:border-[var(--figma-ptl-card-border)] bg-sky-50/60 dark:bg-[var(--figma-ptl-card-bg)] overflow-hidden"
                    >
                        <button
                            onClick={() => toggle(entity.id)}
                            aria-expanded={isOpen}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-start hover:bg-sky-100/70 dark:hover:bg-white/5 transition-colors"
                        >
                            <Icon className="w-4 h-4 shrink-0 text-sky-600 dark:text-[var(--figma-info-text)]" />
                            <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{entity.name}</span>
                            <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                            <div className="border-t border-sky-200/70 dark:border-[var(--figma-ptl-card-border)] bg-white/70 dark:bg-[var(--figma-ptl-panel-bg)]">
                                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-2.5">
                                    <DetailField
                                        label={t('headquartersOverview.details.name')}
                                        value={isRenaming ? (
                                            <span className="flex items-center gap-1">
                                                <input
                                                    autoFocus
                                                    value={draftName}
                                                    onChange={e => setDraftName(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') saveRename();
                                                        if (e.key === 'Escape') setRenamingId(null);
                                                    }}
                                                    className="w-full min-w-0 text-sm px-2 py-1 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                />
                                                <button onClick={saveRename} aria-label={t('headquartersOverview.actions.save')} className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><Check className="w-4 h-4" /></button>
                                                <button onClick={() => setRenamingId(null)} aria-label={t('headquartersOverview.actions.cancel')} className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"><X className="w-4 h-4" /></button>
                                            </span>
                                        ) : entity.name}
                                    />
                                    <DetailField label={t('headquartersOverview.details.unit')} value={unit ? formatUnitName(unit as any, t, i18n.language) : entity.unitCode} />
                                    <DetailField label={t('headquartersOverview.details.kind')} value={t(`headquartersOverview.kind.${entity.kind}`)} />
                                    <DetailField label={t('headquartersOverview.details.level')} value={level ? t(`definitions.levels.${level}`) : '—'} />
                                    <DetailField
                                        label={t('headquartersOverview.details.location')}
                                        value={<span dir="ltr">{entity.position.lat.toFixed(5)}, {entity.position.lng.toFixed(5)}</span>}
                                    />
                                    <DetailField
                                        label={t('headquartersOverview.details.created')}
                                        value={<span dir="ltr">{new Date(entity.createdAt).toLocaleString(i18n.language === 'he' ? 'he-IL' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                                    />
                                </dl>
                                <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-slate-100 dark:border-[var(--figma-table-row-border)]">
                                    <ActionButton onClick={() => startRename(entity)} icon={<Pencil className="w-3.5 h-3.5" />} label={t('headquartersOverview.actions.rename')} />
                                    <ActionButton onClick={() => requestMove(entity.id)} icon={<Move className="w-3.5 h-3.5" />} label={t('headquartersOverview.actions.move')} />
                                    <ActionButton onClick={() => setDeleting(entity)} icon={<Trash2 className="w-3.5 h-3.5" />} label={t('headquartersOverview.actions.delete')} danger />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            <ConfirmDeleteModal
                demands={deleting ? [{ title: deleting.name }] : []}
                onConfirm={confirmDelete}
                onCancel={() => setDeleting(null)}
                prefix={deleting?.kind === 'headquarters' ? 'headquartersOverview.deleteHeadquarters' : 'headquartersOverview.deleteCommandPost'}
            />
        </div>
    );
};
