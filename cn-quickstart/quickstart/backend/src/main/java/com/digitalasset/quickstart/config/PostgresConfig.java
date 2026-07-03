// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "postgres")
public class PostgresConfig {

    private static final Logger log = LoggerFactory.getLogger(PostgresConfig.class);

    /** Defaults are for local dev only. Override via POSTGRES_HOST, etc. */
    private String host = "localhost";
    private int port = 5432;
    private String database = "postgres";
    private String username = "postgres";
    private String password = "postgres";

    /**
     * Warn if the application is starting with default Postgres credentials,
     * which are acceptable for local dev but must be overridden in any non-local
     * deployment via POSTGRES_USERNAME / POSTGRES_PASSWORD environment variables.
     */
    @PostConstruct
    void validateCredentials() {
        if ("postgres".equals(username) && "postgres".equals(password)) {
            log.warn("Postgres is using default credentials (postgres/postgres). "
                    + "Set POSTGRES_USERNAME and POSTGRES_PASSWORD environment variables "
                    + "for any non-local deployment.");
        }
        if ("localhost".equals(host)) {
            log.info("Postgres host is localhost — this is expected for local dev.");
        }
    }

    // Getters and Setters
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

    public String getDatabase() {
        return database;
    }

    public void setDatabase(String database) {
        this.database = database;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}

