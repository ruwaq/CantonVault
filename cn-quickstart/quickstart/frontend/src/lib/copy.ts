/**
 * Microcopy dictionary — plain English, Cash App vocabulary.
 * Centralizes all user-facing strings so they can be audited at a glance.
 *
 * Rule: the novice sees the value here; the technician gets raw hashes
 * under "Technical details" (see TechnicalDetails component).
 *
 * Decision confirmed 2026-07-14: English plain (no Daml jargon).
 */

export const copy = {
  /** Card / section headers */
  proposeHeader: 'New agreement',
  proposeSubheader: 'Only you and the other person can see this draft',
  submitProposal: 'Send offer',
  creatingContract: 'Creating your agreement…',

  /** Proposal action buttons */
  accept: 'Accept offer',
  reject: 'Decline',

  /** Commitment action buttons */
  fulfill: 'Confirm delivery',
  dispute: 'Report a problem',
  refund: 'Cancel and refund',
  resolve: 'Decide in favor of…',

  /** Status badges (human language) */
  statusActive: 'In progress',
  statusAwaiting: 'Awaiting delivery',
  statusFulfilled: 'Completed',
  statusDisputed: 'In dispute',
  statusRefunded: 'Refunded',

  /** Party role labels */
  roleProposer: 'Who gets paid',
  roleAccepter: 'Who pays',
  roleThirdParty: 'Mediator',

  /** Privacy Lab */
  privacyBannerTitle: 'The mediator sees nothing of this.',
  privacyBannerBody: 'Not hidden, not encrypted — it was never sent to their ledger. That\u2019s how privacy works on Canton.',
  privacyCol1Title: 'What you see',
  privacyCol2Title: 'What the mediator sees',
  privacyCol2Empty: 'Searched the mediator\u2019s ledger',
  privacyCol2EmptyDetail: '0 agreements found. The mediator has no record of this transaction.',
  privacyCol3Title: 'What the mediator learns after a report',
  privacyCol3Empty: 'Report a problem in Act to see what the mediator learns',
  privacyCol3Body: 'When the problem was reported, the mediator learned only this:',
  privacyCol3Nothing: 'Nothing else.',
  privacyCol4Title: 'What the competitor sees',
  privacyCol4Empty: 'Searched the competitor\u2019s ledger',
  privacyCol4EmptyDetail: '0 records found. The competitor\u2019s validator node never received this transaction data.',
  privacyCol4Subtext: 'Canton\u2019s sub-transaction privacy: data only reaches signatory and observer nodes. Everyone else sees an empty ledger.',
  receiptsTitle: 'Payment receipts',
  receiptSettled: 'Payment completed',

  /** Wizard (ProposeStep) */
  wizardStep1Title: 'What\u2019s this agreement for?',
  wizardStep1Placeholder: 'Invoice INV-2026-001',
  wizardStep2Title: 'How much?',
  wizardStep2Hint: 'Sent when you confirm delivery',
  wizardStep3Title: 'Who else is involved?',
  wizardStep4Title: 'Review and send',
  wizardNext: 'Next',
  wizardBack: 'Back',
  wizardCustomParty: 'Use custom party ID',
  wizardAdvanced: 'Advanced options',
  wizardExpiresIn: 'Expires in',
  wizardDurationHour: '1 hour',
  wizardDurationDay: '1 day',
  wizardDurationWeek: '1 week',

  /** Success states */
  offerSentTitle: 'Offer sent!',
  offerSentBody: 'When the other party accepts, it\u2019ll appear in \u2018Active agreements\u2019.',
  offerSentCta: 'View my offers',

  /** Technical details label */
  technicalDetails: 'Technical details',
  copyCid: 'Copy contract ID',
  recordLabel: 'Record #',
} as const;

export type CopyKey = keyof typeof copy;
