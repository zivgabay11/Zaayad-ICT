import React, { useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DocContextMenuProps {
    x: number;
    y: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
    onClose: () => void;
}

export const DocContextMenu: React.FC<DocContextMenuProps> = ({ x, y, onZoomIn, onZoomOut, onResetZoom, onClose }) => {
    const { t } = useTranslation();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const items = [
        { icon: <ZoomIn className="w-3.5 h-3.5" />, label: t('doc.zoomIn'), action: onZoomIn },
        { icon: <ZoomOut className="w-3.5 h-3.5" />, label: t('doc.zoomOut'), action: onZoomOut },
        { icon: <RotateCcw className="w-3.5 h-3.5" />, label: t('doc.resetZoom'), action: onResetZoom },
    ];

    return (
        <div
            ref={menuRef}
            className="absolute z-[100] bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-slate-200 dark:border-zinc-600 py-1 min-w-[150px]"
            style={{ left: x, top: y }}
        >
            {items.map(({ icon, label, action }) => (
                <button
                    key={label}
                    onClick={() => { action(); onClose(); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                >
                    {icon}
                    {label}
                </button>
            ))}
        </div>
    );
};
