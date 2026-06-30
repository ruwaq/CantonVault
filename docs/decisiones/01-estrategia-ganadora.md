# Decisión 01 — Estrategia ganadora: CantonVault

> **Por qué construimos CantonVault y no otra cosa.**
> Este documento registra el razonamiento completo, las alternativas descartadas y los trade-offs. Cualquier desviación futura del plan debe justificarse contra este documento.

**Fecha**: 2026-06-20 (revisión v2: 2026-06-20 tras investigación de mercado y strategic-fit; revisión v3: 2026-06-20 tras inteligencia competitiva del Discord)
**Decisión**: Construir CantonVault (primitiva de compromiso condicional privado) como **infraestructura institucional de trade finance con selective disclosure** y settlement nativo en Canton Coin.
**Estado**: ✅ Aprobada por el equipo

---

## 🥊 Revisión v3 — Competidor directo detectado: IoMarkets

> Tras monitorear el Discord de Encode Club el 2026-06-20, detectamos un competidor directo serio. Detalle completo en `docs/inteligencia-competitiva.md`.

**IoMarkets [AIND]** está construyendo: *"private institutional capital markets: tokenized deposits, private deals, OTC, and an agentic treasury, with privacy enforced by the ledger"*. App ya live, Daml model end-to-end, KYC/KYB attestations + tokenized-deposit DvP escrow. **Más avanzado que nosotros.**

**Nuestra respuesta estratégica**: NO competir en amplitud (perdemos). Competir en **foco + claridad de la tesis de privacidad**:

| Dimensión | IoMarkets | CantonVault (nosotros) |
|---|---|---|
| Scope | Amplio (KYC + custody + RWA + treasury + OTC) | **Foco**: primitiva de selective disclosure |
| Diferenciador | RWA settlement con privacidad de paso | **Privacidad como producto visual** (split-screen) |
| Demo | App funcional (menos memorable) | **Demo visual que golpea** en 30s |
| "Por qué Canton" | Implícito | **Explícito y demostrable** (cuadrante vacío) |

**Regla**: NO añadir KYC, ni tokenized deposits, ni treasury, para competir. Eso nos saca del foco. Posicionarnos como **"la primitiva de privacidad DEBAJO de los RWA settlement apps como IoMarkets"** (capa, no competidor).

**Re-estimación de P(ganar top-3)**: 70% → **60%** (IoMarkets es rival real). La killer demo split-screen es ahora MÁS crítica — es lo único que nos diferencia.

---

## 🎯 El marco de decisión

Evaluamos 6 candidatos contra 4 ejes:

1. **P(ganar top-3)** — probabilidad realista de quedar en top-3 dado el criterio de evaluación
2. **P(uso real)** — probabilidad de que el producto sobreviva post-hackathon
3. **Riesgo de execution** — probabilidad de NO entregar algo funcional en 4 semanas (1 persona + AI)
4. **Nivel de competencia esperada** — cuántos equipos harán algo similar

---

## 📊 La matriz honesta

| Idea | P(ganar top-3) | P(uso real) | Riesgo exec | Competencia | Veredicto |
|---|---|---|---|---|---|
| CantonEscrow B2B LATAM (plan original v1) | 40% | 20% | 🟢 bajo | 🔴 alta | Commodity + claims falsos + no resuena con Canton |
| CantonVault B2B + ONG (plan v1) | 45% | 25% | 🟢 bajo | 🟡 media | Mezcla institucional con consumer/retail |
| **CantonVault institucional (TradeFi + OTC) (v2)** ⭐ | **70%** | **60%** | 🟢 bajo | 🟢 baja | **Elegido — encaja con brief literal de Canton** |
| Agentic commerce puro | 35% | 20% | 🔴 alto | 🟢 baja | Wow pero humo, brief avisa contra "AI wrapper" |
| Factoring anti-double-factoring puro | 50% | 75% | 🟡 medio | 🟡 media | Es CantonVault con menos versatilidad |
| Inter-company cross-currency netting | 40% | 60% | 🔴 alto | 🟢 baja | Multi-currency settlement fuera de scope 4 sem |
| Blind auction M&A | 30% | 30% | 🔴 alto | 🟢 baja | Pocos jueces conectan; cripto complejo |
| Trust Registry institucional | 25% | 15% | 🟡 medio | 🔴 alta | Infra-for-infra, penalizado |

**Conclusión**: CantonVault institucional (v2) maximiza el producto de los 4 ejes **y** alinea con lo que Canton Foundation pidió explícitamente en el brief del hackathon.

---

## 🔑 Hallazgo crítico de la investigación v2 (la razón del pivot de pitch)

> **El brief oficial del hackathon lista literalmente los casos de uso que CantonVault cubre.**

Leí los tracks oficiales publicados por Encode Club + Canton Foundation:

- **Track 1 (Private DeFi & Capital Markets)**: *"confidential lending, OTC trading workflows, private deal execution, **invoice financing**"*
- **Track 2 (TradeFi, RWA & Tokenized Assets)**: *"**invoice or supply chain financing**, inter-company cross-currency netting, tokenized deposits, enterprise workflows using tokenized real-world assets"*
- **Track 3 (Payments, Neobanking & Agentic Commerce)**: *"payments infrastructure, **treasury / business banking workflows**"*

**CantonVault v2 responde textualmente a Tracks 1, 2 y 3** sin forzar nada. El pivote de "B2B LATAM" → "trade finance institucional" nos mueve de "app consumer/retail sobre chain institucional" a "infraestructura institucional que Canton pidió".

---

## 🧠 Por qué CantonVault v2 gana en los 4 criterios oficiales

### 1. Technical execution (⭐⭐⭐⭐⭐)
- 4 contratos Daml basados en **patrones verificados**:
  - Propose/Accept (del cn-quickstart Licensing App)
  - Disclosure interface (de Daml.Finance producción)
- Settlement **real** con Canton Coin (amulet) usando el token standard de Splice — **non-negotiable**, es lo que nos hace económicamente nativos (ver "El premio real" abajo)
- 1 persona + AI lo termina con 1 semana de sobra para pulir

### 2. Originality (⭐⭐⭐⭐)
- Reposicionamiento: **sales del bucket "escrow"** (5-10 competidores) y entras en **"privacy primitive for institutional trade finance"** (0 competidores en Canton)
- El reposicionamiento **cuesta 0 en código** — solo naming + narrativa
- **No competimos en "privacy engine" genérico** (Canton penaliza eso — *"opacity is a liability, privacy without proof isn't privacy"*) sino en **"privacy como propiedad emergente del stakeholder-scoping + atomic settlement"**
- Respuesta killer al juez que diga "¿no es esto un escrow?": *"No. Escrow es UN caso de uso. Esto es la primitiva de compromiso condicional privado que subyace a invoice financing, OTC, y supply chain — todos casos de uso que Canton pidió en el brief."*

### 3. UX (⭐⭐⭐⭐⭐)
- La **demo split-screen de 4 cuadrantes** prueba privacidad selectiva en 30 segundos
- El cuadrante del competidor / 3rd party siempre vacío es el golpe visual
- 3 pantallas: dashboard, crear compromiso, detalle

### 4. Real-world applicability (⭐⭐⭐⭐⭐)
- **2 verticales institucionales con demanda regulada verificada**:
  - **Invoice financing privado**: demanda real (SMEs temen double-factoring; financiers temen adverse selection)
  - **OTC block trade privado**: demanda real (competencia no debe ver precio/size antes de exec; clearing no debe ver portfolio completo)
- **Marco regulatorio que exige selective disclosure** (verificado):
  - Basel III / IV: reporting de risk exposure on-demand, posiciones comerciales confidenciales a competidores
  - MiCA (EU 2023/1114, en vigor 2024): reporting a autoridades, confidencialidad comercial preservada
  - FATF Travel Rule (umbral bajado a $1,000 en Oct 2024): counterparty info disponible a autoridades on-trigger, no broadcast
  - ISDA Master Agreements: términos confidenciales + defaults observables

---

## ❌ Alternativas descartadas y por qué

### CantonEscrow B2B LATAM (plan v1 original)
**Por qué se descartó**: 5 problemas letales descubiertos en la investigación:
1. **"23% fees en $250" mal aplicado**: ese dato es de World Bank Remittance Prices para remesas consumidor de $200-500. En B2B real de $8,000 el costo es 0.5-1.5%. Un juez VP de banco lo nota y destruye credibilidad.
2. **"Tu banco ve tus márgenes" falso**: el banco que ejecuta un pago ve monto y partes, no tu costo base. Tus márgenes viven en tu contabilidad.
3. **Two-party onboarding**: ambos necesitan wallet Canton + Canton Coin. Mismo problema que mató Contour (2023), we.trade (2022), Marco Polo (2023), TradeLens (2022).
4. **Trade Credit Insurance es mejor**: Allianz Trade, Coface dejan al buyer pagar a 60 días (escrow le bloquea cash hoy).
5. **No hay fiat off-ramp con licencia VASP** en MX (Ley Fintech/CNVB), BR (Lei 14.478), AR (BCRA). Sin eso no se liquida valor real.

**Qué se conservó**: los 4 contratos base, la demo split-screen, el flujo Propose/Accept, el deploy en Seaport, Canton Coin settlement.

