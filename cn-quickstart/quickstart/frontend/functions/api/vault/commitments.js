import { kvListAsContracts } from '../_ledger.js';

// GET /api/vault/commitments — active CommitmentContracts (status "active" or
// "disputed" in the KV index). The sandbox ACS does not divulge these, so we
// serve them from the local KV index maintained by accept.js. A commitment
// leaves this list once it is fulfilled / refunded / resolved (terminal states).
export const onRequest = async (context) => {
  const { env } = context;
  try {
    const contracts = await kvListAsContracts(env, 'commitment', ['active', 'disputed']);
    return Response.json(contracts);
  } catch (err) {
    return Response.json(
      { error: 'Failed to query commitments from DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
