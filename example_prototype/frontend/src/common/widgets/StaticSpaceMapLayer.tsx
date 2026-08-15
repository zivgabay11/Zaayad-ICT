import React, { useMemo } from 'react';
import { Marker, Popup, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { useStaticSpaceContext } from '../context/StaticSpaceContext';
import { mockCommSites, mockClientDevices } from '../utilities/mockData';
import { commSiteIconSvg } from '../utilities/commSiteIcon';

// Renders the "Static Space Establishment" map layer (PRD 6.1/6.2/6.4/6.5) as a child of
// react-leaflet's <MapContainer>: a marker per curated Comm Site, the Elad/Maban topology
// lines + client markers when their filter is active, and the per-site summary popup.

const CONFIDENCE_DOT: Record<string, string> = { live: '#34d399', stale: '#f0b429', unknown: '#71717a' };
const ELAD_COLOR = '#8b5cf6';
const MABAN_COLOR = '#10b981';

function siteDivIcon(stale: boolean) {
    const html = `
        <div style="position:relative; width:34px; height:34px; border-radius:10px;
            background:linear-gradient(160deg,#0f4550,#082e36); border:1.5px solid #00a2c7;
            display:flex; align-items:center; justify-content:center; color:#00a2c7;
            box-shadow:0 3px 10px rgba(0,0,0,.5);">
            ${commSiteIconSvg('#00a2c7', 18)}
            ${stale ? `<div style="position:absolute; top:-5px; inset-inline-start:-5px; width:13px; height:13px; border-radius:50%; background:#f0b429; border:2px solid #09090b;"></div>` : ''}
        </div>
    `;
    return L.divIcon({ html, className: '', iconSize: [34, 34], iconAnchor: [17, 34] });
}

function clientDivIcon(color: string) {
    const html = `<div style="width:14px; height:14px; border-radius:50%; background:${color}; border:2px solid #09090b; box-shadow:0 1px 4px rgba(0,0,0,.5);"></div>`;
    return L.divIcon({ html, className: '', iconSize: [14, 14], iconAnchor: [7, 7] });
}

export const StaticSpaceMapLayer: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { unitSiteIds, layerOn, eladFilterOn, mabanFilterOn } = useStaticSpaceContext();

    const activeSites = useMemo(
        () => mockCommSites.filter(s => unitSiteIds.includes(s.id)),
        [unitSiteIds]
    );

    if (!layerOn) return null;

    return (
        <>
            {activeSites.map(site => {
                const icon = siteDivIcon(site.dataConfidence === 'stale');
                const eladClients = eladFilterOn && site.isEladAnchor
                    ? mockClientDevices.filter(c => c.parentSiteId === site.id && c.clientType === 'elad')
                    : [];
                const mabanClients = mabanFilterOn && site.isMabanAnchor
                    ? mockClientDevices.filter(c => c.parentSiteId === site.id && c.clientType === 'maban')
                    : [];
                const name = site.siteName[i18n.language] || site.siteName.en;

                return (
                    <React.Fragment key={site.id}>
                        <Marker position={[site.position.lat, site.position.lng]} icon={icon}>
                            <Tooltip permanent direction="bottom" offset={[0, 2]} opacity={1} className="commsite-label">{name}</Tooltip>
                            <Popup className="commsite-popup" minWidth={260}>
                                <div className="px-1 py-0.5">
                                    <div className="font-bold text-[13.5px] mb-2">{name}</div>
                                    <div className="flex gap-1.5 flex-wrap mb-2.5">
                                        {site.isEladAnchor && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,.15)', color: ELAD_COLOR }}>{t('staticSpace.eladAnchor')}</span>}
                                        {site.isMabanAnchor && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.15)', color: MABAN_COLOR }}>{t('staticSpace.mabanAnchor')}</span>}
                                        {!site.isEladAnchor && !site.isMabanAnchor && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-zinc-700 dark:text-zinc-400">{t('staticSpace.tagamRelayOnly')}</span>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 text-[11.5px] mb-2">
                                        <div><span className="text-slate-400">{t('staticSpace.tagam')}: </span><b>{site.tagamDevices.length ? `${site.tagamDevices.length} (${site.tagamDevices.map(d => `${d.antennaHeightM}${t('staticSpace.meterAbbr')}`).join(', ')})` : '—'}</b></div>
                                        <div><span className="text-slate-400">{t('staticSpace.confidenceLabel')}: </span><b style={{ color: CONFIDENCE_DOT[site.dataConfidence] }}>{t(`staticSpace.confidence.${site.dataConfidence}`)}</b></div>
                                        <div><span className="text-slate-400">{t('staticSpace.eladClients')}: </span><b>{site.isEladAnchor ? mockClientDevices.filter(c => c.parentSiteId === site.id && c.clientType === 'elad').length : '—'}</b></div>
                                        <div><span className="text-slate-400">{t('staticSpace.mabanClients')}: </span><b>{site.isMabanAnchor ? mockClientDevices.filter(c => c.parentSiteId === site.id && c.clientType === 'maban').length : '—'}</b></div>
                                        <div><span className="text-slate-400">{t('staticSpace.eladIp')}: </span><b className="font-mono">{site.eladAnchorIp || '—'}</b></div>
                                        <div><span className="text-slate-400">{t('staticSpace.mabanIp')}: </span><b className="font-mono">{site.mabanAnchorIp || '—'}</b></div>
                                    </div>
                                    <div className="text-[10.5px] text-slate-400 pt-1.5 border-t border-slate-200 dark:border-zinc-700">
                                        {t('staticSpace.lastSync')}: {site.lastSyncAt}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>

                        {eladClients.map(c => (
                            <React.Fragment key={c.clientId}>
                                <Polyline
                                    positions={[[site.position.lat, site.position.lng], [c.position.lat, c.position.lng]]}
                                    pathOptions={{ color: ELAD_COLOR, weight: 1.6, dashArray: '5 4', opacity: 0.85 }}
                                />
                                <Marker position={[c.position.lat, c.position.lng]} icon={clientDivIcon(ELAD_COLOR)}>
                                    <Tooltip permanent direction="bottom" offset={[0, 2]} opacity={1} className="commsite-client-label">{c.clientName}</Tooltip>
                                    <Popup className="commsite-popup" minWidth={140}>
                                        <div className="text-[12px] font-semibold">{c.clientName}</div>
                                        <div className="text-[10.5px] font-mono text-slate-400">{c.ipAddress}</div>
                                    </Popup>
                                </Marker>
                            </React.Fragment>
                        ))}
                        {mabanClients.map(c => (
                            <React.Fragment key={c.clientId}>
                                <Polyline
                                    positions={[[site.position.lat, site.position.lng], [c.position.lat, c.position.lng]]}
                                    pathOptions={{ color: MABAN_COLOR, weight: 1.6, dashArray: '5 4', opacity: 0.85 }}
                                />
                                <Marker position={[c.position.lat, c.position.lng]} icon={clientDivIcon(MABAN_COLOR)}>
                                    <Tooltip permanent direction="bottom" offset={[0, 2]} opacity={1} className="commsite-client-label">{c.clientName}</Tooltip>
                                    <Popup className="commsite-popup" minWidth={140}>
                                        <div className="text-[12px] font-semibold">{c.clientName}</div>
                                        <div className="text-[10.5px] font-mono text-slate-400">{c.ipAddress}</div>
                                    </Popup>
                                </Marker>
                            </React.Fragment>
                        ))}
                    </React.Fragment>
                );
            })}
        </>
    );
};
