import { PARTY, MEDIATOR_PARTY, submitExercise, kvGet, kvPut, kvUpdateStatus, configure, safeErrorResponse, validateContractId, validateText } from '../../../_ledger.js';

// POST /api/vault/commitments/:id/raise-dispute
// Exercises RaiseDispute on a CommitmentContract. Either signatory escalates
// to the third party. CONSUMING: archives the commitment and creates a
// DisputeCase (third party becomes observer) + a DisclosedRecord proof.
const TEMPLATE = 'Vault.CommitmentContract:CommitmentContract';

export const onRequest = async (context) => {
  const { params, request, env } = context;
  configure(env);
  const idR = validateContractId(params.id);
  if (!idR.ok) return safeErrorResponse(400, idR.error);
  const contractId = idR.value;
  try {
    const body = await request.json().catch(() => ({}));
    const reasonR = validateText(body.reason, 'reason', 500);
    const reason = reasonR.ok ? reasonR.value : 'Undisputed delivery issue';
    // The choice controller is `actor` (parametrized signatory). In the demo
    // the same party holds all roles, so PARTY authorizes as a signatory.
    // RaiseDispute creates TWO contracts: a DisclosedRecord (first) and a
    // DisputeCase (second). We must index the DisputeCase's contractId — that's
    // the one ResolveDispute targets. Pass the template filter so submitExercise
    // returns the right child, not the first CreatedEvent (which is the
    // DisclosedRecord — see the WRONGLY_TYPED_CONTRACT bug this fixed).
    //
    // AUTHORIZATION (bug fix): RaiseDispute creates a DisclosedRecord whose
    // `observer = thirdParty` (= MEDIATOR_PARTY in this demo). Canton requires
    // the divulged party to authorize the transaction (see Disclosable.daml:
    // "divulging a contract to a party still needs that party's consent").
    // Without MEDIATOR_PARTY in actAs the ledger rejects the command → 502.
    // Same pattern as ResolveDispute in resolve.js.
    const result = await submitExercise(TEMPLATE, contractId, 'RaiseDispute', {
      reason,
      actor: PARTY.value,
    }, 'DisputeCase', [MEDIATOR_PARTY.value]);

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
        updateId: result.updateId,
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
        updateId: result.updateId,
      });
    }

    return Response.json({
      disputeCaseId: result.contractId,
      updateId: result.updateId,
      offset: result.completionOffset,
    });
  } catch (err) {
    return safeErrorResponse(502, 'Failed to raise dispute on DevNet', err);
  }
};
