import { Plan, MockEnemyEntity, MockTarget, CommSite, ClientDevice, TrackedDevice, TrackedDeviceType, GeoCoordinate } from './types';

export const mockUsers = [
    {
        username: "john",
        password: "temp00",
        name: {
            en: "John Doe",
            he: "ג׳ון דו"
        },
        "unitCode": 1000,
    }
];

// Recursively builds a battalion→company→platoon sub-tree under a brigade, so Tikshov
// COP (Section 2.1/3.5) has a real multi-echelon tree to roll up through instead of just
// division→brigade. Each unit's code is derived from its parent's (parentCode * 10 + n),
// so the tree is reproducible without hand-listing every node.
function buildEchelonSubTree(brigadeCode: number, childrenPerLevel = 2) {
    const levels: Array<'battalion' | 'company' | 'platoon'> = ['battalion', 'company', 'platoon'];
    const units: { code: number; type: string; parentCode: string }[] = [];
    let currentLevel = [brigadeCode];
    levels.forEach(levelType => {
        const nextLevel: number[] = [];
        currentLevel.forEach(parentCode => {
            for (let n = 1; n <= childrenPerLevel; n++) {
                const code = parentCode * 10 + n;
                units.push({ code, type: levelType, parentCode: String(parentCode) });
                nextLevel.push(code);
            }
        });
        currentLevel = nextLevel;
    });
    return units;
}

// Fire Brigade (400, under the home division 1000) and Brigade 2100 (under the sibling
// division 2000) each get a full battalion/company/platoon tree, so both the home unit's
// recursive roll-up and the watched-unit roll-up (PRD 5.4) have real depth to show.
const fireBrigadeSubTree = buildEchelonSubTree(400);
const division2BrigadeSubTree = buildEchelonSubTree(2100);

export const mockUnits = [
    { code: 5000, type: "command" },
    { code: 1000, type: "division", parentCode: "5000" },
    { code: 100, type: "brigade", parentCode: "1000" },
    { code: 200, type: "brigade", parentCode: "1000" },
    { code: 300, type: "brigade", parentCode: "1000" },
    { code: 400, type: "brigade", parentCode: "1000", name: { en: "Fire Brigade", he: "חטיבת האש" } },
    { code: 500, type: "brigade", parentCode: "1000" },
    ...fireBrigadeSubTree,
    // A sibling division, entirely outside the home division's tree — this is what makes
    // "watched units" (PRD 5.4) a real cross-unit scenario rather than a no-op.
    { code: 2000, type: "division", parentCode: "5000", name: { en: "Southern Division", he: "אוגדה דרומית" } },
    { code: 2100, type: "brigade", parentCode: "2000" },
    { code: 2200, type: "brigade", parentCode: "2000" },
    ...division2BrigadeSubTree,
];

// Recursive union of a unit and everything beneath it in the echelon tree (PRD 2.1/3.5):
// a unit's Tikshov COP is the union of its own devices plus every descendant unit's.
export function getUnitAndDescendantCodes(rootCode: number): number[] {
    const result: number[] = [rootCode];
    let frontier = [rootCode];
    while (frontier.length > 0) {
        const nextFrontier = mockUnits
            .filter(u => frontier.includes(Number(u.parentCode)))
            .map(u => u.code)
            .filter(code => !result.includes(code));
        result.push(...nextFrontier);
        frontier = nextFrontier;
    }
    return result;
}

// Static enemy entities for map AI analysis (anchored to the plan-1 area of operations).
// The analysis agent re-anchors them relative to the map center when the map is viewing a different area.
export const mockEnemyEntitiesAnchor = { lat: 33.27, lng: 35.55 };

export const mockEnemyEntities: MockEnemyEntity[] = [
    { id: 'enemy-atgm-1', name: { en: 'ATGM Squad North', he: 'חוליית נ"ט צפונית' }, type: 'atgm', position: { lat: 33.295, lng: 35.535 }, rangeMeters: 4000 },
    { id: 'enemy-atgm-2', name: { en: 'ATGM Squad East', he: 'חוליית נ"ט מזרחית' }, type: 'atgm', position: { lat: 33.275, lng: 35.59 }, rangeMeters: 4500 },
    { id: 'enemy-arty-1', name: { en: 'Artillery Battery', he: 'סוללת ארטילריה' }, type: 'artillery', position: { lat: 33.31, lng: 35.565 }, rangeMeters: 14000 },
    { id: 'enemy-tank-1', name: { en: 'Tank Platoon', he: 'מחלקת טנקים' }, type: 'tank', position: { lat: 33.26, lng: 35.555 }, rangeMeters: 3500 },
    { id: 'enemy-aa-1', name: { en: 'AA Position', he: 'עמדת נ"מ' }, type: 'aa', position: { lat: 33.285, lng: 35.572 }, rangeMeters: 6000 },
    { id: 'enemy-inf-1', name: { en: 'Infantry Outpost', he: 'מוצב חי"ר' }, type: 'smallArms', position: { lat: 33.252, lng: 35.528 }, rangeMeters: 800 },
];

// Static named targets for LoS & threat analysis
export const mockTargets: MockTarget[] = [
    { id: 'target-1', name: { en: 'Special Force', he: 'כוח מיוחד' }, position: { lat: 33.258, lng: 35.567 }, azimuthStart: 0, azimuthEnd: 360 },
    { id: 'target-2', name: { en: 'Armor Element', he: 'כוח שריון' }, position: { lat: 33.245, lng: 35.545 }, azimuthStart: 280, azimuthEnd: 40 },
    { id: 'target-3', name: { en: 'Assembly Area', he: 'שטח כינוס' }, position: { lat: 33.238, lng: 35.558 }, azimuthStart: 320, azimuthEnd: 90 },
];

