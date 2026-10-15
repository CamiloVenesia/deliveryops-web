import {
    api,
    authTransport,
    requestRefresh,
    setAccessToken
} from './client.js';

import {
    extractAccessToken,
    extractEntity,
    extractUser,
    normalizeCollection
} from './normalizers.js';

export const authService = {
    async login(
        credentials
    ) {
        const response =
            await authTransport.post(
                '/auth/login',
                credentials
            );

        const token =
            extractAccessToken(
                response.data
            );

        if (token) {
            setAccessToken(
                token
            );
        }

        return {
            accessToken:
                token,

            user:
                extractUser(
                    response.data
                ),

            raw:
                response.data
        };
    },

    async refresh() {
        return requestRefresh();
    },

    async me() {
        const response =
            await api.get(
                '/auth/me'
            );

        return extractUser(
            response.data
        );
    },

    async logout() {
        const response =
            await api.post(
                '/auth/logout'
            );

        setAccessToken(
            null
        );

        return response.data;
    }
};

export const userService = {
    async list(
        params = {}
    ) {
        const response =
            await api.get(
                '/users',
                {
                    params
                }
            );

        return normalizeCollection(
            response.data
        );
    },

    async getById(
        id
    ) {
        const response =
            await api.get(
                `/users/${id}`
            );

        return extractEntity(
            response.data,
            [
                'user'
            ]
        );
    },

    async create(
        data
    ) {
        const response =
            await api.post(
                '/users',
                data
            );

        return extractEntity(
            response.data,
            [
                'user'
            ]
        );
    },

    async remove(
        id
    ) {
        const response =
            await api.delete(
                `/users/${id}`
            );

        return response.data;
    },

    async uploadDocument({
        userId,
        documentType,
        file
    }) {
        const formData =
            new FormData();

        formData.append(
            'documentType',
            documentType
        );

        formData.append(
            'document',
            file
        );

        const response =
            await api.post(
                `/users/${userId}/documents`,
                formData
            );

        return extractEntity(
            response.data,
            [
                'user'
            ]
        );
    }
};

export const orderService = {
    async list(
        params = {}
    ) {
        const response =
            await api.get(
                '/orders',
                {
                    params
                }
            );

        return normalizeCollection(
            response.data
        );
    },

    async getById(
        id
    ) {
        const response =
            await api.get(
                `/orders/${id}`
            );

        return extractEntity(
            response.data,
            [
                'order'
            ]
        );
    },

    async create(
        data
    ) {
        const response =
            await api.post(
                '/orders',
                data
            );

        return extractEntity(
            response.data,
            [
                'order'
            ]
        );
    },

    async updateStatus(
        id,
        status
    ) {
        const response =
            await api.patch(
                `/orders/${id}/status`,
                {
                    status
                }
            );

        return extractEntity(
            response.data,
            [
                'order'
            ]
        );
    },

    async remove(
        id
    ) {
        const response =
            await api.delete(
                `/orders/${id}`
            );

        return response.data;
    },

    async uploadReceipt(
        id,
        file
    ) {
        const formData =
            new FormData();

        formData.append(
            'receipt',
            file
        );

        const response =
            await api.post(
                `/orders/${id}/receipt`,
                formData
            );

        return extractEntity(
            response.data,
            [
                'order'
            ]
        );
    }
};

export const deliveryService = {
    async list(
        params = {}
    ) {
        const response =
            await api.get(
                '/deliveries',
                {
                    params
                }
            );

        return normalizeCollection(
            response.data
        );
    },

    async getById(
        id
    ) {
        const response =
            await api.get(
                `/deliveries/${id}`
            );

        return extractEntity(
            response.data,
            [
                'delivery'
            ]
        );
    },

    async create(
        data
    ) {
        const response =
            await api.post(
                '/deliveries',
                data
            );

        return extractEntity(
            response.data,
            [
                'delivery'
            ]
        );
    },

    async updateStatus(
        id,
        status
    ) {
        const response =
            await api.patch(
                `/deliveries/${id}/status`,
                {
                    status
                }
            );

        return extractEntity(
            response.data,
            [
                'delivery'
            ]
        );
    },

    async remove(
        id
    ) {
        const response =
            await api.delete(
                `/deliveries/${id}`
            );

        return response.data;
    },

    async uploadReceipt(
        id,
        file
    ) {
        const formData =
            new FormData();

        formData.append(
            'receipt',
            file
        );

        const response =
            await api.post(
                `/deliveries/${id}/receipt`,
                formData
            );

        return extractEntity(
            response.data,
            [
                'delivery'
            ]
        );
    }
};