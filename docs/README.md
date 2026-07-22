# 📚 CantonVault Documentation — Index

> **Start here.** This index tells you what to read based on what you need.

**Last updated**: 2026-06-20

---

## 🚀 If you have 5 minutes (overview)

1. [README.md](../README.md) — what CantonVault is, stack, plan
2. [decisiones/01-estrategia-ganadora.md](decisiones/01-estrategia-ganadora.md) — why this idea and not another

## 🏗️ If you're going to code (architecture)

1. [decisiones/02-arquitectura-tecnica.md](decisiones/02-arquitectura-tecnica.md) — stack, Daml contracts, extensions to the quickstart
2. [herramientas.md](herramientas.md) — versions, URLs, what to install
3. [investigacion-tecnica.md](investigacion-tecnica.md) — findings that justify each technical decision

## 🎬 If you're preparing the pitch

1. [decisiones/03-posicionamiento-pitch.md](decisiones/03-posicionamiento-pitch.md) — naming, narrative, video script, slides
2. [decisiones/01-estrategia-ganadora.md](decisiones/01-estrategia-ganadora.md) § "Ethereum test" and "bank VP test"

## ❓ If you need to justify a decision

1. [decisiones/01-estrategia-ganadora.md](decisiones/01-estrategia-ganadora.md) § "discarded alternatives"
2. [investigacion-tecnica.md](investigacion-tecnica.md) § source of the specific finding

## 🔧 If you need to install something

1. [herramientas.md](herramientas.md) — check that it's in the list before installing

---

## 📂 Directory structure

```
docs/
├── README.md                          ← THIS INDEX
├── decisiones/
│   ├── 01-estrategia-ganadora.md      ← why CantonVault
│   ├── 02-arquitectura-tecnica.md     ← how we build it
│   └── 03-posicionamiento-pitch.md    ← how we present it
└── investigacion-tecnica.md           ← empirical basis for decisions
```

---

## 🔄 How this documentation is synced

The documentation follows a **research → decision → implementation** flow:

```
investigacion-tecnica.md  ──►  decisiones/01,02,03  ──►  código
       (findings)              (what we decided)       (result)
```

**Rule**: no technical decision is made without being justified in `investigacion-tecnica.md` or explicitly marked as ⚠️ unverified.

**Rule**: no architecture change is applied without updating `decisiones/02-arquitectura-tecnica.md`.

**Rule**: no tool is installed without being listed in `herramientas.md` or justified in a new decision doc.