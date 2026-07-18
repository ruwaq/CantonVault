import {
  submitExercise,
  kvList,
  kvPut,
  kvUpdateStatus,
  MEDIATOR_PARTY,
  configure,
} from '../../../_ledger.js';

// POST /api/vault/commitments/:id/resolve
// Exercises ResolveDispute on the DisputeCase derived from a CommitmentContract.
//
// The frontend passes the CommitmentContract's contractId, but ResolveDispute
// is a choice on DisputeCase (created by RaiseDispute). We look up the open
// DisputeCase whose `commitmentRef` points back to this commitment, then
// exercise ResolveDispute with the third party's ruling.
//
// NOTE: we look the DisputeCase up in the KV index, NOT the ACS. The sandbox
// multi-tenant validator does not divulge our contracts via ACS, so the old
// queryActiveContracts() call always returned [] and resolve always 404'd.
// raise-dispute.js stores the DisputeCase in KV with sourceCid = commitmentId,
// which is exactly the link we need here.
export const onRequest = async (context) => {
  const { params, request, env } = context;
  configure(env);
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

    // Find the open DisputeCase indexed from this commitment.
    const disputes = await kvList(env, 'dispute', ['open']);
    const match = disputes.find((d) => d.sourceCid === commitmentId);

    if (!match?.cid) {
      return Response.json(
        { error: 'No active DisputeCase found for this commitment' },
        { status: 404 },
      );
    }

    // ResolveDispute creates TWO contracts: a DisclosedRecord (first) and a
    // SettlementReceipt (second). We index the SettlementReceipt — pass the
    // template filter so we get the right child (same bug class as raise-dispute).
    // ResolveDispute is `controller thirdParty`, so the command must be
    // authorized by MEDIATOR_PARTY too (not just PARTY).
    const result = await submitExercise(
      'Vault.CommitmentContract:DisputeCase',
      match.cid,
      'ResolveDispute',
      { ruling },
      'SettlementReceipt',
      [MEDIATOR_PARTY.value],
    );

    // ResolveDispute archives the DisputeCase and creates a SettlementReceipt
    // plus a DisclosedRecord. Mirror both in the index.
    await kvUpdateStatus(env, 'dispute', match.cid, 'resolved');
    await kvUpdateStatus(env, 'commitment', commitmentId, 'resolved');
    const d = match.payload ?? {};
    if (result.contractId) {
      await kvPut(env, 'receipt', result.contractId, {
        status: `dispute-${ruling}`,
        payload: {
          proposer: d.proposer,
          accepter: d.accepter,
          amount: d.amountRevealed,
          currency: 'REDACTED',
          outcome: `dispute-${ruling}`,
          settlementExecuted: false,
          note: `dispute resolved in favor of ${ruling}`,
        },
        sourceCid: commitmentId,
        offset: result.completionOffset,
      });
    }
    // Disclosure of the resolution (ruling + revealed fields).
    await kvPut(env, 'disclosure', `${commitmentId}-resolve`, {
      status: 'resolve',
      payload: {
        sourceCid: commitmentId,
        observer: d.proposer,
        revealedFields: {
          ruling,
          amountRevealed: String(d.amountRevealed ?? ''),
          descriptionRevealed: d.descriptionRevealed ?? '',
        },
        reason: `dispute-resolved: ${d.reason ?? ''}`,
      },
      sourceCid: commitmentId,
      offset: result.completionOffset,
    });

    return Response.json({
      updateId: result.updateId,
      offset: result.completionOffset,
      contractId: result.contractId,
      disputeCaseId: match.cid,
      ruling,
    });
  } catch (err) {
    return Response.json(
      { error: 'Failed to resolve dispute on DevNet', detail: err.message },
      { status: 502 },
    );
  }
};
