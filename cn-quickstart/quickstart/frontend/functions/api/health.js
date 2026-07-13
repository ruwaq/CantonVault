import { ledgerGet, ledgerEnd } from './_ledger.js';

export const onRequest = async () => {
  try {
    const [ver, off] = await Promise.all([
      ledgerGet('/v2/version').then((d) => d.version),
      ledgerEnd(),
    ]);
    return Response.json({ status: 'ok', cantonVersion: ver, ledgerOffset: off });
  } catch (err) {
    return Response.json({ status: 'error', message: err.message }, { status: 503 });
  }
};
