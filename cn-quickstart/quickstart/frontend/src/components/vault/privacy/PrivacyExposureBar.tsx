// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';

interface Stage {
  label: string;
  exposure: number;    // 0–100
  parties: number;     // how many parties can see the data
  icon: string;
  description: string;
}

const STAGES: Stage[] = [
  {
    label: 'Proposal',
    exposure: 0,
    parties: 2,
    icon: '📝',
    description: 'Only proposer and accepter. Mediator and competitors see nothing.',
  },
  {
    label: 'Active',
    exposure: 0,
    parties: 2,
    icon: '🤝',
    description: 'Commitment is live. Still only the two signatories. Zero leakage.',
  },
  {
    label: 'Disputed',
    exposure: 30,
    parties: 3,
    icon: '⚡',
    description: 'Mediator now sees amount and description. Competitors still see nothing.',
  },
  {
    label: 'Resolved',
    exposure: 30,
    parties: 3,
    icon: '✅',
    description: 'Mediator ruling is final. Disclosure is permanent. Competitor ledger remains empty.',
  },
];

function exposureColor(exposure: number): string {
  if (exposure <= 0) return 'var(--status-success)';
  if (exposure <= 30) return 'var(--status-warning)';
  return 'var(--status-danger)';
}

interface PrivacyExposureBarProps {
  /** Index of the currently active stage (0–3), or null if none. */
  currentStage?: number | null;
}

/**
 * Privacy Exposure Indicator — a horizontal bar showing how much data is
 * exposed at each stage of the CantonVault lifecycle. Color-coded from
 * green (private) through yellow (selective disclosure) to red (public).
 *
 * Inspired by AgentShield's risk bar visualization.
 */
const PrivacyExposureBar: React.FC<PrivacyExposureBarProps> = ({ currentStage }) => (
  <div className="cv-exposure-bar card glass-panel mb-4">
    <div className="card-header bg-transparent border-bottom border-secondary border-opacity-10 pb-3">
      <h6 className="fw-bold text-white mb-0 d-flex align-items-center gap-2">
        <span>🔐</span> Privacy Exposure
      </h6>
    </div>
    <div className="card-body pt-3 pb-2">
      {/* Stage labels row */}
      <div className="cv-exposure-labels">
        {STAGES.map((stage, i) => (
          <div
            key={stage.label}
            className={`cv-exposure-label ${i === currentStage ? 'cv-exposure-label--active' : ''}`}
          >
            <span className="cv-exposure-label-icon">{stage.icon}</span>
            <span className="cv-exposure-label-text">{stage.label}</span>
          </div>
        ))}
      </div>

      {/* Bar track */}
      <div className="cv-exposure-track">
        {/* Background gradient */}
        <div className="cv-exposure-fill" />

        {/* Stage markers */}
        {STAGES.map((stage, i) => (
          <div
            key={stage.label}
            className={`cv-exposure-marker ${i === currentStage ? 'cv-exposure-marker--active' : ''}`}
            style={{ left: `${(i / (STAGES.length - 1)) * 100}%` }}
            title={stage.description}
          >
            <div
              className="cv-exposure-marker-dot"
              style={{ background: exposureColor(stage.exposure) }}
            />
          </div>
        ))}
      </div>

      {/* Details row */}
      <div className="cv-exposure-details">
        {STAGES.map((stage, i) => (
          <div
            key={stage.label}
            className={`cv-exposure-detail ${i === currentStage ? 'cv-exposure-detail--active' : ''}`}
          >
            <span
              className="cv-exposure-pct"
              style={{ color: exposureColor(stage.exposure) }}
            >
              {stage.exposure}% exposed
            </span>
            <span className="cv-exposure-parties">
              {stage.parties} {stage.parties === 1 ? 'party' : 'parties'}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default PrivacyExposureBar;
export { STAGES };
export type { Stage };