export const mockPhases = [
    { index: -2, name: { en: "Preliminary", he: "מקדים" } },
    { index: -1, name: { en: "Preparation", he: "מכין" } },
    { index: 0, name: { en: "A", he: "א" } },
    { index: 1, name: { en: "B", he: "ב" } },
    { index: 2, name: { en: "C", he: "ג" } },
    { index: 3, name: { en: "D", he: "ד" } },
    { index: 4, name: { en: "E", he: "ה" } },
    { index: 5, name: { en: "F", he: "ו" } },
    { index: 6, name: { en: "G", he: "ז" } },
    { index: 7, name: { en: "H", he: "ח" } },
];

export const mockTaskStatuses = [
    { id: 'To Do', name: { en: 'To Do', he: 'לביצוע' }, color: '#64748B', darkColor: '#FFFFFF' }, // Slate 500
    { id: 'In Progress', name: { en: 'In Progress', he: 'בתהליך' }, color: '#EAB308', darkColor: '#EAB308' }, // Orange / Yellow
    { id: 'On Hold', name: { en: 'On Hold', he: 'מוקפא' }, color: '#FCA5A5' }, // Light red
    { id: 'Done', name: { en: 'Done', he: 'הושלמה' }, color: '#22C55E' }, // Green
    { id: 'Cancelled', name: { en: 'Cancelled', he: 'בוטלה' }, color: '#4B5563' } // Dark Grey
];

export const mockPlanStatuses = [
    { id: 'draft', name: { en: 'Draft', he: 'טיוטה' }, color: '#64748B', darkColor: '#FFFFFF' }, // Slate 500
    { id: 'planning', name: { en: 'Planning', he: 'תכנון' }, color: '#A855F7' }, // Purple
    { id: 'onHold', name: { en: 'On Hold', he: 'מוקפא' }, color: '#FCA5A5' }, // Light red
    { id: 'active', name: { en: 'Active', he: 'פעילה' }, color: '#EAB308', darkColor: '#EAB308' }, // Orange / Yellow
    { id: 'done', name: { en: 'Done', he: 'הושלמה' }, color: '#22C55E' }, // Green
    { id: 'cancelled', name: { en: 'Cancelled', he: 'בוטלה' }, color: '#4B5563' } // Dark Grey
];

export const mockPlanSharedOptions = [
    { id: 'private', name: { en: 'Private (Only me)', he: 'פרטי' } },
    { id: 'sameUnit', name: { en: 'Same Unit', he: 'משותף' } }
];

