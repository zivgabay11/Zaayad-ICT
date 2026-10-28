import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ChevronDown, RadioTower, Radio, Truck, Signal, Trash2, PenTool,
    Swords, Crosshair, Target, Search, Briefcase, Users2, Layers, Building2,
} from 'lucide-react';
import { useMapContext } from '../context/MapContext';
import { useStaticSpaceContext } from '../context/StaticSpaceContext';
import { useMobileSpaceContext } from '../context/MobileSpaceContext';
import { useTikshovContext } from '../context/TikshovContext';
import { useSpectrumContext } from '../context/SpectrumContext';
import { useLinkPlanningContext } from '../context/LinkPlanningContext';
import { useHeadquartersLayerContext } from '../context/HeadquartersLayerContext';
import { DEVICE_TYPE_COLORS } from '../utilities/trackedDeviceIcon';
import { JAMMING_STATUS_COLORS, BLOCKING_COLOR, BLOCKING_BAND_COLORS } from '../utilities/spectrum';
import { getCutLabel } from '../utilities/linkPlanning';
import { TrackedDeviceType, JammingStatus, BlockingBand } from '../utilities/types';
import { mockCommSites } from '../utilities/mockData';

// The Layer Organizer ("סדרן שכבות") — a nested tree mirroring the structure of the
// reference app the user pointed at (https://layer-organizer-production.up.railway.app/,
// its own "סדרן המרשמים" panel): ניהו"ק (battle management, the live/operational phase)
// and תכנון (battle planning, the preparatory phase) sit stacked as two top-level groups
// — same shape as every other group (לחימה, מבצעים, ...), not tabs — so the whole tree
// scrolls as one continuous list. Extracted out of MapToolbar.tsx's Layers dropdown since
// it outgrew a flat list — this *is* the dropdown's lower content.
//
// Scope note: לחימה/מבצעים/אויב/איסוף/מנהלה (and תכנון קרב's two new rows) are structural
// placeholders copied from the reference's own tree — we have no backing data for
// "כוחותינו", "מבצעים טיוטה", etc., so their checkboxes toggle with no map effect, same
// boundary already established for the decorative צי"ד selector in App.tsx. Every group
// gets an expand chevron for visual consistency even when (like איסוף/מנהלה/כינון מרחב
// נייד) it has nothing to reveal. Everything under תקשוב (and תיק חתכים, and תכנון קשר
// רדיו) is our real, already-built features — only their position in the tree changed.

const COMBAT_ITEM_KEYS = ['ourForces', 'detectionsEvents', 'coordControl', 'mainOperations', 'mainIntel'] as const;
const OPERATIONS_ITEM_KEYS = [
    'ourMinesLosses', 'commonLanguage', 'draftOperations', 'assignedOperations',
    'subordinateOperations', 'neighboringOperations', 'rokak', 'engineering',
    'rear', 'bakadama', 'formationsCop', 'intelReports', 'landingZones',
] as const;
const ENEMY_ITEM_KEYS = ['draftEnemyPicture', 'subordinateEnemyPicture', 'higherEnemyPicture', 'sectorHistory'] as const;

