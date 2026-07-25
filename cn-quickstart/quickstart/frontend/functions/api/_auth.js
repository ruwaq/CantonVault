// Auth primitives for CantonVault Pages Functions.
//
// Model (audit Fase 3, C-2/C-6): a short-lived session cookie signed with
// HMAC-SHA256 using SESSION_SECRET (env binding). The cookie is HttpOnly +
// Secure + SameSite=Strict, so it is never readable by JS and is only sent
// same-origin. Login exchanges a shared DEMO_TOKEN (env binding) for the cookie;
// the browser then sends the cookie automatically on every same-origin request.
//
// These helpers are pure (no I/O except crypto). The middleware in
// _middleware.js wires them into the request lifecycle.

const COOKIE_NAME = 'cv_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// Paths that never require a session cookie. Everything else under /api/* does.
// Keep this list small and explicit — adding a path here means anonymous access.
export const PUBLIC_PATHS = new Set([
  '/api/health',
  '/api/login-links',
  '/api/auth/login',
]);

/** Decode and compare a Bearer token from the Authorization header. */
function readBearer(request) {
  const h = request.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

/** Import SESSION_SECRET as an HMAC key. Cached per isolate. */
let hmacKeyPromise = null;
function getHmacKey(secret) {
  if (!secret) throw new Error('SESSION_SECRET env binding is required');
  if (hmacKeyPromise && hmacKeyPromise._secret === secret) return hmacKeyPromise;
  hmacKeyPromise = crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  hmacKeyPromise._secret = secret;
  return hmacKeyPromise;
}

async function hmac(secret, message) {
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return bufToHex(sig);
}

/** Constant-time string compare to avoid timing oracles. */
async function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function b64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  try {
    return atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
  } catch {
    return null;
  }
}

/**
 * Build a signed session cookie value: base64url(payload).hex(signature).
 * Payload: { exp } (epoch ms). Signature: HMAC-SHA256(payload).
 */
async function issueSession(env) {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = b64urlEncode(JSON.stringify({ exp }));
  const sig = await hmac(env.SESSION_SECRET, payload);
  return `${payload}.${sig}`;
}

/** Verify a cookie value; returns true iff signature matches and not expired. */
async function verifySession(env, cookieValue) {
  if (!cookieValue || !cookieValue.includes('.')) return false;
  const [payload, sig] = cookieValue.split('.');
  if (!payload || !sig) return false;
  const expected = await hmac(env.SESSION_SECRET, payload);
  if (!(await safeEqual(sig, expected))) return false;
  const decoded = b64urlDecode(payload);
  if (!decoded) return false;
  try {
    const { exp } = JSON.parse(decoded);
    if (typeof exp !== 'number' || !Number.isFinite(exp)) return false;
    return Date.now() < exp;
  } catch {
    return false;
  }
}

/** Parse the cv_session cookie out of a Cookie header. */
function readSessionCookie(request) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === COOKIE_NAME) return rest.join('=');
  }
  return '';
}

/** Full Set-Cookie header for a newly issued session (8h TTL). */
export async function buildSessionCookieHeader(env) {
  const value = await issueSession(env);
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`;
}

/** Set-Cookie header that clears the session cookie. */
export function buildClearCookieHeader() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

/** Returns true iff the request bears a valid Authorization: Bearer DEMO_TOKEN. */
export async function isValidDemoToken(env, request) {
  if (!env.DEMO_TOKEN) return false;
  return safeEqual(readBearer(request), env.DEMO_TOKEN);
}

/** Returns true iff the request bears a valid session cookie. */
export async function hasValidSession(env, request) {
  const value = readSessionCookie(request);
  if (!value) return false;
  return verifySession(env, value);
}

export { COOKIE_NAME };
