# Session Handoff — CantonVault Hackathon
## Última actualización: 2026-07-14 (balance CC real + Git connected + cleanup)

> **LEER ESTO PRIMERO** al iniciar la próxima sesión.
> Estado verificado en vivo, en la DevNet y vía CLI de Cloudflare (wrangler + API).

---

## ✅ ESTADO ACTUAL (verificado 2026-07-14, offset 4326068)

| Componente | Estado | Evidencia |
|---|---|---|
| **Deploy Cloudflare** | ✅ VIVO | `canton-vault.pages.dev` sirve `index-BTnWW1jD.js` |
| **Backend Pages Functions** | ✅ Deployadas | `/api/health` → Canton 3.5.8, offset 4326068 |
| **Balance CC REAL** | ✅ De la red | `/api/vault/balance` → **31,426,856.85 CC** vía Splice Validator API |
| **Party del demo** | ✅ `cancore::*` | Writes funcionan + tiene CC del faucet |
| **Lifecycle on-ledger** | ✅ create→accept→fulfill | Verificado E2E, settlement real |
| **Git↔Cloudflare** | ✅ CONECTADO | `Git Provider: Yes` — auto-deploy activo |
| **Git push** | ✅ HECHO | `15627ac` en `github/main` y `origin/main` (gitlab) |
| **Limpieza Cloudflare** | ✅ HECHA | 3 Workers residuales eliminados |

### Cuenta de Cloudflare — estado limpio (verificado vía API + wrangler)
```
Projects Pages: 1  → canton-vault (canton-vault.pages.dev)  [Git Provider: Yes ✅]
Worker scripts: 1  → canton-vault (subyacente del Pages project, has_assets: true)
KV namespaces: 0
D1 databases:  0
R2 buckets:    0 (no habilitado)
```

### URLs
- **Producción:** https://canton-vault.pages.dev
- **Preview último deploy:** https://b2066573.canton-vault.pages.dev
- **Repo:** https://github.com/ruwaq/CantonVault
- **Dashboard CF:** https://dash.cloudflare.com (prometeodev7@gmail.com)

---

## 🚨 EL INCIDENTE DE CLOUDFLARE (resuelto dos veces)

### Original (13 jul) — bucle infinito
Frontend viejo hacía ~70 req/min por pestaña (useEffect→fetchUser→loading→unmount→remount→∞).
**Fix:** refactor SWR (commit `ca7a51e`), 0 polling en background.

### Recurrencia (14 jul) — deploy nunca actualizado
El fix del SWR **estuvo en el repo pero NUNCA se deployó**. El sitio vivo seguía
sirviendo `index-D3J2nJuV.js` (versión vieja con bucle). Cualquier pestaña abierta
disparaba la fuga otra vez.
**Fix:** deploy manual este día → `canton-vault.pages.dev` ahora sirve `index-BTnWW1jD.js`.

### Por qué recurrió (lección)
No había CI/CD. El handoff marcaba "conectar Git" como tarea 🔴 pero no se hizo.
**Sin Git conectado, cada cambio requiere deploy manual.**

---

## 🔴 LO QUE FALTA (en orden de prioridad)

### ✅ RESUELTO — Todo lo urgente está hecho
- ✅ `git push` — `15627ac` en github/main y origin/main
- ✅ Git↔Cloudflare conectado — `Git Provider: Yes`, auto-deploy activo
- ✅ Faucet CC — la party ya tiene fondos (faucet confirmó "enough funds")
- ✅ Balance CC real — implementado vía Splice Validator API (no más hardcoded 0)
- ✅ Limpieza Cloudflare — 3 Workers residuales eliminados

### NICE-TO-HAVE — Mejoras de demo

