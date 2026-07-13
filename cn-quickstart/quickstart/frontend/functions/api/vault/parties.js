import { PARTY } from '../_ledger.js';

export const onRequest = async () => Response.json([
  { label: 'Proposer (Supplier)', partyId: PARTY, role: 'proposer' },
  { label: 'Accepter (Financier)', partyId: PARTY, role: 'accepter' },
  { label: 'Third Party (Arbitrator)', partyId: PARTY, role: 'thirdParty' },
]);
