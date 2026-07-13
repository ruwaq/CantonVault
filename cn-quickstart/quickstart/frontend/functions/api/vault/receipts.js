import { PKG, queryActiveContracts } from '../_ledger.js';

// SettlementReceipts: immutable terminal evidence of every Fulfill / Refund /
// ResolveDispute. They have no consuming choice, so they accumulate on the ledger.
const TEMPLATE = `#${PKG}:Vault.SettlementReceipt:SettlementReceipt`;

export const onRequest = async () => {
  try {
    const contracts = await queryActiveContracts([TEMPLATE]);
    return Response.json(contracts);
  } catch (err) {
    return Response.json(
      { error: 'Failed to query receipts from DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
