# CantonVault — Plan de Auditoría Integral (Full-Stack Security Audit)

**Fecha:** 2026-07-18
**Estado:** Plan listo — ejecución pendiente para próxima sesión
**Alcance:** Auditoría completa de seguridad, código, y buenas prácticas
**Referencia:** SECURITY.md (Fase 1 — 40 findings, 2026-07-03)

> **LEER ESTO PRIMERO al iniciar la próxima sesión.** Este documento contiene
> el plan de auditoría completo, organizado por capas en orden lógico (bottom-up).
> No requiere brainstorming adicional — ejecutar cada capa en orden.

---

## 1. Resumen Ejecutivo

CantonVault es un protocolo de selective disclosure para finanzas institucionales
sobre Canton Network. La Fase 1 de auditoría (2026-07-03) encontró 40 hallazgos
(5 CRITICAL, 11 HIGH, 15 MEDIUM, 9 LOW) — todos los CRITICAL y HIGH accionables
fueron remediados. Esta Fase 2 es una auditoría fresh completa que cubre todo el
stack, incluyendo el código nuevo de la UX redesign (8 fases) y la cross-pollination
de AgentShield (7 features nuevos).

### Objetivos

1. **Verificar que los fixes de la Fase 1 siguen en pie** — no regresiones
2. **Auditar el código nuevo** — ~15 archivos modificados/creados desde el último audit
3. **Revisar la capa serverless (CF Functions)** — no estaba en la Fase 1
4. **Evaluar infraestructura y secretos** — hardcoded credentials, CI/CD, Docker
5. **Producir un reporte consolidado** con hallazgos, severidades, y fixes recomendados

### Metodología

- **Revisión manual** de cada archivo (no herramientas automatizadas — el proyecto es pequeño)
- **Severidad**: CRITICAL > HIGH > MEDIUM > LOW > INFO
- **Criterios**: OWASP Top 10, Canton-specific privacy model, WCAG, OAuth2 best practices
- **Formato por hallazgo**: ID, archivo, línea, severidad, descripción, evidencia, fix

---

## 2. Alcance por Capa

### Capa 1: Daml Smart Contracts
**Prioridad:** CRÍTICA — define la lógica de negocio y privacidad

| Archivo | Líneas | Qué revisar |
|---------|--------|-------------|
| `daml/licensing/daml/Vault/CommitmentProposal.daml` | ~80 | Propose/Accept/Reject, validación de deadline, signatories |
| `daml/licensing/daml/Vault/CommitmentContract.daml` | ~200 | Fulfill, RaiseDispute, Refund, AllocationRequest, privacidad |
| `daml/licensing/daml/Vault/Disclosable.daml` | ~30 | Interfaz de disclosure, selectividad |
| `daml/licensing/daml/Vault/SettlementReceipt.daml` | ~30 | Inmutabilidad, evidencia de settlement |
| `daml/licensing/daml/Licensing/License.daml` | ~100 | Boilerplate — verificar si se usa |
| `daml/licensing/daml/Licensing/AppInstall.daml` | ~50 | Boilerplate — verificar si se usa |
| `daml/licensing/daml/Licensing/Util.daml` | ~20 | Utilidades |
| `daml/licensing-tests/daml/Vault/CommitmentTest.daml` | ~400 | 27 tests — cobertura, edge cases |
| `daml/licensing-tests/daml/Vault/DisclosureTest.daml` | ~100 | Tests de disclosure |

**Checklist de auditoría Daml:**
- [ ] Signatories y observers correctos en cada template (¿quién ve qué?)
- [ ] `Disclosable` interface — ¿el tercero solo ve amount + description?
- [ ] `AllocationRequest` implementation — ¿validación de allocation contra términos?
- [ ] `Refund` con `allocationCid` — ¿reverse CC transfer funciona?
- [ ] `RaiseDispute` — ¿tercero se convierte en observer correctamente?
- [ ] `ResolveDispute` — ¿controller es thirdParty (mediator)?
- [ ] `deadline > now` validation en Accept — ¿no se aceptan propuestas vencidas?
- [ ] `Status` enum — ¿ya se eliminó? (C5 de Fase 1)
- [ ] Coverage de tests — ¿todos los paths felices y tristes?
- [ ] Edge cases: double-fulfill, double-dispute, refund después de fulfill
- [ ] Dependencias Splice (`splice-api-token-*`) — ¿versiones correctas?
- [ ] `ensure` preconditions — ¿hay alguna que pueda causar denial of service?

