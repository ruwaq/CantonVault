// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect } from 'react';
import { useUserStore } from '../stores/userStore';
import { useNavigate, Link } from 'react-router-dom';
import { shortParty } from '../utils/party';

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
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-5">
            {/* Welcoming Header */}
            <div className="card glass-panel mb-4 p-4 border-0 position-relative overflow-hidden">
                <div className="position-absolute" style={{
                    top: '-50px',
                    right: '-50px',
                    width: '200px',
                    height: '200px',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                    borderRadius: '50%'
                }} />
                <div className="row align-items-center g-3">
                    <div className="col-md-8">
                        <span className="badge bg-primary text-uppercase px-2.5 py-1 mb-2 small fw-bold">Active Session</span>
                        <h2 className="fw-bold text-white mb-2 fs-3">Welcome back, {user.name}</h2>
                        <p className="text-muted small mb-0">
                            Connected as node participant: <code className="bg-white bg-opacity-5 text-white px-2 py-0.5 rounded font-monospace">{shortParty(user.party)}</code>
                        </p>
                    </div>
                    <div className="col-md-4 text-md-end">
                        <Link to="/vault" className="btn btn-primary btn-lg shadow-sm px-4 fw-semibold">Open CantonVault &rarr;</Link>
                    </div>
                </div>
            </div>

            {/* Launchpad Grid */}
            <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
                <span>🚀</span> Daml Workspace Modules
            </h5>
            <div className="row g-4">
                <div className="col-md-4">
                    <div className="card h-100 glass-panel border-secondary border-opacity-10 hover-scale">
                        <div className="card-body p-4 d-flex flex-column justify-content-between text-center text-md-start">
                            <div>
                                <span className="fs-1 mb-3 d-inline-block">🛡️</span>
                                <h5 className="fw-bold text-white mb-2">Privacy Lab</h5>
                                <p className="text-muted small mb-4">
                                    Prove that third parties have absolute zero knowledge of your private ledger entries before dispute.
                                </p>
                            </div>
                            <Link to="/vault" className="btn btn-sm btn-outline-light w-100 py-2 fw-semibold mt-auto">Launch Privacy Test</Link>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card h-100 glass-panel border-secondary border-opacity-10 hover-scale">
                        <div className="card-body p-4 d-flex flex-column justify-content-between text-center text-md-start">
                            <div>
                                <span className="fs-1 mb-3 d-inline-block">🪙</span>
                                <h5 className="fw-bold text-white mb-2">Canton Coin Settlement</h5>
                                <p className="text-muted small mb-4">
                                    Transfer Splice standard Canton Coin assets atomically with full multi-party validation on payment.
                                </p>
                            </div>
                            <Link to="/vault" className="btn btn-sm btn-outline-light w-100 py-2 fw-semibold mt-auto">Settle Commitments</Link>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card h-100 glass-panel border-secondary border-opacity-10 hover-scale">
                        <div className="card-body p-4 d-flex flex-column justify-content-between text-center text-md-start">
                            <div>
                                <span className="fs-1 mb-3 d-inline-block">📜</span>
                                <h5 className="fw-bold text-white mb-2">Daml Licenses</h5>
                                <p className="text-muted small mb-4">
                                    Audit active software license agreements, track contract expiration limits, and request renewals.
                                </p>
                            </div>
                            <Link to="/licenses" className="btn btn-sm btn-outline-light w-100 py-2 fw-semibold mt-auto">Manage Licenses</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeView;
