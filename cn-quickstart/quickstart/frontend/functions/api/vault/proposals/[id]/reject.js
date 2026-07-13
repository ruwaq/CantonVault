import { submitExercise } from '../../../_ledger.js';

// POST /api/vault/proposals/:id/reject
// Exercises RejectProposal on a CommitmentProposal. Archives it (terminal).
const TEMPLATE = 'Vault.CommitmentProposal:CommitmentProposal';

export const onRequest = async (context) => {
  const { params } = context;
  const contractId = params.id;
  try {
    const result = await submitExercise(TEMPLATE, contractId, 'RejectProposal', {});
    return Response.json({
      updateId: result.updateId,
      offset: result.completionOffset,
    });
  } catch (err) {
    return Response.json(
      { error: 'Failed to reject proposal on DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
