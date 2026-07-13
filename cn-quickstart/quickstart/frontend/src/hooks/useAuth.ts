// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

/**
 * Authentication hooks built on SWR.
 *
 * Replaces the old userStore's manual `fetchUser` + `useState(loading)` +
 * `useEffect` trio. SWR owns the fetch lifecycle: there is no `loading` flag
 * for consumers to flip, so the RequireAuth guard can never enter the
 * remount loop that previously pounded the backend with requests.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR, { mutate as globalMutate, type SWRConfiguration } from 'swr';
import { fetcher } from '../lib/fetcher';

/** Shape returned by the Pages Function GET /api/authenticated-user. */
export interface AuthenticatedUser {
    name: string;
    party: string;
    isAdmin: boolean;
    ledgerOffset?: string;
    /** Optional wallet URL (LocalNet backend only; absent on DevNet). */
    walletUrl?: string;
}

export interface LoginLink {
    name: string;
    url: string;
}

/** SWR key for the authenticated session. */
const USER_KEY = ['user'] as const;
const LOGIN_LINKS_KEY = ['login-links'] as const;

const USER_SWR_CONFIG: SWRConfiguration = {
    revalidateOnFocus: false, // session is stateless on DevNet; no need to re-check on focus
    refreshInterval: 0,
    dedupingInterval: 30_000, // the demo session is stable; don't re-fetch more than once per 30s
    errorRetryCount: 2,
};

/**
 * The authenticated user, or null if unauthenticated / unreachable.
 * `isLoading` is true only on the very first load with no cached data.
 */
export function useUser() {
    const { data, error, isLoading } = useSWR<AuthenticatedUser | null>(
        USER_KEY,
        () =>
            fetcher<AuthenticatedUser>('/api/authenticated-user').catch((err) => {
                // 503 = DevNet temporarily unreachable; treat as logged-out for the demo.
                if (err?.status === 503) return null;
                throw err;
            }),
        USER_SWR_CONFIG,
    );
    return { user: data ?? null, error, isLoading };
}

/** Login links for the login view. Falls back to a demo link on error. */
export function useLoginLinks() {
    const { data, isLoading } = useSWR<LoginLink[]>(
        LOGIN_LINKS_KEY,
        () => fetcher<LoginLink[]>('/api/login-links'),
        { revalidateOnFocus: false, dedupingInterval: 60_000 },
    );
    return {
        loginLinks: data ?? [{ name: 'CantonVault Demo', url: '/vault' }],
        isLoading,
    };
}

/** Logout: POST /api/logout, clear the user cache, navigate to landing. */
export function useLogout() {
    const navigate = useNavigate();
    return useCallback(async () => {
        try {
            await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
        } catch {
            // best-effort — the demo session is stateless
        }
        await globalMutate(USER_KEY, null, { revalidate: false });
        navigate('/');
    }, [navigate]);
}

/** Imperatively refetch the user (e.g. after an explicit login action). */
export function refreshUser() {
    return globalMutate(USER_KEY);
}
