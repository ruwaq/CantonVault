// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import { copy } from '../../lib/copy';
import { shortParty } from '../../utils/party';
import CopyCidButton from './CopyCidButton';

export interface PartyDetail {
  label: string;
  partyId: string;
}

export interface TechnicalDetailsProps {
  /** On-ledger contract id (shown with a copy button). */
  contractId?: string;
  /** Ledger offset, shown as a human "Record #" with the raw value. */
  offset?: number;
  /** Stakeholder parties to list with human labels + hashes. */
  parties?: PartyDetail[];
  /** Fields selectively disclosed on dispute (key → value). */
  revealedFields?: Record<string, string>;
  /** cid of the source contract this one derives from (dispute → commitment). */
  sourceCid?: string;
}

/**
 * Collapsible "Technical details ▾" panel. Reused across all card types so
 * the novice sees the human summary while the jury can expand raw hashes,
 * offsets and party ids on demand. Collapsed by default (progressive
 * disclosure — NN/g).
 */
const TechnicalDetails: React.FC<TechnicalDetailsProps> = ({
  contractId,
  offset,
  parties,
  revealedFields,
  sourceCid,
}) => {
  // Nothing to show → don't render the toggle at all.
  const hasParties = parties && parties.length > 0;
  const hasRevealed = revealedFields && Object.keys(revealedFields).length > 0;
  if (!contractId && offset == null && !hasParties && !hasRevealed && !sourceCid) {
    return null;
  }

  return (
    <details className="mt-2">
      <summary
        className="xsmall text-on-glass cursor-pointer"
        style={{ cursor: 'pointer', listStyle: 'none' }}
      >
        ▾ {copy.technicalDetails}
      </summary>
      <div className="xsmall text-on-glass font-monospace ps-2 pt-1">
        {contractId && (
          <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
            <span>Contract ID: {contractId.slice(0, 16)}…</span>
            <CopyCidButton cid={contractId} />
          </div>
        )}
        {offset != null && (
          <div className="mt-1" style={{ fontSize: '0.7rem' }}>
            {copy.recordLabel} {offset.toLocaleString()}
          </div>
        )}
        {hasParties && (
          <div className="mt-1" style={{ fontSize: '0.7rem' }}>
            {parties!.map((p) => (
              <div key={p.label}>
                <strong>{p.label}:</strong> {shortParty(p.partyId)}
              </div>
            ))}
          </div>
        )}
        {hasRevealed && (
          <div className="mt-1" style={{ fontSize: '0.7rem' }}>
            {Object.entries(revealedFields!).map(([k, v]) => (
              <div key={k} className="d-flex justify-content-between">
                <span>{k}:</span>
                <span className="text-success">{v}</span>
              </div>
            ))}
          </div>
        )}
        {sourceCid && (
          <div className="mt-1" style={{ fontSize: '0.7rem' }}>
            <strong>Source:</strong> {sourceCid.slice(0, 16)}… <CopyCidButton cid={sourceCid} />
          </div>
        )}
      </div>
    </details>
  );
};

export default TechnicalDetails;
