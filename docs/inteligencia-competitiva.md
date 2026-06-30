# Inteligencia competitiva — Discord Encode Club (Build on Canton Hackathon)

> Captura del estado del Discord a fecha 2026-06-20.
> Append-only. Actualizar cuando haya nueva señal.

**Fecha de captura**: 2026-06-20 (semana 1, días 5-6 del hackathon)

---

## 🚨 CORRECCIÓN CRÍTICA: Seaport, no CPort

El producto que Jatin llamó "CPort" en el workshop es en realidad **Seaport**.
- URL real: **https://devnet.seaport.to** (NO devnet.c4.io como asumimos)
- Guía oficial de Jatin: https://github.com/Jatinp26/Seaport-Guide
- Video guía oficial: https://youtu.be/uFi9meqpr3c (Canton Foundation — "Get Started with Seaport: Canton Builders Guide")
- Tech Deep Dive: https://youtu.be/1B_ybMiDcKY

**Acción**: leer la guía de Jatin ANTES de empezar la Task 0.1. Resuelve las 3 preguntas que íbamos a mandarle por Discord.

## ✅ Lo que ya sabemos (no hay que preguntar)

| Pregunta | Respuesta | Fuente |
|---|---|---|
| ¿Cómo subo el `.dar`? | Seaport UI (ver guía de Jatin) | Jatin en Discord |
| ¿Necesito invite code? | **NO** | Jatin: "No and No" |
| ¿Necesito whitelist? | **NO** | Jatin |
| ¿Cómo me añaden a Encode org? | DM a Jatin con tu Party ID | Discord |
| ¿Party ID format? | `<32-hex>::1220<64-hex>` (ej: `653ace5802e3c1046cb82c778ed6f82f::12203ca890ecf72ff041a4da4450c613ef0e19603cce34a85896df48be85785a2ef9`) | Discord (IDs reales compartidos) |
| ¿Auth? | Login con Loop wallet en Seaport | Jatin |
| ¿Submissions para checkpoint 21 Jun? | **NO** — Giles: "just slightly confusing vibe coded wording" | Discord |

## ⚠️ Pendiente de confirmar (preguntas que IoMarkets hizo y Jatin NO respondió)

Estas son las preguntas técnicas profundas que IoMarkets planteó y **Jatin NO contestó** públicamente (los derivó al video guía, que probablemente no las cubre):

1. **JSON Ledger API base URL del validator** — ¿es alcanzable desde fuera de Seaport? (IoMarkets usa Cloudflare Workers)
2. **Cómo mintear bearer JWT para la Ledger API** (¿OIDC endpoint, static dev token, exportado del Loop wallet?)
3. **Package ID después de subir el DAR** — ¿dónde se lee?
4. **¿Un Loop wallet = un party, o se pueden alocar múltiples parties?** (IoMarkets necesita 6 parties: operator, custodian, investor A/B, treasury, kyc-provider; nosotros necesitamos ~4: SME, financier, buyer, competitor)

**Si la guía de Jatin no resuelve estas 4, entonces SÍ mandar DM con la pregunta específica** (referenciando que vimos el video pero quedan dudas).

---

## 🥊 COMPETIDORES DETECTADOS

### 🔴 IoMarkets [AIND] — AMENAZA DIRECTA, ALTO PROGRESO

**Lo que construyen** (textual del Discord):
> *"private institutional capital markets: tokenized deposits, private deals, OTC, and an agentic treasury, with privacy enforced by the ledger"*

**Estado**:
- App live: https://iomarkets-io-canton.pages.dev
- Daml model corriendo end-to-end en local Canton via JSON Ledger API
- KYC/KYB attestations + tokenized-deposit DvP escrow ya construidos
- Buscando acceso a testnet/devnet (lo que sugiere que está "listo para deploy")
- **Solo** (igual que nosotros)
- **Mismo track que CantonVault** (Private DeFi / Capital Markets)

**Overlapping con CantonVault**:
- ✅ OTC privado — ambos
- ✅ Privacy enforced by ledger — ambos
- ✅ Escrow — ambos (tokenized-deposit DvP vs conditional commitment)
- ❌ KYC/KYB — solo IoMarkets (nosotros NO)
- ❌ Tokenized deposits — solo IoMarkets (nosotros NO)
- ❌ Agentic treasury — solo IoMarkets (roadmap nuestro fase 3)

**Nuestra diferenciación** (la cuña):
1. **IoMarkets es "privacy as a property"** (de paso, implícito). **Nosotros somos "privacy as the product"** (demostrado visualmente en split-screen).
2. **IoMarkets tiene scope amplio** (más riesgo de mitad horneada). **Nosotros foco** (4 contratos, impecable).
3. **IoMarkets enfoca en RWA settlement** (tokenized deposits). **Nosotros enfocamos en conditional commitment primitive** (selective disclosure on-demand como característica central).
4. **La killer demo split-screen es DIFERENCIADOR**. IoMarkets tiene una app funcional pero menos memorable visualmente. Nosotros tenemos una prueba visual de privacidad en 30 segundos.

**Estrategia vs IoMarkets**: NO competir en amplitud. Ganar en (a) foco, (b) claridad de la tesis de privacidad, (c) demo visual memorable.

### 🟡 Prince Yarjack + Rohith — NHS Ledger (healthcare)

- **NHS Ledger**: Canton-backed budget transparency para NHS (UK healthcare)
- Deployed via **Lovable** (vibe coding)
- URL: https://nhscanton.lovable.app/how-it-works
- Diferente ángulo (public sector / healthcare), no competencia directa
- Prince Yarjack es farmacéutico NHS + Lovable ambassador (no técnico profundo)