**1. Pull de los GET endpoints (limitación del sandbox)**
Los 5 GET (`/proposals`, `/commitments`, `/receipts`, `/disclosures`, `/dispute-cases`)
leen el ACS pero devuelven `[]` en este shared validator: los contracts creados por
el m2m user **no son legibles vía ACS** (privacy/divulgence del entorno multi-tenant).
**Las mutations funcionan** porque el frontend trackea los contractIds via las
transaction responses. El demo fluye: create → accept → fulfill.
Para mostrar listas reales, haría falta un ledger offset-based tx history o
almacenar los contractIds en KV/D1.

**2. Monitorear cuota de Cloudflare**
Free = 100k req/día. Con SWR (revalidateOnFocus, 0 polling) es imposible superar
esto. Si vuelve a subir raro, revisar pestañas abiertas del navegador.

---

## 🐛 DEBUGGING DE ESTA SESIÓN — Lecciones técnicas

### Bug 1: Party ID equivocada (403 "security-sensitive error")
**Síntoma:** writes devolvían 403, reads funcionaban. Racionalicé como "rate-limiting".
**Root cause real:** El shared validator reasignó los `CanActAs` rights de user 6
entre 13-14 jul. La config usaba `5nsandbox-devnet-2::*` (stale en `primaryParty`),
pero los rights reales son sobre `cancore::*` y 18 otros prefijos (mismo hash suffix).
**Fix:** toda la config ahora usa `cancore::1220a14ca128...`.
**Lección:** si algo falla, **investiga la causa raíz**, no asumas "problema externo".

### Bug 2: contractId falso (tx hash ≠ contractId)
**Síntoma:** los exercises fallaban con "missing contract_id".
**Root cause:** `submit-and-wait` devuelve solo `{updateId, completionOffset}`.
El `updateId` es el tx hash, NO un contractId. El código lo devolvía como contractId.
**Fix:** cambiado a `submit-and-wait-for-transaction` que devuelve el
`CreatedEvent.contractId` real (104-char hex).

### Bug 3: Formato Canton 3.5 JSON Ledger API
**Síntoma:** errores 400 "Missing required field".
**Root cause:** dos cambios del formato Canton 3.5 vs lo que usaba el código:
- El body wrapper es `{commands:{...}, transactionShape}` (no flat con `transactionFormat`)
- El campo del choice argument es `choiceArgument` (no `argument`)

### Cómo se descubrieron (método)
El debugging sistemático reveló los 3 bugs contrastando:
- El script `devnet-create-contract.sh` (que funcionó el 13 jul) → fallaba el 14 jul
- Token JWT decodificado → válido, scope correcto
- `/v2/users/6/rights` → rights reales sobre `cancore::*`, no `5nsandbox-devnet-2::*`
- Test directo: write con `cancore::` → 200 ✅; con `5nsandbox-devnet-2::` → 403 ❌

---

## 🏗️ Arquitectura actual del frontend

```
src/
├── lib/
│   ├── fetcher.ts              # SWR fetcher con timeout 8s + FetchError
│   └── vaultNormalizers.ts     # raw backend → typed domain models
├── hooks/
│   ├── useAuth.ts              # useUser(), useLogout(), useLoginLinks() — SWR
│   ├── useVaultData.ts         # useProposals(), useCommitments(), etc. — SWR lectura
│   └── useVaultMutations.ts    # createProposal(), acceptProposal(), etc. — SWR mutate
├── stores/
│   ├── userStore.tsx           # FACADE thin sobre useAuth
│   ├── vaultStore.tsx          # FACADE thin sobre useVaultData+Mutations
│   ├── vaultApi.ts             # axios instance (baseURL /api/vault)
│   └── toastStore.tsx          # notificaciones
└── views/
    ├── VaultView.tsx           # UI principal (sin polling manual, SWR gestiona)
    ├── LoginView.tsx           # usa useLoginLinks() SWR
    └── LandingView.tsx         # landing page estática
```

