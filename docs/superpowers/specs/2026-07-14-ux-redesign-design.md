# CantonVault — Rediseño UX Completo (Spec de Diseño)

**Fecha:** 2026-07-14
**Estado:** Aprobado por el usuario — listo para implementar
**Deadline:** 19 julio 2026 (5 días)
**Autor:** Sesión de brainstorming + investigación UX 2026

> **LEER ESTO PRIMERO al iniciar la próxima sesión.** Este spec contiene el
> diseño aprobado, el contexto técnico verificado, y el orden de ejecución.
> No requiere brainstorming adicional — empezar por el plan de implementación
> (sección final).

---

## 1. Resumen ejecutivo

El backend y la lógica de CantonVault están 100% completos y en vivo
(`canton-vault.pages.dev`). El problema es de capa visual/UX:

1. **Bug de contraste:** texto ilegible en dark mode (`--text-muted: #a1a1aa`
   sobre glass translúcido da ~3:1, por debajo de WCAG AA 4.5:1).
2. **Jerga técnica por todos lados:** "Party ID", "Allocation contract id",
   "Active Ledger State", "DISCLOSED_RECORD" — un novato (o un jurado que
   revisa 20 demos) se pierde.
3. **Monolito:** `VaultView.tsx` tiene 898 líneas + 470 líneas de código
   muerto heredadas del boilerplate.

**Solución aprobada:** Full redesign + refactor. Sistema de design tokens
WCAG AA + traducción de ~30 strings jerga→humano + wizard de 4 pantallas +
extracción del monolito en componentes + borrado de código muerto.

**Objetivo:** que cualquier persona (incluso alguien que no sabe qué es crypto)
pueda completar el flujo "como un niño", mientras el jurado tiene "Detalles
técnicos ▾" para verificar CIDs/offsets en cualquier momento.

### Decisiones aprobadas (3 preguntas clarificadoras resueltas)

