# CantonVault — Production Deployment Guide

## Deployment modes

| Mode | Command | When to use |
|------|---------|-------------|
| **Dev (LocalNet)** | `./run-localnet.sh up` | Local development, all services in Docker |
| **Real DevNet** | `make start PROFILE=devnet` | Connect to an existing Canton validator (splice-node) |
| **Production** | `docker compose -f compose.yaml -f compose.prod.yaml up` | Real deployment with non-root Dockerfile, TLS, OAuth2 |

## Production prerequisites

```bash
# REQUIRED — the app CRASHES without these:
export LEDGER_HOST=<canton-participant-host>
export LEDGER_APPLICATION_ID=<your-app-id>
export REGISTRY_BASE_URI=<splice-registry-url>
export AUTH_MODE=oauth2

# OAuth2 (Keycloak / OIDC provider):
export OAUTH2_ISSUER_URI=https://auth.tudominio.com/realms/AppProvider
export OAUTH2_CLIENT_ID=app-provider-backend
export OAUTH2_CLIENT_SECRET=<your-client-secret>

# Database (Postgres):
export POSTGRES_HOST=<db-host>
export POSTGRES_USERNAME=<db-user>
export POSTGRES_PASSWORD=<db-password>

# Canton Network (DevNet or mainnet):
export LEDGER_TLS_ENABLED=true
export SYMBOLIC_SETTLEMENT_ENABLED=false

# CORS (allowed origins):
export CORS_ALLOWED_ORIGINS=https://tudominio.com
```

## Production architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   Backend    │────▶│ Canton Participant│
│  (React SPA) │     │ (Spring Boot)│     │   (gRPC + PQS)   │
│  nginx:443   │     │  non-root    │     │   TLS: enabled    │
└──────────────┘     │  :8080       │     └──────────────────┘
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐     ┌──────────────────┐
                     │   Postgres   │     │  Splice Registry │
                     │  (PQS read)  │     │  (token standard)│
                     └──────────────┘     └──────────────────┘
```

### Security layer

| Layer | Mechanism |
|------|-----------|
| **User auth** | OAuth2/OIDC via Keycloak → JWT with `party_id`, `tenant_id`, `realm_access.roles` claims |
| **Ledger auth** | `TokenProvider` → Bearer token in gRPC metadata |
| **Acting party** | Derived from JWT `party_id` claim → `LedgerApi` uses `actAs` per-request |
| **Multi-tenant** | `TenantPropertiesRepository` persists tenants in Postgres |
| **CSRF** | Double-submit cookie (`XSRF-TOKEN`) in frontend and backend |
| **CORS** | Origin allowlist in `application.yml` |
| **Passwords** | BCrypt via `DelegatingPasswordEncoder` (never `{noop}`) |
| **Container** | Non-root user (`uid 1001`) in production Dockerfile |

## Uploading the DAR to the validator

```bash
# 1. Compile the DAR
cd cn-quickstart/quickstart
daml build --package-root daml/licensing

# 2. Upload to the validator (requires admin credentials)
dar upload \
  --host $LEDGER_HOST \
  --port $LEDGER_PORT \
  --tls \
  --access-token-file <(echo $VALIDATOR_ADMIN_TOKEN) \
  daml/licensing/.daml/dist/quickstart-licensing-0.0.4.dar

# 3. Onboard parties (the backend does this automatically at startup
#    via splice-onboarding container, or manually with:
#    ./docker/backend-service/onboarding/onboarding.sh)
```

## Health checks

```bash
# Backend
curl https://backend:8080/actuator/health

# PQS (Postgres)
psql -h $POSTGRES_HOST -U $POSTGRES_USERNAME -d $POSTGRES_DATABASE \
  -c "SELECT count(*) FROM active('Vault.CommitmentContract:CommitmentContract')"

# Ledger
grpcurl -H "Authorization: Bearer $LEDGER_TOKEN" \
  $LEDGER_HOST:$LEDGER_PORT \
  com.daml.ledger.api.v2.CommandService/SubmitAndWait
```

## Troubleshooting

| Problem | Likely cause | Solution |
|----------|---------------|----------|
| `LedgerConfig` crash on startup | `LEDGER_HOST` not set | `export LEDGER_HOST=...` |
| `TokenProvider` required | No active auth profile | `export AUTH_MODE=oauth2` |
| Symbolic settlement rejected | `SYMBOLIC_SETTLEMENT_ENABLED=false` without allocationContractId | Pass a real `allocationContractId` in the request |
| `party_id` claim missing in JWT | Keycloak mapper not configured | Add "party_id" mapper in Keycloak |
| Tenant does not persist after restart | `TenantPropertiesRepository` does not have Postgres | Verify `POSTGRES_HOST` and that the `tenants` table exists |