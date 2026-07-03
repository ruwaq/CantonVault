// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.repository;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tenant configuration store.
 *
 * Seeded from application.yml at startup (single AppProvider tenant for dev).
 * Runtime additions via {@link #addTenant} are persisted to Postgres so they
 * survive restarts and are visible to all backend replicas.
 */
@Repository
@ConfigurationProperties(prefix = "application")
public class TenantPropertiesRepository {

    private static final Logger log = LoggerFactory.getLogger(TenantPropertiesRepository.class);

    private final Map<String, TenantProperties> tenants = new ConcurrentHashMap<>();
    private final JdbcTemplate jdbc;

    public TenantPropertiesRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostConstruct
    void initSchema() {
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS tenants (
                tenant_id  VARCHAR(255) PRIMARY KEY,
                party_id   VARCHAR(512) NOT NULL,
                wallet_url VARCHAR(1024),
                internal   BOOLEAN NOT NULL DEFAULT false,
                users_json TEXT
            )
            """);
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS command_dedup (
                command_id   VARCHAR(64) PRIMARY KEY,
                status       VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
                created_at   TIMESTAMP NOT NULL DEFAULT NOW()
            )
            """);
        log.info("Tenant + idempotency schema ready");
    }

    public static class TenantProperties {
        private String tenantId;
        private boolean internal;
        private String partyId;
        private String walletUrl;
        private List<String> users;

        public String getTenantId() {
            return tenantId;
        }

        public void setTenantId(String tenantId) {
            this.tenantId = tenantId;
        }

        public String getPartyId() {
            return partyId;
        }

        public void setPartyId(String partyId) {
            this.partyId = partyId;
        }

        public String getWalletUrl() {
            return walletUrl;
        }

        public void setWalletUrl(String walletUrl) {
            this.walletUrl = walletUrl;
        }


        public boolean isInternal() {
            return internal;
        }

        public void setInternal(boolean internal) {
            this.internal = internal;
        }

        public List<String> getUsers() {
            return users;
        }

        public void setUsers(List<String> users) {
            this.users = users;
        }
    }

    /**
     * Spring will automatically bind the YAML 'application.tenants.*' to this map.
     */
    public Map<String, TenantProperties> getAllTenants() {
        return tenants;
    }

    /**
     * Called by Spring at context startup to set the initial map from YAML.
     */
    public void setTenants(Map<String, TenantProperties> tenants) {
        this.tenants.putAll(tenants);
        log.info("Seeded {} tenants from application.yml", tenants.size());
    }

    /**
     * Retrieve a single tenant's extra properties.
     */
    public TenantProperties getTenant(String tenantId) {
        return tenants.get(tenantId);
    }

    /**
     * Save (or overwrite) a tenant's extra properties.
     * Persisted to Postgres so it survives restarts.
     */
    public void addTenant(String tenantId, TenantProperties props) throws IllegalArgumentException {
        TenantProperties previous = tenants.putIfAbsent(tenantId, props);
        if (previous != null) {
            throw new IllegalArgumentException("Duplicate tenantId not allowed: " + tenantId);
        }
        // Persist to Postgres
        jdbc.update(
            "INSERT INTO tenants (tenant_id, party_id, wallet_url, internal, users_json) VALUES (?, ?, ?, ?, ?)",
            tenantId,
            props.getPartyId(),
            props.getWalletUrl(),
            props.isInternal(),
            props.getUsers() != null ? String.join(",", props.getUsers()) : null
        );
        log.info("Tenant {} persisted to Postgres", tenantId);
    }

    /**
     * Remove a tenant's extra properties (from memory and Postgres).
     */
    public void removeTenant(String tenantId) {
        if (tenants.remove(tenantId) == null) {
            throw new NoSuchElementException("No tenant found for tenantId = " + tenantId);
        }
        jdbc.update("DELETE FROM tenants WHERE tenant_id = ?", tenantId);
        log.info("Tenant {} removed from Postgres", tenantId);
    }
}
