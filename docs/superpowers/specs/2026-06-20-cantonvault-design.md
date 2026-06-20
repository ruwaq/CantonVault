# CantonVault — Design Spec

> **Spec formal del proyecto para Build on Canton Hackathon (Encode Club, Jun–Jul 2026).**
> Este documento consolida estrategia + arquitectura + pitch en una especificación única,
> base del plan de implementación. Derivado de los docs de decisiones en `docs/decisiones/`.

| Campo | Valor |
|---|---|
| **Producto** | CantonVault |
| **Tagline** | *"Privacy-first conditional commitments for institutional trade finance."* |
| **Tracks** | Track 1 (Private DeFi) primario + Track 2 (TradeFi/RWA) |
| **Estado** | Aprobado — listo para plan de implementación |
| **Fecha** | 2026-06-20 |
| **Versión** | v2 institucional |

---

## 1. Resumen ejecutivo

CantonVault es una **primitiva de compromiso condicional privado** para Canton Network. Permite que dos partes acuerden un compromiso financiero (pago, factorización, trade) con condiciones de liberación, donde:

- Las dos partes ven el compromiso y sus condiciones
- Un tercero (comprador de factura, clearing) **no ve nada** hasta que se le otorga disclosure selectivo on-demand
- Un competidor o mercado externo conectado al mismo nodo ve un **ledger vacío** (el contrato literalmente no existe para ese nodo)
- El settlement ocurre **atómicamente en Canton Coin** (burn-mint equilibrium)

La privacidad **no es una capa criptográfica bolted-on** (Canton Foundation: *"opacity is a liability, privacy without proof isn't privacy"*). Es la **propiedad emergente del stakeholder-scoping a nivel protocolo**.

### Por qué Canton (versión honesta y defendible)

> ⚠️ **NO usar "imposible en Ethereum"** — es falso en 2026 con ZK (Aztec/Aleo/Mina).

| Requisito | Canton | Ethereum + ZK | Ventaja Canton |
|---|---|---|---|
| Compromiso condicional privado | ✅ nativo (~120 líneas Daml) | ✅ posible (~1000 líneas circuits Noir) | 3x más fácil |
| Privacidad de términos | ✅ protocol-level (nodo no recibe datos) | 🟡 datos existen pero cifrados | **data non-existence** |
| Árbitro ve solo en disputa | ✅ DisputeCase on-demand | ✅ buildable con ZK note-reveal | empate técnico, Canton más simple |
| Fuga de metadatos | ✅ cero | 🟡 timing/existencia de TX leak | **Canton gana** |
| Settlement atómico nativo | ✅ Canton Coin (burn-mint) | ❌ requiere wrap + bridge risk | **Canton gana** |

**Pitch defensivo**: *"En Ethereum puedes construir esto con ZK — a 10x el coste en ingeniería, con fuga de metadatos, sin settlement atómico nativo. Canton hace la privacidad el default."*

### Anti-Corda (preempt explícito)

CantonVault es estructuralmente similar a un CorDapp. Slide dedicada: *"¿No es esto Corda? Sí, este patrón nació en Corda. Canton lo evoluciona con (a) **global synchronizer** para contratos privados composibles cross-firm, (b) **Canton Coin** con settlement atómico nativo. Corda no tenía ninguno."*

---

## 2. Escenarios de demo (literales del brief oficial)

### Escenario 1 (principal, ~65% del demo): **Invoice Financing Privado** (Track 1)

**Actores**:
- `SME Corp` — vendedor, tiene factura pendiente
- `Buyer Corp` — comprador grande, paga a Net 60
- `Financier` — fondo / factor que adelanta cash con 5% descuento

**Flujo**:
1. SME crea `CommitmentProposal` (SME = payer del repayment, Financier = payee, Buyer referenciado pero NO stakeholder)
2. Financier acepta → se crea `CommitmentContract`. SME y Financier ven. **Buyer y competidores NO.**
3. Cuando Buyer paga la factura al SME → SME confirma → `Fulfill`
4. Settlement atómico en Canton Coin: repayment al Financier. Se crea `SettlementReceipt`.

