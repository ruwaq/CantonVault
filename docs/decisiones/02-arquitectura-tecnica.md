# Decision 02 — Technical Architecture

> **Stack, Daml contracts, infrastructure, and extensions to cn-quickstart.**
> Each technical decision justified with the discarded alternative. **v2 institutional version.**

**Date**: 2026-06-20
**Status**: ✅ Approved
**Base**: `digital-asset/cn-quickstart` (commit main, Daml SDK 3.4.11, Splice 0.5.3)

---

## 🏗️ High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND                            │
│  React 18 + TypeScript + Vite + TailwindCSS           │
│  • Commitments dashboard (as payer / payee)           │
│  • Create commitment (Propose flow)                    │
│  • Detail + actions (Release / Dispute / Resolve)      │
│  • 🔥 SPLIT-SCREEN view (4 quadrants) — the killer     │
│    Buyer | Seller | Arbiter | Competitor               │
├──────────────────────────────────────────────────────┤
│                 common/openapi.yaml                    │
│   ← SINGLE source of truth (contract-first)            │
├──────────────────────────────────────────────────────┤
│                    BACKEND                             │
│  Java 21 + Spring Boot 3.4                             │
│  Writes: gRPC → Canton participant (LEDGER_HOST:3901) │
│  Reads:  PQS (Postgres SQL over Active Contract Set)   │
│  Auth:   shared-secret (dev) / OAuth2 Keycloak (prod) │
├──────────────────────────────────────────────────────┤
│              SMART CONTRACTS (Daml)                    │
│  • CommitmentProposal  (Propose pattern)              │
│  • CommitmentContract  (Disclosure interface)         │
│  • DisputeCase         (arbiter on-demand)            │
│  • SettlementReceipt   (immutable receipt)             │
│  + Settlement with Canton Coin (amulet / token std)   │
├──────────────────────────────────────────────────────┤
│              INFRASTRUCTURE                             │
│  Dev:    cn-quickstart Docker LocalNet (compose)      │
│  Live:   Seaport devnet.seaport.to (.dar upload to validator)│
└──────────────────────────────────────────────────────┘
```

---

## 🧩 Why This Architecture (Discarded Alternatives)

### Decision A1: cn-quickstart as base (NOT a project from scratch)

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **cn-quickstart** ⭐ | Complete and proven stack, Propose/Accept pattern already implemented, Docker compose ready, Jatin showed it as reference | Must understand existing code (Java + OpenAPI codegen) | ✅ **Chosen** |
| Project from scratch | Full control, only what is needed | Must set up auth, PQS, gRPC, codegen, Docker — 2 extra weeks | ❌ Discarded |
| Frontend only + direct JSON API | No Java backend | Party auth in Canton is complex; without PQS queries are slow | ❌ Discarded |

**Rationale**: Jatin's workshop used cn-quickstart as reference. The judges know the stack. Using it demonstrates "we understand the ecosystem". Contract-first codegen (shared OpenAPI) reduces backend scope.

### Decision A2: Frontend directly to validator (NOT via Java backend)

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **cn-quickstart pattern (frontend → backend → ledger)** ⭐ | Auth, PQS, codegen already solved | 1 extra layer | ✅ **Chosen** (aligned with scaffold) |
| Frontend → direct JSON API | No backend, simpler | Party auth and external signing are complex; Seaport undocumented | ❌ Discarded |

**Rationale**: Party auth in Canton (JWT per party, external signing with Loop wallet) is complex. cn-quickstart already solves it. Don't reinvent.

### Decision A3: Dev = LocalNet Docker + Live = Seaport devnet

> ⚠️ **Seaport (devnet.seaport.to) is NOT officially documented.** It is a hackathon wrapper shown by Jatin live. Must confirm with Jatin on Discord 3 things:
> 1. How to upload the `.dar` from Seaport
> 2. What JSON API base URL they assign us
> 3. Expected party ID format

**Dual strategy** (degrades gracefully):
- **Development**: `make start` with cn-quickstart Docker LocalNet → 100% control, logs, debugging
- **Live for judges**: upload the compiled `.dar` to Seaport devnet → meets the "Link to live product" requirement

**Fallback** if Seaport doesn't cooperate: clear `make start` instructions in 1 command in the README, with demo video. Judges prefer a working LocalNet over a broken Seaport.

---

## 📜 The 4 Daml Contracts (Detailed Design)

### Privacy Guiding Principle
> **The arbiter MUST NEVER be a controller of a choice on `CommitmentContract`**, because exercising a choice divulges the contract to the controller. The arbiter's choices live in `DisputeCase`, a separate contract.

### Template 1: `CommitmentProposal` (Propose Pattern)

```daml
-- Adaptation of the AppInstallRequest from cn-quickstart
template CommitmentProposal with
    payer     : Party        -- who creates the proposal (John / Donor)
    payee     : Party        -- who accepts it (María / NGO)
    arbiter   : Party        -- referenced, BUT not a stakeholder yet
    amount    : Decimal
    currency  : Text         -- "USD", "MXN", "EUR"
    description : Text       -- "Organic coffee 500kg" / "Support 12 families"
    deadline  : Time
    scenario  : Text         -- "b2b" | "ngo" (for UX)
  where
    signatory payer          -- only the proposer authorizes creation
    observer  payee          -- the counterparty sees, but cannot alter
    ensure amount > 0.0
    ensure payer /= payee

    choice AcceptProposal : ContractId CommitmentContract
      controller payee
      do create CommitmentContract with
           payer = payer
           payee = payee
           arbiter = arbiter
           amount = amount
           -- ... all fields
           status = Active

    choice RejectProposal : ()
      controller payee
      do pure ()   -- consuming: archives the proposal
