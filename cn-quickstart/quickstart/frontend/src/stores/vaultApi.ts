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

export default vaultClient;
