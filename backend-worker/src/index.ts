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

// ── Config (from Cloudflare Worker env bindings, with defaults for local dev) ──
// SECURITY (audit A-C1b): secrets are read from env bindings, NOT hardcoded.
// Set via wrangler.toml [vars] or Cloudflare dashboard.

function getConfig(env: Record<string, string>) {
  const ledgerApi = env.LEDGER_API || 'https://ledger-api.validator.devnet.sandbox.fivenorth.io';
  const authUrl = env.AUTH_URL || 'https://auth.sandbox.fivenorth.io/application/o/token/';
  const clientId = env.CLIENT_ID || 'validator-devnet-m2m';
  const clientSecret = env.CLIENT_SECRET || '';
  if (!clientSecret) throw new Error('CLIENT_SECRET must be set via env binding');
  const party = env.PARTY || '';
  if (!party) throw new Error('PARTY must be set via env binding');
  const synchronizerId = env.SYNCHRONIZER_ID || 'wallet::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';
  const pkg = env.PKG || 'cantonvault-contracts';
  return { ledgerApi, authUrl, clientId, clientSecret, party, synchronizerId, pkg };
}

// ── OAuth2 token (cached in global for warm Workers) ────────────────────────

interface CachedToken {
  token: string;
  expiresAt: number;
}
let tokenCache: CachedToken | null = null;

async function getToken(clientId: string, clientSecret: string, authUrl: string): Promise<string> {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAt - 5 * 60 * 1000) {
    return tokenCache.token;
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    audience: clientId,
    scope: 'daml_ledger_api',
  });
  const res = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data: any = await res.json();
  tokenCache = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

// ── Ledger API helpers (use module-level config set by fetch handler) ────────

let cfg: ReturnType<typeof getConfig> | null = null;

async function ledgerGet(path: string): Promise<any> {
  const { clientId, clientSecret, authUrl, ledgerApi } = cfg!;
  const token = await getToken(clientId, clientSecret, authUrl);
  const res = await fetch(`${ledgerApi}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await ledgerError(res, path);
  return res.json();
}

async function ledgerPost(path: string, body: unknown): Promise<any> {
  const { clientId, clientSecret, authUrl, ledgerApi } = cfg!;
  const token = await getToken(clientId, clientSecret, authUrl);
  const res = await fetch(`${ledgerApi}${path}`, {
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
    actAs: [cfg!.party],
    readAs: [cfg!.party],
    commands: [
      {
        CreateCommand: {
          templateId: `#${cfg!.pkg}:${template}`,
          createArguments: args,
        },
      },
    ],
    transactionFormat: { synchronizerId: cfg!.synchronizerId },
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
  async fetch(request: Request, env: Record<string, string>): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Initialize config from env bindings (secrets are NOT hardcoded).
    cfg = getConfig(env);

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
          party: cfg!.party,
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
          { label: 'Proposer (Supplier)', partyId: cfg!.party, role: 'proposer' },
          { label: 'Accepter (Financier)', partyId: cfg!.party, role: 'accepter' },
          { label: 'Third Party (Arbitrator)', partyId: cfg!.party, role: 'thirdParty' },
        ]);
      }

      if (path === '/api/vault/balance' && method === 'GET') {
        const offset = await ledgerEnd();
        return json({ balance: 0, party: cfg!.party, ledgerOffset: offset });
      }

      // ── Vault: create proposal (the key interactive action) ──
      if (path === '/api/vault/proposals' && method === 'POST') {
        const body: any = await request.json().catch(() => ({}));
        const amount = Number(body.amount ?? 0);
        if (amount <= 0) return error('Amount must be greater than 0', 400);
        const description = String(body.description ?? '').trim();
        if (!description) return error('Description is required', 400);

        const result = await submitCreate('Vault.CommitmentProposal:CommitmentProposal', {
          proposer: cfg!.party,
          accepter: String(body.accepter ?? cfg!.party),
          thirdParty: String(body.thirdParty ?? cfg!.party),
          amount,
          currency: String(body.currency ?? 'CC'),
          description,
          workflow: String(body.workflow ?? 'supply-chain-finance'),
          deadline: String(body.deadline ?? '2026-12-31T23:59:59Z'),
          instrumentAdmin: cfg!.party,
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
