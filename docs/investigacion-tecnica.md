# Consolidated Technical Research

> **Findings from the deep research of 2026-06-20 on Daml, Canton, cn-quickstart, and Seaport.**
> Each finding includes its confidence level and source. This is the empirical foundation for the decisions documented in `docs/decisiones/`.
>
> ⚠️ **Post-research correction (2026-06-20)**: this research was conducted when we called "CPort" what is actually **Seaport** (`devnet.seaport.to`). The technical conclusions remain valid; only the deploy product name changes. See `docs/inteligencia-competitiva.md` for the full correction with data from Discord.

**Date**: 2026-06-20
**Method**: Parallel research across 3 domains (Daml patterns, cn-quickstart, Seaport deploy) + 1 timeout (ecosystem, relaunch if needed)

---

## 🎯 Executive Summary of Findings That Changed the Plan

| # | Finding | Confidence Level | Impact on Plan |
|---|---|---|---|
| 1 | An official `Disclosure` interface exists in Daml.Finance | ✅ Verified (source code) | Use it instead of inventing one |
| 2 | The separate DisputeCase pattern is correct and recommended | ✅ Verified (docs) | Architecture confirmed |
| 3 | Divulgence: exercising a choice divulges the contract to the controller | ✅ Verified (docs) | Arbiter is NEVER controller on CommitmentContract |
| 4 | cn-quickstart is contract-first with shared OpenAPI | ✅ Verified (repo) | We reduce backend scope |
| 5 | `LicenseRenewalRequest_CompleteRenewal` already does settlement with amulet | ✅ Verified (repo) | Real settlement possible |
| 6 | Seaport/devnet.seaport.to — official guide published AFTER this research | ⚠️ Partially verified (Jatin published guide on Discord) | Dual deploy: LocalNet + Seaport. See `docs/inteligencia-competitiva.md` |
| 7 | `daml2ts` possibly deprecated | ⚠️ Unverified | Use OpenAPI → TS from the quickstart |
| 8 | Canton Network = sub-transaction privacy at the protocol level | ✅ Verified (whitepaper) | "Impossible on Ethereum" confirmed |

---

## 🔐 1. Privacy in Daml (the heart of CantonVault)

### 1.1 Exact Semantics of signatory / observer / controller

Verified at https://docs.digitalasset.com/build/3.5/reference/daml/structure.html and https://docs.digitalasset.com/build/3.5/tutorials/smart-contracts/parties.html

| Role | Sees the contract? | Authorizes creation? | Exercises choices? |
|---|---|---|---|
| **Signatory** | ✅ Yes | ✅ Yes (create + archive) | ❌ No by default |
| **Observer** | ✅ Yes | ❌ No | ❌ No by default |
| **Controller** (of a choice) | ✅ Yes (divulged upon exercise) | n/a | ✅ **Yes, that specific choice** |

**Key**: a controller **does not need to be a signatory**. Any stakeholder (signatory or observer) can be a controller of a choice. This is confirmed by the cn-quickstart code: in `AppInstallRequest`, `provider` is only an observer but is the controller of `AppInstallRequest_Accept`.

### 1.2 The DisputeCase Pattern (verified as correct)

**Original question**: How do I prevent an arbiter from seeing the amount/description until a dispute is raised?

**Verified answer**: the pattern is correct. A contract is only visible to a party if they are a stakeholder (signatory or observer) **of that specific contract**. If the arbiter is not a stakeholder of `CommitmentContract`, they will **never** receive its payload.

```daml
template CommitmentContract with
    payer, payee : Party
    arbiter : Party        -- referenced but NOT a stakeholder
    amount : Decimal
    ...
  where
    signatory payer, payee
    -- ⚠️ NO 'observer arbiter' — this is what guarantees privacy

    nonconsuming choice RaiseDispute : ContractId DisputeCase
      with reason : Text
      controller payer, payee
      do create DisputeCase with
           arbiter = arbiter
           amountRevealed = amount   -- only now is it revealed
           ...
```

**Source**: https://docs.digitalasset.com/overview/3.4/explanations/ledger-model/ledger-privacy.html — *"contracts should only be shown to their stakeholders"*.

### 1.3 DIVULGENCE — the concept that nearly ruined us

> ⚠️ **Critical finding**: exercising a choice **divulges** the contract to the controller of that choice.

This means that **if we made the arbiter the controller of a choice on `CommitmentContract`**, the arbiter would see the entire contract upon exercising it. That is why:

