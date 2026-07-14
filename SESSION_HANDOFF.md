# Session Handoff — CantonVault Hackathon
## Última actualización: 2026-07-14 (todo funcional + UX pendiente de rediseño profundo)

> **LEER ESTO PRIMERO** al iniciar la próxima sesión.
> Estado verificado en vivo, en la DevNet y vía CLI de Cloudflare (wrangler + API).

---

## 🔴 PRIORIDAD #1 — Rediseño profundo de diseño + UX (próxima sesión)

**El backend y la lógica están 100% completos y funcionando. El problema es
visual: el texto no se puede leer porque las letras tienen el mismo color
que los fondos (contraste insuficiente en el tema oscuro).**

Esto NO es algo de cambiar un color puntual. Requiere un **sistema de diseño
completo**: paleta de colores con contraste verificado (WCAG AA mínimo),
jerarquía tipográfica clara, y revisión de cada componente. El jurado necesita
poder LEER el demo sin esfuerzo.

### Qué está mal (diagnóstico de esta sesión)
- **Texto muted (`--text-muted: #a1a1aa`) sobre fondos glass/surface (`#18181b`,
  `rgba(24,24,27,0.65)`)**: contraste ~3:1, por debajo del mínimo WCAG AA (4.5:1).
  Los `form-text`, labels, descripciones y badges secondary desaparecen.
- **Texto `text-muted` sobre `bg-surface bg-opacity-50`**: aún peor, el fondo es
  translúcido sobre `--bg-base: #09090b`, dando ~2.5:1.
- **Cards de commitments/proposals**: `bg-surface bg-opacity-50` + texto muted =
  ilegible. Las party IDs, amounts, descripciones se pierden.
- **Privacy Lab**: las 3 columnas con texto muted sobre glass translúcido.
- **El banner de ayuda que añadimos esta sesión** hereda `text-muted` y también
  se ve mal — el contenido llega pero la capa visual lo oculta.
- **Los `form-text` de ayuda que añadimos** usan `text-muted` → ilegibles.

### Qué SÍ funciona y NO hay que romper
- La lógica: KV, mutations, GETs, optimistic updates, toasts con CID+offset.
- La arquitectura: Pages Functions + Canton DevNet + Splice Validator API.
- El lifecycle: create→accept→fulfill→dispute→resolve verificado E2E.
- Los tooltips `title` en botones (esos sí se leen, son nativos del navegador).

### Plan sugerido para la próxima sesión
1. **Definir paleta con contraste WCAG AA verificado** (mínimo 4.5:1 para texto
   normal, 3:1 para texto grande). Subir `--text-muted` de `#a1a1aa` a algo como
   `#d4d4d8` o `#e4e4e7`. Ajustar `--text-secondary` si hace falta.
2. **Auditar cada superficie** (`--bg-surface`, `--bg-glass`, `bg-surface bg-opacity-*`)
   y garantizar que el texto sobre ellas tiene contraste suficiente.
3. **Sistema de diseño**: definir tokens semánticos (`--text-on-glass`,
   `--text-on-surface`, `--text-on-primary`) en vez de usar `text-muted` global.
4. **Probar con un contrast checker** cada combinación fondo/texto antes de deployar.
5. **Revisar `theme.css` y `App.css`** — ahí están TODOS los estilos. Las clases
   `cv-*` están en `App.css`, las utility/bootstrap overrides en `theme.css`.

### Archivos clave para el rediseño
```
cn-quickstart/quickstart/frontend/src/
├── theme.css              # ← PALETA principal: --text-muted, --bg-surface, --bg-glass
├── App.css                # ← clases cv-* (stepper, vault-header, balance, empty states)
├── views/VaultView.tsx    # ← 850 líneas, usa text-muted y bg-surface por todos lados
├── views/landing.css      # landing page
├── views/login.css        # login page
└── components/
    ├── Header.tsx         # balance badge, nav
    ├── ToastNotification.tsx
    └── vault/VaultActionModals.tsx  # modales usan text-muted
```

---

## ✅ ESTADO ACTUAL (verificado 2026-07-14, offset 4330164)

