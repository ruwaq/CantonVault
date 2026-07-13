import { submitExercise } from '../../../_ledger.js';

// POST /api/vault/commitments/:id/fulfill
// Exercises Fulfill on a CommitmentContract. Accepter confirms delivery.
// `allocationCid: null` selects the symbolic settlement branch, which is valid
// only for contracts created with realSettlementRequired=false (the demo path).
// Real CC settlement would pass Some (allocCid, extraArgs) instead.
const TEMPLATE = 'Vault.CommitmentContract:CommitmentContract';

export const onRequest = async (context) => {
  const { params, request } = context;
  const contractId = params.id;
  try {
    const body = await request.json().catch(() => ({}));
    const fulfillmentNote = String(body.fulfillmentNote ?? 'Delivery confirmed');
    const result = await submitExercise(TEMPLATE, contractId, 'Fulfill', {
      fulfillmentNote,
      allocationCid: null,
    });
    return Response.json({
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
