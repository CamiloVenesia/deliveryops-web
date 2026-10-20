
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    Activity,
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    Clock3,
    Flag,
    RefreshCw,
    ShieldAlert,
    Truck,
    UserRound,
    UsersRound
} from 'lucide-react';

import { operationsIntelligenceService } from '../api/operations-intelligence.service.js';
import { getApiErrorMessage } from '../api/normalizers.js';
import {
    formatDateTime,
    formatNumber,
    statusLabel
} from '../utils/formatters.js';

import './operations-intelligence.css';

const ALERT_TYPES = {
    overdue: {
        icon: ShieldAlert,
        label: 'Fuera de plazo',
        tone: 'critical'
    },
    stale: {
        icon: Clock3,
        label: 'Sin actualización',
        tone: 'warning'
    },
    high_priority: {
        icon: Flag,
        label: 'Alta prioridad',
        tone: 'priority'
    }
};

function Metric({
    icon: Icon,
    label,
    value,
    description,
    tone
}) {
    return (
        <div className={`oi-metric oi-metric--${tone}`}>
            <div className="oi-metric__top">
                <span className="oi-metric__icon">
                    <Icon size={19} strokeWidth={1.8} />
                </span>
                <span className="oi-metric__caption">
                    MONITOREO
                </span>
            </div>

            <strong className="oi-metric__value">
                {formatNumber(value ?? 0)}
            </strong>

            <span className="oi-metric__label">
                {label}
            </span>

            <p className="oi-metric__description">
                {description}
            </p>
        </div>
    );
}

function AlertItem({ alert }) {
    const settings = ALERT_TYPES[alert.type] ?? {
        icon: AlertCircle,
        label: 'Atención',
        tone: 'warning'
    };

    const Icon = settings.icon;

    const destination =
        alert.entity === 'delivery'
            ? '/tracking'
            : '/orders';

    return (
        <article className="oi-alert">
            <div
                className={`oi-alert__symbol oi-alert__symbol--${settings.tone}`}
            >
                <Icon size={18} />
            </div>

            <div className="oi-alert__body">
                <div className="oi-alert__headline">
                    <strong>
                        {alert.trackingCode}
                    </strong>

                    <span
                        className={`oi-alert__badge oi-alert__badge--${settings.tone}`}
                    >
                        {settings.label}
                    </span>
                </div>

                <p>{alert.description}</p>

                <div className="oi-alert__metadata">
                    <span>
                        {statusLabel(alert.status)}
                    </span>

                    {alert.estimatedDeliveryAt && (
                        <span>
                            ETA: {formatDateTime(alert.estimatedDeliveryAt)}
                        </span>
                    )}

                    {alert.lastUpdatedAt && (
                        <span>
                            Actualizado: {formatDateTime(alert.lastUpdatedAt)}
                        </span>
                    )}
                </div>
            </div>

            <Link
                to={destination}
                className="oi-alert__action"
                aria-label={`Ir a ${alert.entity === 'delivery' ? 'Seguimiento' : 'Pedidos'} para revisar ${alert.trackingCode}`}
                title="Abrir módulo de gestión"
            >
                <ArrowRight size={17} />
            </Link>
        </article>
    );
}

function AlertsPanel({ alerts }) {
    const items = alerts?.items ?? [];

    return (
        <div className="oi-card oi-card--alerts">
            <div className="oi-card__heading">
                <div>
                    <span className="oi-eyebrow">
                        MONITOREO OPERATIVO
                    </span>

                    <h3>
                        <ShieldAlert size={19} />
                        Requieren atención
                    </h3>

                    <p>
                        Operaciones que cumplen alguna condición de alerta.
                    </p>
                </div>

                <Link
                    to="/search"
                    className="oi-link"
                >
                    Búsqueda avanzada
                    <ArrowRight size={15} />
                </Link>
            </div>

            {items.length > 0 ? (
                <div className="oi-alert-list">
                    {items.map(alert => (
                        <AlertItem
                            key={`${alert.entity}-${alert.id}`}
                            alert={alert}
                        />
                    ))}
                </div>
            ) : (
                <div className="oi-empty">
                    <span className="oi-empty__icon">
                        <CheckCircle2 size={26} />
                    </span>

                    <strong>
                        Sin alertas destacadas
                    </strong>

                    <p>
                        No encontramos operaciones que cumplan
                        las condiciones de alerta configuradas.
                    </p>
                </div>
            )}

            <div className="oi-card__footer">
                <Clock3 size={14} />

                <span>
                    Las alertas se calculan con los datos registrados.
                    Se muestran hasta 12 operaciones sin duplicados.
                </span>
            </div>
        </div>
    );
}

