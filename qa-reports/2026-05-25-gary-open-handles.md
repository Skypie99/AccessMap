# Gary QA — Jest Open Handles Fix
**Date:** 2026-05-25  
**Branch:** `fix/jest-open-handles-2026-05-25`  
**Commit:** `a42518a`

---

## Summary

Fixed the intermittent "A worker process has failed to exit gracefully and has been force exited" warning in the Jest test suite.

---

## Root Cause

**Import chain leaking a real Supabase client into the test worker:**

```
filterSets.test.ts  →  filterSets.ts  →  flags.ts  →  supabase.ts  →  createClient()
mapFilters.test.ts  →  mapFilters.ts  →  flags.ts  →  supabase.ts  →  createClient()
```

`supabase.ts` calls `createClient()` at module-evaluation time with `autoRefreshToken: true` and `persistSession: true`. This causes `GoTrueClient._initialize()` to fire immediately as an async chain that calls `_recoverAndRefresh()`, which:

1. Reads from AsyncStorage (these two test suites use a custom mock that returns `undefined` — hence the `TypeError: Cannot use 'in' operator to search for 'sb-localhost-auth-token' in undefined` visible in test output)
2. May attempt network requests to the auth endpoint
3. Starts an internal `setInterval` auto-refresh ticker

Although Supabase calls `.unref()` on its own `setInterval`/`setTimeout` (lines 4841–4871 in `GoTrueClient.ts`), the unresolved Promise chain from `_initialize()` still keeps the worker alive — which triggers the "force exit" warning on slower runs.

**Why it was intermittent:** The process could exit clean if the event loop drained fast enough. On slower CI / first runs, the pending microtasks took longer and tripped the Jest timeout.

---

## Fix

Three files changed (18 lines added total):

### 1. `src/lib/__tests__/filterSets.test.ts`
Added `jest.mock('../supabase', () => ({ supabase: {} }))` immediately after the AsyncStorage mock. Matches the identical pattern already used in `a11yText.test.ts`, `points.test.ts`, `flagsRealtime.test.ts`, and others. These tests only need the constants from `flags.ts` (CATEGORY_ORDER, SEVERITY_ORDER, STATUS_ORDER) — they never call any Supabase method directly.

### 2. `src/lib/__tests__/mapFilters.test.ts`
Same mock added for the same reason.

### 3. `jest.config.js`
Added `openHandlesTimeout: 3000`. This tells Jest to wait 3 seconds after all tests finish before printing the open-handles warning, giving any remaining async teardown time to complete. Belt-and-suspenders guard for any future import-time async work.

---

## Verification

| Check | Result |
|---|---|
| `npm test -- --passWithNoTests --detectOpenHandles` | 789/789 pass, **no open-handle warning**, clean exit |
| `npm test -- --passWithNoTests --forceExit` (tail -5) | 789/789 pass |
| `npx tsc --noEmit` | 0 errors |
| "worker process has failed to exit gracefully" | **Gone** |

Note: running with `--forceExit` will always print "Force exiting Jest: Have you considered using..." — that is the flag advertising `--detectOpenHandles`, not an open-handle warning. The actual "worker process has failed to exit gracefully" message no longer appears.

---

## What Was NOT Changed

- No production source files were modified
- No test behavior was changed — all 789 tests pass with identical assertions
- The Supabase client mock used (`{ supabase: {} }`) is the minimal stub that satisfies TypeScript; the same stub is used across 8 other test files

---

## DECISIONS FOR SKY

None — this is a safe, targeted test-infrastructure fix with no behavior impact.