export const mockPlans: Plan[] = [
    {
        id: 'plan-1',
        name: { en: 'Operation Desert Storm', he: 'מבצע סופה במדבר' },
        description: { en: 'A massive offensive operation to liberate the occupied territory.', he: 'מבצע התקפי רחב היקף לשחרור השטח הכבוש.' },
        status: 'active',
        shared: 'sameUnit',
        createdBy: 'john',
        updatedBy: 'john',
        created: '2026-05-10T08:00:00Z',
        updated: '2026-05-13T18:49:00Z',
        dDay: '2026-05-15',
        hHour: '04:00',
        phases: [
            { id: 'ph-1', index: -1, title: { en: 'Staging & Integration', he: 'היערכות והכנה' }, startOffsetHours: -24, endOffsetHours: 0 },
            { id: 'ph-2', index: 0, title: { en: 'Movement', he: 'תנועה' }, startOffsetHours: 0, endOffsetHours: 4 },
            { id: 'ph-3', index: 1, title: { en: 'Decisive Action', he: 'תקיפה' }, startOffsetHours: 4, endOffsetHours: 8 },
            { id: 'ph-4', index: 2, title: { en: 'Clearing Operations', he: 'פעולות טיהור' }, startOffsetHours: 8, endOffsetHours: 24 },
        ],
        units: [
            { code: 5000 },
            { code: 1000 },
            { code: 100 },
            { code: 200 },
            { code: 300 },
            { code: 400 },
        ],
        presentationItems: ['Map Overview', 'Force Distribution'],
        general: {
            en: "An overview of the operation focusing on decisive offensive actions and sustained logistical support in adverse terrain.",
            he: "סקירה כללית של המבצע המתמקדת בפעולות התקפיות מכריעות ותמיכה מערכתית רציפה בתוואי שטח מאתגר."
        },
        calendarEvents: [
            { id: 'e-0', title: { en: 'Receive Alert Order', he: 'קבלת פקודת התראה' }, date: '2026-05-10', time: '08:00', level: 'division', location: 'VC' },
            { id: 'e-1', title: { en: 'Target Paving | Command Sync', he: 'ריצוף מטרות | סנכרון פיקוד' }, date: '2026-05-11', time: '08:00', level: 'command', location: 'Command' },
            { id: 'e-2', title: { en: 'Corps Plan Presentation', he: 'הצגת תוכנית גיס' }, date: '2026-05-12', time: '10:00', level: 'command', location: 'Corps Commander Office' },
            { id: 'e-3', title: { en: 'O-Group 1', he: 'קבוצת פקודות 1' }, date: '2026-05-12', time: '10:00', level: 'division', location: 'Division Planning Trailer' },
            { id: 'e-4', title: { en: 'War Game', he: 'משחק מלחמה' }, date: '2026-05-12', time: '11:30', level: 'division', location: 'Division Planning Trailer' },
            { id: 'e-6', title: { en: 'Brigade Plans Presentation', he: 'הצגת תוכניות חטיבה' }, date: '2026-05-13', time: '14:00', level: 'brigade', location: 'Fire Brigade Trailer' },
        ],
        objective: {
            en: "Restore territorial integrity by neutralizing enemy forces in Sector Alpha and securing key logistical routes.",
            he: "השבת השלמות הטריטוריאלית על ידי נטרול כוחות האויב בגזרה אלפא ואבטחת נתיבי הלוגיסטיקה המרכזיים."
        },
        mission: {
            en: "1st Armored Division attacks to destroy enemy forces in Sector Alpha NLT D+3 to secure the northern flank and enable the forward deployment of 101st Airborne.",
            he: "הדיוויזיה המשוריינת 1 תוקפת להשמדת כוחות האויב בגזרה אלפא לא יאוחר מ-D+3 כדי לאבטח את האגף הצפוני ולאפשר פריסה קדמית של הכוח המוצנח 101."
        },
        method: {
            en: "A synchronized combined-arms assault focusing on rapid armored penetration supported by overwhelming artillery preparation.",
            he: "מתקפה משולבת ורב-זרועית המתמקדת בחדירת שריון מהירה בגיבוי הכנת ארטילריה מסיבית."
        },
        operationalIdea: {
            en: "Fix the enemy in place laterally, then bypass strong points using the southern valley corridor to encircle and disintegrate their command nodes.",
            he: "ריתוק סביבת האויב ולאחר מכן עקיפת נקודות חזקות דרך מסדרון הוואדי הדרומי, על מנת לכתר ולפורר את צמתי השליטה שלהם."
        },
        enemy: {
            en: "The enemy forces consist of a mechanized infantry brigade supported by irregular militia groups. They have prepared layered defenses with anti-tank guided missiles and heavy mining along the main avenues of approach.",
            he: "כוחות האויב מורכבים מחטיבת חי״ר ממוכנת הנתמכת על ידי קבוצות מיליציה. הם הכינו הגנה מדורגת עם טילי נ״ט ומיקוש כבד לאורך צירי הגישה המרכזיים."
        },
        terrain: {
            en: "The area of operations features rolling hils and restrictive valleys that channel armor movement. Urban clusters provide concealment for light infantry and create natural choke points.",
            he: "אזור הפעולה מאופיין בגבעות וואדיות המגבילים תנועת שריון. השטחים הבנויים מספקים מסתור לחי״ר קל ויוצרים נקודות תורפה טבעיות."
        },
        mpcoa: {
            threat: {
                en: "The enemy will likely attempt to delay our advance through a series of tactical withdrawals, using improvised explosive devices (IEDs) and sniper fire to inflict casualties while preserving their main force.",
                he: "האויב צפוי לנסות ולעכב את התקדמותנו באמצעות נסיגות טקטיות, תוך שימוש במטעני חבלה וירי צלפים כדי להסב נפגעים תוך שמירה על הכוח העיקרי שלו."
            },
            sequenceOfEvents: [
                { en: "Screening forces engage our lead elements to force early deployment.", he: "כוחות סיור בולמים את כוחותינו הקדמיים לאילוץ פריסה מוקדמת." },
                { en: "Enemy main forces withdraw to pre-prepared defensive lines.", he: "הכוחות העיקריים נסוגים לקווי הגנה מוכנים מראש." },
                { en: "Asymmetric units harass supply lines and isolated forward units.", he: "יחידות א-סימטריות מטרידות את קווי האספקה ויחידות מבודדות." },
                { en: "Local counter-attacks at choke points to buy time for fortification.", he: "התקפות נגד מקומיות בנקודות תורפה כדי להרוויח זמן לביצור." }
            ],
            recommendedActions: [
                { en: "Maintain momentum to prevent the enemy from fully establishing defensive lines.", he: "שמירה על מומנטום כדי למנוע מהאויב לבסס קווי הגנה." },
                { en: "Deploy quick reaction forces (QRF) to secure supply lines.", he: "פריסת כוחות תגובה מהירה (QRF) לאבטחת קווי האספקה." },
                { en: "Increase reconnaissance to identify and bypass strongpoints.", he: "הגברת הסיור לזיהוי ועקיפת נקודות מערך חזקות." },
                { en: "Utilize indirect fire to suppress enemy snipers and screening units.", he: "שימוש באש עקיפה לדיכוי צלפים וכוחות סיור." }
            ]
        },
        mdcoa: {
            threat: {
                en: "The enemy may commit their strategic reserves in a massive counter-offensive aimed at cutting off our forward units and destroying our logistics hub.",
                he: "האויב עשוי לשלב את העתודות האסטרטגיות שלו במתקפת נגד כבדה במטרה לנתק את הכוחות הקדמיים שלנו ולהשמיד את המרכז הלוגיסטי."
            },
            sequenceOfEvents: [
                { en: "A feint withdrawal to draw our forces deep into the engagement zone.", he: "נסיגת סרק כדי למשוך את כוחותינו עמוק לתוך אזור ההשמדה." },
                { en: "Simultaneous attacks on our flanks using armored reserves.", he: "התקפות בו-זמניות על האגפים שלנו באמצעות עתודה משוריינת." },
                { en: "Electronic warfare units target our C2 networks to disrupt communication.", he: "יחידות לוחמה אלקטרונית תוקפות את רשתות השליטה שלנו לשיבוש תקשורת." },
                { en: "Massed artillery barrage on our forward operating bases and supply depots.", he: "ירי ארטילריה מסיבי על בסיסי הפעולה הקדמיים שלנו ומצבורי אספקה." }
            ],
            recommendedActions: [
                { en: "Hold strategic reserves ready to counter flank attacks.", he: "שמירת עתודות אסטרטגיות בכוננות למתקפות נגד באגפים." },
                { en: "Implement strict communication discipline and prepare fallback frequencies.", he: "יישום משמעת קשר קפדנית והכנת תדרים חלופיים." },
                { en: "Disperse supply depots to minimize vulnerability to artillery fire.", he: "פיזור מצבורי אספקה למזעור פגיעות מאש ארטילרית." },
                { en: "Ensure tactical air assets are on standby for immediate close air support.", he: "הבטחת סיוע אווירי טקטי בכוננות למתן סיוע קרוב." }
            ]
        },
        tasks: [
            // Command 5000 Level
            {
                id: 't-5000-1',
                name: { en: 'Air Strike 1', he: 'מהלומה 1' },
                description: { en: 'Initial aerial bombardment to neutralize enemy air defenses.', he: 'הפצצה אווירית ראשונית לנטרול הגנות האוויר של האויב.' },
                status: 'To Do',
                phaseId: 'ph-1',
                primaryUnitId: '5000',
                startOffsetHours: -16,
                endOffsetHours: -8
            },
            {
                id: 't-5000-2',
                name: { en: 'Air Strike 2', he: 'מהלומה 2' },
                description: { en: 'Follow-up aerial strikes targeting enemy command nodes.', he: 'תקיפות אוויר משלימות לפגיעה במוקדי הפיקוד של האויב.' },
                status: 'To Do',
                phaseId: 'ph-2',
                primaryUnitId: '5000',
                startOffsetHours: -8,
                endOffsetHours: 0,
                dependencyIds: ['t-5000-1']
            },
            // Division 1000 Level
            {
                id: 't-1000-1',
                name: { en: 'RSOI (Division)', he: 'קליטה והיערכות (אוגדה)' },
                description: { en: 'Reception, Staging, Onward Movement, and Integration of division assets.', he: 'קליטה, היערכות, תנועה קדימה ושילוב של נכסי האוגדה.' },
                status: 'To Do',
                phaseId: 'ph-1',
                primaryUnitId: '1000',
                startOffsetHours: -24,
                endOffsetHours: 0
            },
            {
                id: 't-1000-2',
                name: { en: 'Movement', he: 'תנועה' },
                description: { en: 'Direct simultaneous movement of all brigades.', he: 'ניהול תנועה במקביל של כלל החטיבות.' },
                status: 'To Do',
                phaseId: 'ph-2',
                primaryUnitId: '1000',
                startOffsetHours: 0,
                endOffsetHours: 4,
                dependencyIds: ['t-1000-1']
            },
            {
                id: 't-1000-3',
                name: { en: 'Assault Main Defensive Line', he: 'תקיפת קו ההגנה העיקרי' },
                description: { en: 'Establish operational control and direct combined arms assault.', he: 'שליטה מבצעית וניהול המתקפה המשולבת.' },
                status: 'To Do',
                phaseId: 'ph-3',
                primaryUnitId: '1000',
                startOffsetHours: 4,
                endOffsetHours: 8,
                dependencyIds: ['t-1000-2']
            },
            {
                id: 't-1000-4',
                name: { en: 'Purge Sites A, B', he: 'טיהור אתרים A, B' },
                description: { en: 'Direct post-assault clearance and securing of key zones A and B.', he: 'ניהול תהליך טיהור ואבטחת מרחבים A ו-B לאחר התקיפה.' },
                status: 'To Do',
                phaseId: 'ph-4',
                primaryUnitId: '1000',
                startOffsetHours: 8,
                endOffsetHours: 12,
                dependencyIds: ['t-1000-3']
            },
            // Brigade 100
            {
                id: 't-1',
                name: { en: 'Brigade RSOI', he: 'הערכות בשטחי כינוס' },
                description: { en: 'Staging and Integration of 1st Brigade in assembly area.', he: 'היערכות ושילוב כוחות חטיבה 1 בשטחי כינוס.' },
                status: 'To Do', // "In Progress", "On Hold", "To Do", "Done", "Cancelled"
                phaseId: 'ph-1',
                primaryUnitId: '100',
                startOffsetHours: -14,
                endOffsetHours: -2,
                geoCoordinates: [{ lat: 31.5, lng: 35.0 }]
            },
            {
                id: 't-2',
                name: { en: 'Movement (Alpha Axis)', he: 'תנועה (ציר אלפא)' },
                description: { en: 'Advance through Alpha axis to engage enemy screening forces.', he: 'התקדמות במסדרון אלפא ליצירת מגע עם כוחות האויב.' },
                status: 'To Do',
                phaseId: 'ph-2',
                primaryUnitId: '100',
                startOffsetHours: -2,
                endOffsetHours: 3,
                dependencyIds: ['t-1'],
                geoCoordinates: [{ lat: 31.6, lng: 35.1 }, { lat: 31.7, lng: 35.2 }]
            },
            {
                id: 't-3',
                name: { en: 'Seize Objective Gamma', he: 'השתלטות על יעד גמא' },
                description: { en: 'Overcome main defensive lines and secure logistical corridors.', he: 'הכרעת קווי ההגנה העיקריים ואבטחת נתיבי אספקה.' },
                status: 'To Do',
                phaseId: 'ph-3',
                primaryUnitId: '100',
                startOffsetHours: 3,
                endOffsetHours: 7,
                dependencyIds: ['t-2']
            },
            {
                id: 't-4',
                name: { en: 'Purge Site A', he: 'טיהור אתר A' },
                description: { en: 'Systematically clear Site A of remaining enemy presence.', he: 'טיהור וסריקת אתר A משאריות כוחות אויב.' },
                status: 'To Do',
                phaseId: 'ph-4',
                primaryUnitId: '100',
                startOffsetHours: 7,
                endOffsetHours: 14,
                dependencyIds: ['t-3']
            },
            // Brigade 200
            {
                id: 't-200-1',
                name: { en: 'Brigade RSOI', he: 'הערכות בשטחי כינוס' },
                description: { en: 'Staging and Integration of 2nd Brigade in assembly area.', he: 'היערכות ושילוב כוחות חטיבה 2 בשטחי כינוס.' },
                status: 'To Do',
                phaseId: 'ph-1',
                primaryUnitId: '200',
                startOffsetHours: -12,
                endOffsetHours: 0
            },
            {
                id: 't-200-2',
                name: { en: 'Movement (Bravo Axis)', he: 'תנועה (ציר בראבו)' },
                description: { en: 'Advance through Bravo axis for an eastern envelopment.', he: 'התקדמות בציר בראבו לאיגוף מזרחי.' },
                status: 'To Do',
                phaseId: 'ph-2',
                primaryUnitId: '200',
                startOffsetHours: 0,
                endOffsetHours: 5,
                dependencyIds: ['t-200-1']
            },
            {
                id: 't-200-3',
                name: { en: 'Seize Objective Echo', he: 'השתלטות על יעד אקו' },
                description: { en: 'Neutralize enemy flanks and cut off retreat paths.', he: 'נטרול אגפי האויב וחסימת נתיבי נסיגה.' },
                status: 'To Do',
                phaseId: 'ph-3',
                primaryUnitId: '200',
                startOffsetHours: 5,
                endOffsetHours: 9,
                dependencyIds: ['t-200-2']
            },
            {
                id: 't-200-4',
                name: { en: 'Purge Site B', he: 'טיהור אתר B' },
                description: { en: 'Systematically clear Site B of remaining enemy presence.', he: 'טיהור וסריקת אתר B משאריות כוחות אויב.' },
                status: 'To Do',
                phaseId: 'ph-4',
                primaryUnitId: '200',
                startOffsetHours: 9,
                endOffsetHours: 16,
                dependencyIds: ['t-200-3']
            },
            // Brigade 300
            {
                id: 't-300-1',
                name: { en: 'Brigade RSOI', he: 'הערכות בשטחי כינוס' },
                description: { en: 'Staging and Integration of 3rd Brigade in assembly area.', he: 'היערכות ושילוב כוחות חטיבה 3.' },
                status: 'To Do',
                phaseId: 'ph-1',
                primaryUnitId: '300',
                startOffsetHours: -10,
                endOffsetHours: 1
            },
            {
                id: 't-300-2',
                name: { en: 'Flank Security', he: 'אבטחת אגפים' },
                description: { en: 'Provide security for the main element during movement.', he: 'הבטחת האגפים של הכוח העיקרי במהלך התנועה.' },
                status: 'To Do',
                phaseId: 'ph-2',
                primaryUnitId: '300',
                startOffsetHours: 1,
                endOffsetHours: 6,
                dependencyIds: ['t-300-1']
            },
            {
                id: 't-300-3',
                name: { en: 'Isolate Area of Operations', he: 'בידוד מרחב הפעולה' },
                description: { en: 'Prevent enemy reinforcements from entering the sector.', he: 'חסימת תגבורות אויב מכניסה לגזרה.' },
                status: 'To Do',
                phaseId: 'ph-3',
                primaryUnitId: '300',
                startOffsetHours: 6,
                endOffsetHours: 11,
                dependencyIds: ['t-300-2']
            },
            {
                id: 't-300-4',
                name: { en: 'Secure Supply Lines', he: 'אבטחת צירי אספקה' },
                description: { en: 'Maintain security of main supply routes and LOCs.', he: 'שמירה על בטחון צירי לוגיסטיקה קווי תקשורת.' },
                status: 'To Do',
                phaseId: 'ph-4',
                primaryUnitId: '300',
                startOffsetHours: 11,
                endOffsetHours: 24,
                dependencyIds: ['t-300-3']
            }
        ],
        "diagramElements": [
            {
                "id": "elem-1779277570984-1c4byt",
                "type": "polygon",
                "phaseId": "ph-1",
                "unitCode": 100,
                "coordinates": [
                    {
                        "lat": 33.269766337632554,
                        "lng": 35.573473227931714
                    },
                    {
                        "lat": 33.26904870691392,
                        "lng": 35.57029633044012
                    },
                    {
                        "lat": 33.26983810038007,
                        "lng": 35.56797805389219
                    },
                    {
                        "lat": 33.264742798760246,
                        "lng": 35.56342736289073
                    },
                    {
                        "lat": 33.259718970937364,
                        "lng": 35.56239701775836
                    },
                    {
                        "lat": 33.25684808245697,
                        "lng": 35.56840736436405
                    },
                    {
                        "lat": 33.25742226770037,
                        "lng": 35.571498399761246
                    },
                    {
                        "lat": 33.26380982401209,
                        "lng": 35.5719277102331
                    },
                    {
                        "lat": 33.26933575990905,
                        "lng": 35.57665012542327
                    }
                ],
                "properties": {
                    "fillOpacity": 0.2,
                    "label": "שטח כינוס"
                }
            },
            {
                "id": "elem-1779277670980-4zprzd",
                "type": "arrow",
                "phaseId": "ph-2",
                "unitCode": 100,
                "coordinates": [
                    {
                        "lat": 33.269766337632554,
                        "lng": 35.573473227931714
                    },
                    {
                        "lat": 33.27629650614933,
                        "lng": 35.575143959305606
                    },
                    {
                        "lat": 33.278449201911044,
                        "lng": 35.57085085458724
                    },
                    {
                        "lat": 33.278162178876485,
                        "lng": 35.566386025680174
                    },
                    {
                        "lat": 33.28261092986074,
                        "lng": 35.56260809352801
                    }
                ],
                "properties": {
                    "weight": 4,
                    "hasArrowhead": true
                }
            },
            {
                "id": "elem-1779277682370-38ecxu",
                "type": "line",
                "phaseId": "ph-2",
                "unitCode": 100,
                "coordinates": [
                    {
                        "lat": 33.28060184458917,
                        "lng": 35.55213291801522
                    },
                    {
                        "lat": 33.28777693677941,
                        "lng": 35.569992233643575
                    }
                ],
                "properties": {
                    "weight": 4,
                    "label": "קו A"
                }
            },
            {
                "id": "elem-1779277721921-zgso33",
                "type": "arrow",
                "phaseId": "ph-3",
                "unitCode": 100,
                "coordinates": [
                    {
                        "lat": 33.28591146955583,
                        "lng": 35.562365691187736
                    },
                    {
                        "lat": 33.289821730038234,
                        "lng": 35.56223689804618
                    },
                    {
                        "lat": 33.296924323773105,
                        "lng": 35.563653622603255
                    },
                    {
                        "lat": 33.30083409071759,
                        "lng": 35.56155000129123
                    }
                ],
                "properties": {
                    "weight": 4,
                    "hasArrowhead": true
                }
            },
            {
                "id": "elem-1779277738020-lkfqlt",
                "type": "line",
                "phaseId": "ph-3",
                "unitCode": 100,
                "coordinates": [
                    {
                        "lat": 33.304277410038594,
                        "lng": 35.569111063270434
                    },
                    {
                        "lat": 33.30076235345285,
                        "lng": 35.54798898805612
                    }
                ],
                "properties": {
                    "weight": 4,
                    "label": "קו B"
                }
            },
            {
                "id": "elem-1779295948262-vhuzvq",
                "type": "arc",
                "phaseId": "ph-2",
                "unitCode": 100,
                "coordinates": [
                    {
                        "lat": 33.19991324928074,
                        "lng": 35.61639884350678
                    },
                    {
                        "lat": 33.31130709819117,
                        "lng": 35.485201563313744
                    },
                    {
                        "lat": 33.34544323507435,
                        "lng": 35.60334780516294
                    }
                ],
                "properties": {
                    "radius": 18500,
                    "weight": 4,
                    "label": "גד״ב 10",
                    "radius2": 13500
                }
            }
        ]
    },
    {
        id: 'plan-2',
        name: { en: 'Defensive Posture Alpha', he: 'עמדת הגנה אלפא' },
        description: { en: 'Establish defensive perimeter around main forward operating base.', he: 'הקמת מתחם הגנתי סביב בסיס ההפעלה הקדמי המרכזי.' },
        status: 'draft',
        shared: 'private',
        createdBy: 'john',
        updatedBy: 'john',
        created: '2024-11-25T09:00:00Z',
        updated: '2024-11-25T09:00:00Z',
        dDay: null as unknown as string,
        hHour: null as unknown as string,
        phases: [],
        units: [],
        presentationItems: [],
        general: { en: 'General defensive overview.', he: 'סקירה כללית להגנה.' }
    }
];

