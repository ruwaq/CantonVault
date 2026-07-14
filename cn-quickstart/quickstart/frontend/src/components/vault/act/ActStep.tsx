// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import type { Commitment, DisputeCase, VaultContract } from '../../../types';
import CommitmentCard from './CommitmentCard';
import DisputeCard from './DisputeCard';

interface ActStepProps {
    commitments: VaultContract<Commitment>[];
    onFulfill: (c: VaultContract<Commitment>) => void;
    onDispute: (c: VaultContract<Commitment>) => void;
    onRefund: (c: VaultContract<Commitment>) => void;
    disputes: VaultContract<DisputeCase>[];
    onResolve: (contractId: string) => void;
    pendingAction: { cid: string; action: string } | null;
}

/** Step 2 — Act: active commitments + open disputes. Slim orchestrator that
 *  delegates rendering to CommitmentCard / DisputeCard. */
const ActStep: React.FC<ActStepProps> = ({
    commitments, onFulfill, onDispute, onRefund, disputes, onResolve, pendingAction,
}) => {
    const disputedRefs = new Set(disputes.map((d) => d.payload.commitmentRef));
    return (
        <div className="row g-4">
            {/* Active Commitments */}
            <div className="col-lg-7">
                <div className="card glass-panel h-100">
                    <div className="card-header bg-transparent border-bottom border-secondary border-opacity-20 pb-3 d-flex justify-content-between align-items-center">
                        <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                            <span>🤝</span> Active Commitments
                        </h5>
                        {commitments.length > 0 && <span className="badge bg-warning text-dark px-2">{commitments.length} active</span>}
                    </div>
                    {commitments.length > 0 && (
                        <div className="px-3 pt-2">
                            <div className="alert alert-light small mb-0 bg-white bg-opacity-5 border-0 py-2 text-on-glass">
                                Each commitment ends one of three ways: <strong>Confirm delivery</strong> (pay), <strong>Report a problem</strong> (escalate to mediator), or <strong>Cancel and refund</strong> (after deadline).
                            </div>
                        </div>
                    )}
                    <div className="card-body pt-3">
                        {commitments.length === 0 ? (
                            <div className="text-center py-5 text-on-glass cv-empty">
                                <div className="cv-empty-icon">🤝</div>
                                <h6 className="fw-semibold text-white">No active commitments</h6>
                                <p className="small mb-0 max-width-320 mx-auto text-on-glass">
                                    Go to <strong>Step 1 · Create</strong> and accept a proposal to bring a deal live here.
                                </p>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {commitments.map((c) => (
                                    <CommitmentCard
                                        key={c.contractId}
                                        contract={c}
                                        disputed={disputedRefs.has(c.contractId)}
                                        pendingAction={pendingAction}
                                        onFulfill={onFulfill}
                                        onDispute={onDispute}
                                        onRefund={onRefund}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Open Disputes */}
            <div className="col-lg-5">
                <div className="card glass-panel h-100 border-danger border-opacity-20">
                    <div className="card-header bg-transparent border-bottom border-danger border-opacity-20 pb-3 d-flex justify-content-between align-items-center">
                        <h5 className="mb-0 fw-bold d-flex align-items-center gap-2 text-danger">
                            <span>🏛️</span> Open Disputes
                        </h5>
                        {disputes.length > 0 && <span className="badge bg-danger px-2">{disputes.length} active</span>}
                    </div>
                    <div className="card-body pt-3">
                        {disputes.length === 0 ? (
                            <div className="text-center py-5 text-on-glass cv-empty">
                                <div className="cv-empty-icon">🛡️</div>
                                <h6 className="fw-semibold text-white">Ledger is clean</h6>
                                <p className="small mb-0 max-width-300 mx-auto text-on-glass">No open disputes. The mediator has zero exposure to any active agreements.</p>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {disputes.map((d) => (
                                    <DisputeCard
                                        key={d.contractId}
                                        contract={d}
                                        pendingAction={pendingAction}
                                        onResolve={onResolve}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActStep;
