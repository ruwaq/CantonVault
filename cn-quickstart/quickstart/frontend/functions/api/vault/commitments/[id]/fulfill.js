import { submitExercise, kvGet, kvPut, kvUpdateStatus, configure } from '../../../_ledger.js';

// POST /api/vault/commitments/:id/fulfill
// Exercises Fulfill on a CommitmentContract. Accepter confirms delivery.
// `allocationCid: null` selects the symbolic settlement branch, which is valid
// only for contracts created with realSettlementRequired=false (the demo path).
// Real CC settlement would pass Some (allocCid, extraArgs) instead.
const TEMPLATE = 'Vault.CommitmentContract:CommitmentContract';

export const onRequest = async (context) => {
  const { params, request, env } = context;
  configure(env);
  const contractId = params.id;
  try {
    const body = await request.json().catch(() => ({}));
    const fulfillmentNote = String(body.fulfillmentNote ?? 'Delivery confirmed');
    const result = await submitExercise(TEMPLATE, contractId, 'Fulfill', {
      fulfillmentNote,
      allocationCid: null,
    });

    // Mark the commitment fulfilled (leaves the active list) and index the
    // SettlementReceipt created by the Fulfill choice.
    const commitmentRecord = await kvGet(env, 'commitment', contractId);
    await kvUpdateStatus(env, 'commitment', contractId, 'fulfilled');
    if (result.contractId) {
      const p = commitmentRecord?.payload ?? {};
      await kvPut(env, 'receipt', result.contractId, {
        status: 'fulfilled',
        payload: {
          proposer: p.proposer,
          accepter: p.accepter,
          amount: p.amount,
          currency: p.currency,
          outcome: 'fulfilled',
          settlementExecuted: false,
          note: fulfillmentNote,
        },
        sourceCid: contractId,
        offset: result.completionOffset,
      });
    }

    return Response.json({
      contractId: result.contractId,
      updateId: result.updateId,
      offset: result.completionOffset,
    });
  } catch (err) {
    return Response.json(
      { error: 'Failed to fulfill commitment on DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
