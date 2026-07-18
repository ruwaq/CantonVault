# Session Handoff — CantonVault Hackathon
## Última actualización: 2026-07-18 (AUDITORÍA FASE 2 COMPLETA + REMEDIACIÓN)

> **LEER ESTO PRIMERO** al iniciar la próxima sesión.
> Auditoría completa (43 hallazgos) + remediación de CRITICAL/HIGH/MEDIUM.
> Deadline: **19 julio medianoche** — quedan ~24 horas.

---

## 🧬 AGENTSHIELD → CANTONVAULT CROSS-POLLINATION (esta sesión)

Se analizó el proyecto [AgentShield](https://github.com/ruwaq/AgentShield) (pre-execution
risk guard para AI agents, 171 tests, Solidity + React + MCP en Somnia) y se
identificaron patrones de arquitectura, UI/UX y DX que CantonVault puede adoptar.

### Patrones adaptados de AgentShield:

| Patrón AgentShield | Adaptación CantonVault | Archivo |
|---|---|---|
| **Transparency Panel** — panel expandible que muestra el razonamiento del AI | **Privacy Exposure Bar** — barra horizontal con 4 etapas del ciclo de vida y % de exposición | `PrivacyExposureBar.tsx` |
| **Split-screen live demo** — competidor ve ledger vacío | **4ª columna "Competitor View"** — "0 records found. The competitor's validator node never received this transaction data." | `PrivacyLab.tsx` |
| **Risk bar visualization** — barra horizontal con gradiente verde→rojo | **Privacy Exposure Indicator** — segmentos de color por etapa (0%→30%→100% exposed) | `vault.css` |
| **Verdict badges** — ALLOW (green glow), WARN (amber), BLOCK (red) | **Enhanced Status Badges** — `cv-badge-glow` + `cv-badge-pulse` (Active) / `cv-badge-disputed` (dashed border animado) | `CommitmentCard.tsx` |
| **Live agent terminal** — feed de decisiones en tiempo real | **Privacy Timeline** — journey horizontal del commitment: Proposed → Accepted → Active/Disputed → Settled/Resolved | `PrivacyTimeline.tsx` |
| **MCP endpoint** — stateless analysis service | **Demo Data Seeder** — `POST /api/vault/seed-demo` (4 escenarios, 10 entries KV) | `seed-demo.js` |
| **Toast with proof** — muestra contractId + offset | **Toast con Privacy Proof** — "🔐 Privacy: 2 parties only" o "3 parties — mediator notified" | `ToastNotification.tsx` |

---

## ✅ NUEVO — IMPLEMENTADO ESTA SESIÓN (2026-07-18)

### 1. Demo Data Seeder (`POST /api/vault/seed-demo`)
- **NUEVO**: `functions/api/vault/seed-demo.js`
- 4 escenarios realistas con IDs determinísticos (`00a1c0ffee...`) — no genera duplicados al re-seed
- Limpia entries viejas (random IDs de seeds anteriores) antes de escribir
- Escribe 10 entries en KV: 4 proposals, 3 commitments, 1 dispute, 1 disclosure, 1 receipt

| Escenario | Workflow | Amount | Lifecycle | Visible en Step |
|---|---|---|---|---|
| Invoice Factoring | supply-chain-finance | 100,000 CC | active | Step 2 (Act) |
| OTC Block Trade | otc-block-trade | 10,000,000 CC | disputed | Step 2 (Act) + Step 3 (Privacy Lab) |
| Cross-border Payment | supply-chain-finance | 50,000 CC | fulfilled | Step 3 (Privacy Lab + Receipts) |
| Pending Proposal | supply-chain-finance | 75,000 CC | pending | Step 1 (Propose) |

### 2. Split-Screen "Competitor View" (4ª columna en PrivacyLab)
- **EDIT**: `PrivacyLab.tsx` — grid cambió de `col-lg-4` (3 cols) a `col-lg-3` (4 cols)
- Columna 4: "What the competitor sees" — 🏦 icono, badge "Empty Ledger"
- Texto: "0 records found. The competitor's validator node never received this transaction data."
- Subtexto técnico: "Canton's sub-transaction privacy: data only reaches signatory and observer nodes."
- Microcopy en `copy.ts`: `privacyCol4Title`, `privacyCol4Empty`, `privacyCol4EmptyDetail`, `privacyCol4Subtext`

