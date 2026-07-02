// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
import './login.css';

/**
 * One-click demo entry. Canton requires a party identity to sign ledger
 * commands, so we authenticate as the AppProvider party automatically — the
 * visitor never sees usernames, roles, or shared-secret jargon.
 */
const LoginView: React.FC = () => {
    const navigate = useNavigate();
    const { user, fetchUser } = useUserStore();

    useEffect(() => { fetchUser(); }, [fetchUser]);
    useEffect(() => { if (user !== null) navigate('/home'); }, [user, navigate]);

    /** POST the Spring Security form programmatically and let the browser follow the redirect. */
    const enterDemo = () => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/login';
        const u = document.createElement('input');
        u.type = 'hidden'; u.name = 'username'; u.value = 'app-provider';
        const p = document.createElement('input');
        p.type = 'hidden'; p.name = 'password'; p.value = '';
        form.appendChild(u); form.appendChild(p);
        document.body.appendChild(form);
        form.submit();
    };

    return (
        <div className="cv-login">
            <div className="cv-login-bg" />
            <div className="cv-login-card">
                <div className="cv-login-mark">🔐</div>
                <h1>CantonVault</h1>
                <p className="cv-login-sub">Privacy-first conditional commitments on Canton Network</p>
                <button className="btn cv-login-enter" onClick={enterDemo}>
                    Enter the demo →
                </button>
                <p className="cv-login-note">No signup. One click and you're in.</p>
            </div>
        </div>
    );
};

export default LoginView;
