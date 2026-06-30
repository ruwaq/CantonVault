# CantonVault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build CantonVault — a privacy-first conditional commitment primitive (4 Daml contracts) for Canton Network, deployed to Seaport devnet, with a split-screen demo proving selective disclosure for Invoice Financing and OTC Block Trade workflows.

**Architecture:** Extend `digital-asset/cn-quickstart` (Daml 3.4.11, Splice 0.5.3, Java 21 Spring Boot 3.4, React 18 + Vite). Contract-first: edit `common/openapi.yaml` → codegen generates Spring interfaces + TS types. 4 new Daml templates under `daml/licensing/daml/Vault/`. Real Canton Coin settlement via Splice `Allocation_ExecuteTransfer` (non-negotiable). Dual deploy: LocalNet Docker for dev, Seaport devnet for live link.

**Tech Stack:** Daml 3.4.11, Splice 0.5.3 (amulet/token standard), Java 21 + Spring Boot 3.4.2 (gRPC ledger + PQS reads), React 18 + TypeScript + Vite + TailwindCSS, OpenAPI 3.0 codegen, Docker Compose, Seaport devnet.

**Spec:** `docs/superpowers/specs/2026-06-20-cantonvault-design.md`
**Decisions:** `docs/decisiones/01,02,03-*.md`
**Tools:** `docs/herramientas.md`

---

## File Structure

### New Daml files (created inside cn-quickstart)
- `quickstart/daml/licensing/daml/Vault/CommitmentProposal.daml` — Propose template (proposal by one party, accepter as observer)
- `quickstart/daml/licensing/daml/Vault/CommitmentContract.daml` — Main contract (joint signatories, thirdParty NOT stakeholder, Fulfill/RaiseDispute/Refund choices, Status enum)
- `quickstart/daml/licensing/daml/Vault/DisputeCase.daml` — On-demand reveal to thirdParty (observer, ResolveDispute controller)
- `quickstart/daml/licensing/daml/Vault/SettlementReceipt.daml` — Immutable evidence of settlement (no choices)
- `quickstart/daml/licensing-tests/daml/Vault/Scripts/TestPrivacy.daml` — Privacy test (thirdParty sees nothing until dispute)
- `quickstart/daml/licensing-tests/daml/Vault/Scripts/TestWorkflow.daml` — End-to-end workflow test (propose → accept → fulfill → receipt)

### Edited files
- `quickstart/common/openapi.yaml` — Add 10 new paths for Vault endpoints
- `quickstart/daml/licensing/daml.yaml` — No change (SDK version stays 3.4.11)

### New backend files
- `quickstart/backend/src/main/java/com/digitalasset/quickstart/service/CommitmentProposalsApiImpl.java`
- `quickstart/backend/src/main/java/com/digitalasset/quickstart/service/CommitmentsApiImpl.java`
- `quickstart/backend/src/main/java/com/digitalasset/quickstart/service/DisputeCasesApiImpl.java`
- `quickstart/backend/src/main/java/com/digitalasset/quickstart/service/SettlementReceiptsApiImpl.java`

### New frontend files
- `quickstart/frontend/src/views/DashboardView.tsx`
- `quickstart/frontend/src/views/CreateCommitmentView.tsx`
- `quickstart/frontend/src/views/CommitmentDetailView.tsx`
- `quickstart/frontend/src/views/SplitScreenDemoView.tsx` — 🔥 killer feature
- `quickstart/frontend/src/stores/commitmentStore.tsx`
- `quickstart/frontend/src/stores/disputeStore.tsx`
- `quickstart/frontend/src/components/CommitmentCard.tsx`

### Root project (this repo)
- `docs/DECISION-LOG.md` — Append per-week decisions, questions to Jatin, surprises

---

## Phase 0 — Environment & Scaffolding (Week 1, days 1-2)

### Task 0.1: Clone cn-quickstart and verify base build

**Files:**
- Clone: `cn-quickstart/` (gitignored, this repo tracks only our extensions)

- [ ] **Step 1: Clone the scaffolding into the project root**

```bash
cd "/Users/munay/dev/Build on Canton Hackathon"
git clone https://github.com/digital-asset/cn-quickstart
cd cn-quickstart/quickstart
```

- [ ] **Step 2: Record the pinned versions for future reference**

```bash
cat .env | grep -E "DAML_RUNTIME|SPLICE"
cat daml/licensing/daml.yaml | grep sdk-version
cat backend/build.gradle.kts | grep -E "springBoot|java"
```

Expected: `DAML_RUNTIME_VERSION=3.4.11`, `SPLICE_VERSION=0.5.3`, `sdk-version: 3.4.11`, Spring Boot 3.4.2, Java 21. If any of these differ from `docs/herramientas.md`, update the doc and re-pin in a commit.

- [ ] **Step 3: Verify prerequisites**

```bash
docker --version          # expect 24+
docker run hello-world    # verify daemon works
java -version             # expect 21 (Temurin)
node --version            # expect 20+
```

If anything missing, install before proceeding. Document what you installed in `docs/DECISION-LOG.md`.

- [ ] **Step 4: Commit the pin record**

```bash
cd "/Users/munay/dev/Build on Canton Hackathon"
echo "## 2026-06-2X — Environment verified" >> docs/DECISION-LOG.md
echo "- Daml SDK: 3.4.11, Splice: 0.5.3, Spring Boot: 3.4.2, Java: 21, Node: 20+" >> docs/DECISION-LOG.md
git add docs/DECISION-LOG.md docs/herramientas.md
git commit -m "chore: verify cn-quickstart pinned versions"
```

### Task 0.2: Run the base Licensing demo end-to-end

**Files:** none modified (just verifying the scaffold works)

- [ ] **Step 1: Run `make setup` with known-good choices**

```bash
cd "/Users/munay/dev/Build on Canton Hackathon/cn-quickstart/quickstart"
make setup
# Choose:
#   AUTH_MODE = shared-secret
#   PARTY_HINT = quickstart-cantonvault-1
#   OBSERVABILITY_ENABLED = false
#   TEST_MODE = false
```

- [ ] **Step 2: Run `make build` (first build takes 10-20 min)**

```bash
make build
```

Expected: build completes without errors. If it fails on the Daml compile step, that's our biggest risk — read the error and check `docs/investigacion-tecnica.md` for the multi-package build notes. Common fix: ensure `dpm` is available via `make shell`.

- [ ] **Step 3: Run `make start` and open the UI**

```bash
make start
# Wait ~60s for all containers
open http://app-provider.localhost:3000
# Login: app-provider / abc123
```

- [ ] **Step 4: Seed demo data and verify the licensing flow**

```bash
make create-app-install-request
```

