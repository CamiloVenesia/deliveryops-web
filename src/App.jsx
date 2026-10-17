
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import {
    ProtectedRoute,
    RoleRoute
} from './auth/ProtectedRoute.jsx';

import { useAuth } from './auth/useAuth.js';
import AppShell from './components/AppShell.jsx';
import { LoadingState } from './components/ui.jsx';

const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.jsx'));
const OrdersPage = lazy(() => import('./pages/OrdersPage.jsx'));
const DeliveriesPage = lazy(() => import('./pages/DeliveriesPage.jsx'));
const TrackingPage = lazy(() => import('./pages/TrackingPage.jsx'));
const DepotsPage = lazy(() => import('./pages/DepotsPage.jsx'));
const UsersPage = lazy(() => import('./pages/UsersPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

function RouteLoading() {
    return (
        <div className="full-screen-loader">
            <LoadingState
                title="Cargando DeliveryOps"
                description="Preparando tu espacio de trabajo."
            />
        </div>
    );
}

export default function App() {
    const { role } = useAuth();

    return (
        <Suspense fallback={<RouteLoading />}>
            <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route element={<ProtectedRoute />}>
                    <Route element={<AppShell />}>
                        <Route
                            index
                            element={
                                role === 'admin'
                                    ? <AdminDashboardPage />
                                    : <DashboardPage />
                            }
                        />

                        <Route
                            element={
                                <RoleRoute
                                    allowedRoles={['admin', 'customer']}
                                />
                            }
                        >
                            <Route path="orders" element={<OrdersPage />} />
                        </Route>

                        <Route
                            element={
                                <RoleRoute
                                    allowedRoles={['admin', 'customer', 'driver']}
                                />
                            }
                        >
                            <Route path="deliveries" element={<DeliveriesPage />} />
                            <Route path="tracking" element={<TrackingPage />} />
                        </Route>

                        <Route
                            element={
                                <RoleRoute allowedRoles={['admin', 'store']} />
                            }
                        >
                            <Route path="depots" element={<DepotsPage />} />
                        </Route>

                        <Route
                            element={
                                <RoleRoute allowedRoles={['admin']} />
                            }
                        >
                            <Route path="users" element={<UsersPage />} />
                        </Route>

                        <Route path="profile" element={<ProfilePage />} />
                        <Route path="404" element={<NotFoundPage />} />
                        <Route
                            path="*"
                            element={<Navigate to="/404" replace />}
                        />
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Suspense>
    );
}
