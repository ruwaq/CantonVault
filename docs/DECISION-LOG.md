# Decision Log — CantonVault

> Registro cronológico de decisiones de implementación, sorpresas, respuestas de Jatin, y desviaciones del plan.
> Append-only. Una entrada por evento. Fecha + autor + qué pasó.

---

## 2026-06-20 — Setup inicial

- **Versión de cn-quickstart verificada**: Daml SDK 3.4.11, Splice 0.5.3, Spring Boot 3.4.2, Java 21 (pendiente de confirmar en la próxima sesión al clonar).
- **Estrategia definida**: CantonVault institucional (TradeFi + OTC). Sin LATAM, sin ONG. Pitch honesto (sin "23% fees", sin "imposible en Ethereum").
- **Decisión de Canton Coin settlement**: NON-NEGOTIABLE. Es lo que nos hace económicamente nativos (Cantonomics 62% rewards a featured apps).
- **Pendiente lanzar HOY**: mensaje a Jatin en Discord con las 3 preguntas de Seaport + party ID.
- **Pendiente lanzar HOY**: crear proyecto CantonVault en Encode Club (deadline 21 Jun).

---

## 2026-06-20 — Pivote estratégico: Track 2 (TradeFi, RWA) con Supply Chain Finance

- **Contexto**: Tras revisar el panorama competitivo del Discord, IoMarkets está en Track 1 con app live. Track 2 está COMPLETAMENTE VACÍO. Canton ecosystem no tiene apps de trade finance con selective disclosure.
- **Decisión**: Mover CantonVault a **Track 2 (TradeFi, RWA & Tokenized Assets)** con foco en **Supply Chain Finance** (deep-tier, dynamic discounting).
- **Razón**: 
  1. Track 2 sin competidores = ganar el track por default
  2. "Supply chain financing" es literal del brief oficial
  3. Los 4 contratos Daml NO cambian — solo cambian nombres de actores y pitch
  4. El ecosistema Canton no tiene NINGÚN producto de trade finance con selective disclosure — seríamos el primero
  5. No competimos directamente con IoMarkets (ellos Track 1, nosotros Track 2)
- **Escenarios de demo actualizados**: 
  1. Deep-tier Supply Chain Finance (Supplier Tier 2 → Supplier Tier 1 → Buyer)
  2. Dynamic Discounting (Buyer ofrece early payment → Supplier acepta sin que competidores vean sus términos)
- **Cambios necesarios en docs**: Actualizar `docs/decisiones/01-estrategia-ganadora.md`, `docs/decisiones/03-posicionamiento-pitch.md`, `docs/superpowers/specs/2026-06-20-cantonvault-design.md`, `README.md` y `HANDOFF.md` con Track 2 + Supply Chain Finance.

---

## Pendientes para próxima sesión

- [ ] Confirmar versions exactas al clonar cn-quickstart
- [ ] Capturar respuesta de Jatin sobre Seaport (URL, party ID format, .dar upload path)
- [ ] Decisión sobre Disclosure interface vs patrón DisputeCase manual (verificar si compila en SDK 3.4.11)
- [ ] Si aparece import circular entre CommitmentContract y DisputeCase, decidir solución aquí

---

## Plantilla para nuevas entradas

```
## YYYY-MM-DD — Título corto
- **Contexto**: qué estaba pasando
- **Decisión**: qué decidiste
- **Razón**: por qué
- **Alternativas descartadas**: qué más consideraste y por qué no
```
