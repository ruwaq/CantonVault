// Shared ledger client for all Pages Functions (ES module).
// Uses global scope to cache tokens across warm invocations.

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

let tokenCache = null;

export async function getToken() {
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
  const data = await res.json();
  tokenCache = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

export async function ledgerGet(path) {
  const token = await getToken();
  const res = await fetch(`${LEDGER_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Ledger GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function ledgerPost(path, payload) {
  const token = await getToken();
  const res = await fetch(`${LEDGER_API}${path}`, {
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
function buildCommandEnvelope(commands) {
  return {
    commands: {
      applicationId: 'AppId',
      commandId: `cv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actAs: [PARTY],
      readAs: [PARTY],
      commands,
      transactionShape: 'CURRENT_LEDGER_END',
    },
    workflowId: 'cantonvault',
  };
}

// Extract the first CreatedEvent contractId from a submit-and-wait-for-transaction response.
// The ledger returns events as [{CreatedEvent: {...}} | {ArchivedEvent: {...}} | {ExercisedEvent: {...}}].
function extractCreatedContractId(txResponse) {
  const events = txResponse?.transaction?.events ?? [];
  for (const e of events) {
    if (e.CreatedEvent?.contractId) return e.CreatedEvent.contractId;
  }
  return null;
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
export async function submitExercise(template, contractId, choice, argument) {
  const tx = await ledgerPost('/v2/commands/submit-and-wait-for-transaction', buildCommandEnvelope([
    {
      ExerciseCommand: {
        templateId: `#${PKG}:${template}`,
        contractId,
        choice,
        choiceArgument: argument,
      },
    },
  ]));
  // Choices like AcceptProposal/Fulfill create a new contract (CommitmentContract /
  // SettlementReceipt). Return that new contractId so the caller can act on it.
  return {
    updateId: tx.transaction?.updateId ?? tx.updateId,
    completionOffset: tx.transaction?.offset ?? tx.completionOffset,
    contractId: extractCreatedContractId(tx),
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
    readAs: [PARTY],
  });
  return (Array.isArray(data) ? data : []).map((item) => ({
    contractId: item.contractId,
    payload: item.payload ?? item,
  }));
}

export { LEDGER_API, PARTY, SYNCHRONIZER_ID, PKG };
