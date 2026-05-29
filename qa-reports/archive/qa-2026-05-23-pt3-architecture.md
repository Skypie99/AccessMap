# QA Run — AccessMap — 2026-05-23 (pt3, architecture stabilization)

## Summary

Architecture/consistency pass — refactor and hardening only, **no features added**.
Pulled three duplicated pieces of logic out of screen files and into `src/lib`
so they're findable, testable, and the screen layer stops being a junk drawer
for shared helpers. **4 commits** committed on `qa/auto-2026-05-23` (one chore
+ three refactors), **9 proposals** documented below. Typecheck green before
and after every single commit.

This run sits on top of two earlier pt1/pt2 QA passes from today on the same
branch — see `qa-2026-05-23.md` and `qa-2026-05-23-pt2.md` for that context.
Nothing here re-litigates those decisions; this is purely structural cleanup.

## Architecture summary — before → after

### Before

- `severityColor` (a pure hex-mapping helper) lived in
  `src/screens/ReportFlagModal.tsx`. **8 other modules** had to reach into
  that screen to get it, including `src/components/PlatformMap.tsx` and the
  `.web` variant. Components depending on screens is exactly the dependency
  direction you don't want.
- `STATUS_LABEL` (an Open/Verified/Resolved/Rejected map) and `STATUS_COLORS`
  (the badge palette) were declared **identically** in both
  `FlagDetailModal.tsx` and `MyReportsModal.tsx` — the second file even
  had a comment "Same palette as FlagDetailModal" pointing at the
  duplication. Meanwhile `STATUS_LABELS` (plural) already existed in
  `src/lib/flags.ts`, unused by either of them.
- `e?.message ?? 'Unknown error.'` was repeated **at 11 catch-block sites**
  across 8 files, with slightly different fallback strings (`'Unknown error.'`
  vs `'Unknown error'` vs none at all) and varying use of `catch (e: any)`.
- `SEVERITY_LEVELS` in `MapScreen.tsx` and `SEVERITY_VALUES` in
  `ReportFlagModal.tsx` were both local copies of `SEVERITY_ORDER` from
  `src/lib/flags.ts`.

### After

- `severityColor` lives in `src/lib/flags.ts` alongside the rest of the
  severity table (`SEVERITY_LABELS`, `SEVERITY_COLOR_NAMES`, etc). Every
  surface tints from the same canonical source. Its test moved with it
  from `src/screens/__tests__/` to `src/lib/__tests__/`.
- `STATUS_COLORS` is also in `src/lib/flags.ts`. The two duplicate
  declarations in `components/` were deleted; both files now import the
  shared `STATUS_LABELS` + `STATUS_COLORS`. Renaming `STATUS_LABEL` →
  `STATUS_LABELS` aligns with the established plural convention used by
  other `*_LABELS` records in the library.
- All 11 catch-block fallbacks now go through `errorMessage(e, fallback?)`
  in a new `src/lib/errors.ts`. The helper handles `Error`, plain-object,
  string, and empty-string throws — and rejects empty `message` strings
  so an `Alert.alert('title', '')` never sneaks through. Unit-tested.
- Severity iteration uses the canonical `SEVERITY_ORDER` everywhere; the
  two local duplicates are deleted.

### Net architecture move

The `src/lib/` layer now actually holds the pure logic the project intends
it to hold. `src/components/` and `src/screens/` only import from `lib/`,
never from each other (other than screen-to-screen modal composition,
which is legitimate). A new contributor scanning `src/lib/flags.ts` sees
the whole severity / status / category vocabulary in one file.

## Changes made (committed to branch `qa/auto-2026-05-23`)

### `859b465` — refactor: move severityColor + drop SEVERITY_LEVELS/VALUES dupes
- **Severity: High** (architectural improvement, broad reach)
- **Files**: 13 changed, +42 / -37
- **Was wrong**: pure helper in a screen file; 8 importers across `components/`
  and `screens/` reaching into a screen for it.
