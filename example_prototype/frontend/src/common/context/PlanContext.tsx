import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Plan } from '../utilities/types';
import { mockPlans } from '../utilities/mockData';

interface PlanContextType {
    plans: Plan[];
    activePlanId: string | null;
    activePlan: Plan | null;
    setActivePlanId: (id: string | null) => void;
    createPlan: (plan: Omit<Plan, 'id'>) => Promise<void>;
    updatePlan: (id: string, updatedPlan: Partial<Plan>) => Promise<void>;
    pendingUpdates: Record<string, any>;
    proposeUpdate: (path: string, value: any) => void;
    commitUpdate: (path: string) => void;
    discardUpdate: (path: string) => void;
    deletePlan: (id: string) => Promise<void>;
    resetData: () => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export const PlanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [plans, setPlans] = useState<Plan[]>(() => {
        const storedPlans = localStorage.getItem('horus_plans');
        if (storedPlans) {
            try {
                const parsed = JSON.parse(storedPlans);
                // Merge in new mock fields if missing from local storage (dev convenience)
                return parsed.map((p: Plan) => {
                    const mock = mockPlans.find(m => m.id === p.id);
                    if (mock) {
                        return { ...mock, ...p, shared: p.shared || mock.shared, status: p.status || mock.status };
                    }
                    return p;
                });
            } catch (error) {
                console.error('Failed to parse stored plans', error);
            }
        }
        return mockPlans;
    });

    const [activePlanId, setActivePlanId] = useState<string | null>(() => {
        return localStorage.getItem('horus_active_plan_id') || null;
    });

    const [pendingUpdates, setPendingUpdates] = useState<Record<string, any>>({});

    // Save plans to local storage whenever they change
    useEffect(() => {
        localStorage.setItem('horus_plans', JSON.stringify(plans));
    }, [plans]);

    // Save active plan ID to local storage whenever it changes
    useEffect(() => {
        if (activePlanId) {
            localStorage.setItem('horus_active_plan_id', activePlanId);
        } else {
            localStorage.removeItem('horus_active_plan_id');
        }
    }, [activePlanId]);

    const activePlan = plans.find(p => p.id === activePlanId) || null;

    const createPlan = async (newPlanData: Omit<Plan, 'id'>) => {
        const newPlan: Plan = {
            ...newPlanData,
            id: `plan-${Date.now()}`
        };
        setPlans(prev => [...prev, newPlan]);
    };

    const updatePlan = async (id: string, updatedPlan: Partial<Plan>) => {
        setPlans(prev => prev.map(p => (p.id === id ? { ...p, ...updatedPlan } : p)));
    };

    const proposeUpdate = (path: string, value: any) => {
        setPendingUpdates(prev => ({ ...prev, [path]: value }));
    };

    const commitUpdate = (path: string) => {
        if (!activePlanId) return;
        const value = pendingUpdates[path];
        if (value === undefined) return;

        setPlans(prev => prev.map(p => {
            if (p.id === activePlanId) {
                // simple deep update mapping, since we used paths
                // assuming path is top-level property for now, e.g., 'general', 'objective'
                return { ...p, [path]: value };
            }
            return p;
        }));

        setPendingUpdates(prev => {
            const next = { ...prev };
            delete next[path];
            return next;
        });
    };

    const discardUpdate = (path: string) => {
        setPendingUpdates(prev => {
            const next = { ...prev };
            delete next[path];
            return next;
        });
    };

    const deletePlan = async (id: string) => {
        setPlans(prev => prev.filter(p => p.id !== id));
        if (activePlanId === id) {
            setActivePlanId(null);
        }
    };

    const resetData = () => {
        setPlans(mockPlans);
        setActivePlanId(null);
        localStorage.removeItem('horus_plans');
        localStorage.removeItem('horus_active_plan_id');
        window.location.reload();
    };

    return (
        <PlanContext.Provider value={{
            plans,
            activePlanId,
            activePlan,
            setActivePlanId,
            createPlan,
            updatePlan,
            deletePlan,
            resetData,
            pendingUpdates,
            proposeUpdate,
            commitUpdate,
            discardUpdate
        }}>
            {children}
        </PlanContext.Provider>
    );
};

export const usePlanContext = () => {
    const context = useContext(PlanContext);
    if (context === undefined) {
        throw new Error('usePlanContext must be used within a PlanProvider');
    }
    return context;
};
