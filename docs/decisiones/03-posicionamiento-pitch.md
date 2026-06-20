# Decisión 03 — Posicionamiento y pitch

> **Naming, tagline, narrativa, escenarios de demo y script del video de 3 min.**
> Lo que los jueces van a ver y oír.

**Fecha**: 2026-06-20
**Estado**: ✅ Aprobado

---

## 🏷️ Identidad

| Campo | Valor |
|---|---|
| **Nombre del producto** | `CantonVault` |
| **Tagline EN** | *"Private conditional commitments for cross-border commerce and humanitarian aid."* |
| **Tagline ES** | *"Compromisos condicionales privados para comercio internacional y ayuda humanitaria."* |
| **Frase del video** | *"El mismo contrato que protege los secretos comerciales de María, protege la identidad de una familia refugiada. Eso es selective disclosure. Eso es Canton."* |
| **Tracks** | Track 3 (principal) + Track 2 (visión) |
| **Tono** | Institucional, premium, realista (no hype) |

### Por qué "CantonVault" y no "CantonEscrow"

| Nombre | Posicionamiento implícito | Bucket competitivo |
|---|---|---|
| CantonEscrow | "Otro producto de escrow" | Commodity (5-10 equipos) |
| **CantonVault** | "Primitiva de privacidad / bóveda de compromisos" | Diferenciado (0 equipos) |

"Vault" evoca seguridad, control, confidencialidad. "Escrow" evoca "un contrato más". El nombre es la primera impresión del juez.

---

## 🎬 Los 2 escenarios de la demo

### Escenario 1 (principal, ~60% del demo): B2B LATAM

> 🇲🇽 **María** (México) exporta café orgánico a 🇺🇸 **John** (USA). Pedido: $8,000.

**El dolor**: John quiere pagar después de recibir; María no confía. Hoy: banco intermediario cobra $400 en fees, tarda 5 días, y ve los márgenes de María.

**Con CantonVault**:
1. John crea `CommitmentProposal` → María lo ve (observer)
2. María acepta → se crea `CommitmentContract`. Ambos ven. **El banco y los competidores no ven nada.**
3. María envía el café. John confirma recepción → `Fulfill`
4. Settlement atómico: los $8,000 (en Canton Coin) van a María. Se crea `SettlementReceipt`.
5. **Solo John y María ven el receipt.** Nadie más sabe que la transacción ocurrió.

### Escenario 2 (complementario, ~25% del demo): ONG / impacto social

> 🇪🇺 **Donante** (Europa) financia a ONG en 🇬🇹 **Guatemala** para 12 familias.

**El dolor (la "paradoja de transparencia")**: el donante exige ver cada centavo (transparencia); las familias no quieren que el mundo sepa que reciben ayuda (privacidad).

**Con CantonVault**:
1. Donante crea compromiso → ONG acepta
2. ONG distribuye → `Fulfill` por cada familia
3. **Donante** ve `SettlementReceipt` agregado: "12 familias atendidas ✓"
4. **Familia beneficiaria** ve un `DisclosureContract` con SOLO: "Recibiste $416, comprobante #1234" — no sabe quién donó ni el total
5. **Público / hackers**: no ven nada

> **La frase que gana**: *"El mismo contrato que protege los secretos comerciales de María, protege la dignidad de una familia que recibe ayuda humanitaria."*

---

## 🖥️ La killer feature: demo split-screen de 4 cuadrantes

```
┌─────────────────────────┬─────────────────────────┐
│   🧑‍💼 PAYER (John)       │  🧑‍🌾 PAYEE (María)       │
│                          │                          │
│  ✅ Compromiso activo    │  ⏳ Compromiso pendiente │
│  $8,000 comprometidos   │  Fondos garantizados    │
│  [Confirmar entrega]    │  Esperando liberación    │
├─────────────────────────┼─────────────────────────┤
│  ⚖️ ÁRBITRO              │  🏦 COMPETIDOR/BANCO     │
│                          │                          │
│  (vacío hasta disputa)  │  (TOTALMENTE vacío)      │
│                          │                          │
│  💡 Selective disclosure │  💡 El contrato no       │
│     on-demand            │     existe para este nodo│
└─────────────────────────┴─────────────────────────┘
```

**Por qué esto es imbatible**: en 30 segundos un juez entiende privacidad selectiva mejor que con 10 horas de explicación. El cuadrante del competidor **siempre vacío** es el golpe visual que demuestra que Canton no "oculta" datos: los datos **no existen** para esa party.

---

## 🎥 Script del video de 3 minutos

