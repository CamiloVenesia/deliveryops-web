
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import {
    ClipboardCheck,
    Clock3,
    ExternalLink,
    FileCheck2,
    MapPin,
    Navigation,
    Package,
    RefreshCw,
    Route,
    Truck
} from 'lucide-react';

import { deliveryService } from '../api/services.js';
import { deliveryLogisticsService } from '../api/logistics.service.js';
import { getApiErrorMessage } from '../api/normalizers.js';
import { useAuth } from '../auth/useAuth.js';

import DeliveryRouteMap from '../components/DeliveryRouteMap.jsx';
import DeliveryReceiptViewer from '../components/DeliveryReceiptViewer.jsx';
import OperationTimeline from '../components/OperationTimeline.jsx';
import TrackingActions from '../components/TrackingActions.jsx';

import {
    Button,
    Card,
    EmptyState,
    LoadingState,
    PageHeader,
    StatusBadge
} from '../components/ui.jsx';

import {
    formatDateTime,
    getEntityId,
    shortId,
    statusLabel
} from '../utils/formatters.js';

import './tracking.css';

const OUTCOMES = {
    recipient_absent: 'Destinatario ausente',
    rejected: 'Entrega rechazada',
    invalid_address: 'Dirección incorrecta',
    access_problem: 'Problemas de acceso',
    rescheduled: 'Reprogramada',
    other: 'Otro inconveniente',
    delivered: 'Entrega realizada'
};

function pointOf(value) {
    if (
        value?.latitude == null ||
        value?.longitude == null
    ) {
        return null;
    }

    const latitude = Number(value.latitude);
    const longitude = Number(value.longitude);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {
        return null;
    }

    if (
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180
    ) {
        return null;
    }

    return { latitude, longitude };
}

function coordinateText(value) {
    const point = pointOf(value);

    return point
        ? `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`
        : 'Sin coordenadas';
}

function mapUrl(value) {
    const point = pointOf(value);

    if (!point) return null;

    return `https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=16/${point.latitude}/${point.longitude}`;
}

function SectionHeader({
    icon: Icon,
    title,
    subtitle
}) {
    return (
        <div className="tracking-section-heading">
            <span className="tracking-section-icon">
                <Icon size={19} />
            </span>

            <div>
                <h2>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
            </div>
        </div>
    );
}

function DeliveryFacts({ delivery, order, id }) {
    return (
        <Card className="tracking-card tracking-summary">
            <div className="tracking-summary__heading">
                <div>
                    <span className="tracking-eyebrow">
                        Operación seleccionada
                    </span>

                    <h2>
                        {delivery?.trackingCode ||
                            `Entrega #${shortId(id)}`}
                    </h2>
                </div>

                <StatusBadge status={delivery?.status} />
            </div>

            <div className="tracking-facts">
                <div>
                    <span>Pedido asociado</span>
                    <strong>
                        {order?.trackingCode ||
                            `#${shortId(delivery?.order)}`}
                    </strong>
                </div>

                <div>
                    <span>Destino</span>
                    <strong>
                        {order?.deliveryAddress || 'Sin dirección'}
                    </strong>
                </div>

                <div>
                    <span>Destinatario</span>
                    <strong>
                        {order?.recipient?.fullName || 'No registrado'}
                    </strong>
                </div>

                <div>
                    <span>Asignada</span>
                    <strong>
                        {formatDateTime(delivery?.assignedAt)}
                    </strong>
                </div>
            </div>
        </Card>
    );
}

