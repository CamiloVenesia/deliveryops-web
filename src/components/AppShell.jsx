
import { useEffect, useMemo, useRef, useState } from 'react';

import {
    NavLink,
    Outlet,
    useLocation,
    useNavigate
} from 'react-router-dom';

import {
    AlertCircle,
    Bell,
    Boxes,
    ClipboardCheck,
    ChevronDown,
    LayoutDashboard,
    LogOut,
    MapPinned,
    Menu,
    Package,
    Route,
    Search,
    Truck,
    UserRound,
    UsersRound,
    Warehouse,
    X
} from 'lucide-react';

import { useAuth } from '../auth/useAuth.js';
import { useConnectivity } from '../hooks/useConnectivity.js';
import '../styles/mobile-accessibility.css';
import { Brand } from './ui.jsx';

import {
    getInitials,
    getPersonName,
    roleLabel
} from '../utils/formatters.js';

const PAGE_NAMES = {
    '/': 'Resumen operativo',
    '/orders': 'Pedidos',
    '/deliveries': 'Entregas',
    '/search': 'Búsqueda avanzada',
    '/tracking': 'Seguimiento',
    '/drivers': 'Repartidores',
    '/dispatch': 'Despacho inteligente',
    '/route-planning': 'Planificación de rutas',
    '/depots': 'Depósitos y sucursales',
    '/users': 'Usuarios',
    '/profile': 'Mi perfil',
    '/notifications': 'Notificaciones'
};

const NAV_ITEMS = [
    {
        label: 'Dashboard',
        path: '/',
        icon: LayoutDashboard,
        roles: ['admin', 'customer', 'driver', 'store']
    },
    {
        label: 'Pedidos',
        path: '/orders',
        icon: Package,
        roles: ['admin', 'customer']
    },
    {
        label: 'Entregas',
        path: '/deliveries',
        icon: Truck,
        roles: ['admin', 'customer', 'driver']
    },
    {
        label: 'Búsqueda avanzada',
        path: '/search',
        icon: Search,
        roles: ['admin', 'customer', 'driver']
    },
    {
        label: 'Seguimiento',
        path: '/tracking',
        icon: MapPinned,
        roles: ['admin', 'customer', 'driver']
    },
    {
        label: 'Despacho',
        path: '/dispatch',
        icon: ClipboardCheck,
        roles: ['admin']
    },
    {
        label: 'Planificación de rutas',
        path: '/route-planning',
        icon: Route,
        roles: ['admin', 'driver']
    },
    {
        label: 'Repartidores',
        path: '/drivers',
        icon: UsersRound,
        roles: ['admin']
    },
    {
        label: 'Mi disponibilidad',
        path: '/drivers',
        icon: UserRound,
        roles: ['driver']
    },
    {
        label: 'Depósitos',
        path: '/depots',
        icon: Warehouse,
        roles: ['admin', 'store']
    },
    {
        label: 'Usuarios',
        path: '/users',
        icon: UsersRound,
        roles: ['admin']
    },
    {
        label: 'Notificaciones',
        path: '/notifications',
        icon: Bell,
        roles: ['admin', 'customer', 'driver', 'store']
    }
];