- ✅ The arbiter's choices live in `DisputeCase`, a separate contract
- ❌ The arbiter is never the controller of choices on `CommitmentContract`

**Important distinction** (docs):
- **Disclosure** = persistent visibility (being an observer/stakeholder)
- **Divulgence** = transactional visibility (being the controller of an exercised choice)

Source: https://docs.digitalasset.com/overview/3.4/explanations/ledger-model/ledger-privacy.html

### 1.4 The Disclosure Interface from Daml.Finance (elegant alternative)

In addition to the DisputeCase pattern, there is a production interface in `digital-asset/daml-finance`:

```daml
interface Disclosure where
  viewtype V
  choice AddObservers : ContractId Disclosure
    with disclosers : Parties; observersToAdd : (Text, Parties)
    controller disclosers
    do addObservers this arg
  choice RemoveObservers : Optional (ContractId Disclosure)
    ...
  choice SetObservers : ContractId Disclosure
    ...
```

**How it works internally**: archive + create with new observer set (in-place mutation is not possible in Daml).

**Decision**: use this interface in `CommitmentContract` for maximum elegance and to demonstrate use of production code. If it causes compilation issues, fall back to the manual DisputeCase pattern.

Sources:
- Interface: https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Interface/Util/V3/Disclosure.daml
- Impl: https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Util/V4/Disclosure.daml

---

## 🏗️ 2. cn-quickstart Structure (our foundation)

### 2.1 Repo Layout

```
cn-quickstart/
└── quickstart/
    ├── Makefile                      ← build/run orchestrator
    ├── compose.yaml                  ← backend + nginx + splice-onboarding
    ├── .env                          ← version pins
    ├── common/openapi.yaml           ← 🔥 SINGLE source of truth
    ├── daml/
    │   ├── licensing/                ← the app package (we extend it)
    │   │   ├── daml.yaml             ← sdk-version: 3.4.11
    │   │   ├── daml/Licensing/       ← AppInstall.daml, License.daml, Util.daml
    │   │   └── .daml/dist/*.dar      ← compiled artifact
    │   ├── licensing-tests/          ← Daml Script tests
    │   ├── external-test-sources/    ← splice-amulet-test, etc.
    │   └── dars/                     ← prebuilt DARs (splice, amulet)
    ├── backend/                      ← Java 21 + Spring Boot 3.4
    │   └── src/main/java/com/digitalasset/quickstart/
    │       ├── App.java
    │       ├── ledger/               ← LedgerApi.java (gRPC), Pqs.java
    │       ├── service/              ← *ApiImpl.java controllers
    │       └── security/             ← auth (shared-secret / oauth2)
    ├── frontend/                     ← React 18 + TS + Vite
    │   └── src/
    │       ├── App.tsx               ← routes
    │       ├── api.ts                ← OpenAPIClientAxios
    │       ├── stores/               ← Context stores
    │       ├── views/                ← screens
    │       └── components/
    ├── config/nginx/
    └── docker/                       ← compose modules
```

### 2.2 The Propose/Accept Pattern (from the Licensing App)

Verified at https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/AppInstall.daml

```daml
-- 1. Propose: user creates, provider is observer
template AppInstallRequest with
    provider : Party
    user : Party
    meta : Metadata
  where
    signatory user              -- only the proposer authorizes
    observer  provider          -- the counterparty sees

    choice AppInstallRequest_Accept : ContractId AppInstall
      controller provider       -- observer exercises acceptance
      do create AppInstall with
           provider = provider
           user = user          -- BOTH are signatories now
           ...

-- 2. Accepted: both are signatories
template AppInstall with
    provider, user : Party
  where
    signatory provider, user    -- mutual agreement
```

**The authorization magic**: when `provider` exercises Accept, their signature "flows" into the new `AppInstall` contract (with `signatory provider, user`). The `user`'s signature is inherited from the lineage (user created the original Request). This achieves mutual consent without a signature round-trip.

**We adapt it 1:1 for**: `CommitmentProposal` (propose) → `CommitmentContract` (accept).

### 2.3 Settlement with Canton Coin (amulet)

`LicenseRenewalRequest_CompleteRenewal` at https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/License.daml already executes `Allocation_ExecuteTransfer` from the Splice token standard to move Canton Coin as payment.

**We reuse it for**: the `Fulfill` choice of `CommitmentContract` moves CC to the payee.

### 2.4 Contract-First Codegen (key to reducing scope)

