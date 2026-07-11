// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect, useState } from 'react';
import { useUserStore } from '../stores/userStore';
import { useVaultStore } from '../stores/vaultStore';
import type { PartyDescriptor } from '../stores/vaultStore';
import {
    type Commitment,
    type DisclosedRecord,
    type SettlementReceipt,
    type VaultContract,
    type Workflow,
} from '../types';
import { DisputeModal, FulfillModal, RefundModal, ResolveModal } from '../components/vault/VaultActionModals';
import { shortParty } from '../utils/party';

type Step = 'propose' | 'act' | 'settle';

const WORKFLOWS: { value: Workflow; label: string; hint: string }[] = [
    { value: 'supply-chain-finance', label: 'Supply Chain Finance', hint: 'Supplier → Financier, Buyer references' },
    { value: 'invoice-financing', label: 'Invoice Financing', hint: 'SME → Financier, Buyer pays later' },
    { value: 'otc-block-trade', label: 'OTC Block Trade', hint: 'Dealer A → Dealer B, Clearing on demand' },
];

const VaultView: React.FC = () => {
    const { user, fetchUser } = useUserStore();
    const vault = useVaultStore();
    const [step, setStep] = useState<Step>('propose');

    // ── Form state for Step 1 ──
    const [form, setForm] = useState({
        accepter: '',
        thirdParty: '',
        amount: '',
        currency: 'CC',
        description: '',
        workflow: 'supply-chain-finance' as Workflow,
        deadlineSeconds: '3600',
    });
    const [creating, setCreating] = useState(false);

    // ── Modal state: the full contract (payload + id) is captured so handlers
    // never have to look up the contractId by payload reference.
    const [fulfillTarget, setFulfillTarget] = useState<VaultContract<Commitment> | null>(null);
    const [disputeTarget, setDisputeTarget] = useState<VaultContract<Commitment> | null>(null);
    const [refundTarget, setRefundTarget] = useState<VaultContract<Commitment> | null>(null);
    const [resolveTarget, setResolveTarget] = useState<string | null>(null);

    useEffect(() => {
        fetchUser();
        vault.refreshAll();
        vault.fetchParties();
        const controller = new AbortController();
        const poll = async () => {
            if (controller.signal.aborted) return;
            await vault.refreshAll();
            if (!controller.signal.aborted) {
                setTimeout(poll, 5000);
            }
        };
        void poll();
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const myParty = user?.party ?? '';

    const submitProposal = async () => {
        // Client-side validation: catch issues before the backend rejects them
        const amt = parseFloat(form.amount) || 0;
        if (!form.accepter.trim() || form.accepter === '__custom') {
            return; // silently — the custom input is shown inline
        }
        if (!form.thirdParty.trim() || form.thirdParty === '__custom') {
            return;
        }
        if (amt <= 0) {
            alert('Amount must be greater than 0');
            return;
        }
        if (!form.description.trim()) {
            alert('Description is required');
            return;
        }
        setCreating(true);
        try {
            await vault.createProposal({
                accepter: form.accepter.trim(),
                thirdParty: form.thirdParty.trim(),
                amount: amt,
                currency: form.currency.trim() || 'CC',
                description: form.description.trim(),
                workflow: form.workflow,
                deadlineSeconds: (() => {
                    const parsed = parseInt(form.deadlineSeconds, 10);
                    return isNaN(parsed) || parsed < 1 ? 3600 : parsed;
                })(),
            });
            setForm((f) => ({ ...f, description: '', amount: '' }));
        } finally {
            setCreating(false);
        }
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h2 className="mb-0">CantonVault</h2>
                    <small className="text-muted">Privacy-first conditional commitments with Canton Coin settlement</small>
                </div>
                <div>
                    <span className="badge bg-success me-2">Selective Disclosure</span>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => vault.refreshAll()} disabled={vault.loading}>
                        {vault.loading ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>
            </div>

            {myParty && (
                <div className="alert alert-light py-2 small mb-3">
                    Acting as party <code>{shortParty(myParty)}</code>. Every action below is submitted to the Canton ledger under this party's authorization.
                </div>
            )}

            <Stepper step={step} setStep={setStep} />

            {step === 'propose' && (
                <ProposeStep
                    form={form}
                    setForm={setForm}
                    onSubmit={submitProposal}
                    disabled={creating}
                    proposals={vault.proposals}
                    myParty={myParty}
                    parties={vault.parties}
                    onAccept={vault.acceptProposal}
                    onReject={vault.rejectProposal}
                    pendingAction={vault.pendingAction}
                />
            )}

            {step === 'act' && (
                <ActStep
                    commitments={vault.commitments}
                    onFulfill={(c) => setFulfillTarget(c)}
                    onDispute={(c) => setDisputeTarget(c)}
                    onRefund={(c) => setRefundTarget(c)}
                    disputes={vault.disputes}
                    onResolve={(cid) => setResolveTarget(cid)}
                    pendingAction={vault.pendingAction}
                />
            )}

            {step === 'settle' && (
                <PrivacyLab
                    receipts={vault.receipts}
                    disclosures={vault.disclosures}
                    commitments={vault.commitments}
                />
            )}

            {/* Modals */}
            <FulfillModal
                show={fulfillTarget !== null}
                commitment={fulfillTarget?.payload ?? null}
                onClose={() => setFulfillTarget(null)}
                onConfirm={async (note, allocationContractId) => {
                    const target = fulfillTarget;
                    setFulfillTarget(null);
                    if (target) await vault.fulfillCommitment(target.contractId, { fulfillmentNote: note, allocationContractId });
                }}
            />
            <RefundModal
                show={refundTarget !== null}
                commitment={refundTarget?.payload ?? null}
                onClose={() => setRefundTarget(null)}
                onConfirm={async (allocationContractId) => {
                    const target = refundTarget;
                    setRefundTarget(null);
                    if (target) {
                        await vault.refundCommitment(target.contractId, { allocationContractId });
                    }
                }}
            />
            <DisputeModal
                show={disputeTarget !== null}
                commitment={disputeTarget?.payload ?? null}
                onClose={() => setDisputeTarget(null)}
                onConfirm={async (reason) => {
                    const target = disputeTarget;
                    setDisputeTarget(null);
                    if (target) await vault.raiseDispute(target.contractId, reason);
                }}
            />
            <ResolveModal
                show={resolveTarget !== null}
                contractId={resolveTarget}
                onClose={() => setResolveTarget(null)}
                onConfirm={async (ruling, allocationContractId) => {
                    const target = resolveTarget;
                    setResolveTarget(null);
                    if (target) await vault.resolveDispute(target, ruling, allocationContractId);
                }}
            />
        </div>
    );
};

// ── Stepper ──────────────────────────────────────────────────────────────────

const Stepper: React.FC<{ step: Step; setStep: (s: Step) => void }> = ({ step, setStep }) => {
    const steps: { key: Step; label: string }[] = [
        { key: 'propose', label: '1 · Propose' },
        { key: 'act', label: '2 · Act' },
        { key: 'settle', label: '3 · Settle & Disclose' },
    ];
    return (
        <ul className="nav nav-pills mb-4">
            {steps.map((s) => (
                <li className="nav-item" key={s.key}>
                    <button
                        className={`nav-link ${step === s.key ? 'active' : 'text-muted'}`}
                        onClick={() => setStep(s.key)}
                    >
                        {s.label}
                    </button>
                </li>
            ))}
        </ul>
    );
};

// ── Step 1: Propose ──────────────────────────────────────────────────────────

interface ProposeStepProps {
    form: { accepter: string; thirdParty: string; amount: string; currency: string; description: string; workflow: Workflow; deadlineSeconds: string };
    setForm: React.Dispatch<React.SetStateAction<{ accepter: string; thirdParty: string; amount: string; currency: string; description: string; workflow: Workflow; deadlineSeconds: string }>>;
    onSubmit: () => void;
    disabled: boolean;
    proposals: VaultContract<{ description: string; amount: number; currency: string; workflow: Workflow }>[];
    myParty: string;
    parties: PartyDescriptor[];
    onAccept: (id: string) => Promise<void>;
    onReject: (id: string) => Promise<void>;
    pendingAction: { cid: string; action: string } | null;
}

/** Render a party selector: a dropdown of known parties plus a free-text fallback. */
function PartySelect({
    value, onChange, parties, role, placeholder,
}: { value: string; onChange: (v: string) => void; parties: PartyDescriptor[]; role?: string; placeholder: string }) {
    const known = role ? parties.filter((p) => p.role === role) : parties;
    if (known.length > 0) {
        return (
            <select className="form-select form-select-sm" value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="">Select {placeholder}</option>
                {known.map((p) => (
                    <option key={p.partyId} value={p.partyId}>{p.label} · {shortParty(p.partyId)}</option>
                ))}
                <option value="__custom">Custom party id…</option>
            </select>
        );
    }
    return <input className="form-control form-control-sm" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Party id, e.g. 7fd80745…bd9c" />;
}

const ProposeStep: React.FC<ProposeStepProps> = ({ form, setForm, onSubmit, disabled, proposals, myParty, parties, onAccept, onReject, pendingAction }) => (
    <div className="row">
        <div className="col-lg-5">
            <div className="card">
                <div className="card-header fw-bold">Create a commitment proposal</div>
                <div className="card-body">
                    <div className="mb-2">
                        <label className="form-label small">Workflow scenario</label>
                        <select className="form-select form-select-sm" value={form.workflow} onChange={(e) => setForm({ ...form, workflow: e.target.value as Workflow })}>
                            {WORKFLOWS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                        </select>
                        <div className="form-text small">{WORKFLOWS.find((w) => w.value === form.workflow)?.hint}</div>
                    </div>
                    <div className="mb-2">
                        <label className="form-label small">Accepter (counterparty)</label>
                        {form.accepter === '__custom'
                            ? <input className="form-control form-control-sm" value="" onChange={(e) => setForm({ ...form, accepter: e.target.value })} placeholder="Party id" autoFocus />
                            : <PartySelect value={form.accepter} onChange={(v) => setForm({ ...form, accepter: v })} parties={parties} role="accepter" placeholder="an accepter" />}
                    </div>
                    <div className="mb-2">
                        <label className="form-label small">Third party (arbitrator — kept blind until dispute)</label>
                        {form.thirdParty === '__custom'
                            ? <input className="form-control form-control-sm" value="" onChange={(e) => setForm({ ...form, thirdParty: e.target.value })} placeholder="Party id" autoFocus />
                            : <PartySelect value={form.thirdParty} onChange={(v) => setForm({ ...form, thirdParty: v })} parties={parties} role="thirdParty" placeholder="a third party" />}
                    </div>
                    <div className="row mb-2">
                        <div className="col-7">
                            <label className="form-label small">Amount</label>
                            <input className="form-control form-control-sm" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="5000" />
                        </div>
                        <div className="col-5">
                            <label className="form-label small">Currency</label>
                            <input className="form-control form-control-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                        </div>
                    </div>
                    <div className="mb-2">
                        <label className="form-label small">Description</label>
                        <input className="form-control form-control-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Invoice INV-2026-001" />
                    </div>
                    <div className="mb-3">
                        <label className="form-label small">Deadline (seconds from now)</label>
                        <input className="form-control form-control-sm" type="number" value={form.deadlineSeconds} onChange={(e) => setForm({ ...form, deadlineSeconds: e.target.value })} />
                    </div>
                    <button className="btn btn-primary btn-sm w-100" onClick={onSubmit} disabled={disabled}>
                        {disabled ? 'Submitting…' : 'Submit proposal'}
                    </button>
                </div>
            </div>
        </div>
        <div className="col-lg-7">
            <h6>Open proposals {proposals.length > 0 && <span className="badge bg-primary ms-1">{proposals.length}</span>}</h6>
            {proposals.length === 0 && <div className="text-muted small">No open proposals. Create one on the left.</div>}
            {proposals.map((p) => (
                <div key={p.contractId} className="card mb-2">
                    <div className="card-body py-2 px-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>{p.payload.description}</strong>
                                <br />
                                <small className="text-muted">{p.payload.amount} {p.payload.currency}</small>{' '}
                                <span className="badge bg-info">{WORKFLOWS.find((w) => w.value === p.payload.workflow)?.label ?? p.payload.workflow}</span>
                            </div>
                            <div className="d-flex gap-1">
                                <button className="btn btn-success btn-sm" onClick={() => onAccept(p.contractId)} disabled={pendingAction?.cid === p.contractId && pendingAction?.action === 'accept'}>Accept</button>
                                <button className="btn btn-outline-danger btn-sm" onClick={() => onReject(p.contractId)} disabled={pendingAction?.cid === p.contractId && pendingAction?.action === 'reject'}>Reject</button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            {myParty && (
                <div className="alert alert-light small mt-3 mb-0">
                    <strong>Explain it simply:</strong> you (the supplier) propose a deal. The financier accepts.
                    The buyer is referenced but <em>cannot see anything</em> yet. That is the privacy guarantee — proven in Step 3.
                </div>
            )}
        </div>
    </div>
);

// ── Step 2: Act ──────────────────────────────────────────────────────────────

interface ActStepProps {
    commitments: VaultContract<Commitment>[];
    onFulfill: (c: VaultContract<Commitment>) => void;
    onDispute: (c: VaultContract<Commitment>) => void;
    onRefund: (c: VaultContract<Commitment>) => void;
    disputes: VaultContract<{ commitmentRef: string }>[];
    onResolve: (contractId: string) => void;
    pendingAction: { cid: string; action: string } | null;
}

const ActStep: React.FC<ActStepProps> = ({ commitments, onFulfill, onDispute, onRefund, disputes, onResolve, pendingAction }) => {
    const disputedRefs = new Set(disputes.map((d) => d.payload.commitmentRef));
    return (
        <div>
            <h6>Active commitments {commitments.length > 0 && <span className="badge bg-warning text-dark ms-1">{commitments.length}</span>}</h6>
            {commitments.length === 0 && <div className="text-muted small">No active commitments. Accept a proposal in Step 1.</div>}
            {commitments.map((c) => {
                const disputed = disputedRefs.has(c.contractId);
                return (
                    <div key={c.contractId} className="card mb-2">
                        <div className="card-body py-2 px-3">
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <div>
                                    <strong>{c.payload.description}</strong>
                                    <br />
                                    <small className="text-muted">{c.payload.amount} {c.payload.currency}</small>{' '}
                                    <span className="badge bg-success">Active</span>
                                    {disputed && <span className="badge bg-danger ms-1">in dispute</span>}
                                    <br />
                                    <small className="text-muted">
                                        proposer {shortParty(c.payload.proposer)} · accepter {shortParty(c.payload.accepter)} · arbitrator {shortParty(c.payload.thirdParty)}
                                    </small>
                                </div>
                                <div className="d-flex gap-1 flex-wrap">
                                    <button className="btn btn-outline-primary btn-sm" onClick={() => onFulfill(c)} disabled={disputed || pendingAction?.cid === c.contractId}>Fulfill</button>
                                    <button className="btn btn-warning btn-sm" onClick={() => onDispute(c)} disabled={disputed || pendingAction?.cid === c.contractId}>Dispute</button>
                                    <button className="btn btn-outline-secondary btn-sm" onClick={() => onRefund(c)} disabled={pendingAction?.cid === c.contractId}>Refund</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            <h6 className="mt-4">Open disputes {disputes.length > 0 && <span className="badge bg-danger ms-1">{disputes.length}</span>}</h6>
            {disputes.length === 0 && <div className="text-muted small">No open disputes. The third party has nothing to see yet.</div>}
            {disputes.map((d) => (
                <div key={d.contractId} className="card mb-2 border-warning">
                    <div className="card-body py-2 px-3 d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Dispute on {shortParty(d.payload.commitmentRef)}</strong>
                            <br />
                            <small className="text-muted">Third party has been disclosed the amount and description only.</small>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => onResolve(d.payload.commitmentRef)} disabled={pendingAction?.cid === d.payload.commitmentRef}>Resolve</button>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ── Step 3: Privacy Lab (real, ledger-backed split-screen) ───────────────────
//
// This is the thesis of the product, shown with REAL data from the ledger:
//  - Stakeholders (proposer + accepter) see the full commitment.
//  - Third party BEFORE a dispute: nothing (no DisclosedRecord exists → empty).
//  - Third party AFTER a dispute: only the fields inside the DisclosedRecord.
// No mock data: every panel is derived from the store, which mirrors the ACS.

interface PrivacyLabProps {
    receipts: VaultContract<SettlementReceipt>[];
    disclosures: VaultContract<DisclosedRecord>[];
    commitments: VaultContract<Commitment>[];
}

const PrivacyLab: React.FC<PrivacyLabProps> = ({ receipts, disclosures, commitments }) => {
    const [viewIndex, setViewIndex] = useState(0);
    const sample = commitments[viewIndex] ?? commitments[0];
    return (
        <div>
            {/* Viewpoint selector */}
            {commitments.length > 1 && (
                <div className="mb-3">
                    <label className="form-label small">Viewing commitment:</label>
                    <select className="form-select form-select-sm" value={viewIndex} onChange={(e) => setViewIndex(Number(e.target.value))}>
                        {commitments.map((c, i) => (
                            <option key={c.contractId} value={i}>
                                {c.payload.description} ({c.payload.amount} {c.payload.currency})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="card h-100 border-success">
                        <div className="card-header bg-success bg-opacity-10 fw-bold">Stakeholders see everything</div>
                        <div className="card-body small">
                            {sample ? (
                                <>
                                    <strong>{sample.payload.description}</strong><br />
                                    {sample.payload.amount} {sample.payload.currency}<br />
                                    <span className="badge bg-info">{sample.payload.workflow}</span>
                                    <div className="mt-1 text-muted">
                                        <small>proposer: {shortParty(sample.payload.proposer)}</small><br />
                                        <small>accepter: {shortParty(sample.payload.accepter)}</small>
                                    </div>
                                </>
                            ) : (
                                <span className="text-muted">No commitment yet.</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card h-100 border-danger">
                        <div className="card-header bg-danger bg-opacity-10 fw-bold">Third party before dispute</div>
                        <div className="card-body small text-muted d-flex align-items-center justify-content-center" style={{ minHeight: 90 }}>
                            <em>Empty ledger — the contract does not exist for this party.</em>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card h-100 border-warning">
                        <div className="card-header bg-warning bg-opacity-10 fw-bold">Third party after dispute (selective)</div>
                        <div className="card-body small">
                            {disclosures.length === 0 ? (
                                <span className="text-muted">Raise a dispute in Step 2 to trigger disclosure.</span>
                            ) : (
                                disclosures.map((d) => (
                                    <div key={d.contractId} className="mb-2">
                                        {Object.entries(d.payload.revealedFields).map(([k, v]) => (
                                            <div key={k}><code>{k}</code>: {v}</div>
                                        ))}
                                        <small className="text-muted">reason: {d.payload.reason}</small>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <h6>Settlement receipts {receipts.length > 0 && <span className="badge bg-success ms-1">{receipts.length}</span>}</h6>
            {receipts.length === 0 && <div className="text-muted small">No receipts yet. Fulfill a commitment in Step 2 to settle in Canton Coin.</div>}
            {receipts.map((r) => (
                <div key={r.contractId} className="card mb-2 border-success">
                    <div className="card-body py-2 px-3 d-flex justify-content-between align-items-center">
                        <div>
                            <strong>{r.payload.amount} {r.payload.currency}</strong> {r.payload.outcome}
                            <br />
                            <small className="text-muted">{shortParty(r.payload.accepter)} → {shortParty(r.payload.proposer)}</small>
                            <span className={`badge ms-2 ${r.payload.settlementExecuted ? 'bg-success' : 'bg-secondary'}`}>
                                {r.payload.settlementExecuted ? 'Funds moved' : 'Recorded outcome'}
                            </span>
                            {r.payload.note && <span className="badge bg-light text-dark ms-2">{r.payload.note}</span>}
                        </div>
                        <span className="badge bg-success text-uppercase">{r.payload.outcome}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default VaultView;