**Dolor que resuelve (verificado)**: double-factoring (SME factoriza la misma factura a múltiples financiers) y signal de debilidad (el mercado se entera que la SME necesita liquidez). Compliance con Basel III/MiCA reporting on-demand.

**Split-screen**:

| SME Corp | Financier | Buyer Corp | Competidor |
|---|---|---|---|
| ✅ Ve compromiso + repayment | ✅ Ve compromiso + repayment | ❌ **Vacío** | ❌ **Vacío siempre** |

### Escenario 2 (complementario, ~25%): **OTC Block Trade Privado** (Track 1/3)

**Actores**:
- `Dealer A`, `Dealer B` — negocian bloque OTC (bonos/derivados)
- `Clearing house` — necesita ver lo mínimo para netting

**Flujo**:
1. Dealer A crea `CommitmentProposal` (price, size, instrument) → Dealer B observer
2. Dealer B acepta → `CommitmentContract` creado. Ambos dealers ven. **Clearing no ve nada aún.**
3. En settlement → `Fulfill` → se crea `DisclosureContract` para el clearing con SOLO los campos de netting (no el portfolio completo)
4. Settlement atómico en Canton Coin

**Dolor que resuelve (verificado)**: front-running (competencia ve el block order antes de exec), info privilegiada (clearing ve portfolio completo). Compliance con MiCA/ISDA.

**Split-screen**:

| Dealer A | Dealer B | Clearing | Mercado |
|---|---|---|---|
| ✅ Ve trade completo | ✅ Ve trade completo | 🟡 Ve **solo netting** (disclosure selectivo) | ❌ **Vacío** |

### Cierre (~10%): *"Una primitiva, múltiples workflows"*

Mismo contrato subyacente. Invoice financing privado y OTC block trade privado. Privacidad selectiva como propiedad emergente del stakeholder-scoping.

---

## 3. Arquitectura

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND                            │
│  React 18 + TypeScript + Vite + TailwindCSS           │
│  • Dashboard de compromisos (rol A / rol B)           │
│  • Crear compromiso (Propose flow)                    │
│  • Detalle + acciones (Fulfill / Dispute / Resolve)   │
│  • 🔥 Vista SPLIT-SCREEN (4 cuadrantes) — la killer   │
│    Parte A | Parte B | Tercero | Competidor           │
├──────────────────────────────────────────────────────┤
│                 common/openapi.yaml                    │
│   ← FUENTE ÚNICA de verdad (contract-first)           │
├──────────────────────────────────────────────────────┤
│                    BACKEND                             │
│  Java 21 + Spring Boot 3.4                             │
│  Writes: gRPC → Canton participant (LEDGER_HOST:3901) │
│  Reads:  PQS (Postgres SQL sobre Active Contract Set) │
│  Auth:   shared-secret (dev) / OAuth2 Keycloak (prod) │
├──────────────────────────────────────────────────────┤
│              SMART CONTRACTS (Daml 3.4.11)             │
│  • CommitmentProposal  (Propose pattern)              │
│  • CommitmentContract  (Disclosure interface)         │
│  • DisputeCase         (tercero on-demand)            │
│  • SettlementReceipt   (recibo inmutable)             │
│  + Settlement REAL con Canton Coin (amulet token std) │ ← NON-NEGOTIABLE
├──────────────────────────────────────────────────────┤
│              INFRAESTRUCTURA                           │
│  Dev:    cn-quickstart Docker LocalNet (compose)      │
│  Live:   CPort devnet.c4.io (.dar upload al validator)│
└──────────────────────────────────────────────────────┘
```

**Base**: `digital-asset/cn-quickstart` (commit main, Daml SDK 3.4.11, Splice 0.5.3).

**Decisión de infraestructura dual**:
- **Desarrollo**: `make start` con cn-quickstart Docker LocalNet → 100% control, logs, debugging
- **Live para jueces**: subir el `.dar` compilado a CPort devnet → cumple el requirement "Link to live product"
- **Fallback** si CPort no coopera: LocalNet docker con instrucciones claras de 1 comando en README + video demo

> ⚠️ **CPort no documentado oficialmente**. Acción semana 1: confirmar con Jatin en Discord 3 cosas: (1) cómo subir `.dar`, (2) URL base del JSON API, (3) formato de party ID.

---

## 4. Smart contracts (Daml) — diseño detallado

### Principio rector de privacidad

> **El tercero NUNCA debe ser controller de una choice sobre `CommitmentContract`**, porque ejercer una choice divulga el contrato al controller (concepto de *divulgence* en Daml). Las choices del tercero viven en `DisputeCase` / `DisclosureContract`, contratos separados.

### Template 1: `CommitmentProposal` (Patrón Propose)

Adaptación del `AppInstallRequest` del cn-quickstart.

```daml
module Vault.CommitmentProposal where