function PerformancePanel({ drivers, days }) {
    const totalCompleted = drivers.reduce(
        (sum, driver) => sum + driver.completed,
        0
    );

    return (
        <div className="oi-card oi-card--performance">
            <div className="oi-card__heading">
                <div>
                    <span className="oi-eyebrow">
                        RENDIMIENTO DEL EQUIPO
                    </span>

                    <h3>
                        <UsersRound size={19} />
                        Repartidores
                    </h3>

                    <p>
                        Entregas completadas en los últimos {days} días.
                    </p>
                </div>
            </div>

            {drivers.length > 0 ? (
                <>
                    <div className="oi-driver-overview">
                        <div>
                            <span>ENTREGAS COMPLETADAS</span>

                            <strong>
                                {formatNumber(totalCompleted)}
                            </strong>
                        </div>

                        <div>
                            <span>REPARTIDORES MOSTRADOS</span>

                            <strong>
                                {formatNumber(drivers.length)}
                            </strong>
                        </div>
                    </div>

                    <div className="oi-drivers">
                        {drivers.map((driver, index) => {
                            const maxCompleted =
                                drivers[0]?.completed || 1;

                            const percentage = Math.max(
                                0,
                                Math.min(
                                    100,
                                    driver.completed / maxCompleted * 100
                                )
                            );

                            return (
                                <article
                                    className="oi-driver"
                                    key={driver.driverId}
                                >
                                    <div className="oi-driver__top">
                                        <span className="oi-driver__avatar">
                                            <UserRound size={17} />
                                        </span>

                                        <div className="oi-driver__identity">
                                            <strong>
                                                {driver.name}
                                            </strong>

                                            <small>
                                                Repartidor {index + 1}
                                            </small>
                                        </div>

                                        <strong className="oi-driver__completed">
                                            {formatNumber(driver.completed)}
                                            <small> entregas</small>
                                        </strong>
                                    </div>

                                    <div
                                        className="oi-driver__bar"
                                        role="img"
                                        aria-label={`${driver.completed} entregas completadas`}
                                    >
                                        <span
                                            style={{
                                                width: `${percentage}%`
                                            }}
                                        />
                                    </div>

                                    <div className="oi-driver__stats">
                                        <span>
                                            <Clock3 size={13} />
                                            {driver.averageDeliveryMinutes == null
                                                ? 'Tiempo no disponible'
                                                : `${formatNumber(driver.averageDeliveryMinutes)} min promedio`}
                                        </span>

                                        <span>
                                            <CheckCircle2 size={13} />
                                            {driver.onTimeRate == null
                                                ? 'Sin ETA evaluable'
                                                : `${formatNumber(driver.onTimeRate)}% a tiempo`}
                                        </span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="oi-empty">
                    <span className="oi-empty__icon">
                        <Truck size={25} />
                    </span>

                    <strong>
                        Sin entregas completadas
                    </strong>

                    <p>
                        No hay repartidores con entregas finalizadas
                        durante el período seleccionado.
                    </p>
                </div>
            )}

            <div className="oi-card__footer">
                <Activity size={14} />

                <span>
                    Se muestran hasta 8 repartidores, ordenados
                    por cantidad de entregas. El porcentaje puntual
                    se calcula solo cuando existe una fecha estimada.
                </span>
            </div>
        </div>
    );
}

export default function OperationsIntelligencePanel({
    days = 14
}) {
    const query = useQuery({
        queryKey: ['operations-intelligence', days],
        queryFn: () =>
            operationsIntelligenceService.getOverview(days),
        refetchInterval: 60_000,
        staleTime: 15_000,
        retry: 1
    });

    const summary = query.data?.alerts?.summary;
    const drivers = query.data?.performance?.drivers ?? [];

    const generatedAt = query.data?.generatedAt
        ? formatDateTime(query.data.generatedAt)
        : null;

    return (
        <section
            className="oi-section"
            aria-labelledby="operations-intelligence-heading"
        >
            <div className="oi-section__heading">
                <div>
                    <span className="oi-section__eyebrow">
                        INTELIGENCIA OPERATIVA
                    </span>

                    <h2 id="operations-intelligence-heading">
                        Pulso de la operación
                    </h2>

                    <p>
                        Detectá demoras, incidencias y situaciones
                        que necesitan intervención.
                    </p>
                </div>

                <div className="oi-section__meta">
                    <span className="oi-live-dot" />

                    <span>
                        {query.isFetching
                            ? 'Actualizando indicadores...'
                            : 'Monitoreo activo'}
                    </span>

                    {generatedAt && (
                        <small>
                            {generatedAt}
                        </small>
                    )}
                </div>
            </div>

            {query.isPending ? (
                <div className="oi-loading" role="status">
                    <RefreshCw size={22} className="spin" />
                    <span>
                        Analizando el estado de la operación...
                    </span>
                </div>
            ) : query.isError ? (
                <div className="oi-error" role="alert">
                    <AlertCircle size={22} />

                    <div>
                        <strong>
                            No pudimos consultar las alertas.
                        </strong>

                        <p>
                            {getApiErrorMessage(
                                query.error,
                                'Verificá la conexión con la API.'
                            )}
                        </p>

                        <small>
                            Si estás en localhost, asegurate de
                            utilizar el backend actualizado del Bloque 9.
                        </small>
                    </div>

                    <button
                        type="button"
                        onClick={() => query.refetch()}
                        disabled={query.isFetching}
                    >
                        Reintentar
                    </button>
                </div>
            ) : (
                <>
                    <div className="oi-metrics">
                        <Metric
                            icon={ShieldAlert}
                            tone="critical"
                            label="Fuera de plazo"
                            value={summary?.overdue}
                            description="Entregas activas con fecha estimada vencida."
                        />

                        <Metric
                            icon={Clock3}
                            tone="warning"
                            label="Sin actualización"
                            value={summary?.staleInTransit}
                            description="Entregas en tránsito sin cambios durante 24 horas."
                        />

                        <Metric
                            icon={Flag}
                            tone="priority"
                            label="Prioridad alta"
                            value={summary?.highPriorityOpen}
                            description="Pedidos prioritarios todavía abiertos."
                        />

                        <Metric
                            icon={ClipboardList}
                            tone="info"
                            label="Sin asignar"
                            value={summary?.unassignedOrders}
                            description="Pedidos que todavía están en estado creado."
                        />

                        <Metric
                            icon={Activity}
                            tone="neutral"
                            label="Incidencias"
                            value={summary?.incidentsLast7Days}
                            description="Intentos fallidos registrados durante los últimos 7 días."
                        />
                    </div>

                    <div className="oi-panels">
                        <AlertsPanel alerts={query.data.alerts} />

                        <PerformancePanel
                            drivers={drivers}
                            days={days}
                        />
                    </div>

                    <p className="oi-disclaimer">
                        Los indicadores de alerta representan la situación
                        actual de todos los registros; el período seleccionado
                        modifica el rendimiento de repartidores.
                        Una operación puede aparecer en más de un indicador.
                        En la base demo, los registros históricos son simulados.
                    </p>
                </>
            )}
        </section>
    );
}
