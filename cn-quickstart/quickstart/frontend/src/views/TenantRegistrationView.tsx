// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates.
// SPDX-License-Identifier: 0BSD

import React, { useEffect, useState } from 'react'
import {
    useTenantRegistrationStore
} from '../stores/tenantRegistrationStore'
import type { TenantRegistrationRequest } from "../openapi.d.ts"
import { useToast } from '../stores/toastStore';
import { shortParty } from '../utils/party';

const TenantRegistrationView: React.FC = () => {
    const {
        registrations,
        fetchTenantRegistrations,
        createTenantRegistration,
        deleteTenantRegistration,
    } = useTenantRegistrationStore()

    const [formData, setFormData] = useState<TenantRegistrationRequest>({
        tenantId: '',
        partyId: '',
        clientId: '',
        issuerUrl: '',
        walletUrl: '',
        users: []
    })

    const [submitting, setSubmitting] = useState(false)
    const toast = useToast();

    useEffect(() => {
        fetchTenantRegistrations()
    }, [fetchTenantRegistrations])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: name === 'users' ? value.split(',').map(user => user.trim()) : value,
        }))
    }

    const validate = (): string | null => {
        const t = formData.tenantId.trim()
        const p = formData.partyId.trim()
        if (!t) return 'Tenant ID is required'
        if (!p) return 'Party ID is required'
        if (!formData.clientId?.trim()) return 'Client ID is required'
        if (!formData.issuerUrl?.trim()) return 'Issuer URL is required'
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const error = validate()
        if (error) {
            toast.displayError(error)
            return
        }
        setSubmitting(true)
        try {
            await createTenantRegistration(formData)
            setFormData({
                tenantId: '',
                partyId: '',
                clientId: '',
                issuerUrl: '',
                walletUrl: '',
                users: []
            })
            toast.displaySuccess('Tenant registered successfully')
        } catch {
            // Error is handled inside the store
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (tenantId: string) => {
        if (window.confirm(`Are you sure you want to delete tenant registration for '${tenantId}'?`)) {
            try {
                await deleteTenantRegistration(tenantId)
                toast.displaySuccess('Tenant registration deleted')
            } catch {
                // Handled in store
            }
        }
    }

    return (
        <div className="pb-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="page-title fs-3 fw-bold mb-1">Tenant Registrations</h2>
                    <p className="text-muted small mb-0">Configure and register OAuth2 multi-tenant providers for the synchronizer</p>
                </div>
            </div>

            <div className="row g-4">
                {/* Form Column */}
                <div className="col-lg-5">
                    <div className="card glass-panel">
                        <div className="card-header bg-transparent border-bottom border-secondary border-opacity-20 pb-3">
                            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                                <span>➕</span> Register New Tenant
                            </h5>
                            <span className="text-muted small">Configure OIDC settings for tenant onboarding</span>
                        </div>
                        <div className="card-body pt-3">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label htmlFor="tenantId" className="form-label small text-muted">
                                        Tenant ID
                                    </label>
                                    <input
                                        type="text"
                                        id="tenantId"
                                        name="tenantId"
                                        className="form-control form-control-sm"
                                        value={formData.tenantId}
                                        onChange={handleChange}
                                        placeholder="e.g. alliance-bank"
                                        required
                                    />
                                    <div className="form-text text-muted xsmall">Unique identifier for the tenant domain</div>
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="partyId" className="form-label small text-muted">
                                        Party ID
                                    </label>
                                    <input
                                        type="text"
                                        id="partyId"
                                        name="partyId"
                                        className="form-control form-control-sm"
                                        value={formData.partyId}
                                        onChange={handleChange}
                                        placeholder="e.g. 7fd8...bd9c"
                                        required
                                    />
                                    <div className="form-text text-muted xsmall">Canton ledger party signature key</div>
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="clientId" className="form-label small text-muted">
                                        Client ID
                                    </label>
                                    <input
                                        type="text"
                                        id="clientId"
                                        name="clientId"
                                        className="form-control form-control-sm"
                                        value={formData.clientId ?? ''}
                                        onChange={handleChange}
                                        placeholder="OIDC Client ID"
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="issuerUrl" className="form-label small text-muted">
                                        Issuer URL
                                    </label>
                                    <input
                                        type="url"
                                        id="issuerUrl"
                                        name="issuerUrl"
                                        className="form-control form-control-sm"
                                        value={formData.issuerUrl ?? ''}
                                        onChange={handleChange}
                                        placeholder="https://identity.provider/oauth2"
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label htmlFor="walletUrl" className="form-label small text-muted">
                                        Wallet URL (Optional)
                                    </label>
                                    <input
                                        type="url"
                                        id="walletUrl"
                                        name="walletUrl"
                                        className="form-control form-control-sm"
                                        value={formData.walletUrl ?? ''}
                                        onChange={handleChange}
                                        placeholder="http://wallet.localhost:2000"
                                    />
                                    <div className="form-text text-muted xsmall">Canton Coin wallet endpoint for transactions</div>
                                </div>
                                <button type="submit" className="btn btn-primary btn-sm w-100 py-2 fw-semibold" disabled={submitting}>
                                    {submitting ? 'Registering...' : 'Register Tenant'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Table Column */}
                <div className="col-lg-7">
                    <div className="card glass-panel h-100">
                        <div className="card-header bg-transparent border-bottom border-secondary border-opacity-20 pb-3 d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                                <span>📋</span> Active Tenants
                            </h5>
                            {registrations.length > 0 && <span className="badge bg-primary px-2">{registrations.length} registered</span>}
                        </div>
                        <div className="card-body pt-3">
                            {registrations.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <div className="fs-1 mb-3">🏢</div>
                                    <h6 className="fw-semibold text-white">No tenants configured</h6>
                                    <p className="small mb-0">Use the registration form on the left to add a multi-tenant provider.</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table align-middle">
                                        <thead>
                                            <tr>
                                                <th>Tenant ID</th>
                                                <th>Party ID</th>
                                                <th>Issuer URL</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {registrations.map((reg, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <span className="fw-semibold text-white">{reg.tenantId}</span>
                                                        {reg.internal && <span className="badge bg-secondary ms-2 xsmall">Internal</span>}
                                                    </td>
                                                    <td className="font-monospace small">
                                                        {shortParty(reg.partyId)}
                                                    </td>
                                                    <td className="small text-muted ellipsis-cell" style={{ maxWidth: '150px' }}>
                                                        {reg.issuerUrl}
                                                    </td>
                                                    <td className="text-end">
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            disabled={reg.internal}
                                                            onClick={() => handleDelete(reg.tenantId)}
                                                        >
                                                            Delete
                                                        </button>
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
            </div>
        </div>
    )
}

export default TenantRegistrationView
