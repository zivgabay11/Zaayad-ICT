import { Cell } from './types';

// The fixed, global "תא" (Cell) list — one shared list for everyone, mirrors roles.ts's
// exact shape. Combined with Unit, this is what now drives app behavior (Personal Task
// Log filtering, the Planning nav's telecom-specific swap) — Role no longer does.

export const ALL_CELLS: Cell[] = ['strike', 'support', 'control', 'communications', 'intelligence', 'logistics'];

export function getCellLabel(t: (key: string) => string, cell: Cell): string {
    return t(`cells.${cell}`);
}
