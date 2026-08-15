import React, { useCallback, useRef } from 'react';
import { FileText } from 'lucide-react';
import { useDocContext } from '../context/DocContext';
import { useMapContext } from '../context/MapContext';
import { useTranslation } from 'react-i18next';

export const DocEdgeHandle: React.FC = () => {
    const { isDocOpen, docWidth, openDoc, setDocWidth, closeDoc } = useDocContext();
    const { t } = useTranslation();
    const isDragging = useRef(false);
    const containerRef = useRef<HTMLButtonElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;

        const mainEl = containerRef.current?.closest('main');
        if (!mainEl) return;

        const mainRect = mainEl.getBoundingClientRect();
        const isRtl = document.documentElement.dir === 'rtl';
        const startX = e.clientX;
        const initialDocWidth = isDocOpen ? docWidth : 0;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!isDragging.current) return;

            const deltaX = moveEvent.clientX - startX;
            let deltaPercentage = (deltaX / mainRect.width) * 100;

            let newPercentage;
            if (isRtl) {
                newPercentage = initialDocWidth + deltaPercentage;
            } else {
                newPercentage = initialDocWidth - deltaPercentage;
            }

            if (newPercentage < 15) {
                closeDoc();
                return;
            }

            newPercentage = Math.min(80, newPercentage);

            if (!isDocOpen) {
                openDoc(Math.max(20, newPercentage));
            } else {
                setDocWidth(newPercentage);
            }
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [isDocOpen, docWidth, openDoc, setDocWidth, closeDoc]);

    const handleClick = useCallback(() => {
        if (!isDocOpen) {
            openDoc(40);
        }
    }, [isDocOpen, openDoc]);

    const { isMapOpen, mapWidth } = useMapContext();
    if (isMapOpen && mapWidth === 100) return null;

    return (
        <div className="shrink-0 w-0 relative flex items-center h-full z-30">
            <button
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
                style={{ transform: 'translateY(2.5rem)' }}
                className={`absolute end-0 flex flex-col items-center justify-center w-6 py-3 px-1 gap-1.5 rounded-s-lg shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1),-2px_0_4px_-1px_rgba(0,0,0,0.06)] border border-e-0 cursor-col-resize transition-colors group ${isDocOpen
                    ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 z-30'
                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 z-30'
                    }`}
                title={t('doc.title')}
            >
                <FileText className={`w-3.5 h-3.5 shrink-0 transition-colors ${isDocOpen
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 group-hover:text-indigo-500'
                    }`} />
                <span
                    className={`text-[10px] font-semibold tracking-wide transition-colors whitespace-nowrap ${isDocOpen
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 group-hover:text-indigo-500'
                        }`}
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                >
                    {t('doc.title')}
                </span>
            </button>
        </div>
    );
};
