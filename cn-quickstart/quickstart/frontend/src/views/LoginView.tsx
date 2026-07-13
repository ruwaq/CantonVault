// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useLoginLinks } from '../hooks/useAuth';
import './login.css';

/**
 * Login view. The DevNet demo session is stateless: GET /api/authenticated-user
 * always returns the demo operator, so if the user lands here with a reachable
 * backend we skip straight into the vault.
 */
const LoginView: React.FC = () => {
    const navigate = useNavigate();
    const { user, isLoading } = useUser();
    const { loginLinks, isLoading: linksLoading } = useLoginLinks();

    useEffect(() => {
        if (!isLoading && user !== null) {
            navigate('/vault', { replace: true });
        }
    }, [isLoading, user, navigate]);

    const startLogin = (url: string) => {
        // Internal links go through the router; external OAuth URLs hard-navigate.
        if (url.startsWith('/')) {
            navigate(url);
        } else {
            window.location.assign(url);
        }
    };

    return (
        <div className="cv-login">
            <div className="cv-login-bg" />
            <div className="cv-login-card">
                <div className="cv-login-mark">🔐</div>
                <h1>CantonVault</h1>
                <p className="cv-login-sub">Access the privacy-preserving commitment demo on Canton Network.</p>
                {linksLoading ? (
                    <p className="cv-login-note">Preparing demo session…</p>
                ) : (
                    <div className="cv-login-actions">
                        {loginLinks.map((link) => (
                            <button
                                key={link.url}
                                className="btn cv-login-enter"
                                onClick={() => startLogin(link.url)}
                                type="button"
                            >
                                Continue as {link.name}
                            </button>
                        ))}
                    </div>
                )}
                <p className="cv-login-note">The demo session is stateless and runs on the Canton DevNet.</p>
            </div>
        </div>
    );
};

export default LoginView;
