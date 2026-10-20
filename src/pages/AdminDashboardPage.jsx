
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Activity,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Package,
    RefreshCw,
    Route,
    Truck,
    Warehouse,
    XCircle
} from 'lucide-react';

import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

import { analyticsService } from '../api/analytics.service.js';
import { getApiErrorMessage } from '../api/normalizers.js';
import {
    Card,
    EmptyState,
    LoadingState,
    MetricCard,
    PageHeader,
    StatusBadge
} from '../components/ui.jsx';
import OperationsIntelligencePanel from '../components/OperationsIntelligencePanel.jsx';
import {
    formatMoney,
    formatNumber,
    relativeDate,
    shortId
} from '../utils/formatters.js';

import './admin-dashboard.css';

const PERIODS = [7, 14, 30, 90];

const COLORS = {
    active: 'var(--brand-500)',
    delivered: 'var(--success-500)',
    cancelled: 'var(--danger-500)'
};

function shortDay(value) {
    if (!value) return '';

    const date = new Date(`${value}T00:00:00.000Z`);

    return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: 'short',
        timeZone: 'UTC'
    }).format(date);
}

function formatPercentage(value) {
    return value == null
        ? '—'
        : `${formatNumber(value)}%`;
}

function financeRows(finances) {
    const shipping =
        finances?.shippingRevenueByCurrency ?? {};

    const costs =
        finances?.deliveryCostsByCurrency ?? {};

    const currencies = [
        ...new Set([
            ...Object.keys(shipping),
            ...Object.keys(costs)
        ])
    ];

    return currencies.sort().map(currency => ({
        currency,
        shipping: shipping[currency] ?? 0,
        cost: costs[currency] ?? 0
    }));
}

function SectionTitle({
    title,
    description,
    action
}) {
    return (
        <div className="analytics-panel-title">
            <div>
                <h2>{title}</h2>

                {description && (
                    <p>{description}</p>
                )}
            </div>

            {action}
        </div>
    );
}

