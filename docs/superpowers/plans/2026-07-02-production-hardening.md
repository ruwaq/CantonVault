# Plan de Hardening para Producción — CantonVault

> **Para la próxima sesión.** Este plan corrige todos los hallazgos de la auditoría del 2026-07-02.
> Cada tarea tiene: ubicación exacta, qué cambiar, código de ejemplo, y verificación.
> **Ordenado por prioridad (P0 = antes del hackathon, P1 = post-entrega, P2 = producción real).**
>
> Auditoría completa: ver `docs/DECISION-LOG.md` entrada 2026-07-02 (auditoría).
>
> ⚠️ **REGLA CRÍTICA DEL `.gitignore`**: este repo usa un patrón **allowlist** para `cn-quickstart/**`.
> **Cada archivo NUEVO que crees en `cn-quickstart/` DEBE añadirse al `.gitignore`** o no se trackeará.
> Los archivos que solo EDITAS (ya trackeados) no necesitan esto.

---

## Resumen ejecutivo del estado actual

| Dimensión | Nota | Acción |
|---|---|---|
| Arquitectura Daml | A | No tocar (privacidad por diseño, correcta) |
| Tests Daml | B+ | Añadir tests de fallo + settlement real |
| Backend | C+ | Validación, CSRF, error handler, tests |
| Frontend | B- | Quitar `any`, fix stale closure, focus trap |
| Seguridad | D | 4 fixes críticos (creds, CSRF, stacktrace, validación) |
| CI/CD | C- | Añadir jobs de frontend + backend test |

**No hay que borrar ni reconstruir nada.** El código está bien organizado. Solo endurecer.

---

# P0 — QUICK WINS ANTES DEL HACKATHAN (deadline 13 Jul 2026)

> Objetivo: subir credibilidad del proyecto sin romper lo que funciona.
> Tiempo estimado total: ~3-4 horas. **Orden recomendado: P0.1 → P0.2 → P0.3 → P0.4 → P0.5.**

---

## P0.1 — Corregir la claim falsa "zero any" del frontend

**Motivo:** El HANDOFF y SUBMISSION_CHECKLIST dicen "zero `any`". La auditoría encontró **10 `any`** reales. Esto daña la credibilidad si un juez revisa el código.

**Archivos a editar (ya trackeados, no necesitan `.gitignore`):**

### `frontend/src/stores/vaultStore.tsx:195,202`
```tsx
// ANTES:
const cidOf = (item: any): string =>
function toContracts<T>(rawList: any[], normalize: (raw: any) => T): VaultContract<T>[]

// DESPUÉS: definir una interfaz para el contrato crudo del backend
interface RawContract {
  contractId: string;
  payload: Record<string, unknown>;
}
const cidOf = (item: RawContract): string =>
function toContracts<T>(rawList: RawContract[], normalize: (raw: RawContract) => T): VaultContract<T>[]
```

### `frontend/src/utils/error.ts:12,25,27,28,35`
```ts
// ANTES:
return typeof (err as any)?.isAxiosError === 'boolean';
const anyErr = err as any;

// DESPUÉS: usar el type guard oficial de axios
import { isAxiosError, type AxiosError } from 'axios';

export function isAxiosErr(err: unknown): err is AxiosError {
  return isAxiosError(err);
}

export function extractError(err: unknown): { status?: number; message: string } {
  if (isAxiosError(err)) {
    return { status: err.response?.status, message: err.response?.data?.message ?? err.message ?? 'Unexpected error' };
  }
  if (err instanceof Error) return { message: err.message };
  return { message: 'Unexpected error' };
}
// Eliminar el `any[]` del wrap<T extends (...args: any[]) => Promise<any>> → usar unknown[]
function wrap<T extends (...args: unknown[]) => Promise<unknown>>(
```

### `frontend/src/api.ts:8`
```ts
// ANTES:
definition: openApi as any,

// DESPUÉS: tipar el documento OpenAPI
import type { OpenAPIRouterConfig } from '@asteasolutions/zod-to-openapi';
definition: openApi,  // eliminar el cast; añadir tipo al objeto openApi si es necesario
```
> Si el tipo no encaja limpio, al menos sustituir `as any` por `as unknown as ExpectedType` para no perder el check.

