import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import {
    Wand2, X, Trash2, Loader2, RefreshCw, Share2, Eye, EyeOff, Check, Plus,
    Mountain, Route, Radar, Crosshair, Tent, Layers, Binoculars, ListOrdered,
} from 'lucide-react';
import { useAnalysisContext, AnalysisTab, AnalysisToolId } from '../../common/context/AnalysisContext';
import { usePlanContext } from '../../common/context/PlanContext';
import { EnemyEntityType, MockTarget } from '../../common/utilities/types';
import { horusAgentFlow } from '../../common/chat/agent';
import {
    analyzeElevationHeatMap,
    analyzeMobilityAxes,
    analyzeDominatingAreas,
    analyzeDominatedAreas,
    analyzeDeploymentAreas,
    analyzeEnemyCoverage,
    analyzeLosThreat,
    analyzeRoutes,
    analyzeObservationPositions,
    analyzeTargetPriority,
    getAnchoredTargets,
    ForceSize,
    RouteKind,
    ElevationHeatMapResult,
    MobilityAxesResult,
    DominatingAreasResult,
    DominatedAreasResult,
    DeploymentAreasResult,
    CoverageMapResult,
    LosThreatResult,
    RouteAnalysisResult,
    ObservationPositionsResult,
    TargetPriorityResult,
} from '../services/analysisAgent';
import {
    renderElevationHeatMap,
    renderMobilityAxes,
    renderDominatingAreas,
    renderDominatedAreas,
    renderDeploymentAreas,
    renderCoverageMap,
    renderLosThreat,
    renderRouteAnalysis,
    renderObservationPositions,
    renderTargetPriority,
    routeKindColors,
} from '../utilities/overlayRenderer';

interface ToolDef {
    id: AnalysisToolId;
    tab: AnalysisTab;
    icon: React.ReactNode;
}

const TOOL_DEFS: ToolDef[] = [
    { id: 'elevationHeatMap', tab: 'terrain', icon: <Mountain className="w-4 h-4" /> },
    { id: 'mobilityAxes', tab: 'terrain', icon: <Route className="w-4 h-4" /> },
    { id: 'dominatingAreas', tab: 'terrain', icon: <Radar className="w-4 h-4" /> },
    { id: 'dominatedAreas', tab: 'terrain', icon: <Crosshair className="w-4 h-4" /> },
    { id: 'deploymentAreas', tab: 'terrain', icon: <Tent className="w-4 h-4" /> },
    { id: 'enemyCoverage', tab: 'enemy', icon: <Layers className="w-4 h-4" /> },
    { id: 'losThreat', tab: 'enemy', icon: <Eye className="w-4 h-4" /> },
    { id: 'routePlanning', tab: 'mission', icon: <Route className="w-4 h-4" /> },
    { id: 'observationPositions', tab: 'mission', icon: <Binoculars className="w-4 h-4" /> },
    { id: 'targetPriority', tab: 'mission', icon: <ListOrdered className="w-4 h-4" /> },
];

const TABS: AnalysisTab[] = ['terrain', 'enemy', 'mission'];

const ENTITY_TYPES: EnemyEntityType[] = ['atgm', 'artillery', 'tank', 'aa', 'smallArms'];

const ROUTE_KINDS: RouteKind[] = ['fast', 'secured', 'rightFlank', 'leftFlank'];

type Resolution = 'low' | 'medium' | 'high';
const RESOLUTION_DELAYS: Record<Resolution, number> = { low: 1000, medium: 1500, high: 2500 };

// Map each tab to the plan narrative field its analysis exports into
const EXPORT_FIELD_BY_TAB: Record<AnalysisTab, string> = {
    terrain: 'terrain',
    enemy: 'enemy',
    mission: 'operationalIdea',
};

type ExportState = 'exporting' | 'done' | undefined;

