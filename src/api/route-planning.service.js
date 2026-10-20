
import { api } from './client.js';

export const routePlanningService = {
    async preview(driverId) {
        const response = await api.get(
            `/route-planning/drivers/${encodeURIComponent(driverId)}`
        );

        return response.data;
    }
};
