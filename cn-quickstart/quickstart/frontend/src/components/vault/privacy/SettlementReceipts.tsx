// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import type { SettlementReceipt, VaultContract } from '../../../types';
import { copy } from '../../../lib/copy';
import { shortParty } from '../../../utils/party';

interface SettlementReceiptsProps {
  receipts: VaultContract<SettlementReceipt>[];
}

/** "Payment receipts" list — each receipt: amount + "Payment completed" +
 *  human party labels. Technical hashes under TechnicalDetails. */
const SettlementReceipts: React.FC<SettlementReceiptsProps> = ({ receipts }) => (
  <div className="card glass-panel border-success border-opacity-10 mt-4">
    <div className="card-header bg-transparent border-bottom border-secondary border-opacity-20 pb-3 d-flex justify-content-between align-items-center">
      <h5 className="mb-0 fw-bold d-flex align-items-center gap-2 text-success">
        <span>🧾</span> {copy.receiptsTitle}
      </h5>
      {receipts.length > 0 && <span className="badge bg-success px-2">{receipts.length} settled</span>}
    </div>
    <div className="card-body pt-3">
      {receipts.length === 0 ? (
        <div className="text-center py-4 text-on-glass">
          <p className="small mb-1">No payment receipts yet.</p>
          <p className="xsmall mb-0">Confirm delivery in <strong>Step 2 · Act</strong> — the Canton Coin transfer generates an immutable receipt here.</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {receipts.map((r) => (
            <div key={r.contractId} className="card border-success border-opacity-20 bg-surface bg-opacity-40">
              <div className="card-body py-2.5 px-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-0.5">
                    <strong className="text-success font-monospace">{r.payload.amount} {r.payload.currency}</strong>
                    <span className="text-white small">settled ({r.payload.outcome})</span>
                    <span className={`badge px-2 py-0.5 xsmall ${r.payload.settlementExecuted ? 'bg-success bg-opacity-25 text-success' : 'bg-secondary bg-opacity-25 text-on-glass'}`}>
                      {r.payload.settlementExecuted ? copy.receiptSettled : 'Recorded outcome only'}
                    </span>
                  </div>
                  <div className="text-on-glass xsmall">
                    From {shortParty(r.payload.accepter)} → to {shortParty(r.payload.proposer)}
                  </div>
                </div>
                {r.payload.note && (
                  <span className="badge bg-white bg-opacity-5 border border-white border-opacity-10 text-on-glass xsmall py-1.5">
                    Note: {r.payload.note}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default SettlementReceipts;