template CommitmentProposal with
    proposer      : Party      -- quien crea (SME / Dealer A)
    accepter      : Party      -- quien acepta (Financier / Dealer B)
    thirdParty    : Party      -- referenciado, PERO no stakeholder aún
    amount        : Decimal
    currency      : Text       -- "CC" (Canton Coin), "USD"
    description   : Text       -- "Invoice INV-2026-001 factoring" / "OTC block 5000 bonds"
    workflow      : Text       -- "invoice-financing" | "otc-block-trade"
    deadline      : Time
  where
    signatory proposer                       -- solo el proponente autoriza la creación
    observer  accepter                       -- la contraparte ve, pero no puede alterar
    ensure amount > 0.0
    ensure proposer /= accepter

    choice AcceptProposal : ContractId CommitmentContract
      controller accepter
      do create CommitmentContract with
           proposer = proposer
           accepter = accepter
           thirdParty = thirdParty
           amount = amount
           currency = currency
           description = description
           workflow = workflow
           deadline = deadline
           status = Active

    choice RejectProposal : ()
      controller accepter
      do pure ()   -- consuming: archiva la propuesta
```

**Privacidad**: `proposer` y `accepter` ven la propuesta. `thirdParty` **no** la ve. Competidor **no** la ve.

### Template 2: `CommitmentContract` (con Disclosure interface)

```daml
module Vault.CommitmentContract where

data Status = Active | Fulfilled | Disputed | Refunded deriving (Eq, Show)

template CommitmentContract with
    proposer      : Party
    accepter      : Party
    thirdParty    : Party        -- REFERENCIADO pero NO en observer/signatory
    amount        : Decimal
    currency      : Text
    description   : Text
    workflow      : Text
    deadline      : Time
    status        : Status
  where
    signatory proposer, accepter     -- SOLO las dos partes
    -- ⚠️ NO 'observer thirdParty' aquí — esta es la clave de la privacidad
    ensure amount > 0.0

    -- Cumplimiento normal: una parte entrega, la otra confirma
    choice Fulfill : ContractId SettlementReceipt
      controller proposer, accepter     -- acordar quién confirma según workflow
      do
        -- 🔥 Settlement REAL con Canton Coin (amulet token standard)
        -- Patrón: LicenseRenewalRequest_CompleteRenewal del cn-quickstart
        -- Ejecuta Allocation_ExecuteTransfer del token standard de Splice
        now <- getTime
        create SettlementReceipt with
          proposer = proposer
          accepter = accepter
          amount = amount
          currency = currency
          timestamp = now

    -- Cualquiera de las 2 partes puede levantar disputa
    -- Esto crea el DisputeCase → aquí el thirdParty ENTRA como observer
    nonconsuming choice RaiseDispute : ContractId DisputeCase
      with reason : Text
      controller proposer, accepter
      do create DisputeCase with
           commitmentRef = self   -- ContractId referencia
           proposer = proposer
           accepter = accepter
           thirdParty = thirdParty
           reason = reason
           amountRevealed = amount      -- solo ahora el tercero ve el monto
           descriptionRevealed = description

    -- Antes de deadline, proposer puede recuperar (si accepter no responde)
    choice Refund : ()
      with actor : Party
      controller actor
      do require "Actor is a signatory" (actor `elem` signatory this)
         now <- getTime
         assertMsg "Cannot refund before deadline exceeded" (now >= deadline)
         -- lógica de refund con Canton Coin
