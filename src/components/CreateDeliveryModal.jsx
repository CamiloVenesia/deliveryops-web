import {
    useMemo,
    useState
} from 'react';

import {
    useMutation,
    useQuery,
    useQueryClient
} from '@tanstack/react-query';

import {
    CheckCircle2,
    MapPin,
    Package,
    Search,
    Truck,
    UserRound
} from 'lucide-react';

import {
    deliveryService,
    orderService,
    userService
} from '../api/services.js';

import {
    getApiErrorMessage
} from '../api/normalizers.js';

import {
    Button,
    EmptyState,
    LoadingState,
    Modal,
    StatusBadge
} from './ui.jsx';

import {
    useToast
} from './useToast.js';

import {
    formatMoney,
    getEntityId,
    getPersonName,
    shortId
} from '../utils/formatters.js';

import '../styles/assignment.css';

const EMPTY_ARRAY = [];

export default function CreateDeliveryModal({
    open,
    onClose,
    initialOrderId = ''
}) {
    const {
        pushToast
    } =
        useToast();

    const queryClient =
        useQueryClient();

    const [
        orderId,
        setOrderId
    ] =
        useState(
            initialOrderId
        );

    const [
        driverId,
        setDriverId
    ] =
        useState('');

    const [
        priority,
        setPriority
    ] =
        useState(
            'normal'
        );

    const [
        orderSearch,
        setOrderSearch
    ] =
        useState('');

    const [
        driverSearch,
        setDriverSearch
    ] =
        useState('');

    const ordersQuery =
        useQuery({
            queryKey: [
                'orders',
                'assignment-options'
            ],

            queryFn: () =>
                orderService.list({
                    page:
                        1,
                    limit:
                        50
                }),

            enabled:
                open
        });

    const usersQuery =
        useQuery({
            queryKey: [
                'users',
                'assignment-drivers'
            ],

            queryFn: () =>
                userService.list({
                    page:
                        1,
                    limit:
                        50
                }),

            enabled:
                open
        });

    const initialOrderQuery =
        useQuery({
            queryKey: [
                'order',
                initialOrderId,
                'assignment'
            ],

            queryFn: () =>
                orderService.getById(
                    initialOrderId
                ),

            enabled:
                open &&
                Boolean(
                    initialOrderId
                )
        });

    const rawOrders =
        ordersQuery.data
            ?.items ??
        EMPTY_ARRAY;

    const users =
        usersQuery.data
            ?.items ??
        EMPTY_ARRAY;

    const allOrders =
        useMemo(
            () => {
                const map =
                    new Map();

                rawOrders.forEach(
                    (
                        item
                    ) => {
                        map.set(
                            getEntityId(
                                item
                            ),
                            item
                        );
                    }
                );

                if (
                    initialOrderQuery.data
                ) {
                    map.set(
                        getEntityId(
                            initialOrderQuery.data
                        ),
                        initialOrderQuery.data
                    );
                }

                return Array.from(
                    map.values()
                );
            },
            [
                rawOrders,
                initialOrderQuery.data
            ]
        );

    const availableOrders =
        useMemo(
            () =>
                allOrders.filter(
                    (
                        item
                    ) =>
                        !item.delivery &&
                        [
                            'created',
                            'assigned'
                        ].includes(
                            item.status
                        )
                ),
            [
                allOrders
            ]
        );

    const drivers =
        useMemo(
            () =>
                users.filter(
                    (
                        item
                    ) =>
                        item.role ===
                        'driver'
                ),
            [
                users
            ]
        );

    const filteredOrders =
        useMemo(
            () => {
                const term =
                    orderSearch
                        .trim()
                        .toLowerCase();

                if (!term) {
                    return availableOrders;
                }

                return availableOrders.filter(
                    (
                        item
                    ) =>
                        [
                            getEntityId(
                                item
                            ),
                            item.deliveryAddress,
                            item.status,
                            item.priority
                        ]
                            .filter(
                                Boolean
                            )
                            .join(
                                ' '
                            )
                            .toLowerCase()
                            .includes(
                                term
                            )
                );
            },
            [
                availableOrders,
                orderSearch
            ]
        );

    const filteredDrivers =
        useMemo(
            () => {
                const term =
                    driverSearch
                        .trim()
                        .toLowerCase();

                if (!term) {
                    return drivers;
                }

                return drivers.filter(
                    (
                        item
                    ) =>
                        [
                            getEntityId(
                                item
                            ),
                            getPersonName(
                                item
                            ),
                            item.email
                        ]
                            .filter(
                                Boolean
                            )
                            .join(
                                ' '
                            )
                            .toLowerCase()
                            .includes(
                                term
                            )
                );
            },
            [
                drivers,
                driverSearch
            ]
        );

    const selectedOrder =
        availableOrders.find(
            (
                item
            ) =>
                getEntityId(
                    item
                ) ===
                orderId
        ) ??
        null;

    const selectedDriver =
        drivers.find(
            (
                item
            ) =>
                getEntityId(
                    item
                ) ===
                driverId
        ) ??
        null;

    const mutation =
        useMutation({
            mutationFn: () =>
                deliveryService.create({
                    order:
                        orderId,

                    driver:
                        driverId,

                    priority
                }),

            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey: [
                        'deliveries'
                    ]
                });

                queryClient.invalidateQueries({
                    queryKey: [
                        'delivery'
                    ]
                });

                queryClient.invalidateQueries({
                    queryKey: [
                        'orders'
                    ]
                });

                queryClient.invalidateQueries({
                    queryKey: [
                        'order'
                    ]
                });

                queryClient.invalidateQueries({
                    queryKey: [
                        'dashboard'
                    ]
                });

                pushToast({
                    title:
                        'Entrega asignada',

                    message:
                        'El pedido fue asignado al repartidor correctamente.'
                });

                handleClose();
            },

            onError: (
                error
            ) =>
                pushToast({
                    type:
                        'error',

                    title:
                        'No se pudo asignar',

                    message:
                        getApiErrorMessage(
                            error
                        )
                })
        });

    function handleClose() {
        setOrderId(
            ''
        );

        setDriverId(
            ''
        );

        setPriority(
            'normal'
        );

        setOrderSearch(
            ''
        );

        setDriverSearch(
            ''
        );

        onClose();
    }

    function selectOrder(
        item
    ) {
        setOrderId(
            getEntityId(
                item
            )
        );

        setPriority(
            item.priority ??
                'normal'
        );
    }

    const loading =
        ordersQuery.isLoading ||
        usersQuery.isLoading ||
        (
            initialOrderId &&
            initialOrderQuery.isLoading
        );

    const queryError =
        ordersQuery.error ??
        usersQuery.error ??
        initialOrderQuery.error;

    return (
        <Modal
            open={
                open
            }
            onClose={
                handleClose
            }
            title="Asignar entrega"
            description="Seleccioná el pedido y el repartidor responsables de la operación."
            size="lg"
            footer={
                <>
                    <Button
                        variant="secondary"
                        onClick={
                            handleClose
                        }
                    >
                        Cancelar
                    </Button>

                    <Button
                        icon={
                            Truck
                        }
                        disabled={
                            !orderId ||
                            !driverId
                        }
                        loading={
                            mutation.isPending
                        }
                        onClick={() =>
                            mutation.mutate()
                        }
                    >
                        Confirmar asignación
                    </Button>
                </>
            }
        >
            {loading ? (
                <LoadingState
                    title="Preparando asignación"
                    description="Estamos cargando los pedidos y repartidores disponibles."
                />
            ) : queryError ? (
                <EmptyState
                    icon={
                        Truck
                    }
                    title="No pudimos cargar la asignación"
                    description={getApiErrorMessage(
                        queryError
                    )}
                />
            ) : (
                <div className="assignment">
                    <section className="assignment__section">
                        <div className="assignment__section-heading">
                            <span className="assignment__step">
                                1
                            </span>

                            <div>
                                <h3>
                                    Seleccionar pedido
                                </h3>

                                <p>
                                    Elegí un pedido que todavía no tenga una entrega asociada.
                                </p>
                            </div>

                            <span className="assignment__count">
                                {
                                    availableOrders.length
                                }{' '}
                                disponibles
                            </span>
                        </div>

                        <label className="assignment__search">
                            <Search
                                size={
                                    16
                                }
                            />

                            <input
                                type="search"
                                placeholder="Buscar por ID o dirección..."
                                value={
                                    orderSearch
                                }
                                onChange={
                                    (
                                        event
                                    ) =>
                                        setOrderSearch(
                                            event
                                                .target
                                                .value
                                        )
                                }
                            />
                        </label>

                        {filteredOrders.length ===
                        0 ? (
                            <div className="assignment__empty">
                                <Package
                                    size={
                                        20
                                    }
                                />

                                <div>
                                    <strong>
                                        No hay pedidos disponibles
                                    </strong>

                                    <span>
                                        Los pedidos asignados o con entrega existente no aparecen en esta lista.
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="assignment__options">
                                {filteredOrders.map(
                                    (
                                        item
                                    ) => {
                                        const id =
                                            getEntityId(
                                                item
                                            );

                                        const selected =
                                            id ===
                                            orderId;

                                        const itemCount =
                                            item
                                                .items
                                                ?.length ??
                                            0;

                                        return (
                                            <button
                                                key={
                                                    id
                                                }
                                                type="button"
                                                className={`assignment-card ${
                                                    selected
                                                        ? 'assignment-card--selected'
                                                        : ''
                                                }`}
                                                onClick={() =>
                                                    selectOrder(
                                                        item
                                                    )
                                                }
                                            >
                                                <div className="assignment-card__top">
                                                    <span className="assignment-card__icon">
                                                        <Package
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    </span>

                                                    <div className="assignment-card__identity">
                                                        <strong>
                                                            Pedido #
                                                            {shortId(
                                                                item
                                                            )}
                                                        </strong>

                                                        <span>
                                                            {
                                                                itemCount
                                                            }{' '}
                                                            {itemCount ===
                                                            1
                                                                ? 'item'
                                                                : 'items'}
                                                        </span>
                                                    </div>

                                                    <div className="assignment-card__badges">
                                                        <StatusBadge
                                                            status={
                                                                item.priority ??
                                                                'normal'
                                                            }
                                                        />

                                                        <StatusBadge
                                                            status={
                                                                item.status
                                                            }
                                                        />
                                                    </div>
                                                </div>

                                                <div className="assignment-card__details">
                                                    <span>
                                                        <MapPin
                                                            size={
                                                                13
                                                            }
                                                        />

                                                        {item.deliveryAddress ??
                                                            'Sin dirección registrada'}
                                                    </span>

                                                    <strong>
                                                        {formatMoney(
                                                            item.total
                                                        )}
                                                    </strong>
                                                </div>

                                                {selected && (
                                                    <span className="assignment-card__selected-mark">
                                                        <CheckCircle2
                                                            size={
                                                                14
                                                            }
                                                        />

                                                        Seleccionado
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </section>

                    <section className="assignment__section">
                        <div className="assignment__section-heading">
                            <span className="assignment__step">
                                2
                            </span>

                            <div>
                                <h3>
                                    Seleccionar repartidor
                                </h3>

                                <p>
                                    Asigná la operación a un usuario con rol de repartidor.
                                </p>
                            </div>

                            <span className="assignment__count">
                                {
                                    drivers.length
                                }{' '}
                                repartidores
                            </span>
                        </div>

                        <label className="assignment__search">
                            <Search
                                size={
                                    16
                                }
                            />

                            <input
                                type="search"
                                placeholder="Buscar repartidor..."
                                value={
                                    driverSearch
                                }
                                onChange={
                                    (
                                        event
                                    ) =>
                                        setDriverSearch(
                                            event
                                                .target
                                                .value
                                        )
                                }
                            />
                        </label>

                        {filteredDrivers.length ===
                        0 ? (
                            <div className="assignment__empty">
                                <UserRound
                                    size={
                                        20
                                    }
                                />

                                <div>
                                    <strong>
                                        No hay repartidores disponibles
                                    </strong>

                                    <span>
                                        Primero debe existir al menos un usuario con rol de repartidor.
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="assignment__drivers">
                                {filteredDrivers.map(
                                    (
                                        driver
                                    ) => {
                                        const id =
                                            getEntityId(
                                                driver
                                            );

                                        const selected =
                                            id ===
                                            driverId;

                                        return (
                                            <button
                                                key={
                                                    id
                                                }
                                                type="button"
                                                className={`driver-option ${
                                                    selected
                                                        ? 'driver-option--selected'
                                                        : ''
                                                }`}
                                                onClick={() =>
                                                    setDriverId(
                                                        id
                                                    )
                                                }
                                            >
                                                <span className="driver-option__avatar">
                                                    <UserRound
                                                        size={
                                                            17
                                                        }
                                                    />
                                                </span>

                                                <div>
                                                    <strong>
                                                        {getPersonName(
                                                            driver
                                                        )}
                                                    </strong>

                                                    <span>
                                                        {driver.email ??
                                                            `#${shortId(
                                                                driver
                                                            )}`}
                                                    </span>
                                                </div>

                                                {selected ? (
                                                    <CheckCircle2
                                                        className="driver-option__check"
                                                        size={
                                                            18
                                                        }
                                                    />
                                                ) : (
                                                    <StatusBadge
                                                        status="driver"
                                                    />
                                                )}
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </section>

                    <section className="assignment__section">
                        <div className="assignment__section-heading">
                            <span className="assignment__step">
                                3
                            </span>

                            <div>
                                <h3>
                                    Configurar operación
                                </h3>

                                <p>
                                    Confirmá la prioridad antes de generar la entrega.
                                </p>
                            </div>
                        </div>

                        <div className="assignment__priority">
                            <label className="form-field">
                                <span className="form-label">
                                    Prioridad de la entrega
                                </span>

                                <select
                                    className="form-select"
                                    value={
                                        priority
                                    }
                                    onChange={
                                        (
                                            event
                                        ) =>
                                            setPriority(
                                                event
                                                    .target
                                                    .value
                                            )
                                    }
                                >
                                    <option value="low">
                                        Baja
                                    </option>

                                    <option value="normal">
                                        Normal
                                    </option>

                                    <option value="high">
                                        Alta
                                    </option>
                                </select>
                            </label>

                            <div className="assignment__priority-preview">
                                <span>
                                    Prioridad seleccionada
                                </span>

                                <StatusBadge
                                    status={
                                        priority
                                    }
                                />
                            </div>
                        </div>
                    </section>

                    <section className="assignment-summary">
                        <div className="assignment-summary__heading">
                            <CheckCircle2
                                size={
                                    18
                                }
                            />

                            <div>
                                <strong>
                                    Resumen de asignación
                                </strong>

                                <span>
                                    Revisá los datos antes de confirmar.
                                </span>
                            </div>
                        </div>

                        <div className="assignment-summary__grid">
                            <div>
                                <span>
                                    Pedido
                                </span>

                                <strong>
                                    {selectedOrder
                                        ? `#${shortId(
                                              selectedOrder
                                          )}`
                                        : 'Sin seleccionar'}
                                </strong>

                                <small>
                                    {selectedOrder
                                        ?.deliveryAddress ??
                                        'Seleccioná un pedido'}
                                </small>
                            </div>

                            <div>
                                <span>
                                    Repartidor
                                </span>

                                <strong>
                                    {selectedDriver
                                        ? getPersonName(
                                              selectedDriver
                                          )
                                        : 'Sin seleccionar'}
                                </strong>

                                <small>
                                    {selectedDriver
                                        ?.email ??
                                        'Seleccioná un repartidor'}
                                </small>
                            </div>

                            <div>
                                <span>
                                    Prioridad
                                </span>

                                <strong>
                                    <StatusBadge
                                        status={
                                            priority
                                        }
                                    />
                                </strong>

                                <small>
                                    Estado inicial: Asignado
                                </small>
                            </div>
                        </div>

                        {orderId &&
                            driverId && (
                                <div className="assignment-summary__ready">
                                    <CheckCircle2
                                        size={
                                            15
                                        }
                                    />

                                    La asignación está lista para confirmarse.
                                </div>
                            )}
                    </section>
                </div>
            )}
        </Modal>
    );
}