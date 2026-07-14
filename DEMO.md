# CantonVault — Jury Demo Guide

> **Live demo: https://canton-vault.pages.dev**
> Estimated time: **90 seconds** for the happy path, **3 minutes** including the dispute flow.

This guide walks through the full CantonVault lifecycle on the live Canton Network DevNet. Every action you take creates a **real on-ledger transaction** — you'll see the contractId and ledger offset as proof.

---

## What you're looking at

CantonVault is a privacy-first trade-finance protocol. Three parties interact:

| Role | Who | What they can see |
|---|---|---|
| **Proposer** | Supplier / SME / Dealer A | Full commitment details |
| **Accepter** | Financier / Dealer B | Full commitment details |
| **Third Party** | Buyer / Clearing House / Arbitrator | **Nothing** — until a dispute is raised |

The key Canton feature being demonstrated: **the third party's validator node physically never receives the commitment data.** This is not encryption — it's Canton's sub-transaction privacy. The data doesn't exist on their node.

---

## The 3-step wizard

The UI has three steps: **Propose → Act → Privacy Lab**.

### Step 1 · Propose — create a private commitment (~20s)

1. Open https://canton-vault.pages.dev
2. You're on **Step 1 · Propose**. The form on the left is pre-filled with defaults.
3. Pick a **Workflow Scenario** (Supply Chain Finance, Invoice Financing, or OTC Block Trade).
4. Enter an **Amount** (e.g. `5000`) and a **Description** (e.g. `Invoice INV-2026-001`).
5. Leave Accepter and Third Party as the default party (the demo party plays all roles).
6. Click **Submit Private Proposal**.

**What happens:**
- A `CommitmentProposal` contract is created on the Canton DevNet ledger.
- A green toast appears: **✓ On-ledger confirmed** with the contractId + ledger offset.
- Your proposal appears in the **Active Proposals** list on the right.

> 📌 The toast shows a real contractId (138 chars) and the ledger offset where the transaction landed. Hit **⧉ copy** to grab the full contractId.

### Step 2 · Act — accept, fulfill, dispute (~40s)

1. Your proposal is in the **Active Proposals** list with **Accept** / **Reject** buttons.
2. Click **Accept**.
   - The proposal disappears from the list (it was consumed — Daml archival).
   - A green toast confirms: *"Proposal accepted — commitment is live."*
3. Switch to **Step 2 · Act** (click the stepper at the top).
4. Your commitment now appears under **Active Commitments** with three actions: **Fulfill**, **Dispute**, **Refund**.
5. Click **Fulfill** → confirm in the modal.
   - The commitment is archived (Daml consuming choice — prevents double-fulfill).
   - Canton Coin is settled atomically (accepter → proposer).
   - A `SettlementReceipt` is created as immutable evidence.

### Step 3 · Privacy Lab — verify the privacy guarantee (~30s)

1. Switch to **Step 3 · Privacy Lab**.
2. You see three columns side by side:

| Column | What it shows |
|---|---|
| **🤝 Stakeholders View** | Full commitment: amount, description, all party IDs |
| **🔒 Arbitrator (Pre-Dispute)** | `Found contracts: 0` — the arbitrator node has literally zero data |
| **🏛️ Arbitrator (Disclosed)** | Empty until you raise a dispute (see below) |

3. Below: **Canton Coin Settlement Receipts** — your fulfilled commitment appears here with the outcome (`fulfilled`) and atomic-settlement badge.

> 🔑 **The privacy proof:** Column 2 is not "empty because we didn't load data." It's empty because **Canton's sub-transaction privacy model physically never sent the transaction to the arbitrator's validator node.** The arbitrator's ledger is genuinely blank.

---

## Optional: The dispute flow (selective disclosure)

This demonstrates **on-demand selective disclosure** — the core privacy primitive.

1. Go back to **Step 2 · Act**. Create a new proposal + accept it (repeat Steps 1-2 above).
2. On the new active commitment, click **Dispute** → enter a reason → confirm.
   - The commitment is archived.
   - A `DisputeCase` is created — **now the third party becomes an observer.**
   - A `DisclosedRecord` is created revealing **only** `amount` and `description` (not currency, not workflow, not party identities).
3. Go to **Step 3 · Privacy Lab** → the **Arbitrator (Disclosed)** column now shows the selective disclosure: just the two revealed fields + the dispute reason.
4. Go back to **Step 2** → the dispute appears under **Escalations & Disputes** with a **Resolve** button.
5. Click **Resolve** → choose a ruling (proposer or accepter) → confirm.
   - The dispute is archived.
   - A terminal `SettlementReceipt` records the binding outcome.

---

## Verify it's real (for skeptics)

Everything above is on the actual Canton Network DevNet. Verify independently:

```bash
# 1. Backend health — Canton version + current ledger offset
curl -s https://canton-vault.pages.dev/api/health
# {"status":"ok","cantonVersion":"3.5.8","ledgerOffset":4327615}

# 2. Real on-ledger Canton Coin balance (31M+ CC, grows from Amulet rewards)
curl -s https://canton-vault.pages.dev/api/vault/balance
# {"balance":31433860.95,"locked":0,"round":52809,"party":"cancore::..."}

# 3. Active proposals (from the contract index)
curl -s https://canton-vault.pages.dev/api/vault/proposals

# 4. Active commitments
curl -s https://canton-vault.pages.dev/api/vault/commitments

# 5. Settlement receipts
curl -s https://canton-vault.pages.dev/api/vault/receipts
```

The `ledgerOffset` increments with every transaction network-wide. Your proposals/fulfills land at real offsets you can correlate with the toast notifications.

---

## What makes this different

| Feature | CantonVault | Generic blockchain app |
|---|---|---|
| **Privacy** | Sub-transaction privacy: arbitrator's node physically has zero data until dispute | Data encrypted but stored on all nodes |
| **Settlement** | Atomic DvP via Splice Amulet token standard (real Canton Coin) | Manual or external settlement |
| **Selective disclosure** | On-demand field-level revelation (amount + description only) | All-or-nothing access control |
| **Double-spend prevention** | Daml consuming choices (archival is the state machine) | Application-level flags |
| **Audit trail** | Immutable `SettlementReceipt` + `DisclosedRecord` on-ledger | Off-chain logs |

---

## Troubleshooting

- **Nothing appears after Submit:** Wait 2 seconds, then click **↻ Sync** (top right). SWR revalidates on focus — switch browser tabs and back to refresh.
- **"Ledger is temporarily unavailable" (502):** The DevNet validator occasionally restarts. Wait 10s and retry.
- **Canton Coin balance shows 0:** The demo party has 31M+ CC; if it reads 0, the Splice Validator API is syncing. Refresh.
