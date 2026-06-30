# Submission Checklist — CantonVault

Build on Canton Hackathon 2026 | Deadline: **July 13, 2026, 13:59 CEST**

## Critical (binary — must be YES)

- [x] GitHub/GitLab repo is PUBLIC: https://gitlab.com/PrometeoDev/cantonvault
- [ ] Live demo URL (working on DevNet, tested incognito)
- [ ] Deployed DAR on 5N Sandbox DevNet (DAR v0.0.4)
- [ ] Pitch video (3 min max, viewable without login)
- [ ] Technical demo video (3 min max, screen recording showing working flow)
- [x] `.env` NOT committed, `.env.example` present
- [x] LICENSE file (MIT)

## README

- [x] Problem section (clear pain point)
- [x] Solution section (what the product does)
- [x] How It Works (3-step user journey)
- [x] Architecture diagram
- [x] Tech Stack with Canton-specific integrations called out
- [x] Quick Start (3 copy-paste commands)
- [x] Team section

## Code Quality

- [x] 15 Daml tests passing
- [x] Backend compiles (`./gradlew :backend:compileJava`)
- [x] Frontend compiles (`cd frontend && npx tsc --noEmit`)
- [x] No magic numbers, no hardcoded secrets
- [x] `.gitignore` properly configured
- [ ] Contract keys implemented (uniqueness guarantees)
- [ ] Backend connected to DevNet (not localhost)

## Sponsor Integration

- [x] Canton Network — Daml contracts, gRPC Ledger API, PQS
- [x] Splice Token Standard — Allocation/AllocationRequest interface for Canton Coin
- [x] Splice Registry API — TokenStandardProxy for disclosed contracts
- [x] Seaport IDE — DAR deployment on 5N Sandbox validator
- [x] Loop Wallet (DevNet) — Party allocation

## Demo Polish

- [ ] Frontend shows real data from backend (not mock data)
- [ ] Demo pre-filled with sample data (no stalls, no manual input during video)
- [ ] All 4 quadrants show data: Proposals, Commitments, Privacy Map, Receipts
- [ ] Split-screen showing competitor sees empty ledger
- [ ] Real Canton Coin settlement demonstrated (allocation flow)
- [ ] Selective disclosure flow demonstrated (dispute → third party sees only amount)

## Rehearsal

- [ ] Pitch timed under 3 min (target: 90 sec problem+solution, 90 sec demo)
- [ ] Demo flows tested on DevNet (no local sandbox during video)
- [ ] All external links verified (no 404s, no auth gates)
- [ ] Video uploaded (unlisted OK but accessible without login)

---

**Pre-submission command**:
```bash
# Verify everything before submitting
~/.daml/bin/daml test --package-root daml/licensing-tests   # All green
cd cn-quickstart/quickstart && ./gradlew :backend:compileJava -x :daml:compileDaml  # BUILD SUCCESSFUL
cd frontend && npx tsc --noEmit                              # No errors
curl -s https://gitlab.com/PrometeoDev/cantonvault | grep "README" # Public repo accessible
```