### `frontend/src/stores/userStore.tsx:37`
```ts
// ANTES:
if ((error as any)?.response?.status === 401) {

// DESPUÉS:
import { isAxiosError } from 'axios';
if (isAxiosError(error) && error.response?.status === 401) {
```

### `frontend/src/stores/tenantRegistrationStore.tsx:54`
```ts
// ANTES:
const created = (response as any)?.data as TenantRegistration | undefined;

// DESPUÉS: tipar la respuesta de axios
const created = (response as { data?: TenantRegistration })?.data;
```

### `frontend/src/custom.d.ts:5`
```ts
// ANTES:
declare module '*.yaml' {
  const content: any;
  export default content;
}

// DESPUÉS:
declare module '*.yaml' {
  const content: Record<string, unknown>;
  export default content;
}
```

**Verificación:**
```bash
cd cn-quickstart/quickstart/frontend
grep -rn ": any\|as any\|<any>" src --include="*.ts" --include="*.tsx" | grep -v openapi.d.ts
# Debe dar 0 resultados (excluyendo openapi.d.ts que es generado)
npx tsc -b --noEmit  # 0 errores
```

---

## P0.2 — Fix stale closure en `autoConnect`

**Motivo:** Bug real. El guard `if (user !== null) return` lee `user` del closure, que nunca se refresca tras `await fetchUser()`. El POST de login con credenciales se ejecuta siempre, incluso si ya hay sesión.

**Archivo:** `frontend/src/stores/userStore.tsx:54-68`

```tsx
// ANTES:
const autoConnect = useCallback(async () => {
  await fetchUser();
  if (user !== null) return;  // <-- STALE: user es del closure, nunca se refresca
  const params = new URLSearchParams();
  params.append('username', 'app-provider');
  params.append('password', '');
  await fetch('/login', { method: 'POST', body: params, redirect: 'manual' });
  await fetchUser();
}, [fetchUser, user, toast]);

// DESPUÉS: leer el resultado de fetchUser directamente
const autoConnect = useCallback(async () => {
  const current = await fetchUser();  // fetchUser debe devolver el user
  if (current !== null) return;       // usar el valor fresco, no el del closure
  const params = new URLSearchParams();
  params.append('username', 'app-provider');
  params.append('password', '');
  await fetch('/login', { method: 'POST', body: params, redirect: 'manual' });
  await fetchUser();
}, [fetchUser, toast]);  // quitar 'user' de deps
```

> **Requisito:** `fetchUser` debe devolver el usuario (no solo setear estado). Revisar su implementación y hacer `return user` al final.

**Verificación:**
```bash
cd cn-quickstart/quickstart/frontend && npx tsc -b --noEmit
# Manual: abrir la app, loguear consola, click "Launch the demo" 2 veces → el POST /login solo debe ir 1 vez
```

---

## P0.3 — `@ControllerAdvice` global + quitar stacktrace filtering

**Motivo:** `application.yml:9-13` tiene `include-stacktrace: always` + `include-exception: true`. Sin un handler global, los errores del ledger (gRPC) llegan al cliente con stack completo → fuga de arquitectura.

### Paso 1: editar `application.yml`
**Archivo:** `backend/src/main/resources/application.yml` (trackeado)

```yaml
server:
  error:
    include-message: on_param   # era: always
    include-binding-errors: on_param   # era: always
    include-stacktrace: never   # era: always  ← CRÍTICO
    include-path: never         # era: always
    include-exception: false    # era: true   ← CRÍTICO
```

### Paso 2: crear `GlobalExceptionHandler.java`
**Archivo NUEVO:** `backend/src/main/java/com/digitalasset/quickstart/service/GlobalExceptionHandler.java`

> ⚠️ **Añadir al `.gitignore` allowlist** (ver P0.6):
> ```
> !cn-quickstart/quickstart/backend/src/main/java/com/digitalasset/quickstart/service/GlobalExceptionHandler.java
> ```

```java
package com.digitalasset.quickstart.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/** Normaliza todos los errores para no filtrar internals al cliente. */
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .reduce((a, b) -> a + "; " + b)
            .orElse("validation failed");
        return ResponseEntity.badRequest().body(Map.of("error", msg));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArg(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatus(
            org.springframework.web.server.ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", ex.getReason() != null ? ex.getReason() : "error"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
        // Loguear el detalle server-side, NO al cliente
        log.error("Unhandled exception in controller", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of("error", "Internal server error"));
    }
}
```

