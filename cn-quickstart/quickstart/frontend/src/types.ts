// ── CantonVault domain types ────────────────────────────────────────────────
// These mirror the Daml templates in daml/licensing/daml/Vault/ and the Java
// bindings returned by CommitmentController. The backend serializes Party fields
// either as a string or as { party: "..." } depending on Jackson config, so we
// normalize via `partyOf()` when reading from the API.
//
// Note: CommitmentContract no longer carries a `status` field. Its state 
// (Active/Fulfilled/Refunded/Disputed) is determined by whether the contract 
// still exists on the Active Contract Set (ACS). All terminal choices are 
// consuming, so a contract present in /commitments is always Active.

/** Workflows the commitment can belong to (drives the demo scenario). */
export type Workflow = 'supply-chain-finance' | 'invoice-financing' | 'otc-block-trade';

/** A Party value as it may arrive from the backend: a bare string or a wrapped object. */
export type PartyField = string | { party: string };

/**
 * Coerce a possibly-wrapped Party field into its string id.
 * Handles both `"abc::1220..."` and `{ party: "abc::1220..." }` shapes.
 */
export function partyOf(value: PartyField | undefined | null): string {
    if (value == null) return '';
    return typeof value === 'string' ? value : value.party;
}

/** A contract as returned by the backend, pairing its ledger id with its payload. */
export interface VaultContract<T> {
    contractId: string;
    payload: T;
}

export interface Proposal {
    proposer: string;
    accepter: string;
    thirdParty: string;
    amount: number;
    currency: string;
    description: string;
    workflow: Workflow;
    deadline: string; // ISO instant
}

export interface Commitment {
    proposer: string;
    accepter: string;
    thirdParty: string;
    amount: number;
    currency: string;
    description: string;
    workflow: Workflow;
    deadline: string; // ISO instant
}

export interface SettlementReceipt {
    proposer: string;
    accepter: string;
    amount: number;
    currency: string;
    timestamp: string; // ISO instant
    outcome: string;
    settlementExecuted: boolean;
    note: string | null;
}

/** A selective-disclosure proof created by RaiseDispute / ResolveDispute. */
export interface DisclosedRecord {
    sourceCid: string;
    discloser: string;
    observer: string;
    revealedFields: Record<string, string>;
    revealedAt: string; // ISO instant
    reason: string;
}

export interface DisputeCase {
    commitmentRef: string;
    proposer: string;
    accepter: string;
    thirdParty: string;
    reason: string;
    amountRevealed: number;
    descriptionRevealed: string;
    ruling: string | null;
}
