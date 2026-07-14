// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import type { PartyDescriptor } from '../../../stores/vaultStore';
import { type VaultContract, type Workflow } from '../../../types';
import { copy } from '../../../lib/copy';
import { shortParty } from '../../../utils/party';
import CopyCidButton from '../CopyCidButton';

const WORKFLOWS: { value: Workflow; label: string; hint: string; icon: string }[] = [
    { value: 'supply-chain-finance', label: 'Supply Chain Finance', hint: 'Supplier → Financier, Buyer references', icon: '🚚' },
    { value: 'invoice-financing', label: 'Invoice Financing', hint: 'SME → Financier, Buyer pays later', icon: '🧾' },
    { value: 'otc-block-trade', label: 'OTC Block Trade', hint: 'Dealer A → Dealer B, Clearing on demand', icon: '📈' },
];

export interface ProposalFormState {
    accepter: string; thirdParty: string; amount: string; currency: string;
    description: string; workflow: Workflow; deadlineSeconds: string;
}

interface ProposeStepProps {
    form: ProposalFormState;
    setForm: React.Dispatch<React.SetStateAction<ProposalFormState>>;
    onSubmit: () => void;
    disabled: boolean;
    proposals: VaultContract<{ description: string; amount: number; currency: string; workflow: Workflow }>[];
    myParty: string;
    parties: PartyDescriptor[];
    onAccept: (id: string) => Promise<unknown>;
    onReject: (id: string) => Promise<unknown>;
    pendingAction: { cid: string; action: string } | null;
    accepterMode: 'select' | 'custom';
    setAccepterMode: React.Dispatch<React.SetStateAction<'select' | 'custom'>>;
    thirdPartyMode: 'select' | 'custom';
    setThirdPartyMode: React.Dispatch<React.SetStateAction<'select' | 'custom'>>;
}

function PartySelect({
    value, onChange, parties, role, placeholder,
}: { value: string; onChange: (v: string) => void; parties: PartyDescriptor[]; role?: string; placeholder: string }) {
    const known = role ? parties.filter((p) => p.role === role) : parties;
    if (known.length > 0) {
        return (
            <select className="form-select form-select-sm bg-surface text-white border-subtle" value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="">Select {placeholder}</option>
                {known.map((p) => (
                    <option key={p.partyId} value={p.partyId}>{p.label} · {shortParty(p.partyId)}</option>
                ))}
                <option value="__custom">Custom party id…</option>
            </select>
        );
    }
    return <input className="form-control form-control-sm bg-surface text-white border-subtle" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Party id, e.g. 7fd80745…bd9c" />;
}

/**
 * Step 1 — Propose. NOTE: the 7-field form below is the interim layout.
 * It will be replaced by a 4-screen wizard (1 decision per screen) in
 * Phase 4. Kept as-is here so the refactor (Phase 3) is a pure extraction.
 */
