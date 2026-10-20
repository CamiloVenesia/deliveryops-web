
import { api } from './client.js';

export const dispatchService = {
    async recommendations(params = {}) {
        const response = await api.get(
            '/drivers/recommendations',
            { params }
        );

        return response.data;
    }
};
