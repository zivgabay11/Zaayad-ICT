import { mockUnits } from '../../common/utilities/mockData';

// Helpers for the הנחיות מפקד sub-section: the echelon tree beneath the viewing unit (which is
// also its category filter) and the commander's role per echelon.

export interface UnitTreeNode {
    code: number;
    depth: number; // 0 = the viewing unit itself
}

// The unit followed by everything beneath it, depth-first, so the list reads like the tree.
export function getUnitTree(rootCode: number): UnitTreeNode[] {
    const result: UnitTreeNode[] = [];
    const visit = (code: number, depth: number) => {
        result.push({ code, depth });
        mockUnits.filter(u => Number(u.parentCode) === code).forEach(child => visit(child.code, depth + 1));
    };
    visit(rootCode, 0);
    return result;
}

// Translation key of the commander's role, by the echelon of the unit he commands.
export function getCommanderRoleKey(unitCode: number): string {
    return mockUnits.find(u => u.code === unitCode)?.type ?? 'unit';
}
