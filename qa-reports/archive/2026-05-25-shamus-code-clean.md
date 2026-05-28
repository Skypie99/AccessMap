# Code Clean Pass — 2026-05-25
**Role:** Shamus (Lead Engineer)
**Branch:** `feat/code-clean-2026-05-25`
**Scope:** Dead code, unused imports, error handling, TypeScript any, console.log, duplicate logic, comment quality

---

## Summary

A thorough sweep of the full `src/` tree against the six cleaning criteria.
The codebase was found to be in excellent shape overall — a testament to the
disciplined coding standards already in place. Only two real issues were found
and fixed.

---

## What Was Cleaned

### 1. Unused import — `src/lib/__tests__/watchedFlags.test.ts`

`import AsyncStorage from '@react-native-async-storage/async-storage'` was
imported but never used. The `jest.mock()` call uses the module string path
directly; the binding itself was a dead reference. Confirmed with
`tsc --noUnusedLocals --noUnusedParameters` (the only error across the
entire codebase). Removed.

### 2. Stale comment — `src/theme.ts`

The `severity` section comment read:
> Keep this aligned with `severityColor()` in `src/screens/ReportFlagModal.tsx`.

`severityColor()` was moved to `src/lib/flags.ts` in a prior cycle (it's
imported from there by 12+ callsites). The comment pointed to the wrong file,
which would send a future engineer on a wild-goose chase. Updated to
`src/lib/flags.ts`.

---

## What Was Left Alone and Why

### Console statements
Zero `console.log` found. All `console.warn` calls are policy-intentional
(async-storage soft-fail paths per the Error Handling Tiers table in
CLAUDE.md). None removed.

### TypeScript `any`
Zero `any` type annotations in production code. All `catch (e: any)` are
policy-blessed per CLAUDE.md. No action taken.

### Dead code blocks / commented-out code
No commented-out code found. Comments throughout are explanatory, historical,
or architecture-documenting — all appropriate. Notably, the `// import from
CL2 yet (it isn't merged into this worktree)` comment in `ReportFlagModal.tsx`
is a relevant cross-branch note, not dead code.

### Duplicate logic
Reviewed for copy-pasted utility functions. The `mountedRef` pattern appears
in ~10 files but each implementation uses the ref differently (different
state it guards, different cleanup logic) — extracting to a shared hook would
over-abstract without enough identical logic to justify it. Left in place.

Inline pluralization ternaries (`flag${n === 1 ? '' : 's'}`) appear in
several places but are all slightly different (flag vs. day vs. item) and
are idiomatic template-literal English — appropriate as inline.

### Unused exports (ts-unused-exports false positives)
The `ts-unused-exports` tool flagged 22 exports. After manual inspection:
- All type exports (e.g. `CreateFlagInput`, `FlagUpdate`, `NearestFlagHit`)
  are used in tests or across module boundaries — the tool can't see `import
  type` across the boundary.
- `severity` from `src/theme.ts` — used in `src/lib/__tests__/theme.test.ts`
  via `require()`, which the static tool can't trace.
- `a11y` from `src/theme.ts` — genuinely not imported anywhere in production
  or test code. However, it's an intentional design baseline constant
  (`minTargetSize: 44`) kept as documentation of the WCAG touch-target floor.
  Not removed — it's an intent record, not dead code.

### Error handling consistency
Audited `src/lib/flags.ts`, `src/lib/auth.tsx`, all screens, and components.
Every Supabase error in a screen follows `Alert.alert('Title', errorMessage(e))`.
Every destructive confirmation uses `confirm()` from `src/lib/confirm.ts`.
All AsyncStorage soft-fail paths use `console.warn`. Policy is consistently
applied throughout.

### Comment quality
All lib files have module-level JSDoc and inline comments on non-obvious
logic. The recently-added `contextTags.ts`, `flagsRealtime.ts`,
`flagUpdates.ts`, `flagsStore.tsx`, and `sharedModalsContext.tsx` are
particularly well-documented. No gaps found.

---

## Final Gate Results

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS (0 errors) |
| `tsc --noUnusedLocals --noUnusedParameters` | PASS (0 errors after fix) |
| `npm test -- --passWithNoTests` | PASS — 690/690 tests |
| Branch | `feat/code-clean-2026-05-25` — 1 commit, not merged |

**Note on test count:** 690 is the correct baseline for `main`. The 710 figure
in Morgan's cross-project report refers to `shamus/marker-clustering-2026-05-25`
which has 20 additional tests (updateFlagContent + tasksScope tests) that are
not yet merged to `main`. This clean branch is off main.

---

## Decisions for Sky

None. All findings were either cleanable (done) or intentionally left in place
with documented rationale. No cross-domain changes were needed.
