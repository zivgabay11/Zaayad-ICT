export interface Message {
    id: string;
    role: 'user' | 'ai';
    text?: string;
    attachments?: string[];
    attachmentData?: Omit<Attachment, 'file'>[];
    isError?: boolean;
}

export interface Attachment {
    name: string;
    base64: string;
    mimeType: string;
    file?: File;
}

export interface Unit {
    code: number;
    type?: string;
    parentCode?: string;
    name?: Record<string, string>;
}

export interface Phase {
    id: string;
    index: number;
    title?: Record<string, string>;
    description?: Record<string, string>;
    startOffsetHours?: number; // relative to H-Hour
    endOffsetHours?: number; // relative to H-Hour
}

export interface CalendarEvent {
    id: string;
    title: Record<string, string>;
    date: string; // ISO date string
    time?: string; // Time string like "08:00"
    level: string; // 'command', 'division', 'brigade', etc.
    location?: string;
}

export interface CourseOfAction {
    threat: Record<string, string>;
    sequenceOfEvents: Record<string, string>[];
    recommendedActions: Record<string, string>[];
}

export interface Plan {
    id: string;
    name: Record<string, string>;
    description: Record<string, string>;
    status?: string;
    shared?: 'private' | 'sameUnit';
    folderId?: string; // FK into OperationFolder — "תיק" grouping, set via the User Settings modal
    createdBy?: string;
    updatedBy?: string;
    created?: string;
    updated?: string;
    dDay?: string; // ISO date string
    hHour?: string; // Time string like "06:00"
    phases: Phase[];
    units: Unit[];
    unitColors?: Record<string, string>; // Maps unit level to an assigned color
    presentationItems?: string[]; // Checklist for presentation
    calendarEvents?: CalendarEvent[]; // Events for the calendar screen
    general?: Record<string, string>;
    objective?: Record<string, string>;
    designatedOperationalConcept?: Record<string, string>;
    mission?: Record<string, string>;
    method?: Record<string, string>;
    operationalIdea?: Record<string, string>;
    enemy?: Record<string, string>;
    terrain?: Record<string, string>;
    friendlyForces?: Record<string, string>;
    mpcoa?: CourseOfAction;
    mdcoa?: CourseOfAction;
    tasks?: Task[]; // tasks associated with the plan
    diagramElements?: DiagramElement[];
}

export type TaskStatus = 'To Do' | 'In Progress' | 'On Hold' | 'Done' | 'Cancelled';

export type DiagramElementType = 'polygon' | 'arrow' | 'line' | 'textLabel' | 'arc';

export type DiagramElementCategory = 'friendly' | 'enemy';

export interface DiagramElement {
    id: string;
    type: DiagramElementType;
    category?: DiagramElementCategory;
    phaseId?: string;
    unitCode?: number;
    coordinates: GeoCoordinate[];
    properties: Record<string, any>;
}

export interface GeoCoordinate {
    lat: number;
    lng: number;
}

export type EnemyEntityType = 'atgm' | 'artillery' | 'tank' | 'aa' | 'smallArms';

export interface MockEnemyEntity {
    id: string;
    name: Record<string, string>;
    type: EnemyEntityType;
    position: GeoCoordinate;
    rangeMeters: number;
}

export interface MockTarget {
    id: string;
    name: Record<string, string>;
    position: GeoCoordinate;
    azimuthStart: number; // degrees
    azimuthEnd: number; // degrees
}

export interface Task {
    id: string;
    name: Record<string, string>;
    description: Record<string, string>;
    status: TaskStatus;
    startOffsetDays?: number; // relative to D-day
    startOffsetHours?: number; // relative to H-Hour
    endOffsetDays?: number; // relative to D-day
    endOffsetHours?: number; // relative to H-Hour
    phaseId?: string; // explicitly ties a task to a single visual phase
    primaryUnitId?: string; // unit id responsible for task
    secondaryUnitIds?: string[]; // other units involved
    dependencyIds?: string[]; // other tasks this task depends on
    geoCoordinates?: GeoCoordinate[]; // can be a single point or polygon
}

export interface SystemUser {
    username: string;
    password?: string;
    name: Record<string, string>;
}

export interface SystemUnit {
    code: number;
    type: 'division' | 'brigade' | string;
    parentCode?: string;
}

