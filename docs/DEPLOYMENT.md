# CantonVault — Guía de Deploy a Producción

## Modos de deploy

| Modo | Comando | Cuándo usar |
|------|---------|-------------|
| **Dev (LocalNet)** | `./run-localnet.sh up` | Desarrollo local, todos los servicios en Docker |
| **DevNet real** | `make start PROFILE=devnet` | Conectar a un validator Canton existente (splice-node) |
| **Producción** | `docker compose -f compose.yaml -f compose.prod.yaml up` | Deploy real con Dockerfile non-root, TLS, OAuth2 |

## Prerrequisitos producción

```bash
# REQUERIDO — la app CRASHEA sin estos:
export LEDGER_HOST=<canton-participant-host>
export LEDGER_APPLICATION_ID=<your-app-id>
export REGISTRY_BASE_URI=<splice-registry-url>
export AUTH_MODE=oauth2

# OAuth2 (Keycloak / OIDC provider):
export OAUTH2_ISSUER_URI=https://auth.tudominio.com/realms/AppProvider
export OAUTH2_CLIENT_ID=app-provider-backend
export OAUTH2_CLIENT_SECRET=<tu-client-secret>

# Database (Postgres):
export POSTGRES_HOST=<db-host>
export POSTGRES_USERNAME=<db-user>
export POSTGRES_PASSWORD=<db-password>

# Canton Network (DevNet o mainnet):
export LEDGER_TLS_ENABLED=true
export SYMBOLIC_SETTLEMENT_ENABLED=false

# CORS (orígenes permitidos):
export CORS_ALLOWED_ORIGINS=https://tudominio.com
```

## Arquitectura de producción

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

### Capa de seguridad

| Capa | Mecanismo |
|------|-----------|
| **Auth usuarios** | OAuth2/OIDC via Keycloak → JWT con claims `party_id`, `tenant_id`, `realm_access.roles` |
| **Auth ledger** | `TokenProvider` → Bearer token en gRPC metadata |
| **Acting party** | Derivado del JWT claim `party_id` → `LedgerApi` usa `actAs` per-request |
| **Multi-tenant** | `TenantPropertiesRepository` persiste tenants en Postgres |
| **CSRF** | Double-submit cookie (`XSRF-TOKEN`) en frontend y backend |
| **CORS** | Allowlist de orígenes en `application.yml` |
| **Passwords** | BCrypt via `DelegatingPasswordEncoder` (nunca `{noop}`) |
| **Container** | Non-root user (`uid 1001`) en Dockerfile de producción |

## Subir el DAR al validator

```bash
# 1. Compilar el DAR
cd cn-quickstart/quickstart
daml build --package-root daml/licensing

# 2. Subir al validator (requiere credenciales de admin)
dar upload \
  --host $LEDGER_HOST \
  --port $LEDGER_PORT \
  --tls \
  --access-token-file <(echo $VALIDATOR_ADMIN_TOKEN) \
  daml/licensing/.daml/dist/quickstart-licensing-0.0.4.dar

# 3. Onboardear parties (el backend lo hace automáticamente en startup
#    vía splice-onboarding container, o manualmente con:
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

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| `LedgerConfig` crash al iniciar | `LEDGER_HOST` no seteado | `export LEDGER_HOST=...` |
| `TokenProvider` required | Sin profile de auth activo | `export AUTH_MODE=oauth2` |
| Settlement simbólico rechazado | `SYMBOLIC_SETTLEMENT_ENABLED=false` sin allocationContractId | Pasar `allocationContractId` real en el request |
| `party_id` claim missing en JWT | Keycloak mapper no configurado | Agregar "party_id" mapper en Keycloak |
| Tenant no persiste tras restart | `TenantPropertiesRepository` no tiene Postgres | Verificar `POSTGRES_HOST` y que la tabla `tenants` existe |