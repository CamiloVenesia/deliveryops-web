
import { api } from './client.js';
import { extractEntity, normalizeCollection } from './normalizers.js';

export const depotService = {
    async list(params = {}) {
        const response = await api.get('/depots', { params });
        const data = response.data;

        if (Array.isArray(data)) {
            return normalizeCollection(data);
        }

        if (Array.isArray(data?.depots)) {
            return normalizeCollection({ ...data, items: data.depots });
        }

        return normalizeCollection(data);
    },

    async getById(id) {
        const response = await api.get(`/depots/${id}`);
        return extractEntity(response.data, ['depot']);
    },

    async create(payload) {
        const response = await api.post('/depots', payload);
        return extractEntity(response.data, ['depot']);
    },

    async update(id, payload) {
        const response = await api.patch(`/depots/${id}`, payload);
        return extractEntity(response.data, ['depot']);
    },

    async remove(id) {
        const response = await api.delete(`/depots/${id}`);
        return response.data;
    }
};
