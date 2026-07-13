// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Provides the {@link Auth} marker bean for non-oauth2 (shared-secret) profiles.
 * The oauth2 counterpart lives in {@code OAuth2Config#auth()}.
 */
@Configuration
@Profile("!oauth2")
public class SharedSecretConfig {

    @Bean
    public Auth auth() {
        return Auth.SHARED_SECRET;
    }
}
