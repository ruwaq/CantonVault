import { ledgerEnd, PARTY } from './_ledger.js';

export const onRequest = async () => {
  try {
    const offset = await ledgerEnd();
    return Response.json({
      name: 'CantonVault Operator',
      party: PARTY,
      isAdmin: true,
      ledgerOffset: offset,
    });
  } catch (err) {
    return Response.json({ error: 'DevNet unreachable' }, { status: 503 });
  }
};
