// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "ledger")
public class LedgerConfig {

    private static final Logger log = LoggerFactory.getLogger(LedgerConfig.class);

    private final Environment env;

    /** No default — must be configured via LEDGER_HOST env var. */
    private String host;
    private int port = 6865;
    private boolean tlsEnabled = false;
    private String applicationId;
    private String registryBaseUri;

    public LedgerConfig(Environment env) {
        this.env = env;
    }

    @PostConstruct
    void validate() {
        if (host == null || host.isBlank()) {
            throw new IllegalStateException(
                    "LEDGER_HOST is not configured. Set the Canton participant host via "
                    + "LEDGER_HOST environment variable or 'ledger.host' in application.yml.");
        }
        if (applicationId == null || applicationId.isBlank()) {
            throw new IllegalStateException(
                    "LEDGER_APPLICATION_ID is not configured. Set it via "
                    + "LEDGER_APPLICATION_ID env var or 'ledger.application-id' in application.yml.");
        }
        boolean isDev = isDevProfile();
        boolean isLoopback = isLoopbackHost(host);

        // SECURITY: the backend injects a powerful ledger access token into every
        // gRPC call. On a non-loopback host with TLS disabled, that token traverses
        // the network in cleartext and can be sniffed. Fail fast unless this is an
        // explicit local-dev deployment or TLS is explicitly bypassed.
        if (!tlsEnabled && !isLoopback && !isDev) {
            throw new IllegalStateException(
                    "Refusing to start: ledger TLS is disabled and host '" + host
                    + "' is not loopback. Set LEDGER_TLS_ENABLED=true, or run with a dev profile "
                    + "and ledger.host=localhost to allow plaintext.");
        }
        if (!tlsEnabled) {
            if (isLoopback) {
                log.warn("Ledger TLS is disabled on loopback — acceptable for local dev only.");
            } else {
                log.warn("Ledger TLS is disabled for host '{}' in dev profile — do NOT use in production.", host);
            }
        }
        log.info("Ledger config: host={}:{} tls={} appId={}", host, port, tlsEnabled, applicationId);
    }

    private boolean isDevProfile() {
        for (String profile : env.getActiveProfiles()) {
            if ("dev".equalsIgnoreCase(profile) || "local".equalsIgnoreCase(profile)
                    || "test".equalsIgnoreCase(profile)) {
                return true;
            }
        }
        return false;
    }

    private static boolean isLoopbackHost(String host) {
        return "localhost".equals(host) || "127.0.0.1".equals(host) || "0.0.0.0".equals(host) || "::1".equals(host);
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public boolean isTlsEnabled() {
        return tlsEnabled;
    }

    public void setTlsEnabled(boolean tlsEnabled) {
        this.tlsEnabled = tlsEnabled;
    }

    public String getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(String applicationId) {
        this.applicationId = applicationId;
    }

    public String getRegistryBaseUri() {
        return registryBaseUri;
    }

    public void setRegistryBaseUri(String registryBaseUri) {
        this.registryBaseUri = registryBaseUri;
    }
}
