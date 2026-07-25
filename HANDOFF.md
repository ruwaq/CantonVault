# HANDOFF — CantonVault (actualizado 2026-07-26)

> **Estado:** Auditoría Fase 3 + remediación + verificador de tx on-ledger + link persistente en cards — **todo deployado y verificado en vivo**. Demo listo para la finale del hackathon (28 jul).
>
> **Live demo:** https://canton-vault.pages.dev
> **Repo:** https://github.com/ruwaq/CantonVault · rama `main` · HEAD `4500a0f`
> **Ramas locales:** solo `main` (todas las de trabajo ya mergeadas y borradas).

---

## ⚡ Cómo retomar (2 comandos)

```bash
cd "/Users/munay/dev/Build on Canton Hackathon"
git checkout main && git pull

# Smoke test rápido de que el deploy sigue sano:
curl -s https://canton-vault.pages.dev/api/health
# → {"status":"ok","cantonVersion":"3.5.9",...}
```

Si abrís https://canton-vault.pages.dev y creás una propuesta, el toast y la card deben mostrar el botón **🔍 Verify on-ledger** que abre `/tx/{updateId}`.

---

## 🗺️ Qué se hizo en esta sesión (2 fases, 16 commits)

### Fase A — Auditoría + remediación (commits `391c48a` → `53b06d2`)
Auditoría integral de las 6 capas + remediación. Hallazgo principal: la "remediación" de la auditoría Fase 2 previa era cosmética (env override añadido pero el secreto real seguía como default).

- Fail-closed secrets en 5 archivos (CLIENT_SECRET/PARTY/MEDIATOR_PARTY via env bindings).
- Bug crítico del Daml: `Refund` con `allocationCid=Some` **drenaba al proposer** (enviaba CC proposer→accepter cuando no había transfer forward que revertir). Eliminado.
- Race del deadline fixeada (Fulfill `<` / Refund `>`).
- `allocationRequest_RejectImpl` ahora autoriza al accepter (sender del leg), no al proposer.
- `ResolveDispute` crea `DisclosedRecord` para **ambos** (ganador y perdedor).
- Validación de inputs en todos los edge handlers (amount, deadline ISO, contractId).
- `safeErrorResponse` — sin leak de internals del ledger al cliente.
- `crypto.randomUUID()` en todos los commandId.
- Rate limit 60/min por IP + CORS allowlist (en `functions/api/_middleware.js`).
- Borrados `backend-ts/` y `backend-worker/` (stub engañosos, no eran el demo).
- Frontend robustez: `useId()` en Modal, deps del `useMemo` en PrivacyLab, optimistic updates con `revalidate:true`, modales honestos (sin allocationContractId falso).
- CI: dependabot cubre `cli/`, daml installer endurecido, permisos mínimos.

**Decisión clave — auth revertida**: armé middleware con cookie HMAC pero el equipo decidió quitar la auth (audiencia = jueces en un solo URL, la fricción no se justifica). Revertido en `53b06d2`, pero se conservó todo el resto del hardening. El middleware actual solo hace CORS + rate-limit.

### Fase B — Verificador de tx on-ledger (commits `c905301` → `4500a0f`)
El botón **🔍 Verify on-ledger** aparece en **dos lugares**:

1. **Toast efímero** (8s tras cada mutación) — confirmación inmediata.
2. **Persistente en cada card** (Active Proposals, Active Commitments, Settlement Receipts) — para "entrar y volver" sin depender del toast.

Ambos abren `/tx/{updateId}` con 3 secciones para **audiencia técnica**: veredicto, qué pasó on-ledger (events reales Created/Archived), y qué es real vs simbólico (settlement simbólico, DvP real contract-level).

- **Endpoint**: `GET /api/vault/tx/{updateId}` → lee `POST /v2/updates/update-by-id` del Canton Ledger API, cachea en KV 1h.
- **updateId persistido**: cada record KV ahora guarda `updateId` (junto al offset), expuesto como `_updateId` en el envelope, leído por `toContracts` en `vaultNormalizers.ts`, renderizado por el componente reutilizable `VerifyLink.tsx`.
- **Bug encontrado y fixeado**: Canton rechaza `eventFormat` vacío con `INVALID_ARGUMENT: filtersByParty and filtersForAnyParty cannot be empty`. Fix: `filtersByParty: { [PARTY.value]: {} }`.

---

## 🔴 Pendientes (priorizados — NINGUNO bloquea la finale)

### P0 — Rotar el CLIENT_SECRET (acción del equipo, ~5 min)
El `CLIENT_SECRET` configurado en Cloudflare es **el mismo que está filtrado en el historial git** (decisión del equipo: no rotar). El demo funciona perfecto, pero el secreto es público en el historial del repo.
```bash
# 1. En auth.sandbox.fivenorth.io → regenerar el secret de validator-devnet-m2m
# 2. Actualizar en Cloudflare:
cd cn-quickstart/quickstart/frontend
echo "<NUEVO_SECRETO>" | npx wrangler pages secret put CLIENT_SECRET --project-name canton-vault
# 3. Smoke test:
curl -s https://canton-vault.pages.dev/api/health   # debe seguir 200
```

