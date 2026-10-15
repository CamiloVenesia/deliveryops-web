import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    useQueryClient
} from '@tanstack/react-query';

import {
    authService
} from '../api/services.js';

import {
    setAccessToken,
    setAuthFailureHandler
} from '../api/client.js';

import {
    AuthContext
} from './authContext.js';

export function AuthProvider({
    children
}) {
    const queryClient =
        useQueryClient();

    const [
        user,
        setUser
    ] =
        useState(null);

    const [
        initializing,
        setInitializing
    ] =
        useState(true);

    const clearSession =
        useCallback(
            () => {
                setAccessToken(
                    null
                );

                setUser(
                    null
                );

                queryClient.clear();
            },
            [
                queryClient
            ]
        );

    useEffect(
        () => {
            let cancelled =
                false;

            setAuthFailureHandler(
                () => {
                    clearSession();
                }
            );

            async function bootstrap() {
                try {
                    await authService.refresh();

                    const currentUser =
                        await authService.me();

                    if (!cancelled) {
                        setUser(
                            currentUser
                        );
                    }
                } catch {
                    if (!cancelled) {
                        clearSession();
                    }
                } finally {
                    if (!cancelled) {
                        setInitializing(
                            false
                        );
                    }
                }
            }

            bootstrap();

            return () => {
                cancelled =
                    true;
            };
        },
        [
            clearSession
        ]
    );

    const login =
        useCallback(
            async (
                credentials
            ) => {
                const result =
                    await authService.login(
                        credentials
                    );

                if (
                    !result
                        .accessToken
                ) {
                    throw new Error(
                        'No se recibió un token de acceso.'
                    );
                }

                let authenticatedUser =
                    result.user;

                if (
                    !authenticatedUser ||
                    !authenticatedUser.role
                ) {
                    authenticatedUser =
                        await authService.me();
                }

                setUser(
                    authenticatedUser
                );

                return authenticatedUser;
            },
            []
        );

    const logout =
        useCallback(
            async () => {
                try {
                    await authService.logout();
                } catch {
                    // Aunque falle la petición,
                    // la sesión local debe cerrarse.
                } finally {
                    clearSession();
                }
            },
            [
                clearSession
            ]
        );

    const value =
        useMemo(
            () => ({
                user,

                role:
                    user?.role ??
                    null,

                initializing,

                isAuthenticated:
                    Boolean(
                        user
                    ),

                login,
                logout
            }),
            [
                user,
                initializing,
                login,
                logout
            ]
        );

    return (
        <AuthContext.Provider
            value={
                value
            }
        >
            {children}
        </AuthContext.Provider>
    );
}