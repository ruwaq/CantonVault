import { kvListAsContracts, configure } from '../_ledger.js';

// GET /api/vault/receipts — SettlementReceipts: immutable terminal evidence of
// every Fulfill / Refund / ResolveDispute. Served from the KV index (the ACS
// does not divulge these in the shared sandbox). All statuses are returned:
// fulfilled, refunded, dispute-proposer, dispute-accepter.
export const onRequest = async (context) => {
  const { env } = context;
  configure(env);
  try {
    const contracts = await kvListAsContracts(env, 'receipt');
    return Response.json(contracts);
  } catch (err) {
    return Response.json(
      { error: 'Failed to query receipts from DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
