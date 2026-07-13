import { PKG, queryActiveContracts } from '../_ledger.js';

// Active DisputeCases: raised by RaiseDispute, awaiting the third party's
// ResolveDispute ruling. Resolving archives them → terminal.
const TEMPLATE = `#${PKG}:Vault.CommitmentContract:DisputeCase`;

export const onRequest = async () => {
  try {
    const contracts = await queryActiveContracts([TEMPLATE]);
    return Response.json(contracts);
  } catch (err) {
    return Response.json(
      { error: 'Failed to query dispute cases from DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