function GpsCard({ current, history, error }) {
    const url = mapUrl(current);

    return (
        <Card className="tracking-card">
            <SectionHeader
                icon={MapPin}
                title="Última ubicación registrada"
                subtitle="Coordenadas guardadas por el repartidor o el operador."
            />

            {error ? (
                <p className="tracking-empty">
                    {getApiErrorMessage(error)}
                </p>
            ) : (
                <>
                    <DeliveryRouteMap
                        currentLocation={current}
                        locationHistory={history}
                    />

                    {pointOf(current) ? (
                        <div className="tracking-location">
                            <div>
                                <span>Latitud, longitud</span>
                                <strong>
                                    {coordinateText(current)}
                                </strong>
                            </div>

                            {url && (
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="tracking-map-link"
                                >
                                    <Navigation size={16} />
                                    Abrir en OpenStreetMap
                                    <ExternalLink size={14} />
                                </a>
                            )}
                        </div>
                    ) : (
                        <p className="tracking-empty">
                            Todavía no se registraron coordenadas.
                        </p>
                    )}

                    <div className="tracking-records">
                        <h3>
                            <Clock3 size={16} />
                            Historial GPS ({history.length})
                        </h3>

                        <div className="tracking-record-list">
                            {[...history]
                                .reverse()
                                .slice(0, 30)
                                .map((point, index) => (
                                    <div
                                        className="tracking-record"
                                        key={`${point.recordedAt}-${index}`}
                                    >
                                        <div>
                                            <strong>
                                                {coordinateText(point)}
                                            </strong>

                                            <span>
                                                {point.source || 'gps'}
                                                {' · '}
                                                {formatDateTime(
                                                    point.recordedAt
                                                )}
                                            </span>
                                        </div>

                                        {mapUrl(point) && (
                                            <a
                                                href={mapUrl(point)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label="Ver punto registrado en el mapa"
                                            >
                                                <ExternalLink size={15} />
                                            </a>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                </>
            )}
        </Card>
    );
}

function ProofCard({
    deliveryId,
    delivery,
    proof,
    error
}) {
    return (
        <Card className="tracking-card">
            <SectionHeader
                icon={FileCheck2}
                title="Comprobante"
                subtitle="Recepción y archivo digital de evidencia."
            />

            {error ? (
                <p className="tracking-empty">
                    {getApiErrorMessage(error)}
                </p>
            ) : proof?.receivedAt ? (
                <div className="tracking-proof">
                    <span className="tracking-proof__success">
                        <FileCheck2 size={16} />
                        Recepción confirmada
                    </span>

                    <strong>{proof.receivedBy}</strong>

                    <small>
                        {formatDateTime(proof.receivedAt)}
                    </small>

                    {proof.relationship && (
                        <p>{proof.relationship}</p>
                    )}

                    {proof.notes && (
                        <p>{proof.notes}</p>
                    )}
                </div>
            ) : (
                <p className="tracking-empty">
                    Todavía no se confirmó la recepción.
                </p>
            )}

            <DeliveryReceiptViewer
                key={deliveryId}
                deliveryId={deliveryId}
                trackingCode={delivery?.trackingCode}
                receipt={delivery?.receipt}
                confirmed={Boolean(proof?.receivedAt)}
            />
        </Card>
    );
}

function AttemptsCard({ attempts, error }) {
    return (
        <Card className="tracking-card">
            <SectionHeader
                icon={ClipboardCheck}
                title="Intentos de entrega"
                subtitle="Registro de visitas e incidencias."
            />

            {error ? (
                <p className="tracking-empty">
                    {getApiErrorMessage(error)}
                </p>
            ) : attempts.length ? (
                <div className="tracking-record-list">
                    {[...attempts]
                        .reverse()
                        .map((item, index) => (
                            <div
                                className="tracking-record"
                                key={`${item.attemptedAt}-${index}`}
                            >
                                <div>
                                    <strong>
                                        {OUTCOMES[item.outcome] ||
                                            item.outcome}
                                    </strong>

                                    <span>
                                        {formatDateTime(
                                            item.attemptedAt
                                        )}
                                    </span>

                                    {item.notes && (
                                        <p>{item.notes}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>
            ) : (
                <p className="tracking-empty">
                    No hay intentos registrados.
                </p>
            )}
        </Card>
    );
}

export default function TrackingPage() {
    const { role } = useAuth();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [selectedId, setSelectedId] = useState('');
    const [search, setSearch] = useState('');

    const isOperator =
        role === 'admin' || role === 'driver';

    const deliveriesQuery = useQuery({
        queryKey: ['deliveries', 'tracking', page],
        queryFn: () =>
            deliveryService.list({
                page,
                limit: 50
            })
    });

    const deliveries =
        deliveriesQuery.data?.items ?? [];

    const activeId =
        selectedId || getEntityId(deliveries[0]);

    const detailQuery = useQuery({
        queryKey: ['tracking', activeId, 'details'],
        queryFn: () =>
            deliveryLogisticsService.details(activeId),
        enabled: Boolean(activeId),
        refetchInterval: 60000
    });

    const locationsQuery = useQuery({
        queryKey: ['tracking', activeId, 'locations'],
        queryFn: () =>
            deliveryLogisticsService.locations(activeId),
        enabled: Boolean(activeId),
        refetchInterval: 60000
    });

    const proofQuery = useQuery({
        queryKey: ['tracking', activeId, 'proof'],
        queryFn: () =>
            deliveryLogisticsService.proof(activeId),
        enabled: Boolean(activeId)
    });

    const attemptsQuery = useQuery({
        queryKey: ['tracking', activeId, 'attempts'],
        queryFn: () =>
            deliveryLogisticsService.attempts(activeId),
        enabled: Boolean(activeId) && isOperator
    });

    function refresh() {
        queryClient.invalidateQueries({
            queryKey: ['tracking', activeId]
        });

        queryClient.invalidateQueries({
            queryKey: ['deliveries']
        });

        queryClient.invalidateQueries({
            queryKey: ['orders']
        });

        queryClient.invalidateQueries({
            queryKey: ['analytics']
        });
    }

    const delivery = detailQuery.data?.delivery;
    const order = detailQuery.data?.order;

    const history =
        locationsQuery.data?.locationHistory ?? [];

    const current =
        locationsQuery.data?.currentLocation;

    const attempts =
        attemptsQuery.data?.attempts ?? [];

    const proof =
        proofQuery.data?.proofOfDelivery;

    const term = search.trim().toLowerCase();

    const displayedDeliveries = deliveries.filter(
        item =>
            !term ||
            [
                getEntityId(item),
                item.trackingCode,
                item.status,
                statusLabel(item.status),
                getEntityId(item.order)
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(term)
    );

    return (
        <div className="tracking-page">
            <PageHeader
                eyebrow="Centro logístico"
                title="Seguimiento de entregas"
                description="Ubicaciones GPS, intentos, comprobantes y trazabilidad."
            >
                <Button
                    variant="secondary"
                    icon={RefreshCw}
                    onClick={refresh}
                >
                    Actualizar
                </Button>
            </PageHeader>

            <div className="tracking-layout">
                <Card className="tracking-sidebar">
                    <div className="tracking-sidebar__heading">
                        <div>
                            <strong>Entregas</strong>
                            <span>
                                {deliveriesQuery.data?.total ?? 0}
                                {' '}
                                registros
                            </span>
                        </div>

                        <Link
                            to="/deliveries"
                            title="Ir a entregas"
                        >
                            <ExternalLink size={17} />
                        </Link>
                    </div>

                    <input
                        type="search"
                        className="tracking-search"
                        placeholder="Buscar entrega..."
                        value={search}
                        onChange={event =>
                            setSearch(event.target.value)
                        }
                    />

                    {deliveriesQuery.isPending ? (
                        <LoadingState />
                    ) : deliveriesQuery.isError ? (
                        <EmptyState
                            icon={Truck}
                            title="Error al cargar entregas"
                            description={getApiErrorMessage(
                                deliveriesQuery.error
                            )}
                        />
                    ) : displayedDeliveries.length === 0 ? (
                        <EmptyState
                            icon={Package}
                            title="Sin entregas"
                            description="No hay operaciones en esta página."
                        />
                    ) : (
                        <div className="tracking-delivery-list">
                            {displayedDeliveries.map(item => {
                                const id = getEntityId(item);

                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        className={`tracking-delivery-item ${
                                            activeId === id
                                                ? 'is-active'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            setSelectedId(id)
                                        }
                                    >
                                        <span className="tracking-delivery-item__top">
                                            <strong>
                                                {item.trackingCode ||
                                                    `#${shortId(id)}`}
                                            </strong>

                                            <StatusBadge
                                                status={item.status}
                                            />
                                        </span>

                                        <small>
                                            Pedido #{shortId(item.order)}
                                        </small>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="tracking-pages">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => {
                                setPage(value => value - 1);
                                setSelectedId('');
                            }}
                        >
                            Anterior
                        </Button>

                        <span>
                            {page} / {Math.max(
                                1,
                                deliveriesQuery.data?.totalPages ?? 1
                            )}
                        </span>

                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={
                                page >= (
                                    deliveriesQuery.data?.totalPages ?? 1
                                )
                            }
                            onClick={() => {
                                setPage(value => value + 1);
                                setSelectedId('');
                            }}
                        >
                            Siguiente
                        </Button>
                    </div>
                </Card>

                <div className="tracking-content">
                    {!activeId ? (
                        <Card className="tracking-card">
                            <EmptyState
                                icon={Route}
                                title="Seleccioná una entrega"
                                description="Los detalles aparecerán acá."
                            />
                        </Card>
                    ) : detailQuery.isPending ? (
                        <Card className="tracking-card">
                            <LoadingState
                                title="Cargando trazabilidad"
                            />
                        </Card>
                    ) : detailQuery.isError ? (
                        <Card className="tracking-card">
                            <EmptyState
                                icon={Truck}
                                title="No se pudo consultar la entrega"
                                description={getApiErrorMessage(
                                    detailQuery.error
                                )}
                            />
                        </Card>
                    ) : (
                        <>
                            <DeliveryFacts
                                delivery={delivery}
                                order={order}
                                id={activeId}
                            />

                            <GpsCard
                                current={current}
                                history={history}
                                error={locationsQuery.error}
                            />

                            <div className="tracking-two-columns">
                                <ProofCard
                                    key={activeId}
                                    deliveryId={activeId}
                                    delivery={delivery}
                                    proof={proof}
                                    error={proofQuery.error}
                                />

                                {isOperator && (
                                    <AttemptsCard
                                        attempts={attempts}
                                        error={attemptsQuery.error}
                                    />
                                )}
                            </div>

                            <Card className="tracking-card">
                                <OperationTimeline
                                    history={
                                        delivery?.statusHistory ?? []
                                    }
                                    currentStatus={delivery?.status}
                                    title="Historial operativo de la entrega"
                                />
                            </Card>

                            {isOperator && (
                                <TrackingActions
                                    key={activeId}
                                    id={activeId}
                                    status={delivery?.status}
                                    proof={proof}
                                    trackingCode={delivery?.trackingCode}
                                    refresh={refresh}
                                />
                            )}

                            <p className="tracking-footnote">
                                Los datos se actualizan al registrar
                                eventos o consultar nuevamente.
                                El GPS no se envía en segundo plano.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
