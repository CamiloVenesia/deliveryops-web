
import { useState } from 'react';

import {
    useMutation,
    useQuery,
    useQueryClient
} from '@tanstack/react-query';

import {
    AlertCircle,
    Bell,
    CheckCircle2,
    Clock3,
    Mail,
    MessageCircle,
    RefreshCw,
    ShieldCheck,
    UsersRound
} from 'lucide-react';

import {
    notificationsService
} from '../api/notifications.service.js';

import {
    getApiErrorMessage
} from '../api/normalizers.js';

import { useAuth } from '../auth/useAuth.js';
import { PageHeader } from '../components/ui.jsx';
import { formatDateTime } from '../utils/formatters.js';

import './notifications.css';

const STATUS_LABELS = {
    queued: 'Pendiente',
    processing: 'Procesando',
    sent: 'Aceptado por proveedor',
    failed: 'Fallido',
    skipped: 'Omitido'
};

function StatusPill({ status }) {
    const label = STATUS_LABELS[status] ?? 'Desconocido';

    return (
        <span
            className={`notifications-status notifications-status--${status || 'unknown'}`}
        >
            {label}
        </span>
    );
}

function EmptyList({ text }) {
    return (
        <div className="notifications-empty">
            <Bell size={24} aria-hidden="true" />
            <p>{text}</p>
        </div>
    );
}

function PreferencesForm({ initial, pending, onSave }) {
    const [email, setEmail] = useState(initial.email);
    const [whatsapp, setWhatsapp] = useState(
        initial.whatsapp
    );
    const [phone, setPhone] = useState(
        initial.phone || ''
    );
    const [consent, setConsent] = useState(false);

    const turningOnWhatsapp =
        whatsapp && !initial.whatsapp;

    const phoneValid = /^\+[1-9]\d{7,14}$/.test(
        phone.replace(/[\s().-]/g, '')
    );

    const changed =
        email !== initial.email ||
        whatsapp !== initial.whatsapp ||
        phone !== (initial.phone || '');

    const canSave =
        changed &&
        !pending &&
        (!whatsapp || phoneValid) &&
        (!turningOnWhatsapp || consent);

    function submit(event) {
        event.preventDefault();

        if (!canSave) return;

        onSave({
            email,
            whatsapp,
            phone: phone.trim(),
            ...(turningOnWhatsapp
                ? { whatsappConsent: true }
                : {})
        });
    }

    return (
        <form
            className="notifications-preferences"
            onSubmit={submit}
        >
            <label className="notifications-choice">
                <span className="notifications-choice__icon">
                    <Mail size={19} />
                </span>

                <span className="notifications-choice__body">
                    <strong>Notificaciones por email</strong>

                    <small>
                        Recibí avisos de tus pedidos y entregas
                        en tu correo registrado.
                    </small>
                </span>

                <input
                    type="checkbox"
                    checked={email}
                    disabled={pending}
                    onChange={event =>
                        setEmail(event.target.checked)
                    }
                />
            </label>

            <label className="notifications-choice">
                <span
                    className="notifications-choice__icon notifications-choice__icon--green"
                >
                    <MessageCircle size={19} />
                </span>

                <span className="notifications-choice__body">
                    <strong>Notificaciones por WhatsApp</strong>

                    <small>
                        Requiere tu autorización expresa y
                        una plantilla aprobada por Meta.
                    </small>
                </span>

                <input
                    type="checkbox"
                    checked={whatsapp}
                    disabled={pending}
                    onChange={event => {
                        setWhatsapp(event.target.checked);
                        setConsent(false);
                    }}
                />
            </label>

            <label
                className="notifications-phone"
                htmlFor="notification-phone"
            >
                <span>Teléfono para WhatsApp</span>

                <input
                    id="notification-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+5493411234567"
                    maxLength={25}
                    value={phone}
                    disabled={pending}
                    onChange={event =>
                        setPhone(event.target.value)
                    }
                    aria-describedby="notifications-phone-help"
                />

                <small id="notifications-phone-help">
                    Ingresá el número con + y código de país.
                    Sin prefijo internacional no se puede activar WhatsApp.
                </small>
            </label>

            {turningOnWhatsapp && (
                <label className="notifications-consent">
                    <input
                        type="checkbox"
                        checked={consent}
                        disabled={pending}
                        onChange={event =>
                            setConsent(event.target.checked)
                        }
                    />

                    <span>
                        Acepto recibir mensajes automatizados
                        de DeliveryOps por WhatsApp relacionados
                        con pedidos y entregas. Puedo
                        desactivarlos cuando quiera.
                    </span>
                </label>
            )}

            <div className="notifications-form-footer">
                <p>
                    <ShieldCheck size={15} />

                    Tu preferencia se guarda en tu cuenta.
                    Activar un canal no garantiza que el
                    proveedor ya esté configurado.
                </p>

                <button
                    type="submit"
                    disabled={!canSave}
                >
                    {pending
                        ? 'Guardando…'
                        : 'Guardar preferencias'}
                </button>
            </div>
        </form>
    );
}

