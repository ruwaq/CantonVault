# Decisión 02 — Arquitectura técnica

> **Stack, contratos Daml, infraestructura y extensiones al cn-quickstart.**
> Cada decisión técnica justificada con la alternativa descartada. **Versión v2 institucional.**

**Fecha**: 2026-06-20
**Estado**: ✅ Aprobada
**Base**: `digital-asset/cn-quickstart` (commit main, Daml SDK 3.4.11, Splice 0.5.3)

---

## 🏗️ Arquitectura de alto nivel

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND                            │
│  React 18 + TypeScript + Vite + TailwindCSS           │
│  • Dashboard de compromisos (como payer / payee)      │
│  • Crear compromiso (Propose flow)                    │
│  • Detalle + acciones (Release / Dispute / Resolve)   │
│  • 🔥 Vista SPLIT-SCREEN (4 cuadrantes) — la killer   │
│    Buyer | Seller | Arbiter | Competidor              │
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
│              SMART CONTRACTS (Daml)                    │
│  • CommitmentProposal  (Propose pattern)              │
│  • CommitmentContract  (Disclosure interface)         │
│  • DisputeCase         (arbiter on-demand)            │
│  • SettlementReceipt   (recibo inmutable)             │
│  + Settlement con Canton Coin (amulet / token std)    │
├──────────────────────────────────────────────────────┤
│              INFRAESTRUCTURA                           │
│  Dev:    cn-quickstart Docker LocalNet (compose)      │
│  Live:   Seaport devnet.seaport.to (.dar upload al validator)│
└──────────────────────────────────────────────────────┘
```

---

## 🧩 Por qué esta arquitectura (alternativas descartadas)

### Decisión A1: cn-quickstart como base (NO proyecto desde cero)

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **cn-quickstart** ⭐ | Stack completo y probado, patrón Propose/Accept ya implementado, Docker compose listo, Jatin lo mostró como referencia | Hay que entender el código existente (Java + OpenAPI codegen) | ✅ **Elegido** |
| Proyecto desde cero | Control total, solo lo necesario | Hay que montar auth, PQS, gRPC, codegen, Docker — 2 semanas extra | ❌ Descartado |
| Solo frontend + JSON API directo | Sin backend Java | La auth de parties en Canton es compleja; sin PQS las queries son lentas | ❌ Descartado |

**Justificación**: El workshop de Jatin usó cn-quickstart como referencia. Los jueces conocen el stack. Usarlo demuestra "entendemos el ecosistema". El codegen contract-first (OpenAPI compartido) reduce scope de backend.

### Decisión A2: Frontend directo al validator (NO vía backend Java)

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **cn-quickstart pattern (frontend → backend → ledger)** ⭐ | Auth, PQS, codegen ya resueltos | 1 capa más | ✅ **Elegido** (alineado al scaffold) |
| Frontend → JSON API directo | Sin backend, más simple | Auth de parties y external signing son complejos; Seaport no documentado | ❌ Descartado |

**Justificación**: La auth de parties en Canton (JWT por party, external signing con Loop wallet) es compleja. El cn-quickstart ya la resuelve. No reinventar.

### Decisión A3: Dev = LocalNet Docker + Live = Seaport devnet

> ⚠️ **Seaport (devnet.seaport.to) NO está documentado oficialmente.** Es un wrapper hackathon mostrado por Jatin en vivo. Hay que confirmar con Jatin en Discord 3 cosas:
> 1. Cómo se sube el `.dar` desde Seaport
> 2. Qué URL base del JSON API nos asignan
> 3. Formato de party ID esperado

**Estrategia dual** (degrada con elegancia):
- **Desarrollo**: `make start` con cn-quickstart Docker LocalNet → 100% control, logs, debugging
- **Live para jueces**: subir el `.dar` compilado a Seaport devnet → cumple el requirement "Link to live product"

**Fallback** si Seaport no coopera: instrucciones claras de `make start` en 1 comando en el README, con video demo. Los jueces prefieren un LocalNet que funciona que un Seaport que se rompe.

---

## 📜 Los 4 contratos Daml (diseño detallado)

### Principio rector de privacidad
> **El árbitro NUNCA debe ser controller de una choice sobre `CommitmentContract`**, porque ejercer una choice divulga el contrato al controller. Las choices del árbitro viven en `DisputeCase`, contrato separado.

### Template 1: `CommitmentProposal` (Patrón Propose)

```daml
-- Adaptación del AppInstallRequest del cn-quickstart
template CommitmentProposal with
    payer     : Party        -- quien crea la propuesta (John / Donante)
    payee     : Party        -- quien la acepta (María / ONG)
    arbiter   : Party        -- referenciado, PERO no stakeholder aún
    amount    : Decimal
    currency  : Text         -- "USD", "MXN", "EUR"
    description : Text       -- "Café orgánico 500kg" / "Apoyo 12 familias"
    deadline  : Time
    scenario  : Text         -- "b2b" | "ngo" (para UX)
  where
    signatory payer          -- solo el proponente autoriza la creación
    observer  payee          -- la contraparte ve, pero no puede alterar
    ensure amount > 0.0
    ensure payer /= payee

    choice AcceptProposal : ContractId CommitmentContract
      controller payee
      do create CommitmentContract with
           payer = payer
           payee = payee
           arbiter = arbiter
           amount = amount
           -- ... todos los campos
           status = Active

    choice RejectProposal : ()
      controller payee
      do pure ()   -- consuming: archiva la propuesta
