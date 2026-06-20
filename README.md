# CantonVault — Build on Canton Hackathon

> **Privacy-first conditional commitments for institutional trade finance.**
> Una primitiva de compromiso condicional privado donde la privacidad es propiedad emergente
> del stakeholder-scoping, no una capa criptográfica bolted-on. Invoice financing privado
> y OTC block trades privados, con settlement atómico nativo en Canton Coin.

[![Hackathon](https://img.shields.io/badge/Build%20on%20Canton-2026-blue)](https://www.encodeclub.com/programmes/canton-hackathon)
[![Status](https://img.shields.io/badge/status-Diseño%20aprobado-green)]()
[![Track](https://img.shields.io/badge/Track-3%20Payments%20%2F%20TradeFi-purple)]()

---

## 📖 Qué es CantonVault

**El problema**: En finanzas institucionales, las partes necesitan compartir lo mínimo necesario para ejecutar — **sin exponer portfolio completo, sin revelar factorización, sin leakage de pricing a competidores**. Hoy no existe infraestructura de selective disclosure nativa. Resultado: double-factoring en invoice financing (pérdidas de miles de millones), leakage de block orders OTC (movimientos de mercado en contra), y compliance pesado con Basel III / MiCA / FATF Travel Rule.

**La solución**: Un contrato Daml que actúa como compromiso condicional privado donde:
- Las partes (SME/Financier, Dealer A/Dealer B) ven el compromiso y sus condiciones
- Un tercero (Buyer, Clearing) no ve **nada** hasta que se le otorga disclosure selectivo on-demand
- Un competidor o mercado externo conectado al mismo nodo ve un **ledger vacío**
- El settlement ocurre atómicamente en Canton Coin (burn-mint equilibrium)

**El insight que gana**: la privacidad no es una capa criptográfica bolted-on (Canton Foundation: *"opacity is a liability, privacy without proof isn't privacy"*). Es la **propiedad emergente del stakeholder-scoping a nivel protocolo** — el nodo del competidor literalmente no recibe los datos.

## 🎬 Los 2 escenarios de demo (100% institucionales, literales del brief oficial)

- **Invoice Financing Privado** (Track 1): SME factoriza factura → Financier adelanta cash → Buyer nunca sabe que se factorizó. Previene double-factoring.
- **OTC Block Trade Privado** (Track 1/3): Dealer A ↔ Dealer B negocian bloque → Clearing ve solo netting → Mercado no puede front-runear lo que no ve.

---

## 🎯 Por qué gana este hackathon (resumen ejecutivo)

| Criterio oficial | Cómo lo ganamos | Score |
|---|---|---|
| Technical execution | 4 contratos Daml basados en patrones verificados (Propose/Accept + Disclosure interface de Daml.Finance) + settlement REAL con Canton Coin (non-negotiable) | ⭐⭐⭐⭐⭐ |
| Originality | Reposicionamiento: no competimos en "escrow" ni en "privacy engine genérico" → competimos en "privacy como propiedad emergente del stakeholder-scoping" | ⭐⭐⭐⭐⭐ |
| UX | Demo split-screen de 4 cuadrantes: prueba privacidad selectiva en 30 segundos (cuadrante del competidor SIEMPRE vacío) | ⭐⭐⭐⭐⭐ |
| Real-world applicability | 2 verticales institucionales LITERALES del brief oficial + marco regulatorio verificable (Basel III, MiCA, FATF) | ⭐⭐⭐⭐⭐ |

**Total: 20/20** — y pitch 100% alineado con lo que Canton Foundation pidió

## 💰 El premio real NO son los $7,000

- **62% del pool de Cantonomics rewards (~516M CC/mes)** va a "featured apps que generan transaction utility"
- Protocol Development Fund grants pagados en CC, atados a milestones
- **Pitch para Featured App status + grant pipeline**, no solo prize money
- → Canton Coin settlement **NON-NEGOTIABLE**: sin eso perdemos el único feature que nos hace económicamente nativos

---

## 🗺️ Navegación de la documentación

Este repositorio es la **"biblia" del proyecto**. Toda decisión, herramienta, y hallazgo está documentado para que cualquier persona (humano o AI) pueda continuar el trabajo sin perder contexto.

### 📚 Documentos principales

| Doc | Para qué sirve | Cuándo leer |
|---|---|---|
| [**docs/README.md**](docs/README.md) | Índice completo de documentación | **Empezar aquí siempre** |
| [**docs/decisiones/01-estrategia-ganadora.md**](docs/decisiones/01-estrategia-ganadora.md) | Por qué CantonVault y no otra idea. Trade-offs de las alternativas descartadas. | Entender el porqué del rumbo |
| [**docs/decisiones/02-arquitectura-tecnica.md**](docs/decisiones/02-arquitectura-tecnica.md) | Stack, contratos Daml, infraestructura, extensiones al cn-quickstart | Antes de escribir código |
| [**docs/decisiones/03-posicionamiento-pitch.md**](docs/decisiones/03-posicionamiento-pitch.md) | Naming, tagline, narrativa, script del video de 3 min | Para grabar el pitch y armar el deck |
| [**docs/herramientas.md**](docs/herramientas.md) | Inventario verificado de SDKs, librerías, URLs, versiones | Antes de instalar cualquier cosa |
| [**docs/investigacion-tecnica.md**](docs/investigacion-tecnica.md) | Hallazgos de la investigación profunda sobre Daml, Canton, cn-quickstart | Cuando una decisión técnica necesite justificación |

### 📐 Specs (superpowers workflow)

| Spec | Estado | Descripción |
|---|---|---|
| [docs/superpowers/specs/2026-06-20-cantonvault-design.md](docs/superpowers/specs/2026-06-20-cantonvault-design.md) | 📝 Borrador | Diseño técnico formal |

### 🎬 Entregables del hackathon

- [ ] Repositorio público (este)
- [ ] Presentation deck (máx 10 slides)
- [ ] Video pitch de 3 min con demo
- [ ] Link a producto live (CPort devnet)
- [ ] README de setup (1 comando)

---

## ⚙️ Stack tecnológico (resumen)

```
┌─────────────────────────────────────────┐
│  Frontend: React 18 + TypeScript + Vite │  ← del cn-quickstart
│  + TailwindCSS (premium, institucional) │
├─────────────────────────────────────────┤
│  Contract: common/openapi.yaml          │  ← FUENTE ÚNICA de verdad
├─────────────────────────────────────────┤
│  Backend: Java 21 + Spring Boot 3.4     │  ← del cn-quickstart
│  Writes: gRPC → Canton participant      │
│  Reads:  PQS (Postgres SQL sobre ACS)   │
├─────────────────────────────────────────┤
│  Smart Contracts: Daml 3.4.11           │  ← NUESTRO código
│  • CommitmentProposal                   │
│  • CommitmentContract (Disclosure)      │
│  • DisputeCase (arbiter on-demand)      │
│  • SettlementReceipt                    │
│  + Settlement real con Canton Coin (amulet) │
├─────────────────────────────────────────┤
│  Dev:    cn-quickstart Docker LocalNet  │
│  Live:   CPort devnet.c4.io (.dar upload) │
└─────────────────────────────────────────┘
```

Ver [docs/herramientas.md](docs/herramientas.md) para versiones y URLs verificadas.

---

## 🗓️ Plan de ejecución (4 semanas)

| Semana | Fechas | Foco | Entregable |
|---|---|---|---|
| **1** | 15-21 Jun | Setup + modelado Daml | Proyecto creado en Encode, contratos Daml base compilando |
| **2** | 22-28 Jun | Backend + OpenAPI + integración | Endpoints funcionando contra LocalNet |
| **3** | 29 Jun-5 Jul | Frontend + killer demo (split-screen) | App end-to-end, 2 escenarios (B2B + ONG) |
| **4** | 6-13 Jul | Pitch + video + submission | Repo público, deck, video 3min, live link |

Detalle completo: [docs/superpowers/specs/](docs/superpowers/specs/)

---

## 🚀 Setup rápido (cuando empecemos a codear)

```bash
# 1. Clonar el scaffolding base
git clone https://github.com/digital-asset/cn-quickstart
cd cn-quickstart/quickstart

# 2. Setup interactivo (elige AUTH_MODE, PARTY_HINT, etc.)
make setup

# 3. Build completo (frontend + backend + daml + docker)
make build

# 4. Levantar el LocalNet
make start

# 5. UI disponible en:
#    App-provider: http://app-provider.localhost:3000
#    App-user:     http://app-user.localhost:2000
#    SV/Wallet:    http://sv.localhost:4000
```

> ⚠️ **Requisitos**: Docker con 8GB+ RAM asignados, Java 21 (Temurin), Node 20+.

---

## 🆘 Obtener ayuda durante el hackathon

| Canal | Para qué | Quién responde |
|---|---|---|
| **Discord Encode Club** (canal `#❓technical-questions`) | Dudas técnicas de Daml/Canton | Jatin Pandya (DevRel), equipo Encode |
| **forum.canton.network** (sección App Development) | Dudas profundas de arquitectura | Comunidad Canton |
| **docs.canton.network AI assistant** (botón "ask assistant") | Q&A rápido en lenguaje natural | AI de la docs |
| **devhub.canton.foundation** | Descubrir tools existentes | Canton Foundation |

---

## 📜 Licencia

Por definir (probablemente Apache 2.0 o 0BSD, alineado con DA / cn-quickstart).

---

**Última actualización**: 2026-06-20
**Estado**: Diseño aprobado, listo para implementación
