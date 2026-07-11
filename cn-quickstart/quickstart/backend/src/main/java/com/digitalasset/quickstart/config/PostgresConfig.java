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
@ConfigurationProperties(prefix = "postgres")
public class PostgresConfig {

    private static final Logger log = LoggerFactory.getLogger(PostgresConfig.class);

    private final Environment env;

    /** Defaults are for local dev only. Override via POSTGRES_HOST, etc. */
    private String host = "localhost";
    private int port = 5432;
    private String database = "postgres";
    private String username = "postgres";
    private String password = "postgres";

    public PostgresConfig(Environment env) {
        this.env = env;
    }

    /**
     * Enforce non-default credentials outside of local dev. Previously this only
     * logged a warning, meaning a non-local deployment that forgot to set
     * POSTGRES_PASSWORD would silently connect with postgres/postgres.
     */
    @PostConstruct
    void validateCredentials() {
        boolean isDev = isDevProfile();
        boolean isLoopback = isLoopbackHost(host);

        if ("postgres".equals(username) && "postgres".equals(password)) {
            if (!isLoopback && !isDev) {
                throw new IllegalStateException(
                        "Refusing to start: Postgres is using default credentials (postgres/postgres) "
                        + "on non-loopback host '" + host + "'. Set POSTGRES_USERNAME and POSTGRES_PASSWORD "
                        + "environment variables, or run with a dev profile and postgres.host=localhost.");
            }
            log.warn("Postgres is using default credentials (postgres/postgres). "
                    + "Acceptable for local dev only — set POSTGRES_USERNAME/POSTGRES_PASSWORD for any "
                    + "non-local deployment.");
        }
        if (isLoopback) {
            log.info("Postgres host is loopback — expected for local dev.");
        }
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