```

**Privacidad en este punto**: payer y payee ven la propuesta. Arbiter **no** la ve. Competidor **no** la ve.

### Template 2: `CommitmentContract` (con Disclosure interface)

```daml
template CommitmentContract with
    payer       : Party
    payee       : Party
    arbiter     : Party        -- REFERENCIADO pero NO en observer/signatory
    amount      : Decimal
    currency    : Text
    description : Text
    deadline    : Time
    scenario    : Text
    status      : Status       -- Active | Fulfilled | Disputed | Refunded
  where
    signatory payer, payee     -- SOLO las dos partes
    -- ⚠️ NO 'observer arbiter' aquí — esa es la clave de la privacidad
    ensure amount > 0.0

    -- Pago normal: payee entrega, payer confirma
    choice Fulfill : ContractId SettlementReceipt
      controller payer
      do
        -- 🔥 Settlement REAL con Canton Coin (amulet token standard)
        -- (patrón de LicenseRenewalRequest_CompleteRenewal del cn-quickstart)
        create SettlementReceipt with
          payer = payer
          payee = payee
          amount = amount
          currency = currency
          timestamp = ...  -- getTime

    -- Cualquiera de las 2 partes puede levantar disputa
    -- Esto crea el DisputeCase → aquí el arbiter ENTRA como observer
    nonconsuming choice RaiseDispute : ContractId DisputeCase
      with reason : Text
      controller payer, payee
      do create DisputeCase with
           commitmentRef = ...
           payer = payer
           payee = payee
           arbiter = arbiter
           reason = reason
           amountRevealed = amount      -- solo ahora el arbiter ve el monto
           descriptionRevealed = description

    -- Antes de deadline, payer puede recuperar (si payee no responde)
    choice Refund : ()
      controller payer
      do ...  -- requiere check de deadline
```

**Privacidad garantizada**:
- Payer y payee: ven todo siempre
- Arbiter: **no ve nada** mientras no haya disputa
- Competidor: **no ve nada nunca**
- Cuando se levanta disputa → se crea `DisputeCase` → arbiter ve SOLO lo que ponemos en ese contrato

### Template 3: `DisputeCase` (arbiter on-demand)

```daml
template DisputeCase with
    commitmentRef      : ContractId CommitmentContract
    payer              : Party
    payee              : Party
    arbiter            : Party
    reason             : Text
    amountRevealed     : Decimal      -- ⚠️ NO copiamos TODO el contrato
    descriptionRevealed: Text
    ruling             : Optional Text
  where
    signatory payer, payee
    observer  arbiter                 -- 🔥 recién aquí el arbiter entra

    -- El arbiter decide: a favor de payer o payee
    choice ResolveDispute : ContractId SettlementReceipt
      with ruling : Text
      controller arbiter              -- solo el arbiter ejerce esto
      do
        -- lógica según ruling → Fulfill o Refund
        create SettlementReceipt with ...
```

### Template 4: `SettlementReceipt` (recibo inmutable)

```daml
template SettlementReceipt with
    payer     : Party
    payee     : Party
    amount    : Decimal
    currency  : Text
    timestamp : Time
    note      : Optional Text
  where
    signatory payer, payee
    -- No choices: es evidence criptográfica de cierre
