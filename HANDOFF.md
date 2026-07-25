# HANDOFF — CantonVault (2026-07-25)

> **Estado:** Auditoría Fase 3 + remediación + **verificador de tx on-ledger** todo deployado y verificado en vivo. Demo listo para la finale del hackathon (28 jul).
> **Live demo:** https://canton-vault.pages.dev
> **Repo:** https://github.com/ruwaq/CantonVault (rama `main`, HEAD `c6f0b70`)

## 🆕 Verificador de transacciones on-ledger (añadido tras la auditoría)

El toast de "On-ledger confirmed" ahora tiene un botón **🔍 Verify on-ledger** que abre una página pública (`/tx/{updateId}`) donde el jurado técnico verifica la tx y lee una nota honesta sobre qué es real vs simbólico.

- **Endpoint**: `GET /api/vault/tx/{updateId}` → lee el árbol de la tx del Canton Ledger API (`POST /v2/updates/update-by-id`), cachea en KV 1h, normaliza events a `{kind, templateId, contractId}`.
- **Página**: `src/views/TxVerifyView.tsx` (lazy-loaded, ruta pública sin login). 3 secciones: veredicto, qué pasó on-ledger (events reales), qué es real vs simbólico.
- **Hallazgo clave**: el sandbox DevNet **SÍ** permite `update-by-id` (a diferencia del ACS, que bloquea). Las tx **nuevas** del demo se verifican correctamente (`found:true` con el CreatedEvent). Las tx **viejas** del README (semanas atrás) devuelven `found:false` — el participant las pruned o pertenecen a una party que el operador actual no witnessed. El jurado verá tx nuevas (las que cree en vivo), así que siempre funcionará.
- **Bug encontrado y fixeado**: Canton rechaza `eventFormat` vacío con `INVALID_ARGUMENT: filtersByParty and filtersForAnyParty cannot be empty`. Fix: `filtersByParty: { [PARTY.value]: {} }` (el operador es signatario de todos los contratos CantonVault).
- **Verificación en vivo**: `curl https://canton-vault.pages.dev/api/vault/tx/<updateId-recién-creado>` devuelve `found:true` con el event tree.

> **Rama de trabajo:** `fix/audit-remediation` (mergeada en main — ya no se necesita, se puede borrar).

---

## ⚡ Cómo retomar en la próxima sesión

```bash
cd "/Users/munay/dev/Build on Canton Hackathon"
git checkout main && git pull
git log --oneline -3          # debe mostrar 53b06d2 revert(auth)... en HEAD

# Verificar que el deploy sigue sano:
curl -s https://canton-vault.pages.dev/api/health
# → {"status":"ok","cantonVersion":"3.5.9",...}

# Tests Daml (deben pasar 27/27):
export PATH="$HOME/.daml/bin:$PATH"
cd cn-quickstart/quickstart && daml test --package-root daml/licensing-tests
```

---

## 🎯 Qué se hizo en esta sesión

Auditoría integral de las 6 capas del stack + remediación completa. **10 commits** en `main`:

| Commit | Qué |
|---|---|
| `391c48a` | Fail-closed secrets en 5 archivos + `crypto.randomUUID()` + seed-demo fail-closed |
| `d0d7a22` | Middleware (CORS + rate-limit) — la auth se revirtió después, ver abajo |
| `23e83c6` | Frontend auth — **revertido** en `53b06d2` |
| `4db04aa` | Daml: bug del Refund que drenaba al proposer + race del deadline + rejectImpl + observer dual |
| `ab63ab8` | Settlement simbólico honesto + validación de inputs + safeErrorResponse en todos los handlers |
| `ba94019` | Borrados `backend-ts/` y `backend-worker/` (stub engañosos) |
| `f9f41e8` | Frontend robustez: modales honestos, `useId`, deps del `useMemo`, optimistic updates |
| `a8ca493` | CI: dependabot cubre `cli/`, daml installer endurecido |
| `cc26406` | Docs: SECURITY.md Fase 3 + README honesto sobre settlement |
| `53b06d2` | **Revert auth** — el demo queda abierto para que los jueces entren sin fricción |