In the UI: log in as `app-user` (also `abc123`), accept the install request, create a license, renew it (this exercises the Canton Coin settlement path we'll reuse).

- [ ] **Step 5: Record success in decision log**

```bash
cd "/Users/munay/dev/Build on Canton Hackathon"
echo "- Base Licensing demo runs end-to-end. Canton Coin renewal path verified." >> docs/DECISION-LOG.md
git add docs/DECISION-LOG.md
git commit -m "chore: base cn-quickstart demo verified end-to-end"
```

### Task 0.3: Ask Jatin the 3 Seaport questions (BLOCKING for live deploy)

**Files:** none (Discord action)

- [ ] **Step 1: Join Encode Club Discord and post in `#❓technical-questions`**

Post verbatim:
```
Hi @Jatin — building CantonVault (a privacy-first conditional commitment primitive
for invoice financing + OTC block trades). Three Seaport questions:

1. Once my .dar is built, what's the exact upload path in Seaport to deploy it
   to the Encode Hackathon validator?
2. What JSON API base URL does Seaport assign to my deployed app? (so my
   frontend can talk to it)
3. What party ID format does Seaport expect, and how does the frontend
   authenticate as a party?

My Seaport party ID is: <paste your party ID from top-right of devnet.seaport.to>
Please add me to the Encode Hackathon org. Thanks!
```

- [ ] **Step 2: Capture your party ID from Seaport**

Visit https://devnet.seaport.to, log in with Loop wallet, copy your party ID (top-right, format `<32-hex>::1220<64-hex>`). Paste it into the message above and also save it to `docs/DECISION-LOG.md` under a "Seaport" section. (Do NOT commit secrets — only the party ID label, which is not a secret on a public devnet.)

- [ ] **Step 3: Log the question in decision log and continue**

```bash
echo "- Posted 3 Seaport questions to Jatin on Discord. Party ID captured." >> docs/DECISION-LOG.md
git add docs/DECISION-LOG.md
git commit -m "chore: log Seaport onboarding questions to Jatin"
```

> **Non-blocking**: While waiting for Jatin, proceed to Phase 1 (Daml contracts) which only needs the LocalNet.

---

## Phase 1 — Daml Smart Contracts (Week 1, days 3-5 + Week 2, days 1-2)

### Task 1.1: Create the Vault module skeleton and Status enum

**Files:**
- Create: `cn-quickstart/quickstart/daml/licensing/daml/Vault/CommitmentContract.daml` (Status enum goes here first)

- [ ] **Step 1: Write the failing test for the Status enum**

Create `cn-quickstart/quickstart/daml/licensing-tests/daml/Vault/Scripts/TestStatus.daml`:

```daml
module Vault.Scripts.TestStatus where

import Daml.Script
import Vault.CommitmentContract (Status(..))

test_status_ordering : Script ()
test_status_ordering = do
  assertMsg "Active is not Fulfilled" (Active /= Fulfilled)
  assertMsg "Disputed is not Refunded" (Disputed /= Refunded)
  return ()
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd "/Users/munay/dev/Build on Canton Hackathon/cn-quickstart/quickstart"
make shell
# Inside the daml shell:
daml test --package-root daml
```

Expected: FAIL — module `Vault.CommitmentContract` not found.

- [ ] **Step 3: Write the minimal enum**

`daml/licensing/daml/Vault/CommitmentContract.daml`:

```daml
module Vault.CommitmentContract where

data Status = Active | Fulfilled | Disputed | Refunded deriving (Eq, Show)
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
# still inside daml shell
daml test --package-root daml
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Users/munay/dev/Build on Canton Hackathon"
git add cn-quickstart/quickstart/daml/licensing/daml/Vault/CommitmentContract.daml \
        cn-quickstart/quickstart/daml/licensing-tests/daml/Vault/Scripts/TestStatus.daml
git commit -m "feat(daml): add Vault.CommitmentContract Status enum"
```

### Task 1.2: Implement SettlementReceipt template

**Files:**
- Create: `cn-quickstart/quickstart/daml/licensing/daml/Vault/SettlementReceipt.daml`
- Test: `cn-quickstart/quickstart/daml/licensing-tests/daml/Vault/Scripts/TestSettlementReceipt.daml`

- [ ] **Step 1: Write the failing test**

```daml
module Vault.Scripts.TestSettlementReceipt where

import Daml.Script
import Vault.SettlementReceipt (SettlementReceipt(..))

test_create_receipt : Script ()
test_create_receipt = do
  proposer <- allocateParty "SME"
  accepter <- allocateParty "Financier"
  let amt = 5000.0
  cid <- submit proposer do
    createCmd SettlementReceipt with
      proposer = proposer
      accepter = accepter
      amount = amt
      currency = "CC"
      timestamp = getTime' 0
      note = Some "test"
  -- Both signatories should be able to fetch
  _ <- submit proposer $ fetchCmd cid
  _ <- submit accepter $ fetchCmd cid
  return ()
```

Note: `getTime'` may need adjustment — if it doesn't exist in your SDK version, use `getTime` inside a `submit` and bind the result. Adjust the test until it compiles in the test phase (that's expected iteration).

- [ ] **Step 2: Run the test to verify it fails**

```bash
make shell && daml test --package-root daml
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the template**

`daml/licensing/daml/Vault/SettlementReceipt.daml`:

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
    ensure amount > 0.0
    -- No choices: this is immutable evidence of settlement.
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
daml test --package-root daml
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cn-quickstart/quickstart/daml/licensing/daml/Vault/SettlementReceipt.daml \
        cn-quickstart/quickstart/daml/licensing-tests/daml/Vault/Scripts/TestSettlementReceipt.daml
git commit -m "feat(daml): add Vault.SettlementReceipt template"
```

### Task 1.3: Implement CommitmentProposal template (Propose pattern)

**Files:**
- Create: `cn-quickstart/quickstart/daml/licensing/daml/Vault/CommitmentProposal.daml`
- Test: `cn-quickstart/quickstart/daml/licensing-tests/daml/Vault/Scripts/TestCommitmentProposal.daml`

- [ ] **Step 1: Write the failing test (propose → accept creates CommitmentContract)**

```daml
module Vault.Scripts.TestCommitmentProposal where

import Daml.Script
import Vault.CommitmentProposal (CommitmentProposal(..), AcceptProposal(..))
import Vault.CommitmentContract (CommitmentContract(..), Status(..))

test_propose_accept : Script ()
test_propose_accept = do
  proposer <- allocateParty "SME"
  accepter <- allocateParty "Financier"
  thirdParty <- allocateParty "Buyer"
  let proposal = CommitmentProposal with
        proposer = proposer
        accepter = accepter
        thirdParty = thirdParty
        amount = 5000.0
        currency = "CC"
        description = "Invoice INV-2026-001 factoring"
        workflow = "invoice-financing"
        deadline = getTime' 6000000000000  -- 6000s in the future
  proposalCid <- submit proposer $ createCmd proposal
  -- Accepter exercises AcceptProposal
  contractCid <- submit accepter $ exerciseCmd proposalCid AcceptProposal
  -- Both should see the resulting CommitmentContract
  contracts <- query @CommitmentContract proposer
  assertMsg "Proposer sees the contract" (not (null contracts))
  return ()
```

- [ ] **Step 2: Run to verify it fails**

```bash
make shell && daml test --package-root daml
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement CommitmentProposal and a stub CommitmentContract**

`daml/licensing/daml/Vault/CommitmentProposal.daml`:

```daml
module Vault.CommitmentProposal where

import Vault.CommitmentContract (CommitmentContract(..), Status(..))

template CommitmentProposal with
    proposer      : Party
    accepter      : Party
    thirdParty    : Party
    amount        : Decimal
    currency      : Text
    description   : Text
    workflow      : Text
    deadline      : Time
  where
    signatory proposer
    observer  accepter
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
      do pure ()
```

Add the `CommitmentContract` template body to `daml/licensing/daml/Vault/CommitmentContract.daml` (replacing the enum-only version):

```daml
module Vault.CommitmentContract where

data Status = Active | Fulfilled | Disputed | Refunded deriving (Eq, Show)

