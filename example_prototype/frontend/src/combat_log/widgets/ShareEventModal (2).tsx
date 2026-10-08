import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Check, Share2 } from 'lucide-react';
import { useCombatLogContext } from '../../common/context/CombatLogContext';
import { CombatLogEvent } from '../../common/utilities/types';
import { mockUnits } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';

// Share an event up or down the force tree (PRD 4.2/US-05): pick any unit — the receiving
// unit's edit rights are then governed by the log type's table (enforced in the
// edit/view components via getEditPermission), not by anything chosen here.

interface ShareEventModalProps {
    event: CombatLogEvent | null;
    onClose: () => void;
}

export const ShareEventModal: React.FC<ShareEventModalProps> = ({ event, onClose }) => {
    const { t, i18n } = useTranslation();
    const { shareEvent } = useCombatLogContext();
    const [query, setQuery] = useState('');

    const options = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!event) return [];
        return mockUnits
            .filter(u => u.code !== event.reporterUnitCode)
            .filter(u => !q || formatUnitName(u as any, t, i18n.language).toLowerCase().includes(q) || String(u.code).includes(q))
            .sort((a, b) => a.code - b.code);
    }, [query, event, t, i18n.language]);

    if (!event) return null;

    const handleClose = () => { setQuery(''); onClose(); };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md max-h-[78vh] overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('combatLog.shareModal.title')}</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{t('combatLog.shareModal.subtitle')}</p>
                </div>

                <div className="px-5 py-3 border-b border-slate-200 dark:border-zinc-800 shrink-0">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 dark:text-zinc-500" />
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={t('combatLog.shareModal.searchPlaceholder')}
                            className="w-full ps-3 pe-9 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 outline-none focus:border-primary transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {options.map(unit => {
                        const alreadyShared = event.sharedWithUnitCodes.includes(unit.code);
                        return (
                            <div
                                key={unit.code}
                                onClick={() => !alreadyShared && shareEvent(event.id, unit.code)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${alreadyShared ? 'opacity-50 cursor-default' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
                            >
                                <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${alreadyShared ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'}`}>
                                    {alreadyShared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{formatUnitName(unit as any, t, i18n.language)}</div>
                                    <div className="text-[10.5px] text-slate-400 dark:text-zinc-500">
                                        {alreadyShared ? t('combatLog.shareModal.alreadyShared') : t(`definitions.levels.${unit.type}`, { defaultValue: unit.type })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-end px-5 py-4 border-t border-slate-200 dark:border-zinc-800 shrink-0">
                    <button onClick={handleClose} className="text-sm px-4 py-2 text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors font-medium">
                        {t('combatLog.actions.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};
