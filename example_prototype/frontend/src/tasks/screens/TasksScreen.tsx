import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanContext } from '../../common/context/PlanContext';
import { TasksList } from '../widgets/TasksList';
import { TasksBoard } from '../widgets/TasksBoard';
import { TasksTimeline } from '../widgets/TasksTimeline';
import { TaskDialog } from '../widgets/TaskDialog';
import { Task } from '../../common/utilities/types';
import { Plus } from 'lucide-react';

export const TasksScreen: React.FC = () => {
    const { t } = useTranslation();
    const { activePlan, updatePlan } = usePlanContext();
    const [view, setView] = useState<'list' | 'board' | 'timeline'>('timeline');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogDefaults, setDialogDefaults] = useState<Partial<Task>>({});
    const [listFilterIds, setListFilterIds] = useState<string[] | null>(null);

    if (!activePlan) {
        return (
            <div className="p-8 flex items-center justify-center text-slate-500">
                {t('Please select or create a plan first.')}
            </div>
        );
    }

    const tasks = activePlan.tasks || [];

    const handleUpdateTask = (updatedTask: Task) => {
        const exists = tasks.some(t => t.id === updatedTask.id);
        const newTasks = exists
            ? tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
            : [...tasks, updatedTask];

        updatePlan(activePlan.id, { tasks: newTasks });
    };

    const handleDeleteTask = (taskId: string) => {
        const newTasks = tasks.filter(t => t.id !== taskId);
        updatePlan(activePlan.id, { tasks: newTasks });
    };

    return (
        <div className="p-6 h-full flex flex-col w-full min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-row justify-between items-center mb-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        {t('Tasks')}
                    </h1>
                    <button
                        onClick={() => {
                            setDialogDefaults({});
                            setIsDialogOpen(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary hover:bg-primary/90 dark:bg-primary-dark dark:hover:bg-primary/90 text-white rounded-lg transition-colors font-semibold"
                    >
                        <Plus size={16} />
                        {t('New Task')}
                    </button>
                </div>
                <div className="flex space-x-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg">
                    {['timeline', 'list', 'board'].map((v) => (
                        <button
                            key={v}
                            onClick={() => {
                                setListFilterIds(null);
                                setView(v as any);
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-colors ${view === v
                                ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary-light dark:text-primary-dark'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'
                                }`}
                        >
                            {t(v)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 w-full min-w-0 min-h-0 pb-12 relative z-0 flex flex-col">
                {view === 'list' && <TasksList tasks={tasks} plan={activePlan} filterIds={listFilterIds} onClearFilter={() => setListFilterIds(null)} onOpenDialog={(defaults) => { setDialogDefaults(defaults); setIsDialogOpen(true); }} />}
                {view === 'timeline' && <TasksTimeline
                    tasks={tasks}
                    plan={activePlan}
                    onUpdateTask={handleUpdateTask}
                    onOpenDialog={(defaults) => { setDialogDefaults(defaults); setIsDialogOpen(true); }}
                    onSwitchToList={(ids) => { setListFilterIds(ids); setView('list'); }}
                />}
                {view === 'board' && <TasksBoard tasks={tasks} plan={activePlan} onUpdateTask={handleUpdateTask} onOpenDialog={(defaults) => { setDialogDefaults(defaults); setIsDialogOpen(true); }} />}
            </div>

            <TaskDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleUpdateTask}
                onDelete={handleDeleteTask}
                initialData={dialogDefaults}
                plan={activePlan}
            />
        </div>
    );
};