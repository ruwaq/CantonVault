// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useLoginLinks, useLogin } from '../hooks/useAuth';
import './login.css';

/**
 * Login view. With the Fase 3 session-cookie model, clicking "Continue" POSTs
 * the DEMO_TOKEN to /api/auth/login; the edge returns a signed cv_session cookie
 * and SWR then refetches /api/authenticated-user, after which this view's
 * useEffect navigates into the vault.
 *
 * Demo limitation: the DEMO_TOKEN is baked into the SPA bundle via
 * VITE_DEMO_TOKEN. A real deployment would replace this with an OAuth2 redirect
 * to an external IdP (see SECURITY.md, Fase 3).
 */
const LoginView: React.FC = () => {
    const navigate = useNavigate();
    const { user, isLoading } = useUser();
    const { loginLinks, isLoading: linksLoading } = useLoginLinks();
    const login = useLogin();
    const [busy, setBusy] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

    // If we already have a valid session, skip straight into the vault.
    useEffect(() => {
        if (!isLoading && user !== null) {
            navigate('/vault', { replace: true });
        }
    }, [isLoading, user, navigate]);

    const startLogin = async (url: string) => {
        // Internal links go through the router. External URLs must be an exact
        // http(s) origin (audit Fase 3, M-4): reject javascript: and other schemes.
        if (url.startsWith('/')) {
            navigate(url);
            return;
        }
        const parsed = (() => {
            try {
                return new URL(url);
            } catch {
                return null;
            }
        })();
        if (parsed && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
            window.location.assign(url);
        } else {
            setLoginError('Invalid login URL');
        }
    };

    const handleDemoLogin = async () => {
        setBusy(true);
        setLoginError(null);
        const ok = await login();
        setBusy(false);
        if (!ok) {
            setLoginError('Login failed — the demo may be misconfigured (VITE_DEMO_TOKEN missing or DEMO_TOKEN unset on the edge).');
            return;
        }
        // SWR has now primed the user; the useEffect above will navigate.
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
                        {loginLinks.map((link) => {
                            // The internal demo link triggers the cookie login flow;
                            // external links (future OAuth) hard-navigate.
                            const isDemoInternal = link.url.startsWith('/');
                            return (
                                <button
                                    key={link.url}
                                    className="btn cv-login-enter"
                                    onClick={() => (isDemoInternal ? handleDemoLogin() : startLogin(link.url))}
                                    disabled={busy}
                                    type="button"
                                >
                                    {busy ? 'Signing in…' : `Continue as ${link.name}`}
                                </button>
                            );
                        })}
                    </div>
                )}
                {loginError && <p className="cv-login-note" role="alert">{loginError}</p>}
                <p className="cv-login-note">The demo session runs on the Canton DevNet.</p>
            </div>
        </div>
    );
};

export default LoginView;
