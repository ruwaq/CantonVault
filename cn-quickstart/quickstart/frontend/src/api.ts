import { OpenAPIClientAxios } from 'openapi-client-axios';
import { Client as ApiClient } from './openapi';
import { v4 as uuidv4 } from 'uuid';

const api = new OpenAPIClientAxios({
    definition: '/api/v3/api-docs',
    withServer: { url: '/api' },
});

// Init catches errors silently — when no backend is reachable (e.g. static
// SPA deployment without backend), getClient() will reject at call time and
// callers handle it. Throwing during module init would crash the whole app.
api.init().catch((err) => {
    console.warn('OpenAPI client init failed — backend may be unreachable.', err);
});

export const getApiClient = async (): Promise<ApiClient> => {
    const client = await api.getClient<ApiClient>();
    
    // Check if the interceptor is already registered to avoid duplicates
    const extendedClient = client as ApiClient & { _idempotencyInterceptorAdded?: boolean };
    if (!extendedClient._idempotencyInterceptorAdded) {
        // Add Idempotency-Key to mutating requests
        extendedClient.interceptors.request.use((config) => {
            if (config.method && ['post', 'put', 'patch'].includes(config.method.toLowerCase())) {
                if (!config.headers['Idempotency-Key']) {
                    config.headers['Idempotency-Key'] = uuidv4();
                }
            }
            return config;
        });

        // Global Error Handling for 400 Bad Request
        extendedClient.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 400) {
                    console.error("Validation Error (400):", error.response.data);
                    const event = new CustomEvent('api:validation-error', { detail: error.response.data });
                    window.dispatchEvent(event);
                    return Promise.reject(new Error(error.response.data?.message || "Invalid request parameters."));
                }
                // SECURITY (audit F-A1): global 401 handler — redirect to landing
                // on expired session, matching vaultApi.ts behavior.
                if (error.response?.status === 401 && window.location.pathname !== '/') {
                    window.dispatchEvent(new CustomEvent('auth:session-expired'));
                    window.location.href = '/';
                }
                return Promise.reject(error);
            }
        );
        extendedClient._idempotencyInterceptorAdded = true;
    }

    return extendedClient;
};

export default api;
