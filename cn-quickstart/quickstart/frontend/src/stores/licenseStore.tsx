// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useToast } from './toastStore';
import api from '../api';
import { generateCommandId } from '../utils/commandId';
import type {
    Client, CompleteLicenseRenewalRequest,
    License,
    LicenseRenewalResult,
    LicenseRenewRequest,
    Metadata,
} from '../openapi.d.ts';
import { createErrorHandler } from "../utils/error";

/**
 * The core shape of the License-related application state.
 */
interface LicenseState {
    licenses: License[];
}

/**
 * Methods for retrieving and modifying License data throughout the application.
 */
interface LicenseContextType extends LicenseState {
    fetchLicenses: () => Promise<void>;
    renewLicense: (contractId: string, request: LicenseRenewRequest) => Promise<void>;
    expireLicense: (contractId: string, meta: Metadata) => Promise<void>;
    completeLicenseRenewal: (contractId: string, renewalRequestContractId: string, allocationContractId: string) => Promise<LicenseRenewalResult | void>;
    withdrawLicenseRenewalRequest: (contractId: string) => Promise<void>;
    initiateLicenseRenewal: (contractId: string, request: LicenseRenewRequest) => Promise<void>;
    initiateLicenseExpiration: (contractId: string, description: string) => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

/**
 * Provides shared License state and actions to manage Licenses and their renewals.
 */
export const LicenseProvider = ({ children }: { children: React.ReactNode }) => {
    const [licenses, setLicenses] = useState<License[]>([]);
    const toast = useToast();

    /**
     * Fetches all Licenses from the backend, including any associated renewal requests.
     */
    const fetchLicenses = useCallback(
        createErrorHandler(`Fetching Licenses`, toast)(async () => {
            const client: Client = await api.getClient();
            const response = await client.listLicenses();
            setLicenses(response.data);
        }), [setLicenses, toast]);

    /**
     * Sends a request to renew a specific License, optionally refreshing the License list on success.
     */
    const renewLicense = useCallback(
        createErrorHandler(`Renewing License`, toast)(async (contractId: string, request: LicenseRenewRequest) => {
            const client: Client = await api.getClient();
            const commandId = generateCommandId();
            await client.renewLicense({ contractId, commandId }, request);
            await fetchLicenses();
            toast.displaySuccess('License Renewal initiated successfully');
        }),
        [fetchLicenses, toast]
    );

    /**
     * Sends a request to expire a specific License, optionally refreshing the License list on success.
     */
    const expireLicense = useCallback(
        createErrorHandler(`Archiving License`, toast)(async (contractId: string, meta: Metadata) => {
            const client: Client = await api.getClient();
            const commandId = generateCommandId();
            await client.expireLicense({ contractId, commandId }, { meta });
            await fetchLicenses();
            toast.displaySuccess('License archived successfully');
        }),
        [fetchLicenses, toast]
    );

    /**
     * Completes the renewal flow after the renewal request has been paid.
     */
    const completeLicenseRenewal = useCallback(
        createErrorHandler(`Completing License Renewal`, toast)(async (contractId: string, renewalRequestContractId: string, allocationContractId: string) => {
            const client: Client = await api.getClient();
            const commandId = generateCommandId();

            const request: CompleteLicenseRenewalRequest = {
                renewalRequestContractId: renewalRequestContractId,
                allocationContractId: allocationContractId
            };

            const result = await client.completeLicenseRenewal({ contractId, commandId }, request);
            await fetchLicenses();
            toast.displaySuccess('License renewal completed successfully');
            return result.data;
        }),
        [fetchLicenses, toast]
    );

    /**
     * Sends a request to withdraw a specific License renewal request.
     */
    const withdrawLicenseRenewalRequest = useCallback(
        createErrorHandler(`Withdrawing License renewal request`, toast)(async (contractId: string) => {
            const client: Client = await api.getClient();
            const commandId = generateCommandId();
            await client.withdrawLicenseRenewalRequest({ contractId, commandId });
            await fetchLicenses();
            toast.displaySuccess('License renewal request withdrawn successfully');
        }),
        [fetchLicenses, toast]
    );

    /**
     * Helper to initiate a new License renewal with fixed parameters.
     */
    const initiateLicenseRenewal = useCallback(
        createErrorHandler(`Initiate License Renewal`, toast)(async (contractId: string, request: LicenseRenewRequest) => {
            await renewLicense(contractId, request);
        }),
        [renewLicense]
    );

    /**
     * Helper to begin the License expiration process with a basic description.
     */
    const initiateLicenseExpiration = useCallback(
        createErrorHandler(`Initiate License Expiration`, toast)(async (contractId: string, description: string) => {
            const meta = {
                data: { description: description.trim() },
            };
            await expireLicense(contractId, meta);
        }),
        [expireLicense]
    );

    return (
        <LicenseContext.Provider
            value={{
                licenses,
                fetchLicenses,
                renewLicense,
                expireLicense,
                completeLicenseRenewal,
                withdrawLicenseRenewalRequest,
                initiateLicenseRenewal,
                initiateLicenseExpiration
            }}
        >
            {children}
        </LicenseContext.Provider>
    );
};

/**
 * Hook for accessing License context within React components.
 */
export const useLicenseStore = () => {
    const context = useContext(LicenseContext);
    if (context === undefined) {
        throw new Error('useLicenseStore must be used within a LicenseProvider');
    }
    return context;
};
