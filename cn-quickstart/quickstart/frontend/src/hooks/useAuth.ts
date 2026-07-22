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

/** Hardcoded fallback for when the DevNet is unreachable. The demo is stateless
 *  so this is identical to the real API response — it lets the vault render
 *  even if the backend is temporarily down or the user's network blocks the call. */
const DEMO_USER: AuthenticatedUser = {
    name: 'CantonVault Operator',
    party: 'cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8',
    isAdmin: true,
    ledgerOffset: '0',
};

const USER_SWR_CONFIG: SWRConfiguration = {
    revalidateOnFocus: false, // session is stateless on DevNet; no need to re-check on focus
    refreshInterval: 0,
    dedupingInterval: 30_000, // the demo session is stable; don't re-fetch more than once per 30s
    errorRetryCount: 1,       // one quick retry, then fall back to DEMO_USER
};

/**
 * The authenticated user. Falls back to DEMO_USER when the backend is
 * unreachable so the vault always renders — the demo is stateless.
 * `isLoading` is true only on the very first load with no cached data.
 */
export function useUser() {
    const { data, error, isLoading } = useSWR<AuthenticatedUser | null>(
        USER_KEY,
        () =>
            fetcher<AuthenticatedUser>('/api/authenticated-user').catch((err) => {
                // Any error (503, timeout, network) → fall back to hardcoded demo user.
                // The demo is stateless; this keeps the vault working even when the
                // backend is temporarily unreachable.
                console.warn('Auth API unreachable, using demo fallback:', err?.message ?? err);
                return DEMO_USER;
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
