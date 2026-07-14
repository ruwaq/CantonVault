// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useState } from 'react';
import type { PartyDescriptor } from '../../../stores/vaultStore';
import type { Workflow } from '../../../types';
import { copy } from '../../../lib/copy';
import WizardStepDescription from './WizardStepDescription';
import WizardStepAmount from './WizardStepAmount';
import WizardStepParties from './WizardStepParties';
import WizardStepReview from './WizardStepReview';

export interface WizardData {
  description: string;
  amount: string;
  currency: string;
  accepter: string;
  thirdParty: string;
  workflow: Workflow;
  deadlineSeconds: number;
}

interface ProposeWizardProps {
  /** Demo parties with defaults pre-selected. */
  parties: PartyDescriptor[];
  /** Called on final submit with the collected wizard data. */
  onSubmit: (data: {
    accepter: string;
    thirdParty: string;
    amount: number;
    currency: string;
    description: string;
    workflow: Workflow;
    deadlineSeconds: number;
  }) => Promise<void>;
  /** True while the create mutation is in flight. */
  submitting: boolean;
}

/**
 * 4-screen propose wizard — 1 decision per screen (Cash App / TurboTax style).
 *
 *   Screen 1: What's this for?   (description)
 *   Screen 2: How much?          (amount)
 *   Screen 3: Who else?          (accepter + mediator)
 *   Screen 4: Review and send    (summary + deadline + advanced)
 *
 * Two navigation levels coexist: the macro Stepper (3 steps, above) and
 * these micro 4-dot progress indicators (below).
 */
const ProposeWizard: React.FC<ProposeWizardProps> = ({ parties, onSubmit, submitting }) => {
  const defaultAccepter = parties.find((p) => p.role === 'accepter')?.partyId ?? '';
  const defaultMediator = parties.find((p) => p.role === 'thirdParty')?.partyId ?? '';

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [data, setData] = useState<WizardData>({
    description: '',
    amount: '',
    currency: 'CC',
    accepter: defaultAccepter,
    thirdParty: defaultMediator,
    workflow: 'supply-chain-finance',
    deadlineSeconds: 3600,
  });

  const set = <K extends keyof WizardData>(key: K, value: WizardData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const canNext = [
    data.description.trim().length > 0,           // screen 1
    Number(data.amount) > 0,                       // screen 2
    data.accepter.trim() && data.thirdParty.trim(),// screen 3
    true,                                           // screen 4
  ];

  const handleSend = async () => {
    await onSubmit({
      accepter: data.accepter.trim(),
      thirdParty: data.thirdParty.trim(),
      amount: Number(data.amount),
      currency: data.currency.trim() || 'CC',
      description: data.description.trim(),
      workflow: data.workflow,
      deadlineSeconds: data.deadlineSeconds,
    });
    setDone(true);
  };

  const handleSendAnother = () => {
    setDone(false);
    setStep(0);
    setData((d) => ({ ...d, description: '', amount: '' }));
  };

  // ── Success screen ──
  if (done) {
    return (
      <div className="card glass-panel">
        <div className="card-body text-center py-5">
          <div className="fs-1 mb-3">✓</div>
          <h4 className="fw-bold text-white mb-2">{copy.offerSentTitle}</h4>
          <p className="text-on-glass mb-4">{copy.offerSentBody}</p>
          <button className="btn btn-outline-light" onClick={handleSendAnother}>
            Create another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card glass-panel">
      <div className="card-body">
        {/* Micro progress: 4 dots ●○○○ */}
        <div className="d-flex align-items-center gap-2 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i <= step ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                transition: 'background var(--transition-fast)',
              }}
            />
          ))}
          <span className="xsmall text-on-glass ms-2" style={{ opacity: 0.75 }}>
            Step {step + 1} of 4
          </span>
        </div>

        {/* Current screen */}
        <div className="mb-4">
          {step === 0 && <WizardStepDescription value={data.description} onChange={(v) => set('description', v)} />}
          {step === 1 && <WizardStepAmount value={data.amount} onChange={(v) => set('amount', v)} />}
          {step === 2 && (
            <WizardStepParties
              accepter={data.accepter}
              thirdParty={data.thirdParty}
              onAccepterChange={(v) => set('accepter', v)}
              onThirdPartyChange={(v) => set('thirdParty', v)}
              parties={parties}
            />
          )}
          {step === 3 && (
            <WizardStepReview
              description={data.description}
              amount={data.amount}
              currency={data.currency}
              workflow={data.workflow}
              deadlineSeconds={data.deadlineSeconds}
              onWorkflowChange={(w) => set('workflow', w)}
              onCurrencyChange={(c) => set('currency', c)}
              onDeadlineChange={(s) => set('deadlineSeconds', s)}
            />
          )}
        </div>

        {/* Navigation: Back / Next / Send */}
        <div className="d-flex justify-content-between">
          <button
            className="btn btn-outline-light px-4"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            ← {copy.wizardBack}
          </button>
          {step < 3 ? (
            <button
              className="btn btn-primary px-4"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext[step]}
            >
              {copy.wizardNext} →
            </button>
          ) : (
            <button
              className="btn btn-primary px-4 fw-semibold"
              onClick={handleSend}
              disabled={submitting || !canNext[step]}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {copy.creatingContract}
                </>
              ) : `✓ ${copy.submitProposal}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposeWizard;
