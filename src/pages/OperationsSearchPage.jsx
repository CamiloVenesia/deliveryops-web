
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    ArrowDownUp,
    ArrowRight,
    Check,
    ChevronRight,
    CircleAlert,
    ClipboardCopy,
    Clock3,
    FilterX,
    Package,
    RefreshCw,
    Search,
    SlidersHorizontal,
    Truck,
    X
} from 'lucide-react';

import { orderService, deliveryService } from '../api/services.js';
import { getApiErrorMessage } from '../api/normalizers.js';
import { useAuth } from '../auth/useAuth.js';
import { StatusBadge, Pagination } from '../components/ui.jsx';
import {
    formatDateTime,
    formatMoney,
    getEntityId,
    shortId,
    statusLabel
} from '../utils/formatters.js';

import './operations-search.css';

const PAGE_SIZE = 10;
const EMPTY_FILTERS = {
    status: '', priority: '', from: '', to: '', sort: 'newest'
};
const STATUS_OPTIONS = {
    orders: ['created', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
    deliveries: ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled']
};
const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Baja' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Alta' }
];

function dateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getSearchableOrderFields(order) {
    return [
        order._id, order.trackingCode, order.deliveryAddress,
        order.recipient?.fullName, order.recipient?.email,
        order.recipient?.phone,
        ...(order.items ?? []).map(item => item.name)
    ].filter(Boolean).join(' ').toLocaleLowerCase();
}

function ensureApiRespectedFilters(data, kind, params) {
    const items = data.items ?? [];

    // Evita mostrar resultados falsos si el frontend apunta
    // a una API antigua que ignora los nuevos parametros.
    if (params.status && items.some(item => item.status !== params.status)) {
        throw new Error('La API conectada no está aplicando el filtro de estado. Revisá VITE_API_URL y comprobá que el Bloque 8 esté desplegado en esa API.');
    }

    if (params.priority && items.some(item => item.priority !== params.priority)) {
        throw new Error('La API conectada no está aplicando el filtro de prioridad. Revisá VITE_API_URL y comprobá el despliegue del backend.');
    }

    const q = params.q?.toLocaleLowerCase();
    if (q && items.some(item => {
        if (kind === 'orders') return !getSearchableOrderFields(item).includes(q);
        // En entregas, una busqueda por pedido puede coincidir con
        // campos no poblados. Solo validamos el codigo de entrega directo.
        if (/^dopd-/i.test(q)) return !String(item.trackingCode ?? '').toLocaleLowerCase().includes(q);
        return false;
    })) {
        throw new Error('La API está devolviendo registros que no coinciden con tu búsqueda. Es probable que estés conectado a una versión anterior del backend.');
    }

    return data;
}

function getLinkedOrderLabel(item) {
    if (!item.order) return 'Sin pedido relacionado';
    if (typeof item.order === 'object' && item.order.trackingCode) {
        return item.order.trackingCode;
    }
    return `Pedido #${shortId(getEntityId(item.order))}`;
}

function getDriverLabel(driver) {
    if (!driver) return 'Sin asignar';
    if (typeof driver === 'object') {
        return [driver.firstName, driver.lastName].filter(Boolean).join(' ') || 'Asignado';
    }
    return `#${shortId(driver)}`;
}

