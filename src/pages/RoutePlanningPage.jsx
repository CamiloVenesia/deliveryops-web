
import { useState } from 'react';
import {
    useQuery,
    useQueryClient
} from '@tanstack/react-query';

import {
    AlertCircle,
    ArrowRight,
    Clock3,
    MapPinned,
    Navigation,
    Package,
    RefreshCw,
    Route,
    Search,
    Truck,
    UsersRound
} from 'lucide-react';

import {
    driversService
} from '../api/drivers.service.js';

import {
    routePlanningService
} from '../api/route-planning.service.js';

import {
    getApiErrorMessage
} from '../api/normalizers.js';

import { useAuth } from '../auth/useAuth.js';

import RoutePlanningMap from '../components/RoutePlanningMap.jsx';

import {
    PageHeader,
    Pagination,
    StatusBadge
} from '../components/ui.jsx';

import {
    formatDateTime,
    getEntityId,
    shortId
} from '../utils/formatters.js';

import './route-planning.css';

const STATE_NAMES = {
    empty: 'Sin entregas activas',
    needs_coordinates: 'Faltan coordenadas',
    not_configured: 'Motor de rutas no configurado',
    provider_unavailable: 'Servicio de rutas no disponible',
    ready: 'Ruta calculada'
};

function DriverName({ driver }) {
    return (
        <>
            {[
                driver.firstName,
                driver.lastName
            ].filter(Boolean).join(' ') || 'Repartidor'}
        </>
    );
}

function StopList({ preview }) {
    if (!preview.stops?.length) {
        return (
            <p className="route-plan-placeholder">
                Todavía no hay paradas con coordenadas.
            </p>
        );
    }

    const calculated = preview.status === 'ready';

    return (
        <div className="route-plan-stops">
            {preview.stops.map((stop, index) => (
                <article
                    className="route-plan-stop"
                    key={stop.deliveryId}
                >
                    <span className="route-plan-stop-number">
                        {calculated
                            ? stop.sequence
                            : index + 1}
                    </span>

                    <div className="route-plan-stop-content">
                        <div className="route-plan-stop-heading">
                            <strong>
                                {stop.trackingCode ||
                                    `#${shortId(stop.deliveryId)}`}
                            </strong>

                            <StatusBadge status={stop.status} />
                        </div>

                        <p>
                            {stop.address ||
                                'Dirección no registrada'}
                        </p>

                        <small>
                            Entrega #{shortId(stop.deliveryId)}
                        </small>

                        {calculated && (
                            <div className="route-plan-stop-metrics">
                                <span>
                                    {stop.distanceFromPreviousKm}
                                    {' '}km desde la parada anterior
                                </span>

                                <span>
                                    {stop.minutesFromPrevious}
                                    {' '}min de viaje
                                </span>

                                <strong>
                                    ETA acumulado:{' '}
                                    {stop.arrivalMinutesFromStart}
                                    {' '}min
                                </strong>
                            </div>
                        )}
                    </div>
                </article>
            ))}
        </div>
    );
}

