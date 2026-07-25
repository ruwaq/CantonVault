// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

/**
 * Authentication hooks built on SWR.
 *
 * Session model (audit Fase 3, C-6): login exchanges a shared DEMO_TOKEN for an
 * HttpOnly cv_session cookie (signed by the edge). The browser then sends that
 * cookie automatically on every same-origin request. There is NO client-side
 * fallback user anymore — if /api/authenticated-user returns 401, the user is
 * null and RequireAuth redirects to /login. A transient backend failure (503,
 * timeout) is distinguished from a 401 so the demo still degrades gracefully,
 * but never by silently granting admin.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR, { mutate as globalMutate, type SWRConfiguration } from 'swr';
import { fetcher, FetchError } from '../lib/fetcher';

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
    revalidateOnFocus: false, // session cookie is valid for 8h; no need to re-check on focus
    refreshInterval: 0,
    dedupingInterval: 30_000,
    errorRetryCount: 1,
    // Do not retry 401s — that would hammer the backend while we redirect.
    onErrorRetry: (err, _key, _cfg, revalidate, opts) => {
        if (err instanceof FetchError && err.status === 401) return;
        revalidate(opts);
    },
};

/**
 * The authenticated user, or null when there is no session.
 * `isLoading` is true only on the very first load with no cached data.
 *
 * Note: a 401 from /api/authenticated-user also triggers a hard redirect in the
 * fetcher, so a stale session can never leave the user inside the app.
 */
export function useUser() {
    const { data, error, isLoading } = useSWR<AuthenticatedUser | null>(
        USER_KEY,
        () => fetcher<AuthenticatedUser>('/api/authenticated-user'),
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
        loginLinks: data ?? [{ name: 'CantonVault Demo', url: '/login' }],
        isLoading,
    };
}

/**
 * Perform a demo login. POSTs the DEMO_TOKEN (from VITE_DEMO_TOKEN, baked into
 * the SPA bundle — this is the documented demo limitation; a real deployment
 * would use an OAuth2 redirect to an external IdP) to /api/auth/login, which
 * returns the signed session cookie. After success, refetch the user.
 *
 * Returns true on success, false otherwise. The caller is responsible for any
 * post-login navigation (typically SWR will re-render and RequireAuth will let
 * the user through).
 */
export function useLogin() {
    return useCallback(async (): Promise<boolean> => {
        const token = import.meta.env.VITE_DEMO_TOKEN;
        if (!token) {
            console.error('VITE_DEMO_TOKEN is not set — cannot log in (demo limitation).');
            return false;
        }
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return false;
            // Prime the user cache so RequireAuth lets us through immediately.
            await globalMutate(USER_KEY);
            return true;
        } catch {
            return false;
        }
    }, []);
}

/** Logout: POST /api/auth/logout (clears the cookie), drop the user cache, navigate home. */
export function useLogout() {
    const navigate = useNavigate();
    return useCallback(async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        } catch {
            // best-effort
        }
        await globalMutate(USER_KEY, null, { revalidate: false });
        navigate('/');
    }, [navigate]);
}

/** Imperatively refetch the user (e.g. after an explicit login action). */
export function refreshUser() {
    return globalMutate(USER_KEY);
}
