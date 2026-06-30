# Investigación técnica consolidada

> **Hallazgos de la investigación profunda del 2026-06-20 sobre Daml, Canton, cn-quickstart y Seaport.**
> Cada hallazgo con su nivel de confianza y fuente. Esto es la base empírica de las decisiones en `docs/decisiones/`.
>
> ⚠️ **Corrección posterior (2026-06-20)**: esta investigación se hizo cuando llamábamos "CPort" a lo que en realidad es **Seaport** (`devnet.seaport.to`). Las conclusiones técnicas siguen siendo válidas; solo cambia el nombre del producto de deploy. Ver `docs/inteligencia-competitiva.md` para la corrección completa con datos del Discord.

**Fecha**: 2026-06-20
**Método**: 3 agentes de investigación en paralelo (Daml patterns, cn-quickstart, Seaport deploy) + 1 timeout (ecosystem, relanzar si necesario)

---

## 🎯 Resumen ejecutivo de hallazgos que cambiaron el plan

| # | Hallazgo | Nivel de confianza | Impacto en el plan |
|---|---|---|---|
| 1 | Existe `Disclosure` interface oficial en Daml.Finance | ✅ Verificado (código fuente) | Usarla en vez de inventar |
| 2 | El patrón DisputeCase separado es correcto y recomendado | ✅ Verificado (docs) | Arquitectura confirmada |
| 3 | Divulgence: ejercer choice divulga contrato al controller | ✅ Verificado (docs) | Árbitro NUNCA controller sobre CommitmentContract |
| 4 | cn-quickstart es contract-first con OpenAPI compartido | ✅ Verificado (repo) | Reducimos scope de backend |
| 5 | `LicenseRenewalRequest_CompleteRenewal` ya hace settlement con amulet | ✅ Verificado (repo) | Settlement real posible |
| 6 | Seaport/devnet.seaport.to — guia oficial publicada DESPUÉS de esta investigación | ⚠️ Parcialmente verificado (Jatin publicó guía en Discord) | Dual deploy: LocalNet + Seaport. Ver `docs/inteligencia-competitiva.md` |
| 7 | `daml2ts` posiblemente deprecado | ⚠️ No verificado | Usar OpenAPI → TS del quickstart |
| 8 | Canton Network = sub-transaction privacy a nivel protocolo | ✅ Verificado (whitepaper) | "Imposible en Ethereum" confirmado |

---

## 🔐 1. Privacidad en Daml (el corazón de CantonVault)

### 1.1 Semántica exacta de signatory / observer / controller

Verificado en https://docs.digitalasset.com/build/3.5/reference/daml/structure.html y https://docs.digitalasset.com/build/3.5/tutorials/smart-contracts/parties.html

| Rol | ¿Ve el contrato? | ¿Autoriza creación? | ¿Ejerce choices? |
|---|---|---|---|
| **Signatory** | ✅ Sí | ✅ Sí (create + archive) | ❌ No por defecto |
| **Observer** | ✅ Sí | ❌ No | ❌ No por defecto |
| **Controller** (de una choice) | ✅ Sí (se le divulga al ejercer) | n/a | ✅ **Sí, esa choice específica** |

**Clave**: un controller **no necesita ser signatory**. Cualquier stakeholder (signatory u observer) puede ser controller de una choice. Esto lo confirma el código del cn-quickstart: en `AppInstallRequest`, `provider` es solo observer pero es controller de `AppInstallRequest_Accept`.

### 1.2 El patrón DisputeCase (verificado como correcto)

**Pregunta original**: ¿Cómo hago que un árbitro NO vea amount/description hasta una disputa?

**Respuesta verificada**: el patrón es correcto. Un contrato solo es visible a un party si es stakeholder (signatory u observer) **de ese contrato específico**. Si el árbitro no es stakeholder de `CommitmentContract`, **nunca** recibirá su payload.

```daml
template CommitmentContract with
    payer, payee : Party
    arbiter : Party        -- referenciado pero NO stakeholder
    amount : Decimal
    ...
  where
    signatory payer, payee
    -- ⚠️ NO 'observer arbiter' — esto es lo que garantiza privacidad

    nonconsuming choice RaiseDispute : ContractId DisputeCase
      with reason : Text
      controller payer, payee
      do create DisputeCase with
           arbiter = arbiter
           amountRevealed = amount   -- solo ahora se revela
           ...
```

**Fuente**: https://docs.digitalasset.com/overview/3.4/explanations/ledger-model/ledger-privacy.html — *"contracts should only be shown to their stakeholders"*.

### 1.3 DIVULGENCE — el concepto que casi nos la arruina

> ⚠️ **Hallazgo crítico**: ejercer una choice **divulga** el contrato al controller de esa choice.