function JobList({ items, admin = false }) {
    if (!items.length) {
        return (
            <EmptyList
                text={
                    admin
                        ? 'Todavía no hay intentos de envío registrados.'
                        : 'Aún no se registraron notificaciones para tu cuenta.'
                }
            />
        );
    }

    return (
        <div className="notifications-history">
            {items.map(item => (
                <article
                    className="notifications-job"
                    key={item._id}
                >
                    <span
                        className="notifications-job__icon"
                        aria-hidden="true"
                    >
                        {item.channel === 'whatsapp'
                            ? <MessageCircle size={18} />
                            : <Mail size={18} />}
                    </span>

                    <div className="notifications-job__body">
                        <div className="notifications-job__heading">
                            <strong>
                                {item.event?.replaceAll(
                                    '.',
                                    ' · '
                                ) || 'Notificación'}
                            </strong>

                            <StatusPill status={item.status} />
                        </div>

                        <div className="notifications-job__meta">
                            <span>
                                {item.channel === 'whatsapp'
                                    ? 'WhatsApp'
                                    : 'Email'}
                            </span>

                            <span>·</span>

                            <span>
                                {formatDateTime(item.createdAt)}
                            </span>

                            <span>·</span>

                            <span>
                                {item.attempts ?? 0} intento(s)
                            </span>
                        </div>

                        {item.error && (
                            <p className="notifications-job__error">
                                {item.error}
                            </p>
                        )}
                    </div>
                </article>
            ))}
        </div>
    );
}

