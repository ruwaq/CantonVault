// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useState } from 'react';
import type { PartyDescriptor } from '../../../stores/vaultStore';
import { copy } from '../../../lib/copy';

interface WizardStepPartiesProps {
  accepter: string;
  thirdParty: string;
  onAccepterChange: (v: string) => void;
  onThirdPartyChange: (v: string) => void;
  parties: PartyDescriptor[];
}

/**
 * Wizard screen 3 — "Who else is involved?" Two selectors with defaults
 * pre-selected (demo parties). Discreet "Use custom party ID" reveals a
 * text input per role.
 */
const WizardStepParties: React.FC<WizardStepPartiesProps> = ({
  accepter, thirdParty, onAccepterChange, onThirdPartyChange, parties,
}) => {
  const [accepterCustom, setAccepterCustom] = useState(false);
  const [thirdPartyCustom, setThirdPartyCustom] = useState(false);

  const accepters = parties.filter((p) => p.role === 'accepter');
  const mediators = parties.filter((p) => p.role === 'thirdParty');

  const renderSelect = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: PartyDescriptor[],
    isCustom: boolean,
    setIsCustom: (v: boolean) => void,
    autoFocus?: boolean,
  ) => (
    <div className="mb-3">
      <label className="form-label fw-semibold text-on-glass mb-1">{label}</label>
      {isCustom ? (
        <div className="d-flex gap-2">
          <input
            className="form-control form-control-sm"
            autoFocus={autoFocus}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Party ID, e.g. cancore::1220…"
          />
          <button className="btn btn-sm btn-outline-light" onClick={() => { setIsCustom(false); onChange(''); }}>
            List
          </button>
        </div>
      ) : (
        <select
          className="form-select form-select-sm"
          value={value}
          onChange={(e) => {
            if (e.target.value === '__custom') { setIsCustom(true); onChange(''); }
            else { onChange(e.target.value); }
          }}
        >
          {options.map((p) => (
            <option key={p.partyId} value={p.partyId}>{p.label}</option>
          ))}
          <option value="__custom">{copy.wizardCustomParty}…</option>
        </select>
      )}
    </div>
  );

  return (
    <div>
      <label className="form-label fw-bold fs-5 text-heading mb-3">
        {copy.wizardStep3Title}
      </label>
      {renderSelect(copy.roleAccepter, accepter, onAccepterChange, accepters, accepterCustom, setAccepterCustom, true)}
      {renderSelect(copy.roleThirdParty, thirdParty, onThirdPartyChange, mediators, thirdPartyCustom, setThirdPartyCustom)}
      <div className="form-text text-on-glass mt-1" style={{ opacity: 0.85 }}>
        The mediator <strong>sees nothing</strong> until someone reports a problem — then only the amount and description.
      </div>
    </div>
  );
};

export default WizardStepParties;
