// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';

interface TimelineNode {
  label: string;
  icon: string;
  parties: string;
  exposure: string;
  active: boolean;
  completed: boolean;
}

interface PrivacyTimelineProps {
  /** Whether the commitment is disputed (shows the dispute branch). */
  disputed: boolean;
  /** Whether the commitment is fulfilled/resolved (terminal). */
  resolved: boolean;
}

/**
 * Privacy Timeline — shows the lifecycle journey of a commitment with
 * privacy exposure at each stage. Horizontal timeline with 4 nodes.
 */
const PrivacyTimeline: React.FC<PrivacyTimelineProps> = ({ disputed, resolved }) => {
  const nodes: TimelineNode[] = [
    {
      label: 'Proposed',
      icon: '📝',
      parties: '2 parties',
      exposure: 'Private',
      active: false,
      completed: true,
    },
    {
      label: 'Accepted',
      icon: '🤝',
      parties: '2 parties',
      exposure: 'Private',
      active: false,
      completed: true,
    },
    {
      label: disputed ? 'Disputed' : 'Active',
      icon: disputed ? '⚡' : '🔒',
      parties: disputed ? '3 parties' : '2 parties',
      exposure: disputed ? 'Selective' : 'Private',
      active: !resolved,
      completed: resolved && !disputed,
    },
    {
      label: disputed ? 'Resolved' : 'Settled',
      icon: disputed ? '✅' : '💰',
      parties: disputed ? '3 parties' : '2 parties',
      exposure: disputed ? 'Selective' : 'Private',
      active: false,
      completed: resolved,
    },
  ];

  return (
    <div className="cv-privacy-timeline mt-3 pt-3 border-top border-secondary border-opacity-10">
      <div className="d-flex align-items-center gap-1 mb-2">
        <span className="xsmall text-on-glass fw-semibold">🔐 Privacy Timeline</span>
      </div>
      <div className="cv-timeline-track">
        {nodes.map((node, i) => (
          <React.Fragment key={node.label}>
            {/* Node */}
            <div className={`cv-timeline-node ${node.active ? 'cv-timeline-node--active' : ''} ${node.completed ? 'cv-timeline-node--completed' : ''}`}>
              <div className="cv-timeline-dot">
                <span>{node.icon}</span>
              </div>
              <div className="cv-timeline-label">{node.label}</div>
              <div className="cv-timeline-meta">
                <span className={`cv-timeline-exposure ${node.exposure === 'Private' ? 'text-success' : 'text-warning'}`}>
                  {node.exposure}
                </span>
                <span className="cv-timeline-parties">{node.parties}</span>
              </div>
            </div>
            {/* Connector line */}
            {i < nodes.length - 1 && (
              <div className={`cv-timeline-connector ${node.completed ? 'cv-timeline-connector--done' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default PrivacyTimeline;