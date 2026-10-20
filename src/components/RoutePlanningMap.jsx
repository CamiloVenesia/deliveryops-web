
import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

function toLatLng(point) {
    if (point?.latitude == null || point?.longitude == null) {
        return null;
    }

    const lat = Number(point.latitude);
    const lng = Number(point.longitude);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180
    ) {
        return null;
    }

    return [lat, lng];
}

export default function RoutePlanningMap({ preview }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const layerRef = useRef(null);

    const start = useMemo(
        () => toLatLng(preview?.start),
        [preview]
    );

    const stops = useMemo(
        () => (preview?.stops ?? [])
            .map(stop => ({
                ...stop,
                position: toLatLng(stop.destination)
            }))
            .filter(stop => stop.position),
        [preview]
    );

    const hasPoints = Boolean(start || stops.length);

    useEffect(() => {
        if (!hasPoints || !containerRef.current) return;

        const map = L.map(containerRef.current, {
            scrollWheelZoom: false,
            zoomControl: true
        });

        L.tileLayer(
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }
        ).addTo(map);

        const layer = L.layerGroup().addTo(map);

        mapRef.current = map;
        layerRef.current = layer;

        const frame = requestAnimationFrame(
            () => map.invalidateSize()
        );

        return () => {
            cancelAnimationFrame(frame);
            map.remove();
            mapRef.current = null;
            layerRef.current = null;
        };
    }, [hasPoints]);

    useEffect(() => {
        const map = mapRef.current;
        const layer = layerRef.current;

        if (!map || !layer || !hasPoints) return;

        layer.clearLayers();

        const boundsPoints = [];

        if (start) {
            boundsPoints.push(start);

            L.circleMarker(start, {
                radius: 9,
                color: '#ffffff',
                weight: 3,
                fillColor: '#1d77ce',
                fillOpacity: 1
            })
                .bindTooltip('Punto de partida')
                .addTo(layer);
        }

        stops.forEach((stop, index) => {
            boundsPoints.push(stop.position);

            const number = Number.isInteger(stop.sequence)
                ? stop.sequence
                : index + 1;

            const marker = L.divIcon({
                className: 'route-plan-marker-wrap',
                html: `<span class="route-plan-marker">${number}</span>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            const tooltip = document.createElement('span');

            tooltip.textContent =
                `Parada ${number} · ${stop.trackingCode || 'Entrega'}`;

            L.marker(stop.position, { icon: marker })
                .bindTooltip(tooltip)
                .addTo(layer);
        });

        if (preview?.status === 'ready') {
            const geometry = (
                preview.route?.geometry ?? []
            )
                .map(toLatLng)
                .filter(Boolean);

            if (geometry.length >= 2) {
                L.polyline(geometry, {
                    color: '#2176d1',
                    weight: 5,
                    opacity: 0.85
                }).addTo(layer);

                boundsPoints.push(...geometry);
            }
        }

        if (boundsPoints.length === 1) {
            map.setView(boundsPoints[0], 14);
        } else if (boundsPoints.length > 1) {
            map.fitBounds(
                L.latLngBounds(boundsPoints),
                {
                    padding: [35, 35],
                    maxZoom: 15
                }
            );
        }
    }, [preview, start, stops, hasPoints]);

    if (!hasPoints) {
        return (
            <div className="route-plan-map-empty">
                No hay coordenadas suficientes para ubicar
                las paradas en el mapa.
            </div>
        );
    }

    return (
        <>
            <div
                ref={containerRef}
                className="route-plan-map"
                role="img"
                aria-label={
                    preview.status === 'ready'
                        ? 'Mapa con recorrido calculado por calles y paradas numeradas'
                        : 'Mapa con ubicaciones de paradas, sin recorrido calculado'
                }
            />

            <div className="route-plan-map-legend">
                <span>
                    <i className="route-plan-legend-start" />
                    Origen
                </span>

                <span>
                    <i className="route-plan-legend-stop" />
                    Paradas
                </span>

                {preview.status === 'ready' && (
                    <span>
                        <i className="route-plan-legend-line" />
                        Ruta por calles
                    </span>
                )}
            </div>
        </>
    );
}