export default function NotificationsPage() {
    const { role } = useAuth();
    const isAdmin = role === 'admin';

    const queryClient = useQueryClient();

    const [notice, setNotice] = useState(null);

    const preferencesQuery = useQuery({
        queryKey: ['notifications', 'preferences'],
        queryFn: notificationsService.preferences
    });

    const historyQuery = useQuery({
        queryKey: ['notifications', 'me'],
        queryFn: notificationsService.myHistory
    });

    const jobsQuery = useQuery({
        queryKey: ['notifications', 'jobs'],
        queryFn: notificationsService.recentJobs,
        enabled: isAdmin
    });

    const mutation = useMutation({
        mutationFn:
            notificationsService.updatePreferences,

        onSuccess: () => {
            setNotice({
                type: 'success',
                text: 'Preferencias guardadas correctamente.'
            });

            queryClient.invalidateQueries({
                queryKey: [
                    'notifications',
                    'preferences'
                ]
            });
        },

        onError: error => {
            setNotice({
                type: 'error',
                text: getApiErrorMessage(
                    error,
                    'No se pudieron guardar las preferencias.'
                )
            });
        }
    });

    function refresh() {
        setNotice(null);

        queryClient.invalidateQueries({
            queryKey: ['notifications']
        });
    }

    const preferences = preferencesQuery.data;
    const history = historyQuery.data?.items ?? [];
    const jobs = jobsQuery.data?.items ?? [];

    return (
        <div className="notifications-page">
            <PageHeader
                eyebrow="Comunicación"
                title="Notificaciones"
                description="Configurá cómo querés recibir avisos y consultá el historial de intentos de envío."
            >
                <button
                    type="button"
                    className="notifications-refresh"
                    onClick={refresh}
                >
                    <RefreshCw size={16} />
                    Actualizar
                </button>
            </PageHeader>

            <div className="notifications-hero">
                <div>
                    <span>CANALES DE COMUNICACIÓN</span>

                    <h2>
                        Vos elegís cómo recibir novedades.
                    </h2>

                    <p>
                        Administrá las preferencias de tu cuenta.
                        Los mensajes reales requieren proveedores
                        configurados en el backend.
                    </p>
                </div>

                <Bell
                    size={52}
                    strokeWidth={1.3}
                    aria-hidden="true"
                />
            </div>

            {notice && (
                <div
                    className={`notifications-alert notifications-alert--${notice.type}`}
                    role={
                        notice.type === 'error'
                            ? 'alert'
                            : 'status'
                    }
                >
                    {notice.type === 'error'
                        ? <AlertCircle size={18} />
                        : <CheckCircle2 size={18} />}

                    {notice.text}
                </div>
            )}

            <div className="notifications-grid">
                <section className="notifications-card">
                    <header className="notifications-card__head">
                        <h3>
                            <ShieldCheck size={18} />
                            Mis preferencias
                        </h3>

                        <p>
                            Estos ajustes son individuales y
                            requieren una sesión iniciada.
                        </p>
                    </header>

                    {preferencesQuery.isPending ? (
                        <p className="notifications-state">
                            Cargando preferencias…
                        </p>
                    ) : preferencesQuery.isError ? (
                        <p
                            className="notifications-state notifications-state--error"
                            role="alert"
                        >
                            {getApiErrorMessage(
                                preferencesQuery.error
                            )}
                        </p>
                    ) : (
                        <PreferencesForm
                            key={`${preferences.email}-${preferences.whatsapp}-${preferences.phone}`}
                            initial={preferences}
                            pending={mutation.isPending}
                            onSave={data => {
                                setNotice(null);
                                mutation.mutate(data);
                            }}
                        />
                    )}
                </section>

                <section className="notifications-card">
                    <header className="notifications-card__head">
                        <h3>
                            <Clock3 size={18} />
                            Mi historial
                        </h3>

                        <p>
                            Últimos 30 avisos de tu cuenta.
                            El estado «Aceptado» no significa
                            que se haya leído.
                        </p>
                    </header>

                    {historyQuery.isPending ? (
                        <p className="notifications-state">
                            Cargando historial…
                        </p>
                    ) : historyQuery.isError ? (
                        <p
                            className="notifications-state notifications-state--error"
                            role="alert"
                        >
                            {getApiErrorMessage(
                                historyQuery.error
                            )}
                        </p>
                    ) : (
                        <JobList items={history} />
                    )}
                </section>
            </div>

            {isAdmin && (
                <section className="notifications-card">
                    <header className="notifications-card__head">
                        <h3>
                            <UsersRound size={18} />
                            Actividad general de envíos
                        </h3>

                        <p>
                            Vista administrativa de los últimos
                            50 intentos. No incluye números
                            de teléfono ni direcciones de correo.
                        </p>
                    </header>

                    {jobsQuery.isPending ? (
                        <p className="notifications-state">
                            Cargando actividad…
                        </p>
                    ) : jobsQuery.isError ? (
                        <p
                            className="notifications-state notifications-state--error"
                            role="alert"
                        >
                            {getApiErrorMessage(jobsQuery.error)}
                        </p>
                    ) : (
                        <JobList items={jobs} admin />
                    )}
                </section>
            )}
        </div>
    );
}
