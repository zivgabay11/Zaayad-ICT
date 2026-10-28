import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CollisionDetection, DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { GripVertical, X } from 'lucide-react';
import { useDashboardsContext } from '../../common/context/DashboardsContext';
import { DashboardFeatureId, DashboardWidget } from '../../common/utilities/types';
import {
    DASHBOARD_FEATURES, DASHBOARD_FEATURE_GROUPS, computeTileLayout, getDashboardFeature, newDashboardWidget, tileRectStyle,
} from '../utilities/dashboardFeatures';

// "יצירת תצוגה חדשה" (Figma "מודולריות"): a name field, a dashed canvas and, on the right, a
// palette ("הוספה") with every feature of שליטה וניהול / ניטור / ספקטרום. There is no free
// placement: the canvas is the dashboard in miniature — one fixed rectangle with the proportions
// of the real screen area — and the elements the user adds are tiled over ALL of it
// automatically (one fills the screen, two sit side by side, and so on). What the user controls
// is which features are in and their order: drag an element from the palette onto a tile to put
// it there (or click it to add it at the end), drag a tile onto another to swap them, remove a
// tile with its X. Saving puts the dashboard in the user's repository and opens it.

// What the dashboard area of the app is made of (sidebar, header, tab strip, padding) — used to
// give the builder canvas the same aspect ratio as the screen the dashboard will be shown on.
const CHROME_W = 64 + 16;
const CHROME_H = 56 + 44 + 16;

const paletteTileClass = 'flex flex-col items-center justify-center gap-1.5 w-full min-h-[82px] px-1.5 py-2 rounded-lg border border-slate-200 dark:border-[rgba(214,235,253,0.19)] bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#43464d] dark:to-[#333844] text-sm leading-5 text-center text-slate-800 dark:text-white transition-colors select-none overflow-hidden';

