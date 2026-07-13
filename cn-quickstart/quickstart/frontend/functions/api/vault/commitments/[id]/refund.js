import { PARTY, submitExercise } from '../../../_ledger.js';

// POST /api/vault/commitments/:id/refund
// Exercises Refund on a CommitmentContract after the deadline. Either signatory
// can close out an unfulfilled commitment. CONSUMING — archives the contract.
// NOTE: the Daml `deadline` assertion requires now >= deadline, so this only
// succeeds once the commitment's deadline has passed.
const TEMPLATE = 'Vault.CommitmentContract:CommitmentContract';

export const onRequest = async (context) => {
  const { params } = context;
  const contractId = params.id;
  try {
    // The choice requires `actor` (parametrized signatory controller).
    const result = await submitExercise(TEMPLATE, contractId, 'Refund', {
      actor: PARTY,
    });
    return Response.json({
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
