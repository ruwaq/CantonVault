# HANDOFF — Sesión 2026-06-30

**Fecha**: 2026-06-30 12:30
**Última commit antes de esta sesión**: `c3d7b43 docs: hackathon submission README`
**Estado**: Auditoría + refactor de producción completado. 12/12 tests Daml verdes, backend BUILD SUCCESSFUL, frontend cero errores TS. Queda conectar backend a DevNet (requiere credenciales reales) y grabar demo.

---

## Qué se hizo esta sesión

### Bugs críticos arreglados (preexistentes, rompían la tesis del producto)
1. **`DisclosedRecord` tenía mal diseño de privacidad**: `signatory discloser, observer` hacía que thirdParty tuviera que ser signatario (requería co-autoría). Corregido a `signatory discloser` + `observer observer`.
2. **`RaiseDispute` fallaba en Canton**: crear el contrato de disclosure requería autorización de thirdParty (modelo de divulge). Tests `test_thirdparty_sees_dispute` y `test_thirdparty_resolves` ahora pasan → **la privacidad está probada por tests**.

### `Refund` completado con Canton Coin real
- Antes: `pure ()` (TODO). Ahora ejecuta `Allocation_ExecuteTransfer` inverso (accepter→proposer) si se pasa un `allocationCid`, simétrico a `Fulfill`. Crea `SettlementReceipt` como evidencia.

### Backend (FRENTE A)
- **A2**: Añadido `GET /dispute-cases` y `POST /commitments/{id}/resolve`. Eliminado endpoint duplicado `/disclose` (ejecutaba el mismo `RaiseDispute` que `/raise-dispute`).
- **A4**: CORS configurado (`CorsConfig.java` + `.cors()` en ambos filter chains shared-secret y oauth2). Orígenes configurables via `CORS_ALLOWED_ORIGINS`.
- **B4**: Endpoint `GET /vault/parties` que expone las parties onboardadas del config, para que el UI use selectores (no pegar hashes).

### Frontend (FRENTE B) — reescrito a fondo, cero `any`
- **B1**: Tipos reales en `types.ts` (`Proposal`, `Commitment`, `Status`, `SettlementReceipt`, `DisclosedRecord`, `DisputeCase`) + normalizador `partyOf()`.
- **B2**: Store `vaultStore.tsx` (patrón `licenseStore`) con `withErrorHandling`, `commandId`, polling. Llama `/disclosures` y `/dispute-cases` (antes nunca llamados). `VaultProvider` en `App.tsx`.
- **B3**: `VaultView.tsx` reescrita: wizard 3 pasos (Propose → Act → Settle & Disclose) + **Privacy Lab real** (3 paneles con datos del ledger: stakeholders ven todo, third party antes del dispute ve vacío, third party después del dispute ve solo lo del `DisclosedRecord`).
- **B5**: Modales (`FulfillModal`, `DisputeModal`, `ResolveModal`) reusando `Modal.tsx`.

### `.gitignore` arreglado
- Los archivos nuevos/modificados no estaban en la allowlist y **no se hubieran subido al repo público**. Actualizado para trackear stores, components/vault, config, security y application.yml.

---

## Verificación (todo verde)
```bash
cd "/Users/munay/dev/Build on Canton Hackathon/cn-quickstart/quickstart"
~/.daml/bin/daml build --package-root daml/licensing          # DAR v0.0.4 creado
~/.daml/bin/daml test --package-root daml/licensing-tests     # 12/12 ok
./gradlew :backend:compileJava -x :daml:compileDaml           # BUILD SUCCESSFUL
cd frontend && npx tsc --noEmit                                # sin errores
```

---

## Lo que falta

### A3 — Conexión de red (RESUELTO el enfoque)

