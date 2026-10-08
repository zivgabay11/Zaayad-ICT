import { CommSiteService, ServiceSubItem, CommSiteServiceType } from './types';

// Domain constants + pure helpers for Comm Site Service Monitoring (ניטור שירותים).
// See PRD Sections 3.2/3.4/7 for the source-of-truth this mirrors.

export const COMM_SITE_SERVICE_TYPES: CommSiteServiceType[] = ['cellular', 'lcn_network', 'roip', 'elad', 'maban', 'components'];

// A distinct color per service type — same role as COMBAT_LOG_TYPE_COLORS / DEVICE_TYPE_COLORS
// elsewhere: pure identity, never a readiness signal (that's what `status` is for).
export const SERVICE_TYPE_COLORS: Record<CommSiteServiceType, string> = {
    cellular: '#38bdf8',
    lcn_network: '#f59e0b',
    roip: '#f472b6',
    elad: '#8b5cf6',
    maban: '#10b981',
    components: '#94a3b8',
};

const STALE_SLA_MS = 60 * 1000; // PRD 8.2 — reuses the companion PRD's 60s ceiling, per-service

export function isServiceStale(service: CommSiteService, nowMs: number): boolean {
    return nowMs - new Date(service.lastUpdatedAt).getTime() > STALE_SLA_MS;
}

export function getServicesForSite(siteId: string, allServices: CommSiteService[]): CommSiteService[] {
    return allServices
        .filter(s => s.siteId === siteId)
        .sort((a, b) => COMM_SITE_SERVICE_TYPES.indexOf(a.serviceType) - COMM_SITE_SERVICE_TYPES.indexOf(b.serviceType));
}

export function getSubItemsForService(serviceId: string, allSubItems: ServiceSubItem[]): ServiceSubItem[] {
    return allSubItems.filter(i => i.serviceId === serviceId);
}

// "Up to three key metrics" per card (PRD 5.3/10.2) — which metric keys to surface, and in
// what order, per service type. Values themselves live on CommSiteService.metrics.
export const SERVICE_METRIC_KEYS: Record<CommSiteServiceType, string[]> = {
    cellular: ['active_sectors_of_total', 'equipment_count'],
    lcn_network: ['tx_rx_count', 'bandwidth_used_of_total'],
    roip: ['active_extensions_of_total', 'total_records'],
    elad: ['client_count', 'anchor_ip'],
    maban: ['client_count', 'anchor_ip'],
    components: ['component_count'],
};

// Drill-down table columns (PRD 5.4/7.2) — each service type's sub-items carry different
// payload fields; `status` is always appended as the final column for every type.
export const SUB_ITEM_PAYLOAD_COLUMNS: Record<CommSiteServiceType, string[]> = {
    cellular: ['sector_id', 'azimuth'],
    lcn_network: ['unit', 'direction'],
    roip: ['extension_id', 'level_height', 'band_designation', 'remote_unit'],
    elad: ['client_id', 'ip'],
    maban: ['client_id', 'ip'],
    // Components (רכיבים) are the site's תג"מ radio positions — device name, type, the
    // frequency it's calibrated to, and its antenna's mount height (PRD 7.2 payload).
    components: ['device_name', 'device_type', 'frequency', 'antenna_height'],
};
