
import { api } from './client.js';

export const operationsIntelligenceService = {
    async getOverview(days = 30) {
        const response = await api.get(
            '/analytics/operations',
            { params: { days } }
        );

        return response.data;
    }
};
