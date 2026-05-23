# Feature Spec — Distance + ETA on Tasks cards — 2026-05-23

## Story

> As a triager scanning the Tasks tab, I want to see at a glance how
> far each flag is from me and roughly how long it'd take to walk
> there, so I can pick what's actually nearby without flipping to the
> Map.

Today, each card's meta line is just `Severity 3 • 37.7752, -122.4101`.
That's a number a sighted user can't reason about. The Map already
sorts by distance via NearbyFlagsModal — Tasks should benefit from the
same data.

## Scope (in)

- Hoist the haversine + walking-ETA helpers currently inlined inside
  `src/screens/NearbyFlagsModal.tsx` into a shared `src/lib/distance.ts`.
- Add a small `useUserLocation()` hook in `src/lib/location.ts` so
  Tasks can request and observe the user's coords independently from
  MapScreen.
- Update the `FlagCard` meta line in `TasksScreen.tsx` to include
  distance and walking ETA when location is available, e.g.
  `Severity 3 • 0.3 km · 4 min walk • 37.7752, -122.4101`.
- Re-point `NearbyFlagsModal.tsx` at the shared utility (no behavioral
  change — same "320 m" / "1.2 km" output).

## Scope (out)

- No new screens, no new server queries, no Supabase changes.
- No live tracking — `useUserLocation()` fetches once on mount (Tasks
  doesn't need sub-second precision).
- No deep refactor of MapScreen; it still owns its own location state.
- No miles toggle. Defer until a real i18n pass.
- No sorting Tasks by distance — that's a separate decision; this
  spec only surfaces the number on each card.

## Acceptance criteria

1. `npm run typecheck` exits 0 after each commit.
2. With location permission granted, every Tasks card shows
   `Severity {n} • {distance} · {minutes} min walk` in the meta line
   (plus the existing lat/lng on the line below).
3. With location permission denied or while the location request is in
   flight, cards render exactly as today (no distance, no error
   surfaced to the user — graceful degrade).
4. `NearbyFlagsModal` still sorts by distance and shows `"320 m"` /
   `"1.2 km"` in the same place as before.
5. No new dependencies.
6. The distance/ETA strings are memoized so the FlatList doesn't
   recompute haversine on unrelated re-renders.

## Design notes

### Units

- Internal source-of-truth: **kilometers** (float). One unit avoids
  the "did this function take meters or km?" foot-gun.
- Display: under 50 m → `"<50 m"`; under 1 km → `"320 m"`; otherwise
  `"1.2 km"`. Mirrors what NearbyFlagsModal does today (rounded m
  below 1 km, one decimal km above).
- Walking pace: **5 km/h** (~83 m/min), the same urban-pace assumption
  Google Maps uses. ETA rounds up to at least 1 minute.

### New utility — `src/lib/distance.ts`

```ts
export function haversineKm(a, b): number
export function walkingMinutes(km): number
export function formatDistance(km): string
export function formatWalkingEta(km): string
```

Pure functions. No React, no platform code. Easy to unit-test once
Jest lands.

### New hook — `src/lib/location.ts`

`useUserLocation()` returns `{ location, loading, error, refresh }`.
Requests permission once on mount via `expo-location`. Mirrors
MapScreen's pattern so Tasks doesn't have to duplicate the dance. On
permission denied or any error, `location` stays `null` and the UI
falls back to the old (no-distance) layout.

### TasksScreen integration

- Call `useUserLocation()` at the top level.
- Pass `userLocation` down to `FlagCard` as a prop.
- Inside `FlagCard`, compute `km / distanceText / etaText` inside a
  `useMemo` keyed on `flag.lat / flag.lng / userLocation`.
- Render in the existing `cardMeta` line; keep the lat/lng line for
  power users.

## Non-goals & risks

- The location hook is local to Tasks (option **b** in the brief).
  Lifting MapScreen's location to a context is bigger scope and not
  needed here.
- If a user is far from any flag (e.g., on the wrong continent), the
  km number gets large. The format handles that fine ("12345 km" is
  weird but technically correct); not worth a special case.
- Walking pace is a rough estimate. If we ever do accessible-routing
  (wheelchair pace ~3 km/h), revisit `walkingMinutes`.
