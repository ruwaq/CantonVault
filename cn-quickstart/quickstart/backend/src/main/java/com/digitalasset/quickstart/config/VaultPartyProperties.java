// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Typed binding for the {@code canton-vault.parties} list in application.yml.
 *
 * Spring's {@code @Value} cannot convert an inline YAML list of maps into a
 * {@code List<Map>} on a constructor parameter, so we use a dedicated
 * {@link ConfigurationProperties} class instead. This is the canonical Spring
 * Boot way to bind structured config and exposes the onboarded Canton parties
 * (configured per environment) to the controller and the UI selectors.
 */
@Configuration
@ConfigurationProperties(prefix = "canton-vault")
public class VaultPartyProperties {

    /**
     * Known parties for the demo, e.g.
     * <pre>
     * canton-vault:
     *   parties:
     *     - label: Proposer (Supplier)
     *       party-id: cd0a8760...
     *       role: proposer
     * </pre>
     */
    private List<Map<String, String>> parties = new ArrayList<>();

    public List<Map<String, String>> getParties() {
        return parties;
    }

    public void setParties(List<Map<String, String>> parties) {
        this.parties = parties == null ? new ArrayList<>() : parties;
    }
}
