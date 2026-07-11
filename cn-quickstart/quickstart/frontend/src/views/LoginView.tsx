// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
import api from '../api';
import type { Client, LoginLink } from '../openapi.d.ts';
import './login.css';

const LoginView: React.FC = () => {
    const navigate = useNavigate();
    const { user, loading } = useUserStore();
    const [loginLinks, setLoginLinks] = useState<LoginLink[]>([]);
    const [linksLoading, setLinksLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && user !== null) {
            navigate('/home');
        }
    }, [loading, user, navigate]);

    useEffect(() => {
        let active = true;

        const loadLoginLinks = async () => {
            setLinksLoading(true);
            try {
                const client: Client = await api.getClient();
                const response = await client.listLinks();
                if (!active) {
                    return;
                }
                setLoginLinks(response.data);
                setError(response.data.length === 0 ? 'No login providers are configured yet.' : null);
            } catch {
                if (active) {
                    setError('Could not load login providers. Please try again in a moment.');
                }
            } finally {
                if (active) {
                    setLinksLoading(false);
                }
            }
        };

        void loadLoginLinks();

        return () => {
            active = false;
        };
    }, []);

    const startLogin = (url: string) => {
        window.location.assign(url);
    };

    return (
        <div className="cv-login">
            <div className="cv-login-bg" />
            <div className="cv-login-card">
                <div className="cv-login-mark">🔐</div>
                <h1>CantonVault</h1>
                <p className="cv-login-sub">Sign in with your organization's identity provider to access CantonVault.</p>
                {linksLoading ? <p className="cv-login-note">Loading login providers...</p> : null}
                {error ? <p className="cv-login-error">{error}</p> : null}
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
                <p className="cv-login-note">Authentication is handled server-side via OAuth2/OIDC.</p>
            </div>
        </div>
    );
};

export default LoginView;