Esto significa que **si hiciéramos al árbitro controller de una choice sobre `CommitmentContract`**, el árbitro vería el contrato completo al ejercerla. Por eso:

- ✅ Las choices del árbitro viven en `DisputeCase`, contrato separado
- ❌ El árbitro nunca es controller de choices sobre `CommitmentContract`

**Distinción importante** (docs):
- **Disclosure** = visibilidad persistente (ser observer/stakeholder)
- **Divulgence** = visibilidad transaccional (ser controller de una choice ejercida)

Fuente: https://docs.digitalasset.com/overview/3.4/explanations/ledger-model/ledger-privacy.html

### 1.4 Disclosure interface de Daml.Finance (alternativa elegante)

Además del patrón DisputeCase, existe una interface producción en `digital-asset/daml-finance`:

```daml
interface Disclosure where
  viewtype V
  choice AddObservers : ContractId Disclosure
    with disclosers : Parties; observersToAdd : (Text, Parties)
    controller disclosers
    do addObservers this arg
  choice RemoveObservers : Optional (ContractId Disclosure)
    ...
  choice SetObservers : ContractId Disclosure
    ...
```

**Cómo funciona internamente**: archive + create con nuevo observer set (no se puede mutar in-place en Daml).

**Decisión**: usar esta interface en `CommitmentContract` para máxima elegancia y demostrar uso de código producción. Si da problemas de compilación, fallback al patrón DisputeCase manual.

Fuentes:
- Interface: https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Interface/Util/V3/Disclosure.daml
- Impl: https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Util/V4/Disclosure.daml

---

## 🏗️ 2. Estructura del cn-quickstart (nuestra base)

### 2.1 Layout del repo

```
cn-quickstart/
└── quickstart/
    ├── Makefile                      ← orquestador build/run
    ├── compose.yaml                  ← backend + nginx + splice-onboarding
    ├── .env                          ← version pins
    ├── common/openapi.yaml           ← 🔥 FUENTE ÚNICA de verdad
    ├── daml/
    │   ├── licensing/                ← el app package (lo extendemos)
    │   │   ├── daml.yaml             ← sdk-version: 3.4.11
    │   │   ├── daml/Licensing/       ← AppInstall.daml, License.daml, Util.daml
    │   │   └── .daml/dist/*.dar      ← artefacto compilado
    │   ├── licensing-tests/          ← Daml Script tests
    │   ├── external-test-sources/    ← splice-amulet-test, etc.
    │   └── dars/                     ← DARs prebuilt (splice, amulet)
    ├── backend/                      ← Java 21 + Spring Boot 3.4
    │   └── src/main/java/com/digitalasset/quickstart/
    │       ├── App.java
    │       ├── ledger/               ← LedgerApi.java (gRPC), Pqs.java
    │       ├── service/              ← *ApiImpl.java controllers
    │       └── security/             ← auth (shared-secret / oauth2)
    ├── frontend/                     ← React 18 + TS + Vite
    │   └── src/
    │       ├── App.tsx               ← rutas
    │       ├── api.ts                ← OpenAPIClientAxios
    │       ├── stores/               ← Context stores
    │       ├── views/                ← pantallas
    │       └── components/
    ├── config/nginx/
    └── docker/                       ← compose modules
```

### 2.2 El patrón Propose/Accept (del Licensing App)

Verificado en https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/AppInstall.daml

```daml
-- 1. Propose: user crea, provider es observer
template AppInstallRequest with
    provider : Party
    user : Party
    meta : Metadata
  where
    signatory user              -- solo el proponente autoriza
    observer  provider          -- la contraparte ve

    choice AppInstallRequest_Accept : ContractId AppInstall
      controller provider       -- observer ejerce la aceptación
      do create AppInstall with
           provider = provider
           user = user          -- AMBOS son signatories ahora
           ...

-- 2. Accepted: ambos son signatories
template AppInstall with
    provider, user : Party
  where
    signatory provider, user    -- acuerdo mutuo
```

**La magia de la autorización**: cuando `provider` ejerce Accept, su firma "fluye" al nuevo contrato `AppInstall` (con `signatory provider, user`). La firma de `user` se hereda del lineage (user creó el Request original). Así se logra consent mutuo sin round-trip de firmas.

**Lo adaptamos 1:1 para**: `CommitmentProposal` (propose) → `CommitmentContract` (accept).

### 2.3 Settlement con Canton Coin (amulet)

`LicenseRenewalRequest_CompleteRenewal` en https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/License.daml ya ejecuta `Allocation_ExecuteTransfer` del token standard de Splice para mover Canton Coin como pago.

**Lo reusamos para**: el choice `Fulfill` de `CommitmentContract` mueve CC al payee.

### 2.4 Codegen contract-first (clave para reducir scope)

