// Generic CSV download helper, shared by any feature's "export/download report" action
// (Combat Log's report export, Comm Site Service Monitoring's per-service drill-down export).

export function downloadCsv(headers: string[], rows: string[][], filename: string) {
    const escapeCell = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');

    // UTF-8 BOM so Excel renders Hebrew correctly instead of mojibake.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
