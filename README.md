# CantonVault — Privacy-First Conditional Commitments on Canton Network

[![Hackathon](https://img.shields.io/badge/Build%20on%20Canton-2026-blue)](https://www.encodeclub.com/programmes/canton-hackathon)
[![Network](https://img.shields.io/badge/network-Canton%20DevNet-green)](https://devnet.cantonloop.com)
[![Daml](https://img.shields.io/badge/contracts-Daml%203.x-orange)](https://docs.digitalasset.com/daml)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-12%20passing-brightgreen)]()

> Selective disclosure protocol where privacy is an **emergent property of stakeholder scoping** — competitors see empty ledgers by design, not by encryption.

---

## Problem

In institutional finance, parties need to share the **minimum necessary** to execute — without exposing portfolio positions, revealing factoring relationships, or leaking pricing to competitors. Today's infrastructure forces a binary choice: full transparency (everyone sees everything) or trust-based opacity (unverifiable).

> **Result**: double-factoring in invoice finance (billions in losses), OTC block trade leakage (adverse market moves), and heavy Basel III / MiCA compliance overhead.

## Solution

**CantonVault** is a Daml primitive that acts as a **privacy-first conditional commitment**:

- **Buyer + Supplier** see the commitment and terms
- **Third party** (arbitrator, clearing house) sees **nothing** until on-demand selective disclosure
- **Competitor** on the same network sees an **empty ledger** — privacy guaranteed at the Canton protocol level

Settlement executes **atomically in Canton Coin** via Splice Allocation/Transfer standard when the commitment is fulfilled (real DvP).

---

## How It Works

### 1. Propose → Accept

```
Proposer creates CommitmentProposal → Accepter signs → CommitmentContract active
                                         (both are signatories, third party is NOT)
```

### 2. Fulfill with Canton Coin Settlement

```
Accepter confirms delivery → Fulfill choice executed
  ├── Symbolic: creates SettlementReceipt (immutable proof)
  └── Real: exercises Allocation_ExecuteTransfer via Splice token standard (atomic CC transfer)
```

### 3. Selective Disclosure (on-demand)

```
RaiseDispute → DisputeCase created (third party becomes observer)
             → DisclosedRecord created (immutable disclosure proof)
             → Third party now sees: amount + description (nothing else)

ResolveDispute → DisputeCase archived + resolution DisclosedRecord created
```

### 4. Refund

```
After deadline → Proposer can refund if commitment not fulfilled
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    CantonVault Architecture                │
├──────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Frontend     │    │ Backend     │    │ Daml Layer   │  │
│  │ (Vite+React) │───▶│ (SpringBoot)│───▶│ (5 templates)│  │
│  │ VaultView.tsx │    │ /vault/*    │    │ gRPC Ledger  │  │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘  │
│                            │                   │          │
│                   ┌────────▼────────┐  ┌──────▼──────┐  │
│                   │ Token Registry  │  │ PQS          │  │
│                   │ (Splice Splice) │  │ (PostgreSQL) │  │
│                   └────────┬────────┘  └─────────────┘  │
│                            │                              │
│                   ┌────────▼─────────────────────────┐   │
│                   │ Canton Network (Validator Node)   │   │
│                   │ ┌───────┐ ┌───────┐ ┌──────────┐ │   │
│                   │ │Party A│ │Party B│ │Arbitrator│ │   │
│                   │ │(full) │ │(full) │ │(none*)   │ │   │
│                   │ └───────┘ └───────┘ └──────────┘ │   │
│                   │ *until dispute/disclosure          │   │
│                   └───────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Contract Templates (Daml)

| Template | Purpose | Privacy |
|---|---|---|
| `CommitmentProposal` | Offer to enter a commitment | Proposer: signatory, Accepter: observer |
| `CommitmentContract` | Active conditional commitment | Proposer+Accepter: signatories, ThirdParty: NOT in signatory/observer |
| `DisputeCase` | Escalation to third party | Third party enters as observer |
| `DisclosedRecord` | Immutable disclosure proof | Discloser+Observer: signatories |
| `SettlementReceipt` | Settlement audit trail | Proposer+Accepter: signatories |

---

## Demo

| Artifact | Link |
|---|---|
| Live App (DevNet) | [Deploying — Will be updated]() |
| Pitch Video (3 min) | [Uploading]() |
| Technical Demo | [Uploading]() |
| Deployed DAR | `quickstart-licensing-0.0.4.dar` on 5N Sandbox DevNet |

---

## Quick Start

```bash
# 1. Clone and build
git clone https://gitlab.com/PrometeoDev/cantonvault.git
cd cantonvault/cn-quickstart/quickstart

# 2. Build Daml contracts
~/.daml/bin/daml build --package-root daml/licensing

# 3. Run backend + frontend via Docker Compose
docker compose up -d
```

### Run Tests

```bash
~/.daml/bin/daml test --package-root daml/licensing-tests    # 12 tests (incl. privacy)
./gradlew :backend:compileJava                                # Backend compile
cd frontend && npx tsc --noEmit                               # Frontend typecheck
```

---

## Tech Stack

| Layer | Technology | Canton Integration |
|---|---|---|
| Smart Contracts | **Daml 3.x** | Native Canton ledger via gRPC |
| Settlement | **Splice Token Standard** | Allocation/AllocationRequest interfaces |
| Token Registry | **Splice Registry API** | Allocation transfer context (disclosed contracts) |
| Backend | **Spring Boot 3.4** | Canton gRPC Ledger API v2 + PQS (PostgreSQL) |
| Frontend | **React 18 + Vite + TypeScript** | REST API via `/api/vault/*` |
| Infrastructure | **Docker Compose** | Splice onboarding, Canton validator, nginx |
| Wallet | **Splice Wallet UI (DevNet)** | Canton Coin minting & party allocation |
| IDE | **Seaport DevNet** | DAR deployment, contract interaction |

> **Note on wallets**: The Canton Wallet UI (for minting Canton Coin) is distinct from the Loop Wallet used for party allocation — see the [Splice Wallet Reference](https://docs.canton.network/overview/reference/splice-wallet-reference#wallet-ui).

---

## Team

**Ande (andelabs)** — Solo builder  
- Full-stack blockchain developer with Daml/Rust/Solidity expertise  
- Focused on institutional DeFi primitives and privacy-preserving protocols

---

## Roadmap

- **Hackathon**: Complete flow with real Canton Coin settlement on DevNet
- **Post-hackathon**: Contract keys for uniqueness guarantees, multi-party disclosure UI
- **Featured App**: Apply for Canton Foundation Protocol Development Fund grant for Cantonomics rewards (62% of ~516M CC/month)

---

## License

MIT — see [LICENSE](./LICENSE)