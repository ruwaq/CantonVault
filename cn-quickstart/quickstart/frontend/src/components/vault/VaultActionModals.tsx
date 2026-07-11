// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import { useEffect, useState } from 'react';
import Modal from '../Modal';
import type { Commitment } from '../../types';
import { shortParty } from '../../utils/party';

interface FulfillModalProps {
    show: boolean;
    commitment: Commitment | null;
    onClose: () => void;
    onConfirm: (note: string, allocationContractId: string) => void;
}

/**
 * Modal to fulfill a commitment with real Canton Coin settlement.
 */
export function FulfillModal({ show, commitment, onClose, onConfirm }: FulfillModalProps) {
    const [note, setNote] = useState('Delivery confirmed');
    const [allocationContractId, setAllocationContractId] = useState('');

    useEffect(() => {
        if (show) {
            setNote('Delivery confirmed');
            setAllocationContractId('');
        }
    }, [show]);

    if (!commitment) return null;

    const handleConfirm = () => {
        const allocationCid = allocationContractId.trim();
        if (!allocationCid) {
            return;
        }
        onConfirm(note.trim() || 'Delivery confirmed', allocationCid);
    };

    return (
        <Modal
            show={show}
            title={<>Fulfill commitment &middot; {commitment.description}</>}
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmButtonLabel="Fulfill"
            confirmButtonClassName="btn-primary"
            confirmButtonDisabled={!allocationContractId.trim()}
            size="lg"
        >
            <div className="mb-3">
                <span className="text-muted me-3">
                    Amount: <strong>{commitment.amount} {commitment.currency}</strong>
                </span>
                <span className="text-muted">
                    Workflow: <code>{commitment.workflow}</code>
                </span>
            </div>

            <div className="mb-3">
                <div className="alert alert-info small mb-0">
                    Production mode requires a real Canton Coin allocation. The payer is the <strong>accepter</strong>; the receiver is the <strong>proposer</strong>.
                </div>
            </div>

            <div className="mb-3">
                <label className="form-label small">Fulfillment note</label>
                <input
                    className="form-control form-control-sm"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
            </div>

            <div className="mb-3">
                <label className="form-label small">Allocation contract id</label>
                <input
                    className="form-control form-control-sm"
                    style={{ fontSize: '0.75rem' }}
                    placeholder="#0:1 (the Canton Coin allocation approved by the accepter)"
                    value={allocationContractId}
                    onChange={(e) => setAllocationContractId(e.target.value)}
                />
                <div className="form-text small">
                    The accepter confirms delivery and the protocol atomically transfers Canton Coin from accepter to proposer.
                </div>
            </div>
        </Modal>
    );
}

interface RefundModalProps {
    show: boolean;
    commitment: Commitment | null;
    onClose: () => void;
    onConfirm: (allocationContractId: string) => void;
}

export function RefundModal({ show, commitment, onClose, onConfirm }: RefundModalProps) {
    const [allocationContractId, setAllocationContractId] = useState('');

    useEffect(() => {
        if (show) {
            setAllocationContractId('');
        }
    }, [show]);

    if (!commitment) return null;

    const handleConfirm = () => {
        const allocationCid = allocationContractId.trim();
        if (!allocationCid) {
            return;
        }
        onConfirm(allocationCid);
    };

    return (
        <Modal
            show={show}
            title={<>Refund commitment &middot; {commitment.description}</>}
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmButtonLabel="Refund"
            confirmButtonClassName="btn-outline-secondary"
            confirmButtonDisabled={!allocationContractId.trim()}
        >
            <div className="alert alert-warning small">
                Refund in production also requires a real reverse allocation. The refund moves Canton Coin from proposer back to accepter.
            </div>
            <label className="form-label small">Reverse allocation contract id</label>
            <input
                className="form-control form-control-sm"
                style={{ fontSize: '0.75rem' }}
                placeholder="#0:2 (reverse allocation proposer -> accepter)"
                value={allocationContractId}
                onChange={(e) => setAllocationContractId(e.target.value)}
            />
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
            <p className="small text-muted">
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
        </Modal>
    );
}

interface ResolveModalProps {
    show: boolean;
    contractId: string | null;
    onClose: () => void;
    onConfirm: (ruling: 'proposer' | 'accepter', allocationContractId?: string) => void;
}

/** Modal for the third party to resolve an open dispute. */
export function ResolveModal({ show, contractId, onClose, onConfirm }: ResolveModalProps) {
    const [ruling, setRuling] = useState<'proposer' | 'accepter'>('proposer');
    const [allocationContractId, setAllocationContractId] = useState('');

    useEffect(() => {
        if (show) {
            setRuling('proposer');
            setAllocationContractId('');
        }
    }, [show]);

    if (!contractId) return null;

    const handleConfirm = () => {
        const allocationCid = allocationContractId.trim();
        if (ruling === 'proposer' && !allocationCid) {
            return;
        }
        onConfirm(ruling, allocationCid || undefined);
    };

    return (
        <Modal
            show={show}
            title="Resolve dispute"
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmButtonLabel="Resolve dispute"
            confirmButtonClassName="btn-primary"
            confirmButtonDisabled={ruling === 'proposer' && !allocationContractId.trim()}
        >
            <p className="small text-muted">
                As the third party, issue a binding ruling. The resolution now creates a terminal settlement receipt, and proposer wins require a real allocation.
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
                    Rule for proposer and execute settlement
                </label>
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
                    Rule for accepter without payout
                </label>
            </div>
            {ruling === 'proposer' ? (
                <>
                    <label className="form-label small">Allocation contract id</label>
                    <input
                        className="form-control form-control-sm"
                        style={{ fontSize: '0.75rem' }}
                        placeholder="#0:3 (allocation accepter -> proposer)"
                        value={allocationContractId}
                        onChange={(e) => setAllocationContractId(e.target.value)}
                    />
                </>
            ) : null}
        </Modal>
    );
}
