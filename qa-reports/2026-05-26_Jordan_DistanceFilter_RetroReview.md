# Jordan — Retroactive Privacy Review: `feat/distance-filter-2026-05-25`
**Date:** 2026-05-26
**Reviewer:** Jordan (Privacy & Legal Advisor)
**Branch reviewed:** `feat/distance-filter-2026-05-25` (merged to `main` at commit `51e7404`)
**Trigger:** Constitution Art. 7.6 Trigger 1 — feature uses user's precise GPS location
**Review type:** RETROACTIVE (feature merged without prior Jordan review)
**Result:** ✅ RETROACTIVE PASS — no remediation required

---

> **DISCLAIMER:** I am not a lawyer and this is not legal advice. All regulatory
> mapping is preliminary and must be reviewed by a qualified legal professional
> before acting on it. AccessMap is an early-stage app; this review reflects
> current code state and is not a compliance certification.

---

## 1. What the Feature Does

The distance-filter feature (`src/lib/mapFilters.ts`, `src/screens/MapScreen.tsx`,
`src/lib/distance.ts`) adds a horizontal chip row to the Map filter panel. The user
can select a radius (Off / 500 m / 1 km / 5 km / 25 km). When a radius is active,
`filteredFlags` excludes any flag whose haversine distance from the user's current
GPS position exceeds that threshold.

**Key commit:** `cafee42` (feat(map): add distance radius filter to map filter panel)

---

## 2. Data Flow Analysis

| Data element | Source | Processing | Persistence | Transmission |
|---|---|---|---|---|
| User GPS coordinates | `expo-location` (pre-existing permission) | `haversineKm()` in-memory computation | **NOT persisted** | **NOT transmitted** |
| `maxDistanceKm` setting | User UI choice | Stored as a number (0.5/1/5/25/null) | `mapFilters` AsyncStorage key | Not transmitted |
| Flag `lat`/`lng` | Supabase `flags` table (pre-existing) | Read-only input to `haversineKm()` | Pre-existing, no change | No change |

**Location data lifecycle:**
1. User's `{lat, lng}` loaded into `location` state via the pre-existing `requestLocation()` flow.
2. Each render, `haversineKm(userLocation, flagLocation)` is called for each visible flag — pure computation, no side effects.
3. The computed distance value is **not stored anywhere** (not in state, not in AsyncStorage, not in Supabase).
4. `maxDistanceKm` (the radius threshold, e.g. `1`) is persisted to AsyncStorage — this is a preference setting, not a location coordinate.

---

## 3. Privacy Risk Assessment

### Trigger 1 — Location data (Const. Art. 7.6)

**Risk: LOW**

The feature uses the user's GPS coordinates as a transient filter threshold.
It does not:
- Store, log, or transmit the coordinates
- Send coordinates to Supabase or any third party
- Create a new location permission request (uses the pre-existing map location)
- Introduce new data linkages between the user's position and their identity

The existing map already renders the user's location as a blue dot and uses it
for map centering. The distance filter is an in-memory extension of the same flow.

**What IS persisted:** The numeric preference `maxDistanceKm` (e.g. `1`) in AsyncStorage.
This tells you the user last used a 1 km filter — it does not tell you where they were.

### Trigger 2 — Disability-related data (Const. Art. 7.6)

**Risk: LOW**

The filter operates on pre-existing flag data (accessibility issue reports). No new
disability-related data is collected or stored. The filter reduces what the user
sees — it does not generate new inferences about the user's disability status.

### Potential inference risk (documented for future reference)

A 500 m radius filter implies the user is moving on foot or has mobility constraints
near that location. This is a weak inference and is:
- Transient (not logged or stored)
- Entirely client-side
- Consistent with the app's core purpose (accessibility mapping)

If AccessMap ever introduces analytics or server-side logging of filter usage, this
inference risk would escalate and require a fresh Jordan review. **Flag for future
monitoring.**

---

## 4. Regulatory Mapping (preliminary — not legal advice)

**PIPEDA (Canada):** Location data is personal information under PIPEDA. The distance
filter uses location for a purpose consistent with what users expect from an
accessibility map app. Coordinates are not stored or disclosed. Current handling
appears consistent with the limited-collection principle, but legal review should
confirm consent scope in the existing privacy policy (or lack thereof).

**BC PIPA:** Mirrors PIPEDA analysis. No new collection beyond the existing map
location use.

**Existing privacy policy:** AccessMap does not currently have a published privacy
policy. This is a standing gap (pre-dates this feature) that requires attention
before any public launch. Not introduced by this feature.

---

## 5. Code Review Notes

The implementation handles the privacy-relevant edge cases correctly:

```
// Distance filter only activates when both conditions are true:
const distanceFilterEffective = maxDistanceKm !== null && location !== null;
```

This means:
- If the user hasn't granted location permission, the filter is visible but inactive (with an informational hint).
- The hint text ("Distance filter needs your location. It will activate once location is shared.") is accurate and non-pressuring.
- `parseMaxDistanceKm()` validates persisted values against an explicit allowlist — only `[null, 0.5, 1, 5, 25]` survive; any other numeric value drops to `null`. This prevents an attacker from persisting an unexpected filter radius via direct AsyncStorage manipulation.

No issues found in the privacy-relevant code paths.

---

## 6. Verdict

| Criterion | Result |
|---|---|
| New location permission required | No — uses pre-existing map permission |
| Location coordinates stored | No |
| Location coordinates transmitted | No |
| New PII collection | No |
| New linkages between location and identity | No |
| New disability data collection | No |
| Third-party data sharing | No |
| Retroactive remediation needed | **No** |

**RETROACTIVE PASS.** The distance-filter feature handles location data safely and
consistently with the app's existing location use. No remediation is required.

The skip of prior Jordan review was an oversight in the merge workflow (noted in
`qa-reports/background-2026-05-26-morgan-pm.md`); the code itself does not require
changes.

---

## 7. Future Triggers (for next Jordan review)

These scenarios would re-activate a Jordan review requirement:

1. **Server-side distance filtering** — if the filter radius is ever sent to Supabase as a query parameter (e.g. `flags.within(radius, lat, lng)`), that transmits the user's location to the server.
2. **Analytics on filter usage** — if PostHog/Amplitude ever records which distance option was selected, it becomes linked behavioral data.
3. **Neighbourhood heat-map layer** — flag density overlay. Already parked pending Jordan pre-review in `FEATURES.md`. Do not unblock for Shamus until reviewed.
4. **Location-aware saved sets** — if `maxDistanceKm` is ever bundled into a "saved set" that syncs to Supabase, the preference (and by inference the user's typical location scale) would be stored server-side.

---

*This review is produced for informational purposes. It is not a legal opinion. Engage a
qualified privacy lawyer before any public launch or regulatory filing.*
