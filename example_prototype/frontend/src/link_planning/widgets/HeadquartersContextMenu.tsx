import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Pencil, MapPin, Trash2 } from 'lucide-react';
import { useHeadquartersLayerContext } from '../../common/context/HeadquartersLayerContext';
import { useLinkPlanningContext } from '../../common/context/LinkPlanningContext';

interface Props {
    entityId: string;
    x: number;
    y: number;
    onRename: () => void;
    onChangeLocation: () => void;
    onClose: () => void;
}

// Right-click menu on a Link Planning headquarters/command-post marker — identical shape
// to MobilePlatformContextMenu.tsx. Rename/change-location only make sense while the
// entity is still under נוה"ק; once transferred into ניהו"ק's "מפקדות וחפ"קים" layer only
// cancel-transfer + delete remain.
export const HeadquartersContextMenu: React.FC<Props> = ({ entityId, x, y, onRename, onChangeLocation, onClose }) => {
    const { t } = useTranslation();
    const { ids, addEntity, removeEntity } = useHeadquartersLayerContext();
    const { removeHeadquartersEntity } = useLinkPlanningContext();
    const isInLayer = ids.includes(entityId);

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
                    onClick={() => { isInLayer ? removeEntity(entityId) : addEntity(entityId); onClose(); }}
                    className="w-full text-start px-3 py-2 text-sm flex items-center gap-2 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                >
                    <Layers className="w-4 h-4 text-slate-500" />
                    {isInLayer ? t('layerOrganizer.cancelTransferToNihuk') : t('layerOrganizer.transferToNihuk')}
                </button>
                <div className="my-1 border-t border-slate-200 dark:border-zinc-600" />
                <button
                    onClick={() => { removeHeadquartersEntity(entityId); onClose(); }}
                    className="w-full text-start px-3 py-2 text-sm flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    {t('linkPlanning.deleteHeadquartersEntity')}
                </button>
            </div>
        </>
    );
};