// Build a compact, human-readable summary of a tool result for the AI agent / fallback text
function summarizeResult(id: AnalysisToolId, result: unknown, t: (key: string) => string, lang: string): { details: string; data: any } {
    switch (id) {
        case 'elevationHeatMap': {
            const r = result as ElevationHeatMapResult;
            const details = `${t('diagram.analysis.legend.elevation')}: ${Math.round(r.minElevation)}m - ${Math.round(r.maxElevation)}m`;
            return { details, data: { minElevation: Math.round(r.minElevation), maxElevation: Math.round(r.maxElevation) } };
        }
        case 'mobilityAxes': {
            const r = result as MobilityAxesResult;
            const items = r.axes.map(a => `${t(a.label)} (${t(`diagram.analysis.legend.${a.importance}`)})`);
            return { details: items.join('; '), data: r.axes.map(a => ({ name: t(a.label), importance: a.importance, segments: a.segments.map(s => t(s.label)) })) };
        }
        case 'dominatingAreas': {
            const r = result as DominatingAreasResult;
            const items = r.areas.map(a => `${t(a.label)} (${a.dominanceScore}/100)`);
            return { details: items.join('; '), data: r.areas.map(a => ({ name: t(a.label), dominanceScore: a.dominanceScore })) };
        }
        case 'dominatedAreas': {
            const r = result as DominatedAreasResult;
            const items = r.areas.map(a => `${t(`diagram.aiTools.exposure_${a.exposure}`)} (${t('diagram.aiTools.observed_from')}: ${t(a.observedFrom)})`);
            return { details: items.join('; '), data: r.areas.map(a => ({ exposure: a.exposure, observedFrom: t(a.observedFrom) })) };
        }
        case 'deploymentAreas': {
            const r = result as DeploymentAreasResult;
            const items = r.areas.map(a => `${t(a.label)} (${a.suitability}/100)`);
            return { details: `${t(`diagram.aiTools.force_sizes.${r.forceSize}`)}: ${items.join('; ')}`, data: { forceSize: r.forceSize, areas: r.areas.map(a => ({ name: t(a.label), suitability: a.suitability })) } };
        }
        case 'enemyCoverage': {
            const r = result as CoverageMapResult;
            const types = [...new Set(r.zones.map(z => z.weaponType))].map(w => t(`diagram.aiTools.entity_types.${w}`));
            return { details: `${r.zones.length} ${t('diagram.analysis.legend.enemy_threat_coverage')} (${types.join(', ')})`, data: { zoneCount: r.zones.length, entityTypes: types } };
        }
        case 'losThreat': {
            const r = result as LosThreatResult;
            const items = r.targetThreats.map(tt => `${tt.name[lang] || tt.name['en']}: ${tt.threatLevel}%`);
            return { details: items.join('; '), data: r.targetThreats.map(tt => ({ name: tt.name[lang] || tt.name['en'], threatLevel: tt.threatLevel, coveredByCount: tt.coveredBy.length })) };
        }
        case 'routePlanning': {
            const r = result as RouteAnalysisResult;
            const items = r.routes.map(route => `${t(route.label)} (${route.score}/100, ${route.riskSegments.length} ${t('diagram.aiTools.risk_segments')})`);
            return { details: items.join('; '), data: r.routes.map(route => ({ name: t(route.label), score: route.score, safety: route.safetyRating, speed: route.speedRating, concealment: route.concealmentRating, riskSegments: route.riskSegments.length })) };
        }
        case 'observationPositions': {
            const r = result as ObservationPositionsResult;
            const items = r.positions.map(p => `${t(p.label)} (${p.score}/100)`);
            return { details: items.join('; '), data: r.positions.map(p => ({ name: t(p.label), score: p.score })) };
        }
        case 'targetPriority': {
            const r = result as TargetPriorityResult;
            const items = r.targets.map(tgt => `#${tgt.priority} ${tgt.name[lang] || tgt.name['en']} (${t(`diagram.aiTools.entity_types.${tgt.type}`)})`);
            return { details: items.join('; '), data: r.targets.map(tgt => ({ priority: tgt.priority, name: tgt.name[lang] || tgt.name['en'], type: tgt.type, score: tgt.score, recommendedAsset: t(tgt.recommendedAsset) })) };
        }
    }
}