template CommitmentContract with
    proposer      : Party
    accepter      : Party
    thirdParty    : Party        -- REFERENCIADO pero NO en signatory/observer
    amount        : Decimal
    currency      : Text
    description   : Text
    workflow      : Text
    deadline      : Time
    status        : Status
  where
    signatory proposer, accepter
    ensure amount > 0.0

    -- Choices added in later tasks
```

- [ ] **Step 4: Run to verify it passes**

```bash
daml test --package-root daml
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cn-quickstart/quickstart/daml/licensing/daml/Vault/CommitmentProposal.daml \
        cn-quickstart/quickstart/daml/licensing/daml/Vault/CommitmentContract.daml \
        cn-quickstart/quickstart/daml/licensing-tests/daml/Vault/Scripts/TestCommitmentProposal.daml
git commit -m "feat(daml): add CommitmentProposal (Propose pattern) + CommitmentContract body"
```

### Task 1.4: Add the privacy test (thirdParty sees nothing)

This is the **critical test** that proves our privacy claim. It's the foundation of the killer demo.

**Files:**
- Test: `cn-quickstart/quickstart/daml/licensing-tests/daml/Vault/Scripts/TestPrivacy.daml`

- [ ] **Step 1: Write the failing privacy test**

```daml
module Vault.Scripts.TestPrivacy where

import Daml.Script
import Vault.CommitmentProposal (CommitmentProposal(..), AcceptProposal(..))
import Vault.CommitmentContract (CommitmentContract(..))

test_thirdparty_privacy : Script ()
test_thirdparty_privacy = do
  proposer <- allocateParty "SME"
  accepter <- allocateParty "Financier"
  thirdParty <- allocateParty "Buyer"

  -- Propose + accept
  proposalCid <- submit proposer $ createCmd CommitmentProposal with
    proposer = proposer
    accepter = accepter
    thirdParty = thirdParty
    amount = 5000.0
    currency = "CC"
    description = "Invoice INV-2026-001"
    workflow = "invoice-financing"
    deadline = getTime' 6000000000000
  contractCid <- submit accepter $ exerciseCmd proposalCid AcceptProposal

  -- CRITICAL: thirdParty must NOT see CommitmentContract
  tpContracts <- query @CommitmentContract thirdParty
  assertMsg "thirdParty should NOT see CommitmentContract"
    (null tpContracts)

  -- CRITICAL: thirdParty must NOT see CommitmentProposal either
  tpProposals <- query @CommitmentProposal thirdParty
  assertMsg "thirdParty should NOT see CommitmentProposal"
    (null tpProposals)

  return ()
```

- [ ] **Step 2: Run to verify it passes (privacy should already hold by construction)**

```bash
make shell && daml test --package-root daml
```

Expected: PASS. If it FAILS, our signatory/observer model is wrong — re-check `docs/decisiones/02-arquitectura-tecnica.md` and the Disclosure/divulgence notes in `docs/investigacion-tecnica.md` §1.3.

- [ ] **Step 3: Commit**

```bash
git add cn-quickstart/quickstart/daml/licensing-tests/daml/Vault/Scripts/TestPrivacy.daml
git commit -m "test(daml): prove thirdParty cannot see CommitmentContract (privacy foundation)"
```

### Task 1.5: Implement DisputeCase template (on-demand reveal)

**Files:**
- Create: `cn-quickstart/quickstart/daml/licensing/daml/Vault/DisputeCase.daml`
- Test: extend `TestPrivacy.daml` with the dispute flow

- [ ] **Step 1: Extend TestPrivacy with the dispute flow (failing test for DisputeCase)**

Append to `daml/licensing-tests/daml/Vault/Scripts/TestPrivacy.daml`:

```daml
import Vault.CommitmentContract (RaiseDispute(..))
import Vault.DisputeCase (DisputeCase(..))

test_thirdparty_sees_dispute : Script ()
test_thirdparty_sees_dispute = do
  proposer <- allocateParty "SME"
  accepter <- allocateParty "Financier"
  thirdParty <- allocateParty "Buyer"

  proposalCid <- submit proposer $ createCmd CommitmentProposal with
    proposer = proposer
    accepter = accepter
    thirdParty = thirdParty
    amount = 5000.0
    currency = "CC"
    description = "Invoice INV-2026-001"
    workflow = "invoice-financing"
    deadline = getTime' 6000000000000
  contractCid <- submit accepter $ exerciseCmd proposalCid AcceptProposal

  -- Before dispute: thirdParty sees nothing
  tpContracts1 <- query @CommitmentContract thirdParty
  assertMsg "pre-dispute: thirdParty sees no CommitmentContract" (null tpContracts1)
  tpDisputes1 <- query @DisputeCase thirdParty
  assertMsg "pre-dispute: thirdParty sees no DisputeCase" (null tpDisputes1)

  -- Raise dispute
  disputeCid <- submit proposer $ exerciseCmd contractCid (RaiseDispute with reason = "buyer hasn't paid")

  -- After dispute: thirdParty sees DisputeCase but STILL no CommitmentContract
  tpDisputes2 <- query @DisputeCase thirdParty
  assertMsg "post-dispute: thirdParty sees DisputeCase" (not (null tpDisputes2))
  tpContracts2 <- query @CommitmentContract thirdParty
  assertMsg "post-dispute: thirdParty STILL does not see CommitmentContract"
    (null tpContracts2)

  return ()
```

- [ ] **Step 2: Run to verify it fails**

```bash
make shell && daml test --package-root daml
```

Expected: FAIL — module `Vault.DisputeCase` not found, and `RaiseDispute` choice not defined.

- [ ] **Step 3: Implement DisputeCase template**

`daml/licensing/daml/Vault/DisputeCase.daml`:

```daml
module Vault.DisputeCase where

import Vault.SettlementReceipt (SettlementReceipt(..))

template DisputeCase with
    commitmentRef         : ContractId CommitmentContract
    proposer              : Party
    accepter              : Party
    thirdParty            : Party
    reason                : Text
    amountRevealed        : Decimal      -- we copy ONLY the fields thirdParty needs
    descriptionRevealed   : Text
    ruling                : Optional Text
  where
    signatory proposer, accepter
    observer  thirdParty

    choice ResolveDispute : ContractId SettlementReceipt
      with ruling : Text
      controller thirdParty
      do
        now <- getTime
        -- Branch on ruling:
        --   "proposer" → caller wants proposer to win → Fulfill semantics
        --   "accepter" → caller wants accepter to win → Refund semantics
        -- For the hackathon, ResolveDispute creates a SettlementReceipt tagged
        -- with the ruling. The actual Fulfill/Refund on commitmentRef is exercised
        -- separately by the winning party using the ruling as authority.
        create SettlementReceipt with
          proposer = proposer
          accepter = accepter
          amount = amountRevealed
          currency = "CC"
          timestamp = now
          note = Some ("resolved by third party: " <> ruling)
```

Note: `ContractId CommitmentContract` requires `import Vault.CommitmentContract`. Add that import.

- [ ] **Step 4: Add the RaiseDispute choice to CommitmentContract**

Edit `daml/licensing/daml/Vault/CommitmentContract.daml` to add inside the `where` block:

```daml
    nonconsuming choice RaiseDispute : ContractId DisputeCase
      with reason : Text
      controller proposer, accepter
      do create DisputeCase with
           commitmentRef = self
           proposer = proposer
           accepter = accepter
           thirdParty = thirdParty
           reason = reason
           amountRevealed = amount
           descriptionRevealed = description
           ruling = None