**Verificación:**
```bash
cd cn-quickstart/quickstart && ./gradlew :backend:compileJava -x :daml:compileDaml
# Levantar backend, hacer un POST con amount negativo → debe devolver {"error":"..."} sin stacktrace
```

---

## P0.4 — CI: añadir jobs de frontend + backend test

**Motivo:** El CI actual solo corre Daml tests + backend compile. El frontend no se verifica nunca en CI.

**Archivo:** `.github/workflows/daml-test.yml` (trackeado en repo root)

Añadir dos jobs nuevos al final del archivo:

```yaml
  frontend-build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: cn-quickstart/quickstart/frontend
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: cn-quickstart/quickstart/frontend/package-lock.json
      - run: npm ci
      - name: Type check
        run: npx tsc -b --noEmit
      - name: Lint
        run: npm run lint
      - name: Build
        run: npm run build

  backend-test:
    needs: daml-build-and-test
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: cn-quickstart/quickstart
    steps:
      - uses: actions/checkout@v4
      - name: Setup Java 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v3
      - name: Compile + test backend
        run: ./gradlew :backend:test
```

> Nota: el job `backend-test` fallará hasta que existan tests (ver P1.4). Mientras tanto, si se prefiere, se puede dejar como `:backend:compileTestJava` para verificar que al menos compila la estructura de test.

**Verificación:**
- Push a un branch temporal y verificar que el CI corre los 4 jobs (daml, backend-compile, frontend-build, backend-test).

---

## P0.5 — Actualizar docs (corregir claims inexactas)

### `SUBMISSION_CHECKLIST.md:29`
```markdown
# ANTES:
- [x] Frontend compiles (`cd frontend && npx tsc --noEmit`) — zero `any`, typed store

# DESPUÉS (tras ejecutar P0.1):
- [x] Frontend compiles (`cd frontend && npx tsc --noEmit`) — typed store, `any` eliminados
```

### `HANDOFF.md` — añadir nota en §4 (reglas técnicas) y §5
Añadir al final de §4:
```
7. **`.gitignore` allowlist (recordatorio)**: cada archivo NUEVO creado en `cn-quickstart/`
   DEBE añadirse al `.gitignore` o no se subirá. Los archivos solo-editados no lo necesitan.
```

### `DECISION-LOG.md` — añadir entrada de auditoría (ver P0.7)

---

## P0.6 — Recordatorio del patrón `.gitignore` allowlist

Este repo ignora `cn-quickstart/**` y re-habilita archivos uno a uno. **Toda esta planificación
asume que recordarás esto al crear archivos nuevos.**

**Lista de archivos NUEVOS que este plan creará** (y sus entradas de `.gitignore`):

```
# === Plan de hardening 2026-07-02: archivos nuevos a trackear ===
!cn-quickstart/quickstart/backend/src/main/java/com/digitalasset/quickstart/service/GlobalExceptionHandler.java
!cn-quickstart/quickstart/backend/src/main/java/com/digitalasset/quickstart/web/
!cn-quickstart/quickstart/backend/src/main/java/com/digitalasset/quickstart/web/ValidationConfig.java
!cn-quickstart/quickstart/backend/src/test/
!cn-quickstart/quickstart/backend/src/test/java/
!cn-quickstart/quickstart/backend/src/test/java/com/
!cn-quickstart/quickstart/backend/src/test/java/com/digitalasset/
!cn-quickstart/quickstart/backend/src/test/java/com/digitalasset/quickstart/
!cn-quickstart/quickstart/backend/src/test/java/com/digitalasset/quickstart/service/
!cn-quickstart/quickstart/backend/src/test/java/com/digitalasset/quickstart/service/CommitmentControllerTest.java
```

**Verificación antes de commit:**
```bash
git status  # los archivos nuevos deben aparecer como "new file", no como untracked-ignored
git check-ignore cn-quickstart/quickstart/backend/src/test/java/com/digitalasset/quickstart/service/CommitmentControllerTest.java
# El comando anterior debe devolver vacío (no está ignorado)
```

---

## P0.7 — Actualizar DECISION-LOG con la auditoría

**Archivo:** `docs/DECISION-LOG.md` (append al final, antes de "Pendientes")

