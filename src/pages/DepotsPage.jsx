
import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Building2, MapPin, Pencil, Plus, RefreshCw,
    Search, Trash2, Warehouse, Power
} from 'lucide-react';

import { depotService } from '../api/depots.service.js';
import { getApiErrorMessage } from '../api/normalizers.js';
import { useAuth } from '../auth/useAuth.js';
import { useToast } from '../components/useToast.js';

import {
    Button, Card, EmptyState, LoadingState,
    Modal, PageHeader, Pagination
} from '../components/ui.jsx';

import { getEntityId } from '../utils/formatters.js';
import './depots.css';

const EMPTY_FORM = {
    name: '',
    code: '',
    active: true,
    address: {
        street: '',
        number: '',
        neighborhood: '',
        city: 'Rosario',
        province: 'Santa Fe',
        postalCode: ''
    },
    contact: {
        name: '',
        email: '',
        phone: ''
    }
};

function buildForm(depot) {
    if (!depot) {
        return structuredClone(EMPTY_FORM);
    }

    return {
        name: depot.name || '',
        code: depot.code || '',
        active: depot.active !== false,
        address: {
            ...EMPTY_FORM.address,
            ...depot.address
        },
        contact: {
            ...EMPTY_FORM.contact,
            ...depot.contact
        }
    };
}

function cleanObject(object) {
    return Object.fromEntries(
        Object.entries(object).filter(([, value]) =>
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ''
        )
    );
}

function toPayload(form) {
    return {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        active: form.active,
        address: cleanObject({
            ...form.address,
            street: form.address.street.trim(),
            number: form.address.number.trim(),
            city: form.address.city.trim(),
            province: form.address.province.trim()
        }),
        contact: cleanObject(form.contact)
    };
}

function addressLabel(address = {}) {
    return [
        [address.street, address.number].filter(Boolean).join(' '),
        address.city,
        address.province
    ].filter(Boolean).join(', ') || 'Sin dirección';
}

function Field({ label, required, children }) {
    return (
        <label className="depot-field">
            <span>
                {label}
                {required && <b> *</b>}
            </span>
            {children}
        </label>
    );
}

function DepotForm({ form, setForm, onSubmit, saving }) {
    function update(field, value, group = null) {
        setForm(current => group
            ? {
                ...current,
                [group]: {
                    ...current[group],
                    [field]: value
                }
            }
            : { ...current, [field]: value }
        );
    }

    return (
        <form id="depot-editor" onSubmit={onSubmit} className="depot-form">
            <div className="depot-form__section">
                <h3>Información general</h3>

                <div className="depot-form__grid">
                    <Field label="Nombre del depósito" required>
                        <input
                            required
                            maxLength={120}
                            value={form.name}
                            onChange={event => update('name', event.target.value)}
                            placeholder="Centro de distribución Rosario"
                            disabled={saving}
                        />
                    </Field>

                    <Field label="Código" required>
                        <input
                            required
                            maxLength={40}
                            pattern="[A-Za-z0-9_-]+"
                            value={form.code}
                            onChange={event => update('code', event.target.value)}
                            placeholder="ROS-CENTRO"
                            disabled={saving}
                        />
                    </Field>
                </div>

                <label className="depot-form__switch">
                    <input
                        type="checkbox"
                        checked={form.active}
                        onChange={event => update('active', event.target.checked)}
                        disabled={saving}
                    />
                    Depósito activo
                </label>
            </div>

            <div className="depot-form__section">
                <h3>Dirección</h3>

                <div className="depot-form__grid">
                    <Field label="Calle" required>
                        <input
                            required
                            value={form.address.street}
                            onChange={event =>
                                update('street', event.target.value, 'address')
                            }
                            disabled={saving}
                        />
                    </Field>

                    <Field label="Número" required>
                        <input
                            required
                            value={form.address.number}
                            onChange={event =>
                                update('number', event.target.value, 'address')
                            }
                            disabled={saving}
                        />
                    </Field>

                    <Field label="Ciudad" required>
                        <input
                            required
                            value={form.address.city}
                            onChange={event =>
                                update('city', event.target.value, 'address')
                            }
                            disabled={saving}
                        />
                    </Field>

                    <Field label="Provincia" required>
                        <input
                            required
                            value={form.address.province}
                            onChange={event =>
                                update('province', event.target.value, 'address')
                            }
                            disabled={saving}
                        />
                    </Field>

                    <Field label="Barrio">
                        <input
                            value={form.address.neighborhood || ''}
                            onChange={event =>
                                update('neighborhood', event.target.value, 'address')
                            }
                            disabled={saving}
                        />
                    </Field>

                    <Field label="Código postal">
                        <input
                            value={form.address.postalCode || ''}
                            onChange={event =>
                                update('postalCode', event.target.value, 'address')
                            }
                            disabled={saving}
                        />
                    </Field>
                </div>
            </div>

            <div className="depot-form__section">
                <h3>Contacto</h3>

                <div className="depot-form__grid">
                    <Field label="Responsable">
                        <input
                            value={form.contact.name || ''}
                            onChange={event =>
                                update('name', event.target.value, 'contact')
                            }
                            disabled={saving}
                        />
                    </Field>

                    <Field label="Teléfono">
                        <input
                            type="tel"
                            value={form.contact.phone || ''}
                            onChange={event =>
                                update('phone', event.target.value, 'contact')
                            }
                            disabled={saving}
                        />
                    </Field>

                    <Field label="Email">
                        <input
                            type="email"
                            value={form.contact.email || ''}
                            onChange={event =>
                                update('email', event.target.value, 'contact')
                            }
                            disabled={saving}
                        />
                    </Field>
                </div>
            </div>
        </form>
    );
}

