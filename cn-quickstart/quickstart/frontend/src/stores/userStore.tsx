// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

/**
 * Thin facade over the SWR-based `useAuth` hooks.
 *
 * History: this store previously owned a manual `useState(loading)` +
 * `fetchUser` + `useEffect` fetch cycle. That coupling let a downstream view
 * (VaultView) call `fetchUser()` on mount, flip `loading=true`, and cause the
 * RequireAuth guard to unmount and remount it in an infinite loop — generating
 * enough traffic to trip Cloudflare's abuse limit.
 *
 * SWR now owns the lifecycle. This file preserves the `useUserStore()` hook
 * signature so existing consumers (RequireAuth, Header, LoginView, VaultView)
 * keep compiling while delegating to the SWR hooks.
 */

export type { AuthenticatedUser } from '../hooks/useAuth';
import React from 'react';
import { useUser, useLogout, refreshUser } from '../hooks/useAuth';

export interface UserContextType {
    user: ReturnType<typeof useUser>['user'];
    loading: boolean;
    error: ReturnType<typeof useUser>['error'];
    fetchUser: (silent?: boolean) => Promise<unknown>;
    clearUser: () => void;
    logout: ReturnType<typeof useLogout>;
}

/**
 * Hook (not a Provider) — SWR's global cache replaces React Context.
 * Consumers call `useUserStore()` exactly as before.
 */
export const useUserStore = (): UserContextType => {
    const { user, isLoading, error } = useUser();
    const logout = useLogout();

    return {
        user,
        loading: isLoading,
        error,
        // fetchUser delegates to SWR's mutate (silent is kept for API compat;
        // with SWR there is no `loading` flip to worry about either way).
        fetchUser: (_silent?: boolean) => refreshUser(),
        clearUser: () => refreshUser(),
        logout,
    };
};

// Kept for backwards compatibility with App.tsx imports; SWR uses a global
// cache so this is now a passthrough Fragment.
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <>{children}</>
);
