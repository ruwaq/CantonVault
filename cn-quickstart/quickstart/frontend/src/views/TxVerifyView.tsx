// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import useSWR from 'swr';
import { fetcher } from '../lib/fetcher';

/**
 * Public transaction verifier — linked from the on-ledger confirmation toast.
 * Shows a judge (technical audience) exactly what happened on-ledger and what is
 * real vs symbolic in this demo. No login required (tx hashes are not secrets).
 *
 * Three sections:
 *   1. Verdict — confirmed on-ledger / not visible.
 *   2. What is real — the Ledger API event tree (Created/Archived + templateId).
 *   3. What is NOT real — honest note about symbolic settlement in this sandbox.
 */

interface TxEvent {
    kind: 'CreatedEvent' | 'ArchivedEvent' | 'ExercisedEvent' | 'Unknown';
    templateId?: string;
    contractId?: string;
    choice?: string;
}

interface TxVerifyResponse {
    found: boolean;
    updateId: string;
    offset?: number;
    effectiveAt?: string;
    synchronizerId?: string;
    workflowId?: string | null;
    events?: TxEvent[];
    verifiedBy?: string;
    note?: string;
}

/** Friendly name for a Daml templateId suffix (drops the package hash prefix). */
function shortTemplate(t?: string): string {
    if (!t) return '(unknown template)';
    // templateId comes as "<pkg-hash>:Vault.CommitmentContract:CommitmentContract"
    // or "#<pkg>:Module:Template". Show the last Module:Template part.
    const parts = t.split(':');
    return parts.slice(-2).join(':') || t;
}

function shortCid(cid?: string): string {
    if (!cid) return '';
    if (cid.length <= 24) return cid;
    return `${cid.slice(0, 12)}…${cid.slice(-8)}`;
}

const EVENT_BADGE: Record<TxEvent['kind'], string> = {
    CreatedEvent: 'bg-success bg-opacity-25 text-success',
    ArchivedEvent: 'bg-danger bg-opacity-25 text-danger',
    ExercisedEvent: 'bg-warning bg-opacity-25 text-warning',
    Unknown: 'bg-secondary bg-opacity-25 text-on-glass',
};