Añadir:
```markdown
## 2026-07-02 — Auditoría completa de producción + plan de hardening

- **Contexto**: Usuario pidió auditoría completa del proyecto: qué mejorar, borrar, reconstruir para producción.
- **Hallazgos**: 6 críticos (CSRF off, passwords {noop}, creds en frontend bundle, sin validación de inputs,
  stacktrace filtering, 0 tests backend), 8 high en backend, 9 en frontend, 8 gaps de tests Daml.
  CI solo cubre Daml. La claim "zero any" del HANDOFF es FALSA (10 `any` reales).
- **Verificado como correcto**: modelo de privacidad Daml (thirdParty fuera de signatory/observer),
  settlement atómico Splice, SQL parametrizado (no inyección), CORS acotado, sin secretos commiteados,
  sin superficie XSS, sin memory leaks. **No hay que reconstruir nada.**
- **Decisión**: No borrar/reconstruir. Solo endurecer. Plan detallado en
  `docs/superpowers/plans/2026-07-02-production-hardening.md`.
- **Prioridades**: P0 (quick wins pre-hackathon, ~3h), P1 (security hardening post-entrega),
  P2 (production real: OAuth2, DevNet, contract keys).
- **Claim corregida**: "zero any" → "any eliminados (tras P0.1)".
```

---

# P1 — SECURITY HARDENING (post-entrega, antes de cualquier despliegue público)

> Estos fixes hacen el proyecto seguro para exponer públicamente. No son necesarios para el hackathon
> (LocalNet), pero sí si el demo va a estar online.

---

## P1.1 — Mover credenciales de demo al backend (CRÍTICO)

**Motivo:** `app-provider` / password vacía está hardcodeada en el JS del navegador.

**Archivos:** `frontend/src/stores/userStore.tsx:61-62`, `frontend/src/views/LoginView.tsx:27-29`

**Estrategia:**
1. Crear endpoint `POST /api/demo-session` en el backend que:
   - Solo disponible en profile `shared-secret` (demo)
   - Emite una sesión efímera (JSESSIONID) logueando como `app-provider` server-side
   - Devuelve `{ ok: true }`
2. El frontend solo llama a `POST /api/demo-session` — **sin credenciales en el bundle**.
3. Eliminar el `URLSearchParams` con username/password de ambos archivos.

**Backend (nuevo método en CommitmentController o nuevo DemoAuthController):**
```java
@PostMapping("/demo-session")
public ResponseEntity<Map<String, String>> createDemoSession(HttpSession session) {
    // Solo en profile demo; en OAuth2 este endpoint debe estar deshabilitado
    // Loguear como app-provider server-side
    // ...
    return ResponseEntity.ok(Map.of("ok", "true"));
}
```

> ⚠️ Esto requiere pensar bien el flujo de Spring Security. Alternativa más simple para hackathon:
> al menos mover las credenciales a `import.meta.env.VITE_DEMO_USER` (env var en build), no hardcodeadas.

**Mitigación mínima para hackathon (si no hay tiempo de re-arquitectura):**
```tsx
// userStore.tsx
const DEMO_USER = import.meta.env.VITE_DEMO_USER ?? 'app-provider';
params.append('username', DEMO_USER);
```
Esto al menos las saca del código fuente (aunque sigan en el bundle). El fix real es el endpoint.

---

## P1.2 — Habilitar CSRF en shared-secret profile (CRÍTICO)

**Motivo:** `SharedSecretConfig.java:53` deshabilita CSRF. Con cookie-auth + CORS credentialed = CSRF posible.

**Archivo:** `backend/src/main/java/com/digitalasset/quickstart/security/sharedsecret/SharedSecretConfig.java:53`

```java
// ANTES:
.csrf(csrf -> csrf.disable())

// DESPUÉS: copiar el patrón de OAuth2Config.java:66-68
.csrf(csrf -> csrf
    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
    .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
)
```

**Imports a añadir:**
```java
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
```

> El frontend YA maneja CSRF correctamente (`vaultApi.ts:14-20` con `withXSRFToken`), así que esto
> no rompería nada. Solo el `autoConnect` con `fetch` puro (userStore.tsx:63) necesitaría incluir
> el header XSRF — pero como P0.2 lo está reescribiendo, hacerlo juntos.

**Verificación:**
- Tras habilitar, un POST sin token XSRF debe devolver 403.
- El flujo normal (con el cliente axios que ya envía el token) debe seguir funcionando.

---

