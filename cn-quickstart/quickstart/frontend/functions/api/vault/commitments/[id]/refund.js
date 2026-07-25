import { PARTY, submitExercise, kvGet, kvPut, kvUpdateStatus, configure, safeErrorResponse, validateContractId } from '../../../_ledger.js';

// POST /api/vault/commitments/:id/refund
// Exercises Refund on a CommitmentContract after the deadline. Either signatory
// can close out an unfulfilled commitment. CONSUMING — archives the contract.
//
// NOTE (audit Fase 3): the Daml Refund choice now requires `now > deadline`
// (strict) and takes only `actor` — the `allocationCid` field was removed from
// the contract signature (C-4 fix: it drained the proposer). Refund is a pure
// archival close-out; the receipt carries settlementExecuted = false.
const TEMPLATE = 'Vault.CommitmentContract:CommitmentContract';

export const onRequest = async (context) => {
  const { params, env } = context;
  configure(env);
  const idR = validateContractId(params.id);
  if (!idR.ok) return safeErrorResponse(400, idR.error);
  const contractId = idR.value;
  try {
    const result = await submitExercise(TEMPLATE, contractId, 'Refund', {
      actor: PARTY.value,
    });

    const commitmentRecord = await kvGet(env, 'commitment', contractId);
    await kvUpdateStatus(env, 'commitment', contractId, 'refunded');
    if (result.contractId) {
      const p = commitmentRecord?.payload ?? {};
      await kvPut(env, 'receipt', result.contractId, {
        status: 'refunded',
        payload: {
          proposer: p.proposer,
          accepter: p.accepter,
          amount: p.amount,
          currency: p.currency,
          outcome: 'refunded',
          settlementExecuted: false,
          note: 'refunded after deadline',
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
    return safeErrorResponse(502, 'Failed to refund commitment on DevNet', err);
  }
};
