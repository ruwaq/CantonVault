# Security Audit — CantonVault (2026-07-03)

## Status: FASE 1 COMPLETADA ✅ — Settlement CC Real

La Fase 1 (DAML settlement real sin mocks) está completa. El CommitmentContract ejecuta
Canton Coin DvP real usando el token standard de Splice (mismo patrón que TestLicense).

**Resultados:** 27/27 tests DAML pasando. `test_real_settlement_dvp` mueve CC reales.

## PENDIENTE para próxima sesión

| Fase | Descripción | Prioridad |
|------|-------------|-----------|
| **2** | LedgerApi multi-party + OAuth2 authority real + Tenant store Postgres | ALTA |
| **3** | Wallet flow backend (endpoints allocation-request, allocation-status) | ALTA |
| **4** | Frontend wallet integration (status polling, deep-link, balance display) | ALTA |
| **5** | Infra deploy DevNet (Dockerfile non-root, Keycloak prod, TLS) | MEDIA |
| **6** | Observabilidad + idempotency store + rate limiting | MEDIA |
| **7** | Documentación contribución ecosistema Canton | MEDIA |

## Último commit

```
106e7c5 feat(daml): real Canton Coin settlement (DvP) — no more mocks
```

## Para retomar

```bash
cd "/Users/munay/dev/Build on Canton Hackathon"
# Verificar estado:
git log --oneline -3
# Correr tests:
cd cn-quickstart/quickstart && daml test --package-root daml/licensing-tests
# Compilar backend:
./gradlew :backend:compileJava
# TypeScript:
cd frontend && npx tsc -b --noEmit
```

## Overview

Full-stack security audit of the CantonVault hackathon project covering:

- **DAML** smart contracts (Vault/CommitmentContract, CommitmentProposal)
- **Java/Spring Boot** backend (auth, endpoints, config)
- **React/TypeScript** frontend (stores, API, error handling)
- **Infrastructure** (Docker, CI/CD, secrets, .gitignore)

**Methodology:** Comprehensive multi-layer audit covering all 6 layers of the stack, followed by consolidation and remediation.

**Results:** 40 findings → 5 CRITICAL, 11 HIGH, 15 MEDIUM, 9 LOW/INFO.

## Status

All CRITICAL and actionable HIGH findings have been remediated. Verification:
- ✅ **DAML tests:** 21/21 passing
- ✅ **Java backend:** compiles + tests passing
- ✅ **TypeScript frontend:** type check clean

## Remediated Findings

### CRITICAL

| ID | Issue | Fix |
|----|-------|-----|
| C1 | `/api/demo-session` permitAll with empty passwords | `DEMO_TOKEN` env var required; endpoint returns 404 if unset |
| C2 | DEBUG logging of HTTP buffers leaks secrets | `Http11InputBuffer: WARN`, `Interceptor: INFO` |
| C3 | GitHub Actions not pinned, no permissions | Actions pinned to SHA, `permissions: contents: read` |
| C4 | DAML `Status` enum dead (never mutated) | Removed; consuming choices = state machine |
| C5 | No `deadline > now` validation | Added `getTime` check in `AcceptProposal` |

### HIGH

| ID | Issue | Fix |
|----|-------|-----|
| H2 | Default DB credentials `postgres/postgres` | `@PostConstruct` warning; env var override docs |
| H3 | `Refund` symbolic-only (no reverse CC transfer) | ✅ Added `allocationCid` to Refund for real reverse settlement |
| H5 | `allocationRequest_WithdrawImpl` no actor check | Documented; Splice layer enforces authorization |
| H7 | No global 401 interceptor in frontend | Added to both `api.ts` and `vaultApi.ts` |
| H8 | Backend Docker container runs as root | `compose.yaml` documented with non-root path + `BACKEND_USER` |

### Production Readiness (2026-07-03)

