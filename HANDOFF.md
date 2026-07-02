# HANDOFF — CantonVault (sesión 2026-07-02)

> **Para el próximo agente/modelo que tome este proyecto.** Lee esto entero antes de tocar nada.
> Última actualización: 2026-07-02. Estado: **producto funcional end-to-end contra Canton real (LocalNet)**.

---

## 0. TL;DR — dónde estamos

CantonVault es un protocolo Daml de **compromisos condicionales privados** para finanzas institucionales. Dos partes acuerdan un trato; un tercero **no ve nada** hasta una disputa (privacy por diseño del protocolo Canton, no por cifrado). Settlement atómico en Canton Coin.

**Verificado y funcionando:**
- 12/12 tests Daml pasan (incluida la privacy claim, probada no prometida)
- Backend Spring Boot compila y corre conectado a un nodo Canton real
- Frontend React compila limpio (cero `any`), con landing profesional + app
- Stack completo levantado en LocalNet (Docker): canton, splice, postgres, backend, pqs, wallets
- Flujo end-to-end real: `POST /vault/proposals` → contrato en el ACS del ledger → recuperado vía PQS

**Lo que falta** (ver §5): video/demo para entrega, y explorar DevNet (bloqueado, ver §6).

> 📋 **AUDITORÍA + PLAN DE HARDENING (2026-07-02):** se hizo una auditoría completa de producción.
> Hallazgos: 6 críticos (seguridad/validación), 8 high backend, 9 frontend, 8 gaps de tests Daml.
> **No hay que reconstruir nada — la arquitectura es correcta.** Solo endurecer.
> Plan detallado ejecutable: **`docs/superpowers/plans/2026-07-02-production-hardening.md`**.
> Decision-log: `docs/DECISION-LOG.md` (entrada 2026-07-02).
> ⚠️ **Corrección**: la claim "zero `any`" del frontend es **FALSA** — hay 10 `any` reales (se corrigen en P0.1).

---

## 1. Quick start — cómo levantar todo (3 comandos)

```bash
cd "/Users/munay/dev/Build on Canton Hackathon/cn-quickstart/quickstart"

# 0. Docker Desktop debe estar corriendo
open -a Docker && docker info

# 1. (opcional) liberar el puerto 8080 si open-webui u otra app lo ocupa
docker stop open-webui 2>/dev/null

# 2. Levantar Canton + Splice + Postgres + backend
./run-localnet.sh up

# 3. Frontend en modo dev (hot reload)
cd frontend && npm run dev
```

Abrir **`http://localhost:5173`** → landing de CantonVault → click "Launch the demo" → auto-connect → CantonVault.

> ⚠️ **Path con espacios**: el proyecto vive en `Build on Canton Hackathon/`. El Makefile del upstream rompe por los espacios (construye paths absolutos sin escapar). **SIEMPRE usa `./run-localnet.sh`**, nunca `make start` directamente.

### Credenciales / login
- Modo: `shared-secret` (definido en `.env.local`)
- No hay pantalla de login visible: el frontend hace **auto-connect** transparente (POST silencioso como `app-provider`, password vacía)
- Si necesitas loguear a mano: usuario `app-provider`, password **vacía**

### Comandos del wrapper `run-localnet.sh`
| Comando | Qué hace |
|---|---|
| `./run-localnet.sh up` | Levanta todos los contenedores |
| `./run-localnet.sh down` | Para y elimina contenedores |
| `./run-localnet.sh logs` | Tail de logs |
| `./run-localnet.sh ps` | Lista contenedores |
| `./run-localnet.sh restart-backend` | Reconstruye y reinicia solo el backend (tras cambiar Java) |

---

## 2. Arquitectura del proyecto

```
cantonvault/                                   ← repo raíz (git)
├── README.md                                  ← presentación del proyecto (hackathon)
├── HANDOFF.md                                 ← ESTE documento
├── SUBMISSION_CHECKLIST.md                    ← checklist de entrega
├── PARTY_IDS.txt                              ← party IDs del DevNet (Seaport)
├── docs/                                      ← estrategia, investigación, decisiones
└── cn-quickstart/quickstart/                  ← la app (sobre el upstream cn-quickstart)
    ├── run-localnet.sh                        ← wrapper docker compose (fix path espacios)
    ├── daml/licensing/daml/Vault/             ← CONTRATOS DAML (nuestro código)
    │   ├── CommitmentContract.daml            ← núcleo + Fulfill/Refund/RaiseDispute + AllocationRequest
    │   ├── CommitmentProposal.daml            ← patrón Propose
    │   ├── Disclosable.daml                   ← DisclosedRecord (proof de disclosure)
    │   └── SettlementReceipt.daml             ← recibo inmutable
    ├── daml/licensing-tests/daml/Vault/Scripts/ ← 12 tests Daml Script
    ├── backend/.../service/CommitmentController.java  ← API REST /vault/*
    ├── backend/.../config/VaultPartyProperties.java   ← parties del config
    ├── backend/.../config/CorsConfig.java             ← CORS
    └── frontend/src/
        ├── views/LandingView.tsx              ← landing pública (vende el producto)
        ├── views/LoginView.tsx                ← fallback (auto-connect lo bypassa)
        ├── views/HomeView.tsx                 ← dashboard autenticado
        ├── views/VaultView.tsx                ← LA APP: wizard 3 pasos + Privacy Lab
        ├── stores/vaultStore.tsx              ← store tipado (cero any)
        ├── stores/userStore.tsx               ← autoConnect()
        ├── components/vault/VaultActionModals.tsx ← modales Fulfill/Dispute/Resolve
        └── types.ts                           ← tipos del dominio + normalizador
```

