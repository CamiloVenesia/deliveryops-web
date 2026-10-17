
import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { ExternalLink, MapPin, Route } from 'lucide-react';

import 'leaflet/dist/leaflet.css';
import './delivery-route-map.css';

const MAX_POINTS = 500;

function validPoint(value) {
    if (
        value?.latitude === null ||
        value?.latitude === undefined ||
        value?.longitude === null ||
        value?.longitude === undefined
    ) {
        return null;
    }

    const latitude = Number(value.latitude);
    const longitude = Number(value.longitude);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return null;
    }

    return { latitude, longitude };
}

function samePoint(a, b) {
    return (
        a &&
        b &&
        Math.abs(a.latitude - b.latitude) < 0.0000001 &&
        Math.abs(a.longitude - b.longitude) < 0.0000001
    );
}

function latLng(point) {
    return [point.latitude, point.longitude];
}

export default function DeliveryRouteMap({
    currentLocation,
    locationHistory = []
}) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const layersRef = useRef(null);

    const history = useMemo(() => {
        if (!Array.isArray(locationHistory)) return [];

        return locationHistory
            .map(validPoint)
            .filter(Boolean)
            .slice(-MAX_POINTS);
    }, [locationHistory]);

    const current = useMemo(
        () => validPoint(currentLocation),
        [currentLocation]
    );

    const positions = useMemo(() => {
        const result = [...history];

        if (
            current &&
            (!result.length || !samePoint(result.at(-1), current))
        ) {
            result.push(current);
        }

        return result;
    }, [history, current]);

    const hasPositions = positions.length > 0;
    const latestPoint = current ?? history.at(-1) ?? null;

    useEffect(() => {
        if (!hasPositions || !containerRef.current) return;

        const map = L.map(containerRef.current, {
            zoomControl: true,
            scrollWheelZoom: false,
            doubleClickZoom: true,
            attributionControl: true
        });

        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                maxZoom: 19,
                attribution:
                    '&copy; OpenStreetMap contributors'
            }
        ).addTo(map);

        const layers = L.layerGroup().addTo(map);

        mapRef.current = map;
        layersRef.current = layers;

        const animationFrame = requestAnimationFrame(() => {
            map.invalidateSize();
        });

        return () => {
            cancelAnimationFrame(animationFrame);
            map.remove();
            mapRef.current = null;
            layersRef.current = null;
        };
    }, [hasPositions]);

    useEffect(() => {
        const map = mapRef.current;
        const layers = layersRef.current;

        if (!map || !layers || !positions.length) return;

        layers.clearLayers();

        const path = positions.map(latLng);

        if (path.length > 1) {
            L.polyline(path, {
                color: '#2563eb',
                weight: 4,
                opacity: 0.85,
                lineJoin: 'round',
                lineCap: 'round'
            }).addTo(layers);
        }

        if (history.length > 0) {
            L.circleMarker(latLng(history[0]), {
                radius: 7,
                color: '#ffffff',
                weight: 3,
                fillColor: '#64748b',
                fillOpacity: 1
            })
                .bindTooltip('Primer punto registrado')
                .addTo(layers);
        }

        if (latestPoint) {
            L.circleMarker(latLng(latestPoint), {
                radius: 11,
                color: '#ffffff',
                weight: 4,
                fillColor: '#16a34a',
                fillOpacity: 1
            })
                .bindTooltip('Última ubicación registrada')
                .addTo(layers);
        }

        if (path.length === 1) {
            map.setView(path[0], 15);
        } else {
            map.fitBounds(L.latLngBounds(path), {
                padding: [35, 35],
                maxZoom: 15
            });
        }
    }, [positions, history, latestPoint]);

    const externalUrl = latestPoint
        ? `https://www.openstreetmap.org/?mlat=${latestPoint.latitude}&mlon=${latestPoint.longitude}#map=16/${latestPoint.latitude}/${latestPoint.longitude}`
        : null;

    return (
        <section className="delivery-map">
            <div className="delivery-map__heading">
                <div className="delivery-map__heading-main">
                    <span className="delivery-map__icon">
                        <MapPin size={19} />
                    </span>

                    <div>
                        <h3>Mapa de seguimiento</h3>
                        <p>
                            Posiciones registradas durante la operación
                        </p>
                    </div>
                </div>

                {externalUrl && (
                    <a
                        href={externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="delivery-map__external"
                    >
                        Ver en mapa
                        <ExternalLink size={14} />
                    </a>
                )}
            </div>

            {hasPositions ? (
                <>
                    <div
                        ref={containerRef}
                        className="delivery-map__canvas"
                        role="img"
                        aria-label="Mapa interactivo con la ubicación y el recorrido GPS registrado"
                    />

                    <div className="delivery-map__legend">
                        <span>
                            <i className="delivery-map__dot delivery-map__dot--start" />
                            Primer registro
                        </span>

                        <span>
                            <i className="delivery-map__line" />
                            Trayecto GPS
                        </span>

                        <span>
                            <i className="delivery-map__dot delivery-map__dot--current" />
                            Última ubicación
                        </span>
                    </div>

                    <div className="delivery-map__details">
                        <span>
                            <Route size={15} />
                            {history.length} posiciones registradas
                        </span>

                        <span>
                            Actualización según registros guardados
                        </span>
                    </div>
                </>
            ) : (
                <div className="delivery-map__empty">
                    <MapPin size={29} />
                    <strong>Ubicación todavía no disponible</strong>
                    <p>
                        Cuando el repartidor registre su primera posición
                        GPS, el mapa aparecerá automáticamente.
                    </p>
                </div>
            )}

            <p className="delivery-map__disclaimer">
                El trazado une los puntos GPS almacenados. No representa
                una ruta calculada por calles ni seguimiento en vivo
                continuo.
            </p>
        </section>
    );
}
