import React, { useMemo } from 'react';
import { Polygon, Tooltip, Popup } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { useSpectrumContext } from '../context/SpectrumContext';
import { mockSpectrumZones } from '../utilities/mockData';
import { getVisibleZones, getZoneColor, computeJammingStatus, formatDurationMinutes } from '../utilities/spectrum';

// Renders the "Spectrum" (ספקטרום) map layer as a child of react-leaflet's <MapContainer>:
// one polygon per zone, colored by meaning rather than by a fixed per-layer palette —
// Jamming (השתקות) zones are colored by where they sit in their time window (gray once
// ended, green while active, sky-blue while still ahead), while Blocking (חסימות) zones
// are always red, since they carry no timing dimension of their own.

export const SpectrumMapLayer: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { layerOn, jammingFilterOn, blockingFilterOn, jammingStatusFilters } = useSpectrumContext();

    const visibleZones = useMemo(
        () => getVisibleZones(mockSpectrumZones, layerOn, jammingFilterOn, blockingFilterOn, jammingStatusFilters),
        [layerOn, jammingFilterOn, blockingFilterOn, jammingStatusFilters],
    );

    if (!layerOn) return null;

    return (
        <>
            {visibleZones.map(zone => {
                const color = getZoneColor(zone);
                const positions = zone.coordinates.map(c => [c.lat, c.lng] as [number, number]);
                const jammingStatus = zone.zoneType === 'jamming' ? computeJammingStatus(zone.startAt, zone.endAt) : null;
                const now = Date.now();

                return (
                    <Polygon
                        key={zone.id}
                        positions={positions}
                        pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 2 }}
                    >
                        <Tooltip sticky>{zone.name[i18n.language] || zone.name.en}</Tooltip>
                        <Popup className="commsite-popup" minWidth={220}>
                            <div className="px-1 py-0.5">
                                <div className="font-bold text-[13.5px] mb-2">{zone.name[i18n.language] || zone.name.en}</div>
                                <div className="flex gap-1.5 flex-wrap mb-2.5">
                                    <span
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: `${color}26`, color }}
                                    >
                                        {t(`spectrum.zoneTypes.${zone.zoneType}`)}
                                    </span>
                                    {jammingStatus && (
                                        <span
                                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                            style={{ background: `${color}26`, color }}
                                        >
                                            {t(`spectrum.jammingStatus.${jammingStatus}`)}
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 text-[11.5px] mb-1">
                                    <div className="col-span-2">
                                        <span className="text-slate-400">{t('spectrum.freqRange')}: </span>
                                        <b dir="ltr">{zone.freqRangeMhz.from}–{zone.freqRangeMhz.to} MHz</b>
                                    </div>
                                    {zone.heightRangeM && (
                                        <div className="col-span-2">
                                            <span className="text-slate-400">{t('spectrum.heightRange')}: </span>
                                            <b dir="ltr">{zone.heightRangeM.from}–{zone.heightRangeM.to} {t('spectrum.metersAbbrev')}</b>
                                        </div>
                                    )}
                                    {zone.zoneType === 'jamming' && jammingStatus === 'active' && zone.endAt && (
                                        <div className="col-span-2">
                                            <span className="text-slate-400">{t('spectrum.endsIn')}: </span>
                                            <b>{formatDurationMinutes((new Date(zone.endAt).getTime() - now) / 60000, t)}</b>
                                        </div>
                                    )}
                                    {zone.zoneType === 'jamming' && jammingStatus === 'future' && zone.startAt && (
                                        <div className="col-span-2">
                                            <span className="text-slate-400">{t('spectrum.startsIn')}: </span>
                                            <b>{formatDurationMinutes((new Date(zone.startAt).getTime() - now) / 60000, t)}</b>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Popup>
                    </Polygon>
                );
            })}
        </>
    );
};
