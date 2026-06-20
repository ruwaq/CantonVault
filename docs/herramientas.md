# Inventario de herramientas verificadas

> **Todo lo que vamos a usar, con versión, URL y por qué.**
> Cada herramienta verificada contra docs oficiales o repos GitHub durante la investigación del 2026-06-20.
> Si una herramienta no está en esta lista, NO se instala sin justificación.

**Última verificación**: 2026-06-20

---

## 🧱 Stack base (heredado del cn-quickstart)

> Estas versiones son las que usa el `digital-asset/cn-quickstart` en `main` a fecha de investigación. No cambiar sin verificar compatibilidad.

| Herramienta | Versión verificada | Para qué | Fuente |
|---|---|---|---|
| **Daml SDK** | 3.4.11 | Lenguaje de smart contracts | `quickstart/daml/licensing/daml.yaml` |
| **Splice** | 0.5.3 | Canton Coin / token standard / wallets | `quickstart/.env` |
| **Java (Temurin)** | 21 | Backend Spring Boot | `quickstart/backend/build.gradle.kts` |
| **Spring Boot** | 3.4.2 | Backend REST API | `quickstart/backend/build.gradle.kts` |
| **React** | 18 | Frontend UI | `quickstart/frontend/package.json` |
| **Vite** | (la del quickstart) | Bundler frontend | `quickstart/frontend/package.json` |
| **TypeScript** | (la del quickstart) | Tipado frontend + codegen | `quickstart/frontend/package.json` |
| **Node.js** | 20+ | Runtime frontend / npm | recomendación estándar |
| **Docker** | 24+ + 8GB RAM | LocalNet via compose | `quickstart/Makefile` |
| **Postgres** | (la del compose) | PQS (Participant Query Store) | `docker/modules/localnet` |
| **nginx** | (la del compose) | Proxy frontend → backend | `config/nginx/` |

### Librerías clave del cn-quickstart (YA incluidas, no añadir)

| Librería | Versión | Para qué |
|---|---|---|
| `transcode` | 0.1.1 | Codegen DAR → Java bindings (runtime) |
| `com.daml.codegen-java-daml3_4` | (plugin) | Codegen DAR → Java (gradle plugin) |
| `io.grpc` | 1.67.1 | gRPC al Canton participant |
| `protobuf` | 3.24 | Serialización gRPC |
| `springdoc-openapi` | (la del quickstart) | Swagger UI |
| `openapi-client-axios` | 7 | HTTP client frontend |
| `axios` | 1 | HTTP runtime frontend |
| `openapi-generator` | (gradle plugin) | Codegen OpenAPI → Spring + TS |

---

## ➕ Lo que AÑADIMOS al cn-quickstart

### Frontend
| Herramienta | Para qué | Por qué |
|---|---|---|
| **TailwindCSS** | Estilos premium, institucional | Velocidad de desarrollo, consistencia visual, dark mode fácil |
| *(evaluar)* `framer-motion` | Animaciones sutiles en la demo split-screen | Opcional — solo si no retrasa la entrega |

> **Decisión pendiente**: TailwindCSS vs los estilos del quickstart. Si el quickstart ya usa CSS modules, evaluar si mezclar es fricción. **Recomendación**: TailwindCSS para las pantallas nuevas (Vault), dejar el login/tenant del quickstart intacto.

### Backend
| Herramienta | Para qué | Por qué |
|---|---|---|
| *(nada nuevo)* | — | El cn-quickstart ya tiene todo: gRPC, PQS, OAuth2, codegen |

### Daml
| Herramienta | Para qué | Por qué |
|---|---|---|
| **Daml.Finance `Disclosure` interface** | Patrón oficial de selective disclosure | Evita reinventar; demuestra uso de código producción |
| **Splice token standard** (`Allocation_ExecuteTransfer`) | Settlement real con Canton Coin | Ya lo usa `LicenseRenewalRequest_CompleteRenewal` del quickstart |

---

## 🌐 Plataformas y servicios externos

