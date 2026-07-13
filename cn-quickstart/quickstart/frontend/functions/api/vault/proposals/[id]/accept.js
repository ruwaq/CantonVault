import { submitExercise } from '../../../_ledger.js';

// POST /api/vault/proposals/:id/accept
// Exercises AcceptProposal on a CommitmentProposal. The accepter signs and
// converts the proposal into an active CommitmentContract on-ledger.
const TEMPLATE = 'Vault.CommitmentProposal:CommitmentProposal';

export const onRequest = async (context) => {
  const { params } = context;
  const contractId = params.id;
  try {
    const result = await submitExercise(TEMPLATE, contractId, 'AcceptProposal', {});
    return Response.json({
      updateId: result.updateId,
      offset: result.completionOffset,
    });
  } catch (err) {
    return Response.json(
      { error: 'Failed to accept proposal on DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
