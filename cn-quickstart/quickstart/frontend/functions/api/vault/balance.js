import { ledgerEnd, PARTY } from '../_ledger.js';

export const onRequest = async () => {
  try {
    const offset = await ledgerEnd();
    return Response.json({ balance: 0, party: PARTY, ledgerOffset: offset });
  } catch (err) {
    return Response.json({ error: 'DevNet unreachable' }, { status: 503 });
  }
};
