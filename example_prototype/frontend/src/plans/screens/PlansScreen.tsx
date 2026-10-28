import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanContext } from '../../common/context/PlanContext';
import { Plus, Shield, Users, Search, SlidersHorizontal, CheckCircle, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { mockPlanStatuses } from '../../common/utilities/mockData';
import { Session } from '../../common/utilities/types';

interface PlansScreenProps {
    session: Session;
    onPlanSelect?: (planId: string) => void;
    onNavigate?: (section: string) => void;
}

export const PlansScreen: React.FC<PlansScreenProps> = ({ session, onPlanSelect, onNavigate }) => {
    const { t, i18n } = useTranslation();
    const { plans, createPlan, deletePlan, activePlanId, setActivePlanId } = usePlanContext();
    const [isCreating, setIsCreating] = useState(false);
    const [newPlanName, setNewPlanName] = useState('');
    const [newPlanDesc, setNewPlanDesc] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'shared'>('all');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuOpenId && menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpenId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpenId]);

    const handleCreate = () => {
        if (!newPlanName.trim()) return;
        createPlan({
            name: { en: newPlanName },
            description: { en: newPlanDesc },
            shared: 'private',
            createdBy: session.user.username,
            updatedBy: session.user.username,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            status: 'draft',
            phases: [],
            units: [],
            presentationItems: []
        });
        setNewPlanName('');
        setNewPlanDesc('');
        setIsCreating(false);
    };

    const handleSelect = (id: string) => {
        setActivePlanId(id);
        if (onPlanSelect) {
            onPlanSelect(id);
        }
    };

    const filteredPlans = plans
        .filter(plan => {
            if (plan.shared === 'private') {
                return plan.createdBy === session.user.username;
            }
            return true;
        })
        .filter(plan => {
            if (activeTab === 'mine') return plan.createdBy === session.user.username;
            if (activeTab === 'shared') return plan.shared === 'sameUnit';
            return true;
        })
        .filter(plan => {
            if (!searchQuery.trim()) return true;
            const name = plan.name?.[i18n.language] || plan.name?.['en'] || '';
            return name.toLowerCase().includes(searchQuery.toLowerCase());
        });

    const sharedPlans = filteredPlans.filter(p => p.shared === 'sameUnit');
    const myPlans = filteredPlans.filter(p => p.createdBy === session.user.username && p.shared === 'private');

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
    };

    const PlanCard: React.FC<{ plan: typeof plans[0]; showMenu?: boolean }> = ({ plan, showMenu }) => {
        const isActive = activePlanId === plan.id;
        const isDark = document.documentElement.classList.contains('dark');
        const statusEntry = mockPlanStatuses.find(s => s.id === plan.status);
        const statusColor = (isDark && statusEntry?.darkColor) || statusEntry?.color || '#94a3b8';
        const statusName = statusEntry?.name[i18n.language as 'en' | 'he'] || '';
        const isMenuOpen = menuOpenId === plan.id;

        return (
            <div
                onClick={() => handleSelect(plan.id)}
                className={`relative overflow-hidden flex flex-col items-center rounded-xl p-4 pt-5 pb-3 cursor-pointer transition-all border bg-white dark:bg-zinc-800 hover:shadow-md w-[180px] ${isActive
                    ? 'ring-1'
                    : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
                    }`}
                style={isActive ? { borderColor: statusColor, boxShadow: `0 0 0 1px ${statusColor}` } : undefined}
            >
                {/* Three-dot menu */}
                {showMenu && (
                    <div className="absolute top-2 start-2" ref={menuOpenId === plan.id ? menuRef : undefined}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : plan.id); }}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded transition-colors"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        {isMenuOpen && (
                            <div
                                className="absolute top-7 start-0 z-50 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-[120px]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => {
                                        setActivePlanId(plan.id);
                                        setMenuOpenId(null);
                                        if (onNavigate) onNavigate('definitions');
                                    }}
                                    className="w-full flex items-center gap-2 text-start px-3 py-1.5 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    {t('plans.edit') || 'Edit'}
                                </button>
                                <button
                                    onClick={() => {
                                        deletePlan(plan.id);
                                        setMenuOpenId(null);
                                    }}
                                    className="w-full flex items-center gap-2 text-start px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {t('plans.delete') || 'Delete'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Circular icon */}
                <div
                    className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center mb-2"
                    style={{ backgroundColor: statusColor + '25' }}
                >
                    {plan.shared === 'sameUnit' ? (
                        <Users className="w-5 h-5" style={{ color: statusColor }} />
                    ) : (
                        <Shield className="w-5 h-5" style={{ color: statusColor }} />
                    )}
                </div>

                {/* Text content - horizontal on narrow, centered on wider */}
                <div className="flex flex-col items-center">
                    {/* Plan name */}
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white text-center mb-1 line-clamp-1">
                        {plan.name?.[i18n.language] || plan.name?.['en']}
                    </h3>

                    {/* Date range */}
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mb-2">
                        {formatDate(plan.created)}-{formatDate(plan.updated)}
                    </p>
                </div>

                {/* Status chip */}
                {plan.status && (
                    <div
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0"
                        style={{ backgroundColor: statusColor + '20', color: statusColor }}
                    >
                        <CheckCircle className="w-3 h-3" />
                        {statusName}
                    </div>
                )}

                {/* Straight color line at the bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: statusColor }} />
            </div>
        );
    };

    return (
        <div className="@container w-full h-full flex flex-col overflow-y-auto bg-slate-50 dark:bg-zinc-950">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
                {/* New Plan button */}
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#186eff] dark:bg-[#186eff] text-white rounded-lg text-sm font-medium transition-colors hover:opacity-90"
                >
                    <Plus className="w-4 h-4" />
                    {t('plans.newPlanBtn')}
                </button>

                {/* Search */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 flex-1 min-w-[140px] max-w-[280px]">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t('plans.searchPlaceholder') || 'חיפוש'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-sm text-slate-700 dark:text-zinc-300 outline-none flex-1 placeholder:text-slate-400"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 rounded-lg p-0.5 ms-auto">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'all' ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300'}`}
                    >
                        {t('plans.tabAll') || 'הכל'}
                    </button>
                    <button
                        onClick={() => setActiveTab('mine')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'mine' ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300'}`}
                    >
                        {t('plans.tabMyPlans') || 'התוכניות שלי'}
                    </button>
                    <button
                        onClick={() => setActiveTab('shared')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'shared' ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300'}`}
                    >
                        {t('plans.tabShared') || 'משותפים איתי'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Shared plans section */}
                {sharedPlans.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{t('plans.tabShared') || 'משותפים איתי'}</h2>
                        <div className="flex flex-wrap gap-3">
                            {sharedPlans.map(plan => (
                                <PlanCard key={plan.id} plan={plan} showMenu />
                            ))}
                        </div>
                    </div>
                )}

                {/* My Plans section */}
                {myPlans.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{t('plans.tabMyPlans') || 'התוכניות שלי'}</h2>
                        <div className="flex flex-wrap gap-3">
                            {myPlans.map(plan => (
                                <PlanCard key={plan.id} plan={plan} showMenu />
                            ))}
                        </div>
                    </div>
                )}

                {filteredPlans.length === 0 && !isCreating && (
                    <div className="flex flex-col items-center justify-center flex-1 text-slate-400 py-12">
                        <p>{t('plans.noPlans')}</p>
                    </div>
                )}
            </div>

            {/* Create Modal - unchanged */}
            {isCreating && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-zinc-800 w-full max-w-lg rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-zinc-700 flex flex-col gap-4 animate-in zoom-in-95">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('plans.newPlanModalTitle')}</h2>
                        <input
                            type="text"
                            placeholder={t('plans.planNameLabel')}
                            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#186eff] dark:focus:ring-[#186eff]"
                            value={newPlanName}
                            onChange={(e) => setNewPlanName(e.target.value)}
                        />
                        <textarea
                            rows={2}
                            placeholder={t('plans.descriptionLabel')}
                            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#186eff] dark:focus:ring-[#186eff] resize-none"
                            value={newPlanDesc}
                            onChange={(e) => setNewPlanDesc(e.target.value)}
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                {t('plans.cancelBtn')}
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!newPlanName.trim()}
                                className="px-4 py-2 rounded-lg bg-[#186eff] dark:bg-[#186eff] text-white font-medium disabled:opacity-50 transition-colors"
                            >
                                {t('plans.saveBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
