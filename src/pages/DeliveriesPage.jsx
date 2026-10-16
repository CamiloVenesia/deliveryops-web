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
    Eye,
    FileUp,
    MapPin,
    Package,
    Plus,
    ReceiptText,
    Trash2,
    Truck
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
    useAuth
} from '../auth/useAuth.js';

import OperationTimeline from '../components/OperationTimeline.jsx';

import {
    useToast
} from '../components/useToast.js';

import {
    Button,
    Card,
    EmptyState,
    LoadingState,
    Modal,
    PageHeader,
    Pagination,
    SearchInput,
    StatusBadge
} from '../components/ui.jsx';

import {
    formatDateTime,
    getEntityId,
    getPersonName,
    shortId,
    statusLabel
} from '../utils/formatters.js';

const EMPTY_ARRAY = [];

const statusOptions = [
    'pending',
    'assigned',
    'in_transit',
    'delivered',
    'cancelled'
];

const DELIVERY_TRANSITIONS = {
    pending: [
        'assigned',
        'cancelled'
    ],

    assigned: [
        'in_transit',
        'cancelled'
    ],

    in_transit: [
        'delivered',
        'cancelled'
    ],

    delivered: [],

    cancelled: []
};

function getStatusChoices(
    status
) {
    return [
        status,
        ...(
            DELIVERY_TRANSITIONS[
                status
            ] ??
            []
        )
    ].filter(
        Boolean
    );
}

function formatFileSize(
    value
) {
    const bytes =
        Number(
            value
        );

    if (
        !bytes ||
        Number.isNaN(
            bytes
        )
    ) {
        return '';
    }

    if (
        bytes <
        1024
    ) {
        return `${bytes} B`;
    }

    if (
        bytes <
        1024 *
            1024
    ) {
        return `${(
            bytes /
            1024
        ).toFixed(
            1
        )} KB`;
    }

    return `${(
        bytes /
        1024 /
        1024
    ).toFixed(
        1
    )} MB`;
}

