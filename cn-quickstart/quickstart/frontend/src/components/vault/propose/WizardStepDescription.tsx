// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import { copy } from '../../../lib/copy';

interface WizardStepDescriptionProps {
  value: string;
  onChange: (v: string) => void;
}

/** Wizard screen 1 — "What's this agreement for?" One field: description. */
const WizardStepDescription: React.FC<WizardStepDescriptionProps> = ({ value, onChange }) => (
  <div>
    <label className="form-label fw-bold fs-5 text-heading mb-3">
      {copy.wizardStep1Title}
    </label>
    <input
      className="form-control form-control-lg"
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={copy.wizardStep1Placeholder}
    />
    <div className="form-text text-on-glass mt-2">
      A short label for the deal. Only you, the other party, and (if reported) the mediator will see this.
    </div>
  </div>
);

export default WizardStepDescription;
