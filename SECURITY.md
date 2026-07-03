# Security Audit — CantonVault (2026-07-03)

## Overview

Full-stack security audit of the CantonVault hackathon project covering:

- **DAML** smart contracts (Vault/CommitmentContract, CommitmentProposal)
- **Java/Spring Boot** backend (auth, endpoints, config)
- **React/TypeScript** frontend (stores, API, error handling)
- **Infrastructure** (Docker, CI/CD, secrets, .gitignore)

**Methodology:** 4 specialized agents auditing independent domains in parallel, followed by consolidation and remediation.

**Results:** 40 findings → 5 CRITICAL, 11 HIGH, 15 MEDIUM, 9 LOW/INFO.

## Status

All CRITICAL and actionable HIGH findings have been remediated. Verification:
- ✅ **DAML tests:** 21/21 passing
- ✅ **Java backend:** compiles + tests passing
- ✅ **TypeScript frontend:** type check clean

## Remediated Findings

### CRITICAL

| ID | Issue | Fix |
|----|-------|-----|
| C1 | `/api/demo-session` permitAll with empty passwords | `DEMO_TOKEN` env var required; endpoint returns 404 if unset |
| C2 | DEBUG logging of HTTP buffers leaks secrets | `Http11InputBuffer: WARN`, `Interceptor: INFO` |
| C3 | GitHub Actions not pinned, no permissions | Actions pinned to SHA, `permissions: contents: read` |
| C4 | DAML `Status` enum dead (never mutated) | Removed; consuming choices = state machine |
| C5 | No `deadline > now` validation | Added `getTime` check in `AcceptProposal` |

### HIGH

| ID | Issue | Fix |
|----|-------|-----|
| H2 | Default DB credentials `postgres/postgres` | `@PostConstruct` warning; env var override docs |
| H5 | `allocationRequest_WithdrawImpl` no actor check | Documented; Splice layer enforces authorization |
| H7 | No global 401 interceptor in frontend | Added to both `api.ts` and `vaultApi.ts` |
| H8 | Backend Docker container runs as root | `compose.yaml` documented with non-root path + `BACKEND_USER` |

### MEDIUM (selected)

| ID | Issue | Fix |
|----|-------|-----|
| F-05 | `walletUrl` rendered in `<a>` without `rel="noopener"` | Added `rel="noopener noreferrer"` |
| F-06 | No client-side validation of license fees | Added `Math.max(0, ...)` guard |
| F-07 | Error handler exposes raw backend messages | Replaced with user-safe mapped messages per HTTP status |
| F-08 | `fetchParties` swallows errors silently | Added `console.warn` with error details |
| S-09 | `sgaunet/jwt-cli:latest` unpinned | Added hardening comments; Dependabot watches Docker |
| S-12 | Prometheus admin API exposed | Documented as dev-only |
| S-04,S-05,S-06 | Hardcoded secrets in docker env tree | Protected by `cn-quickstart/**` blanket ignore + `.gitignore` hardening |

## Known Limitations (by design)

| ID | Issue | Rationale |
|----|-------|-----------|
| H3 | `Refund` is symbolic-only (no reverse CC transfer) | Requires Splice reverse AllocationRequest — planned for post-hackathon |
| H4 | `Fulfill` controller = accepter (receiver confirms) | DvP design: the receiver triggers settlement; Splice allocation flow separately authorized |
| H6 | `RequireAuth` guard is client-side only | Backend is the authoritative auth boundary; frontend guard is UX sugar |

## Disclosure

This audit was performed as part of the Build on Canton Hackathon 2026. For security issues, open a private discussion or email the maintainers.

## Configuration

```bash
# Required for demo mode (shared-secret profile):
export DEMO_TOKEN=<your-token>

# For production, use the OAuth2 profile:
export AUTH_MODE=oauth2
```