| Componente | Estado | Evidencia |
|---|---|---|
| **Producción** | ✅ VIVO | `canton-vault.pages.dev` HTTP 200 |
| **Auto-deploy CI/CD** | ✅ FUNCIONANDO | Cada `git push` a `main` → build + functions + deploy automático |
| **Backend Pages Functions** | ✅ Deployadas + detectadas | `/api/health` → Canton 3.5.8 |
| **Balance CC REAL** | ✅ De la red | `/api/vault/balance` → **31,433,860+ CC** vía Splice Validator API |
| **GETs con datos reales** | ✅ VÍA KV | Los 5 GET leen del KV index — proposals/commitments/receipts visibles |
| **resolve.js bug** | ✅ ARREGLADO | Busca DisputeCase en KV (antes en ACS que devolvía [] → siempre 404) |
| **UX on-ledger para jurado** | ✅ Funcional, ⚠️ contraste malo | Toasts/tooltips/ayuda en campos funcionan PERO texto ilegible (contraste insuficiente) |
| **Docs jurado** | ✅ LISTAS | README actualizado + DEMO.md guía paso a paso |
| **Sistema de diseño** | 🔴 PENDIENTE | **Prioridad #1 próxima sesión** — ver arriba |
| **Party del demo** | ✅ `cancore::*` | Writes funcionan + tiene CC del faucet |
| **Lifecycle on-ledger** | ✅ create→accept→fulfill | Verificado E2E con persistencia KV |
| **Git↔Cloudflare** | ✅ CONECTADO | `Git Provider: Yes`, build config corregida |
| **KV namespace** | ✅ BINDEADO | `VAULT_KV` (id `8c756265442a41bc8f57632075790a50`) en production + preview |

### Cuenta de Cloudflare — estado limpio (verificado vía API + wrangler)
```
Projects Pages: 1  → canton-vault (canton-vault.pages.dev)  [Git Provider: Yes ✅]
Worker scripts: 1  → canton-vault (subyacente del Pages project, has_assets: true)
KV namespaces: 1  → VAULT_KV (id: 8c756265442a41bc8f57632075790a50)  ← índice de contractIds
D1 databases:  0
R2 buckets:    0 (no habilitado)
```

### URLs
- **Producción:** https://canton-vault.pages.dev
- **Repo GitHub:** https://github.com/ruwaq/CantonVault
- **Repo GitLab:** https://gitlab.com/PrometeoDev/cantonvault
- **Dashboard CF:** https://dash.cloudflare.com (prometeodev7@gmail.com)
- **Account ID CF:** `5ff44740cbb7e02fbfaceb1295d2e68f`

---

## 🔧 Build config de Cloudflare (lo que costo encontrar)

El auto-deploy desde Git **NO funcionaba** al principio porque la build config estaba
vacía. Estos son los valores correctos (configurados vía API PATCH):

| Campo | Valor | Por qué |
|---|---|---|
| `root_dir` | `cn-quickstart/quickstart/frontend` | Cloudflare busca `functions/` relativo al root_dir. Si está vacío, busca en `/` del repo y no la encuentra. |
| `build_command` | `npm install && npm run build:ci` | Sin `cd` (ya entra al root_dir). Usa `build:ci` que omite `gen:openapi`. |
| `destination_dir` | `dist` | Output del vite build dentro del root_dir. |
| `compatibility_flags` | `["nodejs_compat"]` | Necesario para que las Pages Functions usen `fetch` y APIs de Node. |

### El script `build:ci` vs `build`
- `build` (local): `gen:openapi && tsc && vite build && copy:functions` — regenera types desde `../common/openapi.yaml`
- `build:ci` (Cloudflare): `tsc && vite build && copy:functions` — omite `gen:openapi` porque usa ruta relativa que no existe en el entorno de CF. Los types ya están commiteados en `src/openapi.d.ts`.

**Log clave de éxito:** `Found Functions directory at /functions. Uploading.` + `✨ Compiled Worker successfully`

---

## 🔑 Cómo consultar el balance de CC (Splice Validator API)

El JSON Ledger API (`ledger-api.validator...`) **NO divulga** los holdings de Amulet
al m2m user del sandbox multi-tenant. ACS devuelve siempre 0. La solución es la
**Splice Validator REST API**, que es la fuente autoritativa:

```
GET https://api.validator.devnet.sandbox.fivenorth.io/api/validator/v0/wallet/balance?party=<PARTY>
Authorization: Bearer <token m2m>
```
```json
{
  "round": 52805,
  "effective_unlocked_qty": "31428468.764181837",
  "effective_locked_qty": "0.0000000000",
  "total_holding_fees": "0.0001455392"
}
```

Implementado en `functions/api/_ledger.js` → `walletBalance()` y usado por
`functions/api/vault/balance.js`.

---

## 🔴 LO QUE FALTA (nada urgente — el demo está completo)

### ✅ TODO RESUELTO
- ✅ `git push` — sincronizado con github/main y origin/main
- ✅ Git↔Cloudflare conectado — `Git Provider: Yes`, auto-deploy activo
- ✅ Build config corregida — functions detectadas, `nodejs_compat` activo
- ✅ Faucet CC — la party ya tiene fondos (faucet confirmó "enough funds")
- ✅ Balance CC real — implementado vía Splice Validator API (no más hardcoded 0)
- ✅ Limpieza Cloudflare — 3 Workers residuales eliminados
- ✅ **GETs con datos reales** — índice KV de contractIds (los 5 GET ya devuelven datos)
- ✅ **resolve.js bug** — ahora busca DisputeCase en KV (no en ACS que devolvía [])
- ✅ **UX on-ledger** — toasts con CID+offset, botón copiar CID, empty states accionables
- ✅ **Docs jurado** — README actualizado (sin Spring Boot) + DEMO.md guía paso a paso

### NICE-TO-HAVE — Solo si sobra tiempo antes del deadline (19 jul)

**1. Monitorear cuota de Cloudflare**
Free = 100k req/día + 1k writes/día KV + 100k reads/día KV. Con SWR
(revalidateOnFocus, 0 polling) es imposible superar esto. El demo usa ~5 writes
+ ~30 reads por sesión de jurado. Si vuelve a subir raro, revisar pestañas
abiertas del navegador.

**2. Capturas de pantalla para el README**
Tomar screenshots del demo en los 3 steps (propose, act, privacy lab) y del
toast de éxito con CID+offset. Añadir al README como evidencia visual.

**3. Seed inicial de datos de demo**
El KV arranca vacío. Para que el jurado vea listas pobladas de inmediato al
abrir el demo, se podría crear 1-2 proposals de ejemplo via CLI/endpoint tras
cada limpieza. Opcional — el DEMO.md guía al jurado a crear su propia propuesta.

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

### Bug 4: Balance hardcoded a 0 (esta sesión)
**Síntoma:** `/api/vault/balance` siempre devolvía `balance: 0` en 3 backends.
**Investigación exhaustiva:**
- ACS con `templateIds` (`Splice.Api.Token.HoldingV1:Holding`) → 0 (es interface, no template)
- ACS con `interfaceIds` (`#splice-api-token-holding-v1:...`) → 0 (sandbox no divulga)
- ACS con template concreto (`#splice-amulet:Splice.Amulet:Amulet`) → 0 (mismo)
- `/v2/updates` (transaction history) → funciona pero pega límite de 200 elementos
  (la party `cancore::` es testigo de cientos de contracts HTLC ajenos en cada offset)
- `/v2/commands/completions` → funciona, muestra 2 transfers de faucet, pero sin montos
**Solución:** Splice Validator REST API (`api.validator.devnet.sandbox.fivenorth.io`)
tiene `/api/validator/v0/wallet/balance` que devuelve el balance real sin ACS.
**Lección:** cuando ACS no divulga, la Validator REST API sí puede.

