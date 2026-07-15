# Session Handoff — CantonVault Hackathon
## Última actualización: 2026-07-15 (DEMO COMPLETO — listo para el jurado)

> **LEER ESTO PRIMERO** al iniciar la próxima sesión.
> Estado verificado en vivo, en la DevNet y vía CLI de Cloudflare (wrangler + API).

---

## ✅ REDISEÑO UX — COMPLETO (8 fases implementadas, en producción)

> Spec: `docs/superpowers/specs/2026-07-14-ux-redesign-design.md`
> Plan ejecutado: `docs/superpowers/plans/2026-07-14-ux-redesign.md`

El rediseño UX completo está **en producción** (`canton-vault.pages.dev`).
Las 8 fases del plan se implementaron en orden, cada una = un commit deployable:

| Fase | Commit | Qué hizo |
|---|---|---|
| 0 — Limpieza | `919872d` | Borró 470 líneas código muerto (License*, DurationInput) |
| 1 — Design tokens | `093441e` | WCAG AA tokens 3-tier, glass 0.65→0.85, `--text-on-glass` |
| 2 — Copy humano | `d875fc7` | `lib/copy.ts` diccionario, ~30 strings jerga→plain English |
| 3+5 — Refactor + Privacy | `8ddbd12` | VaultView 898→153 líneas, Privacy Lab humanizado (sin pseudoterminal) |
| 4 — Wizard | `72d99b0` | ProposeWizard 4 pantallas (1 decisión c/u), deadline 1h/1d/1w |
| 6 — Confirmaciones | `66b3518` | ConfirmModal antes de Accept (beneficial friction) |
| 7 — Auditoría | (verificado) | WCAG AAA confirmado: 14.2:1 text-on-glass, 15.7:1 text-body |

**Bug de contraste RESUELTO:** text-muted en glass era ~3:1 (FAIL AA) → ahora 7.0:1 (AAA). Verificado matemáticamente con calculadora WCAG.

**Post-redesign (2026-07-15):** 3 bugs descubiertos y arreglados durante la verificación E2E:

| Bug | Commit | Descripción |
|---|---|---|
| Mediator single-party | `17eb81f` | `DisclosedRecord` requiere `discloser /= observer`. El mediador ahora es `Observer::*` (prefijo distinto, party separada en Canton). |
| Wizard defaults vacíos | `55b61cb` | `useState` se inicializaba antes de que SWR cargara las parties. `useEffect` rellena defaults cuando `parties` llega. |
| extractCreatedContractId | `978f654` | `RaiseDispute`/`ResolveDispute` crean 2 contratos; el código devolvía el cid del primero (DisclosedRecord), no del DisputeCase/SettlementReceipt. `templateFilter` selecciona el correcto. |
| DAML_AUTHORIZATION_ERROR | `597a88a` | `ResolveDispute` tiene `controller thirdParty`. `buildCommandEnvelope` ahora acepta `extraActAs` para autorizar como `MEDIATOR_PARTY`. |

**Estado del demo (verificado E2E 2026-07-15):**
```
proposals:     2 (pendientes, el jurado puede aceptar/rechazar)
commitments:   6 (activos/disputados/resueltos)
receipts:      2 (1 fulfill + 1 dispute-resuelto)
disclosures:   5 (disputas + resoluciones con campos revelados)
dispute-cases: 0 (todos resueltos)
```

**Arquitectura frontend post-rediseño:**
```
src/
├── styles/                    # NUEVO: CSS modular 3-tier
│   ├── tokens.css             # primitivos + semánticos + alias legacy
│   ├── base.css               # resets, Bootstrap overrides
│   └── vault.css              # cv-* clases específicas
├── lib/copy.ts                # NUEVO: diccionario microcopy plain English
├── views/VaultView.tsx        # 153 líneas (era 898) — shell + routing
└── components/vault/
    ├── VaultHeader, Stepper, CopyCidButton, TechnicalDetails, ConfirmModal
    ├── act/ (ActStep, CommitmentCard, DisputeCard)
    ├── privacy/ (PrivacyLab humanizado, SettlementReceipts)
    └── propose/ (ProposeWizard + 4 WizardStep*)
```

