// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

/**
 * CantonVault domain types — mirror the Daml templates in
 * cn-quickstart/quickstart/daml/licensing/daml/Vault/
 */

export type Workflow =
  | 'supply-chain-finance'
  | 'invoice-financing'
  | 'otc-block-trade';

/** A Canton party ID, e.g. "cancore::1220a14ca128...". */
export type PartyId = string;

/** A Canton package ID (hash), e.g. "1ab77b2b85ac4f9bf...". */
export type PackageId = string;

/** A Canton contract ID, e.g. "#0:1". */
export type ContractId = string;

/** Ledger offset (a Long serialized as string). */
export type LedgerOffset = number;

/** Result of submitting a command — the tx hash + where it landed + created contractId. */
export interface SubmitResult {
  updateId: string;
  completionOffset: LedgerOffset;
  /** The real on-ledger contractId of a contract created by this command (if any).
   *  Extracted from the CreatedEvent; null for exercises that only archive. */
  contractId?: string;
}

/** The full CommitmentProposal template payload. */
export interface CommitmentProposalArgs {
  proposer: PartyId;
  accepter: PartyId;
  thirdParty: PartyId;
  amount: number;
  currency: string;
  description: string;
  workflow: Workflow;
  deadline: string; // ISO-8601 instant
  instrumentAdmin: PartyId;
  realSettlementRequired: boolean;
}

/** Configuration for connecting to a Canton ledger. */
export interface LedgerConfig {
  ledgerApi: string;
  authUrl: string;
  clientId: string;
  clientSecret: string;
  party: PartyId;
  synchronizerId: string;
}

/** Default DevNet configuration (hackathon shared validator). */
export const DEVNET_CONFIG: LedgerConfig = {
  ledgerApi: 'https://ledger-api.validator.devnet.sandbox.fivenorth.io',
  authUrl: 'https://auth.sandbox.fivenorth.io/application/o/token/',
  clientId: 'validator-devnet-m2m',
  clientSecret:
    'r69FQmevLRwEgMB8NnKaSDHPewTOSx7Yy5jucsqAlmsAaJc3DlggedCz4tyyonl4W2WoOVzkUIjy8dHTlc16AOJQzx02QzJylAUG56oLTCoVCJUUK40vRv9CqQEY3fjn',
  party: 'cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8',
  synchronizerId: 'wallet::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8',
};

export const CANTONVAULT_PACKAGE = 'cantonvault-contracts';
export const CANTONVAULT_VERSION = '0.1.0';
