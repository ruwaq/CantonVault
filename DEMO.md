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

## The 3-step flow

The UI has three steps: **Create → Act → Verify**.

### Step 1 · Create — send a private offer (~20s)

1. Open https://canton-vault.pages.dev
2. You're on **Step 1 · Create**. A 4-screen wizard walks you through one decision per screen:
   - **Screen 1:** What's this agreement for? (e.g. `Invoice INV-2026-001`)
   - **Screen 2:** How much? (e.g. `5000` CC)
   - **Screen 3:** Who else? (accepter + mediator — pre-selected with defaults)
   - **Screen 4:** Review and send — pick an expiry (1 hour / 1 day / 1 week), then **Send offer**.
3. A success screen confirms: **✓ Offer sent!**

**What happens:**
- A `CommitmentProposal` contract is created on the Canton DevNet ledger.
- Your offer appears in the **Active Proposals** list on the right with its real contractId.

> 📌 The contractId is a real 138-char on-ledger identifier. Hit **⧉ copy** to grab it and verify independently.

### Step 2 · Act — accept, fulfill, dispute (~40s)

1. Your proposal is in the **Active Proposals** list with **Accept offer** / **Decline** buttons.
2. Click **Accept offer** → confirm in the "Here's what will happen" dialog.
   - The proposal is consumed (Daml archival) and becomes a live commitment.
3. Switch to **Step 2 · Act** (click the stepper at the top).
4. Your commitment appears under **Active Commitments** with three actions: **Confirm delivery**, **Report a problem**, **Cancel and refund**.
5. Click **Confirm delivery** → fill the modal → confirm.
   - The commitment is archived (Daml consuming choice — prevents double-fulfill).
   - Canton Coin is settled atomically (accepter → proposer).
   - A `SettlementReceipt` is created as immutable evidence.

### Step 3 · Verify — the Privacy Lab (~30s)

1. Switch to **Step 3 · Verify**.
2. A banner affirms: **🛡️ The mediator sees nothing of this.** Not hidden, not encrypted — never sent.
3. Three columns show the same commitment from different validator nodes:

| Column | What it shows |
|---|---|
| **🤝 What you see** | Full commitment: amount, description, party labels (hashes under "Technical details ▾") |
| **🔒 What the mediator sees** | **0 agreements found.** The mediator's node has no record of this transaction. |
| **👁️ What the mediator learns after a report** | Empty until you raise a dispute (see below) |

4. Below: **Payment receipts** — your fulfilled commitment appears here with "Payment completed" badge.

> 🔑 **The privacy proof:** Column 2 is not "empty because we didn't load data." It's empty because **Canton's sub-transaction privacy model physically never sent the transaction to the mediator's validator node.** The mediator's ledger is genuinely blank.

---

## Optional: The dispute flow (selective disclosure)

This demonstrates **on-demand selective disclosure** — the core privacy primitive. A seed dispute is already live in the demo, so you can see the result immediately, or create your own:

1. Go back to **Step 2 · Act**. Create a new offer + accept it (repeat Step 1 above).
2. On the new active commitment, click **Report a problem** → enter a reason → confirm.
   - The commitment is archived.
   - A `DisputeCase` is created — **now the mediator becomes an observer.**
   - A `DisclosedRecord` is created revealing **only** `amount` and `description` (not currency, not workflow, not party identities).
3. Go to **Step 3 · Verify** → the **"What the mediator learns after a report"** column now shows the selective disclosure: just the two revealed fields + the dispute reason.
4. Go back to **Step 2** → the dispute appears under **Open Disputes** with a **Resolve** button.
5. Click **Resolve** → choose a ruling (proposer or accepter) → confirm.
   - The dispute is archived.
   - A terminal `SettlementReceipt` records the binding outcome.

> 💡 **Note on the mediator:** The demo uses a single Canton identity that can act as multiple parties (via different name prefixes on the same key). The mediator party (`Observer::*`) is a genuinely distinct party from the actor (`cancore::*`) — Canton treats different prefixes as separate parties with separate validator views. This is what makes the Privacy Lab meaningful: the mediator's node really does have a separate, empty view until a dispute triggers selective disclosure.

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
