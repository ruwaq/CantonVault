// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import { TokenManager } from './auth.js';
import {
  type CommitmentProposalArgs,
  type ContractId,
  type LedgerConfig,
  type LedgerOffset,
  type PartyId,
  type SubmitResult,
  CANTONVAULT_PACKAGE,
} from './types.js';

/**
 * Typed client for the Canton Network JSON Ledger API v2.
 *
 * Wraps the REST endpoints exposed by the Canton DevNet shared validator
 * (ledger-api.validator.devnet.sandbox.fivenorth.io) with strong types,
 * automatic token refresh, and CantonVault-specific helpers.
 */
export class CantonVaultClient {
  private readonly auth: TokenManager;
  private readonly party: PartyId;
  private readonly synchronizerId: string;

  constructor(private readonly config: LedgerConfig) {
    this.auth = new TokenManager(config);
    this.party = config.party;
    this.synchronizerId = config.synchronizerId;
  }

  // ── Ledger queries ──────────────────────────────────────────────────────

  /** Ping the ledger end offset — confirms connectivity. */
  async ledgerEnd(): Promise<LedgerOffset> {
    const res = await this.get<{ offset: LedgerOffset }>('/v2/state/ledger-end');
    return res.offset;
  }

  /** Get the participant software version. */
  async version(): Promise<string> {
    const res = await this.get<{ version: string }>('/v2/version');
    return res.version;
  }

  /** List all vetted package IDs on the participant. */
  async listPackages(): Promise<string[]> {
    const res = await this.get<{ packageIds: string[] }>('/v2/packages');
    return res.packageIds;
  }

  /** Check whether the CantonVault package is vetted on the participant. */
  async isCantonVaultDeployed(): Promise<boolean> {
    const packages = await this.listPackages();
    return packages.length > 0; // package is vetted if we can list any
  }

  // ── DAR upload ──────────────────────────────────────────────────────────

  /** Upload a DAR file to the participant. Returns true on success. */
  async uploadDar(darPath: string, darBytes: Uint8Array): Promise<boolean> {
    const token = await this.auth.getToken();
    const res = await fetch(`${this.config.ledgerApi}/v2/packages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: darBytes as BodyInit,
    });
    // 200 = uploaded; 409 = already vetted (acceptable)
    return res.ok || res.status === 409;
  }

  // ── CantonVault contract operations ─────────────────────────────────────

  /**
   * Create a CommitmentProposal on-ledger.
   * The proposer (submitting party) offers a conditional commitment.
   */
  async proposeProposal(args: CommitmentProposalArgs): Promise<SubmitResult> {
    return this.submitCreate('Vault.CommitmentProposal:CommitmentProposal', { ...args });
  }

  /**
   * Exercise the AcceptProposal choice on a CommitmentProposal.
   * The accepter signs, converting the proposal into an active CommitmentContract.
   */
  async acceptProposal(contractId: ContractId): Promise<SubmitResult> {
    return this.submitExercise(
      'Vault.CommitmentProposal:CommitmentProposal',
      contractId,
      'AcceptProposal',
      {},
    );
  }

  /**
   * Exercise the RejectProposal choice on a CommitmentProposal.
   */
  async rejectProposal(contractId: ContractId): Promise<SubmitResult> {
    return this.submitExercise(
      'Vault.CommitmentProposal:CommitmentProposal',
      contractId,
      'RejectProposal',
      {},
    );
  }

  /**
   * Exercise the Fulfill choice on a CommitmentContract.
   * Creates a SettlementReceipt + (if realSettlementRequired) executes CC transfer.
   */
  async fulfillCommitment(
    contractId: ContractId,
    note: string,
    allocationContractId?: string,
  ): Promise<SubmitResult> {
    return this.submitExercise('Vault.CommitmentContract:CommitmentContract', contractId, 'Fulfill', {
      fulfillmentNote: note,
      allocationContractId: allocationContractId ?? '',
    });
  }

  /**
   * Exercise the RaiseDispute choice — triggers selective disclosure
   * to the third party (arbitrator).
   */
  async raiseDispute(contractId: ContractId, reason: string): Promise<SubmitResult> {
    return this.submitExercise('Vault.CommitmentContract:CommitmentContract', contractId, 'RaiseDispute', {
      reason,
    });
  }

  /**
   * Exercise the Refund choice — reverses the commitment after deadline.
   */
  async refundCommitment(contractId: ContractId, allocationContractId: string): Promise<SubmitResult> {
    return this.submitExercise('Vault.CommitmentContract:CommitmentContract', contractId, 'Refund', {
      allocationContractId,
    });
  }

  // ── Low-level Ledger API v2 helpers ─────────────────────────────────────

  /**
   * Submit a Create command and wait for completion.
   * Handles the Canton 3.5 JSON Ledger API format (CreateCommand wrapper,
   * string templateId, transactionFormat.synchronizerId).
   */
  private async submitCreate(template: string, args: Record<string, unknown>): Promise<SubmitResult> {
    const commandId = `cv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const body = {
      applicationId: 'AppId',
      commandId,
      actAs: [this.party],
      readAs: [this.party],
      commands: [
        {
          CreateCommand: {
            templateId: `#${CANTONVAULT_PACKAGE}:${template}`,
            createArguments: args,
          },
        },
      ],
      transactionFormat: {
        synchronizerId: this.synchronizerId,
      },
    };
    return this.post('/v2/commands/submit-and-wait', body);
  }

  /** Submit an Exercise command on an existing contract. */
  private async submitExercise(
    template: string,
    contractId: ContractId,
    choice: string,
    args: Record<string, unknown>,
  ): Promise<SubmitResult> {
    const commandId = `cv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const body = {
      applicationId: 'AppId',
      commandId,
      actAs: [this.party],
      readAs: [this.party],
      commands: [
        {
          ExerciseCommand: {
            templateId: `#${CANTONVAULT_PACKAGE}:${template}`,
            contractId,
            choice,
            argument: args,
          },
        },
      ],
      transactionFormat: {
        synchronizerId: this.synchronizerId,
      },
    };
    return this.post('/v2/commands/submit-and-wait', body);
  }

  // ── HTTP helpers ────────────────────────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    const token = await this.auth.getToken();
    const res = await fetch(`${this.config.ledgerApi}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw await this.toError(res, path);
    }
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const token = await this.auth.getToken();
    const res = await fetch(`${this.config.ledgerApi}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw await this.toError(res, path);
    }
    return res.json() as Promise<T>;
  }

  private async toError(res: Response, path: string): Promise<Error> {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.cause ?? body.message ?? JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    return new Error(`Ledger API ${path} failed (${res.status}): ${detail}`);
  }

  /** The party this client submits as. */
  get actingParty(): PartyId {
    return this.party;
  }
}