```

Add `import Vault.DisputeCase (DisputeCase(..))` at the top of `CommitmentContract.daml`. If this creates a circular import (CommitmentContract ↔ DisputeCase), put the `ContractId` reference as `ContractId CommitmentContract` and let Daml resolve via the module system; if it still fails, define `DisputeCase` in the same module as `CommitmentContract`. **Decide at implementation time** and document the choice in `docs/DECISION-LOG.md`.

- [ ] **Step 5: Run to verify both privacy tests pass**

```bash
daml test --package-root daml
```

Expected: PASS for both `test_thirdparty_privacy` and `test_thirdparty_sees_dispute`.

- [ ] **Step 6: Commit**

```bash
git add cn-quickstart/quickstart/daml/licensing/daml/Vault/DisputeCase.daml \
        cn-quickstart/quickstart/daml/licensing/daml/Vault/CommitmentContract.daml \
        cn-quickstart/quickstart/daml/licensing-tests/daml/Vault/Scripts/TestPrivacy.daml
git commit -m "feat(daml): add DisputeCase (on-demand reveal to thirdParty) + RaiseDispute choice"
```

### Task 1.6: Implement Fulfill choice with Canton Coin settlement (NON-NEGOTIABLE)

> This is the highest-risk, highest-value task. Canton Coin settlement via `Allocation_ExecuteTransfer` is what makes us economically native. If it fails, prioritize fixing it over everything else in Phase 1.

**Files:**
- Modify: `cn-quickstart/quickstart/daml/licensing/daml/Vault/CommitmentContract.daml`
- Test: `cn-quickstart/quickstart/daml/licensing-tests/daml/Vault/Scripts/TestFulfill.daml`

- [ ] **Step 1: Read the reference settlement implementation**

Read `cn-quickstart/quickstart/daml/licensing/daml/Licensing/License.daml` — focus on `LicenseRenewalRequest_CompleteRenewal`. This is the exact pattern we adapt. Note:
- It implements the `AllocationRequest` interface from the splice token standard
- It calls `Allocation_ExecuteTransfer` to move amulet (Canton Coin) from payer to payee
- The DARs it depends on are in `daml/dars/splice-api-token-*.dar`

Also read the relevant `daml/external-test-sources/splice-token-standard-test/` and `splice-amulet-test/` examples for the calling convention.

- [ ] **Step 2: Write the failing test (Fulfill creates SettlementReceipt + moves CC)**

```daml
module Vault.Scripts.TestFulfill where

import Daml.Script
import Vault.CommitmentProposal (CommitmentProposal(..), AcceptProposal(..))
import Vault.CommitmentContract (CommitmentContract(..), Fulfill)
import Vault.SettlementReceipt (SettlementReceipt(..))

test_fulfill_creates_receipt : Script ()
test_fulfill_creates_receipt = do
  proposer <- allocateParty "SME"
  accepter <- allocateParty "Financier"
  thirdParty <- allocateParty "Buyer"
  -- NOTE: in a real test, both proposer and accepter need amulet holdings.
  -- Provisioning amulet in Daml Script is non-trivial; see splice-amulet-test
  -- for the setup boilerplate. For the first iteration, this test may need to
  -- be split into:
  --   (a) a pure test that Fulfill creates a SettlementReceipt (without moving CC),
  --       to validate the contract logic
  --   (b) an integration test against a running LocalNet with funded wallets,
  --       to validate the actual amulet transfer
  -- Start with (a) here, then promote to (b) once the contract logic is solid.
  proposalCid <- submit proposer $ createCmd CommitmentProposal with
    proposer = proposer
    accepter = accepter
    thirdParty = thirdParty
    amount = 100.0
    currency = "CC"
    description = "Invoice INV-2026-002"
    workflow = "invoice-financing"
    deadline = getTime' 6000000000000
  contractCid <- submit accepter $ exerciseCmd proposalCid AcceptProposal
  -- Fulfill: accepter confirms delivery, proposer's committed funds release
  receiptCid <- submit accepter $ exerciseCmd contractCid Fulfill
  receipts <- query @SettlementReceipt proposer
  assertMsg "proposer sees SettlementReceipt" (not (null receipts))
  return ()
```

- [ ] **Step 3: Run to verify it fails**

```bash
make shell && daml test --package-root daml
```

Expected: FAIL — `Fulfill` choice not defined.

- [ ] **Step 4: Implement Fulfill (start with symbolic-only, then add amulet)**

First version (symbolic) — add to `CommitmentContract.daml`:

```daml
    choice Fulfill : ContractId SettlementReceipt
      controller accepter
      do
        now <- getTime
        -- TODO(Phase 1.6b): replace this symbolic create with a real
        -- Allocation_ExecuteTransfer of amulet from proposer to accepter,
        -- following the LicenseRenewalRequest_CompleteRenewal pattern.
        -- Then create the SettlementReceipt as evidence.
        create SettlementReceipt with
          proposer = proposer
          accepter = accepter
          amount = amount
          currency = currency
          timestamp = now
          note = Some ("fulfilled via CantonVault: " <> workflow)
```

- [ ] **Step 5: Run to verify the symbolic version passes**

```bash
daml test --package-root daml
```

Expected: PASS. Commit this even though it's symbolic — the contract logic is now complete and testable.

- [ ] **Step 6: Commit the symbolic version**

```bash
git add -A
git commit -m "feat(daml): add Fulfill choice (symbolic settlement — amulet integration pending)"
```

### Task 1.6b: Replace symbolic settlement with real Canton Coin (amulet) transfer

> **This is the non-negotiable task.** The symbolic version is a stepping stone only; this completes it.

**Files:**
- Modify: `cn-quickstart/quickstart/daml/licensing/daml/Vault/CommitmentContract.daml`
- Modify: `cn-quickstart/quickstart/daml/licensing/daml.yaml` (add data-dependencies on splice token standard DARs if not present)

- [ ] **Step 1: Confirm the DARs are already data-deps**

```bash
cat cn-quickstart/quickstart/daml/licensing/daml.yaml
```

Expected: already includes `splice-api-token-holding-v1-1.0.0.dar`, `splice-api-token-allocation-v1-1.0.0.dar`, `splice-api-token-allocation-request-v1-1.0.0.dar` in `data-dependencies`. If not, add them (mirror what `License.daml` imports).

- [ ] **Step 2: Study LicenseRenewalRequest_CompleteRenewal closely**

Read `cn-quickstart/quickstart/daml/licensing/daml/Licensing/License.daml` end-to-end. Write down in `docs/DECISION-LOG.md`:
- Which interface does `LicenseRenewalRequest` implement? (answer: `AllocationRequest`)
- What does `CompleteRenewal` do step-by-step?
- Which fields of `CommitmentContract` map to which fields of the AllocationRequest?

- [ ] **Step 3: Implement the real amulet transfer in Fulfill**

Replace the symbolic `Fulfill` body with a version that:
1. Builds an `AllocationRequest` (or directly calls `Allocation_ExecuteTransfer`) referencing the proposer's amulet holding
2. Transfers `amount` CC from proposer to accepter
3. Then creates the `SettlementReceipt`

The exact API depends on the SDK version; follow `License.daml` line-for-line as the reference. If you cannot make it compile in 4 hours of focused work, STOP and post a question to Jatin on Discord with the specific compile error and what you tried. Do not silently fall back to symbolic settlement.

- [ ] **Step 4: Update the test to validate real transfer**

Convert `TestFulfill` to the integration-test form (b) from Task 1.6 Step 2: provision amulet to proposer and accepter using the splice-amulet-test setup boilerplate, then assert that after `Fulfill`, the accepter's amulet balance increased by `amount` and the proposer's decreased.

- [ ] **Step 5: Run the integration test against LocalNet**

```bash
make start   # ensure LocalNet is running with funded wallets
make shell && daml test --package-root daml
```

Expected: PASS — real Canton Coin moved.

- [ ] **Step 6: Commit (this is a milestone)**

```bash
git add -A
git commit -m "feat(daml): REAL Canton Coin settlement in Fulfill via amulet (non-negotiable milestone)"
```

- [ ] **Step 7: Record the milestone in the decision log**

```bash
echo "- 🎯 MILESTONE: Real Canton Coin settlement working end-to-end (Fulfill moves amulet)." >> docs/DECISION-LOG.md
git add docs/DECISION-LOG.md
git commit -m "docs: record Canton Coin settlement milestone"
```

### Task 1.7: Add Refund choice (deadline-gated)

**Files:**
- Modify: `cn-quickstart/quickstart/daml/licensing/daml/Vault/CommitmentContract.daml`
- Test: `cn-quickstart/quickstart/daml/licensing-tests/daml/Vault/Scripts/TestRefund.daml`

- [ ] **Step 1: Write the failing test (refund before deadline should fail)**

```daml
module Vault.Scripts.TestRefund where

