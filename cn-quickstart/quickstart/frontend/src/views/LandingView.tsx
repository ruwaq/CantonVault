// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoUrl from '../assets/cantonvault-logo.svg';
import './landing.css';

const JOURNEY: { icon: string; title: string; desc: string }[] = [
    { icon: '📝', title: 'Propose', desc: 'Draft a private commitment between two parties' },
    { icon: '⚡', title: 'Act', desc: 'Fulfill with real Canton Coin or raise a dispute' },
    { icon: '🛡️', title: 'Privacy Lab', desc: 'Prove the third party ledger stays empty' },
];

const LandingView: React.FC = () => {
    const navigate = useNavigate();

    const launch = () => navigate('/vault');

    return (
        <div className="cv-landing">
            <div className="cv-landing-bg" />
            <div className="cv-aurora cv-aurora-1" />
            <div className="cv-aurora cv-aurora-2" />

            <main className="cv-hero">
                <div className="cv-hero-badge">
                    <span className="cv-dot" /> Live on Canton Network DevNet
                </div>

                <img src={logoUrl} alt="CantonVault" className="cv-logo" />
                <p className="cv-tagline">
                    Privacy-first conditional commitments for institutional trade finance.
                </p>

                <button onClick={launch} className="cv-launch">
                    Launch Live Demo
                    <span className="cv-launch-arrow">→</span>
                </button>

                <p className="cv-sub">
                    Two parties commit to a deal. A third party sees <strong>nothing</strong> —
                    not encrypted, just absent from their ledger. Try it in 60 seconds.
                </p>

                <div className="cv-journey">
                    {JOURNEY.map((step, i) => (
                        <React.Fragment key={step.title}>
                            <div className="cv-step">
                                <span className="cv-step-icon">{step.icon}</span>
                                <span className="cv-step-title">{step.title}</span>
                                <span className="cv-step-desc">{step.desc}</span>
                            </div>
                            {i < JOURNEY.length - 1 && <span className="cv-step-arrow">→</span>}
                        </React.Fragment>
                    ))}
                </div>
            </main>

            <footer className="cv-footer">
                <a href="https://github.com/ruwaq/CantonVault" target="_blank" rel="noreferrer">GitHub</a>
                <span className="cv-footer-sep">·</span>
                <a href="https://www.canton.network" target="_blank" rel="noreferrer">Canton Network</a>
                <span className="cv-footer-sep">·</span>
                <span>MIT License</span>
            </footer>
        </div>
    );
};

export default LandingView;