### CantonVault B2B + ONG (plan v1 intermedio)
**Por qué se descartó**:
- **0 menciones de "NGO", "humanitarian", "LATAM", "remittance" en canton.network o canton.foundation** (búsqueda site-wide verificada)
- Canton Foundation está focalizada en capital markets + stablecoins institucionales, no impacto social
- El ángulo emocional ONG puede confundir al juez sobre "¿es esto una app institucional o consumer?"
- **WFP Building Blocks es 100% real** (4.8M hogares, 159 orgs, $288M, países: Jordania, Bangladesh, Ucrania, Siria, Palestina) — pero eso no significa que Canton Foundation quiera ese mercado

**Qué se conservó**: cero. Se elimina limpiamente. Si en el futuro Canton expande a ONG, la primitiva ya está construida.

### Agentic commerce puro
**Por qué se descartó**:
- Requiere LLM en path crítico → puede fallar en la demo
- El brief advierte explícitamente: *"not just demos with an AI wrapper"*
- 80% de equipos que lo intenten entregarán humo

**Qué se conservó**: mención como visión "fase 3" en roadmap. No es feature, es dirección futura.

### Factoring anti-double-factoring puro
**Por qué se descartó como producto entero**:
- Es básicamente CantonVault con el escenario 1 como producto entero → menos versatilidad
- Requiere modelar Invoice + FinancingOffer + Agreement + Settlement + chequeo cruzado si lo hacemos "complejo"
- Mejor: lo incluimos COMO escenario de demo, no como producto separado

**Qué se conservó**: es nuestro escenario de demo principal.

### Blind auction M&A, Trust Registry institucional
**Por qué se descartaron**:
- M&A: nicho, pocos jueces conectan, cripto complejo (commit-reveal, VRF)
- Trust Registry: infra-for-infra, sin usuario final visible

---

## ⚠️ Los 5 riesgos del plan v1 y cómo v2 los resuelve

| # | Riesgo en v1 | Resolución en v2 |
|---|---|---|
| 1 | "23% fees" factualmente mal aplicado | **Eliminado**. Sin datos de fees en el pitch |
| 2 | "Tu banco ve tus márgenes" falso | Reemplazado por *"counterparties y third parties ven el monto y las partes; CantonVault elimina la necesidad de exponer el deal"* |
| 3 | "Imposible en Ethereum" falso en 2026 | Reemplazado por *"en Ethereum puedes construir esto con ZK — a 10x el coste en ingeniería, con fuga de metadatos, sin settlement atómico nativo"* |
| 4 | ONG/LATAM no resuena con Canton | **Eliminado**. Demo 100% institucional (TradeFi + OTC) |
| 5 | Canton Coin settlement opcional (fallback simbólico) | **Non-negotiable**. Es lo que nos hace económicamente nativos |

---

## 🧪 El "test de Ethereum" — versión honesta y defendible (v2)

> ⚠️ **IMPORTANTE**: la afirmación *"imposible en Ethereum"* es **falsa en 2026** y un juez ZK-literate la destruye. Esta es la versión correcta.

| Requisito | Canton | Ethereum (con ZK + AA) | Veredicto honesto |
|---|---|---|---|
| Compromiso condicional privado | ✅ nativo (4 templates Daml, ~120 líneas) | ✅ posible pero requiere circuits (Aztec/Noir, ~1000 líneas) | Canton 3x más fácil |
| Privacidad de términos | ✅ protocol-level: el nodo NO recibe datos | 🟡 datos existen pero cifrados; pruebas ZK | Canton más fuerte (data non-existence) |
| Árbitro ve solo en disputa | ✅ DisputeCase on-demand | ✅ buildable con ZK note-reveal | Empate técnico, Canton más simple |
| Fuga de metadatos | ✅ cero (no hay TX visible) | 🟡 timing y existencia de TX leak | **Canton gana claro** |
| Settlement atómico nativo | ✅ Canton Coin (burn-mint equilibrium) | ❌ requiere wrap + bridge risk | **Canton gana claro** |

**Pitch defensivo**: *"En Ethereum puedes construir esto con ZK proofs — a 10x el coste en ingeniería, con fuga de metadatos de transacción, y sin settlement atómico nativo. Canton hace la privacidad el default, no un opt-in caro."*

---

## 🧪 El "test de Corda" — preempt el fantasma más grande

> **Crítico**: CantonVault es estructuralmente similar a un CorDapp. Un juez del mundo enterprise-BC lo nota en 60 segundos. **Nombrar el fantasma uno mismo es más fuerte que esconderlo.**

**Slide dedicada**: *"¿No es esto Corda? Sí, este patrón nació en Corda. Canton lo evoluciona con dos avances que Corda no tenía: (a) **global synchronizer** que permite contratos privados componibles cross-firm, (b) **Canton Coin** con settlement atómico nativo (burn-mint equilibrium). Corda no tenía ninguno."*