```

**Privacy at this point**: payer and payee see the proposal. Arbiter does **not** see it. Competitor does **not** see it.

### Template 2: `CommitmentContract` (with Disclosure interface)

```daml
template CommitmentContract with
    payer       : Party
    payee       : Party
    arbiter     : Party        -- REFERENCED but NOT in observer/signatory
    amount      : Decimal
    currency    : Text
    description : Text
    deadline    : Time
    scenario    : Text
    status      : Status       -- Active | Fulfilled | Disputed | Refunded
  where
    signatory payer, payee     -- ONLY the two parties
    -- ⚠️ NO 'observer arbiter' here — that is the key to privacy
    ensure amount > 0.0

    -- Normal payment: payee delivers, payer confirms
    choice Fulfill : ContractId SettlementReceipt
      controller payer
      do
        -- 🔥 REAL Settlement with Canton Coin (amulet token standard)
        -- (pattern from LicenseRenewalRequest_CompleteRenewal in cn-quickstart)
        create SettlementReceipt with
          payer = payer
          payee = payee
          amount = amount
          currency = currency
          timestamp = ...  -- getTime

    -- Either of the 2 parties can raise a dispute
    -- This creates the DisputeCase → here the arbiter ENTERS as observer
    nonconsuming choice RaiseDispute : ContractId DisputeCase
      with reason : Text
      controller payer, payee
      do create DisputeCase with
           commitmentRef = ...
           payer = payer
           payee = payee
           arbiter = arbiter
           reason = reason
           amountRevealed = amount      -- only now the arbiter sees the amount
           descriptionRevealed = description

    -- Before deadline, payer can recover (if payee doesn't respond)
    choice Refund : ()
      controller payer
      do ...  -- requires deadline check
```

**Guaranteed privacy**:
- Payer and payee: always see everything
- Arbiter: **sees nothing** while there is no dispute
- Competitor: **never sees anything**
- When a dispute is raised → `DisputeCase` is created → arbiter sees ONLY what we put in that contract

### Template 3: `DisputeCase` (arbiter on-demand)

```daml
template DisputeCase with
    commitmentRef      : ContractId CommitmentContract
    payer              : Party
    payee              : Party
    arbiter            : Party
    reason             : Text
    amountRevealed     : Decimal      -- ⚠️ we do NOT copy the ENTIRE contract
    descriptionRevealed: Text
    ruling             : Optional Text
  where
    signatory payer, payee
    observer  arbiter                 -- 🔥 only now the arbiter enters

    -- The arbiter decides: in favor of payer or payee
    choice ResolveDispute : ContractId SettlementReceipt
      with ruling : Text
      controller arbiter              -- only the arbiter exercises this
      do
        -- logic according to ruling → Fulfill or Refund
        create SettlementReceipt with ...
```

### Template 4: `SettlementReceipt` (immutable receipt)

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
    -- No choices: it is cryptographic evidence of closure
```

---

## 🔐 Privacy Verification by Scenario (v2 Institutional)

### Scenario 1: Private Invoice Financing — SME Corp / Financier / Buyer Corp

| Party | Sees CommitmentProposal? | Sees CommitmentContract? | Sees DisputeCase? | Sees SettlementReceipt? |
|---|---|---|---|---|
| SME Corp (payer of repayment) | ✅ creator | ✅ signatory | ✅ (if dispute) | ✅ |
| Financier (payee of repayment) | ✅ observer | ✅ signatory | ✅ (if dispute) | ✅ |
| Buyer Corp (underlying debtor) | ❌ | ❌ | ❌ | ❌ |
| Financier's Competitor | ❌ | ❌ | ❌ | ❌ |

**What is demonstrated**: Buyer never knows the invoice was factored (prevents double-factoring and weakness signal). Competitor does not see the portfolio.

### Scenario 2: Private OTC Block Trade — Dealer A / Dealer B / Clearing

| Party | Sees CommitmentProposal? | Sees CommitmentContract? | Sees DisclosureContract (netting)? | Sees SettlementReceipt? |
|---|---|---|---|---|
| Dealer A | ✅ creator | ✅ signatory | — | ✅ |
| Dealer B | ✅ observer | ✅ signatory | — | ✅ |
| Clearing house | ❌ | ❌ | ✅ **netting only** (on-demand) | 🟡 netting receipt only |
| Market / competitors | ❌ | ❌ | ❌ | ❌ |

**What is demonstrated**: the clearing house only sees the minimum for netting (not the full portfolio). The market cannot front-run what does not exist for its node.

> 💡 **The DisclosureContract pattern** is used in the OTC scenario to reveal ONLY the netting fields to the clearing house, not the full trade. It is the same mechanism as DisputeCase but with "netting disclosure" semantics instead of "dispute".

---

## 🔧 Extensions to cn-quickstart (Concrete List)

### Daml (4 new files)
```
quickstart/daml/licensing/daml/Vault/
├── CommitmentProposal.daml
├── CommitmentContract.daml     ← implements Disclosure interface
├── DisputeCase.daml
└── SettlementReceipt.daml
```
Plus tests in `daml/licensing-tests/daml/Vault/Scripts/`.

### OpenAPI (1 edited file)
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
→ The codegen automatically generates Spring interfaces (backend) + TS types (frontend).

### Backend (4 new controllers)
```
quickstart/backend/src/main/java/com/digitalasset/quickstart/service/
├── CommitmentProposalsApiImpl.java
├── CommitmentsApiImpl.java
├── DisputeCasesApiImpl.java
└── SettlementReceiptsApiImpl.java
```
Pattern: copy `AppInstallRequestsApiImpl.java` (Propose/Accept) and `LicenseApiImpl.java` (settlement with amulet).

### Frontend (3 new views + 1 split-screen)
```
quickstart/frontend/src/
├── views/
│   ├── DashboardView.tsx          ← list of commitments by role
│   ├── CreateCommitmentView.tsx   ← propose form
│   ├── CommitmentDetailView.tsx   ← fulfill/dispute/refund actions
│   └── SplitScreenDemoView.tsx    ← 🔥 THE KILLER FEATURE
├── stores/
│   ├── commitmentStore.tsx
│   └── disputeStore.tsx
└── components/
    └── CommitmentCard.tsx
```

---

## 🧪 Testing Strategy

| Level | Tool | What It Covers |
|---|---|---|
| **Daml Script** (unit) | `daml test` | Choice logic, ensure, state transitions |
| **Daml Script** (privacy) | Visibility test by party | Verify that arbiter does NOT see CommitmentContract until dispute |
| **Backend integration** | Spring Boot Test + LocalNet | REST endpoints ↔ ledger, PQS queries |
| **E2E** | Playwright (included in quickstart) | Full flow: create → accept → fulfill → receipt |
| **Privacy demo** | Recordable Daml Script | Generates the split-screen state for the video |

**Critical privacy test** (the one that proves it works):
```daml
-- Verifies that the arbiter CANNOT see CommitmentContract
test_arbiter_privacy = script do
  ... create CommitmentContract ...
  -- query active contracts as arbiter → should be empty
  arbiterContracts <- query @CommitmentContract arbiter
  assertMsg "Arbiter should NOT see CommitmentContract"
    (null arbiterContracts)
  -- raise dispute
  ... exercise RaiseDispute ...
  -- now arbiter sees DisputeCase but NOT CommitmentContract
  arbiterDisputes <- query @DisputeCase arbiter
  assertMsg "Arbiter should see DisputeCase"
    (not (null arbiterDisputes))
```

---

## 🚨 Technical Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Seaport doesn't cooperate / no docs | 🔴 high | 🟡 medium | Dual deploy: LocalNet docker as fallback |
| Disclosure interface doesn't compile in SDK 3.4.11 | 🟡 medium | 🟡 medium | Fallback to manual DisputeCase pattern (already designed) |
| Settlement with amulet too complex | 🟡 medium | 🔴 **high** | **NON-NEGOTIABLE**: Real Canton Coin settlement is what makes us economically native (Cantonomics: 62% of the pool to featured apps with transaction utility). If we stumble, absolute priority until it works — NO fallback to symbolic settlement (that disqualifies us from the Featured App pipeline and the Protocol Development Fund) |
| Daml SDK learning curve | 🔴 high | 🟡 medium | Week 1 dedicated to mastering Daml with cn-quickstart as reference |
| Party auth in frontend | 🟡 medium | 🟡 medium | Use the shared-secret from cn-quickstart (already works) |

---

## 📚 Verified Technical References

- Daml reference (templates/choices/structure): https://docs.digitalasset.com/build/3.5/reference/daml/structure.html
- Parties & authority: https://docs.digitalasset.com/build/3.5/tutorials/smart-contracts/parties.html
- Ledger privacy & divulgence: https://docs.digitalasset.com/overview/3.4/explanations/ledger-model/ledger-privacy.html
- Daml.Finance Disclosure interface: https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Interface/Util/V3/Disclosure.daml
- cn-quickstart AppInstall (Propose/Accept): https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/AppInstall.daml
- cn-quickstart License (settlement with amulet): https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/License.daml
- Canton architecture: https://docs.canton.network/overview/learn/architecture
- JSON Ledger API V2: https://docs.digitalasset.com/explanations/json-api/index.html