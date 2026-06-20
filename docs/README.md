# 📚 Documentación CantonVault — Índice

> **Empezar aquí.** Este índice te dice qué leer según lo que necesites.

**Última actualización**: 2026-06-20

---

## 🚀 Si tienes 5 minutos (visión general)

1. [README.md](../README.md) — qué es CantonVault, stack, plan
2. [decisiones/01-estrategia-ganadora.md](decisiones/01-estrategia-ganadora.md) — por qué esta idea y no otra

## 🏗️ Si vas a programar (arquitectura)

1. [decisiones/02-arquitectura-tecnica.md](decisiones/02-arquitectura-tecnica.md) — stack, contratos Daml, extensiones al quickstart
2. [herramientas.md](herramientas.md) — versiones, URLs, qué instalar
3. [investigacion-tecnica.md](investigacion-tecnica.md) — hallazgos que justifican cada decisión técnica

## 🎬 Si vas a armar el pitch

1. [decisiones/03-posicionamiento-pitch.md](decisiones/03-posicionamiento-pitch.md) — naming, narrativa, script del video, slides
2. [decisiones/01-estrategia-ganadora.md](decisiones/01-estrategia-ganadora.md) § "test de Ethereum" y "test de VP de banco"

## ❓ Si necesitas justificar una decisión

1. [decisiones/01-estrategia-ganadora.md](decisiones/01-estrategia-ganadora.md) § "alternativas descartadas"
2. [investigacion-tecnica.md](investigacion-tecnica.md) § fuente del hallazgo específico

## 🔧 Si necesitas instalar algo

1. [herramientas.md](herramientas.md) — verificá que esté en la lista antes de instalar

---

## 📂 Estructura de carpetas

```
docs/
├── README.md                          ← ESTE ÍNDICE
├── decisiones/
│   ├── 01-estrategia-ganadora.md      ← por qué CantonVault
│   ├── 02-arquitectura-tecnica.md     ← cómo lo construimos
│   └── 03-posicionamiento-pitch.md    ← cómo lo presentamos
├── herramientas.md                    ← qué usamos (versiones + URLs)
├── investigacion-tecnica.md           ← base empírica de las decisiones
└── superpowers/
    └── specs/                         ← specs formales (workflow superpowers)
        └── 2026-06-20-cantonvault-design.md  ← (a escribir)
```

---

## 🔄 Cómo se sincroniza esta documentación

La documentación sigue un flujo **investigación → decisión → spec → implementación**:

```
investigacion-tecnica.md  ──►  decisiones/01,02,03  ──►  specs/*  ──►  código
       (hallazgos)              (qué decidimos)        (cómo)       (resultado)
```

**Regla**: ninguna decisión técnica se toma sin estar justificada en `investigacion-tecnica.md` o marcada explícitamente como ⚠️ no verificada.

**Regla**: ningún cambio de arquitectura se aplica sin actualizar `decisiones/02-arquitectura-tecnica.md`.

**Regla**: ninguna herramienta se instala sin estar en `herramientas.md` o justificada en un nuevo doc de decisión.