**El flujo**:
1. Editas `common/openapi.yaml` (añades paths y schemas)
2. `openApiGenerate` (gradle) → genera interfaces Spring en `backend/build/generated-spring/`
3. `npm run gen:openapi` → genera tipos TS en `frontend/src/openapi.d.ts`
4. Escribes la implementación Java (`service/XxxApiImpl.java`) + la vista React
5. Ambos consumen el mismo contracto

**Implicación**: añadir "crear compromiso / fulfill / dispute / resolve" es **1 edición de OpenAPI + 1 controlador + 1 vista**.

### 2.5 Servicios y puertos del LocalNet

| Servicio | Puerto | Para qué |
|---|---|---|
| Canton participant (gRPC) | 3901 | Ledger API (backend escribe aquí) |
| JSON API V2 | 2975, 3975 | HTTP ledger (onboarding scripts) |
| Splice validator (registry HTTP) | 5012 | Token standard / wallet |
| Backend service | 8080 | Nuestra REST API |
| Frontend (app-provider) | 3000 | UI principal |
| Frontend (app-user) | 2000 | UI user |
| SV/Wallet/Scan UI | 4000 | Admin splice |
| Swagger UI | 9090 | Docs API |
| Postgres | 5432 | PQS |
| Grafana (si observability) | 3030 | Métricas |

---

## 🌐 3. Seaport y deploy a devnet

### 3.1 Lo verificado

- **Seaport (devnet.seaport.to)**: devolvió HTTP 500 al intentar leerlo. No hay docs públicas.
- Es un **wrapper hackathon** mostrado por Jatin Pandya en el workshop del 17 Jun 2026.
- La fundación creó la org **"Encode Hackathon"** con un validator pre-configurado.
- Para que te añadan: **enviar tu party ID a Jatin por Discord**.

### 3.2 Lo que sabemos del flujo (por la charla de Jatin)

1. Login en devnet.seaport.to con Loop Wallet (no requiere invite code)
2. Seleccionar organization "Encode Hackathon"
3. Enviar tu party ID (top right) a Jatin por Discord para que te añada
4. Opciones para deploy:
   - **Upload .dar** directo al validator
   - **Conectar GitHub** repo
   - **Blank contract** (escribir Daml en el IDE web tipo Remix)
5. Deploy al validator "Encode Hackathon" (devnet)

### 3.3 Lo que falta confirmar con Jatin

> **Acción**: pegar estas 3 preguntas en Discord `#❓technical-questions`:

1. ¿Cómo se sube el `.dar` desde Seaport al validator? ¿Upload directo o connect GitHub?
2. ¿Qué URL base del JSON API nos asigna el validator "Encode Hackathon"? (para que el frontend hable con él)
3. ¿Qué formato de party ID espera Seaport? ¿Y cómo authentica el frontend como un party?

### 3.4 Fallback si Seaport no coopera

- **Dev = LocalNet docker** (cn-quickstart `make start`)
- **Live para jueces = LocalNet docker con `make start` + README de 1 comando + video demo**

Los jueces prefieren un LocalNet que funciona que un Seaport roto.

### 3.5 APIs Canton subyacentes (documentados, independientes de Seaport)

| API | URL | Para qué |
|---|---|---|
| JSON Ledger API V2 | `POST /v2/candidates/parties/{partyId}/commands` | Crear contratos, ejercer choices |
| Query ACS | `GET /v2/state/parties/{partyId}/contracts?template_id=Module.Name:Template` | Leer active contracts |
| Validator API | `<base>/api/validator/v0/admin/external-party/topology` | Party topology |
| Auth | JWT bearer por party | Todas las llamadas |

Fuentes:
- https://docs.digitalasset.com/explanations/json-api/index.html
- https://docs.digitalasset.com/build/3.5/tutorials/json_api/canton_and_the_json_ledger_api.html
- https://docs.sync.global/app_dev/validator_api/index.html

---

## 🧩 4. Patrones Daml verificados (para nuestros contratos)

### 4.1 Propose/Accept (heredado del quickstart)
Ver §2.2 arriba. Lo usamos tal cual.

### 4.2 Disclosure on-demand (DisputeCase pattern)
Ver §1.2 arriba. Lo usamos con el árbitro.

### 4.3 "Either signatory can trigger" (del License_Expire)

```daml
choice Commitment_Refund : ()
  with actor : Party
  controller actor
  do require "Actor is a signatory" (actor `elem` signatory this)
     ...
```

Útil para choices donde cualquiera de las partes puede actuar.

### 4.4 `ensure` para validación en creación

```daml
template CommitmentProposal with ...
  where
    signatory payer
    observer payee
    ensure amount > 0.0
    ensure payer /= payee
    ensure deadline > (relTimeToUTC 0)
```

### 4.5 Validación en runtime dentro de choices