- **Changed**: moved `severityColor` body verbatim (same defensive default
  branch, same hex values) to `src/lib/flags.ts`; updated every importer
  to read from `@/lib/flags`; deleted `SEVERITY_LEVELS`/`SEVERITY_VALUES`
  local arrays in favor of `SEVERITY_ORDER`; relocated the pinning test
  from `src/screens/__tests__/` to `src/lib/__tests__/`.
- **Why safe**: zero behavior change. Hexes locked by the unit test. Tests
  carried over with an updated import path.

### `6c0e38a` — chore: untrack stray `*.skill` bundles + gitignore them
- **Severity: Low** (housekeeping, prevents future accident)
- **Files**: `.gitignore` + 2 deletions
- **Was wrong**: `design-direction.skill` and `product-roadmap.skill` (zip
  archives from external tooling) had landed at the project root and
  got accidentally swept into the prior commit by `git add -A`.
- **Changed**: untracked both files (`git rm --cached`) and added
  `*.skill` / `*.plugin` to `.gitignore` so a future broad-add doesn't
  re-track them.
- **Why safe**: the local files stay on disk, just no longer versioned.

### `c77cea9` — refactor: consolidate STATUS_LABEL + STATUS_COLORS into `src/lib/flags`
- **Severity: Medium** (kills line-for-line duplication)
- **Files**: 3 changed, +25 / -38
- **Was wrong**: `STATUS_LABEL` (4-entry status→label map) and `STATUS_COLORS`
  (badge palette) were declared identically in both `FlagDetailModal.tsx`
  and `MyReportsModal.tsx`. The lib already had `STATUS_LABELS` (plural).
- **Changed**: added `STATUS_COLORS` to `src/lib/flags.ts` with a WCAG-AA
  contrast note; deleted both local declarations; switched the two
  consumers to import the shared records and use the plural `STATUS_LABELS`.
- **Why safe**: identical strings, identical hex values. Pure import +
  rename.

### `6aa9ef8` — refactor: shared `errorMessage()` helper for catch blocks (10+ sites)
- **Severity: Medium** (consistency + correctness on edge cases)
- **Files**: 9 changed, +113 / -28
- **Was wrong**: 11 catch blocks repeating `e?.message ?? 'Unknown error.'`
  with subtle drift; `catch (e: any)` everywhere; no guard against empty
  `message` strings.
- **Changed**: new `src/lib/errors.ts` exporting `errorMessage(e: unknown,
  fallback?: string)`. Type-narrows defensively (Supabase sometimes throws
  plain objects, not `Error`s). Replaced every site. Added a small local
  `formatLoadError` in MapScreen that wraps `errorMessage` with the
  "Couldn't load flags: … Tap to retry." prefix so both fetch paths emit
  the same banner copy. Unit tests in `errors.test.ts`.
- **Why safe**: behavior is identical in the happy path, *more* defensive
  on edge cases (empty `message`, non-string `message`, thrown strings).

## Refactor plan executed

Ordering followed the brief's "lowest blast radius first" rule:

1. **Shared utilities** — moved `severityColor` and `STATUS_COLORS` /
   `STATUS_LABELS` into `src/lib/flags.ts`, then added the new
   `src/lib/errors.ts`. Pure-logic moves only.
2. **Core logic normalization** — collapsed the 11 `e?.message ?? '…'`
   sites onto one helper.
3. **UI / component consistency** — only the indirect win from sharing
   `STATUS_COLORS` (same badge palette everywhere now, by construction).
   Deferred deeper UI consolidation (FlashBanner, design tokens) to
   proposals.
4. **Cleanup** — deleted `SEVERITY_LEVELS` / `SEVERITY_VALUES` duplicates;
   untracked the stray `.skill` bundles and added them to `.gitignore`.

The plan deliberately stopped short of any "big diff" structural moves
(folder reorg, splitting `MapScreen`, lifting hooks). Those are in
*Proposals* below with exact steps.

## Key improvements

- **Dependency direction is now correct.** No `components/` file imports
  from `screens/` anymore (verified with grep). 8 importers were doing
  this for `severityColor` alone.
- **Shared vocabulary lives in one place.** Severity table, category
  table, status table — `src/lib/flags.ts` is the single source of truth.
