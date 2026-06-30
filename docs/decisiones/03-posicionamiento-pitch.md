# Decisión 03 — Posicionamiento y pitch

> **Naming, tagline, narrativa, escenarios de demo y script del video de 3 min.**
> Lo que los jueces van a ver y oír. **Versión v2 institucional** (sin LATAM, sin ONG).

**Fecha**: 2026-06-20 (v2)
**Estado**: ✅ Aprobado

---

## 🏷️ Identidad

| Campo | Valor |
|---|---|
| **Nombre del producto** | `CantonVault` |
| **Tagline EN** | *"Privacy-first conditional commitments for institutional trade finance."* |
| **Tagline ES** | *"Compromisos condicionales con privacidad para finanzas de comercio institucional."* |
| **Frase del video** | *"Privacy without proof isn't privacy — it's a liability. CantonVault makes selective disclosure the emergent property of stakeholder-scoped atomic settlement, not a bolted-on cryptographic layer."* |
| **Tracks** | Track 1 (Private DeFi) primario + Track 2 (TradeFi/RWA) |
| **Tono** | Institucional, premium, técnico-preciso (no hype, no emoción barata) |

### Por qué "CantonVault" y no "CantonEscrow"

| Nombre | Posicionamiento implícito | Bucket competitivo |
|---|---|---|
| CantonEscrow | "Otro producto de escrow" | Commodity (5-10 equipos) |
| **CantonVault** | "Primitiva de privacidad / bóveda de compromisos" | Diferenciado (0 equipos) |

"Vault" evoca seguridad institucional, control, confidencialidad regulada. "Escrow" evoca "un contrato más de internet". El nombre es la primera impresión del juez.

---

## 🎬 Los 2 escenarios de la demo (100% institucionales)

> ⚠️ **Sin LATAM, sin ONG**. Ambos escenarios son casos de uso **literales del brief oficial**.

### Escenario 1 (principal, ~65% del demo): **Invoice Financing Privado**

> **SME Corp** (vendedor) tiene factura pendiente de **Buyer Corp** (comprador grande, Net 60). **Financier** (fondo / factor) le adelanta cash con 5% descuento.

**El dolor real (verificado)**:
- El SME no quiere que el Financier vea **TODO su portfolio de facturas** → riesgo de double-factoring y signal de debilidad financiera
- El Financier no quiere que el Buyer sepa que la factura se factorizó → riesgo de adverse selection en pricing
- Hoy: ambos se enteran de todo vía sistemas centralizados o reportes manuales

**Con CantonVault**:
1. SME crea `CommitmentProposal` (SME = payer del financiamiento, Financier = payee que recibe repayment, Buyer = deudor subyacente)
2. Financier acepta → se crea `CommitmentContract`. **SME y Financier ven. Buyer y competidores NO.**
3. Cuando Buyer paga la factura al SME → SME confirma → `Fulfill`
4. Settlement atómico en Canton Coin: repayment al Financier. Se crea `SettlementReceipt`.
5. **El Buyer nunca supo que la factura se factorizó. Los competidores del SME nunca vieron el portfolio completo.**

**Split-screen**:
| SME Corp | Financier | Buyer Corp | Competidor |
|---|---|---|---|
| ✅ Ve compromiso + repayment | ✅ Ve compromiso + repayment | ❌ **Vacío** (no sabe que se factorizó) | ❌ **Vacío siempre** |

### Escenario 2 (complementario, ~25% del demo): **OTC Block Trade Privado**

> **Dealer A** y **Dealer B** negocian un bloque OTC (bonos / derivados). **Clearing house** necesita ver lo mínimo para netting.

**El dolor real (verificado)**:
- Competencia no debe ver precio/size del bloque **antes** de ejecución → movimiento de mercado en contra
- El clearing no debe ver el portfolio completo de cada dealer → info privilegiada
- Hoy: phone broker + chat + riesgo de leakage

**Con CantonVault**:
1. Dealer A crea `CommitmentProposal` (price, size, instrument) → Dealer B observer
2. Dealer B acepta → `CommitmentContract` creado. Ambos dealers ven. **Clearing no ve nada aún.**
3. En settlement → `Fulfill` → se crea `DisclosureContract` para el clearing con SOLO los campos de netting (no el portfolio completo)
4. Settlement atómico en Canton Coin