export default function AdminDashboardPage() {
    const [days, setDays] = useState(14);
    const [refreshNotice, setRefreshNotice] = useState('');

    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['analytics', 'dashboard', days],
        queryFn: () => analyticsService.getDashboard(days),
        refetchInterval: 60_000
    });

    async function refreshDashboard() {
        setRefreshNotice('');

        const [result] = await Promise.all([
            query.refetch(),
            queryClient.invalidateQueries({
                queryKey: ['operations-intelligence']
            })
        ]);

        setRefreshNotice(
            result.error
                ? `Error al actualizar: ${getApiErrorMessage(result.error)}`
                : 'Consulta completada. Las cifras reflejan los datos actuales de la operación.'
        );
    }

    const lastUpdated = query.dataUpdatedAt
        ? new Date(query.dataUpdatedAt).toLocaleTimeString(
            'es-AR',
            {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }
        )
        : null;

    const data = query.data;
    const overview = data?.overview;
    const daily = data?.activity?.daily ?? [];
    const recentOrders = data?.activity?.recentOrders ?? [];
    const finance = financeRows(data?.finances);

    const statusData = overview
        ? [
            {
                name: 'En operación',
                value: overview.ordersActive ?? 0,
                key: 'active'
            },
            {
                name: 'Entregados',
                value: overview.ordersDelivered ?? 0,
                key: 'delivered'
            },
            {
                name: 'Cancelados',
                value: overview.ordersCancelled ?? 0,
                key: 'cancelled'
            }
        ].filter(item => item.value > 0)
        : [];

    return (
        <div className="admin-dashboard">
            <PageHeader
                eyebrow="Centro de control"
                title="Dashboard operativo"
                description="Información consolidada de toda la operación, obtenida directamente de MongoDB."
            >
                <button
                    type="button"
                    className="analytics-refresh"
                    onClick={refreshDashboard}
                    disabled={query.isFetching}
                    title="Actualizar estadísticas"
                >
                    <RefreshCw
                        size={16}
                        className={query.isFetching ? 'spin' : ''}
                    />

                    {query.isFetching
                        ? 'Actualizando...'
                        : 'Actualizar'}
                </button>
            </PageHeader>

            <div className="analytics-toolbar">
                <div className="analytics-live">
                    <span className="analytics-live__dot" />
                    Datos reales de la API

                    {lastUpdated && (
                        <span className="analytics-updated">
                            · Última consulta: {lastUpdated}
                        </span>
                    )}
                </div>

                {refreshNotice && (
                    <span
                        className="analytics-updated"
                        role="status"
                    >
                        {refreshNotice}
                    </span>
                )}

                <div
                    className="analytics-periods"
                    role="group"
                    aria-label="Período del gráfico y rendimiento"
                >
                    {PERIODS.map(period => (
                        <button
                            key={period}
                            type="button"
                            className={
                                days === period
                                    ? 'is-selected'
                                    : ''
                            }
                            aria-pressed={days === period}
                            onClick={() => setDays(period)}
                        >
                            {period} días
                        </button>
                    ))}
                </div>
            </div>

            {query.isPending ? (
                <Card className="analytics-message">
                    <LoadingState title="Cargando estadísticas" />
                </Card>
            ) : query.isError ? (
                <Card className="analytics-message">
                    <EmptyState
                        icon={Activity}
                        title="No pudimos cargar el dashboard"
                        description={getApiErrorMessage(
                            query.error,
                            'Verificá la conexión con el backend.'
                        )}
                    >
                        <button
                            type="button"
                            className="analytics-refresh"
                            onClick={() => query.refetch()}
                        >
                            <RefreshCw size={16} />
                            Reintentar
                        </button>
                    </EmptyState>
                </Card>
            ) : (
                <>
                    <div className="analytics-metrics">
                        <MetricCard
                            icon={CalendarDays}
                            tone="brand"
                            label="Pedidos de hoy"
                            value={formatNumber(overview.ordersToday)}
                            description="Creados desde las 00:00 UTC"
                        />

                        <MetricCard
                            icon={Package}
                            tone="info"
                            label="Pedidos activos"
                            value={formatNumber(overview.ordersActive)}
                            description="Pendientes o en movimiento"
                        />

                        <MetricCard
                            icon={Truck}
                            tone="warning"
                            label="Entregas en tránsito"
                            value={formatNumber(overview.deliveriesInTransit)}
                            description="Operaciones en curso"
                        />

                        <MetricCard
                            icon={CheckCircle2}
                            tone="success"
                            label="Pedidos entregados"
                            value={formatNumber(overview.ordersDelivered)}
                            description="Acumulado histórico"
                        />

                        <MetricCard
                            icon={Route}
                            tone="violet"
                            label="Tasa de entrega"
                            value={formatPercentage(overview.deliveryRate)}
                            description="Sobre pedidos finalizados"
                        />

                        <MetricCard
                            icon={Clock3}
                            tone="info"
                            label="Tiempo promedio"
                            value={
                                overview.averageDeliveryMinutes == null
                                    ? '—'
                                    : `${formatNumber(
                                        overview.averageDeliveryMinutes
                                    )} min`
                            }
                            description="Desde asignación hasta entrega"
                        />

                        <MetricCard
                            icon={Warehouse}
                            tone="brand"
                            label="Depósitos activos"
                            value={formatNumber(overview.depotsActive)}
                            description="Centros operativos habilitados"
                        />

                        <MetricCard
                            icon={XCircle}
                            tone="warning"
                            label="Pedidos cancelados"
                            value={formatNumber(overview.ordersCancelled)}
                            description="Acumulado histórico"
                        />
                    </div>

                    <OperationsIntelligencePanel days={days} />

                    <div className="analytics-grid">
                        <Card className="analytics-panel analytics-panel--main">
                            <SectionTitle
                                title="Actividad de la operación"
                                description={`Pedidos creados y entregas completadas · últimos ${days} días`}
                            />

                            {daily.length ? (
                                <div className="analytics-chart">
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <AreaChart
                                            data={daily}
                                            margin={{
                                                top: 12,
                                                right: 10,
                                                bottom: 0,
                                                left: -25
                                            }}
                                        >
                                            <defs>
                                                <linearGradient
                                                    id="analyticsOrdersGradient"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="5%"
                                                        stopColor="#3188f5"
                                                        stopOpacity={0.2}
                                                    />

                                                    <stop
                                                        offset="95%"
                                                        stopColor="#3188f5"
                                                        stopOpacity={0}
                                                    />
                                                </linearGradient>
                                            </defs>

                                            <CartesianGrid
                                                stroke="var(--border-subtle)"
                                                vertical={false}
                                                strokeDasharray="3 5"
                                            />

                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={shortDay}
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{
                                                    fontSize: 11,
                                                    fill: '#64748b'
                                                }}
                                                minTickGap={20}
                                            />

                                            <YAxis
                                                allowDecimals={false}
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{
                                                    fontSize: 11,
                                                    fill: '#64748b'
                                                }}
                                            />

                                            <Tooltip
                                                labelFormatter={shortDay}
                                                contentStyle={{
                                                    borderRadius: 12,
                                                    border: '1px solid #e2e8f0'
                                                }}
                                            />

                                            <Area
                                                type="monotone"
                                                name="Pedidos creados"
                                                dataKey="orders"
                                                stroke="#3188f5"
                                                strokeWidth={3}
                                                fill="url(#analyticsOrdersGradient)"
                                            />

                                            <Area
                                                type="monotone"
                                                name="Entregas completadas"
                                                dataKey="deliveriesCompleted"
                                                stroke="#16a34a"
                                                strokeWidth={2.5}
                                                fill="transparent"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Activity}
                                    title="Sin actividad"
                                    description="Los movimientos aparecerán cuando existan registros."
                                />
                            )}

                            <div className="analytics-chart-legend">
                                <span>
                                    <i className="analytics-dot analytics-dot--blue" />
                                    Pedidos creados
                                </span>

                                <span>
                                    <i className="analytics-dot analytics-dot--green" />
                                    Entregas completadas
                                </span>
                            </div>
                        </Card>

                        <Card className="analytics-panel">
                            <SectionTitle
                                title="Estado de pedidos"
                                description={`${formatNumber(
                                    overview.ordersTotal
                                )} pedidos en total`}
                            />

                            {statusData.length ? (
                                <>
                                    <div className="analytics-donut">
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <PieChart>
                                                <Pie
                                                    data={statusData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={60}
                                                    outerRadius={85}
                                                    paddingAngle={4}
                                                    strokeWidth={0}
                                                >
                                                    {statusData.map(item => (
                                                        <Cell
                                                            key={item.key}
                                                            fill={COLORS[item.key]}
                                                        />
                                                    ))}
                                                </Pie>

                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>

                                        <div className="analytics-donut__number">
                                            <strong>
                                                {formatNumber(
                                                    overview.ordersTotal
                                                )}
                                            </strong>

                                            <span>Pedidos</span>
                                        </div>
                                    </div>

                                    <div className="analytics-status-list">
                                        {statusData.map(item => (
                                            <div key={item.key}>
                                                <span>
                                                    <i
                                                        style={{
                                                            background:
                                                                COLORS[item.key]
                                                        }}
                                                    />

                                                    {item.name}
                                                </span>

                                                <strong>
                                                    {formatNumber(item.value)}
                                                </strong>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <EmptyState
                                    icon={Package}
                                    title="Sin pedidos"
                                    description="Creá el primer pedido para comenzar."
                                />
                            )}
                        </Card>

                        <Card className="analytics-panel">
                            <SectionTitle
                                title="Costos registrados"
                                description="Desglose por moneda, sin conversiones de divisas"
                            />

                            {finance.length ? (
                                finance.map(row => (
                                    <div
                                        className="analytics-finance"
                                        key={row.currency}
                                    >
                                        <span className="analytics-finance__currency">
                                            {row.currency}
                                        </span>

                                        <div>
                                            <span>Cargos de envío</span>

                                            <strong>
                                                {formatMoney(row.shipping)}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Costos de reparto</span>

                                            <strong>
                                                {formatMoney(row.cost)}
                                            </strong>
                                        </div>

                                        <small>
                                            Importes registrados;
                                            no representan beneficio neto.
                                        </small>
                                    </div>
                                ))
                            ) : (
                                <EmptyState
                                    icon={Route}
                                    title="Sin costos cargados"
                                    description="Los importes aparecerán cuando se registren operaciones."
                                />
                            )}
                        </Card>

                        <Card className="analytics-panel analytics-panel--recent">
                            <SectionTitle
                                title="Pedidos recientes"
                                description="Últimos movimientos de pedidos registrados"
                                action={
                                    <Link
                                        className="analytics-link"
                                        to="/orders"
                                    >
                                        Ver pedidos
                                        <ArrowRight size={15} />
                                    </Link>
                                }
                            />

                            {recentOrders.length ? (
                                <div className="analytics-table-wrap">
                                    <table className="analytics-table">
                                        <thead>
                                            <tr>
                                                <th>Pedido</th>
                                                <th>Prioridad</th>
                                                <th>Estado</th>
                                                <th>Actualización</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {recentOrders.map(order => (
                                                <tr key={order.id}>
                                                    <td>
                                                        <strong>
                                                            {order.trackingCode ||
                                                                shortId(
                                                                    order.id
                                                                )}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        <StatusBadge
                                                            status={
                                                                order.priority ||
                                                                'normal'
                                                            }
                                                        />
                                                    </td>

                                                    <td>
                                                        <StatusBadge
                                                            status={order.status}
                                                        />
                                                    </td>

                                                    <td>
                                                        {relativeDate(
                                                            order.updatedAt ||
                                                            order.createdAt
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Package}
                                    title="Sin pedidos recientes"
                                    description="Los pedidos nuevos aparecerán acá."
                                />
                            )}
                        </Card>
                    </div>

                    <p className="analytics-footnote">
                        Los indicadores principales son acumulados,
                        salvo los pedidos creados hoy.
                        El período seleccionado modifica el gráfico
                        de actividad y el rendimiento de repartidores.
                        Las alertas reflejan la situación actual.
                    </p>
                </>
            )}
        </div>
    );
}
