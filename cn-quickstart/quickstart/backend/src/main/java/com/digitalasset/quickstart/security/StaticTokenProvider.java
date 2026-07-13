// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Shared-secret (demo) implementation of the security triad
 * {@link TokenProvider} + {@link AuthenticatedPartyProvider} +
 * {@link AuthenticatedUserProvider}.
 *
 * <p>OAuth2 deployments get these from {@code AuthService} (which reads the
 * Spring SecurityContext). In shared-secret mode there is no OAuth2 dance, so
 * we resolve the three values statically from the onboarding environment:</p>
 * <ul>
 *   <li>{@code security.token} — pre-provisioned backend JWT
 *       ({@code APP_PROVIDER_BACKEND_USER_TOKEN})</li>
 *   <li>{@code APP_PROVIDER_PARTY} — party id granted by splice-onboarding</li>
 * </ul>
 *
 * <p>Active whenever the {@code oauth2} profile is <em>not</em> active.</p>
 */
@Component
@Profile("!oauth2")
public final class StaticTokenProvider
        implements TokenProvider, AuthenticatedPartyProvider, AuthenticatedUserProvider {

    private final String token;
    private final String partyId;

    public StaticTokenProvider(
            @Value("${security.token:}") String token,
            @Value("${APP_PROVIDER_PARTY:}") String partyId
    ) {
        if (token == null || token.isBlank()) {
            throw new IllegalStateException(
                    "security.token is not configured. For shared-secret mode, set "
                    + "APP_PROVIDER_BACKEND_USER_TOKEN (or security.token) to the backend "
                    + "JWT produced by splice-onboarding.");
        }
        this.token = token;
        this.partyId = partyId == null ? "" : partyId;
    }

    @Override
    public String getToken() {
        return token;
    }

    @Override
    public Optional<String> getParty() {
        return partyId.isBlank() ? Optional.empty() : Optional.of(partyId);
    }

    @Override
    public String getPartyOrFail() {
        return getParty().orElseThrow(() -> new IllegalStateException(
                "No authenticated party — APP_PROVIDER_PARTY is not set."));
    }

    @Override
    public Optional<AuthenticatedUser> getUser() {
        if (partyId.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(new DefaultAuthenticatedUser(
                "app-provider",
                partyId,
                "AppProvider",
                List.of("ROLE_USER", "ROLE_ADMIN"),
                true
        ));
    }
}
