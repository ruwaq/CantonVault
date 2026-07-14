// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useState } from 'react';
import { copy } from '../../lib/copy';

interface CopyCidButtonProps {
  /** Full on-ledger contract id to copy to the clipboard. */
  cid: string;
}

/**
 * Tiny reusable control so the jury can copy any contractId to verify it
 * independently against the Canton DevNet explorer / ledger offset.
 * Shows a transient "copied" confirmation for 1.5s.
 */
const CopyCidButton: React.FC<CopyCidButtonProps> = ({ cid }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn btn-sm btn-outline-light border-0 py-0 px-1 align-baseline"
      style={{ fontSize: '0.7rem' }}
      title={copy.copyCid}
      onClick={() => {
        void navigator.clipboard?.writeText(cid).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? '✓ copied' : '⧉ copy'}
    </button>
  );
};

export default CopyCidButton;
