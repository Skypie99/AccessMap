# Jordan — Privacy Review: Neighbourhood Heat-Map Layer (Pre-Build)

**Date:** 2026-05-25
**Reviewer:** Jordan (privacy/PIPEDA advisor — NOT a lawyer; findings require professional legal review before any app-store submission or public launch)
**Feature:** Neighbourhood heat-map — overlay a density heat-map on the map showing where accessibility issues are concentrated, coloured by severity
**Review type:** Pre-build gate (no code exists yet; this sets the conditions Shamus must implement)
**Mode:** READ-ONLY. No code changes. No external sends.

---

## VERDICT

**APPROVED WITH CONDITIONS**

The heat-map feature is privacy-compatible under the proposed architecture (client-side, no new server endpoint, no new persistence, derived from already-public `flags` data). However, three conditions are mandatory merge gates, and one ethical concern requires a design decision from Sky before Shamus codes the severity-coloured rendering.

---

## Trigger-by-trigger analysis

### Trigger 1 — Location data (PIPEDA Principle 4 — Limiting Collection)

**Fires? YES — but at a lower risk tier than individual pin display.**

The heat-map aggregates flag `lat`/`lng` coordinates into a density grid. Individual coordinate pairs are not rendered — only a density value per grid cell is shown. This is an aggregate display, not individual tracking.

**Key distinction from the existing pin layer:**

The existing map already displays every flag's exact lat/lng as a pin. A heat-map cell that summarises "3 flags of average severity 4.2 exist within this 200m × 200m block" discloses *less* individual location precision than the pin layer currently does. Aggregation reduces, not increases, individual location exposure.

**However — "neighbourhood" granularity has a specificity floor to maintain.** If the density grid resolution is very fine (e.g., 10m × 10m cells), a cell containing a single flag is equivalent to a pin. The heat-map degrades to individual-flag disclosure when density is low. In sparse neighbourhoods, most cells will contain 0–1 flags.

**Condition C1 — Minimum aggregation threshold:** A grid cell must require at least **3 flags** before rendering a coloured region. Cells with fewer than 3 flags must render as transparent (no heat contribution from that cell). This prevents the heat-map from acting as a re-encoded pin layer in low-density areas, and ensures a bad actor cannot use cell colour to infer a single flag's exact location. This threshold follows the standard de-identification k-anonymity floor (k=3) used in health and location data.

The threshold does not need to be user-visible or configurable in v1 — it is a hard-coded floor, not a preference.

---

### Trigger 2 — Disability data (PIPEDA Principle 4)

**Fires? YES — this is the most substantively new privacy question this feature raises.**

Every flag in AccessMap is disability-adjacent data: flags represent accessibility barriers, and the people who submit or use them are disproportionately people with disabilities or mobility limitations. This is known and accepted in the existing pin layer — individual flags are public, the data is crowdsourced.

**What changes with a heat-map:**

A heat-map coloured by severity at neighbourhood granularity produces a new derived product that did not exist before: a **geographic accessibility-quality score for entire neighbourhoods.** This is qualitatively different from "here is a specific broken sidewalk at this address."

**Specific risks:**

**2a. Neighbourhood stigmatization.** A severity-coloured heat-map will visually characterise some neighbourhoods as "red" (high severity, many barriers) and others as "green" (low severity, few barriers). This is the *intended* value of the feature — it helps users plan routes and understand which areas are better served. However, the same visualisation can be interpreted as a neighbourhood quality score that correlates with socioeconomic factors, infrastructure investment, and the physical capabilities of residents. In cities, "red" heat-map zones tend to correspond to lower-income or older neighbourhoods with deferred maintenance. The heat-map does not create this correlation, but it makes it visible and exportable (screenshots).

**Assessment:** The data driving this stigmatization risk already exists in the individual pin layer. Aggregating it into a heat-map does not introduce new data — it just makes the existing pattern more visually legible. Jordan does not BLOCK on this basis, but it is an ethical design consideration that Sky should be aware of. A mitigating design choice would be to label the heat-map clearly as "reported accessibility barriers — community-sourced data, may be incomplete" to discourage interpretation as an authoritative quality score.

**Condition C2 — Mandatory heat-map disclaimer:** When the heat-map layer is visible, display a one-line notice (e.g., a banner or info chip near the layer toggle): "Based on community reports — coverage varies." This reduces the risk that users, journalists, or policymakers treat the heat-map as a validated dataset. The copy can be wordsmithed by Sky/Dani; the information requirement is non-negotiable.

