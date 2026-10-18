import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
    PersonalTask,
    PersonalTaskStatus,
    PersonalTaskSeverity,
    PersonalTaskRecurrence,
    PersonalTaskRecurrenceRule,
    UserRole,
} from '../utilities/types';
import { mockPersonalTasks } from '../utilities/mockData';

// State + CRUD for the Personal Task Log (יומן משימות אישי). Mirrors CombatLogContext.tsx:
// one shared array persisted to localStorage, filtered client-side by the screen (here, by
// ownerRole instead of reporterUnitCode) — switching the header's role selector therefore
// just changes what the screen filters to, no extra plumbing needed.

export interface CreatePersonalTaskInput {
    ownerRole: UserRole;
    title: string;
    description: string;
    status?: PersonalTaskStatus;
    start?: string;
    end?: string;
    severity: PersonalTaskSeverity;
    notes?: string;
    recurrence: PersonalTaskRecurrence;
    recurrenceRule?: PersonalTaskRecurrenceRule;
}

export type UpdatePersonalTaskInput = Partial<Omit<CreatePersonalTaskInput, 'ownerRole'>>;

interface PersonalTaskLogContextType {
    tasks: PersonalTask[];
    myRole: UserRole;
    createTask: (input: CreatePersonalTaskInput) => PersonalTask;
    updateTask: (id: string, input: UpdatePersonalTaskInput) => void;
    deleteTask: (id: string) => void;
}

const STORAGE_KEY = 'horus_personal_task_log_tasks';

const PersonalTaskLogContext = createContext<PersonalTaskLogContextType | undefined>(undefined);

function readSessionUserName(): string {
    try {
        const raw = localStorage.getItem('session');
        const session = raw ? JSON.parse(raw) : null;
        return session?.user?.name?.he || session?.user?.name?.en || session?.user?.username || 'unknown';
    } catch {
        return 'unknown';
    }
}

function readSessionRole(): UserRole {
    try {
        const raw = localStorage.getItem('session');
        const session = raw ? JSON.parse(raw) : null;
        return (session?.role as UserRole) || 'operationsOfficer';
    } catch {
        return 'operationsOfficer';
    }
}

function newId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `task-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export const PersonalTaskLogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tasks, setTasks] = useState<PersonalTask[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : mockPersonalTasks;
        } catch {
            return mockPersonalTasks;
        }
    });
    const myRole = readSessionRole();

    const persist = (next: PersonalTask[]) => {
        setTasks(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    };

    const createTask = (input: CreatePersonalTaskInput): PersonalTask => {
        const now = new Date().toISOString();
        const task: PersonalTask = {
            id: newId(),
            ownerRole: input.ownerRole,
            title: input.title,
            description: input.description,
            status: input.status || 'open',
            start: input.start,
            end: input.end,
            severity: input.severity,
            notes: input.notes,
            recurrence: input.recurrence,
            recurrenceRule: input.recurrence === 'periodic' ? input.recurrenceRule : undefined,
            createdByUserName: readSessionUserName(),
            createdAt: now,
            updatedAt: now,
        };
        persist([task, ...tasks]);
        return task;
    };

    const updateTask = (id: string, input: UpdatePersonalTaskInput) => {
        const now = new Date().toISOString();
        persist(tasks.map(task => {
            if (task.id !== id) return task;
            const nextRecurrence = input.recurrence ?? task.recurrence;
            return {
                ...task,
                ...input,
                recurrence: nextRecurrence,
                recurrenceRule: nextRecurrence === 'periodic' ? (input.recurrenceRule ?? task.recurrenceRule) : undefined,
                updatedAt: now,
            };
        }));
    };

    const deleteTask = (id: string) => {
        persist(tasks.filter(task => task.id !== id));
    };

    return (
        <PersonalTaskLogContext.Provider value={{ tasks, myRole, createTask, updateTask, deleteTask }}>
            {children}
        </PersonalTaskLogContext.Provider>
    );
};

export const usePersonalTaskLogContext = () => {
    const context = useContext(PersonalTaskLogContext);
    if (context === undefined) throw new Error('usePersonalTaskLogContext must be used within a PersonalTaskLogProvider');
    return context;
};
