import {
    useEffect,
    useState
} from 'react';

import {
    useLocation,
    useNavigate
} from 'react-router-dom';

import {
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    PackageCheck,
    Route,
    ShieldCheck
} from 'lucide-react';

import {
    useAuth
} from '../auth/useAuth.js';

import {
    Brand
} from '../components/ui.jsx';

import {
    getApiErrorMessage
} from '../api/normalizers.js';

export default function LoginPage() {
    const {
        login,
        isAuthenticated,
        initializing
    } =
        useAuth();

    const navigate =
        useNavigate();

    const location =
        useLocation();

    const [
        email,
        setEmail
    ] =
        useState('');

    const [
        password,
        setPassword
    ] =
        useState('');

    const [
        showPassword,
        setShowPassword
    ] =
        useState(false);

    const [
        loading,
        setLoading
    ] =
        useState(false);

    const [
        error,
        setError
    ] =
        useState('');

    useEffect(
        () => {
            if (
                !initializing &&
                isAuthenticated
            ) {
                navigate(
                    '/',
                    {
                        replace:
                            true
                    }
                );
            }
        },
        [
            initializing,
            isAuthenticated,
            navigate
        ]
    );

    async function handleSubmit(
        event
    ) {
        event.preventDefault();

        setError('');

        if (
            !email.trim() ||
            !password
        ) {
            setError(
                'Ingresá tu email y contraseña.'
            );

            return;
        }

        setLoading(
            true
        );

        try {
            await login({
                email:
                    email.trim(),
                password
            });

            const destination =
                location.state
                    ?.from ||
                '/';

            navigate(
                destination,
                {
                    replace:
                        true
                }
            );
        } catch (
            loginError
        ) {
            setError(
                getApiErrorMessage(
                    loginError,
                    'No pudimos iniciar sesión. Revisá tus credenciales.'
                )
            );
        } finally {
            setLoading(
                false
            );
        }
    }

    return (
        <main className="login-page">
            <section className="login-panel">
                <header className="login-panel__header">
                    <Brand />
                </header>

                <div className="login-panel__main">
                    <div className="login-card">
                        <span className="login-card__eyebrow">
                            Plataforma operativa
                        </span>

                        <h1>
                            Bienvenido
                            de nuevo.
                        </h1>

                        <p className="login-card__description">
                            Accedé a tu espacio de trabajo para gestionar pedidos, entregas y operaciones logísticas desde un único lugar.
                        </p>

                        {error && (
                            <div className="form-alert form-alert--error">
                                <span>
                                    !
                                </span>

                                {
                                    error
                                }
                            </div>
                        )}

                        <form
                            className="login-form"
                            onSubmit={
                                handleSubmit
                            }
                        >
                            <label className="form-field">
                                <span className="form-label">
                                    Email
                                </span>

                                <span className="form-control">
                                    <Mail className="form-control__icon" />

                                    <input
                                        className="form-input"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="nombre@empresa.com"
                                        value={
                                            email
                                        }
                                        onChange={
                                            (
                                                event
                                            ) =>
                                                setEmail(
                                                    event
                                                        .target
                                                        .value
                                                )
                                        }
                                    />
                                </span>
                            </label>

                            <label className="form-field">
                                <span className="form-label">
                                    Contraseña
                                </span>

                                <span className="form-control">
                                    <LockKeyhole className="form-control__icon" />

                                    <input
                                        className="form-input"
                                        type={
                                            showPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        autoComplete="current-password"
                                        placeholder="Tu contraseña"
                                        value={
                                            password
                                        }
                                        onChange={
                                            (
                                                event
                                            ) =>
                                                setPassword(
                                                    event
                                                        .target
                                                        .value
                                                )
                                        }
                                    />

                                    <button
                                        type="button"
                                        className="form-control__action"
                                        onClick={() =>
                                            setShowPassword(
                                                (
                                                    current
                                                ) =>
                                                    !current
                                            )
                                        }
                                        aria-label={
                                            showPassword
                                                ? 'Ocultar contraseña'
                                                : 'Mostrar contraseña'
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff
                                                size={
                                                    18
                                                }
                                            />
                                        ) : (
                                            <Eye
                                                size={
                                                    18
                                                }
                                            />
                                        )}
                                    </button>
                                </span>
                            </label>

                            <button
                                className="login-submit"
                                type="submit"
                                disabled={
                                    loading
                                }
                            >
                                {loading
                                    ? 'Ingresando...'
                                    : 'Ingresar a DeliveryOps'}

                                {!loading && (
                                    <ArrowRight
                                        size={
                                            18
                                        }
                                    />
                                )}
                            </button>
                        </form>

                        <div className="login-card__secure">
                            <ShieldCheck
                                size={
                                    15
                                }
                            />

                            Sesión protegida con autenticación JWT y cookies HttpOnly
                        </div>
                    </div>
                </div>

                <footer className="login-panel__footer">
                    <span>
                        © 2026 DeliveryOps
                    </span>

                    <span>
                        Operaciones logísticas, simplificadas.
                    </span>
                </footer>
            </section>

            <section className="login-visual">
                <div className="login-visual__content">
                    <span className="login-visual__badge">
                        <i />

                        Centro de operaciones
                    </span>

                    <div className="login-visual__hero">
                        <h2>
                            Toda tu operación,
                            en movimiento.
                        </h2>

                        <p>
                            Un entorno pensado para coordinar pedidos, asignar entregas y mantener a cada rol enfocado en lo que necesita hacer.
                        </p>

                        <div className="workflow-card">
                            <div className="workflow-card__header">
                                <div>
                                    <strong>
                                        Flujo de una entrega
                                    </strong>

                                    <span>
                                        Visibilidad de punta a punta
                                    </span>
                                </div>

                                <span className="workflow-card__active">
                                    <i />

                                    Operativo
                                </span>
                            </div>

                            <div className="workflow">
                                <WorkflowStep
                                    icon={
                                        PackageCheck
                                    }
                                    number="01"
                                    title="Pedido creado"
                                    description="Ingreso y validación"
                                    active
                                />

                                <WorkflowStep
                                    icon={
                                        ShieldCheck
                                    }
                                    number="02"
                                    title="Asignación"
                                    description="Control operativo"
                                    active
                                />

                                <WorkflowStep
                                    icon={
                                        Route
                                    }
                                    number="03"
                                    title="En tránsito"
                                    description="Seguimiento"
                                    active
                                />

                                <WorkflowStep
                                    icon={
                                        CheckCircle2
                                    }
                                    number="04"
                                    title="Entregado"
                                    description="Comprobante"
                                />
                            </div>
                        </div>
                    </div>

                    <footer className="login-visual__footer">
                        <span>
                            DeliveryOps Platform
                        </span>

                        <span className="system-status">
                            <i />

                            Sistema disponible
                        </span>
                    </footer>
                </div>
            </section>
        </main>
    );
}

function WorkflowStep({
    icon:
        Icon,
    number,
    title,
    description,
    active
}) {
    return (
        <div
            className={`workflow-step ${
                active
                    ? 'workflow-step--active'
                    : ''
            }`}
        >
            <span className="workflow-step__number">
                {number}
            </span>

            <span className="workflow-step__icon">
                <Icon
                    size={
                        17
                    }
                />
            </span>

            <div>
                <strong>
                    {title}
                </strong>

                <span>
                    {description}
                </span>
            </div>
        </div>
    );
}