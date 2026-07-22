# Decision 01 — Winning Strategy: CantonVault

> **Why we are building CantonVault and not something else.**
> This document records the complete reasoning, discarded alternatives, and trade-offs. Any future deviation from the plan must be justified against this document.

**Date**: 2026-06-20 (revision v2: 2026-06-20 after market research and strategic-fit; revision v3: 2026-06-20 after competitive intelligence from Discord)
**Decision**: Build CantonVault (private conditional commitment primitive) as **institutional trade finance infrastructure with selective disclosure** and native settlement in Canton Coin.
**Status**: ✅ Approved by the team

---

## 🥊 Revision v3 — Direct competitor detected: IoMarkets

> After monitoring the Encode Club Discord on 2026-06-20, we detected a serious direct competitor. Full details in `docs/inteligencia-competitiva.md`.

**IoMarkets [AIND]** is building: *"private institutional capital markets: tokenized deposits, private deals, OTC, and an agentic treasury, with privacy enforced by the ledger"*. App already live, Daml model end-to-end, KYC/KYB attestations + tokenized-deposit DvP escrow. **More advanced than us.**

**Our strategic response**: Do NOT compete on breadth (we lose). Compete on **focus + clarity of the privacy thesis**:

| Dimension | IoMarkets | CantonVault (us) |
|---|---|---|
| Scope | Broad (KYC + custody + RWA + treasury + OTC) | **Focused**: selective disclosure primitive |
| Differentiator | RWA settlement with pass-through privacy | **Privacy as a visual product** (split-screen) |
| Demo | Functional app (less memorable) | **Visual demo that hits hard** in 30s |
| "Why Canton" | Implicit | **Explicit and demonstrable** (empty quadrant) |

**Rule**: Do NOT add KYC, tokenized deposits, or treasury to compete. That takes us out of focus. Position ourselves as **"the privacy primitive UNDERNEATH RWA settlement apps like IoMarkets"** (layer, not competitor).

**Re-estimated P(win top-3)**: 70% → **60%** (IoMarkets is a real rival). The killer split-screen demo is now MORE critical — it is the only thing that differentiates us.

---

## 🎯 The decision framework

We evaluated 6 candidates against 4 axes:

1. **P(win top-3)** — realistic probability of placing in the top-3 given the evaluation criteria
2. **P(real usage)** — probability the product survives post-hackathon
3. **Execution risk** — probability of NOT delivering something functional in 4 weeks (1 person)
4. **Expected competition level** — how many teams will do something similar

---

## 📊 The honest matrix

| Idea | P(win top-3) | P(real usage) | Exec risk | Competition | Verdict |
|---|---|---|---|---|---|
| CantonEscrow B2B LATAM (original v1 plan) | 40% | 20% | 🟢 low | 🔴 high | Commodity + false claims + doesn't resonate with Canton |
| CantonVault B2B + NGO (v1 plan) | 45% | 25% | 🟢 low | 🟡 medium | Mix of institutional with consumer/retail |
| **CantonVault institutional (TradeFi + OTC) (v2)** ⭐ | **70%** | **60%** | 🟢 low | 🟢 low | **Chosen — fits Canton's literal brief** |
| Autonomous commerce | 35% | 20% | 🔴 high | 🟢 low | Wow but complex, brief warns against superficial solutions |
| Pure factoring anti-double-factoring | 50% | 75% | 🟡 medium | 🟡 medium | It's CantonVault with less versatility |
| Inter-company cross-currency netting | 40% | 60% | 🔴 high | 🟢 low | Multi-currency settlement out of scope for 4 weeks |
| Blind auction M&A | 30% | 30% | 🔴 high | 🟢 low | Few judges connect; crypto is complex |
| Trust Registry institutional | 25% | 15% | 🟡 medium | 🔴 high | Infra-for-infra, penalized |

**Conclusion**: Institutional CantonVault (v2) maximizes the product of the 4 axes **and** aligns with what the Canton Foundation explicitly asked for in the hackathon brief.

---

## 🔑 Critical finding from v2 research (the reason for the pitch pivot)

> **The official hackathon brief literally lists the use cases that CantonVault covers.**

I read the official tracks published by Encode Club + Canton Foundation:

- **Track 1 (Private DeFi & Capital Markets)**: *"confidential lending, OTC trading workflows, private deal execution, **invoice financing**"*
- **Track 2 (TradeFi, RWA & Tokenized Assets)**: *"**invoice or supply chain financing**, inter-company cross-currency netting, tokenized deposits, enterprise workflows using tokenized real-world assets"*
- **Track 3 (Payments, Neobanking & Agentic Commerce)**: *"payments infrastructure, **treasury / business banking workflows**"*

**CantonVault v2 textually responds to Tracks 1, 2, and 3** without forcing anything. The pivot from "B2B LATAM" → "institutional trade finance" moves us from "consumer/retail app on an institutional chain" to "institutional infrastructure that Canton asked for."

---

## 🧠 Why CantonVault v2 wins on the 4 official criteria

### 1. Technical execution (⭐⭐⭐⭐⭐)
- 4 Daml contracts based on **verified patterns**:
  - Propose/Accept (from the cn-quickstart Licensing App)
  - Disclosure interface (from Daml.Finance production)
- **Real** settlement with Canton Coin (amulet) using the Splice token standard — **non-negotiable**, it's what makes us economically native (see "The real prize" below)
- 1 person finishes it with 1 week to spare for polishing

### 2. Originality (⭐⭐⭐⭐)
- Repositioning: **you leave the "escrow" bucket** (5-10 competitors) and enter **"privacy primitive for institutional trade finance"** (0 competitors on Canton)
- The repositioning **costs 0 in code** — just naming + narrative
- **We do not compete on generic "privacy engine"** (Canton penalizes that — *"opacity is a liability, privacy without proof isn't privacy"*) but on **"privacy as an emergent property of stakeholder-scoping + atomic settlement"**
- Killer response to the judge who says "isn't this just escrow?": *"No. Escrow is ONE use case. This is the conditional commitment privacy primitive that underlies invoice financing, OTC, and supply chain — all use cases Canton asked for in the brief."*

### 3. UX (⭐⭐⭐⭐⭐)
- The **4-quadrant split-screen demo** proves selective privacy in 30 seconds
- The competitor / 3rd-party quadrant always being empty is the visual punch
- 3 screens: dashboard, create commitment, detail

### 4. Real-world applicability (⭐⭐⭐⭐⭐)
- **2 institutional verticals with verified regulated demand**:
  - **Private invoice financing**: real demand (SMEs fear double-factoring; financiers fear adverse selection)
  - **Private OTC block trade**: real demand (competitors must not see price/size before execution; clearing must not see full portfolio)
- **Regulatory framework that demands selective disclosure** (verified):
  - Basel III / IV: on-demand risk exposure reporting, trade positions confidential to competitors
  - MiCA (EU 2023/1114, effective 2024): reporting to authorities, commercial confidentiality preserved
  - FATF Travel Rule (threshold lowered to $1,000 in Oct 2024): counterparty info available to authorities on-trigger, not broadcast
  - ISDA Master Agreements: confidential terms + observable defaults

---

## ❌ Discarded alternatives and why

### CantonEscrow B2B LATAM (original v1 plan)
**Why it was discarded**: 5 fatal problems discovered during research:
1. **"23% fees on $250" misapplied**: that data comes from World Bank Remittance Prices for consumer remittances of $200-500. In real B2B at $8,000 the cost is 0.5-1.5%. A bank VP judge notices it and destroys credibility.
2. **"Your bank sees your margins" false**: the bank executing a payment sees amount and parties, not your cost basis. Your margins live in your accounting.
3. **Two-party onboarding**: both need a Canton wallet + Canton Coin. Same problem that killed Contour (2023), we.trade (2022), Marco Polo (2023), TradeLens (2022).
4. **Trade Credit Insurance is better**: Allianz Trade, Coface let the buyer pay at 60 days (escrow blocks their cash today).
5. **No fiat off-ramp with VASP license** in MX (Ley Fintech/CNVB), BR (Lei 14.478), AR (BCRA). Without that, no real value is settled.

**What was kept**: the 4 base contracts, the split-screen demo, the Propose/Accept flow, the Seaport deploy, Canton Coin settlement.

