# Decision Log — CantonVault

> Registro cronológico de decisiones de implementación, sorpresas, respuestas de Jatin, y desviaciones del plan.
> Append-only. Una entrada por evento. Fecha + autor + qué pasó.

---

## 2026-06-20 — Setup inicial

- **Versión de cn-quickstart verificada**: Daml SDK 3.4.11, Splice 0.5.3, Spring Boot 3.4.2, Java 21 (pendiente de confirmar en la próxima sesión al clonar).
- **Estrategia definida**: CantonVault institucional (TradeFi + OTC). Sin LATAM, sin ONG. Pitch honesto (sin "23% fees", sin "imposible en Ethereum").
- **Decisión de Canton Coin settlement**: NON-NEGOTIABLE. Es lo que nos hace económicamente nativos (Cantonomics 62% rewards a featured apps).
- **Pendiente lanzar HOY**: mensaje a Jatin en Discord con las 3 preguntas de Seaport + party ID.
- **Pendiente lanzar HOY**: crear proyecto CantonVault en Encode Club (deadline 21 Jun).

---

## 2026-06-20 — Pivote estratégico: Track 2 (TradeFi, RWA) con Supply Chain Finance

- **Contexto**: Tras revisar el panorama competitivo del Discord, IoMarkets está en Track 1 con app live. Track 2 está COMPLETAMENTE VACÍO. Canton ecosystem no tiene apps de trade finance con selective disclosure.
- **Decisión**: Mover CantonVault a **Track 2 (TradeFi, RWA & Tokenized Assets)** con foco en **Supply Chain Finance** (deep-tier, dynamic discounting).
- **Razón**: 
  1. Track 2 sin competidores = ganar el track por default
  2. "Supply chain financing" es literal del brief oficial
  3. Los 4 contratos Daml NO cambian — solo cambian nombres de actores y pitch
  4. El ecosistema Canton no tiene NINGÚN producto de trade finance con selective disclosure — seríamos el primero
  5. No competimos directamente con IoMarkets (ellos Track 1, nosotros Track 2)
- **Escenarios de demo actualizados**: 
  1. Deep-tier Supply Chain Finance (Supplier Tier 2 → Supplier Tier 1 → Buyer)
  2. Dynamic Discounting (Buyer ofrece early payment → Supplier acepta sin que competidores vean sus términos)
- **Cambios necesarios en docs**: Actualizar `docs/decisiones/01-estrategia-ganadora.md`, `docs/decisiones/03-posicionamiento-pitch.md`, `docs/superpowers/specs/2026-06-20-cantonvault-design.md`, `README.md` y `HANDOFF.md` con Track 2 + Supply Chain Finance.

---

## 2026-07-02 — Auditoría de producción + runtime + UX

- **Bugs críticos arreglados (preexistentes)**: `DisclosedRecord` tenía mal diseño (thirdParty era signatario). `RaiseDispute` fallaba en Canton (divulge requiere auth de observer). Tests `test_thirdparty_sees_dispute` + `test_thirdparty_resolves` ahora pasan → **privacy probada por tests**.
- **Refund completado**: era `pure ()` TODO. Ahora `Allocation_ExecuteTransfer` inverso + `SettlementReceipt`.
- **Backend**: endpoints `/dispute-cases` + `/resolve`, eliminado `/disclose` duplicado, CORS, `/vault/parties`, `VaultPartyProperties`.
- **Frontend rehecho**: cero `any`, store tipado, wizard 3 pasos, Privacy Lab real, landing profesional, auto-connect dApp-style.
- **Runtime**: `run-localnet.sh` (fix path con espacios), stack LocalNet verificado end-to-end (proposal creado en ledger Canton real, recuperado vía PQS).
- **DevNet investigado a fondo**: participant NO es públicamente accesible, Seaport es IDE no API. Decisión: LocalNet + subir .dar a Seaport para live link.

---

## 2026-07-02 — Auditoría completa de producción + plan de hardening

