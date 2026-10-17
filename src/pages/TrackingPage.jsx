
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    ClipboardCheck,
    Clock3,
    ExternalLink,
    FileCheck2,
    LocateFixed,
    MapPin,
    Navigation,
    Package,
    RefreshCw,
    Route,
    Truck,
    UploadCloud
} from 'lucide-react';

import { deliveryService } from '../api/services.js';
import { deliveryLogisticsService } from '../api/logistics.service.js';
import { getApiErrorMessage } from '../api/normalizers.js';
import { useAuth } from '../auth/useAuth.js';
import { useToast } from '../components/useToast.js';
import OperationTimeline from '../components/OperationTimeline.jsx';
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

const OUTCOMES = [
    ['recipient_absent', 'Destinatario ausente'],
    ['rejected', 'Entrega rechazada'],
    ['invalid_address', 'Dirección incorrecta'],
    ['access_problem', 'Problemas de acceso'],
    ['rescheduled', 'Reprogramada'],
    ['other', 'Otro inconveniente'],
    ['delivered', 'Entrega realizada']
];

function coordinates(value) {
    const lat = Number(value?.latitude);
    const lon = Number(value?.longitude);

    if (
        value?.latitude == null ||
        value?.longitude == null ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        Math.abs(lat) > 90 ||
        Math.abs(lon) > 180
    ) {
        return null;
    }

    return { latitude: lat, longitude: lon };
}

function coordinateText(value) {
    const point = coordinates(value);
    return point
        ? `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`
        : 'Sin coordenadas';
}

function mapUrl(value) {
    const point = coordinates(value);
    if (!point) return null;

    const { latitude, longitude } = point;

    return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}

function outcomeLabel(value) {
    return OUTCOMES.find(item => item[0] === value)?.[1] ?? value ?? '—';
}

