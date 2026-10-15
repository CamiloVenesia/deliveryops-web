import axios from 'axios';

import {
    extractAccessToken
} from './normalizers.js';

const API_URL =
    import.meta.env
        .VITE_API_URL ||
    'http://localhost:3000/api';

let accessToken = null;
let refreshPromise = null;
let authFailureHandler = null;

export function setAccessToken(
    token
) {
    accessToken =
        token || null;
}

export function getAccessToken() {
    return accessToken;
}

export function setAuthFailureHandler(
    handler
) {
    authFailureHandler =
        handler;
}

export const authTransport =
    axios.create({
        baseURL:
            API_URL,

        withCredentials:
            true,

        headers: {
            Accept:
                'application/json'
        }
    });

export const api =
    axios.create({
        baseURL:
            API_URL,

        withCredentials:
            true,

        headers: {
            Accept:
                'application/json'
        }
    });

api.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers =
                config.headers || {};

            config.headers.Authorization =
                `Bearer ${accessToken}`;
        }

        return config;
    }
);

export async function requestRefresh() {
    if (!refreshPromise) {
        refreshPromise =
            authTransport
                .post(
                    '/auth/refresh'
                )
                .then(
                    (response) => {
                        const token =
                            extractAccessToken(
                                response.data
                            );

                        if (!token) {
                            throw new Error(
                                'El servidor no devolvió un access token.'
                            );
                        }

                        setAccessToken(
                            token
                        );

                        return {
                            response,
                            accessToken:
                                token
                        };
                    }
                )
                .finally(
                    () => {
                        refreshPromise =
                            null;
                    }
                );
    }

    return refreshPromise;
}

api.interceptors.response.use(
    (response) =>
        response,

    async (error) => {
        const originalRequest =
            error.config;

        const status =
            error?.response
                ?.status;

        const isAuthEndpoint =
            originalRequest
                ?.url
                ?.includes(
                    '/auth/login'
                ) ||
            originalRequest
                ?.url
                ?.includes(
                    '/auth/refresh'
                );

        if (
            status !== 401 ||
            originalRequest
                ?._retry ||
            isAuthEndpoint
        ) {
            return Promise.reject(
                error
            );
        }

        originalRequest._retry =
            true;

        try {
            const {
                accessToken:
                    refreshedToken
            } =
                await requestRefresh();

            originalRequest.headers =
                originalRequest.headers ||
                {};

            originalRequest
                .headers
                .Authorization =
                `Bearer ${refreshedToken}`;

            return api(
                originalRequest
            );
        } catch (
            refreshError
        ) {
            setAccessToken(
                null
            );

            if (
                authFailureHandler
            ) {
                authFailureHandler();
            }

            return Promise.reject(
                refreshError
            );
        }
    }
);