// --- Static Space Establishment (כינון מרחב נייח) mock catalog ---
// Simulates the Nitor system-of-record catalog (PRD section 8 / 9.1).

function tagam(siteId: string, count: number, heights: number[]): import('./types').TagamDevice[] {
    return Array.from({ length: count }, (_, i) => ({
        tagamId: `${siteId}-tagam-${i + 1}`,
        siteId,
        deviceType: 'תג"מ קול',
        frequency: `${(38 + i * 2.5).toFixed(2)} MHz`,
        antennaHeightM: heights[i] ?? 18,
    }));
}

export const mockCommSites: CommSite[] = [
    { id: 'cs-1', siteName: { en: 'Mount Tabor Site', he: 'אתר תבור' }, position: { lat: 32.687, lng: 35.390 }, isEladAnchor: true, isMabanAnchor: true, eladAnchorIp: '10.14.1.1', mabanAnchorIp: '10.15.1.1', tagamDevices: tagam('cs-1', 2, [18, 24]), lastSyncAt: 'לפני 8 שניות', dataConfidence: 'live' },
    { id: 'cs-2', siteName: { en: 'Mount Gilboa Site', he: 'אתר גלבוע' }, position: { lat: 32.480, lng: 35.420 }, isEladAnchor: false, isMabanAnchor: true, mabanAnchorIp: '10.15.2.1', tagamDevices: tagam('cs-2', 1, [22]), lastSyncAt: 'לפני 14 שניות', dataConfidence: 'live' },
    { id: 'cs-3', siteName: { en: 'Western Carmel Site', he: 'אתר כרמל מערבי' }, position: { lat: 32.730, lng: 35.030 }, isEladAnchor: true, isMabanAnchor: false, eladAnchorIp: '10.14.3.1', tagamDevices: [], lastSyncAt: 'לפני 6 דקות', dataConfidence: 'stale' },
    { id: 'cs-4', siteName: { en: 'Turret Hill', he: 'גבעת התור' }, position: { lat: 32.050, lng: 35.230 }, isEladAnchor: true, isMabanAnchor: true, eladAnchorIp: '10.14.4.1', mabanAnchorIp: '10.15.4.1', tagamDevices: tagam('cs-4', 3, [16, 20, 26]), lastSyncAt: 'לפני 3 שניות', dataConfidence: 'live' },
    { id: 'cs-5', siteName: { en: 'Shiloh Overlook', he: 'מצפה שילה' }, position: { lat: 32.055, lng: 35.290 }, isEladAnchor: true, isMabanAnchor: false, eladAnchorIp: '10.14.5.1', tagamDevices: tagam('cs-5', 1, [19]), lastSyncAt: '—', dataConfidence: 'unknown' },
    { id: 'cs-6', siteName: { en: 'Elah Ridge', he: 'רכס האלה' }, position: { lat: 31.700, lng: 35.010 }, isEladAnchor: false, isMabanAnchor: true, mabanAnchorIp: '10.15.6.1', tagamDevices: tagam('cs-6', 2, [17, 23]), lastSyncAt: 'לפני 19 שניות', dataConfidence: 'live' },
    { id: 'cs-7', siteName: { en: 'Rotem Post', he: 'עמדת רותם' }, position: { lat: 31.100, lng: 34.950 }, isEladAnchor: true, isMabanAnchor: true, eladAnchorIp: '10.14.7.1', mabanAnchorIp: '10.15.7.1', tagamDevices: tagam('cs-7', 2, [20, 20]), lastSyncAt: 'לפני 11 שניות', dataConfidence: 'live' },
    { id: 'cs-8', siteName: { en: 'Zin Bluff', he: 'מצוק ציה' }, position: { lat: 30.750, lng: 34.950 }, isEladAnchor: false, isMabanAnchor: false, tagamDevices: tagam('cs-8', 1, [15]), lastSyncAt: 'לפני 5 דקות', dataConfidence: 'stale' },
    { id: 'cs-9', siteName: { en: 'Dead Sea Overlook', he: 'תצפית ים המלח' }, position: { lat: 31.350, lng: 35.400 }, isEladAnchor: false, isMabanAnchor: true, mabanAnchorIp: '10.15.9.1', tagamDevices: tagam('cs-9', 1, [21]), lastSyncAt: 'לפני 27 שניות', dataConfidence: 'live' },
    { id: 'cs-10', siteName: { en: 'Olive Hill', he: 'גבעת הזיתים' }, position: { lat: 31.900, lng: 35.350 }, isEladAnchor: true, isMabanAnchor: false, eladAnchorIp: '10.14.10.1', tagamDevices: [], lastSyncAt: 'לפני 4 שניות', dataConfidence: 'live' },
    { id: 'cs-11', siteName: { en: 'Jordan Valley Tower', he: 'מגדל הבקעה' }, position: { lat: 32.400, lng: 35.550 }, isEladAnchor: true, isMabanAnchor: true, eladAnchorIp: '10.14.11.1', mabanAnchorIp: '10.15.11.1', tagamDevices: tagam('cs-11', 4, [14, 18, 22, 28]), lastSyncAt: 'לפני 6 שניות', dataConfidence: 'live' },
    { id: 'cs-12', siteName: { en: 'Hatzeva Site', he: 'אתר חצבה' }, position: { lat: 30.550, lng: 35.200 }, isEladAnchor: true, isMabanAnchor: false, eladAnchorIp: '10.14.12.1', tagamDevices: tagam('cs-12', 1, [16]), lastSyncAt: '—', dataConfidence: 'unknown' },
];