**El detalle técnico que da credibilidad**: Canton's privacy es **protocol-level data non-existence** (el nodo no recibe los datos), vs ZK chains' privacy es **cryptographic data encryption** (los datos existen pero cifrados). Estas son dos cosas genuinamente diferentes. CantonVault demostraba **data non-existence** con el cuadrante del competidor siempre vacío.

---

## 🧪 El "test del VP de banco" — versión v2 (30 segundos)

*"Un financiero adelanta cash a una SME sobre una factura, sin que el financiero vea el resto del portfolio de la SME, y sin que el comprador sepa que la factura se factorizó. La privacidad no es cosmética — es compliance directo con Basel III y MiCA, y previene double-factoring. Solo Canton lo permite porque el contrato literalmente no existe para quien no es stakeholder."*

✅ Un VP de banco entiende esto en 10 segundos y **conecta con dolor real** (double-factoring es un problema operativo documentado).

---

## 💰 El premio real NO son los $7,000

> **Hallazgo estratégico crítico** (de Cantonomics para app builders).

- **62% del pool de rewards (~516M CC/mes)** va a **"featured apps" que generan transaction utility**
- Protocol Development Fund grants: pagados en CC, **tied to milestones**, criterio *"alignment with protocol needs, impact and value to the network"*
- **Si nuestro settlement es simbólico (no Canton Coin real), perdemos el único feature que nos hace elegibles para featured-app / grant pipeline**

**Implicación**: pitch para **Featured App status + Protocol Development Fund**, no solo el prize money. Eso requiere Canton Coin settlement real. El fallback "settlement simbólico" del Week-4 checkpoint **se elimina del plan**.

---

## 🔄 Cómo saber si esta decisión sigue siendo correcta (checkpoints)

- [ ] **Semana 1**: ¿Seaport devnet funciona y acepta nuestro `.dar`? Si no, fallback a LocalNet dockerizado con instrucciones claras.
- [ ] **Semana 1**: ¿La Disclosure interface de Daml.Finance compila en SDK 3.4.11? Si no, fallback al patrón DisputeCase manual.
- [ ] **Semana 2**: ¿Settlement real con Canton Coin (amulet) funciona end-to-end? **Non-negotiable** — si no funciona, prioridad absoluta hasta que funcione.
- [ ] **Semana 3**: ¿La demo split-screen se ve convincente en video? Si no, simplificar a 2 cuadrantes (partes + competidor).

---

## 📚 Fuentes que validan esta decisión v2

- **Brief oficial del hackathon** (tracks y examples): https://www.competehub.dev/en/competitions/encodeclub_canton-hackathon
- **Anuncio del hackathon** (Jatin Pandya, Canton Forum): https://forum.canton.network/t/build-on-canton-hackathon/8635
- **Canton Foundation mission**: https://canton.foundation/about-the-foundation/
- **Canton Foundation app categories** (no humanitarian, sí payments/stablecoins/trade): https://canton.foundation/canton-apps/
- **Private stablecoin payments** (B2B/cross-border en scope): https://www.canton.network/private-stablecoin-payments-on-public-blockchain
- **USDCx live on Canton** (global B2B payments onchain, Dec 2025): https://www.canton.network/blog/usdcx-now-live-on-canton-unlocking-private-and-composable-usdc-backed-settlement
- **"When Privacy Needs Proof"** (Canton's anti-ZK-generality stance): https://www.canton.network/blog/zero-knowledge-proofs-whe-privacy-needs-more
- **"Full transparency is a bug, not a feature"** (core privacy thesis, Saraniecki): https://www.canton.network/blog/full-transparency-is-a-bug-not-a-feature
- **Cantonomics for app builders** (62% rewards a featured apps): https://www.canton.network/blog/cantonomics-for-app-builders
- **Protocol Development Fund**: https://canton.foundation/canton-foundation-launches-protocol-development-fund/
- **HSBC tokenised deposit pilot** (banco onboard Canton): https://www.canton.network/news/hsbc-completes-tokenised-deposit-pilot-on-canton-network
- **Contour shutdown** (Mar 2023, blockchain trade finance fracaso): cobertura Reuters/GTReview
- **we.trade bankruptcy** (Jun 2022): banca SME blockchain trade finance que no llegó a volumen
- **WFP Building Blocks** (blockchain en producción, 2025): https://innovation.wfp.org/project/building-blocks
- **R3 Corda** (el patrón que Canton evoluciona): https://docs.r3.com/
- **cn-quickstart Licensing App** (patrón Propose/Accept verificado): https://github.com/digital-asset/cn-quickstart/blob/main/quickstart/daml/licensing/daml/Licensing/AppInstall.daml
- **Daml.Finance Disclosure interface** (patrón disclosure verificado): https://github.com/digital-asset/daml-finance/blob/main/src/main/daml/Daml/Finance/Interface/Util/V3/Disclosure.daml