### Config SWR (crítica para no pausar Cloudflare)
```ts
{
  revalidateOnFocus: true,   // revalida solo al volver al tab
  refreshInterval: 0,        // NUNCA polling ciego
  dedupingInterval: 10_000,  // dedupe dentro de 10s
  errorRetryCount: 2,
  errorRetryInterval: 5_000, // backoff
  keepPreviousData: true,
}
```

---

## 🔑 Endpoints del backend (Pages Functions)

### Funcionales — operan on-ledger en Canton DevNet
| Endpoint | Método | Estado |
|---|---|---|
| `/api/health` | GET | ✅ DevNet health + versión Canton |
| `/api/authenticated-user` | GET | ✅ Party demo `cancore::*` + ledger offset |
| `/api/vault/parties` | GET | ✅ 3 roles (Proposer/Accepter/Third Party) |
| `/api/vault/proposals` | POST | ✅ **Crea CommitmentProposal on-ledger**, devuelve contractId real |
| `/api/vault/proposals` | GET | ✅ Lee ACS (devuelve [] en sandbox por divulgence) |
| `/api/vault/commitments` | GET | ✅ Lee ACS |
| `/api/vault/receipts` | GET | ✅ Lee ACS |
| `/api/vault/disclosures` | GET | ✅ Lee ACS |
| `/api/vault/dispute-cases` | GET | ✅ Lee ACS |
| `/api/vault/balance` | GET | ⚠️ Hardcoded `balance: 0` |
| `/api/login-links` | GET | ✅ Demo link |
| `/api/logout` | POST | ✅ Stub (cosmético) |

### Mutations on-ledger (verificadas en Canton DevNet, Canton 3.5.8)
| Endpoint | Método | Choice Daml |
|---|---|---|
| `/api/vault/proposals/[id]/accept` | POST | AcceptProposal ✅ verificado |
| `/api/vault/proposals/[id]/reject` | POST | RejectProposal |
| `/api/vault/commitments/[id]/fulfill` | POST | Fulfill ✅ verificado → SettlementReceipt |
| `/api/vault/commitments/[id]/raise-dispute` | POST | RaiseDispute |
| `/api/vault/commitments/[id]/refund` | POST | Refund |
| `/api/vault/commitments/[id]/resolve` | POST | ResolveDispute sobre DisputeCase (busca commitmentRef) |

### Evidencia de lifecycle completo en DevNet (2026-07-14)
```
create  → proposal contractId 00473c60…  offset 4311501
accept  → CommitmentProposal archived, CommitmentContract created  offset 4311525
fulfill → CommitmentContract archived (terminal), SettlementReceipt created
```

---

## 🔧 Configuración técnica clave

### Party del demo
```
cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8
```
Cambió de `5nsandbox-devnet-2::*` (13 jul) a `cancore::*` (14 jul) porque el shared
validator reasignó los rights de user 6. Si las writes vuelven a dar 403, verificar
`/v2/users/6/rights` para ver qué parties tienen `CanActAs`.

### Formato Canton 3.5 JSON Ledger API (verificado)
- **Create/exercise:** `POST /v2/commands/submit-and-wait-for-transaction`
- **Body wrapper:** `{commands: {applicationId, commandId, actAs, readAs, commands: [...], transactionShape: "CURRENT_LEDGER_END"}, workflowId}`
- **ExerciseCommand:** campo del argumento = `choiceArgument` (no `argument`)
- **Response:** `transaction.events[]` con `CreatedEvent.contractId` (el cid real, 104-char)
- **ACS query:** `POST /v2/state/active-contracts` con `{filter:{filtersByParty:{<party>:{identifierFilter:{templateIds:[...]}}}}}`

### Helpers compartidos (`functions/api/_ledger.js`)
- `submitCreate(template, args)` → `{updateId, completionOffset, contractId}`
- `submitExercise(template, cid, choice, arg)` → `{updateId, completionOffset, contractId}`
- `queryActiveContracts(templateIds)` → `[{contractId, payload}]`

