# 🚀 HANDOFF — Próxima sesión

> **Lee esto PRIMERO al iniciar la próxima sesión de código.**
> Te dice exactamente qué hacer, en qué orden, y el contexto mínimo necesario.

**Fecha de este handoff**: 2026-06-20
**Sesión que lo escribió**: brainstorming + plan completo
**Estado**: ✅ Diseño y plan listos. Cero código todavía. Listo para empezar a programar.

---

## ⚡ Qué hacer primero (orden estricto)

### PASO 0 — Antes de abrir el editor (hoy mismo, ~5 min)

**Copia y pega este mensaje en el Discord de Encode Club, canal `#❓technical-questions`** (etiqueta a @Jatin):

```
Hi @Jatin — building CantonVault (privacy-first conditional commitment primitive
for invoice financing + OTC block trades on Canton). Three CPort questions:

1. Once my .dar is built, what's the exact upload path in CPort to deploy it
   to the Encode Hackathon validator?
2. What JSON API base URL does CPort assign to my deployed app? (so my
   frontend can talk to it)
3. What party ID format does CPort expect, and how does the frontend
   authenticate as a party?

My CPort party ID is: <PON AQUÍ TU PARTY ID de devnet.c4.io (top-right)>
Please add me to the Encode Hackathon org. Thanks!
```

> Para conseguir tu party ID: entra a https://devnet.c4.io, loguéate con Loop wallet, copia el ID de la esquina superior derecha.

**Esto NO bloquea las fases de código**, pero bloquea el deploy a CPort (Task 4.1). Lanzándolo hoy tienes 1-2 semanas de margen.

---

### PASO 1 — Al iniciar la sesión de código

1. **Lee el plan**: `docs/superpowers/plans/2026-06-20-cantonvault-implementation.md`
2. **Lee el spec**: `docs/superpowers/specs/2026-06-20-cantonvault-design.md`
3. **Ejecuta desde Task 0.1** del plan (clonar cn-quickstart)

No necesitas releer los `docs/decisiones/*` para empezar a codear — solo si te preguntas "¿por qué hicimos X?". El spec + el plan tienen todo lo necesario para Phase 0-1.

---

## 📂 Mapa de documentación (qué leer cuando)

| Si necesitas... | Lee |
|---|---|
| Saber qué construir ahora | `docs/superpowers/plans/2026-06-20-cantonvault-implementation.md` (sigue las Tasks en orden) |
| Entender el diseño técnico | `docs/superpowers/specs/2026-06-20-cantonvault-design.md` |
| Justificar una decisión estratégica | `docs/decisiones/01-estrategia-ganadora.md` |
| Ver detalles de un contrato Daml o stack | `docs/decisiones/02-arquitectura-tecnica.md` |
| Material del pitch / video / deck | `docs/decisiones/03-posicionamiento-pitch.md` |
| Instalar algo o verificar una versión | `docs/herramientas.md` |
| Saber por qué se decidió algo técnico | `docs/investigacion-tecnica.md` |

---

## 🎯 Las 3 tareas MÁS críticas del plan (no fallar)

1. **Task 0.3** — Preguntas a Jatin (lanza HOY, ver PASO 0)
2. **Task 1.4** — Test de privacidad (foundation de la killer demo). Si no pasa, el producto no demuestra privacidad.
3. **Task 1.6b** — Canton Coin settlement REAL (**NON-NEGOTIABLE**). Es lo que nos hace económicamente nativos. Budget 2x tiempo. Si te trabas >4h, pregunta a Jatin en Discord con el error exacto.

---

## 🗓️ Calendario del hackathon (no perder deadlines)

| Fecha | Evento | Estado |
|---|---|---|
| ✅ 15 Jun | Launch | pasado |
| ✅ 17 Jun | Tech Deep Dive (Jatin) | pasado |
| ⚠️ **21 Jun 23:59 UTC-12** | **CREAR PROYECTO en Encode + equipo** | **URGENTE — hazlo ya si no lo hiciste** |
| 23 Jun 14:00 CEST | Canton Ecosystem Overview | asistir |
| 28 Jun | Mid-hackathon checkpoint | fecha interna |
| 12 Jul | Deadline final de submission | fecha dura |
| 13 Jul 13:59 CEST | Finale | top equipos pitchen |