```

> **Implementación de la Disclosure interface de Daml.Finance**: opcional como alternativa elegante al patrón DisputeCase manual. Si compila en SDK 3.4.11 (verificar semana 1), implementarla en `CommitmentContract` con disclosure-controllers = `{proposer, accepter}`. El flujo "raise dispute" llama `AddObservers` con contexto `"dispute"` y party `thirdParty`. Ver `docs/investigacion-tecnica.md` §1.4.

**Privacidad garantizada**:
- Proposer y accepter: ven todo siempre
- ThirdParty: **no ve nada** mientras no haya disputa/disclosure
- Competidor: **no ve nada nunca**
- Cuando se levanta disputa → se crea `DisputeCase` → thirdParty ve SOLO lo que ponemos en ese contrato

### Template 3: `DisputeCase` (tercero on-demand)

```daml
module Vault.DisputeCase where

import Vault.CommitmentContract (Status(..))

template DisputeCase with
    commitmentRef         : ContractId CommitmentContract
    proposer              : Party
    accepter              : Party
    thirdParty            : Party
    reason                : Text
    amountRevealed        : Decimal      -- ⚠️ NO copiamos TODO el contrato
    descriptionRevealed   : Text
    ruling                : Optional Text
  where
    signatory proposer, accepter
    observer  thirdParty                 -- 🔥 recién aquí el tercero entra

    -- El tercero decide: a favor de proposer o accepter
    choice ResolveDispute : ContractId SettlementReceipt
      with ruling : Text
      controller thirdParty               -- solo el tercero ejerce esto
      do
        now <- getTime
        -- Lógica según ruling:
        --   "proposer" → ejecuta Fulfill en commitmentRef (paga al accepter)
        --   "accepter" → ejecuta Refund en commitmentRef (devuelve al proposer)
        -- Detalle del branch por ruling se define en implementación (ver plan).
        create SettlementReceipt with
          proposer = proposer
          accepter = accepter
          amount = amountRevealed
          currency = "CC"
          timestamp = now
          note = Some ("resolved by third party: " <> ruling)
```

### Template 4: `SettlementReceipt` (recibo inmutable)

```daml
module Vault.SettlementReceipt where

template SettlementReceipt with
    proposer      : Party
    accepter      : Party
    amount        : Decimal
    currency      : Text
    timestamp     : Time
    note          : Optional Text
  where
    signatory proposer, accepter
    -- No choices: es evidence criptográfica de cierre
```

---

## 5. Settlement con Canton Coin (NON-NEGOTIABLE)

> **Por qué es non-negotiable**: Cantonomics dedica **62% del pool de rewards (~516M CC/mes)** a "featured apps que generan transaction utility". Protocol Development Fund grants pagados en CC, atados a milestones, criterio *"alignment with protocol needs, impact and value to the network"*. Sin settlement real, perdemos elegibilidad para Featured App status y grant pipeline.

**Implementación**: el choice `Fulfill` de `CommitmentContract` ejecuta `Allocation_ExecuteTransfer` del token standard de Splice para mover Canton Coin del payer al payee. Patrón verificado en `LicenseRenewalRequest_CompleteRenewal` del cn-quickstart:

- Fuente: https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/License.daml
- Token standard DARs: `quickstart/daml/dars/splice-api-token-{holding,allocation,allocation-request}-v1-1.0.0.dar`

**El premio real NO son los $7,000**: es Featured App status + Protocol Development Fund grant. Pitch para eso, no solo para prize money.

---

## 6. Extensiones al cn-quickstart

### Daml (4 archivos nuevos + tests)
```
quickstart/daml/licensing/daml/Vault/
├── CommitmentProposal.daml
├── CommitmentContract.daml     ← implementa Disclosure interface (o patrón manual)
├── DisputeCase.daml
└── SettlementReceipt.daml
```
Tests en `daml/licensing-tests/daml/Vault/Scripts/` con Daml Script, incluyendo test crítico de privacidad (ver §8).

### OpenAPI (1 archivo editado) — la palanca de mayor leverage
```
quickstart/common/openapi.yaml
  + paths:
      /commitment-proposals
      /commitment-proposals/{cid}:accept
      /commitment-proposals/{cid}:reject
      /commitments
      /commitments/{cid}:fulfill
      /commitments/{cid}:raise-dispute
      /commitments/{cid}:refund
      /dispute-cases
      /dispute-cases/{cid}:resolve
      /settlement-receipts
