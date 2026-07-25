import { submitExercise, kvUpdateStatus, configure, safeErrorResponse, validateContractId } from '../../../_ledger.js';

// POST /api/vault/proposals/:id/reject
// Exercises RejectProposal on a CommitmentProposal. Archives it (terminal).
const TEMPLATE = 'Vault.CommitmentProposal:CommitmentProposal';

export const onRequest = async (context) => {
  const { params, env } = context;
  configure(env);
  const idR = validateContractId(params.id);
  if (!idR.ok) return safeErrorResponse(400, idR.error);
  const contractId = idR.value;
  try {
    const result = await submitExercise(TEMPLATE, contractId, 'RejectProposal', {});
    // Mark the proposal as rejected in the index so it leaves the pending list.
    await kvUpdateStatus(env, 'proposal', contractId, 'rejected');
    return Response.json({
      updateId: result.updateId,
      offset: result.completionOffset,
    });
  } catch (err) {
    return safeErrorResponse(502, 'Failed to reject proposal on DevNet', err);
  }
};
