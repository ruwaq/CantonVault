// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

/**
 * SWR fetcher with an 8s timeout guard.
 *
 * The timeout is load-bearing: without it, a stalled backend leaves the SWR
 * query pending forever, which keeps `isLoading` true and can trap the UI in a
 * spinner (the exact bug that previously caused an infinite remount loop). With
 * it, a slow/unreachable backend resolves as an error that SWR can retry with
 * backoff instead of hanging indefinitely.
 */

/** Error thrown when the fetcher gets a non-OK HTTP response or times out. */
export class FetchError extends Error {
    constructor(
        message: string,
        public status: number,
    ) {
        super(message);
        this.name = 'FetchError';
    }
}

/**
 * Typed SWR fetcher. Usage: `useSWR<T>('/api/...', fetcher)`.
 *
 * On a 401 it hard-redirects to /login. This is the single load-bearing auth
 * boundary for the read paths (audit Fase 3, H-9): the previous interceptor
 * lived in api.ts/vaultApi.ts (axios clients that are not used by the vault read
 * flow), so the SWR fetcher silently swallowed 401s. Now a 401 from
 * /api/authenticated-user or any /api/vault/* read drops the user at the login
 * screen instead of leaving a broken, unauthenticated view.
 *
 * @param url   absolute or origin-relative URL
 * @param init  optional extra RequestInit (headers, etc.)
 * @returns     parsed JSON typed as T
 */
export async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
        const res = await fetch(url, {
            credentials: 'same-origin',
            signal: controller.signal,
            ...init,
        });
        if (!res.ok) {
            // Hard auth boundary: a 401 means no/invalid session cookie → go login.
            // Avoid redirect loops: don't redirect if we're already on a public route.
            if (res.status === 401 && !window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
                // Throw so SWR treats this as an error and stops the chain.
                throw new FetchError('Session expired — redirecting to login', 401);
            }
            // Surface the status so callers / SWR onErrorRetry can branch on it.
            throw new FetchError(`Request to ${url} failed`, res.status);
        }
        return (await res.json()) as T;
    } finally {
        clearTimeout(timeout);
    }
}
