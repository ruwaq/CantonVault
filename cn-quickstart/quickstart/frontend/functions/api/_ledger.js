// Shared ledger client for all Pages Functions (ES module).
// Uses global scope to cache tokens across warm invocations.
//
// SECURITY (audit A-C1, A-H1–H3): secrets and environment-specific config are
// read from Cloudflare Pages bindings (context.env) set via the dashboard or
// wrangler.toml. Each handler MUST call configure(context.env) before using
// any exported function. The defaults below are for local dev only and will
// be overridden by the first configure() call.

// ── Lazy config (set by the first handler that calls configure()) ────────────
// SECURITY: these defaults are the DevNet shared validator values for the demo.
// In production, override via Cloudflare Pages env bindings (dashboard or wrangler.toml).
// CLIENT_SECRET is the only sensitive value — rotate it and set via env binding.
let _ledgerApi = 'https://ledger-api.validator.devnet.sandbox.fivenorth.io';
let _validatorApi = 'https://api.validator.devnet.sandbox.fivenorth.io';
let _authUrl = 'https://auth.sandbox.fivenorth.io/application/o/token/';
let _clientId = 'validator-devnet-m2m';
let _clientSecret = 'r69FQmevLRwEgMB8NnKaSDHPewTOSx7Yy5jucsqAlmsAaJc3DlggedCz4tyyonl4W2WoOVzkUIjy8dHTlc16AOJQzx02QzJylAUG56oLTCoVCJUUK40vRv9CqQEY3fjn';
let _party = 'cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';
let _mediatorParty = 'Observer::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';
let _synchronizerId = 'wallet::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';
let _pkg = 'cantonvault-contracts';
let _configured = false;

/**
 * Initialize the ledger client from Cloudflare Pages bindings.
 * Call once at the top of every handler: configure(context.env).
 * Falls back to DevNet defaults when env vars are not set (demo mode).
 * In production, set CLIENT_SECRET via env binding to override the default.
 */
export function configure(env) {
  if (_configured) return;
  _ledgerApi = env.LEDGER_API || _ledgerApi;
  _validatorApi = env.VALIDATOR_API || _validatorApi;
  _authUrl = env.AUTH_URL || _authUrl;
  _clientId = env.CLIENT_ID || _clientId;
  _clientSecret = env.CLIENT_SECRET || _clientSecret;
  _party = env.PARTY || _party;
  _mediatorParty = env.MEDIATOR_PARTY || _mediatorParty;
  _synchronizerId = env.SYNCHRONIZER_ID || _synchronizerId;
  _pkg = env.PKG || _pkg;
  _configured = true;
}

// ── Accessors (so the rest of the module reads from the configured values) ──
const LEDGER_API = { get value() { return _ledgerApi; } };
const VALIDATOR_API = { get value() { return _validatorApi; } };
const AUTH_URL = { get value() { return _authUrl; } };
const CLIENT_ID = { get value() { return _clientId; } };
const CLIENT_SECRET = { get value() { return _clientSecret; } };
const PARTY = { get value() { return _party; } };
const MEDIATOR_PARTY = { get value() { return _mediatorParty; } };
const SYNCHRONIZER_ID = { get value() { return _synchronizerId; } };
const PKG = _pkg;

let tokenCache = null;

export async function getToken() {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAt - 5 * 60 * 1000) {
    return tokenCache.token;
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID.value,
    client_secret: CLIENT_SECRET.value,
    audience: CLIENT_ID.value,
    scope: 'daml_ledger_api',
  });
  const res = await fetch(AUTH_URL.value, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data = await res.json();
  tokenCache = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

export async function ledgerGet(path) {
  const token = await getToken();
  const res = await fetch(`${LEDGER_API.value}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Ledger GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function ledgerPost(path, payload) {
  const token = await getToken();
  const res = await fetch(`${LEDGER_API.value}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ledger POST ${path} (${res.status}): ${text}`);
  }
  return res.json();
}

export async function ledgerEnd() {
  return (await ledgerGet('/v2/state/ledger-end')).offset;
}

// Canton 3.5 JSON Ledger API command submission. We use submit-and-wait-for-transaction
// (not submit-and-wait) because only the former returns the full event list, which is how
// we recover the REAL contractId of a created contract — submit-and-wait returns only
// {updateId, completionOffset}, and updateId is the tx hash, NOT a usable contractId.
//
// The request body is wrapped as { commands: { ... }, transactionShape } per the 3.5 schema.
// Build the Canton 3.5 command envelope. `extraActAs` lets a caller add
// additional authorizing parties — needed when a choice's controller is a
// party other than PARTY (e.g. ResolveDispute is controlled by thirdParty,
// which is MEDIATOR_PARTY). PARTY is always included as the primary actor.
function buildCommandEnvelope(commands, extraActAs = []) {
  const actAs = Array.from(new Set([PARTY.value, ...extraActAs]));
  return {
    commands: {
      applicationId: 'AppId',
      commandId: `cv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actAs,
      readAs: actAs,
      commands,
      transactionShape: 'CURRENT_LEDGER_END',
    },
    workflowId: 'cantonvault',
  };
}

