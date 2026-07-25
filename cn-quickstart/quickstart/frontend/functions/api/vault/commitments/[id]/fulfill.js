import { submitExercise, kvGet, kvPut, kvUpdateStatus, configure, safeErrorResponse, validateContractId, validateText } from '../../../_ledger.js';

// POST /api/vault/commitments/:id/fulfill
// Exercises Fulfill on a CommitmentContract. The accepter confirms delivery.
//
// SETTLEMENT MODEL (audit Fase 3): this demo exercises Fulfill on the SYMBOLIC
// settlement branch (allocationCid = None), which is valid for contracts
// created with realSettlementRequired = false. The receipt therefore carries
// settlementExecuted = false. Real Canton Coin settlement is NOT exercisable
// against the shared DevNet sandbox: the m2m operator is not the DSO, and
// AllocationFactory_Allocate rejects any settlement whose instrumentAdmin !=
// DSO. The contract-level DvP path is proven by test_real_settlement_dvp
// (Daml.Script on a local participant). See SECURITY.md Fase 3 for details.
const TEMPLATE = 'Vault.CommitmentContract:CommitmentContract';

export const onRequest = async (context) => {
  const { params, request, env } = context;
  configure(env);
  const idR = validateContractId(params.id);
  if (!idR.ok) return safeErrorResponse(400, idR.error);
  const contractId = idR.value;
  try {
    const body = await request.json().catch(() => ({}));
    const noteR = validateText(body.fulfillmentNote, 'fulfillmentNote', 500);
    const fulfillmentNote = noteR.ok ? noteR.value : 'Delivery confirmed';
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
        updateId: result.updateId,
      });
    }

    return Response.json({
      contractId: result.contractId,
      updateId: result.updateId,
      offset: result.completionOffset,
    });
  } catch (err) {
    return safeErrorResponse(502, 'Failed to fulfill commitment on DevNet', err);
  }
};
