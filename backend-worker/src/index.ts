// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

/**
 * CantonVault Backend — Cloudflare Worker.
 *
 * Bridges the React frontend (canton-vault.pages.dev) to the Canton Network
 * DevNet JSON Ledger API v2 (ledger-api.validator.devnet.sandbox.fivenorth.io).
 *
 * Serves the same /api/* endpoints the frontend expects, backed by real
 * on-ledger CantonVault contracts.
 */

// ── Config ──────────────────────────────────────────────────────────────────

const LEDGER_API = 'https://ledger-api.validator.devnet.sandbox.fivenorth.io';
const AUTH_URL = 'https://auth.sandbox.fivenorth.io/application/o/token/';
const CLIENT_ID = 'validator-devnet-m2m';
const CLIENT_SECRET =
  'r69FQmevLRwEgMB8NnKaSDHPewTOSx7Yy5jucsqAlmsAaJc3DlggedCz4tyyonl4W2WoOVzkUIjy8dHTlc16AOJQzx02QzJylAUG56oLTCoVCJUUK40vRv9CqQEY3fjn';
const PARTY =
  'cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';
const SYNCHRONIZER_ID =
  'wallet::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';
const PKG = 'cantonvault-contracts';

// ── OAuth2 token (cached in global for warm Workers) ────────────────────────

interface CachedToken {
  token: string;
  expiresAt: number;
}
let tokenCache: CachedToken | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAt - 5 * 60 * 1000) {
    return tokenCache.token;
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    audience: CLIENT_ID,
    scope: 'daml_ledger_api',
  });
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data: any = await res.json();
  tokenCache = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

// ── Ledger API helpers ──────────────────────────────────────────────────────

async function ledgerGet(path: string): Promise<any> {
  const token = await getToken();
  const res = await fetch(`${LEDGER_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await ledgerError(res, path);
  return res.json();
}

async function ledgerPost(path: string, body: unknown): Promise<any> {
  const token = await getToken();
  const res = await fetch(`${LEDGER_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await ledgerError(res, path);
  return res.json();
}

async function ledgerError(res: Response, path: string): Promise<Error> {
  let detail = '';
  try {
    const body = await res.json();
    detail = body.cause ?? body.errors?.[0] ?? JSON.stringify(body);
  } catch {
    detail = await res.text();
  }
  return new Error(`Ledger ${path} (${res.status}): ${detail}`);
}

async function ledgerEnd(): Promise<number> {
  const data = await ledgerGet('/v2/state/ledger-end');
  return data.offset;
}

/** Submit a Create command and wait for completion. */
async function submitCreate(template: string, args: Record<string, unknown>): Promise<any> {
  return ledgerPost('/v2/commands/submit-and-wait', {
    applicationId: 'AppId',
    commandId: `cv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actAs: [PARTY],
    readAs: [PARTY],
    commands: [
      {
        CreateCommand: {
          templateId: `#${PKG}:${template}`,
          createArguments: args,
        },
      },
    ],
    transactionFormat: { synchronizerId: SYNCHRONIZER_ID },
  });
}

// ── HTTP helpers ────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function error(message: string, status = 502): Response {
  return json({ error: message }, status);
}

// ── Router ──────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // ── Health ──
      if (path === '/health') {
        const [ver, off] = await Promise.all([
          ledgerGet('/v2/version').then((d: any) => d.version),
          ledgerEnd(),
        ]);
        return json({ status: 'ok', cantonVersion: ver, ledgerOffset: off });
      }

      // ── Auth ──
      if (path === '/api/authenticated-user' && method === 'GET') {
        const offset = await ledgerEnd();
        return json({
          name: 'CantonVault Operator',
          party: PARTY,
          isAdmin: true,
          ledgerOffset: offset,
        });
      }

      if (path === '/api/login-links' && method === 'GET') {
        return json([{ name: 'CantonVault Demo', url: '/home' }]);
      }

      if (path === '/api/logout' && method === 'POST') {
        return json({ loggedOut: true });
      }

      // ── Vault: read endpoints (empty arrays; shared validator limits ACS reads) ──
      if (
        method === 'GET' &&
        ['/api/vault/proposals', '/api/vault/commitments', '/api/vault/receipts',
         '/api/vault/disclosures', '/api/vault/dispute-cases'].some((p) => path === p)
      ) {
        return json([]);
      }

      if (path === '/api/vault/parties' && method === 'GET') {
        return json([
          { label: 'Proposer (Supplier)', partyId: PARTY, role: 'proposer' },
          { label: 'Accepter (Financier)', partyId: PARTY, role: 'accepter' },
          { label: 'Third Party (Arbitrator)', partyId: PARTY, role: 'thirdParty' },
        ]);
      }

      if (path === '/api/vault/balance' && method === 'GET') {
        const offset = await ledgerEnd();
        return json({ balance: 0, party: PARTY, ledgerOffset: offset });
      }

      // ── Vault: create proposal (the key interactive action) ──
      if (path === '/api/vault/proposals' && method === 'POST') {
        const body: any = await request.json().catch(() => ({}));
        const amount = Number(body.amount ?? 0);
        if (amount <= 0) return error('Amount must be greater than 0', 400);
        const description = String(body.description ?? '').trim();
        if (!description) return error('Description is required', 400);

        const result = await submitCreate('Vault.CommitmentProposal:CommitmentProposal', {
          proposer: PARTY,
          accepter: String(body.accepter ?? PARTY),
          thirdParty: String(body.thirdParty ?? PARTY),
          amount,
          currency: String(body.currency ?? 'CC'),
          description,
          workflow: String(body.workflow ?? 'supply-chain-finance'),
          deadline: String(body.deadline ?? '2026-12-31T23:59:59Z'),
          instrumentAdmin: PARTY,
          realSettlementRequired: false,
        });
        return json({
          contractId: result.updateId,
          payload: { ...body, amount, description },
          updateId: result.updateId,
          offset: result.completionOffset,
        }, 201);
      }

      // ── Vault: choice exercises (accept, reject, fulfill, dispute, refund) ──
      const choiceMatch = path.match(
        /^\/api\/vault\/(?:proposals|commitments)\/([^/]+)\/(accept|reject|fulfill|raise-dispute|resolve|refund)$/,
      );
      if (choiceMatch && method === 'POST') {
        const contractId = choiceMatch[1];
        const action = choiceMatch[2];
        const body: any = await request.json().catch(() => ({}));

        // The shared validator limits ACS reads so we can't resolve contractIds
        // to exercise choices. For the demo, we respond with a structured note.
        // The CLI (cli/) handles full lifecycle on LocalNet.
        return json({
          action,
          contractId,
          note: 'Choice exercises require contractId resolution from ACS. Use the CLI for full lifecycle on LocalNet.',
          received: body,
        });
      }

      // ── 404 ──
      return error(`Not found: ${method} ${path}`, 404);
    } catch (err) {
      console.error('Handler error:', err);
      return error((err as Error).message);
    }
  },
};
