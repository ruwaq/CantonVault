# HANDOFF — Sesión 2026-06-21

> **Lee esto al iniciar la próxima sesión.**
> Estado real del proyecto después de 2 sesiones intensivas de código.

**Fecha**: 2026-06-21
**Último commit**: `8de1023 feat: CantonVault Phase 1-2`
**Estado**: Daml completo + tests verde + backend compilando. Frontend pendiente.

---

## Lo que YA está hecho

### Daml Smart Contracts — 5 archivos, 14 tests verdes

| Archivo | Qué hace |
|---|---|
| `CommitmentProposal.daml` | Propose/Accept/Reject pattern. TODO: contract keys (Sandbox limitation) |
| `CommitmentContract.daml` | Fulfill con Canton Coin real (`AllocationRequest` + `Allocation_ExecuteTransfer`), RaiseDispute, Refund, DisputeCase+ResolveDispute |
| `SettlementReceipt.daml` | Immutable evidence of settlement |
| `Disclosable.daml` | Interface + `DisclosedRecord` template para selective disclosure |
| `Status.daml` | (dentro de CommitmentContract) Active/Fulfilled/Disputed/Refunded |

12 tests Vault + 4 tests License originales = 16 tests total, todos verde.

**Para correr tests**:
```bash
cd "cn-quickstart/quickstart"
~/.daml/bin/daml build --package-root daml/licensing
~/.daml/bin/daml test --package-root daml/licensing-tests
```

### Backend Java — 2 archivos, compila

| Archivo | Contenido |
|---|---|
| `CommitmentController.java` | 11 endpoints REST bajo `/api/vault`: proposals, accept, reject, commitments, fulfill, raiseDispute, refund, disclose, receipts, disclosures |
| `DamlRepository.java` | +10 métodos PQS para query del Active Contract Set |

**Para regenerar Java bindings y compilar**:
```bash
cd "cn-quickstart/quickstart"
~/.daml/bin/daml build --package-root daml/licensing
./gradlew :daml:codeGen -x :daml:compileDaml
./gradlew :backend:compileJava -x :daml:compileDaml
```

### CI

```bash
.github/workflows/daml-test.yml  # GitHub Actions: build DAR + 12 tests + compile backend
```

---

## Lo que FALTA

### Crítico (para demo funcional)

| Task | Descripción | Estado |
|---|---|---|
| **Phase 3: Frontend** | React split-screen 4 cuadrantes | ⬜ No empezado |
| **Task 0.3** | Preguntas a Jatin (Seaport deploy) | ⬜ Bloquea deploy |
| **Task 0b** | Party ID + DM a Jatin | ⬜ |
| **Deploy a DevNet** | `dabl deploy` o via Seaport | ⬜ |

### Mejoras (production readiness)

| Mejora | Descripción |
|---|---|
| Contract keys | Añadir `key (proposer, accepter, description)` a ambos templates cuando Sandbox/entorno lo soporte |
| DAR modularization | Mover `Disclosable` interface a package separado (requiere resolver dependencia circular con `DisclosedRecord`) |
| Daml Autopilot MCP | ChainSafe ofrece MCP server con 3600+ patrones verificados. Requiere wallet Canton Coin |
| Off-ledger metadata | `description` y `note` son datos, no estado → mover a backend DB |
| Non-repudiation | Agregar `requestedAt` timestamp a `CommitmentProposal` |

---

## Comandos rápidos

```bash
# Working directory
cd "/Users/munay/dev/Build on Canton Hackathon/cn-quickstart/quickstart"

# Daml
~/.daml/bin/daml build --package-root daml/licensing
~/.daml/bin/daml test --package-root daml/licensing-tests

# Backend (skipping dpm/compileDaml)
./gradlew :daml:codeGen -x :daml:compileDaml
./gradlew :backend:compileJava -x :daml:compileDaml

# Git
git status --short  # desde cn-quickstart/quickstart
```

---

## Arquitectura (resumen)

```
React Frontend (pendiente)
    ↓ REST
CommitmentController.java  ←  LedgerApi.java (gRPC → Canton)
    ↓ PQS/SQL                    ↓ gRPC
DamlRepository.java          Canton Participant Node
    ↓                            ↓
PostgreSQL ACS              Daml Ledger (CommitmentProposal, etc.)
```

**Endpoints REST** (`/api/vault`):
- `GET/POST /proposals`
- `POST /proposals/{id}/accept`, `/reject`
- `GET /commitments`
- `POST /commitments/{id}/fulfill`, `/raiseDispute`, `/refund`, `/disclose`
- `GET /receipts`, `/disclosures`

---

## Canton Coin Settlement (el diferenciador)

El `CommitmentContract` implementa `AllocationRequest` (Splice token standard). Cuando `Fulfill` recibe un `allocationCid`:
1. Valida el Allocation contra el view de AllocationRequest
2. Ejecuta `Allocation_ExecuteTransfer` (transfer atómico CC)
3. Crea `SettlementReceipt` como evidencia inmutable

Si `allocationCid = None` → settlement simbólico (para tests unitarios sin LocalNet).