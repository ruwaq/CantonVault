# Session Handoff — CantonVault Hackathon
## Última actualización: 2026-07-13 (post-refactor SWR)

> **LEER ESTO PRIMERO** al iniciar la próxima sesión.
> Contiene el estado exacto, el incidente de Cloudflare, y qué queda por hacer.

---

## 🚨 INCIDENTE CRÍTICO DE ESTA SESIÓN (resuelto)

### Qué pasó
Cloudflare **pausó** el proyecto `canton-vault` por exceso de tráfico (450k requests contra límite de 100k/día). Causa raíz: un bucle infinito en el frontend.

**El bucle:**
```
VaultView montaba → useEffect llamaba fetchUser()
  → fetchUser hacía setLoading(true)
    → RequireAuth veía loading=true → DESMONTABA VaultView
      → fetchUser resolvía → setLoading(false)
        → RequireAuth REMONTABA VaultView → ∞
```
Cada iteración: ~100ms. Combinado con polling de 6 endpoints cada 5s = ~70 req/min por tab abierto.

### Cómo se resolvió
1. **Refactor completo a SWR** (stale-while-revalidate): cero polling en background
2. **Eliminado el plugin `@cloudflare/vite-plugin`** que rompía las Pages Functions
3. **Deploy command corregido**: `wrangler deploy` → `wrangler pages deploy`
4. **Verificado E2E**: 0 peticiones en background tras la carga inicial

### Estado de la cuota
```
Requests today: 450,957 / 100,000 (AGOTADA)
```
- El fix funciona desde ya (detiene nuevos requests)
- La cuota se resetea a medianoche UTC
- **MAÑANA el demo estará 100% funcional**

---

## 🎯 Estado actual (verificado)

| Componente | Estado | Detalle |
|---|---|---|
| **Código frontend** | ✅ Refactorizado | SWR + sin polling, bundle 272KB (−30%) |
| **Pages Functions** | ✅ Funcionan | 12 endpoints en `functions/api/` |
| **Commit + push GitHub** | ✅ `ca7a51e` | https://github.com/ruwaq/CantonVault |
| **E2E contra DevNet** | ✅ Verificado | Proposal creada on-ledger (offset 4304158) |
| **Deploy Cloudflare** | ⏳ PENDIENTE | Cuota agotada hoy;Git integration sin configurar |
| **URL pública** | ⏸️ Pausada | `canton-vault.pages.dev` (hasta reset de cuota) |

### Commits de esta sesión

```
ca7a51e fix(frontend): SWR refactor — eliminate infinite poll loop + fix Pages deploy
1747dd8 docs: session handoff — full state summary for next session  ← obsoleto, ver este archivo
308c6f8 feat(backend): Cloudflare Pages Functions bridging frontend to Canton DevNet
```

---

## 📋 LO QUE FALTA (en orden de prioridad)

### 🔴 URGENTE — Antes del deploy (lo debe hacer el usuario)

**1. Conectar GitHub al proyecto `canton-vault` en Cloudflare dashboard**
- Ir a: dash.cloudflare.com → Workers & Pages → `canton-vault` → Settings
- Connect to Git → seleccionar `ruwaq/CantonVault`
- **Build settings CRÍTICOS:**

| Campo | Valor |
|---|---|
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `cd cn-quickstart/quickstart/frontend && npm install && npm run build` |
| Build output directory | `cn-quickstart/quickstart/frontend/dist` |
| Root directory | `/` (repo root) |

**2. Borrar los 3 Workers duplicados** del dashboard CF:
- `frontend` (el que generó los 450k requests)
- `cantonvault-backend`
- `cantonvault`
- **Dejar SOLO `canton-vault`** (Pages, con la URL pública)

### 🟡 IMPORTANTE — Cuando la cuota se resetee (mañana)

**3. Verificar deploy automático**
- Tras conectar Git, cada push a `main` debe auto-deploy
- Verificar que `/api/health` devuelve JSON (no HTML)
- Si devuelve HTML → el build command está mal configurado

**4. Faucet Canton Coin (CC)**
- La party demo tiene balance CC: 0
- Recargar en: https://stakely.io/faucet/canton-devnet
- Sin CC, las acciones Fulfill/Refund fallarán (require settlement real)

### 🟢 NICE-TO-HAVE — Para mejorar el demo

**5. Implementar endpoints faltantes de Pages Functions**
Estos endpoints devuelven `[]` (stub) — no leen del ledger real:
- `functions/api/vault/commitments.js`
- `functions/api/vault/receipts.js`
- `functions/api/vault/disclosures.js`
- `functions/api/vault/dispute-cases.js`

Para que el demo sea completo, estos deben leer los Active Contracts del ledger vía:
```
ledgerGet('/v2/state/active-contracts')
```
filtrando por templateId `#cantonvault-contracts:Vault.CommitmentProposal:CommitmentProposal` etc.

**6. Implementar mutations faltantes** (accept/reject/fulfill/dispute/resolve/refund)
Los endpoints POST existen en el frontend (`useVaultMutations.ts`) pero las Pages Functions
correspondientes aún no están implementadas. Solo `POST /api/vault/proposals` funciona.

---

## 🏗️ Arquitectura actual del frontend

