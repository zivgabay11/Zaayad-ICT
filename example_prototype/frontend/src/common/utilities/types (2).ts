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

export type UserRole = 'intelligenceOfficer' | 'operationsOfficer' | 'telecomOfficer' | 'malka';

export interface Session {
    user: SystemUser;
    unit: SystemUnit;
    role: UserRole;
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
    // Cross-log automation (see CombatLogContext.tsx): work_future_events only — the ICT
    // Faults this work item is going out to resolve. Completing the work auto-closes them.
    linkedFaultIds?: string[];
    // Cross-module integration with Static Space Establishment (כינון מרחב נייח): ict_faults
    // only — the Comm Site (CommSite.id) this fault is tagged against, so the site's own
    // table row / map marker can surface its live + historical fault picture.
    relatedCommSiteId?: string;
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

