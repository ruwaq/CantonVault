// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import { useState } from 'react';
import Modal from '../Modal';
import type { Commitment } from '../../types';

type SettlementMode = 'symbolic' | 'real';

interface FulfillModalProps {
    show: boolean;
    commitment: Commitment | null;
    onClose: () => void;
    onConfirm: (note: string, allocationContractId: string | undefined) => void;
}

/**
 * Modal to fulfill a commitment. Supports two real modes:
 *  - Symbolic: no Canton Coin allocation (testing/demo without funds)
 *  - Real:     a Canton Coin allocation contract id drives the on-ledger transfer
 */
export function FulfillModal({ show, commitment, onClose, onConfirm }: FulfillModalProps) {
    const [note, setNote] = useState('Delivery confirmed');
    const [allocationContractId, setAllocationContractId] = useState('');
    const [mode, setMode] = useState<SettlementMode>('symbolic');

    if (!commitment) return null;

    const handleConfirm = () => {
        const alloc = mode === 'real' && allocationContractId.trim() ? allocationContractId.trim() : undefined;
        onConfirm(note.trim() || 'Delivery confirmed', alloc);
    };

    return (
        <Modal
            show={show}
            title={<>Fulfill commitment &middot; {commitment.description}</>}
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmButtonLabel="Fulfill"
            confirmButtonClassName="btn-primary"
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
                <label className="form-label small fw-bold">Settlement mode</label>
                <div className="form-check">
                    <input
                        className="form-check-input"
                        type="radio"
                        id="mode-symbolic"
                        checked={mode === 'symbolic'}
                        onChange={() => setMode('symbolic')}
                    />
                    <label className="form-check-label small" htmlFor="mode-symbolic">
                        Symbolic &mdash; create SettlementReceipt without moving Canton Coin
                    </label>
                </div>
                <div className="form-check">
                    <input
                        className="form-check-input"
                        type="radio"
                        id="mode-real"
                        checked={mode === 'real'}
                        onChange={() => setMode('real')}
                    />
                    <label className="form-check-label small" htmlFor="mode-real">
                        Real Canton Coin &mdash; execute Allocation transfer on-ledger
                    </label>
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

            {mode === 'real' && (
                <div className="mb-3">
                    <label className="form-label small">Allocation contract id</label>
                    <input
                        className="form-control form-control-sm"
                        style={{ fontSize: '0.75rem' }}
                        placeholder="#0:1 (the Canton Coin allocation created by the proposer)"
                        value={allocationContractId}
                        onChange={(e) => setAllocationContractId(e.target.value)}
                    />
                    <div className="form-text small">
                        The accepter confirms delivery and the protocol atomically transfers
                        Canton Coin from proposer to accepter.
                    </div>
                </div>
            )}
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
    onConfirm: (ruling: 'proposer' | 'accepter') => void;
}

/** Modal for the third party to resolve an open dispute. */
export function ResolveModal({ show, contractId, onClose, onConfirm }: ResolveModalProps) {
    if (!contractId) return null;
    return (
        <Modal
            show={show}
            title="Resolve dispute"
            onClose={onClose}
            footer={
                <>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
                    <button className="btn btn-outline-primary btn-sm" onClick={() => onConfirm('proposer')}>
                        Rule for proposer
                    </button>
                    <button className="btn btn-outline-primary btn-sm" onClick={() => onConfirm('accepter')}>
                        Rule for accepter
                    </button>
                </>
            }
        >
            <p className="small text-muted">
                As the third party, rule in favour of one side. A DisclosedRecord is created
                as immutable proof of the resolution.
            </p>
        </Modal>
    );
}

/** Truncate a Canton party id for display: cd0a8760…e402 */
export function shortParty(party: string): string {
    if (!party) return '—';
    if (party.length <= 16) return party;
    return `${party.slice(0, 8)}…${party.slice(-4)}`;
}
