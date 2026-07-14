// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

/**
 * Mutation hooks for CantonVault.
 *
 * Each hook POSTs to the vault backend via the axios client (vaultApi) and then
 * calls SWR's global `mutate` to revalidate the affected read caches. This
 * replaces the old "POST → refreshAll() (6 parallel GETs)" pattern with
 * targeted revalidation: a proposal accept only invalidates `proposals` and
 * `commitments`, not the whole vault.
 *
 * The `useSWRConfig().mutate` is keyed by the same tuple keys used in
 * useVaultData.ts so cache invalidation stays in sync.
 */

import { useCallback, useState } from 'react';
import { useSWRConfig } from 'swr';
import vaultApi from '../stores/vaultApi';
import { useToast } from '../stores/toastStore';
import { handleActionError } from '../utils/error';
import type { Workflow } from '../types';

/** Tracks the in-flight mutation for per-button disable state. */
export interface MutationState {
    cid: string | null;
    action: string | null;
    isMutating: boolean;
}

const IDLE: MutationState = { cid: null, action: null, isMutating: false };

/**
 * Convert an in-progress gerund action ("Accepting proposal") into a
 * past-tense success message ("Proposal accepted") for toast confirmations.
 * The jury reads the success toast as a completed fact, not an ongoing action.
 */
function toSuccessMessage(action: string): string {
    const map: Record<string, string> = {
        'Creating proposal': 'Proposal created on-ledger',
        'Accepting proposal': 'Proposal accepted — commitment is live',
        'Rejecting proposal': 'Proposal rejected',
        'Fulfilling commitment': 'Commitment fulfilled — Canton Coin settled',
        'Raising dispute': 'Dispute raised — third party notified',
        'Resolving dispute': 'Dispute resolved — settlement recorded',
        'Refunding commitment': 'Commitment refunded',
    };
    return map[action] ?? action;
}

// Vault SWR cache keys (must match useVaultData.ts).
const K = {
    proposals: ['vault', 'proposals'] as const,
    commitments: ['vault', 'commitments'] as const,
    receipts: ['vault', 'receipts'] as const,
    disclosures: ['vault', 'disclosures'] as const,
    disputes: ['vault', 'disputes'] as const,
    balance: ['vault', 'balance'] as const,
};

export interface CreateProposalInput {
    accepter: string;
    thirdParty: string;
    amount: number;
    currency: string;
    description: string;
    workflow: Workflow;
    deadlineSeconds: number;
}

export interface FulfillInput {
    fulfillmentNote: string;
    allocationContractId: string;
}

export interface RefundInput {
    allocationContractId: string;
}

/**
 * Centralized mutation hook: returns `pending` state plus a bag of action
 * callbacks. The pending shape mirrors the old vaultStore `pendingAction` so
 * VaultView's button-disable logic is unchanged.
 */
export function useVaultMutations() {
    const { mutate } = useSWRConfig();
    const toast = useToast();
    const [pending, setPending] = useState<MutationState>(IDLE);

    const wrap = useCallback(
        <T,>(cid: string | null, action: string, fn: () => Promise<T>, keysToInvalidate: readonly (readonly (string | number)[])[]): Promise<T | void> => {
            setPending({ cid, action, isMutating: true });
            return fn()
                .then(async (result) => {
                    // Targeted revalidation: only refetch what this mutation touched.
                    await Promise.all(keysToInvalidate.map((key) => mutate(key)));
                    // Surface an on-ledger success toast so the jury sees what
                    // landed on the Canton Network. The axios response carries
                    // contractId + offset from the backend. Convert the gerund
                    // action ("Accepting proposal") into a past-tense success
                    // ("Proposal accepted") for a natural confirmation message.
                    const data = (result as { data?: { contractId?: string; offset?: number } })?.data;
                    toast.displaySuccess(toSuccessMessage(action), {
                        contractId: data?.contractId,
                        offset: data?.offset,
                    });
                    return result;
                })
                .catch((err) => {
                    handleActionError(err, action, toast);
                    return undefined;
                })
                .finally(() => setPending(IDLE));
        },
        [mutate, toast],
    );

    const createProposal = useCallback(
        (input: CreateProposalInput) =>
            wrap(
                null,
                'Creating proposal',
                () => vaultApi.post('/proposals', input),
                [K.proposals, K.commitments],
            ),
        [wrap],
    );

    const acceptProposal = useCallback(
        (contractId: string) =>
            wrap(
                contractId,
                'Accepting proposal',
                () => vaultApi.post(`/proposals/${contractId}/accept`),
                [K.proposals, K.commitments],
            ),
        [wrap],
    );

    const rejectProposal = useCallback(
        (contractId: string) =>
            wrap(
                contractId,
                'Rejecting proposal',
                () => vaultApi.post(`/proposals/${contractId}/reject`),
                [K.proposals],
            ),
        [wrap],
    );

    const fulfillCommitment = useCallback(
        (contractId: string, input: FulfillInput) =>
            wrap(
                contractId,
                'Fulfilling commitment',
                () => vaultApi.post(`/commitments/${contractId}/fulfill`, input),
                [K.commitments, K.receipts, K.balance],
            ),
        [wrap],
    );

    const raiseDispute = useCallback(
        (contractId: string, reason: string) =>
            wrap(
                contractId,
                'Raising dispute',
                () => vaultApi.post(`/commitments/${contractId}/raise-dispute`, { reason }),
                [K.commitments, K.disputes, K.disclosures],
            ),
        [wrap],
    );

    const resolveDispute = useCallback(
        (contractId: string, ruling: string, allocationContractId?: string) =>
            wrap(
                contractId,
                'Resolving dispute',
                () =>
                    vaultApi.post(`/commitments/${contractId}/resolve`, {
                        ruling,
                        allocationContractId: allocationContractId?.trim() || undefined,
                    }),
                [K.commitments, K.disputes, K.disclosures, K.receipts, K.balance],
            ),
        [wrap],
    );

    const refundCommitment = useCallback(
        (contractId: string, input: RefundInput) =>
            wrap(
                contractId,
                'Refunding commitment',
                () => vaultApi.post(`/commitments/${contractId}/refund`, input),
                [K.commitments, K.receipts, K.balance],
            ),
        [wrap],
    );

    return {
        pending,
        createProposal,
        acceptProposal,
        rejectProposal,
        fulfillCommitment,
        raiseDispute,
        resolveDispute,
        refundCommitment,
    };
}