export default function DeliveriesPage() {
    const {
        role
    } =
        useAuth();

    const {
        pushToast
    } =
        useToast();

    const queryClient =
        useQueryClient();

    const isAdmin =
        role ===
        'admin';

    const canUpdate =
        [
            'admin',
            'driver'
        ].includes(
            role
        );

    const [
        page,
        setPage
    ] =
        useState(1);

    const [
        search,
        setSearch
    ] =
        useState('');

    const [
        statusFilter,
        setStatusFilter
    ] =
        useState('');

    const [
        createOpen,
        setCreateOpen
    ] =
        useState(false);

    const [
        detailDelivery,
        setDetailDelivery
    ] =
        useState(null);

    const [
        receiptDelivery,
        setReceiptDelivery
    ] =
        useState(null);

    const [
        deleteDelivery,
        setDeleteDelivery
    ] =
        useState(null);

    const deliveriesQuery =
        useQuery({
            queryKey: [
                'deliveries',
                page
            ],

            queryFn: () =>
                deliveryService.list({
                    page,
                    limit:
                        10
                })
        });

    const usersQuery =
        useQuery({
            queryKey: [
                'users',
                'delivery-options'
            ],

            queryFn: () =>
                userService.list({
                    page:
                        1,
                    limit:
                        50
                }),

            enabled:
                isAdmin
        });

    const ordersQuery =
        useQuery({
            queryKey: [
                'orders',
                'delivery-options'
            ],

            queryFn: () =>
                orderService.list({
                    page:
                        1,
                    limit:
                        50
                }),

            enabled:
                isAdmin ||
                role ===
                    'customer'
        });

    const deliveries =
        deliveriesQuery.data
            ?.items ??
        EMPTY_ARRAY;

    const users =
        usersQuery.data
            ?.items ??
        EMPTY_ARRAY;

    const orders =
        ordersQuery.data
            ?.items ??
        EMPTY_ARRAY;

    const usersMap =
        useMemo(
            () =>
                new Map(
                    users.map(
                        (
                            item
                        ) => [
                            getEntityId(
                                item
                            ),
                            item
                        ]
                    )
                ),
            [
                users
            ]
        );

    const ordersMap =
        useMemo(
            () =>
                new Map(
                    orders.map(
                        (
                            item
                        ) => [
                            getEntityId(
                                item
                            ),
                            item
                        ]
                    )
                ),
            [
                orders
            ]
        );

    function resolveDriver(
        delivery
    ) {
        if (
            delivery?.driver &&
            typeof delivery.driver ===
                'object'
        ) {
            return delivery.driver;
        }

        return (
            usersMap.get(
                getEntityId(
                    delivery?.driver
                )
            ) ??
            null
        );
    }

    function resolveOrder(
        delivery
    ) {
        if (
            delivery?.order &&
            typeof delivery.order ===
                'object'
        ) {
            return delivery.order;
        }

        return (
            ordersMap.get(
                getEntityId(
                    delivery?.order
                )
            ) ??
            null
        );
    }

    const visibleDeliveries =
        useMemo(
            () => {
                const term =
                    search
                        .trim()
                        .toLowerCase();

                return deliveries.filter(
                    (
                        delivery
                    ) => {
                        const orderId =
                            getEntityId(
                                delivery.order
                            );

                        const driverId =
                            getEntityId(
                                delivery.driver
                            );

                        const driver =
                            usersMap.get(
                                driverId
                            );

                        const order =
                            ordersMap.get(
                                orderId
                            );

                        const matchesStatus =
                            !statusFilter ||
                            delivery.status ===
                                statusFilter;

                        const searchable =
                            [
                                delivery._id,
                                orderId,
                                order?.deliveryAddress,
                                driver?.email,
                                driver
                                    ? getPersonName(
                                          driver
                                      )
                                    : null,
                                delivery.status,
                                statusLabel(
                                    delivery.status
                                )
                            ]
                                .filter(
                                    Boolean
                                )
                                .join(
                                    ' '
                                )
                                .toLowerCase();

                        return (
                            matchesStatus &&
                            (
                                !term ||
                                searchable.includes(
                                    term
                                )
                            )
                        );
                    }
                );
            },
            [
                deliveries,
                search,
                statusFilter,
                usersMap,
                ordersMap
            ]
        );

    const statusMutation =
        useMutation({
            mutationFn: ({
                id,
                status
            }) =>
                deliveryService.updateStatus(
                    id,
                    status
                ),

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
                        'Entrega actualizada',

                    message:
                        'El estado operativo fue actualizado correctamente.'
                });
            },

            onError: (
                error
            ) =>
                pushToast({
                    type:
                        'error',

                    title:
                        'No se pudo actualizar',

                    message:
                        getApiErrorMessage(
                            error
                        )
                })
        });

    const deleteMutation =
        useMutation({
            mutationFn: (
                id
            ) =>
                deliveryService.remove(
                    id
                ),

            onSuccess: () => {
                setDeleteDelivery(
                    null
                );

                queryClient.invalidateQueries({
                    queryKey: [
                        'deliveries'
                    ]
                });

                queryClient.invalidateQueries({
                    queryKey: [
                        'orders'
                    ]
                });

                queryClient.invalidateQueries({
                    queryKey: [
                        'dashboard'
                    ]
                });

                pushToast({
                    title:
                        'Entrega eliminada',

                    message:
                        'La asignación fue revertida correctamente.'
                });
            },

            onError: (
                error
            ) =>
                pushToast({
                    type:
                        'error',

                    title:
                        'No se pudo eliminar',

                    message:
                        getApiErrorMessage(
                            error
                        )
                })
        });

    return (
        <>
            <PageHeader
                eyebrow="Operaciones"
                title="Entregas"
                description={
                    role ===
                    'driver'
                        ? 'Gestioná las entregas visibles en tu cuenta y consultá su trazabilidad.'
                        : 'Seguimiento operativo y trazabilidad de las entregas.'
                }
            >
                {isAdmin && (
                    <Button
                        icon={
                            Plus
                        }
                        onClick={() =>
                            setCreateOpen(
                                true
                            )
                        }
                    >
                        Nueva entrega
                    </Button>
                )}
            </PageHeader>

            <Card className="table-card">
                <div className="table-toolbar">
                    <SearchInput
                        value={
                            search
                        }
                        onChange={
                            (
                                event
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value
                                )
                        }
                        placeholder="Buscar entrega..."
                    />

                    <select
                        className="filter-select"
                        value={
                            statusFilter
                        }
                        onChange={
                            (
                                event
                            ) =>
                                setStatusFilter(
                                    event
                                        .target
                                        .value
                                )
                        }
                    >
                        <option value="">
                            Todos los estados
                        </option>

                        {statusOptions.map(
                            (
                                status
                            ) => (
                                <option
                                    value={
                                        status
                                    }
                                    key={
                                        status
                                    }
                                >
                                    {statusLabel(
                                        status
                                    )}
                                </option>
                            )
                        )}
                    </select>
                </div>

                {deliveriesQuery.isLoading ? (
                    <LoadingState />
                ) : visibleDeliveries.length ===
                  0 ? (
                    <EmptyState
                        icon={
                            Truck
                        }
                        title="No hay entregas para mostrar"
                        description="Cuando existan entregas disponibles aparecerán en esta sección."
                    />
                ) : (
                    <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>
                                        Entrega
                                    </th>

                                    <th>
                                        Pedido
                                    </th>

                                    {isAdmin && (
                                        <th>
                                            Repartidor
                                        </th>
                                    )}

                                    <th>
                                        Prioridad
                                    </th>

                                    <th>
                                        Estado
                                    </th>

                                    <th>
                                        Asignada
                                    </th>

                                    <th className="table-actions-column">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {visibleDeliveries.map(
                                    (
                                        delivery
                                    ) => {
                                        const id =
                                            getEntityId(
                                                delivery
                                            );

                                        const orderId =
                                            getEntityId(
                                                delivery.order
                                            );

                                        const driverId =
                                            getEntityId(
                                                delivery.driver
                                            );

                                        const driver =
                                            resolveDriver(
                                                delivery
                                            );

                                        const order =
                                            resolveOrder(
                                                delivery
                                            );

                                        const choices =
                                            getStatusChoices(
                                                delivery.status
                                            );

                                        const canTransition =
                                            choices.length >
                                            1;

                                        const canDelete =
                                            [
                                                'pending',
                                                'assigned'
                                            ].includes(
                                                delivery.status
                                            );

                                        return (
                                            <tr
                                                key={
                                                    id
                                                }
                                            >
                                                <td>
                                                    <div className="entity-cell">
                                                        <span className="entity-icon entity-icon--delivery">
                                                            <Truck
                                                                size={
                                                                    16
                                                                }
                                                            />
                                                        </span>

                                                        <div>
                                                            <strong>
                                                                #
                                                                {shortId(
                                                                    id
                                                                )}
                                                            </strong>

                                                            <span>
                                                                Entrega
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="table-person">
                                                        <strong>
                                                            #
                                                            {shortId(
                                                                orderId
                                                            )}
                                                        </strong>

                                                        {order?.deliveryAddress && (
                                                            <span>
                                                                {
                                                                    order.deliveryAddress
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {isAdmin && (
                                                    <td>
                                                        <div className="table-person">
                                                            <strong>
                                                                {driver
                                                                    ? getPersonName(
                                                                          driver
                                                                      )
                                                                    : `#${shortId(
                                                                          driverId
                                                                      )}`}
                                                            </strong>

                                                            {driver?.email && (
                                                                <span>
                                                                    {
                                                                        driver.email
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}

                                                <td>
                                                    <StatusBadge
                                                        status={
                                                            delivery.priority ??
                                                            'normal'
                                                        }
                                                    />
                                                </td>

                                                <td>
                                                    {canUpdate &&
                                                    canTransition ? (
                                                        <select
                                                            className="table-status-select"
                                                            value={
                                                                delivery.status ??
                                                                'assigned'
                                                            }
                                                            disabled={
                                                                statusMutation.isPending
                                                            }
                                                            onChange={
                                                                (
                                                                    event
                                                                ) =>
                                                                    statusMutation.mutate(
                                                                        {
                                                                            id,

                                                                            status:
                                                                                event
                                                                                    .target
                                                                                    .value
                                                                        }
                                                                    )
                                                            }
                                                        >
                                                            {choices.map(
                                                                (
                                                                    status
                                                                ) => (
                                                                    <option
                                                                        key={
                                                                            status
                                                                        }
                                                                        value={
                                                                            status
                                                                        }
                                                                    >
                                                                        {statusLabel(
                                                                            status
                                                                        )}
                                                                    </option>
                                                                )
                                                            )}
                                                        </select>
                                                    ) : (
                                                        <StatusBadge
                                                            status={
                                                                delivery.status
                                                            }
                                                        />
                                                    )}
                                                </td>

                                                <td>
                                                    <span className="muted-text">
                                                        {formatDateTime(
                                                            delivery.assignedAt ??
                                                                delivery.createdAt
                                                        )}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="row-actions">
                                                        <button
                                                            type="button"
                                                            className="icon-button"
                                                            title="Ver detalle"
                                                            onClick={() =>
                                                                setDetailDelivery(
                                                                    delivery
                                                                )
                                                            }
                                                        >
                                                            <Eye
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </button>

                                                        {(isAdmin ||
                                                            role ===
                                                                'driver') && (
                                                            <button
                                                                type="button"
                                                                className="icon-button"
                                                                title="Cargar comprobante"
                                                                onClick={() =>
                                                                    setReceiptDelivery(
                                                                        delivery
                                                                    )
                                                                }
                                                            >
                                                                <FileUp
                                                                    size={
                                                                        17
                                                                    }
                                                                />
                                                            </button>
                                                        )}

                                                        {isAdmin &&
                                                            canDelete && (
                                                                <button
                                                                    type="button"
                                                                    className="icon-button icon-button--danger"
                                                                    title="Eliminar"
                                                                    onClick={() =>
                                                                        setDeleteDelivery(
                                                                            delivery
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2
                                                                        size={
                                                                            17
                                                                        }
                                                                    />
                                                                </button>
                                                            )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination
                    page={
                        deliveriesQuery
                            .data
                            ?.page ??
                        page
                    }
                    totalPages={
                        deliveriesQuery
                            .data
                            ?.totalPages ??
                        1
                    }
                    total={
                        deliveriesQuery
                            .data
                            ?.total ??
                        deliveries.length
                    }
                    onPageChange={
                        setPage
                    }
                />
            </Card>

            <CreateDeliveryModal
                open={
                    createOpen
                }
                onClose={() =>
                    setCreateOpen(
                        false
                    )
                }
                orders={
                    orders
                }
                users={
                    users
                }
            />

            <DeliveryDetailsModal
                delivery={
                    detailDelivery
                }
                order={
                    detailDelivery
                        ? resolveOrder(
                              detailDelivery
                          )
                        : null
                }
                driver={
                    detailDelivery
                        ? resolveDriver(
                              detailDelivery
                          )
                        : null
                }
                onClose={() =>
                    setDetailDelivery(
                        null
                    )
                }
            />

            <DeliveryReceiptModal
                delivery={
                    receiptDelivery
                }
                onClose={() =>
                    setReceiptDelivery(
                        null
                    )
                }
            />

            <Modal
                open={
                    Boolean(
                        deleteDelivery
                    )
                }
                onClose={() =>
                    setDeleteDelivery(
                        null
                    )
                }
                title="Eliminar entrega"
                description="La asignación será revertida y el pedido volverá a estar disponible."
                size="sm"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() =>
                                setDeleteDelivery(
                                    null
                                )
                            }
                        >
                            Cancelar
                        </Button>

                        <Button
                            variant="danger"
                            loading={
                                deleteMutation.isPending
                            }
                            onClick={() =>
                                deleteMutation.mutate(
                                    getEntityId(
                                        deleteDelivery
                                    )
                                )
                            }
                        >
                            Eliminar
                        </Button>
                    </>
                }
            >
                <p className="modal-copy">
                    Vas a eliminar la entrega{' '}
                    <strong>
                        #
                        {shortId(
                            deleteDelivery
                        )}
                    </strong>
                    .
                </p>
            </Modal>
        </>
    );
}

function CreateDeliveryModal({
    open,
    onClose,
    orders,
    users
}) {
    const {
        pushToast
    } =
        useToast();

    const queryClient =
        useQueryClient();

    const [
        order,
        setOrder
    ] =
        useState('');

    const [
        driver,
        setDriver
    ] =
        useState('');

    const [
        priority,
        setPriority
    ] =
        useState(
            'normal'
        );

    const availableOrders =
        orders.filter(
            (
                item
            ) =>
                item.status ===
                'created' &&
                !item.delivery
        );

    const drivers =
        users.filter(
            (
                item
            ) =>
                item.role ===
                'driver'
        );

    const mutation =
        useMutation({
            mutationFn: () =>
                deliveryService.create({
                    order,
                    driver,
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
                        'orders'
                    ]
                });

                queryClient.invalidateQueries({
                    queryKey: [
                        'dashboard'
                    ]
                });

                pushToast({
                    title:
                        'Entrega creada',

                    message:
                        'El pedido fue asignado correctamente.'
                });

                setOrder(
                    ''
                );

                setDriver(
                    ''
                );

                setPriority(
                    'normal'
                );

                onClose();
            },

            onError: (
                error
            ) =>
                pushToast({
                    type:
                        'error',

                    title:
                        'No se pudo crear',

                    message:
                        getApiErrorMessage(
                            error
                        )
                })
        });

    return (
        <Modal
            open={
                open
            }
            onClose={
                onClose
            }
            title="Nueva entrega"
            description="Asigná un pedido disponible a un repartidor."
            footer={
                <>
                    <Button
                        variant="secondary"
                        onClick={
                            onClose
                        }
                    >
                        Cancelar
                    </Button>

                    <Button
                        disabled={
                            !order ||
                            !driver
                        }
                        loading={
                            mutation.isPending
                        }
                        onClick={() =>
                            mutation.mutate()
                        }
                    >
                        Crear entrega
                    </Button>
                </>
            }
        >
            <div className="form-stack">
                <label className="form-field">
                    <span className="form-label">
                        Pedido
                    </span>

                    <select
                        className="form-select"
                        value={
                            order
                        }
                        onChange={
                            (
                                event
                            ) =>
                                setOrder(
                                    event
                                        .target
                                        .value
                                )
                        }
                    >
                        <option value="">
                            Seleccionar pedido
                        </option>

                        {availableOrders.map(
                            (
                                item
                            ) => (
                                <option
                                    key={
                                        getEntityId(
                                            item
                                        )
                                    }
                                    value={
                                        getEntityId(
                                            item
                                        )
                                    }
                                >
                                    #
                                    {shortId(
                                        item
                                    )}{' '}
                                    —{' '}
                                    {item.deliveryAddress ??
                                        'Sin dirección'}
                                </option>
                            )
                        )}
                    </select>
                </label>

                <label className="form-field">
                    <span className="form-label">
                        Repartidor
                    </span>

                    <select
                        className="form-select"
                        value={
                            driver
                        }
                        onChange={
                            (
                                event
                            ) =>
                                setDriver(
                                    event
                                        .target
                                        .value
                                )
                        }
                    >
                        <option value="">
                            Seleccionar repartidor
                        </option>

                        {drivers.map(
                            (
                                item
                            ) => (
                                <option
                                    key={
                                        getEntityId(
                                            item
                                        )
                                    }
                                    value={
                                        getEntityId(
                                            item
                                        )
                                    }
                                >
                                    {getPersonName(
                                        item
                                    )}{' '}
                                    —{' '}
                                    {
                                        item.email
                                    }
                                </option>
                            )
                        )}
                    </select>
                </label>

                <label className="form-field">
                    <span className="form-label">
                        Prioridad
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
            </div>
        </Modal>
    );
}

function DeliveryDetailsModal({
    delivery,
    order,
    driver,
    onClose
}) {
    const deliveryId =
        getEntityId(
            delivery
        );

    const detailQuery =
        useQuery({
            queryKey: [
                'delivery',
                deliveryId
            ],

            queryFn: () =>
                deliveryService.getById(
                    deliveryId
                ),

            enabled:
                Boolean(
                    deliveryId
                )
        });

    const currentDelivery =
        detailQuery.data ??
        delivery;

    const currentOrder =
        currentDelivery?.order &&
        typeof currentDelivery.order ===
            'object'
            ? currentDelivery.order
            : order;

    const currentDriver =
        currentDelivery?.driver &&
        typeof currentDelivery.driver ===
            'object'
            ? currentDelivery.driver
            : driver;

    const receipt =
        currentDelivery
            ?.receipt;

    return (
        <Modal
            open={
                Boolean(
                    delivery
                )
            }
            onClose={
                onClose
            }
            title={`Entrega #${shortId(
                currentDelivery
            )}`}
            description="Detalle completo y trazabilidad de la entrega."
            size="lg"
        >
            {detailQuery.isLoading &&
            !currentDelivery ? (
                <div className="operation-detail-loading">
                    <LoadingState />
                </div>
            ) : detailQuery.isError ? (
                <EmptyState
                    icon={
                        Truck
                    }
                    title="No pudimos cargar el detalle"
                    description={getApiErrorMessage(
                        detailQuery.error
                    )}
                />
            ) : currentDelivery ? (
                <>
                    <div className="operation-detail-hero">
                        <div className="operation-detail-hero__identity">
                            <span className="operation-detail-hero__icon">
                                <Truck
                                    size={
                                        21
                                    }
                                />
                            </span>

                            <div>
                                <strong>
                                    Entrega #
                                    {shortId(
                                        currentDelivery
                                    )}
                                </strong>

                                <span>
                                    {getEntityId(
                                        currentDelivery
                                    )}
                                </span>
                            </div>
                        </div>

                        <div className="operation-detail-hero__status">
                            <StatusBadge
                                status={
                                    currentDelivery.priority ??
                                    'normal'
                                }
                            />

                            <StatusBadge
                                status={
                                    currentDelivery.status
                                }
                            />
                        </div>
                    </div>

                    <div className="detail-grid">
                        <Detail
                            label="Pedido"
                            value={`#${shortId(
                                currentDelivery.order
                            )}`}
                        />

                        <Detail
                            label="Repartidor"
                            value={
                                currentDriver
                                    ? getPersonName(
                                          currentDriver
                                      )
                                    : `#${shortId(
                                          currentDelivery.driver
                                      )}`
                            }
                        />

                        <Detail
                            label="Email repartidor"
                            value={
                                currentDriver?.email ??
                                '—'
                            }
                        />

                        <Detail
                            label="Prioridad"
                            value={
                                <StatusBadge
                                    status={
                                        currentDelivery.priority ??
                                        'normal'
                                    }
                                />
                            }
                        />

                        <Detail
                            label="Asignada"
                            value={formatDateTime(
                                currentDelivery.assignedAt ??
                                    currentDelivery.createdAt
                            )}
                        />

                        <Detail
                            label="Entregada"
                            value={formatDateTime(
                                currentDelivery.deliveredAt
                            )}
                        />

                        <Detail
                            label="Última actualización"
                            value={formatDateTime(
                                currentDelivery.updatedAt
                            )}
                        />
                    </div>

                    <div className="operation-detail-section">
                        <div className="operation-detail-section__heading">
                            <h3>
                                Pedido asociado
                            </h3>

                            <Package
                                size={
                                    15
                                }
                            />
                        </div>

                        <div className="operation-detail-receipt">
                            <div className="operation-detail-receipt__info">
                                <strong>
                                    Pedido #
                                    {shortId(
                                        currentDelivery.order
                                    )}
                                </strong>

                                <span>
                                    {currentOrder?.deliveryAddress ??
                                        'Dirección no disponible para este rol'}
                                </span>
                            </div>

                            {currentOrder?.status && (
                                <StatusBadge
                                    status={
                                        currentOrder.status
                                    }
                                />
                            )}
                        </div>
                    </div>

                    {currentOrder?.deliveryAddress && (
                        <div className="operation-detail-section">
                            <div className="operation-detail-section__heading">
                                <h3>
                                    Destino
                                </h3>

                                <MapPin
                                    size={
                                        15
                                    }
                                />
                            </div>

                            <div className="operation-detail-receipt">
                                <div className="operation-detail-receipt__info">
                                    <strong>
                                        {
                                            currentOrder.deliveryAddress
                                        }
                                    </strong>

                                    <span>
                                        Dirección registrada en el pedido
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="operation-detail-section">
                        <div className="operation-detail-section__heading">
                            <h3>
                                Comprobante
                            </h3>

                            <ReceiptText
                                size={
                                    15
                                }
                            />
                        </div>

                        {receipt ? (
                            <div className="operation-detail-receipt">
                                <div className="operation-detail-receipt__info">
                                    <strong>
                                        {receipt.originalName ??
                                            'Comprobante de entrega'}
                                    </strong>

                                    <span>
                                        {[
                                            receipt.mimetype,
                                            formatFileSize(
                                                receipt.size
                                            ),
                                            formatDateTime(
                                                receipt.uploadedAt
                                            )
                                        ]
                                            .filter(
                                                (
                                                    item
                                                ) =>
                                                    item &&
                                                    item !==
                                                        '—'
                                            )
                                            .join(
                                                ' · '
                                            )}
                                    </span>
                                </div>

                                <StatusBadge
                                    status="delivered"
                                />
                            </div>
                        ) : (
                            <div className="operation-detail-receipt">
                                <div className="operation-detail-receipt__info">
                                    <strong>
                                        Sin comprobante
                                    </strong>

                                    <span>
                                        Todavía no se cargó un comprobante para esta entrega.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <OperationTimeline
                        history={
                            currentDelivery.statusHistory ??
                            EMPTY_ARRAY
                        }
                        currentStatus={
                            currentDelivery.status
                        }
                        title="Historial de la entrega"
                    />
                </>
            ) : null}
        </Modal>
    );
}

function DeliveryReceiptModal({
    delivery,
    onClose
}) {
    const {
        pushToast
    } =
        useToast();

    const queryClient =
        useQueryClient();

    const [
        file,
        setFile
    ] =
        useState(null);

    const mutation =
        useMutation({
            mutationFn: () =>
                deliveryService.uploadReceipt(
                    getEntityId(
                        delivery
                    ),
                    file
                ),

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

                pushToast({
                    title:
                        'Comprobante cargado'
                });

                setFile(
                    null
                );

                onClose();
            },

            onError: (
                error
            ) =>
                pushToast({
                    type:
                        'error',

                    title:
                        'No se pudo cargar',

                    message:
                        getApiErrorMessage(
                            error
                        )
                })
        });

    return (
        <Modal
            open={
                Boolean(
                    delivery
                )
            }
            onClose={
                onClose
            }
            title="Comprobante de entrega"
            description={`Entrega #${shortId(
                delivery
            )}`}
            size="sm"
            footer={
                <>
                    <Button
                        variant="secondary"
                        onClick={
                            onClose
                        }
                    >
                        Cancelar
                    </Button>

                    <Button
                        disabled={
                            !file
                        }
                        loading={
                            mutation.isPending
                        }
                        onClick={() =>
                            mutation.mutate()
                        }
                    >
                        Subir archivo
                    </Button>
                </>
            }
        >
            <label className="upload-box">
                <FileUp
                    size={
                        25
                    }
                />

                <strong>
                    {file
                        ? file.name
                        : 'Seleccionar comprobante'}
                </strong>

                <span>
                    JPG, PNG o PDF · máximo 5 MB
                </span>

                <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    onChange={
                        (
                            event
                        ) =>
                            setFile(
                                event.target
                                    .files?.[0] ??
                                    null
                            )
                    }
                />
            </label>
        </Modal>
    );
}

function Detail({
    label,
    value
}) {
    return (
        <div className="detail-field">
            <span>
                {label}
            </span>

            <strong>
                {value}
            </strong>
        </div>
    );
}