---

### Capa 2: Backend Java/Spring Boot
**Prioridad:** ALTA — capa de autoridad para auth y comunicación con Canton

| Archivo | Líneas | Qué revisar |
|---------|--------|-------------|
| `security/Auth.java` | ~50 | Flujo de autenticación |
| `security/AuthConfig.java` | ~30 | Configuración de auth |
| `security/SharedSecretConfig.java` | ~40 | Demo auth — ¿BCrypt? ¿{noop}? |
| `security/oauth2/AuthService.java` | ~60 | OAuth2 flow |
| `security/oauth2/OAuth2Config.java` | ~50 | Config OAuth2 |
| `security/oauth2/OAuth2AuthenticationSuccessHandler.java` | ~40 | Post-login |
| `security/oauth2/OAuth2ClientRegistrationRepository.java` | ~50 | Client registration |
| `security/PartyAuthority.java` | ~30 | Autorización por party |
| `security/TenantAuthority.java` | ~30 | Tenant authority |
| `security/TokenProvider.java` | ~20 | Interface token |
| `security/StaticTokenProvider.java` | ~30 | Token estático |
| `security/AuthenticatedPartyProvider.java` | ~30 | Party del usuario |
| `security/AuthenticatedUserProvider.java` | ~30 | Usuario autenticado |
| `config/SecurityConfig.java` | ~60 | Spring Security config |
| `config/LedgerConfig.java` | ~30 | Conexión a Canton |
| `config/PostgresConfig.java` | ~30 | Conexión a DB |
| `config/CorsConfig.java` | ~30 | CORS |
| `config/VaultPartyProperties.java` | ~20 | Party IDs |
| `ledger/LedgerApi.java` | ~80 | gRPC/HTTP a Canton |
| `ledger/TokenStandardProxy.java` | ~50 | Splice token proxy |
| `repository/DamlRepository.java` | ~100 | Acceso a datos Daml |
| `repository/TenantPropertiesRepository.java` | ~50 | Tenant store |
| `service/CommitmentController.java` | ~200 | Endpoints REST del vault |
| `service/GlobalExceptionHandler.java` | ~40 | Manejo de errores |
| `service/AdminApiImpl.java` | ~50 | Admin endpoints |
| `pqs/Pqs.java` | ~50 | Participant Query Store |
| `pqs/JdbcDataSource.java` | ~30 | Data source JDBC |
| `App.java` | ~30 | Entry point |

**Checklist de auditoría Backend:**
- [ ] `SecurityAutoConfiguration` — ¿ya NO está excluida globalmente? (P1 Fase 1)
- [ ] `SharedSecretConfig` — ¿usa BCrypt/DelegatingPasswordEncoder? (P2 Fase 1)
- [ ] `DEMO_TOKEN` — ¿endpoint 404 si no está configurado? (C1 Fase 1)
- [ ] `SYMBOLIC_SETTLEMENT_ENABLED` — ¿rechaza Fulfill sin allocation? (P3 Fase 1)
- [ ] `LedgerConfig` — ¿crash si LEDGER_HOST no configurado? (P10 Fase 1)
- [ ] `CommitmentController` — ¿validación de inputs en todos los endpoints?
- [ ] `CommitmentController` — ¿autorización por party (el usuario solo ve sus contracts)?
- [ ] `GlobalExceptionHandler` — ¿no expone stack traces al cliente?
- [ ] `CorsConfig` — ¿orígenes permitidos son restrictivos?
- [ ] `OAuth2Config` — ¿client secret no está hardcodeado?
- [ ] `DamlRepository` — ¿inyección de parámetros? ¿SQL injection vía PQS?
- [ ] `TokenStandardProxy` — ¿validación de allocation antes de transferir?
- [ ] `LedgerApi` — ¿timeout? ¿retry? ¿manejo de errores gRPC?
- [ ] `PostgresConfig` — ¿credenciales por env vars, no hardcodeadas?
- [ ] `App.java` — ¿perfiles Spring (dev vs prod)?
- [ ] Logging — ¿niveles correctos? ¿no se loguean secrets ni tokens?

