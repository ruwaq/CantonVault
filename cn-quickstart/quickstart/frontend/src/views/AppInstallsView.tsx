// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect } from 'react';
import { useAppInstallStore } from '../stores/appInstallStore';
import { useUserStore } from '../stores/userStore';
import type { AppInstallUnified } from '../types';
import { shortParty } from '../utils/party';

const AppInstallsView: React.FC = () => {
  const {
    unifiedInstalls,
    fetchAll,
    accept,
    reject,
    createLicense,
    cancelInstall,
  } = useAppInstallStore();
  const { user, fetchUser } = useUserStore();

  useEffect(() => {
    fetchUser();
    fetchAll();
    const intervalId = setInterval(() => {
      fetchAll();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [fetchUser, fetchAll]);

  return (
    <div className="pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="page-title fs-3 fw-bold mb-1">App Installations</h2>
          <p className="text-muted small mb-0">Manage applications installed on the Canton Network nodes</p>
        </div>
      </div>

      <div className="alert alert-light py-2 px-3 small border-start border-3 border-primary mb-4 glass-panel d-flex align-items-center gap-3">
        <span className="fs-5">💡</span>
        <div>
          <strong>Developer notice:</strong> Run <code>make create-app-install-request</code> on the host system to dispatch new AppInstallRequest contracts to this node.
        </div>
      </div>

      <div className="card glass-panel">
        <div className="card-header bg-transparent border-bottom border-secondary border-opacity-20 pb-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
            <span>⚙️</span> Installation Registry
          </h5>
          {unifiedInstalls.length > 0 && (
            <span className="badge bg-primary px-2">{unifiedInstalls.length} entries</span>
          )}
        </div>
        <div className="card-body pt-3">
          {unifiedInstalls.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <div className="fs-1 mb-3">📦</div>
              <h6 className="fw-semibold text-white">No installations found</h6>
              <p className="small mb-0">Node has no active app installations or pending requests.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle" id="app-installs-table">
                <thead>
                  <tr>
                    <th>Contract ID</th>
                    {user?.isAdmin && <th>User</th>}
                    <th># Licenses</th>
                    <th>Meta Payload</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unifiedInstalls.map((item: AppInstallUnified) => (
                    <tr key={item.contractId} className="app-install-row">
                      <td className="font-monospace small app-install-contract-id" title={item.contractId}>
                        {shortParty(item.contractId)}
                      </td>
                      {user?.isAdmin && (
                        <td className="ellipsis-cell app-install-user" title={item.user}>
                          {shortParty(item.user)}
                        </td>
                      )}
                      <td className="app-install-num-licenses fw-bold" data-testid="num-licenses">
                        {item.numLicensesCreated}
                      </td>
                      <td className="small text-muted font-monospace" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.meta ? JSON.stringify(item.meta.data) : '{}'}
                      </td>
                      <td className="app-install-status">
                        {item.status === 'REQUEST' ? (
                          <span className="badge bg-warning text-dark">AWAITING_ACCEPTANCE</span>
                        ) : (
                          <span className="badge bg-success">INSTALLED & ACTIVE</span>
                        )}
                      </td>
                      <td className="app-install-actions text-end">
                        {item.status === 'REQUEST' ? (
                          user?.isAdmin ? (
                            <div className="btn-group" role="group">
                              {unifiedInstalls.findIndex((i) => i.status === 'INSTALL' && i.user === item.user) === -1 && (
                                <button
                                  className="btn btn-sm btn-success btn-accept-install fw-medium"
                                  onClick={() => accept(item.contractId, item.meta, {})}
                                >
                                  Accept
                                </button>
                              )}
                              <button
                                className="btn btn-sm btn-outline-danger btn-reject-install fw-medium"
                                onClick={() => reject(item.contractId, {})}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted small">Pending approval</span>
                          )
                        ) : (
                          <div className="btn-group" role="group">
                            <button
                              className="btn btn-sm btn-outline-danger btn-cancel-install fw-medium"
                              onClick={() => cancelInstall(item.contractId, {})}
                            >
                              Cancel
                            </button>
                            {user?.isAdmin && (
                              <button
                                className="btn btn-sm btn-success btn-create-license fw-medium"
                                onClick={() => createLicense(item.contractId, {})}
                              >
                                Create License
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppInstallsView;