export type UserRole =
    | 'operationsOfficer'   // אג"ם
    | 'telecomOfficer'      // תקשוב
    | 'logistics'           // לוגיסטיקה
    | 'control'             // שליטה
    | 'space'               // מרחב
    | 'planning'            // תכנון
    | 'monitoring'          // ניטור
    | 'continuity'          // רציפות התפקוד
    | 'radioOfficer'        // רדיו
    | 'spectrumOfficer';    // ספקטרום

// --- Identity redesign: Cell (תא) is what now drives app behavior (combined with Unit),
// not Role. Role stays on Session purely as the descriptive "תפקיד" field in the User
// Settings modal — see common/utilities/cells.ts for the fixed global Cell list.
export type Cell =
    | 'strike'          // תא תקיפה
    | 'support'         // תא תמיכה
    | 'control'         // תא שליטה
    | 'communications'  // תא תקשוב
    | 'intelligence'    // תא מודיעין
    | 'logistics';      // תא לוגיסטיקה

export type Reality = 'operational' | 'drill'; // מציאות: מבצעית | תרגילית

// A grouping above several Plans (e.g. folder "חרבות ברזל" containing plan "תוכנית שמש
// צפונית") — selected together as "תיק + תוכנית" in the User Settings modal.
export interface OperationFolder {
    id: string;
    name: Record<string, string>;
}

export interface Session {
    user: SystemUser;
    unit: SystemUnit;
    role: UserRole; // descriptive only ("תפקיד") — no longer read for any behavioral branch
    cell: Cell;
    reality: Reality;
}

// --- Static Space Establishment (כינון מרחב נייח) ---
// See PRD "Static Space Establishment" for the full domain model this mirrors.

export type CommSiteConfidence = 'live' | 'stale' | 'unknown';

export interface TagamDevice {
    tagamId: string;
    siteId: string;
    deviceType: string;
    frequency: string;
    antennaHeightM: number;
}

export interface CommSite {
    id: string;
    siteName: Record<string, string>;
    position: GeoCoordinate;
    isEladAnchor: boolean;
    isMabanAnchor: boolean;
    eladAnchorIp?: string;
    mabanAnchorIp?: string;
    tagamDevices: TagamDevice[];
    lastSyncAt: string; // mock relative-time display string
    dataConfidence: CommSiteConfidence;
}

export type ClientDeviceType = 'elad' | 'maban' | 'setz';

export interface ClientDevice {
    clientId: string;
    clientName: string;
    clientType: ClientDeviceType;
    ipAddress: string;
    parentSiteId: string | null;
    position: GeoCoordinate;
    connectionStatus: 'attached' | 'detached';
    lastSeenAt: string;
}

// --- Tikshov Common Operational Picture (תמ"כ תקשוב) ---
// See PRD "Tikshov Common Operational Picture" for the full domain model this mirrors.
// TrackedDevice is the root entity (PRD 7.1) — a force's carried comms device, rendered
// on the COP map layer and listed in the unit force table.

export type TrackedDeviceType = 'sheked' | 'dual' | 'setz' | 'maban' | 'setz_modem' | 'elad_green';

export type ConnectionStatus = 'active' | 'inactive' | 'flapping';

export type TikshovDataConfidence = 'live' | 'stale' | 'unknown';

export interface TrackedDevice {
    deviceId: string;
    callsign: string;
    deviceType: TrackedDeviceType;
    deviceSubtype?: string; // reserved for finer-grained designations, e.g. Elad Green variants (PRD 3.4.6)
    unitCode: number; // FK into mockUnits — the owning sub-unit
    position: GeoCoordinate; // doubles as current_lat/long and, once inactive, last_known_lat/long (PRD 3.8)
    connectionStatus: ConnectionStatus;
    // This prototype stores the *result* of the PRD's LocationPing / DeviceStatusEvent
    // history (7.2/7.3) as precomputed fields per device, rather than simulating the
    // underlying event stream — the UI reads the same as it would off derived data.
    lastReportSecondsAgo: number;
    statusDurationMinutes: number; // time-in-current-status (PRD 5.2 table column)
    statusTransitions24h?: number; // only set for 'flapping' devices — feeds the flapping tooltip (US-10)
    dataConfidence: TikshovDataConfidence;
}

export interface WatchedUnitSelection {
    selectionId: string;
    watchedUnitCode: number;
    addedByUserName: string;
    addedAt: string; // ISO timestamp — audit trail per PRD 2.9 / 7.5
}