const PaletteTile: React.FC<{ featureId: DashboardFeatureId; added: boolean; onAdd: (id: DashboardFeatureId) => void }> = ({ featureId, added, onAdd }) => {
    const { t } = useTranslation();
    const feature = getDashboardFeature(featureId);
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${featureId}`, disabled: added });
    const Icon = feature.icon;
    return (
        <button
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={() => { if (!added) onAdd(featureId); }}
            aria-disabled={added}
            title={added ? t('systemViews.builder.alreadyAdded') : undefined}
            data-palette-tile={featureId}
            data-added={added || undefined}
            className={`${paletteTileClass} ${added ? 'opacity-40 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:border-primary/60'} ${isDragging ? 'opacity-40' : ''}`}
        >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="max-w-full break-words">{t(feature.labelKey)}</span>
        </button>
    );
};

// One tile on the canvas: a drop target for other tiles / palette elements, draggable by its
// title bar, removable with its X.
const CanvasTile: React.FC<{ widget: DashboardWidget; rect: ReturnType<typeof computeTileLayout>[number]; onRemove: (id: string) => void }> = ({ widget, rect, onRemove }) => {
    const { t } = useTranslation();
    const feature = getDashboardFeature(widget.featureId);
    const Icon = feature.icon;
    const drag = useDraggable({ id: `tile:${widget.id}` });
    const drop = useDroppable({ id: `slot:${widget.id}` });
    return (
        <div ref={drop.setNodeRef} style={tileRectStyle(rect)} className="p-1 min-w-0 min-h-0" data-builder-widget={widget.featureId} data-widget-id={widget.id}>
            <div
                ref={drag.setNodeRef}
                className={`relative w-full h-full flex flex-col rounded-lg border bg-white dark:bg-zinc-800 shadow-sm overflow-hidden transition-colors ${drop.isOver && !drag.isDragging ? 'border-primary ring-2 ring-primary/40' : 'border-slate-300 dark:border-zinc-600'} ${drag.isDragging ? 'opacity-40' : ''}`}
            >
                <div className="shrink-0 flex items-center gap-1 h-8 px-1.5 border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800">
                    <button
                        {...drag.listeners}
                        {...drag.attributes}
                        aria-label={t('systemViews.builder.dragToReorder')}
                        title={t('systemViews.builder.dragToReorder')}
                        data-move-handle
                        className="shrink-0 p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100 cursor-grab active:cursor-grabbing touch-none"
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-slate-800 dark:text-white">{t(feature.labelKey)}</span>
                    <button
                        onClick={() => onRemove(widget.id)}
                        aria-label={t('systemViews.builder.remove')}
                        data-remove-widget
                        className="shrink-0 p-0.5 rounded text-slate-400 hover:text-red-500 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-1.5 overflow-hidden text-slate-400 dark:text-zinc-500 pointer-events-none">
                    <Icon className="w-9 h-9 shrink-0" />
                    <span className="max-w-full px-2 truncate text-sm font-medium text-slate-500 dark:text-zinc-400">{t(feature.labelKey)}</span>
                </div>
            </div>
        </div>
    );
};

// The canvas is a drop zone, so it has to live inside the DndContext (useDroppable reads it).
const BuilderCanvas: React.FC<{
    canvasRef: React.RefObject<HTMLDivElement>;
    size: { w: number; h: number };
    hasError: boolean;
    empty: boolean;
    emptyText: string;
    children: React.ReactNode;
}> = ({ canvasRef, size, hasError, empty, emptyText, children }) => {
    const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });
    return (
        <div
            ref={node => { setNodeRef(node); (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = node; }}
            data-builder-canvas
            style={{ width: size.w, height: size.h }}
            className={`relative shrink-0 rounded-xl border-2 border-dashed transition-colors ${isOver ? 'border-primary bg-primary/5' : hasError ? 'border-red-500' : 'border-slate-300 dark:border-zinc-600 bg-slate-50 dark:bg-zinc-800/40'}`}
        >
            {empty && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center pointer-events-none overflow-hidden">
                    <img src="/dashboards/empty-state.png" alt="" className="h-[38%] max-h-44 aspect-square object-contain" />
                    <p className="px-4 text-lg font-bold text-slate-800 dark:text-white">{emptyText}</p>
                </div>
            )}
            {children}
        </div>
    );
};

// A dragged item is dropped onto a tile ("slot:"); pointerWithin also reports the canvas
// behind it, so prefer the tile.
const preferTiles: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    const slot = hits.find(h => String(h.id).startsWith('slot:'));
    return slot ? [slot] : hits;
};

export const DashboardBuilderModal: React.FC = () => {
    const { t } = useTranslation();
    const { builder, closeBuilder, dashboards, saveDashboard, openDashboard } = useDashboardsContext();
    const editing = builder.editingId ? dashboards.find(d => d.id === builder.editingId) ?? null : null;

    const [name, setName] = useState('');
    const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
    const [errors, setErrors] = useState<{ name?: boolean; widgets?: boolean }>({});
    const [activeDrag, setActiveDrag] = useState<string | null>(null);
    const [canvasSize, setCanvasSize] = useState<{ w: number; h: number } | null>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    // Re-seed whenever the dialog opens (blank for a new view, the saved one when editing).
    useEffect(() => {
        if (!builder.open) return;
        setName(editing?.name ?? '');
        setWidgets(editing ? editing.widgets.map(w => ({ ...w })) : []);
        setErrors({});
        setActiveDrag(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [builder.open, builder.editingId]);

    // Fit the canvas into the free space with the aspect ratio of the real dashboard area.
    const fitCanvas = useCallback(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const ratio = Math.max(1, window.innerWidth - CHROME_W) / Math.max(1, window.innerHeight - CHROME_H);
        const availW = stage.clientWidth;
        const availH = stage.clientHeight;
        if (availW <= 0 || availH <= 0) return;
        const w = availW / availH > ratio ? availH * ratio : availW;
        setCanvasSize({ w: Math.floor(w), h: Math.floor(w / ratio) });
    }, []);

    useLayoutEffect(() => {
        if (!builder.open) return;
        fitCanvas();
        const stage = stageRef.current;
        if (!stage) return;
        const observer = new ResizeObserver(fitCanvas);
        observer.observe(stage);
        return () => observer.disconnect();
    }, [builder.open, fitCanvas]);

    if (!builder.open) return null;

    const inDashboard = new Set(widgets.map(w => w.featureId));

    // Add a feature at the end, or — dropped on a tile — in that tile's place (the tile and
    // everything after it shift along). Each feature can be in a dashboard once.
    const addWidget = (featureId: DashboardFeatureId, beforeId?: string) => {
        if (inDashboard.has(featureId)) return;
        const widget = newDashboardWidget(featureId);
        setErrors(prev => ({ ...prev, widgets: false }));
        setWidgets(prev => {
            const index = beforeId ? prev.findIndex(w => w.id === beforeId) : -1;
            return index < 0 ? [...prev, widget] : [...prev.slice(0, index), widget, ...prev.slice(index)];
        });
    };

    const removeWidget = (id: string) => setWidgets(prev => prev.filter(w => w.id !== id));

    const handleDragEnd = (e: DragEndEvent) => {
        setActiveDrag(null);
        const activeId = String(e.active.id);
        const overId = e.over ? String(e.over.id) : null;
        if (!overId) return;
        const targetId = overId.startsWith('slot:') ? overId.slice(5) : undefined;
        if (activeId.startsWith('palette:')) {
            addWidget(activeId.slice(8) as DashboardFeatureId, targetId);
        } else if (activeId.startsWith('tile:') && targetId) {
            const movingId = activeId.slice(5);
            if (movingId === targetId) return;
            // Dropping a tile on another swaps their places.
            setWidgets(prev => {
                const a = prev.findIndex(w => w.id === movingId);
                const b = prev.findIndex(w => w.id === targetId);
                if (a < 0 || b < 0) return prev;
                const next = [...prev];
                [next[a], next[b]] = [next[b], next[a]];
                return next;
            });
        }
    };

    const save = () => {
        const nextErrors = { name: !name.trim(), widgets: widgets.length === 0 };
        setErrors(nextErrors);
        if (nextErrors.name || nextErrors.widgets) return;
        const saved = saveDashboard({ id: editing?.id, name: name.trim(), widgets });
        closeBuilder();
        openDashboard(saved.id);
    };

    const tiles = computeTileLayout(widgets.length, canvasSize ? canvasSize.w / canvasSize.h : 1.9);
    const draggedFeatureId = activeDrag?.startsWith('palette:') ? (activeDrag.slice(8) as DashboardFeatureId)
        : activeDrag?.startsWith('tile:') ? widgets.find(w => w.id === activeDrag.slice(5))?.featureId : undefined;
    const draggedFeature = draggedFeatureId ? getDashboardFeature(draggedFeatureId) : null;
    const DraggedIcon = draggedFeature?.icon;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                role="dialog"
                aria-modal="true"
                data-dashboard-builder
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-700 flex flex-col overflow-hidden w-[min(1600px,96vw)] h-[min(960px,94vh)] animate-in zoom-in-95 duration-200"
            >
                <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-3 border-b border-slate-200 dark:border-zinc-700">
                    <h2 className="min-w-0 truncate text-xl font-bold text-slate-900 dark:text-white">{t(editing ? 'systemViews.builder.editTitle' : 'systemViews.builder.newTitle')}</h2>
                    <button onClick={closeBuilder} aria-label={t('systemViews.builder.cancel')} className="shrink-0 p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={preferTiles}
                    onDragStart={(e: DragStartEvent) => setActiveDrag(String(e.active.id))}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveDrag(null)}
                >
                    <div className="flex-1 min-h-0 flex">
                        <div className="flex-1 min-w-0 flex flex-col p-4 gap-3">
                            <div className="shrink-0">
                                <label className="block text-sm text-slate-600 dark:text-zinc-300 mb-1">{t('systemViews.builder.nameLabel')}</label>
                                <input
                                    value={name}
                                    onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: false })); }}
                                    maxLength={60}
                                    placeholder={t('systemViews.builder.namePlaceholder')}
                                    name="dashboardName"
                                    className={`w-full h-10 px-3 rounded-lg border bg-white dark:bg-zinc-800 text-sm text-slate-900 dark:text-zinc-100 outline-none focus:border-primary transition-colors ${errors.name ? 'border-red-500' : 'border-slate-300 dark:border-zinc-600'}`}
                                />
                                {errors.name && <p className="text-xs text-red-500 mt-1">{t('systemViews.builder.nameRequired')}</p>}
                            </div>

                            <div ref={stageRef} className="flex-1 min-h-0 flex items-center justify-center overflow-hidden" data-builder-stage>
                                {canvasSize && (
                                    <BuilderCanvas
                                        canvasRef={canvasRef}
                                        size={canvasSize}
                                        hasError={!!errors.widgets}
                                        empty={widgets.length === 0}
                                        emptyText={t('systemViews.builder.emptyCanvas')}
                                    >
                                        {widgets.map((w, index) => (
                                            <CanvasTile key={w.id} widget={w} rect={tiles[index]} onRemove={removeWidget} />
                                        ))}
                                    </BuilderCanvas>
                                )}
                            </div>
                            <div className="shrink-0 h-4 text-xs">
                                {errors.widgets
                                    ? <p className="text-red-500">{t('systemViews.builder.widgetsRequired')}</p>
                                    : <p className="text-slate-500 dark:text-zinc-400 truncate">{t('systemViews.builder.autoHint')}</p>}
                            </div>
                        </div>

                        <aside className="shrink-0 w-[150px] border-s border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/40 flex flex-col" data-palette>
                            <div className="shrink-0 px-3 pt-3 pb-2 text-sm font-bold text-slate-900 dark:text-white">{t('systemViews.builder.add')}</div>
                            <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 flex flex-col gap-3">
                                {DASHBOARD_FEATURE_GROUPS.map(group => (
                                    <div key={group.id} className="flex flex-col gap-1.5">
                                        <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 truncate">{t(group.labelKey)}</div>
                                        {DASHBOARD_FEATURES.filter(f => f.group === group.id).map(f => (
                                            <PaletteTile key={f.id} featureId={f.id} added={inDashboard.has(f.id)} onAdd={id => addWidget(id)} />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>

                    <DragOverlay dropAnimation={null}>
                        {draggedFeature && DraggedIcon ? (
                            <div className={`${paletteTileClass} w-[130px] shadow-2xl cursor-grabbing`}>
                                <DraggedIcon className="w-5 h-5" />
                                <span>{t(draggedFeature.labelKey)}</span>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>

                <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 dark:border-zinc-700">
                    <button onClick={closeBuilder} className="h-10 px-5 rounded-lg bg-slate-100 dark:bg-zinc-700 text-sm font-semibold text-slate-700 dark:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-600 transition-colors whitespace-nowrap">
                        {t('systemViews.builder.cancel')}
                    </button>
                    <button onClick={save} data-save-dashboard className="h-10 px-6 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap">
                        {t('systemViews.builder.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};
