# CantonVault

**Selective Disclosure Protocol for Institutional Finance on Canton Network**

Built for HackCanton S2 / Build on Canton Hackathon (June 2026)

---

## What is CantonVault?

CantonVault enables **confidential bilateral commitments** between two parties with **selective on-demand disclosure** to a third party — all settled atomically in **Canton Coin**.

Traditional blockchains expose all data publicly. CantonVault leverages Canton's native privacy model to keep deals invisible to competitors while revealing only what's necessary to regulators, clearing houses, or arbitrators — when and only when needed.

## Two Demo Scenarios

### 1. Supply Chain Finance (Invoice Factoring)

| Step | Who | What | Visibility |
|---|---|---|---|
| Propose | SME → Financier | Invoice INV-2026-003, $100K | SME + Financier only |
| Accept | Financier | Locks commitment | SME + Financier only |
| Fulfill | Financier | CC transfer + SettlementReceipt | SME + Financier only |
| *Competitor* | — | — | Sees **nothing** |
| *Buyer (thirdParty)* | — | — | Sees **nothing** |
| RaiseDispute | SME | Creates DisputeCase with Buyer as observer | Buyer now sees dispute |

### 2. OTC Block Trade (Dealer-to-Dealer)

| Step | Who | What | Visibility |
|---|---|---|---|
| Propose | Dealer A → Dealer B | US0378331005 $10M @ 98.50 | Dealers only |
| *Competitor* | Dealer C | — | Sees **nothing** (no front-running) |
| *Clearing House* | — | — | Sees **nothing** |
| Fulfill | Dealer B | SettlementReceipt | Dealers only |
| On dispute | — | Only amount + description revealed to Clearing | Selective |

## Architecture

```
┌─────────────────┐    REST     ┌──────────────────┐    gRPC     ┌──────────────┐
│  React Frontend  │───────────→│  Spring Boot       │───────────→│  Canton       │
│  (Vite + TS)     │←───────────│  CommitmentController│←───────────│  Participant  │
│  Split-screen UI │    JSON    │  LedgerApi          │    PQS     │  Node         │
└─────────────────┘            │  DamlRepository     │←───────────│              │
                                └──────────────────┘    SQL      └──────────────┘
                                                                         │
                                ┌──────────────────┐                    │
                                │  Daml Contracts    │←──────────────────┘
                                │  (5 templates)     │
                                │  12 unit tests     │
                                └──────────────────┘
```

## Daml Contracts

| Template | Purpose |
|---|---|
| `CommitmentProposal` | Propose/Accept/Reject pattern |
| `CommitmentContract` | Core contract with Fulfill, RaiseDispute, Refund |
| `DisputeCase` | Created on dispute — thirdParty becomes observer |
| `SettlementReceipt` | Immutable proof of atomic settlement |
| `DisclosedRecord` | Selective disclosure evidence |

### Canton Coin Settlement

`CommitmentContract` implements the **`AllocationRequest`** interface (Splice token standard):

```
Fulfill(allocationCid, extraArgs)
  → Validates Allocation against contract terms
  → Executes Allocation_ExecuteTransfer (atomic CC transfer)
  → Creates SettlementReceipt (immutable evidence)
```

If `allocationCid = None` → symbolic settlement (for unit tests without LocalNet).

## Quick Start

### Prerequisites
- Daml SDK 3.4.11 (`~/.daml/bin/daml`)
- Java 21
- Node.js 20+
- Gradle (wrapper included)

### Build & Test

```bash
cd cn-quickstart/quickstart

# 1. Daml contracts + tests (12/12)
~/.daml/bin/daml build --package-root daml/licensing
~/.daml/bin/daml test --package-root daml/licensing-tests

# 2. Backend (Java)
./gradlew :daml:codeGen -x :daml:compileDaml
./gradlew :backend:compileJava -x :daml:compileDaml

# 3. Frontend
cd frontend && npm install && npm run dev
# Opens at http://app-provider.localhost:5173 → CantonVault tab
```

### CI

```bash
.github/workflows/daml-test.yml
```

## Endpoints

All under `/api/vault` (proxied through Vite):

| Method | Path | Description |
|---|---|---|
| `GET` | `/proposals` | List visible proposals |
| `POST` | `/proposals` | Create proposal |
| `POST` | `/proposals/{id}/accept` | Accept proposal |
| `POST` | `/proposals/{id}/reject` | Reject proposal |
| `GET` | `/commitments` | List visible commitments |
| `POST` | `/commitments/{id}/fulfill` | Fulfill (with CC settlement) |
| `POST` | `/commitments/{id}/raise-dispute` | Raise dispute |
| `POST` | `/commitments/{id}/refund` | Refund (after deadline) |
| `GET` | `/receipts` | List settlement receipts |
| `GET` | `/disclosures` | List disclosed records |

## Key Design Decisions

- **Privacy by default**: thirdParty is referenced in data but NOT in signatory/observer → invisible on ledger
- **Disclosure on-demand**: `Disclosable` interface + `DisclosedRecord` for selective revelation
- **Atomic settlement**: Canton Coin transfer via Splice `AllocationRequest` standard
- **Contract-first**: Daml defines the workflow; backend/frontend adapt to it

## Production Readiness (TODO)

- [ ] Contract keys for efficient lookup (blocked by Sandbox)
- [ ] Separate interface package for DAR modularization
- [ ] Deploy to Seaport / DevNet