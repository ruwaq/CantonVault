// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect, useState } from 'react';
import { useUserStore } from '../stores/userStore';
import { useToast } from '../stores/toastStore';
import { useVaultStore } from '../stores/vaultStore';
import { type Commitment, type VaultContract } from '../types';
import { DisputeModal, FulfillModal, RefundModal, ResolveModal } from '../components/vault/VaultActionModals';
import VaultHeader from '../components/vault/VaultHeader';
import Stepper, { type Step } from '../components/vault/Stepper';
import ProposeStep, { type ProposalFormState } from '../components/vault/propose/ProposeStep';
import ActStep from '../components/vault/act/ActStep';
import PrivacyLab from '../components/vault/privacy/PrivacyLab';

const VaultView: React.FC = () => {
    const { user } = useUserStore();
    const toast = useToast();
    const vault = useVaultStore();
    const [step, setStep] = useState<Step>('propose');

    // ── Form state for Step 1 (replaced by wizard in Phase 4) ──
    const [form, setForm] = useState<ProposalFormState>({
        accepter: '', thirdParty: '', amount: '', currency: 'CC',
        description: '', workflow: 'supply-chain-finance', deadlineSeconds: '3600',
    });
    const [creating, setCreating] = useState(false);
    const [accepterMode, setAccepterMode] = useState<'select' | 'custom'>('select');
    const [thirdPartyMode, setThirdPartyMode] = useState<'select' | 'custom'>('select');

    // ── Modal state ──
    const [fulfillTarget, setFulfillTarget] = useState<VaultContract<Commitment> | null>(null);
    const [disputeTarget, setDisputeTarget] = useState<VaultContract<Commitment> | null>(null);
    const [refundTarget, setRefundTarget] = useState<VaultContract<Commitment> | null>(null);
    const [resolveTarget, setResolveTarget] = useState<string | null>(null);

    useEffect(() => {
        // SWR auto-fetches reads on mount + revalidates on focus. We only prime
        // the static parties list once.
        void vault.fetchParties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const myParty = user?.party ?? '';

    const submitProposal = async () => {
        const amt = parseFloat(form.amount) || 0;
        if (!form.accepter.trim()) { toast.displayError('Please select who pays'); return; }
        if (!form.thirdParty.trim()) { toast.displayError('Please select a mediator'); return; }
        if (amt <= 0) { toast.displayError('Amount must be greater than 0'); return; }
        if (!form.description.trim()) { toast.displayError('Description is required'); return; }
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
        <div className="pb-5">
            <VaultHeader party={myParty} onSync={() => vault.refreshAll()} isSyncing={vault.loading} />
            <Stepper current={step} onStep={setStep} />

            <div className="mt-4">
                {step === 'propose' && (
                    <ProposeStep
                        form={form} setForm={setForm} onSubmit={submitProposal} disabled={creating}
                        proposals={vault.proposals} myParty={myParty} parties={vault.parties}
                        onAccept={vault.acceptProposal} onReject={vault.rejectProposal}
                        pendingAction={vault.pendingAction}
                        accepterMode={accepterMode} setAccepterMode={setAccepterMode}
                        thirdPartyMode={thirdPartyMode} setThirdPartyMode={setThirdPartyMode}
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
            </div>

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