## P1.3 — Validación de inputs con Bean Validation (CRÍTICO)

**Motivo:** `CommitmentController.java:445-453` acepta amounts negativos, deadlines overflow, sin null checks.

### Paso 1: crear `ValidationConfig.java`
**Archivo NUEVO:** `backend/src/main/java/com/digitalasset/quickstart/web/ValidationConfig.java`
```
> Añadir al .gitignore allowlist (ver P0.6)
```
```java
package com.digitalasset.quickstart.web;

import org.springframework.validation.beanvalidation.MethodValidationPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ValidationConfig {
    @Bean
    public MethodValidationPostProcessor methodValidationPostProcessor() {
        return new MethodValidationPostProcessor();
    }
}
```

### Paso 2: anotar el controller y los DTOs
**Archivo:** `backend/src/main/java/com/digitalasset/quickstart/service/CommitmentController.java`

```java
// En la clase:
@Validated   // <-- añadir
@RestController
@RequestMapping("/vault")
public class CommitmentController implements ... {

    // En cada método que recibe body, añadir @Valid:
    @PostMapping("/proposals")
    public ResponseEntity<?> createProposal(
            @Valid @RequestBody CreateProposalRequest request, ...) {
```

**En los DTOs request (CreateProposalRequest, etc., al final del archivo o en el controller):**
```java
public record CreateProposalRequest(
    @NotBlank String accepter,
    @NotBlank String thirdParty,
    @NotNull @Positive BigDecimal amount,        // era: BigDecimal amount (sin checks)
    @NotBlank @Size(max = 10) String currency,
    @NotBlank @Size(max = 500) String description,
    @NotBlank String workflow,
    @NotNull @Min(1) @Max(31536000) long deadlineSeconds  // era: long sin bounds
) {}
```

**Imports:**
```java
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.validation.annotation.Validated;
```

**Verificación:**
```bash
# Amount negativo → 400 con {"error":"amount: must be greater than 0"}
curl -X POST http://localhost:8080/vault/proposals -H 'Content-Type: application/json' \
  -d '{"amount": -5, "accepter":"x", "thirdParty":"y", "currency":"CC","description":"d","workflow":"w","deadlineSeconds":100}'
```

---

## P1.4 — Tests de backend (CRÍTICO para producción)

**Motivo:** No existe `backend/src/test/`. Cero cobertura.

### Empezar por `CommitmentControllerTest.java`
**Archivo NUEVO:** `backend/src/test/java/com/digitalasset/quickstart/service/CommitmentControllerTest.java`
```
> Añadir al .gitignore allowlist (ver P0.6)
```

Casos mínimos a cubrir:
1. `createProposal` con `amount < 0` → 400 (tras P1.3)
2. `createProposal` con `deadlineSeconds` ausente → 400
3. `createProposal` con `currency` blank → 400
4. `acceptProposal` con `contractId` inexistente → 404
5. `acceptProposal` sobre un contrato de otro party → comportamiento definido
6. `fulfillCommitment` con `contractId` de otro → comportamiento definido
7. Errores del ledger (mock) → 500 con body normalizado (tras P0.3)

```java
package com.digitalasset.quickstart.service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class CommitmentControllerTest {
    @Autowired private MockMvc mvc;

    @Test
    void rejectsNegativeAmount() throws Exception {
        mvc.perform(post("/vault/proposals")
                .contentType("application/json")
                .content("{\"amount\":-5,\"accepter\":\"x\",\"thirdParty\":\"y\","
                        + "\"currency\":\"CC\",\"description\":\"d\",\"workflow\":\"w\","
                        + "\"deadlineSeconds\":100}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsMissingFields() throws Exception {
        mvc.perform(post("/vault/proposals")
                .contentType("application/json")
                .content("{}"))
            .andExpect(status().isBadRequest());
    }
    // ... más casos
}
```

> Nota: los tests que tocan el ledger real requieren o mockear `LedgerApi` o levantar el stack.
> Empezar con los de validación (no tocan ledger) y añadir los de integración después.

---

## P1.5 — Focus trap + manejo de foco en modales

**Motivo:** `Modal.tsx` no atrapa el foco. El Tab escapa al fondo; foco no se restaura al cerrar.

**Archivo:** `frontend/src/components/Modal.tsx`

