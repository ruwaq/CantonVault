// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import { useEffect, useState } from 'react';
import Modal from '../Modal';
import type { Commitment } from '../../types';
import { shortParty } from '../../utils/party';
import { copy } from '../../lib/copy';

interface FulfillModalProps {
    show: boolean;
    commitment: Commitment | null;
    onClose: () => void;
    onConfirm: (note: string) => void;
}

/**
 * Modal to fulfill a commitment. The demo exercises Fulfill on the SYMBOLIC
 * settlement branch (see SECURITY.md Fase 3): real Canton Coin settlement is
 * not exercisable against the shared DevNet sandbox because the m2m operator is
 * not the DSO. The receipt therefore records settlementExecuted=false. The
 * allocation contract id field has been removed — it was always ignored by the
 * backend and forced the user to enter a fake value.
 */
export function FulfillModal({ show, commitment, onClose, onConfirm }: FulfillModalProps) {
    const [note, setNote] = useState('Delivery confirmed');

    useEffect(() => {
        if (show) {
            setNote('Delivery confirmed');
        }
    }, [show]);

    if (!commitment) return null;

    const handleConfirm = () => {
        onConfirm(note.trim() || 'Delivery confirmed');
    };

    return (
        <Modal
            show={show}
            title={<>{copy.fulfill} &middot; {commitment.description}</>}
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmButtonLabel={copy.fulfill}
            confirmButtonClassName="btn-primary"
            size="lg"
        >
            <div className="mb-3">
                <span className="text-on-glass me-3">
                    Amount: <strong>{commitment.amount} {commitment.currency}</strong>
                </span>
                <span className="text-on-glass">
                    Workflow: <code>{commitment.workflow}</code>
                </span>
            </div>

            <div className="mb-3">
                <div className="alert alert-info small mb-0">
                    The payer is the <strong>accepter</strong>; the receiver is the <strong>proposer</strong>.
                    Fulfill confirms delivery and archives the commitment, producing an immutable Settlement Receipt.
                </div>
            </div>

            <div className="mb-3">
                <label className="form-label small">Fulfillment note</label>
                <input
                    className="form-control form-control-sm"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
                <div className="form-text small text-on-glass">
                    Free-text proof of delivery (e.g. "Shipment confirmed", "Services rendered"). Stored permanently on the Settlement Receipt.
                </div>
            </div>
        </Modal>
    );
}

interface RefundModalProps {
    show: boolean;
    commitment: Commitment | null;
    onClose: () => void;
    onConfirm: () => void;
}

/**
 * Modal to refund (close out) an unfulfilled commitment after its deadline.
 *
 * (audit Fase 3, C-4): Refund is a pure archival close-out — it does NOT move
 * Canton Coin. AcceptProposal does not escrow funds, and the only forward CC
 * movement (Fulfill) only runs when the accepter confirms delivery; if we are
 * here, Fulfill never ran, so there is nothing to reverse. The previous modal
 * asked for a "reverse allocation" the contract no longer accepts (and never
 * should have, since it would have drained the proposer).
 */
export function RefundModal({ show, commitment, onClose, onConfirm }: RefundModalProps) {
    if (!commitment) return null;

    return (
        <Modal
            show={show}
            title={<>Refund commitment &middot; {commitment.description}</>}
            onClose={onClose}
            onConfirm={onConfirm}
            confirmButtonLabel="Refund"
            confirmButtonClassName="btn-outline-secondary"
        >
            <div className="alert alert-warning small mb-0">
                Refund closes out this unfulfilled commitment and archives it on-ledger, producing a Settlement Receipt.
                It is only possible <strong>after the deadline has expired</strong> (the Daml contract enforces this).
            </div>
        </Modal>
    );
}

interface DisputeModalProps {
    show: boolean;
    commitment: Commitment | null;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

/** Modal to raise a dispute, triggering selective disclosure to the third party. */
export function DisputeModal({ show, commitment, onClose, onConfirm }: DisputeModalProps) {
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (show) {
            setReason('');
        }
    }, [show]);

    if (!commitment) return null;

    const handleConfirm = () => onConfirm(reason.trim() || 'Undisputed delivery issue');

    return (
        <Modal
            show={show}
            title={<>Raise dispute &middot; {commitment.description}</>}
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmButtonLabel="Raise dispute"
            confirmButtonClassName="btn-warning"
        >
            <p className="small text-on-glass">
                Raising a dispute reveals only <strong>amount</strong> and{' '}
                <strong>description</strong> to <code>{shortParty(commitment.thirdParty)}</code>.
                The third party will NOT see the full commitment.
            </p>
            <label className="form-label small">Reason</label>
            <input
                className="form-control form-control-sm"
                placeholder="e.g. Goods not delivered as agreed"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                autoFocus
            />
            <div className="form-text small text-on-glass mt-1">
                Why you're escalating. This text <strong>is</strong> visible to the arbitrator and gets recorded in the DisclosedRecord on-ledger. Be specific — the arbitrator rules based on this.
            </div>
        </Modal>
    );
}

interface ResolveModalProps {
    show: boolean;
    contractId: string | null;
    onClose: () => void;
    onConfirm: (ruling: 'proposer' | 'accepter') => void;
}

/**
 * Modal for the third party to resolve an open dispute.
 *
 * (audit Fase 3): the demo exercises ResolveDispute on the symbolic branch, so
 * no Canton Coin moves — the ruling produces a terminal SettlementReceipt plus
 * DisclosedRecords for BOTH parties (so each has on-ledger evidence of the
 * outcome). The previous "allocation contract id" field has been removed.
 */
export function ResolveModal({ show, contractId, onClose, onConfirm }: ResolveModalProps) {
    const [ruling, setRuling] = useState<'proposer' | 'accepter'>('proposer');

    useEffect(() => {
        if (show) {
            setRuling('proposer');
        }
    }, [show]);

    if (!contractId) return null;

    const handleConfirm = () => {
        onConfirm(ruling);
    };

    return (
        <Modal
            show={show}
            title="Resolve dispute"
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmButtonLabel="Resolve dispute"
            confirmButtonClassName="btn-primary"
        >
            <p className="small text-on-glass">
                As the third party, issue a binding ruling. The resolution archives the DisputeCase and creates a terminal Settlement Receipt plus a selective-disclosure proof visible to both parties.
            </p>
            <div className="form-check mb-2">
                <input
                    className="form-check-input"
                    type="radio"
                    id="resolve-proposer"
                    checked={ruling === 'proposer'}
                    onChange={() => setRuling('proposer')}
                />
                <label className="form-check-label small" htmlFor="resolve-proposer">
                    Rule for the proposer (supplier)
                </label>
                <div className="form-text small text-on-glass mt-0 mb-1">
                    The supplier's claim is upheld.
                </div>
            </div>
            <div className="form-check mb-3">
                <input
                    className="form-check-input"
                    type="radio"
                    id="resolve-accepter"
                    checked={ruling === 'accepter'}
                    onChange={() => setRuling('accepter')}
                />
                <label className="form-check-label small" htmlFor="resolve-accepter">
                    Rule for the accepter (financier)
                </label>
                <div className="form-text small text-on-glass mt-0">
                    The financier's position is upheld — use when the claim is unfounded.
                </div>
            </div>
        </Modal>
    );
}
