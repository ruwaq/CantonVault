// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

/**
 * SWR data hooks for CantonVault.
 *
 * Design: one hook per resource, sharing a global SWR config that disables
 * blind polling. The default SWR behavior is `revalidateOnFocus` (a single
 * request batch when the user returns to the tab), which is exactly what we
 * want for a serverless backend on Cloudflare Pages — zero traffic while the
 * tab is hidden, no polling loop to trip rate limits.
 *
 * `dedupingInterval: 10_000` prevents bursts: if two components mount and both
 * ask for `/balance`, SWR issues one request and serves both from cache for the
 * next 10s.
 */

import useSWR, { type SWRConfiguration } from 'swr';
import { fetcher } from '../lib/fetcher';
import { toContracts, normalizeProposal, normalizeCommitment, normalizeReceipt, normalizeDisclosure, normalizeDispute } from '../lib/vaultNormalizers';
import type {
    Commitment,
    DisclosedRecord,
    DisputeCase,
    Proposal,
    SettlementReceipt,
    VaultContract,
} from '../types';
import type { RawContractEnvelope } from '../lib/vaultNormalizers';

/** Known onboarding party exposed by GET /vault/parties. */
export interface PartyDescriptor {
    label: string;
    partyId: string;
    role: string;
}

// Shared config: dedupe within 10s, revalidate on focus, never blind-poll.
// `revalidateOnReconnect` stays on (default) so network-restored tabs refresh.
const SWR_CONFIG: SWRConfiguration = {
    revalidateOnFocus: true,
    refreshInterval: 0, // no blind polling
    dedupingInterval: 10_000,
    shouldRetryOnError: true,
    errorRetryCount: 2,
    errorRetryInterval: 5_000, // backoff between retries
    keepPreviousData: true, // smooth navigation between steps
};

// ── Read hooks ───────────────────────────────────────────────────────────────

/** Active commitment proposals awaiting accept/reject. */
export function useProposals() {
    return useSWR<VaultContract<Proposal>[]>(
        ['vault', 'proposals'],
        () => fetcher<RawContractEnvelope[]>('/api/vault/proposals').then((r) => toContracts(r, normalizeProposal)),
        SWR_CONFIG,
    );
}

/** Accepted & active commitments (pre-fulfillment / pre-dispute). */
export function useCommitments() {
    return useSWR<VaultContract<Commitment>[]>(
        ['vault', 'commitments'],
        () => fetcher<RawContractEnvelope[]>('/api/vault/commitments').then((r) => toContracts(r, normalizeCommitment)),
        SWR_CONFIG,
    );
}

/** Settlement receipts (terminal state: fulfilled / refunded). */
export function useReceipts() {
    return useSWR<VaultContract<SettlementReceipt>[]>(
        ['vault', 'receipts'],
        () => fetcher<RawContractEnvelope[]>('/api/vault/receipts').then((r) => toContracts(r, normalizeReceipt)),
        SWR_CONFIG,
    );
}

/** Selective-disclosure proofs (privacy lab evidence). */
export function useDisclosures() {
    return useSWR<VaultContract<DisclosedRecord>[]>(
        ['vault', 'disclosures'],
        () => fetcher<RawContractEnvelope[]>('/api/vault/disclosures').then((r) => toContracts(r, normalizeDisclosure)),
        SWR_CONFIG,
    );
}

/** Active dispute cases (awaiting third-party ruling). */
export function useDisputes() {
    return useSWR<VaultContract<DisputeCase>[]>(
        ['vault', 'disputes'],
        () => fetcher<RawContractEnvelope[]>('/api/vault/dispute-cases').then((r) => toContracts(r, normalizeDispute)),
        SWR_CONFIG,
    );
}

/** Authenticated party's Canton Coin balance. */
export function useBalance() {
    return useSWR<{ balance: number; party?: string }>(
        ['vault', 'balance'],
        () => fetcher<{ balance?: number | string; party?: string }>('/api/vault/balance').then((d) => ({
            balance: Number(d.balance ?? 0),
            party: d.party,
        })),
        SWR_CONFIG,
    );
}

/** Known onboarded parties for the UI selectors. */
export function useParties() {
    return useSWR<PartyDescriptor[]>(
        ['vault', 'parties'],
        () => fetcher<PartyDescriptor[]>('/api/vault/parties'),
        SWR_CONFIG,
    );
}
