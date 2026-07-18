// POST /api/vault/seed-demo
// Seeds the Cloudflare KV index with 3 realistic demo scenarios spanning
// the full CantonVault lifecycle: proposals, commitments, disputes, disclosures,
// and settlement receipts. Each scenario uses realistic contract IDs, timestamps,
// and party hashes so the Privacy Lab and ActStep show meaningful data.
//
// This endpoint is idempotent — calling it twice overwrites the same keys.
// The demo data is written directly to KV (no on-ledger contracts are created),
// so it's instant and doesn't depend on the DevNet being available.

import { kvPut, kvList, configure } from '../_ledger';

// ── Party identifiers (match the real DevNet parties) ──────────────────────
const PROPOSER = 'cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';
const ACCEPTER = 'cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';
const MEDIATOR = 'Observer::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';
const INSTRUMENT_ADMIN = 'cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';

// ── Deterministic contract IDs (prevents duplicate KV entries on re-seed) ──
// Each ID is prefixed with the scenario number so the Privacy Lab can
// match disclosures and receipts to their parent commitment.
const IDS = {
  // Scenario 1: Invoice Factoring
  s1_proposal:    '00a1c0ffee00000000000000000000000000000000000000000000000000000001',
  s1_commitment:  '00b1c0ffee00000000000000000000000000000000000000000000000000000001',
  // Scenario 2: OTC Block Trade
  s2_proposal:    '00a2c0ffee00000000000000000000000000000000000000000000000000000002',
  s2_commitment:  '00b2c0ffee00000000000000000000000000000000000000000000000000000002',
  s2_dispute:     '00d2c0ffee00000000000000000000000000000000000000000000000000000002',
  s2_disclosure:  '00b2c0ffee00000000000000000000000000000000000000000000000000000002-dispute',
  // Scenario 3: Cross-border Payment
  s3_proposal:    '00a3c0ffee00000000000000000000000000000000000000000000000000000003',
  s3_commitment:  '00b3c0ffee00000000000000000000000000000000000000000000000000000003',
  s3_receipt:     '00r3c0ffee00000000000000000000000000000000000000000000000000000003',
  // Scenario 4: Pending Proposal (for Step 1 demo)
  s4_proposal:    '00a4c0ffee00000000000000000000000000000000000000000000000000000004',
};

