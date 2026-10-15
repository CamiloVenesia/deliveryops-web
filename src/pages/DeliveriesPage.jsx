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
    Plus,
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
    'delivered'
];

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

                        const matchesStatus =
                            !statusFilter ||
                            delivery.status ===
                                statusFilter;

                        const searchable =
                            [
                                delivery._id,
                                orderId,
                                driver?.email,
                                getPersonName(
                                    driver
                                ),
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
                usersMap
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
                        'dashboard'
                    ]
                });

                pushToast({
                    title:
                        'Entrega actualizada'
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
                        'dashboard'
                    ]
                });

                pushToast({
                    title:
                        'Entrega eliminada'
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
                        ? 'Gestioná las entregas asignadas a tu cuenta.'
                        : 'Seguimiento operativo de las entregas.'
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
                                    event.target
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
                                    event.target
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
                                            usersMap.get(
                                                driverId
                                            );

                                        const order =
                                            ordersMap.get(
                                                orderId
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
                                                                    : shortId(
                                                                          driverId
                                                                      )}
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
                                                    {canUpdate ? (
                                                        <select
                                                            className="table-status-select"
                                                            value={
                                                                delivery.status ??
                                                                'assigned'
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
                                                            {statusOptions.map(
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

                                                        {isAdmin && (
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
                description="Esta acción no se puede deshacer."
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
                'created'
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
                                    event.target
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
                                    event.target
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
                                    event.target
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
    onClose
}) {
    if (!delivery) {
        return null;
    }

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
                delivery
            )}`}
            description="Información operativa de la entrega."
        >
            <div className="detail-grid">
                <Detail
                    label="Estado"
                    value={
                        <StatusBadge
                            status={
                                delivery.status
                            }
                        />
                    }
                />

                <Detail
                    label="Prioridad"
                    value={
                        <StatusBadge
                            status={
                                delivery.priority ??
                                'normal'
                            }
                        />
                    }
                />

                <Detail
                    label="Pedido"
                    value={`#${shortId(
                        delivery.order
                    )}`}
                />

                <Detail
                    label="Repartidor"
                    value={`#${shortId(
                        delivery.driver
                    )}`}
                />

                <Detail
                    label="Asignada"
                    value={
                        formatDateTime(
                            delivery.assignedAt ??
                                delivery.createdAt
                        )
                    }
                />

                <Detail
                    label="Entregada"
                    value={
                        formatDateTime(
                            delivery.deliveredAt
                        )
                    }
                />
            </div>
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