export default function DepotsPage() {
    const { role } = useAuth();
    const { pushToast } = useToast();
    const queryClient = useQueryClient();

    const isAdmin = role === 'admin';

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [editor, setEditor] = useState(null);
    const [form, setForm] = useState(buildForm(null));
    const [removeTarget, setRemoveTarget] = useState(null);

    const deferredSearch = useDeferredValue(search);

    const depotsQuery = useQuery({
        queryKey: ['depots', page, deferredSearch, statusFilter],
        queryFn: () => depotService.list({
            page,
            limit: 10,
            ...(deferredSearch.trim()
                ? { search: deferredSearch.trim() }
                : {}),
            ...(statusFilter ? { active: statusFilter } : {})
        })
    });

    function refresh() {
        queryClient.invalidateQueries({ queryKey: ['depots'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }

    function showError(error) {
        pushToast({
            type: 'error',
            title: 'No se pudo completar la operación',
            message: getApiErrorMessage(error)
        });
    }

    const saveMutation = useMutation({
        mutationFn: ({ id, payload }) => id
            ? depotService.update(id, payload)
            : depotService.create(payload),
        onSuccess: () => {
            pushToast({
                title: editor?.id ? 'Depósito actualizado' : 'Depósito creado'
            });
            setEditor(null);
            refresh();
        },
        onError: showError
    });

    const removeMutation = useMutation({
        mutationFn: id => depotService.remove(id),
        onSuccess: () => {
            pushToast({
                title: 'Operación completada',
                message: 'El depósito fue eliminado o desactivado, según sus relaciones.'
            });
            setRemoveTarget(null);
            refresh();
        },
        onError: showError
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, active }) =>
            depotService.update(id, { active }),
        onSuccess: () => {
            pushToast({ title: 'Estado del depósito actualizado' });
            refresh();
        },
        onError: showError
    });

    function openEditor(depot = null) {
        setForm(buildForm(depot));
        setEditor({
            id: depot ? getEntityId(depot) : null
        });
    }

    function handleSubmit(event) {
        event.preventDefault();

        saveMutation.mutate({
            id: editor?.id,
            payload: toPayload(form)
        });
    }

    const items = depotsQuery.data?.items ?? [];
    const total = depotsQuery.data?.total ?? 0;
    const totalPages = Math.max(1, depotsQuery.data?.totalPages ?? 1);
    const activeOnPage = items.filter(depot => depot.active !== false).length;

    return (
        <div className="depots-page">
            <PageHeader
                eyebrow="Infraestructura logística"
                title="Depósitos y sucursales"
                description="Administrá los centros de distribución y sus datos operativos."
            >
                {isAdmin && (
                    <Button icon={Plus} onClick={() => openEditor()}>
                        Nuevo depósito
                    </Button>
                )}
            </PageHeader>

            <div className="depots-overview">
                <Card className="depot-summary">
                    <Warehouse size={21} />
                    <div>
                        <span>Depósitos encontrados</span>
                        <strong>{total}</strong>
                    </div>
                </Card>

                <Card className="depot-summary">
                    <Building2 size={21} />
                    <div>
                        <span>Activos en esta página</span>
                        <strong>{activeOnPage}</strong>
                    </div>
                </Card>
            </div>

            <Card className="depot-list-card">
                <div className="depots-toolbar">
                    <label className="depots-search">
                        <Search size={17} />
                        <input
                            type="search"
                            placeholder="Buscar depósito o código..."
                            value={search}
                            onChange={event => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                        />
                    </label>

                    <select
                        aria-label="Filtrar por estado"
                        value={statusFilter}
                        onChange={event => {
                            setStatusFilter(event.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">Todos los estados</option>
                        <option value="true">Activos</option>
                        <option value="false">Inactivos</option>
                    </select>

                    <button
                        type="button"
                        className="depots-refresh"
                        onClick={() => depotsQuery.refetch()}
                        title="Actualizar listado"
                        aria-label="Actualizar listado"
                    >
                        <RefreshCw size={17} />
                    </button>
                </div>

                {depotsQuery.isPending ? (
                    <LoadingState
                        title="Cargando depósitos"
                        description="Consultando la base de datos."
                    />
                ) : depotsQuery.isError ? (
                    <EmptyState
                        icon={Warehouse}
                        title="No se pudieron cargar los depósitos"
                        description={getApiErrorMessage(depotsQuery.error)}
                    >
                        <Button
                            variant="secondary"
                            onClick={() => depotsQuery.refetch()}
                        >
                            Reintentar
                        </Button>
                    </EmptyState>
                ) : items.length === 0 ? (
                    <EmptyState
                        icon={Warehouse}
                        title="No hay depósitos para mostrar"
                        description="Probá otra búsqueda o registrá un depósito nuevo."
                    />
                ) : (
                    <>
                        <div className="depots-table-wrap">
                            <table className="depots-table">
                                <thead>
                                    <tr>
                                        <th>Depósito</th>
                                        <th>Ubicación</th>
                                        <th>Contacto</th>
                                        <th>Estado</th>
                                        {isAdmin && <th>Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(depot => {
                                        const id = getEntityId(depot);
                                        const active = depot.active !== false;

                                        return (
                                            <tr key={id}>
                                                <td>
                                                    <div className="depot-name">
                                                        <span className="depot-name__icon">
                                                            <Warehouse size={18} />
                                                        </span>
                                                        <div>
                                                            <strong>{depot.name}</strong>
                                                            <small>{depot.code}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="depot-address">
                                                        <MapPin size={15} />
                                                        {addressLabel(depot.address)}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="depot-contact">
                                                        <strong>
                                                            {depot.contact?.name || 'Sin responsable'}
                                                        </strong>
                                                        <small>
                                                            {depot.contact?.phone ||
                                                                depot.contact?.email ||
                                                                'Sin contacto'}
                                                        </small>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span
                                                        className={`depot-state ${
                                                            active
                                                                ? 'depot-state--active'
                                                                : 'depot-state--inactive'
                                                        }`}
                                                    >
                                                        <i />
                                                        {active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                {isAdmin && (
                                                    <td>
                                                        <div className="depot-actions">
                                                            <button
                                                                type="button"
                                                                title="Editar"
                                                                aria-label={`Editar ${depot.name}`}
                                                                onClick={() => openEditor(depot)}
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                title={active ? 'Desactivar' : 'Activar'}
                                                                aria-label={
                                                                    `${active ? 'Desactivar' : 'Activar'} ${depot.name}`
                                                                }
                                                                disabled={toggleMutation.isPending}
                                                                onClick={() =>
                                                                    toggleMutation.mutate({
                                                                        id,
                                                                        active: !active
                                                                    })
                                                                }
                                                            >
                                                                <Power size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="depot-actions__danger"
                                                                title="Eliminar"
                                                                aria-label={`Eliminar ${depot.name}`}
                                                                onClick={() => setRemoveTarget(depot)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            total={total}
                            onPageChange={setPage}
                        />
                    </>
                )}
            </Card>

            <Modal
                open={Boolean(editor)}
                onClose={() => {
                    if (!saveMutation.isPending) setEditor(null);
                }}
                title={editor?.id ? 'Editar depósito' : 'Nuevo depósito'}
                description="Los campos con * son obligatorios."
                size="lg"
                footer={
                    <>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={saveMutation.isPending}
                            onClick={() => setEditor(null)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            form="depot-editor"
                            loading={saveMutation.isPending}
                        >
                            Guardar depósito
                        </Button>
                    </>
                }
            >
                <DepotForm
                    form={form}
                    setForm={setForm}
                    onSubmit={handleSubmit}
                    saving={saveMutation.isPending}
                />
            </Modal>

            <Modal
                open={Boolean(removeTarget)}
                onClose={() => {
                    if (!removeMutation.isPending) setRemoveTarget(null);
                }}
                title="Eliminar depósito"
                description="Confirmá esta operación."
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setRemoveTarget(null)}
                            disabled={removeMutation.isPending}
                        >
                            Cancelar
                        </Button>

                        <Button
                            variant="danger"
                            loading={removeMutation.isPending}
                            onClick={() =>
                                removeMutation.mutate(getEntityId(removeTarget))
                            }
                        >
                            Confirmar
                        </Button>
                    </>
                }
            >
                <p className="depot-delete-note">
                    ¿Querés eliminar <strong>{removeTarget?.name}</strong>?
                    Si está asociado a pedidos o entregas, el backend lo
                    desactivará para preservar el historial.
                </p>
            </Modal>
        </div>
    );
}