function offsetPos(base: { lat: number; lng: number }, dLat: number, dLng: number) {
    return { lat: base.lat + dLat, lng: base.lng + dLng };
}

export const mockClientDevices: ClientDevice[] = (() => {
    const bySite = new Map(mockCommSites.map(s => [s.id, s]));
    const specs: Array<[string, 'elad' | 'maban', number, string, number, number]> = [
        // [siteId, type, index, callsign, dLat, dLng]
        ['cs-1', 'elad', 1, 'אלעד 3-A', 0.020, -0.025], ['cs-1', 'elad', 2, 'אלעד 3-B', -0.022, 0.018], ['cs-1', 'elad', 3, 'אלעד 3-C', -0.006, 0.032],
        ['cs-1', 'maban', 1, 'מב"ן 1-A', -0.020, -0.015], ['cs-1', 'maban', 2, 'מב"ן 1-B', -0.023, 0.022],
        ['cs-2', 'maban', 1, 'מב"ן 2-A', 0.018, -0.020], ['cs-2', 'maban', 2, 'מב"ן 2-B', -0.016, 0.022],
        ['cs-3', 'elad', 1, 'אלעד 1-A', 0.022, -0.022], ['cs-3', 'elad', 2, 'אלעד 1-B', -0.015, 0.018],
        ['cs-4', 'elad', 1, 'אלעד 4-A', 0.026, -0.028], ['cs-4', 'elad', 2, 'אלעד 4-B', 0.028, 0.005], ['cs-4', 'elad', 3, 'אלעד 4-C', -0.018, -0.022], ['cs-4', 'elad', 4, 'אלעד 4-D', -0.006, 0.034],
        ['cs-4', 'maban', 1, 'מב"ן 4-A', -0.020, -0.020], ['cs-4', 'maban', 2, 'מב"ן 4-B', -0.028, 0.006], ['cs-4', 'maban', 3, 'מב"ן 4-C', -0.016, 0.028],
        ['cs-5', 'elad', 1, 'אלעד 5-A', -0.017, 0.017],
        ['cs-6', 'maban', 1, 'מב"ן 6-A', 0.012, -0.024], ['cs-6', 'maban', 2, 'מב"ן 6-B', 0.026, 0.009], ['cs-6', 'maban', 3, 'מב"ן 6-C', -0.013, 0.026],
        ['cs-7', 'elad', 1, 'אלעד 7-A', 0.014, -0.026], ['cs-7', 'elad', 2, 'אלעד 7-B', 0.019, 0.021],
        ['cs-7', 'maban', 1, 'מב"ן 7-A', -0.021, -0.017], ['cs-7', 'maban', 2, 'מב"ן 7-B', -0.020, 0.023],
        ['cs-9', 'maban', 1, 'מב"ן 9-A', 0.011, -0.022], ['cs-9', 'maban', 2, 'מב"ן 9-B', -0.016, 0.018],
        ['cs-10', 'elad', 1, 'אלעד 10-A', 0.010, -0.024], ['cs-10', 'elad', 2, 'אלעד 10-B', 0.024, 0.011], ['cs-10', 'elad', 3, 'אלעד 10-C', -0.013, 0.025],
        ['cs-11', 'elad', 1, 'אלעד 11-A', 0.030, -0.028], ['cs-11', 'elad', 2, 'אלעד 11-B', 0.032, 0.004], ['cs-11', 'elad', 3, 'אלעד 11-C', -0.016, -0.024],
        ['cs-11', 'maban', 1, 'מב"ן 11-A', -0.019, -0.022], ['cs-11', 'maban', 2, 'מב"ן 11-B', -0.029, 0.005], ['cs-11', 'maban', 3, 'מב"ן 11-C', -0.022, 0.024], ['cs-11', 'maban', 4, 'מב"ן 11-D', 0.003, 0.036],
        ['cs-12', 'elad', 1, 'אלעד 12-A', -0.020, 0.020],
    ];
    return specs.map(([siteId, type, idx, name, dLat, dLng]) => {
        const site = bySite.get(siteId)!;
        return {
            clientId: `${siteId}-${type}-client-${idx}`,
            clientName: name,
            clientType: type,
            ipAddress: type === 'elad' ? `${site.eladAnchorIp?.replace(/\.1$/, '')}.${20 + idx}` : `${site.mabanAnchorIp?.replace(/\.1$/, '')}.${20 + idx}`,
            parentSiteId: siteId,
            position: offsetPos(site.position, dLat, dLng),
            connectionStatus: 'attached' as const,
            lastSeenAt: 'לפני כמה שניות',
        };
    });
})();

