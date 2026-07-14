import { PARTY, MEDIATOR_PARTY } from '../_ledger.js';

// Demo parties. The mediator is a DISTINCT party (different prefix, same hash)
// from the actor — this is required by the DisclosedRecord template precondition
// (`ensure discloser /= observer`) so the dispute flow works. In Canton, the
// different prefix means the mediator's validator node has a genuinely separate
// view, which is what the Privacy Lab demonstrates.
export const onRequest = async () => Response.json([
  { label: 'Proposer (Supplier)', partyId: PARTY, role: 'proposer' },
  { label: 'Accepter (Financier)', partyId: PARTY, role: 'accepter' },
  { label: 'Mediator (Arbitrator)', partyId: MEDIATOR_PARTY, role: 'thirdParty' },
]);