---

### Capa 3: Frontend React/TypeScript
**Prioridad:** ALTA — interfaz de usuario, manejo de estado, mutations

| Archivo | Líneas | Qué revisar |
|---------|--------|-------------|
| **Stores** | | |
| `stores/vaultStore.tsx` | ~200 | FACADE — estado global del vault |
| `stores/userStore.tsx` | ~50 | FACADE — autenticación |
| `stores/toastStore.tsx` | ~80 | Toast notifications + LedgerProof |
| `stores/vaultApi.ts` | ~30 | Axios instance |
| **Hooks** | | |
| `hooks/useAuth.ts` | ~60 | SWR auth hooks |
| `hooks/useVaultData.ts` | ~120 | SWR reads (proposals, commitments, etc.) |
| `hooks/useVaultMutations.ts` | ~200 | SWR mutations + seed-demo |
| **Lib** | | |
| `lib/copy.ts` | ~80 | Microcopy dictionary (~50 strings) |
| `lib/fetcher.ts` | ~20 | SWR fetcher (8s timeout) |
| `lib/vaultNormalizers.ts` | ~80 | Raw JSON → typed domain models |
| **Components** | | |
| `components/Modal.tsx` | ~80 | Portal modal (focus trap, Esc) |
| `components/Header.tsx` | ~60 | Top nav + balance |
| `components/RequireAuth.tsx` | ~30 | Client-side auth guard |
| `components/ToastNotification.tsx` | ~80 | Toast UI + privacy proof |
| `components/vault/VaultHeader.tsx` | ~80 | Title + party chip + seed button |
| `components/vault/Stepper.tsx` | ~50 | 3-step macro navigator |
| `components/vault/ConfirmModal.tsx` | ~80 | Confirmation before irreversible actions |
| `components/vault/VaultActionModals.tsx` | ~150 | Fulfill, Refund, Dispute, Resolve modals |
| `components/vault/CopyCidButton.tsx` | ~30 | Copy contract ID |
| `components/vault/TechnicalDetails.tsx` | ~60 | Collapsible debug panel |
| `components/vault/act/ActStep.tsx` | ~50 | Orchestrator: commitments + disputes |
| `components/vault/act/CommitmentCard.tsx` | ~200 | Status-first card + timeline + badges |
| `components/vault/act/DisputeCard.tsx` | ~80 | Escalation card |
| `components/vault/act/PrivacyTimeline.tsx` | ~100 | 🆕 Horizontal lifecycle journey |
| `components/vault/privacy/PrivacyLab.tsx` | ~200 | 🆕 4-column split-screen + Competitor View |
| `components/vault/privacy/PrivacyExposureBar.tsx` | ~80 | 🆕 4-stage exposure indicator |
| `components/vault/privacy/SettlementReceipts.tsx` | ~60 | Payment receipts list |
| `components/vault/propose/ProposeWizard.tsx` | ~100 | 4-screen wizard orchestrator |
| `components/vault/propose/WizardStepDescription.tsx` | ~50 | Step 1 |
| `components/vault/propose/WizardStepAmount.tsx` | ~60 | Step 2 |
| `components/vault/propose/WizardStepParties.tsx` | ~80 | Step 3 |
| `components/vault/propose/WizardStepReview.tsx` | ~80 | Step 4 |
| **Views** | | |
| `views/VaultView.tsx` | ~175 | Shell — routing + modals |
| `views/LoginView.tsx` | ~60 | Login page |
| `views/LandingView.tsx` | ~80 | Landing page |
| **Styles** | | |
| `styles/tokens.css` | ~100 | Design tokens (primitivos + semánticos) |
| `styles/base.css` | ~80 | Bootstrap overrides, glass-panel |
| `styles/vault.css` | ~200 | cv-* classes + exposure bar + timeline |
| **Utils** | | |
| `utils/format.ts` | ~40 | CC formatting |
| `utils/error.ts` | ~30 | Error mapping |
| `utils/party.ts` | ~30 | Party ID helpers |
| `utils/duration.ts` | ~20 | Duration formatting |
| `utils/commandId.ts` | ~20 | Command ID generation |
| **API** | | |
| `api.ts` | ~60 | Global API client + 401 interceptor |