export default function AppShell() {
    const { user, role, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const { status: connection, retry } = useConnectivity();

    const sidebarRef = useRef(null);
    const menuButtonRef = useRef(null);
    const profileButtonRef = useRef(null);
    const mainRef = useRef(null);
    const previousPathRef = useRef(location.pathname);

    useEffect(() => {
        if (previousPathRef.current !== location.pathname) {
            previousPathRef.current = location.pathname;

            mainRef.current?.focus({
                preventScroll: true
            });
        }
    }, [location.pathname]);

    useEffect(() => {
        if (!sidebarOpen) return undefined;

        const mobile = window.matchMedia(
            '(max-width: 960px)'
        );

        if (!mobile.matches) return undefined;

        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow = 'hidden';

        sidebarRef.current
            ?.querySelector('.sidebar__mobile-close')
            ?.focus();

        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                setSidebarOpen(false);

                menuButtonRef.current?.focus();

                return;
            }

            if (event.key !== 'Tab') return;

            const focusable = Array.from(
                sidebarRef.current?.querySelectorAll(
                    'a[href], button:not([disabled])'
                ) ?? []
            ).filter(
                element =>
                    element.getClientRects().length > 0
            );

            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (
                event.shiftKey &&
                (
                    document.activeElement === first ||
                    !sidebarRef.current?.contains(
                        document.activeElement
                    )
                )
            ) {
                event.preventDefault();
                last.focus();
            } else if (
                !event.shiftKey &&
                (
                    document.activeElement === last ||
                    !sidebarRef.current?.contains(
                        document.activeElement
                    )
                )
            ) {
                event.preventDefault();
                first.focus();
            }
        }

        function handleResize() {
            if (!mobile.matches) {
                setSidebarOpen(false);
            }
        }

        document.addEventListener(
            'keydown',
            handleKeyDown
        );

        window.addEventListener(
            'resize',
            handleResize
        );

        return () => {
            document.body.style.overflow =
                previousOverflow;

            document.removeEventListener(
                'keydown',
                handleKeyDown
            );

            window.removeEventListener(
                'resize',
                handleResize
            );
        };
    }, [sidebarOpen]);

    useEffect(() => {
        if (!profileOpen) return undefined;

        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                setProfileOpen(false);
                profileButtonRef.current?.focus();
            }
        }

        document.addEventListener(
            'keydown',
            handleKeyDown
        );

        return () => {
            document.removeEventListener(
                'keydown',
                handleKeyDown
            );
        };
    }, [profileOpen]);

    const connectionLabel = {
        checking: 'Verificando servidor',
        online: 'Servidor conectado',
        offline: 'Sin conexión a internet',
        unreachable: 'Servidor no disponible'
    }[connection];

    const navigation = useMemo(
        () => NAV_ITEMS.filter(
            item => item.roles.includes(role)
        ),
        [role]
    );

    const pageTitle =
        location.pathname === '/drivers' &&
        role === 'driver'
            ? 'Mi disponibilidad'
            : PAGE_NAMES[location.pathname] ||
              'DeliveryOps';

    async function handleLogout() {
        setProfileOpen(false);

        await logout();

        navigate('/login', {
            replace: true
        });
    }

    function handleProfileNavigation() {
        setProfileOpen(false);
        navigate('/profile');
    }

    return (
        <div className="app-shell">
            <a
                className="do-skip-link"
                href="#main-content"
            >
                Saltar al contenido
            </a>

            <button
                type="button"
                className={`sidebar-backdrop ${
                    sidebarOpen
                        ? 'sidebar-backdrop--visible'
                        : ''
                }`}
                onClick={() => setSidebarOpen(false)}
                aria-label="Cerrar menú"
                aria-hidden={!sidebarOpen}
                tabIndex={sidebarOpen ? 0 : -1}
            />

            <aside
                ref={sidebarRef}
                id="mobile-sidebar"
                aria-label="Menú de navegación"
                className={`sidebar ${
                    sidebarOpen
                        ? 'sidebar--open'
                        : ''
                }`}
            >
                <div className="sidebar__header">
                    <Brand inverse />

                    <button
                        type="button"
                        className="sidebar__mobile-close"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Cerrar menú"
                    >
                        <X size={19} />
                    </button>
                </div>

                <div className="sidebar__workspace">
                    <span className="sidebar__workspace-icon">
                        <Boxes size={17} />
                    </span>

                    <div>
                        <strong>Operaciones</strong>
                        <span>Centro operativo</span>
                    </div>
                </div>

                <nav
                    className="sidebar__nav"
                    aria-label="Navegación principal"
                >
                    <span className="sidebar__section-label">
                        Navegación
                    </span>

                    {navigation.map(item => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={`${item.path}-${item.label}`}
                                to={item.path}
                                end={item.path === '/'}
                                onClick={() =>
                                    setSidebarOpen(false)
                                }
                                className={({ isActive }) =>
                                    `sidebar__link ${
                                        isActive
                                            ? 'sidebar__link--active'
                                            : ''
                                    }`
                                }
                            >
                                <Icon size={18} />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="sidebar__footer">
                    <div className="sidebar__security">
                        <span className="sidebar__security-dot" />

                        <div>
                            <strong>Sesión protegida</strong>
                            <span>
                                Protección de acceso activa
                            </span>
                        </div>
                    </div>

                    <NavLink
                        to="/profile"
                        className="sidebar__profile"
                        onClick={() =>
                            setSidebarOpen(false)
                        }
                    >
                        <span className="avatar">
                            {getInitials(user)}
                        </span>

                        <div>
                            <strong>
                                {getPersonName(user)}
                            </strong>

                            <span>
                                {roleLabel(role)}
                            </span>
                        </div>
                    </NavLink>
                </div>
            </aside>

            <div className="app-shell__body">
                <header className="topbar">
                    <div className="topbar__left">
                        <button
                            type="button"
                            ref={menuButtonRef}
                            className="topbar__menu-button"
                            aria-controls="mobile-sidebar"
                            aria-expanded={sidebarOpen}
                            onClick={() =>
                                setSidebarOpen(true)
                            }
                            aria-label="Abrir menú"
                        >
                            <Menu size={20} />
                        </button>

                        <div>
                            <span className="topbar__eyebrow">
                                DeliveryOps
                            </span>

                            <strong className="topbar__title">
                                {pageTitle}
                            </strong>
                        </div>
                    </div>

                    <div className="topbar__right">
                        <div
                            className={`do-connection do-connection--${connection}`}
                            role="status"
                            aria-label={connectionLabel}
                        >
                            <span
                                className="do-connection__dot"
                                aria-hidden="true"
                            />

                            <span className="do-connection__text">
                                {connectionLabel}
                            </span>
                        </div>

                        <div className="profile-menu">
                            <button
                                type="button"
                                ref={profileButtonRef}
                                className="profile-menu__trigger"
                                onClick={() =>
                                    setProfileOpen(
                                        current => !current
                                    )
                                }
                                aria-expanded={profileOpen}
                                aria-label="Opciones de perfil"
                            >
                                <span className="avatar avatar--light">
                                    {getInitials(user)}
                                </span>

                                <div>
                                    <strong>
                                        {getPersonName(user)}
                                    </strong>

                                    <span>
                                        {roleLabel(role)}
                                    </span>
                                </div>

                                <ChevronDown size={16} />
                            </button>

                            {profileOpen && (
                                <div className="profile-menu__dropdown">
                                    <button
                                        type="button"
                                        onClick={
                                            handleProfileNavigation
                                        }
                                    >
                                        <UserRound size={16} />
                                        Mi perfil
                                    </button>

                                    <button
                                        type="button"
                                        className="profile-menu__danger"
                                        onClick={handleLogout}
                                    >
                                        <LogOut size={16} />
                                        Cerrar sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {(
                    connection === 'offline' ||
                    connection === 'unreachable'
                ) && (
                    <div
                        className="do-offline-banner"
                        role="alert"
                    >
                        <AlertCircle
                            size={19}
                            aria-hidden="true"
                        />

                        <div className="do-offline-banner__text">
                            <strong>
                                {connection === 'offline'
                                    ? 'Sin conexión a internet'
                                    : 'No se puede contactar con DeliveryOps API'}
                            </strong>

                            <span>
                                No confirmes operaciones mientras
                                dure el problema. Los cambios
                                no se guardan sin respuesta
                                del servidor.
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => void retry()}
                            disabled={connection === 'offline'}
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                <main
                    ref={mainRef}
                    id="main-content"
                    className="app-main"
                    tabIndex={-1}
                >
                    <div className="page-container">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