**Intocable (no se modificó, sigue funcionando):**
`stores/*`, `hooks/*`, `lib/fetcher.ts`, `lib/vaultNormalizers.ts`, `utils/*`,
`api.ts`, `functions/api/*`, `openapi.d.ts`.

---

### Resumen del diseño aprobado (ver spec para detalle completo)

3 decisiones resueltas en sesión de brainstorming + 2 investigaciones UX 2026:

| Decisión | Elección | Por qué |
|---|---|---|
| Alcance | **Full redesign + refactor** | Resultado profesional nivel ganador |
| Paleta | **Indigo eléctrico pulido (#6366f1) + WCAG AA** | Coherente, arregla bug de contraste |
| Flujo Propose | **Wizard 4 pantallas (1 decisión c/u)** | "Como un niño podría usarla" |
| Idioma | **Inglés plain** (Cash App level) | Decisión confirmada al implementar |
| Mockups | **Sin mockups, directo a código** | Decisión confirmada al implementar |

---

## ✅ ESTADO ACTUAL (verificado 2026-07-15, offset 4364647)

| Componente | Estado | Evidencia |
|---|---|---|
| **Producción** | ✅ VIVO | `canton-vault.pages.dev` HTTP 200 |
| **Auto-deploy CI/CD** | ✅ FUNCIONANDO | `git push` → GitHub → CF build + deploy automático |
| **Backend Pages Functions** | ✅ Deployadas + detectadas | `/api/health` → Canton 3.5.8 |
| **Balance CC REAL** | ✅ De la red | `/api/vault/balance` → **31,693,018+ CC** vía Splice Validator API |
| **GETs con datos reales** | ✅ VÍA KV | Los 5 GET leen del KV index — proposals/commitments/receipts/disclosures visibles |
| **Rediseño UX completo** | ✅ 8 fases en prod | WCAG AAA, wizard 4 pantallas, copy humano, Privacy Lab humanizado |
| **Contraste WCAG** | ✅ AAA | `--text-on-glass` 14.2:1, `--text-body` 15.7:1 (verificado matemáticamente) |
| **Lifecycle on-ledger** | ✅ create→accept→fulfill→dispute→resolve | Verificado E2E con contractIds reales |
| **resolve.js** | ✅ ARREGLADO (2 bugs) | templateFilter + extraActAs (mediator authorization) |
| **Docs jurado** | ✅ LISTAS | README + DEMO.md actualizados al nuevo wizard flow |
| **Party del demo** | ✅ `cancore::*` + `Observer::*` | Writes funcionan, el mediador es party distinta (requerido por Daml) |
| **Git↔Cloudflare** | ✅ CONECTADO | `origin` = GitHub (dispara auto-deploy), `gitlab` = mirror |
| **KV namespace** | ✅ BINDEADO | `VAULT_KV` (id `8c756265442a41bc8f57632075790a50`) en production + preview |

### Datos en vivo (lo que ve el jurado al abrir el demo)
```
proposals:     2 (pendientes — el jurado puede aceptar/rechazar)
commitments:   6 (activos, disputados, resueltos)
receipts:      2 (1 fulfillment + 1 dispute-resuelto por el mediador)
disclosures:   5 (disputas + resoluciones con campos revelados)
dispute-cases: 0 (todos resueltos — el jurado puede crear uno nuevo)
```

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
- **Repo GitHub (principal, origina el auto-deploy):** https://github.com/ruwaq/CantonVault
- **Repo GitLab (mirror opcional):** https://gitlab.com/PrometeoDev/cantonvault
- **Dashboard CF:** https://dash.cloudflare.com (prometeodev7@gmail.com)
- **Account ID CF:** `5ff44740cbb7e02fbfaceb1295d2e68f`

### ⚠️ Remotes git (corregido 2026-07-14)
Cloudflare escucha **GitHub**, NO GitLab. Por eso:
- `origin` → **github.com/ruwaq/CantonVault** (upstream de `main`, `git push` a secas va aquí → dispara auto-deploy CF) ✅
- `gitlab` → gitlab.com/PrometeoDev/cantonvault (mirror; push explícito `git push gitlab main` solo si se quiere sincronizar)

**NUNCA empujar solo a GitLab esperando un deploy** — CF no lo ve. El deploy
solo ocurre tras `git push origin main` (→ GitHub). Si el auto-deploy falla,
desplegar manualmente: `cd cn-quickstart/quickstart/frontend && npx wrangler
pages deploy dist --project-name canton-vault --branch main --commit-dirty=true`.

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

## 🔴 LO QUE FALTA (post-rediseño — el demo está completo)

### ✅ TODO RESUELTO (esta sesión)
- ✅ Rediseño UX — 8 fases implementadas y en producción
- ✅ WCAG AAA — contraste verificado matemáticamente (14.2:1 text-on-glass)
- ✅ Copy humano — `lib/copy.ts`, ~40 strings plain English, 0 jerga Daml visible
- ✅ Wizard 4 pantallas — 1 decisión por pantalla, deadline 1h/1d/1w
- ✅ Privacy Lab humanizado — sin pseudoterminal, lock-icon empty state
- ✅ Confirmaciones — "Here's what will happen" antes de Accept
- ✅ **dispute→resolve E2E** — arreglados 3 bugs: extractCreatedContractId, mediador como party distinta, DAML_AUTHORIZATION_ERROR
- ✅ Remotes git corregidos — `origin` = GitHub (dispara CF), `gitlab` = mirror
- ✅ DEMO.md actualizado al nuevo wizard flow
- ✅ Seed de datos — 2 proposals, 6 commitments, 2 receipts, 5 disclosures

### NICE-TO-HAVE — Solo si sobra tiempo antes del deadline (19 jul)

**1. Capturas de pantalla para el README**
Tomar screenshots del demo en los 3 steps (Create, Act, Verify) y del
toast de éxito con CID+offset. Añadir al README como evidencia visual.

**2. Monitorear cuota de Cloudflare**
Free = 100k req/día + 1k writes/día KV + 100k reads/día KV. Con SWR
(revalidateOnFocus, 0 polling) es imposible superar esto.

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

### Bug 9: extractCreatedContractId devuelve el cid equivocado en multi-create (2026-07-15)
**Síntoma:** `resolve.js` fallaba con `WRONGLY_TYPED_CONTRACT`. El ledger decía:
"Expected contract of type DisputeCase but got DisclosedRecord".
**Root cause:** `RaiseDispute` y `ResolveDispute` crean **2 contratos** cada uno
(DisclosedRecord + DisputeCase / SettlementReceipt). `extractCreatedContractId`
devolvía el primer `CreatedEvent` — siempre el DisclosedRecord. El KV indexaba
el cid del DisclosedRecord como si fuera el DisputeCase, y `resolve.js` trataba
de ejercer `ResolveDispute` (choice de DisputeCase) sobre un DisclosedRecord.
**Fix:** `extractCreatedContractId` acepta `templateFilter` opcional.
`submitExercise` lo propaga como `createdTemplateFilter`. `raise-dispute.js`
pasa `'DisputeCase'`, `resolve.js` pasa `'SettlementReceipt'`.
**Lección:** cuando un choice Daml crea múltiples contratos, el orden en los
eventos del ledger refleja el orden de ejecución del choice. No asumir que el
primer CreatedEvent es el contrato que necesitas.

### Bug 10: Mediador debe ser party distinta del actor (2026-07-15)
**Síntoma:** `raise-dispute` fallaba con `PreconditionFailed` en DisclosedRecord.
**Root cause:** `DisclosedRecord` tiene `ensure discloser /= observer`. En el
demo original, los 3 roles (proposer/accepter/thirdParty) eran la misma party
(`cancore::*`), violando la precondición. El sandbox tiene 52 prefijos de party
con CanActAs — todos con el mismo hash.
**Fix:** `MEDIATOR_PARTY = 'Observer::1220a14...'` (distinto prefijo, mismo hash).
Canton los trata como parties separadas con vistas de validator independientes.
`parties.js` devuelve el mediador como `MEDIATOR_PARTY`. El wizard lo pre-selecciona.
**Lección:** `Party` en Canton incluye el prefijo. Prefijos distintos = parties
distintas para el ledger, aunque el hash subyacente sea el mismo.

### Bug 11: DAML_AUTHORIZATION_ERROR en ResolveDispute (2026-07-15)
**Síntoma:** `resolve.js` fallaba con "requires authorizers Observer::... but
only cancore::... were given".
**Root cause:** `ResolveDispute` tiene `controller thirdParty`. Con el mediador
como party distinta (`Observer::*`), el comando necesitaba autorización de esa
party, pero `buildCommandEnvelope` solo enviaba `actAs: [PARTY]` (cancore).
**Fix:** `buildCommandEnvelope` acepta `extraActAs` (deduplicado, PARTY siempre
primario). `submitExercise` lo propaga. `resolve.js` pasa `[MEDIATOR_PARTY]`.
**Lección:** en Canton, cada `controller` del choice debe estar en `actAs`. Si
el controller es una party distinta del actor principal, hay que incluirla.

### Bug 12: Wizard defaults vacíos por race condition SWR (2026-07-15)
**Síntoma:** el botón "Next" del wizard (pantalla 3, "Who else is involved?")
estaba deshabilitado aunque los selects mostraban "Accepter (Financier)" y
"Mediator (Arbitrator)".
**Root cause:** `useState` inicializaba `accepter`/`thirdParty` con `''` porque
`parties` estaba vacío en el primer render (SWR aún no había cargado). Cuando
las parties llegaban 200ms después, `useState` no se re-ejecutaba. El
`<select>` mostraba la primera opción visualmente (comportamiento nativo del
navegador cuando `value=""` no matchea), pero el estado React seguía siendo `''`.
**Fix:** `useEffect` en `ProposeWizard` rellena los defaults cuando `parties`
termina de cargar, con guard para no sobrescribir valores que el usuario ya
haya elegido manualmente.
**Lección:** `useState` no se re-ejecuta cuando las props cambian. Si el valor
inicial depende de datos asíncronos, usar `useEffect` para poblarlo cuando
lleguen.

---

## 🏗️ Arquitectura actual del frontend (post-rediseño UX)

```
src/
├── styles/                        # NUEVO: CSS modular 3-tier (WCAG AAA)
│   ├── tokens.css                 # primitivos (zinc scale) + semánticos + alias legacy
│   ├── base.css                   # resets, Bootstrap overrides, glass-panel, btn, modals
│   └── vault.css                  # cv-* clases específicas de CantonVault
├── lib/
│   ├── copy.ts                    # NUEVO: diccionario microcopy (~40 strings plain English)
│   ├── fetcher.ts                 # SWR fetcher con timeout 8s + FetchError
│   └── vaultNormalizers.ts        # raw backend → typed domain models
├── hooks/
│   ├── useAuth.ts                 # useUser(), useLogout(), useLoginLinks() — SWR
│   ├── useVaultData.ts            # useProposals(), useCommitments(), etc. — SWR lectura
│   └── useVaultMutations.ts       # createProposal(), acceptProposal(), etc. — SWR mutate
├── stores/
│   ├── userStore.tsx              # FACADE thin sobre useAuth
│   ├── vaultStore.tsx             # FACADE thin sobre useVaultData+Mutations
│   ├── vaultApi.ts                # axios instance (baseURL /api/vault)
│   └── toastStore.tsx             # notificaciones
├── components/vault/              # NUEVO: componentes modulares (<200 líneas c/u)
│   ├── VaultHeader.tsx            # título + party chip + sync button
│   ├── Stepper.tsx                # 3 macro-steps (Create → Act → Verify)
│   ├── CopyCidButton.tsx          # botón copiar contractId, reutilizable
│   ├── TechnicalDetails.tsx       # panel colapsable "Technical details ▾"
│   ├── ConfirmModal.tsx           # "Here's what will happen" antes de acciones irreversibles
│   ├── VaultActionModals.tsx      # FulfillModal, RefundModal, DisputeModal, ResolveModal
│   ├── act/
│   │   ├── ActStep.tsx            # orquestador de commitments + disputes
│   │   ├── CommitmentCard.tsx     # status-first card + TechnicalDetails
│   │   └── DisputeCard.tsx        # escalation card
│   ├── privacy/
│   │   ├── PrivacyLab.tsx         # 3 columnas humanizadas (sin pseudoterminal)
│   │   └── SettlementReceipts.tsx # lista de payment receipts
│   └── propose/
│       ├── ProposeWizard.tsx      # orquestador 4 pantallas + estado
│       ├── WizardStepDescription.tsx  # Pantalla 1: "What's this for?"
│       ├── WizardStepAmount.tsx       # Pantalla 2: "How much?"
│       ├── WizardStepParties.tsx      # Pantalla 3: "Who else?"
│       └── WizardStepReview.tsx       # Pantalla 4: "Review and send"
└── views/
    ├── VaultView.tsx              # Shell ~153 líneas (era 898) — routing + modales
    ├── LoginView.tsx              # usa useLoginLinks() SWR
    └── LandingView.tsx            # landing page estática

functions/api/                      # Pages Functions (Cloudflare) — INTOCABLES
├── _ledger.js                      # Helpers: getToken, ledgerPost, submitCreate,
│                                   #   submitExercise, walletBalance, kvList, kvPut,
│                                   #   extractCreatedContractId (con templateFilter),
│                                   #   buildCommandEnvelope (con extraActAs)
├── health.js                       # GET /api/health
├── authenticated-user.js           # GET /api/authenticated-user
├── login-links.js                  # GET /api/login-links
├── logout.js                       # POST /api/logout
└── vault/
    ├── balance.js                  # GET /api/vault/balance → CC real vía Validator API
    ├── parties.js                  # GET /api/vault/parties (PARTY + MEDIATOR_PARTY)
    ├── proposals.js                # GET (KV) / POST (create on-ledger)
    ├── proposals/[id]/accept.js    # POST → AcceptProposal
    ├── proposals/[id]/reject.js    # POST → RejectProposal
    ├── commitments.js              # GET (KV)
    ├── commitments/[id]/fulfill.js      # POST → Fulfill
    ├── commitments/[id]/raise-dispute.js # POST → RaiseDispute (con templateFilter 'DisputeCase')
    ├── commitments/[id]/refund.js       # POST → Refund
    ├── commitments/[id]/resolve.js      # POST → ResolveDispute (con templateFilter + extraActAs)
    ├── receipts.js                 # GET (KV)
    ├── disclosures.js              # GET (KV)
    └── dispute-cases.js            # GET (KV)
```
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
- `PARTY` = `'cancore::1220a14...'` — actor principal del demo
- `MEDIATOR_PARTY` = `'Observer::1220a14...'` — mediador (party distinta, requerido por Daml)
- `getToken()` → token m2m cacheado
- `ledgerGet(path)` / `ledgerPost(path, payload)` → wrappers HTTP
- `ledgerEnd()` → offset actual del ledger
- `buildCommandEnvelope(commands, extraActAs?)` → actAs incluye PARTY + extraActAs
- `submitCreate(template, args)` → `{updateId, completionOffset, contractId}`
- `submitExercise(template, cid, choice, arg, createdTemplateFilter?, extraActAs?)` → `{updateId, completionOffset, contractId}`
- `extractCreatedContractId(txResponse, templateFilter?)` → cid del CreatedEvent correcto
- `queryActiveContracts(templateIds)` → `[{contractId, payload}]` (devuelve [] en sandbox)
- `walletBalance(party)` → `{unlocked, locked, round}` ← balance CC REAL
- `kvList(env, kind, statuses?)` → lista records del índice KV
- `kvPut(env, kind, cid, entry)` → escribe en el índice KV
- `kvUpdateStatus(env, kind, cid, status)` → actualiza solo el status

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
git push origin main  # → GitHub → dispara build en CF automáticamente

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

# KV debug — listar/borrar keys del índice (namespace VAULT_KV)
NS="8c756265442a41bc8f57632075790a50"
cd cn-quickstart/quickstart/frontend
npx wrangler kv key list --namespace-id "$NS" --remote | python3 -c "import sys,json; [print(k['name']) for k in json.load(sys.stdin)]"
npx wrangler kv key delete "dispute:<cid>" --namespace-id "$NS" --remote
npx wrangler kv key delete "disclosure:<cid>" --namespace-id "$NS" --remote

# Seed rápido — crear proposal de demo (para repoblar KV si está vacío)
MEDIATOR="Observer::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8"
ACTOR="cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8"
curl -s -X POST https://canton-vault.pages.dev/api/vault/proposals \
  -H "Content-Type: application/json" \
  -d "{\"accepter\":\"$ACTOR\",\"thirdParty\":\"$MEDIATOR\",\"amount\":5000,\"currency\":\"CC\",\"description\":\"Demo proposal\",\"workflow\":\"supply-chain-finance\",\"deadlineSeconds\":604800}"
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
12. **`extractCreatedContractId` devuelve el PRIMER CreatedEvent** — cuando un
    choice Daml crea múltiples contratos (ej. RaiseDispute crea DisclosedRecord +
    DisputeCase), el primer CreatedEvent puede no ser el que necesitas. Usar
    `templateFilter` para seleccionar el correcto.
13. **`Party` en Canton incluye el prefijo — prefijos distintos = parties distintas**
    para el ledger, aunque el hash subyacente sea el mismo. El sandbox tiene 52
    prefijos con CanActAs. Usar `Observer::*` como mediador permite que el flujo
    de dispute funcione (la precondición `discloser /= observer` se cumple).
14. **Cada `controller` de un choice Daml debe estar en `actAs`** — si el
    controller es una party distinta del actor principal, hay que incluirla en el
    comando vía `extraActAs`. `ResolveDispute` es `controller thirdParty` y
    requiere autorización del mediador.
15. **`useState` no se re-ejecuta cuando las props cambian** — si el valor inicial
    depende de datos asíncronos (SWR), usar `useEffect` para poblarlo cuando
    lleguen. El `<select>` muestra la primera opción por comportamiento nativo del
    navegador aunque el estado React sea `''`.

---

## 📅 Timeline del hackathon

- **Deadline:** Sábado 19 julio medianoche
- **Días restantes:** ~4
- **Prioridad:** ✅ demo completo — listo para el jurado

### ✅ Tareas resueltas (histórico completo)
- ✅ Rediseño UX — 8 fases implementadas y en producción (WCAG AAA, wizard, copy humano)
- ✅ **dispute→resolve E2E** — 4 bugs arreglados: extractCreatedContractId, mediador party distinta, DAML_AUTHORIZATION_ERROR, wizard defaults
- ✅ Remotes git — `origin` = GitHub (dispara auto-deploy CF), `gitlab` = mirror
- ✅ Seed de datos — 2 proposals, 6 commitments, 2 receipts, 5 disclosures
- ✅ DEMO.md actualizado al nuevo wizard flow
- ✅ Balance CC real — implementado vía Splice Validator REST API (31.7M+ CC)
- ✅ GETs con datos reales — índice KV de contractIds (los 5 GET devuelven datos)
- ✅ `resolve.js` — arreglado (buscaba DisputeCase en ACS que devolvía [])
- ✅ Git↔Cloudflare — `Git Provider: Yes`, auto-deploy activo
- ✅ Build config CF — root_dir + build:ci + nodejs_compat
- ✅ Faucet CC — la party tiene fondos
- ✅ Limpieza Cloudflare — 3 Workers residuales eliminados

---

## 🔗 Links importantes

- **Producción:** https://canton-vault.pages.dev
- **Repo GitHub (principal, dispara auto-deploy CF):** https://github.com/ruwaq/CantonVault
- **Repo GitLab (mirror opcional):** https://gitlab.com/PrometeoDev/cantonvault
- **Faucet CC:** https://stakely.io/faucet/canton-devnet
- **Dashboard CF:** https://dash.cloudflare.com (prometeodev7@gmail.com)
- **Hackathon:** Build on Canton (deadline 19 jul)