// Extract a CreatedEvent contractId from a submit-and-wait-for-transaction
// response. The ledger returns events as
// [{CreatedEvent: {...}} | {ArchivedEvent: {...}} | {ExercisedEvent: {...}}].
//
// `templateFilter` (optional): when a choice creates MULTIPLE contracts (e.g.
// RaiseDispute creates both a DisclosedRecord and a DisputeCase), pass the
// template suffix to pick the right one. Without it we return the FIRST
// CreatedEvent — which may be the wrong contract in multi-create choices.
function extractCreatedContractId(txResponse, templateFilter) {
  const events = txResponse?.transaction?.events ?? [];
  const created = events
    .map((e) => e.CreatedEvent)
    .filter(Boolean);
  if (templateFilter) {
    const match = created.find((e) => {
      const tid = e.templateId || '';
      return typeof tid === 'string'
        ? tid.includes(templateFilter)
        : JSON.stringify(tid).includes(templateFilter);
    });
    if (match) return match.contractId;
  }
  return created[0]?.contractId ?? null;
}

export async function submitCreate(template, args) {
  const tx = await ledgerPost('/v2/commands/submit-and-wait-for-transaction', buildCommandEnvelope([
    {
      CreateCommand: {
        templateId: `#${PKG}:${template}`,
        createArguments: args,
      },
    },
  ]));
  // Return both the tx-level updateId/offset (proves it landed) and the created
  // contractId (needed to exercise subsequent choices on this contract).
  return {
    updateId: tx.transaction?.updateId ?? tx.updateId,
    completionOffset: tx.transaction?.offset ?? tx.completionOffset,
    contractId: extractCreatedContractId(tx),
  };
}

// Exercise a choice on an existing contract (Canton 3.5 JSON Ledger API).
// `template` is the "ModuleName:EntityName" suffix (e.g. 'Vault.CommitmentContract:CommitmentContract');
// the package prefix is added here. `argument` is the choice's record payload
// (may be empty {}), serialized under the `choiceArgument` field per the 3.5 spec.
//
// `createdTemplateFilter` (optional): when the choice creates MULTIPLE contracts
// of different templates (e.g. RaiseDispute creates a DisclosedRecord AND a
// DisputeCase), pass the suffix of the one whose contractId you want returned.
// Without it the FIRST CreatedEvent's contractId is returned — which is wrong
// for multi-create choices where you need a specific child.
export async function submitExercise(template, contractId, choice, argument, createdTemplateFilter, extraActAs) {
  const tx = await ledgerPost('/v2/commands/submit-and-wait-for-transaction', buildCommandEnvelope([
    {
      ExerciseCommand: {
        templateId: `#${PKG}:${template}`,
        contractId,
        choice,
        choiceArgument: argument,
      },
    },
  ], extraActAs));
  return {
    updateId: tx.transaction?.updateId ?? tx.updateId,
    completionOffset: tx.transaction?.offset ?? tx.completionOffset,
    contractId: extractCreatedContractId(tx, createdTemplateFilter),
  };
}

// Read active contracts from the ACS filtered by templateId(s).
// Returns a uniform shape [{ contractId, payload }] that the frontend's
// RawContractEnvelope + vaultNormalizers expect, regardless of the raw
// envelope fields Canton returns.
export async function queryActiveContracts(templateIds) {
  const data = await ledgerPost('/v2/state/active-contracts', {
    filter: {
      filtersForAnyParty: {
        identifierFilter: { templateIds },
      },
    },
    readAs: [PARTY.value],
  });
  return (Array.isArray(data) ? data : []).map((item) => ({
    contractId: item.contractId,
    payload: item.payload ?? item,
  }));
}

