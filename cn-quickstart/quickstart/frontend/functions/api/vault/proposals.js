import {
  PARTY,
  PKG,
  configure,
  submitCreate,
  queryActiveContracts,
  kvList,
  kvListAsContracts,
  kvPut,
  safeErrorResponse,
  validateAmount,
  validateDeadline,
  validateText,
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
      return safeErrorResponse(502, 'Failed to query proposals from DevNet', err);
    }
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return safeErrorResponse(400, 'Invalid JSON body');
    }
    try {
      const amountR = validateAmount(body.amount);
      if (!amountR.ok) return safeErrorResponse(400, amountR.error);
      const descR = validateText(body.description, 'Description', 500);
      if (!descR.ok) return safeErrorResponse(400, descR.error);
      // deadline is optional from the client; default to a far-future value if absent.
      const deadlineR = body.deadline
        ? validateDeadline(body.deadline)
        : { ok: true, value: '2099-12-31T23:59:59Z' };
      if (!deadlineR.ok) return safeErrorResponse(400, deadlineR.error);
      const workflowR = validateText(body.workflow, 'Workflow', 100);
      if (!workflowR.ok) return safeErrorResponse(400, workflowR.error);
      const currencyR = validateText(body.currency, 'Currency', 32);
      if (!currencyR.ok) return safeErrorResponse(400, currencyR.error);

      const payload = {
        // Note: accepter/thirdParty are taken as-is here because the demo runs
        // with the single m2m operator party; real multi-party would require
        // validated distinct party ids. realSettlementRequired stays false
        // because the sandbox m2m is NOT the DSO of the DevNet (see SECURITY.md
        // Fase 3): AllocationFactory_Allocate rejects any settlement whose
        // instrumentAdmin != DSO, so real Canton Coin settlement is not
        // exercisable against the shared sandbox. The contract-level DvP path
        // is proven by test_real_settlement_dvp (Daml.Script, local participant).
        proposer: PARTY.value,
        accepter: PARTY.value,
        thirdParty: PARTY.value,
        amount: amountR.value,
        currency: currencyR.value,
        description: descR.value,
        workflow: workflowR.value,
        deadline: deadlineR.value,
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

      // Whitelist the fields returned to the client — do NOT echo arbitrary body
      // keys (audit Fase 3, M3).
      return Response.json({
        contractId: result.contractId,
        payload: {
          proposer: payload.proposer,
          accepter: payload.accepter,
          thirdParty: payload.thirdParty,
          amount: payload.amount,
          currency: payload.currency,
          description: payload.description,
          workflow: payload.workflow,
          deadline: payload.deadline,
        },
        updateId: result.updateId,
        offset: result.completionOffset,
      }, { status: 201 });
    } catch (err) {
      return safeErrorResponse(502, 'Failed to create proposal on DevNet', err);
    }
  }

  return safeErrorResponse(405, 'Method not allowed');
};