// --- Tikshov Common Operational Picture (תמ"כ תקשוב) ---
// See types.ts for TrackedDevice. Positions/status/timings below stand in for what would
// really be computed from Alma's LocationPing/DeviceStatusEvent history (PRD 7.2/7.3).

const TIKSHOV_DEVICE_TYPES: TrackedDeviceType[] = ['sheked', 'dual', 'setz', 'maban', 'setz_modem', 'elad_green'];
const TIKSHOV_CALLSIGN_ROOTS = ['צבי', 'ברק', 'נמר', 'דרור', 'שחר', 'עיט', 'ינשוף', 'זאב', 'נשר', 'יעל', 'רימון', 'אלון', 'תמר', 'דקל', 'שיזף', 'אורן', 'חוגלה', 'שלדג', 'קרנף', 'סופה'];

// Deterministic pseudo-random in [0, 1) — used instead of Math.random() so the mock map
// looks the same on every reload (stable for screenshots/demoing).
function seededFrac(seed: number): number {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
}

// Each brigade-level unit anchors the area its own tree's devices scatter around; a
// unit without its own anchor inherits its nearest brigade ancestor's (see below).
const BRIGADE_AREA_ANCHORS: Record<number, GeoCoordinate> = {
    100: { lat: 33.05, lng: 35.35 },
    200: { lat: 32.75, lng: 35.05 },
    300: { lat: 32.40, lng: 35.55 },
    400: { lat: 31.95, lng: 35.25 },
    500: { lat: 31.35, lng: 35.15 },
    2100: { lat: 30.60, lng: 34.90 },
    2200: { lat: 29.75, lng: 34.98 },
};

