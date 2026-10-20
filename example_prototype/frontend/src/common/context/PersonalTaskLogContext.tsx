import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
    PersonalTask,
    PersonalTaskStatus,
    PersonalTaskSeverity,
    PersonalTaskRecurrence,
    PersonalTaskRecurrenceRule,
    Cell,
} from '../utilities/types';
import { mockPersonalTasks } from '../utilities/mockData';

// State + CRUD for the Personal Task Log (יומן משימות אישי). Mirrors CombatLogContext.tsx:
// one shared array persisted to localStorage, filtered client-side by the screen (here, by
// the COMBINATION of ownerUnitCode + ownerCell) — switching the Unit or Cell in the User
// Settings modal therefore just changes what the screen filters to, no extra plumbing needed.

export interface CreatePersonalTaskInput {
    ownerUnitCode: number;
    ownerCell: Cell;
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

export type UpdatePersonalTaskInput = Partial<Omit<CreatePersonalTaskInput, 'ownerUnitCode' | 'ownerCell'>>;

interface PersonalTaskLogContextType {
    tasks: PersonalTask[];
    myUnitCode: number;
    myCell: Cell;
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

function readSessionCell(): Cell {
    try {
        const raw = localStorage.getItem('session');
        const session = raw ? JSON.parse(raw) : null;
        return (session?.cell as Cell) || 'control';
    } catch {
        return 'control';
    }
}

function readSessionUnitCode(): number {
    try {
        const raw = localStorage.getItem('session');
        const session = raw ? JSON.parse(raw) : null;
        return session?.unit?.code ?? 1000;
    } catch {
        return 1000;
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
    const myCell = readSessionCell();
    const myUnitCode = readSessionUnitCode();

    const persist = (next: PersonalTask[]) => {
        setTasks(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    };

    const createTask = (input: CreatePersonalTaskInput): PersonalTask => {
        const now = new Date().toISOString();
        const task: PersonalTask = {
            id: newId(),
            ownerUnitCode: input.ownerUnitCode,
            ownerCell: input.ownerCell,
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
        <PersonalTaskLogContext.Provider value={{ tasks, myUnitCode, myCell, createTask, updateTask, deleteTask }}>
            {children}
        </PersonalTaskLogContext.Provider>
    );
};

export const usePersonalTaskLogContext = () => {
    const context = useContext(PersonalTaskLogContext);
    if (context === undefined) throw new Error('usePersonalTaskLogContext must be used within a PersonalTaskLogProvider');
    return context;
};
