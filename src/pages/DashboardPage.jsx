import {
    useMemo
} from 'react';

import {
    useQuery
} from '@tanstack/react-query';

import {
    CheckCircle2,
    Package,
    Route,
    Truck,
    UsersRound
} from 'lucide-react';

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

import {
    useAuth
} from '../auth/AuthContext.jsx';

import {
    deliveryService,
    orderService,
    userService
} from '../api/services.js';

import {
    Card,
    EmptyState,
    LoadingState,
    MetricCard,
    PageHeader,
    StatusBadge
} from '../components/ui.jsx';

import {
    formatMoney,
    relativeDate,
    shortId,
    statusLabel
} from '../utils/formatters.js';

export default function DashboardPage() {
    const {
        role,
        user
    } =
        useAuth();

    const canSeeOrders =
        [
            'admin',
            'customer'
        ].includes(
            role
        );

    const canSeeDeliveries =
        [
            'admin',
            'customer',
            'driver'
        ].includes(
            role
        );

    const ordersQuery =
        useQuery({
            queryKey: [
                'dashboard',
                'orders'
            ],

            queryFn: () =>
                orderService.list({
                    page:
                        1,
                    limit:
                        50
                }),

            enabled:
                canSeeOrders
        });

    const deliveriesQuery =
        useQuery({
            queryKey: [
                'dashboard',
                'deliveries'
            ],

            queryFn: () =>
                deliveryService.list({
                    page:
                        1,
                    limit:
                        50
                }),

            enabled:
                canSeeDeliveries
        });

    const usersQuery =
        useQuery({
            queryKey: [
                'dashboard',
                'users'
            ],

            queryFn: () =>
                userService.list({
                    page:
                        1,
                    limit:
                        50
                }),

            enabled:
                role ===
                'admin'
        });

    const orders =
        ordersQuery.data
            ?.items ??
        [];

    const deliveries =
        deliveriesQuery.data
            ?.items ??
        [];

    const users =
        usersQuery.data
            ?.items ??
        [];

    const isLoading =
        ordersQuery.isLoading ||
        deliveriesQuery
            .isLoading ||
        usersQuery.isLoading;

    const orderStatusData =
        useMemo(
            () => {
                const statuses = [
                    'created',
                    'assigned',
                    'picked_up',
                    'in_transit',
                    'delivered',
                    'cancelled'
                ];

                return statuses
                    .map(
                        (
                            status
                        ) => ({
                            status,
                            name:
                                statusLabel(
                                    status
                                ),
                            value:
                                orders.filter(
                                    (
                                        order
                                    ) =>
                                        order.status ===
                                        status
                                ).length
                        })
                    )
                    .filter(
                        (
                            item
                        ) =>
                            item.value >
                            0
                    );
            },
            [
                orders
            ]
        );

    const deliveryStatusData =
        useMemo(
            () => {
                const statuses = [
                    'pending',
                    'assigned',
                    'in_transit',
                    'delivered'
                ];

                return statuses
                    .map(
                        (
                            status
                        ) => ({
                            status,
                            name:
                                statusLabel(
                                    status
                                ),
                            value:
                                deliveries.filter(
                                    (
                                        delivery
                                    ) =>
                                        delivery.status ===
                                        status
                                ).length
                        })
                    )
                    .filter(
                        (
                            item
                        ) =>
                            item.value >
                            0
                    );
            },
            [
                deliveries
            ]
        );

    const recentActivity =
        useMemo(
            () => [
                ...orders.map(
                    (
                        order
                    ) => ({
                        type:
                            'order',
                        id:
                            order._id ??
                            order.id,
                        status:
                            order.status,
                        date:
                            order.updatedAt ??
                            order.createdAt,
                        value:
                            order.total
                    })
                ),

                ...deliveries.map(
                    (
                        delivery
                    ) => ({
                        type:
                            'delivery',
                        id:
                            delivery._id ??
                            delivery.id,
                        status:
                            delivery.status,
                        date:
                            delivery.updatedAt ??
                            delivery.createdAt ??
                            delivery.assignedAt
                    })
                )
            ]
                .sort(
                    (
                        first,
                        second
                    ) =>
                        new Date(
                            second.date ??
                            0
                        ) -
                        new Date(
                            first.date ??
                            0
                        )
                )
                .slice(
                    0,
                    6
                ),
            [
                orders,
                deliveries
            ]
        );

    const delivered =
        deliveries.filter(
            (
                delivery
            ) =>
                delivery.status ===
                'delivered'
        ).length;

    const inProgress =
        deliveries.filter(
            (
                delivery
            ) =>
                [
                    'assigned',
                    'in_transit'
                ].includes(
                    delivery.status
                )
        ).length;

    const activeOrders =
        orders.filter(
            (
                order
            ) =>
                ![
                    'delivered',
                    'cancelled'
                ].includes(
                    order.status
                )
        ).length;

    if (
        role ===
        'store'
    ) {
        return (
            <>
                <PageHeader
                    eyebrow="Overview"
                    title={`Hola, ${
                        user
                            ?.firstName ??
                        'bienvenido'
                    }`}
                    description="Tu cuenta está activa en DeliveryOps."
                />

                <Card>
                    <EmptyState
                        icon={
                            Package
                        }
                        title="Módulo comercio preparado para la próxima etapa"
                        description="El backend ya reconoce este rol, pero sus operaciones específicas todavía no están habilitadas."
                    />
                </Card>
            </>
        );
    }

    return (
        <>
            <PageHeader
                eyebrow="Overview"
                title="Resumen operativo"
                description="Una vista consolidada del estado actual de tu operación."
            />

            {isLoading ? (
                <Card>
                    <LoadingState />
                </Card>
            ) : (
                <>
                    <div className="metrics-grid">
                        {canSeeOrders && (
                            <MetricCard
                                icon={
                                    Package
                                }
                                tone="brand"
                                value={
                                    activeOrders
                                }
                                label={
                                    role ===
                                    'customer'
                                        ? 'Pedidos activos'
                                        : 'Pedidos en operación'
                                }
                                description={`${orders.length} visibles en total`}
                            />
                        )}

                        {canSeeDeliveries && (
                            <MetricCard
                                icon={
                                    Truck
                                }
                                tone="info"
                                value={
                                    inProgress
                                }
                                label="Entregas en curso"
                                description="Asignadas o en tránsito"
                            />
                        )}

                        {canSeeDeliveries && (
                            <MetricCard
                                icon={
                                    CheckCircle2
                                }
                                tone="success"
                                value={
                                    delivered
                                }
                                label="Entregas completadas"
                                description="Dentro de la vista actual"
                            />
                        )}

                        {role ===
                            'admin' && (
                            <MetricCard
                                icon={
                                    UsersRound
                                }
                                tone="violet"
                                value={
                                    usersQuery
                                        .data
                                        ?.total ??
                                    users.length
                                }
                                label="Usuarios"
                                description="Cuentas registradas"
                            />
                        )}

                        {role ===
                            'driver' && (
                            <MetricCard
                                icon={
                                    Route
                                }
                                tone="warning"
                                value={
                                    deliveries.length
                                }
                                label="Entregas asignadas"
                                description="Tu carga operativa visible"
                            />
                        )}
                    </div>

                    <div className="dashboard-grid">
                        {canSeeOrders && (
                            <Card className="dashboard-panel dashboard-panel--wide">
                                <div className="panel-header">
                                    <div>
                                        <h2>
                                            Estado de pedidos
                                        </h2>

                                        <p>
                                            Distribución de los pedidos visibles.
                                        </p>
                                    </div>
                                </div>

                                {orderStatusData.length >
                                0 ? (
                                    <div className="chart-wrap">
                                        <ResponsiveContainer
                                            width="100%"
                                            height={
                                                280
                                            }
                                        >
                                            <BarChart
                                                data={
                                                    orderStatusData
                                                }
                                                margin={{
                                                    top:
                                                        12,
                                                    right:
                                                        6,
                                                    left:
                                                        -22,
                                                    bottom:
                                                        0
                                                }}
                                            >
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    vertical={
                                                        false
                                                    }
                                                    stroke="var(--border-subtle)"
                                                />

                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={
                                                        false
                                                    }
                                                    tickLine={
                                                        false
                                                    }
                                                    fontSize={
                                                        11
                                                    }
                                                />

                                                <YAxis
                                                    allowDecimals={
                                                        false
                                                    }
                                                    axisLine={
                                                        false
                                                    }
                                                    tickLine={
                                                        false
                                                    }
                                                    fontSize={
                                                        11
                                                    }
                                                />

                                                <Tooltip
                                                    cursor={{
                                                        fill:
                                                            'var(--slate-50)'
                                                    }}
                                                    contentStyle={{
                                                        border:
                                                            '1px solid var(--border-default)',
                                                        borderRadius:
                                                            12,
                                                        boxShadow:
                                                            'var(--shadow-md)'
                                                    }}
                                                />

                                                <Bar
                                                    dataKey="value"
                                                    fill="var(--brand-500)"
                                                    radius={[
                                                        6,
                                                        6,
                                                        2,
                                                        2
                                                    ]}
                                                    maxBarSize={
                                                        46
                                                    }
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={
                                            Package
                                        }
                                        title="Todavía no hay pedidos"
                                        description="Cuando se creen pedidos, su distribución aparecerá acá."
                                    />
                                )}
                            </Card>
                        )}

                        {canSeeDeliveries && (
                            <Card className="dashboard-panel">
                                <div className="panel-header">
                                    <div>
                                        <h2>
                                            Entregas
                                        </h2>

                                        <p>
                                            Estado actual.
                                        </p>
                                    </div>
                                </div>

                                {deliveryStatusData.length >
                                0 ? (
                                    <>
                                        <div className="donut-chart">
                                            <ResponsiveContainer
                                                width="100%"
                                                height={
                                                    205
                                                }
                                            >
                                                <PieChart>
                                                    <Pie
                                                        data={
                                                            deliveryStatusData
                                                        }
                                                        dataKey="value"
                                                        nameKey="name"
                                                        innerRadius={
                                                            58
                                                        }
                                                        outerRadius={
                                                            82
                                                        }
                                                        paddingAngle={
                                                            3
                                                        }
                                                    >
                                                        {deliveryStatusData.map(
                                                            (
                                                                item,
                                                                index
                                                            ) => (
                                                                <Cell
                                                                    key={
                                                                        item.status
                                                                    }
                                                                    fill={
                                                                        [
                                                                            'var(--warning-500)',
                                                                            'var(--brand-400)',
                                                                            'var(--brand-600)',
                                                                            'var(--success-500)'
                                                                        ][
                                                                            index %
                                                                                4
                                                                        ]
                                                                    }
                                                                />
                                                            )
                                                        )}
                                                    </Pie>

                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>

                                            <div className="donut-chart__center">
                                                <strong>
                                                    {
                                                        deliveries.length
                                                    }
                                                </strong>

                                                <span>
                                                    Total
                                                </span>
                                            </div>
                                        </div>

                                        <div className="chart-legend">
                                            {deliveryStatusData.map(
                                                (
                                                    item
                                                ) => (
                                                    <div
                                                        key={
                                                            item.status
                                                        }
                                                    >
                                                        <StatusBadge
                                                            status={
                                                                item.status
                                                            }
                                                        />

                                                        <strong>
                                                            {
                                                                item.value
                                                            }
                                                        </strong>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <EmptyState
                                        icon={
                                            Truck
                                        }
                                        title="Sin entregas"
                                        description="Las entregas aparecerán acá cuando sean asignadas."
                                    />
                                )}
                            </Card>
                        )}

                        <Card className="dashboard-panel dashboard-panel--full">
                            <div className="panel-header">
                                <div>
                                    <h2>
                                        Actividad reciente
                                    </h2>

                                    <p>
                                        Últimos movimientos visibles en tu cuenta.
                                    </p>
                                </div>
                            </div>

                            {recentActivity.length >
                            0 ? (
                                <div className="activity-list">
                                    {recentActivity.map(
                                        (
                                            activity,
                                            index
                                        ) => (
                                            <div
                                                className="activity-item"
                                                key={`${activity.type}-${activity.id}-${index}`}
                                            >
                                                <span
                                                    className={`activity-item__icon activity-item__icon--${activity.type}`}
                                                >
                                                    {activity.type ===
                                                    'order' ? (
                                                        <Package
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    ) : (
                                                        <Truck
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    )}
                                                </span>

                                                <div className="activity-item__main">
                                                    <strong>
                                                        {activity.type ===
                                                        'order'
                                                            ? 'Pedido'
                                                            : 'Entrega'}{' '}
                                                        {shortId(
                                                            activity.id
                                                        )}
                                                    </strong>

                                                    <span>
                                                        {activity.type ===
                                                            'order' &&
                                                        activity.value !==
                                                            undefined
                                                            ? `${formatMoney(
                                                                  activity.value
                                                              )} · `
                                                            : ''}

                                                        {relativeDate(
                                                            activity.date
                                                        )}
                                                    </span>
                                                </div>

                                                <StatusBadge
                                                    status={
                                                        activity.status
                                                    }
                                                />
                                            </div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={
                                        Route
                                    }
                                    title="Sin actividad reciente"
                                    description="Los últimos movimientos de la operación aparecerán en esta sección."
                                />
                            )}
                        </Card>
                    </div>
                </>
            )}
        </>
    );
}