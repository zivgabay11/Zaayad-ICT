import { SystemUnit } from './types';

export const LEVEL_1_COLOR = '#0EA5E9'; // Cyan
export const LEVEL_0_COLOR = '#A855F7'; // Purple

export const CHILD_COLORS = [
    '#22C55E', // Green
    '#3B82F6', // Blue
    '#EAB308', // Yellow
    '#EF4444', // Red
    '#4B5563', // Dark Grey
    '#9CA3AF'  // Light Grey
];

/**
 * Returns the color for a specific unit relative to the session's unit.
 */
export function getUnitColor(
    targetUnitCode: number,
    sessionUnit: SystemUnit | null,
    planUnitCodes: number[],
    allUnits: { code: number; type: string; parentCode?: string }[]
): string {
    if (!sessionUnit) return '#9CA3AF'; // fallback

    // Level 0: The unit of the current user session
    if (targetUnitCode === sessionUnit.code) {
        return LEVEL_0_COLOR;
    }

    const sessionUnitFull = allUnits.find(u => u.code === sessionUnit.code);

    // Level 1: Parent of the current user session
    if (sessionUnitFull && sessionUnitFull.parentCode && targetUnitCode.toString() === sessionUnitFull.parentCode) {
        return LEVEL_1_COLOR;
    }

    // Children (Level -1) logic:
    // Gather all children of the session unit that are present in the plan
    const sessionChildrenInPlan = planUnitCodes
        .filter(code => {
            const fullUnit = allUnits.find(u => u.code === code);
            return fullUnit && fullUnit.parentCode === sessionUnit.code.toString();
        })
        .sort((a, b) => a - b);

    const childIndex = sessionChildrenInPlan.indexOf(targetUnitCode);
    if (childIndex !== -1) {
        return CHILD_COLORS[childIndex % CHILD_COLORS.length];
    }

    // If unit is completely outside this immediate family, just return a fallback
    return '#E5E7EB';
}
