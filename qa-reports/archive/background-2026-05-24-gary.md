---
mode: background
model_tier: opus-4-7
project: AccessMap
role: Gary (QA Engineer)
cycle_id: gary-bg-2026-05-24
branch: main (AUDIT-ONLY — Const. 12.5 privacy-sensitive default)
audit_only: true
---

# Gary — BACKGROUND audit (2026-05-24)

**Scope:** Scheduled evening Gary shift. Constitution Art. 12 applies:
AUDIT-ONLY on AccessMap (no commits), ≤1 reversible change per cycle,
no external sends (not even via Morgan). Sentinel check ran first
(`~/.claude/BACKGROUND_HALT` absent) so the cycle proceeded.

---

## TL;DR

The task brief assumes "no tests, no linter, no CI." That brief is
**outdated**. AccessMap currently has:

| Layer | State |
| --- | --- |
| Jest + jest-expo preset | **Installed and green.** 38 suites / 578 cases passing in ~1.5s |
| Typecheck (`tsc --noEmit`) | Green |
| ESLint + Prettier | **Still proposed, not installed** — `qa-reports/proposal-lint-2026-05-23.md` |
| CI (`.github/workflows/`) | **Still proposed, not installed** — `qa-reports/proposal-ci-2026-05-23.md` |

So Gary's standing carry-overs are unchanged from 2026-05-23: two
propose-only items waiting on Sky to approve dependency installs. No
new infrastructure proposals from this cycle — but I did find concrete
coverage gaps that are addressable in a future cycle **without new
dependencies**, captured in §3 below.

---

## 1. Test run (sanity)

```
PASS src/lib/__tests__/tasksSort.test.ts
...
Test Suites: 38 passed, 38 total
Tests:       578 passed, 578 total
Snapshots:   0 total
Time:        1.457 s
```

Suite is fast and clean. Median ~13 cases per file; the lightest
suites (5–7 cases) are mostly small surfaces (`changelogExpanded`,
`errors`, `confirm`) that don't have much more to test.

---

## 2. Outdated proposal — testing infra

`qa-reports/proposal-testing-2026-05-23.md` is now **LANDED**, not
proposed. The runner, preset, types, scripts, and `jest.config.js` are
all in place. That proposal file should be either deleted or annotated
`STATUS: SHIPPED 2026-05-23` so it doesn't keep showing up in
Morgan's "still pending owner approval" rollups. **Not auto-applying**
that annotation because this is AUDIT-ONLY and even doc edits in
`qa-reports/` belong on a branch (Const. Art. 4 — Gary uses `test/`).

### DECISION FOR SKY
Two flavors of cleanup, your pick:

```
# A. annotate as shipped (preserves history of the original ask)
echo "" >> qa-reports/proposal-testing-2026-05-23.md
echo "## Status update (2026-05-24)" >> qa-reports/proposal-testing-2026-05-23.md
echo "Shipped — jest.config.js, jest.setup.js, scripts, and 38 test suites \
are live. This proposal is closed." >> qa-reports/proposal-testing-2026-05-23.md

# B. or move/delete it
git mv qa-reports/proposal-testing-2026-05-23.md \
       qa-reports/shipped/proposal-testing-2026-05-23.md
```

Either way, do it on a `test/` branch, not main.

---

## 3. Coverage gaps (no new deps required)

I walked `src/lib/` and matched against `src/lib/__tests__/`. Six
source files have no matching test file:

| File | Test status | Why / next step |
| --- | --- | --- |
| `accessibility.ts` | None | React hook around `AccessibilityInfo.isScreenReaderEnabled` + `addEventListener`. Pure-logic share is small; testing it means mocking `react-native`'s AccessibilityInfo and using `@testing-library/react-native`'s `renderHook`. **Needs new dep** (`@testing-library/react-native`) — propose-only, deferred. |
| `auth.tsx` | None | React context provider. Same story as above — needs renderHook + a Supabase auth-listener mock. **Needs new dep** — propose-only, deferred. |
| `flagsStore.tsx` | None | Same — context-shaped. Same dep ask. |
| `location.ts` | None | Hook around `expo-location`. Same dep ask. |
| `supabase.ts` | None | Thin builder — testing it would mostly re-test `@supabase/supabase-js`. **Leave untested** (the env-var guard is exercised by `app/_layout.tsx` startup). |
| `users.ts` | None | One Supabase wrapper. **Testable today without new deps** using the same `jest.mock('../supabase', ...)` pattern already used in `feedbackStore.test.ts` and `dataExport.test.ts`. **Proposed for next cycle** (see §4). |

### Within-existing-suite gap: `flags.ts` Supabase functions

`src/lib/flags.ts` exports 13 things. The current `flags.test.ts` (9
cases) only covers the **static constants and pure helpers**:
`CATEGORY_LABELS`, `CATEGORY_ORDER`, `SEVERITY_*`, `STATUS_*`,
`FLAG_PHOTOS_BUCKET`. The **Supabase-touching functions** —
`listFlags`, `listFlagsByUser`, `createFlag`, `updateFlagStatus`,
`deleteFlag`, `fetchFlagById`, `fetchFlagsByIds`, `listRecentFlags`,
`uploadFlagPhoto` — have **zero coverage**.

