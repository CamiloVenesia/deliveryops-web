import {
    Navigate,
    Route,
    Routes
} from 'react-router-dom';

import {
    ProtectedRoute,
    RoleRoute
} from './auth/ProtectedRoute.jsx';

import AppShell from './components/AppShell.jsx';

import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import DeliveriesPage from './pages/DeliveriesPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
    return (
        <Routes>
            <Route
                path="/login"
                element={<LoginPage />}
            />

            <Route
                element={<ProtectedRoute />}
            >
                <Route
                    element={<AppShell />}
                >
                    <Route
                        index
                        element={
                            <DashboardPage />
                        }
                    />

                    <Route
                        element={
                            <RoleRoute
                                allowedRoles={[
                                    'admin',
                                    'customer'
                                ]}
                            />
                        }
                    >
                        <Route
                            path="orders"
                            element={
                                <OrdersPage />
                            }
                        />
                    </Route>

                    <Route
                        element={
                            <RoleRoute
                                allowedRoles={[
                                    'admin',
                                    'customer',
                                    'driver'
                                ]}
                            />
                        }
                    >
                        <Route
                            path="deliveries"
                            element={
                                <DeliveriesPage />
                            }
                        />
                    </Route>

                    <Route
                        element={
                            <RoleRoute
                                allowedRoles={[
                                    'admin'
                                ]}
                            />
                        }
                    >
                        <Route
                            path="users"
                            element={
                                <UsersPage />
                            }
                        />
                    </Route>

                    <Route
                        path="profile"
                        element={
                            <ProfilePage />
                        }
                    />

                    <Route
                        path="404"
                        element={
                            <NotFoundPage />
                        }
                    />

                    <Route
                        path="*"
                        element={
                            <Navigate
                                to="/404"
                                replace
                            />
                        }
                    />
                </Route>
            </Route>

            <Route
                path="*"
                element={
                    <Navigate
                        to="/login"
                        replace
                    />
                }
            />
        </Routes>
    );
}