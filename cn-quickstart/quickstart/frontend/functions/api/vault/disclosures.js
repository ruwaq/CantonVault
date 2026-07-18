import { kvListAsContracts, configure } from '../_ledger.js';

// GET /api/vault/disclosures — DisclosedRecords: immutable selective-disclosure
// proofs created by RaiseDispute and ResolveDispute. Evidentiary (no choices) →
// accumulate. Served from the KV index (the ACS does not divulge these in the
// shared sandbox). Statuses: "dispute" (from RaiseDispute), "resolve" (from
// ResolveDispute).
export const onRequest = async (context) => {
  const { env } = context;
  configure(env);
  try {
    const contracts = await kvListAsContracts(env, 'disclosure');
    return Response.json(contracts);
  } catch (err) {
    return Response.json(
      { error: 'Failed to query disclosures from DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