### 🟢 Otros (sin proyecto claro aún)

- **Aareonakakanfo [PAY]** — payments (tag PAY). En setup de Seaport.
- **w3_coder [SUI]** — buscando equipo / hire. Ecosistema SUI.
- **Alive24** — fullstack blockchain dev 4 YOE, abierto a equipos. Recurso técnico fuerte.
- **Oxklint [Arc]** — Arc ecosystem. Pidió acceso a Encode org.
- **Godwin [GRIT]** — explorando qué construir.
- **MrLooPer** — primer hackathon, España.
- **Slyrack** — contestó que Daml es el lenguaje (señal de que es pregunta común).
- **Big Dexter** — preguntó prize breakdown (sin respuesta aún).

---

## 🎯 Implicaciones para CantonVault

### 1. Reposicionar ligeramente vs IoMarkets

Nuestro pitch NO debe ser "private capital markets" (eso es IoMarkets). Nuestro pitch debe ser **"the selective disclosure primitive that proves privacy in 30 seconds"**. La diferencia:

| Pitch débil (compite con IoMarkets) | Pitch fuerte (nos diferencia) |
|---|---|
| "Private institutional capital markets" | "The privacy primitive — invoice financing y OTC son los 2 casos de uso del brief oficial donde la privacidad ES el producto" |
| "Privacy enforced by ledger" | "Privacy DEMOSTRADA por ledger — split-screen prueba en 30s lo que IoMarkets asume" |
| "Tokenized deposits + DvP + KYC" (scope amplio) | "4 contratos Daml, 1 primitiva, 2 casos de uso — execution impecable" |

### 2. NO añadir features para competir con IoMarkets

**Tentación a evitar**: ver que IoMarkets tiene KYC y querer añadirlo. **NO**. Eso nos saca de nuestro foco y nos pone a competir en scope (donde ellos ganan).

**Lo que sí**: mencionar KYC como "fase 2 / integración con attestation providers" en roadmap slide. Demostrar que pensamos en ello sin construirlo.

### 3. Preempt la pregunta "¿en qué se diferencia de un RWA settlement app?"

En el deck, slide de "por qué Canton" debe incluir: *"No somos un RWA settlement app más. Somos la primitiva de selective disclosure que esos apps NECESITAN debajo."* Posicionalmente nos pone como capa, no como competidor.

### 4. Aprovechar que IoMarkets está pidiendo acceso devnet

IoMarkets está pidiendo acceso testnet/devnet. Si Jatin les da acceso JSON Ledger API directo (no solo Seaport UI), eso significa que **el path "frontend directo al validator" SÍ es posible** para apps serias. Podemos considerar ese path si Seaport UI nos limita.

---

## 📊 Re-estimación honesta de competencia

| Equipo | Track | Progreso | Amenaza |
|---|---|---|---|
| **IoMarkets** | Private DeFi | 🔴 Alto (live) | 🔴 **Alta** — mismo track, más scope hecho |
| **CantonVault (nosotros)** | Private DeFi | 🟢 Plan listo | — |
| NHS Ledger (Yarjack) | Public sector | 🟡 Live via Lovable | 🟢 Baja (diferente ángulo) |
| Aareonakakanfo [PAY] | Payments | 🟢 Setup | 🟡 Media (pagos) |
| ~50+ equipos (estimación) | variado | desconocido | 🟡 Distribución larga |

**Conclusión**: IoMarkets es el rival a batir en nuestro track. Probabilidad top-3 re-estimada: **~60%** (bajé de 70% por IoMarkets). La killer demo split-screen es ahora MÁS crítica que antes — es lo único que nos diferencia de un competidor que ya está live.

---

## 🚀 Acciones actualizadas para la próxima sesión

### Antes de codear (5 min)
1. **Leer la guía de Jatin**: https://github.com/Jatinp26/Seaport-Guide
2. **Ver el video**: https://youtu.be/uFi9meqpr3c (~10 min)
3. **Crear el proyecto en Encode** (antes del 21 Jun, aunque no haya submission formal): Name `CantonVault`, Description actualizada (ver abajo)
4. **Conseguir Party ID** en devnet.seaport.to y mandar DM a Jatin para que te añada a Encode org

### Description actualizada para Encode (diferenciada de IoMarkets)
```
CantonVault — the selective disclosure primitive for institutional trade finance.
Not another RWA settlement app: the privacy layer underneath. 4 Daml contracts
prove selective disclosure in 30 seconds via a split-screen demo where the
competitor's quadrant is always empty. Invoice financing and OTC block trade
workflows (both literal brief examples), with real Canton Coin settlement.
```

### Durante la implementación
- **Prioridad MÁXIMA a la split-screen demo** (Task 3.6) — es nuestro diferenciador vs IoMarkets
- **NO añadir KYC ni tokenized deposits** (aunque IoMarkets los tenga) — mantener foco
- **Slide anti-IoMarkets implícita**: en "por qué Canton", posicionar como "capa" no como "competidor de RWA apps"

### Monitoreo competitivo
- Revisar Discord cada 2-3 días para detectar nuevos competidores
- Si alguien anuncia split-screen demo o privacy primitive, reaccionar
- Anotar aquí cualquier nueva señal

---

## 📚 Fuentes

- Discord `#general` y `#introductions` (capturado 2026-06-20)
- Jatin's Seaport guide: https://github.com/Jatinp26/Seaport-Guide
- Seaport devnet: https://devnet.seaport.to
- Video oficial: https://youtu.be/uFi9meqpr3c
- IoMarkets live app: https://iomarkets-io-canton.pages.dev
- NHS Ledger: https://nhscanton.lovely.app/how-it-works
