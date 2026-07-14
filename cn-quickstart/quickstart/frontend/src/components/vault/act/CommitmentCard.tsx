// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import type { Commitment, VaultContract } from '../../../types';
import { copy } from '../../../lib/copy';
import TechnicalDetails from '../TechnicalDetails';

interface CommitmentCardProps {
  contract: VaultContract<Commitment>;
  /** True when a DisputeCase exists for this commitment. */
  disputed: boolean;
  /** Pending-action descriptor: { cid, action } while a mutation is in flight. */
  pendingAction: { cid: string; action: string } | null;
  onFulfill: (c: VaultContract<Commitment>) => void;
  onDispute: (c: VaultContract<Commitment>) => void;
  onRefund: (c: VaultContract<Commitment>) => void;
}

/**
 * One commitment card, status-first (spec Section 9):
 *   STATUS badge → description + amount → primary actions → Technical details ▾
 */
const CommitmentCard: React.FC<CommitmentCardProps> = ({
  contract, disputed, pendingAction, onFulfill, onDispute, onRefund,
}) => {
  const c = contract.payload;
  const isFulfilling = pendingAction?.cid === contract.contractId && pendingAction?.action === 'fulfill';
  const isDisputing = pendingAction?.cid === contract.contractId && pendingAction?.action === 'dispute';
  const isRefunding = pendingAction?.cid === contract.contractId && pendingAction?.action === 'refund';
  const busy = pendingAction?.cid === contract.contractId;

  return (
    <div className={`card border-secondary border-opacity-20 bg-surface bg-opacity-50 ${disputed ? 'border-danger border-opacity-40' : ''}`}>
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-2">
          <div>
            <h6 className="fw-bold text-white mb-1 d-flex align-items-center gap-2 flex-wrap">
              {c.description}
              {disputed ? (
                <span className="badge bg-danger">{copy.statusDisputed}</span>
              ) : (
                <span className="badge bg-success">{copy.statusActive}</span>
              )}
            </h6>
            <div className="text-on-glass small">
              Amount: <strong className="text-success">{c.amount} {c.currency}</strong>
            </div>
          </div>
          <div className="d-flex gap-1.5 flex-wrap">
            <button
              className="btn btn-outline-primary btn-sm px-2.5 py-1 fw-medium"
              onClick={() => onFulfill(contract)}
              disabled={disputed || busy}
              title="The payer confirms delivery. Canton Coin is transferred atomically and a payment receipt is created."
            >
              {isFulfilling ? 'Confirming…' : copy.fulfill}
            </button>
            <button
              className="btn btn-warning btn-sm px-2.5 py-1 fw-semibold text-dark"
              onClick={() => onDispute(contract)}
              disabled={disputed || busy}
              title="Escalate to the mediator. Reveals ONLY the amount + description (selective disclosure). A DisputeCase is opened for the mediator to resolve."
            >
              {isDisputing ? 'Reporting…' : copy.dispute}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm px-2.5 py-1 fw-medium"
              onClick={() => onRefund(contract)}
              disabled={busy}
              title="Close an unfulfilled commitment after its deadline. Canton Coin returns to the payer. Only works once the deadline has expired."
            >
              {isRefunding ? 'Cancelling…' : copy.refund}
            </button>
          </div>
        </div>
        <TechnicalDetails
          contractId={contract.contractId}
          parties={[
            { label: copy.roleProposer, partyId: c.proposer },
            { label: copy.roleAccepter, partyId: c.accepter },
            { label: copy.roleThirdParty, partyId: c.thirdParty },
          ]}
        />
      </div>
    </div>
  );
};

export default CommitmentCard;
