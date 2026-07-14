import { ledgerEnd, walletBalance, PARTY } from '../_ledger.js';

// GET /api/vault/balance — returns the REAL on-ledger Canton Coin (Amulet) balance
// for the acting party, read live from the Splice Validator REST API. No hardcoding.
export const onRequest = async () => {
  try {
    const [offset, wallet] = await Promise.all([
      ledgerEnd(),
      walletBalance(PARTY),
    ]);
    // The validator returns CC amounts as high-precision decimals (e.g.
    // "31424876.5560473427"). Format to 2 decimal places for display.
    const balance = Number(wallet.unlocked);
    return Response.json({
      balance: Number.isFinite(balance) ? balance : 0,
      locked: Number(wallet.locked) || 0,
      round: wallet.round,
      party: PARTY,
      ledgerOffset: offset,
    });
  } catch (err) {
    return Response.json(
      { error: 'DevNet unreachable', detail: err.message },
      { status: 503 },
    );
  }
};