| Plataforma | URL | Para qué | Estado |
|---|---|---|---|
| **CPort devnet** | https://devnet.c4.io | Deploy del `.dar` para "live product" | ⚠️ Sin docs oficiales, confirmar con Jatin |
| **Canton DevNet** | https://docs.dev.sync.global | Documentación de DevNet subyacente | ✅ Documentado |
| **Loop Wallet** | (integrado en CPort) | Wallet de parties en devnet | ⚠️ Integración vía CPort, no self-serve |
| **Encode Club** | https://www.encodeclub.com/programmes/canton-hackathon | Plataforma del hackathon | ✅ Aquí se crea el proyecto y se sube |
| **Discord Encode** | (link en plataforma) | Soporte técnico con Jatin + equipo | ✅ Canal `#❓technical-questions` |

---

## 📦 Paquetes npm (candidatos, verificados)

| Paquete | Versión | Para qué | Verificado |
|---|---|---|---|
| `@daml/ledger` | (latest) | Cliente JSON Ledger API framework-agnostic | ✅ https://www.npmjs.com/package/@daml/ledger |
| `@canton-network/wallet-sdk` | (latest) | Wallet Gateway / dApp SDK | ✅ https://www.npmjs.com/package/@canton-network/wallet-sdk |
| `@canton-network/core-wallet-auth` | (latest) | Auth core wallet (JWT/OIDC) | ✅ https://www.npmjs.com/package/@canton-network/core-wallet-auth |
| `tailwindcss` | 3.x | Estilos | ✅ Estándar |
| `openapi-client-axios` | 7 | YA en quickstart | ✅ |

> **⚠️ `daml2ts` está posiblemente deprecado**. No depender de codegen TS desde DAR. El flujo del cn-quickstart (OpenAPI → TS) es el recomendado.

---

## 📚 Documentación oficial (bookmark esto)

| Recurso | URL | Cuándo usarlo |
|---|---|---|
| **Daml reference (templates, choices, structure)** | https://docs.digitalasset.com/build/3.5/reference/daml/structure.html | Escribir contratos |
| **Daml choices reference** | https://docs.digitalasset.com/build/3.4/reference/daml/choices.html | Entender controllers |
| **Parties & authority tutorial** | https://docs.digitalasset.com/build/3.5/tutorials/smart-contracts/parties.html | Entender signatory/observer/controller |
| **Ledger privacy & divulgence** | https://docs.digitalasset.com/overview/3.4/explanations/ledger-model/ledger-privacy.html | Entender privacidad (clave para nuestra demo) |
| **Explicit Contract Disclosure** | https://docs.digitalasset.com/build/3.4/sdlc-howtos/applications/develop/explicit-contract-disclosure.html | Feature experimental (Canton 2.7+) |
| **JSON Ledger API V2** | https://docs.digitalasset.com/explanations/json-api/index.html | Si hacemos frontend directo al validator |
| **JSON API curl tutorial** | https://docs.digitalasset.com/build/3.5/tutorials/json_api/canton_and_the_json_ledger_api.html | Endpoints create/exercise/query |
| **JSON API TypeScript tutorial** | https://docs.digitalasset.com/build/3.5/tutorials/json_api/canton_and_the_json_ledger_api_ts.html | Cliente TS al ledger |
| **Canton architecture** | https://docs.canton.network/overview/learn/architecture | Entender el stack global |
| **Validator API** | https://docs.sync.global/app_dev/validator_api/index.html | Endpoints HTTP del validator |
| **Validator auth** | https://docs.sync.global/app_dev/api/authentication.html | JWT bearer tokens |
| **External party signing** | https://docs.digitalasset.com/integrate/devnet/preparing-and-signing-transactions/index.html | Loop wallet signing |
| **Canton whitepaper PDF** | https://www.canton.io/publications/canton-whitepaper.pdf | Sub-transaction privacy profundo |
| **Canton privacy blog** | https://www.canton.network/blog/how-canton-network-delivers-institutional-grade-privacy | Justificación de privacidad |

---

## 📂 Repositorios GitHub de referencia