### Bug 5: Auto-deploy no incluía Pages Functions (esta sesión)
**Síntoma:** cada `git push` rompía `/api/*` (devolvía el HTML del SPA en vez de JSON).
**Root cause:** `build_config` estaba vacía en Cloudflare. Con `root_dir=""`, CF
buscaba `functions/` en la raíz del repo y no la encontraba.
**Fix vía API PATCH:**
```
root_dir = "cn-quickstart/quickstart/frontend"
build_command = "npm install && npm run build:ci"
destination_dir = "dist"
compatibility_flags = ["nodejs_compat"]
```
También se agregó `build:ci` al package.json que omite `gen:openapi` (cuya ruta
relativa `../common/openapi.yaml` rompe en el entorno de CF).
**Lección:** `root_dir` determina dónde busca CF las `functions/`. Si tu proyecto
está anidado, debe apuntar al directorio del frontend.

### Bug 6: GET endpoints devuelven [] (ACS no divulga contracts del m2m user)
**Síntoma:** los 5 GET (`/proposals`, `/commitments`, `/receipts`,
`/disclosures`, `/dispute-cases`) siempre devolvían `[]`. El demo se veía vacío.
**Investigación:**
- ACS con `templateIds` (`Vault.CommitmentProposal:CommitmentProposal`) → []
- `/v2/updates` → ERROR 201 elements (demasiado ruido de HTLC ajenos del sandbox)
- `/v2/commands/completions` → 90 resultados, todos `htlc-*` ajenos, nuestras
  `cv-*` quedan fuera del límite de elementos del sandbox
**Solución:** Cloudflare KV (`VAULT_KV`) como índice local append-only de
contractIds. Las 7 mutations escriben `{cid, kind, payload, status}` al crear/ejercer.
Los 5 GET leen de KV filtrando por estado. `kvListAsContracts` mapea el formato
KV al `RawContractEnvelope` del frontend (sin cambios en el frontend de lectura).
**Lección:** cuando el ACS no divulga y el tx history está saturado, un índice
KV local es la solución pragmática. El estado del contract se trackea en el
índice (pending/active/fulfilled/etc.), actualizado por cada mutation.

### Bug 7: resolve.js siempre 404 (buscaba DisputeCase en ACS vacío)
**Síntoma:** `POST /commitments/:id/resolve` devolvía 404 "No active DisputeCase".
**Root cause:** resolve.js buscaba el DisputeCase vía `queryActiveContracts`
(ACS), que devuelve [] en el sandbox. El DisputeCase existía on-ledger pero no
era legible vía ACS.
**Fix:** resolve.js ahora busca en KV: `kvList(env, 'dispute', ['open'])` y
filtra por `sourceCid === commitmentId`. raise-dispute.js guarda el DisputeCase
en KV con `sourceCid` apuntando al commitment original.
**Lección:** nunca depender de ACS para lookups de contracts en el sandbox.
Usar el índice KV con links (`sourceCid`) entre contracts derivados.

### Bug 8: Binding KV no se aplica con `wrangler pages deploy`
**Síntoma:** tras añadir `kv_namespaces` a `wrangler.jsonc` y redeployar, el
endpoint devolvía `"KV namespace VAULT_KV not bound"`.
**Root cause:** `wrangler pages deploy` **ignora** el `wrangler.jsonc` para
Pages (WARNING: "missing pages_build_output_dir"). El binding debe configurarse
en el proyecto de Pages vía la API de Cloudflare.
**Fix vía API PATCH:**
```
PATCH /accounts/{id}/pages/projects/canton-vault
{ "deployment_configs": { "production": { "kv_namespaces": {
    "VAULT_KV": { "namespace_id": "8c756265442a41bc8f57632075790a50" }
} } } }
```
**CRÍTICO:** `kv_namespaces` es un **objeto** (mapa binding→namespace), NO un
array. `{ "VAULT_KV": {"namespace_id":"..."} }`, no `[{"binding":"VAULT_KV",...}]`.
Si mandas array → error 8000006 "Request body is incorrect".
**Lección:** para Pages, los bindings se configuran vía API en
`deployment_configs`, no en el wrangler.jsonc local (este solo aplica para
`wrangler dev` local).

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

