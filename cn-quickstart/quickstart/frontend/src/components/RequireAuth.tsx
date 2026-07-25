// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import { useUserStore } from '../stores/userStore';

/**
 * Wraps authenticated routes. The demo is stateless — useUser() always returns
 * a user (either from the API or a hardcoded fallback). This component just
 * shows a spinner while the first fetch is in flight, then renders children.
 * It never redirects to /login.
 */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { loading } = useUserStore();

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

    return <>{children}</>;
};

export default RequireAuth;