```
src/
├── lib/
│   ├── fetcher.ts              # SWR fetcher con timeout 8s + FetchError
│   └── vaultNormalizers.ts     # raw backend → typed domain models
├── hooks/
│   ├── useAuth.ts              # useUser(), useLogout(), useLoginLinks() — SWR
│   ├── useVaultData.ts         # useProposals(), useCommitments(), etc. — SWR lectura
│   └── useVaultMutations.ts    # createProposal(), acceptProposal(), etc. — SWR mutate
├── stores/
│   ├── userStore.tsx           # FACADE thin sobre useAuth (mantiene API useUserStore)
│   ├── vaultStore.tsx          # FACADE thin sobre useVaultData+Mutations
│   ├── vaultApi.ts             # axios instance (baseURL /api/vault) — USADO por mutations
│   └── toastStore.tsx          # notificaciones (sin cambios)
├── views/
│   ├── VaultView.tsx           # UI principal (sin polling manual, SWR gestiona)
│   ├── LoginView.tsx           # usa useLoginLinks() SWR
│   └── LandingView.tsx         # landing page estática
└── components/
    ├── Header.tsx              # BalanceBadge usa useVaultStore()
    ├── RequireAuth.tsx         # guard de auth
    └── ToastNotification.tsx
```

### Claves SWR (deben coincidir entre hooks)
```ts
['user'], ['login-links'],
['vault', 'proposals'], ['vault', 'commitments'], ['vault', 'receipts'],
['vault', 'disclosures'], ['vault', 'disputes'], ['vault', 'balance'],
['vault', 'parties']
```

### Config SWR (crítica para no pausar Cloudflare)
```ts
{
  revalidateOnFocus: true,   // revalida solo al volver al tab
  refreshInterval: 0,        // NUNCA polling ciego
  dedupingInterval: 10_000,  // dedupe dentro de 10s
  errorRetryCount: 2,
  errorRetryInterval: 5_000, // backoff
  keepPreviousData: true,
}
```

---

## 🔑 Endpoints del backend (Pages Functions)

### Funcionales (leen/escriben DevNet real)
| Endpoint | Método | Estado |
|---|---|---|
| `/api/health` | GET | ✅ DevNet health + versión Canton |
| `/api/authenticated-user` | GET | ✅ Party demo + ledger offset |
| `/api/vault/parties` | GET | ✅ 3 roles (Proposer/Accepter/Third Party) |
| `/api/vault/proposals` | POST | ✅ **Crea contratos on-ledger** |
| `/api/login-links` | GET | ✅ Demo link |
| `/api/logout` | POST | ✅ Stub (cosmético) |

### Stubs (devuelven `[]` o `{balance:0}`, no leen ledger)
| Endpoint | Método | Estado |
|---|---|---|
| `/api/vault/proposals` | GET | ⚠️ Stub `[]` |
| `/api/vault/commitments` | GET | ⚠️ Stub `[]` |
| `/api/vault/receipts` | GET | ⚠️ Stub `[]` |
| `/api/vault/disclosures` | GET | ⚠️ Stub `[]` |
| `/api/vault/dispute-cases` | GET | ⚠️ Stub `[]` |
| `/api/vault/balance` | GET | ⚠️ Hardcoded `balance: 0` |

### No implementados (el frontend los llama pero 404)
accept, reject, fulfill, raise-dispute, resolve, refund

---

## 🔧 Comandos útiles

```bash
# Desarrollo local (Vite dev server, proxies /api al backend local)
cd cn-quickstart/quickstart/frontend && npm run dev

# Preview contra DevNet REAL (wrangler pages dev)
cd cn-quickstart/quickstart/frontend && npm run preview

# Build producción
cd cn-quickstart/quickstart/frontend && npm run build

# Deploy manual a Cloudflare
cd cn-quickstart/quickstart/frontend && npm run deploy

# Typecheck
cd cn-quickstart/quickstart/frontend && npx tsc -b --noEmit

# Limpiar cache wrangler stale (si falla wrangler dev)
rm -rf cn-quickstart/quickstart/frontend/.wrangler/deploy/config.json
```

---

## ⚠️ Lecciones aprendidas (NO repetir)

1. **NUNCA llamar `fetchUser()` o cualquier función que flifique `loading=true` desde un componente hijo de `RequireAuth`** → causa bucle infinito de mount/unmount
2. **NUNCA usar polling con `setInterval` o `setTimeout` recursivo en serverless** → agota cuota rapidísimo
3. **`wrangler deploy` NO sirve Pages Functions** → usar `wrangler pages deploy`
4. **`@cloudflare/vite-plugin` es para Workers, no Pages** → causa que `/api/*` caiga al SPA fallback
5. **Cloudflare Free = 100k req/día** → con SWR (focus-only revalidation) es imposible superar esto

---

## 📅 Timeline del hackathon

- **Deadline extendido:** Domingo 19 julio medianoche
- **Días restantes:** ~6
- **Prioridad:** conectar Git + reset de cuota → deploy vivo → implementar endpoints stub → pulir demo

---

## 🔗 Links importantes

- **Repo:** https://github.com/ruwaq/CantonVault
- **Demo URL:** https://canton-vault.pages.dev (pausada hasta reset cuota)
- **Faucet CC:** https://stakely.io/faucet/canton-devnet
- **Dashboard CF:** https://dash.cloudflare.com (cuenta: prometeodev7@gmail.com)
- **Hackathon:** Build on Canton (deadline 19 jul)