> **Acción urgente PASO 0.5**: si aún no creaste el proyecto en https://www.encodeclub.com/programmes/canton-hackathon, hazlo ANTES del 21 Jun. Name: `CantonVault`. Description: *"Privacy-first conditional commitments for institutional trade finance. A Daml primitive that proves selective disclosure on Canton Network through invoice financing and OTC block trade workflows, with real Canton Coin settlement."*

---

## 🔧 Resumen técnico (lo que recordar sin releer todo)

- **Stack**: Daml 3.4.11 + Splice 0.5.3 + Java 21 Spring Boot 3.4 + React 18 + Vite + TailwindCSS
- **Base**: `digital-asset/cn-quickstart` (clone dentro de este repo)
- **Patrones clave**:
  - Propose/Accept (de `AppInstall.daml`)
  - Disclosure on-demand (DisputeCase separado, thirdParty NO es observer del CommitmentContract)
  - Canton Coin settlement (`Allocation_ExecuteTransfer` del token standard, ver `License.daml`)
- **Regla de oro de privacidad**: el thirdParty **NUNCA** es controller de choices sobre `CommitmentContract` (divulgence). Sus choices viven en `DisputeCase`.
- **4 contratos**: `CommitmentProposal` → `CommitmentContract` → `DisputeCase` / `SettlementReceipt`
- **2 escenarios demo**: Invoice Financing (SME/Financier/Buyer) + OTC Block Trade (Dealer A/Dealer B/Clearing)
- **Pitch**: sin "23% fees", sin "imposible en Ethereum", sin LATAM/ONG. Honesto y defendible.

---

## 📊 Estado del repositorio

```
0078671  plan: implementation plan de CantonVault
47a6652  spec: design doc formal de CantonVault
336267c  docs(v2): pivot institucional
253b844  docs: estrategia, arquitectura, pitch, herramientas e investigacion
```

```
Build on Canton Hackathon/
├── README.md
├── HANDOFF.md                       ← ESTO (empieza aquí)
├── docs/
│   ├── README.md                    ← índice completo
│   ├── decisiones/
│   │   ├── 01-estrategia-ganadora.md
│   │   ├── 02-arquitectura-tecnica.md
│   │   └── 03-posicionamiento-pitch.md
│   ├── herramientas.md
│   ├── investigacion-tecnica.md
│   └── superpowers/
│       ├── specs/2026-06-20-cantonvault-design.md
│       └── plans/2026-06-20-cantonvault-implementation.md  ← EL PLAN
└── (cn-quickstart/ se clona en la próxima sesión — gitignored)
```

---

## ✅ Checklist para la próxima sesión

- [ ] PASO 0: Mensaje a Jatin enviado en Discord (con tu party ID)
- [ ] PASO 0.5: Proyecto creado en Encode Club (antes del 21 Jun)
- [ ] Abrir `docs/superpowers/plans/2026-06-20-cantonvault-implementation.md`
- [ ] Empezar desde Task 0.1 (clonar cn-quickstart)
- [ ] Seguir las Tasks en orden estricto (cada una es bite-sized)
- [ ] Commitear después de cada test verde (TDD discipline)
- [ ] Usar `docs/DECISION-LOG.md` para registrar sorpresas, decisiones de implementación, respuestas de Jatin

---

## 💡 Tips para la sesión de código

- **El plan es TDD riguroso**: cada contrato/endpoint/vista tiene test PRIMERO. Respétalo — Daml tiene errores de tipo sutiles que los tests atrapan temprano.
- **Daml SDK learning curve**: si nunca escribiste Daml, dedica las primeras 2 horas a leer `License.daml` y `AppInstall.daml` del quickstart. Son tus cheat sheets.
- **Subagent-driven**: si ejecutas con subagents, cada Task del plan es una unidad perfecta para un subagent fresco (instrucciones precisas, archivo concreto, test claro).
- **Si te trabas en Canton Coin settlement (Task 1.6b)**: NO caigas en el fallback simbólico. Es NON-NEGOTIABLE. Pregunta a Jatin con el error exacto.

**Buena suerte. Tienes un plan sólido, basado en investigación honesta, alineado con lo que Canton pidió. Ejecútalo.**
