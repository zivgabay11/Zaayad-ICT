import React, { useState } from 'react';
import {
    Layers, Sun, Move, ChevronDown, Pentagon, MoveRight, Spline, Type,
    X, Plus, Minus, Users, Circle, Maximize,
    MoveUpLeft,
    PenLine,
    Wand2,
    Radar,
    Truck,
    Signal,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMapContext, MapType } from '../../common/context/MapContext';
import { useAnalysisContext } from '../../common/context/AnalysisContext';
import { usePlanContext } from '../../common/context/PlanContext';
import { useLinkPlanningContext } from '../../common/context/LinkPlanningContext';
import { LayerOrganizerPanel } from '../../common/widgets/LayerOrganizerPanel';
import { formatUnitName } from '../../common/utilities/formatting';
import { mockUnits } from '../../common/utilities/mockData';
import { getUnitColor } from '../../common/utilities/colors';

interface MapToolbarProps {
    onDrawPolygon: () => void;
    onDrawArrow: () => void;
    onDrawLine: () => void;
    onDrawArc: () => void;
    onDrawTextLabel: () => void;
    activeDrawingTool: string | null;
    onFitBounds: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onDrawLinkCell: () => void;
    onPlaceMobilePlatform: () => void;
}

interface TooltipButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    className?: string;
    active?: boolean;
}

const TooltipButton: React.FC<TooltipButtonProps> = ({ onClick, icon, label, className = '', active }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    return (
        <div className="relative">
            <button
                onClick={onClick}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={className}
            >
                {icon}
            </button>
            {showTooltip && (
                <div className="absolute bottom-full mb-1.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                    {label}
                </div>
            )}
        </div>
    );
};

