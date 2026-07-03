// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { isAxiosError } from 'axios';
import { useToast } from './toastStore';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import type { AuthenticatedUser, Client } from "../openapi.d.ts";

interface UserContextType {
    user: AuthenticatedUser | null;
    loading: boolean;
    fetchUser: () => Promise<AuthenticatedUser | null>;
    /** Transparent "connect" — if no session exists, authenticate as the demo
     *  party automatically. Mirrors the wallet-connect UX of a dApp: the visitor
     *  never sees a login form, they just arrive ready to transact. */
    autoConnect: () => Promise<boolean>;
    clearUser: () => void;
    logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthenticatedUser | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const toast = useToast();
    const navigate = useNavigate();

    const fetchUser = useCallback(async (): Promise<AuthenticatedUser | null> => {
        setLoading(true);
        try {
            const client: Client = await api.getClient();
            const response = await client.getAuthenticatedUser();
            setUser(response.data);
            return response.data;
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 401) {
                setUser(null);
                return null;
            } else {
                toast.displayError('Error fetching user');
                return null;
            }
        } finally {
            setLoading(false);
        }
    }, [setUser, setLoading, toast]);

    const clearUser = useCallback(() => {
        setUser(null);
    }, [setUser]);

    /** Listen for global 401 interceptors so state is cleared before redirect. */
    useEffect(() => {
        const handler = () => clearUser();
        window.addEventListener('auth:session-expired', handler);
        return () => window.removeEventListener('auth:session-expired', handler);
    }, [clearUser]);

    /** dApp-style connect: try the session, and if there is none, authenticate as
     *  the demo party via a silent form POST, then refetch. Returns true if
     *  connected successfully, false otherwise. */
    const autoConnect = useCallback(async (): Promise<boolean> => {
        const current = await fetchUser();
        if (current !== null) return true; // already connected (fresh value, not closure)
        // Server-side demo session: the backend authenticates as the demo party
        // and sets the JSESSIONID cookie. The demo token is injected at build
        // time via VITE_DEMO_TOKEN — if blank the backend will reject with 404.
        try {
            const demoToken = import.meta.env.VITE_DEMO_TOKEN;
            const response = await fetch('/api/demo-session', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ demoToken: demoToken || '' }),
            });

            if (response.status === 404) {
                // Demo mode is disabled — the visitor must authenticate via another path
                return false;
            }

            if (!response.ok) {
                toast.displayError('Demo authentication failed');
                return false;
            }

            await fetchUser();
            return true;
        } catch {
            toast.displayError('Could not connect to the Canton node');
            return false;
        }
    }, [fetchUser, toast]);

    const getCsrfToken = (): string => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    };

    const logout = useCallback(async () => {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
            });
            if (response.ok) {
                clearUser();
                navigate('/');
            } else {
                toast.displayError('Error logging out');
            }
        } catch (error) {
            toast.displayError('Error logging out');
        }
    }, [clearUser, toast, navigate, getCsrfToken]);

    return (
        <UserContext.Provider value={{ user, loading, fetchUser, autoConnect, clearUser, logout }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUserStore = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
