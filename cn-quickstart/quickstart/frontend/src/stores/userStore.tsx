// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { createContext, useContext, useState, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { useToast } from './toastStore';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import type { AuthenticatedUser, Client } from "../openapi.d.ts";

interface UserContextType {
    user: AuthenticatedUser | null;
    loading: boolean;
    fetchUser: () => Promise<void>;
    /** Transparent "connect" — if no session exists, authenticate as the demo
     *  party automatically. Mirrors the wallet-connect UX of a dApp: the visitor
     *  never sees a login form, they just arrive ready to transact. */
    autoConnect: () => Promise<void>;
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

    /** dApp-style connect: try the session, and if there is none, authenticate as
     *  the demo party via a silent form POST, then refetch. Resolves once the user
     *  is available (or if login fails). */
    const autoConnect = useCallback(async () => {
        const current = await fetchUser();
        if (current !== null) return; // already connected (fresh value, not closure)
        // Silent POST to Spring Security form login; the browser follows the 302
        // and sets the JSESSIONID cookie. We then refetch the authenticated user.
        try {
            const params = new URLSearchParams();
            params.append('username', 'app-provider');
            params.append('password', '');
            await fetch('/login', { method: 'POST', body: params, redirect: 'manual' });
            await fetchUser();
        } catch {
            toast.displayError('Could not connect to the Canton node');
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
