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

export type UserRole = 'intelligenceOfficer' | 'operationsOfficer' | 'telecomOfficer';

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


