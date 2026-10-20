import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Pencil, MapPin, Trash2 } from 'lucide-react';
import { useMobileSpaceContext } from '../../common/context/MobileSpaceContext';
import { useLinkPlanningContext } from '../../common/context/LinkPlanningContext';

interface Props {
    platformId: string;
    x: number;
    y: number;
    onRename: () => void;
    onChangeLocation: () => void;
    onClose: () => void;
}

// Right-click menu on a Link Planning mobile platform marker — styled like
// diagram/widgets/MapContextMenu.tsx. Transfer toggles the platform's membership in the
// separate "Mobile Space Establishment" (כינון מרחב נייד) layer, worded as "transfer to
// ניהו"ק" per the planning→management two-phase layer tree (see LayerOrganizerPanel.tsx).
// Rename/change-location only make sense while the platform is still under נוה"ק — once
// transferred into ניהו"ק it's management's entity, so only cancel-transfer + delete remain.
export const MobilePlatformContextMenu: React.FC<Props> = ({ platformId, x, y, onRename, onChangeLocation, onClose }) => {
    const { t } = useTranslation();
    const { platformIds, addPlatform, removePlatform } = useMobileSpaceContext();
    const { removeMobilePlatform } = useLinkPlanningContext();
    const isInLayer = platformIds.includes(platformId);

    return (
        <>
            <div className="fixed inset-0 z-[2000]" onClick={onClose} />
            <div
                className="absolute z-[2001] bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-slate-200 dark:border-zinc-600 py-1 min-w-[220px]"
                style={{ left: x, top: y }}
            >
                {!isInLayer && (
                    <>
                        <button
                            onClick={() => { onRename(); onClose(); }}
                            className="w-full text-start px-3 py-2 text-sm flex items-center gap-2 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <Pencil className="w-4 h-4 text-slate-500" />
                            {t('linkPlanning.rename')}
                        </button>
                        <button
                            onClick={() => { onChangeLocation(); onClose(); }}
                            className="w-full text-start px-3 py-2 text-sm flex items-center gap-2 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <MapPin className="w-4 h-4 text-slate-500" />
                            {t('linkPlanning.changeLocation')}
                        </button>
                    </>
                )}
                <button
                    onClick={() => { isInLayer ? removePlatform(platformId) : addPlatform(platformId); onClose(); }}
                    className="w-full text-start px-3 py-2 text-sm flex items-center gap-2 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                >
                    <Layers className="w-4 h-4 text-slate-500" />
                    {isInLayer ? t('layerOrganizer.cancelTransferToNihuk') : t('layerOrganizer.transferToNihuk')}
                </button>
                <div className="my-1 border-t border-slate-200 dark:border-zinc-600" />
                <button
                    onClick={() => { removeMobilePlatform(platformId); onClose(); }}
                    className="w-full text-start px-3 py-2 text-sm flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    {t('linkPlanning.deletePlatform')}
                </button>
            </div>
        </>
    );
};
