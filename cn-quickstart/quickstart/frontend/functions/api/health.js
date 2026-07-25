import { ledgerGet, ledgerEnd, configure, safeErrorResponse } from './_ledger.js';

export const onRequest = async (context) => {
  const { env } = context;
  configure(env);
  try {
    const [ver, off] = await Promise.all([
      ledgerGet('/v2/version').then((d) => d.version),
      ledgerEnd(),
    ]);
    return Response.json({ status: 'ok', cantonVersion: ver, ledgerOffset: off });
  } catch (err) {
    return safeErrorResponse(503, 'DevNet unreachable', err);
  }
};
