# Competitive Intelligence — Discord Encode Club (Build on Canton Hackathon)

> Snapshot of the Discord state as of 2026-06-20.
> Append-only. Update when there is new signal.

**Capture date**: 2026-06-20 (week 1, days 5-6 of the hackathon)

---

## 🚨 CRITICAL CORRECTION: Seaport, not CPort

The product Jatin called "CPort" in the workshop is actually **Seaport**.
- Real URL: **https://devnet.seaport.to** (NOT devnet.c4.io as we assumed)
- Jatin's official guide: https://github.com/Jatinp26/Seaport-Guide
- Official video guide: https://youtu.be/uFi9meqpr3c (Canton Foundation — "Get Started with Seaport: Canton Builders Guide")
- Tech Deep Dive: https://youtu.be/1B_ybMiDcKY

**Action**: read Jatin's guide BEFORE starting Task 0.1. It answers the 3 questions we were going to DM him on Discord.

## ✅ What we already know (no need to ask)

| Question | Answer | Source |
|---|---|---|
| How do I upload the `.dar`? | Seaport UI (see Jatin's guide) | Jatin on Discord |
| Do I need an invite code? | **NO** | Jatin: "No and No" |
| Do I need a whitelist? | **NO** | Jatin |
| How do I get added to the Encode org? | DM Jatin with your Party ID | Discord |
| Party ID format? | `<32-hex>::1220<64-hex>` (e.g.: `653ace5802e3c1046cb82c778ed6f82f::12203ca890ecf72ff041a4da4450c613ef0e19603cce34a85896df48be85785a2ef9`) | Discord (actual IDs shared) |
| Auth? | Log in with Loop wallet on Seaport | Jatin |
| Submissions for the June 21 checkpoint? | **NO** — Giles: "just slightly confusing vibe coded wording" | Discord |

## ⚠️ Pending confirmation (questions IoMarkets asked that Jatin did NOT answer)

These are the deep technical questions IoMarkets raised that **Jatin did NOT answer** publicly (he deferred them to the video guide, which likely does not cover them):

1. **JSON Ledger API base URL of the validator** — is it reachable from outside Seaport? (IoMarkets uses Cloudflare Workers)
2. **How to mint a bearer JWT for the Ledger API** (OIDC endpoint, static dev token, exported from the Loop wallet?)
3. **Package ID after uploading the DAR** — where is it read from?
4. **Does one Loop wallet = one party, or can multiple parties be allocated?** (IoMarkets needs 6 parties: operator, custodian, investor A/B, treasury, kyc-provider; we need ~4: SME, financier, buyer, competitor)

**If Jatin's guide does not resolve these 4, then YES send a DM with the specific question** (referencing that we watched the video but still have doubts).

---

## 🥊 DETECTED COMPETITORS

### 🔴 IoMarkets [AIND] — DIRECT THREAT, HIGH PROGRESS

**What they are building** (verbatim from Discord):
> *"private institutional capital markets: tokenized deposits, private deals, OTC, and an agentic treasury, with privacy enforced by the ledger"*

**Status**:
- App live: https://iomarkets-io-canton.pages.dev
- Daml model running end-to-end on local Canton via JSON Ledger API
- KYC/KYB attestations + tokenized-deposit DvP escrow already built
- Seeking access to testnet/devnet (which suggests it is "ready to deploy")
- **Solo** (same as us)
- **Same track as CantonVault** (Private DeFi / Capital Markets)

**Overlap with CantonVault**:
- ✅ Private OTC — both
- ✅ Privacy enforced by ledger — both
- ✅ Escrow — both (tokenized-deposit DvP vs conditional commitment)
- ❌ KYC/KYB — only IoMarkets (we do NOT)
- ❌ Tokenized deposits — only IoMarkets (we do NOT)
- ❌ Agentic treasury — only IoMarkets (our roadmap phase 3)

**Our differentiation** (the wedge):
1. **IoMarkets treats "privacy as a property"** (incidental, implicit). **We treat "privacy as the product"** (visually demonstrated in split-screen).
2. **IoMarkets has a broad scope** (more risk of being half-baked). **We are focused** (4 contracts, flawless).
3. **IoMarkets focuses on RWA settlement** (tokenized deposits). **We focus on the conditional commitment primitive** (on-demand selective disclosure as the core feature).
4. **The killer split-screen demo is a DIFFERENTIATOR**. IoMarkets has a functional app but less visually memorable. We have a visual proof of privacy in 30 seconds.

**Strategy vs IoMarkets**: Do NOT compete on breadth. Win on (a) focus, (b) clarity of the privacy thesis, (c) memorable visual demo.

### 🟡 Prince Yarjack + Rohith — NHS Ledger (healthcare)

- **NHS Ledger**: Canton-backed budget transparency for NHS (UK healthcare)
- Deployed via **Lovable** (vibe coding)
- URL: https://nhscanton.lovable.app/how-it-works
- Different angle (public sector / healthcare), not direct competition
- Prince Yarjack is an NHS pharmacist + Lovable ambassador (not deeply technical)

### 🟢 Others (no clear project yet)

- **Aareonakakanfo [PAY]** — payments (PAY tag). Setting up on Seaport.
- **w3_coder [SUI]** — looking for team / hire. SUI ecosystem.
- **Alive24** — fullstack blockchain dev 4 YOE, open to teams. Strong technical resource.
- **Oxklint [Arc]** — Arc ecosystem. Requested access to Encode org.
- **Godwin [GRIT]** — exploring what to build.
- **MrLooPer** — first hackathon, Spain.
- **Slyrack** — replied that Daml is the language (signal that it is a common question).
- **Big Dexter** — asked about prize breakdown (no answer yet).

---

## 🎯 Implications for CantonVault

### 1. Slightly reposition vs IoMarkets

Our pitch should NOT be "private capital markets" (that is IoMarkets). Our pitch should be **"the selective disclosure primitive that proves privacy in 30 seconds"**. The difference:

| Weak pitch (competes with IoMarkets) | Strong pitch (differentiates us) |
|---|---|
| "Private institutional capital markets" | "The privacy primitive — invoice financing and OTC are the 2 use cases from the official brief where privacy IS the product" |
| "Privacy enforced by ledger" | "Privacy DEMONSTRATED by the ledger — split-screen proves in 30s what IoMarkets assumes" |
| "Tokenized deposits + DvP + KYC" (broad scope) | "4 Daml contracts, 1 primitive, 2 use cases — flawless execution" |

### 2. Do NOT add features to compete with IoMarkets

**Temptation to avoid**: seeing that IoMarkets has KYC and wanting to add it. **NO**. That pulls us away from our focus and puts us competing on scope (where they win).

**What to do instead**: mention KYC as "phase 2 / integration with attestation providers" on the roadmap slide. Show that we have thought about it without building it.

### 3. Preempt the question "how is this different from an RWA settlement app?"

In the deck, the "why Canton" slide must include: *"We are not another RWA settlement app. We are the selective disclosure primitive that those apps NEED underneath."* Positionally, this places us as a layer, not a competitor.

### 4. Capitalize on IoMarkets requesting devnet access

IoMarkets is requesting testnet/devnet access. If Jatin gives them direct JSON Ledger API access (not just Seaport UI), that means the **"frontend-direct-to-validator" path IS possible** for serious apps. We can consider that path if Seaport UI limits us.

---

## 📊 Honest competition re-estimate

| Team | Track | Progress | Threat |
|---|---|---|---|
| **IoMarkets** | Private DeFi | 🔴 High (live) | 🔴 **High** — same track, more scope built |
| **CantonVault (us)** | Private DeFi | 🟢 Plan ready | — |
| NHS Ledger (Yarjack) | Public sector | 🟡 Live via Lovable | 🟢 Low (different angle) |
| Aareonakakanfo [PAY] | Payments | 🟢 Setup | 🟡 Medium (payments) |
| ~50+ teams (estimate) | varied | unknown | 🟡 Long tail |

**Conclusion**: IoMarkets is the rival to beat in our track. Re-estimated top-3 probability: **~60%** (down from 70% due to IoMarkets). The killer split-screen demo is now MORE critical than before — it is the only thing that differentiates us from a competitor that is already live.

---

## 🚀 Updated actions for the next session

### Before coding (5 min)
1. **Read Jatin's guide**: https://github.com/Jatinp26/Seaport-Guide
2. **Watch the video**: https://youtu.be/uFi9meqpr3c (~10 min)
3. **Create the project on Encode** (before June 21, even if there is no formal submission): Name `CantonVault`, Updated description (see below)
4. **Get a Party ID** on devnet.seaport.to and DM Jatin to get added to the Encode org

### Updated description for Encode (differentiated from IoMarkets)
```
CantonVault — the selective disclosure primitive for institutional trade finance.
Not another RWA settlement app: the privacy layer underneath. 4 Daml contracts
prove selective disclosure in 30 seconds via a split-screen demo where the
competitor's quadrant is always empty. Invoice financing and OTC block trade
workflows (both literal brief examples), with real Canton Coin settlement.
```

### During implementation
- **MAXIMUM priority on the split-screen demo** (Task 3.6) — it is our differentiator vs IoMarkets
- **Do NOT add KYC or tokenized deposits** (even though IoMarkets has them) — stay focused
- **Implicit anti-IoMarkets slide**: in "why Canton", position as a "layer" not as a "competitor to RWA apps"

### Competitive monitoring
- Check Discord every 2-3 days to detect new competitors
- If anyone announces a split-screen demo or privacy primitive, react
- Note any new signals here

---

## 📚 Sources

- Discord `#general` and `#introductions` (captured 2026-06-20)
- Jatin's Seaport guide: https://github.com/Jatinp26/Seaport-Guide
- Seaport devnet: https://devnet.seaport.to
- Official video: https://youtu.be/uFi9meqpr3c
- IoMarkets live app: https://iomarkets-io-canton.pages.dev
- NHS Ledger: https://nhscanton.lovely.app/how-it-works