- **Error-handling voice is consistent.** Every catch block fronts the
  user with the same "Unknown error." fallback wording (or a domain-specific
  override) — and we're now defensive against empty/non-string messages
  that previously could have produced a blank alert body.
- **Pure logic is testable.** `severityColor` and `errorMessage` are
  importable from `@/lib/flags` and `@/lib/errors` with no React/RN
  dependency — they run in pure-Node Jest without a mock.
- **Diff is small and reversible.** Each refactor is one logical commit.
  Reverting any single commit leaves a green typecheck.

## Risks / remaining debt

- **One catch-block intentionally left as `catch { }`** in
  `ProfileScreen.tsx:164` (the AsyncStorage default-tab write). It's a
  silent rollback path with nothing useful to display — keeping it bare
  was deliberate. Flagged here so a future contributor doesn't "fix" it.
- **`SignInScreen.tsx` was not touched.** Its catch path uses
  `Alert.alert('Auth error', error.message)` directly because
  `signInWithEmail` returns `{ error }` rather than throwing. Different
  pattern — leaving alone.
- **`feat/photo-lightbox-2026-05-23` branch exists** (and was touching
  `FlagDetailModal.tsx` during this run). It was created externally,
  not by this pass. The `errorMessage` refactor on `qa/auto-2026-05-23`
  doesn't conflict with the photo-lightbox changes, but whoever merges
  both should re-grep the photo branch for the old `e?.message` pattern
  in case any new catch blocks were added there.
- **`MapScreen.tsx` is still 746 lines.** It does a lot — location
  permission, filter UI, status-filter custom/shared fetch fallback,
  navigation params, modal orchestration. Splitting it is a Proposal
  (P6 below) — too big for an unattended pass to land safely.
- **AsyncStorage-per-user pattern is still duplicated 3 times** across
  `onboarding.ts`, `points.ts`, `preferences.ts`. Each module is short
  (~50 lines) and slightly different in semantics; consolidating is
  Proposal P8 — borderline over-engineering for the size of these files.

## Verification

- **Typecheck before**: ✅ pass (`tsc --noEmit`)
- **Typecheck after** every commit: ✅ pass
- **Typecheck after final commit**: ✅ pass
- **Commits made by this run**: 4 (1 chore + 3 refactor)
- **Files touched by this run**: 16
- **Lines: +184 / -102** (net +82, mostly the new `errors.ts` + its tests)
- **Tests added**: 1 new test file (`errors.test.ts`, 6 cases)
- **Tests moved**: 1 (`severityColor.test.ts` followed its subject from
  `src/screens/__tests__/` to `src/lib/__tests__/`)

## Proposals (NOT applied — need your review)

### P1. Move distance helpers into `src/lib/geo.ts`
- **Severity: Low** (small file move, single consumer today)
- **Why it matters**: `haversineMeters`, `formatDistance`, `speakDistance`
  in `NearbyFlagsModal.tsx` (lines 31–53) are pure utility functions. They
  belong in `src/lib/` by the project's convention. Today they have one
  caller, so this is borderline premature; but future "show distance to
  the user" surfaces (e.g. flag detail) will want them too.
- **Steps**:
  1. Create `src/lib/geo.ts` and copy the three functions verbatim. Add
     a tiny test file pinning a few known meters/km outputs.
  2. In `NearbyFlagsModal.tsx`, replace the local declarations with
     `import { haversineMeters, formatDistance, speakDistance } from '@/lib/geo';`.
  3. `npm run typecheck` — must stay green.
- **Risk**: trivial. No behavior change.

### P2. Replace `TasksScreen`'s inline flash with the shared `FlashBanner` component
- **Severity: Medium** (UI consolidation)
- **Why it matters**: `TasksScreen.tsx` has its own `flashWrap` + `flashPill`
  styles and a 2200ms timer, while `App.tsx` already uses the shared
  `FlashBanner` component (4000ms default, tap-to-dismiss, screen-reader
  announce). Two flash banners with different APIs and slightly different
  visual position drift over time.