functions/api/                   # Pages Functions (Cloudflare)
├── _ledger.js                   # Helpers: getToken, ledgerPost, submitCreate,
│                                #   submitExercise, queryActiveContracts, walletBalance
├── health.js                    # GET /api/health
├── authenticated-user.js        # GET /api/authenticated-user
├── login-links.js               # GET /api/login-links
├── logout.js                    # POST /api/logout
└── vault/
    ├── balance.js               # GET /api/vault/balance → CC real vía Validator API
    ├── parties.js               # GET /api/vault/parties
    ├── proposals.js             # GET (ACS) / POST (create on-ledger)
    ├── proposals/[id]/accept.js # POST → AcceptProposal
    ├── proposals/[id]/reject.js # POST → RejectProposal
    ├── commitments.js           # GET (ACS)
    ├── commitments/[id]/fulfill.js     # POST → Fulfill
    ├── commitments/[id]/raise-dispute.js  # POST → RaiseDispute
    ├── commitments/[id]/refund.js   # POST → Refund
    ├── commitments/[id]/resolve.js # POST → ResolveDispute
    ├── receipts.js              # GET (ACS)
    ├── disclosures.js           # GET (ACS)
    └── dispute-cases.js         # GET (ACS)
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

## 🔧 Configuración técnica clave

### Party del demo
```
cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8
```
Cambió de `5nsandbox-devnet-2::*` (13 jul) a `cancore::*` (14 jul) porque el shared
validator reasignó los rights de user 6. Si las writes vuelven a dar 403, verificar
`/v2/users/6/rights` para ver qué parties tienen `CanActAs`.

### APIs del Canton DevNet (Fivenorth Sandbox)
- **JSON Ledger API:** `https://ledger-api.validator.devnet.sandbox.fivenorth.io`
  - Commands: `POST /v2/commands/submit-and-wait-for-transaction`
  - ACS: `POST /v2/state/active-contracts` (no divulga a m2m user)
  - Ledger end: `GET /v2/state/ledger-end`
- **Splice Validator REST API:** `https://api.validator.devnet.sandbox.fivenorth.io`
  - Balance: `GET /api/validator/v0/wallet/balance?party=<PARTY>` ✅ SÍ divulga
- **Auth:** `https://auth.sandbox.fivenorth.io/application/o/token/`
  - client_id: `validator-devnet-m2m`

### Formato Canton 3.5 JSON Ledger API (verificado)
- **Create/exercise:** `POST /v2/commands/submit-and-wait-for-transaction`
- **Body wrapper:** `{commands: {applicationId, commandId, actAs, readAs, commands: [...], transactionShape: "CURRENT_LEDGER_END"}, workflowId}`
- **ExerciseCommand:** campo del argumento = `choiceArgument` (no `argument`)
- **Response:** `transaction.events[]` con `CreatedEvent.contractId` (el cid real, 104-char)
- **ACS query:** `POST /v2/state/active-contracts` con `{filter:{filtersByParty:{<party>:{identifierFilter:{templateIds:[...]}}}}}`

### Helpers compartidos (`functions/api/_ledger.js`)
- `getToken()` → token m2m cacheado
- `ledgerGet(path)` / `ledgerPost(path, payload)` → wrappers HTTP
- `ledgerEnd()` → offset actual del ledger
- `submitCreate(template, args)` → `{updateId, completionOffset, contractId}`
- `submitExercise(template, cid, choice, arg)` → `{updateId, completionOffset, contractId}`
- `queryActiveContracts(templateIds)` → `[{contractId, payload}]` (devuelve [] en sandbox)
- `walletBalance(party)` → `{unlocked, locked, round}` ← balance CC REAL

---

## 🔧 Comandos útiles

