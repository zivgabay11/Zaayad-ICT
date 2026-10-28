import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { FigmaIcon } from '../../common/widgets/FigmaIcon';
import { useBumContext, NewBumDmatz } from '../../common/context/BumContext';
import { mockUnits } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';
import { BumDmatz } from '../../common/utilities/types';
import {
    DMATZ_DIRECTIONS, DmatzDirection, dmatzDirectionOf, getSuperiorUnitCode, isDmatzVisibleTo,
} from '../utilities/dmatz';
import { Tile } from '../widgets/BumTile';
import { BumFilterRows } from '../widgets/BumFilterRows';
import { DmatzBoard } from '../widgets/DmatzBoard';
import { DmatzFormModal } from '../widgets/DmatzFormModal';
import { DeleteDemandModal } from '../widgets/DemandModals';

// דמ"צים — the second sub-section of Bum Manager: equipment & means requests. A unit raises a
// דמ"צ to the unit above it (its "superior") and can attach files to it; the superior works
// through the ones it received. Kanban view with a category panel that splits the list into the
// דמ"צים the viewing unit raised and the ones it received (select one, both, or none = all).

interface Props {
    sessionUnitCode?: number;
}

export const DmatzScreen: React.FC<Props> = ({ sessionUnitCode = 1000 }) => {
    const { t, i18n } = useTranslation();
    const { dmatzim, addDmatz, updateDmatz, deleteDmatz, setDmatzStatus } = useBumContext();

    const [search, setSearch] = useState('');
    const [directions, setDirections] = useState<DmatzDirection[]>([]);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<BumDmatz | null>(null);
    const [deleting, setDeleting] = useState<BumDmatz[]>([]);

    const hasSuperior = getSuperiorUnitCode(sessionUnitCode) !== undefined;

    const unitLabelOf = (code: number) => {
        const unit = mockUnits.find(u => u.code === code);
        return unit ? formatUnitName(unit as any, t, i18n.language) : String(code);
    };

    const visible = useMemo(() => dmatzim.filter(d => isDmatzVisibleTo(d, sessionUnitCode)), [dmatzim, sessionUnitCode]);
    const searched = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return visible;
        return visible.filter(d => [d.title, d.description, d.equipment, d.notes ?? ''].some(v => v.toLowerCase().includes(q)));
    }, [visible, search]);
    const filtered = useMemo(() => {
        const list = directions.length === 0 ? searched : searched.filter(d => directions.includes(dmatzDirectionOf(d, sessionUnitCode)));
        // Earliest needed-by date first; those with no date go last.
        return [...list].sort((a, b) => (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity));
    }, [searched, directions, sessionUnitCode]);

    const rows = DMATZ_DIRECTIONS.map(({ key, color }) => ({
        key,
        color,
        label: t(`bumManager.dmatz.directions.${key}`),
        hint: t(`bumManager.dmatz.directions.${key}Hint`),
        count: searched.filter(d => dmatzDirectionOf(d, sessionUnitCode) === key).length,
        icon: key === 'raised' ? <ArrowUpFromLine className="w-[18px] h-[18px]" /> : <ArrowDownToLine className="w-[18px] h-[18px]" />,
    }));

    const toggleDirection = (key: string) => setDirections(prev => (prev.includes(key as DmatzDirection) ? prev.filter(k => k !== key) : [...prev, key as DmatzDirection]));

    const openNew = () => { setEditing(null); setFormOpen(true); };
    const openExisting = (d: BumDmatz) => { setEditing(d); setFormOpen(true); };
    const closeForm = () => { setFormOpen(false); setEditing(null); };
    const requestDelete = (list: BumDmatz[]) => { setFormOpen(false); setDeleting(list); };

    const handleSubmit = (data: NewBumDmatz, existingId?: string) => {
        if (existingId) updateDmatz(existingId, data);
        else addDmatz(data);
        closeForm();
    };

    const confirmDelete = () => {
        deleting.forEach(d => deleteDmatz(d.id));
        setDeleting([]);
        setEditing(null);
    };

    return (
        <div className="h-full flex flex-col w-full min-w-0 max-w-full overflow-hidden" data-dmatz-screen>
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-lg font-bold leading-6 text-slate-900 dark:text-white">{t('bumManager.sections.dmatz')}</h1>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{t('bumManager.dmatz.subtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={openNew}
                        disabled={!hasSuperior}
                        title={hasSuperior ? undefined : t('bumManager.dmatz.form.noSuperior')}
                        data-new-dmatz
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-sm"
                    >
                        <FigmaIcon name="tool-plus" /> {t('bumManager.dmatz.newDmatz')}
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
                    <Tile title={t('bumManager.dmatz.distribution')} className="min-w-0">
                        <DmatzBoard
                            dmatzim={filtered}
                            viewingUnitCode={sessionUnitCode}
                            unitLabelOf={unitLabelOf}
                            onOpen={openExisting}
                            onDelete={d => requestDelete([d])}
                            onStatusChange={setDmatzStatus}
                        />
                    </Tile>
                    <Tile title={t('bumManager.dashboard.categories')}>
                        <BumFilterRows rows={rows} selectedKeys={directions} onToggle={toggleDirection} testIdPrefix="dmatz" />
                    </Tile>
                </div>
            </div>

            <DmatzFormModal
                isOpen={formOpen}
                viewingUnitCode={sessionUnitCode}
                dmatz={editing}
                unitLabelOf={unitLabelOf}
                onClose={closeForm}
                onSubmit={handleSubmit}
                onDelete={d => requestDelete([d])}
            />
            <DeleteDemandModal demands={deleting} onConfirm={confirmDelete} onCancel={() => setDeleting([])} prefix="bumManager.dmatz.delete" />
        </div>
    );
};