// --- Integrated Combat Log (יומן לחימה מתכלל) ---
// See PRD "Integrated Combat Log" v2.0 for the full domain model this mirrors.

export type CombatLogType = 'reports' | 'ict_faults' | 'losses' | 'work_future_events' | 'spectrum' | 'other';

export type CombatLogSeverity = 'critical' | 'high' | 'medium' | 'low'; // ict_faults only (PRD 5.1 "Severity")

export interface CombatLogUpdateNote {
    id: string;
    text: string;
    authorUserName: string;
    timestamp: string; // ISO
    system?: boolean; // true for automation-generated notes (share audit, auto-close cascade, etc.)
}

export interface CombatLogAttachment {
    id: string;
    fileName: string;
    fileType: 'word' | 'pdf' | 'excel';
}

export interface CombatLogEvent {
    id: string;
    type: CombatLogType;
    title: string;
    description: string;
    start: string; // ISO datetime (PRD 5.1 "start")
    end?: string; // ISO datetime (PRD 5.1 "end_to" / end_time)
    status: string; // enum depends on type — see COMBAT_LOG_STATUS_OPTIONS
    reporterUserName: string;
    reporterUnitCode: number; // the originating/owning unit
    severity?: CombatLogSeverity; // ict_faults only
    affectedSystem?: string; // ict_faults only — drives recurring-fault detection (PRD Section 10 KPI)
    updateNotes: CombatLogUpdateNote[];
    attachments: CombatLogAttachment[];
    createdAt: string; // ISO
    updatedAt: string; // ISO
    sharedWithUnitCodes: number[]; // units this event has been pushed to, up or down the force tree (PRD 4.2)
    // Personal Task Log integration (my addition): cells this event has been pushed to as
    // a personal task. Only set for the 4 linkable types (see LINKABLE_COMBAT_LOG_TYPES in
    // combatLog.ts) — the event itself is the single shared record; the Personal Task Log
    // just displays/edits it through its own UI for each assigned cell (combined with the
    // viewer's unit), so editing status or adding a note from either screen updates this
    // same record.
    assignedToCells?: Cell[];
    // Units whose Personal Task Log picked this event up through the row context menu, when
    // that unit isn't the reporter (the reporter's own unit always sees it for its cells).
    assignedUnitCodes?: number[];
    // Cross-log automation (see CombatLogContext.tsx): work_future_events only — the ICT
    // Faults this work item is going out to resolve. Completing the work auto-closes them.
    linkedFaultIds?: string[];
    // Cross-module integration with Static Space Establishment (כינון מרחב נייח): ict_faults
    // only — the Comm Site (CommSite.id) this fault is tagged against, so the site's own
    // table row / map marker can surface its live + historical fault picture.
    relatedCommSiteId?: string;
}

// --- Personal Task Log (יומן משימות אישי) ---
// Per-unit-and-cell personal task manager: scoped by the COMBINATION of ownerUnitCode and
// ownerCell (not role) — switching the active unit or cell in the User Settings modal
// shows a different filtered slice of the one shared tasks array (see
// PersonalTaskLogContext.tsx).

export type PersonalTaskRecurrence = 'oneTime' | 'periodic';
export type PersonalTaskFrequency = 'daily' | 'weekly' | 'monthly';
export type PersonalTaskStatus = 'open' | 'inProgress' | 'done' | 'blocked' | 'cancelled';
export type PersonalTaskSeverity = 'high' | 'low' | 'medium' | 'unknown';

export interface PersonalTaskRecurrenceRule {
    frequency: PersonalTaskFrequency;
    endDate: string; // ISO date — recurrence stops generating after this date
}

export interface PersonalTask {
    id: string;
    ownerUnitCode: number;
    ownerCell: Cell;
    title: string;
    description: string;
    status: PersonalTaskStatus;
    start?: string; // ISO datetime — optional, cards may show no date
    end?: string; // ISO datetime
    severity: PersonalTaskSeverity;
    notes?: string; // הערות
    recurrence: PersonalTaskRecurrence;
    recurrenceRule?: PersonalTaskRecurrenceRule; // only when recurrence === 'periodic'
    createdByUserName: string;
    createdAt: string; // ISO
    updatedAt: string; // ISO
}

// --- Comm Site Service Monitoring (ניטור שירותים) ---
// See PRD "Comm Site Service Monitoring" for the full domain model this mirrors. Extends
// the Static Space Establishment CommSite entity — read-only, Nitor-sourced.

