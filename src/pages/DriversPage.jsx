
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    Activity,
    ArrowRight,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Mail,
    PackageCheck,
    RefreshCw,
    Search,
    ShieldCheck,
    Truck,
    UserRound,
    UsersRound,
    WifiOff,
    X
} from 'lucide-react';

import { driversService } from '../api/drivers.service.js';
import { getApiErrorMessage } from '../api/normalizers.js';
import { useAuth } from '../auth/useAuth.js';
import DriverCapacityEditor from '../components/DriverCapacityEditor.jsx';
import {
    EmptyState,
    LoadingState,
    PageHeader,
    Pagination,
    StatusBadge
} from '../components/ui.jsx';
import {
    formatDateTime,
    formatNumber,
    shortId
} from '../utils/formatters.js';

import './drivers.css';

const PERIODS = [7, 30, 90];

const AVAILABILITY = {
    available: { label: 'Disponible', icon: CheckCircle2 },
    busy: { label: 'Ocupado', icon: Truck },
    offline: { label: 'Fuera de servicio', icon: WifiOff }
};

const STATUS_CHOICES = [
    { value: 'available', label: 'Disponible' },
    { value: 'busy', label: 'Ocupado' },
    { value: 'offline', label: 'Fuera de servicio' }
];

function fullName(driver) {
    return [driver?.firstName, driver?.lastName]
        .filter(Boolean)
        .join(' ') || 'Repartidor';
}

function initials(driver) {
    return fullName(driver)
        .split(' ')
        .slice(0, 2)
        .map(word => word[0])
        .join('')
        .toUpperCase();
}

function AvailabilityBadge({ status }) {
    const normalized = AVAILABILITY[status] ? status : 'offline';
    const Icon = AVAILABILITY[normalized].icon;

    return (
        <span className={`drivers-status drivers-status--${normalized}`}>
            <Icon size={13} />
            {AVAILABILITY[normalized].label}
        </span>
    );
}

function SummaryCard({ icon: Icon, label, value, detail, tone = 'blue' }) {
    return (
        <div className={`drivers-summary drivers-summary--${tone}`}>
            <div className="drivers-summary__top">
                <span className="drivers-summary__icon">
                    <Icon size={20} />
                </span>
                <span>OPERACIÓN</span>
            </div>
            <strong>{formatNumber(value)}</strong>
            <span className="drivers-summary__label">{label}</span>
            <small>{detail}</small>
        </div>
    );
}

function AvailabilityEditor({ driver, pending, onChange }) {
    const activeDeliveries = driver.metrics?.activeDeliveries ?? 0;
    const remaining = driver.remainingCapacity ?? 0;
    const declared = driver.declaredStatus ?? 'available';

    return (
        <div className="drivers-editor">
            <div className="drivers-section-title">
                <strong>Disponibilidad</strong>
                <span>El estado declarado controla si recibe asignaciones</span>
            </div>
            <div
                className="drivers-editor__options"
                role="group"
                aria-label="Disponibilidad"
            >
                {STATUS_CHOICES.map(option => {
                    const selected = declared === option.value;
                    const disabled = pending || selected ||
                        (option.value === 'available' && !driver.active);

                    return (
                        <button
                            key={option.value}
                            type="button"
                            className={`drivers-editor__option ${selected ? 'is-selected' : ''}`}
                            onClick={() => onChange(driver.id, option.value)}
                            disabled={disabled}
                            aria-pressed={selected}
                        >
                            <span
                                className={`drivers-editor__dot drivers-editor__dot--${option.value}`}
                            />
                            {option.label}
                            {selected && <CheckCircle2 size={15} />}
                        </button>
                    );
                })}
            </div>
            {!driver.active && (
                <p className="drivers-editor__hint">
                    Este usuario está desactivado. Habilitalo desde Usuarios.
                </p>
            )}
            {activeDeliveries > 0 && (
                <p className="drivers-editor__hint">
                    Tiene {activeDeliveries} entrega(s) activa(s) y {remaining} cupo(s)
                    libre(s). Puede seguir recibiendo entregas mientras esté
                    disponible y tenga capacidad.
                </p>
            )}
            {declared === 'available' && remaining === 0 && (
                <p className="drivers-editor__hint">
                    Está marcado como disponible, pero alcanzó su capacidad.
                    No podrá recibir nuevas asignaciones hasta liberar cupos.
                </p>
            )}
            <div className="drivers-editor__effective">
                <span>Estado efectivo</span>
                <AvailabilityBadge status={driver.effectiveStatus} />
            </div>
        </div>
    );
}