```bash
# Desarrollo local (Vite dev server, proxies /api al backend local)
cd cn-quickstart/quickstart/frontend && npm run dev

# Build producción (local, con gen:openapi)
cd cn-quickstart/quickstart/frontend && npm run build

# Build para CI/Cloudflare (sin gen:openapi)
cd cn-quickstart/quickstart/frontend && npm run build:ci

# Deploy manual a Cloudflare (alternativa si auto-deploy falla)
cd cn-quickstart/quickstart/frontend && npm run build:ci && \
  npx wrangler pages deploy dist --project-name canton-vault --branch main --commit-dirty=true

# Auto-deploy: simplemente git push
git push origin main  # → dispara build en CF automáticamente

# Verificar qué versión está en vivo
curl -s https://canton-vault.pages.dev/api/health
curl -s https://canton-vault.pages.dev/api/vault/balance

# Listar deployments
cd cn-quickstart/quickstart/frontend && npx wrangler pages deployment list --project-name canton-vault

# Ver estado de autenticación de wrangler
cd cn-quickstart/quickstart/frontend && npx wrangler whoami

# CLI contra DevNet (propose/accept/fulfill/dispute/refund)
cd cli && npx tsc && node dist/index.js status
node dist/index.js propose -a 5000 -d "description"
node dist/index.js accept <contractId>

# Consultar balance CC real directo (sin el backend)
TOKEN=$(curl -s -X POST 'https://auth.sandbox.fivenorth.io/application/o/token/' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=client_credentials&client_id=validator-devnet-m2m&client_secret=r69FQmevLRwEgMB8NnKaSDHPewTOSx7Yy5jucsqAlmsAaJc3DlggedCz4tyyonl4W2WoOVzkUIjy8dHTlc16AOJQzx02QzJylAUG56oLTCoVCJUUK40vRv9CqQEY3fjn&audience=validator-devnet-m2m&scope=daml_ledger_api' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
curl -s "https://api.validator.devnet.sandbox.fivenorth.io/api/validator/v0/wallet/balance?party=cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8" \
  -H "Authorization: Bearer $TOKEN"
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
8. **`root_dir` de Cloudflare determina dónde busca `functions/`** — si tu proyecto
   está anidado (`cn-quickstart/quickstart/frontend`), el root_dir debe apuntar ahí.
   Con root_dir vacío, CF no encuentra las Pages Functions.
9. **`gen:openapi` usa rutas relativas que rompen en CI** — usar `build:ci` (sin
   regenerar types) para el auto-deploy. Los types ya están commiteados.
10. **Cuando el ACS no divulga Y el tx history está saturado, usar KV** — el
    sandbox multi-tenant no divulga contracts del m2m user vía ACS, y el
    `/v2/updates` tiene límite de 200 elementos saturado de HTLC ajenos. La
    solución es un índice KV local: las mutations escriben `{cid, kind, payload,
    status}`, los GET leen filtrando por estado. `sourceCid` linkea contracts
    derivados (receipt→commitment, dispute→commitment).
11. **Para Pages, los bindings van en `deployment_configs` vía API, no en
    wrangler.jsonc** — `wrangler pages deploy` ignora el wrangler.jsonc local
    (requiere `pages_build_output_dir` que es otro flujo). El binding KV se
    configura con `PATCH /accounts/{id}/pages/projects/{name}` usando
    `kv_namespaces` como **objeto** `{BINDING: {namespace_id}}`, no como array.

---

## 📅 Timeline del hackathon

- **Deadline:** Domingo 19 julio medianoche
- **Días restantes:** ~5
- **Prioridad:** ✅ demo listo — todo lo urgente está hecho

### ✅ Tareas resueltas (histórico)
- `git push` — HECHO. `66024c6` en `github/main` y `origin/main`.
- Limpieza Cloudflare — HECHA. 3 Workers residuales eliminados.
  Queda 1 Pages project + 1 Worker subyacente (lo mínimo necesario).
- Git↔Cloudflare — CONECTADO. `Git Provider: Yes`, auto-deploy activo.
- Build config CF — CORREGIDA. root_dir + build:ci + nodejs_compat.
  Funciones detectadas y compiladas en cada auto-deploy.
- Faucet CC — la party ya tiene fondos (faucet confirmó "enough funds").
- Balance CC real — implementado vía Splice Validator REST API.
  `/api/vault/balance` ahora devuelve 31,428,468.76 CC reales de la red.

---

## 🔗 Links importantes

- **Producción:** https://canton-vault.pages.dev
- **Repo GitHub:** https://github.com/ruwaq/CantonVault
- **Repo GitLab:** https://gitlab.com/PrometeoDev/cantonvault
- **Faucet CC:** https://stakely.io/faucet/canton-devnet
- **Dashboard CF:** https://dash.cloudflare.com (prometeodev7@gmail.com)
- **Hackathon:** Build on Canton (deadline 19 jul)