---

## 🔧 Comandos útiles

```bash
# Desarrollo local (Vite dev server, proxies /api al backend local)
cd cn-quickstart/quickstart/frontend && npm run dev

# Preview contra DevNet REAL (wrangler pages dev, NO toca cuota de CF)
cd cn-quickstart/quickstart/frontend && npm run build
npx wrangler pages dev dist --compatibility-flags nodejs_compat --port 8790

# Build producción
cd cn-quickstart/quickstart/frontend && npm run build

# Deploy manual a Cloudflare (alternativa si no hay Git conectado)
cd cn-quickstart/quickstart/frontend && npx wrangler pages deploy dist --project-name canton-vault --branch main

# CLI contra DevNet (propose/accept/fulfill/dispute/refund)
cd cli && npx tsc && node dist/index.js status
node dist/index.js propose -a 5000 -d "description"
node dist/index.js accept <contractId>

# Verificar qué versión está en vivo
curl -s https://canton-vault.pages.dev/ | grep -oE 'index-[A-Za-z0-9_]+\.js'
curl -s https://canton-vault.pages.dev/api/health

# Ver estado de autenticación de wrangler
cd cn-quickstart/quickstart/frontend && npx wrangler whoami
```

---

## ⚠️ Lecciones aprendidas (NO repetir)

1. **NUNCA dejar un deploy sin actualizar** — si hay un fix en el repo, deployarlo
   inmediatamente o conectar Git para auto-deploy. Un sitio vivo con versión vieja
   puede recurrir el incidente de cuota.
2. **NUNCA asumir "problema externo" sin investigar** — el 403 del validator era
   party ID equivocada, no rate-limiting. Investigar causa raíz siempre.
3. **NUNCA hardcodear valores que deben leerse de la red** — el balance era `0`
   hardcoded. La solución fue la Splice Validator REST API
   (`api.validator.devnet.sandbox.fivenorth.io/api/validator/v0/wallet/balance`),
   no el ACS que no divulga a este m2m user.
4. **`submit-and-wait` ≠ `submit-and-wait-for-transaction`** — el primero no devuelve
   contractIds. Usar el segundo siempre que necesites el cid creado.
5. **El campo es `choiceArgument`** en Canton 3.5, no `argument`.
6. **Cloudflare Free = 100k req/día** — con SWR (focus-only) es imposible superar esto,
   siempre que el deploy esté actualizado.
7. **El sandbox no divulga contracts creados por m2m vía ACS** — los GET devuelven []
   pero las mutations funcionan. No es un bug, es privacy del entorno multi-tenant.
   El balance de CC sí es legible vía la Validator REST API (no vía ACS).

---

## 📅 Timeline del hackathon

- **Deadline:** Domingo 19 julio medianoche
- **Días restantes:** ~5
- **Prioridad:** ✅ demo listo — todo lo urgente está hecho

### ✅ Tareas resueltas desde el último handoff
- `git push` — HECHO. `15627ac` en `github/main` y `origin/main`.
- Limpieza Cloudflare — HECHA. 3 Workers residuales eliminados.
  Queda 1 Pages project + 1 Worker subyacente (lo mínimo necesario).
- Git↔Cloudflare — CONECTADO. `Git Provider: Yes`, auto-deploy activo.
- Faucet CC — la party ya tiene fondos (faucet confirmó "enough funds").
- Balance CC real — implementado vía Splice Validator REST API.
  `/api/vault/balance` ahora devuelve 31,426,856.85 CC reales de la red.

---

## 🔗 Links importantes

- **Producción:** https://canton-vault.pages.dev
- **Repo:** https://github.com/ruwaq/CantonVault
- **Faucet CC:** https://stakely.io/faucet/canton-devnet
- **Dashboard CF:** https://dash.cloudflare.com (prometeodev7@gmail.com)
- **Hackathon:** Build on Canton (deadline 19 jul)
