// Top-level middleware for /api/*. Runs before every Pages Function in the api/ tree.
//
// Responsibilities (audit Fase 3):
//   1. CORS: allowlist of origins, explicit headers.
//   2. Rate limit: per-IP token bucket in KV, 60 req/min.
//
// AUTH MODEL (per team decision): the demo is intentionally open — no session
// cookie. The audience is hackathon judges on a single demo; the benefit of
// instant access outweighs the abuse surface, which is bounded by the rate
// limiter and by the symbolic-settlement demo (no real funds move). The
// session/cookie machinery from the first pass was removed for judge UX.
// Hardening that STAYS: rate limit (protects the 100k/day Cloudflare Free
// quota), CORS allowlist, input validation, safeErrorResponse, secrets
// fail-closed. See SECURITY.md Fase 3 for the rationale.

const ALLOWED_ORIGINS = new Set([
  'https://canton-vault.pages.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

const RATE_LIMIT_WINDOW_SEC = 60;
const RATE_LIMIT_MAX = 60; // requests per IP per window

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function rateLimited(env, request) {
  // Sliding window via KV. KV is eventually consistent, so this is a soft limit —
  // good enough to protect the 100k/day Cloudflare Free quota and the DevNet.
  if (!env.VAULT_KV) return false;
  const forwarded = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Real-IP') || 'unknown';
  const key = 'rl:i:' + forwarded;
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
  await env.VAULT_KV.put(key, JSON.stringify({ count, windowStart }), {
    expirationTtl: RATE_LIMIT_WINDOW_SEC + 5,
  });
  return count > RATE_LIMIT_MAX;
}

export async function onRequest(context) {
  const { request, env, next } = context;

  // 1. CORS preflight — answer immediately.
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  // 2. Rate limit (soft, fail-open if KV is unavailable).
  try {
    if (await rateLimited(env, request)) {
      return jsonError(429, 'Too Many Requests', corsHeaders(request));
    }
  } catch {
    // If rate limiting itself fails, do NOT block — fail open here.
  }

  // 3. Forward to the handler; attach CORS headers to the response.
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
