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
    orderService,
    userService
} from '../api/services.js';

import {
    getApiErrorMessage
} from '../api/normalizers.js';

import {
    useAuth
} from '../auth/useAuth.js';

import CreateDeliveryModal from '../components/CreateDeliveryModal.jsx';

import OperationTimeline from '../components/OperationTimeline.jsx';

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
    useToast
} from '../components/useToast.js';

import {
    formatDateTime,
    formatMoney,
    getEntityId,
    getPersonName,
    shortId,
    statusLabel
} from '../utils/formatters.js';

const EMPTY_ARRAY = [];

const statusOptions = [
    'created',
    'assigned',
    'picked_up',
    'in_transit',
    'delivered',
    'cancelled'
];

const ORDER_TRANSITIONS = {
    created: [
        'assigned',
        'cancelled'
    ],

    assigned: [
        'picked_up',
        'in_transit',
        'cancelled'
    ],

    picked_up: [
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
            ORDER_TRANSITIONS[
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

export default function OrdersPage() {
    const {
        role,
        user:
            currentUser
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
        detailOrder,
        setDetailOrder
    ] =
        useState(null);

    const [
        receiptOrder,
        setReceiptOrder
    ] =
        useState(null);

    const [
        deleteOrder,
        setDeleteOrder
    ] =
        useState(null);

    const [
        assignmentOpen,
        setAssignmentOpen
    ] =
        useState(false);

    const [
        assignmentOrderId,
        setAssignmentOrderId
    ] =
        useState('');

    const ordersQuery =
        useQuery({
            queryKey: [
                'orders',
                page
            ],

            queryFn: () =>
                orderService.list({
                    page,
                    limit:
                        10
                })
        });

    const usersQuery =
        useQuery({
            queryKey: [
                'users',
                'order-options'
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

    const orders =
        ordersQuery.data
            ?.items ??
        EMPTY_ARRAY;

    const users =
        usersQuery.data
            ?.items ??
        EMPTY_ARRAY;

    const userMap =
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

    function resolveCustomer(
        order
    ) {
        if (
            order?.customer &&
            typeof order.customer ===
                'object'
        ) {
            return order.customer;
        }

        const customerId =
            getEntityId(
                order?.customer
            );

        const mapped =
            userMap.get(
                customerId
            );

        if (mapped) {
            return mapped;
        }

        if (
            currentUser &&
            getEntityId(
                currentUser
            ) ===
                customerId
        ) {
            return currentUser;
        }

        return null;
    }

    const visibleOrders =
        useMemo(
            () => {
                const term =
                    search
                        .trim()
                        .toLowerCase();

                return orders.filter(
                    (
                        order
                    ) => {
                        const matchesStatus =
                            !statusFilter ||
                            order.status ===
                                statusFilter;

                        const customerId =
                            getEntityId(
                                order.customer
                            );

                        const customer =
                            userMap.get(
                                customerId
                            ) ??
                            (
                                getEntityId(
                                    currentUser
                                ) ===
                                customerId
                                    ? currentUser
                                    : null
                            );

                        const searchable =
                            [
                                order._id,
                                order.id,
                                order.deliveryAddress,
                                order.status,
                                statusLabel(
                                    order.status
                                ),
                                customer?.email,
                                customer
                                    ? getPersonName(
                                          customer
                                      )
                                    : null
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
                orders,
                search,
                statusFilter,
                userMap,
                currentUser
            ]
        );

    const updateStatusMutation =
        useMutation({
            mutationFn: ({
                id,
                status
            }) =>
                orderService.updateStatus(
                    id,
                    status
                ),

            onSuccess: () => {
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
                        'dashboard'
                    ]
                });

                pushToast({
                    title:
                        'Estado actualizado',

                    message:
                        'El pedido fue actualizado correctamente.'
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
                orderService.remove(
                    id
                ),

            onSuccess: () => {
                setDeleteOrder(
                    null
                );

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
                        'Pedido eliminado'
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

    function openAssignment(
        order
    ) {
        setAssignmentOrderId(
            getEntityId(
                order
            )
        );

        setAssignmentOpen(
            true
        );
    }

    function closeAssignment() {
        setAssignmentOpen(
            false
        );

        setAssignmentOrderId(
            ''
        );
    }

    return (
        <>
            <PageHeader
                eyebrow="Operaciones"
                title="Pedidos"
                description={
                    isAdmin
                        ? 'Administrá los pedidos registrados y consultá su trazabilidad completa.'
                        : 'Consultá tus pedidos y seguí cada etapa de la operación.'
                }
            >
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
                    Nuevo pedido
                </Button>
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
                        placeholder="Buscar pedido..."
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
                </div>

                {ordersQuery.isLoading ? (
                    <LoadingState />
                ) : visibleOrders.length ===
                  0 ? (
                    <EmptyState
                        icon={
                            Package
                        }
                        title="No encontramos pedidos"
                        description="Probá modificando los filtros o creá un nuevo pedido."
                    />
                ) : (
                    <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>
                                        Pedido
                                    </th>

                                    {isAdmin && (
                                        <th>
                                            Cliente
                                        </th>
                                    )}

                                    <th>
                                        Dirección
                                    </th>

                                    <th>
                                        Total
                                    </th>

                                    <th>
                                        Estado
                                    </th>

                                    <th>
                                        Creado
                                    </th>

                                    <th className="table-actions-column">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {visibleOrders.map(
                                    (
                                        order
                                    ) => {
                                        const id =
                                            getEntityId(
                                                order
                                            );

                                        const customer =
                                            resolveCustomer(
                                                order
                                            );

                                        const customerId =
                                            getEntityId(
                                                order.customer
                                            );

                                        const itemCount =
                                            order
                                                .items
                                                ?.length ??
                                            0;

                                        const choices =
                                            getStatusChoices(
                                                order.status
                                            );

                                        const canTransition =
                                            choices.length >
                                            1;

                                        const canAssign =
                                            isAdmin &&
                                            !order.delivery &&
                                            [
                                                'created',
                                                'assigned'
                                            ].includes(
                                                order.status
                                            );

                                        return (
                                            <tr
                                                key={
                                                    id
                                                }
                                            >
                                                <td>
                                                    <div className="entity-cell">
                                                        <span className="entity-icon">
                                                            <Package
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
                                                                {
                                                                    itemCount
                                                                }{' '}
                                                                {itemCount ===
                                                                1
                                                                    ? 'item'
                                                                    : 'items'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {isAdmin && (
                                                    <td>
                                                        <div className="table-person">
                                                            <strong>
                                                                {customer
                                                                    ? getPersonName(
                                                                          customer
                                                                      )
                                                                    : `#${shortId(
                                                                          customerId
                                                                      )}`}
                                                            </strong>

                                                            {customer?.email && (
                                                                <span>
                                                                    {
                                                                        customer.email
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}

                                                <td className="table-address">
                                                    {order.deliveryAddress ??
                                                        '—'}
                                                </td>

                                                <td>
                                                    <strong>
                                                        {formatMoney(
                                                            order.total
                                                        )}
                                                    </strong>
                                                </td>

                                                <td>
                                                    {isAdmin &&
                                                    canTransition ? (
                                                        <select
                                                            className="table-status-select"
                                                            value={
                                                                order.status ??
                                                                ''
                                                            }
                                                            disabled={
                                                                updateStatusMutation.isPending
                                                            }
                                                            onChange={
                                                                (
                                                                    event
                                                                ) =>
                                                                    updateStatusMutation.mutate(
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
                                                                order.status
                                                            }
                                                        />
                                                    )}
                                                </td>

                                                <td>
                                                    <span className="muted-text">
                                                        {formatDateTime(
                                                            order.createdAt
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
                                                                setDetailOrder(
                                                                    order
                                                                )
                                                            }
                                                        >
                                                            <Eye
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </button>

                                                        {canAssign && (
                                                            <button
                                                                type="button"
                                                                className="icon-button"
                                                                title="Asignar entrega"
                                                                onClick={() =>
                                                                    openAssignment(
                                                                        order
                                                                    )
                                                                }
                                                            >
                                                                <Truck
                                                                    size={
                                                                        17
                                                                    }
                                                                />
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            className="icon-button"
                                                            title="Cargar comprobante"
                                                            onClick={() =>
                                                                setReceiptOrder(
                                                                    order
                                                                )
                                                            }
                                                        >
                                                            <FileUp
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </button>

                                                        {isAdmin && (
                                                            <button
                                                                type="button"
                                                                className="icon-button icon-button--danger"
                                                                title="Eliminar"
                                                                onClick={() =>
                                                                    setDeleteOrder(
                                                                        order
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
                        ordersQuery.data
                            ?.page ??
                        page
                    }
                    totalPages={
                        ordersQuery.data
                            ?.totalPages ??
                        1
                    }
                    total={
                        ordersQuery.data
                            ?.total ??
                        orders.length
                    }
                    onPageChange={
                        setPage
                    }
                />
            </Card>

            <CreateOrderModal
                open={
                    createOpen
                }
                onClose={() =>
                    setCreateOpen(
                        false
                    )
                }
                users={
                    users
                }
                isAdmin={
                    isAdmin
                }
            />

            <CreateDeliveryModal
                key={
                    assignmentOrderId ||
                    'order-delivery-assignment'
                }
                open={
                    assignmentOpen
                }
                initialOrderId={
                    assignmentOrderId
                }
                onClose={
                    closeAssignment
                }
            />

            <OrderDetailsModal
                order={
                    detailOrder
                }
                customer={
                    detailOrder
                        ? resolveCustomer(
                              detailOrder
                          )
                        : null
                }
                onClose={() =>
                    setDetailOrder(
                        null
                    )
                }
            />

            <ReceiptModal
                order={
                    receiptOrder
                }
                onClose={() =>
                    setReceiptOrder(
                        null
                    )
                }
            />

            <Modal
                open={
                    Boolean(
                        deleteOrder
                    )
                }
                onClose={() =>
                    setDeleteOrder(
                        null
                    )
                }
                title="Eliminar pedido"
                description="Esta acción no se puede deshacer."
                size="sm"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() =>
                                setDeleteOrder(
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
                                        deleteOrder
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
                    Vas a eliminar el pedido{' '}
                    <strong>
                        #
                        {shortId(
                            deleteOrder
                        )}
                    </strong>
                    .
                </p>
            </Modal>
        </>
    );
}

function CreateOrderModal({
    open,
    onClose,
    users,
    isAdmin
}) {
    const {
        pushToast
    } =
        useToast();

    const queryClient =
        useQueryClient();

    const [
        customer,
        setCustomer
    ] =
        useState('');

    const [
        deliveryAddress,
        setDeliveryAddress
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
        items,
        setItems
    ] =
        useState([
            {
                name:
                    '',

                quantity:
                    1,

                price:
                    ''
            }
        ]);

    const customers =
        users.filter(
            (
                item
            ) =>
                item.role ===
                'customer'
        );

    const mutation =
        useMutation({
            mutationFn: (
                data
            ) =>
                orderService.create(
                    data
                ),

            onSuccess: () => {
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
                        'Pedido creado',

                    message:
                        'El nuevo pedido ya está disponible.'
                });

                reset();

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

    function reset() {
        setCustomer(
            ''
        );

        setDeliveryAddress(
            ''
        );

        setPriority(
            'normal'
        );

        setItems([
            {
                name:
                    '',

                quantity:
                    1,

                price:
                    ''
            }
        ]);
    }

    function updateItem(
        index,
        field,
        value
    ) {
        setItems(
            (
                current
            ) =>
                current.map(
                    (
                        item,
                        itemIndex
                    ) =>
                        itemIndex ===
                        index
                            ? {
                                  ...item,

                                  [field]:
                                      value
                              }
                            : item
                )
        );
    }

    function removeItem(
        index
    ) {
        setItems(
            (
                current
            ) =>
                current.filter(
                    (
                        _,
                        itemIndex
                    ) =>
                        itemIndex !==
                        index
                )
        );
    }

    function handleSubmit(
        event
    ) {
        event.preventDefault();

        const payload = {
            deliveryAddress:
                deliveryAddress.trim(),

            priority,

            items:
                items.map(
                    (
                        item
                    ) => ({
                        name:
                            item.name.trim(),

                        quantity:
                            Number(
                                item.quantity
                            ),

                        price:
                            Number(
                                item.price
                            )
                    })
                )
        };

        if (isAdmin) {
            payload.customer =
                customer;
        }

        mutation.mutate(
            payload
        );
    }

    return (
        <Modal
            open={
                open
            }
            onClose={
                onClose
            }
            title="Nuevo pedido"
            description="Registrá los datos necesarios para iniciar una nueva operación."
            size="lg"
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
                        type="submit"
                        form="create-order-form"
                        loading={
                            mutation.isPending
                        }
                    >
                        Crear pedido
                    </Button>
                </>
            }
        >
            <form
                id="create-order-form"
                className="form-stack"
                onSubmit={
                    handleSubmit
                }
            >
                {isAdmin && (
                    <label className="form-field">
                        <span className="form-label">
                            Cliente
                        </span>

                        <select
                            className="form-select"
                            required
                            value={
                                customer
                            }
                            onChange={
                                (
                                    event
                                ) =>
                                    setCustomer(
                                        event
                                            .target
                                            .value
                                    )
                            }
                        >
                            <option value="">
                                Seleccionar cliente
                            </option>

                            {customers.map(
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
                )}

                <div className="form-grid form-grid--2">
                    <label className="form-field">
                        <span className="form-label">
                            Dirección de entrega
                        </span>

                        <input
                            className="form-input form-input--plain"
                            required
                            minLength={
                                3
                            }
                            value={
                                deliveryAddress
                            }
                            onChange={
                                (
                                    event
                                ) =>
                                    setDeliveryAddress(
                                        event
                                            .target
                                            .value
                                    )
                            }
                            placeholder="Ej. Córdoba 1234, Rosario"
                        />
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

                <div className="items-editor">
                    <div className="items-editor__header">
                        <div>
                            <strong>
                                Items del pedido
                            </strong>

                            <span>
                                Producto, cantidad y precio.
                            </span>
                        </div>

                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            icon={
                                Plus
                            }
                            onClick={() =>
                                setItems(
                                    (
                                        current
                                    ) => [
                                        ...current,

                                        {
                                            name:
                                                '',

                                            quantity:
                                                1,

                                            price:
                                                ''
                                        }
                                    ]
                                )
                            }
                        >
                            Agregar
                        </Button>
                    </div>

                    {items.map(
                        (
                            item,
                            index
                        ) => (
                            <div
                                className="item-row"
                                key={
                                    index
                                }
                            >
                                <input
                                    className="form-input form-input--plain"
                                    required
                                    placeholder="Producto"
                                    value={
                                        item.name
                                    }
                                    onChange={
                                        (
                                            event
                                        ) =>
                                            updateItem(
                                                index,
                                                'name',
                                                event
                                                    .target
                                                    .value
                                            )
                                    }
                                />

                                <input
                                    className="form-input form-input--plain"
                                    type="number"
                                    min="1"
                                    step="1"
                                    required
                                    placeholder="Cantidad"
                                    value={
                                        item.quantity
                                    }
                                    onChange={
                                        (
                                            event
                                        ) =>
                                            updateItem(
                                                index,
                                                'quantity',
                                                event
                                                    .target
                                                    .value
                                            )
                                    }
                                />

                                <input
                                    className="form-input form-input--plain"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    placeholder="Precio"
                                    value={
                                        item.price
                                    }
                                    onChange={
                                        (
                                            event
                                        ) =>
                                            updateItem(
                                                index,
                                                'price',
                                                event
                                                    .target
                                                    .value
                                            )
                                    }
                                />

                                <button
                                    type="button"
                                    className="icon-button icon-button--danger"
                                    disabled={
                                        items.length ===
                                        1
                                    }
                                    onClick={() =>
                                        removeItem(
                                            index
                                        )
                                    }
                                    aria-label="Eliminar item"
                                >
                                    <Trash2
                                        size={
                                            16
                                        }
                                    />
                                </button>
                            </div>
                        )
                    )}
                </div>
            </form>
        </Modal>
    );
}

function OrderDetailsModal({
    order,
    customer,
    onClose
}) {
    const orderId =
        getEntityId(
            order
        );

    const detailQuery =
        useQuery({
            queryKey: [
                'order',
                orderId
            ],

            queryFn: () =>
                orderService.getById(
                    orderId
                ),

            enabled:
                Boolean(
                    orderId
                )
        });

    const currentOrder =
        detailQuery.data ??
        order;

    const receipt =
        currentOrder
            ?.receipt;

    return (
        <Modal
            open={
                Boolean(
                    order
                )
            }
            onClose={
                onClose
            }
            title={`Pedido #${shortId(
                currentOrder
            )}`}
            description="Detalle completo y trazabilidad de la operación."
            size="lg"
        >
            {detailQuery.isLoading &&
            !currentOrder ? (
                <div className="operation-detail-loading">
                    <LoadingState />
                </div>
            ) : detailQuery.isError ? (
                <EmptyState
                    icon={
                        Package
                    }
                    title="No pudimos cargar el detalle"
                    description={getApiErrorMessage(
                        detailQuery.error
                    )}
                />
            ) : currentOrder ? (
                <>
                    <div className="operation-detail-hero">
                        <div className="operation-detail-hero__identity">
                            <span className="operation-detail-hero__icon">
                                <Package
                                    size={
                                        21
                                    }
                                />
                            </span>

                            <div>
                                <strong>
                                    Pedido #
                                    {shortId(
                                        currentOrder
                                    )}
                                </strong>

                                <span>
                                    {getEntityId(
                                        currentOrder
                                    )}
                                </span>
                            </div>
                        </div>

                        <div className="operation-detail-hero__status">
                            <StatusBadge
                                status={
                                    currentOrder.priority ??
                                    'normal'
                                }
                            />

                            <StatusBadge
                                status={
                                    currentOrder.status
                                }
                            />
                        </div>
                    </div>

                    <div className="detail-grid">
                        <Detail
                            label="Cliente"
                            value={
                                customer
                                    ? getPersonName(
                                          customer
                                      )
                                    : `#${shortId(
                                          currentOrder.customer
                                      )}`
                            }
                        />

                        <Detail
                            label="Email"
                            value={
                                customer?.email ??
                                '—'
                            }
                        />

                        <Detail
                            label="Total"
                            value={formatMoney(
                                currentOrder.total
                            )}
                        />

                        <Detail
                            label="Prioridad"
                            value={
                                <StatusBadge
                                    status={
                                        currentOrder.priority ??
                                        'normal'
                                    }
                                />
                            }
                        />

                        <Detail
                            label="Entrega asociada"
                            value={
                                currentOrder.delivery
                                    ? `#${shortId(
                                          currentOrder.delivery
                                      )}`
                                    : 'Sin asignar'
                            }
                        />

                        <Detail
                            label="Creado"
                            value={formatDateTime(
                                currentOrder.createdAt
                            )}
                        />

                        <Detail
                            label="Última actualización"
                            value={formatDateTime(
                                currentOrder.updatedAt
                            )}
                        />
                    </div>

                    <div className="operation-detail-section">
                        <div className="operation-detail-section__heading">
                            <h3>
                                Dirección de entrega
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
                                    {currentOrder.deliveryAddress ??
                                        'Sin dirección registrada'}
                                </strong>

                                <span>
                                    Destino informado para este pedido
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h3>
                            Items
                        </h3>

                        <div className="detail-items">
                            {(currentOrder.items ??
                                EMPTY_ARRAY).map(
                                (
                                    item,
                                    index
                                ) => (
                                    <div
                                        key={`${item.name ?? 'item'}-${index}`}
                                    >
                                        <span>
                                            {item.name ??
                                                `Item ${
                                                    index +
                                                    1
                                                }`}
                                        </span>

                                        <strong>
                                            {item.quantity ??
                                                1}{' '}
                                            ×{' '}
                                            {formatMoney(
                                                item.price
                                            )}
                                        </strong>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

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
                                            'Comprobante'}
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
                                        Todavía no se cargó un archivo para este pedido.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <OperationTimeline
                        history={
                            currentOrder.statusHistory ??
                            EMPTY_ARRAY
                        }
                        currentStatus={
                            currentOrder.status
                        }
                        title="Historial del pedido"
                    />
                </>
            ) : null}
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

function ReceiptModal({
    order,
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
                orderService.uploadReceipt(
                    getEntityId(
                        order
                    ),
                    file
                ),

            onSuccess: () => {
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
                    order
                )
            }
            onClose={
                onClose
            }
            title="Cargar comprobante"
            description={`Pedido #${shortId(
                order
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
                        : 'Seleccionar archivo'}
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