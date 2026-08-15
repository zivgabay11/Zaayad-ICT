import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface MagnifyOverlayProps {
    targetRef: React.RefObject<HTMLDivElement | null>;
    onComplete: (zoomLevel: number, panOffset: { x: number; y: number }) => void;
    onCancel: () => void;
}

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export const MagnifyOverlay: React.FC<MagnifyOverlayProps> = ({ targetRef, onComplete, onCancel }) => {
    const { t } = useTranslation();
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [rect, setRect] = useState<Rect | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;

        const overlayEl = overlayRef.current;
        if (!overlayEl) return;

        const bounds = overlayEl.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;

        setStartPoint({ x, y });
        setRect({ x, y, width: 0, height: 0 });
        setIsDrawing(true);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDrawing || !startPoint || !overlayRef.current) return;

        const bounds = overlayRef.current.getBoundingClientRect();
        const currentX = e.clientX - bounds.left;
        const currentY = e.clientY - bounds.top;

        setRect({
            x: Math.min(startPoint.x, currentX),
            y: Math.min(startPoint.y, currentY),
            width: Math.abs(currentX - startPoint.x),
            height: Math.abs(currentY - startPoint.y),
        });
    }, [isDrawing, startPoint]);

    const handleMouseUp = useCallback(() => {
        if (!isDrawing || !rect || !targetRef.current) return;
        setIsDrawing(false);

        // Minimum size check
        if (rect.width < 20 || rect.height < 20) {
            setRect(null);
            return;
        }

        const container = targetRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate zoom to fit the selected rectangle into the viewport
        const scaleX = containerWidth / rect.width;
        const scaleY = containerHeight / rect.height;
        const newZoom = Math.max(1, Math.min(scaleX, scaleY, 5.0));

        // The rectangle coordinates are relative to the overlay (which matches the container).
        // Account for scroll position to get the absolute content position.
        const rectCenterX = rect.x + rect.width / 2;
        const rectCenterY = rect.y + rect.height / 2 + container.scrollTop;

        // With transformOrigin "top center", the scaling origin is (containerWidth/2, 0).
        // After scale(z), content point (cx, cy) appears at screen position:
        //   screenX = containerWidth/2 + (cx - containerWidth/2) * z + panX
        //   screenY = cy * z + panY
        // We want the rect center to appear at viewport center:
        //   panX = viewportCenterX - containerWidth/2 - (rectCenterX - containerWidth/2) * newZoom
        //   panY = viewportCenterY - rectCenterY * newZoom
        const viewportCenterX = containerWidth / 2;
        const viewportCenterY = containerHeight / 2;

        const panX = viewportCenterX - containerWidth / 2 - (rectCenterX - containerWidth / 2) * newZoom;
        const panY = viewportCenterY - rectCenterY * newZoom;

        onComplete(newZoom, { x: panX, y: panY });
    }, [isDrawing, rect, targetRef, onComplete]);

    // Escape key to cancel
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    return (
        <div
            ref={overlayRef}
            className="absolute inset-0 z-50 cursor-crosshair"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* Selection rectangle */}
            {rect && rect.width > 0 && rect.height > 0 && (
                <div
                    className="absolute border-2 border-amber-500 bg-amber-500/10 rounded-sm"
                    style={{
                        left: rect.x,
                        top: rect.y,
                        width: rect.width,
                        height: rect.height,
                    }}
                >
                    {/* Corner handles */}
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-amber-500 rounded-full" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-amber-500 rounded-full" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
                </div>
            )}

            {/* Instructions */}
            {!isDrawing && !rect && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-800/80 text-white text-xs font-medium rounded-lg">
                    {t('doc.magnifyInstruction')}
                </div>
            )}
        </div>
    );
};
