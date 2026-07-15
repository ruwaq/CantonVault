// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useState } from 'react';
import type { Workflow } from '../../../types';
import { copy } from '../../../lib/copy';

const WORKFLOWS: { value: Workflow; label: string; icon: string }[] = [
  { value: 'supply-chain-finance', label: 'Supply Chain Finance', icon: '🚚' },
  { value: 'invoice-financing', label: 'Invoice Financing', icon: '🧾' },
  { value: 'otc-block-trade', label: 'OTC Block Trade', icon: '📈' },
];

const DURATIONS: { seconds: number; label: string }[] = [
  { seconds: 3600, label: copy.wizardDurationHour },
  { seconds: 86400, label: copy.wizardDurationDay },
  { seconds: 604800, label: copy.wizardDurationWeek },
];

interface WizardStepReviewProps {
  description: string;
  amount: string;
  currency: string;
  workflow: Workflow;
  deadlineSeconds: number;
  onWorkflowChange: (w: Workflow) => void;
  onCurrencyChange: (c: string) => void;
  onDeadlineChange: (seconds: number) => void;
}

/**
 * Wizard screen 4 — Review and send. Natural-language summary + human
 * deadline selector (1h/1d/1w) + collapsible Advanced options (workflow,
 * custom currency). Clicking any summary item jumps back to that screen.
 */
const WizardStepReview: React.FC<WizardStepReviewProps> = ({
  description, amount, currency, workflow,
  deadlineSeconds, onWorkflowChange, onCurrencyChange, onDeadlineChange,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const wfLabel = WORKFLOWS.find((w) => w.value === workflow)?.label ?? workflow;
  const amountNum = Number(amount) || 0;

  return (
    <div>
      <label className="form-label fw-bold fs-5 text-heading mb-3">
        {copy.wizardStep4Title}
      </label>

      {/* Natural-language summary */}
      <div className="bg-white bg-opacity-5 p-3 rounded border border-white border-opacity-10 mb-3">
        <div className="fw-bold text-white fs-5 mb-1">
          {description || '—'} · {amountNum.toLocaleString()} {currency}
        </div>
        <div className="small text-on-glass">
          From the payer to who gets paid, overseen by the mediator
          <br />
          who <strong className="text-success">sees nothing</strong> until someone reports a problem.
        </div>
        <div className="xsmall text-on-glass mt-2">
          Type: {wfLabel} — shows the versatility without you having to choose.
        </div>
      </div>

      {/* Deadline selector (human: 1h / 1d / 1w) */}
      <div className="mb-3">
        <label className="form-label small text-on-glass mb-2">{copy.wizardExpiresIn}</label>
        <div className="btn-group w-100" role="group">
          {DURATIONS.map((d) => (
            <button
              key={d.seconds}
              type="button"
              className={`btn btn-sm ${deadlineSeconds === d.seconds ? 'btn-primary' : 'btn-outline-light'}`}
              onClick={() => onDeadlineChange(d.seconds)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced options (collapsible) */}
      <div className="mb-2">
        <button
          type="button"
          className="btn btn-sm btn-link text-on-glass p-0 text-decoration-none"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? '▾' : '▸'} {copy.wizardAdvanced}
        </button>
        {showAdvanced && (
          <div className="row g-2 mt-1">
            <div className="col-6">
              <label className="form-label xsmall text-on-glass">Workflow type</label>
              <select
                className="form-select form-select-sm"
                value={workflow}
                onChange={(e) => onWorkflowChange(e.target.value as Workflow)}
              >
                {WORKFLOWS.map((w) => (
                  <option key={w.value} value={w.value}>{w.icon} {w.label}</option>
                ))}
              </select>
            </div>
            <div className="col-6">
              <label className="form-label xsmall text-on-glass">Currency</label>
              <input
                className="form-control form-control-sm"
                value={currency}
                onChange={(e) => onCurrencyChange(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WizardStepReview;
