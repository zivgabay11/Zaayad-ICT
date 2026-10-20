import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, LogOut } from 'lucide-react';
import { usePlanContext } from '../context/PlanContext';
import { Session } from '../utilities/types';
import { mockUsers, mockUnits, mockOperationFolders, mockPlans } from '../utilities/mockData';
import { formatUnitName } from '../utilities/formatting';
import { ALL_CELLS, getCellLabel } from '../utilities/cells';
import { ALL_ROLES, getRoleShortLabel } from '../utilities/roles';

// "הגדרות משתמש" (User Settings) — opened from the header's center title block, as a
// small floating panel docked exactly below it (not a full-screen modal): no backdrop, so
// the rest of the app stays fully usable while it's open — matching the same
// "floating dropdown, no lock" convention MapToolbar's own Layers/phases/units dropdowns
// already use. Closes via its own X, or by clicking the header title again (toggle).
//
// Centered with `left-1/2 -translate-x-1/2` (physical, not `start-1/2`) — the app runs
// RTL, where a logical `start` plus a physical `translateX` fight each other and the panel
// drifts left; the header title block above it centers the same way for the same reason.
//
// Lets the user switch every piece of their identity in one place: משתמש/יחידה/תא (the
// last of which now drives app behavior, combined with יחידה — see
// PersonalTaskLogContext), תפקיד/מציאות (purely descriptive), and תיק+תוכנית (which Plan
// is active).

interface Props {
    isOpen: boolean;
    onClose: () => void;
    session: Session;
    onSessionFieldChange: (patch: Partial<Session>) => void;
    onSignOut: () => void;
}

const fieldLabelClass = "text-[11px] font-semibold text-slate-400 dark:text-zinc-500 mb-1 block";
const selectClass = "w-full px-2.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-primary transition-colors";

export const UserSettingsModal: React.FC<Props> = ({ isOpen, onClose, session, onSessionFieldChange, onSignOut }) => {
    const { t, i18n } = useTranslation();
    const { plans, activePlan, setActivePlanId } = usePlanContext();
    const [selectedFolderId, setSelectedFolderId] = useState<string>(mockOperationFolders[0]?.id || '');

    useEffect(() => {
        if (!isOpen) return;
        setSelectedFolderId(activePlan?.folderId || mockOperationFolders[0]?.id || '');
    }, [isOpen, activePlan]);

    if (!isOpen) return null;

    const unitOptions = mockUnits.filter(u => u.type === 'division' || u.type === 'brigade');
    const plansInFolder = plans.filter(p => p.folderId === selectedFolderId);

    const handleDisconnect = () => {
        onSignOut();
        onClose();
    };

    return (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 w-[760px] max-w-[94vw] pointer-events-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('userSettings.title')}</h3>
                <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-5 space-y-4">
                <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <label className={fieldLabelClass}>{t('userSettings.user')}</label>
                        <select
                            value={session.user.username}
                            onChange={e => {
                                const user = mockUsers.find(u => u.username === e.target.value);
                                if (user) onSessionFieldChange({ user });
                            }}
                            className={selectClass}
                        >
                            {mockUsers.map(u => (
                                <option key={u.username} value={u.username}>{u.name[i18n.language] || u.name.en}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-0">
                        <label className={fieldLabelClass}>{t('userSettings.unit')}</label>
                        <select
                            value={session.unit.code}
                            onChange={e => {
                                const unit = unitOptions.find(u => u.code === Number(e.target.value));
                                if (unit) onSessionFieldChange({ unit: unit as Session['unit'] });
                            }}
                            className={selectClass}
                        >
                            {unitOptions.map(u => (
                                <option key={u.code} value={u.code}>{formatUnitName(u as any, t, i18n.language)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-0">
                        <label className={fieldLabelClass}>{t('userSettings.cell')}</label>
                        <select
                            value={session.cell}
                            onChange={e => onSessionFieldChange({ cell: e.target.value as Session['cell'] })}
                            className={selectClass}
                        >
                            {ALL_CELLS.map(cell => (
                                <option key={cell} value={cell}>{getCellLabel(t, cell)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="shrink-0 pt-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden">
                            <img src="/horus_ecosystem_symbol.png" alt="" className="w-7 h-7 object-contain" />
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <label className={fieldLabelClass}>{t('userSettings.role')}</label>
                        <select
                            value={session.role}
                            onChange={e => onSessionFieldChange({ role: e.target.value as Session['role'] })}
                            className={selectClass}
                        >
                            {ALL_ROLES.map(role => (
                                <option key={role} value={role}>{getRoleShortLabel(t, role)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-0">
                        <label className={fieldLabelClass}>{t('userSettings.reality')}</label>
                        <div className="flex rounded-lg border border-slate-200 dark:border-zinc-700 overflow-hidden">
                            {(['operational', 'drill'] as const).map(reality => (
                                <button
                                    key={reality}
                                    onClick={() => onSessionFieldChange({ reality })}
                                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${session.reality === reality
                                        ? 'bg-primary text-white'
                                        : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
                                >
                                    {reality === 'operational' ? t('userSettings.realityOperational') : t('userSettings.realityDrill')}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-[1.4] min-w-0">
                        <label className={fieldLabelClass}>{t('userSettings.folderAndPlan')}</label>
                        <div className="flex gap-1.5">
                            <select
                                value={selectedFolderId}
                                onChange={e => {
                                    setSelectedFolderId(e.target.value);
                                    const firstPlan = plans.find(p => p.folderId === e.target.value);
                                    if (firstPlan) setActivePlanId(firstPlan.id);
                                }}
                                className={selectClass}
                            >
                                {mockOperationFolders.map(folder => (
                                    <option key={folder.id} value={folder.id}>{folder.name[i18n.language] || folder.name.en}</option>
                                ))}
                            </select>
                            <select
                                value={activePlan?.id || ''}
                                onChange={e => setActivePlanId(e.target.value)}
                                className={selectClass}
                            >
                                {plansInFolder.map(plan => (
                                    <option key={plan.id} value={plan.id}>{plan.name[i18n.language] || plan.name.en}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-start px-5 py-3 border-t border-slate-200 dark:border-zinc-800">
                <button
                    onClick={handleDisconnect}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                >
                    <LogOut className="w-3.5 h-3.5" /> {t('nav.sign_out')}
                </button>
            </div>
        </div>
    );
};
