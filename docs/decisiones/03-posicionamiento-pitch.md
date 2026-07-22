# Decision 03 — Positioning and pitch

> **Naming, tagline, narrative, demo scenarios, and 3-minute video script.**
> What the judges will see and hear. **Institutional v2 version** (no LATAM, no NGO).

**Date**: 2026-06-20 (v2)
**Status**: ✅ Approved

---

## 🏷️ Identity

| Field | Value |
|---|---|
| **Product name** | `CantonVault` |
| **Tagline EN** | *"Privacy-first conditional commitments for institutional trade finance."* |
| **Tagline ES** | *"Compromisos condicionales con privacidad para finanzas de comercio institucional."* |
| **Video phrase** | *"Privacy without proof isn't privacy — it's a liability. CantonVault makes selective disclosure the emergent property of stakeholder-scoped atomic settlement, not a bolted-on cryptographic layer."* |
| **Tracks** | Track 1 (Private DeFi) primary + Track 2 (TradeFi/RWA) |
| **Tone** | Institutional, premium, technically precise (no hype, no cheap emotion) |

### Why "CantonVault" and not "CantonEscrow"

| Name | Implicit positioning | Competitive bucket |
|---|---|---|
| CantonEscrow | "Another escrow product" | Commodity (5-10 teams) |
| **CantonVault** | "Privacy primitive / commitment vault" | Differentiated (0 teams) |

"Vault" evokes institutional security, control, regulated confidentiality. "Escrow" evokes "just another internet contract." The name is the judge's first impression.

---

## 🎬 The 2 demo scenarios (100% institutional)

> ⚠️ **No LATAM, no NGO**. Both scenarios are **literal use cases from the official brief**.

### Scenario 1 (primary, ~65% of demo): **Private Invoice Financing**

> **SME Corp** (seller) has an outstanding invoice from **Buyer Corp** (large buyer, Net 60). **Financier** (fund / factor) advances cash at a 5% discount.

**The real pain point (verified)**:
- The SME does not want the Financier to see **their ENTIRE invoice portfolio** → double-factoring risk and signal of financial weakness
- The Financier does not want the Buyer to know the invoice was factored → adverse selection risk in pricing
- Today: both parties learn everything via centralized systems or manual reports

**With CantonVault**:
1. SME creates `CommitmentProposal` (SME = financing payer, Financier = payee receiving repayment, Buyer = underlying debtor)
2. Financier accepts → `CommitmentContract` is created. **SME and Financier can see it. Buyer and competitors CANNOT.**
3. When Buyer pays the invoice to the SME → SME confirms → `Fulfill`
4. Atomic settlement in Canton Coin: repayment to Financier. `SettlementReceipt` is created.
5. **The Buyer never knew the invoice was factored. The SME's competitors never saw the full portfolio.**