```
→ El codegen genera automáticamente interfaces Spring (backend) + tipos TS (frontend).

### Backend (4 controladores nuevos)
```
quickstart/backend/src/main/java/com/digitalasset/quickstart/service/
├── CommitmentProposalsApiImpl.java
├── CommitmentsApiImpl.java
├── DisputeCasesApiImpl.java
└── SettlementReceiptsApiImpl.java
```
Patrón: copiar `AppInstallRequestsApiImpl.java` (Propose/Accept) y `LicenseApiImpl.java` (settlement con amulet).

### Frontend (3 vistas nuevas + 1 split-screen)
```
quickstart/frontend/src/
├── views/
│   ├── DashboardView.tsx          ← lista de compromisos por rol
│   ├── CreateCommitmentView.tsx   ← formulario propose
│   ├── CommitmentDetailView.tsx   ← acciones fulfill/dispute/refund
│   └── SplitScreenDemoView.tsx    ← 🔥 LA KILLER FEATURE
├── stores/
│   ├── commitmentStore.tsx
│   └── disputeStore.tsx
└── components/
    └── CommitmentCard.tsx
```

---

## 7. Verificación de privacidad por escenario

### Escenario 1: Invoice Financing Privado

| Party | CommitmentProposal | CommitmentContract | DisputeCase | SettlementReceipt |
|---|---|---|---|---|
| SME Corp (proposer) | ✅ creador | ✅ signatory | ✅ (si dispute) | ✅ |
| Financier (accepter) | ✅ observer | ✅ signatory | ✅ (si dispute) | ✅ |
| Buyer Corp (thirdParty) | ❌ | ❌ | ❌ | ❌ |
| Competidor del Financier | ❌ | ❌ | ❌ | ❌ |

### Escenario 2: OTC Block Trade Privado

| Party | CommitmentProposal | CommitmentContract | DisclosureContract (netting) | SettlementReceipt |
|---|---|---|---|---|
| Dealer A (proposer) | ✅ creador | ✅ signatory | — | ✅ |
| Dealer B (accepter) | ✅ observer | ✅ signatory | — | ✅ |
| Clearing (thirdParty) | ❌ | ❌ | ✅ **solo netting** (on-demand) | 🟡 solo netting receipt |
| Mercado / competidores | ❌ | ❌ | ❌ | ❌ |

---

## 8. Estrategia de testing

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| **Daml Script** (unit) | `daml test` | Lógica de choices, ensure, transiciones de estado |
| **Daml Script** (privacy) | Test de visibilidad por party | Verificar que thirdParty NO ve CommitmentContract hasta dispute |
| **Integración backend** | Spring Boot Test + LocalNet | Endpoints REST ↔ ledger, PQS queries |
| **E2E** | Playwright (incluido en quickstart) | Flujo completo: crear → aceptar → fulfill → receipt |
| **Demo privacy** | Script de Daml Script grabable | Genera el estado del split-screen para el video |

**Test crítico de privacidad** (el que demuestra que funciona):
```daml
test_thirdparty_privacy = script do
  ... create CommitmentContract with thirdParty = tp ...
  -- query active contracts as thirdParty → debe estar vacío
  tpContracts <- query @CommitmentContract tp
  assertMsg "ThirdParty should NOT see CommitmentContract"
    (null tpContracts)
  -- levantar disputa
  ... exercise RaiseDispute ...
  -- ahora thirdParty ve DisputeCase pero NO CommitmentContract
  tpDisputes <- query @DisputeCase tp
  assertMsg "ThirdParty should see DisputeCase after dispute"
    (not (null tpDisputes))
  tpContracts2 <- query @CommitmentContract tp
  assertMsg "ThirdParty should STILL NOT see CommitmentContract even after dispute"
    (null tpContracts2)
