import { PARTY, MEDIATOR_PARTY, configure } from '../_ledger.js';

// Demo parties. The mediator is a DISTINCT party (different prefix, same hash)
// from the actor — this is required by the DisclosedRecord template precondition
// (`ensure discloser /= observer`) so the dispute flow works. In Canton, the
// different prefix means the mediator's validator node has a genuinely separate
// view, which is what the Privacy Lab demonstrates.
export const onRequest = async (context) => {
  const { env } = context;
  configure(env);
  return Response.json([
    { label: 'Proposer (Supplier)', partyId: PARTY.value, role: 'proposer' },
    { label: 'Accepter (Financier)', partyId: PARTY.value, role: 'accepter' },
    { label: 'Mediator (Arbitrator)', partyId: MEDIATOR_PARTY.value, role: 'thirdParty' },
  ]);
};