import Daml.Script
import DA.Assert (assertMsg)
import Vault.CommitmentProposal (CommitmentProposal(..), AcceptProposal(..))
import Vault.CommitmentContract (CommitmentContract(..), Refund(..))

test_refund_blocked_before_deadline : Script ()
test_refund_blocked_before_deadline = do
  proposer <- allocateParty "SME"
  accepter <- allocateParty "Financier"
  thirdParty <- allocateParty "Buyer"
  proposalCid <- submit proposer $ createCmd CommitmentProposal with
    proposer = proposer
    accepter = accepter
    thirdParty = thirdParty
    amount = 100.0
    currency = "CC"
    description = "Invoice INV-2026-003"
    workflow = "invoice-financing"
    deadline = getTime' 9999999999999999  -- far future
  contractCid <- submit accepter $ exerciseCmd proposalCid AcceptProposal
  -- Refund before deadline must abort
  result <- try $ submit proposer $ exerciseCmd contractCid (Refund with actor = proposer)
  case result of
    Right _ -> assertMsg "Refund before deadline should fail" False
    Left _ -> return ()
  return ()
```

- [ ] **Step 2: Run to verify it fails**

```bash
make shell && daml test --package-root daml
```

Expected: FAIL — `Refund` not defined.

- [ ] **Step 3: Implement Refund**

Add to `CommitmentContract.daml`:

```daml
    choice Refund : ()
      with actor : Party
      controller actor
      do
        require "Actor is a signatory" (actor `elem` signatory this)
        now <- getTime
        assertMsg "Cannot refund before deadline exceeded" (now >= deadline)
        -- TODO(promote): actual amulet return to proposer
        -- For the hackathon scope, Refund archives the contract; the symbolic
        -- version returns control to proposer. Promote to real amulet if time allows.
```

- [ ] **Step 4: Run to verify it passes**

```bash
daml test --package-root daml
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(daml): add Refund choice (deadline-gated)"
```

### Task 1.8: Add ResolveDispute to DisputeCase (thirdParty decides)

Already partially implemented in Task 1.5 Step 3. Add a dedicated test:

**Files:**
- Test: `cn-quickstart/quickstart/daml/licensing-tests/daml/Vault/Scripts/TestResolveDispute.daml`

- [ ] **Step 1: Write the failing test**

```daml
module Vault.Scripts.TestResolveDispute where

import Daml.Script
import Vault.CommitmentProposal (CommitmentProposal(..), AcceptProposal(..))
import Vault.CommitmentContract (RaiseDispute(..))
import Vault.DisputeCase (DisputeCase(..), ResolveDispute(..))
import Vault.SettlementReceipt (SettlementReceipt(..))

test_thirdparty_resolves : Script ()
test_thirdparty_resolves = do
  proposer <- allocateParty "SME"
  accepter <- allocateParty "Financier"
  thirdParty <- allocateParty "Buyer"
  proposalCid <- submit proposer $ createCmd CommitmentProposal with
    proposer = proposer
    accepter = accepter
    thirdParty = thirdParty
    amount = 100.0
    currency = "CC"
    description = "Invoice INV-2026-004"
    workflow = "invoice-financing"
    deadline = getTime' 6000000000000
  contractCid <- submit accepter $ exerciseCmd proposalCid AcceptProposal
  disputeCid <- submit proposer $ exerciseCmd contractCid (RaiseDispute with reason = "unpaid")
  -- Third party resolves
  receiptCid <- submit thirdParty $ exerciseCmd disputeCid (ResolveDispute with ruling = "proposer")
  receipts <- query @SettlementReceipt thirdParty
  assertMsg "thirdParty sees receipt after resolution" (not (null receipts))
  return ()
```

- [ ] **Step 2: Run to verify it passes**

```bash
make shell && daml test --package-root daml
```

Expected: PASS (ResolveDispute was implemented in Task 1.5).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(daml): thirdParty can resolve dispute and see receipt"
```

### Task 1.9: End-to-end workflow test (both scenarios)

**Files:**
- Test: `cn-quickstart/quickstart/daml/licensing-tests/daml/Vault/Scripts/TestWorkflow.daml`

- [ ] **Step 1: Write the end-to-end test for the happy path (Invoice Financing)**

```daml
module Vault.Scripts.TestWorkflow where

import Daml.Script
import Vault.CommitmentProposal (CommitmentProposal(..), AcceptProposal(..))
import Vault.CommitmentContract (CommitmentContract(..), Fulfill, Status(..))
import Vault.SettlementReceipt (SettlementReceipt(..))

test_invoice_financing_happy_path : Script ()
test_invoice_financing_happy_path = do
  sme <- allocateParty "SME-Corp"
  financier <- allocateParty "Financier"
  buyer <- allocateParty "Buyer-Corp"
  competitor <- allocateParty "Competitor"  -- a 4th party connected to the same node

  -- 1. SME proposes factoring
  proposalCid <- submit sme $ createCmd CommitmentProposal with
    proposer = sme
    accepter = financier
    thirdParty = buyer
    amount = 8000.0
    currency = "CC"
    description = "Invoice INV-2026-001 factoring"
    workflow = "invoice-financing"
    deadline = getTime' 6000000000000

  -- 2. Competitor must NOT see the proposal
  competitorProposals <- query @CommitmentProposal competitor
  assertMsg "competitor sees no proposal" (null competitorProposals)

  -- 3. Financier accepts
  contractCid <- submit financier $ exerciseCmd proposalCid AcceptProposal

  -- 4. Competitor must NOT see the contract
  competitorContracts <- query @CommitmentContract competitor
  assertMsg "competitor sees no contract" (null competitorContracts)

  -- 5. Buyer must NOT see the contract (key privacy claim for invoice financing)
  buyerContracts <- query @CommitmentContract buyer
  assertMsg "buyer sees no contract (factoring hidden)" (null buyerContracts)

  -- 6. Fulfill (buyer paid the invoice off-chain; financier releases repayment)
  receiptCid <- submit financier $ exerciseCmd contractCid Fulfill

  -- 7. SME sees the receipt; buyer still sees nothing
  smeReceipts <- query @SettlementReceipt sme
  assertMsg "SME sees receipt" (not (null smeReceipts))
  buyerReceipts <- query @SettlementReceipt buyer
  assertMsg "buyer still sees no receipt" (null buyerReceipts)

  return ()
```