function DriverHistory({ deliveries = [], total = 0 }) {
    return (
        <div className="drivers-history">
            <div className="drivers-section-title">
                <strong>Historial de entregas</strong>
                <span>Últimas {deliveries.length} de {total} operaciones</span>
            </div>
            {deliveries.length === 0 ? (
                <div className="drivers-history__empty">
                    <PackageCheck size={22} />
                    Todavía no hay entregas vinculadas.
                </div>
            ) : (
                <div className="drivers-history__list">
                    {deliveries.map(delivery => (
                        <div className="drivers-history__row" key={delivery._id}>
                            <span className="drivers-history__icon">
                                <Truck size={16} />
                            </span>
                            <div>
                                <strong>
                                    {delivery.trackingCode ||
                                        `#${shortId(delivery._id)}`}
                                </strong>
                                <small>{formatDateTime(delivery.createdAt)}</small>
                            </div>
                            <StatusBadge status={delivery.status} />
                        </div>
                    ))}
                </div>
            )}
            <Link to="/tracking" className="drivers-history__link">
                Ir a seguimiento <ArrowRight size={15} />
            </Link>
        </div>
    );
}

function DriverDetail({
    data,
    days,
    own = false,
    pending,
    onAvailabilityChange,
    onCapacityChange
}) {
    const { driver, recentDeliveries = [], totalDeliveries = 0 } = data;
    const metrics = driver.metrics ?? {};

    return (
        <div className="drivers-detail">
            <div className="drivers-detail__banner">
                <div className="drivers-detail__avatar">
                    {initials(driver)}
                </div>
                <div className="drivers-detail__person">
                    <span>
                        {own ? 'MI PERFIL OPERATIVO' : 'PERFIL DEL REPARTIDOR'}
                    </span>
                    <h2>{fullName(driver)}</h2>
                    <p>{driver.email}</p>
                </div>
                <AvailabilityBadge status={driver.effectiveStatus} />
            </div>
            <div className="drivers-detail__body">
                <div className="drivers-detail__identity">
                    <span>
                        <Mail size={14} /> {driver.email}
                    </span>
                    <span>
                        <ShieldCheck size={14} />
                        {driver.active
                            ? 'Usuario activo'
                            : 'Usuario desactivado'}
                    </span>
                </div>
                <div className="drivers-detail__metrics">
                    <div>
                        <span>ENTREGAS ACTIVAS</span>
                        <strong>
                            {formatNumber(metrics.activeDeliveries ?? 0)}
                        </strong>
                    </div>
                    <div>
                        <span>COMPLETADAS · {days} DÍAS</span>
                        <strong>
                            {formatNumber(metrics.completedInPeriod ?? 0)}
                        </strong>
                    </div>
                    <div>
                        <span>TIEMPO PROMEDIO</span>
                        <strong>
                            {metrics.averageDeliveryMinutes == null
                                ? '—'
                                : `${formatNumber(
                                    metrics.averageDeliveryMinutes
                                )} min`}
                        </strong>
                    </div>
                </div>

                <DriverCapacityEditor
                    driver={driver}
                    editable={!own}
                    pending={pending}
                    onSave={onCapacityChange}
                />

                <AvailabilityEditor
                    driver={driver}
                    pending={pending}
                    onChange={onAvailabilityChange}
                />

                <DriverHistory
                    deliveries={recentDeliveries}
                    total={totalDeliveries}
                />
            </div>
        </div>
    );
}

function DriverListItem({ driver, selected, onSelect }) {
    const metrics = driver.metrics ?? {};

    return (
        <button
            type="button"
            className={`drivers-person ${selected ? 'is-selected' : ''}`}
            onClick={() => onSelect(driver.id)}
            aria-pressed={selected}
        >
            <span className="drivers-person__avatar">
                {initials(driver)}
            </span>
            <span className="drivers-person__info">
                <strong>{fullName(driver)}</strong>
                <small>{driver.email}</small>
                <span className="drivers-person__metrics">
                    {metrics.activeDeliveries ?? 0} / {
                        driver.maxConcurrentDeliveries ?? 12
                    } activas
                    <span>·</span>
                    {metrics.completedInPeriod ?? 0} completadas
                </span>
            </span>
            <span className="drivers-person__right">
                <AvailabilityBadge status={driver.effectiveStatus} />
                <ChevronRight size={16} />
            </span>
        </button>
    );
}

