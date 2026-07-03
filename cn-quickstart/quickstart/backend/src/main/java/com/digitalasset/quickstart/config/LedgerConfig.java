// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "ledger")
public class LedgerConfig {

    private static final Logger log = LoggerFactory.getLogger(LedgerConfig.class);

    /** No default — must be configured via LEDGER_HOST env var. */
    private String host;
    private int port = 6865;
    private boolean tlsEnabled = false;
    private String applicationId;
    private String registryBaseUri;

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
        if ("localhost".equals(host) && tlsEnabled) {
            log.warn("TLS is enabled but ledger host is localhost — this is unusual for production.");
        }
        log.info("Ledger config: host={}:{} tls={} appId={}", host, port, tlsEnabled, applicationId);
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
