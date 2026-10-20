import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RadioTower, Truck } from 'lucide-react';
import { useLinkPlanningContext } from '../../common/context/LinkPlanningContext';
import { mockCommSites } from '../../common/utilities/mockData';

// "Compute coverage cut" modal: pick the Link Cell to test, then any combination of Comm
// Sites (from the existing Static Space catalog) and/or Mobile Comm Platforms affecting it.
// Styled like common/widgets/AddCommSitesModal.tsx. Each confirm creates a new, independent
// LinkCoverageCut — it never overwrites a previous cut for the same cell (per the user's
// choice), so running this repeatedly builds up a stack of comparable layers.
export const ComputeCoverageCutModal: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { isComputeCutModalOpen, closeComputeCutModal, linkCells, mobilePlatforms, addCoverageCut } = useLinkPlanningContext();
    const [cellId, setCellId] = useState('');
    const [pickedSites, setPickedSites] = useState<Set<string>>(new Set());
    const [pickedPlatforms, setPickedPlatforms] = useState<Set<string>>(new Set());

    const canConfirm = !!cellId && (pickedSites.size > 0 || pickedPlatforms.size > 0);

    if (!isComputeCutModalOpen) return null;

    const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
        const next = new Set(set);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSet(next);
    };

    const handleClose = () => {
        setCellId('');
        setPickedSites(new Set());
        setPickedPlatforms(new Set());
        closeComputeCutModal();
    };

    const handleConfirm = () => {
        if (!canConfirm) return;
        addCoverageCut(cellId, Array.from(pickedSites), Array.from(pickedPlatforms));
        handleClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-xl max-h-[82vh] overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('linkPlanning.computeCutModalTitle')}</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{t('linkPlanning.computeCutModalSubtitle')}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Cell selector */}
                    <div>
                        <label className="text-xs text-slate-500 dark:text-zinc-400 mb-1 block">{t('linkPlanning.selectCell')}</label>
                        <select
                            value={cellId}
                            onChange={e => setCellId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                        >
                            <option value="">{t('linkPlanning.selectCellPlaceholder')}</option>
                            {linkCells.map(cell => (
                                <option key={cell.id} value={cell.id}>{cell.name}</option>
                            ))}
                        </select>
                        {linkCells.length === 0 && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">{t('linkPlanning.noCellsHint')}</p>
                        )}
                    </div>

                    {/* Comm sites */}
                    <div>
                        <label className="text-xs text-slate-500 dark:text-zinc-400 mb-1.5 block">{t('linkPlanning.selectCommSites')}</label>
                        <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto rounded-lg border border-slate-200 dark:border-zinc-700 p-1.5">
                            {mockCommSites.map(site => (
                                <label key={site.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800">
                                    <input
                                        type="checkbox"
                                        checked={pickedSites.has(site.id)}
                                        onChange={() => toggle(pickedSites, setPickedSites, site.id)}
                                        className="accent-primary w-3.5 h-3.5"
                                    />
                                    <RadioTower className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />
                                    <span className="text-sm text-slate-700 dark:text-zinc-300 truncate">{site.siteName[i18n.language] || site.siteName.en}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Mobile platforms */}
                    <div>
                        <label className="text-xs text-slate-500 dark:text-zinc-400 mb-1.5 block">{t('linkPlanning.selectPlatforms')}</label>
                        {mobilePlatforms.length === 0 ? (
                            <p className="text-[11px] text-slate-400 dark:text-zinc-500">{t('linkPlanning.noPlatformsHint')}</p>
                        ) : (
                            <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto rounded-lg border border-slate-200 dark:border-zinc-700 p-1.5">
                                {mobilePlatforms.map(platform => (
                                    <label key={platform.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800">
                                        <input
                                            type="checkbox"
                                            checked={pickedPlatforms.has(platform.id)}
                                            onChange={() => toggle(pickedPlatforms, setPickedPlatforms, platform.id)}
                                            className="accent-primary w-3.5 h-3.5"
                                        />
                                        <Truck className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />
                                        <span className="text-sm text-slate-700 dark:text-zinc-300 truncate">{platform.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-zinc-800 shrink-0">
                    <button onClick={handleClose} className="text-sm px-4 py-2 text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors font-medium">
                        {t('staticSpace.cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className="text-sm px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('linkPlanning.computeCut')}
                    </button>
                </div>
            </div>
        </div>
    );
};