### 3. Privacy Exposure Indicator
- **NUEVO**: `PrivacyExposureBar.tsx`
- Barra horizontal con 4 etapas: Proposal (0%, 2 parties) → Active (0%, 2 parties) → Disputed (30%, 3 parties) → Resolved (30%, 3 parties)
- Gradiente de color: verde (0%) → amarillo (30%) → rojo (100%)
- Indicador de etapa activa (dot con glow accent)
- Integrado en `PrivacyLab.tsx` entre el banner y las columnas

### 4. Enhanced Status Badges
- **EDIT**: `vault.css` — nuevas clases y keyframes
- `.cv-badge-glow` — box-shadow sutil en badges success/danger/warning
- `.cv-badge-pulse` — animación `cv-badge-pulse` (3s infinite) en badge "Active"
- `.cv-badge-disputed` — borde dashed + animación `cv-badge-disputed` (2s) en badge "In Dispute"
- `@media (prefers-reduced-motion: reduce)` desactiva las animaciones
- **EDIT**: `CommitmentCard.tsx` — aplica `cv-badge-glow cv-badge-pulse` y `cv-badge-glow cv-badge-disputed`

### 5. Privacy Timeline en CommitmentCard
- **NUEVO**: `PrivacyTimeline.tsx`
- Timeline horizontal con 4 nodos: Proposed → Accepted → Active/Disputed → Settled/Resolved
- Cada nodo: icono, label, exposición ("Private"/"Selective"), parties count
- Conectores entre nodos: gris (pendiente) → verde (completado)
- Nodo activo resaltado con accent glow
- **EDIT**: `CommitmentCard.tsx` — integrado después de `TechnicalDetails`

### 6. Toast con Privacy Proof
- **EDIT**: `toastStore.tsx` — `LedgerProof` ahora incluye `privacy?: string`
- **EDIT**: `ToastNotification.tsx` — muestra "🔐 {privacy}" en toasts de éxito
- **EDIT**: `useVaultMutations.ts` — `privacyContext()` retorna string por acción:
  - "Privacy: 2 parties only — mediator and competitors see nothing"
  - "Privacy: 3 parties — mediator now sees amount and description"
  - "Privacy: 2 parties only — settlement receipt is bilateral"

### 7. UI: Botón "Load Demo Data"
- **EDIT**: `VaultHeader.tsx` — botón verde "🚀 Load Demo Data" (cuando KV está vacío) / "🔄 Reload Demo" (cuando tiene datos)
- **EDIT**: `VaultView.tsx` — estado `seeding`, cómputo `isEmpty` (5 arrays vacíos), handler `handleSeed`
- **EDIT**: `vaultStore.tsx` — expone `seedDemoData` en `VaultContextType`
- **EDIT**: `useVaultMutations.ts` — `seedDemoData()` mutation (POST /seed-demo + revalida 6 keys SWR)

---

## ✅ ESTADO DEL DEMO (verificado 2026-07-18)

### Datos en vivo con "Load Demo Data"
```
proposals:     1 (pending — Scenario 4, 75,000 CC)
commitments:   3 (1 active + 1 disputed + 1 fulfilled)
receipts:      1 (fulfillment — Scenario 3)
disclosures:   1 (dispute — Scenario 2)
dispute-cases: 1 (open — Scenario 2)
```

### Build & TypeScript
```
TypeScript: 0 errores (tsc --noEmit limpio)
Vite build: 138 módulos, ~580ms, 0 warnings
CSS: 24.17 KB gzip (5.48 KB)
```

### Flujo de datos verificado
```
[User click "Load Demo Data"]
  → VaultView.handleSeed()
  → vaultStore.seedDemoData()
  → useVaultMutations.seedDemoData()
  → POST /api/vault/seed-demo
  → seed-demo.js: cleanup old entries + write 10 new entries en KV
  → SWR revalida 6 keys (proposals, commitments, receipts, disclosures, disputes, balance)
  → Componentes reciben datos nuevos → UI se actualiza instantáneamente
```

