// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.repository;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DuplicateKeyException;
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
        syncSeedTenantsToDatabase();
        loadPersistedTenants();
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS command_dedup (
                command_id   VARCHAR(64) PRIMARY KEY,
                status       VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
                created_at   TIMESTAMP NOT NULL DEFAULT NOW()
            )
            """);
        log.info("Tenant + idempotency schema ready");
    }

    private void syncSeedTenantsToDatabase() {
        tenants.forEach(this::upsertTenantRow);
    }

    private void loadPersistedTenants() {
        jdbc.query(
                "SELECT tenant_id, party_id, wallet_url, internal, users_json FROM tenants",
                rs -> {
                    TenantProperties props = new TenantProperties();
                    props.setTenantId(rs.getString("tenant_id"));
                    props.setPartyId(rs.getString("party_id"));
                    props.setWalletUrl(rs.getString("wallet_url"));
                    props.setInternal(rs.getBoolean("internal"));
                    props.setUsers(parseUsers(rs.getString("users_json")));
                    tenants.put(props.getTenantId(), props);
                }
        );
        log.info("Loaded {} tenants from Postgres", tenants.size());
    }

    private void upsertTenantRow(String tenantId, TenantProperties props) {
        String users = serializeUsers(props.getUsers());
        int updated = jdbc.update(
                "UPDATE tenants SET party_id = ?, wallet_url = ?, internal = ?, users_json = ? WHERE tenant_id = ?",
                props.getPartyId(),
                props.getWalletUrl(),
                props.isInternal(),
                users,
                tenantId
        );
        if (updated > 0) {
            return;
        }
        try {
            jdbc.update(
                    "INSERT INTO tenants (tenant_id, party_id, wallet_url, internal, users_json) VALUES (?, ?, ?, ?, ?)",
                    tenantId,
                    props.getPartyId(),
                    props.getWalletUrl(),
                    props.isInternal(),
                    users
            );
        } catch (DuplicateKeyException ignored) {
            jdbc.update(
                    "UPDATE tenants SET party_id = ?, wallet_url = ?, internal = ?, users_json = ? WHERE tenant_id = ?",
                    props.getPartyId(),
                    props.getWalletUrl(),
                    props.isInternal(),
                    users,
                    tenantId
            );
        }
    }

    private static String serializeUsers(List<String> users) {
        if (users == null || users.isEmpty()) {
            return null;
        }
        return String.join(",", users);
    }

    private static List<String> parseUsers(String usersJson) {
        if (usersJson == null || usersJson.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(usersJson.split(","))
                .map(String::trim)
                .filter(user -> !user.isEmpty())
                .toList();
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
     *
     * @throws IllegalArgumentException if the tenantId already exists or if any of
     *         the tenant's usernames are already claimed by another tenant. The
     *         username-uniqueness check prevents cross-tenant confusion: in
     *         shared-secret mode the party is resolved by searching every
     *         tenant's user list for the authenticated username, so a duplicate
     *         username would map a user to the wrong tenant's party.
     */
    public void addTenant(String tenantId, TenantProperties props) throws IllegalArgumentException {
        TenantProperties previous = tenants.putIfAbsent(tenantId, props);
        if (previous != null) {
            throw new IllegalArgumentException("Duplicate tenantId not allowed: " + tenantId);
        }
        // SECURITY (audit H6): reject usernames that already belong to another
        // tenant. Without this, two tenants could both register "alice" and the
        // shared-secret party resolver would non-deterministically pick one.
        if (props.getUsers() != null) {
            for (String user : props.getUsers()) {
                for (Map.Entry<String, TenantProperties> entry : tenants.entrySet()) {
                    if (entry.getKey().equals(tenantId)) continue;
                    List<String> otherUsers = entry.getValue().getUsers();
                    if (otherUsers != null && otherUsers.contains(user)) {
                        // Roll back the in-memory put above so the state stays consistent.
                        tenants.remove(tenantId);
                        throw new IllegalArgumentException(
                                "Username '" + user + "' is already registered to tenant '"
                                        + entry.getKey() + "'. Usernames must be unique across tenants.");
                    }
                }
            }
        }
        // SECURITY (audit M11): validate walletUrl to prevent javascript:/data:
        // URLs. Only http/https schemes with a valid host are allowed.
        if (props.getWalletUrl() != null && !props.getWalletUrl().isBlank()) {
            try {
                var url = new java.net.URI(props.getWalletUrl());
                if (!"http".equalsIgnoreCase(url.getScheme()) && !"https".equalsIgnoreCase(url.getScheme())) {
                    tenants.remove(tenantId);
                    throw new IllegalArgumentException(
                            "walletUrl scheme must be http or https, got: " + url.getScheme());
                }
                if (url.getHost() == null || url.getHost().isBlank()) {
                    tenants.remove(tenantId);
                    throw new IllegalArgumentException("walletUrl must have a host");
                }
            } catch (java.net.URISyntaxException e) {
                tenants.remove(tenantId);
                throw new IllegalArgumentException("walletUrl is not a valid URI: " + props.getWalletUrl());
            }
        }
        upsertTenantRow(tenantId, props);
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