**Checklist de auditoría Frontend:**
- [ ] `vaultApi.ts` — ¿401 interceptor global? (H7 Fase 1)
- [ ] `api.ts` — ¿401 interceptor global? (H7 Fase 1)
- [ ] `useVaultMutations.ts` — ¿validación de inputs antes de enviar?
- [ ] `useVaultMutations.ts` — ¿manejo de errores con mensajes user-safe? (F-07 Fase 1)
- [ ] `useVaultMutations.ts` — `seedDemoData()` — ¿maneja errores de red?
- [ ] `vaultStore.tsx` — ¿estado de loading/error por cada operación?
- [ ] `toastStore.tsx` — ¿`LedgerProof` incluye `privacy` string?
- [ ] `ToastNotification.tsx` — ¿sanitización de datos antes de mostrar?
- [ ] `CommitmentCard.tsx` — ¿`currentStage` useMemo con dependencias primitivas? (Bug 15)
- [ ] `PrivacyLab.tsx` — ¿4-column grid responsive? ¿col-lg-3 correcto?
- [ ] `PrivacyExposureBar.tsx` — ¿colores accesibles (WCAG AA)?
- [ ] `ProposeWizard.tsx` — ¿validación en cada step antes de avanzar?
- [ ] `WizardStepAmount.tsx` — ¿`Math.max(0, ...)` guard? (F-06 Fase 1)
- [ ] `WizardStepParties.tsx` — ¿pre-select de defaults cuando SWR carga? (Bug 12)
- [ ] `ConfirmModal.tsx` — ¿focus trap funciona? ¿Esc cierra?
- [ ] `Modal.tsx` — ¿portal rendering? ¿focus management?
- [ ] `RequireAuth.tsx` — ¿redirige a login si no autenticado? (H6 Fase 1)
- [ ] `VaultView.tsx` — ¿estado `seeding` + `isEmpty` lógica correcta?
- [ ] `copy.ts` — ¿todas las strings de jerga→humano están mapeadas?
- [ ] `vaultNormalizers.ts` — ¿maneja datos malformados sin crashear?
- [ ] `fetcher.ts` — ¿timeout de 8s adecuado? ¿retry?
- [ ] `vault.css` — ¿`@media (prefers-reduced-motion: reduce)` para animaciones?
- [ ] `vault.css` — ¿contraste WCAG AA/AAA en todos los badges?
- [ ] `tokens.css` — ¿design tokens son la única fuente de verdad?
- [ ] `utils/format.ts` — ¿formato de CC correcto (6 decimales)?
- [ ] `utils/error.ts` — ¿user-safe messages por HTTP status?
- [ ] `api.ts` — ¿no expone tokens en logs?
- [ ] `openapi.d.ts` — ¿tipos actualizados con los nuevos endpoints?

---

### Capa 4: Serverless Functions (Cloudflare Pages Functions)
**Prioridad:** CRÍTICA — capa de comunicación con Canton Ledger, maneja secrets

