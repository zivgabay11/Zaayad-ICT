import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListChecks, Plus } from 'lucide-react';
import { usePersonalTaskLogContext } from '../../common/context/PersonalTaskLogContext';
import { useCombatLogContext } from '../../common/context/CombatLogContext';
import { PersonalTask, PersonalTaskStatus } from '../../common/utilities/types';
import { LINKABLE_COMBAT_LOG_TYPES } from '../../common/utilities/combatLog';
import {
    PERSONAL_TASK_STATUS_ORDER,
    computeTaskStats,
    mapCombatLogStatusToPersonal,
    PERSONAL_STATUS_TO_COMBAT_LOG,
    TaskLogItem,
} from '../utilities/personalTaskLog';
import { TaskStatsBar } from '../widgets/TaskStatsBar';
import { TaskStatusSection } from '../widgets/TaskStatusSection';
import { TaskFormModal } from '../widgets/TaskFormModal';
import { TaskViewPanel } from '../widgets/TaskViewPanel';
import { EventViewPanel } from '../../combat_log/widgets/EventViewPanel';
import { EventEditModal } from '../../combat_log/widgets/EventEditModal';
import { ShareEventModal } from '../../combat_log/widgets/ShareEventModal';
import { AssignRoleModal } from '../../combat_log/widgets/AssignRoleModal';

// Personal Task Log (יומן משימות אישי) — per-role task manager, scoped to the role
// currently selected in the header (see PersonalTaskLogContext's myRole). Shows two kinds
// of rows side by side: manual tasks (owned here) and Combat Log events pushed to this role
// (the single shared record — editing one here edits the real event, so the Combat Log
// screen sees the same change immediately).

