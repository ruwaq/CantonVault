// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';

const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useUserStore();

    if (loading) {
        return (
            <div className="d-flex justify-content-center mt-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!user?.isAdmin) {
        return <Navigate to="/home" replace />;
    }

    return <>{children}</>;
};

export default RequireAdmin;
