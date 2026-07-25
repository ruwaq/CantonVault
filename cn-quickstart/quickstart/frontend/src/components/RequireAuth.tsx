// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';

/**
 * Wraps authenticated routes. With the Fase 3 session-cookie model, a null user
 * (no valid cv_session cookie) redirects to /login. While the first fetch is in
 * flight we show a spinner. This is the client-side gate; the real authorization
 * boundary is the edge middleware that rejects unauthenticated /api/* calls.
 */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useUserStore();

    if (loading) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center mt-5 pt-5">
                <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading…</span>
                </div>
                <p className="text-on-glass">Connecting to Canton DevNet…</p>
            </div>
        );
    }

    // No session → go log in. (The fetcher also hard-redirects on a 401, but this
    // covers the initial-mount case where user is null without a fetch yet.)
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default RequireAuth;
