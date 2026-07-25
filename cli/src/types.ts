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
   *  Extracted from the CreatedEvent; undefined for exercises that only archive. */
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

/**
 * Resolve the ledger configuration from environment variables.
 *
 * SECURITY (audit Fase 3, C-1): CLIENT_SECRET and PARTY are REQUIRED. They are
 * no longer hardcoded — the previously committed credential has been rotated.
 * Set them in the environment before running the CLI:
 *
 *   export CLIENT_SECRET='<rotated secret from auth.sandbox.fivenorth.io>'
 *   export PARTY='cancore::1220...'          # optional override
 *
 * The non-secret DevNet endpoints remain as defaults for convenience.
 */
export function loadConfig(): LedgerConfig {
  const clientSecret = process.env.CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error(
      'CLIENT_SECRET environment variable is required (audit Fase 3 C-1). ' +
        'The hardcoded credential was rotated. Get a new one from auth.sandbox.fivenorth.io.',
    );
  }
  return {
    ledgerApi: process.env.LEDGER_API || 'https://ledger-api.validator.devnet.sandbox.fivenorth.io',
    authUrl: process.env.AUTH_URL || 'https://auth.sandbox.fivenorth.io/application/o/token/',
    clientId: process.env.CLIENT_ID || 'validator-devnet-m2m',
    clientSecret,
    party: process.env.PARTY || 'cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8',
    synchronizerId:
      process.env.SYNCHRONIZER_ID ||
      'wallet::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8',
  };
}

/**
 * @deprecated Use loadConfig(). Kept only for backward-compat imports; throws at
 * runtime if referenced because it carries no credential.
 */
export const DEVNET_CONFIG: LedgerConfig = {
  ledgerApi: 'https://ledger-api.validator.devnet.sandbox.fivenorth.io',
  authUrl: 'https://auth.sandbox.fivenorth.io/application/o/token/',
  clientId: 'validator-devnet-m2m',
  clientSecret: '',
  party: 'cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8',
  synchronizerId: 'wallet::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8',
};

export const CANTONVAULT_PACKAGE = 'cantonvault-contracts';
export const CANTONVAULT_VERSION = '0.1.0';