```

---

## 🔐 Verificación de privacidad por escenario (v2 institucional)

### Escenario 1: Invoice Financing Privado — SME Corp / Financier / Buyer Corp

| Party | ¿Ve CommitmentProposal? | ¿Ve CommitmentContract? | ¿Ve DisputeCase? | ¿Ve SettlementReceipt? |
|---|---|---|---|---|
| SME Corp (payer del repayment) | ✅ creador | ✅ signatory | ✅ (si dispute) | ✅ |
| Financier (payee del repayment) | ✅ observer | ✅ signatory | ✅ (si dispute) | ✅ |
| Buyer Corp (deudor subyacente) | ❌ | ❌ | ❌ | ❌ |
| Competidor del Financier | ❌ | ❌ | ❌ | ❌ |

**Lo que se demuestra**: Buyer nunca sabe que la factura se factorizó (previene double-factoring y signal de debilidad). Competidor no ve el portfolio.

### Escenario 2: OTC Block Trade Privado — Dealer A / Dealer B / Clearing

| Party | ¿Ve CommitmentProposal? | ¿Ve CommitmentContract? | ¿Ve DisclosureContract (netting)? | ¿Ve SettlementReceipt? |
|---|---|---|---|---|
| Dealer A | ✅ creador | ✅ signatory | — | ✅ |
| Dealer B | ✅ observer | ✅ signatory | — | ✅ |
| Clearing house | ❌ | ❌ | ✅ **solo netting** (on-demand) | 🟡 solo netting receipt |
| Mercado / competidores | ❌ | ❌ | ❌ | ❌ |

**Lo que se demuestra**: el clearing solo ve lo mínimo para netting (no el portfolio completo). El mercado no puede front-runear lo que no existe para su nodo.

> 💡 **El patrón DisclosureContract** se usa en el escenario OTC para revelar SOLO los campos de netting al clearing, no el trade completo. Es el mismo mecanismo que el DisputeCase pero con semántica "disclosure de netting" en vez de "disputa".

---

## 🔧 Extensiones al cn-quickstart (la lista concreta)

### Daml (4 archivos nuevos)
```
quickstart/daml/licensing/daml/Vault/
├── CommitmentProposal.daml
├── CommitmentContract.daml     ← implementa Disclosure interface
├── DisputeCase.daml
└── SettlementReceipt.daml
```
Más tests en `daml/licensing-tests/daml/Vault/Scripts/`.

### OpenAPI (1 archivo editado)
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

## 🧪 Estrategia de testing

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| **Daml Script** (unit) | `daml test` | Lógica de choices, ensure, transiciones de estado |
| **Daml Script** (privacy) | Test de visibilidad por party | Verificar que arbiter NO ve CommitmentContract hasta disputa |
| **Integración backend** | Spring Boot Test + LocalNet | Endpoints REST ↔ ledger, PQS queries |
| **E2E** | Playwright (incluido en quickstart) | Flujo completo: crear → aceptar → fulfill → receipt |
| **Demo privacy** | Script de Daml Script grabable | Genera el estado del split-screen para el video |

**Test crítico de privacidad** (el que demuestra que funciona):
```daml
-- Verifica que el arbiter NO puede ver CommitmentContract
test_arbiter_privacy = script do
  ... create CommitmentContract ...
  -- query active contracts as arbiter → debe estar vacío
  arbiterContracts <- query @CommitmentContract arbiter
  assertMsg "Arbiter should NOT see CommitmentContract"
    (null arbiterContracts)
  -- levantar disputa
  ... exercise RaiseDispute ...
  -- ahora arbiter ve DisputeCase pero NO CommitmentContract
  arbiterDisputes <- query @DisputeCase arbiter
  assertMsg "Arbiter should see DisputeCase"
    (not (null arbiterDisputes))
```

---

## 🚨 Riesgos técnicos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Seaport no coopera / no docs | 🔴 alta | 🟡 medio | Dual deploy: LocalNet docker como respaldo |
| Disclosure interface no compila en SDK 3.4.11 | 🟡 media | 🟡 medio | Fallback a patrón DisputeCase manual (ya diseñado) |
| Settlement con amulet demasiado complejo | 🟡 media | 🔴 **alto** | **NON-NEGOTIABLE**: Canton Coin settlement real es lo que nos hace económicamente nativos (Cantonomics: 62% del pool a featured apps con transaction utility). Si tropezamos, prioridad absoluta hasta que funcione — NO hay fallback a settlement simbólico (eso nos descarta del Featured App pipeline y del Protocol Development Fund) |
| Daml SDK learning curve | 🔴 alta | 🟡 medio | Semana 1 dedicada a dominar Daml con el cn-quickstart como referencia |
| Auth de parties en frontend | 🟡 media | 🟡 medio | Usar el shared-secret del cn-quickstart (already works) |

---

## 📚 Referencias técnicas verificadas

- Daml reference (templates/choices/structure): https://docs.digitalasset.com/build/3.5/reference/daml/structure.html
- Parties & authority: https://docs.digitalasset.com/build/3.5/tutorials/smart-contracts/parties.html
- Ledger privacy & divulgence: https://docs.digitalasset.com/overview/3.4/explanations/ledger-model/ledger-privacy.html
- Daml.Finance Disclosure interface: https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Interface/Util/V3/Disclosure.daml
- cn-quickstart AppInstall (Propose/Accept): https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/AppInstall.daml
- cn-quickstart License (settlement con amulet): https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/License.daml
- Canton architecture: https://docs.canton.network/overview/learn/architecture
- JSON Ledger API V2: https://docs.digitalasset.com/explanations/json-api/index.html
