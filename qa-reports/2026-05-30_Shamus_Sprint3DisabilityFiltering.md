# Shamus — Sprint 3 Disability Filtering Phase A (Phase 5, Item 6)

**Date:** 2026-05-30
**Role:** Shamus (Feature Pusher)
**Branch:** `feat/sprint3-disability-filtering` (off `feat/phase4-seasonal-tags`)
**Commit:** `c3cddf6` feat(sprint3): disability filtering Phase A — extend context_tags vocabulary
**Sky decision implemented:** Option A — extend `context_tags` (zero schema change, reuse vocabulary system). Same pattern as W6-5 seasonal tags.

---

## What shipped

| Part | File | Change |
|---|---|---|
| 1 — Vocabulary | `src/lib/contextTags.ts` | `DISABILITY_TAGS` frozen array (5 tags), `DisabilityTag` type, `DISABILITY_TAG_LABELS`, `isDisabilityTag()`, widened `isValidTag`/`tagLabel`/`GeneralContextTag`, new pure `matchesDisabilityFilter()` predicate |
| 2 — Reporting UI | `src/screens/ReportFlagModal.tsx` | "Who does this affect?" multi-select chip picker after the seasonal section; shares `contextTags` state + the 5-tag cap + capability gate |
| 3 — Map filter | `src/screens/MapScreen.tsx` | "Who does this affect?" filter row in the panel; client-side OR-match on already-loaded flags (no new DB query); wired into `clearFilters` + `filtersActive` |
| 4 — Detail display | `src/components/FlagDetailModal.tsx` | Disability tags render in their own "Who this affects" chip group, distinct from Conditions + Seasonal |
| Tests | `src/lib/__tests__/contextTags.test.ts` | Disability vocabulary/helpers + full `matchesDisabilityFilter` logic coverage |

**Tags:** `mobility_barrier`, `vision_hazard`, `hearing_concern`, `cognitive_load`, `temporary_closure`.

### Design choices
- **OR semantics** on multi-select: a user selecting mobility + vision sees barriers affecting *either*, not only both — correct for someone with multiple access needs.
- **"Show by default":** empty selection = show everything, so legacy/untagged flags are only hidden once the user actively narrows by need.
- **Session-only filter (not persisted):** the disability filter is deliberately kept out of the persisted `mapFilters` triple and saved-sets/presets, to avoid disturbing the existing saved-set matching logic (which compares categories/severity/status only). Documented inline. Revisit if persistence becomes a clear need.

### Privacy boundary (Jordan gate, per PHASE5_STRATEGY §Item 6)
Held: every tag describes the **barrier** ("this is a mobility barrier"), never the reporter's or reader's disability. Nothing logs or stores which filter a user picks tied to identity. Documented in the `DISABILITY_TAGS` doc comment.

---

## Quality gates

- ✅ **My 5 feature files:** TypeScript clean.
- ✅ **Tests:** full suite green — 83 suites, 1323 passed / 18 todo. New: 15 disability-vocabulary assertions + 7 `matchesDisabilityFilter` cases.
- ✅ **No migration needed** (Option A reuses `flags.context_tags`).

---

## DECISIONS FOR SKY / BLOCKER (not mine to fix)

⚠️ **`App.tsx` has a duplicate `Sentry` declaration that breaks the entire web bundle build.** This is **uncommitted concurrent work** (the Sentry-wiring effort), NOT part of this feature, and it appeared *after* my initial clean typecheck — classic shared-tree churn.

```
App.tsx(2,22):  error TS2300: Duplicate identifier 'Sentry'.   // import { initSentry, Sentry } from '@/lib/sentry'
App.tsx(20,13): error TS2300: Duplicate identifier 'Sentry'.   // import * as Sentry from '@sentry/react-native'
```

- **Impact:** Metro returns HTTP 500 (`TransformError: Duplicate declaration "Sentry"`), so the web preview never mounts — I could **not** get a browser-rendered verification of the new filter UI. The pure logic is fully unit-tested and the UI is a 1:1 mirror of the already-shipped seasonal picker, so confidence is high regardless.
- **Why I didn't fix it:** outside this feature's scope and editing an in-flight file risks colliding with whoever owns the Sentry wiring. One of the two imports (line 2 local wrapper vs. line 20 direct package) is redundant — owner should drop one.
- **Action for Morgan:** route the App.tsx duplicate-Sentry fix to the Sentry-wiring owner (Rory?) before any preview/EAS build. My branch is unaffected.

---

## Verification trail
- `npm run typecheck` → only errors are the two App.tsx lines above; all feature files clean.
- `npx jest` → 1323 passed.
- Web preview attempted → blocked by the App.tsx bundle break documented above.