function areaAnchorForUnit(unitCode: number): GeoCoordinate {
    let code: number | undefined = unitCode;
    while (code !== undefined) {
        if (BRIGADE_AREA_ANCHORS[code]) return BRIGADE_AREA_ANCHORS[code];
        const unit = mockUnits.find(u => u.code === code);
        code = unit?.parentCode ? Number(unit.parentCode) : undefined;
    }
    return { lat: 31.5, lng: 35.0 }; // fallback: roughly the country's center
}

const fireBrigadePlatoons = fireBrigadeSubTree.filter(u => u.type === 'platoon').map(u => u.code);
const fireBrigadeBattalions = fireBrigadeSubTree.filter(u => u.type === 'battalion').map(u => u.code);
const division2Platoons = division2BrigadeSubTree.filter(u => u.type === 'platoon').map(u => u.code);
const division2Battalions = division2BrigadeSubTree.filter(u => u.type === 'battalion').map(u => u.code);

// [unitCode, deviceCount] — brigade/division HQ posts get a couple of vehicle-mounted
// devices each, battalions get one, and platoons (the dismounted forces) get two apiece.
const TIKSHOV_DEVICE_ALLOCATIONS: Array<[number, number]> = [
    [1000, 1], [2000, 1],
    [100, 3], [200, 3], [300, 3], [500, 3], [2200, 3],
    [400, 2], [2100, 2],
    ...fireBrigadeBattalions.map((c): [number, number] => [c, 1]),
    ...division2Battalions.map((c): [number, number] => [c, 1]),
    ...fireBrigadePlatoons.map((c): [number, number] => [c, 2]),
    ...division2Platoons.map((c): [number, number] => [c, 2]),
];

