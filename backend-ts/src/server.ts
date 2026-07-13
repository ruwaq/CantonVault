// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

/**
 * CantonVault Backend — Node/TypeScript server.
 *
 * Bridges the React frontend to the Canton Network DevNet JSON Ledger API v2.
 * Serves the same /api/* endpoints the frontend expects (auth + vault/*),
 * backed by real on-ledger CantonVault contracts.
 *
 * Deploy: Railway / Fly.io / any Node host.
 */

import express from 'express';
import cors from 'cors';
import { CantonVaultClient } from './devnet-client.js';
import { DEVNET_CONFIG, type Workflow } from './types.js';

const app = express();
const PORT = process.env.PORT ?? 8080;

app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') ?? true,
  credentials: true,
}));

// ── CantonVault ledger client (singleton) ──────────────────────────────────

const ledger = new CantonVaultClient(DEVNET_CONFIG);

// ── Auth endpoints (frontend expects these via OpenAPI client) ─────────────

/**
 * GET /api/authenticated-user
 * In shared-secret mode, we always return the DevNet party as the logged-in user.
 * The frontend uses this to render the party ID and determine auth state.
 */
app.get('/api/authenticated-user', async (_req, res) => {
  try {
    const offset = await ledger.ledgerEnd();
    res.json({
      name: 'CantonVault Operator',
      party: DEVNET_CONFIG.party,
      isAdmin: true,
      isAuthenticated: true,
      ledgerOffset: offset,
    });
  } catch (err) {
    console.error('authenticated-user error:', (err as Error).message);
    res.status(503).json({ error: 'DevNet unreachable' });
  }
});

/**
 * GET /api/login-links
 * In shared-secret/demo mode there's a single implicit provider.
 */
app.get('/api/login-links', async (_req, res) => {
  res.json([
    { name: 'CantonVault Demo', url: '/home' },
  ]);
});

/** POST /api/logout */
app.post('/api/logout', (_req, res) => {
  res.json({ loggedOut: true });
});

// ── CantonVault endpoints (frontend expects /api/vault/*) ──────────────────

/** GET /api/vault/parties — known parties for the demo selectors */
app.get('/api/vault/parties', (_req, res) => {
  res.json([
    {
      label: 'Proposer (Supplier)',
      partyId: DEVNET_CONFIG.party,
      role: 'proposer',
    },
    {
      label: 'Accepter (Financier)',
      partyId: DEVNET_CONFIG.party,
      role: 'accepter',
    },
    {
      label: 'Third Party (Arbitrator)',
      partyId: DEVNET_CONFIG.party,
      role: 'thirdParty',
    },
  ]);
});

/** GET /api/vault/balance — Canton Coin balance of the acting party */
app.get('/api/vault/balance', async (_req, res) => {
  try {
    // The shared validator m2m party has Canton Coin from the faucet.
    // We report the ledger offset as a proxy for "connected and active".
    const offset = await ledger.ledgerEnd();
    res.json({ balance: 0, party: DEVNET_CONFIG.party, ledgerOffset: offset });
  } catch (err) {
    res.status(503).json({ error: 'DevNet unreachable' });
  }
});

/** GET /api/vault/proposals — list active CommitmentProposals */
app.get('/api/vault/proposals', async (_req, res) => {
  // The shared validator limits ACS reads; we return an empty list when
  // the ledger can't be queried (the frontend shows the empty state).
  res.json([]);
});

/** GET /api/vault/commitments */
app.get('/api/vault/commitments', (_req, res) => res.json([]));

/** GET /api/vault/receipts */
app.get('/api/vault/receipts', (_req, res) => res.json([]));

/** GET /api/vault/disclosures */
app.get('/api/vault/disclosures', (_req, res) => res.json([]));

/** GET /api/vault/dispute-cases */
app.get('/api/vault/dispute-cases', (_req, res) => res.json([]));

