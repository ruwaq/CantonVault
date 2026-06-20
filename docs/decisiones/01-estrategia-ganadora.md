# Decisión 01 — Estrategia ganadora: CantonVault

> **Por qué construimos CantonVault y no otra cosa.**
> Este documento registra el razonamiento completo, las alternativas descartadas y los trade-offs. Cualquier desviación futura del plan debe justificarse contra este documento.

**Fecha**: 2026-06-20
**Decisión**: Construir CantonVault (primitiva de compromiso condicional privado) en vez de (a) CantonEscrow genérico, (b) Agentic commerce puro, (c) Factoring anti-double-factoring, (d) Blind auction M&A.
**Estado**: ✅ Aprobada por el equipo

---

## 🎯 El marco de decisión

Evaluamos 6 candidatos contra 4 ejes:

1. **P(ganar top-3)** — probabilidad realista de quedar en top-3 dado el criterio de evaluación
2. **P(uso real)** — probabilidad de que el producto sobreviva post-hackathon
3. **Riesgo de execution** — probabilidad de NO entregar algo funcional en 4 semanas (1 persona + AI)
4. **Nivel de competencia esperada** — cuántos equipos harán algo similar

---

## 📊 La matriz honesta (la que nadie te muestra)

| Idea | P(ganar top-3) | P(uso real) | Riesgo exec | Competencia | Veredicto |
|---|---|---|---|---|---|
| CantonEscrow B2B (plan original) | 55% | 40% | 🟢 bajo | 🔴 alta | Seguro pero commodity |
| **CantonVault (B2B + ONG)** ⭐ | **70%** | **55%** | 🟢 bajo | 🟡 media | **Elegido — sweet spot** |
| Agentic commerce puro | 35% | 20% | 🔴 alto | 🟢 baja | Wow pero humo |
| Factoring anti-double-factoring | 50% | 75% | 🟡 medio | 🟡 media | Mejor adopción, más scope |
| Blind auction M&A | 30% | 30% | 🔴 alto | 🟢 baja | Nicho, pocos jueces conectan |
| Trust Registry institucional | 25% | 15% | 🟡 medio | 🔴 alta | Infra-for-infra, penalizado |

**Conclusión**: CantonVault maximiza el producto de los 4 ejes simultáneamente sin sacrificar ninguno.

---

## 🧠 Por qué CantonVault gana en los 4 criterios oficiales

### 1. Technical execution (⭐⭐⭐⭐⭐)
- 4 contratos Daml simples basados en **patrones verificados**:
  - Propose/Accept (del cn-quickstart Licensing App)
  - Disclosure interface (de Daml.Finance producción)
- Settlement **real** con Canton Coin (amulet) usando el token standard de Splice — no es mock
- 1 persona + AI lo termina con 1 semana de sobra para pulir

### 2. Originality (⭐⭐⭐⭐)
- Reposicionamiento estratégico: **sales del bucket "escrow"** (5-10 competidores) y entras en **"selective disclosure engine"** (0 competidores)
- El reposicionamiento **cuesta 0 en código** — solo naming + narrativa
- Respuesta killer al juez que diga "¿esto no es un escrow?": *"No. Escrow es UN caso de uso. El mismo contrato que protege los secretos comerciales de María protege la identidad de una familia refugiada. Eso es selective disclosure."*

### 3. UX (⭐⭐⭐⭐⭐)
- La **demo split-screen de 4 cuadrantes** prueba privacidad selectiva en 30 segundos
- Ninguna explicación técnica supera ver el cuadrante del competidor **siempre vacío**
- 3 pantallas: dashboard, crear compromiso, detalle. Cualquier persona las entiende.

### 4. Real-world applicability (⭐⭐⭐⭐⭐)
- **2 verticales con datos verificables**:
  - Comercio cross-border LATAM: $15B mercado, 79% pagos atrasados, 23% fees en $250 cross-border
  - Ayuda humanitaria: WFP distribuye millones con blockchain en Jordania, Bangladesh, Líbano, Ucrania
- **Path a adopción real creíble en 3 verticales** (comercio, ONG, factoring futuro)

---

## ❌ Alternativas descartadas y por qué

### CantonEscrow B2B genérico (plan original)
**Por qué se descartó**: "Escrow" es el sub-tema más commodity del track más transitado. Los jueces verán 5-10 escrows. El concepto no diferencia, solo el execution. CantonVault conserva **toda** la simplicidad técnica del escrow pero reposiciona la narrativa.

**Qué se conservó**: los 4 contratos base, la demo split-screen, el flujo Propose/Accept, el deploy en CPort.

### Agentic commerce puro
**Por qué se descartó**:
- Requiere un LLM en el path crítico → puede fallar en la demo
- "Agentes que pagan" es hype 2026, no realidad 2026
- El brief advierte explícitamente: *"not just demos with an AI wrapper"*
- 80% de equipos que lo intenten entregarán humo