export const MapToolbar: React.FC<MapToolbarProps> = ({
    onDrawPolygon,
    onDrawArrow,
    onDrawLine,
    onDrawArc,
    onDrawTextLabel,
    activeDrawingTool,
    onFitBounds,
    onZoomIn,
    onZoomOut,
    onDrawLinkCell,
    onPlaceMobilePlatform,
}) => {
    const { t, i18n } = useTranslation();
    const { activeMapType, setActiveMapType, opacity, setOpacity, activePhaseId, setActivePhaseId, activeUnitCode, setActiveUnitCode, closeMap, currentSection } = useMapContext();
    const { openComputeCutModal, cellsLayerOn } = useLinkPlanningContext();
    const { activePlan } = usePlanContext();
    const [showMapTypeDropdown, setShowMapTypeDropdown] = useState(false);
    const [showPhasesDropdown, setShowPhasesDropdown] = useState(false);
    const [showUnitsDropdown, setShowUnitsDropdown] = useState(false);
    const [showOpacity, setShowOpacity] = useState(false);
    const { isPanelOpen, setPanelOpen, anyResults } = useAnalysisContext();

    const mapTypes: { key: MapType; label: string }[] = [
        { key: 'default', label: t('diagram.default') },
        { key: 'terrain', label: t('diagram.terrain') },
        { key: 'satellite', label: t('diagram.satellite') },
    ];

    const phases = activePlan?.phases || [];
    const units = activePlan?.units || [];

    // Get session for color resolution
    const sessionRaw = localStorage.getItem('session');
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    const sessionUnit = session?.unit || null;

    const closeAllDropdowns = () => {
        setShowMapTypeDropdown(false);
        setShowPhasesDropdown(false);
        setShowUnitsDropdown(false);
        setShowOpacity(false);
    };

    const iconBtnClass = "flex items-center justify-center w-9 h-9 rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors";
    const aiBtnClass = "flex items-center justify-center w-9 h-9 rounded-lg text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors";

    return (
        <>
            {/* Top Start: Close, Map Type */}
            <div className="absolute top-3 start-3 z-[1000] pointer-events-auto flex flex-col">
                <div className="flex flex-col items-center gap-1 bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-slate-200 dark:border-zinc-600 px-1.5 py-2">
                    <button
                        onClick={closeMap}
                        className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <div className="h-px w-7 bg-slate-300 dark:bg-zinc-600 my-0.5" />
                    {/* Map Type */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowMapTypeDropdown(!showMapTypeDropdown); setShowPhasesDropdown(false); setShowOpacity(false); setShowUnitsDropdown(false); }}
                            className={iconBtnClass}
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                        {showMapTypeDropdown && (
                            <div className="absolute top-full start-0 mt-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-slate-200 dark:border-zinc-600 py-1.5 min-w-[300px] max-h-[70vh] overflow-y-auto">
                                <h4 className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{t('diagram.map_type')}</h4>
                                {mapTypes.map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => { setActiveMapType(key); setShowMapTypeDropdown(false); }}
                                        className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${activeMapType === key ? 'bg-primary/10 text-primary font-medium' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
                                    >
                                        {label}
                                    </button>
                                ))}

                                <div className="my-1.5 border-t border-slate-200 dark:border-zinc-700" />
                                <h4 className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{t('staticSpace.operationalLayers')}</h4>

                                <LayerOrganizerPanel onAfterEnterLinkPlanningEditor={() => setShowMapTypeDropdown(false)} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top End: Zoom, Fit Bounds */}
            <div className="absolute top-3 end-3 z-[1000] pointer-events-auto flex flex-col">
                <div className="flex flex-col items-center gap-1 bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-slate-200 dark:border-zinc-600 px-1.5 py-2">
                    <button onClick={onFitBounds} className={iconBtnClass} title={t('diagram.fit_bounds')}>
                        <Maximize className="w-4 h-4" />
                    </button>
                    <button onClick={onZoomIn} className={iconBtnClass}>
                        <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={onZoomOut} className={iconBtnClass}>
                        <Minus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Bottom Center: Filter and Drawing Tools — a horizontal bar pinned to the
                bottom of the map, rather than a vertical column floating at its side. */}
            <div className="absolute bottom-3 start-1/2 -translate-x-1/2 z-[1000] pointer-events-auto flex flex-row">
                <div className="flex flex-row items-center gap-1 bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-slate-200 dark:border-zinc-600 px-2 py-1.5">
                    {/* Phases */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowPhasesDropdown(!showPhasesDropdown); setShowMapTypeDropdown(false); setShowOpacity(false); setShowUnitsDropdown(false); }}
                            className={iconBtnClass}
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                        {showPhasesDropdown && (
                            <div className="absolute bottom-full start-0 mb-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-slate-200 dark:border-zinc-600 py-1 min-w-[160px]">
                                <button
                                    onClick={() => { setActivePhaseId(null); setShowPhasesDropdown(false); }}
                                    className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${!activePhaseId ? 'bg-primary/10 text-primary font-medium' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
                                >
                                    {t('diagram.all_phases')}
                                </button>
                                {phases.map((phase) => (
                                    <button
                                        key={phase.id}
                                        onClick={() => { setActivePhaseId(phase.id); setShowPhasesDropdown(false); }}
                                        className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${activePhaseId === phase.id ? 'bg-primary/10 text-primary font-medium' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
                                    >
                                        {phase.title?.[i18n.language] || phase.title?.['en'] || `Phase ${phase.index + 1}`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Units */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowUnitsDropdown(!showUnitsDropdown); setShowPhasesDropdown(false); setShowMapTypeDropdown(false); setShowOpacity(false); }}
                            className={`${iconBtnClass} ${activeUnitCode ? 'ring-2 ring-primary/50' : ''}`}
                        >
                            <Users className="w-4 h-4" />
                        </button>
                        {showUnitsDropdown && (
                            <div className="absolute bottom-full start-0 mb-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-slate-200 dark:border-zinc-600 py-1 min-w-[180px]">
                                <button
                                    onClick={() => { setActiveUnitCode(null); setShowUnitsDropdown(false); }}
                                    className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${!activeUnitCode ? 'bg-primary/10 text-primary font-medium' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
                                >
                                    {t('diagram.all_units')}
                                </button>
                                {units.map((unit) => {
                                    const fullUnit = mockUnits.find(u => u.code === unit.code);
                                    const color = getUnitColor(unit.code, sessionUnit, units.map(u => u.code), mockUnits);
                                    return (
                                        <button
                                            key={unit.code}
                                            onClick={() => { setActiveUnitCode(unit.code); setShowUnitsDropdown(false); }}
                                            className={`w-full text-start px-3 py-1.5 text-sm transition-colors flex items-center gap-2 ${activeUnitCode === unit.code ? 'bg-primary/10 text-primary font-medium' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
                                        >
                                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                            {formatUnitName(fullUnit || unit, t, i18n.language)}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-7 bg-slate-300 dark:bg-zinc-600 mx-0.5" />

                    {/* Drawing Tools — Link Planning gets its own tool set (cell polygon,
                        mobile platform, compute cut) instead of the generic diagram tools,
                        but only while תכנון קשר רדיו's own layer is on: turning that layer
                        off (the eye/checkbox in the Layer Organizer) hides these tools too —
                        they reappear the moment the layer is switched back on or its editor
                        is (re-)entered via the pen icon there. */}
                    {currentSection === 'link_planning' && cellsLayerOn ? (
                        <>
                            <TooltipButton
                                onClick={onDrawLinkCell}
                                icon={<Radar className="w-4 h-4" />}
                                label={t('linkPlanning.drawCell')}
                                className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700"
                            />
                            <TooltipButton
                                onClick={onPlaceMobilePlatform}
                                icon={<Truck className="w-4 h-4" />}
                                label={t('linkPlanning.addPlatform')}
                                className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700"
                            />
                            <button
                                onClick={openComputeCutModal}
                                title={t('linkPlanning.computeCut')}
                                className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-semibold shadow-sm"
                            >
                                <Signal className="w-4 h-4" />
                                {t('linkPlanning.computeCut')}
                            </button>
                        </>
                    ) : currentSection === 'link_planning' ? null : (
                        <>
                            <TooltipButton
                                onClick={onDrawTextLabel}
                                icon={<Type className="w-4 h-4" />}
                                label={t('diagram.text_label')}
                                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${activeDrawingTool === 'textLabel' ? 'bg-primary text-white' : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
                            />
                            <TooltipButton
                                onClick={onDrawArrow}
                                icon={<MoveUpLeft className="w-4 h-4" />}
                                label={t('diagram.arrow')}
                                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${activeDrawingTool === 'arrow' ? 'bg-primary text-white' : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
                            />
                            <TooltipButton
                                onClick={onDrawLine}
                                icon={<PenLine className="w-4 h-4" />}
                                label={t('diagram.line')}
                                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${activeDrawingTool === 'line' ? 'bg-primary text-white' : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
                            />
                            <TooltipButton
                                onClick={onDrawArc}
                                icon={<Spline className="w-4 h-4" />}
                                label={t('diagram.arc')}
                                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${activeDrawingTool === 'arc' ? 'bg-primary text-white' : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
                            />
                            <TooltipButton
                                onClick={onDrawPolygon}
                                icon={<Pentagon className="w-4 h-4" />}
                                label={t('diagram.polygon')}
                                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${activeDrawingTool === 'polygon' ? 'bg-primary text-white' : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Bottom End: Opacity */}
            <div className="absolute bottom-3 end-3 z-[1000] pointer-events-auto flex flex-col">
                <div className="flex flex-col items-center gap-1 bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-slate-200 dark:border-zinc-600 px-1.5 py-2">
                    <div className="relative">
                        <button
                            onClick={() => { setShowOpacity(!showOpacity); setShowMapTypeDropdown(false); setShowPhasesDropdown(false); setShowUnitsDropdown(false); }}
                            className={iconBtnClass}
                        >
                            <Sun className="w-4 h-4" />
                        </button>
                        {showOpacity && (
                            <div className="absolute bottom-0 end-full me-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-slate-200 dark:border-zinc-600 p-3 min-w-[160px]">
                                <label className="text-xs text-slate-500 dark:text-zinc-400 mb-1 block">{t('diagram.opacity')}</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={opacity}
                                    onChange={(e) => setOpacity(Number(e.target.value))}
                                    className="w-full accent-primary"
                                />
                                <div className="text-xs text-center text-slate-500 dark:text-zinc-400 mt-1">{opacity}%</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Start: AI Tools */}
            <div className="absolute bottom-3 start-3 z-[1000] pointer-events-auto flex flex-col">
                <div className="flex flex-col items-center gap-1 bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-slate-200 dark:border-zinc-600 px-1.5 py-2">
                    <div className="relative">
                        <button
                            onClick={() => setPanelOpen(!isPanelOpen)}
                            title={t('diagram.aiTools.title')}
                            className={`${aiBtnClass} ${isPanelOpen ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : ''}`}
                        >
                            <Wand2 className="w-4 h-4" />
                        </button>
                        {!isPanelOpen && anyResults && (
                            <span className="absolute top-0.5 end-0.5 w-2 h-2 rounded-full bg-primary" />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