| Tiempo | Sección | Contenido |
|---|---|---|
| 0:00-0:15 | **Dato shock** | *"En LATAM, enviar $250 cross-border cuesta 23% en fees. Y cuando una ONG reparte ayuda, las familias beneficiarias pierden su privacidad."* |
| 0:15-0:30 | **El problema** | *"Hoy no existe forma de garantizar el pago entre dos empresas de distintos países sin que un banco vea todos tus márgenes. Y las ONGs están atrapadas entre la transparencia que exigen los donantes y la privacidad que merecen los beneficiarios."* |
| 0:30-0:45 | **La solución** | *"CantonVault: compromisos condicionales privados. El pago se garantiza on-chain, pero solo las partes involucradas ven los términos. Un contrato, dos mundos."* |
| 0:45-1:45 | **Demo Escenario 1** | María-John café. Split-screen. Mostrar: crear → aceptar → fulfill → receipt. Sub-título: *"El banco observador ve un ledger vacío."* |
| 1:45-2:15 | **Demo Escenario 2** | Donante → ONG → Familias. Mostrar las 3 vistas. Sub-título: *"El donante ve el tracking. La familia ve solo su recibo. El público no ve nada."* |
| 2:15-2:30 | **"Mismo contrato, dos mundos"** | *"La privacidad selectiva de Canton no es un feature — es la infraestructura."* |
| 2:30-2:50 | **Por qué Canton** | *"Esto es imposible en Ethereum. Allí el contrato existe para todos. En Canton, el contrato no existe para quien no está listado."* |
| 2:50-3:00 | **Visión + CTA** | *"Empezamos en LATAM, donde el dolor es más agudo. El producto es global. CantonVault. Confianza verificable, privacidad real. Solo en Canton."* |

---

## 📊 Slide deck (10 slides máximo)

| # | Slide | Contenido clave |
|---|---|---|
| 1 | **Portada** | Logo CantonVault + tagline |
| 2 | **Problema** | 23% fees, 79% pagos atrasados, paradoja ONG transparencia/privacidad |
| 3 | **Solución** | Diagrama: payer ↔ CantonVault ↔ payee, árbitro off-stage |
| 4 | **Por qué Canton** | Test de Ethereum: 5 filas, canton ✅ vs ethereum ❌ |
| 5 | **Demo B2B** | Captura split-screen María-John |
| 6 | **Demo ONG** | Captura split-screen Donante-ONG-Familia |
| 7 | **Arquitectura** | Stack: Daml + cn-quickstart + CPort + amulet settlement |
| 8 | **Privacidad técnica** | Diagrama de los 4 contratos +Disclosure interface |
| 9 | **Mercado** | $15B comercio LATAM + WFP ya usa blockchain + visión global |
| 10 | **Roadmap** | Fase 1: vault. Fase 2: factoring. Fase 3: gobernar agentes IA. |

---

## 🎯 Datos verificables para usar (siempre citar fuente)

| Dato | Valor | Fuente |
|---|---|---|
| Fees cross-border LATAM $250 | 23.3% | Mastercard/PCMI 2025 |
| Pagos cross-border >4 días en Brasil | 80% | Datos 2025 |
| Empresas LATAM con pagos atrasados | 79% | Estudio regional 2026 |
| WFP con blockchain | Jordania, Bangladesh, Líbano, Ucrania | WFP Building Blocks |
| Percepción de mayor transparencia con blockchain (ONG) | 81.9% | Estudio Indonesia |
| Canton Coin (CC) burn-mint equilibrium | nativo | Splice / Canton docs |

> ⚠️ **No usar** promesas de "más rápido que SWIFT" o "reduce FX spread" — Canton no garantiza eso y un VP de banco lo notará. Defender lo verificable: **trust sin intermediario que ve tus datos**.

---

## 🚫 Anti-patterns a evitar en el pitch

- ❌ "Tokenizamos X" sin justificar por qué Canton
- ❌ Demo que requiere 15 min de setup para el juez
- ❌ "Usamos AI" sin que el AI tenga restricciones cripto-forzadas
- ❌ Frontend hermoso pero contratos Daml triviales
- ❌ Prometer reducción de fees (no podemos demostrarlo)
- ❌ "LATAM only" (limita la percepción de mercado) — siempre "LATAM first → Global"

---

## ✅ Lo que hace que los jueces recuerden el proyecto

1. **Un dato que no pueden olvidar**: "23% en fees por enviar $250"
2. **Una demo visual que golpea**: split-screen con cuadrante de competidor vacío
3. **Una historia con nombres**: "María exporta café desde México" (no "User A")
4. **Una frase que se queda**: *"Pagos tan privados como una conversación"*