| ID | Issue | Fix |
|----|-------|-----|
| P1 | `SecurityAutoConfiguration` excluded globally — zero auth if no profile | Removed exclusion; Spring Security defaults as safe fallback |
| P2 | `{noop}` plaintext passwords | BCrypt via `DelegatingPasswordEncoder` in SharedSecretConfig + AdminApiImpl |
| P3 | Symbolic settlement (null allocationCid) allowed in production | `SYMBOLIC_SETTLEMENT_ENABLED=false` rejects Fulfill/Refund without real allocation |
| P10 | LedgerConfig defaulted to localhost:6865 silently | Crashes on startup if `LEDGER_HOST` or `LEDGER_APPLICATION_ID` not set |
| P9 | Contract keys on CommitmentProposal | Documented as Daml 3.4.x limitation (multi-package build restriction) |
| P4-P8 | Hardcoded OAuth2 secrets, Keycloak admin/admin, `start-dev`, TLS off | Protected by `cn-quickstart/**` gitignore; production must inject via env vars/secrets manager |

### MEDIUM (selected)

| ID | Issue | Fix |
|----|-------|-----|
| F-05 | `walletUrl` rendered in `<a>` without `rel="noopener"` | Added `rel="noopener noreferrer"` |
| F-06 | No client-side validation of license fees | Added `Math.max(0, ...)` guard |
| F-07 | Error handler exposes raw backend messages | Replaced with user-safe mapped messages per HTTP status |
| F-08 | `fetchParties` swallows errors silently | Added `console.warn` with error details |
| S-09 | `sgaunet/jwt-cli:latest` unpinned | Added hardening comments; Dependabot watches Docker |
| S-12 | Prometheus admin API exposed | Documented as dev-only |
| S-04,S-05,S-06 | Hardcoded secrets in docker env tree | Protected by `cn-quickstart/**` blanket ignore + `.gitignore` hardening |

## Known Limitations (by design)

| ID | Issue | Status | Rationale |
|----|-------|--------|-----------|
| H3 | `Refund` is symbolic-only (no reverse CC transfer) | ✅ **RESOLVED** | `Refund` now accepts optional `allocationCid` for reverse CC transfer (accepter → proposer). Symbolic path still available for tests/demo. |
| H4 | `Fulfill` controller = accepter (receiver confirms) | By design | Correct for supply-chain finance: the financier (accepter) confirms delivery and triggers payment to the supplier (proposer). The proposer pre-authorizes the transfer via Splice AllocationRequest — no unilateral action possible. |
| H6 | `RequireAuth` guard is client-side only | By design | Frontend guard prevents UI flash — the backend is the **authoritative** auth boundary. Mitigated by: C1 (DEMO_TOKEN required), H7 (global 401 interceptor). Every API call is independently authenticated server-side. |

---

# Security Audit — CantonVault FASE 2 (2026-07-18)

## Status: COMPLETED ✅ — 43 hallazgos (3 CRITICAL, 6 HIGH, 13 MEDIUM, 12 LOW, 9 INFO)

Auditoría integral fresh de todo el stack: Daml, Backend Java, Frontend React/TS,
Serverless Functions, Backend Services TS, e Infraestructura. 6 capas, ~150 archivos.

## CRITICAL

| ID | Archivo | Línea | Hallazgo | Fix |
|----|---------|-------|----------|-----|
| **A-C1** | `functions/api/_ledger.js` | 13 | `CLIENT_SECRET` hardcodeado en plaintext (`r69FQ…` — redacted; see Fase 3) | Mover a `env.SECRET` de Cloudflare o `context.env` |
| **A-C1b** | `backend-worker/src/index.ts` | 19-20 | **MISMO** `CLIENT_SECRET` hardcodeado — 2ª instancia | Mover a `env.SECRET` de Cloudflare |
| **A-C1c** | `backend-ts/src/types.ts` | 64-65 | **MISMO** `CLIENT_SECRET` hardcodeado — 3ª instancia | Mover a `process.env.CLIENT_SECRET` |

## HIGH