### P1 — Auth real para producción (post-hackathon)
El demo está abierto por decisión. Para producción: cookie HMAC (diseño original revertido, recuperable del commit `d0d7a22`) o OAuth2 con IdP externo. Ver SECURITY.md Fase 3.

### P2 — DvP real (bloqueado por gobernanza del sandbox)
El settlement real en Canton Coin **no es ejecutable** contra el DevNet: el m2m operator no es el DSO, y `AllocationFactory_Allocate` rechaza settlements con `instrumentAdmin != DSO`. `test_real_settlement_dvp` lo demuestra en participant local. Para desbloquear: pedir al operador del sandbox (Fivenorth) que divulgue `AmuletRules` al m2m.

### P3 — Limpieza menor
- `src/api.ts` y `src/stores/vaultApi.ts`: clientes axios que apuntan a un backend Spring legacy que ya no existe. El flujo vault real usa `fetcher.ts`. Se dejaron para no romper imports.
- Commit `f30b550` (wip debug del tx verifier) quedó en el historial público pero ya fue neutralizado por `c6f0b70`. No reescribir historial pre-finale (deploy ya corrió).

---

## 🔧 Secrets en Cloudflare (canton-vault, production)

| Secret | Status |
|---|---|
| `CLIENT_SECRET` | ⚠️ El filtrado en git (no rotado) — ver P0 |
| `PARTY` | ✓ `cancore::1220a14ca...5acf8` |
| `MEDIATOR_PARTY` | ✓ `Observer::1220a14ca...5acf8` |
| `SEED_SECRET` | ✓ generado aleatorio (en Cloudflare, no en repo) |

```bash
cd cn-quickstart/quickstart/frontend
npx wrangler pages secret list --project-name canton-vault
npx wrangler pages secret put <NAME> --project-name canton-vault   # lee stdin
```

---

## 🗺️ Mapa del código

```
cn-quickstart/quickstart/
├── daml/licensing/daml/Vault/              # Contratos Daml (on-ledger)
│   ├── CommitmentContract.daml             # Fulfill / Refund / RaiseDispute / DisputeCase
│   ├── CommitmentProposal.daml             # AcceptProposal
│   ├── Disclosable.daml                    # DisclosedRecord
│   └── SettlementReceipt.daml
├── daml/licensing-tests/                   # 27 tests (test_real_settlement_dvp = DvP real local)
└── frontend/
    ├── functions/api/                      # ⭐ EL BACKEND (Cloudflare Pages Functions)
    │   ├── _ledger.js                      # Canton client + validadores + safeErrorResponse + ledgerGetUpdateById
    │   ├── _middleware.js                  # CORS + rate-limit (sin auth)
    │   ├── vault/tx/[updateId].js          # ⭐ verificador de tx (POST /v2/updates/update-by-id)
    │   └── vault/{proposals,commitments,fulfill,...}.js
    └── src/
        ├── views/TxVerifyView.tsx          # ⭐ página /tx/:updateId (pública, lazy)
        ├── components/vault/VerifyLink.tsx # ⭐ botón 🔍 reutilizable
        ├── hooks/useVaultMutations.ts      # mutaciones (propagate updateId al toast)
        └── lib/vaultNormalizers.ts         # toContracts lee _updateId/_offset

cli/                                        # CLI TypeScript para DevNet
scripts/                                    # shell scripts (deploy/crear contratos)
```

**Ya NO existen** `backend-ts/` ni `backend-worker/`.

---

## 📚 Docs
- `SECURITY.md` — auditoría Fase 3 completa (+ Fase 1 y 2 histórico).
- `README.md` — pitch + sección "Settlement model — read me" (honesto).
- `DEMO.md` — guía de 90s para jueces (actualizada a settlement simbólico).

---

## 🧠 Decisiones de diseño para tener presentes
1. **Settlement simbólico documentado** — no DvP real en DevNet (sandbox m2m no es DSO).
2. **Demo abierto (sin auth)** — por fricción cero para jueces. Rate-limit + simbólico limitan el daño.
3. **`realSettlementRequired: false`** en todos los proposals del demo — honesto, no bug.
4. **CLIENT_SECRET no rotado** por decisión del equipo. Rotar (P0) lo neutraliza del historial.
5. **Tx viejas del README** (semanas atrás) devuelven `found:false` en el verificador — el participant las pruned. Las tx nuevas del demo siempre funcionan.
6. **Records KV pre-`aca6352`** no tienen `updateId` → sus cards simplemente omiten el botón 🔍 (degradación graciosa).