### Decisión clave (reversión de auth)
Armé un middleware con cookie HMAC + login + rate-limit. El equipo decidió **quitar la auth** porque para un demo de hackathon (audiencia: jueces en un solo URL) la fricción del login no se justifica. Se revirtió en `53b06d2` pero **se conservó todo lo demás** (rate-limit, CORS, validación, safeError, fixes Daml, secrets fail-closed).

El middleware actual (`functions/api/_middleware.js`) solo hace **CORS allowlist + rate-limit 60/min por IP**.

### Verificación en vivo (post-deploy, 2026-07-25)
- 🟢 `/api/health` → Canton 3.5.9, offset 4,556,023
- 🟢 `/api/vault/balance` → **32,297,905 CC** reales
- 🟢 `/api/vault/proposals` → 2 propuestas pending
- 🟢 `/api/authenticated-user` → operador demo
- 🛡️ seed-demo sin Bearer → 401 (fail-closed)
- 🛡️ amount=0/negativo → 400
- 🛡️ deadline pasado → 400
- 🛡️ CORS evil.com → sin header
- 🛡️ Mensajes de error genéricos (sin leak de internals)
- ✅ 27/27 tests Daml

---

## 🔴 Lo que QUEDA PENDIENTE (priorizado)

### P0 — Rotar el CLIENT_SECRET (acción del equipo)
El `CLIENT_SECRET` configurado en Cloudflare es **el mismo que está filtrado en el historial git** (decisión del equipo: no rotar ahora). El demo funciona perfecto, pero el secreto es público en el historial del repo.

**Para cerrarlo definitivamente:**
1. En `auth.sandbox.fivenorth.io` → regenerar el secret del client `validator-devnet-m2m`.
2. Actualizar en Cloudflare:
   ```bash
   cd cn-quickstart/quickstart/frontend
   echo "<NUEVO_SECRETO>" | npx wrangler pages secret put CLIENT_SECRET --project-name canton-vault
   ```
3. Smoke test: `curl -s https://canton-vault.pages.dev/api/health` debe seguir 200.
4. (Opcional, después de la finale) `git filter-repo` para purgar el viejo del historial.

### P1 — Auth real para producción (post-hackathon)
El demo está abierto por decisión. Si CantonVault sale a producción, hace falta auth real. El diseño original (que revertí) está documentado en el commit `d0d7a22` + `_auth.js` (borrado pero recuperable del historial): cookie HMAC firmada con `SESSION_SECRET`, login via `DEMO_TOKEN` o OAuth2 con IdP externo. Ver SECURITY.md Fase 3 → "Auth model".

### P2 — DvP real (bloqueado por gobernanza del sandbox)
El settlement real en Canton Coin **no es ejecutable** contra el DevNet sandbox: el m2m operator no es el DSO, y `AllocationFactory_Allocate` rechaza settlements con `instrumentAdmin != DSO`. El test `test_real_settlement_dvp` lo demuestra en un participant local.

**Para desbloquear:** pedir al operador del sandbox (Fivenorth) que divulgue `AmuletRules`/`ExternalPartyAmuletRules` al m2m, o levantar un Canton+Splice propio (que no calificaría como "live on Canton Devnet"). Mientras tanto, el demo es honesto: settlement simbólico documentado.

### P3 — Limpieza menor
- `src/api.ts` y `src/stores/vaultApi.ts` son clientes axios que apuntan a un backend Spring legacy que ya no existe. El flujo vault real usa `fetcher.ts`. Se dejaron para no romper imports; se pueden borrar cuando se limpie `useVaultMutations.ts` para que use solo `fetcher`.
- `src/openapi.d.ts` es generado de ese backend legacy; se puede regenerar o borrar.

---

