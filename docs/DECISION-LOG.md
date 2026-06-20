# Decision Log — CantonVault

> Registro cronológico de decisiones de implementación, sorpresas, respuestas de Jatin, y desviaciones del plan.
> Append-only. Una entrada por evento. Fecha + autor + qué pasó.

---

## 2026-06-20 — Setup inicial

- **Versión de cn-quickstart verificada**: Daml SDK 3.4.11, Splice 0.5.3, Spring Boot 3.4.2, Java 21 (pendiente de confirmar en la próxima sesión al clonar).
- **Estrategia definida**: CantonVault institucional (TradeFi + OTC). Sin LATAM, sin ONG. Pitch honesto (sin "23% fees", sin "imposible en Ethereum").
- **Decisión de Canton Coin settlement**: NON-NEGOTIABLE. Es lo que nos hace económicamente nativos (Cantonomics 62% rewards a featured apps).
- **Pendiente lanzar HOY**: mensaje a Jatin en Discord con las 3 preguntas de CPort + party ID.
- **Pendiente lanzar HOY**: crear proyecto CantonVault en Encode Club (deadline 21 Jun).

---

## Pendientes para próxima sesión

- [ ] Confirmar versions exactas al clonar cn-quickstart
- [ ] Capturar respuesta de Jatin sobre CPort (URL, party ID format, .dar upload path)
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
