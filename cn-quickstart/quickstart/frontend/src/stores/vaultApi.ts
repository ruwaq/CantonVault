// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import axios, { type AxiosInstance } from 'axios';

/**
 * Dedicated HTTP client for the CantonVault backend.
 *
 * The Vault endpoints live on a hand-rolled controller (`@RequestMapping("/vault")`)
 * that is NOT part of common/openapi.yaml, so they cannot use the shared typed
 * OpenAPIClientAxios instance in src/api.ts. We keep a thin dedicated client here,
 * mirroring the rest of the app (CSRF cookie trust + baseURL under the Vite proxy).
 */
const vaultClient: AxiosInstance = axios.create({
    baseURL: '/api/vault',
    withCredentials: true,
    withXSRFToken: true,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
});

/**
 * Global 401 handler: redirect to landing page on expired session.
 * Mirrors the interceptor in src/api.ts so both HTTP clients behave consistently.
 */
vaultClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && window.location.pathname !== '/') {
            window.dispatchEvent(new CustomEvent('auth:session-expired'));
            window.location.href = '/';
        }
        return Promise.reject(error);
    },
);

export default vaultClient;
