// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useToast } from './toastStore';
import vaultApi from './vaultApi';
import { withErrorHandling } from '../utils/error';
import {
    type Commitment,
    type CommitmentStatus,
    type DisclosedRecord,
    type DisputeCase,
    type PartyField,
    type Proposal,
    type SettlementReceipt,
    type VaultContract,
    type Workflow,
    partyOf,
} from '../types';

/**
 * CantonVault state + actions.
 *
 * Mirrors licenseStore.tsx but talks to the hand-rolled /vault controller
 * (see vaultApi.ts). All reads go through `normalize*` so the components never
 * touch the raw Daml/Jackson serialization shape.
 */

interface CreateProposalInput {
    accepter: string;
    thirdParty: string;
    amount: number;
    currency: string;
    description: string;
    workflow: Workflow;
    deadlineSeconds: number;
}

interface FulfillInput {
    fulfillmentNote: string;
    allocationContractId?: string;
}

/** A known Canton party exposed by GET /vault/parties (from backend config). */
export interface PartyDescriptor {
    label: string;
    partyId: string;
    role: string;
}

interface VaultState {
    proposals: VaultContract<Proposal>[];
    commitments: VaultContract<Commitment>[];
    receipts: VaultContract<SettlementReceipt>[];
    disclosures: VaultContract<DisclosedRecord>[];
    disputes: VaultContract<DisputeCase>[];
    parties: PartyDescriptor[];
    loading: boolean;
}