### CantonVault B2B + NGO (intermediate v1 plan)
**Why it was discarded**:
- **0 mentions of "NGO", "humanitarian", "LATAM", "remittance" on canton.network or canton.foundation** (verified site-wide search)
- Canton Foundation is focused on capital markets + institutional stablecoins, not social impact
- The NGO emotional angle may confuse the judge about "is this an institutional or consumer app?"
- **WFP Building Blocks is 100% real** (4.8M households, 159 orgs, $288M, countries: Jordan, Bangladesh, Ukraine, Syria, Palestine) — but that doesn't mean Canton Foundation wants that market

**What was kept**: zero. Cleanly removed. If in the future Canton expands to NGOs, the primitive is already built.

### Autonomous commerce
**Why it was discarded**:
- Requires complex autonomous infrastructure on the critical path → can fail in the demo
- The brief explicitly warns against superficial solutions without technical foundation
- 80% of teams that attempt it will deliver concepts without real execution

**What was kept**: mention as "phase 3" vision on the roadmap. It's not a feature, it's a future direction.

### Pure factoring anti-double-factoring
**Why it was discarded as a standalone product**:
- It's basically CantonVault with scenario 1 as the entire product → less versatility
- Requires modeling Invoice + FinancingOffer + Agreement + Settlement + cross-check if made "complex"
- Better: we include it AS a demo scenario, not as a separate product

**What was kept**: it's our main demo scenario.

### Blind auction M&A, Trust Registry institutional
**Why they were discarded**:
- M&A: niche, few judges connect, crypto is complex (commit-reveal, VRF)
- Trust Registry: infra-for-infra, no visible end user

---

## ⚠️ The 5 risks of the v1 plan and how v2 resolves them

| # | Risk in v1 | Resolution in v2 |
|---|---|---|
| 1 | "23% fees" factually misapplied | **Eliminated**. No fee data in the pitch |
| 2 | "Your bank sees your margins" false | Replaced with *"counterparties and third parties see the amount and the parties; CantonVault eliminates the need to expose the deal"* |
| 3 | "Impossible on Ethereum" false in 2026 | Replaced with *"on Ethereum you can build this with ZK — at 10x the engineering cost, with metadata leakage, without native atomic settlement"* |
| 4 | NGO/LATAM doesn't resonate with Canton | **Eliminated**. 100% institutional demo (TradeFi + OTC) |
| 5 | Canton Coin settlement optional (symbolic fallback) | **Non-negotiable**. It's what makes us economically native |

---

## 🧪 The "Ethereum test" — honest and defensible version (v2)

> ⚠️ **IMPORTANT**: the claim *"impossible on Ethereum"* is **false in 2026** and a ZK-literate judge destroys it. This is the correct version.

| Requirement | Canton | Ethereum (with ZK + AA) | Honest verdict |
|---|---|---|---|
| Private conditional commitment | ✅ native (4 Daml templates, ~120 lines) | ✅ possible but requires circuits (Aztec/Noir, ~1000 lines) | Canton 3x easier |
| Term privacy | ✅ protocol-level: the node does NOT receive data | 🟡 data exists but encrypted; ZK proofs | Canton stronger (data non-existence) |
| Arbitrator sees only on dispute | ✅ DisputeCase on-demand | ✅ buildable with ZK note-reveal | Technical tie, Canton simpler |
| Metadata leakage | ✅ zero (no visible TX) | 🟡 timing and TX existence leak | **Canton wins clearly** |
| Native atomic settlement | ✅ Canton Coin (burn-mint equilibrium) | ❌ requires wrap + bridge risk | **Canton wins clearly** |

**Defensive pitch**: *"On Ethereum you can build this with ZK proofs — at 10x the engineering cost, with transaction metadata leakage, and without native atomic settlement. Canton makes privacy the default, not an expensive opt-in."*

---

## 🧪 The "Corda test" — preempt the biggest ghost

> **Critical**: CantonVault is structurally similar to a CorDapp. A judge from the enterprise-BC world notices it in 60 seconds. **Naming the ghost yourself is stronger than hiding it.**

**Dedicated slide**: *"Isn't this Corda? Yes, this pattern was born on Corda. Canton evolves it with two advances Corda didn't have: (a) **global synchronizer** enabling composable private contracts cross-firm, (b) **Canton Coin** with native atomic settlement (burn-mint equilibrium). Corda had neither."*