function ResultRow({ item, kind, onCopy, copied }) {
    const isOrder = kind === 'orders';
    const code = item.trackingCode || getEntityId(item);
    const subtitle = isOrder
        ? item.recipient?.fullName || 'Destinatario sin especificar'
        : getLinkedOrderLabel(item);
    const secondary = isOrder
        ? item.deliveryAddress || 'Dirección no registrada'
        : getDriverLabel(item.driver);
    const Icon = isOrder ? Package : Truck;

    return (
        <div className="os-result">
            <div className="os-result__identity">
                <span className="os-result__icon"><Icon size={19} strokeWidth={1.8} /></span>
                <div className="os-result__identity-text">
                    <span className="os-result__code">{code}</span>
                    <span className="os-result__id">ID · {shortId(item)}</span>
                </div>
            </div>
            <div className="os-result__destination">
                <strong title={subtitle}>{subtitle}</strong>
                <span title={secondary}>{secondary}</span>
            </div>
            <div className="os-result__status"><StatusBadge status={item.status} /></div>
            <div className="os-result__priority">
                <span className={`os-priority os-priority--${item.priority || 'none'}`}>
                    <i /> {PRIORITY_OPTIONS.find(option => option.value === item.priority)?.label || 'Sin definir'}
                </span>
            </div>
            <div className="os-result__date">
                <Clock3 size={14} /> {formatDateTime(item.createdAt)}
            </div>
            <div className="os-result__amount">
                {isOrder ? formatMoney(item.total) : <span className="os-result__driver">{getDriverLabel(item.driver)}</span>}
            </div>
            <button
                type="button"
                className="os-copy"
                aria-label={`Copiar código ${code}`}
                title="Copiar código"
                onClick={() => onCopy(code)}
            >
                {copied === code ? <Check size={17} /> : <ClipboardCopy size={17} />}
            </button>
        </div>
    );
}

