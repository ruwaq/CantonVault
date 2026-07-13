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
            // Surface the status so callers / SWR onErrorRetry can branch on it.
            throw new FetchError(`Request to ${url} failed`, res.status);
        }
        return (await res.json()) as T;
    } finally {
        clearTimeout(timeout);
    }
}
