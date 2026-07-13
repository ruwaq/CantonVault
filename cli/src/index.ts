#!/usr/bin/env node
// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

/**
 * CantonVault CLI — interact with CantonVault contracts on the Canton Network DevNet.
 *
 * Usage:
 *   cantonvault status                          # check DevNet connectivity
 *   cantonvault deploy                          # upload the DAR to the DevNet
 *   cantonvault propose --amount 5000           # create a CommitmentProposal
 *   cantonvault accept <contractId>             # accept a proposal
 *   cantonvault fulfill <contractId> --note OK  # fulfill a commitment
 *   cantonvault dispute <contractId> --reason … # raise a dispute
 *   cantonvault refund <contractId> --alloc …   # refund a commitment
 *   cantonvault packages                        # list vetted packages
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CantonVaultClient } from './devnet-client.js';
import {
  CANTONVAULT_PACKAGE,
  CANTONVAULT_VERSION,
  DEVNET_CONFIG,
  type Workflow,
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .name('cantonvault')
  .description('Interact with CantonVault contracts on the Canton Network DevNet')
  .version('1.0.0');

// ── status ──────────────────────────────────────────────────────────────────

program
  .command('status')
  .description('Check DevNet connectivity and show ledger state')
  .action(async () => {
    const client = new CantonVaultClient(DEVNET_CONFIG);
    try {
      const [version, offset] = await Promise.all([
        client.version(),
        client.ledgerEnd(),
      ]);
      console.log('✅ Connected to Canton Network DevNet\n');
      console.log(`  Participant version: Canton ${version}`);
      console.log(`  Ledger end offset:   ${offset}`);
      console.log(`  Acting as party:     ${client.actingParty.slice(0, 40)}...`);
      console.log(`  Ledger API:          ${DEVNET_CONFIG.ledgerApi}`);
    } catch (err) {
      console.error('❌ Failed to connect to DevNet:', (err as Error).message);
      process.exit(1);
    }
  });

// ── deploy ──────────────────────────────────────────────────────────────────

program
  .command('deploy')
  .description('Upload the CantonVault DAR to the DevNet')
  .option('-d, --dar <path>', 'Path to the .dar file', defaultDarPath())
  .action(async (opts) => {
    const client = new CantonVaultClient(DEVNET_CONFIG);
    try {
      const darBytes = readFileSync(opts.dar);
      console.log(`Uploading ${CANTONVAULT_PACKAGE} v${CANTONVAULT_VERSION} (${darBytes.length} bytes)...`);
      const ok = await client.uploadDar(opts.dar, new Uint8Array(darBytes));
      if (ok) {
        console.log(`✅ DAR uploaded to Canton DevNet`);
        const offset = await client.ledgerEnd();
        console.log(`  Ledger offset: ${offset}`);
      } else {
        console.error('❌ DAR upload failed');
        process.exit(1);
      }
    } catch (err) {
      console.error('❌ Deploy failed:', (err as Error).message);
      process.exit(1);
    }
  });

// ── packages ─────────────────────────────────────────────────────────────────

program
  .command('packages')
  .description('List all vetted packages on the participant')
  .action(async () => {
    const client = new CantonVaultClient(DEVNET_CONFIG);
    try {
      const packages = await client.listPackages();
      console.log(`Vetted packages on DevNet: ${packages.length}\n`);
      // Show last 5 (most recent uploads)
      packages.slice(-5).forEach((p, i) => {
        const marker = i === packages.length - 1 ? ' ← latest' : '';
        console.log(`  ${p.slice(0, 16)}...${p.slice(-8)}${marker}`);
      });
    } catch (err) {
      console.error('❌ Failed to list packages:', (err as Error).message);
      process.exit(1);
    }
  });

// ── propose ─────────────────────────────────────────────────────────────────

program
  .command('propose')
  .description('Create a CommitmentProposal on-ledger')
  .requiredOption('-a, --amount <n>', 'Amount in Canton Coin', parseFloat)
  .option('-c, --currency <code>', 'Currency code', 'CC')
  .option('-d, --description <text>', 'Deal description', 'CantonVault demo proposal')
  .option('-w, --workflow <type>', 'Workflow scenario', 'supply-chain-finance')
  .option('--deadline <iso>', 'Deadline ISO timestamp', '2026-12-31T23:59:59Z')
  .action(async (opts) => {
    const client = new CantonVaultClient(DEVNET_CONFIG);
    try {
      console.log(`Creating CommitmentProposal: ${opts.amount} ${opts.currency}...`);
      const result = await client.proposeProposal({
        proposer: DEVNET_CONFIG.party,
        accepter: DEVNET_CONFIG.party,
        thirdParty: DEVNET_CONFIG.party,
        amount: opts.amount,
        currency: opts.currency,
        description: opts.description,
        workflow: opts.workflow as Workflow,
        deadline: opts.deadline,
        instrumentAdmin: DEVNET_CONFIG.party,
        realSettlementRequired: false,
      });
      console.log('\n✅ CommitmentProposal created on Canton DevNet\n');
      console.log(`  updateId:    ${result.updateId}`);
      console.log(`  offset:      ${result.completionOffset}`);
      console.log(`  contractId:  ${result.contractId ?? '(not extracted)'}`);
      console.log(`  amount:      ${opts.amount} ${opts.currency}`);
      console.log(`  description: ${opts.description}`);
      console.log(`\n  To accept: cantonvault accept "${result.contractId ?? '<contractId>'}"`);
    } catch (err) {
      console.error('❌ Propose failed:', (err as Error).message);
      process.exit(1);
    }
  });

// ── accept ──────────────────────────────────────────────────────────────────

program
  .command('accept <contractId>')
  .description('Accept a CommitmentProposal (creates active CommitmentContract)')
  .action(async (contractId: string) => {
    await runExercise('accept', contractId, (c) => c.acceptProposal(contractId));
  });

// ── reject ──────────────────────────────────────────────────────────────────

program
  .command('reject <contractId>')
  .description('Reject a CommitmentProposal')
  .action(async (contractId: string) => {
    await runExercise('reject', contractId, (c) => c.rejectProposal(contractId));
  });

// ── fulfill ─────────────────────────────────────────────────────────────────

program
  .command('fulfill <contractId>')
  .description('Fulfill a commitment (creates SettlementReceipt)')
  .requiredOption('-n, --note <text>', 'Fulfillment note')
  .option('--alloc <id>', 'Allocation contract ID (for real CC settlement)')
  .action(async (contractId: string, opts: { note: string; alloc?: string }) => {
    const client = new CantonVaultClient(DEVNET_CONFIG);
    try {
      console.log(`Fulfilling commitment ${contractId}...`);
      const result = await client.fulfillCommitment(contractId, opts.note, opts.alloc);
      console.log('\n✅ Commitment fulfilled on Canton DevNet\n');
      console.log(`  updateId: ${result.updateId}`);
      console.log(`  offset:   ${result.completionOffset}`);
    } catch (err) {
      console.error('❌ Fulfill failed:', (err as Error).message);
      process.exit(1);
    }
  });

// ── dispute ─────────────────────────────────────────────────────────────────

program
  .command('dispute <contractId>')
  .description('Raise a dispute (triggers selective disclosure to third party)')
  .requiredOption('-r, --reason <text>', 'Dispute reason')
  .action(async (contractId: string, opts: { reason: string }) => {
    const client = new CantonVaultClient(DEVNET_CONFIG);
    try {
      console.log(`Raising dispute on ${contractId}...`);
      const result = await client.raiseDispute(contractId, opts.reason);
      console.log('\n✅ Dispute raised — selective disclosure triggered\n');
      console.log(`  updateId: ${result.updateId}`);
      console.log(`  offset:   ${result.completionOffset}`);
    } catch (err) {
      console.error('❌ Dispute failed:', (err as Error).message);
      process.exit(1);
    }
  });

// ── refund ──────────────────────────────────────────────────────────────────

program
  .command('refund <contractId>')
  .description('Refund a commitment (reverse CC transfer)')
  .requiredOption('--alloc <id>', 'Reverse allocation contract ID')
  .action(async (contractId: string, opts: { alloc: string }) => {
    const client = new CantonVaultClient(DEVNET_CONFIG);
    try {
      console.log(`Refunding commitment ${contractId}...`);
      const result = await client.refundCommitment(contractId, opts.alloc);
      console.log('\n✅ Commitment refunded on Canton DevNet\n');
      console.log(`  updateId: ${result.updateId}`);
      console.log(`  offset:   ${result.completionOffset}`);
    } catch (err) {
      console.error('❌ Refund failed:', (err as Error).message);
      process.exit(1);
    }
  });

// ── Helpers ───────────────────────────────────────────────────────────────

function defaultDarPath(): string {
  // From cli/dist → ../../cn-quickstart/quickstart/daml/licensing/.daml/dist/
  const repoRoot = resolve(__dirname, '..', '..');
  return resolve(
    repoRoot,
    'cn-quickstart',
    'quickstart',
    'daml',
    'licensing',
    '.daml',
    'dist',
    `${CANTONVAULT_PACKAGE}-${CANTONVAULT_VERSION}.dar`,
  );
}

async function runExercise(
  label: string,
  contractId: string,
  fn: (c: CantonVaultClient) => Promise<{ updateId: string; completionOffset: number }>,
): Promise<void> {
  const client = new CantonVaultClient(DEVNET_CONFIG);
  try {
    console.log(`${label} contract ${contractId}...`);
    const result = await fn(client);
    console.log(`\n✅ Done — Canton DevNet\n`);
    console.log(`  updateId: ${result.updateId}`);
    console.log(`  offset:   ${result.completionOffset}`);
  } catch (err) {
    console.error(`❌ ${label} failed:`, (err as Error).message);
    process.exit(1);
  }
}

program.parse();
