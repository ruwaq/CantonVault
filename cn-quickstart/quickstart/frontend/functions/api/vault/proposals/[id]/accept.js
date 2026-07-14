import { submitExercise, kvGet, kvPut, kvUpdateStatus } from '../../../_ledger.js';

// POST /api/vault/proposals/:id/accept
// Exercises AcceptProposal on a CommitmentProposal. The accepter signs and
// converts the proposal into an active CommitmentContract on-ledger.
const TEMPLATE = 'Vault.CommitmentProposal:CommitmentProposal';

export const onRequest = async (context) => {
  const { params, env } = context;
  const contractId = params.id;
  try {
    const result = await submitExercise(TEMPLATE, contractId, 'AcceptProposal', {});

    // Mirror the lifecycle in the KV index: the proposal is accepted (so it
    // disappears from the pending list), and the newly created CommitmentContract
    // becomes an active commitment the accepter/fulfill/dispute view reads.
    await kvUpdateStatus(env, 'proposal', contractId, 'accepted');

    // Look up the original proposal payload so the commitment carries the same
    // terms (amount, parties, description). Fall back to an empty payload if the
    // proposal wasn't indexed (e.g. created before KV existed).
    const proposalRecord = await kvGet(env, 'proposal', contractId);
    const commitmentPayload = proposalRecord?.payload ?? {};
    if (result.contractId) {
      await kvPut(env, 'commitment', result.contractId, {
        status: 'active',
        payload: commitmentPayload,
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
      { error: 'Failed to accept proposal on DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