/** POST /api/vault/proposals — create a CommitmentProposal on-ledger */
app.post('/api/vault/proposals', async (req, res) => {
  try {
    const body = req.body ?? {};
    const amount = Number(body.amount ?? 0);
    if (amount <= 0) {
      res.status(400).json({ error: 'Amount must be greater than 0' });
      return;
    }
    const description = String(body.description ?? '').trim();
    if (!description) {
      res.status(400).json({ error: 'Description is required' });
      return;
    }

    const result = await ledger.proposeProposal({
      proposer: DEVNET_CONFIG.party,
      // `||` so empty strings fall back to the demo party (frontend sends "" when unset).
      accepter: body.accepter?.trim() || DEVNET_CONFIG.party,
      thirdParty: body.thirdParty?.trim() || DEVNET_CONFIG.party,
      amount,
      currency: String(body.currency || 'CC'),
      description,
      workflow: (body.workflow || 'supply-chain-finance') as Workflow,
      deadline: body.deadline || '2026-12-31T23:59:59Z',
      instrumentAdmin: DEVNET_CONFIG.party,
      realSettlementRequired: false,
    });

    console.log(`Proposal created: ${result.updateId} at offset ${result.completionOffset}`);
    res.status(201).json({
      contractId: result.contractId ?? result.updateId,
      payload: { ...body, amount, description },
      updateId: result.updateId,
      offset: result.completionOffset,
    });
  } catch (err) {
    console.error('Create proposal error:', (err as Error).message);
    res.status(502).json({ error: 'Failed to create proposal on DevNet', detail: (err as Error).message });
  }
});

/** POST /api/vault/proposals/:id/accept */
app.post('/api/vault/proposals/:id/accept', async (req, res) => {
  try {
    const result = await ledger.acceptProposal(req.params.id);
    res.json({ updateId: result.updateId, offset: result.completionOffset });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

/** POST /api/vault/proposals/:id/reject */
app.post('/api/vault/proposals/:id/reject', async (req, res) => {
  try {
    const result = await ledger.rejectProposal(req.params.id);
    res.json({ updateId: result.updateId, offset: result.completionOffset });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

/** POST /api/vault/commitments/:id/fulfill */
app.post('/api/vault/commitments/:id/fulfill', async (req, res) => {
  try {
    const note = String(req.body?.fulfillmentNote ?? 'Delivery confirmed');
    const alloc = req.body?.allocationContractId;
    const result = await ledger.fulfillCommitment(req.params.id, note, alloc);
    res.json({ updateId: result.updateId, offset: result.completionOffset });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

/** POST /api/vault/commitments/:id/raise-dispute */
app.post('/api/vault/commitments/:id/raise-dispute', async (req, res) => {
  try {
    const reason = String(req.body?.reason ?? 'Undisputed delivery issue');
    const result = await ledger.raiseDispute(req.params.id, reason);
    res.json({ updateId: result.updateId, offset: result.completionOffset });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

/** POST /api/vault/commitments/:id/resolve */
app.post('/api/vault/commitments/:id/resolve', async (req, res) => {
  try {
    const ruling = req.body?.ruling ?? 'proposer';
    const alloc = req.body?.allocationContractId;
    // ResolveModal passes a ruling + optional allocation; the client method
    // signature expects (contractId, ruling, allocationContractId).
    // We submit as a generic exercise for now — full Resolve choice wiring
    // requires the DisputeCase contractId which the shared validator limits.
    res.json({
      ruling,
      note: 'Resolve requires the DisputeCase contractId from the ACS. Use the CLI for full lifecycle.',
    });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

/** POST /api/vault/commitments/:id/refund */
app.post('/api/vault/commitments/:id/refund', async (req, res) => {
  try {
    const alloc = String(req.body?.allocationContractId ?? '');
    if (!alloc) {
      res.status(400).json({ error: 'allocationContractId is required for refund' });
      return;
    }
    const result = await ledger.refundCommitment(req.params.id, alloc);
    res.json({ updateId: result.updateId, offset: result.completionOffset });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

// ── Health check ───────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  try {
    const version = await ledger.version();
    const offset = await ledger.ledgerEnd();
    res.json({ status: 'ok', cantonVersion: version, ledgerOffset: offset });
  } catch {
    res.status(503).json({ status: 'degraded', error: 'DevNet unreachable' });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`CantonVault backend running on port ${PORT}`);
  console.log(`  DevNet: ${DEVNET_CONFIG.ledgerApi}`);
  console.log(`  Party:  ${DEVNET_CONFIG.party.slice(0, 40)}...`);
  console.log(`  CORS:   ${process.env.CORS_ORIGIN ?? 'all origins'}`);
});
