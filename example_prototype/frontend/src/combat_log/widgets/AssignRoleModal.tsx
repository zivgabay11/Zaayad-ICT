import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Users } from 'lucide-react';
import { useCombatLogContext } from '../../common/context/CombatLogContext';
import { CombatLogEvent } from '../../common/utilities/types';
import { ALL_ROLES, getRoleShortLabel } from '../../common/utilities/roles';

// Push this event to one or more roles' Personal Task Log (יומן משימות אישי) — unlike
// ShareEventModal's one-way unit sharing, this is a true toggle: a role can be added or
// removed at any time, since it's an active work assignment, not a visibility grant. Only
// rendered for LINKABLE_COMBAT_LOG_TYPES (enforced by the caller).

interface AssignRoleModalProps {
    event: CombatLogEvent | null;
    onClose: () => void;
}

export const AssignRoleModal: React.FC<AssignRoleModalProps> = ({ event, onClose }) => {
    const { t } = useTranslation();
    const { toggleAssignedRole } = useCombatLogContext();

    if (!event) return null;
    const assigned = event.assignedToRoles || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md max-h-[78vh] overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('combatLog.assignRoleModal.title')}</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{t('combatLog.assignRoleModal.subtitle')}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {ALL_ROLES.map(role => {
                        const isAssigned = assigned.includes(role);
                        return (
                            <div
                                key={role}
                                onClick={() => toggleAssignedRole(event.id, role)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${isAssigned ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'}`}>
                                    {isAssigned ? <Check className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{getRoleShortLabel(t, role)}</div>
                                    <div className="text-[10.5px] text-slate-400 dark:text-zinc-500">
                                        {isAssigned ? t('combatLog.assignRoleModal.assigned') : t('combatLog.assignRoleModal.notAssigned')}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-end px-5 py-4 border-t border-slate-200 dark:border-zinc-800 shrink-0">
                    <button onClick={onClose} className="text-sm px-4 py-2 text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors font-medium">
                        {t('combatLog.actions.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};
