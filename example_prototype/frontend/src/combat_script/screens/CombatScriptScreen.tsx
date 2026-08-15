import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanContext } from '../../common/context/PlanContext';
import { CombatScriptTimeline } from '../widgets/CombatScriptTimeline';
import { TaskDialog } from '../../tasks/widgets/TaskDialog';
import type { Task } from '../../common/utilities/types';

export const CombatScriptScreen: React.FC<{ sessionUnitCode?: number }> = ({ sessionUnitCode = 1000 }) => {
    const { t } = useTranslation();
    const { activePlan, updatePlan } = usePlanContext();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogDefaults, setDialogDefaults] = useState<Partial<Task>>({});

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
        <div className="h-full flex flex-col w-full min-w-0 max-w-full overflow-hidden">
            {/* Sub-header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                        {t('Combat Script')}
                    </h1>
                </div>

                {/* View switcher tabs */}
                <div className="flex space-x-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg">
                    <button
                        className="px-4 py-2 text-sm font-medium rounded-md bg-white dark:bg-zinc-700 shadow-sm text-primary-light dark:text-primary-dark"
                    >
                        {t('Combat Script')}
                    </button>
                    <button
                        className="px-4 py-2 text-sm font-medium rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300 cursor-default"
                        disabled
                    >
                        {t('Table')}
                    </button>
                    <button
                        className="px-4 py-2 text-sm font-medium rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300 cursor-default"
                        disabled
                    >
                        {t('Calendar')}
                    </button>
                </div>
            </div>

            {/* Timeline content */}
            <div className="flex-1 min-h-0 p-4">
                <CombatScriptTimeline
                    tasks={tasks}
                    plan={activePlan}
                    sessionUnitCode={sessionUnitCode}
                    onUpdateTask={handleUpdateTask}
                    onEditTask={(task) => {
                        setDialogDefaults(task);
                        setIsDialogOpen(true);
                    }}
                    onCreateTask={(defaults) => {
                        setDialogDefaults(defaults);
                        setIsDialogOpen(true);
                    }}
                    onDeleteTask={handleDeleteTask}
                />
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
