import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-gpx';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultTrackMarker = L.icon({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

export default function GpxMap({ gpxUrl, height = '460px' }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            scrollWheelZoom: false,
            zoomControl: true,
        });

        // CartoDB Positron — light tiles that match the cream/gold palette
        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            {
                attribution:
                    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19,
            },
        ).addTo(map);

        if (gpxUrl) {
            new L.GPX(gpxUrl, {
                async: true,
                markers: {
                    startIcon: defaultTrackMarker,
                    endIcon: defaultTrackMarker,
                },
                marker_options: {
                    clickable: false,
                },
                polyline_options: {
                    color: '#B8922A',
                    weight: 3,
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round',
                },
            })
                .on('loaded', (e) => {
                    map.fitBounds(e.target.getBounds(), { padding: [40, 40] });
                })
                .addTo(map);
        } else {
            map.setView([47.0072, 0.3249], 14);
        }

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [gpxUrl]);

    return (
        <div
            ref={containerRef}
            style={{ height, width: '100%' }}
            className="z-0"
        />
    );
}