Implementar:
1. Al montar, guardar `document.activeElement` y mover foco al primer focusable del modal.
2. Keydown handler: si Tab y el target está fuera del modal → prevenir.
3. Al desmontar, restaurar foco al elemento guardado.
4. Añadir `aria-labelledby` apuntando al id del título.

Librería recomendada (zero deps si no se quiere): `focus-trap-react`. O implementación manual ~30 líneas.

---

## P1.6 — Conectar `findCommitmentsForParty` (performance)

**Motivo:** `CommitmentController` carga TODOS los contratos y filtra en Java. Existe SQL filtrado sin usar.

**Archivo:** `backend/src/main/java/com/digitalasset/quickstart/service/CommitmentController.java`

Reemplazar en `listProposals`, `listCommitments`, `listReceipts`, `listDisclosures`:
```java
// ANTES:
var all = damlRepository.findActiveCommitments();
return all.stream().filter(c -> partyOf(c).equals(party)).toList();

// DESPUÉS:
return damlRepository.findCommitmentsForParty(party);
```

---

## P1.7 — `actAs` por usuario real (investigar + confirmar)

**Motivo:** `LedgerApi.java:131-133` envía TODA command como `actAs = appProviderParty` sin importar el usuario.

**Acción:** Esto requiere **decisión de arquitectura** con los templates Daml. Preguntas a resolver:
1. ¿El modelo Daml permite que cada tenant actúe con su propia partyId en `actAs`?
2. Si sí, cambiar `LedgerApi` para usar la party del `AuthenticatedPartyProvider`.
3. Si no, documentar explícitamente que el backend es single-tenant-trusted y el aislamiento es por Daml `ensure`/controller.

**No es un fix mecánico** — requiere entender el modelo de autorización Daml. Documentar la decisión en `DECISION-LOG.md`.

---

# P2 — PRODUCCIÓN REAL (post-hackathon, roadmap)

> Para cuando el proyecto vaya a producción con usuarios reales.

| ID | Tarea | Detalle |
|---|---|---|
| P2.1 | Auth OAuth2 (Keycloak) | Reemplazar shared-secret por OAuth2 real. El profile OAuth2 ya existe (`OAuth2Config.java`). |
| P2.2 | Passwords BCrypt | Eliminar `{noop}` (`AdminApiImpl.java:121`, `SharedSecretConfig.java:88`). |
| P2.3 | gRPC con TLS | `LedgerApi.java:54`: cambiar `usePlaintext()` por `useTransportSecurity()`. |
| P2.4 | HikariCP | Reemplazar `DriverManagerDataSource` (`JdbcDataSource.java:35`) por `HikariDataSource`. |
| P2.5 | Rate limiting | Añadir bucket4j o similar en endpoints de settlement. |
| P2.6 | Contract keys | `key (proposer, accepter, description)` para uniqueness (TODO ya en `CommitmentProposal.daml:2`). |
| P2.7 | DevNet real | Desbloquear acceso al participant (ver HANDOFF §6). |
| P2.8 | Dependabot | Crear `.github/dependabot.yml` para scan de CVEs en deps 2024-vintage. |
| P2.9 | `.env.local` party IDs | Derivar party IDs en runtime, no hardcodear (mejora reproducibilidad). |
| P2.10 | Refactor duplicación | Extraer `TokenStandardTransferContextBuilder` compartido. |
| P2.11 | E2E Playwright | Correr en CI; añadir flujo Vault (no solo el scaffold upstream). |

---

# GAPS DE TESTS DAML (paralelo, cualquier sesión)

> Añadir a `daml/licensing-tests/daml/Vault/Scripts/`. Cada test nuevo debe añadirse al `.gitignore`.

| ID | Test a crear | Qué prueba | Severidad |
|---|---|---|---|
| T1 | `test_fulfill_after_deadline` | ¿Se puede cumplir tras deadline? **Decidir si es bug o feature** — `Fulfill` no tiene guard. Si es bug, añadir `assertMsg now <= deadline`. | ALTA |
| T2 | `test_double_fulfill_fails` | Segundo `Fulfill` debe fallar (es consuming). `submitMustFail`. | ALTA |
| T3 | `test_fulfill_real_settlement` | `Fulfill` con `allocationCid = Some _` — la rama del Canton Coin real. Requiere montar allocation en el script. | ALTA |
| T4 | `test_refund_then_fulfill_fails` | Tras refund, fulfill debe fallar (archivado). | ALTA |
| T5 | `test_resolve_invalid_ruling_fails` | `ResolveDispute{ruling="neither"}` → `submitMustFail`. | MEDIA |
| T6 | `test_negative_amount_rejected` | Crear contrato con `amount = -1` → `submitMustFail` (ensure). | MEDIA |
| T7 | `test_dispute_by_thirdparty_fails` | `thirdParty` intenta `RaiseDispute` → `submitMustFail`. | MEDIA |
| T8 | `test_fulfill_receipt_contents` | Validar amount/currency/note del receipt (no solo existencia). | BAJA |