- **Steps**:
  1. Add an optional `durationMs?: number` to `FlashBanner` (already
     there) and verify it correctly handles the 2200ms case.
  2. In `TasksScreen.tsx`: remove `flashWrap`, `flashPill`, `flashText`
     styles; remove `flashTimer` / `showFlash` logic; render
     `<FlashBanner message={flash} onDismiss={() => setFlash(null)}
     durationMs={2200} />` and call `setFlash('Verified! +5 points')` etc.
  3. Decide if the 2200ms-vs-4000ms duration difference matters. Probably
     not — pick one and remove the override.
  4. Typecheck + run app and confirm the banner still appears after a
     triage action.
- **Risk**: UI behavior differs slightly (animation, positioning). Worth
  eyeballing in the app before merging.

### P3. Consider lifting the `useIsMounted()` pattern
- **Severity: Low**
- **Why it matters**: `MapScreen.tsx`, `ProfileScreen.tsx`, and
  `MyReportsModal.tsx` each declare an identical 8-line `mountedRef`
  effect. Functionally fine, but it's a tiny duplication.
- **Steps**:
  1. Add `useIsMounted()` to `src/lib/hooks.ts` (new file) returning
     `() => boolean`. Effect mounts to `true`, cleanup sets to `false`.
  2. Replace the three call sites.
- **Risk**: low. The hooks rules of order are preserved.
- **Note**: 3 sites is the borderline of "tolerable duplication" vs
  "earned a hook". Leaving as a proposal rather than applying.

### P4. Move `Coords` type into `src/types/`
- **Severity: Low**
- **Why it matters**: `interface Coords { lat: number; lng: number }` is
  declared in `MapScreen.tsx` and `NearbyFlagsModal.tsx` — identical shape.
- **Steps**:
  1. Add `export type Coords = { lat: number; lng: number };` to
     `src/types/database.ts` (or a new `src/types/geo.ts`).
  2. Replace both local declarations with the import.
- **Risk**: trivial. No runtime change.

### P5. Quality infrastructure: install Jest + ESLint + CI
- **Severity: Medium** (already proposed in earlier reports)
- **Why it matters**: There are now five test files in `src/lib/__tests__/`
  (`flags`, `onboarding`, `points`, `preferences`, `severityColor`, `errors`)
  and zero way to actually run them. Each pass that lands tests is a vote
  for Jest setup.
- **Steps**: See the existing `proposal-testing-2026-05-23.md`,
  `proposal-lint-2026-05-23.md`, `proposal-ci-2026-05-23.md` from earlier
  passes. They're still accurate; this run added one more reason to land them.
- **Risk**: low (additive devDeps + scripts). Remember `--legacy-peer-deps`.

### P6. Split `MapScreen.tsx` (746 lines)
- **Severity: Low** (works fine today; structural cleanup only)
- **Why it matters**: it's the largest file in the project and does a lot.
  But splitting it would be a big diff, hard to review without changing
  behavior, and `tsc --noEmit` can't validate visual regressions. **Strict
  propose-only.**
- **Suggested split**:
  - Extract the filter panel (categories + severity + statuses) into
    `src/screens/MapFilterPanel.tsx`. Self-contained — takes filter
    state and toggle callbacks as props, returns JSX.
  - Extract the location-permission logic (`requestLocation`,
    `locating`, `permissionDenied`, the user-location banners) into
    `src/lib/useUserLocation.ts` (custom hook returning
    `{ location, locating, permissionDenied, recenter }`).
  - Keep the navigation/focus and the shared+custom fetch branching in
    `MapScreen.tsx` — that's the actual screen orchestration.
- **Risk**: medium. Touches a lot of UI; needs careful manual testing
  on iOS + web at minimum.

### P7. Folder consistency: where do "modal" files live?
- **Severity: Low** (structural / convention)
- **Why it matters**: `MyReportsModal.tsx` is in `src/components/`,
  `NearbyFlagsModal.tsx` and `LegendModal.tsx` are in `src/screens/`,
  `OnboardingModal.tsx` is in `src/screens/`, `FlagDetailModal.tsx` is in
  `src/components/`. There's no consistent rule, so a new modal has no
  obvious home.
