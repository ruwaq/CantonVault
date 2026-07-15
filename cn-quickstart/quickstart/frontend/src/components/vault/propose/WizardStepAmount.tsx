// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import { copy } from '../../../lib/copy';

interface WizardStepAmountProps {
  value: string;
  onChange: (v: string) => void;
}

/** Wizard screen 2 — "How much?" One field: amount, with "CC" suffix fixed.
 *  Cash App style: the number is all that matters. No $ symbol (CC != USD). */
const WizardStepAmount: React.FC<WizardStepAmountProps> = ({ value, onChange }) => (
  <div>
    <label className="form-label fw-bold fs-5 text-heading mb-3">
      {copy.wizardStep2Title}
    </label>
    <div className="input-group input-group-lg">
      <input
        className="form-control text-end"
        type="number"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="5,000"
        style={{ fontSize: '1.75rem', fontWeight: 700 }}
      />
      <span className="input-group-text fw-bold" style={{ fontSize: '1.25rem', background: 'var(--bg-surface)', color: 'var(--text-heading)' }}>
        CC
      </span>
    </div>
    <div className="form-text text-on-glass mt-2">
      {value && !isNaN(Number(value)) ? (
        <>{Number(value).toLocaleString()} CC · {copy.wizardStep2Hint}</>
      ) : (
        <>{copy.wizardStep2Hint}</>
      )}
    </div>
  </div>
);

export default WizardStepAmount;