| Archivo | Líneas | Qué revisar |
|---------|--------|-------------|
| `functions/api/_ledger.js` | 308 | 🚨 **CLIENT_SECRET hardcodeado** (línea 13), auth, Canton 3.5 API |
| `functions/api/health.js` | ~15 | Health check |
| `functions/api/authenticated-user.js` | ~20 | User info |
| `functions/api/login-links.js` | ~30 | Login links |
| `functions/api/logout.js` | ~15 | Logout |
| `functions/api/vault/balance.js` | ~30 | Balance via Splice Validator API |
| `functions/api/vault/parties.js` | ~20 | List parties |
| `functions/api/vault/proposals.js` | ~40 | GET/POST proposals |
| `functions/api/vault/proposals/[id]/accept.js` | ~40 | Accept proposal |
| `functions/api/vault/proposals/[id]/reject.js` | ~30 | Reject proposal |
| `functions/api/vault/commitments.js` | ~30 | List commitments |
| `functions/api/vault/commitments/[id]/fulfill.js` | ~50 | Fulfill (CC settlement) |
| `functions/api/vault/commitments/[id]/raise-dispute.js` | ~50 | Raise dispute |
| `functions/api/vault/commitments/[id]/refund.js` | ~40 | Refund |
| `functions/api/vault/commitments/[id]/resolve.js` | ~50 | Resolve dispute |
| `functions/api/vault/receipts.js` | ~20 | List receipts |
| `functions/api/vault/disclosures.js` | ~20 | List disclosures |
| `functions/api/vault/dispute-cases.js` | ~20 | List dispute cases |
| `functions/api/vault/seed-demo.js` | ~100 | 🆕 Demo data seeder |

**Checklist de auditoría Serverless:**
- [ ] 🚨 `_ledger.js:13` — `CLIENT_SECRET` hardcodeado en plaintext → **CRITICAL**
- [ ] 🚨 `_ledger.js:11` — `CLIENT_ID` hardcodeado → **HIGH**
- [ ] 🚨 `_ledger.js:14` — `PARTY` ID hardcodeado → **MEDIUM**
- [ ] 🚨 `_ledger.js:22` — `MEDIATOR_PARTY` ID hardcodeado → **MEDIUM**
- [ ] `_ledger.js` — `getToken()` — ¿token cache en variable global? ¿race conditions?
- [ ] `_ledger.js` — `buildCommandEnvelope()` — ¿`commandId` es unique? ¿`Date.now()` suficiente?
- [ ] `_ledger.js` — `extractCreatedContractId()` — ¿maneja `templateFilter` correctamente?
- [ ] `_ledger.js` — `queryActiveContracts()` — ¿siempre retorna array?
- [ ] `_ledger.js` — `walletBalance()` — ¿maneja errores del Validator API?
- [ ] `_ledger.js` — `kvPut()` — ¿sobrescribe idempotentemente?
- [ ] `_ledger.js` — `kvList()` — ¿N+1 queries? ¿límite de KV keys?
- [ ] `_ledger.js` — `kvListAsContracts()` — ¿formato consistente con frontend?
- [ ] `seed-demo.js` — ¿IDs determinísticos? (Bug 13)
- [ ] `seed-demo.js` — ¿cleanup de entries viejos antes de escribir?
- [ ] `seed-demo.js` — ¿4 escenarios cubren todos los lifecycle stages? (Bug 14)
- [ ] `seed-demo.js` — ¿rate limiting? ¿quién puede llamar este endpoint?
- [ ] `proposals.js` — ¿validación de body? ¿campos requeridos?
- [ ] `proposals/[id]/accept.js` — ¿verifica que la proposal existe y está pending?
- [ ] `commitments/[id]/fulfill.js` — ¿valida allocationCid?
- [ ] `commitments/[id]/raise-dispute.js` — ¿`extraActAs` para mediator? (Bug 11)
- [ ] `commitments/[id]/resolve.js` — ¿`extraActAs` para mediator? (Bug 10)
- [ ] `commitments/[id]/resolve.js` — ¿`templateFilter` para multi-create? (Bug 7 y 9)
- [ ] Auth en cada endpoint — ¿verifica que el usuario está autenticado?
- [ ] Error handling — ¿mensajes de error no exponen detalles internos?
- [ ] CORS headers — ¿configurados correctamente?
- [ ] Rate limiting — ¿protección contra abuso?
- [ ] `wrangler.toml` — ¿KV binding configurado? ¿env vars?