**Qué se conservó**: 1 slide de visión en el deck — "esta misma primitiva puede gobernar agentes en el futuro". No es feature, es roadmap.

### Factoring anti-double-factoring
**Por qué se descartó**:
- Requiere modelar Invoice + FinancingOffer + Agreement + Settlement + chequeo cruzado = 5-6 contratos
- Lógica financiera real con riesgo de bugs
- Con 1 persona, el riesgo de llegar al deadline con contratos a medio testear es alto

**Qué se conservó**: **visión fase 2** en el pitch. Se menciona como vertical de expansión natural cuando Canton onboarde más bancos (HSBC ya piloteó).

### Blind auction M&A
**Por qué se descartó**:
- Nicho: pocos jueces conectan emocionalmente con M&A
- Complejidad criptográfica alta (commit-reveal, VRF)
- Mercado percibido como "pequeño" por jueces no financieros

### Trust Registry institucional
**Por qué se descartó**:
- Es **infra-for-infra's-sake** — justo lo que los jueces penalizan
- No tiene usuario final visible en la demo
- 1-2 contratos extra que no aportan a la narrativa de 3 minutos

---

## ⚠️ Los 5 hallazgos críticos que corregimos del plan original

El plan original (CantonEscrow) tenía 5 problemas que lo habrían dejado fuera de top-3. CantonVault los resuelve todos:

| # | Hallazgo | Plan original | CantonVault |
|---|---|---|---|
| 1 | Deploy era incorrecto | Docker Compose + LocalNet solo | **CPort devnet (lo que pidió Jatin)** + LocalNet para dev |
| 2 | Privacidad del árbitro no resuelta | Arbiter como observer → ve todo desde el minuto 1 | **DisputeCase on-demand** + **Disclosure interface** → arbiter no ve nada hasta disputa |
| 3 | Pitch LATAM mezclaba problemas no resueltos por Canton | "23% fees, más rápido que SWIFT" | Trust sin intermediario que ve tus datos (lo que Canton SÍ garantiza) |
| 4 | Agentic era el tema más original y lo descartábamos | Fuera del scope | Slide de visión — "esta primitiva puede gobernar agentes" |
| 5 | Escrow es commodity | Nombre y pitch sobre "escrow" | **CantonVault** — primitiva de privacidad, no producto de escrow |

---

## 🧪 El "test de Ethereum" (la prueba de que pertenecemos a Canton)

> Si tu app funciona igual de bien en Ethereum, los jueces te descartarán.

| Requisito | Ethereum | Canton (nosotros) |
|---|---|---|
| Escrow con condiciones | ✅ | ✅ |
| Términos privados | ❌ todo público | ✅ |
| Árbitro ve solo si hay disputa | ❌ ve todo o nada | ✅ |
| Competidor no sepa del deal | ❌ imposible | ✅ |
| Recibo verificable sin exponer partes | ❌ | ✅ |

**Respuesta al juez que pregunte por zksnarks**: *"Con zksnarks puedes ocultar el monto, pero no puedes dar disclosure selectivo a un árbitro solo en caso de disputa — porque en Ethereum el contrato existe para todos. En Canton el contrato no existe para quien no está listado."*

---

## 🧪 El "test del VP de banco" (la prueba de aplicabilidad real)

> ¿Puedes explicarlo en 30 segundos a alguien no técnico?

*"Es como un depósito en garantía, pero digital, instantáneo, y donde solo tú y tu contraparte saben los detalles del acuerdo. Ni siquiera tu banco puede ver los términos."*

✅ Cualquier persona de negocios entiende esto.

---

## 🔄 Cómo saber si esta decisión sigue siendo correcta (checkpoints)

En cada checkpoint del hackathon, validar:

- [ ] **Semana 1**: ¿CPort devnet funciona y acepta nuestro `.dar`? Si no, fallback a LocalNet dockerizado con instrucciones claras.
- [ ] **Semana 2**: ¿La Disclosure interface de Daml.Finance compila en nuestra versión del SDK? Si no, fallback al patrón DisputeCase manual.
- [ ] **Semana 3**: ¿La demo split-screen se ve convincente en video? Si no, simplificar a 2 cuadrantes (partes + competidor).
- [ ] **Semana 4**: ¿El settlement real con Canton Coin funciona? Si no, fallback a settlement simbólico con receipt.

---

## 📚 Fuentes que validan esta decisión

- Workshop de Jatin Pandya (DevRel Canton Foundation) — 17 Jun 2026: deploy en CPort devnet requerido
- Workshop de Shreyas Kutty (Digital Asset) — 17 Jun 2026: tracks y criterios oficiales
- `digital-asset/cn-quickstart` Licensing App — patrón Propose/Accept verificado
- `digital-asset/daml-finance` Disclosure interface — patrón de disclosure verificado
- `docs.canton.network` architecture — sub-transaction privacy garantizada a nivel protocolo
- Análisis de ecosistema: 0 apps de B2B payments / selective disclosure en Canton (gap real)