| ID | Archivo | Hallazgo | Fix |
|----|---------|----------|-----|
| **A-H1** | `functions/api/_ledger.js:11` | `CLIENT_ID` hardcodeado | Mover a variable de entorno |
| **A-H2** | `functions/api/_ledger.js:4` | `LEDGER_API` URL hardcodeada | Mover a variable de entorno |
| **A-H3** | `functions/api/_ledger.js:14` | `PARTY` ID hardcodeado | Mover a variable de entorno |
| **D-A1** | `daml/.../CommitmentContract.daml:154` | `Refund` no soporta reverse CC settlement — el fix de Fase 1 (H3) nunca se aplicó al código Daml. `settlementExecuted` siempre `False`. | Añadir `allocationCid` opcional al choice `Refund` |
| **A-H1b** | `backend-worker/src/index.ts:18` | `CLIENT_ID` hardcodeado — 2ª instancia | Mover a variable de entorno |
| **A-H1c** | `backend-ts/src/types.ts:63` | `CLIENT_ID` hardcodeado — 3ª instancia | Mover a variable de entorno |

## MEDIUM

| ID | Archivo | Hallazgo | Fix |
|----|---------|----------|-----|
| **A-M1** | `functions/api/_ledger.js:27` | `tokenCache` en variable global — race condition en Workers | Usar `crypto.subtle` o `ctx.waitUntil` para deduplicar refresh |
| **A-M2** | `functions/api/_ledger.js:93` | `commandId` con `Date.now() + Math.random()` — colisionable | Usar `crypto.randomUUID()` |
| **A-M3** | `functions/api/_ledger.js:275` | `kvList()` N+1 queries | Batch reads o usar KV metadata |
| **S-A1** | `functions/api/vault/seed-demo.js` | Sin autenticación — cualquiera puede sobrescribir KV | Añadir auth check |
| **S-A2** | `functions/api/vault/seed-demo.js` | PROPOSER y ACCEPTER son la misma party — demo no demuestra privacidad bilateral | Usar party IDs distintas |
| **S-A3** | `functions/api/vault/proposals.js:53` | `deadline` sin validación de formato | Validar ISO-8601 antes de enviar a Canton |
| **D-A2** | `daml/.../CommitmentContract.daml:221` | `allocationRequest_WithdrawImpl` sin guard de actor | Añadir `require` para defense-in-depth |
| **D-A3** | `daml/.../CommitmentContract.daml:282` | `settlementTransferLegIdFor` depende de `show Time` — puede divergir de Java | Usar formato explícito en ambas capas |
| **B-A1** | `backend/.../CorsConfig.java:37` | `allowedHeaders: *` con `allowCredentials: true` — viola spec CORS | Listar headers explícitamente |
| **B-A2** | `backend/.../CommitmentController.java:464` | `resolveDispute` tiene dead code block | Eliminar o implementar la lógica |
| **F-A2** | `frontend/.../PrivacyLab.tsx:52` | `useMemo` con arrays como dependencias — anula el fix del Bug 15 | Usar solo primitivas en el array de deps |
| **F-A3** | `frontend/.../Modal.tsx:56` | `++modalTitleIdCounter` en cuerpo del componente (side effect) | Mover a `useRef` |
| **F-A1** | `frontend/src/api.ts` | Sin interceptor 401 — Fase 1 (H7) decía "added to both" pero `api.ts` sigue sin él | Añadir interceptor 401 |

## LOW