export default function OperationsSearchPage() {
    const { role } = useAuth();
    const allowOrders = role === 'admin' || role === 'customer';
    const [kind, setKind] = useState(allowOrders ? 'orders' : 'deliveries');
    const [searchInput, setSearchInput] = useState('');
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const [copied, setCopied] = useState('');

    useEffect(() => {
        const timer = window.setTimeout(() => setQuery(searchInput.trim()), 450);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const waitingForInput = searchInput.trim() !== query;
    const params = useMemo(() => ({
        page,
        limit: PAGE_SIZE,
        sort: filters.sort,
        ...(query ? { q: query } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.priority ? { priority: filters.priority } : {}),
        ...(filters.from ? { from: filters.from } : {}),
        ...(filters.to ? { to: filters.to } : {})
    }), [page, query, filters]);

    const results = useQuery({
        queryKey: ['operations-search-v2', kind, params],
        queryFn: async () => {
            const data = kind === 'orders'
                ? await orderService.list(params)
                : await deliveryService.list(params);
            return ensureApiRespectedFilters(data, kind, params);
        },
        retry: false,
        refetchOnWindowFocus: false
    });

    const items = results.data?.items ?? [];
    const total = results.data?.total ?? 0;
    const totalPages = Math.max(1, results.data?.totalPages ?? 1);
    const visibleFrom = total ? (page - 1) * PAGE_SIZE + 1 : 0;
    const visibleTo = Math.min(page * PAGE_SIZE, total);
    const activeCount = [query, filters.status, filters.priority, filters.from, filters.to].filter(Boolean).length;
    const loading = waitingForInput || results.isPending || results.isFetching;
    const title = kind === 'orders' ? 'pedidos' : 'entregas';

    function updateFilter(field, value) {
        setFilters(current => ({ ...current, [field]: value }));
        setPage(1);
    }

    function switchKind(nextKind) {
        if (nextKind === kind) return;
        setKind(nextKind);
        setPage(1);
        setCopied('');
        setFilters(EMPTY_FILTERS);
        setSearchInput('');
        setQuery('');
    }

    function clearAll() {
        setSearchInput('');
        setQuery('');
        setFilters(EMPTY_FILTERS);
        setPage(1);
        setCopied('');
    }

    function setPeriod(days) {
        if (!days) {
            setFilters(current => ({ ...current, from: '', to: '' }));
        } else {
            const start = new Date();
            start.setDate(start.getDate() - days + 1);
            setFilters(current => ({
                ...current,
                from: dateInputValue(start),
                to: dateInputValue(new Date())
            }));
        }
        setPage(1);
    }

    async function copyCode(code) {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(code);
        } catch {
            setCopied('error');
        }
    }

    return (
        <div className="os-page">
            <header className="os-hero">
                <div className="os-hero__content">
                    <span className="os-hero__eyebrow"><span /> CONTROL OPERATIVO · DELIVERYOPS</span>
                    <h1>Encontrá cualquier operación<span>.</span></h1>
                    <p>Buscá en toda la base de datos, filtrá por estado y fechas, y accedé a la gestión sin perder tiempo.</p>
                </div>
                <div className="os-hero__art" aria-hidden="true"><Search size={74} strokeWidth={1} /></div>
            </header>

            <section className="os-panel" aria-label="Filtros de búsqueda">
                <div className="os-panel__top">
                    <div className="os-switch" role="group" aria-label="Tipo de operación">
                        {allowOrders && (
                            <button type="button" className={kind === 'orders' ? 'is-active' : ''} aria-pressed={kind === 'orders'} onClick={() => switchKind('orders')}>
                                <Package size={17} /> Pedidos
                            </button>
                        )}
                        <button type="button" className={kind === 'deliveries' ? 'is-active' : ''} aria-pressed={kind === 'deliveries'} onClick={() => switchKind('deliveries')}>
                            <Truck size={17} /> Entregas
                        </button>
                    </div>
                    <span className="os-panel__source"><span /> Consulta a MongoDB</span>
                </div>

                <label className="os-main-search">
                    <Search size={21} aria-hidden="true" />
                    <input
                        type="search"
                        value={searchInput}
                        maxLength={120}
                        autoComplete="off"
                        placeholder={kind === 'orders'
                            ? 'Buscar código, destinatario, dirección o ID...'
                            : 'Buscar código de entrega o pedido asociado...'}
                        onChange={event => { setSearchInput(event.target.value); setPage(1); }}
                        aria-label="Buscar operaciones"
                    />
                    {searchInput && (
                        <button type="button" aria-label="Borrar búsqueda" className="os-main-search__clear" onClick={() => { setSearchInput(''); setQuery(''); setPage(1); }}>
                            <X size={17} />
                        </button>
                    )}
                    <span className="os-main-search__hint">Búsqueda global</span>
                </label>

                <div className="os-filters-heading">
                    <span><SlidersHorizontal size={17} /> Refinar resultados</span>
                    <button type="button" onClick={clearAll}><FilterX size={15} /> Limpiar todo</button>
                </div>

                <div className="os-filters">
                    <label>
                        <span>Estado</span>
                        <select value={filters.status} onChange={event => updateFilter('status', event.target.value)}>
                            <option value="">Todos los estados</option>
                            {STATUS_OPTIONS[kind].map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
                        </select>
                    </label>
                    <label>
                        <span>Prioridad</span>
                        <select value={filters.priority} onChange={event => updateFilter('priority', event.target.value)}>
                            <option value="">Todas las prioridades</option>
                            {PRIORITY_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                    </label>
                    <label>
                        <span>Desde</span>
                        <input type="date" value={filters.from} max={filters.to || undefined} onChange={event => updateFilter('from', event.target.value)} />
                    </label>
                    <label>
                        <span>Hasta</span>
                        <input type="date" value={filters.to} min={filters.from || undefined} onChange={event => updateFilter('to', event.target.value)} />
                    </label>
                </div>

                <div className="os-filter-footer">
                    <div className="os-periods" role="group" aria-label="Períodos rápidos">
                        <span>Período:</span>
                        {[{ days: 0, name: 'Todos' }, { days: 7, name: '7 días' }, { days: 30, name: '30 días' }, { days: 90, name: '90 días' }].map(item => (
                            <button key={item.days} type="button" onClick={() => setPeriod(item.days)} className={!filters.from && !filters.to && !item.days ? 'is-active' : ''}>{item.name}</button>
                        ))}
                    </div>
                    <label className="os-order"><ArrowDownUp size={15} /><span>Orden</span>
                        <select value={filters.sort} onChange={event => updateFilter('sort', event.target.value)}>
                            <option value="newest">Más recientes</option>
                            <option value="oldest">Más antiguos</option>
                        </select>
                    </label>
                </div>

                {activeCount > 0 && (
                    <div className="os-active-filters" aria-label="Filtros activos">
                        <span>Filtros activos</span>
                        {query && <button type="button" onClick={() => { setSearchInput(''); setQuery(''); setPage(1); }}>“{query}” <X size={13} /></button>}
                        {filters.status && <button type="button" onClick={() => updateFilter('status', '')}>{statusLabel(filters.status)} <X size={13} /></button>}
                        {filters.priority && <button type="button" onClick={() => updateFilter('priority', '')}>{PRIORITY_OPTIONS.find(item => item.value === filters.priority)?.label} <X size={13} /></button>}
                        {filters.from && <button type="button" onClick={() => updateFilter('from', '')}>Desde {filters.from} <X size={13} /></button>}
                        {filters.to && <button type="button" onClick={() => updateFilter('to', '')}>Hasta {filters.to} <X size={13} /></button>}
                    </div>
                )}
            </section>

            <section className="os-results" aria-label="Resultados de búsqueda">
                <div className="os-results__heading">
                    <div>
                        <span className="os-results__eyebrow">EXPLORADOR</span>
                        <h2>Resultados <span>{!loading && !results.isError ? total.toLocaleString('es-AR') : '—'}</span></h2>
                        <p>{loading ? 'Aplicando filtros a todos los registros…' : results.isError ? 'No pudimos obtener resultados válidos' : `${visibleFrom}–${visibleTo} de ${total} ${title}`}</p>
                    </div>
                    <div className="os-results__actions">
                        <button type="button" className="os-refresh" onClick={() => results.refetch()} disabled={loading} title="Actualizar resultados"><RefreshCw size={17} /> Actualizar</button>
                        <Link to={kind === 'orders' ? '/orders' : '/deliveries'} className="os-manage">Ir a {kind === 'orders' ? 'Pedidos' : 'Entregas'} <ArrowRight size={16} /></Link>
                    </div>
                </div>

                {loading ? (
                    <div className="os-feedback os-feedback--loading" role="status">
                        <span className="os-spinner" />
                        <h3>Buscando operaciones…</h3>
                        <p>Consultando todos los registros, no solamente esta página.</p>
                    </div>
                ) : results.isError ? (
                    <div className="os-feedback os-feedback--error" role="alert">
                        <span className="os-feedback__icon"><CircleAlert size={24} /></span>
                        <h3>La búsqueda no se pudo completar</h3>
                        <p>{getApiErrorMessage(results.error)}</p>
                        <button type="button" className="os-feedback__action" onClick={() => results.refetch()}>Reintentar <ChevronRight size={16} /></button>
                    </div>
                ) : items.length === 0 ? (
                    <div className="os-feedback">
                        <span className="os-feedback__icon"><Search size={25} /></span>
                        <h3>No encontramos {title}</h3>
                        <p>Probá con otro código, cambiá el período o quitá algún filtro.</p>
                        <button type="button" className="os-feedback__action" onClick={clearAll}>Restablecer filtros <ChevronRight size={16} /></button>
                    </div>
                ) : (
                    <>
                        <div className="os-results__table-heading" aria-hidden="true">
                            <span>OPERACIÓN</span><span>DESTINO / REFERENCIA</span><span>ESTADO</span><span>PRIORIDAD</span><span>CREADO</span><span>{kind === 'orders' ? 'IMPORTE' : 'REPARTIDOR'}</span><span />
                        </div>
                        <div className="os-result-list">
                            {items.map(item => (
                                <ResultRow key={getEntityId(item)} item={item} kind={kind} onCopy={copyCode} copied={copied} />
                            ))}
                        </div>
                        {copied && <div className={`os-copy-feedback ${copied === 'error' ? 'is-error' : ''}`} role="status">{copied === 'error' ? 'No se pudo copiar. Seleccioná el código manualmente.' : `Código copiado: ${copied}`}</div>}
                        <div className="os-pagination"><Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} /></div>
                    </>
                )}
            </section>
        </div>
    );
}
