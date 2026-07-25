import { ledgerEnd, PARTY, configure } from './_ledger.js';

// Demo operator identity. The demo is intentionally open (no session) so judges
// can enter without friction; see _middleware.js for the rationale. This returns
// the single m2m operator party. (audit Fase 3: auth removed per team decision.)
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
