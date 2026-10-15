import {
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    NavLink,
    Outlet,
    useLocation,
    useNavigate
} from 'react-router-dom';

import {
    Boxes,
    ChevronDown,
    LayoutDashboard,
    LogOut,
    Menu,
    Package,
    Truck,
    UserRound,
    UsersRound,
    X
} from 'lucide-react';

import {
    useAuth
} from '../auth/AuthContext.jsx';

import {
    Brand
} from './ui.jsx';

import {
    getInitials,
    getPersonName,
    roleLabel
} from '../utils/formatters.js';

const pageNames = {
    '/':
        'Resumen operativo',

    '/orders':
        'Pedidos',

    '/deliveries':
        'Entregas',

    '/users':
        'Usuarios',

    '/profile':
        'Mi perfil'
};

export default function AppShell() {
    const {
        user,
        role,
        logout
    } =
        useAuth();

    const location =
        useLocation();

    const navigate =
        useNavigate();

    const [
        sidebarOpen,
        setSidebarOpen
    ] =
        useState(false);

    const [
        profileOpen,
        setProfileOpen
    ] =
        useState(false);

    useEffect(
        () => {
            setSidebarOpen(
                false
            );

            setProfileOpen(
                false
            );
        },
        [
            location.pathname
        ]
    );

    const navigation =
        useMemo(
            () => {
                const items = [
                    {
                        label:
                            'Dashboard',
                        path:
                            '/',
                        icon:
                            LayoutDashboard,
                        roles: [
                            'admin',
                            'customer',
                            'driver',
                            'store'
                        ]
                    },

                    {
                        label:
                            'Pedidos',
                        path:
                            '/orders',
                        icon:
                            Package,
                        roles: [
                            'admin',
                            'customer'
                        ]
                    },

                    {
                        label:
                            'Entregas',
                        path:
                            '/deliveries',
                        icon:
                            Truck,
                        roles: [
                            'admin',
                            'customer',
                            'driver'
                        ]
                    },

                    {
                        label:
                            'Usuarios',
                        path:
                            '/users',
                        icon:
                            UsersRound,
                        roles: [
                            'admin'
                        ]
                    }
                ];

                return items.filter(
                    (item) =>
                        item.roles
                            .includes(
                                role
                            )
                );
            },
            [
                role
            ]
        );

    const pageTitle =
        pageNames[
            location.pathname
        ] ??
        'DeliveryOps';

    async function handleLogout() {
        await logout();

        navigate(
            '/login',
            {
                replace:
                    true
            }
        );
    }

    return (
        <div className="app-shell">
            <button
                className={`sidebar-backdrop ${
                    sidebarOpen
                        ? 'sidebar-backdrop--visible'
                        : ''
                }`}
                onClick={() =>
                    setSidebarOpen(
                        false
                    )
                }
                aria-label="Cerrar menú"
                type="button"
            />

            <aside
                className={`sidebar ${
                    sidebarOpen
                        ? 'sidebar--open'
                        : ''
                }`}
            >
                <div className="sidebar__header">
                    <Brand
                        inverse
                    />

                    <button
                        type="button"
                        className="sidebar__mobile-close"
                        onClick={() =>
                            setSidebarOpen(
                                false
                            )
                        }
                        aria-label="Cerrar menú"
                    >
                        <X
                            size={
                                19
                            }
                        />
                    </button>
                </div>

                <div className="sidebar__workspace">
                    <span className="sidebar__workspace-icon">
                        <Boxes
                            size={
                                17
                            }
                        />
                    </span>

                    <div>
                        <strong>
                            Operaciones
                        </strong>

                        <span>
                            Workspace principal
                        </span>
                    </div>
                </div>

                <nav className="sidebar__nav">
                    <span className="sidebar__section-label">
                        Navegación
                    </span>

                    {navigation.map(
                        (
                            item
                        ) => {
                            const Icon =
                                item.icon;

                            return (
                                <NavLink
                                    key={
                                        item.path
                                    }
                                    to={
                                        item.path
                                    }
                                    end={
                                        item.path ===
                                        '/'
                                    }
                                    className={
                                        ({
                                            isActive
                                        }) =>
                                            `sidebar__link ${
                                                isActive
                                                    ? 'sidebar__link--active'
                                                    : ''
                                            }`
                                    }
                                >
                                    <Icon
                                        size={
                                            18
                                        }
                                    />

                                    <span>
                                        {
                                            item.label
                                        }
                                    </span>
                                </NavLink>
                            );
                        }
                    )}
                </nav>

                <div className="sidebar__footer">
                    <div className="sidebar__security">
                        <span className="sidebar__security-dot" />

                        <div>
                            <strong>
                                Sesión segura
                            </strong>

                            <span>
                                JWT + Refresh Rotation
                            </span>
                        </div>
                    </div>

                    <NavLink
                        to="/profile"
                        className="sidebar__profile"
                    >
                        <span className="avatar">
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
                                {roleLabel(
                                    role
                                )}
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
                            className="topbar__menu-button"
                            onClick={() =>
                                setSidebarOpen(
                                    true
                                )
                            }
                            aria-label="Abrir menú"
                        >
                            <Menu
                                size={
                                    20
                                }
                            />
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
                        <div className="topbar__status">
                            <span />

                            API conectada
                        </div>

                        <div className="profile-menu">
                            <button
                                type="button"
                                className="profile-menu__trigger"
                                onClick={() =>
                                    setProfileOpen(
                                        (
                                            current
                                        ) =>
                                            !current
                                    )
                                }
                            >
                                <span className="avatar avatar--light">
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
                                        {roleLabel(
                                            role
                                        )}
                                    </span>
                                </div>

                                <ChevronDown
                                    size={
                                        16
                                    }
                                />
                            </button>

                            {profileOpen && (
                                <div className="profile-menu__dropdown">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                '/profile'
                                            )
                                        }
                                    >
                                        <UserRound
                                            size={
                                                16
                                            }
                                        />

                                        Mi perfil
                                    </button>

                                    <button
                                        type="button"
                                        className="profile-menu__danger"
                                        onClick={
                                            handleLogout
                                        }
                                    >
                                        <LogOut
                                            size={
                                                16
                                            }
                                        />

                                        Cerrar sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="app-main">
                    <div className="page-container">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}