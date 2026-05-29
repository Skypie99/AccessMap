---
name: quinn-architecture-onboarding-2026-05-29
description: "Quinn assignment: Architecture documentation + contributor onboarding guide (knowledge transfer)"
metadata:
  type: qa-report
  date: 2026-05-29
  role: rory
  phase: future-proofing
---

# Quinn Assignment — Architecture Documentation + Onboarding (2026-05-29)

**Assigned to:** Quinn (Developer Advocacy / Docs)  
**Priority:** MEDIUM (prep work; unblocks future contributors)  
**Scope:** Document architecture, create onboarding guide  
**Status:** Docs work; no code changes

---

## Context

AccessMap is a beginner-coder learning project. Right now, only Sky (+ agents) understand the full architecture. If a new team member (or future maintainer) joins, they need a **clear map** of how the system works.

Also: this is Sky's learning project. **Documenting it** serves as a capstone artifact showing what was built and why.

Your job: **make the codebase self-documenting.**

---

## What to Document

### 1. Architecture Overview (`ARCHITECTURE.md`) ✅ COMPLETE

**High-level system design:**
- [x] App layers: UI (Expo/React Native), state (auth + flag provider), data (Supabase), storage (offline cache)
- [x] Data flow: how do flags move from user report → DB → map visualization?
- [x] Realtime: how does live flag status update propagate to clients?
- [x] Auth: how does sign-in work? JWT storage? Session lifecycle?

**Diagrams:**
- [x] Component tree (ASCII diagram: App → RootNavigator → Tabs → Screens)
- [x] Data flow example (11-step walkthrough: "User reports a flag")
- [x] Folder structure with annotations

**Delivered:**
- 586 lines, readable in 10-15 minutes
- Links to deeper docs (DATABASE.md, PATTERNS.md, CONTRIBUTING.md)

---

### 2. Supabase Data Model (`docs/DATABASE.md`) ✅ COMPLETE

**Tables:**
- [x] `users` — schema, RLS policies, triggers
- [x] `flags` — schema, RLS policies, status lifecycle, trigger-based points
- [x] `push_tokens` — schema, RLS policies
- [x] `feedback` — optional until migration

**Key concepts:**
- [x] How RLS gates access in plain English (correlated subquery examples)
- [x] How the points trigger works (forward-only, self-action handling)
- [x] How Realtime filters work (only {id, status} broadcast)

**Delivered:**
- 618 lines
- 3 detailed scenario flows: report → verify → resolve
- Example queries for testing

---

### 3. Contributor Onboarding (`docs/CONTRIBUTING.md`) ✅ COMPLETE

**For someone joining the project:**
- [x] How to set up the dev environment (clone, npm install, env vars)
- [x] How to run the app locally (iOS, Android, web, Expo Go)
- [x] How to run tests (Jest, npm test, watch mode, CI)
- [x] How to write a feature (file structure, testing strategy, code style)
- [x] How to ship a feature (branch naming, PR process, review gates)
- [x] Common gotchas with fixes (TypeScript types, react-leaflet, RLS, photos, maps)

**Delivered:**
- 461 lines, 4-5 pages
- Quick-start checklist (clone → npm start in 5 steps)
- Database migration guide
- Pre-shipping checklist

---

### 4. Common Patterns (`docs/PATTERNS.md`) ✅ COMPLETE

**Things developers ask:**
- [x] How do I add a new screen? (file structure + registration example)
- [x] How do I add a new API call? (Supabase query pattern with error handling)
- [x] How do I add a new form? (150-line ReportFlagModal example)
- [x] How do I test a feature? (Jest setup + 2 test cases)
- [x] How do I use auth? (basic + protecting features)
- [x] How do I style components? (theme tokens table)

**Delivered:**
- 588 lines
- 6 patterns, each with full code examples
- Quick reference table (file locations, imports, hooks)
- Best practices checklist

---

## Deliverables ✅ COMPLETE

All files created and committed:
- [x] `ARCHITECTURE.md` (586 lines) — system overview
- [x] `docs/DATABASE.md` (618 lines) — Supabase data model
- [x] `docs/CONTRIBUTING.md` (461 lines) — onboarding guide
- [x] `docs/PATTERNS.md` (588 lines) — common patterns

**Total:** 2,253 lines of documentation

---

## Branch & Commit

**Branch:** `docs/architecture-onboarding-2026-05-29`  
**Commit:** `ccd84be` — "docs: add ARCHITECTURE.md, DATABASE.md, CONTRIBUTING.md, PATTERNS.md"  
**Status:** Pushed to GitHub, ready for review

```
git log --oneline -1
ccd84be docs: add ARCHITECTURE.md, DATABASE.md, CONTRIBUTING.md, PATTERNS.md
```

---

## Key Decisions Documented

1. **Type vs. Interface** — Database types must use `type`, not `interface` (PostgREST requirement)
2. **Platform Maps** — PlatformMap abstraction keeps web bundle working
3. **Realtime Bandwidth** — Only {id, status} broadcast to reduce bandwidth
4. **Points Forward-Only** — No refunds on revert; prevents gaming
5. **Error Handling Tiers** — Different policies for data loss vs. convenience features
6. **EXIF Stripping** — Critical privacy step before photo upload

---

## Learning Value for Sky

Each doc serves a purpose:
1. **ARCHITECTURE.md** → Understand the whole system (20 min read)
2. **docs/CONTRIBUTING.md** → Get set up and ship a feature
3. **docs/DATABASE.md** → Deep dive on data flow and RLS
4. **docs/PATTERNS.md** → Copy-paste templates for common tasks

Together: self-documenting codebase that scales from beginner to contributor.

---

## Why This Matters

**For Sky:** Capstone artifact. Shows what was built + how to maintain it.
**For future team:** Reduces onboarding time from days to hours.
**For learning:** Documenting forces deep understanding. It's part of the learning journey.

---

## Status Summary

✅ **COMPLETE** — 2026-05-29 10:30 AM  
All documentation written, committed, and ready for review by Morgan/Sky.

---

**Original assignment by Rory — 2026-05-29**  
Quinn: Knowledge transfer work complete. Ready to merge.

