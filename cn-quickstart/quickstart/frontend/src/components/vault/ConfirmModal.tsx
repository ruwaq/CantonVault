// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import Modal from '../Modal';

interface ConfirmModalProps {
  show: boolean;
  title: React.ReactNode;
  /** "Here's what will happen" — shown as the modal body. */
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Visual style of the confirm button. Default primary. */
  variant?: 'primary' | 'success' | 'danger' | 'warning';
  disabled?: boolean;
}

/**
 * Generic confirmation modal for irreversible actions — "beneficial friction"
 * (ACM research: a 2-step confirmation before an irreversible action
 * improves the decision and reduces regret). Reuses Modal's focus trap.
 *
 * Use for actions that currently fire on a single click without preview:
 * Accept proposal, etc. Fulfill/Dispute/Refund/Resolve already have their
 * own dedicated modals with richer bodies.
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  show, title, body, confirmLabel, cancelLabel = 'Cancel',
  onConfirm, onCancel, variant = 'primary', disabled,
}) => (
  <Modal
    show={show}
    title={title}
    onClose={onCancel}
    footer={
      <>
        <button className="btn btn-outline-light" onClick={onCancel} disabled={disabled}>
          {cancelLabel}
        </button>
        <button
          className={`btn btn-${variant}`}
          onClick={onConfirm}
          disabled={disabled}
        >
          {disabled ? '…' : confirmLabel}
        </button>
      </>
    }
  >
    <p className="small text-on-glass mb-0">
      <strong className="text-heading">Here's what will happen:</strong>
    </p>
    <div className="small text-on-glass mt-1">{body}</div>
  </Modal>
);

export default ConfirmModal;
