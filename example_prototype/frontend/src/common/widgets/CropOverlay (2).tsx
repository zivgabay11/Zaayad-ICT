import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Copy, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CropOverlayProps {
    targetRef: React.RefObject<HTMLDivElement | null>;
    onComplete: () => void;
    onCancel: () => void;
}

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export const CropOverlay: React.FC<CropOverlayProps> = ({ targetRef, onComplete, onCancel }) => {
    const { t } = useTranslation();
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [rect, setRect] = useState<Rect | null>(null);
    const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
    const [showActions, setShowActions] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;

        // If actions are showing, clicking outside the buttons/rect dismisses
        if (showActions && rect) {
            const overlayEl = overlayRef.current;
            if (!overlayEl) return;
            const bounds = overlayEl.getBoundingClientRect();
            const clickX = e.clientX - bounds.left;
            const clickY = e.clientY - bounds.top;

            // Check if click is inside the selection rect or action buttons area
            const inRect = clickX >= rect.x && clickX <= rect.x + rect.width
                && clickY >= rect.y && clickY <= rect.y + rect.height + 50;
            if (!inRect) {
                onCancel();
            }
            return;
        }

        const overlayEl = overlayRef.current;
        if (!overlayEl) return;

        const bounds = overlayEl.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;

        setStartPoint({ x, y });
        setRect({ x, y, width: 0, height: 0 });
        setIsDrawing(true);
    }, [showActions, rect, onCancel]);

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

    const handleMouseUp = useCallback(async () => {
        if (!isDrawing || !rect || !targetRef.current) return;
        setIsDrawing(false);

        // Minimum size check
        if (rect.width < 10 || rect.height < 10) {
            setRect(null);
            return;
        }

        try {
            const targetEl = targetRef.current;
            const targetBounds = targetEl.getBoundingClientRect();
            const pixelRatio = window.devicePixelRatio || 1;

            // Create a composite canvas of the visible area by drawing all child canvases
            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = targetEl.clientWidth * pixelRatio;
            compositeCanvas.height = targetEl.clientHeight * pixelRatio;
            const compositeCtx = compositeCanvas.getContext('2d');
            if (!compositeCtx) return;

            compositeCtx.fillStyle = '#f1f5f9';
            compositeCtx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
            compositeCtx.scale(pixelRatio, pixelRatio);

            const canvases = targetEl.querySelectorAll('canvas');
            for (const sourceCanvas of canvases) {
                const canvasBounds = sourceCanvas.getBoundingClientRect();
                const x = canvasBounds.left - targetBounds.left;
                const y = canvasBounds.top - targetBounds.top;

                if (y + canvasBounds.height < 0 || y > targetEl.clientHeight) continue;
                if (x + canvasBounds.width < 0 || x > targetEl.clientWidth) continue;

                try {
                    compositeCtx.drawImage(sourceCanvas, x, y, canvasBounds.width, canvasBounds.height);
                } catch {
                    // Skip tainted canvases
                }
            }

            // Crop the selected rectangle
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = rect.width * pixelRatio;
            cropCanvas.height = rect.height * pixelRatio;
            const cropCtx = cropCanvas.getContext('2d');
            if (!cropCtx) return;

            cropCtx.drawImage(
                compositeCanvas,
                rect.x * pixelRatio, rect.y * pixelRatio,
                rect.width * pixelRatio, rect.height * pixelRatio,
                0, 0, cropCanvas.width, cropCanvas.height,
            );

            // Store as data URL for both actions
            const dataUrl = cropCanvas.toDataURL('image/png');
            setCapturedDataUrl(dataUrl);
            setShowActions(true);
        } catch (err) {
            console.error('Failed to capture crop:', err);
            onComplete();
        }
    }, [isDrawing, rect, targetRef, onComplete]);

    const handleCopyAsImage = useCallback(async () => {
        if (!capturedDataUrl) return;
        try {
            const response = await fetch(capturedDataUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob }),
            ]);
            setFeedback(t('doc.copied'));
            setTimeout(() => {
                setFeedback(null);
                onComplete();
            }, 1200);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            onComplete();
        }
    }, [capturedDataUrl, onComplete, t]);

    const handleBrainstormWithAI = useCallback(() => {
        if (!capturedDataUrl) return;
        // Extract base64 data (remove the data:image/png;base64, prefix)
        const base64 = capturedDataUrl.split(',')[1];
        // Ensure chat panel is open
        window.dispatchEvent(new CustomEvent('horus-show-chat'));
        // Dispatch event for ChatSidebar to pick up
        document.dispatchEvent(new CustomEvent('doc-capture-to-chat', {
            detail: { base64, mimeType: 'image/png', name: 'document-capture.png' }
        }));
        setFeedback(t('doc.sentToChat'));
        setTimeout(() => {
            setFeedback(null);
            onComplete();
        }, 800);
    }, [capturedDataUrl, onComplete, t]);

    // Escape key to cancel
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    return (
        <div
            ref={overlayRef}
            className={`absolute inset-0 z-50 ${showActions ? 'cursor-default' : 'cursor-crosshair'}`}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* Selection rectangle */}
            {rect && rect.width > 0 && rect.height > 0 && (
                <div
                    className="absolute border-2 border-indigo-500 bg-indigo-500/10"
                    style={{
                        left: rect.x,
                        top: rect.y,
                        width: rect.width,
                        height: rect.height,
                    }}
                />
            )}

            {/* Action buttons after capture */}
            {showActions && rect && (
                <div
                    className="absolute z-[60] flex items-center gap-1.5 p-1.5 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm rounded-lg shadow-2xl border border-slate-200 dark:border-zinc-600 ring-1 ring-black/5 dark:ring-white/5"
                    style={{
                        left: rect.x + rect.width / 2,
                        top: rect.y + rect.height + 8,
                        transform: 'translateX(-50%)',
                    }}
                >
                    <button
                        onClick={handleCopyAsImage}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-600 border border-slate-200 dark:border-zinc-600 transition-colors"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        {t('doc.copyAsImage')}
                    </button>
                    <button
                        onClick={handleBrainstormWithAI}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-cyan-600 dark:bg-cyan-700 text-white hover:bg-cyan-700 dark:hover:bg-cyan-600 border border-cyan-700 dark:border-cyan-600 transition-colors"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        {t('doc.brainstormAI')}
                    </button>
                </div>
            )}

            {/* Feedback toast - positioned above the selection */}
            {feedback && rect && (
                <div
                    className="absolute z-[70] flex items-center gap-2 px-4 py-2.5 bg-slate-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
                    style={{
                        left: rect.x + rect.width / 2,
                        top: rect.y - 12,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-600 animate-pulse" />
                    {feedback}
                </div>
            )}

            {/* Instructions */}
            {!isDrawing && !rect && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-800/80 text-white text-xs font-medium rounded-lg">
                    {t('doc.cropInstruction')}
                </div>
            )}
        </div>
    );
};
