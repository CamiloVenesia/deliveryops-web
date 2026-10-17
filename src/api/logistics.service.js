
import { api } from './client.js';
import { extractEntity } from './normalizers.js';

export const orderLogisticsService = {
    async details(orderId) {
        const response = await api.get(`/orders/${orderId}/logistics`);
        return response.data;
    },

    async update(orderId, payload) {
        const response = await api.patch(`/orders/${orderId}/logistics`, payload);
        return extractEntity(response.data, ['order']);
    }
};

export const deliveryLogisticsService = {
    async details(deliveryId) {
        const response = await api.get(`/deliveries/${deliveryId}/logistics`);
        return response.data;
    },

    async update(deliveryId, payload) {
        const response = await api.patch(`/deliveries/${deliveryId}/logistics`, payload);
        return extractEntity(response.data, ['delivery']);
    },

    async locations(deliveryId) {
        const response = await api.get(`/deliveries/${deliveryId}/locations`);
        return response.data;
    },

    async recordLocation(deliveryId, payload) {
        const response = await api.post(`/deliveries/${deliveryId}/locations`, payload);
        return response.data;
    },

    async proof(deliveryId) {
        const response = await api.get(`/deliveries/${deliveryId}/proof`);
        return response.data;
    },

    async recordProof(deliveryId, payload) {
        const response = await api.post(`/deliveries/${deliveryId}/proof`, payload);
        return response.data;
    },

    async attempts(deliveryId) {
        const response = await api.get(`/deliveries/${deliveryId}/attempts`);
        return response.data;
    },

    async recordAttempt(deliveryId, payload) {
        const response = await api.post(`/deliveries/${deliveryId}/attempts`, payload);
        return response.data;
    }
};
