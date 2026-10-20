import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, MapPin, Trash2 } from 'lucide-react';

interface Props {
    cellId: string;
    x: number;
    y: number;
    onRename: () => void;
    onChangeLocation: () => void;
    onDelete: () => void;
    onClose: () => void;
}

// Right-click menu on a Link Planning terrain cell polygon — styled like
// MobilePlatformContextMenu.tsx. A cell is never transferred to ניהו"ק, so all three
// actions are always available (unlike a platform, whose rename/move disappear once
// transferred).
export const LinkCellContextMenu: React.FC<Props> = ({ x, y, onRename, onChangeLocation, onDelete, onClose }) => {
    const { t } = useTranslation();

    return (
        <>
            <div className="fixed inset-0 z-[2000]" onClick={onClose} />
            <div
                className="absolute z-[2001] bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-slate-200 dark:border-zinc-600 py-1 min-w-[220px]"
                style={{ left: x, top: y }}
            >
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
                <div className="my-1 border-t border-slate-200 dark:border-zinc-600" />
                <button
                    onClick={() => { onDelete(); onClose(); }}
                    className="w-full text-start px-3 py-2 text-sm flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    {t('linkPlanning.deleteCell')}
                </button>
            </div>
        </>
    );
};