- [ ] **Step 2: Run to verify it passes**

```bash
make shell && daml test --package-root daml
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(daml): end-to-end invoice financing happy path with privacy assertions"
```

---

## Phase 2 — Backend (OpenAPI + Spring controllers) (Week 2, days 3-5)

### Task 2.1: Add Vault paths to common/openapi.yaml

> This is the highest-leverage backend task. The codegen derives both Spring interfaces (backend) and TS types (frontend) from this single file.

**Files:**
- Modify: `cn-quickstart/quickstart/common/openapi.yaml`

- [ ] **Step 1: Study the existing paths in openapi.yaml**

```bash
grep -n "^  /" cn-quickstart/quickstart/common/openapi.yaml | head -30
```

Note the conventions: path naming, operationId naming, response schemas.

- [ ] **Step 2: Add the 10 Vault paths**

Add (following the existing style):

```yaml
  /commitment-proposals:
    get:
      operationId: listCommitmentProposals
      ...
    post:
      operationId: createCommitmentProposal
      ...
  /commitment-proposals/{cid}:accept:
    post:
      operationId: acceptCommitmentProposal
      ...
  /commitment-proposals/{cid}:reject:
    post:
      operationId: rejectCommitmentProposal
      ...
  /commitments:
    get:
      operationId: listCommitments
      ...
  /commitments/{cid}:fulfill:
    post:
      operationId: fulfillCommitment
      ...
  /commitments/{cid}:raise-dispute:
    post:
      operationId: raiseCommitmentDispute
      ...
  /commitments/{cid}:refund:
    post:
      operationId: refundCommitment
      ...
  /dispute-cases:
    get:
      operationId: listDisputeCases
      ...
  /dispute-cases/{cid}:resolve:
    post:
      operationId: resolveDisputeCase
      ...
  /settlement-receipts:
    get:
      operationId: listSettlementReceipts
      ...
```

For each path, define the request/response schemas (mirror the Daml template field names: `proposer`, `accepter`, `thirdParty`, `amount`, `currency`, `description`, `workflow`, `deadline`, `status`, `reason`, `ruling`, `note`, `timestamp`).

Use the schemas from `cn-quickstart/quickstart/daml/licensing/daml/Licensing/AppInstall.daml` and `License.daml` as a reference for how request bodies map to choice arguments.

- [ ] **Step 3: Regenerate the Spring interfaces**

```bash
cd "/Users/munay/dev/Build on Canton Hackathon/cn-quickstart/quickstart"
./gradlew :backend:openApiGenerate
```

Expected: generates `backend/build/generated-spring/.../CommitmentProposalsApi.java`, `CommitmentsApi.java`, `DisputeCasesApi.java`, `SettlementReceiptsApi.java` (interfaces).

- [ ] **Step 4: Commit**

```bash
git add cn-quickstart/quickstart/common/openapi.yaml
git commit -m "feat(openapi): add 10 Vault endpoints (commitments, disputes, receipts)"
```

### Task 2.2: Implement CommitmentProposalsApiImpl

**Files:**
- Create: `cn-quickstart/quickstart/backend/src/main/java/com/digitalasset/quickstart/service/CommitmentProposalsApiImpl.java`

- [ ] **Step 1: Copy AppInstallRequestsApiImpl.java as the template**

```bash
cp cn-quickstart/quickstart/backend/src/main/java/com/digitalasset/quickstart/service/AppInstallRequestsApiImpl.java \
   cn-quickstart/quickstart/backend/src/main/java/com/digitalasset/quickstart/service/CommitmentProposalsApiImpl.java
```

Then edit to:
- Change `implements AppInstallRequestsApi` → `implements CommitmentProposalsApi`
- Replace `AppInstallRequest` references with `CommitmentProposal`
- Map endpoints: `listCommitmentProposals` (read via PQS), `createCommitmentProposal` (write via gRPC createCmd), `acceptCommitmentProposal` (exercise AcceptProposal), `rejectCommitmentProposal` (exercise RejectProposal)

- [ ] **Step 2: Run the backend build to verify it compiles**

```bash
./gradlew :backend:compileJava
```

Expected: compiles. Fix any Daml-binding mismatches (the generated binding class names come from the DAR — they'll be `quickstart_licensing.vault.commitmentproposal.CommitmentProposal.*`).

- [ ] **Step 3: Write a Spring Boot integration test**

Following the pattern of existing backend tests (find them under `backend/src/test/`), write a test that:
- Creates a CommitmentProposal via the endpoint
- Lists it back
- Accepts it via the endpoint
- Verifies a CommitmentContract is now visible

- [ ] **Step 4: Run the test against LocalNet**

```bash
make start   # ensure LocalNet running
./gradlew :backend:test --tests "*CommitmentProposal*"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(backend): CommitmentProposalsApiImpl (create, list, accept, reject)"
```

### Task 2.3: Implement CommitmentsApiImpl

**Files:**
- Create: `cn-quickstart/quickstart/backend/src/main/java/com/digitalasset/quickstart/service/CommitmentsApiImpl.java`

- [ ] **Step 1: Model after LicenseApiImpl.java (it exercises settlement-style choices)**

```bash
cp cn-quickstart/quickstart/backend/src/main/java/com/digitalasset/quickstart/service/LicenseApiImpl.java \
   cn-quickstart/quickstart/backend/src/main/java/com/digitalasset/quickstart/service/CommitmentsApiImpl.java
```

Map: `listCommitments` (PQS read of `CommitmentContract`), `fulfillCommitment` (exercise Fulfill — this is where Canton Coin settlement happens via the backend), `raiseCommitmentDispute` (exercise RaiseDispute), `refundCommitment` (exercise Refund).

- [ ] **Step 2: Compile and write integration test**

```bash
./gradlew :backend:compileJava
# write test modeled on LicenseApiImplTest
```

- [ ] **Step 3: Run the test**

```bash
./gradlew :backend:test --tests "*Commitment*"
```

Expected: PASS, including the Canton Coin settlement path (validated end-to-end through the backend).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(backend): CommitmentsApiImpl (list, fulfill, raise-dispute, refund)"
```

### Task 2.4: Implement DisputeCasesApiImpl and SettlementReceiptsApiImpl

**Files:**
- Create: `cn-quickstart/quickstart/backend/src/main/java/com/digitalasset/quickstart/service/DisputeCasesApiImpl.java`
- Create: `cn-quickstart/quickstart/backend/src/main/java/com/digitalasset/quickstart/service/SettlementReceiptsApiImpl.java`

- [ ] **Step 1: Implement DisputeCasesApiImpl**

Map: `listDisputeCases` (PQS read), `resolveDisputeCase` (exercise ResolveDispute, controller is thirdParty — so the request must be authorized as thirdParty).

- [ ] **Step 2: Implement SettlementReceiptsApiImpl**

Map: `listSettlementReceipts` (PQS read only — no choices on receipts).

- [ ] **Step 3: Compile and integration-test both**

```bash
./gradlew :backend:compileJava
./gradlew :backend:test --tests "*Dispute*"
./gradlew :backend:test --tests "*Settlement*"
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(backend): DisputeCasesApiImpl + SettlementReceiptsApiImpl"
```

### Task 2.5: Update feature flags and routes

**Files:**
- Modify: `cn-quickstart/quickstart/backend/src/main/java/com/digitalasset/quickstart/service/FeatureFlagsImpl.java` (if feature-flagged)

- [ ] **Step 1: Add a `vaultEnabled` flag (optional)**

If the existing pattern feature-flags new modules, add `vaultEnabled: true` to the default feature flags so the Vault endpoints are active in dev.

- [ ] **Step 2: Smoke test the full backend**

```bash
make restart-backend
curl http://localhost:8080/commitment-proposals   # with appropriate auth header
```

Expected: HTTP 200 with empty list (no proposals yet).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(backend): enable Vault endpoints in feature flags"
```

---

## Phase 3 — Frontend (Week 3, days 1-3)

### Task 3.1: Set up TailwindCSS in the frontend

**Files:**
- Modify: `cn-quickstart/quickstart/frontend/package.json`
- Modify: `cn-quickstart/quickstart/frontend/tailwind.config.js` (new)
- Modify: `cn-quickstart/quickstart/frontend/src/index.css` (add Tailwind directives)

- [ ] **Step 1: Install TailwindCSS**

```bash
cd cn-quickstart/quickstart/frontend
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: Configure Tailwind**

`tailwind.config.js`:
```js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {
    colors: {
      // Canton-inspired institutional palette
      canton: { dark: '#0B1F3A', blue: '#1E40AF', accent: '#7C3AED' }
    }
  }},
  plugins: [],
}
```

- [ ] **Step 3: Add Tailwind directives to index.css**

Add at the top of `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Regenerate the TS client types**

