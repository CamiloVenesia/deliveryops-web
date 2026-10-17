
import { api } from './client.js';

export const analyticsService = {
    async getDashboard(days = 14) {
        const response = await api.get('/analytics/dashboard', {
            params: { days }
        });

        return response.data;
    }
};
