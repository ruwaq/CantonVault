import { PKG, queryActiveContracts } from '../_ledger.js';

// Active CommitmentContracts: proposals that have been accepted and are
// pending Fulfill / Refund / RaiseDispute. Consuming choices archive them,
// so the ACS naturally reflects the live state.
const TEMPLATE = `#${PKG}:Vault.CommitmentContract:CommitmentContract`;

export const onRequest = async () => {
  try {
    const contracts = await queryActiveContracts([TEMPLATE]);
    return Response.json(contracts);
  } catch (err) {
    return Response.json(
      { error: 'Failed to query commitments from DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
