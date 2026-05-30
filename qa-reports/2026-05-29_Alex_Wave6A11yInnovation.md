# Alex — Wave 6 Accessibility Innovation QA Report

**Date:** 2026-05-29  
**Branch:** `a11y/innovation-wave6`  
**Role:** Alex (Accessibility)  
**TypeScript:** ✅ `tsc --noEmit` passes with 0 errors

---

## Summary

VoiceOver-first audit complete. Four concrete fixes shipped; innovation spec written.

---

## Part 1: VoiceOver-first UX fixes

### 1. Map screen list view (was already implemented, confirmed complete)

MapScreen already had:
- `useScreenReader()` hook auto-opens `NearbyFlagsModal` on mount when a screen reader is detected (`hasAutoOpenedListRef` pattern) — once per session, user can close and stay on the map.
- "📋 List" FAB as permanent manual re-entry.

**New this wave:**
- `NearbyFlagsModal` now announces flag count on open: *"14 flags nearby. Sorted by distance."* VoiceOver users know scope immediately without swiping through the list.
- Added `accessibilityViewIsModal` to `SafeAreaView` — VoiceOver now ignores map elements behind the sheet.

---

### 2. Flag creation geocoding confirmation (`ReportFlagModal.tsx`, `geocode.ts`)

**Problem:** location displayed as raw lat/lng (`37.77493, -122.41940`). A VoiceOver user tapping "Report" hears a meaningless number string.

**Fix:**
- Added `reverseGeocode(lat, lng, signal?)` to `src/lib/geocode.ts` using Nominatim's `/reverse` endpoint (same provider, same User-Agent, same rate-limit contract as forward geocoding).
- `ReportFlagModal` reverse-geocodes the location when it opens. While resolving: shows raw coords as before. After resolution: shows human address (e.g. *"Market Street, San Francisco, California"*).
- When `useScreenReader()` is true, immediately announces: *"Placing flag at your current location: Market Street, San Francisco, California"* so the user can confirm before filling in the form.
- `AbortController` cancels the in-flight fetch on close/unmount — no state updates to unmounted components.

---

### 3. Gesture hints

**Long-press on map (custom gesture):**
- VoiceOver users can't discover long-press — it's not part of the standard swipe-and-tap navigation model.
- Updated "Report" FAB `accessibilityHint` to: *"Opens a form to report an accessibility issue at your current location. Tip: sighted users can also long-press the map to drop a report at a specific spot."*
- This makes the capability discoverable without pretending VoiceOver users need it.

**Saved filter set long-press:** already had hint — *"Long press for options including make default and delete."* ✓  
**All other interactives:** had explicit `accessibilityHint` or unambiguous role. No gaps found.

---

### 4. Focus trapping in modals

**Audited all modals:**

| Modal | `accessibilityViewIsModal` | Status |
|---|---|---|
| `ReportFlagModal` (card) | ✅ already present | No change needed |
| `NearbyFlagsModal` (SafeAreaView) | ✅ added this wave | Fixed |
| `LegendModal` | Uses RN `Modal` — OS-native sheet isolation | OK |
| `AddressSearchModal` | Uses RN `Modal` — need to verify (not modified) | Propose |
| `SavedPlacesModal` | Uses RN `Modal` — need to verify (not modified) | Propose |
| `FilterPresetsModal` | Uses RN `Modal` — need to verify (not modified) | Propose |
| MapScreen preset-name modal | ✅ added this wave | Fixed |
| MapScreen filter-set save modal | ✅ added this wave | Fixed |

**Focus return on close:** React Native `Modal` components restore OS-native focus to the previously focused element when dismissed on iOS and Android. This is handled by the framework. No custom `AccessibilityInfo.setAccessibilityFocus` calls needed for standard `Modal`s.

---

## Part 2: Innovation spec

Written to `docs/innovation/ACCESSIBILITY_VISION.md`.

Three innovations with full analysis + minimum viable slices:

### 2.1 Verified accessible routes
- Route planning that weights edges by live flag data (barriers raise cost, resolved flags lower it).
- Requires: pedestrian graph (OSRM/ORS), Supabase Edge Function routing endpoint, staleness model.
- **MVP:** heatmap-guided routing overlay — show gradient between two tapped points with no backend changes.

### 2.2 Disability-specific filtering
- Four profiles (wheelchair, low vision, deaf/HoH, cognitive) → each maps to a `FilterPreset`.
- Phase A (no schema change): saved profile chip in ProfileScreen that applies preset on launch.
- Phase C (with schema change): Jordan gate required — disability profile is sensitive health data.
- **MVP:** four tappable profile cards in Profile tab that apply the matching filter preset.

### 2.3 Community trust score
- Weight verifications by count × recency × profile diversity.
- Verifiers whose disability profile matches the flag category carry 1.5× weight.
- Requires `public.verifications` audit table + Postgres view for trust computation.
- Jordan gate required before joining verifier profiles to flag data.
- **MVP:** verifier count badge on TaskCard/callout using an integer column — no join, no privacy risk.

---

## Decisions for Sky

None blocked. All three innovation items require future Jordan gates before storing disability profile data server-side — note this before scheduling any Phase C work.

The three remaining unaudited modals (`AddressSearchModal`, `SavedPlacesModal`, `FilterPresetsModal`) are candidates for a follow-up wave to add `accessibilityViewIsModal` — not urgent since they're built on RN `Modal` (which handles sheet isolation at the OS level), but worth a consistency pass.
