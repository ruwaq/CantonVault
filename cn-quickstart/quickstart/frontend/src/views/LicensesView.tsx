// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect, useState } from 'react';
import { useLicenseStore } from '../stores/licenseStore';
import { useUserStore } from '../stores/userStore';
import LicenseRenewalRequestModal from '../components/LicenseRenewalRequestModal.tsx';
import LicenseArchiveModal from '../components/LicenseExpireModal.tsx';
import { formatDateTime } from '../utils/format';
import { shortParty } from '../utils/party';

import type {
  License,
  LicenseRenewRequest,
} from '../openapi.d.ts';

const LicensesView: React.FC = () => {
  const {
    licenses,
    fetchLicenses,
    initiateLicenseRenewal,
    initiateLicenseExpiration,
    completeLicenseRenewal,
    withdrawLicenseRenewalRequest
  } = useLicenseStore();

  const { user, fetchUser } = useUserStore();
  const isAdmin = !!user?.isAdmin;
  const userWallet = user?.walletUrl || 'http://wallet.localhost:2000';

  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchLicenses();
    const intervalId = setInterval(() => {
      fetchLicenses();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [fetchUser, fetchLicenses]);

  useEffect(() => {
    if (!selectedLicenseId) {
      setSelectedLicense(null);
      return;
    }
    setSelectedLicense(licenses.find(l => l.contractId === selectedLicenseId) ?? null);
  }, [licenses, selectedLicenseId]);

  const openArchiveModal = (licenseId: string) => {
    setShowArchiveModal(true);
    setSelectedLicenseId(licenseId);
  };

  const handleArchive = async (description?: string) => {
    if (!selectedLicenseId) return;
    await initiateLicenseExpiration(selectedLicenseId, description!);
    setShowArchiveModal(false);
    setSelectedLicenseId(null);
    await fetchLicenses();
  };

  const closeArchiveModal = () => {
    setShowArchiveModal(false);
    setSelectedLicenseId(null);
  };

  const openRenewalModal = (licenseId: string) => {
    setShowRenewalModal(true);
    setSelectedLicenseId(licenseId);
  };

  const handleCompleteRenewal = async (renewalContractId: string, renewalRequestContractId: string, allocationContractId: string) => {
    const result = await completeLicenseRenewal(renewalContractId, renewalRequestContractId, allocationContractId);
    if (result) {
      setSelectedLicenseId(result.licenseId!);
    }
    await fetchLicenses();
  };

  const handleRenewalWithdraw = async (renewalContractId: string) => {
    if (!selectedLicenseId) return;
    await withdrawLicenseRenewalRequest(renewalContractId);
    await fetchLicenses();
  };

  const closeRenewalsModal = () => {
    setShowRenewalModal(false);
    setSelectedLicenseId(null);
  };

  const handleRenew = async (request: LicenseRenewRequest) => {
    if (!selectedLicenseId || !selectedLicense) return;
    await initiateLicenseRenewal(selectedLicenseId, request);
    await fetchLicenses();
  };


  return (
    <div className="pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="page-title fs-3 fw-bold mb-1">Daml App Licenses</h2>
          <p className="text-muted small mb-0">Monitor contract expiry, initiate renewals, and archive expired app leases</p>
        </div>
      </div>

      <div className="card glass-panel">
        <div className="card-header bg-transparent border-bottom border-secondary border-opacity-20 pb-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
            <span>📜</span> License Ledger
          </h5>
          {licenses.length > 0 && (
            <span className="badge bg-primary px-2">{licenses.length} registered</span>
          )}
        </div>
        <div className="card-body pt-3">
          {licenses.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <div className="fs-1 mb-3">📇</div>
              <h6 className="fw-semibold text-white">No active licenses</h6>
              <p className="small mb-0">Configure your application to issue and manage digital licenses.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle" id="licenses-table">
                <thead>
                  <tr>
                    <th>License Contract ID</th>
                    {user?.isAdmin && <th>User</th>}
                    <th>Expires At</th>
                    <th>License #</th>
                    <th>Pending Renew</th>
                    <th>Accepted Renew</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((license) => {
                    const isExpired = license.isExpired;
                    const pendingRenewalsCount = license.renewalRequests?.filter(r => !r.allocationCid).length || 0;
                    const acceptedRenewalsCount = license.renewalRequests?.filter(r => r.allocationCid).length || 0;
                    
                    return (
                      <tr key={license.contractId} className="license-row">
                        <td className="font-monospace small license-contract-id" title={license.contractId}>
                          {shortParty(license.contractId)}
                        </td>
                        {user?.isAdmin && (
                          <td className="ellipsis-cell license-user" title={license.user}>
                            {shortParty(license.user)}
                          </td>
                        )}
                        <td className={`license-expires-at ${isExpired ? 'text-danger fw-semibold deadline-passed' : 'text-muted'}`}>
                          {formatDateTime(license.expiresAt)}
                        </td>
                        <td className="font-monospace small license-number">{license.licenseNum}</td>
                        <td>
                          {pendingRenewalsCount > 0 ? (
                            <span className="badge bg-warning text-dark">{pendingRenewalsCount}</span>
                          ) : (
                            <span className="text-muted">0</span>
                          )}
                        </td>
                        <td>
                          {acceptedRenewalsCount > 0 ? (
                            <span className="badge bg-success">{acceptedRenewalsCount}</span>
                          ) : (
                            <span className="text-muted">0</span>
                          )}
                        </td>
                        <td className="license-status">
                          {isExpired ? (
                            <span className="badge bg-danger">EXPIRED</span>
                          ) : (
                            <span className="badge bg-success">ACTIVE</span>
                          )}
                        </td>
                        <td className="license-actions text-end">
                          <div className="btn-group" role="group">
                            {(isAdmin || (license.renewalRequests?.length ?? 0) > 0) && (
                              <button
                                className="btn btn-sm btn-primary btn-actions-license fw-semibold"
                                onClick={() => openRenewalModal(license.contractId)}
                              >
                                Renewals
                              </button>
                            )}
                            {license.expiresAt && isExpired && (
                              <button
                                className="btn btn-sm btn-danger btn-expire-license fw-semibold"
                                onClick={() => openArchiveModal(license.contractId)}
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <LicenseRenewalRequestModal
        show={showRenewalModal && !!selectedLicense}
        license={selectedLicense}
        onClose={closeRenewalsModal}
        isAdmin={isAdmin}
        userWallet={userWallet}
        onIssueRenewal={handleRenew}
        onCompleteRenewal={handleCompleteRenewal}
        onWithdraw={handleRenewalWithdraw}
        formatDateTime={formatDateTime}
      />

      <LicenseArchiveModal
        show={showArchiveModal && !!selectedLicense}
        license={selectedLicense}
        onClose={closeArchiveModal}
        onArchive={handleArchive}
      />
    </div>
  );
};

export default LicensesView;