export const mockTrackedDevices: TrackedDevice[] = (() => {
    const devices: TrackedDevice[] = [];
    let runningIndex = 0;
    for (const [unitCode, count] of TIKSHOV_DEVICE_ALLOCATIONS) {
        const anchor = areaAnchorForUnit(unitCode);
        for (let n = 0; n < count; n++) {
            const idx = runningIndex++;
            const deviceType = TIKSHOV_DEVICE_TYPES[idx % TIKSHOV_DEVICE_TYPES.length];
            const bucket = idx % 10;
            const connectionStatus = bucket < 7 ? 'active' : bucket < 9 ? 'inactive' : 'flapping';

            let lastReportSecondsAgo: number;
            let statusDurationMinutes: number;
            let statusTransitions24h: number | undefined;

            if (connectionStatus === 'active') {
                lastReportSecondsAgo = 3 + (idx % 12) * 4; // 3s–47s: comfortably inside the 15/30s SLA
                statusDurationMinutes = 20 + (idx * 37) % 540; // 20 min – 9h holding active
            } else if (connectionStatus === 'inactive') {
                // Spread from just past the inactivity threshold to several days dark, so
                // both "just went quiet" and "dark for 24h+" (US-11) show up in the table.
                const spreadMinutes = [7, 12, 25, 48, 90, 180, 340, 620, 1000, 1500, 2200, 3000];
                statusDurationMinutes = spreadMinutes[idx % spreadMinutes.length];
                lastReportSecondsAgo = statusDurationMinutes * 60;
            } else {
                lastReportSecondsAgo = 15 + (idx % 5) * 20; // recently heard from, but unstable
                statusDurationMinutes = 4 + (idx % 6) * 3; // last flip was a few minutes ago
                statusTransitions24h = 4 + (idx % 5); // flapped 4–8 times in the last day
            }

            const dataConfidence =
                connectionStatus === 'active' ? 'live'
                    : connectionStatus === 'flapping' ? 'stale'
                        : statusDurationMinutes < 30 ? 'stale' : 'unknown';

            const root = TIKSHOV_CALLSIGN_ROOTS[idx % TIKSHOV_CALLSIGN_ROOTS.length];
            const callsign = `${root} ${10 + (idx % 90)}`;
            const dLat = (seededFrac(idx * 3.1 + 1) - 0.5) * 0.05;
            const dLng = (seededFrac(idx * 7.7 + 1) - 0.5) * 0.05;

            devices.push({
                deviceId: `td-${unitCode}-${n}`,
                callsign,
                deviceType,
                deviceSubtype: deviceType === 'elad_green' && idx % 3 === 0 ? 'ELAD-GRN-V2' : undefined,
                unitCode,
                position: { lat: anchor.lat + dLat, lng: anchor.lng + dLng },
                connectionStatus,
                lastReportSecondsAgo,
                statusDurationMinutes,
                statusTransitions24h,
                dataConfidence,
            });
        }
    }
    return devices;
})();