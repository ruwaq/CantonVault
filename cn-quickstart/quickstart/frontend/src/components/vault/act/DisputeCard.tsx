// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import type { DisputeCase, VaultContract } from '../../../types';
import { copy } from '../../../lib/copy';

interface DisputeCardProps {
  contract: VaultContract<DisputeCase>;
  pendingAction: { cid: string; action: string } | null;
  onResolve: (contractId: string) => void;
}

/** One dispute card — escalation awaiting a mediator ruling. */
const DisputeCard: React.FC<DisputeCardProps> = ({ contract, pendingAction, onResolve }) => {
  const d = contract.payload;
  const isResolving = pendingAction?.cid === d.commitmentRef && pendingAction?.action === 'resolve';
  const busy = pendingAction?.cid === d.commitmentRef;

  return (
    <div className="card border-warning border-opacity-30 bg-surface bg-opacity-70">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-2">
          <div>
            <span className="badge bg-warning bg-opacity-15 text-warning border border-warning border-opacity-20 small mb-1">
              Arbitration Requested
            </span>
            <div className="fw-bold text-white small mb-1">
              Commitment: <span className="font-monospace text-on-glass">{d.commitmentRef.slice(0, 16)}…</span>
            </div>
            <div className="text-on-glass small">
              Reason: <em className="text-warning-light">"{d.reason}"</em>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm px-3 py-1.5 fw-semibold"
            onClick={() => onResolve(d.commitmentRef)}
            disabled={busy}
            title="As the mediator, issue a binding ruling in favor of the proposer or accepter. Archives the dispute and creates a terminal payment receipt."
          >
            {isResolving ? 'Deciding…' : copy.resolve}
          </button>
        </div>
        <div className="xsmall text-on-glass border-top border-secondary border-opacity-10 pt-2 mt-2" style={{ opacity: 0.85 }}>
          🔒 Only the fields disclosed by the dispute are visible to the mediator's node.
        </div>
      </div>
    </div>
  );
};

export default DisputeCard;
