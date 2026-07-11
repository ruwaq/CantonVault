// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
import './landing.css';

const LandingView: React.FC = () => {
    const { user, loading } = useUserStore();
    const navigate = useNavigate();
    const [connecting, setConnecting] = useState(false);

    const launch = async () => {
        setConnecting(true);
        const target = user !== null ? '/vault' : '/login';
        setConnecting(false);
        navigate(target);
    };

    const launchLabel = connecting
        ? 'Opening...'
        : loading
            ? 'Checking session...'
            : (user ? 'Open CantonVault →' : 'Sign in to continue →');

    return (
        <div className="cv-landing">
            {/* ── Hero ── */}
            <section className="cv-hero">
                <div className="cv-hero-bg" />
                <div className="container cv-hero-content">
                    <span className="cv-badge">Canton Network · Production Blueprint</span>
                    <h1 className="cv-hero-title">CantonVault</h1>
                    <p className="cv-hero-tagline">
                        Privacy-first conditional commitments for institutional finance.
                    </p>
                    <p className="cv-hero-sub">
                        Two parties commit to a deal. A third party sees <strong>nothing</strong> —
                        not because it's encrypted, but because the contract <em>does not exist</em> on
                        their ledger. Privacy is an emergent property of the protocol, not a bolted-on layer.
                    </p>
                    <div className="cv-hero-cta">
                        <button onClick={launch} disabled={connecting} className="btn btn-light btn-lg cv-btn-launch">
                            {launchLabel}
                        </button>
                        <a href="#how" className="btn btn-outline-light btn-lg cv-btn-ghost">How it works ↓</a>
                    </div>
                    <div className="cv-hero-stats">
                        <div><strong>12</strong><span>tests passing</span></div>
                        <div><strong>5</strong><span>Daml templates</span></div>
                        <div><strong>100%</strong><span>real settlement</span></div>
                    </div>
                </div>
            </section>

            {/* ── The Problem ── */}
            <section className="cv-section">
                <div className="container">
                    <h2 className="cv-section-title">The problem</h2>
                    <p className="cv-section-lead">
                        Institutional finance forces a binary choice: full transparency (everyone sees everything)
                        or trust-based opacity (unverifiable). Neither works.
                    </p>
                    <div className="row g-4 mt-2">
                        <div className="col-md-4">
                            <div className="cv-card cv-card-danger">
                                <div className="cv-card-icon">💸</div>
                                <h3>Double-factoring</h3>
                                <p>The same invoice is financed by multiple lenders. Billions lost annually because no one can verify without exposing the relationship.</p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="cv-card cv-card-danger">
                                <div className="cv-card-icon">📉</div>
                                <h3>OTC leakage</h3>
                                <p>Block-trade terms leak to competitors before execution. The market moves against you. Privacy isn't a luxury — it's alpha.</p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="cv-card cv-card-danger">
                                <div className="cv-card-icon">📋</div>
                                <h3>Compliance cost</h3>
                                <p>Basel III and MiCA demand on-demand reporting. Today that means exposing your entire book. Regulators should see only what they need.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── The Solution ── */}
            <section className="cv-section cv-section-dark" id="how">
                <div className="container">
                    <h2 className="cv-section-title">The solution, explained simply</h2>
                    <p className="cv-section-lead cv-light">
                        CantonVault is a Daml primitive: a conditional commitment where privacy is the default,
                        and disclosure happens on-demand — field by field.
                    </p>

                    <div className="cv-flow">
                        <div className="cv-flow-step">
                            <div className="cv-flow-num">1</div>
                            <h4>Propose</h4>
                            <p>A supplier creates a commitment: <em>"Buyer pays 5,000 CC by Friday."</em> The financier accepts. <strong>The arbitrator's ledger is empty.</strong></p>
                        </div>
                        <div className="cv-flow-arrow">→</div>
                        <div className="cv-flow-step">
                            <div className="cv-flow-num">2</div>
                            <h4>Act</h4>
                            <p>Delivery confirmed → <strong>Fulfill</strong> atomically transfers Canton Coin. Or if something goes wrong → <strong>Dispute</strong> escalates to the arbitrator.</p>
                        </div>
                        <div className="cv-flow-arrow">→</div>
                        <div className="cv-flow-step">
                            <div className="cv-flow-num">3</div>
                            <h4>Disclose</h4>
                            <p>Only on dispute does the arbitrator learn the contract exists — and sees <strong>only the amount and description</strong>. Nothing else. Ever.</p>
                        </div>
                    </div>

                    {/* ── The privacy table ── */}
                    <div className="cv-privacy-table-wrap">
                        <h3 className="cv-table-title">Who sees what (the privacy guarantee)</h3>
                        <div className="table-responsive">
                            <table className="table cv-privacy-table">
                                <thead>
                                    <tr>
                                        <th>Party</th>
                                        <th>Sees the proposal</th>
                                        <th>Sees the commitment</th>
                                        <th>Sees the amount</th>
                                        <th>After dispute</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Proposer</strong> (supplier)</td>
                                        <td className="cv-yes">✓ Full</td>
                                        <td className="cv-yes">✓ Full</td>
                                        <td className="cv-yes">✓ Full</td>
                                        <td className="cv-yes">✓ Full</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Accepter</strong> (financier)</td>
                                        <td className="cv-yes">✓ Full</td>
                                        <td className="cv-yes">✓ Full</td>
                                        <td className="cv-yes">✓ Full</td>
                                        <td className="cv-yes">✓ Full</td>
                                    </tr>
                                    <tr className="cv-row-highlight">
                                        <td><strong>Third party</strong> (arbitrator)</td>
                                        <td className="cv-no">✗ Nothing</td>
                                        <td className="cv-no">✗ Nothing</td>
                                        <td className="cv-no">✗ Nothing</td>
                                        <td className="cv-partial">◐ Amount + description only</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Competitor</strong></td>
                                        <td className="cv-no">✗ Nothing</td>
                                        <td className="cv-no">✗ Nothing</td>
                                        <td className="cv-no">✗ Nothing</td>
                                        <td className="cv-no">✗ Nothing</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="cv-table-note">
                            This is not encryption. The competitor's node literally never receives the data.
                            Privacy is guaranteed at the Canton protocol level — and <strong>proven by our test suite</strong>.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── Why it wins ── */}
            <section className="cv-section">
                <div className="container">
                    <h2 className="cv-section-title">Why CantonVault is built to win</h2>
                    <div className="row g-4">
                        <div className="col-md-6">
                            <div className="cv-card cv-card-win">
                                <div className="cv-card-icon">🔒</div>
                                <h3>Privacy, proven not promised</h3>
                                <p>Two Daml tests (<code>test_thirdparty_sees_dispute</code> and <code>test_thirdparty_resolves</code>) assert that the third party's ledger is empty until a dispute is raised. The privacy claim is a passing test, not a slide.</p>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="cv-card cv-card-win">
                                <div className="cv-card-icon">🪙</div>
                                <h3>Real Canton Coin settlement</h3>
                                <p>The <code>Fulfill</code> choice executes <code>Allocation_ExecuteTransfer</code> via the Splice token standard — actual atomic CC transfer, not a symbolic mock. This is what makes CantonVault economically native.</p>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="cv-card cv-card-win">
                                <div className="cv-card-icon">🏛️</div>
                                <h3>Built for institutional finance</h3>
                                <p>Invoice factoring, OTC block trades, dynamic discounting — the same primitive powers all three. CantonVault maps directly to Basel III / MiCA selective-disclosure requirements.</p>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="cv-card cv-card-win">
                                <div className="cv-card-icon">⚡</div>
                                <h3>Atomic, not best-effort</h3>
                                <p>Delivery versus payment happens in a single ledger transaction. Either the goods are confirmed <em>and</em> the coin moves, or nothing happens. No settlement risk, no partial states.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Architecture ── */}
            <section className="cv-section cv-section-alt">
                <div className="container">
                    <h2 className="cv-section-title">Architecture</h2>
                    <div className="cv-arch">
                        <div className="cv-arch-layer">
                            <span className="cv-arch-tag">Frontend</span>
                            <span className="cv-arch-tech">React 18 + TypeScript + Vite</span>
                            <span className="cv-arch-desc">3-step wizard · Privacy Lab split-screen · typed store</span>
                        </div>
                        <div className="cv-arch-conn">↓ REST via /api proxy</div>
                        <div className="cv-arch-layer">
                            <span className="cv-arch-tag">Backend</span>
                            <span className="cv-arch-tech">Spring Boot 3.4 + Java 21</span>
                            <span className="cv-arch-desc">gRPC Ledger API v2 · PQS (Postgres) · Splice Token Standard proxy</span>
                        </div>
                        <div className="cv-arch-conn">↓ gRPC</div>
                        <div className="cv-arch-layer cv-arch-layer-canton">
                            <span className="cv-arch-tag">Smart Contracts</span>
                            <span className="cv-arch-tech">Daml 3.4.11 — 5 templates</span>
                            <span className="cv-arch-desc">CommitmentProposal · CommitmentContract · DisputeCase · DisclosedRecord · SettlementReceipt</span>
                        </div>
                        <div className="cv-arch-conn">↓</div>
                        <div className="cv-arch-layer cv-arch-layer-net">
                            <span className="cv-arch-tag">Network</span>
                            <span className="cv-arch-tech">Canton Network (LocalNet / DevNet)</span>
                            <span className="cv-arch-desc">Validator node · Global Synchronizer · Canton Coin burn-mint equilibrium</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="cv-cta">
                <div className="container text-center">
                    <h2>See it in action</h2>
                    <p>Create a private commitment, fulfill it with real Canton Coin, and watch the Privacy Lab prove that the third party sees nothing.</p>
                    <button onClick={launch} disabled={connecting} className="btn btn-light btn-lg cv-btn-launch mt-3">{launchLabel}</button>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="cv-footer">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <strong>CantonVault</strong> — privacy-preserving commitments with real Canton Coin settlement.
                        </div>
                        <div className="col-md-6 text-md-end">
                            <span className="cv-footer-meta">Daml 3.4.11 · Splice 0.5.3 · MIT License</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingView;