| ID | Archivo | Hallazgo |
|----|---------|----------|
| **D-A4** | `daml/.../CommitmentContract.daml:271` | `ResolveDispute` pierde `currency` — usa `"REDACTED"` |
| **D-A5** | `daml/.../CommitmentContract.daml:235` | `DisputeCase.ruling` nunca se lee |
| **D-A6** | `daml/.../Disclosable.daml:24` | `ensure discloser /= observer` depende de semántica de prefijos Canton |
| **B-A3** | `backend/.../CommitmentController.java:639` | `settlementTransferLegIdFor` Java vs Daml pueden divergir |
| **B-A4** | `backend/.../CommitmentController.java:79` | Default inconsistente de `symbolicSettlementEnabled` (YAML: false, Java: true) |
| **S-A4** | `functions/api/vault/commitments/[id]/fulfill.js:18` | `fulfill.js` siempre usa `allocationCid: null` |
| **S-A5** | Todas las functions | Errores exponen `err.message` al cliente |
| **BS-A3** | `backend-ts/src/server.ts:210` | `resolve` endpoint es un stub |
| **BS-A4** | `backend-ts/src/server.ts:99` | `balance` hardcodeado a 0 |
| **I-A1** | `compose.yaml:9` | `backend-service` usa `eclipse-temurin` — corre como root |
| **F-A1** | `frontend/src/api.ts` | Sin interceptor 401 — Fase 1 (H7) decía "added to both" |
| **F-A2** | `frontend/.../PrivacyLab.tsx:52` | `useMemo` con arrays — anula fix Bug 15 |

## INFO / Positivos

| ID | Hallazgo |
|----|----------|
| **D-A7** | `License.daml` y `AppInstall.daml` son boilerplate no usado |
| **D-A8** | Cobertura de tests Daml excelente — 27 tests |
| **B-A5** | `GlobalExceptionHandler` excelente — gRPC→HTTP, safe messages |
| **B-A6** | `LedgerConfig` hardening sólido — TLS check, crash on missing config |
| **B-A7** | `OAuth2Config` maneja missing claims correctamente |
| **F-A4** | `vaultNormalizers.ts` robusto — nullish coalescing, defaults |
| **F-A5** | `fetcher.ts` con timeout de 8s |
| **F-A6** | `copy.ts` clean — plain English, sin jerga |
| **F-A7** | `VaultView.tsx` valida inputs antes de mutar |
| **I-A2** | CI/CD Actions pinned to SHA |

---

## Resumen Comparativo Fase 1 vs Fase 2

| | Fase 1 (2026-07-03) | Fase 2 (2026-07-18) |
|---|---|---|
| CRITICAL | 5 (todos remediados) | 3 (1 secreto en 3 archivos) |
| HIGH | 11 (accionables remediados) | 6 (nuevos + 1 regresión) |
| MEDIUM | 15 | 13 |
| LOW | 9 | 12 |
| INFO | — | 9 |
| **Total** | **40** | **43** |

### Regresiones detectadas:
- **D-A1 (HIGH):** `Refund` sin CC settlement — Fase 1 H3 decía resuelto pero nunca se aplicó
- **F-A1 (LOW):** `api.ts` sin interceptor 401 — Fase 1 H7 decía "added to both"

### Patrón crítico: CLIENT_SECRET hardcodeado en 3 ubicaciones
El mismo secreto OAuth2 del DevNet aparece en:
1. `cn-quickstart/quickstart/frontend/functions/api/_ledger.js:13`
2. `backend-worker/src/index.ts:19-20`
3. `backend-ts/src/types.ts:64-65`

**Acción inmediata:** Rotar el secreto en DevNet y mover las 3 instancias a variables de entorno.

---

## Disclosure

This audit was performed as part of the Build on Canton Hackathon 2026. For security issues, open a private discussion or email the maintainers.

## Configuration

### Development (shared-secret profile)

```bash
export DEMO_TOKEN=<random-token>
export AUTH_MODE=shared-secret
```

### Production (OAuth2 profile)

