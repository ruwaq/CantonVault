// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import { useToast } from '../stores/toastStore';

const ToastNotification: React.FC = () => {
    const { message, show, proof, hideError } = useToast();

    const isError = message.startsWith("Error:");
    const isSuccess = message.startsWith("Success:");

    const bgClass = isError ? 'bg-danger' : isSuccess ? 'bg-success' : 'bg-info';
    const textColor = 'text-white';
    const headerText = isError ? '⚠ Error' : isSuccess ? '✓ On-ledger confirmed' : 'Info';

    // Strip the legacy "Success: "/"Error: " prefix when rendering the body so
    // the toast reads naturally with the new header.
    const bodyText = message.replace(/^(Success|Error):\s*/, '');

    return (
        <div
            className="position-fixed mt-3 start-50 translate-middle-x"
            style={{ zIndex: 2000, top: "3rem", minWidth: proof ? '360px' : undefined }}
        >
            <div
                id="liveToast"
                className={`toast ${bgClass} ${textColor} ${show ? 'show' : ''}`}
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
            >
                <div className="toast-header">
                    <strong className="me-auto">{headerText}</strong>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={hideError}
                        aria-label="Close"
                    ></button>
                </div>
                <div className="toast-body">
                    <div className="fw-semibold">{bodyText}</div>
                    {isSuccess && proof && (proof.contractId || proof.offset != null) && (
                        <div className="mt-2 pt-2 border-top border-white border-opacity-25 font-monospace" style={{ fontSize: '0.72rem', lineHeight: 1.5 }}>
                            {proof.contractId && (
                                <div className="d-flex align-items-center gap-1">
                                    <span className="opacity-75">CID:</span>
                                    <span className="text-truncate" style={{ maxWidth: '240px' }}>
                                        {proof.contractId.slice(0, 12)}…{proof.contractId.slice(-8)}
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-light py-0 px-1"
                                        style={{ fontSize: '0.7rem' }}
                                        onClick={() => { void navigator.clipboard?.writeText(proof.contractId ?? ''); }}
                                        title="Copy contract id"
                                    >
                                        ⧉
                                    </button>
                                </div>
                            )}
                            {proof.offset != null && (
                                <div>
                                    <span className="opacity-75">Ledger offset:</span>{' '}
                                    <span className="text-warning">{proof.offset.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ToastNotification;
