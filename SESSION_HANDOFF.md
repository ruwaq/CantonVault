# Session Handoff — CantonVault Hackathon
## Última actualización: 2026-07-13

---

## 🎯 Dónde estamos (verificado)

### Sistema desplegado y funcionando 24/7

| Componente | Estado | URL |
|---|---|---|
| **Frontend + Backend** | ✅ LIVE | https://canton-vault.pages.dev |
| **Contratos en DevNet** | ✅ On-ledger | Canton 3.5.7, 7+ contracts creados |
| **CLI TypeScript** | ✅ Funcional | `cli/` (cantonvault status/propose/deploy) |
| **GitHub repo** | ✅ Sincronizado | https://github.com/ruwaq/CantonVault |
| **GitLab repo** | ✅ Sincronizado | https://gitlab.com/PrometeoDev/cantonvault |

### Arquitectura actual (todas las piezas LIVE)

```
canton-vault.pages.dev (Cloudflare Pages, 24/7, gratis)
├── React SPA (landing + vault wizard)
├── Pages Functions (/api/*) → backend serverless
│   ├── GET  /api/health → Canton 3.5.7
│   ├── GET  /api/authenticated-user → party info
│   ├── GET  /api/vault/parties → 3 demo parties
│   ├── GET  /api/vault/proposals → []
│   └── POST /api/vault/proposals → CREA contratos on-ledger en DevNet
│
└── → JSON Ledger API v2 (Canton Network DevNet)
     https://ledger-api.validator.devnet.sandbox.fivenorth.io
     Package: cantonvault-contracts v0.1.0
```

### Commits de esta sesión (8 commits, todos pusheados)

```
308c6f8 feat(backend): Cloudflare Pages Functions bridging frontend to Canton DevNet
7a02fc3 docs: upgrade README.md for hackathon and sync presentation and frontend fixes
8201f78 docs: update README + checklist with complete DevNet evidence
7a1590c feat(cli): typed TypeScript CLI for CantonVault DevNet interaction
3672fde feat(devnet): deploy CantonVault contracts on Canton Network DevNet
9441a30 fix(gitignore): track new backend auth files for shared-secret mode
d3c560e fix(backend): make shared-secret mode functional for demo + DAR bump 0.0.5
a903bde refactor(frontend): fix build-breaking TS errors + premium UI overhaul
```

---

## ⚠️ Qué falta para la submission (priorizado)

### P0 — Crítico (lo pides tú en la próxima sesión)

1. **Rediseñar la landing minimalista** — eliminar secciones de marketing largas
   (problem, solution, architecture). Reemplazar con una pantalla limpia:
   título + botón "Launch Demo" + link al repo. Enfoque: que los judges prueben
   el sistema, no que lean.

2. **Verificar que el flujo interactivo funciona en el navegador** —
   ir a canton-vault.pages.dev, navegar a /vault, crear una propuesta,
   confirmar que el updateId aparece en pantalla.

### P1 — Requerido por el hackathon (solo tú puedes hacerlo)

3. **Pitch video (3 min)** — yo preparo el guion, tú grabas
4. **Technical demo video (3 min)** — screen recording del flujo
5. **Submission en Encode Club** — pegar URLs en la plataforma

---

## 🔑 Credenciales y configuración clave

### Canton DevNet (shared validator del hackathon)
```
Ledger API:  https://ledger-api.validator.devnet.sandbox.fivenorth.io
Auth:        https://auth.sandbox.fivenorth.io/application/o/token/
Client ID:   validator-devnet-m2m
Client Secret: r69FQmevLRwEgMB8NnKaSDHPewTOSx7Yy5jucsqAlmsAaJc3DlggedCz4tyyonl4W2WoOVzkUIjy8dHTlc16AOJQzx02QzJylAUG56oLTCoVCJUUK40vRv9CqQEY3fjn
Party:       5nsandbox-devnet-2::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8
Package:     cantonvault-contracts v0.1.0
```

### Cloudflare
```
Cuenta:      prometeodev7@gmail.com
Pages project: canton-vault → canton-vault.pages.dev
Wrangler:    autenticado (OAuth token)
```

### Comandos rápidos
```bash
# Deploy frontend + backend (Pages Functions)
cd cn-quickstart/quickstart/frontend
npm run build && cp -r functions dist/functions
npx wrangler pages deploy dist --project-name=canton-vault --branch=main --commit-dirty=true

# CLI contra DevNet
cd cli && npm run build
node dist/index.js status
node dist/index.js propose --amount 5000

# Verificar que el backend responde
curl https://canton-vault.pages.dev/api/health
```

---

## 🚨 Limitaciones técnicas conocidas

1. **Shared validator ACS limit** — el validator m2m del hackathon permite CREAR
   contratos (POST proposals funciona) pero NO leer contractIds para encadenar
   accept → fulfill → dispute. El flujo completo se demuestra en LocalNet.

2. **LocalNet backend** — el backend Spring Boot corre en Docker (LocalNet) con
   los fixes de shared-secret mode (StaticTokenProvider, SharedSecretConfig,
   AdminApiImpl Optional). Si se reinicia Docker, usar `./run-localnet.sh up`.

3. **Source maps CSP** — los `.map` de Bootstrap se bloquean por CSP. Cosmético,
   no afecta funcionamiento.

---

## 📁 Estructura del repo (archivos clave)

```
Build on Canton Hackathon/
├── cli/                          # CLI TypeScript (DevNet interaction)
├── backend-ts/                   # Backend Express standalone (alternativa)
├── backend-worker/               # Cloudflare Worker standalone (alternativa)
├── scripts/                      # Scripts bash deploy DevNet
├── cn-quickstart/quickstart/
│   ├── backend/                  # Backend Spring Boot (LocalNet)
│   ├── daml/licensing/           # Smart contracts (cantonvault-contracts v0.1.0)
│   └── frontend/
│       ├── src/                  # React SPA
│       └── functions/api/        # ← PAGES FUNCTIONS (backend serverless)
├── README.md                     # Documentación principal
├── SUBMISSION_CHECKLIST.md       # Estado de requisitos
└── SESSION_HANDOFF.md            # ← Este archivo
```
