import {
    useState
} from 'react';

import {
    useMutation,
    useQueryClient
} from '@tanstack/react-query';

import {
    FileText,
    FileUp,
    KeyRound,
    Mail,
    ShieldCheck,
    UserRound
} from 'lucide-react';

import {
    useAuth
} from '../auth/useAuth.js';

import {
    userService
} from '../api/services.js';

import {
    getApiErrorMessage
} from '../api/normalizers.js';

import {
    useToast
} from '../components/useToast.js';

import {
    Button,
    Card,
    PageHeader,
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

export default function ProfilePage() {
    const {
        user,
        role
    } =
        useAuth();

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
                userService
                    .uploadDocument({
                        userId:
                            getEntityId(
                                user
                            ),
                        documentType,
                        file
                    }),

            onSuccess: () => {
                queryClient
                    .invalidateQueries({
                        queryKey: [
                            'users'
                        ]
                    });

                setFile(
                    null
                );

                pushToast({
                    title:
                        'Documento cargado',
                    message:
                        'El archivo fue asociado a tu cuenta.'
                });
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

    const documents =
        user?.documents ??
        [];

    return (
        <>
            <PageHeader
                eyebrow="Cuenta"
                title="Mi perfil"
                description="Información personal y seguridad de tu cuenta."
            />

            <div className="profile-grid">
                <Card className="profile-card">
                    <div className="profile-hero">
                        <span className="avatar avatar--xxl">
                            {getInitials(
                                user
                            )}
                        </span>

                        <div>
                            <h2>
                                {getPersonName(
                                    user
                                )}
                            </h2>

                            <span>
                                {
                                    user?.email
                                }
                            </span>

                            <StatusBadge
                                status={
                                    role
                                }
                            />
                        </div>
                    </div>

                    <div className="profile-details">
                        <ProfileField
                            icon={
                                UserRound
                            }
                            label="Nombre"
                            value={
                                getPersonName(
                                    user
                                )
                            }
                        />

                        <ProfileField
                            icon={
                                Mail
                            }
                            label="Email"
                            value={
                                user?.email ??
                                '—'
                            }
                        />

                        <ProfileField
                            icon={
                                ShieldCheck
                            }
                            label="Rol"
                            value={
                                roleLabel(
                                    role
                                )
                            }
                        />

                        <ProfileField
                            icon={
                                KeyRound
                            }
                            label="ID de cuenta"
                            value={
                                shortId(
                                    user
                                )
                            }
                        />
                    </div>
                </Card>

                <Card className="profile-card">
                    <div className="panel-header">
                        <div>
                            <h2>
                                Seguridad
                            </h2>

                            <p>
                                Protección de la sesión.
                            </p>
                        </div>
                    </div>

                    <div className="security-list">
                        <div>
                            <span className="security-check">
                                <ShieldCheck
                                    size={
                                        18
                                    }
                                />
                            </span>

                            <div>
                                <strong>
                                    Access Token
                                </strong>

                                <span>
                                    Sesiones protegidas mediante JWT de corta duración.
                                </span>
                            </div>
                        </div>

                        <div>
                            <span className="security-check">
                                <ShieldCheck
                                    size={
                                        18
                                    }
                                />
                            </span>

                            <div>
                                <strong>
                                    Refresh Token seguro
                                </strong>

                                <span>
                                    Almacenado en cookie HttpOnly con rotación automática.
                                </span>
                            </div>
                        </div>

                        <div>
                            <span className="security-check">
                                <ShieldCheck
                                    size={
                                        18
                                    }
                                />
                            </span>

                            <div>
                                <strong>
                                    Control por rol
                                </strong>

                                <span>
                                    Tus permisos se aplican en cada operación de la API.
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="profile-card profile-card--wide">
                    <div className="panel-header">
                        <div>
                            <h2>
                                Documentación
                            </h2>

                            <p>
                                Adjuntá documentación relacionada con tu cuenta.
                            </p>
                        </div>
                    </div>

                    <div className="profile-documents-layout">
                        <div className="form-stack">
                            <label className="form-field">
                                <span className="form-label">
                                    Tipo
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
                                                event
                                                    .target
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
                                                event
                                                    .target
                                                    .files?.[0] ??
                                                    null
                                            )
                                    }
                                />
                            </label>

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
                                Cargar documento
                            </Button>
                        </div>

                        <div className="documents-list">
                            {documents.length >
                            0 ? (
                                documents.map(
                                    (
                                        document,
                                        index
                                    ) => (
                                        <div
                                            className="document-item"
                                            key={
                                                document._id ??
                                                index
                                            }
                                        >
                                            <span>
                                                <FileText
                                                    size={
                                                        18
                                                    }
                                                />
                                            </span>

                                            <div>
                                                <strong>
                                                    {document.originalName ??
                                                        document.filename ??
                                                        document.name ??
                                                        `Documento ${
                                                            index +
                                                            1
                                                        }`}
                                                </strong>

                                                <small>
                                                    {document.type ??
                                                        document.documentType ??
                                                        'Documento'}{' '}
                                                    ·{' '}
                                                    {formatDateTime(
                                                        document.createdAt ??
                                                            document.uploadedAt
                                                    )}
                                                </small>
                                            </div>
                                        </div>
                                    )
                                )
                            ) : (
                                <div className="documents-empty">
                                    <FileText
                                        size={
                                            24
                                        }
                                    />

                                    <strong>
                                        Sin documentos
                                    </strong>

                                    <span>
                                        Los archivos que cargues aparecerán acá.
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
}

function ProfileField({
    icon:
        Icon,
    label,
    value
}) {
    return (
        <div className="profile-field">
            <span>
                <Icon
                    size={
                        17
                    }
                />
            </span>

            <div>
                <small>
                    {label}
                </small>

                <strong>
                    {value}
                </strong>
            </div>
        </div>
    );
}