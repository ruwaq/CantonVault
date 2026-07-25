import { ledgerEnd, walletBalance, PARTY, configure, safeErrorResponse } from '../_ledger.js';

// GET /api/vault/balance — returns the REAL on-ledger Canton Coin (Amulet) balance
// for the acting party, read live from the Splice Validator REST API. No hardcoding.
export const onRequest = async (context) => {
  const { env } = context;
  configure(env);
  try {
    const [offset, wallet] = await Promise.all([
      ledgerEnd(),
      walletBalance(PARTY.value),
    ]);
    // The validator returns CC amounts as high-precision decimals (e.g.
    // "31424876.5560473427"). Format to 2 decimal places for display.
    const balance = Number(wallet.unlocked);
    return Response.json({
      balance: Number.isFinite(balance) ? balance : 0,
      locked: Number(wallet.locked) || 0,
      round: wallet.round,
      party: PARTY.value,
      ledgerOffset: offset,
    });
  } catch (err) {
    return safeErrorResponse(503, 'DevNet unreachable', err);
  }
};
