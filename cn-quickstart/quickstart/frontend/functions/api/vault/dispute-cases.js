import { kvListAsContracts, configure, safeErrorResponse } from '../_ledger.js';

// GET /api/vault/dispute-cases — active DisputeCases awaiting the third party's
// ResolveDispute ruling. Only status "open" disputes are shown; "resolved" ones
// are terminal. Served from the KV index (the ACS does not divulge these in the
// shared sandbox).
export const onRequest = async (context) => {
  const { env } = context;
  configure(env);
  try {
    const contracts = await kvListAsContracts(env, 'dispute', ['open']);
    return Response.json(contracts);
  } catch (err) {
    return safeErrorResponse(502, 'Failed to query dispute cases from DevNet', err);
  }
};
