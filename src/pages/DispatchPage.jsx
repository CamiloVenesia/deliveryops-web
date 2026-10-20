
import { useEffect, useState } from 'react';
import {
    useMutation,
    useQuery,
    useQueryClient
} from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    CircleHelp,
    Package,
    RefreshCw,
    Search,
    ShieldCheck,
    Truck,
    UsersRound
} from 'lucide-react';

import { dispatchService } from '../api/dispatch.service.js';
import {
    deliveryService,
    orderService
} from '../api/services.js';
import { getApiErrorMessage } from '../api/normalizers.js';
import {
    getEntityId,
    formatDateTime,
    shortId
} from '../utils/formatters.js';
import {
    PageHeader,
    Pagination,
    StatusBadge
} from '../components/ui.jsx';

import './dispatch.css';

const PRIORITIES = [
    { value: 'low', label: 'Baja' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Alta' }
];

function DriverCard({
    driver,
    selected,
    onSelect,
    recommended
}) {
    const active = driver.metrics?.activeDeliveries ?? 0;
    const capacity = driver.maxConcurrentDeliveries ?? 12;

    const remaining = driver.remainingCapacity ??
        Math.max(0, capacity - active);

    const percentage = Math.min(
        100,
        Math.max(0, (active / capacity) * 100)
    );

    const name = [
        driver.firstName,
        driver.lastName
    ].filter(Boolean).join(' ') || 'Repartidor';

    return (
        <button
            type="button"
            className={`dispatch-driver ${
                selected ? 'is-selected' : ''
            }`}
            disabled={!driver.eligibleForAssignment}
            onClick={() => onSelect(driver.id)}
            aria-pressed={selected}
        >
            <span className="dispatch-driver__top">
                <span className="dispatch-avatar">
                    <Truck size={18} />
                </span>

                <span className="dispatch-driver__identity">
                    <strong>{name}</strong>
                    <small>{driver.email}</small>
                </span>

                {recommended && (
                    <span className="dispatch-recommended">
                        Recomendado
                    </span>
                )}

                {selected && (
                    <CheckCircle2
                        size={19}
                        className="dispatch-check"
                    />
                )}
            </span>

            <span className="dispatch-driver__numbers">
                <strong>{active} / {capacity} entregas</strong>
                <span>{remaining} cupos libres</span>
            </span>

            <span className="dispatch-progress" aria-hidden="true">
                <span
                    style={{
                        width: `${percentage}%`
                    }}
                />
            </span>

            <span className="dispatch-driver__bottom">
                <span
                    className={`dispatch-dot ${
                        driver.eligibleForAssignment
                            ? 'is-green'
                            : 'is-muted'
                    }`}
                />

                {driver.eligibleForAssignment
                    ? 'Disponible para asignar'
                    : driver.reason || 'No disponible'}
            </span>
        </button>
    );
}

export default function DispatchPage() {
    const queryClient = useQueryClient();

    const [orderSearch, setOrderSearch] = useState('');
    const [driverSearch, setDriverSearch] = useState('');

    const [orderTerm, setOrderTerm] = useState('');
    const [driverTerm, setDriverTerm] = useState('');

    const [orderStatus, setOrderStatus] = useState('created');
    const [page, setPage] = useState(1);

    const [orderId, setOrderId] = useState('');
    const [driverId, setDriverId] = useState('');
    const [priority, setPriority] = useState('normal');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const timer = setTimeout(
            () => setOrderTerm(orderSearch.trim()),
            350
        );

        return () => clearTimeout(timer);
    }, [orderSearch]);

    useEffect(() => {
        const timer = setTimeout(
            () => setDriverTerm(driverSearch.trim()),
            350
        );

        return () => clearTimeout(timer);
    }, [driverSearch]);

    const ordersQuery = useQuery({
        queryKey: [
            'dispatch',
            'orders',
            orderStatus,
            orderTerm,
            page
        ],

        queryFn: () => orderService.list({
            page,
            limit: 10,
            status: orderStatus,
            sort: 'newest',
            ...(orderTerm ? { q: orderTerm } : {})
        })
    });

    const driversQuery = useQuery({
        queryKey: [
            'dispatch',
            'recommendations',
            driverTerm
        ],

        queryFn: () => dispatchService.recommendations({
            page: 1,
            limit: 50,
            ...(driverTerm ? { q: driverTerm } : {})
        })
    });

    const orders = (
        ordersQuery.data?.items ?? []
    ).filter(item =>
        !item.delivery &&
        ['created', 'assigned'].includes(item.status)
    );

    const candidates = driversQuery.data?.items ?? [];

    const selectedOrder = orders.find(
        item => getEntityId(item) === orderId
    );

    const selectedDriver = candidates.find(
        item => item.id === driverId
    );

    const firstEligible = candidates.find(
        item => item.eligibleForAssignment
    )?.id;

    const awaitingSearch =
        orderSearch.trim() !== orderTerm ||
        driverSearch.trim() !== driverTerm;

    const assignMutation = useMutation({
        mutationFn: () => deliveryService.create({
            order: orderId,
            driver: driverId,
            priority
        }),

        onSuccess: result => {
            setSuccess(
                `Entrega ${
                    result?.trackingCode || shortId(result)
                } asignada correctamente.`
            );

            setOrderId('');
            setDriverId('');

            queryClient.invalidateQueries({
                queryKey: ['dispatch']
            });

            queryClient.invalidateQueries({
                queryKey: ['orders']
            });

            queryClient.invalidateQueries({
                queryKey: ['deliveries']
            });

            queryClient.invalidateQueries({
                queryKey: ['drivers']
            });

            queryClient.invalidateQueries({
                queryKey: ['analytics']
            });

            queryClient.invalidateQueries({
                queryKey: ['operations-intelligence']
            });
        }
    });

    function chooseOrder(order) {
        setSuccess('');
        assignMutation.reset();

        setOrderId(getEntityId(order));

        setPriority(
            PRIORITIES.some(
                item => item.value === order.priority
            )
                ? order.priority
                : 'normal'
        );
    }

    function changeOrderSearch(value) {
        setOrderSearch(value);
        setOrderId('');
        setSuccess('');
        setPage(1);
    }

    function changeDriverSearch(value) {
        setDriverSearch(value);
        setDriverId('');
    }

    const ready = Boolean(
        selectedOrder &&
        selectedDriver?.eligibleForAssignment &&
        !awaitingSearch
    );

    return (
        <div className="dispatch-page">
            <PageHeader
                eyebrow="Centro de despacho"
                title="Asignación inteligente"
                description="Elegí un pedido, compará la carga de trabajo y confirmá la entrega con un repartidor disponible."
            >
                <button
                    className="dispatch-refresh"
                    type="button"
                    onClick={() => {
                        queryClient.invalidateQueries({
                            queryKey: ['dispatch']
                        });
                    }}
                    disabled={
                        ordersQuery.isFetching ||
                        driversQuery.isFetching
                    }
                >
                    <RefreshCw size={16} />
                    Actualizar
                </button>
            </PageHeader>

            <div className="dispatch-hero">
                <div>
                    <span className="dispatch-hero__eyebrow">
                        DESPACHO · DELIVERYOPS
                    </span>

                    <h2>
                        La entrega correcta, al repartidor adecuado.
                    </h2>

                    <p>
                        La recomendación considera disponibilidad
                        y porcentaje de ocupación, no la distancia GPS.
                    </p>
                </div>

                <span
                    className="dispatch-hero__icon"
                    aria-hidden="true"
                >
                    <Truck size={45} />
                </span>
            </div>

            {success && (
                <div
                    className="dispatch-notice dispatch-notice--success"
                    role="status"
                >
                    <CheckCircle2 size={20} />

                    <span>{success}</span>

                    <Link to="/deliveries">
                        Ver entregas
                        <ArrowRight size={15} />
                    </Link>
                </div>
            )}

            {assignMutation.isError && (
                <div
                    className="dispatch-notice dispatch-notice--error"
                    role="alert"
                >
                    <AlertCircle size={20} />

                    <span>
                        {getApiErrorMessage(
                            assignMutation.error,
                            'La entrega no pudo asignarse. Actualizá las opciones y volvé a intentar.'
                        )}
                    </span>
                </div>
            )}

            <div className="dispatch-grid">
                <section
                    className="dispatch-panel"
                    aria-labelledby="dispatch-orders-title"
                >
                    <div className="dispatch-panel__heading">
                        <span className="dispatch-step">01</span>

                        <div>
                            <h3 id="dispatch-orders-title">
                                <Package size={18} />
                                Pedido a despachar
                            </h3>

                            <p>
                                Elegí un pedido sin entrega asociada.
                            </p>
                        </div>
                    </div>

                    <div className="dispatch-panel__filters">
                        <label className="dispatch-search">
                            <Search size={17} />

                            <input
                                type="search"
                                value={orderSearch}
                                placeholder="Buscar código o destinatario"
                                onChange={event =>
                                    changeOrderSearch(event.target.value)
                                }
                                maxLength={120}
                                aria-label="Buscar pedido"
                            />
                        </label>

                        <label className="dispatch-label">
                            Estado del pedido

                            <select
                                value={orderStatus}
                                onChange={event => {
                                    setOrderStatus(event.target.value);
                                    setPage(1);
                                    setOrderId('');
                                }}
                            >
                                <option value="created">
                                    Creado
                                </option>

                                <option value="assigned">
                                    Asignado sin entrega
                                </option>
                            </select>
                        </label>
                    </div>

                    <div
                        className="dispatch-list"
                        aria-live="polite"
                    >
                        {ordersQuery.isPending ||
                        orderSearch.trim() !== orderTerm ? (
                            <p className="dispatch-state">
                                Buscando pedidos…
                            </p>
                        ) : ordersQuery.isError ? (
                            <p className="dispatch-state dispatch-state--error">
                                {getApiErrorMessage(
                                    ordersQuery.error
                                )}
                            </p>
                        ) : orders.length ? (
                            orders.map(order => {
                                const id = getEntityId(order);

                                return (
                                    <button
                                        type="button"
                                        key={id}
                                        className={`dispatch-order ${
                                            orderId === id
                                                ? 'is-selected'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            chooseOrder(order)
                                        }
                                        aria-pressed={orderId === id}
                                    >
                                        <span className="dispatch-order__icon">
                                            <Package size={17} />
                                        </span>

                                        <span className="dispatch-order__body">
                                            <strong>
                                                {order.trackingCode ||
                                                    `#${shortId(id)}`}
                                            </strong>

                                            <small>
                                                {order.recipient?.fullName ||
                                                    order.deliveryAddress ||
                                                    'Sin destinatario'}
                                            </small>

                                            <small>
                                                {formatDateTime(
                                                    order.createdAt
                                                )}
                                            </small>
                                        </span>

                                        <StatusBadge status={order.status} />

                                        {orderId === id && (
                                            <CheckCircle2
                                                size={18}
                                                className="dispatch-check"
                                            />
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <p className="dispatch-state">
                                No hay pedidos sin entrega en
                                esta página. Probá otro estado
                                o una búsqueda.
                            </p>
                        )}
                    </div>

                    <div className="dispatch-pagination">
                        <Pagination
                            page={page}
                            totalPages={Math.max(
                                1,
                                ordersQuery.data?.totalPages ?? 1
                            )}
                            total={ordersQuery.data?.total ?? 0}
                            onPageChange={next => {
                                setPage(next);
                                setOrderId('');
                            }}
                        />
                    </div>
                </section>

                <section
                    className="dispatch-panel"
                    aria-labelledby="dispatch-drivers-title"
                >
                    <div className="dispatch-panel__heading">
                        <span className="dispatch-step">02</span>

                        <div>
                            <h3 id="dispatch-drivers-title">
                                <UsersRound size={18} />
                                Repartidor recomendado
                            </h3>

                            <p>
                                Ordenados por capacidad disponible
                                y menor ocupación.
                            </p>
                        </div>
                    </div>

                    <div className="dispatch-panel__filters">
                        <label className="dispatch-search">
                            <Search size={17} />

                            <input
                                type="search"
                                value={driverSearch}
                                placeholder="Buscar nombre o email"
                                onChange={event =>
                                    changeDriverSearch(event.target.value)
                                }
                                maxLength={80}
                                aria-label="Buscar repartidor"
                            />
                        </label>

                        <span className="dispatch-count">
                            {driversQuery.data?.eligibleOnPage ?? '—'}
                            {' '}disponibles ·{' '}
                            {driversQuery.data?.total ?? '—'}
                            {' '}repartidores
                        </span>
                    </div>

                    <div
                        className="dispatch-list dispatch-list--drivers"
                        aria-live="polite"
                    >
                        {driversQuery.isPending ||
                        driverSearch.trim() !== driverTerm ? (
                            <p className="dispatch-state">
                                Calculando disponibilidad…
                            </p>
                        ) : driversQuery.isError ? (
                            <p className="dispatch-state dispatch-state--error">
                                {getApiErrorMessage(
                                    driversQuery.error
                                )}.
                                {' '}Verificá el backend local
                                del Bloque 11.
                            </p>
                        ) : candidates.length ? (
                            candidates.map(driver => (
                                <DriverCard
                                    key={driver.id}
                                    driver={driver}
                                    selected={
                                        driverId === driver.id
                                    }
                                    onSelect={id => {
                                        setDriverId(id);
                                        setSuccess('');
                                        assignMutation.reset();
                                    }}
                                    recommended={
                                        driver.id === firstEligible
                                    }
                                />
                            ))
                        ) : (
                            <p className="dispatch-state">
                                No se encontraron repartidores
                                con esos datos.
                            </p>
                        )}
                    </div>

                    <p className="dispatch-hint">
                        <CircleHelp size={15} />

                        Se comparan hasta 50 repartidores por
                        consulta. El backend verifica nuevamente
                        los cupos al confirmar.
                    </p>
                </section>
            </div>

            <section
                className="dispatch-confirm"
                aria-labelledby="dispatch-confirm-title"
            >
                <div className="dispatch-confirm__heading">
                    <span className="dispatch-step">03</span>

                    <div>
                        <h3 id="dispatch-confirm-title">
                            <ShieldCheck size={19} />
                            Confirmar asignación
                        </h3>

                        <p>
                            Revisá los datos antes de crear
                            la entrega.
                        </p>
                    </div>
                </div>

                <div className="dispatch-confirm__fields">
                    <div>
                        <span>PEDIDO</span>

                        <strong>
                            {selectedOrder?.trackingCode ||
                                (
                                    selectedOrder
                                        ? `#${shortId(selectedOrder)}`
                                        : 'Seleccioná un pedido'
                                )}
                        </strong>
                    </div>

                    <div>
                        <span>REPARTIDOR</span>

                        <strong>
                            {selectedDriver
                                ? [
                                    selectedDriver.firstName,
                                    selectedDriver.lastName
                                ].filter(Boolean).join(' ')
                                : 'Seleccioná un repartidor'}
                        </strong>
                    </div>

                    <label className="dispatch-label">
                        Prioridad de entrega

                        <select
                            value={priority}
                            onChange={event =>
                                setPriority(event.target.value)
                            }
                        >
                            {PRIORITIES.map(option => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="dispatch-confirm__actions">
                    <p>
                        <ShieldCheck size={15} />
                        La disponibilidad se comprobará
                        nuevamente al guardar.
                    </p>

                    <button
                        type="button"
                        className="dispatch-submit"
                        disabled={
                            !ready ||
                            assignMutation.isPending
                        }
                        onClick={() => {
                            setSuccess('');
                            assignMutation.mutate();
                        }}
                    >
                        {assignMutation.isPending
                            ? 'Asignando…'
                            : 'Confirmar asignación'}

                        <ArrowRight size={17} />
                    </button>
                </div>
            </section>
        </div>
    );
}