**The flow**:
1. Edit `common/openapi.yaml` (add paths and schemas)
2. `openApiGenerate` (gradle) → generates Spring interfaces in `backend/build/generated-spring/`
3. `npm run gen:openapi` → generates TS types in `frontend/src/openapi.d.ts`
4. Write the Java implementation (`service/XxxApiImpl.java`) + the React view
5. Both consume the same contract

**Implication**: adding "create commitment / fulfill / dispute / resolve" is **1 OpenAPI edit + 1 controller + 1 view**.

### 2.5 LocalNet Services and Ports

| Service | Port | Purpose |
|---|---|---|
| Canton participant (gRPC) | 3901 | Ledger API (backend writes here) |
| JSON API V2 | 2975, 3975 | HTTP ledger (onboarding scripts) |
| Splice validator (registry HTTP) | 5012 | Token standard / wallet |
| Backend service | 8080 | Our REST API |
| Frontend (app-provider) | 3000 | Main UI |
| Frontend (app-user) | 2000 | User UI |
| SV/Wallet/Scan UI | 4000 | Admin splice |
| Swagger UI | 9090 | API docs |
| Postgres | 5432 | PQS |
| Grafana (if observability) | 3030 | Metrics |

---

## 🌐 3. Seaport and Deploy to Devnet

### 3.1 What Was Verified

- **Seaport (devnet.seaport.to)**: returned HTTP 500 when attempting to read it. No public docs exist.
- It is a **hackathon wrapper** shown by Jatin Pandya at the workshop on Jun 17, 2026.
- The foundation created the **"Encode Hackathon"** org with a pre-configured validator.
- To get added: **send your party ID to Jatin on Discord**.

### 3.2 What We Know About the Flow (from Jatin's talk)

1. Login at devnet.seaport.to with Loop Wallet (no invite code required)
2. Select the "Encode Hackathon" organization
3. Send your party ID (top right) to Jatin on Discord so he can add you
4. Deploy options:
   - **Upload .dar** directly to the validator
   - **Connect GitHub** repo
   - **Blank contract** (write Daml in the web IDE, Remix-style)
5. Deploy to the "Encode Hackathon" validator (devnet)

### 3.3 What Still Needs Confirmation from Jatin

> **Action**: post these 3 questions on Discord `#❓technical-questions`:

1. How do you upload the `.dar` from Seaport to the validator? Direct upload or connect GitHub?
2. What JSON API base URL does the "Encode Hackathon" validator assign us? (so the frontend can talk to it)
3. What party ID format does Seaport expect? And how does the frontend authenticate as a party?

### 3.4 Fallback if Seaport Doesn't Cooperate

- **Dev = LocalNet docker** (cn-quickstart `make start`)
- **Live for judges = LocalNet docker with `make start` + 1-command README + demo video**

Judges prefer a working LocalNet over a broken Seaport.

### 3.5 Underlying Canton APIs (documented, independent of Seaport)

| API | URL | Purpose |
|---|---|---|
| JSON Ledger API V2 | `POST /v2/candidates/parties/{partyId}/commands` | Create contracts, exercise choices |
| Query ACS | `GET /v2/state/parties/{partyId}/contracts?template_id=Module.Name:Template` | Read active contracts |
| Validator API | `<base>/api/validator/v0/admin/external-party/topology` | Party topology |
| Auth | JWT bearer per party | All calls |

Sources:
- https://docs.digitalasset.com/explanations/json-api/index.html
- https://docs.digitalasset.com/build/3.5/tutorials/json_api/canton_and_the_json_ledger_api.html
- https://docs.sync.global/app_dev/validator_api/index.html

---

## 🧩 4. Verified Daml Patterns (for our contracts)

### 4.1 Propose/Accept (inherited from the quickstart)
See §2.2 above. We use it as-is.

### 4.2 On-Demand Disclosure (DisputeCase pattern)
See §1.2 above. We use it with the arbiter.

### 4.3 "Either Signatory Can Trigger" (from License_Expire)

```daml
choice Commitment_Refund : ()
  with actor : Party
  controller actor
  do require "Actor is a signatory" (actor `elem` signatory this)
     ...
```

Useful for choices where either party can act.

### 4.4 `ensure` for Validation at Creation

```daml
template CommitmentProposal with ...
  where
    signatory payer
    observer payee
    ensure amount > 0.0
    ensure payer /= payee
    ensure deadline > (relTimeToUTC 0)
```

### 4.5 Runtime Validation Inside Choices

```daml
import DA.Assert (assertMsg, assertWithinDeadline)

choice Fulfill : ContractId SettlementReceipt
  controller payer
  do now <- getTime
     assertMsg "Cannot fulfill after deadline" (now < deadline)
     ...
```