export type CommSiteServiceType = 'cellular' | 'lcn_network' | 'roip' | 'elad' | 'maban' | 'components';

export type CommSiteServiceStatus = 'healthy' | 'degraded' | 'down';

export interface CommSiteService {
    serviceId: string;
    siteId: string; // FK into CommSite
    serviceType: CommSiteServiceType;
    status: CommSiteServiceStatus;
    lastUpdatedAt: string; // ISO — this service's OWN freshness, independent of the site-level timestamp (PRD 2.7)
    metrics: Record<string, number | string>; // per-service-type key/value payload (PRD 7.1)
    noLongerReporting?: boolean; // was installed, Nitor stopped reporting it (PRD 2.3/US-8) — flagged, not hidden
}

export interface ServiceSubItem {
    subItemId: string;
    serviceId: string; // FK into CommSiteService
    status: string; // service-type-specific status label (PRD 7.2)
    payload: Record<string, string | number>;
}

// "Spectrum" map layer (ספקטרום): two filters — Jamming zones (השתקות, a frequency band
// muted with no spectral interference over a mapped polygon) and Blocking zones (חסימות,
// a frequency + altitude band denied over a mapped polygon). Jamming splits by timing into
// ended/active/future; Blocking splits by frequency band (L1 / שו"ב) and, when it carries an
// end time, by active/ended too — each band rendered in its own color on the map.
export type SpectrumZoneType = 'jamming' | 'blocking';
export type JammingStatus = 'ended' | 'active' | 'future';
export type BlockingStatus = 'active' | 'ended';
// Blocking only — which frequency band the block falls under: L1 (GPS/L-band) or שו"ב
// (command & control comms frequencies).
export type BlockingBand = 'l1' | 'comms';

export interface SpectrumZone {
    id: string;
    zoneType: SpectrumZoneType;
    name: Record<string, string>;
    coordinates: GeoCoordinate[]; // the mapped polygon
    freqRangeMhz: { from: number; to: number };
    heightRangeM?: { from: number; to: number }; // Blocking only — the altitude band it covers
    band?: BlockingBand; // Blocking only
    // Jamming: its status (ended/active/future) is derived from this window via
    // computeJammingStatus(). Blocking: an unset endAt means the block has no expiry (always
    // active); when set, computeBlockingStatus() derives active/ended from it the same way.
    startAt?: string; // ISO — jamming window start
    endAt?: string; // ISO — jamming window end, or blocking's expiry
    notes?: string;
}


// --- Link Planning (תכנון קשר) ---
// Lets a user draw a terrain cell (polygon) to examine, add mock mobile comm platforms,
// then run a mock coverage "cut" combining existing Comm Sites (from the Static Space
// catalog) and/or mobile platforms. Coverage is a purely visual approximation (no real RF
// data) — see common/utilities/linkPlanning.ts for the color/distance model.

export interface LinkCell {
    id: string;
    name: string;
    coordinates: GeoCoordinate[]; // the user-drawn polygon
    createdAt: string; // ISO
}

export interface MobileCommPlatform {
    id: string;
    name: string;
    position: GeoCoordinate;
    createdAt: string; // ISO
}

// מפקדה (Headquarters) vs חפ"ק (forward Command Post) — placed in Link Planning
// alongside cells/platforms, transferred into ניהו"ק's "מפקדות וחפ"קים" layer the same way.
export type HeadquartersKind = 'headquarters' | 'commandPost';

// The three echelons a headquarters/command post's unitCode may resolve to (see
// SelectUnitModal's ASSIGNABLE_TYPES) — drives the small NATO-style size badge on its map
// icon (see headquartersIcon.ts) and nothing else; not stored on the entity itself since
// it's always derivable from unitCode via mockUnits.
export type HeadquartersLevel = 'division' | 'brigade' | 'battalion';

export interface HeadquartersEntity {
    id: string;
    kind: HeadquartersKind;
    // FK into mockUnits (division/brigade/battalion only) — this is how the headquarters
    // or command post is linked to its real place in the org hierarchy: the chosen unit's
    // parentCode chain already encodes "this brigade is under that division", so no
    // separate echelon/level field is needed here.
    unitCode: number;
    name: string;
    position: GeoCoordinate;
    createdAt: string; // ISO
}

export interface LinkCoverageCut {
    id: string;
    cellId: string; // FK into LinkCell
    commSiteIds: string[]; // FK into CommSite (the existing catalog)
    platformIds: string[]; // FK into MobileCommPlatform
    visible: boolean;
    createdAt: string; // ISO
}