**2b. Correlation with reporter demographics.** A sufficiently dense heat-map, combined with AccessMap's existing user data, could allow inference of where users with particular disability types are concentrated (e.g., if "no_ramp" flags cluster in one area, that area likely has wheelchair users). This risk exists with the individual pin layer too. The heat-map does not worsen it materially because it does not expose `user_id` or any reporter attribution — it only exposes aggregate counts.

**No additional condition required for 2b** beyond the k=3 threshold from C1.

---

### Trigger 3 — PII beyond auth — Does aggregation produce new inferences?

**Fires? LOW — assessment: no materially new PII is produced.**

The heat-map is derived from `flags.lat`, `flags.lng`, `flags.severity`, and `flags.category` — all already world-readable via `listFlags()`. The aggregation step (compute a density grid on the client, render coloured polygons) does not expose:
- `user_id` — reporters are not identified in the heat-map
- `description` — free-text content is not visualised
- `photo_url` — photos are not shown
- `created_at` — timestamps are not exposed

The only new "data product" is the density count and average severity per grid cell. These are arithmetic derivatives of public data. Under PIPEDA, aggregated statistics computed from public data are not themselves personal information unless they can be linked back to an identifiable individual. At k≥3 (C1), individual re-identification is not achievable from the heat-map alone.

**No condition required for Trigger 3**, assuming C1 is implemented.

---

### Trigger 4 — RLS / auth / session — New server-side query required?

**Fires? NO — no new Supabase query or endpoint is needed.**

The proposed architecture uses the already-fetched `flags` array from `FlagsProvider` (`useFlags()`). The heat-map is a pure client-side computation over the in-memory `flags` array. No new Supabase query, RLS policy, stored function, or server-side aggregation is introduced.

**Existing RLS posture (confirmed from `supabase/schema.sql`):**

```sql
create policy "flags readable by authenticated"
  on public.flags for select
  to authenticated
  using (true);
```

Flags are readable by any authenticated user — consistent with the existing pin layer. The heat-map does not require any RLS change because it is computed from data already permitted to the authenticated session.

**One clarification for Shamus:** The heat-map should consume `useFlags().flags` (the already-filtered, already-paginated array in memory) rather than issuing a separate `listFlags()` call. This:
1. Avoids a second network round-trip for the same data
2. Ensures the heat-map stays in sync with the user's active filter (e.g., if the user has filtered to "Broken sidewalk" only, the heat-map reflects only those flags)
3. Reuses the existing 24-hour offline cache without any additional caching logic

If a full-dataset heat-map (all flags, unfiltered) is desired in the future, that requires a separate Jordan review because it would constitute a new, uncapped data fetch.

**No condition required for Trigger 4.** No new Supabase changes needed.

---

### Trigger 5 — External API sending data outbound

**Fires? CONDITIONAL — depends on library choice.**

The proposed client-side implementation uses one of two paths:

**Path A — Web (Leaflet):** `leaflet.heat` is a client-side Leaflet plugin. It accepts an array of `[lat, lng, intensity]` points and renders a canvas overlay. It makes no outbound network calls — all computation is local in the browser. No user data leaves the device.

**Path B — Native (react-native-maps circle overlays):** Manual circle overlays drawn using `react-native-maps`'s `Circle` or `Polygon` components. These are pure React Native rendering primitives, no network calls, no outbound data.

**Risk:** If Shamus introduces a third-party heat-map library for native (e.g., `react-native-heatmap`, `@decurtis/react-native-maps-heatmap`, or a wrapper around Google Maps' built-in heat-map layer), that library may send data to external services (Google's servers if using the Google Maps SDK heatmap API, or a vendor analytics endpoint).

**Condition C3 — Library vetting before build:** Before Shamus installs any heat-map library, Jordan must confirm it sends no data outbound. The two paths described in the spec (leaflet.heat + manual circle overlays) are pre-approved. Any other library requires a one-paragraph Jordan vetting note in the PR before Shamus can merge it. If using Google Maps' native heatmap API (available via `react-native-maps` with `PROVIDER_GOOGLE`), note that coordinate data is sent to Google's servers for tile rendering — this would require disclosure in the privacy section and is not recommended for an accessibility-focused app with a privacy-sensitive user base.

---

