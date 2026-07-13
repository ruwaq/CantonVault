# CantonVault Frontend

Privacy-first conditional commitments on Canton Network.

## Live demo

**https://canton-vault.pages.dev** — deployed on Cloudflare Pages (Canton DevNet).

## Architecture

- **Frontend:** React 18 + Vite + TypeScript + SWR (data fetching)
- **Backend:** Cloudflare Pages Functions (`functions/api/`) bridging the Canton DevNet ledger API
- **No polling:** SWR revalidates on focus only. Zero background traffic. This is
  load-bearing — an earlier version polled every 5s and exhausted the Cloudflare
  Free plan daily quota (100k requests) within hours.

## Local development

```bash
cd cn-quickstart/quickstart/frontend
npm install
npm run dev          # Vite dev server on :5173 (proxies /api to backend)
```

For the full-stack local experience against the Canton DevNet (not LocalNet):

```bash
npm run preview      # builds + serves via wrangler pages dev on :8788
```

## Deployment

**Via Git integration (recommended):**
1. Connect this repo to the `canton-vault` Pages project in the Cloudflare dashboard.
2. Set build configuration (see below).
3. Every push to `main` auto-deploys.

**Via CLI:**
```bash
npm run deploy       # = npm run build && wrangler pages deploy dist
```

### Cloudflare Pages build settings

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `cd cn-quickstart/quickstart/frontend && npm install && npm run build` |
| Build output directory | `cn-quickstart/quickstart/frontend/dist` |
| Root directory | `/` (repo root) |

### Why `wrangler pages deploy` (not `wrangler deploy`)

The `@cloudflare/vite-plugin` deploys as a Workers asset-only project, which
**does not** serve the `functions/` directory — it falls back to the SPA for
every `/api/*` route. `wrangler pages deploy` correctly serves Pages Functions.
The plugin was removed from `vite.config.ts` for this reason.

## Canton Coin (CC) faucet

The DevNet demo party may run low on Canton Coin. Refill at:
**https://stakely.io/faucet/canton-devnet** (no registration required).

## Project structure

```
frontend/
├── functions/api/        # Cloudflare Pages Functions (serverless backend)
│   ├── _ledger.js        # Shared DevNet ledger client (OAuth2 + caching)
│   ├── health.js         # GET /api/health
│   ├── authenticated-user.js
│   ├── vault/            # /api/vault/* endpoints
│   └── ...
├── src/
│   ├── hooks/            # SWR data hooks (useVaultData, useVaultMutations, useAuth)
│   ├── lib/              # fetcher, vaultNormalizers
│   ├── stores/           # Thin facades over SWR (userStore, vaultStore)
│   ├── views/            # VaultView, LoginView, LandingView
│   └── components/       # Header, RequireAuth, ToastNotification
└── wrangler.jsonc        # Cloudflare config (project: canton-vault)
```