const ProposeStep: React.FC<ProposeStepProps> = ({
    form, setForm, onSubmit, disabled, proposals, myParty, parties, onAccept, onReject, pendingAction,
    accepterMode, setAccepterMode, thirdPartyMode, setThirdPartyMode,
}) => (
    <div className="row g-4">
        {/* Left Column: Form */}
        <div className="col-lg-5">
            <div className="card glass-panel h-100">
                <div className="card-header bg-transparent border-bottom border-secondary border-opacity-20 pb-3">
                    <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                        <span>📝</span> {copy.proposeHeader}
                    </h5>
                    <span className="text-on-glass small">{copy.proposeSubheader}</span>
                </div>
                <div className="card-body pt-3">
                    <div className="mb-3">
                        <label className="form-label small text-on-glass d-flex align-items-center justify-content-between">
                            <span>Workflow Scenario</span>
                            <span className="badge bg-secondary bg-opacity-20 text-on-glass">Scenario Type</span>
                        </label>
                        <select className="form-select form-select-sm" value={form.workflow} onChange={(e) => setForm({ ...form, workflow: e.target.value as Workflow })}>
                            {WORKFLOWS.map((w) => <option key={w.value} value={w.value}>{w.icon} {w.label}</option>)}
                        </select>
                        <div className="form-text text-on-glass small mt-1.5" style={{ opacity: 0.9 }}>{WORKFLOWS.find((w) => w.value === form.workflow)?.hint}</div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label small text-on-glass d-flex align-items-center justify-content-between">
                            <span>{copy.roleAccepter} (Counterparty)</span>
                            <span className="badge bg-secondary bg-opacity-20 text-on-glass">Signature Required</span>
                        </label>
                        {accepterMode === 'custom' ? (
                            <div className="d-flex gap-2">
                                <input className="form-control form-control-sm" value={form.accepter} onChange={(e) => setForm({ ...form, accepter: e.target.value })} placeholder="Enter custom Party ID" />
                                <button className="btn btn-sm btn-outline-light" onClick={() => { setAccepterMode('select'); setForm(f => ({ ...f, accepter: '' })); }}>List</button>
                            </div>
                        ) : (
                            <PartySelect
                                value={form.accepter}
                                onChange={(v) => {
                                    if (v === '__custom') { setAccepterMode('custom'); setForm(f => ({ ...f, accepter: '' })); }
                                    else { setForm({ ...form, accepter: v }); }
                                }}
                                parties={parties}
                                role="accepter"
                                placeholder="who pays"
                            />
                        )}
                        <div className="form-text text-on-glass small mt-1.5" style={{ opacity: 0.9 }}>
                            Who signs and pays. On <strong>Confirm delivery</strong>, Canton Coin moves <em>from</em> them <em>to</em> {copy.roleProposer.toLowerCase()}. Leave default for the demo.
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label small text-on-glass d-flex align-items-center justify-content-between">
                            <span>{copy.roleThirdParty} (Arbitrator)</span>
                            <span className="badge bg-danger bg-opacity-15 text-danger border border-danger border-opacity-20 small">⚠️ Blind until dispute</span>
                        </label>
                        {thirdPartyMode === 'custom' ? (
                            <div className="d-flex gap-2">
                                <input className="form-control form-control-sm" value={form.thirdParty} onChange={(e) => setForm({ ...form, thirdParty: e.target.value })} placeholder="Enter custom Party ID" />
                                <button className="btn btn-sm btn-outline-light" onClick={() => { setThirdPartyMode('select'); setForm(f => ({ ...f, thirdParty: '' })); }}>List</button>
                            </div>
                        ) : (
                            <PartySelect
                                value={form.thirdParty}
                                onChange={(v) => {
                                    if (v === '__custom') { setThirdPartyMode('custom'); setForm(f => ({ ...f, thirdParty: '' })); }
                                    else { setForm({ ...form, thirdParty: v }); }
                                }}
                                parties={parties}
                                role="thirdParty"
                                placeholder="a mediator"
                            />
                        )}
                        <div className="form-text text-on-glass small mt-1.5" style={{ opacity: 0.9 }}>
                            The mediator's node <strong>receives zero data</strong> until you report a problem. Then they see only amount + description. Leave default for the demo.
                        </div>
                    </div>

                    <div className="row g-2 mb-3">
                        <div className="col-7">
                            <label className="form-label small text-on-glass">Amount</label>
                            <input className="form-control form-control-sm" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="5000" />
                            <div className="form-text text-on-glass small mt-1.5" style={{ opacity: 0.9 }}>Amount to secure. Sent when you confirm delivery.</div>
                        </div>
                        <div className="col-5">
                            <label className="form-label small text-on-glass">Currency</label>
                            <input className="form-control form-control-sm text-center" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                            <div className="form-text text-on-glass small mt-1.5" style={{ opacity: 0.9 }}>CC = Canton Coin. Leave as-is.</div>
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label small text-on-glass">Description (deal context)</label>
                        <input className="form-control form-control-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={copy.wizardStep1Placeholder} />
                        <div className="form-text text-on-glass small mt-1.5" style={{ opacity: 0.9 }}>
                            A short label for the deal. <strong>This is one of only two fields revealed to the mediator</strong> if you report a problem (the other is the amount).
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="form-label small text-on-glass">Deadline (expiry in seconds)</label>
                        <input className="form-control form-control-sm" type="number" value={form.deadlineSeconds} onChange={(e) => setForm({ ...form, deadlineSeconds: e.target.value })} />
                        <div className="form-text text-on-glass small mt-1.5" style={{ opacity: 0.9 }}>
                            How long the payer has to confirm. After this expires, {copy.refund} becomes available. Default 3600s = 1 hour.
                        </div>
                    </div>

                    <button className="btn btn-primary btn-sm w-100 py-2 fw-semibold" onClick={onSubmit} disabled={disabled}>
                        {disabled ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                {copy.creatingContract}
                            </>
                        ) : copy.submitProposal}
                    </button>
                </div>
            </div>
        </div>

        {/* Right Column: Proposals list */}
        <div className="col-lg-7">
            <div className="card glass-panel h-100">
                <div className="card-header bg-transparent border-bottom border-secondary border-opacity-20 pb-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                        <span>📥</span> Active Proposals
                    </h5>
                    {proposals.length > 0 && <span className="badge bg-primary px-2">{proposals.length} pending</span>}
                </div>
                <div className="card-body pt-3">
                    {proposals.length === 0 ? (
                        <div className="text-center py-5 text-on-glass cv-empty">
                            <div className="cv-empty-icon">←</div>
                            <h6 className="fw-semibold text-white">No proposals yet</h6>
                            <p className="small mb-1 max-width-320 mx-auto text-on-glass">
                                Fill the form on the left and hit <strong>{copy.submitProposal}</strong> to create your first agreement on the Canton Network.
                            </p>
                            <p className="xsmall mb-0 max-width-320 mx-auto text-on-glass" style={{ opacity: 0.75 }}>
                                Takes ~2 seconds. You'll see the on-ledger contractId + offset here instantly.
                            </p>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {proposals.map((p) => (
                                <div key={p.contractId} className="card border-secondary border-opacity-20 bg-surface bg-opacity-50 hover-scale">
                                    <div className="card-body p-3">
                                        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                                            <div className="flex-grow-1">
                                                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                                    <span className="fw-bold text-white">{p.payload.description}</span>
                                                    <span className="badge bg-primary bg-opacity-25 text-primary-light border border-primary border-opacity-20 small">
                                                        {WORKFLOWS.find((w) => w.value === p.payload.workflow)?.label ?? p.payload.workflow}
                                                    </span>
                                                </div>
                                                <div className="text-on-glass small mb-2">
                                                    Amount: <strong className="text-success">{p.payload.amount} {p.payload.currency}</strong>
                                                </div>
                                                <div className="text-on-glass xsmall font-monospace d-flex align-items-center gap-1" style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                                                    <span>Contract ID: {p.contractId.slice(0, 16)}…</span>
                                                    <CopyCidButton cid={p.contractId} />
                                                </div>
                                            </div>
                                            <div className="d-flex gap-2">
                                                <button
                                                    className="btn btn-success btn-sm px-3 py-1.5 fw-semibold"
                                                    onClick={() => onAccept(p.contractId)}
                                                    disabled={pendingAction?.cid === p.contractId}
                                                    title="Accept — sign the proposal and convert it into an active commitment on-ledger. Moves the deal to Step 2."
                                                >
                                                    {pendingAction?.cid === p.contractId && pendingAction?.action === 'accept' ? 'Accepting…' : copy.accept}
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm px-3 py-1.5 fw-semibold"
                                                    onClick={() => onReject(p.contractId)}
                                                    disabled={pendingAction?.cid === p.contractId}
                                                    title="Decline — archive the proposal permanently. Terminal action; cannot be accepted later."
                                                >
                                                    {pendingAction?.cid === p.contractId && pendingAction?.action === 'reject' ? 'Declining…' : copy.reject}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {myParty && (
                        <div className="alert alert-light small mt-4 mb-0 bg-white bg-opacity-5 border-0">
                            <strong>Why this is private:</strong> Proposing publishes a contract visible only to you (proposer) and the accepter. The mediator's ledger node receives <strong>literally zero</strong> data. Proven on step 3.
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
);

export default ProposeStep;
