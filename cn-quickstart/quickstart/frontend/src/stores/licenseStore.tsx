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
import { handleActionError } from "../utils/error";

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
    const fetchLicenses = useCallback(async () => {
        try {
            const client: Client = await api.getClient();
            const response = await client.listLicenses();
            setLicenses(response.data);
        } catch (err) {
            handleActionError(err, 'Fetching Licenses', toast);
        }
    }, [toast]);

    /**
     * Sends a request to renew a specific License, optionally refreshing the License list on success.
     */
    const renewLicense = useCallback(async (contractId: string, request: LicenseRenewRequest) => {
        try {
            const client: Client = await api.getClient();
            const commandId = generateCommandId();
            await client.renewLicense({ contractId, commandId }, request);
            await fetchLicenses();
            toast.displaySuccess('License Renewal initiated successfully');
        } catch (err) {
            handleActionError(err, 'Renewing License', toast);
        }
    }, [fetchLicenses, toast]);

    /**
     * Sends a request to expire a specific License, optionally refreshing the License list on success.
     */
    const expireLicense = useCallback(async (contractId: string, meta: Metadata) => {
        try {
            const client: Client = await api.getClient();
            const commandId = generateCommandId();
            await client.expireLicense({ contractId, commandId }, { meta });
            await fetchLicenses();
            toast.displaySuccess('License archived successfully');
        } catch (err) {
            handleActionError(err, 'Archiving License', toast);
        }
    }, [fetchLicenses, toast]);

    /**
     * Completes the renewal flow after the renewal request has been paid.
     */
    const completeLicenseRenewal = useCallback(async (contractId: string, renewalRequestContractId: string, allocationContractId: string) => {
        try {
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
        } catch (err) {
            handleActionError(err, 'Completing License Renewal', toast);
        }
    }, [fetchLicenses, toast]);

    /**
     * Sends a request to withdraw a specific License renewal request.
     */
    const withdrawLicenseRenewalRequest = useCallback(async (contractId: string) => {
        try {
            const client: Client = await api.getClient();
            const commandId = generateCommandId();
            await client.withdrawLicenseRenewalRequest({ contractId, commandId });
            await fetchLicenses();
            toast.displaySuccess('License renewal request withdrawn successfully');
        } catch (err) {
            handleActionError(err, 'Withdrawing License renewal request', toast);
        }
    }, [fetchLicenses, toast]);

    /**
     * Helper to initiate a new License renewal with fixed parameters.
     */
    const initiateLicenseRenewal = useCallback(async (contractId: string, request: LicenseRenewRequest) => {
        try {
            await renewLicense(contractId, request);
        } catch (err) {
            handleActionError(err, 'Initiate License Renewal', toast);
        }
    }, [renewLicense, toast]);

    /**
     * Helper to begin the License expiration process with a basic description.
     */
    const initiateLicenseExpiration = useCallback(async (contractId: string, description: string) => {
        try {
            const meta = {
                data: { description: description.trim() },
            };
            await expireLicense(contractId, meta);
        } catch (err) {
            handleActionError(err, 'Initiate License Expiration', toast);
        }
    }, [expireLicense, toast]);

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
