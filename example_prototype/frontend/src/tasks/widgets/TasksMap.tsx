import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Task, Plan } from '../../common/utilities/types';
import { useTranslation } from 'react-i18next';

// Fix Leaflet's default icon path issue with Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const TasksMap: React.FC<{ tasks: Task[], plan: Plan }> = ({ tasks, plan }) => {
    const { t, i18n } = useTranslation();
    const [center, setCenter] = useState<[number, number]>([31.5, 35.0]); // Default somewhere

    useEffect(() => {
        // Find first task with coordinates to center the map
        const firstWithCoords = tasks.find(t => t.geoCoordinates && t.geoCoordinates.length > 0);
        if (firstWithCoords && firstWithCoords.geoCoordinates) {
            setCenter([firstWithCoords.geoCoordinates[0].lat, firstWithCoords.geoCoordinates[0].lng]);
        }
    }, [tasks]);

    return (
        <div className="bg-slate-100 dark:bg-zinc-800 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-700 h-[600px] w-full flex-shrink-0 flex overflow-hidden relative z-0">
            <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {tasks.map(task => {
                    if (!task.geoCoordinates || task.geoCoordinates.length === 0) return null;

                    return task.geoCoordinates.map((coord, idx) => (
                        <Marker key={`${task.id}-${idx}`} position={[coord.lat, coord.lng]}>
                            <Popup>
                                <div className="font-semibold">{task.name?.[i18n.language] || task.name?.['en']}</div>
                                <div className="text-sm">{task.description?.[i18n.language] || task.description?.['en']}</div>
                                <div className="text-xs text-slate-500 mt-1">{t('Status')}: {task.status}</div>
                            </Popup>
                        </Marker>
                    ));
                })}
            </MapContainer>
        </div>
    );
};