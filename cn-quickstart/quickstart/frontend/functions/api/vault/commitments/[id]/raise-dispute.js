import { PARTY, submitExercise } from '../../../_ledger.js';

// POST /api/vault/commitments/:id/raise-dispute
// Exercises RaiseDispute on a CommitmentContract. Either signatory escalates
// to the third party. CONSUMING: archives the commitment and creates a
// DisputeCase (third party becomes observer) + a DisclosedRecord proof.
const TEMPLATE = 'Vault.CommitmentContract:CommitmentContract';

export const onRequest = async (context) => {
  const { params, request } = context;
  const contractId = params.id;
  try {
    const body = await request.json().catch(() => ({}));
    const reason = String(body.reason ?? 'Undisputed delivery issue');
    // The choice controller is `actor` (parametrized signatory). In the demo
    // the same party holds all roles, so PARTY authorizes as a signatory.
    const result = await submitExercise(TEMPLATE, contractId, 'RaiseDispute', {
      reason,
      actor: PARTY,
    });
    return Response.json({
      updateId: result.updateId,
      offset: result.completionOffset,
    });
  } catch (err) {
    return Response.json(
      { error: 'Failed to raise dispute on DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
