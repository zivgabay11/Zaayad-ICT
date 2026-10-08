import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollText, Plus, Download } from 'lucide-react';
import { useCombatLogContext } from '../../common/context/CombatLogContext';
import { CombatLogType } from '../../common/utilities/types';
import { getUnitAndDescendantCodes } from '../../common/utilities/mockData';
import { SituationPictureDashboard } from '../widgets/SituationPictureDashboard';
import { CombatLogFilterBar, CombatLogFilters } from '../widgets/CombatLogFilterBar';
import { CombatLogTable } from '../widgets/CombatLogTable';
import { CombatLogGantt } from '../widgets/CombatLogGantt';
import { NewEventModal } from '../widgets/NewEventModal';
import { EventEditModal } from '../widgets/EventEditModal';
import { EventViewPanel } from '../widgets/EventViewPanel';
import { ShareEventModal } from '../widgets/ShareEventModal';
import { exportCombatLogToCsv } from '../utilities/exportCsv';

// Integrated Combat Log (יומן לחימה מתכלל) — full screen, reachable from the sidebar,
// unified across all six sub-logs (PRD "Integrated Combat Log" v2.0).

type Tab = 'table' | 'gantt';

const EMPTY_FILTERS: CombatLogFilters = { types: [], status: 'all', unitCodes: [], dateFrom: '', dateTo: '', search: '' };

function readFiltersFromUrl(): CombatLogFilters {
    try {
        const params = new URLSearchParams(window.location.search);
        return {
            types: (params.get('types')?.split(',').filter(Boolean) as CombatLogType[]) || [],
            status: params.get('status') || 'all',
            unitCodes: params.get('units')?.split(',').filter(Boolean).map(Number) || [],
            dateFrom: params.get('from') || '',
            dateTo: params.get('to') || '',
            search: params.get('q') || '',
        };
    } catch {
        return EMPTY_FILTERS;
    }
}

export const CombatLogScreen: React.FC = () => {
    const { t } = useTranslation();
    const { events, homeUnitCode } = useCombatLogContext();
    const [tab, setTab] = useState<Tab>('table');
    const [filters, setFilters] = useState<CombatLogFilters>(readFiltersFromUrl);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [viewEventId, setViewEventId] = useState<string | null>(null);
    const [editEventId, setEditEventId] = useState<string | null>(null);
    const [shareEventId, setShareEventId] = useState<string | null>(null);

    // FR-21/AC-04.5 — active filters are reflected in the URL so the view is shareable.
    useEffect(() => {
        const params = new URLSearchParams();
        if (filters.types.length) params.set('types', filters.types.join(','));
        if (filters.status !== 'all') params.set('status', filters.status);
        if (filters.unitCodes.length) params.set('units', filters.unitCodes.join(','));
        if (filters.dateFrom) params.set('from', filters.dateFrom);
        if (filters.dateTo) params.set('to', filters.dateTo);
        if (filters.search) params.set('q', filters.search);
        const query = params.toString();
        window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
    }, [filters]);

    const filteredEvents = useMemo(() => {
        const allowedUnitCodes = filters.unitCodes.length
            ? new Set(filters.unitCodes.flatMap(code => getUnitAndDescendantCodes(code)))
            : null;
        const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
        const to = filters.dateTo ? new Date(filters.dateTo + 'T23:59:59').getTime() : null;
        const q = filters.search.trim().toLowerCase();

        return events.filter(e => {
            if (filters.types.length && !filters.types.includes(e.type)) return false;
            if (filters.status !== 'all' && e.status !== filters.status) return false;
            if (allowedUnitCodes && !allowedUnitCodes.has(e.reporterUnitCode)) return false;
            const startMs = new Date(e.start).getTime();
            if (from !== null && startMs < from) return false;
            if (to !== null && startMs > to) return false;
            if (q && !e.title.toLowerCase().includes(q) && !e.description.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [events, filters]);

    const viewEvent = events.find(e => e.id === viewEventId) || null;
    const editEvent = events.find(e => e.id === editEventId) || null;
    const shareEvent = events.find(e => e.id === shareEventId) || null;

    return (
        <div className="p-6 h-full flex flex-col w-full min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-row flex-wrap justify-between items-center gap-3 mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary shrink-0">
                        <ScrollText className="w-[18px] h-[18px]" />
                    </span>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{t('combatLog.screenTitle')}</h1>
                        <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">{t('combatLog.screenSubtitle')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => exportCombatLogToCsv(filteredEvents, (type) => t(`combatLog.logTypes.${type}`))}
                        className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors font-medium"
                    >
                        <Download className="w-4 h-4" /> {t('combatLog.exportExcel')}
                    </button>
                    <button
                        onClick={() => setIsNewModalOpen(true)}
                        className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-primary text-white dark:text-zinc-900 hover:bg-primary/90 transition-colors font-semibold shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> {t('combatLog.newEvent')}
                    </button>
                </div>
            </div>

            <SituationPictureDashboard events={events} />

            <CombatLogFilterBar filters={filters} onChange={setFilters} />

            <div className="flex space-x-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg self-start mb-4 shrink-0">
                {(['table', 'gantt'] as Tab[]).map(id => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === id
                            ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        {t(`combatLog.tabs.${id}`)}
                    </button>
                ))}
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                {tab === 'table' && (
                    <CombatLogTable
                        events={filteredEvents}
                        allEvents={events}
                        onView={setViewEventId}
                        onEdit={setEditEventId}
                    />
                )}
                {tab === 'gantt' && <CombatLogGantt events={filteredEvents} onView={setViewEventId} />}
            </div>

            <NewEventModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} allEvents={events} />

            <EventViewPanel
                event={viewEvent}
                onClose={() => setViewEventId(null)}
                onEdit={(id) => { setViewEventId(null); setEditEventId(id); }}
                onShare={(id) => { setViewEventId(null); setShareEventId(id); }}
                viewingUnitCode={homeUnitCode}
            />

            <EventEditModal
                event={editEvent}
                onClose={() => setEditEventId(null)}
                viewingUnitCode={homeUnitCode}
            />

            <ShareEventModal event={shareEvent} onClose={() => setShareEventId(null)} />
        </div>
    );
};
