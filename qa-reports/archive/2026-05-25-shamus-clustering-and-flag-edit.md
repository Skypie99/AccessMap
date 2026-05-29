# Shamus — Marker Clustering + Flag Editing
**Date:** 2026-05-25 · **Branch:** `shamus/marker-clustering-2026-05-25`
**Tests:** 690/690 · typecheck clean

---

## What shipped

### 1. Marker clustering (`src/components/PlatformMap.tsx`)

Replaced `MapView` with `ClusteredMapView` from `react-native-map-clustering`. Nearby flags cluster into a blue bubble at low zoom levels; individual pins appear at high zoom. All existing behaviour preserved: `animateTo`, `showCallout`, long-press drop, `focusedFlagId` opacity, callouts.

**A11y (Alex):** Default cluster bubbles have no `accessibilityLabel`. Fixed with `renderCluster` — custom `Marker` with `accessibilityRole="button"` and `accessibilityLabel="${count} accessibility flags. Tap to expand."`.

Clustering config: `radius={40}`, `clusterColor="#2563EB"`.

### 2. Flag editing (`src/components/FlagDetailModal.tsx` + `src/lib/flags.ts`)

Owners can edit `description`, `category`, and `severity` on their own `open` flags.

- **Edit button** — visible only when `isOwn && status === 'open'`
- **Inline form** — description TextInput, horizontal category chip scroll, severity 1–5 buttons
- **Save** — calls `updateFlagContent()` (new), refreshes `shownFlag` inline
- **Jordan conditions met** — read-only fields (`id`, `user_id`, `lat`, `lng`, `status`, `photo_url`, `created_at`) never sent

**Accessibility:** all form controls have `accessibilityRole`, `accessibilityLabel`, `accessibilityState`.

---

## RLS gate (DO NOT SHIP without this)

The current `flags update own` RLS policy allows owners to update open AND non-open flags. Jordan's mandatory condition: replace with a policy that adds `status = 'open'` to the `USING` clause.

Migration SQL is in `qa-reports/2026-05-25-shamus-flag-editing-brief.md`. Sky applies via Supabase dashboard. Until then, the UI is built and tested but the feature must not be promoted to users.

---

## Next steps

- **Gary**: write test coverage for `updateFlagContent` in `src/lib/flags.ts` (pure function — mock Supabase)
- **Alex**: contrast audit on category chip active state (`color.brand` text on `color.brandSoft` background — verify AA in both modes)
- **Sky**: apply RLS migration → branch ships
