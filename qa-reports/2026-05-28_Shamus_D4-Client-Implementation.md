# D4 Client Implementation — Shamus
**Role:** Shamus (UI/component implementation specialist)
**Date:** 2026-05-28
**Branch:** `feat/d4-realtime-flags-2026-05-28`
**Spec read:** `qa-reports/2026-05-28_Dana_D4-RealtimeFlags-Filtered-SQL.md`
**Typecheck result:** PASS — `npm run typecheck` exits 0, zero errors

---

## Implementation Summary

D4 Option 2 (filtered broadcast) is fully wired on the client. The Supabase
Realtime channel `flags-status` emits only `{id, status}` per the publication
column filter; the client re-fetches the full row via the existing RLS-gated
REST endpoint before updating local state. All three safeguards are implemented.
The DB SQL (Dana's file) has NOT been applied — that step is Sky's via the
Supabase dashboard Cowork prompt.

---

## Files Modified

| File | Description |
|------|-------------|
| `src/lib/flagsStore.tsx` | Replaced legacy `public-flags` full-row subscription with D4 Option 2 channel `flags-status`. Added `setViewportGate` to context type and value so MapScreen can register the geofence predicate. Imports `fetchFlagById`, `loadRealtimeEnabled`, `logRealtimeEvent`. |
| `src/screens/MapScreen.tsx` | Pulls `setViewportGate` from `useFlags()`. Registers a viewport gate on mount (deregisters on unmount). Tracks current map region in `currentRegionRef` (seeded `DEFAULT_REGION`, synced when `location` resolves). |
| `src/screens/ProfileScreen.tsx` | Adds `Switch` import, `useRealtimeEnabled` hook call, `handleRealtimeToggle` callback, and "Real-time updates" settings section with toggle UI + styles (`toggleRow`, `toggleTextWrap`, `toggleLabel`, `toggleHint`). |
| `src/types/database.ts` | Added `realtime_subscribe_log` table type (inside `Tables`) and `log_realtime_event` function signature (inside `Functions`). Uses `type` not `interface` per CLAUDE.md gotcha #1. |

## Files Added

| File | Description |
|------|-------------|
| `src/lib/realtimePrefs.ts` | Per-device opt-in hook. AsyncStorage key `realtime_enabled` (default `false`). `useRealtimeEnabled()` hook — reactive across all mounted consumers via module-level listener set. `loadRealtimeEnabled()` and `saveRealtimeEnabled()` for direct async access. |
| `src/lib/realtimeLog.ts` | Typed wrapper for `supabase.rpc('log_realtime_event', { p_event, p_channel })`. Fire-and-forget; degrades to `console.warn` if the function doesn't exist (pre-apply state). |

---

## Safeguard Implementation Detail

### Safeguard #1 — Geofence Viewport Filter

**Location:** `MapScreen.tsx` + `flagsStore.tsx` (via `setViewportGate`).

MapScreen registers a predicate with `FlagsProvider.setViewportGate` on mount:

```typescript
setViewportGate((flag) => {
  const r = currentRegionRef.current;
  const latMin = r.latitude - r.latitudeDelta / 2;
  const latMax = r.latitude + r.latitudeDelta / 2;
  const lngMin = r.longitude - r.longitudeDelta / 2;
  const lngMax = r.longitude + r.longitudeDelta / 2;
  return flag.lat >= latMin && flag.lat <= latMax &&
         flag.lng >= lngMin && flag.lng <= lngMax;
});
```

The gate is checked in FlagsProvider's realtime payload handler, after the
full row is re-fetched. Flags outside the current viewport are discarded
(no local state update). `currentRegionRef` starts as `DEFAULT_REGION` and
is updated each time `location` resolves via a `useEffect([location])`.

**Limitation for Gary (open question #1):** `currentRegionRef` is only synced
when `location` changes, not on every `animateTo` call. If the user pans the
map significantly without a location re-fetch, the gate may pass or block
flags incorrectly for the panned delta. A more accurate approach would add
`onRegionChangeComplete` to `PlatformMap` (both `.tsx` and `.web.tsx`) and
update the ref on every map move. Deferred to avoid the PlatformMap prop
surface change in this PR — flagged for Gary's test pass.

### Safeguard #2 — Per-User Opt-In Toggle

**Location:** `src/lib/realtimePrefs.ts` (hook + storage), `ProfileScreen.tsx` (UI).

- AsyncStorage key: `realtime_enabled`, string `"true"` / `"false"`, default `false`.
- `useRealtimeEnabled()` hook hydrates from disk on mount and subscribes to
  a module-level listener set so any `saveRealtimeEnabled()` call propagates
  reactively to all mounted consumers (MapScreen, ProfileScreen) without a
  context re-render.
- `FlagsProvider` reads the pref once on mount via `loadRealtimeEnabled()`.
  If the user enables realtime while the app is running, the FlagsProvider
  subscription doesn't start until the next app mount (restart or auth
  re-cycle). **Gary open question #2:** should FlagsProvider re-poll the
  pref reactively so the subscription starts immediately when the toggle flips?
  Current implementation is safe (no surprise subscriptions) but means users
  need to re-launch after enabling. Deferring the reactive wiring to a
  follow-up PR to keep this diff reviewable.
- ProfileScreen toggle uses `Switch` (native on iOS/Android, web-compatible).
  WCAG 2.5.5: `minHeight: 44` on toggle row. `accessibilityRole="switch"` +
  `accessibilityState={{ checked }}` on the parent `View`. `Switch` itself is
  hidden from AT (`accessibilityElementsHidden`) to avoid double-announcement.

### Safeguard #3 — Observability RPC

**Location:** `src/lib/realtimeLog.ts`, called from `flagsStore.tsx`.

```typescript
// On SUBSCRIBED:
void logRealtimeEvent('subscribe', D4_CHANNEL);

// On channel teardown:
void channelRef.unsubscribe().then(() => {
  void logRealtimeEvent('unsubscribe', D4_CHANNEL);
});
```

Fire-and-forget (`void`). Pre-apply graceful degradation: if `log_realtime_event`
doesn't exist on the DB yet, PostgREST returns a 404/PGRST error which is
`console.warn`-ed and swallowed. The subscribe/unsubscribe flows are never
blocked by logging failures.

---

## D4_CHANNEL Constant

Channel name is `'flags-status'` as specified in Dana's spec. Declared as a
module-level `const` inside `FlagsProvider`'s component scope. Gary note: if
multiple `FlagsProvider` mounts existed simultaneously (they don't today), they
would both try to subscribe to the same channel name — Supabase deduplicates
channels internally so this is safe, but the log would double-count.

---

## Open Questions for Gary

1. **Viewport gate precision:** `currentRegionRef` is synced only on `location`
   change, not on map pan. If the user pans to a new area, the gate lags until
   the next GPS update. This means realtime flags from the new viewport area
   could be discarded, or flags from the old viewport could be accepted. Severity:
   low (realtime is cosmetic; next `refreshFlags()` tap corrects state). Fix:
   add `onRegionChangeComplete` to `PlatformMap` and update the ref there.

2. **Reactive enable/disable:** The FlagsProvider realtime subscription reads
   `realtimeEnabled` once on mount. Toggling in Profile while the app is
   running takes effect on the next mount, not immediately. Gary should add a
   test asserting the toggle value is persisted correctly — the UX gap (requires
   restart) is acceptable for now but should be documented in the toggle hint
   text if Sky agrees.

3. **`D4_CHANNEL` const scope:** Declared inside `FlagsProvider`'s render body.
   Gary: confirm this doesn't cause `useEffect` dep lint warnings in CI (it
   shouldn't — the const is a string literal closed over by the effect, not
   a reactive value).

---

## Open Questions for Jordan

1. **Profile toggle visibility:** The `realtimeEnabled` value is stored in
   `AsyncStorage` as `"true"` / `"false"` with no user-id scope — it is a
   device-wide preference, not a per-account preference. If two users share
   one device, the second user inherits the first user's realtime preference.
   Jordan should confirm this is acceptable given the privacy posture (no
   sensitive data in the toggle itself) or request a user-scoped key.

2. **Gate-absent window:** Between app launch and `setViewportGate` executing
   (one render cycle), `viewportGateRef.current === null`. During that window,
   all realtime payloads pass without geofencing. This is a sub-second window
   and the subscription itself only starts after `loadRealtimeEnabled()` awaits,
   so in practice no events arrive during this gap. Jordan: confirm this is
   acceptable.

---

## Const. Art. 5 Compliance

No Supabase mutating MCP tools were called. No `schema.sql` or migration files
were modified. Dana's SQL files are untouched. The `realtime_subscribe_log`
type in `database.ts` is client-side TypeScript only — it describes the shape;
it does not create the table.

---

## Cowork Prompt for Sky (apply D4 SQL before testing realtime)

Before testing realtime on device, Sky must apply Dana's SQL. The Cowork prompt
is in `qa-reports/2026-05-28_Dana_D4-RealtimeFlags-Filtered-SQL.md` under
"Cowork Prompt for Sky (Step 3)". The client-side code is safe to deploy before
that SQL is applied: the subscription will connect but receive no events (the
publication filter isn't live), and the observability RPC will degrade to
`console.warn`.
