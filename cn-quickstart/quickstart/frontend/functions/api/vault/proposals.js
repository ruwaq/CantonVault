import { ledgerEnd, PARTY, PKG, submitCreate, queryActiveContracts } from '../_ledger.js';

const PROPOSAL_TPL = 'Vault.CommitmentProposal:CommitmentProposal';

export const onRequest = async (context) => {
  const { request } = context;

  if (request.method === 'GET') {
    try {
      const contracts = await queryActiveContracts([
        `#${PKG}:${PROPOSAL_TPL}`,
      ]);
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

      const result = await submitCreate('Vault.CommitmentProposal:CommitmentProposal', {
        // `||` (not `??`) so empty strings from the frontend fall back to PARTY.
        proposer: PARTY,
        accepter: String(body.accepter || PARTY),
        thirdParty: String(body.thirdParty || PARTY),
        amount,
        currency: String(body.currency || 'CC'),
        description,
        workflow: String(body.workflow || 'supply-chain-finance'),
        deadline: String(body.deadline || '2026-12-31T23:59:59Z'),
        instrumentAdmin: PARTY,
        realSettlementRequired: false,
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
