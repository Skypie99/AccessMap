# Jordan — Background Location Permission Gate

**Date:** 2026-05-29  
**Role:** Jordan (Legal/Privacy Advisor)  
**Model tier:** Sonnet  
**Scope:** READ-ONLY assessment — no files modified, no branches touched  
**NOT LEGAL ADVICE.** Jordan is not a lawyer. This is a privacy and App Store risk assessment based on code inspection and published Apple/privacy-law guidance. Consult qualified legal counsel before App Store submission.

---

## Question

Three unmerged branches (`fix/security-hardening-2026-05-30`, `docs/beta-testing-guide-2026-05-30`, `docs/incident-response-2026-05-30-steve`) add `NSLocationAlwaysAndWhenInUseUsageDescription` to `app.json`. Main currently declares only `NSLocationWhenInUseUsageDescription`. Should the "Always" key be added?

---

## Finding 1 — Does the app use background location?

**NO.**

A thorough search of the entire `src/` tree (all `.ts` / `.tsx` files) found zero usage of any background-location API:

| API / Pattern | Result |
|---|---|
| `startLocationUpdatesAsync` | Not found |
| `requestBackgroundPermissionsAsync` | Not found |
| `getBackgroundPermissionsAsync` | Not found |
| `TaskManager` / `defineTask` | Not found |
| `BackgroundFetch` | Not found |
| `startGeofencingAsync` / `stopGeofencingAsync` | Not found |
| `watchPositionAsync` (continuous tracking) | Not found |
| `expo-task-manager` package | Not in `package.json` |
| `LocationActivityType` | Not found |
| `showsBackgroundLocationIndicator` | Not found |
| `pausesUpdatesAutomatically` | Not found |

The word "geofence" appears in two files (`MapScreen.tsx` line 279, `flagsStore.tsx` lines 127/320/366) but refers exclusively to a *viewport bounding-box filter* for Supabase Realtime events — it is a purely in-memory filter on already-fetched data, not an OS-level geofence that runs in the background.

**All actual location usage is foreground-only and one-shot:**

1. `src/lib/location.ts` — `useUserLocation` hook: calls `requestForegroundPermissionsAsync()` or `getForegroundPermissionsAsync()`, then `getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })`. Single fetch, no subscription.
2. `src/screens/MapScreen.tsx` — `requestLocation()`: calls `requestForegroundPermissionsAsync()`, then `getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })`. Single fetch, no subscription.

Both call sites explicitly use `Foreground` permission paths. Neither starts a background task.

---

## Finding 2 — What the "Always" key actually means

`NSLocationAlwaysAndWhenInUseUsageDescription` is the iOS plist key that **must be present** for an app to call `requestBackgroundPermissionsAsync()` and receive the "Always" grant in the iOS location-permission dialog. Its presence signals to iOS (and Apple's App Store review team) that the app is designed to track location when the user is not actively using it.

Declaring it without any corresponding background-location code:

- **Tells iOS the app wants "Always" location access when it doesn't.** iOS displays the more invasive permission prompt ("Always" or "Allow While Using App" or "Don't Allow"), which is more alarming to users than the simple "Allow While Using / Don't Allow" foreground dialog.
- **Triggers App Store review scrutiny.** Apple's App Review Guideline 5.1.1 requires apps to request only permissions actually needed. Reviewers may reject a build or require justification when the "Always" description string exists but no background-location entitlement or usage can be verified in the binary.
- **Is over-collection under PIPEDA and CPRA.** Both frameworks prohibit collecting (or requesting the capability to collect) personal information — location is sensitive personal information — beyond what is necessary for the identified purpose. An app that never runs background location has no lawful basis to request "Always" access.

---

## Finding 3 — PIPEDA / CPRA considerations (if background location were ever added)

This section is forward-looking; it does NOT apply today because the app does not use background location. If that changes:

**PIPEDA (Canada):**
- Principle 4 (limiting collection): collect only what is necessary. Background location must serve a specific, articulated purpose (e.g., "notify you when you are near an unresolved accessibility barrier").
- Principle 3 (knowledge and consent): the consent must be *meaningful* — passive acceptance of an "Always" prompt is insufficient. An in-app screen explaining exactly what is tracked, when, and why is required before the OS prompt appears.
- Privacy notice must be updated to describe background collection, retention period, and deletion rights.

**CPRA (California):**
- Precise geolocation is a "sensitive personal information" category under CPRA § 1798.121. It requires a "Limit the Use" opt-out link in the app's privacy settings (or UI equivalent).
- If background location data were ever uploaded to Supabase, CPRA Data Subject Rights (access, deletion, correction) must be honored.
- A Data Protection Impact Assessment (DPIA) is recommended before enabling background location tracking.

---

## Verdict

**DROP-IT**

The app does not use background location. The three branches that add `NSLocationAlwaysAndWhenInUseUsageDescription` to `app.json` should have that key removed before any of those branches merge. The key serves no functional purpose, presents an unnecessary App Store rejection risk, and constitutes over-collection of a sensitive permission under both PIPEDA and CPRA.

---

## DECISIONS FOR SKY

| # | Decision |
|---|---|
| D1 | **Remove `NSLocationAlwaysAndWhenInUseUsageDescription` from all three branches** (`fix/security-hardening-2026-05-30`, `docs/beta-testing-guide-2026-05-30`, `docs/incident-response-2026-05-30-steve`) before merge. This is a blocker for App Store submission under current code. |
| D2 | **If background location is ever planned** (e.g., "notify me near a barrier" feature), Jordan must re-review before the API call is added to any branch. That feature requires in-app consent UI, a privacy notice update, and CPRA Sensitive PI handling. |

---

## Affected Files (reference only — not modified)

- `/Users/skypie/AccessMap/app.json` — main branch; correctly has only `NSLocationWhenInUseUsageDescription`
- `fix/security-hardening-2026-05-30:app.json` — adds the offending key
- `docs/beta-testing-guide-2026-05-30:app.json` — adds the offending key (same diff)
- `docs/incident-response-2026-05-30-steve:app.json` — adds the offending key
- `/Users/skypie/AccessMap/src/lib/location.ts` — all foreground-only; no background calls
- `/Users/skypie/AccessMap/src/screens/MapScreen.tsx` — all foreground-only; no background calls
