// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

/**
 * On-ledger metadata surfaced in a success toast, so the jury can immediately
 * see that the transaction landed on the Canton Network and where to verify it.
 */
export interface LedgerProof {
    /** The created/affected contractId (will be shown truncated). */
    contractId?: string
    /** The ledger offset the transaction landed at. */
    offset?: number
}

interface ToastContextType {
    message: string
    show: boolean
    /** Structured on-ledger proof for the current success toast, if any. */
    proof: LedgerProof | null
    displayError: (message: string) => void
    displaySuccess: (message: string, proof?: LedgerProof) => void
    hideError: () => void
}

interface ToastProviderProps {
    children: React.ReactNode
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider = ({ children }: ToastProviderProps) => {
    const [message, setMessage] = useState('')
    const [show, setShow] = useState(false)
    const [proof, setProof] = useState<LedgerProof | null>(null)
    const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const hideError = useCallback(() => {
        setMessage('')
        setShow(false)
        setProof(null)
        if (timeoutIdRef.current !== null) {
            clearTimeout(timeoutIdRef.current)
            timeoutIdRef.current = null
        }
    }, [])

    const displayError = useCallback(
        (msg: string) => {
            setMessage(`Error: ${msg}`)
            setProof(null)
            setShow(true)
            if (timeoutIdRef.current !== null) {
                clearTimeout(timeoutIdRef.current)
            }
            timeoutIdRef.current = setTimeout(() => {
                hideError()
            }, 10000)
        },
        [hideError]
    )

    const displaySuccess = useCallback(
        (msg: string, ledgerProof?: LedgerProof) => {
            setMessage(`Success: ${msg}`)
            setProof(ledgerProof ?? null)
            setShow(true)
            if (timeoutIdRef.current !== null) {
                clearTimeout(timeoutIdRef.current)
            }
            // Give ledger-success toasts more time so the jury can read the
            // contractId and offset before it auto-dismisses.
            timeoutIdRef.current = setTimeout(() => {
                hideError()
            }, ledgerProof ? 8000 : 5000)
        },
        [hideError]
    )

    return (
        <ToastContext.Provider value={{ message, show, proof, displayError, displaySuccess, hideError }}>
            {children}
        </ToastContext.Provider>
    )
}

export const useToast = () => {
    const context = useContext(ToastContext)
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}
