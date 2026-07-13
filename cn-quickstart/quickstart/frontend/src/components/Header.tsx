// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
import { useVaultStore } from '../stores/vaultStore';

const Header: React.FC = () => {
    return (
        <header className="sticky-top">
            <nav className="navbar navbar-expand-lg glass-nav py-3">
                <div className="container">
                    <a className="navbar-brand" href="#">
                        <span className="fs-4">🏦</span> CantonVault
                    </a>
                    <div>
                        <button
                            className="navbar-toggler"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#navbarNav"
                            aria-controls="navbarNav"
                            aria-expanded="false"
                            aria-label="Toggle navigation"
                        >
                            <span className="navbar-toggler-icon"></span>
                        </button>
                    </div>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <AuthenticatedLinks />
                    </div>
                    <div className="d-none d-lg-flex">
                        <UserSection />
                    </div>
                </div>
            </nav>
        </header>
    );
};

const AuthenticatedLinks: React.FC = () => {
    const { user, loading } = useUserStore();

    if (loading || user === null) {
        return (
            <ul className="navbar-nav ms-4 mb-2 mb-lg-0 gap-2">
                <li className="nav-item"><span className="nav-link text-muted">Loading…</span></li>
            </ul>
        );
    }

    return (
        <ul className="navbar-nav ms-4 mb-2 mb-lg-0 gap-2">
            <li className="nav-item">
                <Link className="nav-link" to="/home">Home</Link>
            </li>
            <li className="nav-item">
                <Link className="nav-link" to="/app-installs">Apps</Link>
            </li>
            <li className="nav-item">
                <Link className="nav-link" to="/licenses">Licenses</Link>
            </li>
            <li className="nav-item">
                <Link className="nav-link fw-bold nav-link-vault" to="/vault">Vault</Link>
            </li>
            {user.isAdmin && (
                <li className="nav-item">
                    <Link className="nav-link" to="/tenants">Tenants</Link>
                </li>
            )}
        </ul>
    );
};

const UserSection: React.FC = () => {
    const { user, loading, logout } = useUserStore();

    if (loading) return <div className="ms-auto text-muted">Loading...</div>;

    if (user === null) {
        return (
            <ul className="navbar-nav ms-auto">
                <li className="nav-item">
                    <Link className="btn btn-primary btn-sm px-4" to="/login">Login</Link>
                </li>
            </ul>
        );
    }

    return (
        <div className="d-flex align-items-center gap-3">
            <BalanceBadge />
            <div className="d-flex align-items-center gap-2 border-start border-secondary ps-3">
                <span className="text-white fw-medium small" id="user-name">
                    {user.name}
                </span>
                <button className="btn btn-outline-light btn-sm" onClick={logout}>
                    Logout
                </button>
            </div>
        </div>
    );
};

/** Shows the authenticated party's Canton Coin balance in the header. */
const BalanceBadge: React.FC = () => {
    const { balance, fetchBalance } = useVaultStore();
    useEffect(() => { fetchBalance(); }, [fetchBalance]);

    if (balance === null || balance === undefined) {
        return <span className="nav-link text-muted small">CC: —</span>;
    }
    return (
        <span className="nav-link small">
            <span className="badge bg-success me-1">CC</span>
            {balance.toFixed(2)}
        </span>
    );
};

export default Header;