### Trigger 6 — New data persistence layer

**Fires? NO — with one design instruction.**

The heat-map is computed on-the-fly from the in-memory `flags` array. It is not cached, stored to AsyncStorage, written to disk, or sent to the server. The feature introduces no new persistence layer.

**Design instruction for Shamus:** Do NOT cache heat-map grid data to AsyncStorage or the file system. The grid is cheap to recompute from the in-memory flags (O(n) pass over the flags array to bin by coordinate), and caching it would create a derived location artifact on disk that outlives the flags cache. If the density grid computation becomes expensive at very high flag counts (>5,000), the correct fix is to optimise the binning algorithm, not to add a cache.

---

## Ethical assessment: aggregate disability data display in a public heat-map

This question requires nuance beyond the six triggers.

**The core tension:**

AccessMap's purpose is to surface accessibility barriers so people with disabilities can navigate the world more safely. A heat-map is a powerful tool for that purpose — it lets a wheelchair user identify a neighbourhood before visiting and plan accordingly. This is a genuine, valuable accessibility improvement.

At the same time, a public heat-map of disability-adjacent data at neighbourhood granularity raises two concerns:

**Concern A — Narrative capture.** A heat-map that colours neighbourhoods "red" (many severe barriers) versus "green" (few barriers) will be read by some users — and potentially by journalists, advocates, or city planners — as a neighbourhood quality score. Accessibility barrier density is legitimately informative for that use. But it is also incomplete: a neighbourhood may appear "red" not because it is less accessible, but because it has more engaged AccessMap reporters. High reporter density means more flags, which means redder heat-map cells, regardless of actual infrastructure quality. A less-engaged neighbourhood may have fewer flags even if its infrastructure is equally bad.

**This incompleteness risk is higher in a heat-map than in a pin layer** because a heat-map implies statistical density ("this whole area is problematic") in a way that individual pins do not. The disclaimer required by C2 partially mitigates this.

**Concern B — Data correlation.** In a publicly visible heat-map, a sufficiently motivated actor could compare the heat-map against census data, real-estate listings, or neighbourhood demographics to produce inferences about which areas have concentrations of people with disabilities. Individual flags do not support this inference at scale (they are precise points, not area summaries). A heat-map explicitly produces area summaries, which are the unit of correlation analysis.

**Jordan's assessment:** This risk is real but proportionate. AccessMap's user base is not large enough today for neighbourhood-level correlation to be statistically meaningful. The k=3 threshold (C1) limits the density of the signal. The disclaimer (C2) reduces interpretive over-reach. If AccessMap scales significantly (tens of thousands of flags in a dense city), this risk should be re-assessed.

**One design recommendation (not a hard condition, but strongly preferred):**

Make the heat-map opt-in and clearly labelled as a layer toggle, rather than on by default. If a user opens the map and sees an always-on heat-map, they may not understand what it represents or that it is community-sourced. A toggle (off by default) with a short label like "Show barrier density" ensures users consciously choose to view the aggregate layer and reduces the chance of mis-reading it as authoritative data.

This is design guidance for Dani and Sky to decide, not a Jordan block.

---

## Conditions summary

All three conditions are merge gates for Shamus:

| # | Condition | Where to implement | Status |
|---|---|---|---|
| C1 | Minimum k=3 flags per grid cell — cells with fewer than 3 flags render transparent | `src/lib/heatmap.ts` (new pure function) or inline in the map component | MANDATORY |
| C2 | Disclaimer banner/chip visible when heat-map layer is active: "Based on community reports — coverage varies" | `src/screens/MapScreen.tsx` or `src/components/PlatformMap.web.tsx` | MANDATORY |
| C3 | Library vetting — only leaflet.heat (web) and manual circle overlays (native) are pre-approved; any other library requires one-paragraph Jordan note in PR | PR review gate | MANDATORY |

**Design recommendation (not a hard condition):**

- Heat-map layer is off by default, enabled via a toggle in the map filter panel
- Layer toggle label: "Show barrier density" (copy TBD by Dani/Sky)

---

## What does NOT need to change