**Decisión pendiente T1:** ¿Debe `Fulfill` bloquearse tras `deadline`? Argumentos:
- **A favor de bloquear**: simetría con `Refund` (que sí está gated). Un cumplimiento tardío no debería poder forzar settlement.
- **A favor de permitir**: las partes pueden acordar cumplir tarde si mutuamente consienten.
- **Recomendación**: bloquear (más seguro para el caso institucional), pero documentar la decisión en `DECISION-LOG.md`.

**Plantilla para nuevo test:**
```daml
module Vault.Scripts.TestDoubleFulfill where

import Daml.Script
import Vault.CommitmentContract
import Vault.CommitmentProposal

test_double_fulfill_fails : Script ()
test_double_fulfill_fails = script do
  proposer <- allocateParty "proposer"
  accepter <- allocateParty "accepter"
  thirdParty <- allocateParty "arbiter"
  -- ... crear propuesta, aceptar, cumplir una vez ...
  -- segundo fulfill debe fallar:
  submitMustFail proposer [exercise c Fulfill{...}]
```

---

# ORDEN DE EJECUCIÓN RECOMENDADO (checklist para la próxima sesión)

## Sesión de hardening pre-hackathon (P0) — ~3-4h
- [ ] P0.1: Quitar 10 `any` del frontend (verificar con grep)
- [ ] P0.2: Fix stale closure `autoConnect`
- [ ] P0.3: `GlobalExceptionHandler` + `application.yml` stacktrace=never
- [ ] P0.4: CI jobs frontend + backend test
- [ ] P0.5 + P0.7: Actualizar docs (corregir claim "zero any", entrada decision-log)
- [ ] P0.6: Recordar `.gitignore` allowlist para archivos nuevos
- [ ] Commit + push

## Sesión de security hardening (P1) — ~6-8h
- [ ] P1.1: Creds al backend (o env var como mínimo)
- [ ] P1.2: CSRF en shared-secret
- [ ] P1.3: Bean Validation (`@Valid`, `@Positive`, etc.)
- [ ] P1.4: Tests backend (empezar por validación)
- [ ] P1.5: Focus trap modales
- [ ] P1.6: `findCommitmentsForParty`
- [ ] P1.7: Decisión `actAs` (investigar + documentar)

## Tests Daml (cualquier sesión, paralelo)
- [ ] T1-T8 (priorizar T1, T2, T3)

## Producción real (P2) — roadmap
- [ ] P2.1-P2.11

---

# NOTAS METODOLÓGICAS PARA LA PRÓXIMA SESIÓN

1. **Verifica antes de tocar**: corre los tests existentes para confirmar el baseline verde.
   ```bash
   ~/.daml/bin/daml test --package-root daml/licensing-tests   # 12 ok
   ./gradlew :backend:compileJava -x :daml:compileDaml          # BUILD SUCCESSFUL
   cd frontend && npx tsc -b --noEmit                           # 0 errores
   ```

2. **Commits atómicos**: un commit por tarea P0.x / P1.x. Facilita rollback y review.

3. **Después de cada cambio, re-verifica** la capa afectada. No acumules cambios sin verificar.

4. **`.gitignore` allowlist**: cada archivo NUEVO en `cn-quickstart/` necesita entrada. Los EDITADOS no.

5. **Si algo se rompe y no sabes por qué**: el HANDOFF.md §4 tiene las "reglas técnicas IMPORTANTES"
   (path con espacios, Refund consuming, RaiseDispute auth, etc.). Léelas antes de debuggear.

6. **No reconstruyas**: la auditoría confirmó que la arquitectura es correcta. Solo endurece.

---

*Fin del plan. Cualquier duda, los hallazgos detallados están en `docs/DECISION-LOG.md` (entrada 2026-07-02).*