---

### Capa 4b: Backend Services TypeScript (Express + Cloudflare Worker)
**Prioridad:** MEDIA — servicios auxiliares de backend

| Archivo | Líneas | Qué revisar |
|---------|--------|-------------|
| `backend-ts/src/server.ts` | ~80 | Express server, rutas, middleware |
| `backend-ts/src/auth.ts` | ~40 | Autenticación |
| `backend-ts/src/devnet-client.ts` | ~50 | Cliente Canton DevNet |
| `backend-ts/src/types.ts` | ~20 | Tipos compartidos |
| `backend-worker/src/index.ts` | ~40 | Cloudflare Worker entry point |

**Checklist de auditoría Backend Services:**
- [ ] `backend-ts/src/server.ts` — ¿endpoints expuestos? ¿rate limiting?
- [ ] `backend-ts/src/auth.ts` — ¿mismos secrets que _ledger.js? ¿duplicación?
- [ ] `backend-ts/src/devnet-client.ts` — ¿conexión a Canton? ¿manejo de errores?
- [ ] `backend-worker/src/index.ts` — ¿qué hace este worker? ¿expone endpoints?
- [ ] `backend-ts/package.json` — ¿dependencias actualizadas? ¿vulnerabilidades?
- [ ] `backend-worker/package.json` — ¿dependencias actualizadas?

---

### Capa 5: Infraestructura & DevOps
**Prioridad:** MEDIA — deploy, secretos, CI/CD

| Archivo | Qué revisar |
|---------|-------------|
| `compose.yaml` | Docker services, ports, env vars, volúmenes |
| `compose.prod.yaml` | Producción vs dev |
| `docker/` | Dockerfiles, entrypoints |
| `.circleci/config.yml` | CI/CD pipeline |
| `.github/workflows/daml-test.yml` | GitHub Actions |
| `wrangler.toml` | Cloudflare Workers config |
| `.env` / `.env.local` | Env vars locales |
| `.gitignore` | ¿Secretos excluidos? |
| `Makefile` | Build targets |
| `run-localnet.sh` | Local network script |
| `sync-network.sh` | Network sync |
| `PRODUCTION.md` | Guía de deploy |

**Checklist de auditoría Infra:**
- [ ] `compose.yaml` — ¿Docker containers corren como non-root? (H8 Fase 1)
- [ ] `compose.yaml` — ¿puertos expuestos solo los necesarios?
- [ ] `compose.yaml` — ¿credenciales por env vars, no hardcodeadas?
- [ ] `compose.prod.yaml` — ¿diferencias con dev? ¿seguridad adicional?
- [ ] `.circleci/config.yml` — ¿actions pinned a SHA? (C3 Fase 1)
- [ ] `.circleci/config.yml` — ¿`permissions: contents: read`?
- [ ] `.circleci/config.yml` — ¿secretos en variables de entorno, no en el yaml?
- [ ] `.github/workflows/daml-test.yml` — ¿pinned? ¿permissions?
- [ ] `wrangler.toml` — ¿KV namespace ID? ¿compatible_date?
- [ ] `.env` / `.env.local` — ¿en .gitignore? ¿excluidos del repo?
- [ ] `.gitignore` — ¿cubre `cn-quickstart/**` para secretos? (P4-P8 Fase 1)
- [ ] `.gitignore` — ¿node_modules, dist, .gradle?
- [ ] `PRODUCTION.md` — ¿instrucciones de deploy actualizadas?
- [ ] `Makefile` — ¿targets documentados?
- [ ] `run-localnet.sh` — ¿puertos? ¿dependencias?
- [ ] `backend-ts/` — ¿Dockerfile no-root? ¿package.json actualizado?
- [ ] `backend-worker/` — ¿wrangler.toml config correcto?
- [ ] Cloudflare Pages — ¿build config? ¿environment variables?
- [ ] DevNet — ¿faucet URL? ¿network config?

---

### Capa 6: Consolidación & Cross-Cutting Concerns
**Prioridad:** MEDIA — reporte final, documentación

