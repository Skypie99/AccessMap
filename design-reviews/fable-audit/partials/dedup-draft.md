# Calibration draft — dedup/cross-ref map (pre-skeptic)

One defect counted once. `CANONICAL ← facets`. Canonical ID keeps the lens that owns the defect's center of gravity; facets amend/enrich it. Severity shown is pre-verification (skeptics may adjust).

## Dedup clusters

| # | Canonical (pre-verif sev) | ← Facets | The one defect |
|---|---|---|---|
| A | **L3-2 (CRITICAL)** | L1-1 (C), L7-04 (H), L8-1 (C) | Map arrival with location denied/undetermined = silent wrong-city (San Francisco) map under a false "N flags nearby" pill; mount path never sets `permissionDenied` (`MapScreen.tsx:1043-1061`); the pill counts the geo-unbounded global fetch (`:1277-1283`). L8-1's generalization (the pill's claim is unsupported even when granted) rides as facet-b. |
| B | **L5-01 (CRITICAL)** | L3-3 (C), L6-20 (M), the zoom-occlusion slice of L8-5 | Zoom is locked out: web +/− is sub-44 AND occluded by the status pill at all four widths/both themes; native ships no zoom buttons at all (pinch-only). |
| C | **L2-1 (CRITICAL)** | L6-08 (H), L6-10 (M, boundary melt), arbiter §D-1/D-2, parked item ① | White 12–13pt digits on severity fills 1–4 fail AA (1.57–3.61 vs 4.5 [arbiter-measured]) in SIX components — three guest-reachable (Nearby list, report selected-severity chip, +1) — not just the auth-gated RecentlyViewedRow. |
| D | **L3-1 (CRITICAL)** | L6-15 (M/H slice: no SR path either), the location-never-resolves mechanism of L1-3 | First-time web guest CONTRIBUTE is a dead end: nothing on the guest path requests location, "Waiting for location…" never resolves, submit never enables, no explanation. (Probe `probes/report-noperm__*` adjudicates.) |
| E | **L1-4 (HIGH)** | L3-9 (H) | On web, "Open full map" never shows the map: the SR auto-list opens full-screen over it for every visitor (ledger #15 truth); the arrival chain reads as broken promises for sighted users. Judged both directions (SR list-first benefit stands). |
| F | **L3-5 (HIGH)** | L6-03 (H) | Submitting a report confirms nothing: anon success is fully silent on web (haptic is native-only); auth success is SR-announce-only — and the announce API is an empty function on web (ties to L6-02). |
| G | **L8-4 (HIGH)** | L1-5 (H), L3-6 (H, the sheet's dead-end sign-in links slice) | The guest↔auth cliff is silent, unsold, mis-documented — guests see moderation buttons RLS must refuse (with a fabricated "changed by someone else" failure), and every "Sign in" bridge in CONTRIBUTE just closes the form. |
| H | **L2-2 (HIGH)** | L8-6 (H) | Two header/navigation families ship in one app (editorial Home/Tasks vs nav-header Map/Profile/Settings), incl. both at once on signed-in Profile. |
| I | **L8-5 (HIGH)** | L2-3 (H), L5-16 (M), L1-6 (M, dark-void slice) | The flagship map reads embedded-not-built: raw Leaflet chrome, the full-width attribution strip through the editorial layout, hard-coded dark tiles inside light mode. (Zoom occlusion carved out to B.) |
| J | **L7-01 (HIGH)** | L3-7 (H), L1-12 (L) | No timeout anywhere in the data layer → every primary surface can sit in unbounded, message-less loading; the designed error/recovery states exist but never fired in any captured failure. (Probes `probes/home-failure__*` + `map-refresh-fail__*` adjudicate the window.) |

## Standalone CRITICAL/HIGH (no dedup needed)

| ID | Sev | One-liner |
|---|---|---|
| L5-02 | C | Home Report pill occludes Recent-row targets at 375/390 (facets: L1-7 M, L3-24 L) |
| L5-03 | C | Web at 200% zoom breaks core flows (WCAG 1.4.4) — facet: L6-06 (H, report footer at ×2) |
| L6-01 | C | react-native-web@0.21.2 drops `accessibilityState` → CONTRIBUTE form unconfirmable, filters stateless for web SR |
| L1-2 | H | Native first-run funnel: sign-in wall; guest path a footnote, mislabeled, factually wrong, forgotten each relaunch |
| L1-3 | H | Location slide: the only permission without a visible "not now"; on web the button is theater (consent-UX slice; mechanism slice rides with D) |
| L3-4 | H | Points flash lies on anonymous-flag triage: "+3/+7" the trigger never awards (SQL NULL semantics) |
| L3-8 | H | The accessible list opens with a false claim: "Sorted by distance" when it isn't |
| L3-10 | H | Location personality incoherent: Home ignores a granted location; Tasks consumes it uninvited |
| L3-11 | H | The report's WHERE is a read-only mono coordinate no one can verify or fix (facet: L6-15's SR slice) |
| L3-12 | H | Pin callout is a cul-de-sac: no date, no next step; "Open for details" opens nothing further |
| L4-01 | H | Web RM camera gate inverted: `duration: 0` is falsy to Leaflet → RM users get the full default flight (probe `rm-flight__*`) |
| L4-02 | H | Cluster expansion ignores reduce-motion on BOTH platforms (probe `rm-cluster__*`) |
| L5-04 | H | Filter panel "Clear" is a ~34×17pt bare-text target |
| L5-05 | H | Map action-bar tools silently scroll out of reach (hidden-indicator tray) |
| L5-06 | H | Home map peek is a live map inside a button — steals and redirects taps (probe `home-peek__*`; motion slice = L4-06 M) |
| L5-07 | H | Native DT walls: three caps gate ESSENTIAL info below 2.0 (WCAG 1.4.4) |
| L6-02 | H | `announceForAccessibility` + `setAccessibilityFocus` are empty functions on RN-web — the announcement/focus layer is silent on web |
| L6-04 | H | Tasks card actions are interactive children of an `accessible` parent — native SR likely can't reach them (NEEDS-SKY-DEVICE honesty required) |
| L6-05 | H | The accessible list's only action dead-ends: select → list closes → un-focus-managed callout |
| L6-07 | H | [arbiter] Pin boundaries fail on light tiles (white ring 1.00:1; sev1–3 fills 1.57–2.78; anon 2.54 vs 3.0) — iOS-light-mode truth, web-invisible |
| L7-02 | H | Offline capability silently excludes guests; "saved data" never says how old; Home hides refresh failures once rows exist |
| L7-03 | H | Map data is a global most-recent-50 page — no pan or Refresh ever re-scopes; stale viewport gate inverts realtime freshness |
| L8-2 | H | "Verified" is never defined, counted, or dated at any decision point; the built trust ledger is unreachable from the map |
| L8-3 | H | Untrusted content wears full institutional confidence with no counter-affordance where it's encountered |
| L8-7 | H | Anonymous pins render gray — severity color (the safety encoding) erased; gray defined nowhere |

**Canonical counts (pre-skeptic): 7 CRITICAL · 29 HIGH → 36 skeptics.**

MEDIUM-and-below stay in their lens sections with cross-refs to canonicals where they are facets (L1-7→L5-02, L3-13→A-facet-b, L3-24→L5-02, L6-20→B, L5-16→I, L6-06→L5-03, L4-06→L5-06, L1-6→I, L6-15→L3-11/D, L3-15+L8-9+L1-13+L6-18 badge family → single MEDIUM canonical L8-9 at assembly).