export default function DriversPage() {
    const { role } = useAuth();
    const isAdmin = role === 'admin';
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [days, setDays] = useState(30);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        const timer = setTimeout(
            () => setDebouncedSearch(search.trim()),
            350
        );
        return () => clearTimeout(timer);
    }, [search]);

    const listQuery = useQuery({
        queryKey: ['drivers', 'list', page, days, debouncedSearch],
        queryFn: () => driversService.list({
            page,
            limit: 12,
            days,
            ...(debouncedSearch ? { q: debouncedSearch } : {})
        }),
        enabled: isAdmin,
        refetchInterval: 60_000
    });

    const detailQuery = useQuery({
        queryKey: ['drivers', 'detail', selectedId, days],
        queryFn: () => driversService.getById(selectedId, days),
        enabled: isAdmin && Boolean(selectedId),
        refetchInterval: 60_000
    });

    const meQuery = useQuery({
        queryKey: ['drivers', 'me', days],
        queryFn: () => driversService.getMe(days),
        enabled: !isAdmin,
        refetchInterval: 60_000
    });

    const mutation = useMutation({
        mutationFn: ({ type, id, value }) => {
            if (type === 'capacity') {
                return driversService.updateCapacity(id, value);
            }
            return driversService.updateAvailability(id, value);
        },
        onSuccess: (_data, variables) => {
            setNotice({
                type: 'success',
                message: variables.type === 'capacity'
                    ? `Capacidad actualizada a ${variables.value} entregas.`
                    : `Disponibilidad actualizada a ${
                        AVAILABILITY[variables.value]?.label ?? variables.value
                    }.`
            });

            queryClient.invalidateQueries({ queryKey: ['drivers'] });
            queryClient.invalidateQueries({ queryKey: ['deliveries'] });
            queryClient.invalidateQueries({
                queryKey: ['operations-intelligence']
            });
        },
        onError: error => {
            setNotice({
                type: 'error',
                message: getApiErrorMessage(
                    error,
                    'No se pudo guardar el cambio.'
                )
            });
        }
    });

    function changeAvailability(id, status) {
        setNotice(null);
        mutation.mutate({ type: 'availability', id, value: status });
    }

    function changeCapacity(id, capacity) {
        setNotice(null);
        mutation.mutate({ type: 'capacity', id, value: capacity });
    }

    function refreshAll() {
        setNotice(null);
        queryClient.invalidateQueries({ queryKey: ['drivers'] });
    }

    function updateSearch(value) {
        setSearch(value);
        setPage(1);
        setSelectedId('');
        setNotice(null);
    }

    const list = listQuery.data?.items ?? [];
    const total = listQuery.data?.total ?? 0;
    const totalPages = Math.max(
        1,
        listQuery.data?.totalPages ?? 1
    );

    const available = list.filter(
        item => item.effectiveStatus === 'available'
    ).length;
    const busy = list.filter(
        item => item.effectiveStatus === 'busy'
    ).length;
    const offline = list.filter(
        item => item.effectiveStatus === 'offline'
    ).length;
    const activeDeliveries = list.reduce(
        (sum, item) => sum + (item.metrics?.activeDeliveries ?? 0),
        0
    );

    const waitingForSearch = search.trim() !== debouncedSearch;

    return (
        <div className="drivers-page">
            <PageHeader
                eyebrow="Gestión de flota"
                title={isAdmin ? 'Repartidores' : 'Mi disponibilidad'}
                description={
                    isAdmin
                        ? 'Disponibilidad, capacidad y rendimiento del equipo de reparto.'
                        : 'Gestioná tu estado y consultá tus entregas y cupos disponibles.'
                }
            >
                <button
                    type="button"
                    className="drivers-refresh"
                    onClick={refreshAll}
                    disabled={
                        mutation.isPending ||
                        listQuery.isFetching ||
                        meQuery.isFetching
                    }
                >
                    <RefreshCw size={16} /> Actualizar
                </button>
            </PageHeader>

            <header className="drivers-hero">
                <div>
                    <span className="drivers-hero__eyebrow">
                        <span /> CONTROL DE FLOTA
                    </span>
                    <h2>
                        {isAdmin
                            ? 'Tu equipo, en tiempo real.'
                            : 'Tu jornada, bajo control.'}
                    </h2>
                    <p>
                        {isAdmin
                            ? 'Administrá cupos, carga de trabajo y disponibilidad del equipo.'
                            : 'Consultá tus entregas activas y actualizá tu disponibilidad.'}
                    </p>
                </div>

                <div
                    className="drivers-hero__decoration"
                    aria-hidden="true"
                >
                    <Truck size={65} strokeWidth={1.2} />
                </div>
            </header>

            <div className="drivers-toolbar">
                {isAdmin && (
                    <label className="drivers-search">
                        <Search size={18} />
                        <input
                            type="search"
                            value={search}
                            placeholder="Buscar por nombre, email o teléfono..."
                            onChange={event =>
                                updateSearch(event.target.value)
                            }
                        />
                        {search && (
                            <button
                                type="button"
                                aria-label="Borrar búsqueda"
                                onClick={() => updateSearch('')}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </label>
                )}

                <label className="drivers-period">
                    <span>Período de rendimiento</span>
                    <select
                        value={days}
                        onChange={event => {
                            setDays(Number(event.target.value));
                            setPage(1);
                            setNotice(null);
                        }}
                    >
                        {PERIODS.map(period => (
                            <option key={period} value={period}>
                                Últimos {period} días
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {isAdmin && (
                <div className="drivers-summary-grid">
                    <SummaryCard
                        icon={UsersRound}
                        label="Repartidores"
                        value={list.length}
                        detail={`${total} en total · vista actual`}
                    />
                    <SummaryCard
                        icon={CheckCircle2}
                        label="Disponibles"
                        value={available}
                        detail="Pueden recibir nuevas entregas"
                        tone="green"
                    />
                    <SummaryCard
                        icon={Truck}
                        label="Ocupados"
                        value={busy}
                        detail={`${activeDeliveries} entregas activas en esta página`}
                        tone="amber"
                    />
                    <SummaryCard
                        icon={WifiOff}
                        label="Fuera de servicio"
                        value={offline}
                        detail="Sin disponibilidad operativa"
                        tone="grey"
                    />
                </div>
            )}

            {notice && (
                <div
                    className={`drivers-notice ${
                        notice.type === 'error'
                            ? 'drivers-notice--error'
                            : ''
                    }`}
                    role={notice.type === 'error' ? 'alert' : 'status'}
                >
                    {notice.type === 'error'
                        ? <Activity size={17} />
                        : <CheckCircle2 size={17} />}
                    {notice.message}
                </div>
            )}

            {isAdmin ? (
                <div className="drivers-layout">
                    <section className="drivers-list-panel">
                        <div className="drivers-panel-heading">
                            <div>
                                <span>EQUIPO DE REPARTO</span>
                                <h2>Personal operativo</h2>
                                <p>
                                    {total} repartidor(es).
                                    Seleccioná uno para consultar su capacidad y rendimiento.
                                </p>
                            </div>
                        </div>

                        {listQuery.isPending || waitingForSearch ? (
                            <LoadingState title="Buscando repartidores" />
                        ) : listQuery.isError ? (
                            <EmptyState
                                icon={UsersRound}
                                title="Error al consultar el equipo"
                                description={getApiErrorMessage(
                                    listQuery.error
                                )}
                            />
                        ) : list.length === 0 ? (
                            <EmptyState
                                icon={Search}
                                title="Sin repartidores"
                                description="No encontramos usuarios con esos datos."
                            />
                        ) : (
                            <div className="drivers-list">
                                {list.map(driver => (
                                    <DriverListItem
                                        key={driver.id}
                                        driver={driver}
                                        selected={selectedId === driver.id}
                                        onSelect={id => {
                                            setSelectedId(id);
                                            setNotice(null);
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            total={total}
                            onPageChange={nextPage => {
                                setPage(nextPage);
                                setSelectedId('');
                                setNotice(null);
                            }}
                        />
                    </section>

                    <section className="drivers-detail-panel">
                        {!selectedId ? (
                            <div className="drivers-select-empty">
                                <span>
                                    <UserRound size={30} />
                                </span>
                                <h3>Seleccioná un repartidor</h3>
                                <p>
                                    Su disponibilidad, cupos, métricas
                                    e historial aparecerán acá.
                                </p>
                            </div>
                        ) : detailQuery.isPending ? (
                            <LoadingState title="Cargando perfil" />
                        ) : detailQuery.isError ? (
                            <EmptyState
                                icon={UserRound}
                                title="No se pudo consultar el perfil"
                                description={getApiErrorMessage(
                                    detailQuery.error
                                )}
                            />
                        ) : (
                            <DriverDetail
                                data={detailQuery.data}
                                days={detailQuery.data.periodDays ?? days}
                                pending={mutation.isPending}
                                onAvailabilityChange={changeAvailability}
                                onCapacityChange={changeCapacity}
                            />
                        )}
                    </section>
                </div>
            ) : (
                <section className="drivers-own-profile">
                    {meQuery.isPending ? (
                        <LoadingState title="Cargando tu perfil" />
                    ) : meQuery.isError ? (
                        <EmptyState
                            icon={UserRound}
                            title="No se pudo consultar tu perfil"
                            description={getApiErrorMessage(
                                meQuery.error
                            )}
                        />
                    ) : (
                        <DriverDetail
                            data={meQuery.data}
                            days={meQuery.data.periodDays ?? days}
                            own
                            pending={mutation.isPending}
                            onAvailabilityChange={changeAvailability}
                            onCapacityChange={changeCapacity}
                        />
                    )}
                </section>
            )}

            <footer className="drivers-footnote">
                <Clock3 size={15} />
                La disponibilidad efectiva también considera el límite
                de entregas. El período seleccionado afecta las estadísticas,
                pero el historial muestra las últimas 20 operaciones
                de cualquier fecha.
            </footer>
        </div>
    );
}