interface VaultContextType extends VaultState {
    refreshAll: () => Promise<void>;
    fetchParties: () => Promise<void>;
    createProposal: (input: CreateProposalInput) => Promise<void>;
    acceptProposal: (contractId: string) => Promise<void>;
    rejectProposal: (contractId: string) => Promise<void>;
    fulfillCommitment: (contractId: string, input: FulfillInput) => Promise<void>;
    raiseDispute: (contractId: string, reason: string) => Promise<void>;
    resolveDispute: (contractId: string, ruling: string) => Promise<void>;
    refundCommitment: (contractId: string) => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

// ── Normalizers (raw backend payload → typed domain model) ───────────────────
// The backend may return Party as a bare string OR as { party: "..." } depending
// on the Jackson/protobuf path. We never trust it; we coerce through partyOf().

interface RawProposal {
    proposer?: PartyField;
    accepter?: PartyField;
    thirdParty?: PartyField;
    amount?: number;
    currency?: string;
    description?: string;
    workflow?: string;
    deadline?: string;
}

interface RawCommitment extends RawProposal {
    status?: string;
}

interface RawReceipt {
    proposer?: PartyField;
    accepter?: PartyField;
    amount?: number;
    currency?: string;
    timestamp?: string;
    note?: string | null;
}

interface RawDisclosure {
    sourceCid?: string;
    discloser?: PartyField;
    observer?: PartyField;
    revealedFields?: Record<string, string>;
    revealedAt?: string;
    reason?: string;
}

interface RawDispute {
    commitmentRef?: { contractId?: string } | string;
    proposer?: PartyField;
    accepter?: PartyField;
    thirdParty?: PartyField;
    reason?: string;
    amountRevealed?: number;
    descriptionRevealed?: string;
    ruling?: string | null;
}

const toWorkflow = (raw: string | undefined): Workflow => {
    switch (raw) {
        case 'invoice-financing':
        case 'otc-block-trade':
        case 'supply-chain-finance':
            return raw;
        default:
            return 'supply-chain-finance';
    }
};

const toStatus = (raw: string | undefined): CommitmentStatus => {
    switch (raw) {
        case 'Active':
        case 'Fulfilled':
        case 'Disputed':
        case 'Refunded':
            return raw;
        default:
            return 'Active';
    }
};

const normalizeProposal = (raw: RawProposal): Proposal => ({
    proposer: partyOf(raw.proposer),
    accepter: partyOf(raw.accepter),
    thirdParty: partyOf(raw.thirdParty),
    amount: Number(raw.amount ?? 0),
    currency: raw.currency ?? 'CC',
    description: raw.description ?? '',
    workflow: toWorkflow(raw.workflow),
    deadline: raw.deadline ?? '',
});

const normalizeCommitment = (raw: RawCommitment): Commitment => ({
    ...normalizeProposal(raw),
    status: toStatus(raw.status),
});

const normalizeReceipt = (raw: RawReceipt): SettlementReceipt => ({
    proposer: partyOf(raw.proposer),
    accepter: partyOf(raw.accepter),
    amount: Number(raw.amount ?? 0),
    currency: raw.currency ?? 'CC',
    timestamp: raw.timestamp ?? '',
    note: raw.note ?? null,
});

const normalizeDisclosure = (raw: RawDisclosure): DisclosedRecord => ({
    sourceCid: raw.sourceCid ?? '',
    discloser: partyOf(raw.discloser),
    observer: partyOf(raw.observer),
    revealedFields: raw.revealedFields ?? {},
    revealedAt: raw.revealedAt ?? '',
    reason: raw.reason ?? '',
});

const normalizeDispute = (raw: RawDispute): DisputeCase => ({
    commitmentRef:
        typeof raw.commitmentRef === 'string'
            ? raw.commitmentRef
            : raw.commitmentRef?.contractId ?? '',
    proposer: partyOf(raw.proposer),
    accepter: partyOf(raw.accepter),
    thirdParty: partyOf(raw.thirdParty),
    reason: raw.reason ?? '',
    amountRevealed: Number(raw.amountRevealed ?? 0),
    descriptionRevealed: raw.descriptionRevealed ?? '',
    ruling: raw.ruling ?? null,
});

/** Pull a contractId from a raw backend item (top-level or nested). */
const cidOf = (item: any): string =>
    item?.contractId ??
    item?.payload?.contractId ??
    item?.getCid ??
    '';

/** Map a raw array into typed VaultContracts, dropping items without a contractId. */
function toContracts<T>(rawList: any[], normalize: (raw: any) => T): VaultContract<T>[] {
    return (rawList ?? [])
        .map((item) => {
            const payload = item?.payload ?? item;
            return { contractId: cidOf(item), payload: normalize(payload) };
        })
        .filter((c) => c.contractId);
}

export const VaultProvider = ({ children }: { children: React.ReactNode }) => {
    const toast = useToast();
    const [state, setState] = useState<VaultState>({
        proposals: [],
        commitments: [],
        receipts: [],
        disclosures: [],
        disputes: [],
        parties: [],
        loading: false,
    });

    const setPartial = useCallback(
        (partial: Partial<VaultState>) => setState((s) => ({ ...s, ...partial })),
        [],
    );

    /**
     * Fetch the known onboarded parties (configured on the backend) so the UI
     * can render selectors instead of asking operators to paste raw party ids.
     */
    const fetchParties = useCallback(async () => {
        try {
            const response = await vaultApi.get('/parties');
            setPartial({ parties: (response.data ?? []) as PartyDescriptor[] });
        } catch {
            // Not fatal: parties are an convenience, not required for the flow.
        }
    }, [setPartial]);

    /**
     * Fetch all Vault views. Each call is independent (Promise.allSettled) so a
     * 404/empty on one endpoint never blocks the others — e.g. before any dispute
     * is raised, /disclosures legitimately returns an empty list.
     */
    const refreshAll = useCallback(
        withErrorHandling(`Refreshing CantonVault`)(async () => {
            setState((s) => ({ ...s, loading: true }));
            const [proposals, commitments, receipts, disclosures, disputes] =
                await Promise.allSettled([
                    vaultApi.get('/proposals'),
                    vaultApi.get('/commitments'),
                    vaultApi.get('/receipts'),
                    vaultApi.get('/disclosures'),
                    vaultApi.get('/dispute-cases'),
                ]);

            setPartial({
                proposals: proposals.status === 'fulfilled' ? toContracts(proposals.value.data, normalizeProposal) : [],
                commitments: commitments.status === 'fulfilled' ? toContracts(commitments.value.data, normalizeCommitment) : [],
                receipts: receipts.status === 'fulfilled' ? toContracts(receipts.value.data, normalizeReceipt) : [],
                disclosures: disclosures.status === 'fulfilled' ? toContracts(disclosures.value.data, normalizeDisclosure) : [],
                disputes: disputes.status === 'fulfilled' ? toContracts(disputes.value.data, normalizeDispute) : [],
                loading: false,
            });
        }),
        [setPartial, toast],
    );

    const createProposal = useCallback(
        withErrorHandling(`Creating proposal`)(async (input: CreateProposalInput) => {
            await vaultApi.post('/proposals', input);
            await refreshAll();
            toast.displaySuccess('Proposal created');
        }),
        [refreshAll, toast],
    );

    const acceptProposal = useCallback(
        withErrorHandling(`Accepting proposal`)(async (contractId: string) => {
            await vaultApi.post(`/proposals/${contractId}/accept`);
            await refreshAll();
            toast.displaySuccess('Proposal accepted — commitment active');
        }),
        [refreshAll, toast],
    );

    const rejectProposal = useCallback(
        withErrorHandling(`Rejecting proposal`)(async (contractId: string) => {
            await vaultApi.post(`/proposals/${contractId}/reject`);
            await refreshAll();
            toast.displaySuccess('Proposal rejected');
        }),
        [refreshAll, toast],
    );

    const fulfillCommitment = useCallback(
        withErrorHandling(`Fulfilling commitment`)(async (contractId: string, input: FulfillInput) => {
            await vaultApi.post(`/commitments/${contractId}/fulfill`, input);
            await refreshAll();
            toast.displaySuccess(
                input.allocationContractId
                    ? 'Fulfilled with real Canton Coin settlement'
                    : 'Fulfilled (symbolic)',
            );
        }),
        [refreshAll, toast],
    );

    const raiseDispute = useCallback(
        withErrorHandling(`Raising dispute`)(async (contractId: string, reason: string) => {
            await vaultApi.post(`/commitments/${contractId}/raise-dispute`, { reason });
            await refreshAll();
            toast.displaySuccess('Dispute raised — third party disclosed');
        }),
        [refreshAll, toast],
    );

    const resolveDispute = useCallback(
        withErrorHandling(`Resolving dispute`)(async (contractId: string, ruling: string) => {
            await vaultApi.post(`/commitments/${contractId}/resolve`, { ruling });
            await refreshAll();
            toast.displaySuccess(`Dispute resolved: ${ruling}`);
        }),
        [refreshAll, toast],
    );

    const refundCommitment = useCallback(
        withErrorHandling(`Refunding commitment`)(async (contractId: string) => {
            await vaultApi.post(`/commitments/${contractId}/refund`);
            await refreshAll();
            toast.displaySuccess('Commitment refunded');
        }),
        [refreshAll, toast],
    );

    return (
        <VaultContext.Provider
            value={{
                ...state,
                refreshAll,
                fetchParties,
                createProposal,
                acceptProposal,
                rejectProposal,
                fulfillCommitment,
                raiseDispute,
                resolveDispute,
                refundCommitment,
            }}
        >
            {children}
        </VaultContext.Provider>
    );
};

export const useVaultStore = () => {
    const context = useContext(VaultContext);
    if (context === undefined) {
        throw new Error('useVaultStore must be used within a VaultProvider');
    }
    return context;
};