## 🔧 Secrets configurados en Cloudflare (canton-vault, production)

| Secret | Valor / cómo obtenerlo | Status |
|---|---|---|
| `CLIENT_SECRET` | El filtrado en git (no rotado) | ⚠️ Rotar |
| `PARTY` | `cancore::1220a14ca...5acf8` | ✓ |
| `MEDIATOR_PARTY` | `Observer::1220a14ca...5acf8` | ✓ |
| `SEED_SECRET` | Generado aleatorio (en Cloudflare, no en repo) | ✓ |

**Comandos útiles:**
```bash
cd cn-quickstart/quickstart/frontend
npx wrangler pages secret list --project-name canton-vault
npx wrangler pages secret put <NAME> --project-name canton-vault   # lee stdin
```

> **No hay** `SESSION_SECRET` ni `DEMO_TOKEN` (se removieron al revertir la auth).

---

## 🗺️ Mapa rápido del código

```
cn-quickstart/quickstart/
├── daml/licensing/daml/Vault/              # Contratos Daml (lo que corre on-ledger)
│   ├── CommitmentContract.daml             # Fulfill / Refund / RaiseDispute / DisputeCase
│   ├── CommitmentProposal.daml             # AcceptProposal
│   ├── Disclosable.daml                    # DisclosedRecord (prueba de disclosure)
│   └── SettlementReceipt.daml              # evidencia inmutable
├── daml/licensing-tests/                   # 27 tests Daml (test_real_settlement_dvp = DvP real local)
└── frontend/
    ├── functions/api/                      # ⭐ EL BACKEND (Cloudflare Pages Functions)
    │   ├── _ledger.js                      # cliente Canton + validadores + safeErrorResponse
    │   ├── _middleware.js                  # CORS + rate-limit (sin auth)
    │   ├── authenticated-user.js, health.js, login-links.js, logout.js
    │   └── vault/                          # /api/vault/* (proposals, commitments, fulfill, etc.)
    └── src/                                # frontend React + TS
        ├── lib/fetcher.ts                  # SWR fetcher
        ├── hooks/useVaultMutations.ts      # mutaciones (create/accept/fulfill/...)
        ├── components/vault/               # UI (modales, wizard, privacy lab)
        └── views/                          # LandingView, LoginView, VaultView

cli/                                        # CLI TypeScript para DevNet (status, propose, ...)
scripts/                                    # shell scripts para deploy/crear contratos en DevNet
```

**Ya NO existen** `backend-ts/` ni `backend-worker/` (borrados — eran stubs engañosos).

---

## 📚 Docs importantes

- **`SECURITY.md`** — auditoría Fase 3 completa (las Fase 1 y 2 también están ahí, histórico).
- **`README.md`** — pitch + arquitectura + sección "Settlement model — read me" (honesto).
- **`DEMO.md`** — guía de 90s para jueces (actualizada a settlement simbólico).
- **`SUBMISSION_CHECKLIST.md`** — checklist de submission.

---

## 🧠 Decisiones de diseño para tener presentes

1. **Settlement simbólico documentado**: no DvP real en DevNet. El pitch del protocolo (capacidades del contrato) sigue siendo válido; el demo no miente sobre qué hace.
2. **Demo abierto (sin auth)**: por fricción cero para jueces. El rate-limit + simbólico limitan el daño. Para producción, auth real (ver P1).
3. **`realSettlementRequired: false`** en todos los proposals del demo: el sandbox m2m no es DSO, así que cualquier intento de settlement real fallaría. Es honesto, no un bug.
4. **El `CLIENT_SECRET` no se rotó** por decisión del equipo. Rotar (P0) lo neutraliza del historial git.
5. **Frontend `useAuth.ts`** todavía tiene el `DEMO_USER` fallback (restaurado de main): ante cualquier fallo de red, el vault renderiza como operador demo. Es teatro de auth del lado cliente — la autorización real sería server-side (que quitamos).
