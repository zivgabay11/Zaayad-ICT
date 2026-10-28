import { HeadquartersEntity, HeadquartersLevel } from '../../common/utilities/types';
import { mockUnits } from '../../common/utilities/mockData';

// Builds the hierarchical (אוגדה → חטיבה → גדוד) tree behind the "מפקדות וחפ"קים" overview
// screen. The tree is the org chart itself, not just the units that happen to own a
// transferred entity, so a brigade with no headquarters still appears (and the user can see
// at a glance which units have nothing in ניהו"ק yet).

const LEVELS: HeadquartersLevel[] = ['division', 'brigade', 'battalion'];

export interface HeadquartersTreeNode {
    unitCode: number;
    level: HeadquartersLevel;
    headquarters: HeadquartersEntity[];
    commandPosts: HeadquartersEntity[];
    children: HeadquartersTreeNode[];
}

const isLevel = (type: string | undefined): type is HeadquartersLevel =>
    !!type && (LEVELS as string[]).includes(type);

function buildNode(unitCode: number, level: HeadquartersLevel, entities: HeadquartersEntity[]): HeadquartersTreeNode {
    const children = mockUnits
        .filter(u => Number(u.parentCode) === unitCode && isLevel(u.type))
        .sort((a, b) => a.code - b.code)
        .map(u => buildNode(u.code, u.type as HeadquartersLevel, entities));

    const own = entities.filter(e => e.unitCode === unitCode);
    return {
        unitCode,
        level,
        headquarters: own.filter(e => e.kind === 'headquarters'),
        commandPosts: own.filter(e => e.kind === 'commandPost'),
        children,
    };
}

// `rootUnitCode` is the session's own unit. A division/brigade/battalion becomes the single
// root; a unit above them (the command) contributes its divisions as roots; anything below
// battalion level (companies/platoons have no headquarters tracked here) yields no tree.
export function buildHeadquartersTree(rootUnitCode: number, entities: HeadquartersEntity[]): HeadquartersTreeNode[] {
    const root = mockUnits.find(u => u.code === rootUnitCode);
    if (!root) return [];
    if (isLevel(root.type)) return [buildNode(root.code, root.type, entities)];
    return mockUnits
        .filter(u => Number(u.parentCode) === root.code && isLevel(u.type))
        .sort((a, b) => a.code - b.code)
        .map(u => buildNode(u.code, u.type as HeadquartersLevel, entities));
}

export function flattenTree(nodes: HeadquartersTreeNode[]): HeadquartersTreeNode[] {
    return nodes.flatMap(n => [n, ...flattenTree(n.children)]);
}