### Flujo del producto (explain to a baby)
1. **Propose** — tú (Supplier) creas un compromiso. El árbitro **no lo ve**.
2. **Act** — el financiero acepta. Fulfill mueve Canton Coin. O Dispute escala al árbitro.
3. **Privacy Lab** — 3 paneles reales del ledger: stakeholders ven todo, árbitro ve nada (o solo monto+descripción tras disputa), competidor ve nada siempre.

---

## 3. Lo que se hizo (resumen de sesiones previas)

### Auditoría + fixes críticos (commit `cd37656`)
- **Bug privacidad arreglado**: `DisclosedRecord` tenía `thirdParty` como signatario (rompía la tesis). Ahora es `observer`.
- **Bug dispute arreglado**: `RaiseDispute` fallaba en Canton (requería auth de thirdParty para divulge). Tests `test_thirdparty_sees_dispute` + `test_thirdparty_resolves` ahora pasan.
- **Refund completado**: era `pure ()` (TODO). Ahora ejecuta `Allocation_ExecuteTransfer` inverso + `SettlementReceipt`.
- Frontend rehecho: cero `any`, store tipado, modales, wizard 3 pasos, Privacy Lab real.

### Runtime (commits `6e8d969`, `bb52fa8`)
- `run-localnet.sh`: wrapper que fixea el bug del path con espacios en docker compose.
- `VaultPartyProperties`: fix de `@Value List<Map>` que no compila en Spring → `@ConfigurationProperties`.
- `app.env`: inyecta las party IDs al contenedor backend para el selector UI.

### UX/UI (commits `6155411`, `42b8dc0`, `2616394`)
- Landing profesional (hero, problema, solución, tabla de privacidad, arquitectura).
- Login reducido a 1 botón, luego **eliminado** (auto-connect transparente dApp-style).

### Verificación (esta sesión)
- 12/12 Daml tests, backend BUILD SUCCESSFUL, frontend tsc 0 errores.
- Stack corriendo: Vite :5173 + backend :8080 + Canton LocalNet.

---

## 4. Reglas técnicas IMPORTANTES (no romper)

1. **Path con espacios**: usa `run-localnet.sh`, nunca `make start`.
2. **`.gitignore` allowlist**: el repo ignora `cn-quickstart/**` y re-habilita archivo por archivo. **Cada archivo nuevo que crees en cn-quickstart DEBE añadirse al `.gitignore`** o no se subirá al repo.
3. **Refund es `consuming`**: devuelve `ContractId SettlementReceipt` y archiva el `CommitmentContract`. No romper este contrato.
4. **`RaiseDispute` requiere auth de thirdParty**: en Canton, divulgar un contrato a un observer exige su consentimiento. Los tests usan `submitMulti [proposer, accepter, thirdParty]`.
5. **Login en shared-secret**: password vacía (`{noop}`). El auto-connect hace POST a `/login` (no `/login/shared-secret`).
6. **Puerto 8080**: el backend lo necesita. `open-webui` u otras apps pueden ocuparlo — para ellas antes de levantar.
7. **`.gitignore` allowlist (recordatorio)**: el repo ignora `cn-quickstart/**` y re-habilita archivo por archivo. **Cada archivo NUEVO que crees en `cn-quickstart/` DEBE añadirse al `.gitignore`** o no se subirá. Los archivos que solo EDITAS (ya trackeados) no lo necesitan. El plan de hardening crea varios archivos nuevos — cada uno tiene su entrada de `.gitignore` documentada en `docs/superpowers/plans/2026-07-02-production-hardening.md` (P0.6).

---

## 5. Lo que FALTA (priorizado)

### P0 — Entrega hackathon (deadline 13 Jul 2026)
- [ ] **Video pitch (3 min)**: grabar flujo Propose→Accept→Fulfill→Dispute→Privacy Lab. Script en `docs/decisiones/03-posicionamiento-pitch.md`.
- [ ] **Video demo técnico (3 min)**: screen recording mostrando el ACS del ledger (en Seaport o LocalNet).
- [ ] **Subir .dar a Seaport** (live link): `app.devnet.seaport.to/encode-hackathon` → "Deploy DAR" → subir `daml/licensing/.daml/dist/quickstart-licensing-0.0.4.dar`.
- [ ] **Push a GitLab**: hay 8 commits sin pushear. `git push origin main` (repo: `gitlab.com/PrometeoDev/cantonvault`).