const TxVerifyView: React.FC = () => {
    const { updateId } = useParams<{ updateId: string }>();
    const { data, error, isLoading } = useSWR<TxVerifyResponse>(
        updateId ? `/api/vault/tx/${updateId}` : null,
        fetcher,
        { revalidateOnFocus: false, errorRetryCount: 1 },
    );

    return (
        <div className="container app-main py-5" style={{ maxWidth: '820px' }}>
            {/* Header */}
            <div className="d-flex align-items-center gap-2 mb-4">
                <span className="fs-3">🔍</span>
                <div>
                    <h1 className="h4 mb-0 text-white">On-ledger transaction verifier</h1>
                    <p className="small text-on-glass mb-0">
                        Canton Network DevNet · proof of settlement for CantonVault
                    </p>
                </div>
            </div>

            {/* The updateId being verified */}
            <div className="card glass-panel mb-4 py-2 px-3">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="small text-on-glass flex-shrink-0">updateId:</span>
                    <code className="small text-warning text-break">{updateId}</code>
                </div>
            </div>

            {isLoading && (
                <div className="text-center py-5 text-on-glass">Querying the Canton ledger…</div>
            )}

            {error && !isLoading && (
                <div className="alert alert-danger">
                    Failed to reach the verifier. The DevNet may be temporarily unreachable.{' '}
                    <Link to="/vault" className="alert-link">Back to the vault</Link>.
                </div>
            )}

            {data && !isLoading && (
                <>
                    {/* Section 1 — Verdict */}
                    <div className={`card glass-panel mb-4 ${data.found ? 'border-success border-opacity-25' : 'border-warning border-opacity-25'}`}>
                        <div className="card-body">
                            {data.found ? (
                                <div className="d-flex align-items-start gap-3">
                                    <span className="text-success fs-3">✓</span>
                                    <div>
                                        <h2 className="h5 text-success mb-1">Confirmed on-ledger</h2>
                                        <p className="small text-on-glass mb-0">
                                            This updateId matches a real transaction recorded by the Canton Network
                                            DevNet, witnessed by the CantonVault operator party. The events below are
                                            the on-ledger effect of that transaction.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="d-flex align-items-start gap-3">
                                    <span className="text-warning fs-3">?</span>
                                    <div>
                                        <h2 className="h5 text-warning mb-1">Not visible to the operator</h2>
                                        <p className="small text-on-glass mb-0">{data.note}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 2 — What is real (only if found) */}
                    {data.found && (
                        <div className="card glass-panel mb-4">
                            <div className="card-header bg-white bg-opacity-5 border-bottom border-white border-opacity-10 py-2">
                                <strong className="text-white small">What actually happened on-ledger</strong>
                            </div>
                            <div className="card-body">
                                <dl className="row mb-3 small">
                                    <dt className="col-sm-4 text-on-glass">Ledger offset</dt>
                                    <dd className="col-sm-8 text-warning font-monospace">
                                        {data.offset != null ? data.offset.toLocaleString() : '—'}
                                    </dd>

                                    <dt className="col-sm-4 text-on-glass">Effective at</dt>
                                    <dd className="col-sm-8 text-white font-monospace">{data.effectiveAt ?? '—'}</dd>

                                    <dt className="col-sm-4 text-on-glass">Synchronizer</dt>
                                    <dd className="col-sm-8 text-white font-monospace text-break">
                                        {data.synchronizerId ?? '—'}
                                    </dd>

                                    {data.workflowId && (
                                        <>
                                            <dt className="col-sm-4 text-on-glass">Workflow</dt>
                                            <dd className="col-sm-8 text-white font-monospace">{data.workflowId}</dd>
                                        </>
                                    )}

                                    <dt className="col-sm-4 text-on-glass">Verified by</dt>
                                    <dd className="col-sm-8 text-on-glass">{data.verifiedBy ?? '—'}</dd>
                                </dl>

                                <div className="text-on-glass small mb-2 fw-semibold">Events ({data.events?.length ?? 0}):</div>
                                <ul className="list-group list-group-flush">
                                    {(data.events ?? []).map((ev, i) => (
                                        <li key={i} className="list-group-item bg-transparent px-0 py-2 border-white border-opacity-10">
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <span className={`badge ${EVENT_BADGE[ev.kind]} small`}>{ev.kind}</span>
                                                <code className="small text-white">{shortTemplate(ev.templateId)}</code>
                                                {ev.choice && (
                                                    <span className="badge bg-info bg-opacity-25 text-info small">choice: {ev.choice}</span>
                                                )}
                                            </div>
                                            {ev.contractId && (
                                                <div className="small text-on-glass font-monospace mt-1 text-break">
                                                    contractId: {shortCid(ev.contractId)}
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Section 3 — What is NOT real (honest note for technical judges) */}
                    <div className="card glass-panel border-warning border-opacity-25 mb-4">
                        <div className="card-header bg-warning bg-opacity-10 border-bottom border-warning border-opacity-10 py-2">
                            <strong className="text-warning small">What is real vs. what is symbolic in this demo</strong>
                        </div>
                        <div className="card-body small text-on-glass">
                            <p className="mb-2">
                                This CantonVault demo runs the <code>Fulfill</code> / <code>Refund</code> /{' '}
                                <code>ResolveDispute</code> choices on the <strong>symbolic settlement branch</strong>{' '}
                                (<code>allocationCid = None</code>). The resulting{' '}
                                <code>SettlementReceipt</code> records{' '}
                                <code className="text-warning">settlementExecuted = false</code>:{' '}
                                <strong>no Canton Coin was moved</strong> by this transaction.
                            </p>
                            <p className="mb-2">
                                The Delivery-vs-Payment (DvP) path — real Canton Coin flowing from the accepter to the
                                proposer via the Splice <code>AllocationRequest</code> standard — is{' '}
                                <strong>implemented at the contract level</strong> and proven by{' '}
                                <a
                                    href="https://github.com/ruwaq/CantonVault/blob/main/cn-quickstart/quickstart/daml/licensing-tests/daml/Vault/Scripts/TestRealSettlement.daml"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-info"
                                >
                                    <code>test_real_settlement_dvp</code>
                                </a>{' '}
                                (a Daml unit test that moves real Amulet on a local Canton participant).
                            </p>
                            <p className="mb-0">
                                Running real DvP against this shared DevNet sandbox is <strong>not possible</strong>:
                                the <code>validator-devnet-m2m</code> operator is not the network&apos;s DSO, and the
                                Splice <code>AllocationFactory_Allocate</code> rejects any settlement whose{' '}
                                <code>instrumentAdmin ≠ DSO</code>. Full analysis in{' '}
                                <a
                                    href="https://github.com/ruwaq/CantonVault/blob/main/SECURITY.md"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-info"
                                >
                                    SECURITY.md (Fase 3)
                                </a>
                                .
                            </p>
                        </div>
                    </div>

                    <div className="text-center mt-4">
                        <Link to="/vault" className="btn btn-outline-light btn-sm">← Back to the vault</Link>
                    </div>
                </>
            )}
        </div>
    );
};

export default TxVerifyView;
