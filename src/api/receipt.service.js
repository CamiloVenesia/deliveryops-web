
import { api } from './client.js';

export const receiptService = {
    async get(deliveryId, { download = false } = {}) {
        const response = await api.get(
            `/deliveries/${encodeURIComponent(deliveryId)}/receipt`,
            {
                params: download ? { download: 1 } : undefined,
                responseType: 'blob',
                headers: {
                    Accept: 'image/jpeg, image/png, application/pdf'
                }
            }
        );

        return {
            blob: response.data,
            contentType:
                response.headers['content-type'] ||
                response.data.type ||
                'application/octet-stream'
        };
    }
};