// Query the REAL on-ledger Canton Coin (Amulet) balance via the Splice Validator
// REST API. The JSON Ledger API ACS does not divulge Amulet holdings to the shared
// validator m2m user; the Validator wallet endpoint is the authoritative source.
// Returns { unlocked, locked, round } or null if unreachable.
export async function walletBalance(party = PARTY.value) {
  const token = await getToken();
  const url = `${VALIDATOR_API.value}/api/validator/v0/wallet/balance?party=${encodeURIComponent(party)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Validator wallet balance failed: ${res.status}`);
  const data = await res.json();
  return {
    unlocked: data.effective_unlocked_qty ?? '0',
    locked: data.effective_locked_qty ?? '0',
    round: data.round ?? 0,
  };
}

// ── KV index of CantonVault contractIds ─────────────────────────────────────
// The Canton sandbox multi-tenant validator does NOT divulge contracts created
// by the m2m user through the Active Contract Set (ACS). queryActiveContracts()
// always returns [] for our templates here, and /v2/updates is drowned by 200+
// unrelated HTLC contracts per offset page. So we maintain a local append-only
// index in Cloudflare KV: every create/exercise writes {cid, kind, payload,
// status} here, and the GET endpoints read from it filtered by status.
//
// Key shape: "<kind>:<contractId>"  e.g. "proposal:00a1...e5f8"
// Value shape: { cid, kind, payload, status, sourceCid?, createdAt, offset }
//
// `kind` ∈ { proposal, commitment, receipt, disclosure, dispute }.
// `status` tracks the lifecycle (pending/accepted/rejected/active/fulfilled/
// refunded/disputed/resolved) so each GET can filter to the relevant subset.
// `sourceCid` links a derived contract back to its origin (e.g. a receipt to
// the commitment it settled, a dispute to its commitment) — used by resolve.js.

const KV_BINDING = 'VAULT_KV';

function kv(env) {
  const ns = env?.[KV_BINDING];
  if (!ns) throw new Error('KV namespace VAULT_KV not bound');
  return ns;
}

// Write one index record. Overwrites (idempotent) if the same cid is written twice.
export async function kvPut(env, kind, cid, record) {
  const key = `${kind}:${cid}`;
  const entry = {
    cid,
    kind,
    status: record.status ?? 'active',
    payload: record.payload ?? {},
    sourceCid: record.sourceCid ?? null,
    createdAt: record.createdAt ?? new Date().toISOString(),
    offset: record.offset ?? null,
  };
  await kv(env).put(key, JSON.stringify(entry));
  return entry;
}

// Read one record (returns null if absent).
export async function kvGet(env, kind, cid) {
  const raw = await kv(env).get(`${kind}:${cid}`);
  return raw ? JSON.parse(raw) : null;
}

// Update only the status of an existing record (no-op if absent).
export async function kvUpdateStatus(env, kind, cid, status) {
  const entry = await kvGet(env, kind, cid);
  if (!entry) return null;
  entry.status = status;
  await kv(env).put(`${kind}:${cid}`, JSON.stringify(entry));
  return entry;
}

// List all records of a kind, optionally filtered by status.
// One list() call + N get() calls. For the demo (tens of contracts) this is a
// handful of reads — well within the 100k/day Free tier.
export async function kvList(env, kind, statuses) {
  const ns = kv(env);
  const listed = await ns.list({ prefix: `${kind}:` });
  const want = statuses ? new Set(statuses) : null;
  const records = [];
  for (const k of listed.keys) {
    const raw = await ns.get(k.name);
    if (!raw) continue;
    const entry = JSON.parse(raw);
    if (!want || want.has(entry.status)) records.push(entry);
  }
  // Newest first — the demo reads better with recent activity on top.
  records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return records;
}

// List records shaped as the frontend's RawContractEnvelope expects:
// [{ contractId, payload }]. This is what the GET endpoints return so the
// existing vaultNormalizers (cidOf / toContracts) work without frontend changes.
// Dispute records additionally surface `commitmentRef` (from sourceCid) inside
// the payload, since the frontend's DisputeCase type reads commitmentRef.
export async function kvListAsContracts(env, kind, statuses) {
  const records = await kvList(env, kind, statuses);
  return records.map((r) => {
    const payload = { ...r.payload };
    // DisputeCase normalizer reads payload.commitmentRef; surface the KV link.
    if (r.sourceCid && payload.commitmentRef === undefined) {
      payload.commitmentRef = r.sourceCid;
    }
    return { contractId: r.cid, payload, _status: r.status, _offset: r.offset };
  });
}

export { LEDGER_API, VALIDATOR_API, PARTY, MEDIATOR_PARTY, SYNCHRONIZER_ID, PKG };
