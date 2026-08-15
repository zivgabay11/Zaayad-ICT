import React, { useCallback, useRef } from 'react';
import { Map } from 'lucide-react';
import { useMapContext } from '../context/MapContext';
import { useTranslation } from 'react-i18next';

export const MapEdgeHandle: React.FC = () => {
    const { isMapOpen, mapWidth, openMap, setMapWidth, closeMap } = useMapContext();
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
        const initialMapWidth = isMapOpen ? mapWidth : 0;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!isDragging.current) return;

            // Calculate exact pixel change
            const deltaX = moveEvent.clientX - startX;
            let deltaPercentage = (deltaX / mainRect.width) * 100;

            let newPercentage;
            if (isRtl) {
                newPercentage = initialMapWidth + deltaPercentage;
            } else {
                newPercentage = initialMapWidth - deltaPercentage;
            }

            // If dragged below 15%, close the map entirely
            if (newPercentage < 15) {
                closeMap();
                return;
            }

            newPercentage = Math.min(100, newPercentage);

            if (!isMapOpen) {
                openMap(Math.max(20, newPercentage));
            } else {
                setMapWidth(newPercentage);
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
    }, [isMapOpen, mapWidth, openMap, setMapWidth, closeMap]);

    const handleClick = useCallback(() => {
        if (!isMapOpen) {
            openMap(50);
        }
    }, [isMapOpen, openMap]);

    if (isMapOpen && mapWidth === 100) return null;

    return (
        <div className="shrink-0 w-0 relative flex items-center h-full z-40">
            <button
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
                style={{ transform: 'translateY(-2.5rem)' }}
                className={`absolute end-0 pointer-events-auto flex flex-col items-center justify-center w-6 py-3 px-1 gap-1.5 rounded-s-lg shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1),-2px_0_4px_-1px_rgba(0,0,0,0.06)] border border-e-0 cursor-col-resize transition-colors group ${isMapOpen
                    ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 z-40'
                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 z-40'
                    }`}
                title={t('diagram.title')}
            >
                <Map className={`w-3.5 h-3.5 shrink-0 transition-colors ${isMapOpen
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 group-hover:text-emerald-500'
                    }`} />
                <span
                    className={`text-[10px] font-semibold tracking-wide transition-colors whitespace-nowrap ${isMapOpen
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 group-hover:text-emerald-500'
                        }`}
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                >
                    {t('nav.diagram')}
                </span>
            </button>
        </div>
    );
};