```

---

## 9. Plan de ejecución (4 semanas)

| Semana | Foco | Entregable | Checkpoint de validación |
|---|---|---|---|
| **1** (15-21 Jun) | Setup + modelado Daml | Proyecto creado en Encode, contratos Daml base compilando | ¿CPort acepta `.dar`? ¿Disclosure interface compila en SDK 3.4.11? |
| **2** (22-28 Jun) | Backend + OpenAPI + integración | Endpoints funcionando contra LocalNet | ¿Settlement con Canton Coin funciona end-to-end? (**NON-NEGOTIABLE**) |
| **3** (29 Jun-5 Jul) | Frontend + killer demo (split-screen) | App end-to-end, 2 escenarios (Invoice Financing + OTC) | ¿La demo split-screen se ve convincente en video? |
| **4** (6-13 Jul) | Pitch + video + submission | Repo público, deck, video 3min, live link | ¿Claims defensibles? ¿Sin "imposible en Ethereum"? |

---

## 10. Datos verificables (para el pitch)

| Dato | Valor | Fuente |
|---|---|---|
| Canton Coin burn-mint equilibrium | nativo | Splice / Canton docs |
| Cantonomics rewards | 62% del pool (~516M CC/mes) a featured apps | canton.network/blog/cantonomics-for-app-builders |
| USDCx live on Canton | Dec 2025 (global B2B payments onchain) | canton.network/blog/usdcx-now-live-on-canton |
| HSBC tokenised deposit pilot | confirmado | canton.network/news/hsbc-completes-tokenised-deposit-pilot |
| Basel III risk reporting on-demand | regulación en vigor | bis.org/bcbs/basel3 |
| MiCA confidencialidad comercial | EU 2023/1114 | eur-lex.europa.eu/eli/reg/2023/1114 |
| FATF Travel Rule $1,000 threshold | Oct 2024 | fatf-gafi.org |
| Canton privacy thesis | "full transparency is a bug" | canton.network/blog/full-transparency-is-a-bug-not-a-feature |

> ❌ **NO usar** (datos de v1 descartados): "23% fees", "79% LATAM", "$15B LATAM", "WFP blockchain", "81.9% Indonesian study", "imposible en Ethereum".

---

## 11. Entregables del hackathon

- [ ] Repositorio público (este, en GitHub)
- [ ] Presentation deck (máx 10 slides) — ver `docs/decisiones/03-posicionamiento-pitch.md`
- [ ] Video pitch de 3 min con demo — script en `docs/decisiones/03-posicionamiento-pitch.md`
- [ ] Link a producto live (CPort devnet, con fallback a LocalNet docker)
- [ ] README de setup (1 comando: `make start`)

---

## 12. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| CPort no coopera / no docs | 🔴 alta | 🟡 medio | Dual deploy: LocalNet docker como respaldo |
| Disclosure interface no compila en SDK 3.4.11 | 🟡 media | 🟡 medio | Fallback a patrón DisputeCase manual (diseñado en §4) |
| **Settlement con amulet demasiado complejo** | 🟡 media | 🔴 **alto** | **NON-NEGOTIABLE**: prioridad absoluta semana 2 hasta que funcione. NO hay fallback simbólico |
| Daml SDK learning curve | 🔴 alta | 🟡 medio | Semana 1 dedicada a dominar Daml con cn-quickstart como referencia |
| Auth de parties en frontend | 🟡 media | 🟡 medio | Usar el shared-secret del cn-quickstart (already works) |
| Juez ZK-literate objeta "imposible en Ethereum" | 🔴 alta si reclamos falsos | 🔴 alto | **Ya corregido**: pitch usa versión honesta y defendible (§1) |

---

## 13. Fuentes

Ver `docs/investigacion-tecnica.md` y `docs/decisiones/01-estrategia-ganadora.md` para la lista completa de URLs verificadas. Las más críticas:

- Brief oficial del hackathon: https://www.competehub.dev/en/competitions/encodeclub_canton-hackathon
- Anuncio Canton Forum (Jatin Pandya): https://forum.canton.network/t/build-on-canton-hackathon/8635
- Cantonomics for app builders: https://www.canton.network/blog/cantonomics-for-app-builders
- Canton privacy thesis: https://www.canton.network/blog/full-transparency-is-a-bug-not-a-feature
- cn-quickstart: https://github.com/digital-asset/cn-quickstart
- Daml.Finance Disclosure: https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Interface/Util/V3/Disclosure.daml
- Daml ledger privacy: https://docs.digitalasset.com/overview/3.4/explanations/ledger-model/ledger-privacy.html