### P1 — Mejoras técnicas (post-entrega o si hay tiempo)
- [ ] **Multi-party real en demo**: hoy AppProvider hace los 3 roles. Para demo de privacidad real con 2 parties distintas logueadas, hace falta multi-sesión o un endpoint que actúe como party arbitrar.
- [ ] **Contract keys**: `key (proposer, accepter, description)` para uniqueness. Post-hackathon (sandbox no lo soporta aún).
- [ ] **Tests E2E Playwright**: el quickstart los incluye; no los hemos corrido.
- [ ] **DAR modularization**: separar el módulo Vault en su propio package.

### P2 — Producción real
- [ ] Auth OAuth2 (Keycloak) en vez de shared-secret.
- [ ] Conexión a DevNet real (ver §6 — bloqueado por accesibilidad del participant).
- [ ] CI/CD (`.github/workflows/daml-test.yml` existe; ampliar con backend+frontend).

---

## 6. Hallazgo crítico sobre el DevNet (leer antes de intentar)

Se investigó a fondo el 2026-06-30/07-02. **Conclusiones firmes:**

- **El participant del DevNet NO es públicamente accesible** por internet. Canton es permissionada. Todos los probes a `ledger-api.validator.devnet.sandbox.fivenorth.io` y variantes → timeout.
- **Seaport (`app.devnet.seaport.to`) es un IDE web (SPA)**, no un gateway API. Sirve para que humanos suban `.dar` y creen contratos. **No expone** endpoints de ledger API consumibles por el backend.
- **El cn-quickstart es 100% gRPC** y requiere un **nodo splice-validator propio** para hablar con cualquier Canton. Por eso LocalNet es el camino correcto.

> **NO pierdas tiempo intentando "conectar el backend al DevNet directamente"** — no es posible técnicamente. El camino profesional es LocalNet (que YA funciona) + subir el `.dar` a Seaport para el live link.

---

## 7. Verificación rápida (ejecutar al empezar)

```bash
cd "/Users/munay/dev/Build on Canton Hackathon/cn-quickstart/quickstart"
export PATH="$HOME/.daml/bin:$PATH"

# Tests
daml test --package-root daml/licensing-tests   # 12 tests, todos ok
./gradlew :backend:compileJava -x :daml:compileDaml   # BUILD SUCCESSFUL
cd frontend && npx tsc -b --noEmit               # sin errores

# Runtime (si Docker está corriendo)
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173   # 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/feature-flags   # 200
```

Si algo falla, ver §1 (cómo levantar) y §4 (reglas).

---

## 8. Commits pendientes de push (8 commits ahead of origin/main)

```
625d49d chore: track userStore.tsx (autoConnect) in gitignore allowlist
2616394 feat(auth): transparent auto-connect — zero login friction
5d56ff1 chore: track LoginView + login.css in gitignore allowlist
42b8dc0 feat(login): one-click demo entry
6155411 feat(landing): professional product landing page
bb52fa8 fix(vault): inject demo parties into backend container via app.env
6e8d969 fix(vault): runtime - LocalNet end-to-end working against real Canton
cd37656 feat(vault): production audit - fix privacy bugs, real Refund, rebuild frontend
```

**Push pendiente**: `git push origin main`

---

## 9. Auditoría profesional — REALIZADA (2026-07-02)

La auditoría recomendada abajo **ya se ejecutó** el 2026-07-02. Resultado:

| Pregunta | Respuesta |
|---|---|
| ¿No-signatario puede ejercer un choice Daml? | ❌ No (controllers correctos), pero **sin tests de fallo** que lo prueben |
| ¿`Refund` tras deadline es seguro? | ✅ Sí (gated + tested) |
| ¿`Fulfill` tras deadline? | ⚠️ **No decidido** — `Fulfill` no tiene guard de deadline (T1 del plan) |
| ¿Amounts pueden ser negativos? | ⚠️ Daml los frenaría, pero el backend no valida antes (C4 → P1.3) |
| ¿Rate limiting? | ❌ No hay |
| ¿SQL inyección en PQS? | ✅ No — todo parametrizado |
| ¿`autoConnect` expone credenciales? | ⚠️ **Sí** — hardcoded en el bundle JS (C3 → P1.1) |
| ¿XSS en `revealedFields`? | ✅ No — React auto-escapa, cero `dangerouslySetInnerHTML` |
| ¿Privacidad real en el demo? | ⚠️ Probada por tests, pero el demo usa 1 party (AppProvider) para 3 roles |
| ¿Tests cubren edge cases? | ⚠️ Solo happy paths + 2 de fallo; faltan double-op, settlement real, etc. |

**Status actual honesto**: el producto es **funcional y verificado** para LocalNet. La privacidad está **probada por tests Daml** (no solo claim). El settlement es **real (Canton Coin)**. **No es production-ready** — hay 6 issues críticos de seguridad/validación, pero ninguno requiere re-arquitectura.

**Para corregir todo**, sigue el plan ejecutable:
→ **`docs/superpowers/plans/2026-07-02-production-hardening.md`** (P0 quick wins ~3h, P1 security, P2 producción).

---

*Fin del handoff. Cualquier duda, los detalles están en los commits y en `docs/`.*
