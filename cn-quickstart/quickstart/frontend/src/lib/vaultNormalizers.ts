// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

/**
 * Raw backend payload → typed domain model normalizers for CantonVault.
 *
 * Extracted from the original vaultStore.tsx so SWR fetchers can reuse them
 * without pulling in React context. The backend may return Party as a bare
 * string OR as `{ party: "..." }` depending on the Jackson/protobuf path — we
 * never trust it; we coerce through `partyOf()`.
 */

import {
    type Commitment,
    type DisclosedRecord,
    type DisputeCase,
    type PartyField,
    type Proposal,
    type SettlementReceipt,
    type VaultContract,
    type Workflow,
    partyOf,
} from '../types';

// ── Raw shapes (as Jackson/protobuf serializes them) ─────────────────────────

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

type RawCommitment = RawProposal;

interface RawReceipt {
    proposer?: PartyField;
    accepter?: PartyField;
    amount?: number;
    currency?: string;
    timestamp?: string;
    outcome?: string;
    settlementExecuted?: boolean;
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

/** Shape of a raw contract envelope from the backend. */
export interface RawContractEnvelope {
    contractId?: string;
    payload?: Record<string, unknown>;
    getCid?: string;
}

// ── Normalizers ──────────────────────────────────────────────────────────────

export const toWorkflow = (raw: string | undefined): Workflow => {
    switch (raw) {
        case 'invoice-financing':
        case 'otc-block-trade':
        case 'supply-chain-finance':
            return raw;
        default:
            return 'supply-chain-finance';
    }
};

export const normalizeProposal = (raw: RawProposal): Proposal => ({
    proposer: partyOf(raw.proposer),
    accepter: partyOf(raw.accepter),
    thirdParty: partyOf(raw.thirdParty),
    amount: Number(raw.amount ?? 0),
    currency: raw.currency ?? 'CC',
    description: raw.description ?? '',
    workflow: toWorkflow(raw.workflow),
    deadline: raw.deadline ?? '',
});

export const normalizeCommitment = (raw: RawCommitment): Commitment => ({
    ...normalizeProposal(raw),
});

export const normalizeReceipt = (raw: RawReceipt): SettlementReceipt => ({
    proposer: partyOf(raw.proposer),
    accepter: partyOf(raw.accepter),
    amount: Number(raw.amount ?? 0),
    currency: raw.currency ?? 'CC',
    timestamp: raw.timestamp ?? '',
    outcome: raw.outcome ?? 'fulfilled',
    settlementExecuted: Boolean(raw.settlementExecuted),
    note: raw.note ?? null,
});

export const normalizeDisclosure = (raw: RawDisclosure): DisclosedRecord => ({
    sourceCid: raw.sourceCid ?? '',
    discloser: partyOf(raw.discloser),
    observer: partyOf(raw.observer),
    revealedFields: raw.revealedFields ?? {},
    revealedAt: raw.revealedAt ?? '',
    reason: raw.reason ?? '',
});

export const normalizeDispute = (raw: RawDispute): DisputeCase => ({
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

// ── Contract list helpers ────────────────────────────────────────────────────

/** Pull a contractId from a raw backend item (top-level or nested). */
export const cidOf = (item: RawContractEnvelope): string =>
    (item?.contractId as string) ??
    (item?.payload?.contractId as string | undefined) ??
    item?.getCid ??
    '';

/** Map a raw array into typed VaultContracts, dropping items without a contractId. */
export function toContracts<T>(
    rawList: RawContractEnvelope[] | null | undefined,
    normalize: (raw: Record<string, unknown>) => T,
): VaultContract<T>[] {
    return (rawList ?? [])
        .map((item) => {
            const payload = (item?.payload ?? item) as Record<string, unknown>;
            return { contractId: cidOf(item), payload: normalize(payload) };
        })
        .filter((c) => c.contractId);
}
