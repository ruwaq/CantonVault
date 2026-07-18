// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import { shortParty } from '../../utils/party';

interface VaultHeaderProps {
  /** The authenticated party's id (shown truncated). Empty → hidden. */
  party: string;
  /** Called when the user clicks the sync button. */
  onSync: () => void;
  /** True while SWR is revalidating (disables the button + shows spinner). */
  isSyncing: boolean;
  /** Called when the user clicks the "Load Demo Data" button. */
  onSeedDemo?: () => void;
  /** True while demo data is being seeded. */
  isSeeding?: boolean;
  /** True when the vault has no data (shows the seed button more prominently). */
  isEmpty?: boolean;
}

/** Vault page action bar: title, signed-party chip, sync button, seed demo. */
const VaultHeader: React.FC<VaultHeaderProps> = ({ party, onSync, isSyncing, onSeedDemo, isSeeding, isEmpty }) => (
  <div className="cv-vault-header">
    <div>
      <h2 className="cv-vault-title">CantonVault</h2>
      {party && (
        <div className="cv-vault-party">
          <span className="cv-vault-party-dot" />
          <code>{shortParty(party)}</code>
          <span className="text-on-glass">· signed party</span>
        </div>
      )}
    </div>
    <div className="d-flex gap-2">
      {onSeedDemo && (
        <button
          className={`btn btn-sm px-3 ${isEmpty ? 'btn-success' : 'btn-outline-success'}`}
          onClick={onSeedDemo}
          disabled={isSeeding}
        >
          {isSeeding ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Loading…
            </>
          ) : isEmpty ? (
            '🚀 Load Demo Data'
          ) : (
            '🔄 Reload Demo'
          )}
        </button>
      )}
      <button className="btn btn-sm btn-outline-light px-3" onClick={onSync} disabled={isSyncing}>
        {isSyncing ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Syncing…
          </>
        ) : '↻ Sync'}
      </button>
    </div>
  </div>
);

export default VaultHeader;