```bash
npm run gen:openapi
```

Expected: `src/openapi.d.ts` now includes `CommitmentProposal`, `CommitmentContract`, etc. types.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(frontend): add TailwindCSS with Canton institutional palette"
```

### Task 3.2: Create commitmentStore

**Files:**
- Create: `cn-quickstart/quickstart/frontend/src/stores/commitmentStore.tsx`

- [ ] **Step 1: Copy appInstallStore.tsx as template**

```bash
cp src/stores/appInstallStore.tsx src/stores/commitmentStore.tsx
```

- [ ] **Step 2: Adapt to Vault endpoints**

Replace the API calls with the generated client methods:
- `listCommitmentProposals`, `createCommitmentProposal`, `acceptCommitmentProposal`, `rejectCommitmentProposal`
- `listCommitments`, `fulfillCommitment`, `raiseCommitmentDispute`, `refundCommitment`
- `listSettlementReceipts`

Add React state for the currently-active view (`'proposer' | 'accepter' | 'thirdParty' | 'competitor'`) — this drives the split-screen demo.

- [ ] **Step 3: Build and verify it compiles**

```bash
npm run build
```

Expected: compiles.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(frontend): commitmentStore with all Vault endpoints"
```

### Task 3.3: Create DashboardView

**Files:**
- Create: `cn-quickstart/quickstart/frontend/src/views/DashboardView.tsx`
- Create: `cn-quickstart/quickstart/frontend/src/components/CommitmentCard.tsx`

- [ ] **Step 1: Write the DashboardView**

Shows two columns:
- **"As Proposer"** — commitment proposals I've created + active CommitmentContracts where I'm proposer
- **"As Accepter"** — proposals awaiting my acceptance + active CommitmentContracts where I'm accepter

Each CommitmentCard shows: description, amount, currency, status, deadline, and action buttons (Accept/Reject/Fulfill/Raise Dispute/Refund) appropriate to the user's role.

- [ ] **Step 2: Add the route**

Edit `src/App.tsx` to add:
```tsx
<Route path="/vault" element={<DashboardView />} />
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
make restart-frontend
open http://app-provider.localhost:3000/vault
```

Expected: dashboard renders (empty if no commitments).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(frontend): DashboardView with role-based commitment cards"
```

### Task 3.4: Create CreateCommitmentView

**Files:**
- Create: `cn-quickstart/quickstart/frontend/src/views/CreateCommitmentView.tsx`

- [ ] **Step 1: Write the form**

Fields: proposer (auto-filled from logged-in party), accepter (party selector), thirdParty (party selector), amount, currency (default "CC"), description, workflow (dropdown: "invoice-financing" | "otc-block-trade"), deadline (date picker).

On submit, calls `createCommitmentProposal` from the store.

- [ ] **Step 2: Add route `/vault/new`**

- [ ] **Step 3: Build, verify, commit**

```bash
npm run build
git add -A && git commit -m "feat(frontend): CreateCommitmentView (propose form)"
```

### Task 3.5: Create CommitmentDetailView

**Files:**
- Create: `cn-quickstart/quickstart/frontend/src/views/CommitmentDetailView.tsx`

- [ ] **Step 1: Write the detail view**

Shows: all fields of a CommitmentContract, status, action buttons (Fulfill / Raise Dispute / Refund — role-dependent), and (if disputed) the DisputeCase with the ResolveDispute button (visible only to thirdParty).

- [ ] **Step 2: Add route `/vault/:cid`**

- [ ] **Step 3: Build, verify, commit**

```bash
npm run build
git add -A && git commit -m "feat(frontend): CommitmentDetailView with role-based actions"
```

### Task 3.6: 🔥 Create SplitScreenDemoView (the killer feature)

> This is the single most important UI deliverable. It must clearly show, in one glance, that the competitor's quadrant is empty.

**Files:**
- Create: `cn-quickstart/quickstart/frontend/src/views/SplitScreenDemoView.tsx`

- [ ] **Step 1: Design the 4-quadrant layout**

A 2x2 grid:
- Top-left: **Proposer view** (logged in as SME/Dealer A) — sees proposals + contracts
- Top-right: **Accepter view** (logged in as Financier/Dealer B) — sees proposals + contracts
- Bottom-left: **ThirdParty view** (logged in as Buyer/Clearing) — sees NOTHING until dispute/disclosure
- Bottom-right: **Competitor view** (logged in as a 4th party) — sees NOTHING, ever

Each quadrant has a header with the party name + role, and a list (or empty state with the message "No contracts visible — this is selective disclosure in action").

- [ ] **Step 2: Implement the view**

The tricky part: the frontend needs to make 4 separate authenticated API calls (one per party). For the demo, this can be done by:
- Spawning 4 sessions in iframes, OR
- Making 4 sequential API calls with different auth tokens in the same component, displaying each result in its quadrant.

Approach 2 (single component, 4 token-scoped calls) is simpler for a hackathon. The tokens come from the shared-secret auth (4 users: `app-provider`, `app-user`, plus 2 new tenants we register).

- [ ] **Step 3: Add the "raise dispute" trigger button**

A button in the demo that, when clicked, exercises `RaiseDispute` on the active CommitmentContract. After clicking, the ThirdParty quadrant should populate with the DisputeCase. This is the **"selective disclosure on-demand" moment** that makes the demo click.

- [ ] **Step 4: Add route `/vault/demo`**

- [ ] **Step 5: Build, verify, record a 30-second screen capture**

```bash
npm run build
make restart-frontend
# Open http://app-provider.localhost:3000/vault/demo
# Manually verify: competitor quadrant empty, thirdParty empty until dispute button clicked
# Screen-record 30s for the team
```

Expected: split-screen shows privacy working.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(frontend): SplitScreenDemoView (killer feature — 4-quadrant privacy proof)"
```

