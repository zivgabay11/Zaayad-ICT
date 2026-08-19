import { CombatLogEvent } from '../../common/utilities/types';
import { downloadCsv } from '../../common/utilities/csvExport';

// Report export (PRD 6.7/FR-26-28): exports the currently filtered view as a CSV that
// Excel opens natively — no charting library dependency needed for a flat report export.

export function exportCombatLogToCsv(events: CombatLogEvent[], logTypeLabel: (type: string) => string) {
    const headers = ['Event ID', 'Log Type', 'Title', 'Start Time', 'End Time', 'Status', 'Reporter'];
    const rows = events.map(e => [
        e.id,
        logTypeLabel(e.type),
        e.title,
        new Date(e.start).toLocaleString(),
        e.end ? new Date(e.end).toLocaleString() : '',
        e.status,
        e.reporterUserName,
    ]);
    downloadCsv(headers, rows, `combat-log-export-${new Date().toISOString().slice(0, 10)}.csv`);
}