**Split-screen**:
| Dealer A | Dealer B | Clearing | Mercado |
|---|---|---|---|
| ✅ Ve trade completo | ✅ Ve trade completo | 🟡 Ve **solo netting** (disclosure selectivo) | ❌ **Vacío** (no front-running posible) |

### Cierre (~10% del demo): **"Una primitiva, múltiples workflows"**

*"Mismo contrato subyacente. Invoice financing privado y OTC block trade privado. Privacidad selectiva como propiedad emergente del stakeholder-scoping, no como capa criptográfica bolted-on. Solo Canton."*

---

## 🖥️ La killer feature: demo split-screen de 4 cuadrantes

```
┌─────────────────────────┬─────────────────────────┐
│  🏢 PARTE A (SME/Dealer)│  💼 PARTE B (Financier) │
│                          │                          │
│  ✅ Compromiso activo    │  ✅ Compromiso activo   │
│  Repayment comprometido │  Fondos garantizados    │
│  [Confirmar fulfillment]│  Esperando liberación   │
├─────────────────────────┼─────────────────────────┤
│  ⚖️ TERCERO (Buyer/Clear)│  🌐 COMPETIDOR/MERCADO │
│                          │                          │
│  (vacío hasta disclosure)│  (TOTALMENTE vacío)     │
│                          │                          │
│  💡 Disclosure on-demand │  💡 El contrato no       │
│     cuando se necesita   │     existe para este nodo│
└─────────────────────────┴─────────────────────────┘
```

**Por qué esto es imbatible**: en 30 segundos un juez entiende privacidad selectiva mejor que con 10 horas de explicación. El cuadrante del competidor **siempre vacío** es el golpe visual que demuestra que Canton no "oculta" datos: los datos **no existen** para esa party.

---

## 🎥 Script del video de 3 minutos

| Tiempo | Sección | Contenido |
|---|---|---|
| 0:00-0:15 | **Dato shock** | *"En invoice financing, el double-factoring le cuesta a la industria miles de millones al año. Y en OTC trading, el leakage de un block order mueve mercados enteros en segundos."* |
| 0:15-0:30 | **El problema** | *"En finanzas institucionales, las partes necesitan compartir lo mínimo necesario para ejecutar — sin exponer portfolio completo, sin revelar factorización, sin leakage de pricing a competidores. Hoy no existe esa infraestructura de selective disclosure nativa."* |
| 0:30-0:45 | **La solución** | *"CantonVault: compromisos condicionales privados donde la privacidad es propiedad emergente del stakeholder-scoping, no una capa criptográfica. Una primitiva, múltiples workflows."* |
| 0:45-1:45 | **Demo Escenario 1** | Invoice Financing: SME → Financier, Buyer no sabe. Split-screen. Sub-título: *"El Buyer ve un ledger vacío. La factorización nunca se reveló."* |
| 1:45-2:15 | **Demo Escenario 2** | OTC Block Trade: Dealer A → Dealer B, Clearing ve solo netting. Sub-título: *"El mercado no puede front-runear lo que no puede ver."* |
| 2:15-2:30 | **"Una primitiva, múltiples workflows"** | *"El mismo contrato. Privacidad como protocolo, no como opt-in caro."* |
| 2:30-2:50 | **Por qué Canton** | *"En Ethereum puedes construir esto con ZK — a 10x el coste en ingeniería, con fuga de metadatos, sin settlement atómico nativo. Canton lo hace el default. Y no, no es Corda resucitado — Canton añade global synchronizer para composabilidad cross-firm y Canton Coin para settlement atómico. Corda no tenía ninguno."* |
| 2:50-3:00 | **CTA** | *"CantonVault. Privacy without proof is a liability. We make it the protocol. Solo en Canton."* |

---

## 📊 Slide deck (10 slides máximo)

