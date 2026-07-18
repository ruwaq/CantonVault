import { PARTY, submitExercise, kvGet, kvPut, kvUpdateStatus, configure } from '../../../_ledger.js';

// POST /api/vault/commitments/:id/raise-dispute
// Exercises RaiseDispute on a CommitmentContract. Either signatory escalates
// to the third party. CONSUMING: archives the commitment and creates a
// DisputeCase (third party becomes observer) + a DisclosedRecord proof.
const TEMPLATE = 'Vault.CommitmentContract:CommitmentContract';

export const onRequest = async (context) => {
  const { params, request, env } = context;
  configure(env);
  const contractId = params.id;
  try {
    const body = await request.json().catch(() => ({}));
    const reason = String(body.reason ?? 'Undisputed delivery issue');
    // The choice controller is `actor` (parametrized signatory). In the demo
    // the same party holds all roles, so PARTY authorizes as a signatory.
    // RaiseDispute creates TWO contracts: a DisclosedRecord (first) and a
    // DisputeCase (second). We must index the DisputeCase's contractId — that's
    // the one ResolveDispute targets. Pass the template filter so submitExercise
    // returns the right child, not the first CreatedEvent (which is the
    // DisclosedRecord — see the WRONGLY_TYPED_CONTRACT bug this fixed).
    const result = await submitExercise(TEMPLATE, contractId, 'RaiseDispute', {
      reason,
      actor: PARTY.value,
    }, 'DisputeCase');

    // RaiseDispute creates a DisputeCase (its contractId is what ResolveDispute
    // must target). Index it with a sourceCid link back to the commitment so
    // resolve.js can find it without querying the (empty) ACS.
    const commitmentRecord = await kvGet(env, 'commitment', contractId);
    await kvUpdateStatus(env, 'commitment', contractId, 'disputed');
    const p = commitmentRecord?.payload ?? {};
    if (result.contractId) {
      // DisputeCase — the resolvable contract (status "open" until resolved).
      await kvPut(env, 'dispute', result.contractId, {
        status: 'open',
        payload: {
          commitmentRef: contractId,
          proposer: p.proposer,
          accepter: p.accepter,
          thirdParty: p.thirdParty,
          reason,
          amountRevealed: p.amount,
          descriptionRevealed: p.description,
          ruling: null,
        },
        sourceCid: contractId,
        offset: result.completionOffset,
      });
      // DisclosedRecord — the selective-disclosure proof (amount + description
      // only). The RaiseDispute choice also creates this on-ledger.
      await kvPut(env, 'disclosure', `${contractId}-dispute`, {
        status: 'dispute',
        payload: {
          sourceCid: contractId,
          discloser: PARTY.value,
          observer: p.thirdParty,
          revealedFields: { amount: String(p.amount ?? ''), description: p.description ?? '' },
          reason,
        },
        sourceCid: contractId,
        offset: result.completionOffset,
      });
    }

    return Response.json({
      disputeCaseId: result.contractId,
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
