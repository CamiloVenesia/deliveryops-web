
import { api } from './client.js';

export const driversService = {
    async list(params = {}) {
        const response = await api.get('/drivers', {
            params
        });

        return response.data;
    },

    async getById(id, days = 30) {
        const response = await api.get(
            `/drivers/${encodeURIComponent(id)}`,
            {
                params: { days }
            }
        );

        return response.data;
    },

    async getMe(days = 30) {
        const response = await api.get('/drivers/me', {
            params: { days }
        });

        return response.data;
    },

    async updateAvailability(id, status) {
        const response = await api.patch(
            `/drivers/${encodeURIComponent(id)}/availability`,
            { status }
        );

        return response.data;
    },

    async updateCapacity(id, maxConcurrentDeliveries) {
        const response = await api.patch(
            `/drivers/${encodeURIComponent(id)}/capacity`,
            { maxConcurrentDeliveries }
        );

        return response.data;
    }
};
