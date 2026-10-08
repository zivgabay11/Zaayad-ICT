import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Signal, Network, Rss, Antenna, Satellite, Cpu, AlertTriangle } from 'lucide-react';
import { useStaticSpaceContext } from '../context/StaticSpaceContext';
import { mockCommSites, mockCommSiteServices, mockServiceSubItems } from '../utilities/mockData';
import {
    getServicesForSite, getSubItemsForService, isServiceStale,
    SERVICE_TYPE_COLORS, SERVICE_METRIC_KEYS, COMM_SITE_SERVICE_TYPES,
} from '../utilities/commSiteService';
import { CommSiteServiceType, CommSiteServiceStatus } from '../utilities/types';
import { formatRelativeSeconds } from '../utilities/formatting';
import { ServiceDrillDownTable } from './ServiceDrillDownTable';

// Comm Site Service Monitoring page (PRD "Comm Site Service Monitoring"): the deep,
// per-service breakdown that opens for one Comm Site — from the map popup's "הרחב"
// button, or a double-click on its row in the Static Space Establishment table (PRD 5.1).
// Read-only, consistent with Nitor being the sole source of truth (Section 6/9).

const SERVICE_ICONS: Record<CommSiteServiceType, React.ElementType> = {
    cellular: Signal,
    lcn_network: Network,
    roip: Rss,
    elad: Antenna,
    maban: Satellite,
    components: Cpu,
};

const STATUS_COLORS: Record<CommSiteServiceStatus, string> = {
    healthy: '#34d399',
    degraded: '#f0b429',
    down: '#dc2626',
};

function readSessionUnitLabel(): string | null {
    try {
        const raw = localStorage.getItem('session');
        const session = raw ? JSON.parse(raw) : null;
        return session?.unit?.code ? String(session.unit.code) : null;
    } catch {
        return null;
    }
}

export const CommSiteDetailPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { openSiteDetailId, closeSiteDetail } = useStaticSpaceContext();
    const [openServiceType, setOpenServiceType] = useState<CommSiteServiceType | null>(null);
    const [typeFilter, setTypeFilter] = useState<CommSiteServiceType | 'all'>('all');

    // Reset per-page UI state whenever a different site is opened.
    useEffect(() => {
        setOpenServiceType(null);
        setTypeFilter('all');
    }, [openSiteDetailId]);

    if (!openSiteDetailId) return null;
    const site = mockCommSites.find(s => s.id === openSiteDetailId);
    if (!site) return null;

    const services = getServicesForSite(site.id, mockCommSiteServices);
    const visibleServices = typeFilter === 'all' ? services : services.filter(s => s.serviceType === typeFilter);
    const openService = services.find(s => s.serviceType === openServiceType) || null;
    const openSubItems = openService ? getSubItemsForService(openService.serviceId, mockServiceSubItems) : [];
    const now = Date.now();
    const pageLastUpdatedMs = services.length ? Math.max(...services.map(s => new Date(s.lastUpdatedAt).getTime())) : now;
    const unitLabel = readSessionUnitLabel();

    return (
        // Positioned below the header, after the icon sidebar, so this stays part of the
        // app's own chrome instead of a disconnected full-screen takeover — the header and
        // sidebar remain visible exactly as on every other screen.
        <div
            className="fixed inset-y-0 start-16 end-0 z-50 bg-slate-50 dark:bg-zinc-950 overflow-y-auto animate-in fade-in duration-200"
            style={{ top: '52px' }}
        >
            <div className="max-w-6xl mx-auto p-6">
                <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{site.siteName[i18n.language] || site.siteName.en}</h1>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-500">{t('commSiteDetail.pageSubtitle')}</p>
                    </div>
                    <button
                        onClick={closeSiteDetail}
                        className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors font-medium shrink-0"
                    >
                        <X className="w-4 h-4" /> {t('commSiteDetail.closeDetail')}
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-zinc-500 mb-5">
                    <span>{t('commSiteDetail.lastUpdated')}: {formatRelativeSeconds((now - pageLastUpdatedMs) / 1000, t)}</span>
                    {unitLabel && <span>· {t('commSiteDetail.unitContext')}: {unitLabel}</span>}
                </div>

                {services.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-5">
                        <button
                            onClick={() => setTypeFilter('all')}
                            className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${typeFilter === 'all' ? 'bg-primary/10 text-primary border-primary/40' : 'text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'}`}
                        >
                            {t('commSiteDetail.allTypesFilter')}
                        </button>
                        {COMM_SITE_SERVICE_TYPES.filter(type => services.some(s => s.serviceType === type)).map(type => {
                            const color = SERVICE_TYPE_COLORS[type];
                            const active = typeFilter === type;
                            return (
                                <button
                                    key={type}
                                    onClick={() => setTypeFilter(type)}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors"
                                    style={active ? { background: `${color}1f`, color, borderColor: `${color}55` } : { borderColor: 'inherit' }}
                                >
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                                    {t(`commSiteDetail.serviceTypes.${type}`)}
                                </button>
                            );
                        })}
                    </div>
                )}

                {services.length === 0 ? (
                    <div className="text-center py-16 text-sm text-slate-400 dark:text-zinc-500">{t('commSiteDetail.noServices')}</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {visibleServices.map(service => {
                            const Icon = SERVICE_ICONS[service.serviceType];
                            const color = SERVICE_TYPE_COLORS[service.serviceType];
                            const statusColor = STATUS_COLORS[service.status];
                            const stale = isServiceStale(service, now);
                            const isOpen = openServiceType === service.serviceType;
                            const secondsAgo = (now - new Date(service.lastUpdatedAt).getTime()) / 1000;

                            return (
                                <button
                                    key={service.serviceId}
                                    onClick={() => setOpenServiceType(isOpen ? null : service.serviceType)}
                                    className={`text-start rounded-2xl border p-4 transition-colors bg-white dark:bg-zinc-900 ${isOpen ? 'border-primary/60 ring-1 ring-primary/30' : 'border-slate-200 dark:border-zinc-800 hover:border-primary/40'}`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ background: `${color}1f`, color }}>
                                                <Icon className="w-4 h-4" />
                                            </span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{t(`commSiteDetail.serviceTypes.${service.serviceType}`)}</span>
                                        </div>
                                        <span
                                            className="inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0"
                                            style={{ background: `${statusColor}1f`, color: statusColor }}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusColor }} />
                                            {t(`commSiteDetail.status.${service.status}`)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-2.5">
                                        {SERVICE_METRIC_KEYS[service.serviceType].map(key => (
                                            <div key={key} className="bg-slate-50 dark:bg-zinc-800/60 rounded-lg px-2.5 py-1.5">
                                                <div className="text-[10px] text-slate-400 dark:text-zinc-500">{t(`commSiteDetail.metrics.${key}`)}</div>
                                                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-200">{service.metrics[key]}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between text-[10.5px] text-slate-400 dark:text-zinc-500">
                                        <span className={stale ? 'text-amber-500 dark:text-amber-400 font-semibold' : ''}>
                                            {t('commSiteDetail.lastUpdated')}: {formatRelativeSeconds(secondsAgo, t)}
                                        </span>
                                        {service.noLongerReporting && (
                                            <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400 font-semibold">
                                                <AlertTriangle className="w-3 h-3" /> {t('commSiteDetail.noLongerReporting')}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {openService && (
                    <ServiceDrillDownTable service={openService} subItems={openSubItems} onClose={() => setOpenServiceType(null)} />
                )}
            </div>
        </div>
    );
};
