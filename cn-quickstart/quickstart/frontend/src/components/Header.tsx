// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
import { useVaultStore } from '../stores/vaultStore';
import iconUrl from '../assets/cantonvault-icon.svg';

const Header: React.FC = () => {
    return (
        <header className="sticky-top">
            <nav className="navbar navbar-expand-lg glass-nav py-3">
                <div className="container">
                    <Link className="navbar-brand" to="/">
                        <img src={iconUrl} alt="" className="cv-brand-icon" />
                        <span className="cv-brand-text">CANTON<span className="cv-brand-accent">VAULT</span></span>
                    </Link>
                    <AuthenticatedLinks />
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
    const location = useLocation();

    if (loading || user === null) {
        return <span className="navbar-text text-on-glass small ms-3">Connecting…</span>;
    }

    const links = [
        { to: '/vault', label: 'Vault' },
    ];

    return (
        <ul className="navbar-nav ms-auto mb-2 mb-lg-0 gap-1 d-flex flex-row">
            {links.map((l) => {
                const active = location.pathname.startsWith(l.to);
                return (
                    <li className="nav-item" key={l.to}>
                        <Link
                            className={`nav-link cv-nav-link ${active ? 'cv-nav-link--active' : ''} ${l.label === 'Vault' ? 'nav-link-vault' : ''}`}
                            to={l.to}
                        >
                            {l.label}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
};

const UserSection: React.FC = () => {
    const { user, loading, logout } = useUserStore();

    if (loading) return <div className="ms-3 text-on-glass small">Loading...</div>;
    if (user === null) return null;

    return (
        <div className="d-flex align-items-center gap-3 ms-lg-3">
            <BalanceBadge />
            <div className="d-flex align-items-center gap-2 border-start border-secondary border-opacity-25 ps-3">
                <span className="text-white fw-medium small">{user.name}</span>
                <button className="btn btn-outline-light btn-sm" onClick={logout}>Exit</button>
            </div>
        </div>
    );
};

/** Shows the authenticated party's Canton Coin balance in the header. */
const BalanceBadge: React.FC = () => {
    // SWR fetches on mount automatically; no useEffect needed.
    const { balance } = useVaultStore();

    if (balance === null || balance === undefined) {
        return <span className="nav-link text-on-glass small">CC: —</span>;
    }
    return (
        <span className="cv-balance">
            <span className="badge bg-success me-2">CC</span>
            {balance.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </span>
    );
};

export default Header;
