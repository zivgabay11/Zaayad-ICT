import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RadioTower, Check } from 'lucide-react';
import { useStaticSpaceContext } from '../context/StaticSpaceContext';
import { mockCommSites } from '../utilities/mockData';

// "Add sites" picker (PRD 6.3 / US-3 / acceptance 13.1): lists the full Nitor catalog,
// lets the user search + multi-select, and merges the confirmed selection into the
// unit's Comm Site table.

export const AddCommSitesModal: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { isAddSitesModalOpen, closeAddSitesModal, unitSiteIds, addSites } = useStaticSpaceContext();
    const [query, setQuery] = useState('');
    const [picked, setPicked] = useState<Set<string>>(new Set());

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return mockCommSites;
        return mockCommSites.filter(s => (s.siteName[i18n.language] || s.siteName.en).toLowerCase().includes(q));
    }, [query, i18n.language]);

    if (!isAddSitesModalOpen) return null;

    const togglePick = (id: string) => {
        setPicked(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleClose = () => {
        setQuery('');
        setPicked(new Set());
        closeAddSitesModal();
    };

    const handleConfirm = () => {
        if (picked.size > 0) addSites(Array.from(picked));
        handleClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-xl max-h-[82vh] overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('staticSpace.addSitesModalTitle')}</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{t('staticSpace.addSitesModalSubtitle')}</p>
                </div>

                <div className="px-5 py-3 border-b border-slate-200 dark:border-zinc-800 shrink-0">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 dark:text-zinc-500" />
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={t('staticSpace.searchPlaceholder')}
                            className="w-full ps-3 pe-9 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-primary transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {filtered.length === 0 ? (
                        <div className="text-center text-sm text-slate-400 dark:text-zinc-500 py-10">{t('staticSpace.noResults')}</div>
                    ) : filtered.map(site => {
                        const already = unitSiteIds.includes(site.id);
                        const checked = picked.has(site.id);
                        return (
                            <div
                                key={site.id}
                                onClick={() => !already && togglePick(site.id)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${already ? 'opacity-40 cursor-default' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
                            >
                                <span className={`flex items-center justify-center w-[18px] h-[18px] rounded-[6px] border-2 shrink-0 transition-colors
                                    ${checked ? 'bg-primary border-primary' : 'border-slate-300 dark:border-zinc-600'}`}>
                                    {checked && <Check className="w-3 h-3 text-white dark:text-zinc-900" />}
                                </span>
                                <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${checked ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'}`}>
                                    <RadioTower className="w-4 h-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{site.siteName[i18n.language] || site.siteName.en}</div>
                                    <div className="flex gap-1.5 mt-1">
                                        {site.isEladAnchor && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">{t('staticSpace.eladAnchor')}</span>}
                                        {site.isMabanAnchor && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">{t('staticSpace.mabanAnchor')}</span>}
                                        {already && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-zinc-700 dark:text-zinc-400">{t('staticSpace.alreadyInTable')}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 dark:border-zinc-800 shrink-0">
                    <span className="text-xs text-slate-500 dark:text-zinc-500">{t('staticSpace.sitesSelected', { count: picked.size })}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={handleClose} className="text-sm px-4 py-2 text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors font-medium">
                            {t('staticSpace.cancel')}
                        </button>
                        <button onClick={handleConfirm} className="text-sm px-4 py-2 bg-primary hover:bg-primary/90 text-white dark:text-zinc-900 rounded-lg transition-colors font-medium shadow-sm">
                            {t('staticSpace.addSites')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