**The technical detail that gives credibility**: Canton's privacy is **protocol-level data non-existence** (the node does not receive the data), vs ZK chains' privacy is **cryptographic data encryption** (the data exists but encrypted). These are two genuinely different things. CantonVault demonstrated **data non-existence** with the competitor quadrant always empty.

---

## 🧪 The "bank VP test" — v2 version (30 seconds)

*"A financier advances cash to an SME against an invoice, without the financier seeing the rest of the SME's portfolio, and without the buyer knowing the invoice was factored. Privacy is not cosmetic — it's direct compliance with Basel III and MiCA, and prevents double-factoring. Only Canton enables this because the contract literally does not exist for those who are not stakeholders."*

✅ A bank VP understands this in 10 seconds and **connects with real pain** (double-factoring is a documented operational problem).

---

## 💰 The real prize is NOT the $7,000

> **Critical strategic finding** (from Cantonomics for app builders).

- **62% of the rewards pool (~516M CC/month)** goes to **"featured apps" that generate transaction utility**
- Protocol Development Fund grants: paid in CC, **tied to milestones**, criterion *"alignment with protocol needs, impact and value to the network"*
- **If our settlement is symbolic (not real Canton Coin), we lose the only feature that makes us eligible for the featured-app / grant pipeline**

**Implication**: pitch for **Featured App status + Protocol Development Fund**, not just the prize money. That requires real Canton Coin settlement. The "symbolic settlement" fallback from the Week-4 checkpoint **is removed from the plan**.

---

## 🔄 How to know if this decision is still correct (checkpoints)

- [ ] **Week 1**: Does Seaport devnet work and accept our `.dar`? If not, fallback to dockerized LocalNet with clear instructions.
- [ ] **Week 1**: Does the Disclosure interface from Daml.Finance compile on SDK 3.4.11? If not, fallback to the manual DisputeCase pattern.
- [ ] **Week 2**: Does real settlement with Canton Coin (amulet) work end-to-end? **Non-negotiable** — if it doesn't work, absolute priority until it does.
- [ ] **Week 3**: Does the split-screen demo look convincing on video? If not, simplify to 2 quadrants (parties + competitor).

---

## 📚 Sources that validate this v2 decision

- **Official hackathon brief** (tracks and examples): https://www.competehub.dev/en/competitions/encodeclub_canton-hackathon
- **Hackathon announcement** (Jatin Pandya, Canton Forum): https://forum.canton.network/t/build-on-canton-hackathon/8635
- **Canton Foundation mission**: https://canton.foundation/about-the-foundation/
- **Canton Foundation app categories** (no humanitarian, yes payments/stablecoins/trade): https://canton.foundation/canton-apps/
- **Private stablecoin payments** (B2B/cross-border in scope): https://www.canton.network/private-stablecoin-payments-on-public-blockchain
- **USDCx live on Canton** (global B2B payments onchain, Dec 2025): https://www.canton.network/blog/usdcx-now-live-on-canton-unlocking-private-and-composable-usdc-backed-settlement
- **"When Privacy Needs Proof"** (Canton's anti-ZK-generality stance): https://www.canton.network/blog/zero-knowledge-proofs-whe-privacy-needs-more
- **"Full transparency is a bug, not a feature"** (core privacy thesis, Saraniecki): https://www.canton.network/blog/full-transparency-is-a-bug-not-a-feature
- **Cantonomics for app builders** (62% rewards to featured apps): https://www.canton.network/blog/cantonomics-for-app-builders
- **Protocol Development Fund**: https://canton.foundation/canton-foundation-launches-protocol-development-fund/
- **HSBC tokenised deposit pilot** (bank onboarded to Canton): https://www.canton.network/news/hsbc-completes-tokenised-deposit-pilot-on-canton-network
- **Contour shutdown** (Mar 2023, blockchain trade finance failure): Reuters/GTReview coverage
- **we.trade bankruptcy** (Jun 2022): SME blockchain trade finance banking that didn't reach volume
- **WFP Building Blocks** (blockchain in production, 2025): https://innovation.wfp.org/project/building-blocks
- **R3 Corda** (the pattern Canton evolves): https://docs.r3.com/
- **cn-quickstart Licensing App** (verified Propose/Accept pattern): https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/AppInstall.daml
- **Daml.Finance Disclosure interface** (verified disclosure pattern): https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Interface/Util/V3/Disclosure.daml