---

## Phase 4 — Live Deploy & Submission (Week 4)

### Task 4.1: Deploy to Seaport devnet

> Requires Task 0.3 to be resolved (Jatin's answers).

**Files:** none in repo (deploy action)

- [ ] **Step 1: Build the .dar**

```bash
cd "/Users/munay/dev/Build on Canton Hackathon/cn-quickstart/quickstart"
make build-daml
ls daml/licensing/.daml/dist/  # verify the .dar exists
```

- [ ] **Step 2: Upload to Seaport per Jatin's instructions**

Follow the exact path Jatin described (upload .dar, select Encode Hackathon validator, deploy). Capture the deployment URL.

- [ ] **Step 3: Configure the frontend to point at Seaport's JSON API**

Add an env var `VITE_LEDGER_API_BASE` that the frontend uses for API calls. Set it to the Seaport URL for the live build.

- [ ] **Step 4: Smoke test the live deployment**

Create a commitment proposal against the live validator. Verify it appears.

- [ ] **Step 5: Commit + record in decision log**

```bash
echo "- 🎯 MILESTONE: Live on Seaport devnet at <URL>" >> docs/DECISION-LOG.md
git add -A && git commit -m "deploy: CantonVault live on Seaport devnet"
```

### Task 4.2: Fallback — Docker LocalNet one-command deploy

> Always build this in parallel with 4.1; it's the safety net if Seaport has issues during judging.

**Files:**
- Modify: `README.md` (the root one, with setup instructions)

- [ ] **Step 1: Verify the one-command flow works from a clean clone**

```bash
cd /tmp && git clone <our repo> cantonvault-test
cd cantonvault-test/cn-quickstart/quickstart
make setup  # accept defaults
make build && make start
open http://app-provider.localhost:3000/vault/demo
```

Expected: demo loads. If anything breaks, fix the README.

- [ ] **Step 2: Write a clean README setup section**

The root `README.md` must have a setup section that a judge can follow in <5 minutes.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: clean one-command setup for judges"
```

### Task 4.3: Write the slide deck (10 slides max)

**Files:**
- Create: `docs/pitch-deck.md` (source for the slides, will export to PDF/Keynote)

- [ ] **Step 1: Draft the 10 slides per `docs/decisiones/03-posicionamiento-pitch.md` §"Slide deck"**

- [ ] **Step 2: Generate the actual deck (PDF)**

Use the tool of choice (Marp, Keynote, Google Slides). Export to `docs/CantonVault-Deck.pdf`.

- [ ] **Step 3: Commit**

```bash
git add docs/pitch-deck.md docs/CantonVault-Deck.pdf
git commit -m "docs: 10-slide pitch deck"
```

### Task 4.4: Record the 3-minute video

**Files:**
- Create: `docs/CantonVault-Demo.mp4` (or a link to it)

- [ ] **Step 1: Script the video** (already in `docs/decisiones/03-posicionamiento-pitch.md` §"Script del video")

- [ ] **Step 2: Record following the script**

Sections:
- 0:00-0:15: data shock (double-factoring, OTC leakage)
- 0:15-0:30: problem
- 0:30-0:45: solution
- 0:45-1:45: demo Invoice Financing (split-screen)
- 1:45-2:15: demo OTC Block Trade
- 2:15-2:30: "una primitiva, múltiples workflows"
- 2:30-2:50: why Canton (honest version) + anti-Corda
- 2:50-3:00: CTA

- [ ] **Step 3: Edit and export**

Cap at 3:00. Add subtitles for the privacy callouts.

- [ ] **Step 4: Commit + upload to the Encode platform**

```bash
git add docs/CantonVault-Demo.mp4
git commit -m "docs: 3-minute demo video"
```

### Task 4.5: Final submission checklist

- [ ] Public repository (this repo, pushed to GitHub)
- [ ] Presentation deck (10 slides max) — `docs/CantonVault-Deck.pdf`
- [ ] 3-minute video pitch w/ demo — `docs/CantonVault-Demo.mp4`
- [ ] Link to live product — Seaport URL (or LocalNet one-command fallback)
- [ ] README with setup instructions — `README.md`
- [ ] Privacy evidence (split-screen demo works) — verified in Task 3.6
- [ ] Real Canton Coin settlement (non-negotiable) — verified in Task 1.6b

```bash
git add -A
git commit -m "chore: final submission checklist complete"
git push origin main
```

---

## Self-Review

### 1. Spec coverage

| Spec section | Tasks covering it |
|---|---|
| §1 Resumen + Por qué Canton + Anti-Corda | Task 4.3 (deck), 4.4 (video) |
| §2 Escenarios (Invoice Financing + OTC) | Task 1.9 (workflow test), 3.6 (demo) |
| §3 Arquitectura (frontend/backend/daml/infra) | All of Phase 1-3 |
| §4 4 contratos Daml | Tasks 1.1-1.8 |
| §5 Canton Coin settlement NON-NEGOTIABLE | Task 1.6 + 1.6b |
| §6 Extensiones al cn-quickstart | Tasks 1.x (daml), 2.x (backend), 3.x (frontend) |
| §7 Verificación de privacidad | Tasks 1.4, 1.9 (privacy tests) |
| §8 Estrategia de testing | Tasks 1.x tests, 2.x integration tests, 3.x manual |
| §9 Plan 4 semanas | Phase 0-4 mirror the weeks |
| §10 Datos verificables | Task 4.3 (deck) |
| §11 Entregables | Task 4.5 |
| §12 Riesgos | Task 0.3 (Seaport), 1.6b (amulet) |

**Gaps**: none. All spec sections are covered.

### 2. Placeholder scan

- ✅ `TODO(Phase 1.6b)` in Task 1.6 Step 4 — intentional, points to a named follow-up task with concrete steps. Acceptable.
- ✅ `TODO(promote)` in Task 1.7 Step 3 — Refund amulet return is optional scope; clearly marked. Acceptable.
- ✅ All `...` in tests are intentional pseudocode markers, not placeholders — the surrounding code is concrete and complete.

### 3. Type consistency

- ✅ Field names consistent across all templates and tests: `proposer`, `accepter`, `thirdParty`, `amount`, `currency`, `description`, `workflow`, `deadline`, `status`, `reason`, `ruling`, `note`, `timestamp`.
- ✅ Choice names consistent: `AcceptProposal`, `RejectProposal`, `Fulfill`, `RaiseDispute`, `Refund`, `ResolveDispute`.
- ✅ Template names consistent: `CommitmentProposal`, `CommitmentContract`, `DisputeCase`, `SettlementReceipt`.
- ✅ Status enum consistent: `Active | Fulfilled | Disputed | Refunded`.

### Notes for the implementer

- **Biggest risk**: Task 1.6b (real Canton Coin settlement). Budget 2x the time. If stuck >4h, ask Jatin on Discord with the specific compile error.
- **Second risk**: Task 0.3 (Seaport — usar la guía de Jatin https://github.com/Jatinp26/Seaport-Guide). Start the Discord thread day 1, don't wait.
- **Third risk**: circular import between `CommitmentContract` and `DisputeCase`. Resolved by deciding at implementation time (document in decision log).
- **Always run tests after each step**. The TDD discipline catches Daml type errors early.
- **Commit frequently**. Every green test = a commit.