- **Contexto**: Usuario pidió auditoría completa del proyecto: qué mejorar, borrar, reconstruir para producción. Se ejecutó code-review exhaustivo de las 3 capas (Daml, backend Java/Spring, frontend React/TS) + CI/CD + tests, con verificación directa de hallazgos.
- **Hallazgos críticos (6)**:
  - C1 CSRF deshabilitado en `SharedSecretConfig.java:53` (regresión vs OAuth2 profile que sí lo tiene).
  - C2 Passwords `{noop}` vacías (`SharedSecretConfig.java:88`, `AdminApiImpl.java:121`).
  - C3 Credenciales `app-provider`/password vacía hardcodeadas en el bundle del frontend (`userStore.tsx:61-62`, `LoginView.tsx:27-29`).
  - C4 Sin validación de inputs financieros (`CommitmentController.java:445` — amount negativo, deadline overflow).
  - C5 Stack traces y `include-exception: true` filtrados al cliente (`application.yml:9-13`), sin `@ControllerAdvice`.
  - C6 Cero tests de backend (no existe `backend/src/test/`).
- **Hallazgos high**: 8 en backend (actAs siempre appProvider, fetch-all-then-filter con SQL filtrado sin usar, DriverManagerDataSource sin pooling, defaults Postgres débiles, gRPC plaintext, sin rate limiting, duplicación de código), 9 en frontend (stale closure en autoConnect, 10× `any`, sin focus trap, 2 flujos login divergentes, fetchUser en 7 sitios, errores solo como toast, reverse tabnabbing).
- **Gaps de tests Daml (8)**: el más importante — `Fulfill` no tiene guard de deadline (no decidido si es bug o feature), rama de settlement real (`allocationCid = Some`) sin testear, sin tests de doble-operación.
- **CI**: solo corre Daml + backend compile. Frontend y E2E no se verifican nunca.
- **Claim corregida**: el HANDOFF y SUBMISSION_CHECKLIST decían "zero `any`" en el frontend → **FALSO**. Hay 10 `any` reales (`vaultStore.tsx:195,202`, `error.ts:12,25,27,28,35`, `api.ts:8`, `userStore.tsx:37`, `tenantRegistrationStore.tsx:54`, `custom.d.ts:5`).
- **Verificado como CORRECTO (no tocar)**:
  - Modelo de privacidad Daml — `thirdParty` fuera de signatory/observer; privacy por diseño del protocolo Canton, probada por tests con aserciones reales (`TestPrivacy`, `TestOtcBlockTrade`, `TestWorkflow`).
  - Settlement atómico vía Splice AllocationRequest interface.
  - SQL parametrizado (sin inyección) — `JdbcTemplate` con `?` placeholders en todos los callers.
  - CORS acotado con allowlist explícita (no `*`).
  - Sin secretos commiteados (`.env.local` no trackeado; `app.env` solo placeholders `${VAR}`; party IDs son públicos).
  - Sin superficie XSS (cero `dangerouslySetInnerHTML`, cero `eval`).
  - Sin memory leaks (intervalos y listeners se limpian).
  - Limpieza: sin `console.log`/`debugger` en frontend; solo 2 TODOs en backend.
- **Decisión**: **No borrar ni reconstruir nada.** La arquitectura es correcta. Solo endurecer (seguridad, validación, tests).
- **Plan detallado**: `docs/superpowers/plans/2026-07-02-production-hardening.md` — 3 fases (P0 quick wins pre-hackathon ~3h, P1 security hardening, P2 producción real) + gaps de tests Daml. Cada tarea tiene ubicación exacta, código de ejemplo, y verificación.

---

## Pendientes para próxima sesión

- [ ] Ejecutar plan de hardening P0 (quick wins pre-hackathon): `docs/superpowers/plans/2026-07-02-production-hardening.md`
- [ ] Confirmar versions exactas al clonar cn-quickstart
- [ ] Capturar respuesta de Jatin sobre Seaport (URL, party ID format, .dar upload path)
- [ ] Decisión sobre Disclosure interface vs patrón DisputeCase manual (verificar si compila en SDK 3.4.11)
- [ ] Si aparece import circular entre CommitmentContract y DisputeCase, decidir solución aquí
- [ ] Decisión T1: ¿`Fulfill` debe bloquearse tras `deadline`? (ver plan §Tests Daml)

---

## Plantilla para nuevas entradas

```
## YYYY-MM-DD — Título corto
- **Contexto**: qué estaba pasando
- **Decisión**: qué decidiste
- **Razón**: por qué
- **Alternativas descartadas**: qué más consideraste y por qué no
```
