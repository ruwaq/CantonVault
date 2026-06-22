# HANDOFF — Sesión 2026-06-22

**Fecha**: 2026-06-22 10:30
**Último commit**: `a0b5f4e feat: CantonVault Phase 3 - frontend split-screen UI`
**Estado**: DAR v0.0.2 deployado en Seaport DevNet. Contratos funcionando. Queda terminar flujo disputa en UI y preparar demo.

---

## Dónde nos quedamos

### En Seaport (DevNet)
- ✅ DAR `quickstart-licensing-0.0.2` deployado en validator `5N Sandbox`
- ✅ `CommitmentProposal` creado + `AcceptProposal` ejecutado + `Fulfill` exitoso
- ✅ `SettlementReceipt` generado: 100000.0 CC, nota "Pago confirmado | via CantonVault"
- ⬜ Queda: crear NUEVO proposal para flujo de **disputa** (RaiseDispute → ResolveDispute)
- ⬜ **IMPORTANTE**: En `Fulfill`, el campo `allocationCid` debe ponerse `null` (sin comillas)

### Party IDs guardados en `/PARTY_IDS.txt`
```
PROPOSER: cd0a87602543a6691a8f1dade842469c::1220d2d1c1ab966cf98449cf8b42cfa46150f3af6f85cc0bf73126d8bdc54741e402
ACCEPTER: 7fd80745e6a0c07356a64c56d3d3a455::122002a94f06d53b2aed3b4bb0549225d35e130700e18c09ae68c8011fcc9102bd9c
VALIDATOR: 5nsandbox-devnet-2::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8
```

**Nota**: Las parties personales NO están autorizadas en el validator. Para la demo usamos la party del validator para los 3 roles. Para demo con privacidad real, el admin debe onboardear las parties.

### Código local
- Repo: `/Users/munay/dev/Build on Canton Hackathon`
- DAR actual: `cn-quickstart/quickstart/daml/licensing/.daml/dist/quickstart-licensing-0.0.2.dar`
- 12 tests verdes: `~/.daml/bin/daml test --package-root daml/licensing-tests`
- Backend compila: `./gradlew :backend:compileJava -x :daml:compileDaml`
- Frontend compila: `cd frontend && npx tsc --noEmit`

---

## Lo que falta implementar

### Prioridad 1 — Demo (hoy)
| Tarea | Detalle |
|---|---|
| Terminar flujo disputa en Seaport | Crear proposal → Accept → RaiseDispute → ResolveDispute |
| Probar `Refund` | Después del deadline, ejecutar Refund |
| Grabar demo | Mostrar el Active Contract Set con el historial completo |

### Prioridad 2 — Código (si hay tiempo)
| Tarea | Detalle |
|---|---|
| Backend corriendo contra DevNet | Configurar `LedgerApi.java` para apuntar a `ledger-api.validator.devnet.sandbox.fivenorth.io` |
| Frontend contra backend | Levantar Vite + backend y mostrar VaultView con datos reales |
| Readme submission | `CANTONVAULT_README.md` ya está listo |

### Prioridad 3 — Producción (post-hackathon)
| Tarea | Detalle |
|---|---|
| Contract keys | `key (proposer, accepter, description)` cuando Sandbox lo soporte |
| DAR modularization | Separar `Disclosable` interface en package propio |
| Canton MCP server | Ya instalado en `/tmp/canton-mcp-server`, configurado en `~/.config/opencode/opencode.json`. Solo mock data por ahora |
| Delegation pattern | Agregar `operator` field para Firmar/Fulfill delegado |
| On-ledger vs off-ledger | Mover `description` y `note` a metadata off-chain |

---

## Comandos rápidos

```bash
cd "/Users/munay/dev/Build on Canton Hackathon/cn-quickstart/quickstart"

# Daml tests
~/.daml/bin/daml build --package-root daml/licensing
~/.daml/bin/daml test --package-root daml/licensing-tests

# Backend
./gradlew :backend:compileJava -x :daml:compileDaml

# Frontend
cd frontend && npm run dev

# MCP server
node /tmp/canton-mcp-server/dist/index.js
```

---

## Flujo de disputa (próximo paso en Seaport)

1. Home → Deploy DAR & Create Contract → `CommitmentProposal`
2. Select DAR: `quickstart-licensing-0.0.2.dar`
3. Campos (usar party del validator en los 3):
   - description: `Factoring INV-2026-004-DISPUTA`
   - deadline: `31/12/2026, 23:59:59`
   - resto igual que antes
4. Create → Accept → **RaiseDispute** (reason: "disputa de prueba")
5. Buscar `DisputeCase` en Active Contract Set → **ResolveDispute** (ruling: "proposer")