- **Suggested rule**: modals that are owned by a specific tab and only
  appear in the context of that tab → `src/screens/`. Modals that are
  reusable across screens (e.g. invoked from both Tasks and Profile) →
  `src/components/`. By that rule:
  - `FlagDetailModal` is invoked from both Tasks **and** Profile → stays
    in `components/`. ✓
  - `MyReportsModal` is invoked only from Profile → should move to
    `screens/`.
  - `NearbyFlagsModal` is invoked only from Map → stays in `screens/`. ✓
  - `LegendModal` is invoked only from Map → stays in `screens/`. ✓
  - `OnboardingModal` is invoked from `App.tsx`, not a screen → debatable;
    `components/` would be reasonable.
- **Steps**:
  1. `git mv src/components/MyReportsModal.tsx src/screens/MyReportsModal.tsx`.
  2. `git mv src/screens/OnboardingModal.tsx src/components/OnboardingModal.tsx`
     (optional).
  3. Update the two `import`s.
- **Risk**: trivial, but produces a noisy diff. Worth doing in one
  review-able commit if you decide to.

### P8. AsyncStorage-per-user namespace helper
- **Severity: Low** (borderline over-engineering — only propose, don't act)
- **Why it matters**: `src/lib/onboarding.ts`, `src/lib/points.ts`, and
  `src/lib/preferences.ts` each implement the same per-user namespaced/
  versioned key pattern: `KEY_PREFIX` + `storageKey(userId)` + a
  try/catch wrapped get/set/remove pair. ~150 lines of near-duplicate
  boilerplate.
- **Suggested helper**:
  ```ts
  // src/lib/userScopedStorage.ts
  export function userScopedStorage<T>(
    prefix: string,
    encode: (v: T) => string,
    decode: (raw: string) => T | null,
  ) { /* … get/set/remove with userId namespacing … */ }
  ```
- **Trade-off**: the existing modules are short and each has different
  decoding rules (a boolean for onboarding, a number for points, an
  enum for preferences). Abstracting them might cost more in clarity
  than it saves in lines. **Recommendation: leave as-is unless a fourth
  per-user storage key shows up, then build the helper.**

### P9. The earlier QA reports' pre-existing proposals still stand
- The proposals from `qa-2026-05-22.md` and `qa-2026-05-23.md` /
  `qa-2026-05-23-pt2.md` haven't been addressed by this run and are
  still open: RLS `auth.uid()` initplan fix, leaked-password protection,
  pagination on `listFlags`, marker clustering, image resizing on
  upload, etc. This run is purely structural — none of those got
  closed here. See those reports for the exact steps.

## How to review

```bash
# Review the architecture commits only (excludes earlier today's pt1/pt2):
git diff 859b465^..qa/auto-2026-05-23 -- src

# Review everything on the branch:
git diff main..qa/auto-2026-05-23

# If you want to merge:
git checkout main
git merge --no-ff qa/auto-2026-05-23
# (or pull into main via PR if you prefer)

# If you want to discard:
git branch -D qa/auto-2026-05-23
```

## Notes / questions for you

- **The `feat/photo-lightbox-2026-05-23` branch was created externally
  during this run.** It's not part of this QA pass — looks like another
  agent or process branched off `qa/auto-2026-05-23` at `c77cea9` to add
  a photo lightbox component. Two commits there:
  `2b0a941` (component) and `9eae214` (wire it into FlagDetailModal).
  Worth checking whether you meant to spawn that, and merging or
  discarding it independently. Their FlagDetailModal edits don't
  conflict with this run's `errorMessage` work — both can land.
- **No schema, RLS, dependency, auth, or secrets changes** were made in
  this run, per the propose-only rule.
- **None of the prior QA proposals were closed.** This run is structural
  cleanup, not bug-fixing.
- The `*.skill` zip files (`design-direction.skill`, `product-roadmap.skill`)
  are still on disk at the project root; they're just no longer tracked.
  Delete them manually if you don't want them around.
