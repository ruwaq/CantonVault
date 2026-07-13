import { PKG, queryActiveContracts } from '../_ledger.js';

// DisclosedRecords: immutable selective-disclosure proofs created by
// RaiseDispute and ResolveDispute. Evidentiary (no choices) → accumulate.
const TEMPLATE = `#${PKG}:Vault.Disclosable:DisclosedRecord`;

export const onRequest = async () => {
  try {
    const contracts = await queryActiveContracts([TEMPLATE]);
    return Response.json(contracts);
  } catch (err) {
    return Response.json(
      { error: 'Failed to query disclosures from DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
