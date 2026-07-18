// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect, useState } from 'react';
import { useUserStore } from '../stores/userStore';
import { useToast } from '../stores/toastStore';
import { useVaultStore } from '../stores/vaultStore';
import { type Commitment, type VaultContract } from '../types';
import { DisputeModal, FulfillModal, RefundModal, ResolveModal } from '../components/vault/VaultActionModals';
import ConfirmModal from '../components/vault/ConfirmModal';
import VaultHeader from '../components/vault/VaultHeader';
import Stepper, { type Step } from '../components/vault/Stepper';
import ProposeWizard from '../components/vault/propose/ProposeWizard';
import CopyCidButton from '../components/vault/CopyCidButton';
import ActStep from '../components/vault/act/ActStep';
import PrivacyLab from '../components/vault/privacy/PrivacyLab';
import { copy } from '../lib/copy';

/** Right-column list of pending proposals (accept / decline). Slim, kept here
 *  so VaultView stays the single source of the "propose" layout. */
const ProposalsList: React.FC<{
    proposals: VaultContract<{ description: string; amount: number; currency: string; workflow: string }>[];
    myParty: string;
    onAccept: (id: string) => void;
    onReject: (id: string) => void | Promise<unknown>;
    pendingAction: { cid: string; action: string } | null;
}> = ({ proposals, myParty, onAccept, onReject, pendingAction }) => (
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
                        Complete the wizard on the left to send your first offer.
                    </p>
                </div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {proposals.map((p) => (
                        <div key={p.contractId} className="card border-secondary border-opacity-20 bg-surface bg-opacity-50 hover-scale">
                            <div className="card-body p-3">
                                <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                                    <div className="flex-grow-1">
                                        <span className="fw-bold text-white d-block mb-1">{p.payload.description}</span>
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
                                            title="Accept — sign the proposal and convert it into an active commitment on-ledger."
                                        >
                                            {pendingAction?.cid === p.contractId && pendingAction?.action === 'accept' ? 'Accepting…' : copy.accept}
                                        </button>
                                        <button
                                            className="btn btn-outline-danger btn-sm px-3 py-1.5 fw-semibold"
                                            onClick={() => onReject(p.contractId)}
                                            disabled={pendingAction?.cid === p.contractId}
                                            title="Decline — archive permanently. Terminal action."
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
                    <strong>Why this is private:</strong> Proposing publishes a contract visible only to you and the other party. The mediator's node receives <strong>literally zero</strong> data. Proven on step 3.
                </div>
            )}
        </div>
    </div>
);

const VaultView: React.FC = () => {
    const { user } = useUserStore();
    const toast = useToast();
    const vault = useVaultStore();
    const [step, setStep] = useState<Step>('propose');
    const [creating, setCreating] = useState(false);
    const [seeding, setSeeding] = useState(false);

    // ── Modal state ──
    const [acceptTarget, setAcceptTarget] = useState<string | null>(null);
    const [fulfillTarget, setFulfillTarget] = useState<VaultContract<Commitment> | null>(null);
    const [disputeTarget, setDisputeTarget] = useState<VaultContract<Commitment> | null>(null);
    const [refundTarget, setRefundTarget] = useState<VaultContract<Commitment> | null>(null);
    const [resolveTarget, setResolveTarget] = useState<string | null>(null);

    useEffect(() => {
        void vault.fetchParties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const myParty = user?.party ?? '';

    const isEmpty = vault.proposals.length === 0
        && vault.commitments.length === 0
        && vault.receipts.length === 0
        && vault.disclosures.length === 0
        && vault.disputes.length === 0;

    const handleSeed = async () => {
        setSeeding(true);
        try {
            await vault.seedDemoData();
        } finally {
            setSeeding(false);
        }
    };

    const handleCreate = async (input: {
        accepter: string; thirdParty: string; amount: number; currency: string;
        description: string; workflow: 'supply-chain-finance' | 'invoice-financing' | 'otc-block-trade';
        deadlineSeconds: number;
    }) => {
        if (!input.accepter.trim()) { toast.displayError('Please select who pays'); return; }
        if (!input.thirdParty.trim()) { toast.displayError('Please select a mediator'); return; }
        if (input.amount <= 0) { toast.displayError('Amount must be greater than 0'); return; }
        if (!input.description.trim()) { toast.displayError('Description is required'); return; }
        setCreating(true);
        try {
            await vault.createProposal(input);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="pb-5">
            <VaultHeader
                party={myParty}
                onSync={() => vault.refreshAll()}
                isSyncing={vault.loading}
                onSeedDemo={handleSeed}
                isSeeding={seeding}
                isEmpty={isEmpty}
            />
            <Stepper current={step} onStep={setStep} />

            <div className="mt-4">
                {step === 'propose' && (
                    <div className="row g-4">
                        <div className="col-lg-5">
                            <ProposeWizard
                                parties={vault.parties}
                                onSubmit={handleCreate}
                                submitting={creating}
                            />
                        </div>
                        <div className="col-lg-7">
                            <ProposalsList
                                proposals={vault.proposals}
                                myParty={myParty}
                                onAccept={(id) => setAcceptTarget(id)}
                                onReject={vault.rejectProposal}
                                pendingAction={vault.pendingAction}
                            />
                        </div>
                    </div>
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
            </div>

            {/* Accept confirmation (beneficial friction before irreversible action) */}
            <ConfirmModal
                show={acceptTarget !== null}
                title={copy.accept}
                body="This signs the proposal and creates an active commitment on-ledger. The deal moves to Step 2 (Act), where it can be confirmed, reported, or refunded. This cannot be undone."
                confirmLabel={copy.accept}
                variant="success"
                disabled={vault.pendingAction?.cid === acceptTarget}
                onConfirm={async () => {
                    const target = acceptTarget;
                    setAcceptTarget(null);
                    if (target) await vault.acceptProposal(target);
                }}
                onCancel={() => setAcceptTarget(null)}
            />

            {/* Action Modals */}
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
                    if (target) await vault.refundCommitment(target.contractId, { allocationContractId });
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

export default VaultView;
