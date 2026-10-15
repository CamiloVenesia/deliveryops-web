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
    UsersRound
} from 'lucide-react';

import {
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
    getInitials,
    getPersonName,
    roleLabel,
    shortId
} from '../utils/formatters.js';

const EMPTY_ARRAY = [];

export default function UsersPage() {
    const {
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
        roleFilter,
        setRoleFilter
    ] =
        useState('');

    const [
        createOpen,
        setCreateOpen
    ] =
        useState(false);

    const [
        detailUser,
        setDetailUser
    ] =
        useState(null);

    const [
        documentUser,
        setDocumentUser
    ] =
        useState(null);

    const [
        deleteUser,
        setDeleteUser
    ] =
        useState(null);

    const usersQuery =
        useQuery({
            queryKey: [
                'users',
                page
            ],

            queryFn: () =>
                userService.list({
                    page,
                    limit:
                        10
                })
        });

    const users =
        usersQuery.data
            ?.items ??
        EMPTY_ARRAY;

    const visibleUsers =
        useMemo(
            () => {
                const term =
                    search
                        .trim()
                        .toLowerCase();

                return users.filter(
                    (
                        item
                    ) => {
                        const matchesRole =
                            !roleFilter ||
                            item.role ===
                                roleFilter;

                        const searchable =
                            [
                                item.firstName,
                                item.lastName,
                                item.email,
                                item.role,
                                roleLabel(
                                    item.role
                                ),
                                item._id
                            ]
                                .filter(
                                    Boolean
                                )
                                .join(
                                    ' '
                                )
                                .toLowerCase();

                        return (
                            matchesRole &&
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
                users,
                search,
                roleFilter
            ]
        );

    const deleteMutation =
        useMutation({
            mutationFn: (
                id
            ) =>
                userService.remove(
                    id
                ),

            onSuccess: () => {
                setDeleteUser(
                    null
                );

                queryClient.invalidateQueries({
                    queryKey: [
                        'users'
                    ]
                });

                queryClient.invalidateQueries({
                    queryKey: [
                        'dashboard'
                    ]
                });

                pushToast({
                    title:
                        'Usuario eliminado'
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

    const currentUserId =
        getEntityId(
            currentUser
        );

    return (
        <>
            <PageHeader
                eyebrow="Administración"
                title="Usuarios"
                description="Gestioná clientes, repartidores y cuentas operativas."
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
                    Nuevo usuario
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
                                    event.target
                                        .value
                                )
                        }
                        placeholder="Buscar usuario..."
                    />

                    <select
                        className="filter-select"
                        value={
                            roleFilter
                        }
                        onChange={
                            (
                                event
                            ) =>
                                setRoleFilter(
                                    event.target
                                        .value
                                )
                        }
                    >
                        <option value="">
                            Todos los roles
                        </option>

                        <option value="admin">
                            Administrador
                        </option>

                        <option value="customer">
                            Cliente
                        </option>

                        <option value="driver">
                            Repartidor
                        </option>

                        <option value="store">
                            Comercio
                        </option>
                    </select>
                </div>

                {usersQuery.isLoading ? (
                    <LoadingState />
                ) : visibleUsers.length ===
                  0 ? (
                    <EmptyState
                        icon={
                            UsersRound
                        }
                        title="No encontramos usuarios"
                        description="Modificá los filtros o registrá una nueva cuenta."
                    />
                ) : (
                    <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>
                                        Usuario
                                    </th>

                                    <th>
                                        Rol
                                    </th>

                                    <th>
                                        ID
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
                                {visibleUsers.map(
                                    (
                                        item
                                    ) => {
                                        const id =
                                            getEntityId(
                                                item
                                            );

                                        const isSelf =
                                            id ===
                                            currentUserId;

                                        return (
                                            <tr
                                                key={
                                                    id
                                                }
                                            >
                                                <td>
                                                    <div className="entity-cell">
                                                        <span className="avatar avatar--table">
                                                            {getInitials(
                                                                item
                                                            )}
                                                        </span>

                                                        <div>
                                                            <strong>
                                                                {getPersonName(
                                                                    item
                                                                )}
                                                            </strong>

                                                            <span>
                                                                {
                                                                    item.email
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td>
                                                    <StatusBadge
                                                        status={
                                                            item.role
                                                        }
                                                    />
                                                </td>

                                                <td>
                                                    <code className="id-code">
                                                        {shortId(
                                                            id
                                                        )}
                                                    </code>
                                                </td>

                                                <td>
                                                    <span className="muted-text">
                                                        {formatDateTime(
                                                            item.createdAt
                                                        )}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="row-actions">
                                                        <button
                                                            type="button"
                                                            className="icon-button"
                                                            title="Ver usuario"
                                                            onClick={() =>
                                                                setDetailUser(
                                                                    item
                                                                )
                                                            }
                                                        >
                                                            <Eye
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="icon-button"
                                                            title="Cargar documento"
                                                            onClick={() =>
                                                                setDocumentUser(
                                                                    item
                                                                )
                                                            }
                                                        >
                                                            <FileUp
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="icon-button icon-button--danger"
                                                            title={
                                                                isSelf
                                                                    ? 'No podés eliminar tu propia cuenta desde esta vista'
                                                                    : 'Eliminar usuario'
                                                            }
                                                            disabled={
                                                                isSelf
                                                            }
                                                            onClick={() =>
                                                                setDeleteUser(
                                                                    item
                                                                )
                                                            }
                                                        >
                                                            <Trash2
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </button>
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
                        usersQuery.data
                            ?.page ??
                        page
                    }
                    totalPages={
                        usersQuery.data
                            ?.totalPages ??
                        1
                    }
                    total={
                        usersQuery.data
                            ?.total ??
                        users.length
                    }
                    onPageChange={
                        setPage
                    }
                />
            </Card>

            <CreateUserModal
                open={
                    createOpen
                }
                onClose={() =>
                    setCreateOpen(
                        false
                    )
                }
            />

            <UserDetailsModal
                user={
                    detailUser
                }
                onClose={() =>
                    setDetailUser(
                        null
                    )
                }
            />

            <DocumentModal
                user={
                    documentUser
                }
                onClose={() =>
                    setDocumentUser(
                        null
                    )
                }
            />

            <Modal
                open={
                    Boolean(
                        deleteUser
                    )
                }
                onClose={() =>
                    setDeleteUser(
                        null
                    )
                }
                title="Eliminar usuario"
                description="Esta acción no se puede deshacer."
                size="sm"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() =>
                                setDeleteUser(
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
                                        deleteUser
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
                    Vas a eliminar la cuenta de{' '}
                    <strong>
                        {getPersonName(
                            deleteUser
                        )}
                    </strong>
                    .
                </p>
            </Modal>
        </>
    );
}

function CreateUserModal({
    open,
    onClose
}) {
    const {
        pushToast
    } =
        useToast();

    const queryClient =
        useQueryClient();

    const [
        form,
        setForm
    ] =
        useState({
            firstName:
                '',

            lastName:
                '',

            email:
                '',

            password:
                '',

            role:
                'customer'
        });

    const mutation =
        useMutation({
            mutationFn: () =>
                userService.create(
                    form
                ),

            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey: [
                        'users'
                    ]
                });

                queryClient.invalidateQueries({
                    queryKey: [
                        'dashboard'
                    ]
                });

                pushToast({
                    title:
                        'Usuario creado'
                });

                setForm({
                    firstName:
                        '',

                    lastName:
                        '',

                    email:
                        '',

                    password:
                        '',

                    role:
                        'customer'
                });

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

    function update(
        field,
        value
    ) {
        setForm(
            (
                current
            ) => ({
                ...current,

                [field]:
                    value
            })
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
            title="Nuevo usuario"
            description="Creá una cuenta operativa de DeliveryOps."
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
                        form="create-user-form"
                        loading={
                            mutation.isPending
                        }
                    >
                        Crear usuario
                    </Button>
                </>
            }
        >
            <form
                id="create-user-form"
                className="form-stack"
                onSubmit={
                    (
                        event
                    ) => {
                        event.preventDefault();

                        mutation.mutate();
                    }
                }
            >
                <div className="form-grid form-grid--2">
                    <label className="form-field">
                        <span className="form-label">
                            Nombre
                        </span>

                        <input
                            className="form-input form-input--plain"
                            required
                            value={
                                form.firstName
                            }
                            onChange={
                                (
                                    event
                                ) =>
                                    update(
                                        'firstName',
                                        event.target
                                            .value
                                    )
                            }
                        />
                    </label>

                    <label className="form-field">
                        <span className="form-label">
                            Apellido
                        </span>

                        <input
                            className="form-input form-input--plain"
                            required
                            value={
                                form.lastName
                            }
                            onChange={
                                (
                                    event
                                ) =>
                                    update(
                                        'lastName',
                                        event.target
                                            .value
                                    )
                            }
                        />
                    </label>
                </div>

                <label className="form-field">
                    <span className="form-label">
                        Email
                    </span>

                    <input
                        className="form-input form-input--plain"
                        type="email"
                        required
                        value={
                            form.email
                        }
                        onChange={
                            (
                                event
                            ) =>
                                update(
                                    'email',
                                    event.target
                                        .value
                                )
                        }
                    />
                </label>

                <label className="form-field">
                    <span className="form-label">
                        Contraseña
                    </span>

                    <input
                        className="form-input form-input--plain"
                        type="password"
                        minLength={
                            8
                        }
                        required
                        value={
                            form.password
                        }
                        onChange={
                            (
                                event
                            ) =>
                                update(
                                    'password',
                                    event.target
                                        .value
                                )
                        }
                    />

                    <span className="form-hint">
                        Mínimo 8 caracteres.
                    </span>
                </label>

                <label className="form-field">
                    <span className="form-label">
                        Rol
                    </span>

                    <select
                        className="form-select"
                        value={
                            form.role
                        }
                        onChange={
                            (
                                event
                            ) =>
                                update(
                                    'role',
                                    event.target
                                        .value
                                )
                        }
                    >
                        <option value="customer">
                            Cliente
                        </option>

                        <option value="driver">
                            Repartidor
                        </option>

                        <option value="store">
                            Comercio
                        </option>
                    </select>
                </label>
            </form>
        </Modal>
    );
}

function UserDetailsModal({
    user,
    onClose
}) {
    return (
        <Modal
            open={
                Boolean(
                    user
                )
            }
            onClose={
                onClose
            }
            title={
                getPersonName(
                    user
                )
            }
            description="Información de la cuenta."
        >
            {user && (
                <>
                    <div className="profile-identity profile-identity--modal">
                        <span className="avatar avatar--xl">
                            {getInitials(
                                user
                            )}
                        </span>

                        <div>
                            <strong>
                                {getPersonName(
                                    user
                                )}
                            </strong>

                            <span>
                                {
                                    user.email
                                }
                            </span>
                        </div>
                    </div>

                    <div className="detail-grid">
                        <Detail
                            label="Rol"
                            value={
                                roleLabel(
                                    user.role
                                )
                            }
                        />

                        <Detail
                            label="ID"
                            value={
                                shortId(
                                    user
                                )
                            }
                        />

                        <Detail
                            label="Alta"
                            value={
                                formatDateTime(
                                    user.createdAt
                                )
                            }
                        />

                        <Detail
                            label="Documentos"
                            value={
                                user.documents
                                    ?.length ??
                                0
                            }
                        />
                    </div>
                </>
            )}
        </Modal>
    );
}

function DocumentModal({
    user,
    onClose
}) {
    const {
        pushToast
    } =
        useToast();

    const queryClient =
        useQueryClient();

    const [
        documentType,
        setDocumentType
    ] =
        useState(
            'dni'
        );

    const [
        file,
        setFile
    ] =
        useState(null);

    const mutation =
        useMutation({
            mutationFn: () =>
                userService.uploadDocument({
                    userId:
                        getEntityId(
                            user
                        ),

                    documentType,

                    file
                }),

            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey: [
                        'users'
                    ]
                });

                pushToast({
                    title:
                        'Documento cargado'
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
                    user
                )
            }
            onClose={
                onClose
            }
            title="Cargar documento"
            description={
                user
                    ? getPersonName(
                          user
                      )
                    : ''
            }
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
                        Cargar
                    </Button>
                </>
            }
        >
            <div className="form-stack">
                <label className="form-field">
                    <span className="form-label">
                        Tipo de documento
                    </span>

                    <select
                        className="form-select"
                        value={
                            documentType
                        }
                        onChange={
                            (
                                event
                            ) =>
                                setDocumentType(
                                    event.target
                                        .value
                                )
                        }
                    >
                        <option value="dni">
                            DNI
                        </option>

                        <option value="licencia_conducir">
                            Licencia de conducir
                        </option>

                        <option value="comprobante_domicilio">
                            Comprobante de domicilio
                        </option>

                        <option value="otro">
                            Otro
                        </option>
                    </select>
                </label>

                <label className="upload-box">
                    <FileUp
                        size={
                            24
                        }
                    />

                    <strong>
                        {file
                            ? file.name
                            : 'Seleccionar archivo'}
                    </strong>

                    <span>
                        JPG, PNG o PDF
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
            </div>
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