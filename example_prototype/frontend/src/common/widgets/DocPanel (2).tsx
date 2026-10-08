import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { AnimatePresence, motion } from 'motion/react';
import { X, FileText, Crop, Upload, ScanSearch } from 'lucide-react';
import { useDocContext } from '../context/DocContext';
import { useMapContext } from '../context/MapContext';
import { useTranslation } from 'react-i18next';
import { CropOverlay } from './CropOverlay';
import { DocContextMenu } from './DocContextMenu';
import { MagnifyOverlay } from './MagnifyOverlay';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

export const DocPanel: React.FC = () => {
    const { isDocOpen, docWidth, files, activeFileId, setActiveFile, removeFile, closeDoc, addFile, zoomLevel, panOffset, isMagnifying, setZoomLevel, setPanOffset, resetZoom, setIsMagnifying } = useDocContext();
    const { isMapOpen, mapWidth } = useMapContext();
    const { t } = useTranslation();
    const [isCropping, setIsCropping] = useState(false);
    const [pageWidths, setPageWidths] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const pdfContainerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Zoom interaction state
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [isAnimatingZoom, setIsAnimatingZoom] = useState(false);
    const touchDistRef = useRef<number | null>(null);
    const touchMidRef = useRef<{ x: number; y: number } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeFile = files.find(f => f.id === activeFileId);

    const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const data = new Uint8Array(reader.result as ArrayBuffer);
            // Use a copy for getDocument so the original buffer is never transferred/neutered
            const pdf = await pdfjs.getDocument({ data: data.slice() }).promise;
            addFile({ name: file.name, data: data.slice(), numPages: pdf.numPages });
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    }, [addFile]);

    // Create a Blob URL for react-pdf. Using a URL string avoids ArrayBuffer transfer/detach issues
    // with the pdfjs web worker.
    const pdfFileUrl = useMemo(() => {
        if (!activeFile) return null;
        const blob = new Blob([activeFile.data.buffer as ArrayBuffer], { type: 'application/pdf' });
        return URL.createObjectURL(blob);
    }, [activeFile]);

    // Revoke old Blob URLs to avoid memory leaks
    useEffect(() => {
        return () => {
            if (pdfFileUrl) URL.revokeObjectURL(pdfFileUrl);
        };
    }, [pdfFileUrl]);

    const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [resizeScale, setResizeScale] = useState(1);

    const onContainerResize = useCallback(() => {
        if (!containerRef.current) return;
        const newWidth = containerRef.current.clientWidth - 32;

        // If we already have a rendered width, visually scale instead of re-rendering
        if (pageWidths > 0) {
            setResizeScale(newWidth / pageWidths);
        }

        // Debounce the actual PDF re-render until resize stops
        if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = setTimeout(() => {
            if (containerRef.current) {
                const finalWidth = containerRef.current.clientWidth - 32;
                setPageWidths(finalWidth);
                setResizeScale(1);
            }
        }, 200);
    }, [pageWidths]);

    // Observe container resizes
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const setContainerRef = useCallback((node: HTMLDivElement | null) => {
        if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
        }
        if (node) {
            containerRef.current = node;
            const w = node.clientWidth - 32;
            setPageWidths(w);
            resizeObserverRef.current = new ResizeObserver(onContainerResize);
            resizeObserverRef.current.observe(node);
        }
    }, [onContainerResize]);

    // Ctrl + Scroll zoom handler
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newZoom = zoomLevel + delta;
            if (newZoom < 1) {
                // Bounce animation: briefly allow sub-1 then snap back
                setIsAnimatingZoom(true);
                resetZoom();
                setTimeout(() => setIsAnimatingZoom(false), 300);
            } else {
                const innerEl = contentRef.current;
                if (innerEl) {
                    const rect = innerEl.getBoundingClientRect();
                    const originX = rect.left + rect.width / 2;
                    const originY = rect.top;
                    const dx = e.clientX - originX;
                    const dy = e.clientY - originY;
                    const scaleRatio = newZoom / zoomLevel;
                    setPanOffset({
                        x: panOffset.x + dx * (1 - scaleRatio),
                        y: panOffset.y + dy * (1 - scaleRatio)
                    });
                }
                setZoomLevel(newZoom);
            }
        }
    }, [zoomLevel, panOffset, setZoomLevel, resetZoom, setPanOffset]);

    // Prevent default browser zoom on the container
    useEffect(() => {
        const el = pdfContainerRef.current;
        if (!el) return;
        const preventDefaultZoom = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) e.preventDefault();
        };
        el.addEventListener('wheel', preventDefaultZoom, { passive: false });
        return () => el.removeEventListener('wheel', preventDefaultZoom);
    }, []);

    // Double-click to zoom
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        if (isCropping || isMagnifying) return;
        e.preventDefault();
        setIsAnimatingZoom(true);
        if (zoomLevel >= 4.5) {
            resetZoom();
        } else {
            const newZoom = zoomLevel * 1.5;
            const innerEl = contentRef.current;
            if (innerEl) {
                const rect = innerEl.getBoundingClientRect();
                const originX = rect.left + rect.width / 2;
                const originY = rect.top;
                const dx = e.clientX - originX;
                const dy = e.clientY - originY;
                const scaleRatio = newZoom / zoomLevel;
                setPanOffset({
                    x: panOffset.x + dx * (1 - scaleRatio),
                    y: panOffset.y + dy * (1 - scaleRatio)
                });
            }
            setZoomLevel(newZoom);
        }
        setTimeout(() => setIsAnimatingZoom(false), 200);
    }, [zoomLevel, panOffset, setZoomLevel, resetZoom, setPanOffset, isCropping, isMagnifying]);

    // Pan handlers (drag to move when zoomed)
    const handlePanMouseDown = useCallback((e: React.MouseEvent) => {
        if (zoomLevel <= 1 || isCropping || isMagnifying || e.button !== 0) return;
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY, offsetX: panOffset.x, offsetY: panOffset.y });
    }, [zoomLevel, panOffset, isCropping, isMagnifying]);

    const handlePanMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning || !panStart) return;
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setPanOffset({ x: panStart.offsetX + dx, y: panStart.offsetY + dy });
    }, [isPanning, panStart, setPanOffset]);

    const handlePanMouseUp = useCallback(() => {
        setIsPanning(false);
        setPanStart(null);
    }, []);

    // Pinch-to-zoom (touch gestures)
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchDistRef.current = Math.hypot(dx, dy);
            touchMidRef.current = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
            };
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2 && touchDistRef.current !== null && touchMidRef.current !== null) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const newDist = Math.hypot(dx, dy);
            const scale = newDist / touchDistRef.current;
            const newZoom = zoomLevel * scale;
            if (newZoom < 1) {
                setIsAnimatingZoom(true);
                resetZoom();
                setTimeout(() => setIsAnimatingZoom(false), 300);
            } else {
                const innerEl = contentRef.current;
                if (innerEl) {
                    const rect = innerEl.getBoundingClientRect();
                    const originX = rect.left + rect.width / 2;
                    const originY = rect.top;
                    const mx = touchMidRef.current.x - originX;
                    const my = touchMidRef.current.y - originY;
                    const scaleRatio = newZoom / zoomLevel;
                    setPanOffset({
                        x: panOffset.x + mx * (1 - scaleRatio),
                        y: panOffset.y + my * (1 - scaleRatio)
                    });
                }
                setZoomLevel(newZoom);
            }
            touchDistRef.current = newDist;
            touchMidRef.current = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
            };
        }
    }, [zoomLevel, panOffset, setZoomLevel, resetZoom, setPanOffset]);

    const handleTouchEnd = useCallback(() => {
        touchDistRef.current = null;
        touchMidRef.current = null;
    }, []);

    // Right-click context menu
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        if (isCropping || isMagnifying) return;
        e.preventDefault();
        const containerEl = pdfContainerRef.current;
        if (!containerEl) return;
        const bounds = containerEl.getBoundingClientRect();
        setContextMenu({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
    }, [isCropping, isMagnifying]);

    // Magnify tool complete handler
    const handleMagnifyComplete = useCallback((newZoom: number, newPan: { x: number; y: number }) => {
        setIsAnimatingZoom(true);
        setZoomLevel(newZoom);
        setPanOffset(newPan);
        setIsMagnifying(false);
        setTimeout(() => setIsAnimatingZoom(false), 200);
    }, [setZoomLevel, setPanOffset, setIsMagnifying]);

    // Cursor style for zoom/pan
    const getContentCursor = () => {
        if (isCropping || isMagnifying) return 'default';
        if (isPanning) return 'grabbing';
        if (zoomLevel > 1) return 'grab';
        return 'pointer';
    };

    return (
        <AnimatePresence>
            {isDocOpen && !(isMapOpen && mapWidth === 100) && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: `${docWidth}%`, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="h-full flex overflow-hidden isolate"
                    style={{ flexShrink: 0 }}
                >
                    <div
                        ref={setContainerRef}
                        className="flex-1 relative flex flex-col overflow-hidden shadow-lg border border-e-0 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    >
                        {/* Header with file tabs */}
                        <div className="shrink-0 flex items-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-700 overflow-x-auto">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0 ms-1" />

                            {files.map(file => (
                                <button
                                    key={file.id}
                                    onClick={() => setActiveFile(file.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium shrink-0 transition-colors ${file.id === activeFileId
                                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                                        }`}
                                >
                                    <span className="max-w-[120px] truncate">{file.name}</span>
                                    <X
                                        className="w-3 h-3 opacity-60 hover:opacity-100"
                                        onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                                    />
                                </button>
                            ))}

                            <div className="flex-1" />

                            {/* Magnify tool button */}
                            {activeFile && (
                                <button
                                    onClick={() => setIsMagnifying(!isMagnifying)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${isMagnifying
                                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                        : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                                        }`}
                                    title={isMagnifying ? t('Cancel') : t('doc.magnify')}
                                >
                                    <ScanSearch className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {/* Crop button - shows X when active to indicate cancel */}
                            {activeFile && (
                                <button
                                    onClick={() => setIsCropping(!isCropping)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${isCropping
                                        ? 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200'
                                        : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                                        }`}
                                    title={isCropping ? t('Cancel') : t('doc.crop')}
                                >
                                    <Crop className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {/* Upload button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                                title={t('doc.upload')}
                            >
                                <Upload className="w-3.5 h-3.5" />
                            </button>

                            {/* Close button */}
                            <button
                                onClick={closeDoc}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                                title={t('doc.close')}
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* PDF content area */}
                        <div className="flex-1 relative overflow-hidden">
                            <div
                                ref={pdfContainerRef}
                                className="absolute inset-0 overflow-auto bg-slate-100 dark:bg-zinc-950"
                                onWheel={handleWheel}
                                onDoubleClick={handleDoubleClick}
                                onMouseDown={handlePanMouseDown}
                                onMouseMove={handlePanMouseMove}
                                onMouseUp={handlePanMouseUp}
                                onMouseLeave={handlePanMouseUp}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onContextMenu={handleContextMenu}
                                style={{ cursor: getContentCursor(), touchAction: 'pan-x pan-y', userSelect: 'none' }}
                            >
                                {activeFile && pdfFileUrl ? (
                                    <div
                                        ref={contentRef}
                                        className="flex flex-col items-center py-4 gap-4 px-4 mx-auto"
                                        style={{
                                            transform: `scale(${zoomLevel * resizeScale}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                                            transformOrigin: 'top center',
                                            transition: isAnimatingZoom
                                                ? 'transform 0.2s ease'
                                                : 'none',
                                        }}
                                    >
                                        <Document
                                            file={pdfFileUrl}
                                            loading={
                                                <div className="flex items-center justify-center p-8 text-slate-400">
                                                    <span className="text-sm">{t('doc.loading')}</span>
                                                </div>
                                            }
                                        >
                                            {Array.from({ length: activeFile.numPages }, (_, i) => (
                                                <Page
                                                    key={i}
                                                    pageNumber={i + 1}
                                                    width={pageWidths > 0 ? pageWidths : undefined}
                                                    className="shadow-md rounded overflow-hidden mb-4"
                                                    renderTextLayer={true}
                                                    renderAnnotationLayer={true}
                                                />
                                            ))}
                                        </Document>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                                        <FileText className="w-12 h-12 opacity-40" />
                                        <p className="text-sm">{t('doc.noFiles')}</p>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm"
                                        >
                                            <Upload className="w-4 h-4" />
                                            {t('doc.upload')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Crop overlay - outside scrollable area so it always covers the viewport */}
                            {isCropping && pdfContainerRef.current && (
                                <CropOverlay
                                    targetRef={pdfContainerRef}
                                    onComplete={() => setIsCropping(false)}
                                    onCancel={() => setIsCropping(false)}
                                />
                            )}

                            {/* Magnify overlay */}
                            {isMagnifying && pdfContainerRef.current && (
                                <MagnifyOverlay
                                    targetRef={pdfContainerRef}
                                    onComplete={handleMagnifyComplete}
                                    onCancel={() => setIsMagnifying(false)}
                                />
                            )}

                            {/* Right-click context menu */}
                            {contextMenu && (
                                <DocContextMenu
                                    x={contextMenu.x}
                                    y={contextMenu.y}
                                    onZoomIn={() => setZoomLevel(zoomLevel + 0.5)}
                                    onZoomOut={() => {
                                        if (zoomLevel <= 1) {
                                            setIsAnimatingZoom(true);
                                            resetZoom();
                                            setTimeout(() => setIsAnimatingZoom(false), 300);
                                        } else {
                                            setZoomLevel(zoomLevel - 0.5);
                                        }
                                    }}
                                    onResetZoom={resetZoom}
                                    onClose={() => setContextMenu(null)}
                                />
                            )}
                        </div>
                    </div>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleUpload}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};
