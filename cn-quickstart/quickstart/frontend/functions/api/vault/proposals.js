import {
  PARTY,
  PKG,
  configure,
  submitCreate,
  queryActiveContracts,
  kvList,
  kvListAsContracts,
  kvPut,
} from '../_ledger.js';

const PROPOSAL_TPL = 'Vault.CommitmentProposal:CommitmentProposal';

export const onRequest = async (context) => {
  const { request, env } = context;
  configure(env);

  if (request.method === 'GET') {
    try {
      // The Canton sandbox ACS does not divulge our contracts to the m2m user,
      // so we serve the pending proposals from the KV index instead. Only
      // status:"pending" proposals are shown — accepted/rejected ones have
      // moved on in the lifecycle (see accept.js / reject.js).
      const contracts = await kvListAsContracts(env, 'proposal', ['pending']);
      return Response.json(contracts);
    } catch (err) {
      return Response.json(
        { error: 'Failed to query proposals from DevNet', detail: err.message },
        { status: 502 },
      );
    }
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const amount = Number(body.amount ?? 0);
      if (amount <= 0) {
        return Response.json({ error: 'Amount must be greater than 0' }, { status: 400 });
      }
const description = String(body.description ?? '').trim();
	      if (!description) {
	        return Response.json({ error: 'Description is required' }, { status: 400 });
	      }
	      // SECURITY (audit S-A3): validate deadline is a valid ISO-8601 date.
	      const deadline = String(body.deadline || '');
	      if (deadline && isNaN(Date.parse(deadline))) {
	        return Response.json({ error: 'Deadline must be a valid ISO-8601 date' }, { status: 400 });
	      }

	      const payload = {
	        // `||` (not `??`) so empty strings from the frontend fall back to PARTY.
	        proposer: PARTY.value,
	        accepter: String(body.accepter || PARTY.value),
	        thirdParty: String(body.thirdParty || PARTY.value),
	        amount,
	        currency: String(body.currency || 'CC'),
	        description,
	        workflow: String(body.workflow || 'supply-chain-finance'),
	        deadline: deadline || '2026-12-31T23:59:59Z',
        instrumentAdmin: PARTY.value,
        realSettlementRequired: false,
      };
      const result = await submitCreate('Vault.CommitmentProposal:CommitmentProposal', payload);

      // Index the newly created proposal in KV so the GET endpoint (and the
      // demo UI) can show it. The sandbox ACS won't divulge it.
      await kvPut(env, 'proposal', result.contractId, {
        status: 'pending',
        payload,
        offset: result.completionOffset,
      });

      return Response.json({
        contractId: result.contractId,
        payload: { ...body, amount, description },
        updateId: result.updateId,
        offset: result.completionOffset,
      }, { status: 201 });
    } catch (err) {
      return Response.json(
        { error: 'Failed to create proposal on DevNet', detail: err.message },
        { status: 502 },
      );
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