| Repo | URL | Para qué |
|---|---|---|
| **cn-quickstart** | https://github.com/digital-asset/cn-quickstart | **Base de nuestro proyecto** |
| **cn-quickstart AppInstall** | https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/AppInstall.daml | Patrón Propose/Accept |
| **cn-quickstart License** | https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/License.daml | Patrón settlement con amulet |
| **Daml.Finance** | https://github.com/digital-asset/daml-finance | Disclosure interface |
| **Daml.Finance Disclosure interface** | https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Interface/Util/V3/Disclosure.daml | Patrón disclosure |
| **Daml.Finance Disclosure impl** | https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Util/V4/Disclosure.daml | Implementación de referencia |
| **Splice (Hyperledger Labs)** | https://github.com/hyperledger-labs/splice | Canton Coin / token standard |
| **Splice LocalNet topology** | https://github.com/hyperledger-labs/splice/tree/main/cluster/compose/localnet | Compose base del LocalNet |
| **Canton wallet (ref impl)** | https://github.com/canton-network/wallet | Wallet TypeScript de referencia |
| **Canton forum** | https://forum.canton.network | Dudas de arquitectura |
| **Canton DevHub** | https://devhub.canton.foundation | Tools del ecosistema |

---

## 🧰 Herramientas de desarrollo recomendadas

| Herramienta | Para qué | Instalación |
|---|---|---|
| **Daml Studio** (extensión VS Code) | Syntax highlight + type checking Daml | Extensión `digital-asset.daml` en VS Code |
| **Daml SDK installer** | Compilar `.dar`, Daml Script | `curl -sSL https://get.daml.com | sh` |
| **`dpm`** (DA package manager) | Multi-package Daml builds | Ya incluido en el quickstart (vía nix/devshell) |
| **Docker Desktop** | LocalNet | Con 8GB+ RAM |
| **Java 21 Temurin** | Backend | `sdkman` o download directo |
| **Postman / Bruno** | Probar JSON API endpoints | Manual testing |
| **Gradle** (wrapper) | Build backend | `./gradlew` (no instalar global) |

---

## ⚠️ Herramientas / enfoques a EVITAR

| Evitar | Por qué |
|---|---|
| `daml2ts` codegen | Posiblemente deprecado; usar OpenAPI → TS del quickstart |
| Frontend directo al JSON API sin backend | Auth de parties es compleja; el quickstart ya la resuelve |
| Hardcodear party IDs | Usar el flow de onboarding del quickstart (`app-provider.sh`, `app-user.sh`) |
| Mutar contratos Daml in-place | Imposible; hay que archive + create (patrón Disclosure lo hace) |
| Hacer al árbitro controller de choices sobre `CommitmentContract` | **Divulga el contrato al controller** — arruina la privacidad |
| `cn-quickstart` sin leer el código primero | Hay que entender el codegen contract-first antes de extender |

---

## 🔧 Comandos esenciales del cn-quickstart

```bash
# Setup inicial interactivo
make setup

# Build completo (frontend + backend + daml + docker)
make build

# Levantar todo
make start

# Iteración rápida
make restart-backend    # solo backend
make restart-frontend   # solo frontend

# Consola interactiva de Canton (debugging)
make canton-console

# Daml Shell (para dpm, daml build, etc.)
make shell

# Sembrar demo data
make create-app-install-request

# Tests E2E (requiere oauth2 + TEST_MODE)
make integration-test

# Puertos:
#   App-provider UI: http://app-provider.localhost:3000
#   App-user UI:     http://app-user.localhost:2000
#   SV/Wallet UI:    http://sv.localhost:4000
#   Backend API:     http://localhost:8080
#   Swagger UI:      http://localhost:9090
```

---

## 📖 Reglas de uso de este documento

1. **Antes de instalar cualquier dependencia**, verificar que está en esta lista o justificar su adición.
2. **Antes de cambiar una versión**, verificar compatibilidad con el cn-quickstart.
3. **Si una URL no resuelve**, reportarlo y actualizar el documento.
4. **Actualizar este doc** cada vez que se confirma algo con Jatin / la comunidad.
5. Las marcas ⚠️ indican cosas **no verificadas oficialmente** que requieren confirmación.
