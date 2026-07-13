import { PKG, queryActiveContracts, submitExercise } from '../../../_ledger.js';

// POST /api/vault/commitments/:id/resolve
// Exercises ResolveDispute on the DisputeCase derived from a CommitmentContract.
//
// The frontend passes the CommitmentContract's contractId, but ResolveDispute
// is a choice on DisputeCase (created by RaiseDispute). We look up the active
// DisputeCase whose `commitmentRef` points back to this commitment, then
// exercise ResolveDispute with the third party's ruling.
const DISPUTE_TPL = `#${PKG}:Vault.CommitmentContract:DisputeCase`;

export const onRequest = async (context) => {
  const { params, request } = context;
  const commitmentId = params.id;
  try {
    const body = await request.json().catch(() => ({}));
    const ruling = String(body.ruling ?? 'proposer');
    if (ruling !== 'proposer' && ruling !== 'accepter') {
      return Response.json(
        { error: "ruling must be 'proposer' or 'accepter'" },
        { status: 400 },
      );
    }

    // Find the DisputeCase whose commitmentRef references this commitment.
    const disputes = await queryActiveContracts([DISPUTE_TPL]);
    const match = disputes.find((d) => {
      const ref = d.payload?.commitmentRef;
      // commitmentRef is a ContractId serialized as { contractId } or a string.
      const refId = typeof ref === 'string' ? ref : ref?.contractId;
      return refId === commitmentId;
    });

    if (!match?.contractId) {
      return Response.json(
        { error: 'No active DisputeCase found for this commitment' },
        { status: 404 },
      );
    }

    const result = await submitExercise(
      'Vault.CommitmentContract:DisputeCase',
      match.contractId,
      'ResolveDispute',
      { ruling },
    );
    return Response.json({
      updateId: result.updateId,
      offset: result.completionOffset,
      disputeCaseId: match.contractId,
      ruling,
    });
  } catch (err) {
    return Response.json(
      { error: 'Failed to resolve dispute on DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
