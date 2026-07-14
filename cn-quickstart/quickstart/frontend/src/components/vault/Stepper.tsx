// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';

export type Step = 'propose' | 'act' | 'settle';

interface StepperProps {
  current: Step;
  onStep: (s: Step) => void;
}

/** The 3 macro-steps (Create → Act → Verify). Coexists with the wizard's
 *  4-dot micro-progress inside "Create". */
const Stepper: React.FC<StepperProps> = ({ current, onStep }) => {
  const steps: { key: Step; label: string; icon: string; desc: string }[] = [
    { key: 'propose', label: 'Create', icon: '📝', desc: 'Draft a private agreement' },
    { key: 'act', label: 'Act', icon: '⚡', desc: 'Confirm, report, or resolve' },
    { key: 'settle', label: 'Verify', icon: '🛡️', desc: 'See what the mediator learns' },
  ];
  return (
    <div className="cv-stepper">
      {steps.map((s, idx) => (
        <React.Fragment key={s.key}>
          <button
            className={`cv-step-pill ${current === s.key ? 'cv-step-pill--active' : ''}`}
            onClick={() => onStep(s.key)}
          >
            <span className="cv-step-pill-num">{idx + 1}</span>
            <span className="cv-step-pill-body">
              <span className="cv-step-pill-title">
                <span className="cv-step-pill-icon">{s.icon}</span> {s.label}
              </span>
              <span className="cv-step-pill-desc">{s.desc}</span>
            </span>
          </button>
          {idx < steps.length - 1 && <span className="cv-stepper-line" />}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Stepper;
