import { ledgerEnd, PARTY, configure } from './_ledger.js';

export const onRequest = async (context) => {
  const { env } = context;
  configure(env);
  try {
    const offset = await ledgerEnd();
    return Response.json({
      name: 'CantonVault Operator',
      party: PARTY.value,
      isAdmin: true,
      ledgerOffset: offset,
    });
  } catch (err) {
    return Response.json({ error: 'DevNet unreachable' }, { status: 503 });
  }
};
