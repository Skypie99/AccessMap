# Feature Spec — Persist Map filters across app launches — 2026-05-23

## Story

As a returning user who has narrowed the Map to e.g. *"broken sidewalk + min
severity 3 + open only,"* I want those filters to still be applied when I
reopen the app the next day — so I don't have to re-pick the same chips on
every launch.

This is the second "Now" item in `FEATURES.md`. It depends on no other work
and unblocks the eventual "Saved named filter sets" feature in *Next*.

## Scope

In:
- Persist the three Map filter state pieces — `activeCategories`,
  `minSeverity`, `activeStatuses` — in `AsyncStorage` whenever the user
  changes any of them on `MapScreen`.
- Hydrate those three pieces from `AsyncStorage` on Map mount, before the
  provider's first fetch fires, so the provider's auto-fetch already uses
  the persisted statuses (avoid double-fetch).
- Validate the stored shape defensively — corrupt or out-of-vocabulary
  values fall back to the original defaults rather than crashing or
  filtering everything out.

Out (explicitly):
- No per-user keying. AccessMap currently keys other preferences by user
  id (`onboarding.ts`, `preferences.ts`) but map filters are UX shape, not
  identity-sensitive, and the existing tests show keying-per-user costs
  one extra prop drill at every save site. We'll go device-wide for v1;
  if multi-account use ever matters we can bump the key version.
- No "saved named filter sets" UI (that's the *Next* item that builds on
  this).
- No server-side mirror. Pure on-device.
- No new dependency. `@react-native-async-storage/async-storage` is
  already in `package.json`.

## Acceptance criteria

1. Pick "broken sidewalk", set min severity to 3, deselect "verified" so
   only `open` flags show. Force-quit the app. Reopen — those three
   selections are reflected in the filter panel AND in the Map results.
2. First launch with no stored value behaves exactly as today — Map shows
   `open + verified` flags with no category filter and severity ≥1.
3. Storage with a corrupt / partial payload (e.g. hand-edited devtools)
   silently falls back to defaults; nothing crashes; the next user change
   overwrites the corrupt blob.
4. `npm run typecheck` exits 0.
5. The provider doesn't double-fetch on launch — there's a single fetch
   that already uses the persisted statuses, not a default fetch + a
   second hydrated fetch.

## Design notes

New module: `src/lib/mapFilters.ts`.
- `loadMapFilters(): Promise<MapFilters | null>` — reads one
  AsyncStorage key (`@accessmap/map_filters_v1`), parses, validates each
  field against the canonical orders (`CATEGORY_ORDER`, `STATUS_ORDER`,
  `SEVERITY_ORDER`), returns null on any parse / validate failure.
- `saveMapFilters(filters: MapFilters): Promise<void>` — fire-and-forget
  write; swallows errors via `errorMessage` (only logs to console).
- `MapFilters` is a plain `type` shape — `categories: FlagCategory[]`,
  `minSeverity: FlagSeverity`, `statuses: FlagStatus[]`.

In `MapScreen`:
- `hydrated: boolean` local state, default `false`. Render path is
  unchanged when hydrated is false because the early state already has
  defaults — but the **save effect** is gated on `hydrated === true` to
  avoid overwriting saved storage with defaults before we've read it.
- On mount, run `loadMapFilters()`. On success, set the three filter
  states from the loaded values. On null, leave defaults. Then flip
  `hydrated = true`.
- A second `useEffect`, watching `[activeCategories, minSeverity,
  activeStatuses, hydrated]`, calls `saveMapFilters(...)` whenever any
  of the three change AND we're hydrated.

Double-fetch avoidance: the existing flow already has the screen mirror
`activeStatuses` into the provider via `setStatuses`. The provider's
auto-fetch fires when its `statuses` state changes. If our hydration
calls `setActiveStatuses(persisted)` synchronously in the same render
as the screen's first mount, React batches: the screen's state becomes
`persisted`, the `useEffect` that mirrors `activeStatuses → setStatuses`
runs once with the persisted list, and the provider's auto-fetch sees
the final list on its first run. No extra plumbing needed; the existing
sequence-tag race protection in the provider covers the unlikely
double-fire case anyway. (Validated by tracing the flow on paper, not
by adding new logic to the provider.)

## Risks / what could go wrong

- Storage write thrashing if the user mashes severity buttons. Mitigation:
  payload is tiny (≤500 bytes); AsyncStorage on RN debounces internally;
  this is not worth a debounce wrapper for v1. If profiling later shows
  it matters, wrap the saver in a 300ms trailing debounce.
- Schema bump later. Mitigation: key is `_v1`; bumping to `_v2` means
  the load just returns null on old entries and the user gets defaults
  once. No migration code needed.

## Verification plan

- `npm run typecheck` green before and after each commit.
- Manual trace of the rehydration flow on paper for both cases:
  - First launch, no saved filter → load returns null → defaults stand
    → setStatuses fires with DEFAULT_STATUSES → provider fetches defaults.
  - Second launch, saved filter exists → load returns the saved object
    → setActiveStatuses(saved.statuses) inside hydration → mirror
    effect runs setStatuses(saved.statuses) → provider fetches saved
    statuses. No intermediate fetch.

## Out-of-scope items spotted

None new. Pre-existing backlog items continue to apply.