---

## 🗺️ ARQUITECTURA FRONTEND ACTUALIZADA

```
src/
├── styles/                          # CSS modular 3-tier (WCAG AAA)
│   ├── tokens.css                   # Design tokens (primitivos + semánticos)
│   ├── base.css                     # Bootstrap overrides, glass-panel
│   └── vault.css                    # cv-* clases + exposure bar + timeline + badges
├── lib/
│   ├── copy.ts                      # Microcopy dictionary (~50 strings, plain English)
│   ├── fetcher.ts                   # SWR fetcher (8s timeout)
│   └── vaultNormalizers.ts          # Raw JSON → typed domain models
├── hooks/
│   ├── useAuth.ts                   # useUser(), useLogout() — SWR
│   ├── useVaultData.ts              # useProposals(), useCommitments(), etc. — SWR reads
│   └── useVaultMutations.ts         # createProposal(), …, seedDemoData() — SWR mutations
├── stores/
│   ├── vaultStore.tsx               # FACADE over useVaultData + useVaultMutations
│   ├── userStore.tsx                # FACADE over useAuth
│   ├── vaultApi.ts                  # axios instance (baseURL /api/vault)
│   └── toastStore.tsx               # Toast notifications (LedgerProof con privacy)
├── components/
│   ├── ToastNotification.tsx        # Muestra 🔐 privacy context + CID + offset
│   ├── Modal.tsx                    # Portal-based modal (focus trap, Esc)
│   ├── Header.tsx                   # Top nav + balance
│   └── vault/
│       ├── VaultHeader.tsx          # Title + party chip + Sync + Load Demo Data
│       ├── Stepper.tsx              # 3 macro-steps (Create → Act → Verify)
│       ├── CopyCidButton.tsx        # Copy contract ID
│       ├── TechnicalDetails.tsx     # Collapsible "Technical details ▾"
│       ├── ConfirmModal.tsx         # "Here's what will happen" before irreversible actions
│       ├── VaultActionModals.tsx    # Fulfill, Refund, Dispute, Resolve modals
│       ├── act/
│       │   ├── ActStep.tsx          # Orchestrator: commitments + disputes
│       │   ├── CommitmentCard.tsx   # Status-first card + badges glow + PrivacyTimeline
│       │   ├── DisputeCard.tsx      # Escalation card
│       │   └── PrivacyTimeline.tsx  # 🆕 Horizontal lifecycle journey
│       ├── privacy/
│       │   ├── PrivacyLab.tsx       # 🆕 4 columns (incl. Competitor View) + ExposureBar
│       │   ├── PrivacyExposureBar.tsx # 🆕 4-stage exposure indicator
│       │   └── SettlementReceipts.tsx # Payment receipts list
│       └── propose/
│           ├── ProposeWizard.tsx    # 4-screen wizard orchestrator
│           ├── WizardStepDescription.tsx
│           ├── WizardStepAmount.tsx
│           ├── WizardStepParties.tsx
│           └── WizardStepReview.tsx
└── views/
    ├── VaultView.tsx                # Shell ~175 lines — routing + modals + seed handler
    ├── LoginView.tsx
    └── LandingView.tsx

functions/api/                        # Cloudflare Pages Functions
├── _ledger.js                        # Auth, KV, Canton 3.5 helpers
├── health.js                         # GET /api/health
├── authenticated-user.js             # GET /api/authenticated-user
├── login-links.js, logout.js
└── vault/
    ├── seed-demo.js                  # 🆕 POST /api/vault/seed-demo (4 scenarios, 10 KV entries)
    ├── balance.js, parties.js
    ├── proposals.js, proposals/[id]/accept.js, proposals/[id]/reject.js
    ├── commitments.js, commitments/[id]/fulfill.js, …/raise-dispute.js, …/refund.js, …/resolve.js
    ├── receipts.js, disclosures.js, dispute-cases.js
```

---

## 🔴 LO QUE FALTA (deadline 19 jul medianoche)

### 🚨 CRÍTICO — Sin esto no calificas
- [ ] **Pitch video (3 min max)** — 90s problema+solución + 90s demo
- [ ] **Technical demo video (3 min max)** — screen recording del flujo completo
- [ ] **Google Form submission** — en Encode Club dashboard