```daml
import DA.Assert (assertMsg, assertWithinDeadline)

choice Fulfill : ContractId SettlementReceipt
  controller payer
  do now <- getTime
     assertMsg "Cannot fulfill after deadline" (now < deadline)
     ...
```

---

## 🛡️ 5. Sub-transaction privacy (lo que hace "imposible en Ethereum")

Verificado en https://docs.canton.network/overview/learn/architecture y https://www.canton.io/publications/canton-whitepaper.pdf

> *"Participant nodes only store contracts where their hosted parties are stakeholders."*

**Concretamente**: si una transacción crea 3 contratos (uno visible a A, uno a B, uno a A+B):
- El nodo de A recibe y almacena solo el 1º y el 3º
- El nodo de B recibe y almacena solo el 2º y el 3º
- El mediator/sequencer ve solo estructura ciega (no payloads)

**Para CantonVault**: cuando se crea `DisputeCase`, el nodo del árbitro recibe SOLO el `DisputeCase`, no el `CommitmentContract` que lo originó. Sub-transaction literalmente dividida entre nodos.

**Esto es lo que prueba la demo split-screen**: el cuadrante del competidor está vacío porque su nodo **no recibió** los datos, no porque estén "ocultos".

---

## ⚠️ 6. Lo que NO pudimos verificar (acción requerida)

| Item | Acción | Cuándo |
|---|---|---|
| Seaport DAR upload flow | Preguntar a Jatin en Discord | Semana 1 |
| Seaport JSON API base URL | Preguntar a Jatin en Discord | Semana 1 |
| Seaport party ID format | Preguntar a Jatin en Discord | Semana 1 |
| `Disclosure` interface compila en SDK 3.4.11 | Probar en semana 1 | Semana 1 |
| `daml2ts` status | Evitar; usar OpenAPI → TS | — |
| Multi-tenant operator isolation | No relevante para hackathon | — |
| AND/OR controller combinator exacto | Confirmar al escribir choices | Semana 1 |
| Ecosystem agent (4º) | Relanzar si necesitamos análisis de competencia | Solo si pivotamos |

---

## 📚 Fuentes completas (ordenadas por relevancia)

### Daml language
- https://docs.digitalasset.com/build/3.5/reference/daml/structure.html
- https://docs.digitalasset.com/build/3.4/reference/daml/choices.html
- https://docs.digitalasset.com/build/3.5/tutorials/smart-contracts/parties.html

### Privacy (clave para nuestra demo)
- https://docs.digitalasset.com/overview/3.4/explanations/ledger-model/ledger-privacy.html
- https://docs.canton.network/overview/learn/architecture
- https://www.canton.network/blog/how-canton-network-delivers-institutional-grade-privacy
- https://www.canton.io/publications/canton-whitepaper.pdf
- https://docs.digitalasset.com/build/3.4/sdlc-howtos/applications/develop/explicit-contract-disclosure.html

### cn-quickstart
- https://github.com/digital-asset/cn-quickstart
- https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/AppInstall.daml
- https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/License.daml
- https://docs.digitalasset.com/build/3.5/quickstart/configure/project-structure-overview.html
- https://docs.digitalasset.com/build/3.5/quickstart/download/cnqs-installation.html
- https://docs.digitalasset.com/build/3.4/quickstart/operate/explore-the-demo.html

### Daml.Finance (Disclosure)
- https://github.com/digital-asset/daml-finance
- https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Interface/Util/V3/Disclosure.daml
- https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Util/V4/Disclosure.daml

### Splice / Canton Coin
- https://github.com/hyperledger-labs/splice
- https://github.com/hyperledger-labs/splice/tree/main/cluster/compose/localnet

### JSON API / Validator
- https://docs.digitalasset.com/explanations/json-api/index.html
- https://docs.digitalasset.com/build/3.5/tutorials/json_api/canton_and_the_json_ledger_api.html
- https://docs.digitalasset.com/build/3.5/tutorials/json_api/canton_and_the_json_ledger_api_ts.html
- https://docs.sync.global/app_dev/validator_api/index.html
- https://docs.sync.global/app_dev/api/authentication.html
- https://docs.digitalasset.com/integrate/devnet/preparing-and-signing-transactions/index.html
- https://docs.dev.sync.global/validator_operator/validator_onboarding.html

### npm packages
- https://www.npmjs.com/package/@daml/ledger
- https://www.npmjs.com/package/@canton-network/wallet-sdk
- https://www.npmjs.com/package/@canton-network/core-wallet-auth

### Community
- https://forum.canton.network
- https://github.com/canton-network/wallet

### Forum threads relevantes
- https://forum.canton.network/t/must-controllers-be-signatories/2816
- https://forum.canton.network/t/whats-the-motivation-for-explicit-contract-disclosure-experimental-in-canton-2-7/6682
