// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates.
// SPDX-License-Identifier: 0BSD

import React, { createContext, useContext, useState, useCallback } from 'react'
import { useToast } from './toastStore'
import api from "../api.ts";
import type {
    Client,
    TenantRegistration,
    TenantRegistrationRequest
} from '../openapi.d.ts';
import { createErrorHandler } from "../utils/error";


interface TenantRegistrationState {
    registrations: TenantRegistration[]
}

interface TenantRegistrationContextType extends TenantRegistrationState {
    fetchTenantRegistrations: () => Promise<void>
    createTenantRegistration: (registration: TenantRegistrationRequest) => Promise<void>
    deleteTenantRegistration: (tenantId: string) => Promise<void>
    setRegistrations: React.Dispatch<React.SetStateAction<TenantRegistration[]>>
}

interface TenantRegistrationProviderProps {
    children: React.ReactNode
}

const TenantRegistrationContext = createContext<TenantRegistrationContextType | undefined>(
    undefined
)

export const TenantRegistrationProvider = ({
    children,
}: TenantRegistrationProviderProps) => {
    const [registrations, setRegistrations] = useState<TenantRegistration[]>([])
    const toast = useToast()

    const fetchTenantRegistrations = useCallback(
        createErrorHandler(`Fetching Tenant Registrations`, toast)(async () => {
            const client: Client = await api.getClient();
            const response = await client.listTenantRegistrations();
            setRegistrations(response.data);
        }),
        [setRegistrations]
    );

    const createTenantRegistration = useCallback(
        createErrorHandler(`Creating Tenant Registration`, toast)(async (request: TenantRegistrationRequest) => {
            const client: Client = await api.getClient()
            // New name: createTenantRegistration
            const response = await client.createTenantRegistration({}, request)
            const created = (response as { data?: TenantRegistration })?.data;
            if (created?.tenantId) {
                setRegistrations(prev => {
                    if (prev.some(reg =>
                        reg.tenantId === created.tenantId ||
                        reg.clientId === created.clientId)) return prev;
                    return [...prev, created];
                });
            } else {
                // No body? Fallback to a fresh list to keep UI in sync.
                const list = await client.listTenantRegistrations();
                setRegistrations(list.data);
            }
            toast.displaySuccess('Tenant registration created')
        }),
        [setRegistrations, toast]
    )

    const deleteTenantRegistration = useCallback(
        createErrorHandler(`Deleting Tenant Registration`, toast)(async (tenantId: string) => {
            const client: Client = await api.getClient()
            await client.deleteTenantRegistration({ tenantId: tenantId })
            setRegistrations((prev) => prev.filter((reg) => reg.tenantId !== tenantId))
            toast.displaySuccess('Tenant registration deleted')
        }), [setRegistrations, toast])

    return (
        <TenantRegistrationContext.Provider
            value={{
                registrations,
                setRegistrations,
                fetchTenantRegistrations,
                createTenantRegistration,
                deleteTenantRegistration,
            }}
        >
            {children}
        </TenantRegistrationContext.Provider>
    )
}

export const useTenantRegistrationStore = () => {
    const context = useContext(TenantRegistrationContext)
    if (context === undefined) {
        throw new Error(
            'useTenantRegistrationStore must be used within a TenantRegistrationProvider'
        )
    }
    return context
}