### 🟡 NICE-TO-HAVE — Si sobra tiempo
- [ ] Capturas de pantalla para el README (3 steps + Privacy Lab 4-columnas)
- [ ] `SUBMISSION_CHECKLIST.md` — actualizar con los nuevos features
- [ ] `presentation_deck.md` — crear el slide deck en Canva
- [ ] Probar el seed-demo en producción (deployar a CF y verificar que el endpoint funciona)

### Guión sugerido para el video (3 min):
1. **0:00-0:30** — Problema: "Institutions can't use public blockchains — everything is visible.
   Competitors see your trades. CantonVault fixes this."
2. **0:30-1:30** — Demo: Click "Load Demo Data" → Step 1 (pending proposal) → Step 2 (active
   + disputed commitments) → Step 3 (Privacy Lab)
3. **1:30-2:00** — MOMENTO WOW: 4ª columna "What the competitor sees" — "0 records found.
   The competitor's validator node never received this transaction data."
4. **2:00-2:30** — Privacy Exposure Bar: "At every stage, we know exactly who sees what."
5. **2:30-3:00** — Cierre: "CantonVault — privacy-first institutional trade finance on Canton."

---

## 🐛 BUGS DOCUMENTADOS (histórico completo — 15 bugs)

### Bugs 1-12 (sesiones anteriores)
Ver historial completo en commits. Resumen:
1. Party ID equivocada (403) → `cancore::*` en vez de `5nsandbox-devnet-2::*`
2. contractId falso (tx hash ≠ contractId) → `submit-and-wait-for-transaction`
3. Formato Canton 3.5 → `choiceArgument` + `{commands:{...}, transactionShape}`
4. Balance hardcoded 0 → Splice Validator REST API
5. Auto-deploy no incluía Pages Functions → `root_dir` + `build:ci`
6. GET endpoints devuelven [] → KV index
7. resolve.js 404 → KV lookup en vez de ACS
8. KV binding no aplica → `deployment_configs` vía API
9. extractCreatedContractId wrong cid en multi-create → `templateFilter`
10. Mediator distinta party → `Observer::*` prefix
11. DAML_AUTHORIZATION_ERROR en ResolveDispute → `extraActAs`
12. Wizard defaults vacíos → `useEffect` populate

### Bugs 13-15 (esta sesión — 2026-07-18)

### Bug 13: IDs aleatorios en seed-demo → duplicados en KV
**Síntoma:** cada click en "Load Demo Data" creaba nuevos entries KV con IDs distintos.
Los entries viejos se acumulaban (nunca se borraban), causando datos duplicados en la UI.
**Fix:** IDs determinísticos (`00a1c0ffee...`, `00b1c0ffee...`, etc.) + cleanup de entries
viejos al inicio del seed (`kvList` + `env.VAULT_KV.delete()`).
**Lección:** los seeds de demo data deben ser idempotentes. IDs fijos + cleanup previo.

### Bug 14: Step 1 (Propose) vacío después del seed
**Síntoma:** los 3 escenarios originales escribían proposals con status `accepted` (no `pending`).
El endpoint `GET /api/vault/proposals` filtra por `status: 'pending'`, así que Step 1
siempre se veía vacío.
**Fix:** añadido Scenario 4 con status `pending` (75,000 CC, "Invoice INV-2026-112").
**Lección:** verificar que cada step del demo tenga datos visibles después del seed.

### Bug 15: `currentStage` useMemo con dependencia inestable
**Síntoma:** `useMemo([sample, disclosures, receipts])` se recomputaba en cada revalidación
SWR aunque los datos no cambiaran, porque `sample` es un objeto con referencia nueva.
**Fix:** dependencias primitivas: `sampleCid`, `sample?.payload.proposer`, `sample?.payload.amount`.
**Lección:** en `useMemo`/`useCallback`, usar valores primitivos como dependencias cuando
los datos vienen de SWR (que produce nuevas referencias en cada revalidación).

---

## 🔧 COMANDOS ÚTILES

