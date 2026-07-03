// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import { isAxiosError, type AxiosError } from 'axios';
import type { ErrorResponse } from "../openapi.d.ts";

/** Minimal toast interface so this module stays hook-free. */
export interface ToastLike {
    displayError: (msg: string) => void;
    displaySuccess: (msg: string) => void;
}

function isAxiosErrorWithErrorResponse(
    err: unknown
): err is AxiosError<ErrorResponse> {
    return isAxiosError(err);
}

/** User-safe error messages keyed by HTTP status code. */
const STATUS_MESSAGES: Record<number, string> = {
    400: 'Invalid request — please check your input',
    401: 'Session expired — please reconnect',
    403: 'You do not have permission to perform this action',
    404: 'The requested resource was not found',
    409: 'Conflict — the resource may have been modified by another party',
    500: 'Server error — please try again later',
    502: 'The Canton ledger is temporarily unavailable',
    503: 'Service unavailable — please try again later',
};

/**
 * Extract a user-safe error message from any thrown value.
 * Never exposes raw backend messages, stack traces, or internal paths.
 */
function extractSafeError(err: unknown): string {
    if (isAxiosErrorWithErrorResponse(err)) {
        const status = err.response?.status ?? 0;
        // Use a generic mapped message for known HTTP statuses
        if (STATUS_MESSAGES[status]) {
            return STATUS_MESSAGES[status];
        }
        return `Unexpected server response (HTTP ${status})`;
    }
    if (err instanceof Error) {
        // Only expose the message for non-HTTP errors (e.g. network errors)
        return err.message || 'Unexpected error';
    }
    return 'Unexpected error';
}

/**
 * Pure function: logs a user-safe error to the toast.
 * Use inside a try/catch in your store actions — no hooks needed.
 *
 * @example
 *   try { await vaultApi.post('/proposals', input); }
 *   catch (err) { handleActionError(err, 'Creating proposal', toast); return; }
 */
export function handleActionError(err: unknown, action: string, toast: ToastLike): void {
    const message = extractSafeError(err);
    toast.displayError(`Error: ${action}. ${message}`);
}

/**
 * Factory: returns a wrapper that catches errors and routes them to handleActionError.
 * Preserves the original function's types. Pass toast explicitly — no hooks.
 *
 * @example
 *   const fetch = useCallback(
 *     createErrorHandler('Fetching data', toast)(async () => { ... }),
 *     [toast],
 *   );
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createErrorHandler(action: string, toast: ToastLike) {
    return <TArgs extends any[], TRet>(fn: (...args: TArgs) => Promise<TRet>) => {
        return async (...args: TArgs): Promise<TRet | void> => {
            try {
                return await fn(...args);
            } catch (err) {
                handleActionError(err, action, toast);
            }
        };
    };
}
