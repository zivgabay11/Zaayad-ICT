import { BumDmatz, BumDmatzStatus } from '../../common/utilities/types';
import { mockUnits } from '../../common/utilities/mockData';

// Domain constants + pure helpers for the דמ"צים sub-section of Bum Manager: equipment & means
// requests a unit raises to the unit above it (the "superior" in the echelon tree) and that the
// superior works through. One kanban column per lifecycle status.

export const DMATZ_STATUS_ORDER: BumDmatzStatus[] = ['submitted', 'underReview', 'approved', 'supplied', 'rejected'];

export const DMATZ_STATUS_STRIPE: Record<BumDmatzStatus, string> = {
    submitted: '#38bdf8',
    underReview: '#facc15',
    approved: '#3dd68c',
    supplied: '#2b9a66',
    rejected: '#ef4444',
};

// The category panel splits the דמ"צים the viewing unit can see into the two directions.
export type DmatzDirection = 'raised' | 'received';
export const DMATZ_DIRECTIONS: Array<{ key: DmatzDirection; color: string }> = [
    { key: 'raised', color: '#3f6b9a' },
    { key: 'received', color: '#7a4aa0' },
];

// The unit a unit raises its דמ"צים to: its parent in the echelon tree (none for the top unit).
export function getSuperiorUnitCode(unitCode: number): number | undefined {
    const parent = mockUnits.find(u => u.code === unitCode)?.parentCode;
    return parent === undefined ? undefined : Number(parent);
}

export const isDmatzRaisedBy = (d: BumDmatz, unitCode: number) => d.fromUnitCode === unitCode;
export const isDmatzReceivedBy = (d: BumDmatz, unitCode: number) => d.toUnitCode === unitCode;

// A unit sees what it raised and what its subordinates raised to it.
export const isDmatzVisibleTo = (d: BumDmatz, unitCode: number) => isDmatzRaisedBy(d, unitCode) || isDmatzReceivedBy(d, unitCode);

export const dmatzDirectionOf = (d: BumDmatz, unitCode: number): DmatzDirection => (isDmatzRaisedBy(d, unitCode) ? 'raised' : 'received');

export const isDmatzOpen = (d: BumDmatz) => d.status === 'submitted' || d.status === 'underReview';

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Files up to this size keep their content (as a data URL) so they can be downloaded again
// after a reload; anything bigger keeps just its name/size — the prototype stores everything
// in localStorage, which has a small quota.
export const DMATZ_MAX_STORED_FILE_BYTES = 1_500_000;