```bash
# Desarrollo local
cd cn-quickstart/quickstart/frontend && npm run dev

# TypeScript check
cd cn-quickstart/quickstart/frontend && npx tsc --noEmit

# Build producción
cd cn-quickstart/quickstart/frontend && npm run build:ci

# Deploy manual a Cloudflare
cd cn-quickstart/quickstart/frontend && npm run build:ci && \
  npx wrangler pages deploy dist --project-name canton-vault --branch main --commit-dirty=true

# Auto-deploy: simplemente git push
git push origin main  # → GitHub → dispara build en CF automáticamente

# Verificar producción
curl -s https://canton-vault.pages.dev/api/health
curl -s https://canton-vault.pages.dev/api/vault/balance
curl -s -X POST https://canton-vault.pages.dev/api/vault/seed-demo

# Seed rápido (alternativa al botón UI)
curl -s -X POST https://canton-vault.pages.dev/api/vault/seed-demo | python3 -m json.tool

# KV debug
NS="8c756265442a41bc8f57632075790a50"
cd cn-quickstart/quickstart/frontend
npx wrangler kv key list --namespace-id "$NS" --remote | python3 -c "import sys,json; [print(k['name']) for k in json.load(sys.stdin)]"
```

---

## ⚠️ LECCIONES APRENDIDAS (15 lecciones acumuladas)

1-12. Ver sección de bugs históricos arriba.

13. **Los seeds de demo data deben ser idempotentes** — usar IDs fijos + cleanup de entries
    viejos. Nunca generar IDs aleatorios en un seed endpoint.
14. **Verificar que cada step del demo tenga datos visibles** — el seed debe cubrir todos
    los lifecycle stages, no solo los más interesantes.
15. **En `useMemo`/`useCallback` con datos SWR, usar dependencias primitivas** — SWR
    produce nuevas referencias en cada revalidación aunque los datos no cambien.

---

## 📅 PRÓXIMA SESIÓN

### 🆕 Prioridad #0: Auditoría Integral (Fase 2 — COMPLETADA + REMEDIADA ✅)
- **Plan:** `docs/superpowers/specs/2026-07-18-audit-plan.md`
- **Resultados:** `SECURITY.md` — 43 hallazgos (3 CRITICAL, 6 HIGH, 13 MEDIUM, 12 LOW, 9 INFO)
- **Remediación:** commit `7dcb4fd` — 33 archivos, 1203 inserciones
  - ✅ CRITICAL: `CLIENT_SECRET` movido a env vars en 3 archivos + 13 handlers
  - ✅ HIGH: Daml `Refund` ahora soporta reverse CC settlement
  - ✅ MEDIUM: seed-demo auth, PrivacyLab useMemo fix
  - ✅ LOW: 401 interceptor, CorsConfig, deadline validation
- **⚠️ PENDIENTE:** Rotar el secreto en DevNet (el valor viejo ya está en el historial de git)

### Prioridad #1: Videos (crítico para la submission)
- Grabar pitch video (3 min) y technical demo video (3 min)
- Usar el guión sugerido arriba

### Prioridad #2: Deploy + verificar
- `git push origin main` → verificar que el auto-deploy funciona
- Probar `POST /api/vault/seed-demo` en producción
- Verificar que los 4 escenarios cargan correctamente

### Prioridad #3: Submission
- Completar Google Form en Encode Club dashboard
- Actualizar `SUBMISSION_CHECKLIST.md`
- Opcional: crear slide deck en Canva

---

## 🔗 LINKS

- **Producción:** https://canton-vault.pages.dev
- **Repo GitHub (principal, auto-deploy CF):** https://github.com/ruwaq/CantonVault
- **Repo GitLab (mirror):** https://gitlab.com/PrometeoDev/cantonvault
- **AgentShield (referencia):** https://github.com/ruwaq/AgentShield
- **Dashboard CF:** https://dash.cloudflare.com (prometeodev7@gmail.com)
- **Account ID CF:** `5ff44740cbb7e02fbfaceb1295d2e68f`
- **KV namespace:** `VAULT_KV` (id `8c756265442a41bc8f57632075790a50`)
- **Faucet CC:** https://stakely.io/faucet/canton-devnet
- **Hackathon:** Build on Canton (Encode Club, deadline 19 jul)