**Split-screen**:
| SME Corp | Financier | Buyer Corp | Competitor |
|---|---|---|---|
| ✅ Sees commitment + repayment | ✅ Sees commitment + repayment | ❌ **Empty** (doesn't know factoring occurred) | ❌ **Always empty** |

### Scenario 2 (complementary, ~25% of demo): **Private OTC Block Trade**

> **Dealer A** and **Dealer B** negotiate an OTC block (bonds / derivatives). **Clearing house** needs to see the bare minimum for netting.

**The real pain point (verified)**:
- Competitors must not see the block's price/size **before** execution → adverse market movement
- The clearing house must not see each dealer's full portfolio → privileged information
- Today: phone broker + chat + leakage risk

**With CantonVault**:
1. Dealer A creates `CommitmentProposal` (price, size, instrument) → Dealer B observer
2. Dealer B accepts → `CommitmentContract` created. Both dealers see it. **Clearing sees nothing yet.**
3. At settlement → `Fulfill` → `DisclosureContract` is created for the clearing house with ONLY the netting fields (not the full portfolio)
4. Atomic settlement in Canton Coin

**Split-screen**:
| Dealer A | Dealer B | Clearing | Market |
|---|---|---|---|
| ✅ Sees full trade | ✅ Sees full trade | 🟡 Sees **only netting** (selective disclosure) | ❌ **Empty** (no front-running possible) |

### Closing (~10% of demo): **"One primitive, multiple workflows"**

*"Same underlying contract. Private invoice financing and private OTC block trade. Selective privacy as an emergent property of stakeholder scoping, not as a bolted-on cryptographic layer. Only on Canton."*

---

## 🖥️ The killer feature: 4-quadrant split-screen demo

```
┌─────────────────────────┬─────────────────────────┐
│  🏢 PARTY A (SME/Dealer)│  💼 PARTY B (Financier) │
│                          │                          │
│  ✅ Active commitment    │  ✅ Active commitment   │
│  Repayment committed    │  Funds guaranteed       │
│  [Confirm fulfillment]  │  Awaiting release       │
├─────────────────────────┼─────────────────────────┤
│  ⚖️ THIRD PARTY (Buyer/Clear)│  🌐 COMPETITOR/MARKET │
│                          │                          │
│  (empty until disclosure)│  (COMPLETELY empty)     │
│                          │                          │
│  💡 On-demand disclosure │  💡 The contract does    │
│     when needed          │     not exist for this node│
└─────────────────────────┴─────────────────────────┘
```

**Why this is unbeatable**: in 30 seconds a judge understands selective privacy better than with 10 hours of explanation. The competitor quadrant **always empty** is the visual punch that proves Canton does not "hide" data: the data **does not exist** for that party.

---

## 🎥 3-minute video script

| Time | Section | Content |
|---|---|---|
| 0:00-0:15 | **Shock stat** | *"In invoice financing, double-factoring costs the industry billions each year. And in OTC trading, a block order leak moves entire markets in seconds."* |
| 0:15-0:30 | **The problem** | *"In institutional finance, parties need to share the bare minimum required to execute — without exposing the full portfolio, without revealing factoring, without leaking pricing to competitors. Today, that native selective disclosure infrastructure does not exist."* |
| 0:30-0:45 | **The solution** | *"CantonVault: private conditional commitments where privacy is the emergent property of stakeholder scoping, not a cryptographic layer. One primitive, multiple workflows."* |
| 0:45-1:45 | **Demo Scenario 1** | Invoice Financing: SME → Financier, Buyer does not know. Split-screen. Subtitle: *"The Buyer sees an empty ledger. The factoring was never revealed."* |
| 1:45-2:15 | **Demo Scenario 2** | OTC Block Trade: Dealer A → Dealer B, Clearing sees only netting. Subtitle: *"The market cannot front-run what it cannot see."* |
| 2:15-2:30 | **"One primitive, multiple workflows"** | *"The same contract. Privacy as protocol, not as an expensive opt-in."* |
| 2:30-2:50 | **Why Canton** | *"On Ethereum you can build this with ZK — at 10x the engineering cost, with metadata leakage, without native atomic settlement. Canton makes it the default. And no, it's not Corda resurrected — Canton adds a global synchronizer for cross-firm composability and Canton Coin for atomic settlement. Corda had neither."* |
| 2:50-3:00 | **CTA** | *"CantonVault. Privacy without proof is a liability. We make it the protocol. Only on Canton."* |

---

## 📊 Slide deck (10 slides max)

| # | Slide | Key content |
|---|---|---|
| 1 | **Cover** | CantonVault logo + tagline |
| 2 | **Problem** | Double-factoring, OTC leakage, compliance (Basel III, MiCA, FATF) |
| 3 | **Solution** | Diagram: Party A ↔ CantonVault ↔ Party B, third party off-stage |
| 4 | **Why Canton (honest)** | Honest matrix: Canton vs Ethereum-ZK vs Corda (no "impossible") |
| 5 | **Isn't this Corda?** | Explicit preempt: "yes, and Canton evolves it with X, Y" |
| 6 | **Demo Invoice Financing** | Split-screen capture: SME/Financier/Buyer/Competitor |
| 7 | **Demo OTC Block Trade** | Split-screen capture: Dealers/Clearing/Market |
| 8 | **Architecture** | Stack: Daml + cn-quickstart + Seaport + real amulet settlement |
| 9 | **Technical privacy** | Diagram of the 4 contracts + Disclosure interface + Canton Coin flow |
| 10 | **Market + Roadmap** | Trade finance gap (ADB) + vision: autonomous commerce phase 3 |

---

## ✅ Verifiable data to use (always cite the source)

| Data point | Value | Source |
|---|---|---|
| Canton Coin (CC) burn-mint equilibrium | native | Splice / Canton docs |
| Cantonomics rewards | 62% of pool (~516M CC/month) to featured apps | canton.network/blog/cantonomics-for-app-builders |
| USDCx live on Canton (global B2B payments) | Dec 2025 | canton.network/blog/usdcx-now-live-on-canton |
| HSBC tokenised deposit pilot | confirmed | canton.network/news/hsbc-completes-tokenised-deposit-pilot |
| Double-factoring as a real problem | industry documented | factoring industry reports |
| Basel III risk reporting on-demand | regulation in force | bis.org/bcbs/basel3 |
| MiCA commercial confidentiality | EU 2023/1114 | eur-lex.europa.eu/eli/reg/2023/1114 |
| FATF Travel Rule $1,000 threshold | Oct 2024 | fatf-gafi.org |
| Canton privacy thesis ("full transparency is a bug") | official blog | canton.network/blog/full-transparency-is-a-bug-not-a-feature |
| Canton anti-ZK-generality ("privacy needs proof") | official blog | canton.network/blog/zero-knowledge-proofs-whe-privacy-needs-more |

> ⚠️ **DO NOT use** (data we misapplied in v1):
> - ❌ "23% cross-border fees" (consumer remittances, not B2B)
> - ❌ "79% LATAM with late payments" (dubious source, LATAM angle discarded)
> - ❌ "$15B LATAM market" (TAM poorly applied to escrow)
> - ❌ "WFP uses blockchain" (true but NGO out of scope)
> - ❌ "81.9% Indonesian study on transparency" (unverifiable source)
> - ❌ "Impossible on Ethereum" (false in 2026 with ZK + AA)

---

## 🚫 Anti-patterns to avoid in the pitch (v2)

- ❌ "We tokenize X" without justifying why Canton
- ❌ Demo that requires 15 min of setup for the judge
- ❌ "We use AI" without crypto-enforced constraints (the brief warns against superficial solutions)
- ❌ Beautiful frontend but trivial Daml contracts
- ❌ **"Impossible on Ethereum"** (false, a ZK judge will destroy you)
- ❌ **Generic "privacy engine"** (Canton penalizes this — *"opacity is a liability"*)
- ❌ **LATAM, NGO, consumer remittance data** (does not resonate with Canton)
- ❌ **Not naming Corda** (they'll think it anyway; better to preempt)
- ❌ **Symbolic settlement** (no real Canton Coin = not economically native)

---

## ✅ What makes judges remember the project (v2)

1. **A visually striking demo**: split-screen with the competitor/market quadrant always empty
2. **A phrase that sticks**: *"Privacy without proof isn't privacy — it's a liability."* (using Canton's own words against ZK competition)
3. **Corda preempt**: naming the elephant in the room yourself gives instant credibility
4. **Real settlement with Canton Coin**: not a mock, native burn-mint equilibrium
5. **Coverage of 2 use cases from the official brief**: invoice financing + OTC, both literal from the brief
6. **Credible institutional vision**: real trade finance gap + roadmap to autonomous commerce phase 3