This is the highest-leverage gap in the suite right now. The schema
trigger that awards points fires on `updateFlagStatus` calls, so a
regression here directly affects user-visible points/streak behavior.

The mock pattern is already proven in the codebase
(`feedbackStore.test.ts:32-50` does the chainable builder). No new
dependencies needed.

---

## 4. Proposed next-cycle work — `flags-supabase.test.ts`

Single new test file. No new deps. Same builder-mock pattern as
`feedbackStore.test.ts`. Add it as `src/lib/__tests__/flagsSupabase.test.ts`
(separate from the existing `flags.test.ts` to keep blame clean).

### What it should cover (intended behavior, not current)

- **`listFlags`**
  - Default statuses = `['open', 'verified']` (locked in — points-flash
    banner on Tasks depends on this default).
  - Cap at 500 rows (any caller asking for more is a bug — gotcha §3
    in `CLAUDE.md` already references this).
  - Order `created_at desc` (Tasks card ordering depends on it).
  - Empty `data` resolves to `[]`, not `null`.
  - `error` rejects.
- **`listFlagsByUser`**
  - Filters `user_id = <id>` and caps at 200.
  - Empty resolves to `[]`.
- **`createFlag`** — passes `userId` through as `user_id`, defaults
  `status` to `'open'`, returns the inserted row.
- **`updateFlagStatus`** — sends exactly `{ status }`, no other
  columns (so the points trigger sees a clean transition).
- **`deleteFlag`** — sends `eq('id', ...)` and resolves on success.
- **`fetchFlagById`** — `.single()` happy path, **and** the
  `PGRST116` "no rows" path returns `null` rather than throwing (this
  is load-bearing for the deep-link path).
- **`fetchFlagsByIds`** — empty-array input short-circuits without
  hitting Supabase (an `in([])` query is undefined behavior in
  postgrest; the existing function has a guard — the test locks it
  in).
- **`uploadFlagPhoto`**
  - File path is `${userId}/${timestamp}.${ext}` — the Storage RLS
    policy enforces the user-UUID prefix (`schema.sql`), so this is a
    security-sensitive invariant.
  - `contentType` matches extension (`png` → `image/png`, `webp` →
    `image/webp`, anything else → `image/jpeg`).
  - Missing extension defaults to `jpg`.
  - Query-string suffix on the URI doesn't break extension parse
    (`/foo.jpg?cache=1` → `jpg`).

### What it should NOT cover

- The actual round-trip to Supabase (that's an integration test, not
  unit — same line we drew for `dataExport.test.ts`).
- The pricing trigger logic itself — that lives in `schema.sql` and
  is mirrored in `points.test.ts` constants.

### Estimated size

~20–25 cases, similar shape to `feedbackStore.test.ts`. Should land
in a single small commit on `test/flags-supabase-coverage-<date>`.

**Not implementing this cycle** because AccessMap is AUDIT-ONLY in
BACKGROUND mode (Const. 12.5). Next foreground `/gary` invocation
should pick this up.

---

## 5. Outstanding standing proposals (Sky to approve)

Both are unchanged since 2026-05-23. Re-surfacing here so they don't
get lost:

### a. ESLint + Prettier — `qa-reports/proposal-lint-2026-05-23.md`

- Adds: `eslint`, `eslint-config-expo`, `eslint-plugin-react-hooks`,
  `prettier`, `eslint-plugin-prettier`, `eslint-config-prettier`.
- Catches: missing `useEffect` deps, floating promises, color literals
  (warn-only — eases future theme system without forcing it).
- Why I haven't auto-installed: dependency install + lint-on-save
  changes the local dev surface for the learning owner. Wants Sky's
  green light.

### b. CI — `qa-reports/proposal-ci-2026-05-23.md`

- Single `.github/workflows/ci.yml` that runs typecheck + (eventually)
  lint + tests on every push and PR.
- Currently bottlenecked on (a) — CI without lint is half a net.
- Same hold reason: changes how the project ships, owner approval.

---

## 6. Constitution-mandated DECISIONS FOR SKY

1. **Approve lint install?** See `qa-reports/proposal-lint-2026-05-23.md`.
   One copy-paste install block; ~6 minutes including auto-fix on
   existing files.
2. **Approve CI workflow?** See `qa-reports/proposal-ci-2026-05-23.md`.
   Should land after (1).
3. **Close the shipped testing proposal?** See §2 above — annotate or
   move out of `qa-reports/proposal-*.md`.
4. **Authorize the `flags-supabase.test.ts` add?** No new deps; pure
   test file on a `test/` branch. Estimated 20–25 cases, one commit.

These are propose-only; nothing was changed this cycle.

---

## Cycle audit trail

- Started: 2026-05-24 evening, scheduled-task `evening-gary-shift`.
- Halt sentinel: absent (`~/.claude/BACKGROUND_HALT` not present).
- AUDIT-ONLY enforced: no file writes outside `qa-reports/`.
- Reversible-change budget used: 0 of 1 (audit, no change applied).
- External sends: none (Const. 12.2 → Art. 9.4 inherited).
- Files read only: `package.json`, `src/lib/*.ts`, `src/lib/__tests__/`,
  `qa-reports/proposal-*.md`, `jest.config.js`.
- Output: this report. STOP — Morgan picks it up on next sweep.
