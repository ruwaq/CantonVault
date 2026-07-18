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
        'Refunding commitment': 'Commitment refunded',
        'Resolving dispute': 'Dispute resolved — settlement recorded',
        'Seeding demo data': 'Demo data loaded — 4 scenarios ready',
    };
    return map[action] ?? action;
}

/**
 * Privacy context string for each action, shown in the success toast.
 */
function privacyContext(action: string): string {
    const map: Record<string, string> = {
        'Creating proposal': 'Privacy: 2 parties only — mediator and competitors see nothing',
        'Accepting proposal': 'Privacy: 2 parties only — commitment is invisible to everyone else',
        'Rejecting proposal': 'Privacy: 2 parties only',
        'Fulfilling commitment': 'Privacy: 2 parties only — settlement receipt is bilateral',
        'Raising dispute': 'Privacy: 3 parties — mediator now sees amount and description',
        'Refunding commitment': 'Privacy: 2 parties only',
        'Resolving dispute': 'Privacy: 3 parties — mediator ruling is final, competitor sees nothing',
        'Seeding demo data': 'Privacy: 3 scenarios loaded with full lifecycle data',
    };
    return map[action] ?? '';
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
                        privacy: privacyContext(action),
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
                async () => {
                    const res = await vaultApi.post('/proposals', input);
                    // Optimistic update: KV is eventually consistent (up to 60s
                    // cross-datacenter), so the immediate SWR revalidation may
                    // not see the new proposal yet. Insert it into the cache now
                    // from the response payload; the background revalidation will
                    // reconcile once KV replicates.
                    await mutate(K.proposals, (current: unknown) => {
                        const list = (current ?? []) as Array<{ contractId: string; payload: Record<string, unknown> }>;
                        const cid = res.data?.contractId;
                        if (!cid || list.some((p) => p.contractId === cid)) return list;
                        return [{ contractId: cid, payload: { ...input } }, ...list];
                    }, { revalidate: false });
                    return res;
                },
                [K.proposals, K.commitments],
            ),
        [wrap, mutate],
    );

    const acceptProposal = useCallback(
        (contractId: string) =>
            wrap(
                contractId,
                'Accepting proposal',
                async () => {
                    const res = await vaultApi.post(`/proposals/${contractId}/accept`);
                    // Optimistic: remove the proposal from the pending list
                    // immediately. KV eventual consistency can delay the GET.
                    await mutate(K.proposals, (current: unknown) => {
                        const list = (current ?? []) as Array<{ contractId: string }>;
                        return list.filter((p) => p.contractId !== contractId);
                    }, { revalidate: false });
                    return res;
                },
                [K.proposals, K.commitments],
            ),
        [wrap, mutate],
    );

    const rejectProposal = useCallback(
        (contractId: string) =>
            wrap(
                contractId,
                'Rejecting proposal',
                async () => {
                    const res = await vaultApi.post(`/proposals/${contractId}/reject`);
                    await mutate(K.proposals, (current: unknown) => {
                        const list = (current ?? []) as Array<{ contractId: string }>;
                        return list.filter((p) => p.contractId !== contractId);
                    }, { revalidate: false });
                    return res;
                },
                [K.proposals],
            ),
        [wrap, mutate],
    );

    const fulfillCommitment = useCallback(
        (contractId: string, input: FulfillInput) =>
            wrap(
                contractId,
                'Fulfilling commitment',
                async () => {
                    const res = await vaultApi.post(`/commitments/${contractId}/fulfill`, input);
                    // Optimistic: move the commitment out of the active list.
                    await mutate(K.commitments, (current: unknown) => {
                        const list = (current ?? []) as Array<{ contractId: string }>;
                        return list.filter((c) => c.contractId !== contractId);
                    }, { revalidate: false });
                    return res;
                },
                [K.commitments, K.receipts, K.balance],
            ),
        [wrap, mutate],
    );

    const raiseDispute = useCallback(
        (contractId: string, reason: string) =>
            wrap(
                contractId,
                'Raising dispute',
                async () => {
                    const res = await vaultApi.post(`/commitments/${contractId}/raise-dispute`, { reason });
                    // Optimistic: the commitment leaves the active list (now disputed).
                    await mutate(K.commitments, (current: unknown) => {
                        const list = (current ?? []) as Array<{ contractId: string }>;
                        return list.filter((c) => c.contractId !== contractId);
                    }, { revalidate: false });
                    return res;
                },
                [K.commitments, K.disputes, K.disclosures],
            ),
        [wrap, mutate],
    );

    const resolveDispute = useCallback(
        (contractId: string, ruling: string, allocationContractId?: string) =>
            wrap(
                contractId,
                'Resolving dispute',
                async () => {
                    const res = await vaultApi.post(`/commitments/${contractId}/resolve`, {
                        ruling,
                        allocationContractId: allocationContractId?.trim() || undefined,
                    });
                    // Optimistic: the dispute leaves the open list.
                    await mutate(K.disputes, (current: unknown) => {
                        const list = (current ?? []) as Array<{ contractId: string; payload: { commitmentRef?: string } }>;
                        return list.filter((d) => d.payload?.commitmentRef !== contractId);
                    }, { revalidate: false });
                    return res;
                },
                [K.commitments, K.disputes, K.disclosures, K.receipts, K.balance],
            ),
        [wrap, mutate],
    );

    const refundCommitment = useCallback(
        (contractId: string, input: RefundInput) =>
            wrap(
                contractId,
                'Refunding commitment',
                async () => {
                    const res = await vaultApi.post(`/commitments/${contractId}/refund`, input);
                    await mutate(K.commitments, (current: unknown) => {
                        const list = (current ?? []) as Array<{ contractId: string }>;
                        return list.filter((c) => c.contractId !== contractId);
                    }, { revalidate: false });
                    return res;
                },
                [K.commitments, K.receipts, K.balance],
            ),
        [wrap, mutate],
    );

    /** Seed the KV index with 3 realistic demo scenarios (idempotent). */
    const seedDemoData = useCallback(
        () =>
            wrap(
                null,
                'Seeding demo data',
                async () => {
                    const res = await vaultApi.post('/seed-demo');
                    // Revalidate all vault caches so the UI picks up the new data.
                    await Promise.all(
                        Object.values(K).map((key) => mutate(key)),
                    );
                    return res;
                },
                Object.values(K),
            ),
        [wrap, mutate],
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
        seedDemoData,
    };
}
