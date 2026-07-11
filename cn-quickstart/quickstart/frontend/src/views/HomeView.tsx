// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect } from 'react';
import { useUserStore } from '../stores/userStore';
import { useNavigate, Link } from 'react-router-dom';

const HomeView: React.FC = () => {
    const { user, loading } = useUserStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user === null) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    if (loading || user === null) {
        return (
            <div className="d-flex justify-content-center mt-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading…</span>
                </div>
            </div>
        );
    }

    return (
        <main>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2>Welcome back, {user.name}</h2>
                    <p className="text-muted">You are acting as party <code>{user.party}</code>.</p>
                </div>
                <Link to="/vault" className="btn btn-primary btn-lg">Open CantonVault →</Link>
            </div>
            <div className="row g-3">
                <div className="col-md-4">
                    <div className="card text-center h-100">
                        <div className="card-body">
                            <h5 className="card-title">🔐 Privacy Lab</h5>
                            <p className="card-text small text-muted">Prove that third parties see nothing until a dispute.</p>
                            <Link to="/vault" className="btn btn-outline-primary btn-sm">Try it</Link>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card text-center h-100">
                        <div className="card-body">
                            <h5 className="card-title">🪙 Canton Coin</h5>
                            <p className="card-text small text-muted">Real atomic settlement via the Splice token standard.</p>
                            <Link to="/vault" className="btn btn-outline-primary btn-sm">Settle</Link>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card text-center h-100">
                        <div className="card-body">
                            <h5 className="card-title">📜 Licenses</h5>
                            <p className="card-text small text-muted">Reference licensing workspace.</p>
                            <Link to="/licenses" className="btn btn-outline-primary btn-sm">View</Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default HomeView;