// ── Timestamp helpers ──────────────────────────────────────────────────────
const NOW = new Date();
function ago(minutes) {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

// ── Scenario 1: Invoice Factoring (supply-chain-finance, 100,000 CC) ────────
// Lifecycle: Proposal → Accepted → Commitment (active) — shows in ActStep
function seedScenario1(env) {
  const proposalId = IDS.s1_proposal;
  const commitmentId = IDS.s1_commitment;
  const basePayload = {
    proposer: PROPOSER,
    accepter: ACCEPTER,
    thirdParty: MEDIATOR,
    amount: 100000,
    currency: 'CC',
    description: 'Invoice INV-2026-089 — Electronics shipment Q3',
    workflow: 'supply-chain-finance',
    deadline: new Date(NOW.getTime() + 7 * 24 * 60 * 60_000).toISOString(),
    instrumentAdmin: INSTRUMENT_ADMIN,
    realSettlementRequired: false,
  };

  const ops = [
    kvPut(env, 'proposal', proposalId, {
      status: 'accepted',
      payload: basePayload,
      createdAt: ago(45),
      offset: '4297574',
    }),
    kvPut(env, 'commitment', commitmentId, {
      status: 'active',
      payload: { ...basePayload },
      sourceCid: proposalId,
      createdAt: ago(42),
      offset: '4297626',
    }),
  ];
  return { proposalId, commitmentId, ops };
}

// ── Scenario 2: OTC Block Trade (otc-block-trade, 10,000,000 CC) ───────────
// Lifecycle: Proposal → Accepted → Commitment (disputed) → DisputeCase + Disclosure
function seedScenario2(env) {
  const proposalId = IDS.s2_proposal;
  const commitmentId = IDS.s2_commitment;
  const disputeId = IDS.s2_dispute;
  const disclosureId = IDS.s2_disclosure;
  const basePayload = {
    proposer: PROPOSER,
    accepter: ACCEPTER,
    thirdParty: MEDIATOR,
    amount: 10000000,
    currency: 'CC',
    description: 'OTC Block Trade — US0378331005 $10M @ 98.50',
    workflow: 'otc-block-trade',
    deadline: new Date(NOW.getTime() + 3 * 24 * 60 * 60_000).toISOString(),
    instrumentAdmin: INSTRUMENT_ADMIN,
    realSettlementRequired: false,
  };

  const ops = [
    kvPut(env, 'proposal', proposalId, {
      status: 'accepted',
      payload: basePayload,
      createdAt: ago(120),
      offset: '4297881',
    }),
    kvPut(env, 'commitment', commitmentId, {
      status: 'disputed',
      payload: { ...basePayload },
      sourceCid: proposalId,
      createdAt: ago(115),
      offset: '4298435',
    }),
    kvPut(env, 'dispute', disputeId, {
      status: 'open',
      payload: {
        commitmentRef: commitmentId,
        proposer: PROPOSER,
        accepter: ACCEPTER,
        thirdParty: MEDIATOR,
        reason: 'Counterparty failed to deliver securities by settlement date',
        amountRevealed: 10000000,
        descriptionRevealed: 'OTC Block Trade — US0378331005',
        ruling: null,
      },
      sourceCid: commitmentId,
      createdAt: ago(90),
      offset: '4298442',
    }),
    kvPut(env, 'disclosure', disclosureId, {
      status: 'dispute',
      payload: {
        sourceCid: commitmentId,
        discloser: PROPOSER,
        observer: MEDIATOR,
        revealedFields: {
          amount: '10000000',
          description: 'OTC Block Trade — US0378331005',
        },
        reason: 'Counterparty failed to deliver securities by settlement date',
        revealedAt: ago(90),
      },
      sourceCid: commitmentId,
      createdAt: ago(90),
      offset: '4298442',
    }),
  ];
  return { proposalId, commitmentId, disputeId, disclosureId, ops };
}

// ── Scenario 3: Cross-border Payment (supply-chain-finance, 50,000 CC) ─────
// Lifecycle: Proposal → Accepted → Commitment (fulfilled) → SettlementReceipt
function seedScenario3(env) {
  const proposalId = IDS.s3_proposal;
  const commitmentId = IDS.s3_commitment;
  const receiptId = IDS.s3_receipt;
  const basePayload = {
    proposer: PROPOSER,
    accepter: ACCEPTER,
    thirdParty: MEDIATOR,
    amount: 50000,
    currency: 'CC',
    description: 'Cross-border payment — Mexico supplier NET-45',
    workflow: 'supply-chain-finance',
    deadline: new Date(NOW.getTime() + 1 * 24 * 60 * 60_000).toISOString(),
    instrumentAdmin: INSTRUMENT_ADMIN,
    realSettlementRequired: false,
  };

  const ops = [
    kvPut(env, 'proposal', proposalId, {
      status: 'accepted',
      payload: basePayload,
      createdAt: ago(180),
      offset: '4297575',
    }),
    kvPut(env, 'commitment', commitmentId, {
      status: 'fulfilled',
      payload: { ...basePayload },
      sourceCid: proposalId,
      createdAt: ago(175),
      offset: '4297627',
    }),
    kvPut(env, 'receipt', receiptId, {
      status: 'fulfilled',
      payload: {
        proposer: PROPOSER,
        accepter: ACCEPTER,
        amount: 50000,
        currency: 'CC',
        timestamp: ago(150),
        outcome: 'fulfilled',
        settlementExecuted: false,
        note: 'Goods delivered and verified — payment released',
      },
      sourceCid: commitmentId,
      createdAt: ago(150),
      offset: '4297882',
    }),
  ];
  return { proposalId, commitmentId, receiptId, ops };
}

// ── Scenario 4: Pending Proposal (supply-chain-finance, 75,000 CC) ──────────
// A proposal waiting for acceptance — shows in Step 1 (Propose)
function seedScenario4(env) {
  const proposalId = IDS.s4_proposal;
  const basePayload = {
    proposer: PROPOSER,
    accepter: ACCEPTER,
    thirdParty: MEDIATOR,
    amount: 75000,
    currency: 'CC',
    description: 'Invoice INV-2026-112 — Raw materials Brazil',
    workflow: 'supply-chain-finance',
    deadline: new Date(NOW.getTime() + 2 * 24 * 60 * 60_000).toISOString(),
    instrumentAdmin: INSTRUMENT_ADMIN,
    realSettlementRequired: false,
  };

  const ops = [
    kvPut(env, 'proposal', proposalId, {
      status: 'pending',
      payload: basePayload,
      createdAt: ago(10),
      offset: '4298999',
    }),
  ];
  return { proposalId, ops };
}

// ── Handler ─────────────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;
  configure(env);

  // SECURITY (audit S-A1): require a shared secret to prevent unauthorized
  // KV overwrites. The frontend sends this as a header; if unset, the endpoint
  // is open (demo mode). In production, set SEED_SECRET via env binding.
  const seedSecret = env.SEED_SECRET;
  if (seedSecret) {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token !== seedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized — provide valid Bearer token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    // ── Cleanup old demo entries (from previous random-ID seeds) ──────────
    const VALID_IDS = new Set(Object.values(IDS));
    const allKinds = ['proposal', 'commitment', 'receipt', 'disclosure', 'dispute'];
    for (const kind of allKinds) {
      const records = await kvList(env, kind);
      for (const r of records) {
        if (!VALID_IDS.has(r.cid)) {
          // Delete entries that don't match the deterministic IDs (old random seeds).
          await env.VAULT_KV.delete(`${kind}:${r.cid}`);
        }
      }
    }

    const s1 = seedScenario1(env);
    const s2 = seedScenario2(env);
    const s3 = seedScenario3(env);
    const s4 = seedScenario4(env);

    const allOps = [...s1.ops, ...s2.ops, ...s3.ops, ...s4.ops];
    await Promise.all(allOps);

    const total = allOps.length;
    const response = {
      seeded: total,
      scenarios: 4,
      details: {
        scenario1: {
          label: 'Invoice Factoring',
          workflow: 'supply-chain-finance',
          amount: '100,000 CC',
          lifecycle: 'active',
          contracts: { proposal: s1.proposalId, commitment: s1.commitmentId },
        },
        scenario2: {
          label: 'OTC Block Trade',
          workflow: 'otc-block-trade',
          amount: '10,000,000 CC',
          lifecycle: 'disputed',
          contracts: {
            proposal: s2.proposalId,
            commitment: s2.commitmentId,
            dispute: s2.disputeId,
            disclosure: s2.disclosureId,
          },
        },
        scenario3: {
          label: 'Cross-border Payment',
          workflow: 'supply-chain-finance',
          amount: '50,000 CC',
          lifecycle: 'fulfilled',
          contracts: {
            proposal: s3.proposalId,
            commitment: s3.commitmentId,
            receipt: s3.receiptId,
          },
        },
        scenario4: {
          label: 'Pending Proposal',
          workflow: 'supply-chain-finance',
          amount: '75,000 CC',
          lifecycle: 'pending',
          contracts: { proposal: s4.proposalId },
        },
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to seed demo data', detail: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}