| Decisión | Elección | Alternativas rechazadas |
|---|---|---|
| **Alcance** | Full redesign + refactor | Solo contraste / Rediseño sin refactor |
| **Paleta** | Indigo eléctrico pulido (#6366f1) | Azul institucional / Mono minimalista |
| **Flujo Propose** | Wizard 1-decisión-por-pantalla (4 pantallas) | Formulario único / Formulario+Avanzado |

---

## 2. Contexto técnico verificado (auditoría de esta sesión)

### Frontend — estado actual

Raíz: `cn-quickstart/quickstart/frontend/`
Build: Vite + React + TypeScript + Bootstrap 5 + SWR
Entry: `src/main.tsx` → `src/index.css` (que `@import './theme.css'`) → `src/App.tsx`

**37 archivos, ~5.000 líneas.** Arquitectura sana en lógica, deuda en presentación.

### Lo que SÍ funciona y NO se toca

- **SWR cache global** (`hooks/useVaultData.ts`): reads con `revalidateOnFocus`,
  `dedupingInterval: 10_000`, `refreshInterval: 0` (sin polling ciego).
  Config en `useVaultData.ts:40-48`.
- **Mutations con optimistic updates** (`hooks/useVaultMutations.ts`): cada
  POST invalida solo las keys relevantes + inserta en cache para feedback
  instantáneo pese a la consistencia eventual de KV.
- **Facades thin** (`stores/vaultStore.tsx`): `useVaultStore()` expone la misma
  firma que antes; `VaultProvider` es un Fragment passthrough.
- **Normalizers** (`lib/vaultNormalizers.ts`): `partyOf()` coerce Party string
  vs `{party:"..."}`, `toContracts()` mapea raw→typed.
- **Toasts con CID+offset** (`components/ToastNotification.tsx`): ya muestran
  prueba on-ledger para el jurado.
- **Modal.tsx** (167 líneas): portal con focus trap, Escape, aria — sólido,
  reutilizar para confirmaciones.
- **Functions (backend):** KV index, Splice Validator API para balance, los
  5 GET + 7 mutations — todo verificado E2E.

### Lo que hay que arreglar

| Problema | Archivo | Detalle |
|---|---|---|
| 🚨 Monolito | `views/VaultView.tsx` | **898 líneas**, 4 sub-componentes + 3 steps inline |
| 🧟 Código muerto | `components/License*.tsx` (3) + `DurationInput.tsx` | **470 líneas**, 0 imports en rutas activas |
| 🧟 Types huérfanos | `types.ts` `AppInstallUnified`/`AppInstallStatus` | del boilerplate, sin uso |
| 🧟 Ruta legacy | `App.tsx:39` | `/licenses` redirect, ya no aplica |
| 🎨 31 estilos inline | `style={{}}` esparcidos | deberían ser clases |
| 🎨 Tokens no semánticos | `theme.css:13` | `--text-muted` usado sobre 3 superficies distintas |
| 🎨 Glass poco opaco | `theme.css:9` | `bg-glass: rgba(24,24,27,0.65)` → backdrop variable |

### Árbol actual con líneas (🚨 = >200, ⚠️ = >100)

```
src/
  api.ts (53)            App.css (257) ⚠️     App.tsx (58)
  theme.css (350) ⚠️     index.css (29)       main.tsx (17)
  types.ts (98)          openapi.d.ts (793)
  components/
    Header.tsx (93)      Modal.tsx (167)      ToastNotification.tsx (77)
    RequireAuth.tsx (28)
    DurationInput.tsx (79)              ← MUERTO
    LicenseExpireModal.tsx (60)         ← MUERTO
    LicenseRenewModal.tsx (136) ⚠️      ← MUERTO
    LicenseRenewalRequestModal.tsx (189) ⚠️ ← MUERTO
    vault/
      VaultActionModals.tsx (282) ⚠️
  hooks/
    useAuth.ts (92)       useVaultData.ts (116)   useVaultMutations.ts (269) ⚠️
  lib/
    fetcher.ts (49)       vaultNormalizers.ts (160)
  stores/
    toastStore.tsx (94)   userStore.tsx (53)   vaultApi.ts (37)   vaultStore.tsx (139) ⚠️
  utils/
    commandId.ts (42)     duration.ts (19)      error.ts (84)       format.ts (20)   party.ts (5)
  views/
    VaultView.tsx (898) 🚨🚨   LandingView.tsx (71)   LoginView.tsx (63)
    landing.css (303) ⚠️       login.css (108)
```

---

## 3. Investigación UX que fundamenta el diseño

Dos investigaciones independientes (web search 2025-2026). Hallazgos clave:

### Eje técnico — Contraste y accesibilidad

- **WCAG 2.2 AA:** mínimo 4.5:1 texto normal, 3:1 texto grande (≥18.66px bold),
  3:1 UI components (bordes, íconos).
- **Sobre glass translúcido:** el contraste se mide contra el **fondo compuesto
  real** (panel + backdrop), no contra el color del panel. Por eso glass a
  0.65 opacidad falla: el fondo efectivo varía con lo que hay detrás.
- **Anti-patrón actual:** `opacity < 0.85` sobre texto ya gris + medir contraste
  contra el color glass en vez del compuesto.
- **Regla profesional (Linear/Vercel/Stripe):** texto siempre opacidad 1.0;
  usar colores de gris dedicados, no rebajar con opacity.

### Eje humano — Simplicidad para no-iniciados

- **Progressive disclosure (NN/g):** estratificar en 3 capas:
  (1) **VER** — valor humano + 1 acción, siempre visible;
  (2) **HACER** — campos revelados contextualmente cuando importan;
  (3) **DETALLES TÉCNICOS** — hashes/CIDs/offsets bajo toggle, para el jurado.
- **Krug "Don't Make Me Think" aplicado a crypto:** si una etiqueta necesita
  una oración para explicarse, la etiqueta está mal.
- **Fricción beneficiosa (ACM):** una confirmación de 2 pasos justo antes de
  una acción irreversible mejora la decisión y reduce el arrepentimiento.
- **Cash App / TurboTax:** 1 decisión por pantalla + progreso visible = máxima
  claridad para novatos.
- **Coinbase vs MetaMask:** CantonVault es para jurado+novatos → posicionar
  como Coinbase (ocultar hashes, 1 ruta "Detalles técnicos"), no MetaMask.

### 7 principios de psicología aplicados

1. **Hick's Law:** 1 CTA primario por vista; secundarias en overflow.
2. **Fitts's Law:** botones min 48×48px, full-width en móvil.
3. **Jakob's Law:** patrón wallet conocido (balance arriba, acción abajo).
4. **Proximidad:** agrupar con spacing 16/24px, no cajas.
5. **Prägnanz:** 1 jerarquía visual primaria por pantalla.
6. **Miller's Law (7±2):** chunking de info on-chain (resumen→detalle→raw).
7. **Serial position:** estado arriba (primacy), CTA+explorer abajo (recency).

---

## 4. DISEÑO — Sección 1: Design Tokens WCAG AA

Reemplazo del sistema actual por **tokens semánticos de 3 capas**
(primitivo → semántico → componente).

### Archivo: `src/styles/tokens.css` (NUEVO, extraído de `theme.css :root`)

```css
:root {
  /* ── PRIMITIVOS (zinc scale, NO usar directo en componentes) ── */
  --zinc-950: #09090b;
  --zinc-900: #18181b;
  --zinc-800: #27272a;
  --zinc-700: #3f3f46;
  --zinc-100: #f4f4f5;
  --zinc-200: #e4e4e7;
  --zinc-300: #d4d4d8;
  --zinc-400: #a1a1aa;

  /* ── SEMÁNTICOS — superficies (3 niveles de elevación) ── */
  --bg-base:     #09090b;                      /* fondo app */
  --bg-surface:  #18181b;                      /* cards opacas */
  --bg-elevated: #27272a;                      /* cards hover / modales */

  /* Glass subió de 0.65 a 0.85: fondo más estable, menos variabilidad de backdrop */
  --bg-glass:        rgba(24, 24, 27, 0.85);
  --bg-glass-heavy:  rgba(9, 9, 11, 0.92);     /* nav */

  /* ── SEMÁNTICOS — texto (la clave del fix de contraste) ── */
  --text-heading: #f4f4f5;   /* títulos, datos críticos · 17:1 sobre bg-base (AAA) */
  --text-body:    #e4e4e7;   /* texto principal · 14:1 (AAA) — NUEVO token */
  --text-muted:   #a1a1aa;   /* hints, meta · 7:1 sobre bg-base (AAA) */
  --text-on-glass:#e4e4e7;   /* ← NUEVO: texto sobre glass, NUNCA usar muted aquí */
  --text-on-accent:#ffffff;  /* sobre botones indigo */
  --text-disabled:#52525b;   /* placeholders */

  /* ── Accents (Indigo eléctrico, mantenido) ── */
  --accent:        #6366f1;
  --accent-hover:  #4f46e5;
  --accent-glow:   rgba(99, 102, 241, 0.4);

  /* ── Status ── */
  --status-success: #10b981;  --status-success-bg: rgba(16, 185, 129, 0.15);
  --status-warning: #f59e0b;  --status-warning-bg: rgba(245, 158, 11, 0.15);
  --status-danger:  #ef4444;  --status-danger-bg:  rgba(239, 68, 68, 0.15);

  /* ── Borders, shadows, radius, transitions (sin cambios) ── */
  --border-subtle: 1px solid rgba(255, 255, 255, 0.10);
  --border-focus:  1px solid var(--accent);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
  --shadow-glow: 0 0 20px var(--accent-glow);

  --radius-sm: 6px;  --radius-md: 12px;  --radius-lg: 20px;  --radius-pill: 9999px;
  --transition-fast: 0.15s ease-out;  --transition-normal: 0.25s ease-out;

  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
```

### Regla innegociable de tokens

> **El texto sobre glass usa `var(--text-on-glass)` (#e4e4e7), NUNCA `--text-muted`.**
> `--text-muted` (#a1a1aa) está bien sobre `--bg-base` opaco, pero sobre
> glass translúcido el fondo compuesto es más oscuro y baja el contraste.

### Migración de clases

Reemplazar globalmente en los componentes:
- `text-muted` sobre glass → `text-on-glass` (nueva utility) o `var(--text-on-glass)`
- `text-muted` sobre bg-base opaco → queda `text-muted`
- `text-white` → `text-heading` (semántico, para títulos/datos críticos)

---

## 5. DISEÑO — Sección 2: Arquitectura de componentes (refactor)

Extracción del `VaultView.tsx` monolítico (898 líneas) en componentes enfocados.
Cada archivo < 200 líneas. Un componente = una responsabilidad.

### Estructura target

```
src/
├── views/
│   ├── VaultView.tsx              # REFACTOR: ~120 líneas — shell + routing de steps
│   ├── LandingView.tsx            # sin cambios estructurales (solo copy si aplica)
│   └── LoginView.tsx              # sin cambios estructurales
├── components/vault/
│   ├── VaultHeader.tsx            # NUEVO (extracto): título + party + sync button
│   ├── Stepper.tsx                # NUEVO (extracto): 3 steps con labels humanos
│   ├── CopyCidButton.tsx          # NUEVO (extracto): botón copiar, reutilizable
│   ├── TechnicalDetails.tsx       # NUEVO: panel colapsable "Detalles técnicos ▾"
│   │                              #   reúne CID + offset + party hashes + revealedFields
│   │                              #   props: { contractId?, offset?, parties?, revealedFields? }
│   ├── propose/
│   │   ├── ProposeWizard.tsx      # NUEVO: orquestador de las 4 pantallas + estado wizard
│   │   ├── WizardStepDescription.tsx  # Pantalla 1
│   │   ├── WizardStepAmount.tsx       # Pantalla 2
│   │   ├── WizardStepParties.tsx      # Pantalla 3
│   │   └── WizardStepReview.tsx       # Pantalla 4
│   ├── act/
│   │   ├── ActStep.tsx            # REFACTOR (slim): lista commitments + disputes
│   │   ├── CommitmentCard.tsx     # NUEVO (extracto): 1 tarjeta compromiso
│   │   └── DisputeCard.tsx        # NUEVO (extracto): 1 tarjeta disputa
│   ├── privacy/
│   │   ├── PrivacyLab.tsx         # REFACTOR: sin pseudoterminal, humanizado
│   │   └── SettlementReceipts.tsx # NUEVO (extracto): lista de receipts
│   └── VaultActionModals.tsx      # REFACTOR: slims + nuevos confirm screens
├── styles/                        # NUEVO: CSS modular
│   ├── tokens.css                 # extracto de theme.css :root (ver Sección 4)
│   ├── base.css                   # resets, body, glass-panel, btn, form overrides
│   └── vault.css                  # cv-* del App.css actual
├── lib/
│   └── copy.ts                    # NUEVO: diccionario de microcopy humano (Sección 6)
└── (stores/, hooks/, utils/ — SIN CAMBIOS)
```

### Reglas del refactor

- Cada archivo < 200 líneas.
- Componentes de presentación NO contienen lógica de negocio (eso ya vive en
  `useVaultStore`, `useVaultMutations` — intocables).
- `lib/copy.ts` centraliza los strings traducidos para auditarlos de una vez.
- Reutilizar `Modal.tsx` (167 líneas, focus trap sólido) para las nuevas
  pantallas de confirmación.

### Código muerto a borrar (470 líneas)

```
ELIMINAR:
  src/components/DurationInput.tsx          (79 líneas)
  src/components/LicenseExpireModal.tsx     (60 líneas)
  src/components/LicenseRenewModal.tsx      (136 líneas)
  src/components/LicenseRenewalRequestModal.tsx (189 líneas)
  src/types.ts: AppInstallStatus, AppInstallUnified  (del boilerplate)
  src/App.tsx:39: ruta /licenses redirect   (ya no aplica)
VERIFICAR antes de borrar: grep confirma 0 imports en rutas activas.
```

### Lo que NO se toca (intocable)

```
src/stores/*        — facades thin sobre SWR, funcionan perfecto
src/hooks/*         — useVaultData, useVaultMutations, useAuth
src/lib/fetcher.ts
src/lib/vaultNormalizers.ts
src/utils/*         — party, format, error, commandId, duration
src/api.ts
functions/api/*     — backend Cloudflare Pages (KV, Splice Validator API)
```

---

## 6. DISEÑO — Sección 3: Traducción de jerga → humano

Centralizado en `src/lib/copy.ts`. La regla: **el novato ve el valor, el
técnico tiene "Detalles técnicos ▾".**

### Tabla de traducción (~30 strings)

| String actual (jerga) | Reemplazo humano | Dónde aparece |
|---|---|---|
| "Draft Commitment Proposal" | **"Nuevo acuerdo"** | header card Propose |
| "Submit Private Proposal" | **"Enviar oferta"** | botón primario wizard |
| "Deploying contract..." | **"Creando tu acuerdo..."** | botón loading |
| "✓ Accept" | **"Aceptar oferta"** | botón propuesta |
| "✕ Reject" | **"Rechazar"** | botón propuesta |
| "✓ Fulfill" | **"Confirmar entrega"** | botón compromiso |
| "⚠ Dispute" | **"Reportar problema"** | botón compromiso |
| "↩ Refund" | **"Cancelar y devolver"** | botón compromiso |
| "⚖ Resolve" | **"Decidir a favor de..."** | botón disputa |
| "Active Ledger State" (badge) | **"En progreso"** | badge compromiso |
| "In Dispute" (badge) | **"En disputa"** | badge compromiso |
| "Emergent Privacy Explained" | **"Por qué esto es privado"** | alerta Propose |
| "Allocation contract id" | **"Fondos aprobados para enviar"** | modal Fulfill |
| "realSettlementRequired = false" | *(eliminado — nunca mostrar config flags)* | modal Fulfill |
| "Commitment" (en copy) | **"acuerdo"** | 多处 |
| "Proposal" (en copy) | **"oferta"** / **"borrador"** | 多处 |
| "Party ID" / hash visible | **etiqueta humana** ("Proveedor", etc.) + hash en Detalles técnicos | cards |
| "Arbitrator" / "Third Party" | **"Mediador"** / **"Juez"** | cards/forms |
| "Accepter" | **"Quien paga"** | forms |
| "Proposer" | **"Quien cobra"** | forms |
| "DISCLOSED_RECORD" (badge) | **"Lo que ve el juez"** | Privacy Lab col 3 |
| `> CANTON_PRIVATE_ISOLATION` pseudoterminal | **"Buscado en el registro del mediador: 0 acuerdos."** | Privacy Lab col 2 |
| "Canton Coin Settlement Receipts" | **"Comprobantes de pago"** | Privacy Lab |
| "Ledger offset" (visible) | **"Registro #"** + offset en Detalles técnicos | toasts/cards |
| "Atomic Settlement Executed" | **"Pago completado"** | badge receipt |
| "Deadline (expiry in seconds) = 3600" | **selector: 1 hora / 1 día / 1 semana** | wizard pantalla 4 |
| "Only proposer and counterparty will see this draft" | **"Solo tú y la otra persona ven este borrador"** | subheader Propose |
| "Canton Coin (CC) to commit. Settled atomically on Fulfill." | **"Cantidad a asegurar. Se envía al confirmar la entrega."** | wizard amount |
| `alert-warning`/`alert-danger` explicativas | **texto en línea + ícono ℹ️ discreto** | global |

### Idioma

El demo actual está en inglés. **Mantener inglés** para consistencia con el
resto del producto, pero con vocabulario plain-English (Cash App level), no
jerga Daml. Los reemplazos de la tabla son la versión conceptual; al
implementar, redactar en inglés simple:
- "Nuevo acuerdo" → "New agreement"
- "Enviar oferta" → "Send offer"
- "Confirmar entrega" → "Confirm delivery"
- "Quien paga" → "Who pays"
- "Mediador" → "Mediator"

> **Nota de implementación:** si el jurado es hispanohablante y se prefiere
> español, traducir la tabla completa. Decisión pendiente — confirmar al
> iniciar la implementación.

---

## 7. DISEÑO — Sección 4: Wizard ProposeStep (4 pantallas)

Reemplaza los 7 campos simultáneos por 4 pantallas de 1 decisión cada una.
Deadline/workflow/moneda con defaults sensatos, personalizables bajo "Avanzado".

### Dos niveles de navegación (aclaración crítica)

- **MACRO — Stepper de 3 pasos** (Crear → Actuar → Verificar): ya existe,
  queda. Indica dónde estás en la app.
- **MICRO — Progreso del wizard** (4 puntos ●●○○): NUEVO, dentro de "Crear".
  Indica dónde estás en ese wizard.

Ambos coexisten: el Stepper grande arriba, los 4 puntos dentro del wizard.

### Pantalla 1 — "¿Para qué es este acuerdo?" / "What's this agreement for?"

- 1 campo grande: descripción (placeholder: "Invoice INV-2026-001")
- Botón "Siguiente →"
- Progreso: ●○○○
- *Carga cognitiva: 1 pregunta. El novato entiende el propósito.*

### Pantalla 2 — "¿Cuánto?" / "How much?"

- 1 campo grande: monto, con "CC" fijo al lado (no editable por defecto)
- Texto grande abajo: "5,000 CC · Sent when you confirm delivery"
- Botón "Siguiente →"
- Progreso: ●●○○
- *Cash App style: el número es lo único que importa.*
- **NO usar símbolo $** (CC no es USD) — tipografía grande con "CC" suffix.

### Pantalla 3 — "¿Quién más?" / "Who else is involved?"

- 2 selectores: "Who pays" [Demo Supplier ▾] + "Your mediator" [Demo Arbitrator ▾]
- Defaults pre-seleccionados (la party del demo: `cancore::*`)
- Link discreto: "Use custom party ID →" (abre input, no por defecto)
- Botón "Siguiente →"
- Progreso: ●●●○

### Pantalla 4 — Revisar y enviar

- Resumen en lenguaje natural grande:
  > **Invoice INV-2026-001 · 5,000 CC**
  > From Demo Supplier to you, overseen by Demo Arbitrator
  > who **sees nothing** until someone reports a problem.
- Tipo aparece aquí como texto (no selector): "Type: Supply Chain Finance"
  — el jurado ve la versatilidad sin que el novato elija.
- Selector de deadline aquí: "Expires in [1 hour ▾]" (botones segmentados:
  1 hora / 1 día / 1 semana; convierte a segundos internamente)
- Toggle colapsable: "Advanced options ▾" (workflow selector, custom currency,
  custom party ID)
- Botón primario grande: **"✓ Send offer"**
- Progreso: ●●●●
- **Clic en cualquier ítem del resumen → edita esa pantalla inline** (back-friendly)

### Confirmación post-envío

- Pantalla de éxito (no un toast silencioso):
  > ✓ **Offer sent!** When Supplier accepts, it'll appear in 'Active agreements'.
- Botón: "View my offers →" (lleva a la lista de proposals)

### Navegación back

- Botón "← Back" en cada pantalla (menos la 1)
- Las pantallas son tan ligeras (1 campo, 1 toque) que se recorren en ~5s cada una.

### Anti-patrones corregidos

- Las `alert-warning`/`alert-danger` actuales (gritan "PELIGRO!" en app de pagos)
  → texto en línea + ícono ℹ️ discreto, o integrado al resumen.
- Los 7 campos simultáneos → 1 por pantalla.
- Deadline en segundos crudos → selector humano (1h/1d/1w).

---

## 8. DISEÑO — Sección 5: Privacy Lab humanizado

Reemplaza la pseudoterminal `> CANTON_PRIVATE_ISOLATION / ENCRYPTED_ISOLATED_PROT`
por afirmación de valor + prueba visual simple.

### Banner superior (afirmación, no explicación técnica)

> 🛡️ **The mediator sees nothing of this.**
> Not hidden, not encrypted — it was **never sent** to their ledger.
> That's how privacy works on Canton.

### 3 columnas en lenguaje humano

**Columna 1 — "What you see"** (verde/success, antes "Stakeholders View")
- Descripción grande + monto + badge workflow
- Las 3 parties como **etiquetas humanas** ("Supplier", "Buyer", "Mediator"),
  NO hashes
- *Detalles técnicos ▾* revela los hashes reales (proposer/accepter/thirdParty)

**Columna 2 — "What the mediator sees"** (rojo/danger, antes de disputa)
— **el corazón del demo**
- Reemplazo de la pseudoterminal por empty state grande:
  > 🔒 **Searched the mediator's ledger**
  > **0 agreements found.**
  > The mediator has no record of this transaction.
- Visual: caja con ícono candado, fondo levemente diferenciado, NO monoespaciado.

**Columna 3 — "What the mediator learns after a report"** (warning, post-disputa)
- Si no hay disputas → empty state accionable:
  "Report a problem in Act to see what the mediator learns →"
- Si hay disclosures → texto humano:
  > 👁️ **When the problem was reported, the mediator learned only this:**
  > • Amount: 5,000 CC
  > • Description: "Invoice INV-2026-001"
  > **Nothing else.**
- *Detalles técnicos ▾* revela `revealedFields`, `sourceCid`, `revealedAt`

### Comprobantes de pago (antes "Settlement Receipts")

- Renombrado a **"Payment receipts"**
- Cada receipt: monto grande + "Payment completed" (no "Atomic Settlement Executed")
  + quién→quién con etiquetas humanas
- *Detalles técnicos ▾* revela contractId, outcome técnico

---

## 9. DISEÑO — Sección 6: Estructura de Cards + TechnicalDetails

### Patrón unificado para TODAS las cards

```
┌─────────────────────────────────────────────┐
│ ESTADO PRIMERO (badge grande, color)         │  ← primacy: lo que el ojo busca
│ "In progress" · "Awaiting delivery"          │
│                                              │
│ Descripción / monto (texto grande)           │  ← el dato crítico
│ "Invoice INV-2026-001 · 5,000 CC"            │
│                                              │
│ [ACCIÓN PRIMARIA]  ⋯ más                    │  ← 1 CTA + overflow (Hick's Law)
│ [Confirm delivery]                           │
│                                              │
│ ▾ Technical details                          │  ← colapsado por defecto
│   Contract ID: 00a1...e5acf8  [⧉ copy]      │
│   Record #: 4,330,358                        │
│   Proposer: cancore::...  Accepter: ...      │
└─────────────────────────────────────────────┘
```

### Reglas

- **Status-first:** estado humano grande arriba (primacy effect). Monto segundo.
  Hashes jamás arriba.
- **1 acción primaria visible + "⋯ más"** para secundarias (Dispute/Refund al
  overflow) — Hick's Law.
- **`TechnicalDetails` reutilizable:** componente único, colapsado por defecto,
  usado en los 4 tipos de card. Props:
  ```ts
  interface TechnicalDetailsProps {
    contractId?: string;
    offset?: number;
    parties?: { label: string; partyId: string }[];
    revealedFields?: Record<string, string>;
    sourceCid?: string;
  }
  ```
- **Hover:** borde se ilumina sutil, `translateY(-2px)`, transición 150ms.
- **Empty states accionables:** cada lista vacía = 1 frase "por qué" + 1 CTA
  que avanza al siguiente paso (no texto que señala a otro lado).

### Microinteracciones (flow state)

- Acciones irreversibles (Accept/Fulfill/Dispute/Refund): pantalla de
  confirmación "Here's what will happen" → confirmar (fricción beneficiosa).
- Éxito: checkmark + mensaje humano + botón "next step".
- Loading: skeleton, NO spinner eterno; texto contextual ("Creating your agreement…").

---

## 10. Orden de ejecución sugerido (para el plan de implementación)

Secuencia optimizada para entregar valor incremental y no romper nada en el
camino. Cada fase = un commit deployable.

### Fase 0 — Limpieza (fundación, 30 min)
- Borrar los 4 archivos legacy (470 líneas) + types huérfanos + ruta /licenses.
- `npm run build:ci` debe seguir pasando.
- Commit: "chore: remove dead License boilerplate (470 lines)".

### Fase 1 — Design tokens (arregla el bug de contraste, 1-2h)
- Crear `src/styles/tokens.css` + `base.css` + `vault.css` (extraer de theme.css/App.css).
- Actualizar `index.css` para importar la nueva estructura.
- Subir `--bg-glass` a 0.85, añadir `--text-body` y `--text-on-glass`.
- Auditoría: reemplazar `text-muted` sobre glass por `text-on-glass` en todos los cv-*.
- `git push` → deploy → verificar contraste en vivo.
- Commit: "fix(design): WCAG AA tokens + glass opacity fix".

### Fase 2 — Copy humano (gran impacto visual, 1-2h)
- Crear `src/lib/copy.ts` con el diccionario de la Sección 6.
- Reemplazar los ~30 strings en VaultView/modales/toasts.
- Commit: "feat(ux): translate jargon to human language (copy.ts)".

### Fase 3 — Refactor de componentes (estructura, 3-4h)
- Extraer VaultHeader, Stepper, CopyCidButton del monolito.
- Crear TechnicalDetails reutilizable.
- Extraer CommitmentCard, DisputeCard, SettlementReceipts.
- VaultView baja de 898 → ~120 líneas.
- Commit: "refactor(vault): extract VaultView monolith into components".

### Fase 4 — Wizard ProposeStep (UX grande, 2-3h)
- Crear ProposeWizard + 4 WizardStep* componentes.
- Implementar estado del wizard (pantalla actual, datos parciales, back/next).
- Selector humano de deadline (1h/1d/1w).
- Pantalla de éxito post-envío.
- Commit: "feat(propose): 4-screen wizard (1 decision per screen)".

### Fase 5 — Privacy Lab humanizado (1-2h)
- Reemplazar pseudoterminal por empty state humano.
- Renombrar labels a lenguaje humano.
- Mover hashes/offsets a TechnicalDetails.
- Commit: "feat(privacy): humanize Privacy Lab (no pseudoterminal)".

### Fase 6 — Confirmaciones + microinteracciones (1-2h)
- Pantallas "Here's what will happen" antes de acciones irreversibles.
- Skeleton loaders.
- Commit: "feat(ux): confirmation screens + beneficial friction".

### Fase 7 — Pulido final (1h)
- Auditoría visual completa en vivo.
- Screenshots para el README (nice-to-have del handoff).
- Commit: "polish: visual audit pass + demo screenshots".

**Total estimado: 10-15 horas de implementación = 3-4 sesiones.**
Deadline 19 jul, hoy 14 jul — holgura suficiente.

---

## 11. Verificación de WCAG (checklist post-implementación)

Antes de considerar el rediseño completo, verificar:

- [ ] `--text-body` (#e4e4e7) sobre `--bg-base` (#09090b) ≥ 4.5:1 → **14:1 ✓**
- [ ] `--text-muted` (#a1a1aa) sobre `--bg-base` ≥ 4.5:1 → **7:1 ✓**
- [ ] `--text-on-glass` (#e4e4e7) sobre glass compuesto (bg-glass 0.85 sobre bg-base) ≥ 4.5:1
- [ ] Bordes de inputs (`--border-subtle`) ≥ 3:1 (UI component rule)
- [ ] Ningún texto con `opacity < 0.85`
- [ ] Texto `xsmall` (12px) usa siempre `--text-body` o mayor, no `--text-muted`
- [ ] Usar WebAIM Contrast Checker o APCA para verificar cada combinación

---

## 12. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Romper la lógica de SWR/mutations al refactorar | Los stores/hooks son intocables. El refactor es solo de presentación. |
| Deploy con bug visual tras Fase 1 | Cada fase es un commit deployable; verificar en vivo tras cada `git push`. |
| El wizard añade fricción excesiva | Pantallas 1-2 son de 1 campo (~5s cada una); testear el flujo completo cronometrado. |
| Idioma EN vs ES no decidido | Confirmar al iniciar Fase 2. Default: mantener EN con vocabulario plain. |
| Código muerto tenía imports ocultos | grep ya confirmó 0 imports en rutas activas; verificar de nuevo tras borrar. |

---

## 13. Próximos pasos (al iniciar la próxima sesión)

1. **Leer este spec completo** (es auto-contenido).
2. **Confirmar 2 decisiones pendientes:** idioma (EN plain vs ES) y si se quiere
   el visual companion del brainstorming para mockups.
3. **Invocar `writing-plans`** para convertir las 8 fases en un plan de
   implementación detallado con tareas TDD donde aplique.
4. **Empezar por Fase 0** (limpieza) — es la de menor riesgo y mayor clarificación.

---

## Apéndice A — Fuentes de la investigación UX

**Contraste / accesibilidad:**
- W3C WCAG 2.2 — Contrast (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- APCA in a Nutshell: https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html
- ThemeAndColor — Dark Mode Palette (WCAG-compliant): https://themeandcolor.com/blog/dark-mode-color-palette
- Material Design Dark Theme: https://m2.material.io/design/color/dark-theme.html

**Psicología UX:**
- Laws of UX: https://lawsofux.com/
- NN/g — Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- NN/g — Fitts's Law: https://www.nngroup.com/articles/fitts-law/
- Krug, "Don't Make Me Think" — aplicado a bitcoin: https://dl.acm.org/doi/pdf/10.1145/3121113.3121125
- ACM — When Friction Helps (transaction confirmation): https://dl.acm.org/doi/full/10.1145/3772363.3798440

**Design tokens:**
- MidRocket — Design Tokens 3-tier: https://midrocket.com/en/guides/design-tokens-guide/
- Design Systems Collective — Semantic Tokens: https://www.designsystemscollective.com/cracking-design-foundations-primitives-semantic-tokens-and-beyond-c47dd4e03253

**UX dApp / fintech:**
- Reintech — dApp UX/UI: https://reintech.io/blog/dapp-user-experience-ux-and-user-interface-ui-design
- Phenomenon Studio — FinTech trust patterns: https://phenomenonstudio.com/article/fintech-ux-design-patterns-that-build-trust-and-credibility/
- PurrWeb — Blockchain UX: https://www.purrweb.com/blog/blockchain-ux-design/

**Simplicidad / onboarding:**
- GoodUX/Appcues — Duolingo onboarding: https://goodux.appcues.com/blog/duolingo-user-onboarding
- SaaSfactor — Venmo UX case study: https://www.saasfactor.co/case-studies/venmo