export const MapAiToolsPanel: React.FC = () => {
    const { t, i18n } = useTranslation();
    const {
        isPanelOpen, setPanelOpen, activeTab, setActiveTab,
        toolStates, setToolRunning, setToolResult, toggleToolVisibility,
        bumpSeed, clearTool, clearAll, anyResults, mapInstance,
    } = useAnalysisContext();
    const { activePlan, proposeUpdate } = usePlanContext();

    // Per-tool options
    const [enemyTypes, setEnemyTypes] = useState<EnemyEntityType[]>([...ENTITY_TYPES]);
    const [targets, setTargets] = useState<MockTarget[]>([]);
    const targetsMaterialized = useRef(false);
    const [resolution, setResolution] = useState<Resolution>('medium');
    const [forceSize, setForceSize] = useState<ForceSize>('battalion');
    const [routeVisibility, setRouteVisibility] = useState<Record<RouteKind, boolean>>({ fast: true, secured: true, rightFlank: true, leftFlank: true });
    const [showRisks, setShowRisks] = useState(true);
    const routeGroupsRef = useRef<{ routeGroups: Record<RouteKind, L.LayerGroup>; riskGroup: L.LayerGroup } | null>(null);

    const [dirtyTools, setDirtyTools] = useState<Partial<Record<AnalysisToolId, boolean>>>({});
    const [exportStates, setExportStates] = useState<Partial<Record<AnalysisToolId, ExportState>>>({});

    const markDirty = (id: AnalysisToolId) => {
        if (toolStates[id].status === 'done') {
            setDirtyTools(prev => ({ ...prev, [id]: true }));
        }
    };

    const getTargetsForRun = useCallback((center: { lat: number; lng: number }): MockTarget[] => {
        if (targetsMaterialized.current) return targets;
        const anchored = getAnchoredTargets(center);
        setTargets(anchored);
        targetsMaterialized.current = true;
        return anchored;
    }, [targets]);

    const runTool = useCallback(async (id: AnalysisToolId, seedOverride?: number) => {
        if (!mapInstance || toolStates[id].status === 'running') return;
        const seed = seedOverride ?? toolStates[id].seed;

        setToolRunning(id);
        setDirtyTools(prev => ({ ...prev, [id]: false }));
        setExportStates(prev => ({ ...prev, [id]: undefined }));

        try {
            await new Promise(resolve => setTimeout(resolve, RESOLUTION_DELAYS[id === 'losThreat' ? resolution : 'medium']));

            const center = mapInstance.getCenter();
            const mapCenter = { lat: center.lat, lng: center.lng };
            const bounds = mapInstance.getBounds();
            const mapBounds = { south: bounds.getSouth(), north: bounds.getNorth(), west: bounds.getWest(), east: bounds.getEast() };

            let layers: L.Layer[];
            let legend;
            let result: unknown;

            switch (id) {
                case 'elevationHeatMap': {
                    const r = analyzeElevationHeatMap(mapBounds, seed);
                    ({ layers, legend } = renderElevationHeatMap(r, t));
                    result = r;
                    break;
                }
                case 'mobilityAxes': {
                    const r = analyzeMobilityAxes(mapCenter, seed);
                    ({ layers, legend } = renderMobilityAxes(r, t));
                    result = r;
                    break;
                }
                case 'dominatingAreas': {
                    const r = analyzeDominatingAreas(mapCenter, seed);
                    ({ layers, legend } = renderDominatingAreas(r, t));
                    result = r;
                    break;
                }
                case 'dominatedAreas': {
                    const r = analyzeDominatedAreas(mapCenter, seed);
                    ({ layers, legend } = renderDominatedAreas(r, t));
                    result = r;
                    break;
                }
                case 'deploymentAreas': {
                    const r = analyzeDeploymentAreas(mapCenter, { forceSize }, seed);
                    ({ layers, legend } = renderDeploymentAreas(r, t));
                    result = r;
                    break;
                }
                case 'enemyCoverage': {
                    const r = analyzeEnemyCoverage(mapCenter, { enabledTypes: enemyTypes }, seed);
                    ({ layers, legend } = renderCoverageMap(r, t));
                    result = r;
                    break;
                }
                case 'losThreat': {
                    const r = analyzeLosThreat(mapCenter, getTargetsForRun(mapCenter), seed);
                    ({ layers, legend } = renderLosThreat(r, t, i18n.language));
                    result = r;
                    break;
                }
                case 'routePlanning': {
                    const r = analyzeRoutes(mapCenter, seed);
                    const rendered = renderRouteAnalysis(r, t);
                    layers = rendered.layers;
                    legend = rendered.legend;
                    routeGroupsRef.current = { routeGroups: rendered.routeGroups, riskGroup: rendered.riskGroup };
                    setRouteVisibility({ fast: true, secured: true, rightFlank: true, leftFlank: true });
                    setShowRisks(true);
                    result = r;
                    break;
                }
                case 'observationPositions': {
                    const r = analyzeObservationPositions(mapCenter, seed);
                    ({ layers, legend } = renderObservationPositions(r, t));
                    result = r;
                    break;
                }
                case 'targetPriority': {
                    const r = analyzeTargetPriority(mapCenter, seed);
                    ({ layers, legend } = renderTargetPriority(r, t, i18n.language));
                    result = r;
                    break;
                }
            }

            setToolResult(id, L.layerGroup(layers), legend, result);
        } catch (err) {
            console.error('Analysis failed:', err);
            clearTool(id);
        }
    }, [mapInstance, toolStates, resolution, forceSize, enemyTypes, getTargetsForRun, setToolRunning, setToolResult, clearTool, t, i18n.language]);

    const handleRerun = (id: AnalysisToolId) => {
        const newSeed = bumpSeed(id);
        runTool(id, newSeed);
    };

    const handleExport = async (id: AnalysisToolId) => {
        const state = toolStates[id];
        if (state.status !== 'done' || state.result == null || exportStates[id] === 'exporting') return;

        const def = TOOL_DEFS.find(d => d.id === id)!;
        const field = EXPORT_FIELD_BY_TAB[def.tab];
        const toolName = t(`diagram.aiTools.tools.${id}`);
        const summary = summarizeResult(id, state.result, t, i18n.language);

        setExportStates(prev => ({ ...prev, [id]: 'exporting' }));

        try {
            const data = await horusAgentFlow({
                messages: [{
                    id: `analysis-export-${Date.now()}`,
                    role: 'user',
                    text: `I just ran the "${toolName}" map analysis tool. Use the getMapAnalysisResults tool to read the structured results, then call updatePlanProperty to update the "${field}" plan field with a concise, professional military narrative paragraph based on those results. Respond with a one-sentence confirmation.`,
                }],
                activePlan,
                currentSection: 'diagram',
                language: i18n.language,
                mapAnalysis: { toolName, tab: def.tab, summary: summary.data },
            });
            if (data.proposedUpdates && data.proposedUpdates.length > 0) {
                data.proposedUpdates.forEach(update => proposeUpdate(update.path, update.value));
            } else {
                throw new Error('Agent did not propose an update');
            }
        } catch (err) {
            // Offline / no-API-key fallback: stage a template-based summary directly
            console.warn('AI export failed, using local fallback:', err);
            const text = `${t('diagram.aiTools.export_fallback_prefix')} ${toolName}: ${summary.details}`;
            proposeUpdate(field, { en: text, he: text, [i18n.language]: text });
        }

        setExportStates(prev => ({ ...prev, [id]: 'done' }));
    };

    const toggleRoute = (kind: RouteKind) => {
        const parent = toolStates.routePlanning.layerGroup;
        const groups = routeGroupsRef.current;
        if (!parent || !groups) return;
        const next = !routeVisibility[kind];
        if (next) {
            parent.addLayer(groups.routeGroups[kind]);
        } else {
            parent.removeLayer(groups.routeGroups[kind]);
        }
        setRouteVisibility(prev => ({ ...prev, [kind]: next }));
    };

    const toggleRisks = () => {
        const parent = toolStates.routePlanning.layerGroup;
        const groups = routeGroupsRef.current;
        if (!parent || !groups) return;
        if (showRisks) {
            parent.removeLayer(groups.riskGroup);
        } else {
            parent.addLayer(groups.riskGroup);
        }
        setShowRisks(!showRisks);
    };

    const toggleEnemyType = (type: EnemyEntityType) => {
        setEnemyTypes(prev => prev.includes(type) ? prev.filter(x => x !== type) : [...prev, type]);
        markDirty('enemyCoverage');
    };

    const updateTargetAzimuth = (targetId: string, key: 'azimuthStart' | 'azimuthEnd', value: number) => {
        setTargets(prev => prev.map(tgt => tgt.id === targetId ? { ...tgt, [key]: value } : tgt));
        markDirty('losThreat');
    };

    const addTarget = () => {
        if (!mapInstance) return;
        const center = mapInstance.getCenter();
        const n = targets.length + 1;
        setTargets(prev => [...prev, {
            id: `target-custom-${Date.now()}`,
            name: { en: `Target ${n}`, he: `מטרה ${n}` },
            position: { lat: center.lat + (Math.random() - 0.5) * 0.01, lng: center.lng + (Math.random() - 0.5) * 0.01 },
            azimuthStart: 0,
            azimuthEnd: 360,
        }]);
        markDirty('losThreat');
    };

    // Threat levels by target id (after losThreat run)
    const losResult = toolStates.losThreat.status === 'done' ? toolStates.losThreat.result as LosThreatResult : null;
    const threatByTarget: Record<string, number> = {};
    losResult?.targetThreats.forEach(tt => { threatByTarget[tt.targetId] = tt.threatLevel; });

    const displayTargets = targetsMaterialized.current ? targets : getAnchoredTargetsPreview();

    function getAnchoredTargetsPreview(): MockTarget[] {
        // Before first run, show the static mock targets as-is (names/azimuths only are displayed)
        if (targets.length > 0) return targets;
        let center = { lat: 0, lng: 0 };
        if (mapInstance) {
            try {
                const c = mapInstance.getCenter();
                center = { lat: c.lat, lng: c.lng };
            } catch (e) {
                // Leaflet may throw if DOM is not fully ready
            }
        }
        return getAnchoredTargets(center);
    }

    const renderExtras = (id: AnalysisToolId) => {
        switch (id) {
            case 'enemyCoverage':
                return (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-zinc-600 flex flex-col gap-1">
                        {ENTITY_TYPES.map(type => (
                            <label key={type} className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={enemyTypes.includes(type)}
                                    onChange={() => toggleEnemyType(type)}
                                    className="accent-primary w-3.5 h-3.5"
                                />
                                <span>{t(`diagram.aiTools.entity_types.${type}`)}</span>
                            </label>
                        ))}
                    </div>
                );
            case 'losThreat':
                return (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-zinc-600 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">{t('diagram.aiTools.targets')}</span>
                            <button
                                onClick={addTarget}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                                <Plus className="w-3 h-3" />
                                {t('diagram.aiTools.add_target')}
                            </button>
                        </div>
                        {displayTargets.map(target => (
                            <div key={target.id} className="flex items-center gap-1.5 text-xs">
                                <span className="flex-1 truncate text-slate-700 dark:text-zinc-300">{target.name[i18n.language] || target.name['en']}</span>
                                <input
                                    type="number"
                                    dir="ltr"
                                    min={0}
                                    max={360}
                                    value={target.azimuthStart}
                                    onChange={(e) => updateTargetAzimuth(target.id, 'azimuthStart', Number(e.target.value))}
                                    title={t('diagram.aiTools.azimuth_start')}
                                    className="w-12 px-1 py-0.5 rounded border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-center"
                                />
                                <input
                                    type="number"
                                    dir="ltr"
                                    min={0}
                                    max={360}
                                    value={target.azimuthEnd}
                                    onChange={(e) => updateTargetAzimuth(target.id, 'azimuthEnd', Number(e.target.value))}
                                    title={t('diagram.aiTools.azimuth_end')}
                                    className="w-12 px-1 py-0.5 rounded border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-center"
                                />
                                {threatByTarget[target.id] !== undefined && (
                                    <span className={`px-1.5 py-0.5 rounded font-semibold ${threatByTarget[target.id] > 66 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : threatByTarget[target.id] > 33 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
                                        {threatByTarget[target.id]}%
                                    </span>
                                )}
                            </div>
                        ))}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 dark:text-zinc-400">{t('diagram.aiTools.resolution')}</span>
                            <select
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value as Resolution)}
                                className="flex-1 text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300"
                            >
                                {(['low', 'medium', 'high'] as Resolution[]).map(res => (
                                    <option key={res} value={res}>{t(`diagram.aiTools.resolutions.${res}`)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                );
            case 'deploymentAreas':
                return (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-zinc-600 flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-zinc-400">{t('diagram.aiTools.force_size')}</span>
                        <select
                            value={forceSize}
                            onChange={(e) => { setForceSize(e.target.value as ForceSize); markDirty('deploymentAreas'); }}
                            className="flex-1 text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300"
                        >
                            {(['company', 'battalion', 'brigade'] as ForceSize[]).map(size => (
                                <option key={size} value={size}>{t(`diagram.aiTools.force_sizes.${size}`)}</option>
                            ))}
                        </select>
                    </div>
                );
            case 'routePlanning': {
                if (toolStates.routePlanning.status !== 'done') return null;
                const routeResult = toolStates.routePlanning.result as RouteAnalysisResult;
                return (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-zinc-600 flex flex-col gap-1.5">
                        <div className="flex flex-wrap gap-1.5">
                            {ROUTE_KINDS.map(kind => {
                                const route = routeResult.routes.find(r => r.id === kind);
                                if (!route) return null;
                                return (
                                    <button
                                        key={kind}
                                        onClick={() => toggleRoute(kind)}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] border transition-colors ${routeVisibility[kind]
                                            ? 'border-slate-300 dark:border-zinc-500 text-slate-700 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-700'
                                            : 'border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 opacity-60'
                                            }`}
                                    >
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: routeKindColors[kind], opacity: routeVisibility[kind] ? 1 : 0.4 }} />
                                        <span>{t(route.label)}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300 cursor-pointer">
                            <input type="checkbox" checked={showRisks} onChange={toggleRisks} className="accent-red-600 w-3.5 h-3.5" />
                            <span>{t('diagram.aiTools.show_risks')}</span>
                        </label>
                    </div>
                );
            }
            default:
                return null;
        }
    };

    return (
        <AnimatePresence>
            {isPanelOpen && (
                <motion.div
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                    className="absolute top-3 bottom-3 start-16 z-[1001] w-80 pointer-events-auto"
                >
                    <div className="h-full bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-slate-200 dark:border-zinc-600 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 dark:border-zinc-600">
                            <Wand2 className="w-4 h-4 text-primary shrink-0" />
                            <h3 className="flex-1 text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate">
                                {t('diagram.aiTools.title')}
                            </h3>
                            <button
                                onClick={clearAll}
                                disabled={!anyResults}
                                title={t('diagram.aiTools.clear_all')}
                                className={`p-1.5 rounded-lg transition-colors ${anyResults
                                    ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                    : 'text-slate-300 dark:text-zinc-600 cursor-not-allowed'
                                    }`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPanelOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-300 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-zinc-600">
                            {TABS.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 px-2 py-2 text-xs font-medium transition-colors border-b-2 ${activeTab === tab
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
                                        }`}
                                >
                                    {t(`diagram.aiTools.tabs.${tab}`)}
                                </button>
                            ))}
                        </div>

                        {/* Tool cards */}
                        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                            {TOOL_DEFS.filter(def => def.tab === activeTab).map(def => {
                                const state = toolStates[def.id];
                                const isDone = state.status === 'done';
                                const isRunning = state.status === 'running';
                                const isDirty = !!dirtyTools[def.id];
                                const exportState = exportStates[def.id];

                                return (
                                    <div
                                        key={def.id}
                                        className={`rounded-xl border p-2.5 transition-all ${isDone
                                            ? 'ring-1 ring-primary/40 bg-primary/5 border-transparent'
                                            : 'border-slate-200 dark:border-zinc-600 bg-slate-50/50 dark:bg-zinc-700/30'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                {def.icon}
                                            </div>
                                            <span className="flex-1 text-sm text-slate-700 dark:text-zinc-200 font-medium leading-tight">
                                                {t(`diagram.aiTools.tools.${def.id}`)}
                                            </span>

                                            {state.status === 'idle' && (
                                                <button
                                                    onClick={() => runTool(def.id)}
                                                    disabled={!mapInstance}
                                                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-zinc-500 text-slate-600 dark:text-zinc-300 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors whitespace-nowrap"
                                                >
                                                    {t('diagram.aiTools.run')}
                                                </button>
                                            )}
                                            {isRunning && (
                                                <div className="flex items-center gap-1.5 text-xs text-primary px-1">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    <span>{t('diagram.analysis.analyzing')}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action row (done) */}
                                        {isDone && (
                                            <div className="flex items-center gap-1 mt-2">
                                                <button
                                                    onClick={() => toggleToolVisibility(def.id)}
                                                    title={state.visible ? t('diagram.aiTools.hide') : t('diagram.aiTools.show')}
                                                    className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                                                >
                                                    {state.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                                </button>
                                                <button
                                                    onClick={() => handleRerun(def.id)}
                                                    title={t('diagram.aiTools.rerun')}
                                                    className={`p-1.5 rounded-lg transition-colors ${isDirty
                                                        ? 'text-primary bg-primary/10 ring-1 ring-primary/40 animate-pulse'
                                                        : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                                                        }`}
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleExport(def.id)}
                                                    title={t('diagram.aiTools.export')}
                                                    disabled={exportState === 'exporting'}
                                                    className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                                                >
                                                    {exportState === 'exporting' ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                                    ) : exportState === 'done' ? (
                                                        <Check className="w-3.5 h-3.5 text-green-600" />
                                                    ) : (
                                                        <Share2 className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                                <div className="flex-1" />
                                                <button
                                                    onClick={() => clearTool(def.id)}
                                                    title={t('diagram.aiTools.remove')}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Export status note */}
                                        {exportState === 'exporting' && (
                                            <div className="mt-1.5 text-[11px] text-primary">{t('diagram.aiTools.exporting')}</div>
                                        )}
                                        {exportState === 'done' && (
                                            <div className="mt-1.5 text-[11px] text-green-600 dark:text-green-400">{t('diagram.aiTools.exported')}</div>
                                        )}

                                        {/* Tool-specific extras */}
                                        {renderExtras(def.id)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
