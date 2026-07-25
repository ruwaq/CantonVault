import { configure, ledgerGetUpdateById, safeErrorResponse, validateText } from '../../_ledger.js';

// GET /api/vault/tx/{updateId}
//
// Public transaction verifier. Reads the tx tree from the Canton Ledger API
// (POST /v2/updates/update-by-id) using the m2m operator token and returns a
// human-readable JSON. The toast links here so judges can verify that a tx
// landed on-ledger, see the Created/Archived events, and read the honest note
// about what is real vs symbolic in this demo.
//
// Caching: tx trees are immutable, so we cache in KV (key tx:{updateId}, 1h TTL)
// to avoid re-hitting the ledger and to stay within the m2m token rate.
//
// Privacy: if the operator party is not a witness of the tx, Canton returns
// UPDATE_NOT_FOUND. We surface that as { found: false } (HTTP 200, not 404) so
// the page can render a graceful "not visible" state.
const UPDATE_ID_RE = /^1220[0-9a-f]{64}$/;
const CACHE_TTL_SEC = 3600;

export const onRequestGet = async (context) => {
  const { params, env } = context;
  configure(env);

  // Validate updateId format (Canton tx hash: 1220 + 64 hex).
  const idR = validateText(params.updateId, 'updateId', 100);
  if (!idR.ok) return safeErrorResponse(400, idR.error);
  const updateId = idR.value;
  if (!UPDATE_ID_RE.test(updateId)) {
    return safeErrorResponse(400, 'updateId must match ^1220[0-9a-f]{64}$');
  }

  // 1. Try KV cache first.
  try {
    const cached = await env.VAULT_KV.get(`tx:${updateId}`);
    if (cached) {
      return Response.json(JSON.parse(cached));
    }
  } catch {
    // cache miss / corrupt — fall through to live lookup
  }

  // 2. Live lookup.
  try {
    const result = await ledgerGetUpdateById(updateId);
    // Cache the immutable result.
    try {
      await env.VAULT_KV.put(`tx:${updateId}`, JSON.stringify(result), {
        expirationTtl: CACHE_TTL_SEC,
      });
    } catch {
      // KV write failure is non-fatal — just no caching this time.
    }
    return Response.json(result);
  } catch (err) {
    // Distinguish "private / not visible / doesn't exist" from a real backend
    // failure. Both UPDATE_NOT_FOUND and a 404 status map to the graceful state.
    const notFound =
      err.cantonCode === 'UPDATE_NOT_FOUND' || err.status === 404 || err.code === 'UPDATE_NOT_FOUND';
    if (notFound) {
      const graceful = {
        found: false,
        updateId,
        note:
          'No transaction visible to the operator party with this updateId. The tx may belong to another party (Canton privacy: the existence of private txs is hidden), or the updateId is not on this ledger.',
      };
      return Response.json(graceful);
    }
    return safeErrorResponse(502, 'Failed to verify transaction on DevNet', err);
  }
};

// Reject non-GET verbs explicitly.
export const onRequest = (ctx) =>
  new Response(JSON.stringify({ error: 'Method not allowed — use GET' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'GET' },
  });
