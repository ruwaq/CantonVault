import { PARTY, submitExercise, kvGet, kvPut, kvUpdateStatus, configure } from '../../../_ledger.js';

// POST /api/vault/commitments/:id/refund
// Exercises Refund on a CommitmentContract after the deadline. Either signatory
// can close out an unfulfilled commitment. CONSUMING — archives the contract.
// NOTE: the Daml `deadline` assertion requires now >= deadline, so this only
// succeeds once the commitment's deadline has passed.
const TEMPLATE = 'Vault.CommitmentContract:CommitmentContract';

export const onRequest = async (context) => {
  const { params, env } = context;
  configure(env);
  const contractId = params.id;
  try {
    // The choice requires `actor` (parametrized signatory controller) and
    // optional `allocationCid` (null = symbolic, Some = reverse CC settlement).
    const result = await submitExercise(TEMPLATE, contractId, 'Refund', {
      actor: PARTY.value,
      allocationCid: null,
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
      });
    }

    return Response.json({
      contractId: result.contractId,
      updateId: result.updateId,
      offset: result.completionOffset,
    });
  } catch (err) {
    return Response.json(
      { error: 'Failed to refund commitment on DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