function GroupHeaderRow({
    icon, label, checked, onToggleChecked, expandable, isExpanded, onToggleExpand, indentClass, disabled, trailingAction,
}: {
    icon: React.ReactNode;
    label: string;
    checked: boolean;
    onToggleChecked: () => void;
    expandable?: boolean;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    indentClass?: string;
    disabled?: boolean;
    trailingAction?: React.ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <div className={`flex items-center gap-1 ${indentClass || 'px-3'} py-1.5`}>
            <label className={`flex-1 flex items-center gap-2 min-w-0 ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}>
                {icon}
                <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-zinc-100 truncate">{label}</span>
                <input type="checkbox" checked={checked} onChange={onToggleChecked} className="accent-primary w-3.5 h-3.5" disabled={disabled} />
            </label>
            {trailingAction && <span className={disabled ? 'opacity-40 pointer-events-none' : ''}>{trailingAction}</span>}
            {expandable && (
                <button
                    type="button"
                    onClick={onToggleExpand}
                    title={t('diagram.toggleSubFilters')}
                    className="p-1 rounded shrink-0 text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            )}
        </div>
    );
}

function ChildCheckRow({ label, checked, onToggle, indentClass, parentOn, color }: {
    label: string;
    checked: boolean;
    onToggle: () => void;
    indentClass: string;
    parentOn: boolean;
    color?: string;
}) {
    return (
        <label className={`flex items-center gap-2 ${indentClass} pe-3 py-1.5 ${parentOn ? 'cursor-pointer' : 'opacity-40 pointer-events-none'}`}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color || '#94a3b8' }} />
            <span className="flex-1 text-xs text-slate-600 dark:text-zinc-300 truncate">{label}</span>
            <input type="checkbox" checked={checked} onChange={onToggle} className="accent-primary w-3.5 h-3.5" />
        </label>
    );
}

const Divider = () => <div className="my-1.5 border-t border-slate-200 dark:border-zinc-700" />;

interface Props {
    // Closes the host Layers dropdown once the user jumps into תכנון קשר רדיו's editor, so
    // they immediately see the map toolbar's draw-cell/place-platform/compute-cut tools.
    onAfterEnterLinkPlanningEditor?: () => void;
}

export const LayerOrganizerPanel: React.FC<Props> = ({ onAfterEnterLinkPlanningEditor }) => {
    const { t, i18n } = useTranslation();
    const { enterLinkPlanningEditor } = useMapContext();
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const toggleExpanded = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

    // Purely structural placeholders — see file header comment.
    const [placeholderOn, setPlaceholderOn] = useState<Record<string, boolean>>({});
    const isOn = (key: string) => placeholderOn[key] !== false;
    const togglePlaceholder = (key: string) => setPlaceholderOn(prev => ({ ...prev, [key]: !isOn(key) }));

    const { layerOn: staticSpaceLayerOn, eladFilterOn, mabanFilterOn, toggleLayer: toggleStaticSpaceLayer, toggleEladFilter, toggleMabanFilter } = useStaticSpaceContext();
    const { layerOn: mobileSpaceLayerOn, toggleLayer: toggleMobileSpaceLayer } = useMobileSpaceContext();
    const {
        layerOn: tikshovLayerOn,
        deviceTypeFilters: tikshovDeviceTypeFilters,
        toggleLayer: toggleTikshovLayer,
        toggleDeviceTypeFilter: toggleTikshovDeviceTypeFilter,
    } = useTikshovContext();
    const TIKSHOV_DEVICE_TYPE_LIST: TrackedDeviceType[] = ['sheked', 'dual', 'setz', 'maban', 'setz_modem', 'elad_green'];
    const {
        layerOn: spectrumLayerOn,
        jammingFilterOn,
        blockingFilterOn,
        jammingStatusFilters,
        blockingBandFilters,
        toggleLayer: toggleSpectrumLayer,
        toggleJammingFilter,
        toggleBlockingFilter,
        toggleJammingStatusFilter,
        toggleBlockingBandFilter,
    } = useSpectrumContext();
    const BLOCKING_BAND_LIST: BlockingBand[] = ['l1', 'comms'];
    const JAMMING_STATUS_LIST: JammingStatus[] = ['ended', 'active', 'future'];
    const {
        linkCells,
        mobilePlatforms,
        linkCoverageCuts,
        cellsLayerOn,
        cutsLayerOn,
        toggleCellsLayer,
        toggleCutsLayer,
        toggleCutVisible,
        removeCoverageCut,
    } = useLinkPlanningContext();
    const {
        layerOn: headquartersLayerOn,
        showHeadquarters,
        showCommandPosts,
        myUnitsOnly: headquartersMyUnitsOnly,
        toggleLayer: toggleHeadquartersLayer,
        toggleShowHeadquarters,
        toggleShowCommandPosts,
        toggleMyUnitsOnly: toggleHeadquartersMyUnitsOnly,
    } = useHeadquartersLayerContext();

    const handleEnterLinkPlanningEditor = () => {
        if (!cellsLayerOn) toggleCellsLayer(); // make sure what they're about to draw is visible
        enterLinkPlanningEditor();
        onAfterEnterLinkPlanningEditor?.();
    };

    // Turning a parent off cascades all the way down: every real feature and placeholder
    // under it is forced off too, and stays locked (can't be toggled back on individually)
    // until the parent is switched back on — at which point the user picks which children
    // to re-enable, nothing is restored automatically. Applied at every parent→child
    // relationship in the tree, not just the ניהו"ק/נוה"ק roots.
    const forceStaticSpaceOff = () => { if (staticSpaceLayerOn) toggleStaticSpaceLayer(); };
    const forceMobileSpaceOff = () => { if (mobileSpaceLayerOn) toggleMobileSpaceLayer(); };
    const forceSpectrumOff = () => { if (spectrumLayerOn) toggleSpectrumLayer(); };
    const forceTikshovOff = () => { if (tikshovLayerOn) toggleTikshovLayer(); };
    const forceCutsOff = () => { if (cutsLayerOn) toggleCutsLayer(); };
    const forceCellsOff = () => { if (cellsLayerOn) toggleCellsLayer(); };
    const forceHeadquartersOff = () => { if (headquartersLayerOn) toggleHeadquartersLayer(); };

    const forcePlaceholdersOff = (keys: string[]) => {
        setPlaceholderOn(prev => {
            const next = { ...prev };
            keys.forEach(k => { next[k] = false; });
            return next;
        });
    };

    const toggleCombat = () => {
        const turningOff = isOn('combat');
        togglePlaceholder('combat');
        if (turningOff) forcePlaceholdersOff(COMBAT_ITEM_KEYS.map(k => `combat.${k}`));
    };
    const toggleOperations = () => {
        const turningOff = isOn('operations');
        togglePlaceholder('operations');
        if (turningOff) forcePlaceholdersOff(OPERATIONS_ITEM_KEYS.map(k => `operations.${k}`));
    };
    const toggleEnemy = () => {
        const turningOff = isOn('enemy');
        togglePlaceholder('enemy');
        if (turningOff) forcePlaceholdersOff(ENEMY_ITEM_KEYS.map(k => `enemy.${k}`));
    };
    const toggleComms = () => {
        const turningOff = isOn('comms');
        togglePlaceholder('comms');
        if (turningOff) { forceStaticSpaceOff(); forceMobileSpaceOff(); forceSpectrumOff(); forceTikshovOff(); forceCutsOff(); forceHeadquartersOff(); }
    };
    const toggleNihuk = () => {
        const turningOff = isOn('nihuk');
        togglePlaceholder('nihuk');
        if (turningOff) {
            forcePlaceholdersOff([
                'combat', ...COMBAT_ITEM_KEYS.map(k => `combat.${k}`),
                'operations', ...OPERATIONS_ITEM_KEYS.map(k => `operations.${k}`),
                'enemy', ...ENEMY_ITEM_KEYS.map(k => `enemy.${k}`),
                'collection', 'administration', 'comms',
            ]);
            forceStaticSpaceOff(); forceMobileSpaceOff(); forceSpectrumOff(); forceTikshovOff(); forceCutsOff(); forceHeadquartersOff();
        }
    };
    const toggleBattlePlanning = () => {
        const turningOff = isOn('battlePlanning');
        togglePlaceholder('battlePlanning');
        if (turningOff) forcePlaceholdersOff(['battlePlanning.mainOpsPlanning', 'battlePlanning.coordControl']);
    };
    const togglePlanning = () => {
        const turningOff = isOn('planning');
        togglePlaceholder('planning');
        if (turningOff) {
            forcePlaceholdersOff(['battlePlanning', 'battlePlanning.mainOpsPlanning', 'battlePlanning.coordControl']);
            forceCellsOff();
        }
    };

    return (
        <div>
            {/* ניהו"ק (battle management) */}
            <GroupHeaderRow
                icon={<Layers className="w-3.5 h-3.5 text-primary shrink-0" />}
                label={t('layerOrganizer.groups.nihuk')}
                checked={isOn('nihuk')}
                onToggleChecked={toggleNihuk}
                expandable
                isExpanded={!!expanded.nihuk}
                onToggleExpand={() => toggleExpanded('nihuk')}
            />
            {expanded.nihuk && (
                <>
                    {/* לחימה */}
                    <GroupHeaderRow
                        icon={<Swords className="w-3.5 h-3.5 text-primary shrink-0" />}
                        label={t('layerOrganizer.groups.combat')}
                        checked={isOn('combat')}
                        onToggleChecked={toggleCombat}
                        expandable
                        isExpanded={!!expanded.combat}
                        onToggleExpand={() => toggleExpanded('combat')}
                        indentClass="ps-8 pe-3"
                        disabled={!isOn('nihuk')}
                    />
                    {expanded.combat && COMBAT_ITEM_KEYS.map(key => (
                        <ChildCheckRow
                            key={key}
                            label={t(`layerOrganizer.combatItems.${key}`)}
                            checked={isOn(`combat.${key}`)}
                            onToggle={() => togglePlaceholder(`combat.${key}`)}
                            indentClass="ps-12"
                            parentOn={isOn('nihuk') && isOn('combat')}
                        />
                    ))}
                    <Divider />

                    {/* מבצעים */}
                    <GroupHeaderRow
                        icon={<Crosshair className="w-3.5 h-3.5 text-primary shrink-0" />}
                        label={t('layerOrganizer.groups.operations')}
                        checked={isOn('operations')}
                        onToggleChecked={toggleOperations}
                        expandable
                        isExpanded={!!expanded.operations}
                        onToggleExpand={() => toggleExpanded('operations')}
                        indentClass="ps-8 pe-3"
                        disabled={!isOn('nihuk')}
                    />
                    {expanded.operations && OPERATIONS_ITEM_KEYS.map(key => (
                        <ChildCheckRow
                            key={key}
                            label={t(`layerOrganizer.operationsItems.${key}`)}
                            checked={isOn(`operations.${key}`)}
                            onToggle={() => togglePlaceholder(`operations.${key}`)}
                            indentClass="ps-12"
                            parentOn={isOn('nihuk') && isOn('operations')}
                        />
                    ))}
                    <Divider />

                    {/* אויב */}
                    <GroupHeaderRow
                        icon={<Target className="w-3.5 h-3.5 text-primary shrink-0" />}
                        label={t('layerOrganizer.groups.enemy')}
                        checked={isOn('enemy')}
                        onToggleChecked={toggleEnemy}
                        expandable
                        isExpanded={!!expanded.enemy}
                        onToggleExpand={() => toggleExpanded('enemy')}
                        indentClass="ps-8 pe-3"
                        disabled={!isOn('nihuk')}
                    />
                    {expanded.enemy && ENEMY_ITEM_KEYS.map(key => (
                        <ChildCheckRow
                            key={key}
                            label={t(`layerOrganizer.enemyItems.${key}`)}
                            checked={isOn(`enemy.${key}`)}
                            onToggle={() => togglePlaceholder(`enemy.${key}`)}
                            indentClass="ps-12"
                            parentOn={isOn('nihuk') && isOn('enemy')}
                        />
                    ))}
                    <Divider />

                    {/* איסוף — chevron kept for visual consistency even though empty */}
                    <GroupHeaderRow
                        icon={<Search className="w-3.5 h-3.5 text-primary shrink-0" />}
                        label={t('layerOrganizer.groups.collection')}
                        checked={isOn('collection')}
                        onToggleChecked={() => togglePlaceholder('collection')}
                        expandable
                        isExpanded={!!expanded.collection}
                        onToggleExpand={() => toggleExpanded('collection')}
                        indentClass="ps-8 pe-3"
                        disabled={!isOn('nihuk')}
                    />
                    <Divider />

                    {/* מנהלה — same shape as איסוף */}
                    <GroupHeaderRow
                        icon={<Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />}
                        label={t('layerOrganizer.groups.administration')}
                        checked={isOn('administration')}
                        onToggleChecked={() => togglePlaceholder('administration')}
                        expandable
                        isExpanded={!!expanded.administration}
                        onToggleExpand={() => toggleExpanded('administration')}
                        indentClass="ps-8 pe-3"
                        disabled={!isOn('nihuk')}
                    />
                    <Divider />

                    {/* תקשוב — our four real features, re-homed here unchanged */}
                    <GroupHeaderRow
                        icon={<Radio className="w-3.5 h-3.5 text-primary shrink-0" />}
                        label={t('layerOrganizer.groups.comms')}
                        checked={isOn('comms')}
                        onToggleChecked={toggleComms}
                        expandable
                        isExpanded={!!expanded.comms}
                        onToggleExpand={() => toggleExpanded('comms')}
                        indentClass="ps-8 pe-3"
                        disabled={!isOn('nihuk')}
                    />
                    {expanded.comms && (
                        <>
                            {/* כינון מרחב נייח */}
                            <GroupHeaderRow
                                icon={<RadioTower className="w-3.5 h-3.5 text-primary shrink-0" />}
                                label={t('staticSpace.layerName')}
                                checked={staticSpaceLayerOn}
                                onToggleChecked={toggleStaticSpaceLayer}
                                expandable
                                isExpanded={!!expanded.staticSpace}
                                onToggleExpand={() => toggleExpanded('staticSpace')}
                                indentClass="ps-12 pe-3"
                                disabled={!isOn('nihuk') || !isOn('comms')}
                            />
                            {expanded.staticSpace && (
                                <>
                                    <ChildCheckRow label={t('staticSpace.eladTopology')} checked={eladFilterOn} onToggle={toggleEladFilter} indentClass="ps-16" parentOn={isOn('nihuk') && isOn('comms') && staticSpaceLayerOn} color="#8b5cf6" />
                                    <ChildCheckRow label={t('staticSpace.mabanTopology')} checked={mabanFilterOn} onToggle={toggleMabanFilter} indentClass="ps-16" parentOn={isOn('nihuk') && isOn('comms') && staticSpaceLayerOn} color="#10b981" />
                                </>
                            )}

                            {/* כינון מרחב נייד — chevron kept for consistency even though empty */}
                            <GroupHeaderRow
                                icon={<Truck className="w-3.5 h-3.5 text-primary shrink-0" />}
                                label={t('mobileSpace.layerName')}
                                checked={mobileSpaceLayerOn}
                                onToggleChecked={toggleMobileSpaceLayer}
                                expandable
                                isExpanded={!!expanded.mobileSpace}
                                onToggleExpand={() => toggleExpanded('mobileSpace')}
                                indentClass="ps-12 pe-3"
                                disabled={!isOn('nihuk') || !isOn('comms')}
                            />

                            {/* ספקטרום */}
                            <GroupHeaderRow
                                icon={<Radio className="w-3.5 h-3.5 text-primary shrink-0" />}
                                label={t('spectrum.layerName')}
                                checked={spectrumLayerOn}
                                onToggleChecked={toggleSpectrumLayer}
                                expandable
                                isExpanded={!!expanded.spectrum}
                                onToggleExpand={() => toggleExpanded('spectrum')}
                                indentClass="ps-12 pe-3"
                                disabled={!isOn('nihuk') || !isOn('comms')}
                            />
                            {expanded.spectrum && (
                                <>
                                    <GroupHeaderRow
                                        icon={<span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />}
                                        label={t('spectrum.zoneTypes.jamming')}
                                        checked={jammingFilterOn}
                                        onToggleChecked={toggleJammingFilter}
                                        expandable
                                        isExpanded={!!expanded.jamming}
                                        onToggleExpand={() => toggleExpanded('jamming')}
                                        indentClass="ps-16 pe-3"
                                        disabled={!isOn('nihuk') || !isOn('comms') || !spectrumLayerOn}
                                    />
                                    {expanded.jamming && JAMMING_STATUS_LIST.map(status => (
                                        <ChildCheckRow
                                            key={status}
                                            label={t(`spectrum.jammingStatus.${status}`)}
                                            checked={jammingStatusFilters[status]}
                                            onToggle={() => toggleJammingStatusFilter(status)}
                                            indentClass="ps-20"
                                            parentOn={isOn('nihuk') && isOn('comms') && spectrumLayerOn && jammingFilterOn}
                                            color={JAMMING_STATUS_COLORS[status]}
                                        />
                                    ))}
                                    <GroupHeaderRow
                                        icon={<span className="w-2 h-2 rounded-full shrink-0" style={{ background: BLOCKING_COLOR }} />}
                                        label={t('spectrum.zoneTypes.blocking')}
                                        checked={blockingFilterOn}
                                        onToggleChecked={toggleBlockingFilter}
                                        expandable
                                        isExpanded={!!expanded.blocking}
                                        onToggleExpand={() => toggleExpanded('blocking')}
                                        indentClass="ps-16 pe-3"
                                        disabled={!isOn('nihuk') || !isOn('comms') || !spectrumLayerOn}
                                    />
                                    {expanded.blocking && BLOCKING_BAND_LIST.map(band => (
                                        <ChildCheckRow
                                            key={band}
                                            label={t(`spectrum.blockingBands.${band}`)}
                                            checked={blockingBandFilters[band]}
                                            onToggle={() => toggleBlockingBandFilter(band)}
                                            indentClass="ps-20"
                                            parentOn={isOn('nihuk') && isOn('comms') && spectrumLayerOn && blockingFilterOn}
                                            color={BLOCKING_BAND_COLORS[band]}
                                        />
                                    ))}
                                </>
                            )}

                            {/* תמ"כ תקשוב */}
                            <GroupHeaderRow
                                icon={<RadioTower className="w-3.5 h-3.5 text-primary shrink-0" />}
                                label={t('tikshovCop.layerName')}
                                checked={tikshovLayerOn}
                                onToggleChecked={toggleTikshovLayer}
                                expandable
                                isExpanded={!!expanded.tikshov}
                                onToggleExpand={() => toggleExpanded('tikshov')}
                                indentClass="ps-12 pe-3"
                                disabled={!isOn('nihuk') || !isOn('comms')}
                            />
                            {expanded.tikshov && TIKSHOV_DEVICE_TYPE_LIST.map(type => (
                                <ChildCheckRow
                                    key={type}
                                    label={t(`tikshovCop.deviceTypes.${type}`)}
                                    checked={tikshovDeviceTypeFilters[type]}
                                    onToggle={() => toggleTikshovDeviceTypeFilter(type)}
                                    indentClass="ps-16"
                                    parentOn={isOn('nihuk') && isOn('comms') && tikshovLayerOn}
                                    color={DEVICE_TYPE_COLORS[type]}
                                />
                            ))}

                            {/* מפקדות וחפ"קים — headquarters/command posts transferred from
                                תכנון קשר רדיו, with sub-filters by kind */}
                            <GroupHeaderRow
                                icon={<Building2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                                label={t('layerOrganizer.groups.headquartersCop')}
                                checked={headquartersLayerOn}
                                onToggleChecked={toggleHeadquartersLayer}
                                expandable
                                isExpanded={!!expanded.headquartersCop}
                                onToggleExpand={() => toggleExpanded('headquartersCop')}
                                indentClass="ps-12 pe-3"
                                disabled={!isOn('nihuk') || !isOn('comms')}
                            />
                            {expanded.headquartersCop && (
                                <>
                                    <ChildCheckRow label={t('layerOrganizer.headquartersFilter')} checked={showHeadquarters} onToggle={toggleShowHeadquarters} indentClass="ps-16" parentOn={isOn('nihuk') && isOn('comms') && headquartersLayerOn} />
                                    <ChildCheckRow label={t('layerOrganizer.commandPostsFilter')} checked={showCommandPosts} onToggle={toggleShowCommandPosts} indentClass="ps-16" parentOn={isOn('nihuk') && isOn('comms') && headquartersLayerOn} />
                                    <ChildCheckRow label={t('layerOrganizer.myUnitsOnlyFilter')} checked={headquartersMyUnitsOnly} onToggle={toggleHeadquartersMyUnitsOnly} indentClass="ps-16" parentOn={isOn('nihuk') && isOn('comms') && headquartersLayerOn} />
                                </>
                            )}

                            {/* תיק חתכים — auto-populated from every cut the user computes
                                in תכנון קשר רדיו (see the ניהו"ק group... תכנון below) */}
                            <GroupHeaderRow
                                icon={<Signal className="w-3.5 h-3.5 text-primary shrink-0" />}
                                label={t('layerOrganizer.groups.cutsFolder')}
                                checked={cutsLayerOn}
                                onToggleChecked={toggleCutsLayer}
                                expandable
                                isExpanded={!!expanded.cutsFolder}
                                onToggleExpand={() => toggleExpanded('cutsFolder')}
                                indentClass="ps-12 pe-3"
                                disabled={!isOn('nihuk') || !isOn('comms')}
                            />
                            {expanded.cutsFolder && (
                                linkCoverageCuts.length === 0 ? (
                                    <div className={`ps-16 pe-3 py-1.5 text-xs text-slate-400 dark:text-zinc-500 ${(isOn('nihuk') && isOn('comms') && cutsLayerOn) ? '' : 'opacity-40'}`}>
                                        {t('linkPlanning.noCuts')}
                                    </div>
                                ) : linkCoverageCuts.map(cut => (
                                    <div key={cut.id} className={`flex items-center gap-2 ps-16 pe-3 py-1.5 ${(isOn('nihuk') && isOn('comms') && cutsLayerOn) ? '' : 'opacity-40 pointer-events-none'}`}>
                                        <label className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer">
                                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                            <span className="flex-1 text-xs text-slate-600 dark:text-zinc-300 truncate">
                                                {getCutLabel(cut, linkCells, mockCommSites, mobilePlatforms, i18n.language)}
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={cut.visible}
                                                onChange={() => toggleCutVisible(cut.id)}
                                                className="accent-primary w-3.5 h-3.5"
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => removeCoverageCut(cut.id)}
                                            title={t('linkPlanning.deleteCut')}
                                            className="p-1 rounded shrink-0 text-slate-400 dark:text-zinc-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </>
                    )}
                    <Divider />

                    {/* ניהו"ק יחידות אחרות — empty placeholder sibling, matches the reference's 0/0 */}
                    <GroupHeaderRow
                        icon={<Users2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        label={t('layerOrganizer.groups.otherUnitsNihuk')}
                        checked={false}
                        onToggleChecked={() => { /* no-op: empty placeholder */ }}
                        indentClass="ps-8 pe-3"
                        disabled
                    />
                </>
            )}
            <Divider />

            {/* תכנון (battle planning) */}
            <GroupHeaderRow
                icon={<Layers className="w-3.5 h-3.5 text-primary shrink-0" />}
                label={t('layerOrganizer.groups.planning')}
                checked={isOn('planning')}
                onToggleChecked={togglePlanning}
                expandable
                isExpanded={!!expanded.planning}
                onToggleExpand={() => toggleExpanded('planning')}
            />
            {expanded.planning && (
                <>
                    {/* תכנון קרב */}
                    <GroupHeaderRow
                        icon={<Swords className="w-3.5 h-3.5 text-primary shrink-0" />}
                        label={t('layerOrganizer.groups.battlePlanning')}
                        checked={isOn('battlePlanning')}
                        onToggleChecked={toggleBattlePlanning}
                        expandable
                        isExpanded={!!expanded.battlePlanning}
                        onToggleExpand={() => toggleExpanded('battlePlanning')}
                        indentClass="ps-8 pe-3"
                        disabled={!isOn('planning')}
                    />
                    {expanded.battlePlanning && (
                        <>
                            <ChildCheckRow
                                label={t('layerOrganizer.battlePlanningItems.mainOpsPlanning')}
                                checked={isOn('battlePlanning.mainOpsPlanning')}
                                onToggle={() => togglePlaceholder('battlePlanning.mainOpsPlanning')}
                                indentClass="ps-12"
                                parentOn={isOn('planning') && isOn('battlePlanning')}
                            />
                            <ChildCheckRow
                                label={t('layerOrganizer.battlePlanningItems.coordControl')}
                                checked={isOn('battlePlanning.coordControl')}
                                onToggle={() => togglePlaceholder('battlePlanning.coordControl')}
                                indentClass="ps-12"
                                parentOn={isOn('planning') && isOn('battlePlanning')}
                            />
                        </>
                    )}

                    {/* תכנון קשר רדיו — a sibling of תכנון קרב (not nested inside it), and
                        a real working layer: opening its editor (the pen icon) jumps
                        straight into drawing cells / placing platforms / computing cuts,
                        the same tools the top nav's "תכנון קשר" button enables — this
                        layer IS that feature now, not just a visibility toggle for it. */}
                    <GroupHeaderRow
                        icon={<Signal className="w-3.5 h-3.5 text-primary shrink-0" />}
                        label={t('linkPlanning.layerName')}
                        checked={cellsLayerOn}
                        onToggleChecked={toggleCellsLayer}
                        indentClass="ps-8 pe-3"
                        disabled={!isOn('planning')}
                        trailingAction={
                            <button
                                type="button"
                                onClick={handleEnterLinkPlanningEditor}
                                title={t('layerOrganizer.openLinkPlanningEditor')}
                                className="p-1 rounded shrink-0 text-slate-400 dark:text-zinc-500 hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                                <PenTool className="w-3.5 h-3.5" />
                            </button>
                        }
                    />
                </>
            )}
        </div>
    );
};
