import {
    Navigate,
    Outlet,
    useLocation
} from 'react-router-dom';

import {
    useAuth
} from './AuthContext.jsx';

import {
    LoadingState
} from '../components/ui.jsx';

export function ProtectedRoute() {
    const {
        isAuthenticated,
        initializing
    } =
        useAuth();

    const location =
        useLocation();

    if (initializing) {
        return (
            <div className="full-screen-loader">
                <LoadingState
                    title="Preparando tu espacio de trabajo"
                    description="Validando la sesión segura de DeliveryOps."
                />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                replace
                state={{
                    from:
                        location
                            .pathname
                }}
            />
        );
    }

    return <Outlet />;
}

export function RoleRoute({
    allowedRoles
}) {
    const {
        role
    } =
        useAuth();

    if (
        !allowedRoles.includes(
            role
        )
    ) {
        return (
            <Navigate
                to="/"
                replace
            />
        );
    }

    return <Outlet />;
}