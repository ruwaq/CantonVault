// Top-level middleware for /api/*. Runs before every Pages Function in the api/ tree.
//
// Responsibilities (audit Fase 3, C-2/H-8/H-11):
//   1. CORS: allowlist of origins, explicit headers, credentials allowed.
//   2. Rate limit: per-identity (cookie or IP) token bucket in KV, 60 req/min.
//   3. Session enforcement: non-public routes require a valid cv_session cookie.
//
// Public routes (health, login-links, auth/login) bypass the session check but
// still go through CORS + rate limit. seed-demo and every vault/* mutator
// require a valid session.
import { hasValidSession, PUBLIC_PATHS } from './_auth.js';

const ALLOWED_ORIGINS = new Set([
  'https://canton-vault.pages.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

const RATE_LIMIT_WINDOW_SEC = 60;
const RATE_LIMIT_MAX = 60; // requests per identity per window

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function identityKey(request, env) {
  // Prefer a hash of the cookie; fall back to the client IP. Never log raw.
  const cookie = request.headers.get('Cookie') || '';
  const forwarded = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Real-IP') || 'unknown';
  if (cookie.includes('cv_session=')) return 'c:' + cookie.slice(0, 64);
  return 'i:' + forwarded;
}

async function rateLimited(env, request) {
  // Sliding window via KV. KV is eventually consistent, so this is a soft limit —
  // good enough to protect the 100k/day Cloudflare Free quota and the DevNet.
  if (!env.VAULT_KV) return false;
  const key = 'rl:' + identityKey(request, env);
  const now = Date.now();
  let count = 0;
  let windowStart = now;
  try {
    const raw = await env.VAULT_KV.get(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.count === 'number' && typeof parsed.windowStart === 'number') {
        if (now - parsed.windowStart < RATE_LIMIT_WINDOW_SEC * 1000) {
          count = parsed.count;
          windowStart = parsed.windowStart;
        }
      }
    }
  } catch {
    // corrupt entry — treat as fresh window
  }
  count += 1;
  // TTL a bit beyond the window so stale entries self-clean.
  await env.VAULT_KV.put(key, JSON.stringify({ count, windowStart }), {
    expirationTtl: RATE_LIMIT_WINDOW_SEC + 5,
  });
  return count > RATE_LIMIT_MAX;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // 1. CORS preflight — answer immediately.
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  // 2. Rate limit (applies to everything, including public routes).
  try {
    if (await rateLimited(env, request)) {
      return jsonError(429, 'Too Many Requests', corsHeaders(request));
    }
  } catch {
    // If rate limiting itself fails (e.g. KV transiently), do NOT block —
    // fail open here so we don't take the whole API down. The session check
    // below is the hard gate.
  }

  // 3. Session enforcement for non-public routes.
  if (!PUBLIC_PATHS.has(path)) {
    let ok = false;
    try {
      ok = await hasValidSession(env, request);
    } catch (err) {
      return jsonError(
        500,
        'Session check failed: ' + (env.SESSION_SECRET ? 'internal error' : 'SESSION_SECRET not configured'),
        corsHeaders(request),
      );
    }
    if (!ok) {
      return jsonError(401, 'Unauthorized — session required', corsHeaders(request));
    }
  }

  // 4. Forward to the handler; attach CORS headers to the response.
  const response = await next();
  const headers = new Headers(response.headers);
  const cors = corsHeaders(request);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonError(status, message, extra = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}