- **`public.flags` RLS** — no change required. Existing policy (`flags readable by authenticated`) is sufficient.
- **`listFlags` / `listFlagsPage` / `FlagsProvider`** — no change required. Heat-map consumes the existing in-memory `flags` array from `useFlags()`.
- **`supabase/schema.sql`** — no new tables, columns, functions, triggers, or views needed.
- **`src/lib/dataExport.ts`** — heat-map data (grid cells, density values) is ephemeral and computed on-device; it is not user data and must not be added to any export.
- **Privacy disclosure copy (About screen)** — No new persistent data is introduced, so the existing privacy statement does not require amendment for this feature. If the disclaimer copy (C2) is added to the About screen for completeness, that is fine but not required.

---

## Implementation guidance for Shamus

The safest architecture, consistent with the existing codebase:

**Density function (new `src/lib/heatmap.ts`):**

```typescript
// Pure, dependency-free, testable.
// Returns grid cells with density ≥ k and average severity for the cell.
export interface HeatCell {
  centerLat: number;
  centerLng: number;
  count: number;         // number of flags in this cell
  avgSeverity: number;   // average severity (1–5), for colour mapping
}

export function computeHeatGrid(
  flags: FlagRow[],
  gridSizeDeg: number = 0.005,  // ~500m at mid-latitudes; tune to taste
  minCount: number = 3,          // C1 — k-anonymity floor
): HeatCell[] {
  // bin flags into grid cells by (Math.floor(lat/gridSizeDeg), Math.floor(lng/gridSizeDeg))
  // only emit cells where count >= minCount
}
```

**Web rendering (PlatformMap.web.tsx):** Pass `HeatCell[]` to `leaflet.heat` as `[lat, lng, intensity]` where `intensity = avgSeverity / 5`. No library install needed beyond what is already in the project if leaflet.heat is already bundled; if not, Jordan must vet the version before install.

**Native rendering (PlatformMap.tsx):** Render `HeatCell[]` as `<Circle>` components from `react-native-maps`, with radius proportional to `gridSizeDeg` in meters and `fillColor` derived from `avgSeverity` using the existing `severityColor()` function from `src/lib/flags.ts`.

**Both platforms should accept the same `HeatCell[]` prop** via `PlatformMapProps` so the computation lives in one place and the rendering differs only by platform component.

---

## Files reviewed for this assessment

- `src/lib/flags.ts` — `listFlags`, `listFlagsPage`, `FlagRow` type, `severityColor`
- `src/lib/flagsStore.tsx` — `FlagsProvider`, `useFlags()`, offline cache architecture (Jordan Conditions 1–4 already implemented)
- `src/components/PlatformMap.tsx` — native map (react-native-maps + ClusteredMapView)
- `src/components/PlatformMap.web.tsx` — web map (react-leaflet)
- `src/types/database.ts` — `FlagRow` schema (lat, lng, severity, category, user_id — no reporter PII in heat-map input)
- `supabase/schema.sql` — RLS policies on `public.flags` (confirmed: existing authenticated-read policy is sufficient)
- `qa-reports/2026-05-25-jordan-offline-tiles.md` — prior Jordan review, pattern reference
- `qa-reports/jordan-flag-editing-review-2026-05-24.md` — prior Jordan review, format reference
- `CLAUDE.md` — stack confirmation, error handling tiers

---

## What was NOT reviewed

- Any heat-map library not named in this document. C3 requires a Jordan note before any unlisted library is installed.
- Any future server-side aggregation endpoint. If Shamus or Sky decides to move the grid computation to a Postgres function or edge function, that requires a separate Jordan gate (new query surface, potential for uncapped data fetch).
- Any "export heat-map as image" feature. Screenshot by the user is out of scope. An in-app export button (PNG, PDF, share sheet) would require Jordan review because it makes the aggregate neighbourhood-level data portable and attributable.

---

## Out-of-scope notice

Per Const. Art. 5.3, this review contains no code changes. Per Const. Art. 9, Jordan does not message Sky — Morgan picks up this report on the next status sweep.

**DECISIONS FOR SKY:**

1. **Layer toggle default state** — Jordan strongly recommends off-by-default for the heat-map layer. Sky decides.
2. **Grid resolution** — The recommended 500m (~0.005 degrees) cell size is a privacy-safety default. Sky or Dani may want a finer or coarser grid for UX reasons; any change below 100m (~0.001 degrees) in a low-density deployment should be re-reviewed against C1 because k=3 becomes harder to satisfy per cell.
3. **Disclaimer copy** — C2 requires a disclaimer when the heat-map is visible. Sky/Dani wordsmith; Jordan's requirement is "community-sourced, coverage varies" — the exact phrasing is a product decision.