export type LinkCoverageTier = 'good' | 'medium' | 'low' | 'none';

// ---- Bum Manager (בו"ם משימות) — commander demands & instructions tracker ----
// PRD "Bum Manager": every demand/instruction a commander issues, tracked through a
// lifecycle (ממתין → בביצוע → חסום → הושלם / בוטל) and viewed as dashboard / table / kanban /
// category tiles. `category` is the handling cell (מסגרת); its allowed values depend on whether
// the owning unit is a division or a brigade (see bum_manager/utilities/bum.ts).
export type BumDemandStatus = 'backlog' | 'inProgress' | 'blocked' | 'done' | 'canceled';
export type BumDemandType = 'demand' | 'instruction';
export type BumSeverity = 1 | 2 | 3 | 4 | 5;

export interface BumDemand {
    id: string;
    unitCode: number; // the unit that created the demand (FK into mockUnits)
    assignedUnitCode?: number; // set when a division adds a demand for a subordinate brigade
    createdByCell?: Cell;
    createdAt: string; // ISO
    reportingAgent: string; // גורם מורה — key into BUM_REPORTING_AGENTS
    category: string; // מסגרת (handling cell) — key into the division/brigade category lists
    title: string;
    description: string;
    type: BumDemandType;
    executor: string; // מבצע — who carries it out
    severity: BumSeverity;
    status: BumDemandStatus;
    startAt?: string; // ISO — when the commander issued it
    dueAt?: string; // ISO — מועד יעד
    reportingPlatform?: string; // פלטפורמת דיווח (meeting / phone / Teams / radio …)
    notes?: string;
}

// ---- Bum Manager: דמ"צים — equipment & means requests raised to the superior unit ----
// A unit raises a דמ"צ to the unit above it in the echelon tree; the superior sees it as a
// received one and moves it through the lifecycle (הוגש → בבחינה → אושר → סופק / נדחה).
// Files (e.g. a spec sheet) can be attached to a דמ"צ.
export type BumDmatzStatus = 'submitted' | 'underReview' | 'approved' | 'supplied' | 'rejected';

export interface BumAttachment {
    id: string;
    name: string;
    size: number; // bytes
    mimeType: string;
    dataUrl?: string; // kept for files small enough to persist in localStorage (prototype)
}

export interface BumDmatz {
    id: string;
    fromUnitCode: number; // the unit that raised it
    toUnitCode: number; // its superior (parent in the echelon tree)
    createdAt: string; // ISO
    title: string;
    description: string;
    equipment: string; // the equipment / means requested
    quantity: number;
    severity: BumSeverity;
    status: BumDmatzStatus;
    dueAt?: string; // ISO — needed-by date
    attachments: BumAttachment[];
    notes?: string;
}

// ---- Bum Manager: הנחיות מפקד — instructions commanders pushed down to the field ----
// One row per instruction: who issued it, what it says and which unit it is relevant to (the
// viewing unit itself, or a specific unit beneath it in the echelon tree).
export interface BumCommanderInstruction {
    id: string;
    issuedAt: string; // ISO
    issuedByUnitCode: number; // the unit whose commander issued it
    commanderName: string;
    text: string;
    targetUnitCode: number; // the unit it is relevant to
}

// ---- System Views (תצוגות מערכת) — user-built dashboards ----
// A user composes a dashboard out of the existing features of שליטה וניהול, ניטור and ספקטרום
// (each one becomes a widget), saves it into their own repository and can switch between their
// dashboards at any time. This is an addition to the fixed screens, not a replacement.
export type DashboardFeatureId =
    | 'combat_log' | 'combat_script' | 'personal_task_log' | 'bum_manager' | 'headquarters_overview'
    | 'static_space' | 'tikshov_cop'
    | 'spectrum_jamming' | 'spectrum_blocking';

// A widget is just a feature in the dashboard's ordered list. There is no free placement: the
// layout is computed from how many widgets there are, so together they always fill 100% of the
// screen area (see computeTileLayout in system_views/utilities/dashboardFeatures.ts).
export interface DashboardWidget {
    id: string;
    featureId: DashboardFeatureId;
}

export interface CustomDashboard {
    id: string;
    ownerUsername: string;
    name: string;
    widgets: DashboardWidget[];
    createdAt: string; // ISO
    updatedAt: string; // ISO
}