**Investigación de la sesión (2026-06-30)**: tras probar la conectividad real, se confirmó que:
- El **participant del DevNet de Canton NO es públicamente accesible** por internet (es una red permissionada institucional). Todos los probes a `ledger-api.validator.devnet.sandbox.fivenorth.io` y variantes hacen timeout.
- **Seaport (`app.devnet.seaport.to`) es un IDE web (SPA "5N Seaport")**, no un gateway API. Sirve para que humanos suban `.dar` y creen contratos; **no expone** endpoints de ledger API consumibles por un backend.
- El cn-quickstart es 100% gRPC y requiere un **nodo splice-validator propio** para hablar con cualquier Canton (local o DevNet). No hay "conectarse al DevNet sin nodo propio".

**Decisión**: el camino profesional y funcional es **LocalNet** (`make start`), que levanta una red Canton REAL (no mock) con splice-validator + participant + Postgres + backend. Es la arquitectura de producción correcta. Para el "live link" del hackathon, se sube el `.dar` a Seaport.

#### Cómo correr CantonVault local (Canton real)
```bash
cd "/Users/munay/dev/Build on Canton Hackathon/cn-quickstart/quickstart"

# 1. Asegurar que Docker Desktop está corriendo
docker info

# 2. (solo primera vez) Configurar entorno local
make setup    # interactivo: elegir AUTH_MODE=shared-secret, LocalNet

# 3. Levantar Canton + Splice + Postgres + backend
make start    # hace build + docker compose up -d

# 4. Frontend en modo dev (hot reload)
make start-vite-dev   # Vite en :5173, proxy a backend :8080

# 5. Abrir http://localhost:5173 → login app-provider/app-provider → /vault
```

#### Cómo subir el .dar a Seaport (live link para el hackathon)
1. Ve a https://app.devnet.seaport.to/encode-hackathon (org "Encode Hackathon")
2. **Deploy DAR & Create Contract** o **Upload DAR to Validator**
3. Sube `cn-quickstart/quickstart/daml/licensing/.daml/dist/quickstart-licensing-0.0.4.dar`
4. Selecciona el validator "Encode Hackathon"
5. Esto cumple el requirement "Deployed DAR on 5N Sandbox DevNet" del checklist

> **Nota sobre parties del selector UI**: las parties para el dropdown vienen de `application.yml` (`canton-vault.parties`). En LocalNet, las asigna Canton al onboarding (ver logs de `make start`). Poner esas en `VAULT_PROPOSER_PARTY`, `VAULT_ACCEPTER_PARTY`, `VAULT_THIRDPARTY_PARTY`.

### Demo
- Grabar flujo: Propose → Accept → Fulfill (CC) → Dispute → Privacy Lab muestra selective disclosure.
- La killer feature ahora es REAL: el panel "third party before dispute" está vacío porque no hay `DisclosedRecord`, y "after dispute" muestra solo los campos revelados.

---

## Comandos rápidos
```bash
cd "/Users/munay/dev/Build on Canton Hackathon/cn-quickstart/quickstart"

# Desarrollo local (LocalNet docker)
~/.daml/bin/daml build --package-root daml/licensing
~/.daml/bin/daml test --package-root daml/licensing-tests
./gradlew :backend:compileJava -x :daml:compileDaml
cd frontend && npm run dev

# Backend + frontend corriendo
docker compose -f docker/modules/localnet/compose.yaml up -d   # Canton + Postgres
./gradlew :backend:bootRun                                       # backend :8080
cd frontend && npm run dev                                       # Vite :5173
```

## Arquitectura del flujo (explain to a baby)
1. **Propose**: tú (Supplier) propones un trato al Financier. El Buyer queda **referenciado pero ciego**.
2. **Act**: el Financier acepta → compromiso activo. Cumplen → Fulfill mueve Canton Coin. Si hay problema → Dispute.
3. **Settle & Disclose**: el Privacy Lab muestra 3 perspectivas reales — stakeholders ven todo, Buyer ve **nada** hasta el dispute, y tras el dispute ve **solo** monto + descripción.
