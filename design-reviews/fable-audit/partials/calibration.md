## §Calibration & verification

Every CRITICAL and HIGH finding faced an independent adversarial skeptic (fresh context, charged to REFUTE) with read-only repo access, the cited evidence, and — where relevant — the fresh Stage-4 probe traces. **Result: 0 REFUTED · 34 CONFIRMED · 2 ADJUSTED across 36 canonical findings.** No CRITICAL or HIGH died; the calibration's work was demotion (one), splitting (one), scoping (three), and enrichment.

### ⚠ Model-transition record (governance)
Stages 0–4 and the first 3 skeptics ran on **Claude Fable 5** (max effort, Sky's standing directive): the arbiter re-arbitration, all eight lens agents, the probe pass, and the L5-01 / L6-02 / L2-1 verdicts. **Fable 5 hit credit exhaustion mid-skeptic-fan-out** (17 of 20 dispatched skeptics died returning only "out of usage credits"). Per the audit SAFETY BLOCK the halt was reported, and **Sky made the fallback call directly** — switched the session to **Opus 4.8** (`/model claude-opus-4-8`) and instructed "resume." This satisfies both the Fable-halt protocol (Sky chose the fallback, not the audit) and the global Opus HARD RULE (Sky started Opus directly, interactively). The 33 remaining skeptics re-ran on Opus 4.8. Verdict provenance is tagged `[Fable]` / `[Opus 4.8]` throughout `partials/verdicts.md`. All eight LENS findings are Fable-authored; only 33 of 36 verifications used Opus. Disclosed, not silent. See also the fenced Sky-decision note.

### Verdict table (canonical CRITICAL/HIGH)
| ID | Finding (one line) | Pre | Verdict | Post |
|---|---|---|---|---|
| L3-1 | First-time web guest CONTRIBUTE is a dead end (location never resolves, submit never enables) | CRIT | CONFIRMED | **CRITICAL** |
| L3-2 | Denied/undetermined Map arrival = silent San Francisco + false "N flags nearby" pill | CRIT | CONFIRMED (dedup kept-merged +facet-b) | **CRITICAL** |
| L2-1 / L6-08 | White severity digits fail AA on fills 1–4 (1.57–3.61) in 6 components, 3 guest-reachable | CRIT | CONFIRMED (7 sites; +1 undercount) | **CRITICAL** |
| L5-01 | Map zoom lockout: web +/− occluded + pointer-dead; iOS no zoom-out button | CRIT | ADJUSTED (mechanism stronger) | **CRITICAL** |
| L5-03 | Web 200% zoom breaks CONTRIBUTE (mid-word shred + header collision, WCAG 1.4.4) | CRIT | CONFIRMED (1 over-claim trimmed) | **CRITICAL** |
| L6-01 | RN-web drops `accessibilityState.selected` → CONTRIBUTE unconfirmable, filters stateless (web SR) | CRIT | CONFIRMED (2 corrections) | **CRITICAL** |
| L1-2 | Native guest funnel: walled CTA + wrong copy + amnesia | HIGH | CONFIRMED (copy half-wrong) | HIGH |
| L1-3 | Location consent slide: web "Allow Location" is theater + no per-slide decline | HIGH | CONFIRMED (reframe rejected) | HIGH |
| L1-4 / L3-9 | Web "Open full map" → full-screen auto-list for every visitor | HIGH | CONFIRMED (→"every web cold-mount") | HIGH |
| L2-2 / L8-6 | Two header/nav families in one app; both stack on signed-in Profile | HIGH | CONFIRMED (no ratification; incomplete 7b migration) | HIGH |
| L3-4 | Points flash lies on anonymous-flag triage (+3/+7 the DB never awards) | HIGH | CONFIRMED (reachability proven) | HIGH |
| L3-5 / L6-03 | Submitting a report confirms nothing (silent on all 4 platform cells) | HIGH | CONFIRMED | HIGH |
| L3-8 | Accessible list announces "Sorted by distance" when it isn't | HIGH | CONFIRMED (narrowed to no-location state) | HIGH* (softest; MEDIUM-defensible) |
| L3-10 | Location personality incoherent (Home ignores grant, Tasks consumes it) | HIGH | CONFIRMED web / REFUTED native | HIGH (web-scoped) |
| L3-11 | The report's WHERE is a read-only coordinate no one can verify/adjust | HIGH | CONFIRMED (steelman defeated) | HIGH |
| L3-12 | Pin callout is a decision cul-de-sac; "Open for details" opens nothing | HIGH | CONFIRMED (both platforms) | HIGH |
| L4-01 | Web reduce-motion camera gate INVERTED (`duration:0` falsy → full flight) | HIGH | CONFIRMED (probe: intermediate frame @t700) | HIGH |
| L4-02 | Cluster expansion ignores reduce-motion on both platforms | HIGH | CONFIRMED (probe: intermediate @t120) | HIGH |
| L5-02 | Home Report pill occludes Recent-row targets at 375/390 | CRIT | ADJUSTED (rubric misfire) | **HIGH (demoted)** |
| L5-04 | Filter panel "Clear" is a ~34×17pt bare-text target | HIGH | CONFIRMED (sibling got the fix) | HIGH |
| L5-05 | Map action-bar tools silently scroll out of reach | HIGH | CONFIRMED (DT/≤320pt geometries) | HIGH |
| L5-06 | Home map peek is a live map that steals taps/scroll | HIGH | CONFIRMED (probe: wheel-hijack) | HIGH |
| L5-07 | Native DT walls gate essential info < 2.0 (NearbyModal meta 1.4) | HIGH | CONFIRMED (≥1 essential) | HIGH |
| L6-02 | `announceForAccessibility`/`setAccessibilityFocus` empty on web | HIGH | CONFIRMED (radius undercounted) | HIGH |
| L6-04 | Tasks card actions nested in an `accessible` parent → SR-unreachable (native) | HIGH | CONFIRMED (HIGH ceiling; device-conditional) | HIGH |
| L6-05 | The accessible list's only action dead-ends in the visual layer | HIGH | CONFIRMED (FlagDetailModal is the fix) | HIGH |
| L6-07 | Pin boundaries fail on light tiles (ring 1.00:1, sev1–3 1.57–2.78) | HIGH | CONFIRMED (numbers reproduced exact) | HIGH |
| L7-01 | No data-layer timeout → unbounded message-less loading on every surface | HIGH | CONFIRMED (probe: honest state @t30; +copy defect) | HIGH |
| L7-02 | Offline excludes guests silently; "saved data" never says how old | HIGH | CONFIRMED (all 3 sub-claims) | HIGH |
| L7-03 | Map data is a global most-recent-50 page; no pan/refresh re-scopes | HIGH | CONFIRMED (probe: empty viewport, "5 nearby") | HIGH |
| L8-2 | "Verified" never defined/counted at any decision point; ledger unreachable | HIGH | CONFIRMED (2 over-claims tightened) | HIGH |
| L8-3 | Untrusted content wears full institutional confidence, no counter-affordance | HIGH | CONFIRMED | HIGH |
| L8-4 | Guest↔auth cliff silent + mis-documented (docs + dead sign-in bridges) | HIGH | CONFIRMED (SPLIT: see L8-4a) | HIGH |
| **L8-4a** | **(SPLIT) Guest triage buttons render → RLS refuses → fabricated "changed by someone else" error** | — | CONFIRMED (correctness bug) | **HIGH (new)** |
| L8-5 / L2-3 | Flagship map reads embedded-not-built (raw Leaflet chrome, dark tiles in light) | HIGH | CONFIRMED (web-scoped) | HIGH |
| L8-7 | Anonymous pins render gray → severity color (safety encoding) erased | HIGH | CONFIRMED (STRENGTHENED: both renderers) | HIGH |

\*L3-8: the SR announcement contradicts the honest *visible* banner in the no-location state, which holds it at HIGH; Part 3 may treat as MEDIUM if scoped purely to the transient window.

### Dedup / cross-reference map (one defect counted once)
- **Canonical A = L3-2** ← facets **L1-1** (first-run framing), **L7-04** (already-denied path), **L8-1** (pill's proximity claim, facet-b: false even when granted). Skeptic confirmed KEEP-MERGED — the mount-hole and the geo-unbounded pill are one "the map lies about proximity" failure, causally entangled.
- **Canonical B = L5-01** ← facets **L3-3** (flow framing), **L6-20** (SR/motor slice), the zoom slice of **L8-5**.
- **Canonical C = L2-1** ← facets **L6-08** (digit AA), **L6-10** (dot-boundary melt), arbiter §D-1/D-2, parked item ①.
- **Canonical D = L3-1** ← the location-never-resolves mechanism shared with **L1-3**; the SR-no-path slice of **L6-15**.
- **Canonical E = L1-4** ← **L3-9** (same auto-list defect, flow framing).
- **Canonical F = L3-5** ← **L6-03** (SR facet of the same silent submit).
- **Canonical G = L8-4** ← **L1-5** + **L3-6** (the docs + dead-bridge facets) — **now SPLIT**: the fabricated-error correctness bug becomes **L8-4a**; the communication/documentation cliff stays L8-4.
- **Canonical H = L2-2** ← **L8-6** (same two-header defect).
- **Canonical I = L8-5** ← **L2-3** (same flagship-chrome defect), **L5-16** (attribution slice), **L1-6** (dark-void slice). Zoom occlusion carved to B.
- **Canonical J = L7-01** ← **L3-7** (same silent-failure defect), **L1-12** (Home-specific slice).
- **The badge family** (L8-9 · L3-15 · L1-13 · L6-18) collapses to **one MEDIUM** (L8-9, "Tasks badge has two writers/meanings"); the others are facets.
- **Occlusion facets:** L1-7 → L5-02; L3-24 → L5-02; L3-13 (viewport under-report) → A facet-b context.
- **Motion facet:** L4-06 (Home peek motion) → L5-06 (same live-peek defect, motion slice).
- **DT/reflow facet:** L6-06 (report footer at ×2) → L5-03.

### Correction ledger (post-verification amendments — applied at assembly)
1. **L5-02 → HIGH** (was CRITICAL): rubric "any occlusion = CRITICAL" misfires for a floating-FAB that covers only the last row's redundant chevron, clean at 430/834; recoverable by 1px scroll.
2. **L8-4 SPLIT → L8-4a** (new HIGH): the guest-triage-buttons-render + fabricated-conflict-error is a distinct correctness bug that ships even with a well-communicated cliff.
3. **L5-01 mechanism** (ADJUSTED): taps die on the un-guarded `topRow` wrapper (not `box-none`), not the pill — even *visible* zoom-button pixels are pointer-dead. Native claim restricted to **iOS** (Android `zoomControlEnabled` defaults true); the real gap is single-pointer **zoom-OUT** (double-tap zooms in).
4. **L6-01** (2 corrections): plain `disabled` DOES translate to `aria-disabled` (only the nested `accessibilityState` copy drops); the severity echo line is a real `aria-live` so SEVERITY is confirmable on web — CATEGORY is not. Amend "unconfirmable" → "category unconfirmable + all selection stateless."
5. **L3-8** narrowed: false only when location is unresolved at announce-time — not "every web user's landing."
6. **L3-10** scoped web-only: native Home auto-detects a granted location (`HomeScreen.tsx:113` platform gate); the incoherence is web-cohort-real.
7. **L1-4** wording: "every web arrival" → "every web cold-mount" (`hasAutoOpenedListRef` fires once per mount, defeated for all web users by `isScreenReaderEnabled→true`).
8. **L1-2** copy claim is HALF-wrong ("report" false, "verify" true) + provenance slip (anon policy is `2026-05-30_…`, not `05-29`).
9. **L1-3** lead with the web-theater leg (load-bearing); credit "Skip" as a real (costly) decline; headline pinned to "ungranted first-run state."
10. **L3-12** do NOT split platforms — the "Open for details"/"Tap to view details" over-promise is cross-platform.
11. **L8-2** two over-claims tightened: FlagDetailModal is imported by ~20 modules (not "only Tasks/Profile") — but none map-callout-reachable (load-bearing claim survives); "never dated" is CALLOUT-only (the Nearby list shows age); the real gap is verifier COUNT + callout date.
12. **L8-7** re-scoped "web pin renderer" → **both renderers** (`PlatformMap.tsx:228` shares the bug + adds `opacity:0.7`).
13. **C** enrichment: 7th render site `FlagDetailModal.tsx:834/:1595` (view-mode "Severity {n}" chip).
14. **L7-01** rider: NEW MEDIUM sub-defect — the Map offline error renders raw **"Unknown error"** instead of the friendly `errors.ts` copy (the mapping doesn't reach the offline-abort path).

### Final severity ladder (what Part 3 walks — most severe first)
**CRITICAL (6):**
1. **L3-1** — a first-time web guest literally cannot file a report (the CONTRIBUTE half of the product's whole point, dead on arrival for the anonymous cohort it was built for).
2. **L3-2** — the FIND surface lies on arrival for any location-cautious user: wrong city, false "N flags nearby," no recovery.
3. **L2-1 / L6-08** — the severity number (the safety datum) is sub-AA white-on-fill across six components, three reachable by a guest with no account.
4. **L5-01** — zoom is locked out on the flagship map for one-handed / low-dexterity users (occluded + pointer-dead on web; no zoom-out button on iOS).
5. **L5-03** — the shipped web app fails WCAG 1.4.4 at 200% on the report flow (content shreds mid-word; the header collides).
6. **L6-01** — a web screen-reader user cannot confirm any category/filter selection (RN-web drops the state layer) on the only surface guests have.

**HIGH (30):** L1-2, L1-3, L1-4/L3-9, L2-2/L8-6, L3-4, L3-5/L6-03, L3-8*, L3-10, L3-11, L3-12, L4-01, L4-02, L5-02, L5-04, L5-05, L5-06, L5-07, L6-02, L6-04, L6-05, L6-07, L7-01, L7-02, L7-03, L8-2, L8-3, L8-4, L8-4a, L8-5/L2-3, L8-7.

**Annotated-capture coverage note:** findings with a visually-anchored defect carry an annotated PNG in `assets/annotated/` (listed per finding). The following CRITICAL/HIGH are **code-/probe-only** (no single still can carry them; evidence = cited code refs + banked probe traces): L4-01, L4-02 (dynamic — the RM probe *traces* `rm-flight__*`/`rm-cluster__*` ARE the evidence), L6-01, L6-02, L6-04, L7-01, L7-02, L7-03, L3-4, L8-4a. These are flagged in the verdict table and their evidence is banked in `partials/verdicts.md` + `01_render-index.md`.