---

## 🛡️ 5. Sub-Transaction Privacy (what makes it "impossible on Ethereum")

Verified at https://docs.canton.network/overview/learn/architecture and https://www.canton.io/publications/canton-whitepaper.pdf

> *"Participant nodes only store contracts where their hosted parties are stakeholders."*

**Concretely**: if a transaction creates 3 contracts (one visible to A, one to B, one to A+B):
- A's node receives and stores only the 1st and the 3rd
- B's node receives and stores only the 2nd and the 3rd
- The mediator/sequencer sees only a blind structure (no payloads)

**For CantonVault**: when `DisputeCase` is created, the arbiter's node receives ONLY the `DisputeCase`, not the `CommitmentContract` that originated it. The sub-transaction is literally split across nodes.

**This is what the split-screen demo proves**: the competitor's quadrant is empty because their node **did not receive** the data, not because it is "hidden."

---

## ⚠️ 6. What We Could NOT Verify (action required)

| Item | Action | When |
|---|---|---|
| Seaport DAR upload flow | Ask Jatin on Discord | Week 1 |
| Seaport JSON API base URL | Ask Jatin on Discord | Week 1 |
| Seaport party ID format | Ask Jatin on Discord | Week 1 |
| `Disclosure` interface compiles on SDK 3.4.11 | Test in week 1 | Week 1 |
| `daml2ts` status | Avoid; use OpenAPI → TS | — |
| Multi-tenant operator isolation | Not relevant for hackathon | — |
| AND/OR controller combinator (exact syntax) | Confirm when writing choices | Week 1 |
| Ecosystem agent (4th) | Relaunch if competitive analysis is needed | Only if we pivot |

---

## 📚 Full Sources (ordered by relevance)

### Daml language
- https://docs.digitalasset.com/build/3.5/reference/daml/structure.html
- https://docs.digitalasset.com/build/3.4/reference/daml/choices.html
- https://docs.digitalasset.com/build/3.5/tutorials/smart-contracts/parties.html

### Privacy (key for our demo)
- https://docs.digitalasset.com/overview/3.4/explanations/ledger-model/ledger-privacy.html
- https://docs.canton.network/overview/learn/architecture
- https://www.canton.network/blog/how-canton-network-delivers-institutional-grade-privacy
- https://www.canton.io/publications/canton-whitepaper.pdf
- https://docs.digitalasset.com/build/3.4/sdlc-howtos/applications/develop/explicit-contract-disclosure.html

### cn-quickstart
- https://github.com/digital-asset/cn-quickstart
- https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/AppInstall.daml
- https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/License.daml
- https://docs.digitalasset.com/build/3.5/quickstart/configure/project-structure-overview.html
- https://docs.digitalasset.com/build/3.5/quickstart/download/cnqs-installation.html
- https://docs.digitalasset.com/build/3.4/quickstart/operate/explore-the-demo.html

### Daml.Finance (Disclosure)
- https://github.com/digital-asset/daml-finance
- https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Interface/Util/V3/Disclosure.daml
- https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Util/V4/Disclosure.daml

### Splice / Canton Coin
- https://github.com/hyperledger-labs/splice
- https://github.com/hyperledger-labs/splice/tree/main/cluster/compose/localnet

### JSON API / Validator
- https://docs.digitalasset.com/explanations/json-api/index.html
- https://docs.digitalasset.com/build/3.5/tutorials/json_api/canton_and_the_json_ledger_api.html
- https://docs.digitalasset.com/build/3.5/tutorials/json_api/canton_and_the_json_ledger_api_ts.html
- https://docs.sync.global/app_dev/validator_api/index.html
- https://docs.sync.global/app_dev/api/authentication.html
- https://docs.digitalasset.com/integrate/devnet/preparing-and-signing-transactions/index.html
- https://docs.dev.sync.global/validator_operator/validator_onboarding.html

### npm packages
- https://www.npmjs.com/package/@daml/ledger
- https://www.npmjs.com/package/@canton-network/wallet-sdk
- https://www.npmjs.com/package/@canton-network/core-wallet-auth

### Community
- https://forum.canton.network
- https://github.com/canton-network/wallet

### Relevant Forum Threads
- https://forum.canton.network/t/must-controllers-be-signatories/2816
- https://forum.canton.network/t/whats-the-motivation-for-explicit-contract-disclosure-experimental-in-canton-2-7/6682