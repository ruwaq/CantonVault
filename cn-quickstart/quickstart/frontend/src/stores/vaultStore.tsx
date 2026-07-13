// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

/**
 * Thin facade over the SWR-based vault hooks.
 *
 * History: this store previously held a monolithic `useState<VaultState>` with
 * `refreshAll()` firing 6 parallel GETs, plus a `loading` flag and manual
 * `pendingAction` tracking. Combined with a 5s poller in VaultView it generated
 * ~70 requests/minute per open tab, which tripped Cloudflare's abuse limit.
 *
 * SWR now owns reads (useVaultData) and mutations (useVaultMutations). This
 * file exposes the same `useVaultStore()` hook signature so VaultView and
 * Header keep compiling with minimal changes.
 */

import React, { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import {
    useProposals,
    useCommitments,
    useReceipts,
    useDisclosures,
    useDisputes,
    useBalance,
    useParties,
    type PartyDescriptor,
} from '../hooks/useVaultData';
import { useVaultMutations, type CreateProposalInput, type FulfillInput, type RefundInput } from '../hooks/useVaultMutations';
import type {
    Commitment,
    DisclosedRecord,
    DisputeCase,
    Proposal,
    SettlementReceipt,
    VaultContract,
} from '../types';

// Re-export so existing imports from '../stores/vaultStore' keep working.
export type { PartyDescriptor, CreateProposalInput, FulfillInput, RefundInput };

interface VaultState {
    proposals: VaultContract<Proposal>[];
    commitments: VaultContract<Commitment>[];
    receipts: VaultContract<SettlementReceipt>[];
    disclosures: VaultContract<DisclosedRecord>[];
    disputes: VaultContract<DisputeCase>[];
    parties: PartyDescriptor[];
    balance: number | null;
    loading: boolean;
    pendingAction: { cid: string; action: string } | null;
}

interface VaultContextType extends VaultState {
    refreshAll: () => Promise<void>;
    fetchParties: () => Promise<void>;
    fetchBalance: () => Promise<void>;
    createProposal: (input: CreateProposalInput) => Promise<unknown>;
    acceptProposal: (contractId: string) => Promise<unknown>;
    rejectProposal: (contractId: string) => Promise<unknown>;
    fulfillCommitment: (contractId: string, input: FulfillInput) => Promise<unknown>;
    raiseDispute: (contractId: string, reason: string) => Promise<unknown>;
    resolveDispute: (contractId: string, ruling: string, allocationContractId?: string) => Promise<unknown>;
    refundCommitment: (contractId: string, input: RefundInput) => Promise<unknown>;
}

// Vault SWR keys (mirror hooks/useVaultData.ts).
const VAULT_KEYS = [
    ['vault', 'proposals'],
    ['vault', 'commitments'],
    ['vault', 'receipts'],
    ['vault', 'disclosures'],
    ['vault', 'disputes'],
    ['vault', 'balance'],
] as const;

/** Hook (not a Provider) — SWR's global cache replaces React Context. */
export const useVaultStore = (): VaultContextType => {
    const { mutate } = useSWRConfig();
    const proposals = useProposals();
    const commitments = useCommitments();
    const receipts = useReceipts();
    const disclosuresQ = useDisclosures();
    const disputesQ = useDisputes();
    const balanceQ = useBalance();
    const partiesQ = useParties();
    const mutations = useVaultMutations();

    // `loading` is true only while the first batch has no data yet. SWR's
    // keepPreviousData means navigation between steps won't flip this.
    const loading =
        proposals.isLoading ||
        commitments.isLoading ||
        receipts.isLoading ||
        disclosuresQ.isLoading ||
        disputesQ.isLoading;

    const refreshAll = useCallback(async () => {
        await Promise.all(VAULT_KEYS.map((key) => mutate(key)));
    }, [mutate]);

    const fetchParties = useCallback(async () => {
        await mutate(['vault', 'parties']);
    }, [mutate]);

    const fetchBalance = useCallback(async () => {
        await mutate(['vault', 'balance']);
    }, [mutate]);

    return {
        proposals: proposals.data ?? [],
        commitments: commitments.data ?? [],
        receipts: receipts.data ?? [],
        disclosures: disclosuresQ.data ?? [],
        disputes: disputesQ.data ?? [],
        parties: partiesQ.data ?? [],
        balance: balanceQ.data?.balance ?? null,
        loading,
        pendingAction: mutations.pending.cid
            ? { cid: mutations.pending.cid, action: mutations.pending.action ?? '' }
            : null,
        refreshAll,
        fetchParties,
        fetchBalance,
        createProposal: mutations.createProposal,
        acceptProposal: mutations.acceptProposal,
        rejectProposal: mutations.rejectProposal,
        fulfillCommitment: mutations.fulfillCommitment,
        raiseDispute: mutations.raiseDispute,
        resolveDispute: mutations.resolveDispute,
        refundCommitment: mutations.refundCommitment,
    };
};

// Kept for backwards compatibility with App.tsx imports; SWR uses a global
// cache so this is now a passthrough Fragment.
export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <>{children}</>
);
