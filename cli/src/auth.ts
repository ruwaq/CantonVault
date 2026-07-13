// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

import type { LedgerConfig } from './types.js';

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
}

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

/**
 * OAuth2 client-credentials token manager with automatic refresh.
 * Tokens from the Canton DevNet auth provider expire every 8 hours;
 * this class refreshes transparently when ≤5 min remain.
 */
export class TokenManager {
  private cached: CachedToken | null = null;
  private static readonly SAFETY_MARGIN_MS = 5 * 60 * 1000; // refresh 5 min before expiry

  constructor(private readonly config: Pick<LedgerConfig, 'authUrl' | 'clientId' | 'clientSecret'>) {}

  /** Returns a valid access token, refreshing if necessary. */
  async getToken(): Promise<string> {
    if (this.cached && Date.now() < this.cached.expiresAt - TokenManager.SAFETY_MARGIN_MS) {
      return this.cached.token;
    }
    return this.refresh();
  }

  /** Force a fresh token regardless of cache. */
  async refresh(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      audience: this.config.clientId,
      scope: 'daml_ledger_api',
    });

    const res = await fetch(this.config.authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OAuth2 token request failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as TokenResponse;
    this.cached = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  }

  /** Returns the Authorization header value for a fresh token. */
  async authHeader(): Promise<string> {
    return `Bearer ${await this.getToken()}`;
  }
}