export const PersonalTaskLogScreen: React.FC = () => {
    const { t } = useTranslation();
    const { tasks, myRole, deleteTask, updateTask } = usePersonalTaskLogContext();
    const { events: combatLogEvents, homeUnitCode, updateEvent, toggleAssignedRole } = useCombatLogContext();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
    const [viewingEventId, setViewingEventId] = useState<string | null>(null);
    const [shareEventId, setShareEventId] = useState<string | null>(null);
    const [assignRoleEventId, setAssignRoleEventId] = useState<string | null>(null);
    const editingEvent = combatLogEvents.find(e => e.id === editingEventId) || null;
    const viewingTask = tasks.find(t => t.id === viewingTaskId) || null;
    const viewingEvent = combatLogEvents.find(e => e.id === viewingEventId) || null;
    const shareEvent = combatLogEvents.find(e => e.id === shareEventId) || null;
    const assignRoleEvent = combatLogEvents.find(e => e.id === assignRoleEventId) || null;

    const items: TaskLogItem[] = useMemo(() => {
        const manual: TaskLogItem[] = tasks
            .filter(task => task.ownerRole === myRole)
            .map(task => ({ kind: 'manual', id: task.id, status: task.status, task }));

        const linked: TaskLogItem[] = combatLogEvents
            .filter(event => LINKABLE_COMBAT_LOG_TYPES.includes(event.type) && event.assignedToRoles?.includes(myRole))
            .map(event => ({ kind: 'linked', id: event.id, status: mapCombatLogStatusToPersonal(event), event }));

        return [...manual, ...linked];
    }, [tasks, combatLogEvents, myRole]);

    const stats = useMemo(() => computeTaskStats(items), [items]);

    const itemsByStatus = useMemo(() => {
        const map = new Map(PERSONAL_TASK_STATUS_ORDER.map(status => [status, [] as TaskLogItem[]]));
        for (const item of items) {
            map.get(item.status)?.push(item);
        }
        return map;
    }, [items]);

    const openCreate = () => { setEditingTask(null); setIsFormOpen(true); };
    const closeForm = () => { setIsFormOpen(false); setEditingTask(null); };

    const handleView = (item: TaskLogItem) => {
        if (item.kind === 'manual') setViewingTaskId(item.task.id);
        else setViewingEventId(item.event.id);
    };

    const handleEdit = (item: TaskLogItem) => {
        if (item.kind === 'manual') { setEditingTask(item.task); setIsFormOpen(true); }
        else { setEditingEventId(item.event.id); }
    };

    const handleRemove = (item: TaskLogItem) => {
        if (item.kind === 'manual') {
            if (window.confirm(t('personalTaskLog.confirmDelete'))) deleteTask(item.task.id);
        } else {
            if (window.confirm(t('personalTaskLog.confirmUnassign'))) toggleAssignedRole(item.event.id, myRole);
        }
    };

    const handleDropItem = (itemId: string, status: PersonalTaskStatus) => {
        const item = items.find(i => i.id === itemId);
        if (!item || item.status === status) return;
        if (item.kind === 'manual') {
            updateTask(item.task.id, { status });
        } else {
            // Not every Personal Task Log status has a real equivalent for this event's
            // type (e.g. no "blocked" status exists anywhere in the Combat Log vocabulary) —
            // silently ignore the drop rather than inventing one.
            const realStatus = PERSONAL_STATUS_TO_COMBAT_LOG[item.event.type]?.[status];
            if (realStatus) updateEvent(item.event.id, { status: realStatus });
        }
    };

    return (
        <div className="p-6 h-full flex flex-col w-full min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-row flex-wrap justify-between items-center gap-3 mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary shrink-0">
                        <ListChecks className="w-[18px] h-[18px]" />
                    </span>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{t('personalTaskLog.screenTitle')}</h1>
                        <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">{t('personalTaskLog.screenSubtitle')}</p>
                    </div>
                </div>
                <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-primary text-white dark:text-zinc-900 hover:bg-primary/90 transition-colors font-semibold shadow-sm"
                >
                    <Plus className="w-4 h-4" /> {t('personalTaskLog.newTask')}
                </button>
            </div>

            <div className="flex-1 min-h-0 flex gap-4">
                {/* First in markup = right side in RTL, per the Figma alternate layout */}
                <TaskStatsBar stats={stats} onDropItem={handleDropItem} />

                <div className="flex-1 min-w-0 overflow-y-auto space-y-3 pb-2">
                    {PERSONAL_TASK_STATUS_ORDER.map((status, i) => (
                        <TaskStatusSection
                            key={status}
                            status={status}
                            items={itemsByStatus.get(status) || []}
                            defaultOpen={i < 2}
                            onView={handleView}
                            onEdit={handleEdit}
                            onRemove={handleRemove}
                            onDropItem={handleDropItem}
                        />
                    ))}
                </div>
            </div>

            <TaskFormModal
                isOpen={isFormOpen}
                onClose={closeForm}
                ownerRole={myRole}
                task={editingTask}
                onLinked={(eventId) => { closeForm(); setViewingEventId(eventId); }}
            />

            <TaskViewPanel
                task={viewingTask}
                onClose={() => setViewingTaskId(null)}
                onEdit={(id) => { setViewingTaskId(null); setEditingTask(tasks.find(t => t.id === id) || null); setIsFormOpen(true); }}
            />

            <EventViewPanel
                event={viewingEvent}
                onClose={() => setViewingEventId(null)}
                onEdit={(id) => { setViewingEventId(null); setEditingEventId(id); }}
                onShare={(id) => { setViewingEventId(null); setShareEventId(id); }}
                onAssignRole={(id) => { setViewingEventId(null); setAssignRoleEventId(id); }}
                viewingUnitCode={homeUnitCode}
                viewingRole={myRole}
            />

            <EventEditModal
                event={editingEvent}
                onClose={() => setEditingEventId(null)}
                viewingUnitCode={homeUnitCode}
                viewingRole={myRole}
            />

            <ShareEventModal event={shareEvent} onClose={() => setShareEventId(null)} />
            <AssignRoleModal event={assignRoleEvent} onClose={() => setAssignRoleEventId(null)} />
        </div>
    );
};