**Checklist de consolidación:**
- [ ] Clasificar todos los hallazgos por severidad (CRITICAL > HIGH > MEDIUM > LOW > INFO)
- [ ] Verificar que no hay duplicados con la Fase 1 (SECURITY.md)
- [ ] Identificar hallazgos que son regresiones de fixes anteriores
- [ ] Priorizar fixes: ¿qué se debe arreglar antes del deadline (19 jul)?
- [ ] Actualizar `SECURITY.md` con los nuevos hallazgos
- [ ] Actualizar `SESSION_HANDOFF.md` con el resumen de la auditoría
- [ ] Crear `AUDIT_REPORT.md` con el reporte completo (o actualizar SECURITY.md)
- [ ] Documentar lecciones aprendidas (bugs encontrados, patrones)
- [ ] Verificar consistencia de tipos entre capas (Daml ↔ Java ↔ TS)

---

## 3. Hallazgos Preliminares (identificados durante el planning)

Estos se detectaron durante la exploración del código para hacer el plan.
Se incluyen aquí como punto de partida para la auditoría detallada.

### 🚨 CRITICAL

| ID | Archivo | Línea | Hallazgo |
|----|---------|-------|----------|
| **A-C1** | `functions/api/_ledger.js` | 13 | `CLIENT_SECRET` hardcodeado en plaintext: `'r69FQmevLRwEgMB8NnKaSDHPewTOSx7Yy5jucsqAlmsAaJc3DlggedCz4tyyonl4W2WoOVzkUIjy8dHTlc16AOJQzx02QzJylAUG56oLTCoVCJUUK40vRv9CqQEY3fjn'` — esto es un secreto de producción OAuth2 expuesto en el código fuente. Debe moverse a `env.SECRET` de Cloudflare ( binding [`wrangler.toml`](https://developers.cloudflare.com/workers/configuration/secrets/) o `context.env`). El cliente M2M de DevNet tiene este secret rotable, pero el principio es el mismo: nunca hardcodear secrets. |

### 🔴 HIGH

| ID | Archivo | Línea | Hallazgo |
|----|---------|-------|----------|
| **A-H1** | `functions/api/_ledger.js` | 11 | `CLIENT_ID` hardcodeado: `'validator-devnet-m2m'` — aunque es un ID público, hardcodearlo dificulta la rotación y el multi-entorno. |
| **A-H2** | `functions/api/_ledger.js` | 4 | `LEDGER_API` URL hardcodeada: `'https://ledger-api.validator.devnet.sandbox.fivenorth.io'` — debería ser una variable de entorno para soportar múltiples entornos (DevNet, LocalNet, TestNet). |
| **A-H3** | `functions/api/_ledger.js` | 14 | `PARTY` ID hardcodeado: `'cancore::1220a14ca...'` — la party ID es específica del entorno y debería ser configurable. |

### 🟡 MEDIUM

| ID | Archivo | Línea | Hallazgo |
|----|---------|-------|----------|
| **A-M1** | `functions/api/_ledger.js` | 27 | `tokenCache` en variable global de módulo — en Cloudflare Workers, el estado global se comparte entre requests. Si el token expira durante una ráfaga de requests, múltiples requests pueden intentar refrescar el token simultáneamente (race condition). |
| **A-M2** | `functions/api/_ledger.js` | 93 | `commandId` generado con `Date.now() + Math.random()` — en teoría podría colisionar si dos requests llegan en el mismo milisegundo. Usar `crypto.randomUUID()` sería más robusto. |
| **A-M3** | `functions/api/_ledger.js` | 275-289 | `kvList()` hace N+1 queries (una `list()` + una `get()` por cada key). Para el demo con ~10 entries no es problema, pero no escala. |

---

## 4. Orden de Ejecución

La auditoría se ejecuta en la próxima sesión en este orden:

```
Capa 1 (Daml) → Capa 2 (Backend Java) → Capa 3 (Frontend) → Capa 4 (Serverless) → Capa 5 (Infra) → Capa 6 (Consolidación)
```

**Tiempo estimado:** 2-3 horas de revisión manual + 1 hora de documentación.

### Paso a paso:

1. **Capa 1 (Daml)** — 30 min — revisar los 5 templates + tests
2. **Capa 2 (Backend Java)** — 30 min — revisar auth, controller, config
3. **Capa 3 (Frontend React/TS)** — 45 min — revisar stores, hooks, componentes, estilos
4. **Capa 4 (Serverless)** — 30 min — revisar _ledger.js y todos los endpoints
5. **Capa 5 (Infra)** — 15 min — revisar Docker, CI/CD, secretos
6. **Capa 6 (Consolidación)** — 30 min — clasificar, priorizar, documentar

### Outputs:
- `SECURITY.md` actualizado con hallazgos de Fase 2
- `SESSION_HANDOFF.md` actualizado con resumen
- `AUDIT_REPORT.md` (opcional) — reporte detallado si hay >20 hallazgos nuevos

---

## 5. Notas para la Próxima Sesión

### Contexto que necesitas saber:
- El deadline del hackathon es **19 julio medianoche** (~24 horas desde ahora)
- El demo está funcional en producción: https://canton-vault.pages.dev
- Quedan por hacer: videos (pitch + demo), Google Form submission
- Hay 15 bugs documentados en SESSION_HANDOFF.md (todos resueltos)
- La Fase 1 de auditoría (SECURITY.md) ya está cerrada

### Archivos modificados desde el último audit (git status):
```
M SESSION_HANDOFF.md
M cn-quickstart/quickstart/frontend/src/components/ToastNotification.tsx
M cn-quickstart/quickstart/frontend/src/components/vault/VaultHeader.tsx
M cn-quickstart/quickstart/frontend/src/components/vault/act/CommitmentCard.tsx
M cn-quickstart/quickstart/frontend/src/components/vault/privacy/PrivacyLab.tsx
M cn-quickstart/quickstart/frontend/src/hooks/useVaultMutations.ts
M cn-quickstart/quickstart/frontend/src/lib/copy.ts
M cn-quickstart/quickstart/frontend/src/stores/toastStore.tsx
M cn-quickstart/quickstart/frontend/src/stores/vaultStore.tsx
M cn-quickstart/quickstart/frontend/src/styles/vault.css
M cn-quickstart/quickstart/frontend/src/views/VaultView.tsx
?? cn-quickstart/quickstart/frontend/functions/api/vault/seed-demo.js
?? cn-quickstart/quickstart/frontend/src/components/vault/act/PrivacyTimeline.tsx
?? cn-quickstart/quickstart/frontend/src/components/vault/privacy/PrivacyExposureBar.tsx
```

### Comandos para empezar:
```bash
cd "/Users/munay/dev/Build on Canton Hackathon"
# Ver estado actual
git status
git log --oneline -5

# TypeScript check
cd cn-quickstart/quickstart/frontend && npx tsc --noEmit

# Correr tests Daml
cd cn-quickstart/quickstart && daml test --package-root daml/licensing-tests
```

---

## 6. Self-Review del Plan

### Placeholder scan:
- ✅ No hay TBDs ni TODOs
- ✅ Todas las secciones están completas

### Internal consistency:
- ✅ Las 6 capas cubren todo el stack sin gaps
- ✅ Los hallazgos preliminares son consistentes con la severidad asignada
- ✅ El orden de ejecución es lógico (bottom-up)

### Scope check:
- ✅ El scope es completo pero manejable (~55 archivos frontend, ~44 backend, ~9 Daml, ~19 serverless)
- ✅ No requiere descomposición adicional

### Ambiguity check:
- ✅ Los criterios de severidad están definidos
- ✅ Cada capa tiene un checklist concreto
- ✅ Los hallazgos preliminares tienen archivo, línea, y descripción específica

---

> **Próximo paso:** Ejecutar la auditoría capa por capa en el orden definido.
> No requiere brainstorming adicional — empezar por la Capa 1 (Daml).