function SectionHeader({ icon: Icon, title, subtitle }) {
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

function TrackingOperations({ id, status, proof, refresh }) {
    const { pushToast } = useToast();

    const [gps, setGps] = useState({
        latitude: '',
        longitude: '',
        source: 'manual'
    });
    const [locating, setLocating] = useState(false);
    const [attempt, setAttempt] = useState({
        outcome: 'recipient_absent',
        notes: ''
    });
    const [proofForm, setProofForm] = useState({
        receivedBy: '',
        relationship: '',
        notes: '',
        signatureUrl: '',
        photoUrl: ''
    });
    const [receiptFile, setReceiptFile] = useState(null);

    function success(message) {
        pushToast({ title: message });
        refresh();
    }

    function failure(error) {
        pushToast({
            type: 'error',
            title: 'No se pudo completar la operación',
            message: getApiErrorMessage(error)
        });
    }

    const gpsMutation = useMutation({
        mutationFn: payload =>
            deliveryLogisticsService.recordLocation(id, payload),
        onSuccess: () => success('Ubicación GPS registrada'),
        onError: failure
    });

    const attemptMutation = useMutation({
        mutationFn: payload =>
            deliveryLogisticsService.recordAttempt(id, payload),
        onSuccess: () => {
            setAttempt({ outcome: 'recipient_absent', notes: '' });
            success('Intento de entrega registrado');
        },
        onError: failure
    });

    const proofMutation = useMutation({
        mutationFn: payload =>
            deliveryLogisticsService.recordProof(id, payload),
        onSuccess: () => success('Comprobante registrado'),
        onError: failure
    });

    const uploadMutation = useMutation({
        mutationFn: file => deliveryService.uploadReceipt(id, file),
        onSuccess: () => {
            setReceiptFile(null);
            success('Archivo de comprobante cargado');
        },
        onError: failure
    });

    function useCurrentPosition() {
        if (!navigator.geolocation) {
            pushToast({
                type: 'error',
                title: 'GPS no disponible',
                message: 'Este navegador no admite geolocalización.'
            });
            return;
        }

        setLocating(true);

        navigator.geolocation.getCurrentPosition(
            position => {
                setGps({
                    latitude: String(position.coords.latitude),
                    longitude: String(position.coords.longitude),
                    source: 'gps'
                });
                setLocating(false);
            },
            error => {
                setLocating(false);
                pushToast({
                    type: 'error',
                    title: 'No se pudo obtener la ubicación',
                    message: error.message
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 0
            }
        );
    }

    function submitGps(event) {
        event.preventDefault();

        const latitude = Number(gps.latitude);
        const longitude = Number(gps.longitude);

        if (
            gps.latitude.trim() === '' ||
            gps.longitude.trim() === '' ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            failure(new Error('Ingresá coordenadas válidas.'));
            return;
        }

        gpsMutation.mutate({
            latitude,
            longitude,
            source: gps.source
        });
    }

    function submitAttempt(event) {
        event.preventDefault();

        attemptMutation.mutate({
            outcome: attempt.outcome,
            ...(attempt.notes.trim()
                ? { notes: attempt.notes.trim() }
                : {})
        });
    }

    function submitProof(event) {
        event.preventDefault();

        const payload = {
            receivedBy: proofForm.receivedBy.trim(),
            ...(proofForm.relationship.trim()
                ? { relationship: proofForm.relationship.trim() }
                : {}),
            ...(proofForm.notes.trim()
                ? { notes: proofForm.notes.trim() }
                : {}),
            ...(proofForm.signatureUrl.trim()
                ? { signatureUrl: proofForm.signatureUrl.trim() }
                : {}),
            ...(proofForm.photoUrl.trim()
                ? { photoUrls: [proofForm.photoUrl.trim()] }
                : {})
        };

        proofMutation.mutate(payload);
    }

    const canReport = ['assigned', 'in_transit'].includes(status);
    const canCompleteProof = status === 'in_transit' && !proof?.receivedAt;

    return (
        <div className="tracking-operations">
            <Card className="tracking-card">
                <SectionHeader
                    icon={LocateFixed}
                    title="Registrar ubicación"
                    subtitle="Solo cuando la entrega está asignada o en tránsito."
                />

                <form onSubmit={submitGps} className="tracking-form">
                    <div className="tracking-form-grid">
                        <label>
                            Latitud
                            <input
                                type="number"
                                step="any"
                                min="-90"
                                max="90"
                                required
                                value={gps.latitude}
                                onChange={event =>
                                    setGps(value => ({
                                        ...value,
                                        latitude: event.target.value,
                                        source: 'manual'
                                    }))
                                }
                                disabled={!canReport}
                                placeholder="-32.9468"
                            />
                        </label>

                        <label>
                            Longitud
                            <input
                                type="number"
                                step="any"
                                min="-180"
                                max="180"
                                required
                                value={gps.longitude}
                                onChange={event =>
                                    setGps(value => ({
                                        ...value,
                                        longitude: event.target.value,
                                        source: 'manual'
                                    }))
                                }
                                disabled={!canReport}
                                placeholder="-60.6393"
                            />
                        </label>
                    </div>

                    <div className="tracking-form-actions">
                        <Button
                            type="button"
                            variant="secondary"
                            icon={Navigation}
                            disabled={!canReport || locating}
                            onClick={useCurrentPosition}
                        >
                            {locating ? 'Buscando GPS...' : 'Usar mi ubicación'}
                        </Button>

                        <Button
                            type="submit"
                            loading={gpsMutation.isPending}
                            disabled={!canReport}
                        >
                            Guardar ubicación
                        </Button>
                    </div>

                    <p className="tracking-hint">
                        El navegador solicita permiso para acceder a tu
                        ubicación. En producción requiere HTTPS.
                    </p>
                </form>
            </Card>

            <Card className="tracking-card">
                <SectionHeader
                    icon={ClipboardCheck}
                    title="Registrar intento"
                    subtitle="Ausencia, rechazo o inconvenientes de entrega."
                />

                <form onSubmit={submitAttempt} className="tracking-form">
                    <label>
                        Resultado
                        <select
                            value={attempt.outcome}
                            onChange={event =>
                                setAttempt(value => ({
                                    ...value,
                                    outcome: event.target.value
                                }))
                            }
                            disabled={!canReport}
                        >
                            {OUTCOMES.map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Observaciones
                        <textarea
                            rows={3}
                            maxLength={1000}
                            value={attempt.notes}
                            onChange={event =>
                                setAttempt(value => ({
                                    ...value,
                                    notes: event.target.value
                                }))
                            }
                            disabled={!canReport}
                            placeholder="¿Qué ocurrió durante la visita?"
                        />
                    </label>

                    <Button
                        type="submit"
                        loading={attemptMutation.isPending}
                        disabled={!canReport}
                    >
                        Guardar intento
                    </Button>
                </form>
            </Card>

            <Card className="tracking-card tracking-card--wide">
                <SectionHeader
                    icon={FileCheck2}
                    title="Comprobante de entrega"
                    subtitle="Registrar quién recibió el paquete y su conformidad."
                />

                <form onSubmit={submitProof} className="tracking-form">
                    <div className="tracking-form-grid">
                        <label>
                            Recibido por *
                            <input
                                required
                                minLength={2}
                                maxLength={180}
                                value={proofForm.receivedBy}
                                onChange={event =>
                                    setProofForm(value => ({
                                        ...value,
                                        receivedBy: event.target.value
                                    }))
                                }
                                disabled={!canCompleteProof}
                            />
                        </label>

                        <label>
                            Relación con el destinatario
                            <input
                                maxLength={100}
                                placeholder="Destinatario, familiar, recepción..."
                                value={proofForm.relationship}
                                onChange={event =>
                                    setProofForm(value => ({
                                        ...value,
                                        relationship: event.target.value
                                    }))
                                }
                                disabled={!canCompleteProof}
                            />
                        </label>

                        <label>
                            URL de fotografía (opcional)
                            <input
                                type="url"
                                maxLength={1000}
                                placeholder="https://..."
                                value={proofForm.photoUrl}
                                onChange={event =>
                                    setProofForm(value => ({
                                        ...value,
                                        photoUrl: event.target.value
                                    }))
                                }
                                disabled={!canCompleteProof}
                            />
                        </label>

                        <label>
                            URL de firma (opcional)
                            <input
                                type="url"
                                maxLength={1000}
                                placeholder="https://..."
                                value={proofForm.signatureUrl}
                                onChange={event =>
                                    setProofForm(value => ({
                                        ...value,
                                        signatureUrl: event.target.value
                                    }))
                                }
                                disabled={!canCompleteProof}
                            />
                        </label>
                    </div>

                    <label>
                        Observaciones
                        <textarea
                            rows={2}
                            maxLength={1000}
                            value={proofForm.notes}
                            onChange={event =>
                                setProofForm(value => ({
                                    ...value,
                                    notes: event.target.value
                                }))
                            }
                            disabled={!canCompleteProof}
                        />
                    </label>

                    <Button
                        type="submit"
                        loading={proofMutation.isPending}
                        disabled={!canCompleteProof}
                    >
                        Registrar comprobante
                    </Button>
                </form>

                <div className="tracking-upload">
                    <label>
                        <UploadCloud size={19} />
                        Adjuntar archivo JPG, PNG o PDF
                        <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                            onChange={event =>
                                setReceiptFile(event.target.files?.[0] ?? null)
                            }
                        />
                    </label>

                    <Button
                        type="button"
                        variant="secondary"
                        disabled={!receiptFile}
                        loading={uploadMutation.isPending}
                        onClick={() => uploadMutation.mutate(receiptFile)}
                    >
                        Subir archivo
                    </Button>
                </div>

                <p className="tracking-hint">
                    El archivo adjunto y el comprobante estructurado son
                    registros diferentes. Registrar el comprobante no cambia
                    automáticamente el estado a «Entregado».
                </p>
            </Card>
        </div>
    );
}

export default function TrackingPage() {
    const { role } = useAuth();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [selectedId, setSelectedId] = useState('');
    const [search, setSearch] = useState('');

    const isOperator = role === 'admin' || role === 'driver';

    const deliveriesQuery = useQuery({
        queryKey: ['deliveries', 'tracking', page],
        queryFn: () => deliveryService.list({ page, limit: 50 })
    });

    const deliveries = deliveriesQuery.data?.items ?? [];
    const activeId = selectedId || getEntityId(deliveries[0]);

    const detailQuery = useQuery({
        queryKey: ['tracking', activeId, 'details'],
        queryFn: () => deliveryLogisticsService.details(activeId),
        enabled: Boolean(activeId),
        refetchInterval: 60000
    });

    const locationsQuery = useQuery({
        queryKey: ['tracking', activeId, 'locations'],
        queryFn: () => deliveryLogisticsService.locations(activeId),
        enabled: Boolean(activeId),
        refetchInterval: 60000
    });

    const proofQuery = useQuery({
        queryKey: ['tracking', activeId, 'proof'],
        queryFn: () => deliveryLogisticsService.proof(activeId),
        enabled: Boolean(activeId)
    });

    const attemptsQuery = useQuery({
        queryKey: ['tracking', activeId, 'attempts'],
        queryFn: () => deliveryLogisticsService.attempts(activeId),
        enabled: Boolean(activeId) && isOperator
    });

    function refresh() {
        queryClient.invalidateQueries({ queryKey: ['tracking', activeId] });
        queryClient.invalidateQueries({ queryKey: ['deliveries'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }

    const delivery = detailQuery.data?.delivery;
    const order = detailQuery.data?.order;

    const history = locationsQuery.data?.locationHistory ?? [];
    const current = locationsQuery.data?.currentLocation;
    const attempts = attemptsQuery.data?.attempts ?? [];
    const proof = proofQuery.data?.proofOfDelivery;

    const displayedDeliveries = deliveries.filter(item => {
        const term = search.trim().toLowerCase();
        if (!term) return true;

        return [
            getEntityId(item),
            item.trackingCode,
            item.status,
            statusLabel(item.status),
            getEntityId(item.order)
        ].filter(Boolean).join(' ').toLowerCase().includes(term);
    });

    const currentMap = mapUrl(current);
    const hasLocation = Boolean(coordinates(current));

    function selectDelivery(id) {
        setSelectedId(id);
    }

   
    return (
        <div className="tracking-page">
            <PageHeader
                eyebrow="Centro logístico"
                title="Seguimiento de entregas"
                description="Ubicaciones, intentos, comprobantes y trazabilidad de cada operación."
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
                                {deliveriesQuery.data?.total ?? 0} registros
                            </span>
                        </div>

                        <Link to="/deliveries" title="Ir a entregas">
                            <ExternalLink size={17} />
                        </Link>
                    </div>

                    <input
                        type="search"
                        className="tracking-search"
                        placeholder="Buscar entrega..."
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                    />

                    {deliveriesQuery.isPending ? (
                        <LoadingState />
                    ) : deliveriesQuery.isError ? (
                        <EmptyState
                            icon={Truck}
                            title="Error al cargar entregas"
                            description={getApiErrorMessage(deliveriesQuery.error)}
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
                                            activeId === id ? 'is-active' : ''
                                        }`}
                                        onClick={() => selectDelivery(id)}
                                    >
                                        <span className="tracking-delivery-item__top">
                                            <strong>
                                                {item.trackingCode || `#${shortId(id)}`}
                                            </strong>
                                            <StatusBadge status={item.status} />
                                        </span>
                                        <small>Pedido #{shortId(item.order)}</small>
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
                            {page} / {Math.max(1, deliveriesQuery.data?.totalPages ?? 1)}
                        </span>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={
                                page >= (deliveriesQuery.data?.totalPages ?? 1)
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
                            <LoadingState title="Cargando trazabilidad" />
                        </Card>
                    ) : detailQuery.isError ? (
                        <Card className="tracking-card">
                            <EmptyState
                                icon={Truck}
                                title="No se pudo consultar la entrega"
                                description={getApiErrorMessage(detailQuery.error)}
                            />
                        </Card>
                    ) : (
                        <>
                            <Card className="tracking-card tracking-summary">
                                <div className="tracking-summary__heading">
                                    <div>
                                        <span className="tracking-eyebrow">
                                            Operación seleccionada
                                        </span>
                                        <h2>
                                            {delivery?.trackingCode ||
                                                `Entrega #${shortId(activeId)}`}
                                        </h2>
                                    </div>
                                    <StatusBadge status={delivery?.status} />
                                </div>

                                <div className="tracking-facts">
                                    <div>
                                        <span>Pedido asociado</span>
                                        <strong>#{shortId(delivery?.order)}</strong>
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

                            <Card className="tracking-card">
                                <SectionHeader
                                    icon={MapPin}
                                    title="Última ubicación registrada"
                                    subtitle="Coordenadas guardadas por el repartidor o el operador."
                                />

                                {locationsQuery.isError ? (
                                    <p className="tracking-empty">
                                        {getApiErrorMessage(locationsQuery.error)}
                                    </p>
                                ) : hasLocation ? (
                                    <div className="tracking-location">
                                        <div>
                                            <span>Latitud, longitud</span>
                                            <strong>{coordinateText(current)}</strong>
                                        </div>

                                        {currentMap && (
                                            <a
                                                href={currentMap}
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
                                        {[...history].reverse().slice(0, 30).map(
                                            (point, index) => (
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
                                                            {formatDateTime(point.recordedAt)}
                                                        </span>
                                                    </div>

                                                    {mapUrl(point) && (
                                                        <a
                                                            href={mapUrl(point)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            aria-label="Ver ubicación en mapa"
                                                        >
                                                            <ExternalLink size={15} />
                                                        </a>
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </Card>

                            <div className="tracking-two-columns">
                                <Card className="tracking-card">
                                    <SectionHeader
                                        icon={FileCheck2}
                                        title="Comprobante"
                                        subtitle="Prueba de recepción registrada."
                                    />

                                    {proofQuery.isError ? (
                                        <p className="tracking-empty">
                                            {getApiErrorMessage(proofQuery.error)}
                                        </p>
                                    ) : proof?.receivedAt ? (
                                        <div className="tracking-proof">
                                            <span className="tracking-proof__success">
                                                <FileCheck2 size={16} />
                                                Recepción confirmada
                                            </span>

                                            <strong>{proof.receivedBy}</strong>
                                            <small>{formatDateTime(proof.receivedAt)}</small>

                                            {proof.relationship && (
                                                <p>{proof.relationship}</p>
                                            )}

                                            {proof.notes && <p>{proof.notes}</p>}
                                        </div>
                                    ) : (
                                        <p className="tracking-empty">
                                            No hay comprobante estructurado.
                                        </p>
                                    )}
                                </Card>

                                {isOperator && (
                                    <Card className="tracking-card">
                                        <SectionHeader
                                            icon={ClipboardCheck}
                                            title="Intentos de entrega"
                                            subtitle="Registro de visitas e incidencias."
                                        />

                                        {attemptsQuery.isError ? (
                                            <p className="tracking-empty">
                                                {getApiErrorMessage(attemptsQuery.error)}
                                            </p>
                                        ) : attempts.length ? (
                                            <div className="tracking-record-list">
                                                {[...attempts].reverse().map(
                                                    (item, index) => (
                                                        <div
                                                            className="tracking-record"
                                                            key={`${item.attemptedAt}-${index}`}
                                                        >
                                                            <div>
                                                                <strong>
                                                                    {outcomeLabel(item.outcome)}
                                                                </strong>
                                                                <span>
                                                                    {formatDateTime(item.attemptedAt)}
                                                                </span>
                                                                {item.notes && (
                                                                    <p>{item.notes}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <p className="tracking-empty">
                                                No hay intentos registrados.
                                            </p>
                                        )}
                                    </Card>
                                )}
                            </div>

                            <Card className="tracking-card">
                                <OperationTimeline
                                    history={delivery?.statusHistory ?? []}
                                    currentStatus={delivery?.status}
                                    title="Historial operativo de la entrega"
                                />
                            </Card>

                            {isOperator && (
                                <TrackingOperations
                                    key={activeId}
                                    id={activeId}
                                    status={delivery?.status}
                                    proof={proof}
                                    refresh={refresh}
                                />
                            )}

                            <p className="tracking-footnote">
                                Los datos se actualizan al registrar eventos o
                                consultar nuevamente. El GPS no se envía en
                                segundo plano.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