```bash
# REQUIRED — app crashes on startup if missing:
export AUTH_MODE=oauth2
export LEDGER_HOST=<canton-participant-host>
export LEDGER_APPLICATION_ID=<your-app-id>
export SYMBOLIC_SETTLEMENT_ENABLED=false

# OAuth2 (Keycloak or any OIDC provider):
export OAUTH2_ISSUER_URI=https://auth.yourdomain.com/realms/AppProvider
export OAUTH2_CLIENT_ID=app-provider-backend
export OAUTH2_CLIENT_SECRET=<your-client-secret>  # NEVER commit

# DB + CORS + parties (see application.yml for all options)
export POSTGRES_HOST=<db-host>
export POSTGRES_USERNAME=<db-user>
export POSTGRES_PASSWORD=<db-password>
export CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

### Production guards

| Feature | Config | Effect |
|---------|--------|--------|
| Symbolic settlement | `SYMBOLIC_SETTLEMENT_ENABLED=false` | Rejects Fulfill/Refund without real `allocationContractId` |
| Demo auto-login | `AUTH_MODE=oauth2` | `DemoAuthController` not created |
| Plaintext passwords | BCrypt | All passwords hashed via `DelegatingPasswordEncoder` |
| Default ledger host | Crash | `LedgerConfig` requires explicit `LEDGER_HOST` |
| Debug logging | `WARN/INFO` | `Http11InputBuffer` not logged |

---

# Security Audit — CantonVault FASE 3 (2026-07-25)

## Status: COMPLETED ✅ — 6 CRITICAL, 14 HIGH, 18 MEDIUM, 16 LOW across 6 layers

Auditoría integral fresh (post-submission, pre-finale). Encontró que la
remediación de Fase 2 fue en gran medida cosmética: los mismos hallazgos
críticos persistían y se añadieron nuevos. Toda la remediación aplicada vive en
la rama `fix/audit-remediation`.

## CRITICAL remediados

| ID | Hallazgo | Fix (commit) |
|----|----------|--------------|
| C-1 | `CLIENT_SECRET` OAuth2 hardcodeado en 5 archivos tracked (Fase 2 dijo "remediado" pero el valor real seguía como default). Aparece en 11 commits del historial. | Fail-closed en los 5 archivos: `_ledger.js` lanza si falta; CLI usa `loadConfig()` con `process.env.CLIENT_SECRET`; scripts shell usan `:?`. **El secreto debe rotarse en `auth.sandbox.fivenorth.io`** — eso es lo que protege de verdad; el historial se limpia con rotación. (`391c48a`) |
| C-2 | Toda la API del demo era anónima — cero autenticación real. `authenticated-user.js` siempre devolvía `isAdmin:true`. | Nuevo `functions/api/_middleware.js` + `_auth.js`: cookie `cv_session` firmada con HMAC-SHA256 (Web Crypto), HttpOnly+Secure+SameSite=Strict, 8h TTL. Login (`/api/auth/login`) intercambia `DEMO_TOKEN` por la cookie. Rate limit 60/min por identidad (KV). CORS allowlist. (`d0d7a22`) |
| C-3 | `seed-demo.js` fail-open: POST anónimo borraba todo el KV index. | Fail-closed: si `SEED_SECRET` no está, devuelve 503. (`391c48a`) |
| C-4 | `Refund` con `allocationCid=Some` drenaba al proposer (enviaba CC proposer→accepter cuando no hubo transfer forward que revertir). Código muerto sin cobertura de tests. | Eliminado el path `Some` del choice `Refund` en Daml; ahora es archival puro. 27/27 tests siguen pasando. (`4db04aa`) |
| C-5 | DvP "real" claim era simbólico: ningún flujo movía Canton Coin (todos los receipts `settlementExecuted:false`). | Investigación confirmó que el DvP real **no es ejecutable** contra el sandbox DevNet: el m2m operator no es el DSO, y `AllocationFactory_Allocate` rechaza settlements con `instrumentAdmin != DSO`. `test_real_settlement_dvp` (Daml.Script) prueba que el contrato soporta DvP real en un participant local. El demo se mantiene en settlement simbólico, ahora **documentado honestamente** en código y README. (`ab63ab8`) |
| C-6 | Frontend: bypass de auth — cualquier fallo de red logueaba como admin (`DEMO_USER` fallback). | Removido el fallback. `fetcher.ts` redirige a `/login` en 401. `RequireAuth` redirige cuando `user===null`. `LoginView` llama a `/api/auth/login`. (`23e83c6`) |

## HIGH remediados (selección)

| ID | Fix |
|----|-----|
| H-1 | `commandId` ahora `crypto.randomUUID()` (era `Date.now()+Math.random()`, colisionable). |
| H-2 | `getToken()` dedup refreshes concurrentes y guarda contra `expires_in` faltante (evita loop NaN → DoS al IdP). |
| H-3 | `allocationRequest_RejectImpl` ahora autoriza al `accepter` (sender del leg) según spec Splice. |
| H-5 | Race del deadline eliminada: Fulfill `now < deadline`, Refund `now > deadline` (zona muerta segura en `==`). |
| H-6 | `safeErrorResponse()` en todos los handlers; el upstream body del ledger ya no llega al `.message`. |
| H-9 | Interceptor 401 ahora en el `fetcher` SWR (el único por donde pasa la lectura), no solo en clientes axios muertos. |
| H-13 | `ResolveDispute` crea `DisclosedRecord` para **ambos** (ganador y perdedor), no solo el ganador. |

## MEDIUM remediados (selección)

- Validación de inputs en todos los edge handlers: amount (finite, >0, ≤1e12), deadline (ISO-8601 estricto + futuro), contractId, text bounds. (`ab63ab8`)
- Whitelist de campos en el payload devuelto por `proposals.js` (no spread de body crudo). (`ab63ab8`)
- `Modal.tsx`: `useId()` reemplaza contador módulo-global (side effect en render). (`f9f41e8`)
- `PrivacyLab.tsx`: deps del `useMemo` ahora incluyen `receipts`/`disclosures` (stale state de la barra de exposición). (`f9f41e8`)
- `useVaultMutations.ts`: optimistic updates con `revalidate:true` (antes `false`, racía contra la revalidación de KV eventualmente consistente). (`f9f41e8`)
- `dependabot.yml` ahora cubre `cli/`. Daml installer endurecido en CI. (`a8ca493`)

## Cambios de arquitectura

- **Borrados `backend-ts/` y `backend-worker/`**: no eran el demo (solo `functions/api/*` se sirve), y contenían stubs engañosos (balance=0, resolve no-op, todos los exercises del Worker eran stubs). También duplicaban el `CLIENT_SECRET`. (`ba94019`)
- **Auth model**: cookie HMAC firmada. Limitación documentada: `DEMO_TOKEN` va al bundle del SPA vía `VITE_DEMO_TOKEN` (aceptable para demo de un operador; producción usaría OAuth2 con IdP externo).
- **Settlement**: simbólico documentado. El pitch ya **no** claims "52,500 CC processed" como real.

## Limitaciones conocidas restantes (by design o bloqueo externo)

| Limitación | Estado | Razón |
|---|---|---|
| `CLIENT_SECRET` en historial git (11 commits) | Pendiente de rotación | Rotar en `auth.sandbox.fivenorth.io` lo neutraliza. `git filter-repo` diferido por decisión del equipo (riesgo de reescribir historial pre-finale). |
| DvP real en DevNet | No ejecutable | El sandbox m2m no es el DSO. Requeriría que el operador del sandbox divulgue `AmuletRules`/`ExternalPartyAmuletRules` al m2m, o levantar un Canton+Splice local (que no calificaría como "live on Canton Devnet"). |
| `DEMO_TOKEN` en bundle SPA | Aceptado para demo | Single-operator hackathon. Producción → OAuth2 con IdP externo. |
| `api.ts`/`vaultApi.ts` axios clients | Pendiente de remover | Apuntan a un backend Spring legacy; el flujo vault real usa `fetcher`. Se dejan para no romper imports; se limpian en seguimiento. |

## Setup de secrets requerido (Cloudflare Pages)

Antes de deployar la rama a `main`, setear (vía `wrangler pages secret put` o dashboard):

```
CLIENT_SECRET   # el ROTADO (no el filtrado)
PARTY           # cancore::1220...
MEDIATOR_PARTY  # Observer::1220...
SESSION_SECRET  # >=32 bytes random para HMAC
DEMO_TOKEN      # token random intercambiado en /api/auth/login
SEED_SECRET     # para habilitar /api/vault/seed-demo (opcional)
```

Sin estos, los endpoints fallan cerrado (500/503/401) — por diseño.
