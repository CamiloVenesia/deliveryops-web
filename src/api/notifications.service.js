
import { api } from './client.js';

export const notificationsService = {
    async preferences() {
        const response = await api.get(
            '/notifications/preferences'
        );

        return response.data;
    },

    async updatePreferences(data) {
        const response = await api.patch(
            '/notifications/preferences',
            data
        );

        return response.data;
    },

    async myHistory() {
        const response = await api.get(
            '/notifications/me'
        );

        return response.data;
    },

    async recentJobs() {
        const response = await api.get(
            '/notifications/jobs'
        );

        return response.data;
    }
};
