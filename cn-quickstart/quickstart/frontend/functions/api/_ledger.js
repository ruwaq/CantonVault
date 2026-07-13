// Shared ledger client for all Pages Functions (ES module).
// Uses global scope to cache tokens across warm invocations.

const LEDGER_API = 'https://ledger-api.validator.devnet.sandbox.fivenorth.io';
const AUTH_URL = 'https://auth.sandbox.fivenorth.io/application/o/token/';
const CLIENT_ID = 'validator-devnet-m2m';
const CLIENT_SECRET =
  'r69FQmevLRwEgMB8NnKaSDHPewTOSx7Yy5jucsqAlmsAaJc3DlggedCz4tyyonl4W2WoOVzkUIjy8dHTlc16AOJQzx02QzJylAUG56oLTCoVCJUUK40vRv9CqQEY3fjn';
const PARTY =
  '5nsandbox-devnet-2::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8';
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

export async function submitCreate(template, args) {
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

export { LEDGER_API, PARTY, SYNCHRONIZER_ID };
