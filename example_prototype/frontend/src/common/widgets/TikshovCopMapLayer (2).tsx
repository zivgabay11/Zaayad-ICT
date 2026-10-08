import React, { useMemo } from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { useTikshovContext } from '../context/TikshovContext';
import { mockTrackedDevices, mockUnits } from '../utilities/mockData';
import { trackedDeviceIconSvg, DEVICE_TYPE_COLORS } from '../utilities/trackedDeviceIcon';
import { formatUnitName, formatRelativeSeconds, formatRelativeMinutes } from '../utilities/formatting';
import { TrackedDevice, TrackedDeviceType, ConnectionStatus } from '../utilities/types';

// Renders the "Tikshov Common Operational Picture" map layer (PRD 5.1/5.5/10.2) as a
// child of react-leaflet's <MapContainer>: one marker per tracked device in scope, with
// a dedicated icon per device type, a ghost/muted treatment once inactive (3.8), and a
// pulsing ring on flapping devices — no color implies readiness, only connection state.
//
// Markers are deliberately round, solid-color badges — the opposite silhouette from the
// Static Space Establishment layer's dark square badges — so the two layers stay visually
// distinct at a glance even when toggled on together over a dense area.

const INACTIVE_FILL_COLOR = '#52525b';
const FLAPPING_RING_COLOR = '#f0b429';

function trackedDeviceDivIcon(type: TrackedDeviceType, status: ConnectionStatus) {
    const baseColor = DEVICE_TYPE_COLORS[type];
    const isInactive = status === 'inactive';
    const isFlapping = status === 'flapping';
    const fill = isInactive ? INACTIVE_FILL_COLOR : baseColor;
    const ringColor = isFlapping ? FLAPPING_RING_COLOR : 'rgba(9,9,11,.55)';
    const html = `
        <div style="position:relative; width:20px; height:20px; border-radius:50%;
            background:${fill}; border:1.5px solid ${ringColor}; opacity:${isInactive ? 0.55 : 1};
            display:flex; align-items:center; justify-content:center;
            box-shadow:0 2px 6px rgba(0,0,0,.5);
            ${isFlapping ? 'animation: tikshov-flap-pulse 1.4s ease-in-out infinite;' : ''}">
            ${trackedDeviceIconSvg(type, '#fff', 11)}
        </div>
    `;
    return L.divIcon({ html, className: '', iconSize: [20, 20], iconAnchor: [10, 20] });
}

const STATUS_TEXT_COLOR: Record<ConnectionStatus, string> = {
    active: '#34d399',
    inactive: '#a1a1aa',
    flapping: '#f0b429',
};

export const TikshovCopMapLayer: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { layerOn, deviceTypeFilters, scopedUnitCodes } = useTikshovContext();

    const visibleDevices = useMemo<TrackedDevice[]>(() => {
        if (!layerOn) return [];
        return mockTrackedDevices.filter(d => scopedUnitCodes.includes(d.unitCode) && deviceTypeFilters[d.deviceType]);
    }, [layerOn, deviceTypeFilters, scopedUnitCodes]);

    if (!layerOn) return null;

    return (
        <>
            {visibleDevices.map(device => {
                const icon = trackedDeviceDivIcon(device.deviceType, device.connectionStatus);
                const unit = mockUnits.find(u => u.code === device.unitCode);

                return (
                    <Marker key={device.deviceId} position={[device.position.lat, device.position.lng]} icon={icon}>
                        <Tooltip permanent direction="bottom" offset={[0, 1]} opacity={1} className="tikshov-label">
                            {device.callsign}
                        </Tooltip>
                        <Popup className="commsite-popup" minWidth={230}>
                            <div className="px-1 py-0.5">
                                <div className="font-bold text-[13.5px] mb-2">{device.callsign}</div>
                                <div className="flex gap-1.5 flex-wrap mb-2.5">
                                    <span
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: `${DEVICE_TYPE_COLORS[device.deviceType]}26`, color: DEVICE_TYPE_COLORS[device.deviceType] }}
                                    >
                                        {t(`tikshovCop.deviceTypes.${device.deviceType}`)}
                                    </span>
                                    <span
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: `${STATUS_TEXT_COLOR[device.connectionStatus]}26`, color: STATUS_TEXT_COLOR[device.connectionStatus] }}
                                    >
                                        {t(`tikshovCop.status.${device.connectionStatus}`)}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 text-[11.5px] mb-2">
                                    <div><span className="text-slate-400">{t('tikshovCop.unit')}: </span><b>{unit ? formatUnitName(unit as any, t, i18n.language) : '—'}</b></div>
                                    <div><span className="text-slate-400">{t('tikshovCop.confidenceLabel')}: </span><b>{t(`staticSpace.confidence.${device.dataConfidence}`)}</b></div>
                                    <div className="col-span-2">
                                        <span className="text-slate-400">{t('tikshovCop.lastReport')}: </span>
                                        <b>{formatRelativeSeconds(device.lastReportSecondsAgo, t)}</b>
                                    </div>
                                    {device.connectionStatus !== 'active' && (
                                        <div className="col-span-2">
                                            <span className="text-slate-400">{t('tikshovCop.inactiveSince')}: </span>
                                            <b>{formatRelativeMinutes(device.statusDurationMinutes, t)}</b>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </>
    );
};
