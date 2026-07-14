// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useState } from 'react';
import type { Commitment, DisclosedRecord, SettlementReceipt, VaultContract } from '../../../types';
import { copy } from '../../../lib/copy';
import TechnicalDetails from '../TechnicalDetails';
import SettlementReceipts from './SettlementReceipts';

interface PrivacyLabProps {
  receipts: VaultContract<SettlementReceipt>[];
  disclosures: VaultContract<DisclosedRecord>[];
  commitments: VaultContract<Commitment>[];
}

/**
 * Privacy Lab — humanized (no pseudoterminal). The heart of the demo.
 *
 * Three columns in plain English:
 *   1. "What you see"           — full commitment, human party labels
 *   2. "What the mediator sees" — lock-icon empty state: 0 agreements found
 *   3. "What the mediator learns after a report" — revealed fields, human
 *
 * The old `> CANTON_PRIVATE_ISOLATION` pseudoterminal is gone: a novice reads
 * "0 agreements found", a technician expands Technical details for hashes.
 */
const PrivacyLab: React.FC<PrivacyLabProps> = ({ receipts, disclosures, commitments }) => {
  const [viewIndex, setViewIndex] = useState(0);
  const sample = commitments[viewIndex] ?? commitments[0];

  return (
    <div>
      {/* Affirmation banner — value statement, not technical explanation */}
      <div className="alert alert-light mb-4 bg-white bg-opacity-5 border-0 py-3">
        <h6 className="fw-bold text-white mb-2">🛡️ {copy.privacyBannerTitle}</h6>
        <p className="small text-on-glass mb-0">
          {copy.privacyBannerBody}
        </p>
      </div>

      {/* Viewpoint selector (only when more than one commitment) */}
      {commitments.length > 1 && (
        <div className="card glass-panel mb-4 py-2 px-3">
          <div className="d-flex align-items-center gap-3">
            <label className="form-label small text-on-glass mb-0 flex-shrink-0">View commitment ledger footprint:</label>
            <select className="form-select form-select-sm" value={viewIndex} onChange={(e) => setViewIndex(Number(e.target.value))}>
              {commitments.map((c, i) => (
                <option key={c.contractId} value={i}>
                  {c.payload.description} ({c.payload.amount} {c.payload.currency})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Three columns */}
      <div className="row g-4 mb-4">
        {/* Column 1: What you see (stakeholders, full view) */}
        <div className="col-lg-4 col-md-6">
          <div className="card h-100 border-success border-opacity-20 glass-panel">
            <div className="card-header bg-success bg-opacity-5 border-bottom border-success border-opacity-10 pb-3 d-flex justify-content-between align-items-center">
              <span className="text-success fw-bold d-flex align-items-center gap-2">
                <span>🤝</span> {copy.privacyCol1Title}
              </span>
              <span className="badge bg-success bg-opacity-20 text-success">Full</span>
            </div>
            <div className="card-body">
              {sample ? (
                <div className="d-flex flex-column gap-3">
                  <div className="bg-white bg-opacity-5 p-3 rounded border border-white border-opacity-5">
                    <h6 className="fw-bold text-white mb-2">{sample.payload.description}</h6>
                    <div className="text-success fw-bold fs-5 mb-2">{sample.payload.amount} {sample.payload.currency}</div>
                    <span className="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-20">
                      {sample.payload.workflow}
                    </span>
                  </div>
                  <TechnicalDetails
                    contractId={sample.contractId}
                    parties={[
                      { label: copy.roleProposer, partyId: sample.payload.proposer },
                      { label: copy.roleAccepter, partyId: sample.payload.accepter },
                      { label: copy.roleThirdParty, partyId: sample.payload.thirdParty },
                    ]}
                  />
                </div>
              ) : (
                <div className="text-center py-5 text-on-glass">
                  <em>No active commitments</em>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column 2: What the mediator sees — lock-icon empty state (the demo's heart) */}
        <div className="col-lg-4 col-md-6">
          <div className="card h-100 border-danger border-opacity-20 glass-panel">
            <div className="card-header bg-danger bg-opacity-5 border-bottom border-danger border-opacity-10 pb-3 d-flex justify-content-between align-items-center">
              <span className="text-danger fw-bold d-flex align-items-center gap-2">
                <span>🔒</span> {copy.privacyCol2Title}
              </span>
              <span className="badge bg-danger bg-opacity-20 text-danger">Nothing</span>
            </div>
            <div className="card-body d-flex flex-column justify-content-center text-center">
              <div className="py-4">
                <div className="fs-1 mb-3">🔒</div>
                <h6 className="fw-bold text-white mb-1">{copy.privacyCol2Empty}</h6>
                <p className="text-on-glass small mb-0">
                  <strong className="text-danger">0 agreements found.</strong>
                  <br />
                  The mediator has no record of this transaction.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: What the mediator learns after a report */}
        <div className="col-lg-4 col-md-12">
          <div className="card h-100 border-warning border-opacity-20 glass-panel">
            <div className="card-header bg-warning bg-opacity-5 border-bottom border-warning border-opacity-10 pb-3 d-flex justify-content-between align-items-center">
              <span className="text-warning fw-bold d-flex align-items-center gap-2">
                <span>👁️</span> {copy.privacyCol3Title}
              </span>
              <span className="badge bg-warning bg-opacity-20 text-warning">If reported</span>
            </div>
            <div className="card-body">
              {disclosures.length === 0 ? (
                <div className="text-center py-5 text-on-glass d-flex flex-column align-items-center justify-content-center h-100">
                  <div className="fs-3 mb-2">👁️</div>
                  <p className="xsmall max-width-240 mx-auto mb-0">{copy.privacyCol3Empty}</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  <p className="small text-on-glass mb-0">
                    {copy.privacyCol3Body}
                  </p>
                  {disclosures.map((d) => (
                    <div key={d.contractId} className="bg-surface border border-warning border-opacity-20 p-3 rounded">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="badge bg-warning text-dark xsmall">What the mediator learned</span>
                        <span className="xsmall text-on-glass font-monospace" style={{ opacity: 0.85 }}>
                          {d.payload.revealedAt ? d.payload.revealedAt.split('T')[0] : 'Today'}
                        </span>
                      </div>
                      <div className="font-monospace small text-white border-bottom border-secondary border-opacity-20 pb-2 mb-2">
                        {Object.entries(d.payload.revealedFields).map(([k, v]) => (
                          <div key={k} className="d-flex justify-content-between">
                            <span className="text-on-glass">{k}:</span>
                            <span className="text-success">{v}</span>
                          </div>
                        ))}
                      </div>
                      <p className="small text-on-glass mb-0">
                        <strong>{copy.privacyCol3Nothing}</strong>
                      </p>
                      <TechnicalDetails
                        sourceCid={d.payload.sourceCid}
                        revealedFields={d.payload.revealedFields}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SettlementReceipts receipts={receipts} />
    </div>
  );
};

export default PrivacyLab;