export default function RoutePlanningPage() {
    const { role, user } = useAuth();

    const isAdmin = role === 'admin';
    const ownId = getEntityId(user);

    const queryClient = useQueryClient();

    const [driverId, setDriverId] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const currentDriverId = isAdmin
        ? driverId
        : ownId;

    const driversQuery = useQuery({
        queryKey: [
            'route-planning',
            'drivers',
            search,
            page
        ],

        queryFn: () => driversService.list({
            page,
            limit: 20,
            ...(search ? { q: search } : {})
        }),

        enabled: isAdmin
    });

    const previewQuery = useQuery({
        queryKey: [
            'route-planning',
            'preview',
            currentDriverId
        ],

        queryFn: () =>
            routePlanningService.preview(currentDriverId),

        enabled: Boolean(currentDriverId),
        retry: 1,
        staleTime: 15_000
    });

    const drivers = driversQuery.data?.items ?? [];
    const preview = previewQuery.data;

    function refresh() {
        queryClient.invalidateQueries({
            queryKey: ['route-planning']
        });
    }

    function searchDrivers(event) {
        event.preventDefault();

        setSearch(searchInput.trim());
        setPage(1);
        setDriverId('');
    }

    return (
        <div className="route-plan-page">
            <PageHeader
                eyebrow="Centro logístico"
                title="Planificación de rutas"
                description="Previsualizá las entregas activas por repartidor y calculá el mejor orden de paradas, cuando existan coordenadas."
            >
                <button
                    className="route-plan-refresh"
                    type="button"
                    onClick={refresh}
                >
                    <RefreshCw size={16} />
                    Actualizar
                </button>
            </PageHeader>

            <div className="route-plan-hero">
                <div>
                    <span>
                        RUTEO OPERATIVO · DELIVERYOPS
                    </span>

                    <h2>
                        Menos vueltas. Entregas mejor organizadas.
                    </h2>

                    <p>
                        Planificación de solo lectura: no reasigna
                        repartidores ni cambia el estado de tus pedidos.
                    </p>
                </div>

                <Route
                    size={48}
                    strokeWidth={1.5}
                    aria-hidden="true"
                />
            </div>

            <div className="route-plan-layout">
                <aside className="route-plan-panel route-plan-selection">
                    <div className="route-plan-panel-head">
                        <UsersRound size={19} />

                        <div>
                            <h3>
                                {isAdmin
                                    ? 'Elegí un repartidor'
                                    : 'Mi recorrido'}
                            </h3>

                            <p>
                                {isAdmin
                                    ? 'Consultá una ruta por vez.'
                                    : 'Ruta asociada a tu cuenta.'}
                            </p>
                        </div>
                    </div>

                    {isAdmin ? (
                        <>
                            <form
                                className="route-plan-driver-search"
                                onSubmit={searchDrivers}
                            >
                                <label htmlFor="route-plan-search">
                                    <Search size={16} />

                                    <input
                                        id="route-plan-search"
                                        value={searchInput}
                                        onChange={event =>
                                            setSearchInput(event.target.value)
                                        }
                                        placeholder="Nombre o email"
                                        maxLength={80}
                                    />
                                </label>

                                <button type="submit">
                                    Buscar
                                </button>
                            </form>

                            {driversQuery.isPending ? (
                                <p className="route-plan-placeholder">
                                    Cargando repartidores…
                                </p>
                            ) : driversQuery.isError ? (
                                <p
                                    className="route-plan-message route-plan-message--error"
                                    role="alert"
                                >
                                    {getApiErrorMessage(
                                        driversQuery.error,
                                        'No se pudo cargar el listado.'
                                    )}
                                </p>
                            ) : drivers.length ? (
                                <div className="route-plan-driver-list">
                                    {drivers.map(driver => (
                                        <button
                                            type="button"
                                            key={driver.id}
                                            className={`route-plan-driver ${
                                                driverId === driver.id
                                                    ? 'is-selected'
                                                    : ''
                                            }`}
                                            onClick={() =>
                                                setDriverId(driver.id)
                                            }
                                            aria-pressed={
                                                driverId === driver.id
                                            }
                                        >
                                            <span className="route-plan-driver-icon">
                                                <Truck size={18} />
                                            </span>

                                            <span className="route-plan-driver-info">
                                                <strong>
                                                    <DriverName
                                                        driver={driver}
                                                    />
                                                </strong>

                                                <small>
                                                    {driver.metrics
                                                        ?.activeDeliveries ?? 0}
                                                    {' '}entregas activas
                                                </small>
                                            </span>

                                            <ArrowRight size={16} />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="route-plan-placeholder">
                                    No hay repartidores con esa búsqueda.
                                </p>
                            )}

                            <Pagination
                                page={page}
                                totalPages={Math.max(
                                    1,
                                    driversQuery.data?.totalPages ?? 1
                                )}
                                total={driversQuery.data?.total ?? 0}
                                onPageChange={next => {
                                    setPage(next);
                                    setDriverId('');
                                }}
                            />
                        </>
                    ) : (
                        <div className="route-plan-self">
                            <Truck size={19} />

                            <strong>
                                {[
                                    user?.firstName,
                                    user?.lastName
                                ].filter(Boolean).join(' ') || 'Mi cuenta'}
                            </strong>
                        </div>
                    )}
                </aside>

                <section className="route-plan-panel route-plan-results">
                    <div className="route-plan-panel-head">
                        <MapPinned size={19} />

                        <div>
                            <h3>
                                Recorrido de entregas
                            </h3>

                            <p>
                                {preview?.driver?.name ||
                                    'Seleccioná un repartidor para calcular su ruta.'}
                            </p>
                        </div>
                    </div>

                    {!currentDriverId ? (
                        <div className="route-plan-placeholder route-plan-placeholder--large">
                            <Navigation size={35} />
                            Elegí un repartidor del panel izquierdo.
                        </div>
                    ) : previewQuery.isPending ? (
                        <p className="route-plan-placeholder route-plan-placeholder--large">
                            Calculando vista previa…
                        </p>
                    ) : previewQuery.isError ? (
                        <div
                            className="route-plan-message route-plan-message--error"
                            role="alert"
                        >
                            <AlertCircle size={20} />

                            <span>
                                {getApiErrorMessage(
                                    previewQuery.error,
                                    'No se pudo consultar la ruta.'
                                )}
                            </span>
                        </div>
                    ) : preview ? (
                        <>
                            <div className="route-plan-status-row">
                                <span
                                    className={`route-plan-state route-plan-state--${preview.status}`}
                                >
                                    {STATE_NAMES[preview.status] ||
                                        preview.status}
                                </span>

                                <span>
                                    {preview.message}
                                </span>
                            </div>

                            {preview.status === 'ready' &&
                            preview.route ? (
                                <div className="route-plan-kpis">
                                    <div>
                                        <Route size={18} />

                                        <strong>
                                            {preview.route.distanceKm}
                                            {' '}km
                                        </strong>

                                        <span>
                                            Distancia estimada
                                        </span>
                                    </div>

                                    <div>
                                        <Clock3 size={18} />

                                        <strong>
                                            {preview.route
                                                .estimatedDurationMinutes}
                                            {' '}min
                                        </strong>

                                        <span>
                                            Tiempo de conducción
                                        </span>
                                    </div>

                                    <div>
                                        <Package size={18} />

                                        <strong>
                                            {preview.stops.length}
                                        </strong>

                                        <span>
                                            Paradas planificadas
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="route-plan-kpis route-plan-kpis--single">
                                    <div>
                                        <Package size={18} />

                                        <strong>
                                            {preview.stops?.length ?? 0}
                                        </strong>

                                        <span>
                                            Paradas con ubicación
                                        </span>
                                    </div>
                                </div>
                            )}

                            <RoutePlanningMap preview={preview} />

                            <p className="route-plan-disclaimer">
                                {preview.status === 'ready'
                                    ? `Estimación calculada el ${formatDateTime(
                                        preview.route?.calculatedAt
                                    )}. No contempla tráfico en vivo, estacionamiento ni tiempo de descarga.`
                                    : 'Los puntos del mapa son ubicaciones; no se muestra una ruta por calles ni tiempos estimados hasta que el servidor pueda calcularlos.'}
                            </p>

                            {preview.missingCoordinates?.length > 0 && (
                                <div className="route-plan-warning">
                                    <AlertCircle size={18} />

                                    <div>
                                        <strong>
                                            {preview.missingCoordinates.length}
                                            {' '}entrega(s) sin coordenadas
                                        </strong>

                                        <p>
                                            {preview.missingCoordinates
                                                .map(item =>
                                                    item.trackingCode
                                                )
                                                .join(', ')}
                                            . Completá sus destinos para incluirlas.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {preview.excludedByLimit > 0 && (
                                <div className="route-plan-warning">
                                    <AlertCircle size={18} />

                                    Al menos {preview.excludedByLimit}
                                    {' '}parada(s) quedaron fuera del límite de 10.
                                </div>
                            )}

                            <div className="route-plan-stops-head">
                                <h3>
                                    Secuencia de paradas
                                </h3>

                                <small>
                                    {preview.status === 'ready'
                                        ? 'Orden optimizado por el proveedor'
                                        : 'Orden original, no optimizado'}
                                </small>
                            </div>

                            <StopList preview={preview} />
                        </>
                    ) : null}
                </section>
            </div>
        </div>
    );
}
