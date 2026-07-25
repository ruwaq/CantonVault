import { ledgerEnd, PARTY, configure } from './_ledger.js';

// NOTE (audit Fase 3): this route is gated by _middleware.js — a valid cv_session
// cookie is required to reach this handler. So isAdmin:true here is now a real
// authorization assertion, not a hardcoded cosmetic value. The frontend's
// useAuth hook will treat a 401 from here as "logged out" and redirect to /login.
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