| # | Slide | Contenido clave |
|---|---|---|
| 1 | **Portada** | Logo CantonVault + tagline |
| 2 | **Problema** | Double-factoring, OTC leakage, compliance (Basel III, MiCA, FATF) |
| 3 | **Solución** | Diagrama: Parte A ↔ CantonVault ↔ Parte B, tercero off-stage |
| 4 | **Por qué Canton (honesto)** | Matriz honesta Canton vs Ethereum-ZK vs Corda (sin "imposible") |
| 5 | **¿No es esto Corda?** | Preempt explícito: "sí, y Canton lo evoluciona con X, Y" |
| 6 | **Demo Invoice Financing** | Captura split-screen SME/Financier/Buyer/Competidor |
| 7 | **Demo OTC Block Trade** | Captura split-screen Dealers/Clearing/Mercado |
| 8 | **Arquitectura** | Stack: Daml + cn-quickstart + Seaport + amulet settlement real |
| 9 | **Privacidad técnica** | Diagrama de los 4 contratos + Disclosure interface + Canton Coin flow |
| 10 | **Mercado + Roadmap** | Trade finance gap (ADB) + visión: agentic commerce fase 3 |

---

## ✅ Datos verificables para usar (siempre citar fuente)

| Dato | Valor | Fuente |
|---|---|---|
| Canton Coin (CC) burn-mint equilibrium | nativo | Splice / Canton docs |
| Cantonomics rewards | 62% del pool (~516M CC/mes) a featured apps | canton.network/blog/cantonomics-for-app-builders |
| USDCx live on Canton (global B2B payments) | Dec 2025 | canton.network/blog/usdcx-now-live-on-canton |
| HSBC tokenised deposit pilot | confirmado | canton.network/news/hsbc-completes-tokenised-deposit-pilot |
| Double-factoring como problema real | documentado industria | factoring industry reports |
| Basel III risk reporting on-demand | regulación en vigor | bis.org/bcbs/basel3 |
| MiCA confidencialidad comercial | EU 2023/1114 | eur-lex.europa.eu/eli/reg/2023/1114 |
| FATF Travel Rule $1,000 threshold | Oct 2024 | fatf-gafi.org |
| Canton privacy thesis ("full transparency is a bug") | blog oficial | canton.network/blog/full-transparency-is-a-bug-not-a-feature |
| Canton anti-ZK-generality ("privacy needs proof") | blog oficial | canton.network/blog/zero-knowledge-proofs-whe-privacy-needs-more |

> ⚠️ **NO usar** (datos que aplicamos mal en v1):
> - ❌ "23% fees cross-border" (es de remesas consumidor, no B2B)
> - ❌ "79% LATAM con pagos atrasados" (fuente dudosa, ángulo LATAM descartado)
> - ❌ "$15B LATAM market" (TAM mal aplicado a escrow)
> - ❌ "WFP usa blockchain" (cierto pero ONG fuera de scope)
> - ❌ "81.9% Indonesian study on transparency" (fuente no verificable)
> - ❌ "Imposible en Ethereum" (falso en 2026 con ZK + AA)

---

## 🚫 Anti-patterns a evitar en el pitch (v2)

- ❌ "Tokenizamos X" sin justificar por qué Canton
- ❌ Demo que requiere 15 min de setup para el juez
- ❌ "Usamos AI" sin restricciones cripto-forzadas (el brief avisa contra "AI wrapper")
- ❌ Frontend hermoso pero contratos Daml triviales
- ❌ **"Imposible en Ethereum"** (falso, juez ZK te destruye)
- ❌ **"Privacy engine" genérico** (Canton penaliza — *"opacity is a liability"*)
- ❌ **Datos de LATAM, ONG, remesas consumidor** (no resuenan con Canton)
- ❌ **No nombrar Corda** (lo van a pensar igual; mejor preempt)
- ❌ **Settlement simbólico** (sin Canton Coin real = no nativos económicamente)

---

## ✅ Lo que hace que los jueces recuerden el proyecto (v2)

1. **Una demo visual que golpea**: split-screen con cuadrante de competidor/market siempre vacío
2. **Una frase que se queda**: *"Privacy without proof isn't privacy — it's a liability."* (usando las propias palabras de Canton contra la competencia ZK)
3. **Preempt de Corda**: nombrar el fantasma uno mismo da credibilidad instantánea
4. **Settlement real con Canton Coin**: no es mock, es burn-mint equilibrium nativo
5. **Cobertura de 2 casos de uso del brief oficial**: invoice financing + OTC, ambos literales del brief
6. **Visión institucional creíble**: trade finance gap real + roadmap a agentic fase 3
