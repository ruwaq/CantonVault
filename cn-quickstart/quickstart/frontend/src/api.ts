// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import OpenAPIClientAxios, { type Document } from 'openapi-client-axios';
import openApi from '../../common/openapi.yaml'

const api: OpenAPIClientAxios = new OpenAPIClientAxios({
    definition: openApi as Document,
    withServer: { url: '/api' },
});

/**
 * Global 401 handler: when any API call receives a 401 (expired session,
 * missing auth), clear the in-memory user state and redirect to the landing
 * page so the user can re-authenticate rather than seeing a stale UI.
 *
 * Uses a DOM CustomEvent so stores can subscribe without circular imports.
 */
function onSessionExpired() {
    // Avoid redirect loops on the login page itself
    if (window.location.pathname !== '/') {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        window.location.href = '/';
    }
}

api.init().then(() => {
    api.client.defaults.withCredentials = true;
    api.client.defaults.withXSRFToken = true;
    api.client.defaults.xsrfCookieName = 'XSRF-TOKEN';
    api.client.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';

    // Global 401 interceptor: expired/revoked sessions redirect to landing
    api.client.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                onSessionExpired();
            }
            return Promise.reject(error);
        },
    );
});

export default api;
