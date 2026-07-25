// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';

interface VerifyLinkProps {
    /** Canton transaction hash. If absent, nothing renders. */
    updateId?: string | null;
    /** Visual size variant. */
    size?: 'sm' | 'md';
    /** Extra classes. */
    className?: string;
}

/**
 * Persistent 🔍 Verify on-ledger link to the public /tx/{updateId} page.
 *
 * Rendered inside the commitment / receipt / dispute cards so a judge can open
 * the verifier any time (not only from the ephemeral toast, which auto-dismisses).
 * If no updateId is available (e.g. older records written before this field was
 * persisted), nothing renders — the card degrades gracefully.
 */
const VerifyLink: React.FC<VerifyLinkProps> = ({ updateId, size = 'sm', className = '' }) => {
    if (!updateId) return null;
    const sizeClass = size === 'sm' ? 'btn-sm py-0 px-2' : 'py-1 px-3';
    return (
        <a
            href={`/tx/${updateId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn-outline-info ${sizeClass} text-info border-info border-opacity-25 text-decoration-none ${className}`}
            style={{ fontSize: size === 'sm' ? '0.72rem' : '0.85rem' }}
            title="Open the public verifier for this transaction"
        >
            🔍 Verify on-ledger
        </a>
    );
};

export default VerifyLink;
