# Fable Audit — AccessMap — Part 2 of 3: The Eight-Lens Judgment

**Subject:** AccessMap (Expo SDK 54 / RN 0.81 / React 19.1 / TS strict / Supabase; react-native-maps native, react-leaflet 5 web) at `main` @ `82e738bc177f8a0b14ca0aa978c6ffb92bc5c54b` — the post-glass-chain HEAD (Tasks + W1 + W2 Profile + Map + locating fix).
**Date:** 2026-07-04 · **Model:** Claude Fable 5 (`claude-fable-5`) max effort — orchestrator, all eight lens agents, and all skeptic agents.
**Inputs:** `01_orientation.md` (evidence map) · `01_render-index.md` (410-file index, FINAL VERIFY1 PASS) · `01_baseline-reads.md` (six blinded persona reads + completeness critique PASS) · `assets/**` (412 files incl. 2 lab-mockup probes) · `GLASS.md` (LAW) + `DESIGN.md` @ HEAD · the four glass rollout reports (Tasks 2026-07-03, W1, W2 Profile, Map 2026-07-04) · fresh arbiter re-runs + audit extension (`assets/arbiter/`, this part).
**Engine caveat:** every capture is expo web — RN-web in Chromium, dev-mode Metro (`__DEV__` true), DPR 2. True blur feel, scroll smoothness, VoiceOver/TalkBack, haptics, real Dynamic Type, Reduce Transparency, and Apple light tiles are device-only (NEEDS-SKY-DEVICE). Web tiles are CartoDB `dark_all` always. On web, RN-web resolves `isScreenReaderEnabled` true for everyone, so MapScreen's SR auto-open fires on every web Map arrival (orientation §7 #15 — app truth on web, not a harness artifact).
**Method:** eight parallel lens agents (L1–L8, briefs adapted per lens) judged the Part-1 evidence with read-only repo access; targeted probes ran serially through the Part-1 harness; every CRITICAL/HIGH finding then faced an independent adversarial skeptic (CONFIRMED / ADJUSTED / REFUTED); findings below are post-verification canonical. The material system was re-arbitrated against HEAD with the real tool (`contrast-check.mjs`) over real worst-case backdrops.
**Evidence tags:** `web-approximated` · `code-inferred` · `test-inferred` · `arbiter-measured` · `lab-mockup` · `NEEDS-SKY-DEVICE`.
**Severity scale (calibrated cross-lens):** **CRITICAL** = an access failure on a core flow (an SR-unusable step, an AA breach on a primary surface, a target/gesture lockout), a trust-breaking defect, or overlap/clip/occlusion at any device size. **HIGH** = materially impairs a disabled user's job or the cohesion/trust mission. **MEDIUM** = real gap, secondary path. **LOW** = careful-eye. **POLISH** = taste-level. At equal tier, access failures outrank aesthetic ones.
**Finding format:** `L{n}-{seq}` · Where (screen/component/file:line) · What · Why it matters (mission-weighted) · Evidence (capture filenames + code refs + [tag]) · Severity (+ skeptic verdict on CRITICAL/HIGH).

---

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

**Annotated-capture coverage note:** **all 36 canonical CRITICAL/HIGH carry an annotated PNG in `assets/annotated/`** (`L{id}__*.png`, one per finding). For the visually-anchored defects the marks point at the defect on its own screen; for the code-/probe-/device-only findings (L4-01/L4-02 motion traces, L6-01/L6-02 RN-web internals, L6-04 native flattening, L6-07/L8-7 device-only light-tile/anon-pin, L3-4 SQL trigger, L7-01/L7-02 timing/offline internals, L8-4a RLS refusal, L1-2 native funnel) the annotation captures the surface where the defect manifests plus a caption stating the code-level mechanism and its honest tag — the primary evidence for those remains the cited code refs + banked probe traces in `partials/verdicts.md` + `01_render-index.md`.


---

## L1 — First impression / onboarding



The first five minutes of AccessMap are two different products. The pitch is genuinely excellent — a calm forced-dark carousel with humane copy, real permission priming (explain → check silently → prompt only on tap → denial never blocks), a brand mark (person-in-pin) whose splash composes seamlessly because the icon background is the exact splash hex, and a Home that refuses to fabricate distances it doesn't have. But the promises the first-run makes are repeatedly broken by the app that follows: "Open the Map" lands a native user on an email/password wall (guest link a ghost footnote, and forgotten on every relaunch), the same CTA on web lands on Home, and the web "full map" arrival is a full-screen list that hides the map entirely; the sign-in screen tells guests they can't report when a whole anonymous-report flow ships; and the single worst state in my scope — deny location, arrive at the Map — silently renders San Francisco under a false "5 flags nearby" claim with no banner and no recovery hint. The location slide, the most sensitive consent moment in an app that maps disability, is also the only permission with no visible "not now." The raw material of a trustworthy first impression is all here — most fixes are copy, ordering, and applying patterns that already exist elsewhere in this codebase.

---

### Findings

**L1-1 · CRITICAL — Deny location, and the first map is silently the wrong city under a false "5 flags nearby" claim**
- **Where:** MapScreen first arrival, permission denied/undetermined — `src/screens/MapScreen.tsx:123-128` (`DEFAULT_REGION` = San Francisco 37.7749,-122.4194), `:1039-1060` (mount probe: `initialLocationAction(status) !== 'fetch'` → only clears the spinner; `permissionDenied` is NEVER set on arrival — it is set only inside the user-initiated `requestLocation()` at `:996-1005`), `:1278-1283` (pill renders `${flags.length} flags nearby` — the count of ALL loaded flags, not what's in the viewport); `src/lib/location.ts:75-79`.
- **What:** A first-time user who denied location (or skipped/never granted — the exact behavior of a privacy-cautious disabled user, this app's core audience) opens the Map and gets: a citywide **San Francisco** map ("SAN FRANCISCO" label visible), **zero pins**, a pill asserting **"5 flags nearby"** (the flags are ~2,000 km away in Kelowna), **no banner, no explanation, no recovery affordance**. The designed "Location access is off. Turn it on in your device Settings…" banner (`MapScreen.tsx:2004-2014`) renders only after the user later taps the icon-only "Recenter on me" and is re-denied.
- **Why it matters:** This is the denial path of the app's very first privacy ask, and it punishes denial with a silently wrong map plus a factually false status claim. The mission is *trustable* navigation: a user concludes either "the app is broken/empty" (R6 would have quit) or — worse — trusts "5 nearby" and finds nothing. R1 (wheelchair-user read) independently ranked this the #1 stranding friction. DESIGN.md's law is that beauty which excludes is a defect; a map that lies to the user who exercised a privacy right is the trust version of that defect.
- **Evidence:** `states/map__light__390__permission-denied.png`, `states/map__dark__390__permission-denied.png` (+375/430/834 variants) [web-approximated]; code chain above [code-inferred — the mount path is platform-shared; native OS-denial presentation NEEDS-SKY-DEVICE]; corroborated by blinded read R1 (top-friction #1).
- **Severity:** CRITICAL (trust-breaking defect on the core FIND flow, first session).

**L1-2 · HIGH — Native first-run funnel: "Open the Map" lands on a sign-in wall; the guest path is a footnote, mislabeled, factually wrong, and forgotten on every relaunch**
- **Where:** `App.tsx:106-148` (Gate), `src/screens/SignInScreen.tsx:232-245` (guest block), `:410-417,433-438` (guest link styles), `:239` (a11y hint), `:243` (guest note); `src/components/OnboardingCards.tsx:410-427` (final CTA).
- **What:** Four compounding defects on the native signed-out funnel (web is exempt — web IS guest mode):
  1. The onboarding's final CTA promises **"Open the Map"** but `Gate` routes a session-less native user to **SignInScreen** — an email/password form (`App.tsx:141-148`). The first thing the app asks for after "You're all set" is credentials.
  2. The way out — "Browse without an account →" — is a `font.size.sm`, 75%-alpha text link sitting under two 56pt-min-height gradient/outlined CTAs. The value path (browse real barrier data with zero commitment) has the least visual weight on the screen.
  3. Its copy is wrong at HEAD: the note says "you'll need an account **to report** or verify" and the a11y hint says "**Reporting flags requires an account**" — but anonymous reporting is a shipped, first-class flow (`src/lib/flags.ts:1270` `createAnonFlag`; the guest sheet "Report anonymously" is captured live, `flows/report__light__390__open.png`). The auth screen actively suppresses the contribution path the app built for exactly these users. (The "verify" half is true — see L1-5.)
  4. `guestMode` is un-persisted in-memory state (`App.tsx:110`), so a guest who chose "browse without an account" hits the full sign-in wall again on **every cold start**.
  Also a WCAG 2.5.3 Label-in-Name miss: visible text "Browse without an account" is absent from the accessible name "Continue as guest" — voice-control users can't speak what they see.
- **Why it matters:** First-run dignity: a disabled user should reach value before being asked for anything. Web gets this right by architecture; native undoes it with hierarchy, copy that misstates the guest contract, and amnesia. Every wrong claim on an auth screen is a trust withdrawal at the exact moment trust is decided.
- **Evidence:** code refs above [code-inferred — native-only surface; web never renders the guest block: `base/signin-modal__light__390__at-rest.png` shows the modal variant without it] [NEEDS-SKY-DEVICE for the rendered native screen]; anon flow existence: `flows/report__light__390__ready-submit.png` [web-approximated].
- **Severity:** HIGH.

**L1-3 · HIGH — The location slide, the app's most sensitive consent moment, is the only permission without a visible "not now" — and on web the button is theater**
- **Where:** `src/components/OnboardingCards.tsx:91-125` (CARDS — no decline affordance on the location card), `:216` (`showMaybeLater` is notifications-only), `:243-255` (`handlePermissionAction`: on web, "Allow Location" performs **no permission action** and just advances), `:284-296` (Skip exits the whole tutorial); `src/screens/HomeScreen.tsx:108-113` (the real web ask is deferred to Home's "Use my location").
- **What:** Slide 4 (notifications) models the respectful pattern perfectly: big "Turn on Notifications" + a visible "Maybe later" escape. Slide 3 (location) offers only **"Allow Location"**, a dimmed Back, and the tiny top-right Skip that abandons the remaining slides. A user who doesn't want to grant must either open the OS dialog just to decline it, or quit the tutorial. R6 (cognitive-load read) hesitated here and nearly bailed: "consent is the toll to continue." On web it's worse in a different way: tapping "Allow Location" does nothing at all (no browser prompt — it just advances), then the *real* browser prompt appears later, unannounced, when "Use my location" is tapped on Home — a double-ask where the first ask was fake.
- **Why it matters:** This is an app that maps disability; its users' location behavior is disability-adjacent data, and consent posture IS the brand. The codebase already contains the correct pattern eight lines away (`showMaybeLater`); its absence on the more sensitive of the two permissions reads as grant-rate optimization (the file comment says the priming "raises grant rates") on the wrong slide. Denial genuinely never blocks (the handler advances regardless) — but the UI hides that fact from the user, which is the dark-pattern shape even though the behavior is benign.
- **Evidence:** `flows/onboarding__light__390__slide3-location.png` vs `flows/onboarding__light__390__slide4-notifications.png` [web-approximated — layout is platform-shared; native OS prompt behavior code-inferred + NEEDS-SKY-DEVICE]; code refs above; R6 baseline read.
- **Severity:** HIGH (consent dignity at the first privacy ask; cheap, in-codebase fix).

**L1-4 · HIGH — On web, "Open full map" never shows a map: the SR auto-list opens full-screen over it for every visitor**
- **Where:** `src/screens/MapScreen.tsx:355` (SR auto-open) + orientation ledger §7 #15 (probed fact: RN-web resolves `AccessibilityInfo.isScreenReaderEnabled` **true for every web user**, headed or headless, zero AT running); NearbyFlagsModal presentation.
- **What:** Every web user's first Map arrival — including the Home tap explicitly labeled "Open the full map" — produces a full-viewport "Nearby flags" list that completely hides the map at all four captured widths (390 and 834 verified: not a partial sheet, a full cover). The user asked for a map and got a modal they must discover how to Close; the Close button is last in a long traversal for SR users too (the dialog sits after ~30 nodes of map chrome in the tree, and its wrapper element is unnamed). For real SR users this list-first landing is genuinely the app's best behavior — the list rows announce category, severity, distance, status, and description in one breath — but it fires for *everyone* on web because the platform hook cannot distinguish.
- **Why it matters:** The first map view is where a new user decides what this app is. On web the answer is "an interruption stacked on a map I never saw" (R6: "small whiplash"); the guest report path then stacks the report sheet as a THIRD layer over the stale list (`flows/report__light__390__open.png`, orientation §8.6). The auto-open intent (SR-first) must be protected; the blanket web trigger and the full-viewport, unnamed presentation are the defects.
- **Evidence:** `base/map__light__390__first-arrival-auto-list.png`, `base/map__light__834__first-arrival-auto-list.png`, dark twins [web-approximated — this is web APP TRUTH, not a harness artifact, per the banked probe `tools/probe-sr.mjs`]; `a11y-tree/map-first-arrival__light__390.txt` lines 47-62 (dialog last, wrapper unnamed, superb row labels) [web-approximated]; native VoiceOver behavior differs (hook reflects real state) [NEEDS-SKY-DEVICE].
- **Severity:** HIGH (core-flow first impression for the entire web audience; cost is legibility of the product's namesake surface).

**L1-5 · HIGH — Guests are offered Verify/Resolve/Reject on Tasks; every tap must fail, and the failure message is a lie**
- **Where:** `src/screens/TasksScreen.tsx:686-705` (single-card action path has NO signed-in gate — contrast the bulk-watch gate at `:558`), `src/lib/flags.ts:936-945` (`updateFlagStatus`: RLS-filtered update touches 0 rows → `maybeSingle()` → null → throws `FlagStatusConflictError`), `supabase/schema.sql` flags UPDATE policies (`to authenticated` only — both "flags update own" and the triage policy).
- **What:** A guest's Tasks screen renders fully-enabled "Verify / Resolved / Reject" buttons on every card (captured: `base/tasks__light__390__at-rest.png`; tree: `a11y-tree/tasks__light__390.txt` lines 30-35). Under anon RLS the update affects zero rows, which the client interprets as a concurrency conflict: the guest is told **"This flag changed — It was updated by someone else just now — refreshing the list."** — false on both counts. There is no "sign in to verify" invitation anywhere on the path.
- **Why it matters:** For a first-session guest, the red-badged Tasks tab is the app's loudest call to action (R6 went there in minute one: "do I owe someone work?"). Their first attempted contribution fails with a fabricated explanation. A confused user retries, gets the same lie, and reasonably concludes the app is broken. The dignified version (gate with an honest sign-in prompt, as bulk-watch already does) exists 130 lines up in the same file.
- **Evidence:** captures + tree above [web-approximated]; failure chain [code-inferred — the tap was never performed; the audit is read-only and mutation-adjacent clicks were fenced. The chain is deterministic: no client gate → authenticated-only RLS → 0-row update → typed conflict → the exact string at `TasksScreen.tsx:697`].
- **Severity:** HIGH (first contribution attempt fails dishonestly for every guest).

**L1-6 · MEDIUM — The first map a new user ever sees is a dark void of the wrong city, unexplained**
- **Where:** Home map peek — `src/screens/HomeScreen.tsx:58-63` (`FALLBACK_PEEK_REGION` = San Francisco), `:113` (web: location probe never mounts until "Use my location" is tapped, even with browser permission already granted), `:120-122`, `:258-269` (peek renders full Leaflet chrome inside a 168pt card).
- **What:** Until the user opts in to location (every web first visit; native whenever permission wasn't granted), the Home map peek renders the San-Francisco fallback: near-black CartoDB tiles inside the light theme, zero pins (the real flags are in Kelowna), directly beneath the headline "5 barriers." Nothing on or near the peek says "showing a default area — use your location to see your city." Compounding clutter: live Leaflet "+/−" zoom buttons sit inside a 168pt-tall peek whose entire surface is one "Open the full map" button (two micro-targets that swallow taps meant for the big one), and the full-width attribution strip runs beneath the "Open full map" pill, its "contributors © CARTO" text occluded by the pill and clipped at the card edge.
- **Why it matters:** R6's honest first read of the app's most important pixel: "the map failed to load." The dark-tiles-in-light-shell issue is global (tiles ≠ theme, ledger §7 #2 — other lenses own it), but the *wrong-city + no-explanation + zero-pins under a "5 barriers" headline* combination is a first-impression trust event specific to this surface. The honest-distances design underneath (never fabricate; LATEST/Recent mode) is excellent and must survive any fix.
- **Evidence:** `base/home__light__390__at-rest.png` ("Van Ness Avenue" legible = SF; zero pins; attribution occluded), `base/home__dark__390__at-rest.png`, `base/home__light__834__at-rest.png` (right ~25% of the peek reads as an un-tiled void at tablet width — likely bay water on dark tiles, but it presents as missing tiles) [web-approximated]; native-granted path self-heals via the silent probe (`HomeScreen.tsx:110-113`) [code-inferred].
- **Severity:** MEDIUM (one tap recovers it and the list carries real value, but it is the single most-seen broken-looking pixel in the app).

**L1-7 · MEDIUM — The Report pill occludes list rows at rest on phones**
- **Where:** `src/screens/HomeScreen.tsx:345-355,482-495` (absolute pill at `bottom: bottomInset + spacing.md`), `:178` (scroll `paddingBottom: bottomInset + 96` provides scroll-clear).
- **What:** At rest, the floating "+ Report" pill covers the right end (chevron, part of the meta line) of a live list row: the 5th row at 390, and mid-list rows at 375 where it also visually collides with the row separator region. Both the pill and the covered row remain tappable, and scrolling relieves the overlap — but the at-rest first paint shows an element sitting on interactive content, and a one-handed user aiming at the row's chevron risks firing Report instead (R4's read: "I'd mis-fire Report when aiming at the row's chevron").
- **Why it matters:** Occlusion is the named enemy. I am deliberately rating this below the calibration line's "occlusion = CRITICAL" because the 96pt scroll padding makes it transient and no target is lost — but it is a real first-paint blemish on the landing screen and a real mis-tap risk for dexterity-limited users.
- **Evidence:** `base/home__light__375__at-rest.png` (pill over row 2's right edge), `base/home__light__390__at-rest.png` + dark twins (pill over the last row's chevron) [web-approximated]; R4 baseline read.
- **Severity:** MEDIUM.

**L1-8 · MEDIUM — Onboarding teaches interactions that don't exist for the user it's teaching**
- **Where:** `src/components/OnboardingCards.tsx:98-103` (slide 2 copy), `src/screens/MapScreen.tsx:2059` (`{authUser && …}` Report FAB — guests have no visible report affordance on the Map), map long-press/right-click drop-flag (undocumented anywhere in-product), `src/lib/flags.ts:888-891` (anon path has no photo support), `src/screens/OnboardingModal.tsx:48-53` (replay card 3: points).
- **What:** Slide 2 promises: "**Tap where the barrier is, snap a photo** if you can…". At HEAD: (a) no plain-tap placement exists for anyone — placement is long-press (native) / right-click (web), a hidden gesture taught nowhere; (b) a guest standing on the Map has **no** visible report control at all (FAB is auth-gated; the guest entry is Home's Report pill, which places at current location); (c) the anonymous flow **cannot** attach photos — the photo step is replaced by a sign-in nudge (`flows/report__light__390__photo-step.png`). Separately the Settings "Replay tutorial" pitches "**Earn points** together" to an audience that includes guests, who cannot earn points.
- **Why it matters:** Minute-one mental models are load-bearing under cognitive load. Each promise-vs-reality gap costs a re-orientation exactly when the user is deciding whether the app is trustworthy; the photo gap also hits the mission's verification story (R6 and the anon-spec both treat photos as trust fuel).
- **Evidence:** `flows/onboarding__light__390__slide2-how-it-works.png`, `flows/report__light__390__open.png` (no photo affordance, sheet stacked over the stale list) [web-approximated]; FAB gating + gesture [code-inferred]; guest-map absence corroborated by R2 ("no Report button in any map tree" — the guest truth).
- **Severity:** MEDIUM.

**L1-9 · MEDIUM — The first-launch carousel exposes all five slides to SR at once, in an unnamed dialog, with five unlabeled images — while the better pattern already ships in the replay modal**
- **Where:** `src/components/OnboardingCards.tsx:299-361` (all cards mounted in the pager, none aria-hidden on web), `:334-343` (icon circle marked hidden — but the SVGs still emit as bare `img` in the web tree), `:263` (Modal — dialog wrapper has no accessible name), `:468` ("Next. Card 1 of 5." describes the current card, not the destination); contrast `src/screens/OnboardingModal.tsx:133-153` (pager hidden from AT + a single live-region card announcer — the correct architecture, already in this repo).
- **What:** The web ARIA tree for first-launch onboarding (`a11y-tree/onboarding__light__390.txt`) is: unnamed `dialog` → Skip → `img` (unlabeled) → "1 / 5" → slide 1 heading+body → `img` → "2 / 5" → … all five slides traversable at once → "Back. Disabled on first card." → "Next. Card 1 of 5." A blind user "reads" the whole deck linearly, then meets a button insisting they're on card 1 (R2: "the visual state and my state don't match"). Five decorative icons announce as bare "image." Position text "1 / 5" is read as "one slash five."
- **Why it matters:** This is the first screen of the product for every new device — and the app's own replay modal (Settings → Replay tutorial) already implements the fix: hidden pager, one polite live region, "Step N of M" labels. The carousel's genuinely thoughtful touches (disabled-Back explanation, position announcements on change, per-slide headings) deserve the containment to match.
- **Evidence:** `a11y-tree/onboarding__light__390.txt` lines 1-24 [web-approximated — RN-web emitted tree; native VoiceOver traversal of paged ScrollViews commonly matches but is unverified: NEEDS-SKY-DEVICE]; code contrast above [code-inferred]; R2 baseline read.
- **Severity:** MEDIUM.

**L1-10 · MEDIUM — Web sign-in modal: unnamed dialog, background fully traversable, brand announced twice**
- **Where:** `src/screens/SignInScreen.tsx` presented as Profile's modal (web guest funnel); `a11y-tree/signin-modal__light__390.txt`.
- **What:** In the web tree the entire Profile screen (menu button, heading, the very "Sign in to your account" button that opened the modal, the whole tab bar) remains traversable BEFORE the unnamed `dialog` — no modal containment, no aria-modal, no inert background. Inside, the logo announces "AccessMap, image" immediately followed by "AccessMap, heading" (LogoMark carries an `accessibilityLabel` and the wordmark repeats it). The good bones are real: "Go back without signing in" is an exemplary escape label, both fields are labeled, the inline error is an assertive live region with an explicit announce (F65).
- **Why it matters:** A blind web guest deciding whether to hand over credentials can wander out of the dialog mid-form and land back on the stale screen behind it — a navigation maze at the trust-decision moment. Native `Modal` containment is a different mechanism and likely fine (NEEDS-SKY-DEVICE).
- **Evidence:** `a11y-tree/signin-modal__light__390.txt` lines 1-34 [web-approximated]; `base/signin-modal__light__390__at-rest.png`. (R2's "Password not a secure field" is NOT adopted: ARIA has no distinct password role — the tree cannot show one; snapshot artifact.)
- **Severity:** MEDIUM (web SR).

**L1-11 · LOW — "Replay tutorial" replays a different tutorial**
- **Where:** `src/screens/SettingsScreen.tsx:552,616-624` mounts `src/screens/OnboardingModal.tsx` (3 cards: drop-a-pin / rate 1-5 / earn points, theme-following, generic lucide MapPin) — not the 5-slide `OnboardingCards` the user actually saw at first launch (see-a-barrier / tap+photo / location / notifications / all-set, forced-dark, different pin). The OnboardingCards header comment (`:44-46`) still claims OnboardingModal "runs AFTER sign-in" — nothing auto-mounts it at HEAD; it survives only as this Settings replay.
- **What:** A user seeking a refresher gets a shorter, visually different intro whose content diverges from what they were taught ("drop a pin" vs "tap"; a points pitch that excludes guests) and whose final button is labeled "Open the Map" with hint "opens the map" but actually just returns to Settings.
- **Why it matters:** Small, but it's the app describing itself inconsistently — the exact cohesion cost R5 flagged app-wide (two intro materials, two brand pins, two theme behaviors).
- **Evidence:** `base/onboarding-replay__light__390__at-rest.png`, `pane-2/pane-3.png` vs `flows/onboarding__light__390__slide*.png` [web-approximated]; code refs [code-inferred].
- **Severity:** LOW.

**L1-12 · LOW — A failed first load leaves Home in indefinite fake-loading with a redaction-bar headline**
- **Where:** `src/screens/HomeScreen.tsx:160,184` (`showFirstLoad` skeletons; title placeholder `'—'`), `:283-297` (a designed error card — "Couldn't load reports." + Try again — exists).
- **What:** With Supabase blocked (the harness's honest offline substitute), the capture shows the eyebrow "LATEST", a short **black dash** where the headline belongs (the em-dash at display size reads as a redaction bar / rendering failure), and four skeleton rows — no error text, no retry. The designed error branch never rendered at capture time, meaning `error` was still unset while `loading` persisted (store retry/backoff window, `src/lib/flagsStore.tsx:305-319`).
- **Why it matters:** A first-time user on flaky transit connectivity — a core mobility-user context — cannot distinguish "loading" from "dead," and R1's read treated it as the app silently failing. Uncertainty is acknowledged: the capture is one instant; the error card may surface later (probe requested below).
- **Evidence:** `states/home__light__390__load-error.png` + dark twin [web-approximated]; code refs [code-inferred].
- **Severity:** LOW (pending probe; upgrade to MEDIUM if the error card provably never lands).

**L1-13 · LOW — The Tasks badge and the Tasks list can disagree in the same frame**
- **Where:** `src/navigation/RootNavigator.tsx:220-221` (badge = open-count from the shared `useFlags()` store) vs TasksScreen's own paginated fetch.
- **What:** In one captured frame the tab announces "5 Tasks" while the screen beside it shows "Open 2 / Verified 3" (`a11y-tree/tasks__light__390.txt`: line 66 `tab "5 Tasks" [selected]`, line 27 `heading "Open 2"`); every other screen's tree says "2 Tasks." Two independent data sources compute "the same" number, so a stale store snapshot can contradict the fresh list it badges. Three blinded readers (R6, R2, R5) independently tripped on it. Separately, an unexplained red numeric badge is the first thing a brand-new user sees on the tab bar — R6's honest reaction: "do I owe someone work? I just got here."
- **Why it matters:** Numbers that don't reconcile are micro-withdrawals from the same trust account the mission depends on. (Cause is inferred — store staleness vs live data drift; the symptom is banked.)
- **Evidence:** trees above [web-approximated]; code ref [code-inferred].
- **Severity:** LOW.

**L1-14 · LOW — Dark-mode users get a white flash at every cold start**
- **Where:** `App.tsx:182-185` (FirstLaunchGate loading state renders `backgroundColor: '#fff'` regardless of theme); `app.json` `web.backgroundColor: "#ffffff"`.
- **What:** Between splash/page-load and first render, dark-mode users see a hardcoded white surface (typically ~50-100ms; longer on slow devices/web cold loads). The theme system is already mounted above this gate (ThemeProvider wraps FirstLaunchGate) — a token color was available.
- **Why it matters:** Photosensitive and migraine-prone users choose dark mode for a reason; a flash-bang on every launch is a small recurring hostility, and it's the literal first frame of the product.
- **Evidence:** `App.tsx:184` [code-inferred; not capturable by the still harness — NEEDS-SKY-DEVICE to observe].
- **Severity:** LOW.

**L1-15 · LOW — Android launcher icon config is incomplete (adaptiveIcon without foregroundImage)**
- **Where:** `app.json:29-34` — `android.adaptiveIcon` specifies only `backgroundColor: "#ffffff"`; no `foregroundImage`. The 1024px `assets/brand/app-icon.png` is a full-bleed rounded square (transparent corners).
- **What:** Without a dedicated adaptive foreground layer, Android builds fall back to legacy icon handling: launchers typically shrink the rounded-square onto a white plate inside their mask (the classic "iOS icon in an Android circle" degradation), and the white backgroundColor guarantees white corner wedges wherever the square's transparent corners meet a round mask.
- **Why it matters:** The icon is the first brand pixel a user ever sees; the mark itself (white person-in-pin on #1466E0) is strong and deserves a proper foreground/background pair. Low because iOS/TestFlight is the active ship target.
- **Evidence:** `app.json:29-34`, `assets/brand/app-icon.png` (1024×1024 RGBA, baked rounded corners) [code-inferred; NEEDS-SKY-DEVICE — no Android build in evidence].
- **Severity:** LOW.

**L1-16 · POLISH — The onboarding's decorative glow orb misaligns with the icon at non-primary heights**
- **Where:** `src/components/OnboardingCards.tsx:534-542` (orb: fixed 280px, absolute `top: '20%'`) vs the flex-centered card content (`:552-561`).
- **What:** The orb and the icon circle only compose at ~390×844. At 375×667 the icon rides the orb's top edge; at 834×1194 the icon overlaps the orb's bottom-right rim and the orb floats detached above the content — the halo reads as a misplaced blob rather than a glow.
- **Evidence:** `flows/onboarding__light__375__slide5-ready.png`, `flows/onboarding__light__834__slide3-location.png` vs `flows/onboarding__light__390__slide1-welcome.png` [web-approximated].
- **Severity:** POLISH.

**L1-17 · POLISH — Off-brand notification accent in app.json**
- **Where:** `app.json:55-58` — `notification.color: "#1a4fa3"` vs brand `#1466E0` (used by icon, splash, themeColor, ctaFill).
- **What:** The Android notification accent is a stray fifth blue that predates the Wayfinder Blue system; every other brand touchpoint in app.json uses `#1466E0`.
- **Evidence:** `app.json` [code-inferred].
- **Severity:** POLISH.

**Classification note (retires R4's dark-375 observation, per orientation §8.9):** the square lightning-bolt button overlapping the Home tab in `base/home__dark__375__at-rest.png` is the **Expo dev-menu launcher** — dev-server chrome from the `npm run web` dev-mode harness (ledger §7 #8: `__DEV__` true), present in no other capture and not part of the app. NOT a finding; a release/export build should be spot-checked once to confirm absence [NEEDS-SKY-DEVICE, trivial].

---

### PROTECT nominations (L1)

1. **The permission-priming architecture** (`src/components/OnboardingCards.tsx:37-42, 221-255`): explain before the OS prompt; check existing status WITHOUT prompting (returning users get "Continue," not a redundant dialog); denial never blocks progress; granted state flips the slide to a green check + "you're all set" body in place. This is the accessibility-respectful pattern done properly — L1-3 asks to extend it (add "Not now" to location), never to dilute it.
2. **Web-as-guest-mode** (`App.tsx:144-146`): no root sign-in wall on web — a brand-new user reaches real barrier data in zero taps. Any future "growth" wall here would be a mission regression.
3. **Home's honesty law** (`src/screens/HomeScreen.tsx:55-63, 124-138, 163-169`): distances are never fabricated from a fallback point; with no center the screen honestly relabels itself LATEST/"Most recent reports"/RECENT. Fix the SF *peek* (L1-6) without touching this.
4. **The Nearby list's SR row grammar** (`a11y-tree/map-first-arrival__light__390.txt:58`): "No ramp, severity 4, 297 meters away. Status verified. No ramp at the corner — wheelchair users have to detour." — category, severity, distance, status, description in one breath. The single best accessible moment in the app (R2: "I'd genuinely use this over a raw map app"). L1-4's fix must change the *trigger*, not this content. Also protect the focus-on-open behavior (the captured focus ring on "Close" is evidence focus lands correctly).
5. **The anonymous-report sheet's trust block** (`flows/report__light__390__open.png`): "Reporting anonymously — your identity is not stored." exposed as a real `alert` role, plus severity buttons that announce full plain-language meaning ("Severity 3: Moderate — Hard for many users."). Honest, dignified contribution — the funnel copy (L1-2c) should be corrected TO this truth, not the other way.
6. **Icon/splash composition** (`assets/brand/app-icon.svg` rect fill `#1466E0` == `app.json` splash `backgroundColor` `#1466E0`): the splash reads as a clean white pin on brand blue only because these two hexes are identical. Protect the coupling explicitly (a comment or token) — one drift and every launch shows a mismatched tile.
7. **Reduce-motion discipline in both carousels** (`OnboardingCards.tsx:141-175, 186-189, 263`; `OnboardingModal.tsx:85, 112`): fade→none, spring dots→setValue, paging animation→instant. First-run motion is fully gated before the user has found Settings.
8. **"Back. Disabled on first card."** (`OnboardingCards.tsx:403`) and **"Go back without signing in"** (`SignInScreen.tsx:118`): disabled-state and escape-hatch labeling that explains rather than stonewalls — R2 singled both out. House style worth codifying.
9. **The editorial Home headline** ("LATEST / 5 barriers / Most recent reports"): every blinded reader instantly understood the dataset's scope from it. Whatever Deep Field brings to Home (GLASS.md §8 planned work), keep the headline's plainness.

### Copy observations (L1)

- **One thing, four names in the first minute:** "barrier" (slides 1-2, Home) → "flags" (slide 3, map UI) → "reports" (Home subtitle) → "Tasks" (tab). Slide 3's title "Show flags near you" introduces the term with zero definition. R6's #3 friction; each rename taxes cognitive-load users.
- **Two different location-privacy contracts:** onboarding says "only used while the app is open — never tracked or stored on our servers"; the sign-in screen says "Your location is only used when you place a flag" (also understates: browsing with location computes nearby distances). Neither mentions that a submitted report publishes the chosen coordinates permanently. One canonical sentence, reused, would be stronger and truer.
- **"Open the Map" never opens the map:** final carousel CTA → Home (web) or sign-in (native); replay CTA + its a11y hint ("opens the map") → returns to Settings.
- **SignInScreen guest note/hint** ("need an account to report" / "Reporting flags requires an account") contradicts the shipped anonymous flow — the copy half of L1-2.
- **"1 / 5" position pill** announces as "one slash five"; the replay modal already uses the better "Step N of M" phrasing.
- **"Next. Card 1 of 5."** labels the current card, not the destination; "Next, to card 2 of 5" would match user expectation.
- **Stale code comment:** `MapScreen.tsx:1041` says the first-time prompt is deferred to "OnboardingCards card 4" — it's card 3.

### PROBE-REQUEST blocks

```
PROBE-REQUEST: home load-error persistence
  screen: Home · state: blockSupabase route-abort from cold load, HOLD 60s, capture at t=5s/20s/60s
  sizes: 390 · themes: light
  proves: whether the designed error card ("Couldn't load reports." + Try again,
  HomeScreen.tsx:283-297) EVER replaces the indefinite skeletons+'—' state (L1-12).
  If it never lands, L1-12 upgrades to MEDIUM/HIGH; if it lands within ~10s, L1-12 downgrades to POLISH.
```

```
PROBE-REQUEST: guest verify tap outcome
  screen: Tasks (guest) · state: click "Verify" on one card, capture the resulting dialog
  sizes: 390 · themes: light
  proves: L1-5's predicted false message ("This flag changed — It was updated by someone
  else just now"). SAFETY NOTE for the orchestrator: this fires a real anon UPDATE against
  the live DB that RLS deterministically rejects (0 rows; authenticated-only policies in
  supabase/schema.sql) — no data can change, but it is a mutation ATTEMPT; skip if the
  fence is read strictly, and L1-5 stands on the code chain alone.
```

```
PROBE-REQUEST: onboarding under large text
  screen: Onboarding slides 3 and 5 · state: dt-proxy zoom 1.3 / 2.0 (document.body.style.zoom)
  sizes: 390 · themes: light
  proves: whether the first screen a low-vision user meets survives 2× (the G10 inner
  vertical ScrollView should make it scroll rather than clip — unverified; the dt/ group
  covered Tasks/Map/Report/Profile but not onboarding).
```


---

## L2 — Visual language + glass cohesion


**Lens:** L2 of 8 · **HEAD:** `82e738b` (working tree == HEAD, verified at session start) · **Read-only.**
Inputs: GLASS.md (whole), DESIGN.md §1/§2/§5/§7/§10/§12, the four rollout reports, `01_orientation.md`, `partials/arbiter.md` (mandatory), `01_baseline-reads.md` (R5 + R3 paired reads), `assets/base|glassmode|map|flows|parked|dt|states` captures, and code at HEAD (`theme.ts`, `ThemeContext.tsx`, `GlassSurface.tsx`, `ScreenStage.tsx`, every screen touched below). All contrast ratios quoted are [arbiter-measured] — none re-derived by eye. R5's dents were individually re-verified at HEAD before adoption (his packet WAS captured at HEAD; each adopted dent below carries its own HEAD code/capture citation).


**The one-material verdict:** AccessMap is one *material system* worn by about three-quarters of one product. Where Deep Field ships — Tasks, Settings, Profile, About/Resources/How-to-Help/Feedback, the Map's overlay chrome — the app genuinely reads as a single, premium, luminosity-literate thing: the same stage, the same hairline grammar, the same arbitrated inks, and a dark mode that is not an afterthought but the system's best argument (`tasks__dark__390__at-rest.png` is the most convincing screen in the app). The engineered/C-lite twin is visually indistinguishable from true blur at rest — the fallback architecture is invisible, which is exactly what "decorative-only blur" promises. But three seams keep it from reading as ONE product: (1) **the strongest seam is structural, not material — the two header families** (Home/Tasks editorial vs Profile/Map/Settings centered-nav, two hamburger shapes, two Feedback affordances, and a literal double-header on signed-in Profile), which survives every screen pair a user crosses and would survive even after Home's planned glassing; (2) **Home, the flagship landing, is the one un-glassed tab** (disclosed as future work in GLASS §8 — but the cost is real and compounding on web, where its dark map peek punches a black hole in the light theme); (3) **the modal layer wears two materials** — About/Feedback went bulk-glass while their own host-siblings (Help, Changelog, My Feedback) and every Map sheet stayed pre-glass opaque. And beneath the cohesion question sits this audit's worst discovery: the white-digit-on-severity-fill pattern the system believes it retired (`92a2be6`; the arbiter called RecentlyViewedRow "the last holdout") in fact survives in **six** components, three of them guest-reachable, including the auto-opened Nearby list and the Report form's selected-severity state — an AA breach sitting on the product's most trust-critical datum.

---

## Per-screen conformance table (expected per GLASS §8/§12 + orientation §4 vs shipped at HEAD)

| Surface | Expected tier (§8/§12) | Shipped at HEAD (verified) | Verdict |
|---|---|---|---|
| **Tasks** | The worked example: stage + chrome + rows + banner + bulk | `ScreenStage` (TasksScreen.tsx:803) · `variant="chrome"` abs pane (:811) · row cards/empty/skeletons (:1126–1846) · banner (:1286-region) · bulk (select) · C-lite long-press | ✅ CONFORMS (one 400-weight straggler on the empty card → L2-10) |
| **Map overlay chrome** | Row-tier: pill+bar literal `forceEngineered`, panel true-blur threading `glassLite`, no stage | statusPill (MapScreen.tsx:1270-76) + actionBar (:1292) literal engineered · filter panel `variant="row" forceEngineered={glassLite}` + `overlayTint={color.glassMapWash}` (:1516-19) · no ScreenStage | ✅ CONFORMS (bodyMedium deferral verified → L2-10; Leaflet web chrome → L2-3) |
| **Map legacy overlays** | Pinned always-light literals (§12.8), accepted BlurView cost | Locating banner literals (:1990-91, ink #333 :2615) · HeatmapLegend literals (HeatmapLegend.tsx:24-25, 73, 94) | ✅ CONFORMS as disclosed (swatch boundary → L2-8) |
| **Map-internal** (pins/cluster/heat badge/callout) | Tokens/inks only, never BlurView | Cluster ring union, heat-badge fill-keyed ink, callout opaque (arbiter §A.4 MATCH ×12) | ✅ CONFORMS (pin boundary gap = arbiter D-4, L1/L6 territory) |
| **Map modals** (Legend/Nearby/Report/AddressSearch/SavedPlaces/Presets) | Not in §8's map — no declared tier | 0 GlassSurface refs each; opaque pre-glass sheets; SavedPlaces/Presets = inline opaque Modals in MapScreen | ⚠️ Un-tiered layer → L2-5; severity discs → L2-1 |
| **Home** | §8 PLANNED: chrome-material pill + ScreenStage (future work) | `surfaceMuted` wash (HomeScreen.tsx:368) + legacy GlassSurface pill i=20 (:219) + editorial ScreenHeader (:182) | ⚠️ Known-unglassed; cost judged → L2-4 |
| **Profile (signed-out)** | Stage + centered states | `stageRoot` + `<ScreenStage/>` (ProfileScreen.tsx:815) + nav header | ✅ CONFORMS |
| **Profile (signed-in)** | Stage + hero/stat/history rows + banner + engineered siblings | ScreenStage (:804) · ScreenHeader w/ `inkOnStage` overrides (:878-886) · 4 blur-cluster `glassLite` + literals elsewhere (W2 §budget, arbiter A.3 MATCH) | ✅ material CONFORMS · ⚠️ double header (nav + editorial) → L2-2 [code-inferred, auth-gated] |
| **Settings** | Stage + 11 rows + engineered segment; shared nav header untouched | ScreenStage (SettingsScreen.tsx:446) · rows `forceEngineered={glassLite}` (:104, 490) · chip-tint track + opaque selected pill (:165-167) · `inkOnStage` labels (:655) | ✅ CONFORMS (at-ceiling budget disclosed in W1 §3) |
| **About** | W1: bulk sheet | `variant="bulk"` (AboutScreen.tsx:51), outer cardShadow (sanctioned dev.) | ✅ CONFORMS (light ghosting perception → L2-6) |
| **Resources / How-to-Help** | W1: stage + chrome + rows (+banner HTH) | ScreenStage+chrome (Resources :123/:130; HowToHelp :92/:99), rows/banner `glassLite` | ✅ CONFORMS (icon-grammar split → L2-15) |
| **Feedback** | W1: bulk sheet + engineered chips | `variant="bulk"` (FeedbackModal.tsx:182), chips chip-tint, `ctaFill` send | ✅ CONFORMS (emoji glyphs → L2-9; ghosting → L2-6) |
| **Help / Changelog / MyFeedback** (same SharedModalsHost family as Feedback) | never de-scoped | 0 GlassSurface refs — opaque pre-glass sheets | ⚠️ Sibling-material split → L2-5 |
| **Drawer** | W1: always-dark hardcode idiom, no GlassSurface, e3 kept | `rgba(13,18,32,0.94)` + cool edge/lip + RT `#0D1220` (HamburgerDrawer.tsx:295-309; arbiter A.2 MATCH) | ✅ CONFORMS (deliberate exception works) |
| **Tab bar** | Already speaks the language; collapse later | BlurView i=24 + floor + RT branch (RootNavigator.tsx:133-145); web CSS backdrop-filter (:284-296) | ✅ CONFORMS (the invisible +1 pane, counted) |
| **SignIn / Onboarding (both carousels)** | Documented pre-Deep-Field fixed-dark exceptions | SignIn `#070b18` + gradient + web blur(24px) (SignInScreen.tsx:258, 304); Onboarding full-screen gradient + `gradient.brandHero` CTAs | ✅ exception INTENTIONAL-but-island → L2-16 |
| **Leaderboard / Admin / NotifPrefs** | Out of glass scope (opaque modal / gated / flag-dead) | Leaderboard opaque `color.surface` (arbiter §C-d) | ✅ out of scope, correctly |

**Theme parity (brief #5):** the dark palette is structurally enforced (`satisfies typeof lightColor`, ThemeContext.tsx:205) and the luminosity-led rules hold where I checked: shadows are scheme-gated exactly as the law says (`color.scheme === 'light' ? shadow.e1 : {}` TasksScreen.tsx:2067-region; same guard on the Map panel :2497 and W1 rows), the two deliberate dark shadows (bulk up-shadow, drawer e3) are the only ones I could find, and no light-mode assumption survived in any dark capture I read (`tasks/home/map/settings/profile__dark__*`). The one ink that "reads wrong" per theme is disclosed and pinned on purpose (always-light map overlays). Parity verdict: PASS.

**Spacing/radius spot-checks (brief #7):** 4pt-grid tokens and the radius vocabulary held everywhere I read code (cards `radius.lg`, pills `radius.full/circle`, sheets `radius.sheet`, panel `radius.lg`, chrome/bulk radius 0 per recipe). A few literal paddings persist in MapScreen styles (e.g. `paddingHorizontal: 12/14` :2545, :2570-region) — token-adjacent values, no visual drift; not finding-worthy.

---

## Findings

### CRITICAL

**L2-1 · The white-digit-on-severity-fill pattern survives in SIX components — three guest-reachable, including the auto-opened Nearby list and the Report form's selected state. The arbiter's "last holdout" claim (D-1, RecentlyViewedRow) is an undercount.**
- **Where:**
  1. `src/screens/NearbyFlagsModal.tsx:140-145` + `:376-387` — 32px disc `backgroundColor: severityColor(item.severity)`, digit `color.textOnBrand` (white) at `font.size.sm` = **13pt bold** (below WCAG's 14pt-bold large-text line → **4.5:1 floor**). **Guest-primary:** this list auto-opens for every web visitor (orientation §7 #15) and is the designed SR alternative to the map.
  2. `src/screens/LegendModal.tsx:66-70` + `:192-203` — 32px disc, white digit at `font.size.base` = 14pt bold (large → 3.0 floor). The severity *decoder ring itself* (the surface R6/R1 praised as the app's best explainer) renders its key numbers in the failing ink.
  3. `src/screens/ReportFlagModal.tsx:607, 637` + `:1081-1084` — the **selected** severity button fills with `severityColor(s)` and flips the digit to `sevTextActive` white (16pt bold, large → 3.0 floor) + a white 11px Check (:623). The core CONTRIBUTE flow, guest-reachable.
  4. `src/components/ActivityFeedModal.tsx:156-162` + `:458-461` — white 12pt bold on 28px disc [auth-gated].
  5. `src/components/RecentlyViewedRow.tsx:139, 202-204` — white 12pt bold on 24px dot [auth-gated; = arbiter D-1].
  6. `src/components/FlagDetailModal.tsx:1066, 1076` + `:1797-1798` — edit-mode severity radio, active digit `textOnBrand` white 14pt bold [auth-gated].
- **What:** White text on the severity fills measures **1.57 (sev1) / 2.15 (sev2) / 2.78 (sev3) / 3.61 (sev4)** — the exact pairs the arbiter measured in its extension run (the fills are opaque, so the ratios transfer verbatim to every site above). At the 4.5 floor (sites 1, 4, 5) all four fail; even at the 3.0 large-text floor (sites 2, 3, 6) severities 1–3 fail. Only sev5 red (4.83 vs white) passes everywhere — which is precisely why the system's own ratified fork (`severity[n].textOnColor`, theme.ts:543-547, shipped `92a2be6`) puts ink `#0F1B2D` on 1–4 and white on 5 only. SeverityBadge, the Map sev pills (MapScreen.tsx:1690-1700) and the action-bar quick chip (:1355-1365) all obey the fork; these six never adopted it.
- **Why it matters:** severity is THE trust datum of a barrier map. On the one list every web/SR-adjacent guest is auto-shown, a severity-1 disc reads as a blank yellow dot (visually confirmed: the "1" discs in `flows/map__light__390__nearby-modal.png` are washed out; sev-4's white "4" is soft); on the Report form, the number a user just chose is at its least legible the moment it's selected. This contradicts the app's foundational promise (DESIGN.md: "born accessible… color never the only signal" — here the number IS the redundant signal, and it dissolves).
- **Tempering (honest):** every site keeps a passing text twin nearby — Nearby's meta line ("Severity 4 · verified", textMuted on white, AA), Legend's adjacent "1 Minor" labels, Report's live label line + `accessibilityState`, and all discs are a11y-hidden with the number in the SR label. Information is never *lost*; the primary visual mark fails. Sev-4/5 pass at the large-text sites.
- **Evidence:** [arbiter-measured] pairs (`assets/arbiter/audit-stacks-output.txt` rows sevDot1–4, both themes) · captures `flows/map__light__390__nearby-modal.png`, `flows/report__light__390__severity-chosen.png` (sev-4 active: white digit + white check on orange) · code refs above at HEAD · sites 4–6 [code-inferred, auth-gated].
- **Severity: CRITICAL** — an AA breach [arbiter-measured] on primary guest surfaces (auto-opened Nearby list; Report form), with the same defect replicated across the severity system's remaining un-forked sites. Fix-shape (Part 3): adopt `severity[n].textOnColor` at all six sites — a mechanical, already-ratified fork.

### HIGH

**L2-2 · Two header families — and both at once on signed-in Profile.**
- **Where:** Home/Tasks: `headerShown:false` (RootNavigator.tsx:328, 335) + editorial `ScreenHeader` with in-header actions — 44px WHITE CIRCLE buttons (`radius.full`, bg `color.surface`, HomeScreen.tsx:370-377), icon-only Feedback (MessageSquare). Profile/FullMap/Settings: the shared nav header — centered 16pt title (`headerTitleAlign:'center'`, RootNavigator.tsx:271-278), 36px ROUNDED-SQUARE hamburger (`radius.md`, bg `headerBtnBg`, :444-452), "Feedback" TEXT pill (:454-469). Signed-in Profile renders **both**: the nav bar's centered "Profile" *plus* the in-body editorial header ("PROFILE" eyebrow + display-size name, ProfileScreen.tsx:878-886).
- **What:** one product, two navigation architectures: two title systems (left display-40 editorial vs centered bold-16), the same drawer trigger drawn two shapes/sizes/finishes, and the same Feedback action as an icon on two tabs and a labeled pill on the rest. On signed-in Profile the families stack — "Profile" (nav) directly above "PROFILE" (eyebrow) is a redundant double title.
- **Why it matters:** this is the seam a user crosses on every tab switch — the strongest single "two kits stitched together" signal (R5 friction #2, verified at HEAD). It also undercuts the editorial identity Sky picked: the ScreenHeader docstring itself declares the intent ("Profile / Leaderboard / future screens consume it for one consistent type rhythm", ScreenHeader.tsx:8-10) — the intent exists in the system's own words and is half-executed.
- **Evidence:** `base/home__light__390__at-rest.png` vs `base/profile-signedout__light__390__at-rest.png` / `base/settings__light__390__at-rest.png` / `base/map__light__390__at-rest.png` (both themes identical) · code refs above · double-header [code-inferred, auth-gated — see PROBE-1]. R5 §top-5 #2 adopted after HEAD verification.
- **Severity: HIGH** — a systemic cohesion cost on primary surfaces; no AA cost (both header families' inks pass — arbiter A.1/A.3).

**L2-3 · The flagship Map still ships raw, occluded web chrome (web surface only).**
- **Where:** `map__{light,dark}__{375,390,430,834}__at-rest.png` — the Leaflet zoom `+/−` white rectangles sit HALF-BURIED under the app's own "5 flags nearby" status pill (top-left, both themes, all widths); the full-width Leaflet/OSM/CARTO attribution strip (with Ukraine-flag glyph and blue web links) crosses the map bottom; R5 also logged a web focus-ring on the Nearby "Close" button.
- **What:** untinted third-party web chrome inside an otherwise fully-tokenized surface — and the app's own Deep Field chrome *occludes* a functional control (zoom slivers smaller than a fingertip: R4 friction #1, R3 #4, R1, R5 #1 — four independent blinded reads).
- **Why it matters:** occlusion of a control on the hero screen is THE ENEMY in this audit's terms; the zoom control is also the only non-gesture zoom path (dexterity users). Cohesion-wise it makes the namesake screen "feel embedded, not built" (R5).
- **Honesty:** [web-approximated / web-only] — native react-native-maps renders none of this chrome by construction; the iOS build is unaffected. For the guest-web surface it is real and shipped.
- **Severity: HIGH** (scoped to web) — occlusion + material breakdown on the core-flow screen. Fix-shape: reposition/hide `.leaflet-control-zoom` under the pill's safe area, theme or suppress-and-relocate attribution per OSM terms.

### MEDIUM

**L2-4 · Home — the un-glassed flagship: the cost of the disclosed gap.**
- **Where:** HomeScreen.tsx:368 (`surfaceMuted` wash), :219 (legacy GlassSurface pill, i=20 — neither Deep Field 12/24 nor the legacy default 24), :182 (editorial header). GLASS §8 marks Home's "chrome material + ScreenStage" as planned — so this is a **disclosed staged state, not a violation**; what I judge is the cost of shipping order.
- **What/cost:** in light, Home is the one flat, pool-less, grain-less tab between two luminous ones (`home__light__390__at-rest.png` vs `tasks__light__390__at-rest.png`): the wash is neutral-gray where every sibling is cool-blue-lit; the Recent list is a single white slab with dividers where siblings float individual panes. In dark the seam narrows (both are dark) but Home lacks the pool glow and cool hairlines. Compounding, web-only: the always-dark CartoDB map peek reads as a "failed render" black hole inside light Home — the loudest first-impression defect three personas hit (R6 #1, R1, R3 #4) — and the `+ Report` pill overlaps the last Recent row's chevron at rest (R5, R4 #4; scroll inset doesn't reserve FAB space).
- **Why it matters:** Home is the landing surface; first impressions of "one premium product" are set exactly here. The seam says "the redesign ran out before the front door."
- **Evidence:** captures above; [web-approximated] for the tile clash (iOS Apple tiles follow OS → light-on-light, NEEDS-SKY-DEVICE).
- **Severity: MEDIUM** (disclosed-planned; judged here as priority pressure — Part 3 should sequence Home's §8 upgrade + FAB list-padding reserve + a light-tile or styled peek treatment for web).

**L2-5 · The modal layer wears two materials — including within one host family.**
- **Where:** bulk-glass: About (AboutScreen.tsx:51), Feedback (FeedbackModal.tsx:182). Opaque pre-glass: HelpModal, ChangelogModal, MyFeedbackModal (0 GlassSurface refs — same SharedModalsHost family as Feedback), NearbyFlagsModal, LegendModal, ReportFlagModal, AddressSearchModal (0 refs each), SavedPlaces/Preset prompts (opaque inline Modals, MapScreen.tsx:2199-2320-region), plus the W2-deferred Profile children.
- **What:** two sheet materials coexist; a user can open Feedback (frosted bulk glass) and Help (flat opaque card) from the same header button on the same screen and get two different products. W2 disclosed the *Profile* children + SignIn as a "next mini-wave"; Help/Changelog/MyFeedback and the six Map modals were never listed or de-scoped anywhere I can find.
- **Why it matters:** the overlay tier is where cohesion is cheapest to read (same geometry, same scrim) — the material split is naked there. The Report sheet — the app's single most important surface — is on the un-tiered side.
- **Evidence:** grep census at HEAD (counts above) · `base/feedback-modal__light__390__at-rest.png` vs `base/help-modal__light__390__at-rest.png` · `flows/report__light__390__open.png`.
- **Severity: MEDIUM** — real gap, partially disclosed; the undisclosed half (Map modals + Feedback's own siblings) is the finding.

**L2-6 · The light bulk sheet reads as bleed-through, not luxury, over busy backdrops.**
- **Where:** `base/about__light__390__at-rest.png` (Home's "5 barriers" headline, the dark map-peek slab, the Report pill and red badge all read through the sheet as distinct gray shapes behind body text), `base/feedback-modal__light__390__at-rest.png` (same). Material: bulk floor 0.85 + i=24 (GlassSurface.tsx:139-147) — working exactly as specified; all inks arbiter-passing on the worst-case stack (W1 §4).
- **What:** not a contrast defect — a *perception* defect. The blinded senior reviewer read it as "translucent enough that home-screen blocks ghost through the body text (reads as a rendering bug)" (R5, verified at HEAD in both captures). High-contrast rectangles (the dark map peek) survive i=24 blur as recognizable shapes on the 0.85 light floor; dark mode hides this (dark floor over dark content).
- **Why it matters:** the two glass sheets are the material's ambassador moments; if the frost reads as a bug to a senior eye, it reads as one to users. Trust-through-polish is the mission.
- **Honesty:** [web-approximated] — Chromium `backdrop-filter` is the proxy; native gaussian blur at i=24 may diffuse edges differently. **NEEDS-SKY-DEVICE** before any floor change (and any change must re-run the arbiter — GLASS §7.1).
- **Severity: MEDIUM.** Fix-shape candidates for Part 3 (device-gated): raise the light bulk floor a step, or scrim the backdrop under sheets — both re-arbitrated.

**L2-7 · The severity ramp renders in four visual grammars — and Home breaks the system's own number+word law.**
- **Where:** Home Recent rows: 11px dot + word only — no number, visually or in the SR label (`SEVERITY_LABELS` word only, HomeScreen.tsx:322-334, :477); Tasks: SeverityBadge chip "1 · Minor" (number+word, ink fork — correct); Nearby/Activity/RecentlyViewed: colored disc + white number (no word inline; meta carries "Severity N"); Legend/Report: numbered circles + word labels adjacent.
- **What:** theme.ts's own law (":527 — Each color is ALWAYS paired with a number + a word") and DESIGN.md §1 ("Always render the severity color with the number AND a word") are met fully only by Tasks. Home ships word-without-number; the disc surfaces ship number-without-adjacent-word. R6's confusion arc ("severity took much longer… Home speaks words, the list speaks numbers") is the lived cost of this fragmentation.
- **Why it matters:** severity is the product's core vocabulary; one grammar (the SeverityBadge chip) already exists, is arbiter-proven, and is the strongest of the four.
- **Evidence:** `base/home__light__390__at-rest.png`, `flows/map__light__390__nearby-modal.png`, `base/tasks__light__390__at-rest.png`, `flows/map__light__390__legend-modal.png` · code refs above · R6 §task-walk, R5 ("two grammars for the same datum" — verified, undercounted).
- **Severity: MEDIUM** (cohesion + own-law breach; no AA failure by itself — the dots are supplemented by words).

**L2-8 · Heat-legend swatches are invisible exactly where the map is hottest (concur with arbiter D-3; the disclosed 1.4.11 skip is contestable).**
- **Where:** HeatmapLegend.tsx:45, :87-91 — 10×10 borderless swatches on the 0.82 always-light surface.
- **What:** [arbiter-measured] heat1–4 boundaries 1.01 / 1.48 / 1.84 / 2.47 vs 3.0 (heat5 3.17, margin 0.17); the 1.01 worst case is the legend floating over a sev-5 red cell — the color key dissolves precisely where the layer peaks. The Map report disclosed skipping the hairline as a 1.4.11 color-sample exemption (§7). The exemption is *defensible for the fill itself* (a color sample's color is essential), but the system already ratified the 1px `#0F1B2D` hairline union for this exact problem class (cluster rings, heat badges) — the legend is the one color-bearing map element without it.
- **Tempering:** each swatch sits beside its "N Label" text and the SR label names the colors (:28, :46) — disclosure survives; the *color key* function degrades.
- **Evidence:** `assets/arbiter/audit-stacks-output.txt` legend rows · `map/map__light__390__heatmap-on.png` · code refs.
- **Severity: MEDIUM** — floats on every heatmap view; disclosed-skip noted, internal-consistency (hairline precedent) tips it into finding territory.

**L2-9 · Emoji glyphs ship in product UI — DESIGN.md §10 is explicit: "SVG icons only — no emoji."**
- **Where:** `src/lib/feedback.ts:28-33` (`FEEDBACK_CATEGORY_GLYPHS` 🐛💡❤️💬) rendered at FeedbackModal.tsx:239 (category chips) and MyFeedbackModal.tsx:259 (row glyphs); MyFeedbackModal.tsx:206/218 (🔍 / 💬 empty states); AddressSearchModal.tsx:278 (🕘 recents) and :313 (⚠️ error card); FlagDetailModal.tsx:1290 (💬 comments-empty). All a11y-hidden/decorative.
- **What:** seven emoji render sites survive the "app is now 100% Lucide/SVG" milestone (DESIGN.md §9 2026-06-03, §11 "✅ Done"). W1-6 restyled the Feedback chips to the glass chip tint but kept the glyphs inside them — the law violation now sits *on* the new material. R5: "emoji category chips break the line-icon system"; "glossy Apple emoji floating on a dark card."
- **Why it matters:** emoji render platform-differently (Apple/Google/web), clash with the 2px-stroke Lucide voice, and read as unfinished next to the app's bespoke CategoryIcon set. The design system says so itself.
- **Evidence:** `base/feedback-modal__light__390__at-rest.png`, `base/myfeedback-modal__dark__390__at-rest.png` · code refs · DESIGN.md §10.
- **Severity: MEDIUM** — an explicit standing law broken on shipped surfaces; zero AA cost (decorative, hidden from AT). Fix-shape: Lucide Bug/Lightbulb/Heart/MessageCircle/Search/Clock/AlertTriangle swaps.

### LOW

**L2-10 · The ≥500-weight-on-glass census at HEAD (the parked `bodyMedium` deferral, verified to the line).**
- On-glass text still carrying the 400 face: **Map filter panel** — `savedEmptyText` (MapScreen.tsx:1566, style :2752, 12pt `inkGlassMuted`) and `statusHint` ×4 (:1735, :1765, :1799, :1853, style :2587, 11pt `warningFg` — the 4.70:1 canary). Everything else on the panel is label-600/heading-700. This is exactly the Map report's §7 disclosed deferral — registry-parked, device-eyes pending. **Undisclosed sibling:** Tasks empty-state body `emptyBody` (TasksScreen.tsx:1221, style :2030 — `variant="body"`, 400, textMuted) sits on the row-glass empty card in the worked-example screen itself; tempering — nothing scrolls behind the empty card (static stage), so the haze rationale barely applies. **Legacy-scope note:** the locating banner's `bannerLocatingText` (:2000, 400 @13pt) rides a 0.82-floor legacy pane — the Deep-Field law doesn't formally bind legacy surfaces; listed for completeness.
- AA is unaffected everywhere ([arbiter-measured] forks all pass); this is the material-haze law only. **Severity: LOW** (disclosed core + one undisclosed low-stakes straggler).

**L2-11 · GLASS §7.4's blanket ban contradicts the system's own ratified practice.**
- §7.4: "DON'T use `textSubtle`/`textMuted`/`brand` on glass or the stage — all three measured below AA on worst-case backdrops." Yet the shipped, arbiter-declared, PASSING sets put `textMuted` on row glass (Tasks cardMeta TasksScreen.tsx:2118-2122; Settings subtitles SettingsScreen.tsx:692+118; Resources blurbs; all @≥500) and `textSubtle` chevrons on row glass as 1.4.11 graphics (Settings :133/:138; Profile :1360 +9 — disclosed W1 §4 at 4.50 dark). The ban is true for chrome/stage (2.69/4.10 measured) but over-broad as written. The trap runs the dangerous way too: a dev who copies Settings' textMuted-onto-chrome would fail AA while believing practice trumps prose. The arbiter gate (§7.1) is the real enforcement, which is why this is LOW — but the LAW file should say what the system actually does ("never on chrome/stage; row glass only with an arbiter-declared pair").
- **Evidence:** GLASS.md §7.4 vs `wave1-stacks.json`/`shipped-stacks.json` declared pairs [arbiter-measured] · code refs. **Severity: LOW** (doc-integrity in the law file).

**L2-12 · Seven dead styles carry banned inks / text-glyph icons — resurrection traps.**
- `styles.filterChevron` (`color.brand` on glass, MapScreen.tsx:2525 — arbiter footnote (i) concurs: dead), `iconText`'s `color.brand` base (:2436 — its only consumer :1358 always overrides the color), `searchClearText` (`textMuted`, TasksScreen.tsx:2224), `rowChevron` (SettingsScreen.tsx:710-714, fontSize-28 text chevron + textSubtle), `myReportsChevron` / `aboutChevron` (ProfileScreen.tsx:2476, :2566 — fontSize-28 unicode-chevron styles), `emptyCardIcon` (MapScreen.tsx:2646 — text-glyph icon slot; the JSX now renders a Lucide Search). Zero JSX references each (grep-verified at HEAD). Each is one careless refactor away from re-introducing a banned ink or a §10-violating text glyph.
- **Severity: LOW** (dead code; mechanical deletion).

**L2-13 · `ctaFill` policy stragglers: two white-on-themed-brand CTAs.**
- Map empty-filters "Reset all" button (`emptyCardBtn` bg `color.brand`, MapScreen.tsx:2665, white 14pt-bold label) and the save-name prompt's Save button (`nameBtnSave` :2843). In dark, `brand #4E89EF` + white = 3.42:1 — passing only via the 14pt-bold large-text allowance. The system's own rule says prefer the mode-independent `ctaFill` "for any white-on-blue" (DESIGN.md §1 pairing table; W2 called the same fix "fixes a latent dark-mode issue"). The List FAB's `color.brand` ink is NOT listed here — that's Sky's ratified F4 (Map report §1).
- **Severity: LOW** (AA-passing-by-size; consistency + fragility — these become breaches if any label drops below 14pt bold).

**L2-14 · Ghost "Tasks" label bleeds under the nav header on dark tablet Profile.**
- `base/profile-signedout__dark__834__at-rest.png`: a faint "Tasks" text renders just below the centered "Profile" title, above the stage (R5's dent, confirmed present at HEAD in this capture). Looks like a z-order/overflow artifact of the concurrent tab screens on web at 834. Not reproduced at phone widths.
- **Severity: LOW** [web-approximated, one size/theme] — see PROBE-2.

**L2-15 · Icon-container and close-affordance grammar splits inside the W1 family.**
- Resources icon chips = blue CIRCLES, monochrome brand icons (ResourcesScreen.tsx card header region; `base/resources__light__390__at-rest.png`) vs How-to-Help = tinted SQUIRCLES with semantic colors (red/green/blue/gold; `base/howtohelp__light__390__at-rest.png`) — sibling drawer pages, same card anatomy, different icon grammar (R5, verified). Close affordances across the modal family: X-in-circle-wash (About) vs bare X (HowToHelp/Resources) vs bordered "Close" pill (Nearby). The W1 pass unified the *material* but not the *iconographic* grammar.
- **Severity: LOW** (careful-eye; a one-file normalization each).

### POLISH

**L2-16 · SignIn is a deliberate island — and now a period piece.** The always-dark gradient splash (SignInScreen.tsx:258, web blur(24px) :304) is a documented fixed-background exception and R5's "premium moment," but its idiom — gradient CTA + glow + bespoke glass card + the app's only "← Back" text link — predates Deep Field and no longer matches the flat `ctaFill` + hairline language everywhere else. W2 already queues SignInScreen for the overlay mini-wave; judged: the exception reads *intentional*, not stale, but should adopt Deep-Field vocabulary when its wave lands. `base/signin-modal__light__390__at-rest.png` (renders identically in light — that's the point).

**L2-17 · Tablet is a stretched phone** (R5 #4: ~450pt sort pills, full-width Verify slabs — `parked/tasks__light__834__pool-bottom.png` shows both). Geometry, not material; noted for L4's ledger — the material system itself scales fine at 834.

**R3 adoption note (type at stress + data-display line):** the FlagCard meta ("1.6 km · 19 min walk · 9h ago", 12pt textMuted@500 on row glass) is AA-proven [arbiter A.1 meta-on-row] but is the quietest load-bearing line in the app — R3's standard-size complaint is taste-valid, not a breach. Her 2.0× wrecks (title "Revi…", sort pills "N…/O…/S…" — `dt/tasks__light__390__dt-zoom-2.png`) are real in the zoom proxy but overstate native behavior: AppText caps display at 1.3× / label at 1.6× on-device [web-approximated; real DT = NEEDS-SKY-DEVICE]. L4's axis; logged here because the editorial header's `numberOfLines={1}` + 0.6 shrink floor is where the editorial voice snaps first.

---

## Stage usage + the parked pool (Sky's decision — described, not decided)

- **Stage discipline at HEAD:** every stage screen mounts exactly one `ScreenStage` as first child over a `stage1` root (Tasks :803, Settings :446, Profile :804/:815, Resources :123, HowToHelp :92); grain 2.5% present on web via the SVG data-URI (visible as fine tooth in light captures); pools fall off smoothly; Map correctly mounts NO stage (§12.1). No screen over-uses material — chips/pills/search are engineered tints everywhere I read (no stray BlurView outside GlassSurface; budget mechanisms intact, Map's worst state now 4 panes per the build report). The under-use cases are exactly the disclosed ones (Home, the opaque modal layer — L2-4/L2-5).
- **The parked pool B (light, lower-right `rgba(15,83,190,0.06)`):** at 390 it is sub-perceptual — the card stack covers most of its footprint and the 0.06 alpha reads as, at most, a faint cool deepening toward the bottom corner (`parked/tasks__light__390__pool-bottom.png`). At 834 the uncovered right margin shows it slightly more, as a gentle anti-flat gradient; it never competes with content and costs nothing legible (`parked/tasks__light__834__pool-bottom.png`). Dark correctly has no pool B (`stagePoolB:'transparent'`, ThemeContext.tsx:154; `parked/tasks__dark__*` uniform). **Judgment offered:** it serves restraint (keeps the stage's lower half from going sterile) and does not distract; killing it would be imperceptible at phone widths, keeping it costs nothing. The call is Sky's taste anchor, not a finding. [web-approximated]

## The one-material read — strongest seam, named

Across all captures, light and dark: **the strongest seam is the header-family split (L2-2)** — it is the only seam that survives every planned rollout step (Home's §8 glassing would not close it), it recurs on every navigation, and it splits the app's typographic identity at the top of every screen. Second: Home's un-glassed wash (L2-4, disclosed-planned). Third: the two-material modal layer (L2-5). The material system itself — stage, tiers, inks, C-lite parity, dark luminosity — is coherent, disciplined, and worth protecting wholesale.

---

### PROTECT nominations (L2)

1. **The arbitration system itself** — floors/inks as script-proven tokens, `shipped-stacks.json` proof sets re-verifying 4× exit 0 at HEAD (260 pairs). This is the app's trust engine; no eye-tuning ever.
2. **`ctaFill` mode-independence** (`#1466E0` both themes, theme.ts:242 / ThemeContext.tsx:186) — the single best dark-mode decision in the system; extend it (L2-13), never dilute it.
3. **The C-lite / engineered twin parity** — `glassmode/tasks__light__390__clite.png` is visually indistinguishable from full blur at rest; plus the literal-`forceEngineered` budget mechanism that took Map's worst state 6→4 panes. Scaffolding done right.
4. **The severity ink fork where applied** (`severity[n].textOnColor` — SeverityBadge, Map sev pills, action-bar quick chip): the proven pattern L2-1's six sites should copy.
5. **Tasks dark mode** — luminosity-led material at its best (`tasks__dark__390__at-rest.png`); the banner's brand-navy glow + cool hairlines are the product's signature frame. Also the scheme-gated shadow discipline (light-only e1/e2 guards).
6. **The designed RT states** (GlassSurface.tsx:250-265 opaque map; banner → brandSofter+brand) and the a11y-hidden, pointer-transparent stage (ScreenStage.tsx:72-76) — decorative-only depth, enforced.
7. **How-to-Help's card rhythm on glass** (R5's "most flawless screen," now Deep Field) — the template for icon-chip grammar normalization (L2-15 should converge on IT, not on Resources).
8. **The drawer's always-dark hardcode idiom** with arbiter-forced alpha forks (footerText 0.55, labelMuted 0.48) — a disclosed exception that works in both themes.
9. **The pinned-always-light map overlay strategy** (legend/locating banner literals — AA-by-construction over any tile) — keep, pending only the swatch hairline (L2-8).
10. **The editorial ScreenHeader auto-fit** (deterministic web shrink + native backstop, ScreenHeader.tsx:28-49) — the right mechanism; extend the family rather than replace it (L2-2's fix direction).

### Copy observations (L2)

- **Raw status enum leaks on Home:** rows print `item.f.status` lowercase ("Minor · open", HomeScreen.tsx:333-334) while every pill uses `STATUS_LABELS` ("Open") — one surface speaks database, the rest speak product. (R6 read "open" as business hours.)
- **Casing drift:** drawer/screens "How To Help" vs "About the App" vs "Resources"; "What's New" (modal title) vs "What's new" (Settings row, `base/settings__light__390__at-rest.png`). One casing rule wanted.
- **Date grammar mix** in Nearby: "29d ago" vs "Jun 2, 2026" in the same list (`flows/map__light__390__nearby-modal.png`).
- **Tab badge semantics:** Tasks badge reads 2 on Home/Profile/Map but 5 on Tasks itself (all base captures) — whatever the mechanism, it reads as the same counter disagreeing with itself; R6/R2/R5 all tripped on it. (Data/copy seam — flagged for L5/L6.)
- **"1+" toolbar glyph** (min-severity quick chip) is opaque pre-Legend to every fresh reader (R6, R1, R4) — a label or tooltip-shaped fix, not a material one.
- **"Made with ♥ in Canada"** (HamburgerDrawer.tsx:233): a unicode heart inside prose — reads as voice, not iconography; no §10 action suggested. (Contrast with L2-9's UI-glyph emoji, which do want fixing.)

### PROBE-REQUESTs (L2)

1. **PROBE-1 — signed-in Profile, both themes @390:** the only way to *see* the double header (L2-2) and the RecentlyViewedRow dots (L2-1 site 5) in situ is an authed session or a lab mockup with the nav header composited. Proves: whether "Profile"/"PROFILE" stacking reads as redundant in pixels as it does in code.
2. **PROBE-2 — fresh-context `profile-signedout__dark__834` re-capture ×2:** does the ghost "Tasks" bleed (L2-14) reproduce deterministically, and does it appear at 430/other tabs? Proves: rendering artifact vs one-off capture glitch.
3. **Standing NEEDS-SKY-DEVICE (inherited, not new):** true-blur feel of the bulk sheets in light over busy content (L2-6 decision input); iOS light-tile family (pins/legend/chips — arbiter D-4 territory); RT designed states visual; real Dynamic Type at 1.3×/1.6× caps (R3's axis).


---

## L3 — The two core flows



**Lens verdict.** Can a wheelchair user (R1) and a one-handed user (R4) complete FIND and CONTRIBUTE today? **FIND: yes, on one road — the list.** The Nearby list + filters + legend form a genuinely strong barrier briefing (distance, severity-with-plain-words, status, age, search), and the empty-filters recovery is the best state in the app. But the map itself under-delivers the FIND promise: a viewport showing one pin under a pill claiming "5 flags nearby," a callout that dead-ends without a date or a detail path, and — for anyone whose location is denied or undetermined — a silent teleport to San Francisco beneath a stale count. **CONTRIBUTE: yes for the happy-path guest whose browser already granted location; no for the first-time web guest**, who is routed by the app's own Home pill into a sheet whose "Waiting for location…" never resolves, whose submit is disabled without explanation, and whose three "Sign in" escape hatches all silently just close the form. The sheet itself is the app's best-crafted surface (bottom-pinned footer, discrete severity buttons, inline definitions — R4: "that flow feels designed for me"), which makes the entry and exit failures around it sting more: the flow's first step is undiscoverable for guests on the Map (FAB auth-gated, long-press a silent no-op), and its last step confirms nothing to anyone — anonymous submitters on web get zero feedback that the app's whole point just happened. Post-submit states were never triggered (audit rail); all post-submit judgments are code-inferred and tagged.

---

### CRITICAL

**L3-1 · First-time guest CONTRIBUTE is a dead end: location never resolves, submit never enables, and nothing says why**
- **Where:** `src/screens/HomeScreen.tsx:348` (pill navigates `FullMap {openReport:true}` — no location kick) → `src/screens/MapScreen.tsx:1043-1061` (mount fetches location ONLY when permission already granted; `initialLocationAction` in `src/lib/location.ts:74-80` returns `'clear'` for undetermined/denied) → `src/screens/ReportFlagModal.tsx:462-469` ("Waiting for location…"), `:975` (`disabled={submitting || !location}`). Compounding: `src/components/OnboardingCards.tsx:243-249` — on web, tapping **"Allow Location"** is `if (Platform.OS === 'web' …) { goTo(index+1); return; }` — a pure no-op that advances the slide.
- **What:** A first-time web guest (the app's default web persona — web has no root sign-in) taps onboarding's "Allow Location" (does nothing on web), lands on Home, taps the advertised "Report" pill, and gets the sheet with "Waiting for location…" and a disabled "Report anonymously" button. Nothing in this chain ever calls `requestLocation()` or `navigator.geolocation` — only the auth-only FAB does (`MapScreen.tsx:2072`). The wait is a false promise: no request is in flight. The disabled submit carries no reason (the location line is at the top of a scrolled sheet; the button has `accessibilityState.disabled` but no hint). Recovery requires abandoning the flow and independently discovering "Use my location" (Home) or "Recenter on me" (Map toolbar icon) — nothing points there. Native guests who denied at onboarding hit the same wall (code-inferred).
- **Why it matters:** CONTRIBUTE is half the product's point, and this locks out the exact cohort the anonymous path was built for — a privacy-cautious first-timer filing their first barrier. R6 (first-time user) and R2 (blind user: "I cannot start or place a report") both stalled at entry/placement; this is the mechanism underneath. A form you can fill but never submit, with a lying status line, is the definition of a dishonest dead end.
- **Evidence:** `flows/report__light__390__open.png` + `ready-submit.png` (harness had pre-granted permission — the captured coords prove the ONLY path to an enabled submit is a prior grant); code refs above [code-inferred for the no-permission variant — see PROBE-REQUEST 3]; `a11y-tree/report__light__390.txt` (no location control in the sheet).
- **Severity:** CRITICAL (core-flow lockout + false status copy).

**L3-2 · Permission-denied/undetermined Map arrival: silent San Francisco + a "5 flags nearby" claim that isn't true**
- **Where:** `src/screens/MapScreen.tsx:123-128` (`DEFAULT_REGION` = 37.7749,-122.4194 — San Francisco), `:1043-1061` (mount 'clear' path clears the spinner but never sets `permissionDenied`), `:2004-2014` (the denied banner renders only after a manual `requestLocation()` tap, `:996-1006`), `:1277-1283` (pill: `` `${flags.length} flags nearby` `` — `flags` is the global, geo-unconstrained store fetch, `src/lib/flags.ts:607-614` / `listFlagsPage`, 500-cap, `created_at`-ordered).
- **What:** Arriving on the Map with location denied or undetermined shows a citywide San Francisco map, zero pins in frame, and a pill saying "5 flags nearby" — with **no banner, no explanation, no recovery affordance**. The well-written denied banner ("Location access is off. Turn it on in your device Settings…") exists but is unreachable on the arrival path; it only appears if the user happens to tap the icon-only "Recenter on me". The word "nearby" is a global count in every state — it just becomes an outright lie here.
- **Why it matters:** R1 (wheelchair user): "the one that would strand me… a flat lie." A denied-permission user's core question — "what's near me?" — is answered with the wrong city and a false proximity claim. The mission-critical failure mode R1 named: an empty map that's actually a broken map ends with someone at a missing curb cut. For a Canadian app ("Made with ♥ in Canada," flags in Kelowna), defaulting to SF makes the wrongness maximally visible.
- **Evidence:** `states/map__{light,dark}__{375,390,430,834}__permission-denied.png` (verified with my own read: SAN FRANCISCO label, "5 flags nearby," one occluded zoom sliver, NO banner) [web-approximated]; code refs at HEAD; R1 top-friction #1 (adopted after verification).
- **Severity:** CRITICAL (trust-breaking defect on FIND arrival).

**L3-3 · Zoom has no honest affordance: web +/− occluded by the count pill at every size; native has no zoom buttons at all**
- **Where:** Web: the Leaflet zoom control (top-left) sits beneath the status pill (`MapScreen.tsx:1266-1284` topRow overlay); verified in every map capture — at 390 the "+" is ~half-covered, leaving sub-fingertip slivers. Native: `src/components/PlatformMap.tsx:111-280` sets no zoom-control props — iOS `react-native-maps` has no zoom buttons; zoom is pinch/double-tap gestures only [code-inferred, NEEDS-SKY-DEVICE].
- **What:** On web, the only non-gesture zoom control is permanently overlapped by the "5 flags nearby" pill in both themes at all four captured widths. On iOS there is no button alternative to pinch at all (zoom-out especially has no single-pointer default).
- **Why it matters:** R4 (one-handed): "zoom has no accessible fallback… slivers smaller than a fingertip." R3 (low vision): "'+' permanently hidden behind the chip." Zoom is a core FIND operation (severity of the one-pin viewport, L3-13, is worsened when zoom-out is broken); occlusion of a control at rest is the rubric's occlusion bar. Note the recursive harm: the audit's own zoom-out capture failed, plausibly because the harness couldn't hit the occluded control (see PROBE-REQUEST 1).
- **Evidence:** `states/map__light__390__permission-denied.png`, `states/map__light__390__offline-refresh.png`, `map/map__light__390__zoomed-out-clusters.png` (occlusion visible in each; I read them directly) [web-approximated]; R4/R3 frictions (adopted after verification); native = code-read + NEEDS-SKY-DEVICE.
- **Severity:** CRITICAL (control occlusion at rest on the core surface; cross-lens with L4 — flow framing is L3's).

---

### HIGH

**L3-4 · The points flash lies when you triage an anonymous flag: "+3/+7 points" that the database never awards**
- **Where:** `supabase/schema.sql:163-165` — actor bonus requires `auth.uid() <> new.user_id`; for anonymous flags `new.user_id` IS NULL, so the comparison is SQL-NULL → never true → **no award**. `src/screens/TasksScreen.tsx:760` (`isOwn={item.user_id === userId}` → `false` for anon flags) → `:646-660` flashes `Verified! +3 points` / `Resolved! +7 points` (via `POINTS`, `src/lib/points.ts:11-18`). Reachability: any authenticated user can status-update any flag including anon ones (`schema.sql:346-359`), and anon flags are first-class (`flags.ts:874`, the whole guest CONTRIBUTE path).
- **What:** For authored flags the chain is honest (trigger 10/15/3/7 == points.ts == flash == Help FAQ — verified at HEAD). For anonymous flags, a signed-in triager is told they earned +3/+7; their points never move; nothing ever corrects the claim (the `points.ts` diff toast fires only on increases). `HelpModal.tsx:37` makes the same unconditional promise ("You also earn 3 points for verifying someone else's report").
- **Why it matters:** A false reward on the triage loop — the loop that keeps the verification economy alive — is a small, systematic dishonesty. Once a user notices their Profile total doesn't add up, every point claim (and by extension every "verified" badge the points system motivates) is suspect. This is exactly the drift the brief flagged as trust-critical, found one layer deeper than the docs.
- **Evidence:** schema.sql + TasksScreen + points.ts + HelpModal at HEAD [code-inferred; SQL three-valued logic — `is distinct from` is the correct operator and is notably used two policies down at `:351`]; post-flash state never triggered (audit rail).
- **Severity:** HIGH (trust defect; narrow trigger surface but systematic and uncorrectable by the user).

**L3-5 · Submitting a report confirms nothing: anonymous success is fully silent on web; auth success is announce-only**
- **Where:** `src/screens/ReportFlagModal.tsx:314-334` (anon path: `createAnonFlag → recordAnonSubmit → track → hapticNotify → reset → onCreated → onClose` — **no visible or audible success message**; haptic is native-only) and `:409-413` (auth path: `AccessibilityInfo.announceForAccessibility('Report filed…')` — SR-only, nothing visible). `MapScreen.tsx:2098-2112` (`onCreated` just refreshes flags — no toast/flash anywhere on the Map).
- **What:** The CONTRIBUTE flow's terminal step ends with the sheet closing. A web guest gets zero feedback of any kind; a sighted signed-in user gets nothing visible either. The user lands back on the stale Nearby list (three-layer stack, L3-9) — not even centered on their new pin. Orientation §3's "anon success alert" does not exist at HEAD.
- **Why it matters:** R6, holding the enabled button: "nothing tells me who sees it… or what happens next." The mission text names this exactly: a dishonest (here: absent) confirmation fails the people the app serves. Unconfirmed submits breed doubt-resubmits — which the 5/day anon rate limit (`src/lib/anonRateLimit.ts:4-5`) then punishes.
- **Evidence:** code-inferred (post-submit never triggered — audit rail); `screens/__tests__/ReportFlagModal.test.tsx` pins the submit path with no success-alert assertion [test-inferred]; TasksScreen's flash pattern proves the app owns a suitable confirmation idiom it doesn't use here.
- **Severity:** HIGH (silent success on the core flow's finish line).

**L3-6 · Every "Sign in" affordance inside CONTRIBUTE is a dead end — the guest→auth bridge just closes the form**
- **Where:** `src/screens/ReportFlagModal.tsx:491-499` (anon banner "Sign in": `onPress={onClose}`), `:702-710` (photo nudge "Sign in": `onPress={onClose}`), `:303-311` (native rate-limit alert "Sign In" button: `onPress: onClose`). On web, sign-in exists only as Profile's modal (App architecture; orientation §2).
- **What:** Three separate "Sign in" affordances perform "close the form." The guest is dropped onto the Map stack with no sign-in screen, no pointer to Profile, and their drafted report state gone (`reset()` is not called on close, but the sheet is). The a11y hint ("Closes this form so you can sign in") is more honest than the visible UI. Meanwhile the guest↔auth capability cliff these links are meant to bridge — FAB, photos, quick-fill templates, saved places — is never enumerated anywhere a guest can see; the anon banner and photo nudge are the only hints.
- **Why it matters:** The app asks guests to upgrade at exactly the moments they're most motivated (mid-report, at the photo step, at the rate limit) and then strands them. For R4 the recovery is a multi-regrip trek to the Profile tab; for R2 it's re-traversing a 3-layer tree. A conversion path that ends in a silent close reads as a bug and burns the goodwill the excellent anon banner earned.
- **Evidence:** code refs at HEAD; `flows/report__light__390__open.png` (both links visible); `a11y-tree/report__light__390.txt` (two identical "Sign in" links, one spliced mid-sentence — R2).
- **Severity:** HIGH (dead end on the flow's only upgrade path).

**L3-7 · Real data failures fail silently on both FIND surfaces — the designed recovery states never fired in any captured failure**
- **Where:** Home: `src/screens/HomeScreen.tsx:283-297` has a proper "Couldn't load reports." + Try again card — but all 8 real-failure captures show an em-dash headline + endless skeletons instead (the store never settled into `error` during the capture window). Map: `MapScreen.tsx:1901-1927` has an exemplary tap-to-retry error banner — but all 8 offline-refresh captures show the pill stuck on "Loading flags…" with no banner, no offline notice, no last-updated stamp. Store: `src/lib/flagsStore.tsx:230-326` (error IS set on a settled no-cache failure, `:319` — something upstream of settle keeps these modes in `loading`). Guests compound it: the offline cache is written only for signed-in users (`flagsStore.tsx:293-296`), so a guest offline has nothing to fall back to and the `isOfflineCache` banners (`HomeScreen.tsx:272-279`, `MapScreen.tsx:1422-1434`) can never show. Same family: locate failures surface via `Alert.alert` (`MapScreen.tsx:1032`) — a no-op on web, so a 15s GPS timeout (`location.ts:44-59`) ends in silence.
- **What:** In the two most common real-world failure modes (server unreachable at launch; connection lost then refresh), both core FIND surfaces present indefinite in-progress states that are indistinguishable from "still working." No error, no retry, no timestamp, no offline signal.
- **Why it matters:** R1's #2/#5 frictions, verified: "a data outage is indistinguishable from 'no barriers here'… I'd wait on dead data without knowing it." Mid-trip, for someone who cannot improvise around a curb, a silent stall converts to a wrong-confidence decision. The tragedy is the recovery UI is already built and good — it just doesn't fire when it matters.
- **Evidence:** `states/home__{light,dark}__{375,390,430,834}__load-error.png` + `states/map__{light,dark}__{375,390,430,834}__offline-refresh.png` (16 independent page loads, all stuck pre-error — I verified two directly) [web-approximated]; flagsStore/HomeScreen/MapScreen code at HEAD [code-read; settle mechanism unresolved read-only — see PROBE-REQUEST 2].
- **Severity:** HIGH (silent failure across FIND's failure envelope; systemic, not cosmetic).

**L3-8 · The accessible list opens with a false claim to its own audience: "Sorted by distance" when it isn't**
- **Where:** `src/screens/NearbyFlagsModal.tsx:61-75` — the open announcement is unconditionally `` `${count} flags nearby. Sorted by distance.` ``; `:77-88` sorts by distance **only when `location` exists**, else keeps recency order; `:198-204` shows an honest visible notice ("Allow location access to sort flags by distance. Showing the most recent first.") that the announcement contradicts.
- **What:** The SR auto-open (`MapScreen.tsx:351-357`) exists precisely for blind users — and when their location is unknown (denied, or simply not yet resolved at announce-time +600ms), it tells them the first row is the closest barrier when it's actually just the newest. Rows omit distances in that state, but the ordering claim has already landed.
- **Why it matters:** R2 relies on that opening announcement as the list's contract ("the best thing in the app"). A wheelchair-using SR user planning by proximity acts on row #1. The one flow the app gets structurally right for blind users opens with a falsehood in its most degraded state.
- **Evidence:** code at HEAD; `a11y-tree/map-first-arrival__light__390.txt` (list present; announcement string is code-read since trees don't capture live announcements) [code-inferred]; visible-notice honesty verified in `flows/map__light__390__nearby-modal.png` family.
- **Severity:** HIGH (SR-truth defect on the designated accessible path).

**L3-9 · Web arrival is a chain of broken promises: "Open the Map" → Home; "Open full map" → a full-screen list; the map is never seen**
- **Where:** Onboarding CTA "Open the Map" → `onDone` → Home (`App.tsx:145`, `initialRouteName "Home"`). Home "Open full map" (`HomeScreen.tsx:258-269`) → MapScreen, where the SR auto-open (`MapScreen.tsx:351-357`) fires for **every** web user (probed fact, orientation §7 #15: RN-web resolves `isScreenReaderEnabled` true) → full-screen NearbyFlagsModal (`presentationStyle="pageSheet"` renders edge-to-edge at phone widths). On the guest report path the sheet then stacks as layer 3; Cancel lands on the stale list, not the map (`MapScreen.tsx:2104-2110` closes only the sheet).
- **What:** A sighted web user is promised the map twice and delivered (1) a home page, then (2) a list modal that completely covers the map they asked for. After a report attempt, closing the sheet returns them to the middle layer — a "Nearby flags" list they never opened — and only a second Close reaches the map. Judged in both directions per the brief: for real SR users this auto-list is genuinely the right default (R2: rescues FIND completely); the defect is that web serves the SR branch to everyone and the visual promise never adjusts.
- **Why it matters:** R6's "small whiplash," R1's confusion, and R5's craft critique all trace here. First-session trust is set at arrival; delivering a modal instead of the namesake surface reads as malfunction. The stacking also multiplies R2's traversal cost (~60 nodes above the form) and R4's close-button reaches.
- **Evidence:** `base/map__light__390__first-arrival-auto-list.png` (list fully covers map — verified directly), `flows/report__light__390__open.png` (three layers visible), `tools/probe-sr.mjs` result (orientation §7 #15) [web-approximated — native behavior follows real VoiceOver state, NEEDS-SKY-DEVICE].
- **Severity:** HIGH (entry-promise failure on the flagship flow, web cohort = 100%).

**L3-10 · The app's location personality is incoherent: Home refuses a granted location while Tasks demands one uninvited**
- **Where:** Home (web): `HomeScreen.tsx:110-117` — the probe mounts only after "Use my location" (`probeEnabled = Platform.OS !== 'web' || askedForLocation`), so even a granted location is ignored; the map peek falls back to San Francisco (`:58-63`, `:120-122`) with no "default area" caption. Tasks: `TasksScreen.tsx:307` calls `useUserLocation()` with defaults → `location.ts:100,125-151,159-161` — on web this fires `navigator.geolocation.getCurrentPosition` (browser prompt) on tab mount; on native it fires the OS prompt.
- **What:** One tab treats location as sacred opt-in (to the point of showing a wrong-city peek and a "LATEST" list to a user who already granted); the next tab over fires an unsolicited permission prompt just for switching to it, then displays real distances. After granting via Tasks, Home still plays dumb until its own button is tapped — the app demonstrably knows where you are on one screen and claims not to on another.
- **Why it matters:** For a disability app, location is THE sensitive signal (the fence comment in HomeScreen itself says "never prompt on mount/focus" — Tasks violates the house rule). Users calibrate trust from consistency; R6 nearly bailed at the onboarding location slide, and this inconsistency is the same anxiety replayed inside the app. The SF peek also manufactures R6's "the map failed to load" first impression.
- **Evidence:** code refs at HEAD; `base/home__light__390__at-rest.png` (SF peek + "Use my location" while harness permission was granted — verified directly) [web-approximated]; orientation §8.4/§8.8 (confirmed, mechanisms located).
- **Severity:** HIGH (flow-trust defect + uninvited permission prompt on a privacy-sensitive signal).

**L3-11 · The report's core datum — WHERE — is a read-only mono coordinate no one can verify or fix**
- **Where:** `ReportFlagModal.tsx:462-469`: `at 49.88740, -119.49250` (mono, muted) or "Waiting for location…". No reverse-geocoded name, no mini-map, no "adjust" affordance, no address entry — `AddressSearchModal` exists in the codebase (`components/AddressSearchModal.tsx`, wired to Home and Map search) but not to the sheet. The only placement control is long-press drop-pin — auth-only (`MapScreen.tsx:1216-1218`) and hidden.
- **What:** Every reporter (and especially every anonymous reporter, who has no other tool) must trust that an unreadable coordinate pair is the right corner. R2 (blind): "I would be submitting a report whose… location I cannot confirm." R6: "no address, no mini-map to confirm I'm pinning the right corner." GPS drift of 20–50 m puts a flag on the wrong intersection — and wrong-place flags are exactly the junk that erodes the verify economy.
- **Why it matters:** Mis-placed barriers send wheelchair users to detour around the wrong corner; the mission's trust chain starts at placement accuracy. The sheet teaches severity beautifully and location not at all.
- **Evidence:** `flows/report__light__390__open.png` / `ready-submit.png` (verified directly); `a11y-tree/report__light__390.txt` ("text: at 49.88740, -119.49250" with no control); code at HEAD.
- **Severity:** HIGH (accuracy + confirmability gap on the flow's defining input).

**L3-12 · The pin callout is a cul-de-sac that even promises more: no date, no next step, and "Open for details" opens nothing further**
- **Where:** `src/components/PlatformMap.web.tsx:371` (marker `alt` ends "…Open for details."), `:377-409` (popup = category, "Severity N · status [· Anonymous]", photo if any, description — **no created-at, no action**). The rich trust surface exists — `FlagDetailModal` (reporter, "Reported on <date>", photo gallery, verify/resolve, reopen) — but is reachable only from Tasks (`TasksScreen.tsx:1105-1135`, card Details), never from the map.
- **What:** The FIND decision step ends at a static bubble. A user deciding whether to reroute cannot see how old the report is (the Nearby list shows "29d ago"; the callout doesn't), can't open details, can't verify from here, and gets no detour context. The SR label literally promises details that don't come.
- **Why it matters:** R1's cul-de-sac friction, verified: "severity 4, verified, 'wheelchair users have to detour' — and then nothing." Freshness is material to trust (a year-old "verified" blocked path may be long cleared); the app HAS the answer one modal away and won't hand it to map users.
- **Evidence:** `flows/map__{light,dark}__390__pin-callout.png`; PlatformMap.web.tsx + FlagDetailModal at HEAD; R1/R6 reads (adopted after verification).
- **Severity:** HIGH (materially impairs the FIND decision; dishonest SR promise).

---

### MEDIUM

**L3-13 · The viewport under-reports: one pin on screen under a "5 flags nearby" pill, with no off-screen cue and no fit-to-flags**
- **Where:** `MapScreen.tsx:1024-1029` (locate centers at delta 0.01 — ~1 km window; the other four flags sit 1.5–1.6 km out), `:1277-1283` (pill counts the whole store). No edge indicators, no "4 more off-screen," no bounds-fit on load.
- **What:** The count says five; the picture shows one. The zoomed-out-clusters capture is IDENTICAL to at-rest (the zoom never executed — likely blocked by the occluded control, L3-3), so cluster behavior at city zoom is **unverified evidence**, not a confirmed defect — R1's "no clustering" claim is NOT adopted (`__tests__/MapClustering.test.tsx` suggests the logic works [test-inferred]).
- **Why it matters:** R1 plans from the picture: "the visual picture I'd actually navigate by hides four barriers." A count/picture mismatch on the primary surface quietly teaches users the map can't be trusted.
- **Evidence:** `map/map__light__390__zoomed-out-clusters.png` vs `states/map__light__390__offline-refresh.png` (byte-different, visually identical viewport — verified directly); code at HEAD; PROBE-REQUEST 1.
- **Severity:** MEDIUM (real gap; count wording escalated separately in L3-2).

**L3-14 · The sheet opens pre-decided: "No ramp, severity 3" is selected — with an asserting checkmark — before the user chooses anything**
- **Where:** `ReportFlagModal.tsx:86-87` (`useState<FlagCategory>('no_ramp')`, `useState<FlagSeverity>(3)`), `:620-629` (the ✓ renders on the pre-selected severity), submit enabled the moment location resolves (`:975`).
- **What:** A guest can file "No ramp · severity 3 · no description" with a single tap at open. The ✓ visually asserts a choice the user never made; on web, SR users can't even perceive the preselection (`accessibilityState.selected` on a button role doesn't surface in the web tree — R2's finding, native truth differs [NEEDS-SKY-DEVICE]).
- **Why it matters:** R6: "I could submit without actually deciding anything." One-tap junk reports feed the exact garbage ("BUMBAKLOT" verified at severity 5) that torpedoed both blinded readers' trust in the verify system. Requiring two deliberate taps (or opening unselected) is cheap insurance for data quality.
- **Evidence:** `flows/report__light__390__open.png` (verified directly: blue "No ramp," orange ✓3); `a11y-tree/report__light__390.txt`; R6/R2 reads.
- **Severity:** MEDIUM (data-trust hazard on CONTRIBUTE's first step).

**L3-15 · The Tasks badge has two writers and three meanings: 2 before you visit, 5 after, and it can silently count resolved flags**
- **Where:** `src/navigation/RootNavigator.tsx:219-221` (`openCount` — status 'open' only → "2") vs `src/screens/TasksScreen.tsx:614-619` (`navigation.setOptions({ tabBarBadge: flags.length })` — open+verified → "5", overriding the static option after first Tasks mount and persisting). Third meaning: the store's statuses are driven by the MAP's filter (`MapScreen.tsx:562-564`), so enabling "Resolved" there inflates `flags.length` with non-actionable rows while Tasks' own sections still filter to open/verified (`TasksScreen.tsx:273-277`).
- **What:** The same badge changes definition mid-session with no data change. R6: "the tab badge says 5 but the list says OPEN 2 — numbers don't match." R2 caught it across trees ("2 Tasks" everywhere, "5 Tasks" on Tasks).
- **Why it matters:** The badge is the triage loop's front-door number; instability teaches users to ignore it — and ignored triage nudges starve the verification economy.
- **Evidence:** code at HEAD (dual writer confirmed); `base/home__light__390__at-rest.png` (badge 2) vs Tasks captures (badge 5); R6/R2 independent corroboration.
- **Severity:** MEDIUM (numeric trust wobble; self-corrects visually inside Tasks).

**L3-16 · A shared flag link to a deleted/unknown flag dies silently**
- **Where:** `MapScreen.tsx:1099-1134+` — the deep-link effect "gracefully no-ops" on bad/unknown id and network failure: the user gets the default map, no message.
- **What:** `accessmap://flag/{id}` is the app's share/trust loop (the working path is well-built: fetch, animate, callout retry, param reset). But a link to a since-rejected or deleted flag renders as… nothing. The recipient can't distinguish "flag is gone" from "app is broken" from "link was wrong."
- **Why it matters:** Share links are how barrier knowledge travels between disabled users; a silent no-op at the receiving end quietly kills the loop. One line of state ("That report is no longer available") preserves trust even in failure.
- **Evidence:** code-inferred (deep link never fired against a bad id — audit rail); `screens/__tests__/MapScreen.deeplink.test` exists for the happy path [test-inferred].
- **Severity:** MEDIUM (silent dead end, secondary path).

**L3-17 · Onboarding's location slide structures consent as a toll: forward = "Allow Location" only**
- **Where:** `components/OnboardingCards.tsx` slide 3 — primary CTA "Allow Location"; the only outs are small top-right "Skip" (which skips the ENTIRE tutorial) and "Back". No "Not now / continue without" secondary, unlike the notifications slide's "Maybe later" (`:216` `showMaybeLater` is notifications-only).
- **What:** A user who wants the rest of the tour but not location must either grant, abandon the tutorial, or go backwards. R6: "consent is the toll to continue… I nearly bailed rather than tap Allow." (The privacy copy itself is excellent.)
- **Why it matters:** First-contact consent tone sets the trust baseline for a disability app; the notifications slide already models the right pattern one swipe later. Also note asymmetric stakes: the "denied" cohort this slide creates then inherits L3-1/L3-2's dead ends.
- **Evidence:** `flows/onboarding__light__390__slide3-location.png` (verified directly: Skip top-right, Back, Allow — no Not-now); code at HEAD.
- **Severity:** MEDIUM (onboarding edge of the flows; compounds two CRITICALs).

**L3-18 · Turning on the heat map can visibly do nothing, and nothing says "no zones here"**
- **Where:** `MapScreen.tsx:2020-2032` (disclaimer explains the ≥3-flags rule) + HeatmapLegend (`:2040`); with the current data no cell qualifies, so the toggle yields zero canvas change — legend + disclaimer appear, map doesn't.
- **What:** The rule is disclosed but the outcome isn't: R1 (both themes): "nothing on the map actually changed, so I can't tell if the layer is on, empty, or broken." An "on but empty here" state needs one line ("No heat zones in this area yet").
- **Why it matters:** The heat map is a trust/coverage feature; a toggle with no visible consequence reads as broken and spends the honesty the disclaimer earned.
- **Evidence:** `map/map__{light,dark}__390__heatmap-on.png`; R1 read (adopted after code check of the k-floor).
- **Severity:** MEDIUM (feedback gap on a secondary FIND layer).

**L3-19 · On the Map, the tab bar disowns you: no tab is selected, and "Home" is where the Map hides**
- **Where:** `RootNavigator.tsx:346-352` — FullMap is a hidden tab route (`tabBarButton: () => null`), so no tab renders selected while on Map/report surfaces; header says "Map" while the route tree hangs off the Home tab (R2: "tab 'Home' lands me on a screen whose heading is 'Map'"). Return path is tab-bar-only (headerLeft is the drawer menu, not back).
- **What:** During FIND's deepest step, the app's primary "you are here" system goes blank — visually (no active tab in any map capture) and semantically (no `[selected]` in any map tree).
- **Why it matters:** Cross-screen handoffs (Tasks card → Map focus, Home → Map) land users in a place the navigation refuses to name; R2 flat-out: "I cannot tell where I am."
- **Evidence:** `states/map__*__permission-denied.png` (no active tab — verified directly); `a11y-tree/map__light__390.txt`; code at HEAD. Cross-lens with L2 (SR semantics); the wayfinding cost is L3's.
- **Severity:** MEDIUM (orientation gap on a core surface; the handoffs themselves work well).

---

### LOW

**L3-20 · Home rows drop `status` from SR labels exactly when they gain a distance** — `HomeScreen.tsx:320-324`: with distance the label is "category, severity, X away" (no status); without, "category, severity, status". Verified/open is a trust datum R1 uses per row. [code-read]
**L3-21 · Nearby-list SR labels omit the report's age** — `NearbyFlagsModal.tsx:125-129` includes category/severity/distance/status/description; the visible meta's `relativeTime` (`:167`) is not spoken. Freshness again. [code-read]
**L3-22 · Points documentation is self-contradictory at HEAD** — `~/AccessMap/CLAUDE.md` "Database" section still teaches the original 5/2/10/5 while its "Recent QA pass" section and the live trigger say 10/3/15/7; `schema.sql:112` carries an unresolved "DECISION PENDING (Sky)". The UI is currently right (POINTS single-source), but the law-file drift invites a future regression of L3-4's honesty chain. [code-read; known open item, confirmed still present]
**L3-23 · The −20 spam penalty is invisible to the penalized** — `schema.sql:141-153` deducts 20 points on admin reject; `points.ts` surfaces only increases ("You earned +N…"), so a reporter's total silently drops with no explanation anywhere in-app. Defensible (no shaming), but an unexplained falling number reads as a bug. [code-inferred; admin path unreachable in audit]
**L3-24 · Home's Report pill sits on the last list row at rest** — verified at 390 (chevron half-covered) and per R4 at 375; scroll padding (`HomeScreen.tsx:178`) clears it only after scrolling. Mis-tap risk for R4 aiming at the row. Cross-lens (L1 owns overlap taxonomy); flow cost noted here. [web-approximated]
**L3-25 · Chip rails truncate mid-word as their only scroll affordance** — report sheet category rail shows an "M…" sliver (`flows/report__light__390__open.png`); the filter panel's STATUS row cuts mid-chip (R1, both themes). Works, but "looks broken" (R1) at the exact moments of category/status choice. Cross-lens with L5. [web-approximated]
**L3-26 · The anon rate limit surfaces only at submit** — `ReportFlagModal.tsx:289-313`: a 6th-report guest fills the whole form before learning they're capped ("You've reported 5 barriers today…"). A banner at open (the check is a cheap local read, `anonRateLimit.ts:26-35`) would save the wasted effort. [code-inferred]

---

### POLISH

**L3-27 · Title and submit button are the same words** — "Report anonymously" is both the sheet's h1 and its primary button (`ReportFlagModal.tsx:460,995`); at 2.0× DT the two blur into each other (R3's overflow finding). A verb-forward button ("Submit report") would also fix the R3 pill-overflow ambiguity.
**L3-28 · Mixed time grammars in one list** — "29d ago" and "Jun 2, 2026" side-by-side in the Nearby list (`base/map__light__390__first-arrival-auto-list.png`; `relativeTime` cutover). One grammar per list.

---

### PROTECT nominations (L3)

1. **The empty-filters recovery card** (`MapScreen.tsx:1929-1975`; `states/map__*__empty-filters.png`) — "0 of 5 shown" honesty + per-axis one-tap fixes ("All categories / Any severity / Reset all"). R1: "the app's best moment… how every failure state here should behave." The template L3-7 should be held to.
2. **The Nearby list's card grammar** (`NearbyFlagsModal.tsx:125-129,166-168`) — one-breath announcements (category, severity, distance, status, description), visible severity-number + word + age meta, live search, category chips with counts, and the honest no-location notice (`:198-204`). R2: "the best thing in the app." (Fix only the opening announcement, L3-8.)
3. **The report sheet's motor-accessibility shape** (`ReportFlagModal.tsx:962-997` sticky bottom footer; `:589-644` five discrete 44pt severity buttons, no slider; `:646-657` live inline severity definitions) — R4: "that flow feels designed for me"; R3: "best-looking screen in the app for me." Do not let any redesign move the footer or replace the buttons.
4. **The anonymity honesty set** — the anon banner as a true `alert` ("Reporting anonymously — your identity is not stored," `:477-500`), the photo-privacy line ("Location is removed from your photos automatically," `:849-858`), and the truthful post-strip announcement gated on the actual strip succeeding (`:404-413`). This is the app's privacy voice at its best.
5. **Conflict-safe triage** — CAS on the displayed status + `FlagStatusConflictError` → "This flag changed… refreshing the list" (`TasksScreen.tsx:686-701`; `flags.ts` updateFlagStatus). Silent concurrent-overwrite protection with honest recovery; invisible and load-bearing.
6. **`POINTS` as single source of truth** (`src/lib/points.ts:11-18` → Tasks flash + Help FAQ) — the pattern that keeps UI point-claims honest. L3-4 is a trigger-side exception, not a reason to fork the constant.
7. **`getCurrentPositionWithTimeout`** (`location.ts:44-59`) + the `82e738b` mount fix (`initialLocationAction`, `MapScreen.tsx:1043-1061`) — the anti-infinite-spinner spine. The locating banner cleared on mount is why the Map is usable at all without location.
8. **AddressSearchModal's failure grammar** (`components/AddressSearchModal.tsx:60-70`) — distinct retryable-error card vs "No matches" empty state, debounced + aborted requests, recents. Quietly the best-behaved failure surface in either flow.
9. **The Map's tap-to-retry loadError banner** (`MapScreen.tsx:1901-1927`) and the store's error announcements (`flagsStore.tsx:415-419`) — where they fire, they're exemplary; L3-7 is about making them fire.

### Copy observations (L3)

- **One thing, four names:** barriers (onboarding/Home) → flags (Map pill, "Nearby flags," filter panel) → reports (Home subtitle, Tasks subtitle) → tasks (tab). Each rename re-taxes R6's tired user. Pick "barrier" for people, keep "flag" as the verb ("flag a barrier").
- **"Nearby" is doing unpaid work:** `N flags nearby` (Map pill), "N flags nearby. Sorted by distance." (list announcement) are global-count/global-order claims. Say what's true: "N reports loaded" / "Showing most recent first."
- **"Open" reads as open-for-business** on first contact (R6); the legend defines it but hides behind an unlabeled "?" — first-contact surfaces never teach the status words.
- **The denied banner points the wrong way:** "Turn it on in your device Settings **to report barriers near you**" (`MapScreen.tsx:2011`) frames location as report-only while the user's blocked job is FINDING; "device Settings" is also wrong on web (it's the browser's site permission), and there's no link either way.
- **"Never tracked or stored on our servers"** (onboarding slide 3) sits one sentence from "place your reports accurately" — but every report permanently stores precise, publicly-readable coordinates. The claim is about ambient location and is true; the adjacency invites a false generalization a privacy-hurt user will remember. Suggest: "Your reports store only the pin you place."
- **The map has two names before you reach it:** "Open the Map" (onboarding, lands on Home) then "Open full map" (Home). One promise, kept once.
- **Rate-limit copy has two sources:** `anonRateLimit.ts:31-33` ("You've reached the limit of 5 anonymous reports…") is thrown but always re-skinned by the modal ("You've reported 5 barriers today — thanks for contributing!"). Fine today; a future caller of the lib string will ship the colder voice.
- **The disabled FAB explains itself only to screen readers** (`MapScreen.tsx:2078-2084` hint: "Dimmed until location is on. Use the recenter button…") — genuinely good copy that sighted users never see.
- **Callout severity speaks numbers only** ("Severity 4 · verified") while Home speaks words ("Significant · verified") and the sheet teaches both — the decoder lives everywhere except where map users decide.

### PROBE-REQUESTs

1. **PROBE-REQUEST: map / true zoomed-out clusters** — screen: FullMap; state: city-level zoom with all 5 flags in bounds (drive zoom via `map.setZoom()`/keyboard, not the occluded control); sizes: 390; themes: both. Proves whether supercluster bubbles + counts actually render (adjudicates R1's "no clustering" claim, currently an evidence gap — the shipped `zoomed-out-clusters.png` shows the at-rest viewport).
2. **PROBE-REQUEST: failure-settle timing** — screens: Home (Supabase blocked from cold start) and FullMap (offline → Refresh flags); capture at t≈5s, 30s, 60s; sizes: 390; themes: light. Proves whether the designed error card (`HomeScreen.tsx:283`) / loadError banner (`MapScreen.tsx:1901`) EVER fire in these modes, or the stall is truly indefinite (pins L3-7's mechanism).
3. **PROBE-REQUEST: guest no-permission report sheet** — fresh context WITHOUT geolocation grant; Home → "Report" pill; capture the sheet at open and again after 20s; sizes: 390; themes: both. Proves "Waiting for location…" never resolves and the submit stays disabled (turns L3-1's core from code-inferred to captured).
4. **NEEDS-SKY-DEVICE bundle** — (a) VoiceOver announcement of `accessibilityState.selected` on the sheet's category/severity buttons (is R2's no-selected-state web-only?); (b) native disabled-FAB discoverability + its hint; (c) onboarding "Allow Location" → OS deny → Map arrival (does the SF fallback + silent state reproduce on device?); (d) iOS zoom with no buttons: single-pointer zoom-out alternative, VoiceOver map gesture story.


---

## L4 — Motion



**Lens verdict.** AccessMap's app-authored motion is genuinely whisper-grade and unusually well-governed: every `Animated` system in `src/` (press scale, sheen, skeleton pulse, flash pills, drawer, onboarding pager, tier fill) is gated on `useReducedMotion()`, all 32 Modal presentations flip to `animationType="none"` under RM, tab switches carry no animation at all, there is no reanimated/lottie/moti, no `LayoutAnimation` in app code, no CSS keyframes in `src/`, no auto-advancing carousel, and the glass primitives (`GlassSurface`, `ScreenStage`) contain zero motion — at rest the app is perfectly still, exactly as GLASS.md §6 demands. The failure is concentrated in ONE place, and it is the worst possible place for this mission: the **map camera on web**. The reduce-motion gate on every web camera fly is inverted by a Leaflet API semantic (`duration: 0` is falsy → default multi-second flight), cluster expansion ignores RM on **both** platforms, and the iOS clustering library fires an un-gated global spring `LayoutAnimation` on every pan. The app's highest-amplitude, most vestibularly hostile motion class — zoom-flying a map — is precisely the class that escaped the otherwise exemplary gating discipline, and zero tests guard any of it. Whisper everywhere, except the one room where it shouts at the people the app is for.

Evidence basis: full-source sweep of every animation system at HEAD `82e738b` (all line refs re-located at HEAD), installed-library source reads (`leaflet@1.9.4`, `react-native-map-clustering`, `react-native-maps`, `@react-navigation/bottom-tabs@7`), rm/ capture group (`rm/*__rm-*.png` — end-state parity stills), render index rm rows (371–378, 482–483), rollout report `qa-reports/2026-07-04_Glass_Rollout_Map.md` §9.3. Stills cannot photograph motion; where behavior is dynamics-only it is tagged code-inferred / NEEDS-SKY-DEVICE.

### THE MOTION INVENTORY TABLE

| # | What | File:line | Trigger | Duration/curve (tokens or literals?) | Native driver? | RM-gated? | Glass-law compliant? | Whisper or noise verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | Button press-scale (0.97) | `src/components/ui/Button.tsx:69–90,131` | press-in/out on any Button | `motion.spring.press` / `pressOut` (tokens) | Yes (transform) | Yes — early return | Yes (no motion on glass itself) | Whisper — exemplary |
| 2 | PressableScale press-scale | `src/components/ui/PressableScale.tsx:53–78` | press on custom controls (triage buttons, FAB, chips) | `motion.spring.press` / `pressOut` (tokens) | Yes (transform) | Yes — springs skipped | Yes | Whisper — exemplary |
| 3 | FlagCard press sheen (top light-wash) | `src/screens/TasksScreen.tsx:1459–1481, 1594–1595, 1626–1639` | press-in/out on Tasks cards (full-glass mode only) | `motion.duration.fast` 120ms (token) | Yes (opacity) | Yes — **unmounted** under RM (also RT + C-lite): `sheenActive` :1465 | Yes — GLASS.md §6 sheen gate verified in code | Whisper — exemplary |
| 4 | Skeleton loading pulse | `src/components/ui/Skeleton.tsx:37–53` | list loading (Tasks/Leaderboard etc.) | 700ms + 700ms opacity loop (**literals**) | Yes (opacity) | Yes — static at 0.5 opacity | Yes — GLASS.md §6 skeleton gate verified in code | Whisper (literal duration noted, L4-10) |
| 5 | Tasks in-screen flash pill (+points / notices) | `src/screens/TasksScreen.tsx:448–462, 1058–1077` | triage action, glass-mode flip | `motion.spring.sheet` (token); −10px translate + fade | Yes | Yes — `setValue(1)` snap | Yes (floats over chrome, no blur motion) | Whisper |
| 6 | FlashBanner app-level toast | `src/components/FlashBanner.tsx:45–110, 123` | reporter points toast (App.tsx) | in: `motion.spring.sheet`; out: `motion.duration.base` 180 + `easing.accelerate` (all tokens) | Yes | Yes — snap both directions; SR announce fires regardless | Yes | Whisper — exemplary |
| 7 | Profile tier-progress fill | `src/screens/ProfileScreen.tsx:782–800, 1017–1030` | Profile mount / points change (auth-only) | **600ms literal** timing | **No** (width interpolation) | Yes — `setValue` snap | n/a | Whisper visually; token + JS-thread concerns (L4-07) |
| 8 | Hamburger drawer slide + scrim fade | `src/components/HamburgerDrawer.tsx:67–103, 141–152` | menu open/close | in: `motion.spring.drawer`; out: `duration.base` 180; scrim: `duration.fast` 120 (tokens) | Yes | Yes — snap; Modal is always `animationType="none"` | Yes (deliberate non-glass surface) | Whisper |
| 9 | Onboarding pager (first-launch, 5 slides) | `src/components/OnboardingCards.tsx:184–191, 299–306` | Next/Back/swipe — **no auto-advance** | platform `scrollTo` paging | n/a (ScrollView) | Yes — `animated: !reduceMotion` | n/a (pre-Deep-Field surface) | Whisper |
| 10 | Onboarding dot pills (8→22pt width) | `src/components/OnboardingCards.tsx:156–175, 373–387` | active-slide change | spring `speed:18, bounciness:3` (**literals**) | **No** (width) | Yes — `setValue` snap | n/a | Whisper (literals + JS driver, L4-08) |
| 11 | Onboarding Modal fade-in | `src/components/OnboardingCards.tsx:263` | first launch | platform fade | platform | Yes — `'none'` under RM (own listener, L4-09) | n/a | Whisper |
| 12 | Replay-tutorial pager (3 cards) | `src/screens/OnboardingModal.tsx:63, 79, 85, 112, 148` | Settings → Replay tutorial | platform paging + Modal slide | n/a | Yes — both `scrollTo` and `animationType` gated | n/a | Whisper |
| 13 | Modal/Sheet presentation family (32 call sites: `ui/Sheet.tsx:110`, ReportFlagModal:434, all drawer/Profile/Map sub-modals, PhotoGallery + Lightbox fades) | grep-verified across `src/` — every `animationType` site | every sheet/modal open/close | platform slide/fade (~300ms platform-managed) | platform | Yes — **all 32** ternary-gated `reducedMotion ? 'none' : …`; capture `rm/report__{light,dark}__390__rm-open.png` shows end-state parity | Yes | Whisper — systematic |
| 14 | Map camera `animateTo` — NATIVE impl (7 triggers: recenter `MapScreen.tsx:1024`, Tasks-card focus :1070, deep link :1145, saved-place chip :1457, address search :2125, saved-places jump :2154, nearby select :2171; prop threaded :1253) | `src/components/PlatformMap.tsx:88–108` | explicit user focus actions | 600ms literal (RM → 0) | native map engine | Yes — `animateToRegion(…, reducedMotion ? 0 : 600)`; RNM Android guards `duration <= 0` → `moveCamera` (instant, no crash — `MapView.java:938–945`); iOS instant | §12 n/a (camera ≠ glass) | Whisper under RM; 600ms literal noted. NEEDS-SKY-DEVICE for feel |
| 15 | Map camera `animateTo` — WEB impl | `src/components/PlatformMap.web.tsx:619–634` (flyTo :624, duration :626) | same 7 triggers | `flyTo` 0.6s literal; RM → `{duration: 0}` | n/a (Leaflet DOM) | **BROKEN-INVERTED** — Leaflet treats `duration: 0` as falsy → default distance-based flight `1000*S*0.8` ms (`leaflet-src.js:3522`) | n/a | **Noise for RM users** (L4-01) |
| 16 | Web cluster-expansion fly | `src/components/PlatformMap.web.tsx:340–346` (flyTo :345) | cluster bubble click (core map drill-down) | `flyTo` **0.4s literal** | n/a | **NO** — `ClusteredMarkers` (:252–266, :687–693) receives no `reducedMotion` prop | n/a | **Noise** (L4-02) |
| 17 | Native cluster-expansion fit | library: `react-native-map-clustering/lib/ClusteredMapView.js:157–174` (`fitToCoordinates` :171), consumed at `PlatformMap.tsx:134` (`onPress={onPress}`) | cluster tap (native) | platform default animated camera fit (~500ms) | native map engine | **NO** — library default; `preserveClusterPressBehavior` not set | n/a | **Noise** (L4-02) — NEEDS-SKY-DEVICE |
| 18 | iOS cluster split/merge spring | library: `ClusteredMapView.js:41–42, 139–141` — `LayoutAnimation.configureNext(LayoutAnimation.Presets.spring)`; app passes no `animationEnabled={false}` (`PlatformMap.tsx:111–169`) | **every** pan/zoom end on the Map (iOS only) | `Presets.spring` ~700ms, global layout pass | LayoutAnimation (native) | **NO** | n/a | **Noise** (L4-03) — NEEDS-SKY-DEVICE |
| 19 | Leaflet built-in zoom/fade/autoPan | `MapContainer` at `PlatformMap.web.tsx:638–643` (no overrides); `leaflet/dist/leaflet.css:179–202` | any zoom (incl. scroll-wheel), popup open (callout autoPan + 0.2s fade) | 0.25s cubic-bezier zoom transform; 0.2s popup fade (library CSS, unconditional) | CSS | **NO** — leaflet.css has no `prefers-reduced-motion` block | n/a | Noise-adjacent (L4-04) |
| 20 | Home map-peek (live interactive mini-map) | `src/screens/HomeScreen.tsx:257–269` (PlatformMap :264 — no `reducedMotion` prop) | scroll/click over the peek on Home | inherits #16 + #19 inside Home | — | **NO** (inherits un-gated paths; never calls `animateTo` itself) | n/a | Noise-adjacent (L4-06), code-inferred |
| 21 | ActivityIndicator spinners (21 files, incl. Map locating banner `MapScreen.tsx:1980–2001`) | grep-verified | loading states | platform indeterminate spin | platform | No — RN provides no RM behavior for spinners (conventional loading-indicator exemption; brief, purposeful) | locating banner = legacy always-light pane, itself static | Whisper — accepted convention |
| 22 | Web splash loading dots (pre-bundle) | `public/index.html:97–108, 122–125` | bundle parse on web | CSS 1.2s ease-in-out stagger loop | CSS | **Yes** — `@media (prefers-reduced-motion: reduce)` → `animation: none`, dots stay as static cue | n/a | Whisper — exemplary (RM respected before any JS loads) |
| 23 | Tab switches | `@react-navigation/bottom-tabs` v7 default `animation = 'none'` (`BottomTabView.tsx:136`); RootNavigator sets nothing | tab tap | none | — | n/a — no motion exists | Yes | Whisper — silence |
| 24 | `requestAnimationFrame` nav retry | `src/navigation/RootNavigator.tsx:411` | early drawer tap before container ready | n/a — scheduling loop, no visual output | — | n/a | n/a | Not motion (inventoried for completeness) |

Completeness note: no `reanimated`/`lottie`/`moti` in `package.json`; no `LayoutAnimation` in app code (only via library #18); no `setInterval`-driven visuals; no `.gif` assets; no CSS keyframes/`animationName` in `src/`; `RemoteImage` has no fade-in; `GlassSurface`/`ScreenStage` contain no `Animated` (grep-verified) — "the glass itself carries no motion" holds at the primitive level.

### Findings

#### HIGH

**L4-01** · **Where:** `src/components/PlatformMap.web.tsx:626` (`duration: reducedMotion ? 0 : 0.6`), against `node_modules/leaflet/dist/leaflet-src.js:3471–3522`. · **What:** The web reduce-motion camera gate is **inverted, not just ineffective**. Leaflet's `flyTo` computes `duration = options.duration ? 1000 * options.duration : 1000 * S * 0.8` — `0` is falsy, so an RM user gets the *default distance-based* flight (Leaflet's signature zoom-out → arc → zoom-in, typically ~1–4s for a cross-town jump) while a non-RM user gets the intended 0.6s. Every one of the seven camera triggers routes here: recenter-on-me, Tasks-card→Map focus fly, `accessmap://flag/{id}` deep link, saved-place chip, address-search select, saved-places jump, nearby-list select (`MapScreen.tsx:1024, 1070, 1145, 1457, 2125, 2154, 2171`). The code comment ":625 Instant jump when 'Reduce Motion' is on (WCAG 2.3.3)" is true on native, false on web. Honest nuance: when the target is already near at the same zoom, `S → ~0` and the flight is near-instant (recenter while centered is fine); the harm scales with distance — and the core FIND flows (card focus, deep link) are exactly the long-distance jumps. · **Why it matters:** This app maps barriers *for* motion-sensitive and vestibular-sensitive users, and web is the entire guest surface (orientation §2: web IS guest mode). A user who asked their OS for less motion gets the largest, curviest motion in the whole app — longer than anyone else gets — on the tap-a-barrier-see-it-on-the-map moment. WCAG 2.3.3 fails in the one place DESIGN.md §8 explicitly names ("map fly-tos"). Fix is one line per call: pass `animate: false` (Leaflet then routes through `setView` instantly, `leaflet-src.js:3474–3476`) or call `setView` directly under RM. · **Evidence:** code-read of both files at HEAD; installed-library source (exact falsy ternary at `leaflet-src.js:3522`); rm captures `rm/map__{light,dark}__390__rm-at-rest.png` show only end-state parity — the render-index note "map fly-to duration 0 under RM" (rows 374/378) restates the code's *intent*, which stills cannot falsify; tags: code-verified (library-source), web-only (native path is genuinely instant — RNM `MapView.java:938–945` guards `duration <= 0` → `moveCamera`). · **Severity: HIGH** (the lens rubric's own example — core-flow camera motion failing RM — with the aggravation that it *inverts* rather than ignores; not CRITICAL because each flight is finite, ends at the correct state, and the list-first alternative path exists).

**L4-02** · **Where:** web `src/components/PlatformMap.web.tsx:345`; native `PlatformMap.tsx:134` + `node_modules/react-native-map-clustering/lib/ClusteredMapView.js:157–174`. · **What:** **Cluster expansion ignores reduce-motion on both platforms.** Web: cluster click runs `map.flyTo([lat, lng], expansionZoom, { duration: 0.4 })` — a literal, un-gated, and unreachable by the gate anyway since `ClusteredMarkers` (props :252–258, instantiated :687–693) is never passed `reducedMotion`. Native: the app hands the library's `onPress` straight to the Marker; the library's `_onClusterPress` calls `mapRef.fitToCoordinates(coordinates, { edgePadding })` with no `animated: false` (animated is the platform default) and the app sets neither `preserveClusterPressBehavior` nor its own handler. This was flagged pre-merge as out-of-fence in the Map rollout report (`qa-reports/2026-07-04_Glass_Rollout_Map.md` §9.3 item 3, then :346) and is **confirmed still live at HEAD** (now :345). · **Why it matters:** Clusters are the *default* state of any dense map — drilling into a neighbourhood is a chain of cluster taps, i.e., repeated un-gated zoom flights (zoom changes are the highest-amplitude camera motion). An RM user exploring the core FIND flow cannot avoid them; the "gated" `animateTo` paths coexist with an ungated one on the same screen, which is worse than uniform behavior because the user can't build a motion expectation. Also a token violation (0.4s literal). · **Evidence:** code-read at HEAD both platforms; library source line refs above; rollout-report provenance; tags: web = code-verified (capturable only as video — see PROBE-REQUEST), native = code-inferred + NEEDS-SKY-DEVICE. · **Severity: HIGH** (core-flow camera motion ignoring RM, both platforms, previously flagged and not fixed).

#### MEDIUM

**L4-03** · **Where:** `node_modules/react-native-map-clustering/lib/ClusteredMapView.js:41–42, 139–141`, consumed with defaults at `src/components/PlatformMap.tsx:111–169`. · **What:** On iOS, every `onRegionChangeComplete` (i.e., **every pan or zoom settle on the Map screen**) fires `LayoutAnimation.configureNext(LayoutAnimation.Presets.spring)` — a ~700ms spring — because `animationEnabled` defaults `true` and AccessMap doesn't opt out. Two costs: (a) cluster bubbles spring-pop on every split/merge as you pan, un-gated by RM; (b) `configureNext` is **global for that layout pass** — any overlay UI that happens to change layout in the same frame (banners appearing, filter panel content, badge counts) inherits the 700ms spring on iOS. · **Why it matters:** Continuous, un-gated decorative spring motion on the core map surface for RM users; the global-layout-pass side effect can animate UI the design system deliberately keeps still, bypassing every `useReducedMotion` gate in app code. Fix is a prop: `animationEnabled={false}` (or gate it on the hook). · **Evidence:** library source lines above; app JSX passes no `animationEnabled`; unphotographable on web (iOS-only code path) — tags: code-verified (library default), NEEDS-SKY-DEVICE (feel/amplitude on device). · **Severity: MEDIUM** (real gap on the core screen, but partially masked by the user's own pan gesture and smaller in amplitude than camera flights).

**L4-04** · **Where:** `src/components/PlatformMap.web.tsx:638–643` (`MapContainer` with library defaults); `node_modules/leaflet/dist/leaflet.css:179–202`. · **What:** Leaflet's built-in animations run unconditionally on web: 0.25s cubic-bezier zoom transform on every zoom (including scroll-wheel/pinch and the tail of any `setView`/`flyTo`), 0.2s popup fade, and popup **autoPan** (an animated map pan whenever a callout opens near an edge — which the focus/deep-link flows do via `openPopup()`, `PlatformMap.web.tsx:629–631`). `leaflet.css` ships no `prefers-reduced-motion` block, and the app doesn't set `zoomAnimation={false}` / `fadeAnimation={false}` / popup `autoPan:false` under RM. · **Why it matters:** Even after L4-01/L4-02 are fixed, an RM user's callout-open can still animated-pan the map, and every zoom still tweens. Zoom-on-user-gesture is arguably direct-manipulation feedback (defensible), but autoPan is app-initiated motion on the focus flow. One-line remedy at the `MapContainer` (conditional props) or a scoped RM stylesheet. · **Evidence:** library CSS lines cited; MapContainer JSX has no overrides; tags: code-verified, web-approximated. · **Severity: MEDIUM** (secondary amplitude, core screen, trivially fixable).

**L4-05** · **Where:** test suite (absence): `src/lib/__tests__/accessibility.test.ts:16` imports only `decorativeProps, useReduceTransparency`; repo-wide grep for `reducedMotion|isReduceMotionEnabled` across `*.test.*` returns **zero** motion-gating assertions; `screens/__tests__/TasksScreenFlagCard.test.tsx` contains no sheen/RM assertion. Render index rm rows (`01_render-index.md:371–378`) tag gating as "test-inferred". · **What:** The motion law (DESIGN.md §8 "ALWAYS gate non-trivial motion behind useReducedMotion()") has **zero test enforcement** — `useReducedMotion` itself is untested, and no component test pins any RM branch (snap vs spring, `animationType` flip, sheen unmount, camera duration). The render index's "test-inferred" tag is therefore unsupported for RM specifically (the cited guard tests pin structure/DT/glass, not motion gating). · **Why it matters:** This is exactly how L4-01 and L4-02 shipped and survived a flagged report: nothing red-lines when a gate is dropped or an API semantic (falsy 0) silently defeats one. For an app whose users include vestibular-sensitive people, RM parity is a hard invariant and deserves the same guard-test treatment the glass/DT laws got (e.g., mock the hook → assert `animationType === 'none'`, assert `flyTo` called with `animate: false`, assert sheen not mounted). · **Evidence:** greps at HEAD (absence-of-evidence verified three ways: hook name, state name, mock name); tags: code-verified. · **Severity: MEDIUM** (infrastructure gap with two demonstrated HIGH consequences).

**L4-06** · **Where:** `src/screens/HomeScreen.tsx:257–269` (live `<PlatformMap>` at :264, inside a plain `Pressable`, only the hint pill is `pointerEvents="none"`). · **What:** Home's "map peek" is a **live, interactive** map, not a static preview: no blocking overlay, no `reducedMotion` prop, no interaction locks. On web that means scroll-wheel over the peek zooms the mini-map (0.25s Leaflet tween, and scroll-hijacks the Home page scroll), and a click on a cluster bubble inside the peek triggers the un-gated 0.4s `flyTo` (L4-02) *inside Home* instead of opening the full map. It never calls `animateTo` itself, so the missing prop is currently latent — but it inherits every un-gated map motion. · **Why it matters:** Home is the landing surface for every web guest; un-gated motion (and scroll capture) inside a component that reads as a static thumbnail is surprise motion — the worst kind for vestibular users. Locking the peek (`pointer-events: none` wrapper / `scrollWheelZoom={false}`, `dragging={false}`) would also fix the tap-target ambiguity. · **Evidence:** code-read at HEAD; event-flow reasoning (Leaflet binds handlers on its own container beneath the Pressable); no capture exercises peek interaction — tags: code-inferred, web-approximated; see PROBE-REQUEST. · **Severity: MEDIUM** (landing-screen exposure; requires deliberate interaction to trigger).

#### LOW

**L4-07** · **Where:** `src/screens/ProfileScreen.tsx:793–796` (`duration: 600`, `useNativeDriver: false`), fill render :1017–1030. · **What:** Tier-progress fill animates width over a **600ms literal** — off the token scale entirely (max `motion.duration.slow` 320) and outside DESIGN.md:279's documented exception list ("the bottom-sheet slide and drawer are the only longer moves") — on the JS thread (width can't use the native driver), timed to fire exactly when Profile's focus-refetch work lands. Properly RM-gated (snap). · **Why it matters:** Token drift on the app's celebration moment + a JS-thread animation racing data work = likely visible stutter on mid-tier devices; auth-only surface so guests never see it. · **Evidence:** code-read; auth-gated (orientation §5 fence) — tags: code-inferred, NEEDS-SKY-DEVICE (stutter is device-only). · **Severity: LOW.**

**L4-08** · **Where:** `src/components/OnboardingCards.tsx:156–175`. · **What:** Carousel dot pills animate width with literal spring params (`speed: 18, bounciness: 3` — not `motion.spring.*`) on `useNativeDriver: false` (layout prop), during first launch while the JS thread is warmest-busiest. RM-gated correctly (snap). · **Why it matters:** Token discipline + minor jank risk on the app's first impression; amplitude is tiny (8→22pt). · **Evidence:** code-read — tags: code-inferred. · **Severity: LOW.**

**L4-09** · **Where:** `src/lib/accessibility.ts:95` ("Web/unsupported platforms quietly resolve to `false`") and `src/components/OnboardingCards.tsx:141–151` (a duplicate hand-rolled RM listener instead of the shared hook). · **What:** The hook's doc comment is stale — RN-web maps `isReduceMotionEnabled` to `prefers-reduced-motion` (orientation ledger #11, verified empirically at capture) — and one component maintains its own parallel implementation of the same law. · **Why it matters:** A doc line telling developers "web RM doesn't exist" is a plausible root cause for the web-shaped holes in L4-01/L4-02 ("why gate what can't fire?"); duplicate listeners invite divergence. Two-line fix + one refactor-to-hook. · **Evidence:** code-read vs ledger #11 — tags: code-verified. · **Severity: LOW** (doc/hygiene with demonstrated blast-radius adjacency).

#### POLISH

**L4-10** · **Where:** `src/components/ui/Skeleton.tsx:47–48`. · **What:** Pulse durations are literal `700`s — the token scale has no loop-pulse value, so the law can't be followed here without extending it. Suggest a `motion.duration.pulse` token (or a documented exception) so the last literal in the design-system primitives is accounted for. · **Why it matters:** Keeps "never raw numbers" true. · **Evidence:** code-read. · **Severity: POLISH.**

**L4-11** · **Where:** `src/components/HamburgerDrawer.tsx:112–115` (`setTimeout(…, 220)`). · **What:** The drawer→sub-screen handoff waits a literal 220ms "so the drawer closes visually first" — under RM the drawer closes instantly but the wait remains, a dead 220ms for exactly the users who asked for snappiness. Gate the delay (`reducedMotion ? 0 : 220`) and tokenize. · **Evidence:** code-read. · **Severity: POLISH.**

**L4-12** · **Where:** `src/screens/MapScreen.tsx:2179` (`setTimeout(() => …showCallout…, 350)`). · **What:** Nearby-list select waits a literal 350ms before opening the callout to let the (RM-suppressed) close animation finish — under RM the modal closes instantly but the callout still lags 350ms. Same shape as L4-11. · **Evidence:** code-read. · **Severity: POLISH.**

### PROTECT nominations (L4)

1. **The Modal presentation law — all 32 of 32 sites gated.** Every `animationType` in the codebase is `reducedMotion ? 'none' : …`, with `ui/Sheet.tsx:110` baking it into the primitive (DESIGN.md:280). This is rare, systematic discipline; any future modal must inherit it. (Evidence: exhaustive grep at HEAD; `rm/report__*__rm-open.png` end-state parity.)
2. **FlagCard sheen triple gate** (`TasksScreen.tsx:1465`): the sheen is **not mounted** — not merely frozen — under reduce-motion, reduce-transparency, *or* C-lite. Unmount-not-freeze is the strongest possible reading of GLASS.md §6 and should be the template for future glass micro-motion.
3. **The press language** — Button + PressableScale share one spring vocabulary via `motion.spring.press/pressOut`, native-driver, RM-early-return (`Button.tsx:75,84`; `PressableScale.tsx:60,70`). One feel, everywhere, gated.
4. **FlashBanner's decoupling of announcement from motion** (`FlashBanner.tsx:58–62, 76–98`): the SR announce fires unconditionally while entrance/exit snap under RM — status reaches everyone, motion reaches only those who welcome it. WCAG 4.1.3 + 2.3.3 in one small file.
5. **The web splash RM media query** (`public/index.html:122–125`): reduce-motion is honored *before the JS bundle even parses*, with the dots kept as a static "working" cue. Thoughtfulness at a layer most apps forget exists.
6. **Skeleton's static-at-0.5 RM fallback** (`Skeleton.tsx:41–43`): the placeholder stays visible and meaningful with the motion removed — end-state parity done right (visible in `rm/tasks__*__rm-at-rest.png`).
7. **The native camera gate** (`PlatformMap.tsx:99–100`): `reducedMotion ? 0 : 600` genuinely lands instant on both native platforms (RNM Android's `duration <= 0 → moveCamera` guard verified at source). This is the behavior the web variant must be brought to match — protect the intent while fixing the web mechanics.
8. **Stillness at rest.** No auto-advance, no ambient loops (outside loading), tab transitions `none` by default, zero motion in the glass primitives. The "material depth is the hero" thesis is real in code: nothing moves until the user acts.

### Copy observations (L4)

1. `src/lib/accessibility.ts:95` — "Web/unsupported platforms quietly resolve to `false`" is factually wrong for web at this RN-web version (ledger #11) and actively dangerous (see L4-09).
2. `src/components/PlatformMap.web.tsx:625` and `:46–47` — "Instant jump when 'Reduce Motion' is on (WCAG 2.3.3)" describes intent, not behavior (L4-01). When fixed, the comment should name the falsy-zero trap so it never regresses.
3. `DESIGN.md:279` — "the bottom-sheet slide and drawer are the only longer moves" is stale: map camera (600ms/0.6s) and the tier fill (600ms) are longer moves; the law text should either list them or the code should conform.
4. `01_render-index.md:371–378` — the rm rows' "test-inferred" tag overstates the evidence: no reduced-motion test exists in the repo (L4-05). Worth a one-line correction so Part 3 doesn't lean on phantom tests.

### PROBE-REQUESTs

- **PROBE-REQUEST (L4-01/L4-02, web):** a motion trace, not a still — run the capture harness with `emulateMedia({reducedMotion:'reduce'})`, navigate Tasks→tap a card (focus fly), and record either a Playwright video/trace or paired screenshots at t=0 / t+300ms / t+800ms; any intermediate frame differing from the end state proves the flight ran under RM. Repeat with a cluster click on the Map for L4-02.
- **PROBE-REQUEST (L4-03/L4-02-native, device):** on iOS with Reduce Motion ON: (a) pan the map across a clustered area and watch for marker spring-pops; (b) tap a cluster and observe whether the camera animates. Both should be still/instant post-fix.
- **PROBE-REQUEST (L4-06, web):** hover the Home map peek and scroll (does the peek zoom instead of the page scrolling?), then click a cluster bubble inside the peek (does it fly within the peek instead of opening FullMap?).


---

## L5 — Device integrity


**Lens verdict.** AccessMap's touch-target architecture is, by code, one of the most disciplined I have audited: the 44pt floor is written into the theme (`a11y.minTargetSize`, theme.ts:490), enforced by explicit `minHeight`/`minWidth` + hitSlop math on ~60 control classes, annotated inline with WCAG citations ("was 36pt — below 44pt project standard"), and DT-hardened by a real static-analysis guard suite (`src/__tests__/dynamicTypeGuard.test.ts`, Clusters A/B + Rules 1–4). The census below finds **the app's own components almost universally compliant** — Tasks, the report sheet, Settings, the drawer, and the modal family are clean at all four widths and both themes. The failures cluster in exactly two places: **(1) the web map imports raw Leaflet chrome that was never brought under the 44pt law and then occludes it with app overlays at every single width**, and **(2) a handful of overlay-positioning decisions (Home's Report pill, the Feedback sheet's pinned footer) let interactive elements sit on top of other interactive elements**. On the Dynamic Type axis, the *strategy* is exemplary (body/description uncapped, ×1.6 reflow, header auto-fit) but the shipped web build — a first-class guest surface — demonstrably breaks WCAG 1.4.4 at 200% zoom on the core report flow, and three native caps gate essential information below 2.0. Tablet 834 is honest but inert (stretched phone, no max-width system except the Map). Portrait lock is respected as N/A-by-design; the iPad multitasking posture (Split View ~320pt panes, where the action-bar overflow silently engages) is undecided and unaudited. One R4-flagged item is formally classified below as a capture-environment artifact, and one R4 fear (the bulk-select circles) is corrected by code: the whole card is the checkbox.

Tags used: [web-approximated] · [web-real] (defect exists on the shipped web build itself) · [code-inferred] · [test-inferred] · [NEEDS-SKY-DEVICE].

---

### THE 44pt CENSUS TABLE

Arithmetic notes: spacing tight/xs/sm/md/lg/xl/xxl = 4/6/8/12/16/20/24 · font.size caption/xs/sm/base = 11/12/13/14 · hitSlop counts toward the effective target (DESIGN.md §6). "eff." = declared + hitSlop.

**Primitives (app-wide)**

| Screen | Element | File:line | Declared size | Meets 44pt? | Notes |
|---|---|---|---|---|---|
| all | `Button` primitive | ui/Button.tsx:109 | `minHeight: 44` | ✅ | |
| all | `Input` primitive | ui/Input.tsx:150 | `minHeight: 44` | ✅ | value text capped 1.5 (:108) — see DT walls |
| all | `Sheet` close X | ui/Sheet.tsx:142–148 + :65 | 40×40 + hitSlop 8 → 56 eff. | ✅ | |
| all | Tab bar items (Home/Tasks/Profile) | RootNavigator.tsx:285–319 | bar h = 68 + insets.bottom; item ≥ ⅓ width | ✅ | labels frozen — `tabBarAllowFontScaling:false` :310 |
| all | Nav-header menu button | RootNavigator.tsx:444–452 + :232 | 36×36 + hitSlop 8 → 52 eff. | ✅ | |
| all | Nav-header Feedback pill | RootNavigator.tsx:454–462 + :245 | minH 44 + hitSlop 8 | ✅ | collides with title at web 200% (L5-03) |

**Home**

| Element | File:line | Declared size | Meets? | Notes |
|---|---|---|---|---|
| Editorial header menu / chat buttons | HomeScreen.tsx:370–377 + :193/:203 | 44×44 + hitSlop 8 | ✅ | |
| Search pill (whole) | :391 | minH 48, full width | ✅ | |
| Search clear ✕ | :232 | icon 16 + hitSlop 10 → **36×36 eff.** | ❌ | sub-44 inside a larger competing target (L5-09) |
| "Use my location" | :406 | minH 44 | ✅ | |
| Map peek ("Open the full map") | :258–269, mapPeek :410 | 168pt tall, full width | ✅ size | live Leaflet inside steals taps (L5-08) |
| Retry (load error) | :471 | minH 44 | ✅ | |
| Recent rows ×5 | :475 | minH 56 | ✅ | right end occluded by Report pill @375/390 (L5-02) |
| Report pill | :482–493 + :347 | padV 12 + 20pt line ≈ 45–48pt tall | ✅ | the occluder in L5-02 |

**Map (MapScreen + PlatformMap)**

| Element | File:line | Declared size | Meets? | Notes |
|---|---|---|---|---|
| Action-bar buttons ×7 | MapScreen.tsx:2470–2476 (`actionBtn`) | minW 44 / minH 44 | ✅ | tray = hidden-indicator ScrollView (L5-06) |
| Severity "{n}+" / category quick-cycle | :2441/:2445 (+`actionBtn`) | 44×44 | ✅ | text capped 1.3 |
| Status pill "5 flags nearby" | :2415 (+JSX :1271) | ~34pt tall | n/a (non-interactive live region) | **occludes the web zoom control** (L5-01) |
| **Leaflet zoom + / −** (web only) | PlatformMap.web.tsx MapContainer :638 (default `zoomControl`) | **26–30 CSS px** (Leaflet default, unstyled) | ❌ | occluded at all 4 widths (L5-01) |
| Zoom affordance (native) | — | **does not exist** (no buttons; `zoomControlEnabled` unset/Android-only) | ❌ | pinch/double-tap only (L5-01) |
| Filter panel collapse row | :2515 (`filterTitleRow`) + hitSlop 8 :1524 | minH 32 + padV 4 + slop 8 → 48 eff. | ✅ | via hitSlop |
| **Filter panel "Clear" (all filters)** | JSX :1544–1552 (`clearLink` :2528) | **bare Pressable, no style/minH/hitSlop; 12pt text ≈ 34×17pt** | ❌❌ | worst target in the app (L5-04) |
| Filter category chips (+ live counts) | :2545 (`filterPill`) | padV 6 + **minH 44** | ✅ | **DESIGN.md §7 "minHeight: 32 is current" is STALE — bumped at HEAD** |
| Severity 1–5 pills | :2573 (`sevPill`) | 44×44 | ✅ | |
| Status / context-tag chips | same `filterPill` class | minH 44 | ✅ | |
| Preset Save / Load | :2738/:2744 | minH 44 | ✅ | |
| Saved-place chips + Manage | :2395 (`placeChip`) | padV 10 + minH 44 | ✅ | auth-gated [code-inferred]; "bumped from 36 per QA A1" |
| "Save a place" (empty state) | `savedSaveBtn` | minH 44 | ✅ | |
| Empty-filters quick chips + Reset | `emptyQuickChip`/`emptyCardBtn` | minH 44 | ✅ | R1's "best state in the app" |
| Error-banner retry / offline banner | `errorBanner` | minH 44 | ✅ | |
| List FAB / Report FAB | `fab` | minH 48, padH 20 | ✅ | bottom-right thumb zone; Report FAB auth-gated |
| **Web map pins** | PlatformMap.web.tsx:120–128 | `iconSize [30,30]` | ❌ 30×30 | map-convention size; every pin has a ≥44pt list twin (Nearby list) — mitigation, not exemption |
| Web clusters | :158–183 | 34 (≤9) / 40 / 46 px | ❌ at ≤9 | |
| Native clusters | PlatformMap.tsx:123–158 | ~40pt disc + hitSlop 2 | ⚠ ~44 borderline | [code-inferred] |
| **Leaflet popup close ✕** (web callout) | Leaflet default, unstyled | ~24×24 px | ❌ | only action on a callout (L5-01 sibling) |
| Attribution links (Leaflet/OSM/CARTO) | Leaflet default | ~11px text links | ❌ | third-party chrome, in-app tap/tab targets (LOW) |

**Tasks**

| Element | File:line | Declared size | Meets? | Notes |
|---|---|---|---|---|
| Header menu / feedback | TasksScreen.tsx:1862 + :836/:846 | 44×44 + hitSlop 8 | ✅ | |
| "Select multiple" | :2299 (`selectEntryBtn`) | minH 44 | ✅ | |
| Search input / clear ✕ | :2196 / :2216 + :938 | minH 44 / 44×44 + slop 8 | ✅ | explicit "was 40pt/32pt" comments |
| All/Mine scope chips | :2180 | minH 44 | ✅ | |
| Category chips (All + 6) | :2242 (`catChip`) | minH 44 | ✅ | rail clips mid-word (L5-11) |
| Sort chips ×3 | :2274 (`sortChip`) | minH 44, flexGrow | ✅ | single-letter collapse at web 200% (L5-03) |
| Nearest-open banner | :1949 | minH 44 | ✅ | |
| Flag card (tap = open/select) | :2073/:2078 | minH `size.cardMin` (≫44) | ✅ | card IS the checkbox in select mode |
| Card actions Verify/Resolved/Reject/Details | :2128 (`actionBtn`) + hitSlop 6 (:1579) | minH 44 + slop → 56 eff. | ✅ | slops overlap the 8pt gap by 4pt (LOW note) |
| Photo thumbnail (lightbox) | :1698 + `cardThumbWrap` | `size.thumb` + hitSlop 8 | ✅ | |
| Select-mode indicator circle | :2327 (`selectCheck`) | 22×22 **visual indicator only** | n/a | **not a target** — whole card toggles (R4 misread; see verdict) |
| Load more | :1982 | 44 × minW 160 | ✅ | |
| Bulk bar Verify/Resolve/Watch/Cancel | :2372 (`bulkBtn`) | minH 44, flexGrow ≈82pt @375 | ✅ | docked above tab bar; measured reserve |

**Report sheet (ReportFlagModal)**

| Element | File:line | Declared size | Meets? | Notes |
|---|---|---|---|---|
| Category pills ×6 | :1052 (`pill`) | minH 44 | ✅ | |
| Severity buttons 1–5 | :1064 (`sevBtn`) | 44×44 | ✅ | digit capped 1.3, word in hint below (good) |
| Template chips (auth) | :1281 | minH 44 | ✅ | |
| Context-tag chips | :1246 (`tagChip`) | minH 44 + padV 10 | ✅ | comment does the DT math |
| Anon banner "Sign in" link | :1184 (`anonBannerLink`) | minH 44, width ≈64 | ✅ | |
| Description input | :1090 | minH 80, **uncapped** | ✅ | |
| Photo add/remove (auth) | PhotoGallery.tsx:110/:229/:271 | 28×28 + slop 8 → 44 eff. | ✅ | documented in-code |
| Cancel / Submit footer | :1211 (`actionBtn`) | minH 44, sticky outside scroll | ✅ | no bottom safe-area inset on native (L5-10) |

**Everything else**

| Screen | Element class | File:line | Declared | Meets? |
|---|---|---|---|---|
| Nearby flags | Close / rows / search / chips | NearbyFlagsModal.tsx:313–319/:368 + :192 | 44×44 + slop 10 / minH 44 | ✅ |
| Legend | Close | LegendModal.tsx:232–239 | minH 44 | ✅ |
| Saved places / Filter presets / Address search | rows, New, Rename/Delete, Close, clear-recents | SavedPlacesModal.tsx:229/:265 · FilterPresetsModal.tsx:548–725 · AddressSearchModal.tsx:571 | 44–56 (+slops 6–12) | ✅ |
| Feedback | chips / inputs / Cancel / Send | FeedbackModal.tsx:442–491 | minH 44 | ✅ (but email field hidden — L5-09) |
| Drawer | Close / menu rows | HamburgerDrawer.tsx:362–364 + :172 / :404–407 | 44×44 + slop 12 / minH 56 | ✅ |
| Settings | rows / appearance segments | SettingsScreen.tsx:639 (row 64) / :750–758 (segment minH 44) | ✅ | |
| Sign-in | inputs / primary / secondary / guest / back | SignInScreen.tsx:323/:355/:393/:424 + backBtn | 50 / 56 / 56 / 44 / 44 | ✅ |
| Onboarding | Skip / Back / Next / Maybe later | OnboardingCards.tsx:516–694 (+slops 8–12) | minH 44 | ✅ |
| Profile (signed-out) | Sign-in CTA | ProfileScreen.tsx:2006/:2021 | minH 44 | ✅ |
| Profile (auth, code-read) | tier pill / stat chips / rows | :2191–2192 + :1890 | 32 + minW 44 + hitSlop 12 → 56 eff. | ✅ via slop |

**Top offenders, named:** ① Map filter panel **"Clear"** link (~34×17pt, no slop — the only bare-text Pressable found in the app) · ② **Leaflet zoom ±** on web (26–30px, unstyled, then occluded by the status pill + action bar at every width; native has no zoom buttons at all) · ③ **Leaflet popup close ✕** (~24px, the only dismiss on a pin callout) · ④ Home **search-clear ✕** (36×36 eff., nested in a competing target) · ⑤ web **pins 30×30** / small **clusters 34px** (list-twin mitigation acknowledged) · ⑥ attribution links (~11px, third-party chrome).

---

### Findings — CRITICAL

**L5-01 · Web map zoom control: sub-44, occluded by app chrome at ALL FOUR widths; native has no zoom affordance at all**
**Where:** PlatformMap.web.tsx:638 (MapContainer, default `zoomControl` — no config, no CSS override anywhere in the repo) × MapScreen.tsx:2376–2383 (`overlay` absoluteFill, padding 16, zIndex 10) + :2415 (`statusPill`) + :1259+ (topRow).
**What:** Leaflet's default zoom buttons (26–30 CSS px, already sub-44) render top-left inside the map; the app's "5 flags nearby" status pill renders top-left in the overlay at the same coordinates, and the wrapped action bar covers the "−". Measured in captures: "+" is ~85% covered at 375/390/430 and still buried at 834; "−" is ~50–60% covered at phone widths (a sliver survives at 834). The status pill is a plain GlassSurface View — not `box-none` — so taps on the covered region die on the pill. On native there are no zoom buttons whatsoever: zoom is pinch/double-tap only.
**Why it matters:** Zoom is how a wheelchair user reads block-level detail. For one-handed and limited-dexterity users (R4's #1 friction, verbatim: "zoom has no accessible fallback"), the web build offers only occluded slivers and the native build offers only a two-finger gesture — a WCAG 2.5.7 (dragging/gesture alternatives) posture failure on the flagship screen. This is the defining device-integrity defect of the audit: an interactive control occluded at every device size.
**Evidence:** base/map__light__{375,390,430,834}__at-rest.png · base/map__dark__{375,390}__at-rest.png (identical geometry) · dt/map__light__390__dt-zoom-{1.3,2}.png (worsens) · grep proof: zero `zoomControl`/`leaflet-` overrides in src/ [web-real]. Native absence [code-inferred; NEEDS-SKY-DEVICE for the pinch-only feel].
**Severity: CRITICAL.** Skeptic answered: the map can still be zoomed by scroll-wheel/pinch on web — but the buttons are the *only* non-gesture path, they are the thing being occluded, and the occluder is non-interactive chrome. Fix shape (for Part 3): `zoomControl={false}` + app-styled 44pt zoom buttons in the overlay's bottom zone, or `position: 'bottomleft'` + CSS sizing.

**L5-02 · Home Report pill occludes the Recent list's row targets at 375 and 390 (both themes)**
> **▸ Post-verification (skeptic ADJUSTED — authoritative): severity DEMOTED CRITICAL → HIGH.** The rubric's "any occlusion at any size = CRITICAL" misfires here: this is the universal floating-FAB-over-list pattern; the pill covers only the LAST visible row's right ~40% (the chevron), never the tap-to-open left ~60% (`rowText: flex:1`), the whole row navigates identically to the chevron, and it is clean at 430/834. Real defect, recoverable by a 1px scroll — HIGH, not CRITICAL. See §Calibration ledger #1.

**Where:** HomeScreen.tsx:347 (`bottom: bottomInset + spacing.md`, absolute) + :482 (`reportPill`, right: 16) vs :178 (ScrollView `paddingBottom: bottomInset + 96`) and :475 (rows minH 56).
**What:** The floating Report pill (~48×110pt) sits on top of the Recent card's rows whenever the content column ends near the viewport bottom. At 375 it covers the right end (chevron zone) of row 2 and the top of row 3; at 390 it covers row 5's chevron; at 430/834 it happens to land in clear space. The covered zone belongs to the pill, so a tap aimed at the row's chevron fires "Report a barrier" — navigating to FullMap and opening the report sheet.
**Why it matters:** R4 (one-handed): "aiming at that row risks firing Report instead" — for a tremor or limited-dexterity user the misfire cost is maximal: instead of viewing a barrier they are thrown into a report-composition flow three layers deep (map → auto-list → sheet). R1 hit the same overlap at 390. The 96pt scroll padding only guarantees clearance at the *scrolled-to-end* position; short/non-scrollable content (the common 5-row state) has no reserved lane.
**Evidence:** base/home__{light,dark}__375__at-rest.png (row 2 chevron + row 3) · base/home__light__390__at-rest.png (row 5) · clear at base/home__light__{430,834}__at-rest.png [web-real; geometry identical on native — code-inferred].
**Severity: CRITICAL** (lens rule: overlap of interactive elements at a shipped size class, on the default screen, in the thumb arc). Skeptic answered: the row's left ~60% stays tappable — this is misfire+partial-occlusion, not lockout; it stays CRITICAL under the any-overlap rule but Part 3 may triage it below L5-01.

**L5-03 · Web build at 200% zoom breaks the core flows (WCAG 1.4.4 — this is the shipped web app, not just a native proxy)**
**Where:** ReportFlagModal.tsx:1160–1195 (anonBanner flex row) + :1196–1220 (actions/submit label) · react-navigation header title × Feedback pill (RootNavigator.tsx:271–279 + :454) · TasksScreen.tsx:1044–1051 (sortChip `adjustsFontSizeToFit` — a no-op on react-native-web, per the app's own comment in ui/ScreenHeader.tsx:29).
**What (at browser zoom 2.0, 390pt class):** ① the anonymity banner wraps mid-word into a one-word-per-line shard column ("Reporti / ng / anonym / ously"); ② the "Report anonymously" submit label overflows its pill on both sides and bleeds toward Cancel — the button boundary dissolves (worst in dark); ③ Map and Profile header titles collide with the Feedback pill ("MapFeedback", "ProfiFeedback"); ④ Tasks sort controls collapse to "N… / O… / S…" and the recenter/refresh action-bar tools are already clipped out at 1.3; ⑤ the map pin gets trapped behind a two-line attribution bar. The sticky footer + scroll architecture itself **holds** (submit stays on-screen and pressable — R3's "unsubmittable" is strictly a legibility/boundary failure, not reachability).
**Why it matters:** AccessMap's web build is a first-class guest surface (web IS guest mode — orientation §2), and browser zoom is *the* low-vision mechanism on the web. R3's reality is the 2.0 shots: at their setting they "would either abandon the report or mis-tap" between Cancel and Submit on the app's core action. On native the per-variant caps (heading 1.5 / label 1.6) make ①–③ unreproducible-as-shown; whether the header collision occurs at the capped 1.5–1.6 is unknown.
**Evidence:** dt/report__{light,dark}__390__dt-zoom-2.png · dt/map__{light,dark}__390__dt-zoom-{1.3,2}.png · dt/tasks__{light,dark}__390__dt-zoom-2.png · dt/profile-signedout__light__390__dt-zoom-2.png · survivable twins at dt-zoom-1.3 [web-real at 200% zoom; native truth NEEDS-SKY-DEVICE].
**Severity: CRITICAL** (essential-text and control-boundary failure on the CONTRIBUTE flow at 200%, on a shipped surface). Skeptic answered: zoom-2.0 on a 390 viewport equals a ~195pt effective viewport — narrower than any phone — but WCAG 1.4.4's test *is* 200% on the viewport you ship, and the failure modes (mid-word shred, label escaping its fill, title collision) are layout bugs, not inevitabilities: the 1.3 shots prove the same layouts degrade gracefully when the squeeze is smaller.

---

### Findings — HIGH

**L5-04 · The filter panel's "Clear" (all filters) is a ~34×17pt bare-text target**
**Where:** MapScreen.tsx:1544–1552 (`onPress={clearFilters}` at :1546) — `<Pressable accessibilityRole="button" accessibilityLabel="Clear all filters">` with **no style, no minHeight, no hitSlop**; text = `clearLink` (:2528), font.size.xs = 12pt. (The second `clearFilters` call-site at :1966 is the empty-state "Reset all", which IS 44pt — the recovery path noted below.)
**What:** The only sub-44 *app-authored* control found in the census — roughly 34×17pt of pressable area, sitting at the filter panel's top-right, adjacent to the 48pt-effective collapse toggle. Every neighbouring chip in the same panel is 44pt.
**Why it matters:** Clearing filters is the recovery action for the "my filters hid everything" state (R1's most-praised flow). A limited-dexterity user who filtered themselves into an empty map now needs the panel's smallest target to get out — or must find the separate empty-state card. The adjacency to the collapse chevron means a miss *collapses the panel* instead, which reads as "my filters vanished".
**Evidence:** flows/map__light__{375,390}__filter-active.png (Clear visible, filters active) · code-read arithmetic above [web-real + code-inferred, native identical].
**Severity: HIGH** (sub-44 on a core-flow element; mitigated from CRITICAL by the redundant 44pt "Reset all" path in the empty state and per-chip deselection).

**L5-05 · Map action-bar tools silently scroll out of reach with zero affordance (hidden-indicator tray)**
**Where:** MapScreen.tsx:1298–1304 (`ScrollView horizontal showsHorizontalScrollIndicator={false}` + M11 comment: "~322pt of targets vs 288pt usable at 320pt") + `actionBarScroll` pins :2468.
**What:** The 7-button tray (44pt each + dividers ≈ 322pt) scrolls when its viewport shrinks below content width. When it engages, the LAST buttons — Refresh and **Recenter on me** — are simply absent, with no scroll indicator, no fade, no peeking half-button guaranteed. Verified engaging in the zoom captures (recenter gone at 1.3; only 3.5 buttons at 2.0). At default scale it never engages at 375–834 portrait — the risk classes are: iPad **Split View ~320pt panes** (supportsTablet true), true 320pt-class devices, and web zoom/text-size users.
**Why it matters:** Recenter is not a convenience here — MapScreen's own Report-FAB a11y hint tells locationless users: *"Use the recenter button to turn on location, then report a flag here"* (MapScreen.tsx:2085). When the tray hides it, the documented path into the CONTRIBUTE flow disappears. R3 lost it at 1.3× ("my most important map control, gone").
**Evidence:** dt/map__light__390__dt-zoom-1.3.png (recenter clipped, no indicator) · dt-zoom-2 (refresh+recenter+cat gone) · M11 comment [code-inferred for 320pt/Split View; web-real under zoom; NEEDS-SKY-DEVICE for Split View].
**Severity: HIGH.** Skeptic answered: at the four mandated portrait widths at default scale, all 7 buttons fit (verified in every base capture) — this fires only in the conditional geometries listed; but those geometries are real (Split View is default-on for a supportsTablet app) and the failure is invisible-by-design (`showsHorizontalScrollIndicator={false}` with no substitute affordance).

**L5-06 · Home map peek: a live interactive map inside the "Open the full map" button steals and redirects taps**
**Where:** HomeScreen.tsx:258–269 — `<Pressable onPress={navigate FullMap}><PlatformMap …/>` with no `pointerEvents` guard on the map (only the hint pill is `pointerEvents="none"`, :265); grep confirms no `scrollEnabled`/`zoomEnabled`/`interactive` toggles on either PlatformMap variant.
**What:** On web the peek embeds Leaflet's zoom buttons (visible in every home capture) and the attribution links: "+/−" zoom the *preview* instead of opening the map, and **Leaflet / OpenStreetMap / CARTO are live anchors that navigate the browser away from the app entirely**. On native, react-native-maps' own gesture recognizers plausibly consume taps/drags before the parent Pressable sees them — i.e. the peek's tap-to-open contract may not work at all on device [code-inferred].
**Why it matters:** The peek is announced to AT as ONE button ("Open the full map"), but its interior is a minefield of sub-44 third-party targets with three different behaviors (zoom-in-place, exit-the-app, open-the-map). For a tremor user, the "exit the app" outcome from a mis-tap inside a *button* is the most disorienting failure available. R4 already treated the peek's zoom squares as reach targets.
**Evidence:** base/home__{light,dark}__{375,390,430,834}__at-rest.png (zoom control + attribution rendered inside the peek at every width) [web-real] · native tap-swallow [code-inferred, NEEDS-SKY-DEVICE].
**Severity: HIGH** (tap-theft + app-exit inside a core-screen button on web; potential dead button on native). Fix shape: overlay `pointerEvents:'none'` wrapper on the peek's map (web: also `zoomControl={false}`/`attributionControl` relocation for the peek instance), keeping one clean 168pt target.

**L5-07 · Native Dynamic Type walls: three caps gate ESSENTIAL information below 2.0 (WCAG 1.4.4)**
**Where:** RootNavigator.tsx:310 (`tabBarAllowFontScaling:false`) · NearbyFlagsModal.tsx:166 (list meta capped 1.4) · AppText variant caps (ui/AppText.tsx:62–71: mono family 1.4, label 1.6, heading 1.5, display 1.3) · ui/Input.tsx:108 (1.5) · SignInScreen.tsx:153/:170 (inputs 1.4).
**What & per-wall judgment:**
| Wall | Cap | Essential? | Judgment |
|---|---|---|---|
| Tab labels Home/Tasks/Profile | **1.0** (frozen) | yes — primary navigation names | The known conscious wall. Platform convention (Apple's own tab bars don't scale in place) *plus* icons carry meaning — but iOS convention pairs frozen labels with the **Large Content Viewer** on long-press, which react-navigation does not implement. As shipped, a 2× user gets 12pt labels and no compensation. **Not acceptable as-is; needs the large-content affordance or a scaling strategy.** |
| Nearby-list meta "Severity 4 · verified · 297 m · 29d ago" | 1.4 | yes — THE decision data for R1/R3 (severity, trust, distance) | **Fails the essential test.** The list is the app's accessible twin of the map (SR auto-open); capping its meta at 1.4 while the description above it scales freely inverts the information hierarchy for large-type users. |
| mono variant (coordinates, distances, stats) | 1.4 | mostly yes (distances/coords) | Borderline-fail: "297 m" and the report sheet's coordinates are task-critical; stats/points are not. Split the cap or lift to ~2.0 where it's a distance. |
| label 1.6 (all buttons/chips) | 1.6 | yes (control names) | Defensible *system* trade: layouts reflow (×1.6 compact stack), buttons grow via minHeight-not-height, and 1.6 with wrapping is materially better than clipped 2.0. Documented in AppText's docblock. **Accept with note.** |
| heading 1.5 / display 1.3 (+ ScreenHeader auto-fit floor) | 1.5/1.3 | headings duplicated by context | Accept — titles shrink-to-fit deterministically (ScreenHeader), body stays uncapped. |
| Inputs 1.4–1.5 (SignIn, Input primitive) | 1.4/1.5 | yes (user's own text) | Borderline; typed text should scale with the reader. Lift toward 2.0 — multiline growth is already tolerated elsewhere. |
| Cluster count 1.2 / sev digit 1.3 / status pill 1.3 | | no — redundant (SR labels + hint words carry the value) | Accept — textbook redundancy-first capping. |
**Why it matters:** R3 at full setting stops trusting their own taps. The body/description axis is genuinely exemplary (uncapped, guard-tested [test-inferred: dynamicTypeGuard Rules 1–4 + TasksScreenFlagCard ×1.6 assertions]) — but navigation names and the list's severity/distance line are exactly the two things a low-vision user cannot infer from context.
**Evidence:** code-read at HEAD (lines above) · dt/ proxies for direction only [web-approximated] · true ramp **NEEDS-SKY-DEVICE**.
**Severity: HIGH** (aggregate; the two named essential walls), with the remaining walls recorded as accepted trades.

---

### Findings — MEDIUM

**L5-08 · Feedback sheet: the REPLY EMAIL field hides behind the pinned Cancel/Send row at rest**
**Where:** FeedbackModal.tsx (footer row + scroll content; email input `minHeight: 44` :478).
**What:** At sheet-open on 390 (and per R5 at 834), the "REPLY EMAIL (OPTIONAL)" label renders flush against the pinned footer and the input itself sits beneath it — reachable only by an unindicated scroll; the sheet *looks* complete. R5: "hidden behind the Cancel/Send row at both widths."
**Why:** An invisible field is an unanswerable field — users wanting a reply never learn they could leave contact. (Send stays reachable; flow completes — hence not HIGH.)
**Evidence:** base/feedback-modal__light__390__at-rest.png (verified) · base/feedback-modal__{light,dark}__{375,430,834}__at-rest.png (same family) [web-real].
**Severity: MEDIUM.**

**L5-09 · Home search-clear ✕ is a 36pt-effective target nested inside a competing 48pt button**
**Where:** HomeScreen.tsx:230–238 (icon 16, hitSlop 10; no minW/minH) inside the search pill Pressable (:391).
**What:** 16 + 10 + 10 = 36×36 effective — below the floor, and every missed press activates the *parent* (opens the Address Search modal), the exact opposite of "clear".
**Why:** Undo-type controls are disproportionately used by users who already mis-tapped once.
**Evidence:** code-read arithmetic; state renders only after a search is chosen (not in at-rest captures) [code-inferred].
**Severity: MEDIUM.**

**L5-10 · Native bottom sheets pin their action rows without bottom safe-area insets**
**Where:** ReportFlagModal.tsx:1196–1210 (`actions` paddingBottom = spacing.xxl 24, card paddingBottom 0; **no `useSafeAreaInsets` anywhere in the file**) · FeedbackModal.tsx (same recipe).
**What:** RN `Modal` renders edge-to-edge over the tab bar; on home-indicator iPhones (the 390/430 classes) the indicator occupies ~34pt, so the 44pt Cancel/Submit row's bottom ~10pt sits inside the indicator's gesture zone — cramped taps and accidental app-switcher swipes exactly on the submit row.
**Why:** R4's population swipes imprecisely; a submit that shares pixels with the system gesture bar is a misfire generator. (Web captures can't show this — the tab bar is in-flow there.)
**Evidence:** code-read; KAV structure otherwise sound (see PROTECT) [code-inferred, NEEDS-SKY-DEVICE].
**Severity: MEDIUM.**

**L5-11 · Horizontal chip rails communicate "more" only by accidental mid-word clipping — and the clip point drifts with width/zoom**
**Where:** Tasks category rail (TasksScreen.tsx:977–1014), report category rail (ReportFlagModal chipScroll :1050), filter-panel category rail (MapScreen `filterScroll` :2534), nearby-list tab rail — all `showsHorizontalScrollIndicator={false}`.
**What:** At 375: "Blocked path" cut mid-word (Tasks), 4th category a sliver (report), "Blocked path" clipped (filter panel), "Other (…" clipped (nearby). At 430 the cut lands on "Miss…"; at DT 1.3 on "B…". The cut chip is simultaneously the only scroll affordance and a sub-44 sliver target where it's cut.
**Why:** R6, R1, R4 and R3 each independently stumbled on it ("looks broken", "I must drag sideways"). Works-by-luck: whenever a width/scale combination lands a chip boundary at the viewport edge, the rail reads as complete and categories silently vanish.
**Evidence:** tasks__light__{375,430}__at-rest.png · flows/report__light__375__ready-submit.png · flows/map__light__375__{filter-open,nearby-modal}.png [web-real].
**Severity: MEDIUM** (systemic pattern; count once, call-sites listed).

**L5-12 · Tablet 834 is a stretched phone: no max-width system outside the Map**
**Where:** TasksScreen (sort chips flexGrow → ~450pt pills; card buttons ~320pt), HomeScreen (dead lower half; map-peek right ~25% renders un-tiled void at 834), SignInScreen (form ~1240px), OnboardingCards (full-width Next slab). Only MapScreen uses the width honestly.
**What/Why:** Portrait-locked `supportsTablet: true` makes 834 a first-class citizen; it renders without clipping (honest) but with comedy-width primary controls that hurt precision (a 450pt "Newest" pill is a 10° thumb sweep) and reading measure. The Home peek's un-tiled right band reads as a rendering failure to users (R5, R6-adjacent).
**Evidence:** base/tasks__light__834__at-rest.png · base/home__light__834__at-rest.png (void + pill-over-attribution) · base/signin-modal__light__834__at-rest.png · base/profile-signedout__dark__834__at-rest.png (ocean of nothing) [web-real].
**Severity: MEDIUM.**

**L5-13 · iPad posture is undecided: portrait lock + supportsTablet leaves multitasking/orientation behavior unspecified**
**Where:** app.json:13 (`"orientation": "portrait"`), :18 (`"supportsTablet": true`); no `requireFullScreen` key.
**What:** On iPad, iOS honors orientation locks only for full-screen apps; a multitasking-capable app (no `UIRequiresFullScreen`) is expected to support all sizes — meaning Split View/Slide Over panes down to ~320pt (where L5-05's tray overflow and the topRow wrap live), or App Store validation friction if the generated plist locks orientations without requiring full screen. Either way the audited "portrait 834" is not the whole iPad story.
**Why:** The audit's landscape-N/A premise is solid for iPhone; for iPad it rests on a build setting nobody has pinned down.
**Evidence:** app.json code-read [code-inferred; needs a Rory/EAS decision + device check — NEEDS-SKY-DEVICE].
**Severity: MEDIUM** (posture/decision risk, not a rendered defect).

---

### Findings — LOW

**L5-14 · Tasks action-row hitSlops overlap the 8pt gaps between Verify/Resolved/Reject/Details**
**Where:** TasksScreen.tsx:1579 (hitSlop 6 per button) vs `cardActionsRow` gap 8 (:2131). 6+6 > 8 → 4pt of overlapping hit zones between adjacent constructive/destructive buttons. RN resolves deterministically (later sibling wins) but the boundary is invisible and the comment believes slop *prevents* mis-fires. R4: "a wobble hits Reject when I want Details."
**Evidence:** code-read; base/tasks__light__430__at-rest.png (single-row layout) [code-inferred]. **Severity: LOW.**

**L5-15 · Select-mode affordance: the 22pt circle reads as the target (it isn't)**
**Where:** TasksScreen.tsx:2327 (`selectCheck` 22×22, a11y-hidden) — the *card* is the checkbox (role + state on the outer Pressable, :1591–1600).
**What:** Functionally exemplary (a giant target); perceptually inverted — R4 planned their taps around "hitting a small empty circle," i.e. the perceived affordance is 22pt even though the real one is the full card. A "tap anywhere on a card" hint line or a larger visual checkbox would align perception with reality.
**Evidence:** states/tasks__light__375__select-bulk.png · code-read [web-real]. **Severity: LOW** (communication, not size).

**L5-16 · Attribution strip: full-width band of ~11px third-party links across the bottom of every map**
**Where:** PlatformMap.web.tsx:531–534 + Leaflet default control. Sub-44 links, keyboard tab-stops, five SR stops (R2), and at 834 Home the "Open full map" pill overlaps the strip (links behind it dead). Legal text must stay; it doesn't have to be five separate stops at 11px on a phone (Leaflet supports collapsed/`prefix:false` presentations).
**Evidence:** every map/home capture; base/home__light__834__at-rest.png for the pill overlap [web-real]. **Severity: LOW.**

**L5-17 · Profile 834 dark: ghost "Tasks" tab-item bleeds under the header**
**Where:** capture base/profile-signedout__dark__834__at-rest.png (a faint "Tasks" label + badge fragment renders just below the nav header, top-center).
**What:** A web layer-order artifact (inactive-tab content or a duplicated tab item painting above the screen wash) seen in this one geometry; R5 saw it too. Not reproduced in other captures; likely dev-serve/web-only paint quirk.
**Evidence:** the capture [web-approximated, dev-serve]. **Severity: LOW** (verify once on a release web export; promote if it reproduces).

**L5-18 · CLASSIFICATION (mandated): R4's "square lightning-bolt button over the Home tab" on dark Home @375 = capture-environment artifact, NOT app UI**
**Where:** base/home__dark__375__at-rest.png, bottom-left — a dark rounded-square with a white bolt sitting on the Home tab item, partially covering its label.
**Determination:** It is Expo's dev-mode floating dev-menu launcher: it appears in exactly one capture of 410 (no sibling width/theme has it), the repo contains no bolt icon or bottom-left floating button (grep: no `Zap`/lightning in src/), and the serve mode is the dev bundle (`npm run web`, `__DEV__` true — orientation §7 #8). **Not an app finding.** Consequences worth recording: (a) in that capture it *does* occlude the Home tab — any pixel-diff or contrast tooling run on that file will inherit the artifact; (b) release-build captures (expo export) would eliminate the class. R4's underlying instinct ("something is squatting on my tab") was correct observation, wrong attribution.
**Evidence:** the capture + grep + ledger #8. **Severity: n/a (artifact)** — logged so Part 3 doesn't ship a "fix" for dev chrome.

---

### Safe areas, keyboard, reach — audit answers (c)(d)(e)(f)

- **Safe areas [code-inferred + captures]:** tab bar grows by `insets.bottom` with the label line-box explicitly reserved (RootNavigator.tsx:288–318 — the comment records the 62→68 clipping fix); Tasks' chrome pane pads `insets.top + sm` (TasksScreen.tsx:813); onboarding tops out at `max(insets.top, 48)` (OnboardingCards.tsx:285); Map overlay pads `tabBarHeight + 16` at the bottom (MapScreen.tsx:1259) so FABs clear the bar and indicator; W1 pageSheet double-inset was already corrected per the wave report. No capture shows content at y=0 or under the home-bar band. The one gap is the sheet footers (L5-10).
- **Keyboard avoidance [code-inferred, NEEDS-SKY-DEVICE]:** all five form surfaces use `KeyboardAvoidingView behavior={ios ? 'padding' : undefined}` — ReportFlagModal:443 (rooted at the backdrop so the 88% cap + sticky footer ride above the keyboard, with `automaticallyAdjustKeyboardInsets` on the body scroll :457), SignInScreen:91, FeedbackModal:177, AddressSearchModal:202, MapScreen save-place sheet :2205. The report sheet's submit remains pinned and reachable with the keyboard up by construction; mid-sheet description focus is inset-scrolled on iOS. Feedback's hidden email field (L5-08) is the only structural form defect found.
- **One-handed reach (R4's read, judged):** the money paths are genuinely thumb-first — Report pill and FABs bottom-right at 48pt, List pill bottom-right, bulk bar docked above the tabs, report sheet CTAs pinned bottom even at 430. The counterweights: the entire map toolbar + filter panel are top-anchored with no bottom Apply/Done (an intentional map-first layout, but it prices every filter decision at a regrip on 430/Pro Max), the drawer's five items occupy only the top half of its rail, and the hamburger swaps corners between Home (top-right) and shared headers (top-left). None of these are size violations; they are the reach-cost profile Part 3 should weigh (a bottom "Done" on the filter panel would collapse most of it).
- **Tablet 834 (f):** portrait-only per app.json; layout stretches honestly with no clipping or overlap found beyond L5-12's craft issues and the home-peek tile void; the half-visible "2" cluster at the 834 map edge is normal map-viewport semantics (pannable), NOT a clip defect — recorded here so it isn't double-counted from R5's read.

---

### PROTECT nominations (L5)

1. **The ReportFlagModal sheet architecture** — KAV rooted at the backdrop, 88% cap on the KAV (with the comment explaining *why* it must live there), shrink-to-content card, sticky 44pt footer, 44pt chips/severity circles, uncapped description input. It survived every width, both themes, and held its footer at 200% zoom. This is the app's device-integrity crown jewel (ReportFlagModal.tsx:430–460, 1040–1300).
2. **The Tasks chrome 44pt sweep** — every control from search-clear to sort chips carries an explicit minHeight 44 with a WCAG breadcrumb comment, plus `isCompactLayout` (≤375pt OR ≥1.15 fontScale → deliberate 2-row action stack, TasksScreen.tsx:119) pinned by 17 structural test assertions. Do not let a redesign melt these.
3. **The tab bar's safe-area math** — `68 + insets.bottom` with the label line-box fix documented in place (RootNavigator.tsx:288–318).
4. **ScreenHeader's deterministic title auto-fit** — DT-aware (fontScale-capped estimate), web-safe (doesn't rely on `adjustsFontSizeToFit`), converges in one layout pass (ui/ScreenHeader.tsx:29–110).
5. **The DT guard suite** (`dynamicTypeGuard.test.ts` Rules 1–4 + Clusters A/B) and **AppText's uncapped body law** — the reason this audit found reflow, not carnage, at 1.3×.
6. **The Map empty-filters recovery card** — 44pt per-axis quick chips + Reset (R1: "best state in the app").
7. **The map action bar's 44×44 buttons with Pattern-B pins** — the buttons can overflow but can never be vertically crushed (MapScreen.tsx:2461–2476).

### Copy observations (L5)

- **"Report anonymously" as a button label** is 19 characters doing the work of 6; it is the direct driver of the zoom-2.0 pill overflow and the 1.3 two-line squeeze (dt/report captures). "Submit report" (title already establishes anonymity, and the a11y label "Submit anonymous flag report" already differs) would buy ~40% width headroom on the app's most important button.
- **The status pill keeps asserting "5 flags nearby" in permission-denied and stale-region states** (states/map__*__permission-denied.png) — at device-integrity level this is the pill earning its zoom-occluding position with false information; whatever Part 3 does about L5-01 should also make this copy state-aware (R1's #1 trust hit).
- **Sort labels "Newest / Oldest / Severity"** truncate to single letters on web at high zoom; one-word labels that stay distinct at 4 characters ("New / Old / Sever…") — or letting the row wrap — would keep the control legible where `adjustsFontSizeToFit` doesn't exist.

### PROBE-REQUESTs

- **PROBE-REQUEST (device, DT ramp):** iPhone (mini + Pro Max), Settings text size stepped L → XXL → AX3: (1) does the nav-header title collide with the Feedback pill at the capped 1.5/1.6 (the web-2.0 "MapFeedback" state)? (2) does "Report anonymously" stay inside its pill at label-cap 1.6 at 375/390? (3) long-press a tab item — is there any large-content affordance at all?
- **PROBE-REQUEST (device, Home peek):** iOS release/TestFlight build — tap the Home map peek's center. Does "Open the full map" fire, or does react-native-maps swallow the tap (L5-06)? Also attempt a drag on the peek.
- **PROBE-REQUEST (iPad):** open the app in Split View at the narrowest pane. Report: does the build allow multitasking at all (requireFullScreen?), and if yes, capture the Map action bar (L5-05 overflow) and Tasks at ~320pt.
- **PROBE-REQUEST (harness):** one release-mode web export (`npx expo export -p web` + static serve) capture pass of Home dark 375 + Profile dark 834 to retire the two dev-serve artifacts (L5-17, L5-18) from the evidence base.


---

## L6 — Accessibility as the product


HEAD `82e738b` · read-only · evidence = `assets/a11y-tree/*.txt` (primary) + `assets/{dt,flows,map,states,glassmode}/` captures + source at HEAD + `partials/arbiter.md` (all ratios [arbiter-measured]). Baseline reads weighed: R2 (blind, VoiceOver-primary), R3 (low-vision ×2), R1 severity-comprehension notes. Every R2 tree claim was re-verified against source and the installed `react-native-web@0.21.2` before adoption (classification table below).

## Lens verdict

**Can a blind user FIND barriers today? On native: yes — genuinely, by design.** The SR auto-open (`MapScreen.tsx:352-357`) lands them in NearbyFlagsModal, whose rows announce category + severity + spoken distance + status + description in one breath, whose open announces the count, and whose "List" FAB is a labeled re-entry. **On web — the only surface a guest can use today — the same user can still find, but the app has gone silent and noisy at once:** every announcement is a no-op, every selected/checked/expanded state is dropped, every decorative icon says "image," and the list's one action dead-ends in a visual callout. **Can a blind user CONTRIBUTE? Native: yes, with two real holes** (no success confirmation on the anonymous path; location spoken only as raw coordinates). **Web: completable but unconfirmable — R2's "submitting blind in the worst sense" is the accurate description of the shipped web form**, because tapping a category chip produces zero feedback of any kind. **A low-vision ×2 user completes FIND but the CONTRIBUTE footer degrades to an ambiguous white-on-white blur between Cancel and Submit** [web-approximated]. The bitter, fixable paradox: this codebase's accessibility layer is its single best-engineered subsystem — hooks, announcements, dual iOS/Android wiring, modal containment, severity vocabulary — **written fluently in the pre-0.71 React-Native a11y dialect that `react-native-web@0.21.2` no longer translates.** Four of six a11y subsystems (state, announcements, focus-move, decorative hiding) are silently sheared off at the web bundler. For a product whose brand promise is "born accessible," shipping the web app without its accessibility engine mounted is a mission breach, not a polish item — and it is one systematic fix away (the modern `aria-*` props RN ≥0.71 supports on all three platforms; react-navigation's own tab bar already does this, which is why it is the only thing in the trees showing `[selected]`).

---

## SR traversal script — FIND (guest, web-as-shipped, from the trees)

Steps cite `a11y-tree/map-first-arrival__light__390.txt` (`mfa:` line) / `map__light__390.txt` (`map:`) / source. ▸ = what a web SR user actually gets; ✦ = native difference [code-inferred, NEEDS-SKY-DEVICE].

0. *(Home, code-read — no tree captured)* Land on Home tab: menu/Feedback buttons labeled; rows announce "No ramp, Minor, 450 m away" (word-only severity, **status dropped when distance present** — `HomeScreen.tsx:320-324`); "Open the full map" button (`:261-262`); "Report a barrier" pill (`:350-351`).
1. Arrive on FullMap → **auto-list fires** (ledger #15: `isScreenReaderEnabled` resolves TRUE for every web user — `MapScreen.tsx:352-357`). ▸ NO announcement that a list opened: `NearbyFlagsModal.tsx:73`'s "5 flags nearby. Sorted by distance." is `announceForAccessibility` → **empty function on RN-web** (`node_modules/react-native-web/dist/exports/AccessibilityInfo/index.js`). ✦ Native announces it ~600ms after open.
2. Reading order before the dialog (mfa:1-46): menu → `heading "Map" [level=1]` → Feedback → **one pin** `button "No ramp — severity 4"` (status/anon/severity-word missing — see L6-12) → Zoom in/out → **five attribution stops** ("Leaflet", "©", "OpenStreetMap", "contributors ©", "CARTO" — L6-22) → `text: 5 flags nearby` (liveRegion pill, `MapScreen.tsx:1270-1284`) → toolbar, all labeled: "Search by address" / "Map legend" / "Toggle filters" (has `expanded` state in code `:1330` — dropped on web, L6-01) / "Minimum severity: all" / "Category filter: all categories" / "Refresh flags" / "Recenter on me" → "Open nearby flags list" → tablist with **no tab selected** (mfa:34-46, L6-18).
3. The dialog (mfa:47-62): **unnamed** `dialog:` (L6-16) → `heading "Nearby flags"` → "Close nearby flags list" → unlabeled `img` (search icon — L6-11) → "Search flags" textbox → category tabs with live counts ("Filter by No ramp, 2 flags") but ▸ **no [selected]** (code sets it, `NearbyFlagsModal.tsx:236,252` — L6-01) → five rows, each ONE button: *"No ramp, severity 4, 297 meters away. Status verified. No ramp at the corner — wheelchair users have to detour."* (`NearbyFlagsModal.tsx:125-137`) — the best single node in the app. Severity spoken as a bare number, no word, no "of 5" (L6-14). ▸ On web the RN-web Modal DOES emit `role=dialog` + `aria-modal=true` + a keyboard focus trap (`ModalContent.js:42-44`), so a real VoiceOver/NVDA session is *confined here*, not 20 nodes deep — R2's raw-tree reading overstated the wandering (see claims table).
4. Filter: cycle buttons announce each state ✦ native only (`MapScreen.tsx:506-551`); panel chips carry `selected` states in code (`:1661,1693,1752,1786,1840`) ▸ all dropped on web; heat switch `role=switch` + `checked` `:1721-1723` ▸ checked dropped. Filter results DO reach web SRs one way: the status pill's liveRegion re-speaks "N of M shown" (`:1275-1283`). Empty-filter recovery card = `role=alert` + per-axis one-tap clears with hints (`:1936-1973`) — announces on mount even on web ✓.
5. Perceive severity/trust: pin → Leaflet popup "Severity 4 · verified" (web, `PlatformMap.web.tsx:395`); "Map legend" → LegendModal rows announce *"Severity 4, Significant. Deep orange. Hard or unsafe for most users."* (`LegendModal.tsx:63`) — the number+word+color-name law, fully honored. **The legend has no Status section** — "verified" is never defined anywhere (copy observation).
6. Select a flag from the list → ▸✦ list closes, map flies, **visual callout opens with no focus move and no detail sheet** — the accessible path ends in a cul-de-sac (`MapScreen.tsx:2168-2180`, L6-05). Re-entry exists: "Open nearby flags list" (map:31-33) ✓.
7. Async states: locating — announce ✦ native (`:993`) + banner liveRegion (mount-timed, unreliable on web); permission-denied — `role=alert` banner (`:2004-2014`) + announce ✦; load-error — labeled retry button with `busy` state (`:1901-1927`).

**FIND verdict:** native = a real list-first design that works end-to-end minus the callout dead-end; web = reachable and readable but silent (no announcements, no states) — usable by a patient SR user who discovers the list, unverifiable for one who needs feedback.

## SR traversal script — CONTRIBUTE (guest anon path, web-as-shipped)

Cites `a11y-tree/report__light__390.txt` (`rep:`) + `ReportFlagModal.tsx`.

1. **Entry:** the ONLY guest entry is Home's "Report a barrier" pill (`HomeScreen.tsx:346-355` → `FullMap {openReport:true}` → `MapScreen.tsx:1094-1097`). The Map screen itself offers a guest **nothing**: the Report FAB is auth-gated (`MapScreen.tsx:2059`) and the long-press/right-click drop-pin **also bails for guests** (`:1216-1218` — orientation §3's "or map long-press" is wrong for guests at HEAD). R2's "I cannot start a report" was packet-limited (he had no Home tree) — the entry exists, on the default tab, properly labeled — but once ON the map an SR guest has no report affordance and no signpost back (L6-15 note).
2. Sheet opens (third stacked layer over map + auto-list). ▸ Web: report modal is the active RN-web Modal → `role=dialog` + `aria-modal` + focus trap take over (rep:62); the stale Nearby content at rep:47-61 is outside the aria-modal dialog and skipped by conforming SRs. Dialog is **unnamed** (L6-16). ✦ Native: `useFocusOnOpen` moves VoiceOver to the title (`ReportFlagModal.tsx:85,459`); `accessibilityViewIsModal` on Modal + card (`:434,447`).
3. `heading "Report anonymously"` → unlabeled `img` (MapPin, hidden props dropped on web — L6-11) → `text: at 49.88740, -119.49250` — **the only location confirmation; nothing to hear, set, or change it** (`:462-469`, L6-15) → `alert "Reporting anonymously. Your identity is not stored."` (`:477-490`, role=alert announces on mount, works on web ✓) → "Sign in" link (`:491-499`).
4. Category (rep:71-76): six `'button "Category: No ramp"'` etc. — labels good, `selected`+`disabled` states set in code (`:578`) ▸ **dropped on web; no announcement either → zero feedback on tap** (L6-01+L6-02 = the flow's broken feedback loop). ✦ Native announces "selected" ✓.
5. Severity (rep:78-85): *"Severity 3: Moderate — Hard for many users."* labels (`:610`) — the app's best control vocabulary; state `:611` ▸ dropped; **but** the inline hint is a `liveRegion="polite"` element whose label re-renders (`:648-657`) → aria-live works on web → **severity choice IS confirmed on web** — the only field that is. Check-tick correctly decorative (`:620-629`). Severity ≥4 photo-nudge announce ✦ (`:114-122`) + liveRegion card (`:871-887`).
6. Description: labeled textbox + "Optional. Up to 2000 characters." hint (`:681-682`; hints native-only — RN-web drops `accessibilityHint`); live counter labeled `:695`.
7. Photo: **anon = no photo affordance at all** — nudge text with a second "Sign in" link spliced mid-sentence (rep:89-91, `:702-710`).
8. Submit: `button "Submit anonymous flag report"` (`:982`) + "Cancel and close" (`:968`) — pinned footer, reachable, correctly named. Anon rate-limit failure is web-visible via `notify` (`:297-311`) ✓.
9. **After the tap: silence.** Anon path = `reset → onCreated → onClose` — **no success message for anyone, on any platform** (`:314-334`; a native haptic is the sole cue). Auth path announces "Report filed." ✦ native only (`:409-413`). The sheet closes onto the stale list; the user's report is nowhere announced, and the map behind refreshes invisibly (L6-03).

**CONTRIBUTE verdict:** native auth = strong minus location + confirmation; native anon = strong minus confirmation; web = every field reachable, exactly one (severity) confirmable, submission outcome unknowable.

---

## R2/R3 claim classification (adversarial re-verification)

| Claim (reader) | Verdict at HEAD | Classification |
|---|---|---|
| No selected state on report category/severity, Tasks chips, sort tabs, list tabs (R2) | Code SETS `accessibilityState` everywhere claimed (`ReportFlagModal.tsx:578,611`; `TasksScreen.tsx:957,990,1005,1038`; `NearbyFlagsModal.tsx:236,252`; `MapScreen.tsx:1330,1661,1693,1723,1752,1786,1840`). `react-native-web@0.21.2` translates NONE of it (`createDOMProps/index.js` — zero `accessibilityState` references; only new-dialect `aria-*`/flat props map). react-navigation emits `aria-selected` directly (`BottomTabItem.js:142`) — hence the tab bar's `[selected]`. | **TRUE on web · app-fixable** (adopt RN ≥0.71 `aria-selected/checked/expanded/busy` alongside) · native correct [code-inferred, NEEDS-SKY-DEVICE] |
| "Modals don't contain me… form starts ~60 swipes in" (R2) | All overlays are RN `Modal`s → RN-web emits `role=dialog` + `aria-modal=true` + keyboard focus trap on the ACTIVE modal (`Modal/ModalContent.js:42-44`, `ModalFocusTrap`). Conforming SRs confine the virtual cursor; the raw ariaSnapshot ignores aria-modal. Background is not aria-hidden, so partial leakage in non-conforming combos is possible. | **Mostly RN-web-snapshot artifact on web**; genuinely un-named dialogs = TRUE (L6-16). Native containment ✓ (viewIsModal ×~25 + native Modal) except SignIn (L6-19) |
| Password field "not a secure field" (R2) | `secureTextEntry` present (`SignInScreen.tsx:162`) → `<input type="password">` on web; ARIA role for password inputs IS `textbox`. | **Snapshot artifact — dismissed** |
| Onboarding exposes all 5 slides at once (R2) | Pager hides nothing (`OnboardingCards.tsx:299-320` — no aria-hidden/importantForAccessibility on inactive cards); position announce `:181` is web-no-op. | **TRUE on web AND native** [code-inferred] — L6-13 |
| Tasks action buttons nested in card button; card label drops description/distance (R2) | Both true in code (`TasksScreen.tsx:1591-1607` accessible-by-default Pressable wraps 4 `PressableScale` buttons `:1574-1588`; label `:1508`). | **TRUE · app-structural** — L6-04 |
| "No Report button in any map tree" (R2) | True for guest MAP trees (FAB `MapScreen.tsx:2059`, long-press `:1218` both auth-gated); Home pill exists + labeled (`HomeScreen.tsx:350-351`) but wasn't in R2's packet. | **Partially packet-limited** — folded into L6-15/CONTRIBUTE script |
| Legend "defines only 3 categories" (R1) | `CATEGORY_ORDER.map` renders all 6 (`LegendModal.tsx:89-112`) — capture caught the fold. | **Artifact — dismissed** (scroll cue issue belongs to L2/L3) |
| ×2: submit overflows pill, banner shreds, sort pills = "N…/O…/S…", "MapFeedback" overlap (R3) | Re-verified with my own eyes: `dt/report__light__390__dt-zoom-2.png`, `dt/tasks__light__390__dt-zoom-2.png`, `dt/map__light__390__dt-zoom-2.png`. | **TRUE [web-approximated]** — L6-06; native truth NEEDS-SKY-DEVICE |

---

## Findings

### CRITICAL

**L6-01 · The web build drops the app's entire selection-state layer — the CONTRIBUTE form is unconfirmable and every filter is stateless for web SR users**
**Where:** systemic — `react-native-web@0.21.2` `createDOMProps` (no `accessibilityState` handling) versus `accessibilityState={{selected|checked|expanded|busy}}` at `ReportFlagModal.tsx:531,578,611,747,805,934`, `TasksScreen.tsx:868,957,967,990,1005,1038,1320+`, `MapScreen.tsx:1330,1535,1602,1661,1693,1723,1752,1786,1840,1913,2085`, `NearbyFlagsModal.tsx:236,252`.
**What:** On web, no chip, tab, switch, or toggle anywhere in the app exposes its state. The report form's category buttons give a blind user literally zero feedback on activation (no state to re-check, and — L6-02 — no announcement either); Tasks scope/category/sort, the map's whole filter panel, and the Nearby list's category tabs are equally mute. The trees prove it: the only `[selected]` anywhere is react-navigation's tab bar, which uses the modern `aria-selected` prop (`BottomTabItem.js:142`).
**Why it matters (mission cost):** Web is the ONLY surface a guest can use today, and anonymous reporting is by the code's own comment "a web flow" (`ReportFlagModal.tsx:297`). A blind contributor on the shipped web app must submit a report whose category they cannot confirm, onto a defaulted form ("No ramp", severity 3) — the app's data-trust promise is broken at its accessible front door. R2: *"I can fire the submit button but can never confirm what I'm submitting."*
**Evidence:** `a11y-tree/report__light__390.txt:71-84` (no [selected] anywhere), `tasks__light__390.txt:11-22`, `map-first-arrival__light__390.txt:53-57`; `node_modules/react-native-web/dist/modules/createDOMProps/index.js` (0 hits); severity hint counter-example that live-regions DO translate (`ReportFlagModal.tsx:648-657`). [web-truth, code-verified; native correct — NEEDS-SKY-DEVICE to confirm on device]
**Severity: CRITICAL** (web core-flow SR feedback loop absent; native unaffected). Fix shape: add RN ≥0.71 `aria-selected`/`aria-checked`/`aria-expanded`/`aria-busy` beside the existing props — they map to the same native states AND to DOM.

### HIGH

**L6-02 · `announceForAccessibility` and `setAccessibilityFocus` are empty functions on RN-web — the app's announcement + focus layer is silent on web**
**Where:** `react-native-web/dist/exports/AccessibilityInfo/index.js` (`announceForAccessibility(){}`, `setAccessibilityFocus(){}`) versus ~40 call sites: `NearbyFlagsModal.tsx:73` (list count), `MapScreen.tsx:509,544,655,793,824,959,993,1002`, `TasksScreen.tsx:217,296,382,422,533,591,654,660,724`, `ReportFlagModal.tsx:117,179,409`, `glassMode.ts:80`, `FlashBanner.tsx:60`, `OnboardingCards.tsx:181`, `SignInScreen.tsx:63` — and every `useFocusOnOpen` (`accessibility.ts:35-48`).
**What:** Every announcement the app carefully wires for iOS (with `accessibilityLiveRegion` twins for Android) is a no-op on web. What survives on web: liveRegions on persistent elements (map status pill, severity hint, bulk count) and `role=alert` mounts (anon banner, permission-denied, empty-filters). What dies: the auto-list's count, filter-cycle confirmations, "Finding your location…", template-applied, selection-mode entry, sort/scope changes, points flashes, "Report filed.", card-position announcements, glass-flip confirmation.
**Why it matters:** The web app *behaves* SR-aware (it even auto-opens the list because it thinks everyone runs a screen reader — ledger #15) while delivering none of the speech that makes those behaviors legible. The mission cost compounds L6-01: a blind web contributor acts into silence.
**Evidence:** file quoted above; contrast with working liveRegion pairs (`MapScreen.tsx:1275`, `ReportFlagModal.tsx:652`). [web-truth, code-verified; app-fixable via a tiny web announce shim — a visually-hidden `aria-live` node — plus keeping the existing dual wiring]
**Severity: HIGH** (partial liveRegion coverage keeps it out of CRITICAL; together with L6-01 it is what makes L6-01 critical).

**L6-03 · Submitting a report ends in silence — no success confirmation exists on the anonymous path for anyone, and the auth confirmation is native-only**
**Where:** `ReportFlagModal.tsx:314-334` (anon: `reset(); onCreated(); onClose();` — no notify, no announce; `hapticNotify` is the only cue, native-only) versus `:409-413` (auth: announce "Report filed." — no-op on web, no visual twin anywhere).
**What:** The modal closes; nothing tells the reporter — sighted or blind, web or native — that their barrier report now exists. R6 independently flagged the same void ("nothing tells me who sees it or what happens next").
**Why it matters:** CONTRIBUTE is the mission's second half. A blind guest (the anon flow's core persona) files a report and gets zero acknowledgment; uncertainty is precisely what stops disabled contributors from filing again. This is also the trust story: the app asks strangers to believe reports matter, then shrugs when one is filed.
**Evidence:** code above; §3 orientation flow map step 9 (post-submit "code-inferred only"). [code-verified; web + native]
**Severity: HIGH.** Fix shape: a `notify()`/flash + announce pair on BOTH paths (the FlashBanner pattern already exists).

**L6-04 · Tasks card actions (Verify/Resolved/Reject/Details) are interactive children of an `accessible` parent button — native screen readers likely cannot reach them**
**Where:** `TasksScreen.tsx:1591-1607` (card `Pressable`, accessible-by-default, `accessibilityLabel` `:1508-1511`) containing four `PressableScale` action buttons `:1574-1588`.
**What:** On iOS, `accessible={true}` makes the card a single VoiceOver leaf — descendants are not focusable; Android groups similarly. The SR path to verifying a flag then shrinks to: long-press (hinted: "Long-press to select multiple" `:1605`) → selection mode → bulk bar (whose buttons are siblings, reachable, and announced `:422,1298`) — or nothing, since "View flag details" is also nested and the card tap opens the Map, not details. On web the buttons ARE reachable (nested `<button>`s — invalid HTML with double-activation ambiguity, `tasks__light__390.txt:30-59`).
**Why it matters:** Verification is the app's trust engine — the mechanism R1 and R6 both said decides whether any severity badge can be believed. If blind users can't verify or open details from a card, the community-moderation job is sighted-only on the primary triage surface.
**Evidence:** tree `tasks__light__390.txt:30-35` (nested buttons); code refs above. [code-inferred — the iOS flattening behavior is the documented RN pattern; **NEEDS-SKY-DEVICE** (this is the single most important VoiceOver device-check in the audit)]
**Severity: HIGH.** Fix shape: sibling action row outside the accessible card wrapper, or `accessible={false}` on the card with a labeled inner summary node.

**L6-05 · The accessible list's only action dead-ends in the visual layer: select a flag → list closes → un-focus-managed callout on the map**
**Where:** `MapScreen.tsx:2168-2180` (`onSelectFlag`: close modal, `animateTo`, `showCallout` after 350ms); web popup `PlatformMap.web.tsx:377-409`; native callout `PlatformMap.tsx:239-277`.
**What:** For an SR user the flow reads: choose "No ramp, severity 4, 297 meters away…" → the accessible surface disappears → focus is dropped somewhere on the map screen → a callout bubble opens that no focus move targets (web: Leaflet popup DOM appended mid-map; native: `react-native-maps` Callout, whose SR reachability is notoriously unreliable). There is no "open details" from the list, even though `FlagDetailModal` exists and is SR-complete (`useFocusOnOpen`, `severityA11y` at `FlagDetailModal.tsx:125,837`).
**Why it matters:** R1 (sighted) called the callout a cul-de-sac; for a blind user it is a trapdoor — the app's best surface hands off to its worst. The FIND job ends at "understand this barrier," and that last step silently exits the accessible path.
**Evidence:** code above; `map-first-arrival__light__390.txt:58-62` (rows promise "Closes the list and centers the map on this flag" — the hint honestly describes the dead-end). [code-verified; native callout behavior NEEDS-SKY-DEVICE]
**Severity: HIGH.** Fix shape: route `onSelectFlag` into FlagDetailModal (or keep the map fly-to for sighted users and open details when `screenReaderOn`).

**L6-06 · At ×2 text scale the CONTRIBUTE footer becomes ambiguous: the submit label escapes its pill toward Cancel; the privacy banner shreds mid-word; the form drops below the fold**
**Where:** `ReportFlagModal.tsx:960-996` footer (`submitText` variant=label, `:995,1232`), anon banner `:477-490`; evidence `dt/report__{light,dark}__390__dt-zoom-2.png` (verified directly: white "Report anonymously" renders outside the blue `ctaFill` pill on both sides — white-on-white against the sheet — and the banner wraps "Reporti/ng/anonym/ously" one fragment per line).
**What:** WCAG 1.4.4 stress at 200%: the core action's boundary dissolves (R3: "I genuinely could not tell whether I was about to tap Report anonymously or Cancel"), and the escaped white label sits on an unarbitrated white surface (~1:1 — the arbiter's `ctaSolid + white` proof only holds inside the pill).
**Why it matters:** Low-vision large-type users are a core constituency of this product. The one flow the mission most needs from them collapses exactly at the confirm step.
**Evidence:** capture above + `dt/tasks__light__390__dt-zoom-2.png` (sort pills "N…/O…/S…", title "Revi…") + `dt/map__light__390__dt-zoom-2.png` ("MapFeedback" title/button overlap; toolbar clipped to 3.5 icons — horizontally scrollable per `MapScreen.tsx:1293-1298` but with zero scroll affordance). [web-approximated — browser zoom proxy; native true-DT NEEDS-SKY-DEVICE; native caps (label 1.6) will soften but not obviously fix the footer overflow]
**Severity: HIGH** (report footer) with the Tasks/map ×2 walls as riders.

**L6-07 · [arbiter-measured] Map-pin boundaries fail on light tiles: white ring 1.00:1, sev1–3 fills 1.57–2.78, anon gray 2.54 vs 3.0 — the FIND surface's tap targets can visually vanish for low-vision iOS users in light mode**
**Where:** `PlatformMap.web.tsx:116-127` (2.5px `#fff` ring), `PlatformMap.tsx:228` (anon `#9CA3AF`); arbiter §C tileExtremes rows; `assets/arbiter/audit-stacks-output.txt`.
**What:** GLASS.md §12 rule 4's own law — "a white ring vanishes on white tiles… use regime-decomposed unions" — was applied to clusters and heat badges but never to pins. Web is exempt in practice (CartoDB dark tiles always; ring measures 21:1) — the failing arm models iOS Apple light tiles.
**Why it matters (mission cost):** an iOS light-mode user with low vision loses the low-severity pins (the yellows/ambers) into the tile background — the map under-reports barriers to exactly the users the map exists for. The severity ramp's low end disappearing first also skews perceived risk downward.
**Evidence:** arbiter §D-4 (concurring HIGH); the shipped precedent fix = the 1px `#0F1B2D` hairline union already on clusters (`PlatformMap.web.tsx:175`). Tempering: SR labels unaffected; the list twin carries everything; dark tiles (the web reality and iOS dark mode) pass.
**Severity: HIGH** [arbiter-measured + code-inferred; **NEEDS-SKY-DEVICE** — not CRITICAL because device-conditional, unprovable on the audited surface, and twin-mitigated].

**L6-08 · [arbiter-measured] RecentlyViewedRow's white severity digit fails AA on severity fills 1–4 (1.57 / 2.15 / 2.78 / 3.61 vs 4.5, both themes) — the last white-on-midramp holdout**
**Where:** `RecentlyViewedRow.tsx:139,202-204` (`textOnBrand` white, 12pt bold) — the exact pattern `92a2be6` forked away everywhere else (`severity[n].textOnColor` ink `#0F1B2D` on 1–4).
**What/Why:** For signed-in low-vision users the chip's primary severity signal dissolves (sev1 digit at 1.57 is barely there). Mission cost: severity comprehension — the thing the whole vocabulary system exists to protect — fails on the personalization surface. Tempering (why not CRITICAL): auth-gated Profile row, and the SR name carries severity as a number (`:130-133`).
**Evidence:** arbiter §C rows 1-4 light+dark; §D-1 (HIGH, concur); lab-mockup `parked/` probes. [arbiter-measured; visual = lab-mockup + NEEDS-SKY-DEVICE]
**Severity: HIGH.**

### MEDIUM

**L6-09 · [arbiter-measured] HeatmapLegend swatches heat1–4 fail 3:1 against the legend's own surface (1.01/1.48/1.84/2.47; heat5 passes at 3.17)** — the decode key for the heat layer is invisible at its worst exactly over the hottest cells (heat1 vs sev5-red composite = 1.01:1). Access framing: the heatmap is an opt-in, default-OFF secondary FIND mode (`MapScreen.tsx:370`), each swatch sits beside "N Label" text, and the SR label names the colors (`HeatmapLegend.tsx:28,46`) — so MEDIUM, not HIGH. The ratified fix pattern (1px `#0F1B2D` hairline union) already exists on heat badges. **Where:** `HeatmapLegend.tsx:45,87-91`. **Evidence:** arbiter §C legend rows, §D-3 concur. [arbiter-measured]

**L6-10 · [arbiter-measured] RV severity-dot boundary melts: light sev1–3 (1.53–2.75, both engineered arms) and dark sev5 (2.41/2.39)** — on light sev1 the digit (1.57) AND the disc edge (1.55) fail together, dissolving the cue entirely for low-vision signed-in users. Same hairline fix family as L6-09. **Where:** `RecentlyViewedRow.tsx:139` (no edge hairline). **Evidence:** arbiter §C boundary rows, §D-2 concur. [arbiter-measured; auth-gated]

**L6-11 · Decorative-hiding props don't translate on web — SR users get "image" noise everywhere, starting with the very first node on Tasks**
**Where:** `decorativeProps` (`accessibility.ts:14-18`: `accessible:false` + `importantForAccessibility` + `accessibilityElementsHidden` — all three unmapped in RN-web 0.21, which only honors `aria-hidden`/`accessibilityHidden`) and its many manual twins: `ScreenStage.tsx:74-76` + grain `Image :110` (= the anonymous `img` that OPENS the Tasks screen, `tasks__light__390.txt:1`), onboarding slide icons (`onboarding__light__390.txt:3,7,11,15,19`), report MapPin (`report:64`), Nearby search icon (`mfa:50`), profile placeholder (`profile-signedout:5`), tab icons ×2 per tab.
**Why it matters:** R2: "the Tasks screen literally opens on 'image'." First impressions for blind web users are of an unlabeled, half-built app — the opposite of the brand. On native the props work.
**Severity: MEDIUM** (web; app-fixable: add `aria-hidden` to `decorativeProps` and let lucide icons take `aria-hidden` — one shared-object edit covers most sites). [web-truth, code-verified]

**L6-12 · Web pin names silently lose status/anonymity and the severity word: Leaflet drops `alt` for DivIcon markers, so the name falls back to the terser `title`**
**Where:** `PlatformMap.web.tsx:371` (the full mirrored label: "…severity 4, verified…, Open for details.") vs `:372` (title "No ramp — severity 4") — the tree proves the fallback: `map__light__390.txt:5` announces `button "No ramp — severity 4"`, no status, no "Open for details". Leaflet applies the `alt` option only to `L.Icon` `<img>` markers; these pins are `L.DivIcon`s (`:119`). Native pins are richer AND better: `severityA11y` gives "severity 4 of 5, Significant" + status word + anon (`PlatformMap.tsx:237`).
**Why it matters:** trust data (verified vs open) is exactly what a blind user needs before detouring; the web pin drops it while the code believes it shipped. Also: only viewport pins exist in the tree at all (1 of "5 nearby" — the count/pin mismatch that confused every sighted reader confuses SR users identically).
**Severity: MEDIUM** (the auto-opened list twin carries the full data; the bug is real but mitigated by design). App-fixable: set the aria-label on the DivIcon element (e.g. via `html` root attrs or `marker.getElement()` on add). [web-truth, tree+code-verified]

**L6-13 · Onboarding pager exposes all five slides at once while its buttons claim "Card 1 of 5"; position announcements are web-silent**
**Where:** `OnboardingCards.tsx:299-320` (horizontal pager, inactive cards never hidden), `:181` (announce — RN-web no-op), Next label `:? ("Next. Card 1 of 5.")` per `onboarding__light__390.txt:24`.
**What/Why:** An SR user "sees" all five cards then hears "Card 1 of 5" — the model and the announcement contradict (R2's #4 friction). True on native too [code-inferred]: ScrollView off-screen children remain traversable. The content itself is excellent ("Back. Disabled on first card." is the best disabled-state label in the audit). Motor note: Next/Back/Skip buttons mean no swipe dependency ✓.
**Severity: MEDIUM.** Fix shape: `aria-hidden`/`importantForAccessibility="no-hide-descendants"` (both dialects) on non-active cards.

**L6-14 · Severity's spoken grammar is inconsistent across FIND surfaces — the centralized `severityA11y` helper ("severity N of 5, Word") has only 3 adopters**
**Where:** `a11yText.ts:17-19` (the correct phrase) used by `PlatformMap.tsx:237`, `MyWatchedModal.tsx:225`, `FlagDetailModal.tsx:837` — versus bare "severity N" in NearbyFlagsModal rows (`:126`) and Tasks cards (`TasksScreen.tsx:1508`), word-only (no number, and status dropped when distance present) on Home rows (`HomeScreen.tsx:320-324`), and number-only web pins (L6-12). Visible text mirrors the drift (Tasks "1 · Minor" vs list "Severity 4 · verified" vs Home "Minor · open").
**Why it matters:** A blind user in the map's accessible twin hears "severity 4" with no word and no scale — they must have memorized the legend to know 4 of what, in which direction (R2: "the plain-language scale only exists on Tasks and in the report form"; R6 took until the report form to decode severity). For the surface that IS the product's answer to the map, the vocabulary law ("number AND word everywhere") is honored visually and broken aurally. Companion gap: **the Map legend has no Status section** — "Verified", the trust word on every row, is defined nowhere (`LegendModal.tsx` renders Severity/Categories/Heat map only; orientation §3's "status vocab" claim is stale at HEAD).
**Severity: MEDIUM.** Fix shape: adopt `severityA11y` in NearbyFlagsModal/TasksScreen/HomeScreen/web-pin labels; add a Status block to the legend.

**L6-15 · The report's location story is coordinates-only: nothing to hear, verify, or change — and a guest ON the map has no report entry at all**
**Where:** `ReportFlagModal.tsx:462-469` ("at 49.88740, -119.49250", mono; no address, no "use my current location" control, no address entry); guest gates `MapScreen.tsx:2059` (FAB) + `:1216-1218` (long-press bails for guests).
**What/Why:** For a blind reporter the coordinates are unverifiable noise — they cannot confirm the pin is where they stand (GPS drift is invisible), and if the fix is wrong there is no recovery. For everyone (R6, R2, observation #5) it reads as "a nameless spot." The one guest entry (Home pill) is labeled and works, but the map screen — where an SR guest is auto-delivered to the list and most likely to decide "I should report this" — offers no path and no signpost back to Home.
**Severity: MEDIUM** (HIGH-adjacent; the designed model "report where you stand" keeps the flow functional). Fix shape: reverse-geocoded line ("near Main St & 3rd") + announce when location resolves; consider a guest-visible map entry that routes through the same anon sheet.

**L6-16 · Every dialog on web is unnamed, and modal focus-move is a web no-op — SR users land in anonymous containers**
**Where:** trees: `dialog:` with no name ×4 (onboarding, signin, nearby-first-arrival, report). RN-web `ModalContent` spreads rest props → passing `accessibilityLabel`/`aria-label` to `<Modal>` WOULD name it (verified in `ModalContent.js:41-45`); no call site does. `useFocusOnOpen` relies on `setAccessibilityFocus` (web no-op — L6-02); RN-web's own focus trap moves DOM focus into the dialog, so entry works, but the container announces as bare "dialog".
**Severity: MEDIUM** (web; app-fixable in one prop per modal). Native: focus-move works; iOS dialogs don't use name-on-container semantics — no native cost.

**L6-17 · Tasks and Home have no page heading; Tasks section headers double-announce on web**
**Where:** `ScreenHeader.tsx:124-137` (title = `variant="display"` → no header role; `AppText.tsx:119` auto-role applies to `heading` variant only) — trees confirm: `tasks__light__390.txt:2` = plain `text: TASKS Review barriers`, vs `heading "Map" [level=1]` from the nav header on Map/Profile. Section headers: `TasksScreen.tsx:1172-1178` — outer View `accessible accessibilityRole="header"` + inner AppText auto-header → nested `heading "Open 2"` containing `heading "Open"` (`tasks:27-29`), read twice on web (native flattens to one ✓).
**Why:** heading-rotor navigation is a primary blind-user strategy; the two editorial screens are invisible to it, and what headings exist stutter. Also all headings emit `[level=1]` — no hierarchy.
**Severity: MEDIUM.** Fix shape: `accessibilityRole="header"` (+`aria-level`) on ScreenHeader's title; drop the container role on section headers for web.

**L6-18 · Tab-bar wayfinding: the badge's announced meaning is unstable ("2 Tasks" ↔ "5 Tasks") and unexplained; on FullMap no tab is selected**
**Where:** `RootNavigator.tsx:220-221` (badge = open-count, capped 99) — yet `tasks__light__390.txt:66` announces "5 Tasks" while `dt/map__light__390__dt-zoom-2.png` shows badge 2 with the same 2-open/3-verified dataset: the number's meaning visibly drifts with store timing, and no `tabBarAccessibilityLabel` explains what it counts (R2: "two of what?"; R6: "do I owe someone work?"). FullMap is a hidden route, so the tablist renders with zero `[selected]` (`map:34-46`) — an SR user's only anchor is the "Map" heading.
**Severity: MEDIUM.** Fix shape: `tabBarAccessibilityLabel: "Tasks, N open reports to review"`; investigate the badge's data source; consider marking Home selected while FullMap is pushed (it lives in Home's stack conceptually).

**L6-19 · The SignIn modal is the one sheet in the app without `accessibilityViewIsModal` — iOS VoiceOver can wander back into the Profile behind it**
**Where:** `ProfileScreen.tsx:826-832` (bare `<Modal>` wrapping `SignInScreen`); grep proves the convention everywhere else (~25 surfaces carry the prop). Web is fine (RN-web Modal aria-modal); Android is fine (native Modal window).
**Severity: MEDIUM** [code-inferred; NEEDS-SKY-DEVICE]. One-line fix on `SignInScreen`'s root.

**L6-20 · Map zoom has no single-pointer alternative on native, and the web zoom buttons sit half-under the status pill**
**Where:** native: no zoom UI and no `zoomControlEnabled` (`PlatformMap.tsx` — pinch/double-tap only; zoom-out generally needs two pointers → WCAG 2.5.1 risk); web: Leaflet `+/−` exist (`map:7-8`) but are occluded by the "5 flags nearby" pill at every size/theme (R4's #1 friction; verified in `dt/map__light__390__dt-zoom-2.png` — sub-fingertip slivers).
**Why:** limited-dexterity users lose the only gesture-free way to change map scale; cluster-tap ("Tap to expand") zooms in but nothing zooms out.
**Severity: MEDIUM** (the list twin removes zoom from the SR-critical path; this is a motor-access finding). [code-inferred native + capture-verified web]

**L6-21 · LegendModal's backdrop is a labeled Pressable that PARENTS the card — iOS flattening risk over the entire legend**
**Where:** `LegendModal.tsx:32-43` (backdrop `Pressable accessibilityLabel="Close legend" accessibilityRole="button"` wraps the card Pressable). Same mechanism class as L6-04: if iOS treats the accessible backdrop as a leaf, the whole legend collapses into one "Close legend" button; the inner card's `accessibilityViewIsModal` may or may not rescue traversal.
**Severity: MEDIUM** [code-inferred, genuinely uncertain — **NEEDS-SKY-DEVICE**; if confirmed, escalate: the severity/color decoder would be VoiceOver-unreadable]. Fix shape: backdrop as absolute-positioned SIBLING (the HamburgerDrawer already does this correctly — `HamburgerDrawer.tsx:146-148`).

### LOW / POLISH

**L6-22 · Attribution noise mid-traversal (LOW):** five stops — "Leaflet / © / OpenStreetMap / contributors © / CARTO" — sit between the pin and the app's own controls on every map tree (`map:9-16`); "contributors ©" reads as a broken phrase. Legally required content; group it as one node with a sane label.
**L6-23 · Severity echo line mashes on web (LOW):** `text: Moderate Hard for many users.` (`report:85`) — the aria-label with correct punctuation (`ReportFlagModal.tsx:651`) sits on a generic text node (name-prohibited role), so SRs read the mashed content, placed after button 5 where its association is unclear. The buttons themselves carry full labels, so cost is small.
**L6-24 · SignIn/report link litter (LOW):** logo announces "AccessMap, image" then "AccessMap, heading" (`signin-modal:23-24` — give the img `aria-hidden`); tagline text-run glues into "…more accessible. Email address" (`:25`, snapshot-adjacent but fixable with distinct containers); the report form has two identical "Sign in" links, the second spliced mid-sentence (`report:69,90`) — give them distinct labels ("Sign in to add a photo").
**L6-25 · Tab labels never scale (LOW):** `tabBarAllowFontScaling: false` (`RootNavigator.tsx:310`) — platform-conventional (react-navigation's own default freezes labels where the iOS Large Content Viewer exists, `BottomTabItem.js:41`), so the mitigation path is the LCV long-press HUD [NEEDS-SKY-DEVICE to confirm it fires]. Orientation §6's "allowFontScaling:false" phrasing is stale — the mechanism is the nav option, not a Text prop.
**L6-26 · C-lite glass flip is gesture-locked for SR users (POLISH):** the 600ms header long-press wrapper is `accessible={false}` (`TasksScreen.tsx:821`) — deliberate (dev A/B affordance); the announce-on-flip (`glassMode.ts:80`) confirms it for whoever CAN flip it, and the store/seed path is the documented alternative (GLASS §4). Fine as long as C-lite never becomes a user-facing accessibility mode — if it does, it needs a Settings row.

---

## ★ The map's non-visual story (the head-on judgment)

**What IS a blind user's mental model of this map?** As shipped, it is — correctly — *a distance-sorted list of barriers with a search box and category tabs*. The map surface itself contributes: one heading, N viewport pins (usually one), zoom buttons, attribution noise, a count pill, and a labeled toolbar. The app's honest answer to "how does a blind person use a map of barriers?" is the NearbyFlagsModal + the SR auto-open, and that answer is *architecturally right* — it is the strongest accessibility decision in the product.

**Is the list a true twin?** Scorecard: distances ✓ (spoken units, `speakDistance`); status ✓; description ✓; photos (decoratively hidden — acceptable); severity **number-only** (L6-14); filter power **partial** — category tabs + free-text search, but NOT severity/status/context-tag filters (panel-only) — though the panel remains reachable behind the modal and its results re-speak through the count pill; actions **broken** — the twin's only verb exits to the visual layer (L6-05). What can a pin/cluster/heatmap do that the list can't? Nothing except *be spatial*: cluster-tap zoom, heat-cell gradients, and pan have no list equivalents — and none of them announces anything on change (pan/zoom are silent; heat toggle's disclaimer is a mount-time liveRegion). That is acceptable *only because* the list is sorted by distance — "spatially near me" is the one spatial question it answers. It answers no other ("what's along THIS street?" has no non-visual path; the address search recenters the map but the list ignores the searched point — it sorts by user location only).

**Pins/clusters in the tree:** web — viewport pins only, terse names (L6-12), clusters announce "N accessibility flags grouped. Tap to zoom in and expand" (good label, DivIcon alt-drop applies); native — full `severityA11y` labels ✓ [code-inferred]. Severity without color: survives on Tasks badges, legend, report buttons, native pins; thins to bare numbers in the list and web pins; dies visually in RV dots (L6-08/10).

**The auto-open judged both ways.** As SR design: right call, right mechanism (once per mount, respects explicit close, manual re-entry via a labeled FAB — `MapScreen.tsx:341-357`), and it should be **PROTECTED**. As shipped web behavior: it fires for EVERY web user because RN-web hard-codes `isScreenReaderEnabled → true` — even the hook's own comment believes web "rejects" (`accessibility.ts:68-71`), so the app is running a design decision it never made. Sighted web users get an unexplained modal over the map on every first arrival (L2/L3's cost to assess); blind web users get the right surface for accidental reasons, minus the announcement that would make it legible (L6-02). Verdict: keep the feature, gate the web trigger on something honest (e.g. only auto-open when RN-web can't distinguish — i.e. never on web — plus a visible-first "List" emphasis; or a one-time dismissible hint), and never "fix" this by removing the native auto-open.

---

## PROTECT nominations (L6)

- **The SR auto-open + NearbyFlagsModal as the map's accessible twin** (`MapScreen.tsx:341-357`; `NearbyFlagsModal.tsx` wholesale): count announcement on open, one-breath row labels with spoken distances, filter-reset-on-close, 44pt chips (`:439`), role=tab chips with counts. The single best pattern in the app — extend it (severity word, detail-sheet action), never regress it.
- **`src/lib/accessibility.ts`** — the hook suite (useScreenReader / useReducedMotion / useReduceTransparency / useFocusOnOpen / decorativeProps) with real WCAG citations in comments; the natural seam for the web-dialect fix (aria-hidden in `decorativeProps`, an announce shim).
- **ReportFlagModal's control vocabulary**: "Severity N: Label — description" buttons (`:610`), the liveRegion severity hint (`:648-657`), the role=alert anon banner with the Sign-in link deliberately OUTSIDE the alert node (`:476-499`), the high-severity photo-nudge announce+liveRegion pair, the web-visible rate-limit notify (`:297-311`).
- **`severityA11y`/`statusA11y` centralization** (`a11yText.ts`) — the correct phrase exists in exactly one place; adoption, not redesign, is the fix.
- **LegendModal severity rows** — "Severity 4, Significant. Deep orange. Hard or unsafe for most users." (`:63`): number + word + spoken color name + consequence. The vocabulary law at full strength.
- **The announce+liveRegion dual-wiring convention** (iOS announce / Android liveRegion, commented at nearly every site) and the **`accessibilityViewIsModal` discipline** across ~25 sheets — plus the fact that every overlay is a real RN `Modal` (Android containment for free, dialog+focus-trap on web).
- **Empty-filters recovery card** (`MapScreen.tsx:1936-1973`): role=alert + per-axis one-tap clears, each with a hint — R1 called it the best state in the app; it is also the most accessible.
- **Reduced-motion coverage**: every modal `animationType={reducedMotion ? 'none' : 'slide'}`, map fly-tos gated, onboarding dots snap (`OnboardingCards.tsx:160-175`).
- **glassMode announce-on-flip** (`glassMode.ts:78-83`) and **AppText's DT law** (body/bodyMedium deliberately uncapped, documented per-variant caps, guard test).
- **"Back. Disabled on first card."** (`onboarding:23`) — the best disabled-state label in the audit; the pattern to copy everywhere a control is conditionally disabled.

## Copy observations (L6)

- **One thing, four names** (R6 #3, R2): onboarding says *barrier*, map chrome says *flag*, the sheet says *report*, the tab says *Tasks*. SR labels straddle it too: "Report a barrier" (Home) vs "Report a flag here" (Map FAB) vs "Submit anonymous flag report". Pick *barrier* for humans, keep *flag* for internals.
- **"Verified" is never defined** — the trust-critical word appears on every row and in no legend (LegendModal has Severity/Categories/Heat map sections only). One legend block ("Open = reported · Verified = confirmed by another user · Resolved = fixed") pays for itself.
- **"2 Tasks"** announces as a bare number glued to a tab name; say what it counts.
- **Severity in the list**: "Severity 4 · verified" → "Severity 4 of 5 — Significant · Verified" (aligns spoken + visible grammar; the string already exists in `SEVERITY_LABELS`/`severityA11y`).
- **Raw coordinates** ("at 49.88740, -119.49250") as the sheet's only place-name — mono jargon where "near [street]" would serve everyone, especially non-technical and blind reporters.
- **"open" reads as open-for-business** to a cold reader (R6) — "Unconfirmed" or legend-define it.
- The **two identical "Sign in" links** in the anon sheet, one dropped mid-sentence (`report:69,90`) — merge or differentiate.

## PROBE-REQUESTs

- **PROBE-REQUEST (device, top priority):** iOS VoiceOver pass on (a) Tasks card → are Verify/Resolved/Reject/Details focusable at all (L6-04)? (b) LegendModal → is any row content reachable, or one "Close legend" leaf (L6-21)? (c) SignIn modal → can VO swipe to the Profile behind it (L6-19)? (d) report footer + banner at true DT ×2 (L6-06)? (e) pins on Apple light tiles (L6-07)? These five decide whether the native story matches the code's promise.
- **PROBE-REQUEST (web, cheap):** DOM-attribute dump (not ariaSnapshot) of the report form + map filter panel — `aria-selected|checked|expanded|live|hidden|modal` per element — to convert L6-01/L6-02/L6-11's code-verified claims into shipped-DOM proof, and to verify real-SR containment under `aria-modal` on the stacked report path.
- **PROBE-REQUEST (web):** a11y tree of `map filter-open` and `legend-modal` states (not in the shipped 7) — closes the traversal-order gap for the panel and legend.


---

## L7 — Felt performance


**Lens verdict.** The performance *engineering* under AccessMap is unusually disciplined for a project this size: one-shot GPS with cached-fix reuse and a 15s hard race (no `watchPositionAsync`, no intervals, anywhere), a stale-while-revalidate cache paint that makes signed-in cold starts feel instant, sequence-guarded fetches that survive connectivity flap, memoized map layers with bounded icon caches on web and snapshot-keyed cluster markers on native, a build-time lucide rewrite that cut the web bundle 45%, and a Map glass rollout that *reduced* the live-blur budget to 4. The felt-performance hole is **temporal honesty under degraded network** — exactly R1's stated fear ("fails silently exactly where I'm most exposed"). The data layer has no time bound (the GPS layer got one; Supabase never did), the offline story quietly excludes guests and never says how old "saved data" is, the Map's data is a global recency page that no pan or Refresh ever re-scopes, and a user whose location permission is already denied arrives on a San-Francisco map under a "5 flags nearby" pill with no banner until they happen to tap recenter. Terminal failure states, where they are reached, are honest and well-crafted (shaped skeletons, tappable retry banners, friendly network copy) — the silent zone is the unbounded middle and the states that are never entered. No blur-budget state at HEAD exceeds the 12-pane law. The one previously-CRITICAL item in this lens (the locating spinner that could hang forever) is **fixed at HEAD `82e738b`** with unit tests; it is nominated for PROTECT below, not re-reported.

Serve/evidence basis: code at HEAD (primary), audit captures under `design-reviews/fable-audit/assets/` (web-approximated, dev-mode Metro per orientation §7 #8), jest guard inventory. True scroll/blur/battery feel = NEEDS-SKY-DEVICE throughout.

---

## Blur budget at HEAD (recounted from source; tab bar added per GLASS.md §12.7)

| Screen | Worst simultaneous state | Live BlurViews (incl. tab bar) | Within law (≤12)? |
|---|---|---|---|
| **Map** | Filter panel open (true blur, full mode) + locating banner + heatmap legend + tab bar. Status pill & action bar are **literal `forceEngineered`** (`MapScreen.tsx:1273,1292`) — 0 panes by mechanism; saved-place chips are plain Pressables; all Map modals (Nearby/Legend/Search/Places/Presets) mount 0 BlurViews (grep-verified) | **4** (panel `:1517` + locating `:1981` legacy + `HeatmapLegend.tsx:20` legacy + tab `RootNavigator.tsx:141`) | ✓ — the rollout report's "went DOWN to 4" claim **verified at HEAD** |
| **Tasks** | Scroll with banner visible: visible row cards (~5–6 at 390×844 given ≥170px cards; SectionList at RN default windowing, `TasksScreen.tsx:1098-1100`) + chrome pane + banner + tab bar; select mode adds ONE bulk pane | **~9–10 realistic** | ✓ runtime. ⚠ On paper GLASS.md §3's own arithmetic ("9–10 rows + chrome + banner = 12") **plus** the §12.7 tab-bar rule totals 13 — see L7-10 |
| **Settings** | Plain ScrollView (no virtualization, `SettingsScreen.tsx:447`) mounts every row pane; ~9–10 visible on a phone, up to all ~11 + tab on tablet portrait | **~10–12** (claimed "12 AT ceiling") | ✓ at ceiling — **zero headroom** for any future row |
| **Profile** | Threaded row panes in view (~5–6; the 7 `myReportsBtn` + 3 `aboutRow` surfaces are `forceEngineered` **literals** = 0 cost, `ProfileScreen.tsx:1349-1681`) + tab bar | **7** (claimed; mechanism verified) | ✓ |
| **Home** | Legacy search pill (i=20, `HomeScreen.tsx:219`) + tab bar (map peek contains no BlurView) | **2** | ✓ |

**No state exceeding 12 visible panes was found at HEAD. No law breach.** C-lite/Android/RT collapse all threaded row panes to engineered — budgets only shrink from here.

---

## Findings — HIGH

### L7-01 · **No timeout on any Supabase data fetch — the loading window is unbounded and message-less under poor signal**
- **Where:** `src/lib/supabase.ts:25-33` (client created with no custom `fetch`, no `AbortSignal`, no timeout); `src/lib/flags.ts:606-671` (`listFlags`/`listFlagsPage`); consumed by `src/lib/flagsStore.tsx:206-326`. Contrast with `src/lib/location.ts:44-58`, where `getCurrentPositionWithTimeout` races GPS against 15s *specifically because* "expo-location can hang indefinitely… leaving the caller stuck on a spinner forever." The data layer never received the same treatment.
- **What:** Every data read and write — map/tasks/home flag loads, refresh, load-more, `fetchFlagById`, `createFlag`, photo upload — rides the platform's default fetch. On clean offline, fetch rejects fast and the honest terminal states appear. On **poor signal** (one bar, packet loss, captive portal — the field case), the request can pend until the OS socket gives up (~60s iOS; minutes on web). For that entire window: the Map status pill reads "Loading flags…" (`MapScreen.tsx:1278-1283`), Home shows an em-dash title + skeleton rows with no message (`HomeScreen.tsx:160,184,298-306`), Tasks shows skeletons (`TasksScreen.tsx:799,1079-1091`), and a report submit sits on its disabled-form spinner (`ReportFlagModal.tsx:274-429`). There is no escalation ("still trying — check your signal"), no cancel, no time-bound.
- **Why it matters:** A wheelchair user mid-route checking for barriers ahead cannot distinguish "still working" from "dead" for a minute or more — and R1's blinded read converted exactly this into "an empty map reads as 'no barriers,' the most dangerous possible misreading." The app's *own* GPS code documents why unbounded awaits are unacceptable; the data path is the same class of risk on the same journeys.
- **Evidence:** code refs above (code-inferred). Corroborating captures: `states/map__light__390__offline-refresh.png` + dark twin (status pill mid-window, no error yet); all reviewed `states/home__*__load-error.png` variants show the skeleton phase — R1's blinded read of the full 8-capture family reported "endless skeletons, no error text, no retry" and never saw the settled error card that exists in code (`HomeScreen.tsx:283-297`) [web-approximated]. Settled-state timing unprovable in this read-only pass → PROBE-REQUEST 1.
- **Skeptic check (HIGH not CRITICAL):** the terminal states *do* exist and are honest — Home error card + Try again (`HomeScreen.tsx:286-295`), Map tappable error banner with busy state (`MapScreen.tsx:1901-1927`), Tasks "…Tap to retry" (`TasksScreen.tsx:624-628,854+`), friendly network copy (`errors.ts:26` "Check your internet connection and try again."). So this is not a literally-infinite hang with no recovery (that bug was the locating spinner — fixed at HEAD). It is an unbounded, undifferentiated middle on the primary path. **Severity: HIGH.**

### L7-02 · **Offline capability silently excludes guests, and "saved data" never says how old it is**
- **Where:** `src/lib/flagsStore.tsx:244` (`doSwrPaint = … && !!currentUserId`), `:299-300` (failure fallback: `isDefaultStatuses && currentUserId ? readFlagsCache(…) : null`), `:31` (user-scoped key — Jordan Condition 2), `:34` (24h TTL), `:47-50` (`cachedAt` stored), `src/lib/copy.ts:11` (`OFFLINE_BANNER_TEXT = 'Showing saved data — connect for the latest.'`); `HomeScreen.tsx:283` (error card gated on `flags.length === 0`); `HomeScreen.tsx:176` (ScrollView with no RefreshControl).
- **What:** three related honesty gaps. (1) **Guests get zero offline fallback** — the cache key is user-scoped by design (privacy), so every web user (web IS guest mode, orientation §2) and every native "browse without an account" user gets the error banner and an empty list where a signed-in user gets cached data. Nothing anywhere tells them offline resilience is an account feature. (2) **No age on the banner** — `cachedAt` is written but discarded on read (`:85-102` returns only `entry.rows`); the same banner text covers data 2 minutes old and 23.9 hours old. A day is several tides of sidewalk obstruction. (3) **Home hides refresh failures once rows exist** — the error card only renders when `flags.length === 0`, so a failed background revalidate leaves stale rows presented as current with no indicator, no last-updated stamp, and no pull-to-refresh affordance on the landing screen. (Map `:1901` and Tasks render their error banners regardless of row count — Home is the odd one out.)
- **Why it matters:** the offline banner is the app's core honesty device for the field scenario; its guarantees ("saved", "how stale", "who gets it") are weaker than the copy implies, and the weakest case (guest, mid-journey, flaky signal) is the mission's most exposed user.
- **Evidence:** code-inferred; banner render verified in Tasks/Home/Map source (`MapScreen.tsx:1422-1434`, `HomeScreen.tsx:272-279`); true cold-offline unrenderable on dev serve (orientation §5.12) → NEEDS-SKY-DEVICE for the lived offline flow. **Severity: HIGH** (data can be silently stale where the UI implies fresh; the designed guest gap is fine — its *silence* is not).

### L7-03 · **Map data is a global most-recent-50 page — no pan, and no "Refresh flags", ever re-queries the viewed area; the realtime viewport gate reads a stale region**
- **Where:** `src/lib/flags.ts:606-615` (`listFlags`: global, `created_at desc`, limit 500) and `:652-671` (`listFlagsPage`: global, limit 50 — `INITIAL_PAGE_SIZE`, `flags.ts:42`); no lat/lng constraint in any flag query. `MapScreen.tsx:453-465` (viewport gate reads `currentRegionRef`), `:1197-1200` (the ref's ONLY update — when `location` resolves; comment says "fires once"), `:1247-1257` (PlatformMap receives no region callback; neither `PlatformMap.tsx` nor `PlatformMap.web.tsx` exposes `onRegionChange` — web's `useMapEvents` at `PlatformMap.web.tsx:313` is internal to cluster recompute only). "Refresh flags": `MapScreen.tsx:1399-1406` → `refreshFlags()` → the same global first page.
- **What:** the answer to the rollout report's open question (§9.2) is: **panning to a new neighbourhood shows only whatever happens to fall in the global most-recent-50; "Refresh flags" re-fetches that same global page, not the current view.** At today's 5-flag scale this is invisible. At any real scale, a user who pans/searches to a different part of town sees systematically missing barriers while the pill asserts "N flags nearby" — and with the opt-in realtime channel on, the stale gate *inverts* freshness: new-flag events in the area they're now viewing are discarded as "outside viewport" (`flagsStore.tsx:495-497`) while events for the area they left are accepted.
- **Why it matters:** the FIND loop's core promise ("what's between me and where I'm going") degrades silently with growth, and the failure mode is the dangerous kind — absence of pins reads as absence of barriers. R1's "5 flags nearby but I see ONE pin" friction is the small-scale shadow of this structure.
- **Evidence:** code-inferred; captures `map/map__*__zoomed-out-clusters.png` (one pin under a "5 flags nearby" pill) [web-approximated]. **Skeptic check:** verified no region callback exists at HEAD by reading both PlatformMap variants' full prop surfaces; verified both query functions have no geo predicate; latency of the danger acknowledged (latent at current data volume). **Severity: HIGH** (latent core-flow honesty failure; cheap to hit the moment the dataset grows past one page).

### L7-04 · **Permission-already-denied arrival: no banner, San-Francisco map, "5 flags nearby" — the denied state is only surfaced after a manual recenter tap**
- **Where:** `MapScreen.tsx:1043-1061` — the mount effect probes permission; on non-granted it (correctly, post-fix) clears `locating`, but **never sets `permissionDenied`**. The permission banner (`:2004-2014`, "Location access is off. Turn it on in your device Settings…") renders only from `requestLocation()`'s denied branch (`:997-1007`) — i.e., only after the user taps "Recenter on me" or the locate flow. Meanwhile the map sits on `DEFAULT_REGION` (San Francisco, `:123-128`) and the status pill reports the global flag count as "nearby" (`:1278-1283`).
- **What:** a user whose OS-level location permission is already denied (a common steady state — denied once, months ago) opens the Map and gets: wrong city, zero visible pins, a pill claiming "5 flags nearby", and no explanation or recovery hint. The state machine *has* an honest denied state — arrival just never enters it.
- **Why it matters:** R1 ranked this stranding state their **#1 friction** ("the one that would strand me… a flat lie — with no banner telling me location is off or how to fix it"). For a disabled user the cost of not realizing location is off is planning around the wrong city's data.
- **Evidence:** captures `states/map__{light,dark}__{375,390,430,834}__permission-denied.png` — all show no banner (harness context auto-denies permission; fence-verified captured at HEAD) [web-approximated]; code path above (code-inferred). **Skeptic check:** re-read the mount effect at HEAD — the `'clear'` branch (`:1048-1055`) touches only `setLocating(false)`; `setPermissionDenied(true)` appears nowhere in the mount path. The captures' banner absence is therefore app truth, not a capture artifact. Native OS-prompt semantics differ slightly (undetermined vs denied) → NEEDS-SKY-DEVICE for the first-run feel, but the already-denied case is platform-independent logic. **Severity: HIGH.**

## Findings — MEDIUM

### L7-05 · **Photo pipeline ships full-resolution originals into 64-120px thumbnails and callouts**
- **Where:** `src/lib/flags.ts:108-111` — the EXIF-strip re-encode is `manipulateAsync(uri, [], { compress: 0.9 … })` — **empty actions array, no resize**; picker quality 0.7 (`ReportFlagModal.tsx:245,249`); 10MB cap (`flags.ts:10`). Renders: Tasks thumbnails `TasksScreen.tsx:1676-1683,1705-1712` (plain RN `Image`), native callout `PlatformMap.tsx:261-268` (`RemoteImage`, 120px high), web popup `PlatformMap.web.tsx:398-404`.
- **What:** a 12–48MP phone photo is stored near-original-size (recompressed only) and downloaded + decoded at full resolution for every thumbnail and callout. RN's built-in `Image` performs no downsampling (expo-image/FastImage not in the stack), so each visible photo card decodes the full bitmap into memory.
- **Why it matters:** on weak LTE, the callout photo — the thing a user opens to judge "can I actually get past this?" — can take many seconds; several photo cards in the Tasks window cost real memory on older devices (decode size scales with pixels, not file size).
- **Mitigations already present (verified):** virtualization-based lazy mount (`photoInView`, `TasksScreen.tsx:1487-1493`), skeleton shimmer until `onLoad`, error → clean fallback (`RemoteImage`, `PopupPhoto`).
- **Evidence:** code-inferred; NEEDS-SKY-DEVICE (memory/jank on device; LTE load timing). **Severity: MEDIUM** (scale- and network-dependent; today's dataset is small).

### L7-06 · **The offline tile cache is web-only, signed-in-only, and sized 10× beyond its storage backend; native has no app-level tile cache**
- **Where:** `PlatformMap.web.tsx:436-522` (`CachedTileLayer` — web file only), `:465-471` (no `userId` → cache skipped entirely: every guest), `src/lib/tileCache.ts:24-26` (50MB cap / 40MB evict target) vs AsyncStorage-on-web = `localStorage` (~5MB quota) — writes past quota throw, are swallowed at `tileCache.ts:224-228` (`console.warn`), and the cache silently stops growing at a fraction of its design bound. `PlatformMap.tsx` (native) has no tile-cache path at all — offline basemap on device = whatever the OS map cached.
- **What:** the "tile cache" is real but narrow: it helps exactly the signed-in web user, up to ~5MB. The field device (iOS/TestFlight) relies on Apple Maps' opaque OS caching; the offline banner's "showing saved data" can be true for flags while the basemap under them renders blank.
- Also felt-cost on its one platform: every tile load does a lock-serialized read-modify-write of a single JSON index that grows O(entries) (`tileCache.ts:158-192`), on a synchronous storage backend, during pan bursts.
- **Evidence:** code-inferred; NEEDS-SKY-DEVICE (native offline basemap behavior). **Severity: MEDIUM.**

### L7-07 · **Locate failure is silent on web — the spinner clears with no outcome**
- **Where:** `MapScreen.tsx:1030-1033` — `requestLocation`'s catch is `Alert.alert("Couldn't find your location", …)`, a no-op shim on react-native-web; `finally` clears `locating` (`:1034-1036`), so the "Finding your location…" banner (announced to SR at `:993`) simply vanishes on timeout/failure with no visible or spoken outcome. Native shows the Alert (field devices are fine).
- **What/why:** the app's own error-tier policy tolerates informational Alert-on-web, but this one is actionable (retry, check browser permission), the announcement raised an expectation, and web is a first-class guest surface (it IS the guest experience). The report sheet handles the same gap correctly with a visible "Waiting for location…" state (`ReportFlagModal.tsx:467`).
- **Evidence:** code-inferred; the 15s bound itself (`location.ts:44-58`) means the silence lasts at most one timeout cycle. **Severity: MEDIUM.**

### L7-08 · **Nothing is queued offline — a report composed in a dead zone can only fail**
- **Where:** `ReportFlagModal.tsx:417-428` — submit failure notifies honestly ("Couldn't submit your report" + friendly network copy) and preserves the filled form (`reset()` runs only on success). No persistence of the draft, no outbox, no retry-on-reconnect anywhere in `src/lib/`.
- **What/why:** the mission's sharpest moment — reporting the barrier you are currently stuck at, in the dead zone that may have contributed to being stuck — requires keeping the sheet open and manually retrying. The failure handling itself is exemplary; the *product* has no offline capture. (Deliberately scoped as a gap-to-name, not a defect: queued anonymous/located submissions have real privacy/abuse design work attached — Jordan territory.)
- **Evidence:** code-inferred. **Severity: MEDIUM.**

### L7-09 · **Two live map instances stay mounted for the session once FullMap is visited**
- **Where:** `HomeScreen.tsx:264` — the Home "map peek" mounts a full live `PlatformMap` (MKMapView / Leaflet) inside the ScrollView for a 168px non-interactive preview; `FullMap` is a tab-navigator route (`RootNavigator.tsx`), and React Navigation keeps inactive tab screens mounted — so after one Map visit, **two** native map views (plus their tile/GL machinery) live concurrently for the rest of the session, both re-rendering marker sets on every flags change.
- **Why it matters:** map views are the heaviest components in the app (memory, GPU, background tile work) — battery and thermal cost on device is plausible and unmeasured; the peek could be a static snapshot/image for a fraction of the cost.
- **Evidence:** code-inferred; NEEDS-SKY-DEVICE (instrument memory/battery with Home+Map both mounted). **Severity: MEDIUM.**

## Findings — LOW

### L7-10 · **Blur-budget paper arithmetic conflicts with the §12.7 tab-bar rule; Settings sits at the ceiling with zero headroom**
- **Where:** `GLASS.md` §3 ("~9–10 visible rows + chrome + banner = 12" — written pre-§12.7) vs §12.7 ("count the worst SIMULTANEOUS state, and add the tab bar manually"); `theme.ts` `glass.maxLivePanes = 12`; `SettingsScreen.tsx:447` (plain ScrollView — every row pane mounts; no virtualization backstop); telemetry `GlassSurface.tsx:76-90` warns only past 12 *live* panes and can't see the tab bar (`RootNavigator.tsx:141`).
- **What:** applying the law's own counting rule to its own Tasks arithmetic yields 13 on paper; in practice visible rows (~5–6 at phone sizes given ≥170px cards) keep runtime comfortably within law, and my recount found **no reachable >12 state**. Settings' claimed "12 AT ceiling" leaves no room for any future row, and tall tablets get closest. This is a documentation/headroom finding, not a breach.
- **Evidence:** code-inferred recount (table above). **Severity: LOW.**

### L7-11 · **Heat map ON can render nothing, with no "no zones here" feedback**
- **Where:** `src/lib/heatmap.ts` (`bucketFlagsToCells`, k≥3 privacy floor), toggle + hint `MapScreen.tsx:1716-1739`, disclaimer `:2020-2032`, legend `HeatmapLegend`. Capture `map/map__light__390__heatmap-on.png`: toggle On, disclaimer + full legend mounted — zero cells drawn; the map is pixel-identical to at-rest.
- **What/why:** the layer's *rule* is honestly disclosed ("only appear where at least 3 flags…") but its *outcome* is not — the user can't tell on/empty/broken apart (R1: "nothing on the map actually changed"). One conditional line ("No heat zones qualify in this view yet") when `heatmapEnabled && heatCells.length === 0` would close it. Perf note verified good: cells memoized on `[heatmapEnabled, filteredFlags]`, zero recompute on pan, zero cost when off (`MapScreen.tsx:946-949`). **Severity: LOW.**

### L7-12 · **Cold start stacks three sequential blocking gates, one of them hardcoded white**
- **Where:** `App.tsx:209` (fonts gate → null), `App.tsx:182-185` (FirstLaunchGate AsyncStorage read → hardcoded `backgroundColor:'#fff'` full-screen View — a white flash for dark-mode users, inside ThemeProvider where the token exists), `App.tsx:96` (SignedInArea holds render on the default-tab read). Each gate is small (~5-50ms) but they run serially before first paint; the store's SWR cache paint (`flagsStore.tsx:243-263`) then makes up ground well.
- **Evidence:** code-inferred; the native splash may mask parts → NEEDS-SKY-DEVICE for real cold-start feel. **Severity: LOW** (the white-in-dark flash is the actionable bit).

---

### PROTECT nominations (L7)

Things this lens found actively good and regression-sensitive — do not lose them in any follow-up work:

1. **The locating fix + its tests** — `MapScreen.tsx:1043-1061` (`initialLocationAction` + `.catch` clearing the spinner on probe failure), `src/lib/location.ts:75-79`, pinned by `src/lib/__tests__/location.test.ts` (granted→fetch; undetermined/denied/every-non-granted→clear). This closed the only CRITICAL-class hang in the lens; the capture `states/map__*__locating-hang.png` is the banked "before" — regression-watch it.
2. **`getCurrentPositionWithTimeout` (15s race) + last-known-fix reuse + Balanced accuracy + zero `watchPositionAsync` anywhere** (`location.ts:44-58`, `MapScreen.tsx:1013-1017`, grep-verified no watchers/intervals in `src/`) — the app's battery/thermal posture is exemplary and mostly invisible; it will not defend itself.
3. **The virtualization law, obeyed** — SectionList at RN defaults with the explicit guard comment (`TasksScreen.tsx:1098-1100`), NearbyFlagsModal on FlatList; this is the blur budget's actual enforcement mechanism.
4. **Marker snapshot discipline** — native cluster `tracksViewChanges={false}` + content-derived key `cluster-${id}-${count}` (`PlatformMap.tsx:132,139`), heat badges likewise (`:208`); web's bounded icon caches (`pinIconCache`/`clusterIconCache`/`heatLabelIconCache`) + `memo(PlatformMap)` on both platforms with stabilized props (`MapScreen.tsx:1181-1192`).
5. **Store fetch discipline** — SWR cache paint gated to cold start, `fetchSeqRef` stale-response discard, `refreshIfStale` 30s freshness window (radio/battery), cursor invalidation on status change, offline-banner clearance on proven reconnect (`flagsStore.tsx:187,243-263,332-344,394-407,379-381`).
6. **Cold-start weight controls** — the lucide deep-import babel plugin + metro resolver (main web chunk 4.15→2.28MB, verified wired at `babel.config.js:16`/`metro.config.js`), per-weight font subpath imports (`fonts.ts`), lazy Settings/Admin/ReportFlagModal/FlagDetail chunks (`RootNavigator.tsx:41-42`, `MapScreen.tsx:116`).
7. **The Map budget CUT via literal `forceEngineered`** on pan-time chrome (`MapScreen.tsx:1273,1292`) — worst simultaneous state 4 incl. tab bar, verified at HEAD.
8. **Shaped, honest loading + terminal states** — content-shaped glass skeletons (Tasks `:1079-1091`, capture `tasks__light__390__skeletons-slowdata.png`), tappable retry banners with busy states (Map `:1901-1927`, Tasks `:854+`), Home's error card (`HomeScreen.tsx:283-297`), and the friendly network mapping in `errors.ts` ("Check your internet connection and try again.").
9. **Report-submit hardening** — synchronous double-submit ref, whole-form disable, form preserved on failure, storage-orphan cleanup, and partial-failure honesty ("Report filed — photos not attached") (`ReportFlagModal.tsx:274-429`).

### Copy observations (L7)

- **"N flags nearby"** (`MapScreen.tsx:1278-1283` status pill) — "nearby" is false-by-construction: the query is a global most-recent page (L7-03), and the pill keeps the claim over the San-Francisco fallback region (L7-04). The most load-bearing dishonest word in the app.
- **"Showing saved data — connect for the latest."** (`copy.ts:11`) — good voice; missing the one fact that changes decisions: **age** ("saved 2 h ago"). `cachedAt` already exists in storage.
- **"Loading flags…"** replaces the count in the pill during *every* refresh, including background revalidates over live data — consider reserving it for first load and using "Updating…" over data, so loading-from-nothing and refreshing-something read differently.
- **"Finding your location…"** — honest, SR-announced, now properly bounded; it has no failure-side twin on web (L7-07). Native alert copy "Couldn't find your location" + the timeout's own "Location request timed out. Check your signal and try again." are good.
- **"Location access is off. Turn it on in your device Settings to report barriers near you."** — exactly right; it just never fires on arrival (L7-04).
- **Heat disclaimer** ("Heat zones only appear where at least 3 flags…") — honest about the rule, silent about the outcome; needs the "No zones qualify in view yet" companion (L7-11).
- **Error terminal copy** is a strength: "Couldn't load reports." + Try again; "…Tap to retry"; "Couldn't refresh — pull down to update."; "Check your internet connection and try again."

### PROBE-REQUESTs

1. **Settled-failure timing probe (web):** with the existing harness (`tools/capture.mjs` + blockSupabase / CDP offline), capture Home and Map at t≈+2s, +10s, +70s after load-failure and after a Refresh-tap-offline, to measure when the skeleton/"Loading flags…" phase yields to the error card/banner on web — quantifies L7-01's window (this pass was read-only; no servers run).
2. **NEEDS-SKY-DEVICE — photo scroll:** Tasks with 15–20 photo cards on the TestFlight build (older device if possible): scroll jank + memory watermark; one callout photo load on LTE (L7-05).
3. **NEEDS-SKY-DEVICE — dual map cost:** memory/battery delta with Home only vs Home+FullMap both mounted for 10 minutes (L7-09).
4. **NEEDS-SKY-DEVICE — offline basemap truth:** airplane-mode the device after normal use; open Map — do Apple tiles render from OS cache where the user just was? Pairs with the flag-cache banner honesty (L7-02/L7-06).
5. **Web quota probe:** pan long enough (signed-in) to push the tile cache past localStorage quota; confirm the silent stop and measure pan frame times with a several-hundred-entry index (L7-06).


---

## L8 — Distinctiveness + signature + trust



**Lens verdict.** AccessMap is *closer to memorable than it knows, and less credible than it deserves.* The signature exists and it is not the glass: it is the **severity grammar** — the one visual-verbal system that repeats identically everywhere: a numbered circle in the calibrated amber→red ramp, a plain word, and a one-line stake ("5 — Severe. Impassable. Needs a detour."), taught inline at the exact moment of choice in the report form. All six blinded readers independently praised it (R6 "exactly what the rest of the app was missing", R1 "I could judge risk from this alone", R2 "superb severity descriptions", R3 "plain words", R5 "unusually humane copy voice"). That grammar, fused with the severity-teardrop pin family and the Wayfinder striding-figure mark, is an ownable identity no competitor in this meta has. What undercuts it is trust instrumentation, not decoration: the map's count pill makes a proximity claim the architecture doesn't support; "Verified" — the app's central promise word — is never defined, counted, or dated where decisions happen, so one piece of junk data ("BUMBAKLOT", verified, severity 5) poisons every real badge around it; and the guest↔auth boundary is silent or mis-documented on every surface but one. The Deep Field material system itself lands on the right side of the civic/decorative line — arbitrated inks, designed opaque fallbacks, restraint on the live map — it reads as care, not costume; the remaining credibility dents are the flagship map's raw web chrome, the two header families, and the light-mode sheets that still ghost their backdrops — all of R5's dents re-verified current at HEAD (dispositions in the R5 dent ledger below; nothing stale to kill). Memorable: nearly — one system away. Credible: not yet — the trust ledger the app already built (status history, verification votes, anonymous-aggregate reopens) is hidden three taps from where trust is actually spent.

**Note on PROTECT:** the orchestrator merges all lenses' PROTECT nominations after the fan-out and will append the merged list to this section; the nominations below are L8's own.

---

### Meta-calibration table [text-inferred — from model knowledge; no web access]

| App | Core model | Visual language | Trust mechanics | Where AccessMap converges | Where it diverges |
|---|---|---|---|---|---|
| **Wheelmap** (Sozialhelden) | OSM-backed crowdsourcing of **venue** wheelchair accessibility | Traffic-light (green/yellow/red) place markers over standard tiles; utilitarian NGO styling | OSM provenance + edit history; explicit **"unknown" gray state** for unrated places; 3-value vocabulary anyone can learn | Crowdsourced, color-coded map + list, plain vocabulary, civic non-profit tone | AccessMap maps **street-level barriers, not venues**; 5-step severity with stakes-based language; a status *lifecycle* instead of a static rating; no "unknown" state (see L8-10) |
| **AccessNow** | Crowdsourced venue accessibility statuses + org partnerships | Modern startup UI, pin ratings (accessible / partially / not) | Partnership curation, community reviews, named contributors | Pin-first crowdsourcing, category tags | Barrier-first (problems, not amenities); **anonymous reporting as a designed right**; open community verification queue (Tasks) instead of curation |
| **Google Maps accessibility layers** | Wheelchair-accessible place attributes + accessible transit/walking routing | Institutional; small wheelchair glyphs on place sheets; authority-by-scale | Scale + owner/crowd Q&A + ML; provenance opaque; binary attributes, no freshness | Map-first UI, POI iconography, routing ambitions users will expect | Severity + freshness + verification status **visible on every card**; human plain-language definitions; community moderation loop a user can join |
| **Apple Maps accessibility** | Curated venue accessibility attributes | Premium native material (the bar Deep Field is judged against) | Apple curation; closed pipeline | Material refinement ambition (glass, depth) | Community data with visible status; AccessMap's material is in service of *civic* legibility (arbitrated AA floors are the law, not vibes) |
| **AXS Map** | Crowdsourced venue star-ratings (entry/bathroom), mapathon events | Activist/video-heritage web app, star ratings | Community events, star aggregates | Civic volunteer ethos, "help your neighbourhood" energy (HowToHelp) | Barriers not venues; severity semantics with safety stakes; in-app verification rather than star averaging |
| **SeeClickFix / 311 civic reporters** (closest *flow* relative) | Report a municipal problem → government acknowledges → closes | Utilitarian forms, status chips | **The government closes the loop** — status changes carry institutional weight | Category+photo+severity report flow; open→resolved lifecycle; "Report it to your city" is literally AccessMap's Resources advice | AccessMap's loop is **community-verified, not city-acknowledged** — honest about it in Resources, silent about it at submit time (R6's "black box", L8-14/Copy) |
| **AccessMap (accessmap.io, UW Taskar Center)** | Sidewalk-network **routing** by grade/curb data | Academic-civic web map | Institutional data provenance | Same name, same niche (sidewalk accessibility) | Sky's product reports/verifies barriers; theirs routes around them — see L8-19 name collision |

**Divergence verdict:** the divergence is real, legible, and defensible — street-level barriers with a 1–5 stakes vocabulary and a community verification lifecycle is a genuinely different product from every venue-rater and both institutional layers, and the product *knows* it (Resources explicitly names venue-rating apps as complements: "Community apps that rate places by step-free access complement the barriers you flag here" — a self-aware positioning line most apps never dare print). But the two mechanics that carry the divergence — **verification** and **coverage honesty** — are the two the UI under-instruments (L8-2, L8-10). The divergence is defensible only while the badge means something.

---

### Findings

#### CRITICAL

**L8-1 · Map status pill (every map visit) · The "N flags nearby" pill makes a proximity claim the data layer does not support — and the permission-denied state proves it false on screen.**
**What:** The pill renders `${flags.length} flags nearby`, where `flags` comes from `listFlags()` — the **500 most recent flags globally**, with no geographic bound (`src/lib/flags.ts:606–615`; label at `src/screens/MapScreen.tsx:1282`). Deny location and the map falls back to a citywide San Francisco viewport while the pill still declares "5 flags nearby" — all five are in Kelowna, ~1,300 km away, zero pins in view, no banner, no explanation.
**Why it matters:** This is the flagship surface's headline number, and it is architecture-accidentally-true today (all demo data is one city) and provably false in a state any privacy-conscious user reaches on day one (R1: "a stale '5 flags nearby' pill actively lying about it… the one that would strand me"). As the dataset grows, "nearby" becomes false for *everyone*. A civic data product whose one always-visible number can be shown to be untrue forfeits the benefit of the doubt on every other number — this is the trust equivalent of a broken odometer.
**Evidence:** `states/map__light__390__permission-denied.png` + `states/map__dark__390__permission-denied.png` (SAN FRANCISCO label, zero pins, "5 flags nearby") [web-approximated]; `src/screens/MapScreen.tsx:1282`; `src/lib/flags.ts:606–615` [code-verified at HEAD]; R1 friction #1.
**Skeptic pass:** Could "nearby" mean "recently reported in your community"? No — the word makes a spatial claim, the screen is a map, and the SF state renders claim and reality in one frame. Could the fallback state be rare? Chromium auto-denies un-granted geolocation, iOS users decline prompts routinely; it is a first-session state. Verified current at HEAD (capture set is 82e738b). Holds at CRITICAL.
**Severity: CRITICAL**

#### HIGH

**L8-2 · "Verified" badge, everywhere it appears (Home rows, Nearby list, pin callout, Tasks pills) · The app's core trust word is never defined, counted, or dated at any point of decision — while a full trust ledger sits built but unreachable from the map.**
**What:** "verified" appears lowercase on Home rows, in "Severity 4 · verified · 29d ago" list metadata, and as "SEVERITY 4 · VERIFIED" in the callout — with no verifier count, no "verified 29d ago by 2 people", no tap-through. The Map legend — the designated vocabulary surface — defines severity (all 5) and categories (all 6) but **zero status vocabulary** (`src/screens/LegendModal.tsx`: no match for "status/verified/resolved"). The only definition in the product ("Verified means another person checked the spot and confirmed the issue is real") lives in Help & FAQ behind the drawer/Settings (`src/components/HelpModal.tsx:40–42`). Meanwhile `StatusHistoryModal` ("Foundational for trust" — its own header comment) and `FlagDetailModal`'s reporter/date/anonymous-aggregate surfaces exist at HEAD but are reachable only via Tasks → Details or Profile → My Reports — never from the callout or Nearby list where finding decisions happen (`grep`: FlagDetailModal imported only by TasksScreen/ProfileScreen).
**Why it matters:** People bet outings on this badge (R1: "the one thing I'd base a detour decision on"). An undefined, uncounted, undated "verified" is indistinguishable from decoration — and the moment R1 met "BUMBAKLOT · Severity 5 · verified", the whole badge economy collapsed for him: "if that badge is meaningless, so is the severity-4 'no ramp' I was about to detour around." The cruel part: the provenance UI already exists; it's an information-architecture problem, not a build problem.
**Evidence:** `flows/map__light__390__nearby-modal.png` (BUMBAKLOT row, exact metadata line) [web-approximated]; `flows/map__light__390__pin-callout.png` (no date, no count, no next step); `src/screens/LegendModal.tsx` (absence verified by grep at HEAD); `src/components/StatusHistoryModal.tsx:1–18`; `src/components/HelpModal.tsx:40–42`; R1 trust section verbatim; R6 friction #2.
**Skeptic pass:** Is this just "add a feature"? No — the finding is the *placement* of already-built trust surfaces plus a missing one-line definition in the legend that already defines everything else. Is the FAQ definition enough? Three readers (R6, R1, R2) never found it. Holds at HIGH.
**Severity: HIGH**

**L8-3 · Where junk content is encountered (Nearby list, callout) vs where moderation lives (Tasks) · Untrusted content wears full institutional confidence with no counter-affordance in sight.**
**What:** "BUMBAKLOT" (verified, severity 5) and "Mean dog" (severity 1) render in the Nearby list and callouts with exactly the same visual authority as real barriers — colored severity disc, status word, distance — and neither surface offers any "this looks wrong" action: the callout's only control is X (R1: "a cul-de-sac"), Nearby rows only navigate to the pin. The Reject affordance exists solely on the Tasks tab, and nothing links an encountered flag to its triage card. Additionally, the one-tap Verify buttons carry no epistemic prompt — nothing asks "have you seen this spot?" (R6: "can I really verify from my couch?"), and verifying pays points, so the UI's cheapest social action is also its most trust-sensitive one.
**Why it matters:** The DATA being junk is out of scope; the UI's *handling* is the defect. A trust system where garbage is displayed with full confidence at discovery surfaces, while the immune response is parked on another tab with a paid one-tap trigger, teaches users the badge is unguarded (R6: "looks like nobody's minding the store… torpedo trust in the entire verify system the app is built on").
**Evidence:** `flows/map__light__390__nearby-modal.png`, `flows/map__light__390__pin-callout.png` [web-approximated]; `base/tasks__light__390__at-rest.png` (one-tap Verify/Reject, points context); Tasks-only reject verified by capture + `src/screens/TasksScreen.tsx` action wiring; R6 §7/§12, R1 friction #3.
**Skeptic pass:** Is "report this flag" a feature request? Partly — but the minimum finding stands without new UI: the moderation loop already exists and is simply not connected from the surfaces where the junk is met. The epistemic-prompt half is judgment, but three of six readers spontaneously questioned couch-verification. Holds at HIGH.
**Severity: HIGH**

**L8-4 · Guest experience end-to-end · The guest↔auth capability cliff is silent, unsold, and actively mis-documented — and guests are shown moderation buttons the database will refuse.**
> **▸ Post-verification (skeptic CONFIRMED all slices; SPLIT — authoritative): slice (a) — guest Verify/Resolve/Reject buttons render (FlagCard `actions[]` gated on `flag.status` only, not `user`, `TasksScreen.tsx:1528-1567`), the RLS UPDATE deterministically refuses (no `to anon` policy), and the client then shows a FABRICATED "This flag changed — updated by someone else just now" (`:697`, the F53 stale-snapshot message mis-reused for an authz denial) — is now tracked as its own correctness finding L8-4a (HIGH).** L8-4 retains slices (b) docs contradict shipped gates + (c) the three `onPress={onClose}` dead sign-in bridges. Both HIGH. See §Calibration ledger #2.

**L8-4a · Tasks triage (guest) · Guests are shown Verify/Resolve/Reject; the write RLS-refuses (0 rows) and the app reports a fabricated conflict.** *(SPLIT from L8-4 at verification — HIGH, correctness bug.)* FlagCard actions are gated only on `flag.status` — the `useAuth()` user at `TasksScreen.tsx:132` is unused in action construction — so a guest sees full triage buttons. `onSetStatus → setStatus(:672) → updateFlagStatus(flags.ts:938)`; the anon UPDATE hits no `to anon` policy (both policies `to authenticated`), returns 0 rows → `maybeSingle()` null → `throw FlagStatusConflictError` → `:697` renders "This flag changed / It was updated by someone else just now — refreshing the list." Nothing changed; RLS refused. Fix: gate the action row on `user` + an honest "Sign in to verify" prompt (the bulk-watch path already does this at `:558`); stop mapping an authz denial to the stale-snapshot message. [code-verified at HEAD; guest-verify tap never executed in-audit — the RLS refusal is proven from the policy set, not by a live mutation.] **Severity: HIGH.**
**What:** Four capabilities vanish silently for guests: the Map Report FAB (`MapScreen.tsx:2059` `{authUser && …}`), the entire saved-places row (`MapScreen.tsx:1440`), quick-fill templates, and photos. No surface ever explains the boundary as a system: Profile's pitch sells only "Sign in to see your stats, badges, and reports" (consumption, not capability); **How To Help instructs everyone to "Tap + Report on the map… Add a photo"** — an affordance and a step guests do not have; Help FAQ repeats it ("tap the '＋ Report' button at the bottom right"). Worst: guest Tasks cards render full-strength Verify/Resolved/Reject buttons, but flag status updates are RLS-gated `to authenticated` (`supabase/schema.sql:345–360`) — the buttons are offers the backend is designed to refuse (bulk-watch has a "Sign in required" alert, `TasksScreen.tsx:558–560`; the single-card verify path shows no equivalent gate in code). The one excellent exception proves the pattern is achievable: "Your anonymous report still counts. Sign in to add a photo and help verifiers act faster."
**Why it matters:** Web IS guest mode (there is no root sign-in on web), so this is the entire first-contact experience. An app that documents affordances you can't see reads as broken, not gated (orientation §8.7 asks exactly this question). Trust is asymmetric information handled honestly; this is the opposite.
**Evidence:** `base/howtohelp__light__390__at-rest.png` ("Tap + Report on the map"); `base/profile-signedout__light__390__at-rest.png`; `base/tasks__light__390__at-rest.png` (guest verify buttons) [all web-approximated]; `src/screens/MapScreen.tsx:1440,2059` + `supabase/schema.sql:345–360` + `src/components/HelpModal.tsx:32–34` [code-verified]; report-sheet nudge as the good exemplar (`flows/report__light__390__open.png`). Guest-verify failure UX untested (mutating action — see PROBE-REQUEST 3).
**Skeptic pass:** Is the FAB gate itself the defect? No (it's a deliberate Jordan condition); the defect is the *communication* — silence plus documentation that contradicts the shipped gates. Verified at HEAD. Holds at HIGH.
**Severity: HIGH**

**L8-5 · Full Map + Home map peek, both themes · The namesake surface still reads embedded-not-built: raw Leaflet chrome, occluded zoom controls, a web attribution strip through the editorial layout — R5's #1 dent, verified current at HEAD.**
**What:** At HEAD, post-glass-map-chain: the default white Leaflet zoom rectangles sit half-buried **under** the "5 flags nearby" pill (both themes, all widths); the full-width gray attribution strip ("🇺🇦 Leaflet | © OpenStreetMap contributors © CARTO", right edge clipping "CARTO") runs across the map bottom and even pokes through Home's editorial map peek; web tiles are hard-coded `dark_all` ("matches the app's dark UI" — `PlatformMap.web.tsx:531`, a comment predating light mode), producing R6's "the map failed to load" black-hole read inside light mode. The glass chain fixed the app-owned chrome (status pill, action bar, filter panel are now coherent engineered/frost surfaces — visibly good in `flows/map__light__390__filter-open.png`), but the third-party chrome was never claimed.
**Why it matters:** Cohesion is credibility (R5: "the hero screen feels embedded, not built… one focused polish pass away from premium"). For a map company — and to a first-session user this *is* a map company — unstyled vendor chrome on the flagship is the single loudest "passion project, not audited product" signal, and R6 nearly quit on it.
**Evidence:** `base/map__light__390__at-rest.png`, `base/map__dark__390__at-rest.png`, `map/map__light__390__chips-over-tiles-closeup.png` (zoom-under-pill closeup), `base/home__light__390__at-rest.png` (attribution through the peek) [web-approximated — the tile family is web-specific; native light tiles NEEDS-SKY-DEVICE]; `src/components/PlatformMap.web.tsx:531` [code-verified]; R5 friction #1, R6 friction #1, R3 friction #4.
**Skeptic pass:** Did the glass chain fix this? Partially — app-owned overlays are genuinely coherent now; the Leaflet zoom occlusion, attribution strip, and dark-tiles-in-light-shell are all present in the at-HEAD captures. Attribution is legally required but can be styled/condensed; occlusion and tile-theme are pure defects. Currency confirmed. Holds at HIGH.
**Severity: HIGH**

**L8-6 · Header zone, app-wide · Two navigation architectures still ship in one app — R5's #2 dent, verified current at HEAD.**
**What:** Home and Tasks wear the editorial family (uppercase eyebrow + display headline + **circular** icon buttons, feedback as an icon-only chat bubble); Map, Profile, and Settings wear the nav-header family (centered screen title + **rounded-square** hamburger + "Feedback" text pill). Same drawer trigger, two shapes; same feedback action, two grammars; the hamburger also swaps corners between families (R4).
**Why it matters:** The header is where an app declares what it is; two dialects on adjacent tabs reads as two teams (R5: "the app reads as two kits stitched together"). For distinctiveness, the editorial family IS the brand — the nav-header screens dilute it precisely on the flagship Map.
**Evidence:** `base/home__light__390__at-rest.png` + `base/tasks__light__390__at-rest.png` vs `base/map__light__390__at-rest.png` + `base/profile-signedout__light__390__at-rest.png` + `base/settings__light__390__at-rest.png` [web-approximated]; R5 friction #2; R4 friction #5.
**Skeptic pass:** Deliberate hierarchy (editorial for content tabs, quiet for tool screens)? Possibly — but the Map is the *most* branded surface a map app owns, and no token or doc (DESIGN.md/GLASS.md read for this audit) declares the split. Holds at HIGH for the cohesion mission.
**Severity: HIGH**

**L8-7 · Anonymous flags on the map (web pin renderer) · Anonymous reports lose their severity color — the safety encoding — and the gray pin is defined nowhere.**
**What:** `pinIcon(flagIsAnon ? '#9CA3AF' : severityColor(flag.severity), …)` (`src/components/PlatformMap.web.tsx:362–363`): an anonymous severity-5 "Impassable" barrier renders as a neutral gray teardrop — visually quieter than an authed severity-1 — while pins carry no number, so color is the *only* sighted severity signal at map level. The Map legend never mentions gray/anonymous pins (nor the resolved checkmark variant). SR users keep the truth (`alt` announces severity + "submitted anonymously"); sighted users lose it.
**Why it matters:** This inverts both of the app's own laws — the severity ramp as the safety channel, and "color never the only signal" — exactly for the reports produced by the app's proudest feature (anonymous reporting). It also quietly ranks anonymous contributions as second-class data, which contradicts the report sheet's "Your anonymous report still counts."
**Evidence:** `src/components/PlatformMap.web.tsx:362–372` [code-inferred — live anon flags exist (anon INSERT policy live since 2026-05-29) but none are in the captured demo viewport; NEEDS-SKY-DEVICE for a live sighting]; `src/screens/LegendModal.tsx` (no anon/gray entry, verified by grep); DESIGN.md §1 severity-redundancy law.
**Skeptic pass:** Is gray a legitimate "unconfirmed provenance" signal? Distinguishing anon is defensible; *erasing severity* to do it is not — a ring or badge could carry provenance while the fill keeps severity. Access beats aesthetics at equal tier; this is an access-relevant trust defect on the primary surface. Holds at HIGH.
**Severity: HIGH**

#### MEDIUM

**L8-8 · Brand mark, app-wide · Four different identity glyphs; the ownable one appears on exactly two surfaces — and web guests may never see it.**
**What:** The Wayfinder mark (blue pin + white striding figure — wayfinding + human movement, deeply on-mission) exists as `LogoMark.tsx` and the app icon. But: first-launch onboarding slide 1 uses a Lucide **compass**; the replay tutorial uses a generic Lucide **MapPin**; the drawer header uses a **letter-"A" tile** (`HamburgerDrawer.tsx:167` — the very placeholder LogoMark's header comment says was replaced). `LogoMark` is imported by exactly one screen: SignInScreen (`grep -rl` at HEAD). On web, sign-in is an optional Profile modal — a guest can use the entire product and never meet the brand.
**Why it matters:** Distinctiveness needs repetition. The app owns a genuinely good mark and then introduces itself three times with stock glyphs; the "A" tile in the daily-use drawer is the placeholder the design system already retired (DESIGN.md §10 names the mark as *the* brand asset).
**Evidence:** `base/signin-modal__light__390__at-rest.png` (the mark, worn well) vs `flows/onboarding__light__390__slide1-welcome.png` (compass) vs `base/onboarding-replay__light__390__at-rest.png` (generic pin) vs `base/drawer-open__light__390__at-rest.png` ("A" tile) [web-approximated]; `assets/brand/app-icon.png`; `src/components/LogoMark.tsx:11–12`; `src/components/OnboardingCards.tsx:93`, `src/screens/OnboardingModal.tsx:37`, `src/components/HamburgerDrawer.tsx:167` [code-verified]; R5 (onboarding pin ≠ sign-in pin).
**Severity: MEDIUM**

**L8-9 · Tasks tab badge, visible on every screen · One badge, two writers, two meanings — the app's numbers visibly disagree with themselves.**
**What:** RootNavigator sets the badge to **open-only** count (`RootNavigator.tsx:220–221` → 2); TasksScreen overrides it with **open+verified** (`TasksScreen.tsx:614–619` → 5) whenever Tasks is focused. Three blinded readers hit the flip (R6: "the tab badge says 5 but the list says OPEN 2 — numbers don't match"; R2 logged 2-vs-5 as ambiguous; R5 called it out twice).
**Why it matters:** A permanently-visible count that changes meaning by tab is a small lie with outsized reach — it trains users that AccessMap's numbers are approximate, which is fatal ambient conditioning for a data product (same failure family as L8-1, smaller blast radius).
**Evidence:** `base/home__light__390__at-rest.png` (badge 2) vs `base/tasks__light__390__at-rest.png` (badge 5, list showing OPEN 2 + VERIFIED 3) [web-approximated]; `src/navigation/RootNavigator.tsx:220–221`, `src/screens/TasksScreen.tsx:614–619` [code-verified — two competing definitions confirmed].
**Severity: MEDIUM**

**L8-10 · Zero-data areas (map pill, Home list) · "0 flags nearby" / "No barriers reported yet." read as *surveyed-and-clear*, not *no coverage* — the empty-area honesty problem.**
**What:** The pill renders "0 flags nearby" in an unreported area; Home's empty list says "No barriers reported yet." (`HomeScreen.tsx:309`). Neither distinguishes "checked, clear" from "no one has looked here". The honest framing exists only in the heatmap toast ("Based on community reports — coverage varies by area") — an opt-in layer's disclosure, absent from the default map.
**Why it matters:** R1 named the stakes: "an empty map reads as 'no barriers,' which is the most dangerous possible misreading." Wheelmap solves this with an explicit unknown-state; AccessMap's barrier model can't mark unknown streets, but its *copy* can stop implying completeness ("No reports here yet — be the first" vs "No barriers reported yet"). This is the cheapest of the trust fixes.
**Evidence:** `src/screens/MapScreen.tsx:1282` ("0 flags nearby" branch), `src/screens/HomeScreen.tsx:309` [code-inferred — the demo dataset has 5 flags, so no zero-state capture exists; see PROBE-REQUEST 1]; `map/map__light__390__heatmap-on.png` (the toast that gets it right); R1 friction #2/task-walk.
**Severity: MEDIUM**

**L8-11 · Product vocabulary, cross-screen · One thing, four names: barriers → flags → reports → tasks.**
**What:** Onboarding says *barriers*, the map and its pill say *flags*, Home says *reports*, the moderation tab is *Tasks* (verifying *reports* of *barriers* via *flags*). Status word "open" additionally collides with open-for-business on Home rows (R6). The severity grammar proves the app can hold one vocabulary with discipline; the object noun has none.
**Why it matters:** Each rename costs a re-orientation (R6 ranked it #3 and it directly delayed her severity comprehension). For distinctiveness: you cannot own a concept you haven't named — "flag" is the app's best candidate (it's in the logo story, the DB, the deep-link scheme) but it's the least explained on screen.
**Evidence:** `flows/onboarding__light__390__slide1-welcome.png` ("barrier"), `base/map__light__390__at-rest.png` ("5 flags nearby"), `base/home__light__390__at-rest.png` ("Most recent reports", "Minor · open"), `base/tasks__light__390__at-rest.png` ("Review barriers… reports") [web-approximated]; R6 friction #3.
**Severity: MEDIUM**

**L8-12 · Help & FAQ (the trust fallback surface) · The help that defines the trust system is partially wrong about the shipped app.**
**What:** Three accuracy drifts at HEAD: (1) "Open the **Map tab**" — there is no Map tab (tabs are Home/Tasks/Profile; Map is a hidden route); (2) "tap the '＋ Report' button at the bottom right" — auth-only, invisible to guests (and the answer never says so); (3) "Map → tap the **magnifying glass icon** → check Categories, Minimum severity…" — the magnifier opens address search; filters are the sliders icon. Also "Resolved reports… appear in a different color" — they keep severity color and gain a check glyph.
**Why it matters:** Help is consulted at the exact moment trust is already strained; stale instructions there convert confusion into verdict. It's doubly costly here because this same file contains the app's *only* definition of "verified" (L8-2) — the one page that must be right.
**Evidence:** `src/components/HelpModal.tsx:32–34, 40–42, 56–58` vs tab set (orientation §2, `RootNavigator.tsx`) and the action-bar iconography in `base/map__light__390__at-rest.png` [code-verified at HEAD].
**Severity: MEDIUM**

**L8-13 · "What's New" changelog · The honesty surface went stale: one entry, six weeks and three visual eras ago.**
**What:** `ChangelogModal.tsx` contains a single entry dated 2026-05-23. Since then the app shipped v3.0.0, the editorial Home, the entire Deep Field system, heatmap, presets, onboarding — none logged. Title also drifts: modal "What's New" (`ChangelogModal.tsx:76`) vs Settings row "What's new" (`SettingsScreen.tsx:536`).
**Why it matters:** R5 explicitly counted "the honest changelog" toward trust. A changelog that stops while the product visibly evolves reads as abandonment or spin — the two readings a civic tool can least afford. (Low effort, high signal: this surface is pure copy.)
**Evidence:** `src/components/ChangelogModal.tsx:28,76`; `src/screens/SettingsScreen.tsx:536`; `app.json` version 3.0.0; `base/changelog-modal__light__390__at-rest.png` [code-verified + web-approximated].
**Severity: MEDIUM**

**L8-14 · About sheet + submit moment · Openness and process claims without anchors: "open" source with no link, a "visible log" the map never shows, and a submit that never says what happens next.**
**What:** About claims "The maps, icons, and database schema are open" under a heading literally titled SOURCE CODE — with no repo link or license name; "Status changes… are logged… visible to other users" — true only via Tasks→Details→History (no map-side path, L8-2). The report submit moment ("Report anonymously" enabled) never states who sees the report, when it appears, or that *other users* — not the city — verify it (R6: "the submit is a black box… the onboarding promise 'so it gets fixed' is never cashed out" — it is cashed out only in the drawer's Resources page).
**Why it matters:** Unverifiable virtue claims read as decoration exactly where the app is otherwise unusually honest. One sentence under the submit button ("Your report appears on the map now; neighbours can verify it. AccessMap doesn't notify the city — see Resources.") converts the black box into the app's most honest moment.
**Evidence:** `src/screens/AboutScreen.tsx:97–126`; `base/about__light__390__at-rest.png`; `flows/report__light__390__ready-submit.png` [web-approximated]; `base/resources__light__390__at-rest.png` (where the promise IS cashed); R6 §17/task-walk.
**Severity: MEDIUM**

**L8-21 · About sheet + Feedback modal, light mode · The light-mode sheets still ghost their backdrops legibly — designed glass that reads as a rendering bug — and the Feedback footer still hides the reply-email field (R5's #3, verified current at HEAD).**
**What:** In `base/about__light__390__at-rest.png` (captured at HEAD, post-W1 bulk-glass conversion), the underlying Home screen ghosts through the sheet clearly enough to read — the "5 barriers" headline outline sits under the About title, the map-peek block floats behind the "Built for accessibility" body text, the Report pill glows through near the footer. Contrast is arbitrated-PASS (the bulk floor + `inkGlassMuted` are the measured pairing, `AboutScreen.tsx:229–238`), so this is not an AA defect — it is a *perceived-quality* defect: body text over readable ghost blocks reads as z-fighting (R5: "reads as a rendering bug"). Same family: `base/feedback-modal__light__390__at-rest.png` shows the "REPLY EMAIL (OPTIONAL)" label with its input hidden behind the pinned Cancel/Send row, and the disabled Send washed to near-invisibility.
**Why it matters:** About is the page carrying the privacy promises (L8-14) — the worst possible place to look broken. The ghosting is the one spot where Deep Field's cost shows without its payoff; the web BlurView at i=24 blurs less than the design intends (true blur feel is device-only — the native read may be fine: NEEDS-SKY-DEVICE).
**Evidence:** `base/about__light__390__at-rest.png`, `base/feedback-modal__light__390__at-rest.png` [web-approximated at HEAD]; `src/screens/AboutScreen.tsx:44–51,135–170` (bulk variant + scrim); R5 friction #3.
**Skeptic pass:** Fixed by the glass chain? No — these captures ARE the glass chain's output; the conversion moved the sheet onto sanctioned bulk glass but the web render still ghosts legibly. Severity capped at MEDIUM because AA holds and the surfaces are secondary; the trust cost is real but perceptual.
**Severity: MEDIUM**

#### LOW

**L8-15 · Modal family + sibling pages · Affordance and grammar schisms: four dismissal idioms, two icon-container languages, three casing styles — R5's #5, verified current.**
**What:** Dismissal: X-in-circle (About/MyFeedback), bordered "Close" chip (Nearby list header), full-width bottom "Close" pill (Legend), "Cancel" (Report). Sibling pages: HowToHelp uses tinted **squircles** (red/green/blue/amber), Resources uses uniform blue **circles**. Casing: "How To Help" vs "About the App" vs "What's new". Time formats mix "29d ago" with absolute "Jun 2, 2026" inside one list, and the callout shows no age at all (feeds L8-2).
**Why it matters:** Each is minor; together they are the texture of "several hands, no editor" — the precise opposite of the one-voice impression HowToHelp proves the app can achieve.
**Evidence:** `base/about__light__390__at-rest.png`, `flows/map__light__390__nearby-modal.png`, `flows/map__light__390__legend-modal.png`, `flows/report__light__390__open.png`, `base/howtohelp__light__390__at-rest.png`, `base/resources__light__390__at-rest.png` [web-approximated]; R5 friction #5.
**Severity: LOW**

**L8-16 · Feedback + MyFeedback modals · Emoji in product UI against the design system's own law.**
**What:** DESIGN.md §10: "SVG icons only — no emoji." Feedback category chips are 🐛 💡 ❤️ 💬; MyFeedback's empty state is a glossy Apple 💬 on a dark card.
**Why it matters:** Small, but it breaks the system's *self*-consistency — the strongest internal signal of whether laws here are laws. (Also renders platform-inconsistently, which the SVG rule exists to prevent.)
**Evidence:** `base/feedback-modal__light__390__at-rest.png`, `base/myfeedback-modal__dark__390__at-rest.png` [web-approximated]; DESIGN.md §10.
**Severity: LOW**

**L8-17 · Map action bar · Invented glyphs without an on-ramp: "1+" and the shapes cluster read as noise to every fresh reader.**
**What:** The severity quick-cycle renders as bare text "1+"; the category quick-cycle is an unlabeled triangle-square-circle glyph. R6 ("means nothing to me yet"), R1 ("half the toolbar icons mean nothing"), R3 ("a row of unlabeled little icons") all stalled; the meanings only become learnable inside the filter panel.
**Why it matters:** Novel controls are a distinctiveness asset only when self-teaching; here the novelty spends trust (three readers assumed broken/cryptic) before it earns recall. A first-use tooltip/label or count-styled chip ("Sev 1+") keeps the invention and adds the on-ramp.
**Evidence:** `base/map__light__390__at-rest.png`; `src/screens/MapScreen.tsx:506–512, 858+` (the two cycle controls) [web-approximated + code-verified]; R6 §8, R1, R3 first impressions.
**Severity: LOW**

**L8-22 · Tablet (834pt) across screens · The tablet is still a stretched phone — recorded here for its cohesion/credibility cost; layout depth belongs to the size/layout lens.**
**What:** At HEAD, `base/tasks__light__834__at-rest.png` shows third-of-screen-wide sort pills (~470pt each), full-width single-column cards with ~410pt Verify buttons, and a full-width search field — the 390 layout inflated, exactly as R5 described; Home 834 keeps the un-tiled map void + dead lower half.
**Why it matters (L8 angle only):** iPad is where "premium civic tool" impressions are formed in demos and reviews; a stretched phone at 834 reads as unfinished even when every element is individually polished. Verified current so the merge doesn't mark R5's #4 stale — full treatment deferred to the layout lens.
**Evidence:** `base/tasks__light__834__at-rest.png`, `base/home__light__834__at-rest.png` [web-approximated]; R5 friction #4.
**Severity: LOW (as cohesion signal here; the layout lens owns the full finding)**

**L8-18 · Product name · "AccessMap" collides with the established UW Taskar Center product (accessmap.io) in the same sidewalk-accessibility niche.** [text-inferred]
**What:** From model knowledge (no web access): "AccessMap" is a known, publicized pedestrian-accessibility routing tool for Seattle-area sidewalks by the Taskar Center for Accessible Technology (accessmap.io), with academic press coverage. Same name, same problem space, different mechanic (routing vs reporting).
**Why it matters:** For memorability and credit — portfolio reviewers, app-store search, and civic partners will find the other AccessMap first; ambiguity dilutes exactly the distinctiveness this lens is chartered to protect. Not a UI defect; a strategic naming risk worth a conscious decision (keep-and-differentiate vs rename before any public launch).
**Evidence:** [text-inferred — model knowledge; verify before acting]; `app.json` name/slug.
**Severity: LOW**

#### POLISH

**L8-19 · app.json brand hygiene · Notification color `#1a4fa3` ≠ Wayfinder Blue `#1466E0`; Android adaptiveIcon has backgroundColor only (foreground falls back to the square icon — mask crop unverified); splash reuses the rounded-square icon PNG on a brand-blue field (double-framing risk).**
**Evidence:** `app.json` notification/android/splash blocks [code-verified; render NEEDS-SKY-DEVICE].
**Severity: POLISH**

**L8-20 · Map pins at render size · The bespoke category glyph inside the teardrop is near-illegible at actual pin scale (the "no ramp" glyph reads as a blob at 390 width) — the signature asset's weakest link is its most-seen size.**
**Evidence:** `base/map__light__390__at-rest.png`, `map/map__light__390__chips-over-tiles-closeup.png` [web-approximated at DPR-2; true retina read NEEDS-SKY-DEVICE]; `src/components/CategoryIcon.tsx` (24-grid glyphs scaled down in `pinIcon`).
**Severity: POLISH**

---

### R5 credibility-dent ledger (currency check at HEAD `82e738b`)

Mandated verification of R5's five named dents against at-HEAD captures + code. Nothing was stale; the glass chain fixed *app-owned* map overlays but none of the dents outright. (Finding ids are discovery-ordered; severity grouping above is authoritative.)

| R5 dent | Status at HEAD | Absorbed into |
|---|---|---|
| #1 Map material breakdown (zoom occlusion, attribution strip, dark tiles in light shell) | **CONFIRMED CURRENT** — capture + `PlatformMap.web.tsx:531`; app-owned overlays now coherent (glass chain), vendor chrome untouched | L8-5 (HIGH) |
| #2 Two navigation architectures / hamburger shapes / feedback grammars | **CONFIRMED CURRENT** — visible across at-rest base captures | L8-6 (HIGH) |
| #3 Light-mode sheet translucency + feedback footer collision | **CONFIRMED CURRENT** — About ghosts its backdrop legibly even on sanctioned bulk glass; reply-email field still hidden behind the button row | L8-21 (MEDIUM) |
| #4 Tablet is a stretched phone | **CONFIRMED CURRENT** at 834 (tasks/home) — cohesion note here, depth deferred to the layout lens | L8-22 (LOW, deferral) |
| #5 Icon-language & affordance schism (emoji vs line icons, close affordances, casing, badge 2-vs-5, date formats) | **CONFIRMED CURRENT** — every sub-item re-sighted at HEAD | L8-15, L8-16 (LOW); badge → L8-9 (MEDIUM) |

### PROTECT nominations (L8)

*(L8's own list; the orchestrator merges all lenses' nominations after the fan-out and appends the merged list here.)*

1. **The severity grammar** — the calibrated amber→red ramp + number + word + stakes-line ("Impassable. Needs a detour."), identical across legend, lists, report form, heat legend, with the arbitrated ink-on-color rule (`theme.ts severity`, ink on 1–4 / white on 5). This is the signature. Never let a redesign speak severity in only one channel.
2. **The Wayfinder mark + app icon** (pin + striding figure) and the named brand color ("Wayfinder Blue" `#1466E0`, mode-independent `ctaFill`) — ownable; the fix is to wear it more (L8-8), never to replace it.
3. **The bespoke category glyph set** (`CategoryIcon.tsx` — six 24/2px glyphs drawn on the Lucide grid) — quiet, systematic, extendable; a real house style.
4. **Privacy-forward trust copy as a voice**: "Reporting anonymously — your identity is not stored."; "To protect reporters, heat zones only appear where at least 3 flags have been submitted." (the k≥3 caveat is honest AND comprehensible — rare); sign-in's "Your location is only used when you place a flag. Your email is never shown publicly."; About's plain-English privacy section; Settings' "Export my data". This voice is a competitive moat — no app in the meta table talks like this.
5. **Resources' ecosystem honesty** — naming the city/311 path, advocacy groups, and even complementary competitor apps; it cashes the "so it gets fixed" promise and is the most credible page in the product. (Surface it better; don't dilute it.)
6. **HowToHelp's civic framing of points** ("It's a small token — but it reflects real value") + Civic Gold reserved for gamification on ink — the points economy as displayed reads civic, not gimmick. Keep the leaderboard/streaks auth-side and gold-on-ink.
7. **The Nearby list card grammar** — category + severity disc + distance + status + age in one breath (R2: "the best thing in the app"; R1: "actionable"). It's the trust ledger in miniature; L8-2 should be solved by *extending* it, not replacing it.
8. **The empty-filters recovery card** ("Your filters are hiding everything" + surgical one-tap fixes) — R1: "the app's best moment; how every failure state here should behave."
9. **Deep Field's discipline on the live map** — no stage over tiles, `forceEngineered` pan-time chrome, exactly one frost moment (the filter panel), arbitrated AA floors as law. This is material-with-restraint building trust; the system's own §1 claim ("decorative only… removing blur never loses information") is true in the captures and is the correct civic posture.
10. **The maker-voiced micro-copy**: drawer "AccessMap · Made with ♥ in Canada", the changelog's candid bullets ("cleaner than four floating circles"), onboarding's "Back. Disabled on first card." — human, specific, and consistent with born-accessible ethos.

### Copy observations (L8)

- **Keep verbatim:** "Impassable. Needs a detour." · "Reporting anonymously — your identity is not stored." · "Your anonymous report still counts. Sign in to add a photo and help verifiers act faster." (this is the template for selling auth everywhere else) · "To protect reporters, heat zones only appear where at least 3 flags have been submitted." · "Flagging a barrier is the first step. These resources help get it fixed — and help you plan around it in the meantime."
- **The two heat-map caveats are complementary, not duplicated** — the map toast explains data quality ("coverage varies by area"), the legend explains privacy ("to protect reporters") — but only heatmap users ever see either; the coverage line deserves a home on the default map (L8-10).
- **Define "verified" in the legend in one line** — the FAQ already wrote it: "another person checked the spot and confirmed the issue is real." Move/duplicate it.
- **Noun canon needed** (L8-11): pick *barrier* (human) as the display noun and *flag* (system) as the object noun, and use them consistently; retire "reports/tasks" as display nouns. Also "open" → consider "unconfirmed"/"reported" to break the open-for-business collision.
- **Submit-moment sentence missing** (L8-14): one line under the CTA stating visibility ("appears on the map for everyone"), the verify loop, and the city non-relationship.
- **Fix in Help FAQ:** "Map tab" → real navigation; magnifier → sliders for filters; "+ Report" answer needs the guest path (Home → Report a barrier) and the auth note; "different color" for resolved → "a checkmark".
- **Stale changelog** (L8-13) — add the v3 era entries; align "What's New"/"What's new".
- **Casing sweep:** "How To Help" vs "About the App" vs "What's new"; "My Feedback" modal vs "My feedback history" row.
- **onboarding slide 2 is doing the trust-system's best teaching** ("Other people verify your report or mark it resolved once the issue is fixed") — echo that sentence at the point of verify (Tasks) and at submit.

### PROBE-REQUESTs

1. **PROBE-REQUEST: zero-data viewport capture.** Pan/deep-link the map to a region with no flags (e.g., address-search a distant city) and capture the pill + map at rest, both themes @390 — upgrades L8-10 from code-inferred and documents the exact "0 flags nearby" framing.
2. **PROBE-REQUEST: anonymous-flag pin sighting.** If any live anon flag exists (or via a lab mockup consistent with `pinIcon`'s anon branch), capture the gray pin beside colored pins, light+dark — upgrades L8-7's visual half from code-inferred. Device pass should also confirm the native marker's anon treatment (NEEDS-SKY-DEVICE).
3. **PROBE-REQUEST (requires Sky approval — mutating):** as a guest, tap Verify on a Tasks card against a staging/branch database and record the exact failure UX (silent no-op vs stale-flag error vs alert). Read-only rails prohibit this probe in-audit; L8-4's RLS analysis stands on code, but the shipped failure message should be seen once before the fix is designed.
4. **PROBE-REQUEST: NEEDS-SKY-DEVICE brand pass.** One device session covering: app icon on home screen + splash (L8-19), Apple light tiles under the pin family and always-light chips (L8-5's native half), pin-glyph legibility at true size (L8-20), and the Android adaptive-icon mask crop.


---

## §Parked-item dispositions

The four seeded parked items + the two registry items, each CONFIRM (still real, now in scope) / CLOSE (no longer applies, proven) / PARK (still deferred, why).

**① RecentlyViewedRow severity-dot white-text-on-every-severity contrast** (`RecentlyViewedRow.tsx`, flagged out-of-scope in `qa-reports/2026-07-03_Glass_Rollout_W2_Profile.md`) → **CONFIRM (now in scope).** The arbiter measured it head-on: the white digit reads **1.57 / 2.15 / 2.78 / 3.61** on sev1–4 fills vs the 4.5 floor (`partials/arbiter.md` §D-1), and the disc BOUNDARY melts on light sev1–3 (1.53–2.75) and dark sev5 (2.41/2.39, a new discovery) (§D-2). It is site 5 of the SEVEN white-digit render sites in canonical **L2-1 / L6-08 / L6-10** (CRITICAL). Reachability: auth-gated (signed-in Profile `:1319`), so lower than the guest-reachable sites (NearbyFlagsModal, Report selected chip, Legend) — but the same defect and the same one-token fix (`severity[n].textOnColor`, which already exists at `theme.ts:543-547` and ships correctly on SeverityBadge/MapScreen/AdminScreen). No longer parked; it rides the CRITICAL cluster. [arbiter-measured]

**② Stage lower-right light pool `stagePoolB`** (`theme.ts:202` `rgba(15,83,190,0.06)`; GLASS §2 Stage; Sky's pending taste call) → **PARK (Sky's taste call — a judgment is offered, not a finding).** At 390 the pool is sub-perceptual — the card stack covers most of its footprint and 0.06 alpha reads as, at most, a faint cool deepening toward the bottom corner (`parked/tasks__light__390__pool-bottom.png`); at 834 the uncovered right margin shows it as a gentle anti-flat gradient (`parked/tasks__light__834__pool-bottom.png`); dark correctly has none (`stagePoolB:'transparent'`, `ThemeContext.tsx:154`; `parked/tasks__dark__*` uniform). It serves restraint and costs nothing legible; killing it would be imperceptible at phone widths, keeping it costs nothing. The call remains Sky's. [web-approximated]

**③ Deferred dark-themed saved-place-chips** (chips pinned always-light over live tiles — GLASS §8 + §12; parked during Map planning, `qa-reports/2026-07-04_Glass_Rollout_Map.md`) → **PARK (still deferred, no new pressure to change).** The entire saved-place chip row is auth-gated (`MapScreen.tsx:1440` `{authUser && …}`) — guests never see it, so no live capture exists (the `map__*__chips-over-tiles-closeup` shots prove the absence and show the pill + action bar only). The SHIPPED always-light chips are AA-by-construction: the arbiter's `placeChip` (0.95) / `manageChip` (`#EEF4FE`) pairings pass over `#000` + `#FFF` + the 5 heat bases (`map-stacks.json`, re-verified exit 0 this audit). The deferred idea — dark chips over dark iOS tiles instead of the always-light pin — stays a live parked question: pinning light is the ratified shipped choice; the dark variant is unbuilt and its "over LIGHT Apple tiles" read is device-only. No audit evidence forces the decision either way. [arbiter-measured + code-inferred; NEEDS-SKY-DEVICE for the light-tile visual]

**④ Deferred EXIF-strip + VoiceOver device checks** (`qa-reports/2026-06-09_AccessMap_ReSweep_Fixes.md §7` + `2026-06-04_OnDevice_A11y_Checklist_PreTestFlight.md`) → **PARK → NEEDS-SKY-DEVICE (unchanged; the audit cannot exercise either).** EXIF: the re-encode `manipulateAsync(uri, [], {compress:0.9})` (`flags.ts:108-111`) is on the AUTH photo path (guests have no photo affordance — L3 confirmed), inside the never-signed-in fence; the audit CODE-CONFIRMS the strip-by-re-encode exists (empty actions array → EXIF dropped, but no resize — see L7-05) but cannot verify on-device GPS removal. VoiceOver: the entire native SR truth is device-only — most importantly **L6-04** (Tasks card actions possibly flattened under an `accessible` parent — "the single most important VoiceOver device-check in the audit"), plus **L6-19** (SignInScreen missing `accessibilityViewIsModal`) and every RN-web-artifact caveat R2 raised. Both remain on Sky's consolidated on-device list. [code-inferred + NEEDS-SKY-DEVICE]

**⑤ `ui/Button` adopt-or-remove** (zero call sites — GLASS §11) → **CONFIRM (still open, unchanged at HEAD).** Grep at HEAD: **zero `<Button` call sites** app-wide — only the barrel re-export (`src/components/ui/index.ts:9-10`). Exactly as GLASS §11 + the Tasks build report §3.11 flagged; nothing adopted it in the W1/W2/Map waves. Not a defect — a standing Sky decision (adopt per the lab's recommendation, or delete). Carrying it forward so it is not lost. [code-verified]

**⑥ Map wave's deferred `bodyMedium` (≥500-weight-on-glass) adoption** (`qa-reports/2026-07-04_Glass_Rollout_Map.md` §7) → **PARK (still deferred) — and one UNDISCLOSED sibling surfaced.** L2-10 verified the on-glass 400-weight text to the line: the disclosed Map deferral is the filter panel's `savedEmptyText` (`MapScreen.tsx:1566`, style `:2752`) + `statusHint` ×4 (`:1735/:1765/:1799/:1853`, style `:2587`); everything else on the panel is label-600/heading-700. **Undisclosed sibling:** the Tasks empty-state `emptyBody` (`TasksScreen.tsx:1221`, style `:2030` — `variant="body"` 400 on the row-glass empty card in the worked-example screen itself; tempered because nothing scrolls behind a static empty card). This is the material-haze ≥500 law (GLASS §2), NOT a contrast breach — every ink passed the arbiter. Device-eyes pending, as the Map report scoped. [code-verified; NEEDS-SKY-DEVICE for the haze feel]


---

## §Sky-decision notes

Everything the UI audit observed that touches backend / data-logic / privacy-architecture / product-scope — observed and framed, **never prescribed**. These are Sky's calls; several are the load-bearing questions behind the CRITICAL/HIGH findings and cannot be resolved by a UI fix alone.

```
DECISIONS FOR SKY (fenced — backend / data / privacy / scope; observed, not prescribed)

1. PROXIMITY ARCHITECTURE (behind CRITICAL L3-2, HIGH L7-03). The "N flags nearby" pill and
   the whole FIND promise assume a geo-scoped query, but every flag fetch is a global
   most-recent page with NO lat/lng predicate (flags.ts:606-615/:652-671) and no viewport
   re-scope (no onRegionChange on either PlatformMap). This is a DATA-LAYER decision, not a
   copy fix: does AccessMap add bounded/`ST_DWithin`-style spatial queries + a region-change
   fetch, or does the UI stop claiming "nearby" until it can? At 5 flags it is invisible; at
   real scale, pin-absence reads as barrier-absence — the mission's dangerous failure mode.

2. THE POINTS ECONOMY & ITS HONESTY (behind HIGH L3-4). The actor-bonus trigger condition
   `auth.uid() <> NEW.user_id` (schema.sql:163-165) is SQL-NULL, not TRUE, for anonymous flags
   (NEW.user_id IS NULL) — so triaging an anon report awards 0 while the UI flashes "+3/+7".
   The fix is a one-line trigger change (`IS DISTINCT FROM`) — a DB migration, Sky-applied,
   never auto-run — OR a UI suppression. Also: CLAUDE.md's "Database" section still teaches the
   OLD 5/2/10/5 values while the live trigger + UI use 10/3/15/7 (schema.sql:112 carries an
   unresolved "DECISION PENDING (Sky)"); the doc drift invites a future regression of the
   honesty chain even though the shipped UI is currently truthful.

3. THE AUTH WALL & THE GUEST CONTRACT (behind CRITICAL L3-1, HIGH L8-4/L8-4a/L1-2). The product
   ships THREE silently-different guest capability cliffs (no FAB, no photo, no saved places,
   no quick-fill) AND documentation that contradicts the shipped gates (HowToHelp/Help/SignIn
   copy tells guests to use auth-only affordances / implies reporting needs an account while
   anonymous reporting is live). Guests are even shown Verify/Resolve/Reject buttons the RLS
   deterministically refuses, with a fabricated "changed by someone else" error. The
   cross-cutting question is a PRODUCT one: what is the guest contract, and should the web
   build (which IS guest mode) request location and expose a real sign-in path at all? UI fixes
   follow from that decision; they cannot precede it.

4. K-ANONYMITY / HEATMAP POSTURE. The heatmap's k>=3 protection + the user-scoped offline cache
   (a deliberate privacy choice — Jordan Condition 2) are sound; the audit did not undermine
   them. Two observations only: the "Show saved data" banner never states data AGE (L7-02), and
   the k-anonymity caveat copy is honest but terse. Both are copy/UI, but the cache-scope
   decision (guests get no offline resilience) is a privacy-vs-utility call worth a conscious
   ratification, not an accident of implementation.

5. CATEGORY TAXONOMY & VERIFICATION/TRUST MECHANICS (behind HIGH L8-2, L8-3). "Verified" — the
   core trust word — is never defined at any point of decision, never shows a verifier count,
   and the built trust ledger (flag_verifications, flag_status_history, StatusHistoryModal) is
   unreachable from the map. And untrusted content ("BUMBAKLOT · verified · sev 5") wears full
   institutional confidence with no in-place report/flag-as-wrong affordance — moderation lives
   only on an auth-gated tab behind a paid trigger. Surfacing the ledger + a counter-affordance
   is a TRUST-MODEL scope decision (how much verification provenance to expose, and whether
   guests can flag content) with UI consequences, not the reverse.

6. PRODUCT NAME COLLISION (L8-18, text-inferred). "AccessMap" collides with the established UW
   Taskar Center product (accessmap.io) in the very same sidewalk-accessibility niche — a
   naming/brand-strategy call outside this audit's scope but flagged because it affects
   distinctiveness and discoverability.

7. THE ONE EAS TESTFLIGHT BUILD (context, not a request). Every glass wave + this audit converge
   on the same gate: the device-only truths (true blur feel, VoiceOver traversal incl. the
   load-bearing L6-04 flattening check, Reduce Transparency, real Dynamic Type, Apple light
   tiles, EXIF strip) can only be settled on Sky's iPhone. The audit is READ-ONLY and never
   built; the build remains Sky's, as does every merge.
```


---

## §Probe log

Stage-4 re-captures, run serially through the Part-1 harness (`tools/capture.mjs` + `tools/probe-p2-dynamic.mjs`) on the same dev-mode `npm run web` serve as every wave capture. All appended to `01_render-index.md` (search "P2 PROBE"); verify1 re-run PASS after probes (424 expected == on-disk == indexed). Every probe honestly tagged `web-approximated`.

| # | Probe | Files | What it adjudicated | Outcome |
|---|---|---|---|---|
| 1 | Guest report sheet, no location grant | `probes/report-noperm__{light,dark}__390__{open,after-25s}.png` | L3-1 (was code-inferred) | **Decisive.** SHA-256 byte-identical at open vs t+25s (light `80ad9c3e…`, dark `b75835b3…`); "Waiting for location…" never resolves past the 15s GPS timeout; submit stays disabled. L3-1 upgraded code-inferred → captured. Also anchors L2-1 (white "3" on orange), L3-11 (coord line), L6-01 (stateless selections). |
| 2 | Cold-load Supabase-abort settle timing | `probes/home-failure__light__390__{t5,t30,t70}.png` + `probes/map-refresh-fail__light__390__{t5,t30,t70}.png` | L7-01 / L3-7 / L1-12 (indefinite vs eventual) | **Quantified.** Home: t5 skeleton+em-dash → **t30 "Couldn't load reports." + Try again** (t70 identical, stable). Map: t5 "Loading flags…" → **t30 loadError banner** (stable). So the middle is unbounded ~5–30s on a clean abort (minute-plus on OS-socket poor-signal), NOT infinite → L7-01 held at HIGH. **Surfaced a NEW copy defect:** the Map banner rendered raw "Unknown error", not the friendly `errors.ts` copy. |
| 3 | Reduce-motion camera flight trace | `probes/rm-flight__light__390__{panned,t150,t700,t1600}.png` | L4-01 (inverted RM gate — needs a motion trace, not a still) | **Proven.** Under `emulateMedia reduce`, tapping Recenter produced a genuine INTERMEDIATE map frame at t+700ms (Coldstream/Okanagan Lake/Lake Country/Kelowna at an intermediate zoom), distinct from both endpoints — the flight ran, and ran >1s, longer than a non-RM user's 0.6s. Confirms `duration:0` is falsy to Leaflet 1.9.4. |
| 4 | Reduce-motion cluster-expansion trace | `probes/rm-cluster__light__390__{pre,t120,t620}.png` | L4-02 (cluster fly ignores RM) | **Proven.** A "5" cluster DID form (the "inconclusive at 5-flag scale" caveat did not apply); under RM the t+120ms frame is a mid-zoom intermediate → the 0.4s `flyTo` animated. |
| 5 | Panned-empty viewport | `probes/map-probe__{light,dark}__390__{zoomout-wheel,panned-empty}.png` | L7-03 + L3-2 facet-b + R1's "no clustering" claim | **Decisive for L7-03.** Panned ~4 screens west to Slocan Lake: zero pins/clusters in the viewport, pill still asserts "5 flags nearby" — the global-page/no-rescope defect on screen. `zoomout-wheel` also adjudicated R1's no-clustering claim (clusters DO form when zoom is driven past the occluded control) — an evidence gap, now closed. |
| 6 | Home peek interaction | `probes/home-peek__light__390__{pre,wheel-after,clustertap-after}.png` | L5-06 / L4-06 (is the peek a live map?) | **Confirmed.** Wheel over the peek left the page `scrollTop` 0→0 while the peek's map zoomed out to show all of San Francisco — the peek ate the scroll gesture. Tap-on-empty opened FullMap (Pressable won). The peek is genuinely live on web. |
| 7 | Ghost-label reproducibility | `probes/profile-ghost__dark__834__{recheck-1,recheck-2}.png` | L2-14 (ghost "Tasks" bleed on dark tablet Profile — artifact or real?) | Fresh-context ×2 re-capture banked for L2-14's determinism check (rendering artifact vs one-off). |
| 8 | Onboarding under Dynamic-Type stress | `probes/onboarding-dt__light__390__{slide3-z13,slide3-z20}.png` | L1 / L1-3 (does the first screen a low-vision user meets survive 2×; what forward affordances ship) | Slide 3 (location permission) captured at 1.3× and 2.0×; shows exactly three controls — Skip / Back / **Allow Location** — confirming L1-3 (no "Continue"/decline forward affordance for an ungranted first-run user). |
| — | (removed after run) onboarding slide-5 z13/z20 | — | — | The two slide-5 jobs threw because the nav clicked "Continue" on the location slide, but that slide's forward button is "Allow Location" — the failure itself CORROBORATES L1-3. Removed from the manifest (not load-bearing; slide 3 anchors L1-3), honest note in `tools/manifests/p2-probes.json`. Not a silent truncation. |

**Dynamic probes** (`tools/probe-p2-dynamic.mjs`) express the timed-trace / interaction states the manifest DSL can't (RM flight/cluster traces, panned-empty, peek wheel + tap). Read-only on the app: tile fetches + Supabase anon reads only; no submit, no auth, zero writes.


---

## §Copy-observations index

Copy-level observations gathered by each lens (no rewrites beyond this appendix — audit rail). Grouped by lens.

### L1 — copy observations

- **One thing, four names in the first minute:** "barrier" (slides 1-2, Home) → "flags" (slide 3, map UI) → "reports" (Home subtitle) → "Tasks" (tab). Slide 3's title "Show flags near you" introduces the term with zero definition. R6's #3 friction; each rename taxes cognitive-load users.
- **Two different location-privacy contracts:** onboarding says "only used while the app is open — never tracked or stored on our servers"; the sign-in screen says "Your location is only used when you place a flag" (also understates: browsing with location computes nearby distances). Neither mentions that a submitted report publishes the chosen coordinates permanently. One canonical sentence, reused, would be stronger and truer.
- **"Open the Map" never opens the map:** final carousel CTA → Home (web) or sign-in (native); replay CTA + its a11y hint ("opens the map") → returns to Settings.
- **SignInScreen guest note/hint** ("need an account to report" / "Reporting flags requires an account") contradicts the shipped anonymous flow — the copy half of L1-2.
- **"1 / 5" position pill** announces as "one slash five"; the replay modal already uses the better "Step N of M" phrasing.
- **"Next. Card 1 of 5."** labels the current card, not the destination; "Next, to card 2 of 5" would match user expectation.
- **Stale code comment:** `MapScreen.tsx:1041` says the first-time prompt is deferred to "OnboardingCards card 4" — it's card 3.


### L2 — copy observations

- **Raw status enum leaks on Home:** rows print `item.f.status` lowercase ("Minor · open", HomeScreen.tsx:333-334) while every pill uses `STATUS_LABELS` ("Open") — one surface speaks database, the rest speak product. (R6 read "open" as business hours.)
- **Casing drift:** drawer/screens "How To Help" vs "About the App" vs "Resources"; "What's New" (modal title) vs "What's new" (Settings row, `base/settings__light__390__at-rest.png`). One casing rule wanted.
- **Date grammar mix** in Nearby: "29d ago" vs "Jun 2, 2026" in the same list (`flows/map__light__390__nearby-modal.png`).
- **Tab badge semantics:** Tasks badge reads 2 on Home/Profile/Map but 5 on Tasks itself (all base captures) — whatever the mechanism, it reads as the same counter disagreeing with itself; R6/R2/R5 all tripped on it. (Data/copy seam — flagged for L5/L6.)
- **"1+" toolbar glyph** (min-severity quick chip) is opaque pre-Legend to every fresh reader (R6, R1, R4) — a label or tooltip-shaped fix, not a material one.
- **"Made with ♥ in Canada"** (HamburgerDrawer.tsx:233): a unicode heart inside prose — reads as voice, not iconography; no §10 action suggested. (Contrast with L2-9's UI-glyph emoji, which do want fixing.)


### L3 — copy observations

- **One thing, four names:** barriers (onboarding/Home) → flags (Map pill, "Nearby flags," filter panel) → reports (Home subtitle, Tasks subtitle) → tasks (tab). Each rename re-taxes R6's tired user. Pick "barrier" for people, keep "flag" as the verb ("flag a barrier").
- **"Nearby" is doing unpaid work:** `N flags nearby` (Map pill), "N flags nearby. Sorted by distance." (list announcement) are global-count/global-order claims. Say what's true: "N reports loaded" / "Showing most recent first."
- **"Open" reads as open-for-business** on first contact (R6); the legend defines it but hides behind an unlabeled "?" — first-contact surfaces never teach the status words.
- **The denied banner points the wrong way:** "Turn it on in your device Settings **to report barriers near you**" (`MapScreen.tsx:2011`) frames location as report-only while the user's blocked job is FINDING; "device Settings" is also wrong on web (it's the browser's site permission), and there's no link either way.
- **"Never tracked or stored on our servers"** (onboarding slide 3) sits one sentence from "place your reports accurately" — but every report permanently stores precise, publicly-readable coordinates. The claim is about ambient location and is true; the adjacency invites a false generalization a privacy-hurt user will remember. Suggest: "Your reports store only the pin you place."
- **The map has two names before you reach it:** "Open the Map" (onboarding, lands on Home) then "Open full map" (Home). One promise, kept once.
- **Rate-limit copy has two sources:** `anonRateLimit.ts:31-33` ("You've reached the limit of 5 anonymous reports…") is thrown but always re-skinned by the modal ("You've reported 5 barriers today — thanks for contributing!"). Fine today; a future caller of the lib string will ship the colder voice.
- **The disabled FAB explains itself only to screen readers** (`MapScreen.tsx:2078-2084` hint: "Dimmed until location is on. Use the recenter button…") — genuinely good copy that sighted users never see.
- **Callout severity speaks numbers only** ("Severity 4 · verified") while Home speaks words ("Significant · verified") and the sheet teaches both — the decoder lives everywhere except where map users decide.


### L4 — copy observations

1. `src/lib/accessibility.ts:95` — "Web/unsupported platforms quietly resolve to `false`" is factually wrong for web at this RN-web version (ledger #11) and actively dangerous (see L4-09).
2. `src/components/PlatformMap.web.tsx:625` and `:46–47` — "Instant jump when 'Reduce Motion' is on (WCAG 2.3.3)" describes intent, not behavior (L4-01). When fixed, the comment should name the falsy-zero trap so it never regresses.
3. `DESIGN.md:279` — "the bottom-sheet slide and drawer are the only longer moves" is stale: map camera (600ms/0.6s) and the tier fill (600ms) are longer moves; the law text should either list them or the code should conform.
4. `01_render-index.md:371–378` — the rm rows' "test-inferred" tag overstates the evidence: no reduced-motion test exists in the repo (L4-05). Worth a one-line correction so Part 3 doesn't lean on phantom tests.


### L5 — copy observations

- **"Report anonymously" as a button label** is 19 characters doing the work of 6; it is the direct driver of the zoom-2.0 pill overflow and the 1.3 two-line squeeze (dt/report captures). "Submit report" (title already establishes anonymity, and the a11y label "Submit anonymous flag report" already differs) would buy ~40% width headroom on the app's most important button.
- **The status pill keeps asserting "5 flags nearby" in permission-denied and stale-region states** (states/map__*__permission-denied.png) — at device-integrity level this is the pill earning its zoom-occluding position with false information; whatever Part 3 does about L5-01 should also make this copy state-aware (R1's #1 trust hit).
- **Sort labels "Newest / Oldest / Severity"** truncate to single letters on web at high zoom; one-word labels that stay distinct at 4 characters ("New / Old / Sever…") — or letting the row wrap — would keep the control legible where `adjustsFontSizeToFit` doesn't exist.



### L7 — copy observations

- **"N flags nearby"** (`MapScreen.tsx:1278-1283` status pill) — "nearby" is false-by-construction: the query is a global most-recent page (L7-03), and the pill keeps the claim over the San-Francisco fallback region (L7-04). The most load-bearing dishonest word in the app.
- **"Showing saved data — connect for the latest."** (`copy.ts:11`) — good voice; missing the one fact that changes decisions: **age** ("saved 2 h ago"). `cachedAt` already exists in storage.
- **"Loading flags…"** replaces the count in the pill during *every* refresh, including background revalidates over live data — consider reserving it for first load and using "Updating…" over data, so loading-from-nothing and refreshing-something read differently.
- **"Finding your location…"** — honest, SR-announced, now properly bounded; it has no failure-side twin on web (L7-07). Native alert copy "Couldn't find your location" + the timeout's own "Location request timed out. Check your signal and try again." are good.
- **"Location access is off. Turn it on in your device Settings to report barriers near you."** — exactly right; it just never fires on arrival (L7-04).
- **Heat disclaimer** ("Heat zones only appear where at least 3 flags…") — honest about the rule, silent about the outcome; needs the "No zones qualify in view yet" companion (L7-11).
- **Error terminal copy** is a strength: "Couldn't load reports." + Try again; "…Tap to retry"; "Couldn't refresh — pull down to update."; "Check your internet connection and try again."


### L8 — copy observations

- **Keep verbatim:** "Impassable. Needs a detour." · "Reporting anonymously — your identity is not stored." · "Your anonymous report still counts. Sign in to add a photo and help verifiers act faster." (this is the template for selling auth everywhere else) · "To protect reporters, heat zones only appear where at least 3 flags have been submitted." · "Flagging a barrier is the first step. These resources help get it fixed — and help you plan around it in the meantime."
- **The two heat-map caveats are complementary, not duplicated** — the map toast explains data quality ("coverage varies by area"), the legend explains privacy ("to protect reporters") — but only heatmap users ever see either; the coverage line deserves a home on the default map (L8-10).
- **Define "verified" in the legend in one line** — the FAQ already wrote it: "another person checked the spot and confirmed the issue is real." Move/duplicate it.
- **Noun canon needed** (L8-11): pick *barrier* (human) as the display noun and *flag* (system) as the object noun, and use them consistently; retire "reports/tasks" as display nouns. Also "open" → consider "unconfirmed"/"reported" to break the open-for-business collision.
- **Submit-moment sentence missing** (L8-14): one line under the CTA stating visibility ("appears on the map for everyone"), the verify loop, and the city non-relationship.
- **Fix in Help FAQ:** "Map tab" → real navigation; magnifier → sliders for filters; "+ Report" answer needs the guest path (Home → Report a barrier) and the auth note; "different color" for resolved → "a checkmark".
- **Stale changelog** (L8-13) — add the v3 era entries; align "What's New"/"What's new".
- **Casing sweep:** "How To Help" vs "About the App" vs "What's new"; "My Feedback" modal vs "My feedback history" row.
- **onboarding slide 2 is doing the trust-system's best teaching** ("Other people verify your report or mark it resolved once the issue is fixed") — echo that sentence at the point of verify (Tasks) and at submit.




---

## §Merged PROTECT list (post-fan-out assembly)

Assembled from all eight lenses' nominations after the fan-out. **Cross-lens convergence is the signal:** the items nominated by three, four, five lenses independently are the app's real crown jewels — the fixes for the findings above must EXTEND these, never regress them. Ordered by how many lenses protected each.

**★ Protected by 5+ lenses — the load-bearing accessibility wins:**
1. **The Nearby list / NearbyFlagsModal as the map's accessible twin** (L1·L3·L5·L6·L8) — one-breath SR row labels (category + severity-number + word + spoken distance + status + description, `NearbyFlagsModal.tsx:125-129`), role=tab chips with live counts, 44pt controls, filter-reset-on-close, the honest no-location notice (`:198-204`). Every blinded reader called it the best thing in the app (R2: "I'd use this over a raw map app"). The map's non-visual story rests on it. L1-4 / L3-8 / L6-05 / L8-2 fixes touch its *trigger* or *endpoints* — never this content.
2. **The empty-filters recovery card** (L3·L5·L6·L8) — "0 of 5 shown" / "Your filters are hiding everything" + per-axis one-tap fixes (All categories / Any severity / Reset all), role=alert (`MapScreen.tsx:1929-1975`). R1: "the app's best moment — how every failure state here should behave." The template L3-7 / L7-01 must be held to.
3. **The ReportFlagModal sheet architecture** (L3·L5·L6) — KAV rooted at the backdrop with the 88% cap + the *why* comment, shrink-to-content card, sticky 44pt footer, five discrete 44pt severity buttons (no slider) with live inline definitions, uncapped description. Held its footer at 200% zoom. R4: "that flow feels designed for me." The device-integrity crown jewel; no redesign moves the footer or replaces the buttons.

**★ Protected by 2–3 lenses — the trust + discipline spine:**
4. **The severity grammar** (L2·L8) — the calibrated amber→red ramp + number + word + stakes-line ("Impassable. Needs a detour."), identical across legend/list/report/heat, with the arbitrated ink-on-color rule (`theme.ts severity`). **The signature.** Never speak severity in one channel. (L2-1's fix is to make the white-digit sites adopt the *existing* `textOnColor` fork — extend the law, don't weaken it.)
5. **The contrast-arbitration system itself** (L2·L6) — floors/inks as script-proven tokens; the four shipped proof sets re-verified exit 0 at HEAD (260 pairs); `contrast-check.mjs` decides, never the eye. The app's trust engine — DO-NOT-EDIT `GlassSurface.tsx`, never eye-tune a floor.
6. **The locating fix + its tests + the battery/thermal posture** (L3·L7) — `initialLocationAction` clearing the spinner on non-granted mount (`MapScreen.tsx:1043-1061`, pinned by `location.test.ts`), `getCurrentPositionWithTimeout` 15s race, last-known-fix reuse, ZERO `watchPositionAsync`/intervals anywhere. This closed the only prior CRITICAL-class hang; regression-watch `states/map__*__locating-hang.png`.
7. **Reduce-motion discipline outside the map camera** (L3·L4·L6) — all 32 Modal sites gated `reducedMotion ? 'none'`, the FlagCard sheen *unmounted* (not frozen) under RM/RT/C-lite, Skeleton static-at-0.5, FlashBanner announce-decoupled-from-motion, the web splash RM media query before the JS bundle parses. The L4-01/L4-02 map-camera fixes must bring the web camera *up to* this standard, not touch the standard.
8. **`POINTS` single-source-of-truth + the anonymity honesty set** (L3·L8) — `points.ts` feeding Tasks flash + Help FAQ (L3-4 is a trigger-side exception, not a reason to fork it); the anon banner as a real `alert` node with the Sign-in link deliberately *outside* it; the truthful post-EXIF-strip announcement gated on the strip actually succeeding.

**★ Single-lens nominations worth carrying (deduped highlights):**
9. **Web-as-guest-mode** (L1) — no root sign-in wall on web; a new user reaches real barrier data in zero taps. Any future growth-wall here is a mission regression.
10. **Home's honesty law** (L1) — distances never fabricated from a fallback point; no-center → LATEST/"Most recent". Fix the SF *peek* without touching this.
11. **The privacy-forward trust voice** (L8) — "your identity is not stored", the k≥3 heat caveat (honest AND comprehensible), "your email is never shown publicly". A competitive moat; the L1-2/L8-4 copy fixes correct *toward* this truth.
12. **`src/lib/accessibility.ts` hook suite + `severityA11y`/`statusA11y` centralization + `accessibilityViewIsModal` across ~25 sheets** (L6) — the natural seam for the web-dialect fixes (L6-01/L6-02); adoption, not redesign.
13. **The DT guard suite + AppText's uncapped body law** (L5·L4·L6) — the reason this audit found reflow, not carnage, at 1.3×.
14. **The Map blur-budget CUT via literal `forceEngineered`** (L7·L2) — worst simultaneous state 4 incl. tab bar; the virtualization law as the actual enforcement (never touch `windowSize`/`removeClippedSubviews`).
15. **Store fetch discipline + marker snapshot discipline + cold-start weight controls** (L7) — SWR cache paint gated to cold start, `fetchSeqRef` stale-discard, `tracksViewChanges={false}` + content-derived keys, the lucide deep-import plugin (web chunk 4.15→2.28MB). Exemplary and invisible; it will not defend itself.
16. **The bespoke `CategoryIcon` set + the Wayfinder mark + "Wayfinder Blue" `ctaFill` mode-independence** (L2·L8) — a real house style; the fix is to wear it MORE (L8-8), never replace it.
17. **"Back. Disabled on first card."** (L1·L6) — the best disabled-state label in the audit; the pattern to copy wherever a control is conditionally disabled.

The load-bearing PROTECT invariants named in the audit brief are re-affirmed untouched: the map overlay's `pointerEvents="box-none"` gesture law, the hardened guard tests, `GlassSurface.tsx` (DO-NOT-EDIT), the shipped glass tokens + GLASS.md arbitrated floors, and every merged 2026-07-01→04 sweep fix. The audit assesses these; it never proposes regressing them.

---

## §Arbiter detail (appendix)


Read-only re-arbitration of the Deep Field glass proof sets at HEAD `82e738b`, with the REAL tool
(`~/AccessMap-material-lab/2026-07-02/shared/contrast-check.mjs`), plus audit-owned coverage of pairs
the four shipped sets don't declare. **No app file, shipped JSON, or law file was modified.** Every
ratio below is verbatim tool output (`assets/arbiter/*.txt`), never eyeball math. Working tree at
start and end: `git diff --stat` empty; only `design-reviews/fable-audit/` additions.

---

## §A — DECLARED == SHIPPED cross-check (drift table)

Method: every stack-layer color and every pair-`text` ink in the four shipped JSONs was matched
against `src/theme.ts` (light) + `src/theme/ThemeContext.tsx` (dark mirror) + the inline literals the
`_doc` blocks name. Derived worst-case bases (stage-pool composites, grain bounds, heat-dilution
regimes) were **recomputed with the arbiter's own `over()`/`parseColor()`** rather than trusted.

### A.1 Tasks set (`qa-reports/assets/2026-07-03_tasks_glass/shipped-stacks.json`)

| Declared | Shipped value | Source (file:line) | Verdict |
|---|---|---|---|
| chrome floor `rgba(255,255,255,0.75)` / `rgba(13,18,32,0.80)` | `glassChromeFloor` | theme.ts:208 / ThemeContext.tsx:160 | MATCH |
| row floor `rgba(255,255,255,0.70)` / `rgba(30,34,46,0.72)` | `glassRowFloor` | theme.ts:204 / ThemeContext.tsx:156 | MATCH |
| chip tint `rgba(255,255,255,0.60)` / `rgba(255,255,255,0.10)` | `glassChipFill` | theme.ts:220 / ThemeContext.tsx:171 | MATCH |
| banner floor `rgba(217,231,253,0.70)` / `rgba(14,68,153,0.70)` | `glassBannerFloor` | theme.ts:212 / ThemeContext.tsx:164 | MATCH |
| bulk floor `rgba(255,255,255,0.85)` / `rgba(13,18,32,0.85)` | `glassBulkFloor` | theme.ts:216 / ThemeContext.tsx:168 | MATCH |
| cancel fill `0.62` / `0.14` | `glassCancelFill` | theme.ts:225 / ThemeContext.tsx:176 | MATCH |
| selected tint `rgba(217,231,253,0.35)` / `rgba(15,45,94,0.45)` | `glassSelectedTint` | theme.ts:226 / ThemeContext.tsx:177 | MATCH |
| neutral-btn tint `rgba(22,33,58,0.06)` / `rgba(255,255,255,0.10)` | `glassNeutralBtn` | theme.ts:224 / ThemeContext.tsx:175 | MATCH |
| `*Lite` stacks `0.84 / 0.88 / 0.90 / 0.92` (+ dark `0.88/0.90/0.92`) | `glass*Lite1` gradient **bottom stops** (gradients run Lite0→Lite1, GlassSurface.tsx:293-298) | theme.ts:247-254 / ThemeContext.tsx:189-196 | MATCH-BY-DECLARED-CONVENTION — declaring the thinner bottom stop is the conservative bound covering the whole gradient |
| stage bases light `#D1E2FC` / `#CBDBF4` | derived: `stage0 #E7F0FD` + `poolA rgba(46,124,246,0.12)`; − 3% grain | theme.ts:198-201; ScreenStage.tsx:78-104 | MATCH-BY-DECLARED-CONVENTION — recomputed with the arbiter's `over()`: `#D1E2FC` exact; grain dip recomputes `#CBDBF5`, declared `#CBDBF4` is 1/255 **darker = conservative** rounding, kept as shipped |
| stage bases dark `#14223A` / `#0F1F3F` / `#1B2940` / `#14151A` | derived: `#14151A`/`#0E1220` + `poolA rgba(20,102,224,0.16)`; + 3% grain lift | ThemeContext.tsx:150-153 | MATCH-BY-DECLARED-CONVENTION — all three derivations recompute EXACT |
| sectionPill `#D9E7FD` / `#0E4499` | `brandSoft` | theme.ts:83 / ThemeContext.tsx:54 | MATCH |
| sev1–5 bases `#F7C948 #F0A030 #F2792B #E85638 #D92D20` | `severity[1..5].color` | theme.ts:543-547 | MATCH |
| status bases/inks Open `#E7F0FD`+`#1A5FB4` / `#0E2A5C`+`#84AEF6`; Verified `#DCF6EC`+`#067A56` / `#083928`+`#6EE7B7` | `statusOpen*`/`statusVerified*` | theme.ts:97-100 / ThemeContext.tsx:65-68 | MATCH |
| resolve `#1e8449` (both) · watch `#5b21b6`/`#7c3aed` | `successStrong` / `accentPurple` | theme.ts:132-133 / ThemeContext.tsx:99-101 | MATCH |
| `ctaFill #1466E0` mode-independent | `ctaFill` | theme.ts:242 / ThemeContext.tsx:186 | MATCH |
| inks `#414B5A/#B8BEC9` · `#525C6B/#AAAAAA` · `#0F53BE/#B4CFFA` · `#1466E0/#84AEF6` · `#5B6470/#C9CFD9` · `#333/#F5F5F5` | `inkGlassMuted` / `inkOnStage` / `inkSelect` / `inkDetailsGhost` / `glassPlaceholder` / `glassChipInk` | theme.ts:236-243, 222 / ThemeContext.tsx:182-187, 173 | MATCH |
| base text inks `#222/#f5f5f5` · `#666/#aaa` · `#DDDDDD` · `#FFFFFF` · sev ink `#0F1B2D`+white(5) | `textStrong`/`textMuted`/dark `text`/`textOnBrand`/`severity[n].textOnColor` | theme.ts:66-71, 543-547 / ThemeContext.tsx:42-46 | MATCH |
| screen consumption (eyebrow/subtitle/sort = inkGlassMuted 12/15pt · placeholder = glassPlaceholder · select-entry/load-more = inkSelect · stage text = inkOnStage) | TasksScreen + ScreenHeader | TasksScreen.tsx:827-828, 924, 1988, 1991, 2049, 2270, 2314; ScreenHeader.tsx:157-165 | MATCH |

**Verdict A.1: DECLARED == SHIPPED — no drift.** (100 pairs re-proven, §B.)

### A.2 Wave-1 set (`…/2026-07-03_glass_w1/wave1-stacks.json`) — checks the ADDED surfaces (rest reuses A.1 verbatim, re-diffed: identical)

| Declared | Shipped value | Source | Verdict |
|---|---|---|---|
| `bulkSheet` = bulk floor `0.85`/`0.85` | W1 sheets are `variant="bulk"` | AboutScreen.tsx:51; FeedbackModal.tsx:182; recipe GlassSurface.tsx:139-147 | MATCH |
| `chipOnBulkSheet` chip layer `0.60`/`0.10` | `glassChipFill` | theme.ts:220 / ThemeContext.tsx:171 | MATCH |
| `chipOnStage` `0.60`/`0.10` over stage bases | `glassChipFill` over ScreenStage | same + A.1 stage derivation | MATCH |
| `selectedSegment` `#fff` / `#1E1E22` | `color.surface` (opaque segment pill) | theme.ts:52 / ThemeContext.tsx:32; SettingsScreen.tsx:167 (`brandText` selected / `glassChipInk` unselected) | MATCH |
| `drawerPanel` `[rgba(0,0,0,0.5), rgba(13,18,32,0.94)]` | scrim + always-dark panel literals | HamburgerDrawer.tsx:295, 309 | MATCH |
| drawer inks `#f5f5f5` · `rgba(255,255,255,0.7)` · `0.48` · `0.55` · `#4E89EF` | brand/item labels · close-X/chevron/muted · labelMuted fork · footerText fork · active nav icon | HamburgerDrawer.tsx:359, 421 / 177, 279, 284 / 427 / 394 / 279 | MATCH |
| sheet/row error inks `#8a1f1f`/`#fca5a5` · `#c0392b` | `errorFg` / `error` | theme.ts:117, 120 / ThemeContext.tsx:83, 86 | MATCH |

**Verdict A.2: DECLARED == SHIPPED — no drift.**

### A.3 Wave-2 set (`…/2026-07-03_glass_w2/wave2-stacks.json`)

| Declared | Shipped value | Source | Verdict |
|---|---|---|---|
| `chipOnRow` `[rowFloor, chipFill]` over stage bases | RecentlyViewed + Breakdown chips sit on **forceEngineered** row cards; declared against the thinner true-blur floor | RecentlyViewedRow.tsx:100-104, 187; its own `_doc` line 2 documents the convention | MATCH-BY-DECLARED-CONVENTION (conservative bound covers the more-opaque engineered arm) |
| heroValue `#1466E0`/`#84AEF6` | `inkDetailsGhost` | ProfileScreen.tsx:2113 | MATCH |
| delta gain `#1e8449` L / `#27ae60` D | `scheme==='dark' ? success : successStrong` | ProfileScreen.tsx:1116 | MATCH |
| delta loss `#c0392b` L / `#fca5a5` D | `scheme==='dark' ? errorFg : error` | ProfileScreen.tsx:1122 | MATCH |
| delete-account `#8a1f1f` L / `#fca5a5` D | `color.errorFg` in **both** themes | ProfileScreen.tsx:2593-2597 | MATCH — **`_doc` prose nit**: the JSON's note says "deleteAccountText error(light)/errorFg(dark)" but both the declared pairs and the shipped code are errorFg both modes (§D-6) |
| chevrons `#707070`/`#8a8a8a` | `textSubtle` | ProfileScreen.tsx:1360 (+9 more) | MATCH |
| banner ink `#0F53BE`/`#B4CFFA` | `brandOnSoft` | ProfileScreen.tsx:1216, 1228 | MATCH |
| stage inks `#525C6B`/`#AAAAAA`, `#333/#ddd`, `#222/#f5f5f5` | `inkOnStage` (ScreenHeader override :885-886), `text`, `textStrong` | ProfileScreen.tsx:885-886 + styles | MATCH |
| muted-on-glass `#414B5A`/`#B8BEC9` | `inkGlassMuted` | ProfileScreen.tsx:1998-1999, 2103, 2122, 2160 | MATCH |

**Verdict A.3: DECLARED == SHIPPED — no drift (one `_doc` prose nit, proof unaffected).**

### A.4 Map set (`…/2026-07-04_glass_map/map-stacks.json`)

| Declared | Shipped value | Source | Verdict |
|---|---|---|---|
| `mapPane` `[0.70]`/`[0.72]` for status pill + action bar | shipped as `variant="row"` **literal `forceEngineered`** (engineered 0.92→0.84 / 0.94→0.88) | MapScreen.tsx:1270-1276, 1292 | MATCH-BY-DECLARED-CONVENTION — its `_doc` "LITERAL-ENGINEERED SURFACES" line declares the thinner true-blur floor as the covering bound |
| `mapPaneWash` `[floor, 0.30 wash]` | filter panel `overlayTint={color.glassMapWash}`; GlassSurface paints floor→tint in that order | MapScreen.tsx:1516-1519; theme.ts:231 / ThemeContext.tsx:178; GlassSurface.tsx:280-302 | MATCH |
| RT never credits the wash; `alwaysLightRT 0.95`, `listFab 0.97` | variant RT path returns before overlayTint (GlassSurface.tsx:250-265); legacy RT solid = `solidColor` | MapScreen.tsx:1990-1991; GlassSurface.tsx:216-228 | MATCH |
| `chipOnPanel` `+0.60`/`+0.10` | `filterPill`/`sevPill` bg `glassChipFill` | MapScreen.tsx:2553, 2581 | MATCH |
| `alwaysLight 0.82` + `#333` ink + `#414B5A` spinner | locating banner literals `tintColor="rgba(255,255,255,0.82)"`, `bannerLocatingText #333`, spinner `#414B5A` | MapScreen.tsx:1990, 2615, 1996 | MATCH |
| HeatmapLegend `0.82`/`0.95` + title `#414B5A` | pinned literals | HeatmapLegend.tsx:24-25, 73 | MATCH |
| `placeChip 0.95` + ink `#0E4499` + MapPin `#1466E0` · `manageChip #EEF4FE` + Star `#1466E0` | pinned always-light literals | MapScreen.tsx:2398, 2414, 2413, 2412, 1487 | MATCH |
| `listFab` `rgba(255,255,255,0.97)` / `rgba(20,20,20,0.97)` + brand ink `#1466E0`/`#4E89EF` | `fabSecondary` bg `color.overlay`, text `color.brand` | MapScreen.tsx:2741, 2743; theme.ts:56, 80 / ThemeContext.tsx:36, 51 | MATCH |
| `ctaSolid` (Report FAB / active pills / savedSaveBtn / presetBtn) + white | `ctaFill` + `textOnBrand` | MapScreen.tsx:2477, 2559, 2757-2762, 2779-2793, 2750 | MATCH |
| cluster: `ctaFill` disc · white 2.5px ring · `#0F1B2D` 1px outer hairline · white count | native styles + web divIcon (`border:2.5px solid #fff; box-shadow:0 0 0 1px #0F1B2D`); web count via `pickContrastText` → `#fff` on `#1466E0` | PlatformMap.tsx:336-365; PlatformMap.web.tsx:139-150, 160-175 | MATCH |
| heat badge: opaque raw cell fill · 1.5px `#0F1B2D` edge · fill-keyed ink (`#0F1B2D` sev1-4, white sev5) | native `backgroundColor: fill` (opaque) + border 1.5; web `background:${fill}; border:1.5px solid #0F1B2D`; `labelTone` keyed off fill | PlatformMap.tsx:175-216, 371-380; PlatformMap.web.tsx:66-90, 651-658 | MATCH |
| `heat1–5` bases | `heatmapSeverity[1..5].color` | theme.ts:572-576 | MATCH |
| `darkRegime`/`lightRegime` bases (10 colors) | heat ramp at `HEATMAP_FILL_OPACITY 0.65` (heatmap.ts:211) pre-composited over `#000`/`#FFF` — **recomputed with the arbiter's `over()`: all 10 EXACT** | heatmap.ts:211; PlatformMap.tsx:186-188 (native mirrors 0.65 as `#RRGGBBAA`) | MATCH-BY-DECLARED-CONVENTION |
| panel inks: title `textStrong` · body `#333/#ddd` · sub-labels `inkGlassMuted` · hint `warningFg #714b00/#fbbf24` · Clear `brandTextAlt #0E4499` L / `inkSelect #B4CFFA` D · chevrons + default Star `inkSelect` · pill inks `glassChipInk` · sev pills `severity[n].textOnColor` | all verified inline | MapScreen.tsx:2514, 2560, 2570, 2585, 2426, 2752, 2587, 2528-2531, 1539-1541, 1616-1618, 1344, 1364 | MATCH |

**Verdict A.4: DECLARED == SHIPPED — no drift.**

Footnotes (§A): (i) `styles.filterChevron` (MapScreen.tsx:2525, `color.brand`) is a **dead style** — no
references; the rendered chevrons use `color.inkSelect` inline, which is what the JSON declares. Not
drift; cosmetic dead code. (ii) HeatmapLegend swatch labels use the **static light** `color.text`
import (`#333`, HeatmapLegend.tsx:7, 94) — deliberate pinned-light, pairing-identical to the map set's
declared `#333`-on-alwaysLight pair. (iii) The only numeric delta found anywhere is the 1/255
conservative rounding on `#CBDBF4` (A.1) — in the safe direction, convention kept.

---

## §B — Re-runs of the four shipped sets [arbiter-measured]

Command per set: `node ~/AccessMap-material-lab/2026-07-02/shared/contrast-check.mjs <json>` —
verbatim stdout+exit code in `assets/arbiter/rerun-*.txt`.

| Set | Exit | Pairs (L+D) | Minimum passing ratio (worst margin) | Within 0.15 of floor? |
|---|---|---|---|---|
| tasks (`shipped-stacks.json`) | **0** | 100 | 4.70 vs 4.5 — StatusBadge Verified ink `#067A56` (light), margin 0.20 | none |
| wave1 (`wave1-stacks.json`) | **0** | 56 | 4.83 vs 4.5 — `inkOnStage #525C6B` (light), margin 0.33 | none |
| wave2 (`wave2-stacks.json`) | **0** | 34 | 4.83 vs 4.5 — `inkOnStage #525C6B` (light), margin 0.33 | none |
| map (`map-stacks.json`) | **0** | 70 | 4.59 vs 4.5 — heat badge sev4 ink `#0F1B2D` on `#ef4444` (margin **0.09**); 3.0-floor min: cluster white ring vs dark-regime `#A4922E` = 3.12 (margin **0.12**) | **two** (→ §D-5) |

All four shipped proofs re-verify at HEAD: **260 pairs, 0 failures, 4× exit 0.** The map set's two
tightest rows match the shipped report's own canary list exactly (4.59 / 3.12) — measurement is
stable, no environmental or rounding drift.

---

## §C — Extension coverage (`tools/audit-stacks.json`, 65 pairs) [arbiter-measured]

Coverage decisions for the mandated candidates (a–e):

- **(a) RV severity dots — NOT covered anywhere → declared.** White digit (`color.textOnBrand`,
  RecentlyViewedRow.tsx:202; 12pt bold :203-204 → normal-text 4.5) over `severityColor(f.severity)`
  fills (:139). Exception: white-on-sev5 IS covered — tasks set pair "sev5 white ink on `#D92D20`"
  (4.83) — not redeclared. Dot boundary (3.0) declared against the chip it sits in, **both**
  engineered-gradient arms (the row card is a literal `forceEngineered`, so engineered is the only
  shipped arm; RecentlyViewedRow.tsx:100-104).
- **(b) Legend + callout.** Legend **title** covered (map set "HeatmapLegend title `#414B5A`");
  **swatch labels** `#333` covered by the pairing-identical map-set pair "locating banner ink
  bannerLocatingText `#333`" (same ink, same 0.82 alwaysLight stack, same floor). NEW: swatch **fill
  boundary** (10×10 borderless meaning-bearing key, HeatmapLegend.tsx:45, 87-91) vs its own surface
  over GLASS §12 bases. Callout inks were declared in NO shipped set → declared here; both callout
  surfaces are **opaque** (native `color.surface` PlatformMap.tsx:297; web = leaflet's always-white
  wrapper, PlatformMap.web.tsx:385-388), so heat bases cannot reach them — the base is the surface
  itself, which is exactly why they're measurable as single-base pairs.
- **(c) Home search pill — NOT covered → declared.** Legacy GlassSurface i=20 (HomeScreen.tsx:219),
  floor = default `color.overlayGlass` (GlassSurface.tsx:218), base = the Home wash `surfaceMuted`
  (HomeScreen.tsx:368; Home is not on ScreenStage — orientation §4). Both themes.
- **(d) Settings — COVERED by wave1** (Settings is in that set's scope by name): rows =
  `variant="row" forceEngineered={glassLite}` (SettingsScreen.tsx:104, 490) → "row title textStrong" /
  "row subtitle textMuted" / "chevron textSubtle 1.4.11" / "leading deco icon" pairs; appearance
  control → "chipOnStage glassChipInk" + "selectedSegment brandText"; stage text → "inkOnStage"
  (SettingsScreen.tsx:657, 692, 698, 708, 167 verified). No uncovered Settings ink found.
  **Leaderboard renders NO text-on-glass**: it is an opaque Modal sheet — card
  `backgroundColor: color.surface` over a scrim, zero GlassSurface/ScreenStage
  (LeaderboardScreen.tsx:427-434) — pre-Deep-Field opaque surfaces, out of glass-arbiter scope.
- **(e) Saved-place chips — COVERED by the map set**: "saved-places chip ink literal `#0E4499`" (4.5),
  "saved-places MapPin icon `#1466E0`" (3.0), "manage chip Star `#1466E0` on `#EEF4FE`" (3.0), both
  modes; literals re-verified (MapScreen.tsx:2398, 2412-2414, 1487). One uncovered arm added: the
  Manage chip's **label** (`#0E4499` on its own `#EEF4FE` fill — the shipped pair proves that ink only
  over the 0.95-white chip stack).
- **Bonus, uncovered and shipped-active:** the panel's "+ Save current" add pill (`color.brand` 12pt
  bold on opaque `color.surface`, MapScreen.tsx:1638, 2763-2769) and the **map pin** boundary pairs
  (tappable teardrop = severity fill + 2.5px `#fff` ring, PlatformMap.web.tsx:116-122 /
  PlatformMap.tsx:228, anon `#9CA3AF`) vs GLASS §12 tile extremes — the shipped sets ratify boundary
  unions for clusters and heat badges but declare no pin pair.

Run: exit **1** (expected — the FAILs below are the findings, and the JSON keeps shipped truth).
**65 pairs: 36 PASS / 29 FAIL.** Tightest PASS: legend heat5 boundary 3.17 (margin 0.17); RV dark
sev4 boundary 3.21/3.22; dark add pill 4.86. Full verbatim tables (also in
`assets/arbiter/audit-stacks-output.txt`):

### light

| pair | surface | worst base | resulting bg | ratio | min | verdict |
|---|---|---|---|---|---|---|
| RV dot digit 12pt bold white on sev1 #F7C948 (RecentlyViewedRow.tsx:139,202) (`#FFFFFF`) | sevDot1 | `#F7C948` | `#F7C948` | 1.57:1 | 4.5:1 | **FAIL** |
| RV dot digit 12pt bold white on sev2 #F0A030 (`#FFFFFF`) | sevDot2 | `#F0A030` | `#F0A030` | 2.15:1 | 4.5:1 | **FAIL** |
| RV dot digit 12pt bold white on sev3 #F2792B (`#FFFFFF`) | sevDot3 | `#F2792B` | `#F2792B` | 2.78:1 | 4.5:1 | **FAIL** |
| RV dot digit 12pt bold white on sev4 #E85638 (`#FFFFFF`) | sevDot4 | `#E85638` | `#E85638` | 3.61:1 | 4.5:1 | **FAIL** |
| RV dot sev1 fill boundary vs chip (lite TOP stop 0.92) (`#F7C948`) | rvChipTop | `#CBDBF4` | `#FDFEFF` | 1.55:1 | 3:1 | **FAIL** |
| RV dot sev2 fill boundary vs chip (lite TOP stop 0.92) (`#F0A030`) | rvChipTop | `#CBDBF4` | `#FDFEFF` | 2.13:1 | 3:1 | **FAIL** |
| RV dot sev3 fill boundary vs chip (lite TOP stop 0.92) (`#F2792B`) | rvChipTop | `#CBDBF4` | `#FDFEFF` | 2.75:1 | 3:1 | **FAIL** |
| RV dot sev4 fill boundary vs chip (lite TOP stop 0.92) (`#E85638`) | rvChipTop | `#CBDBF4` | `#FDFEFF` | 3.57:1 | 3:1 | PASS |
| RV dot sev5 fill boundary vs chip (lite TOP stop 0.92) (`#D92D20`) | rvChipTop | `#CBDBF4` | `#FDFEFF` | 4.78:1 | 3:1 | PASS |
| RV dot sev1 fill boundary vs chip (lite BOTTOM stop 0.84) (`#F7C948`) | rvChipBottom | `#CBDBF4` | `#FCFDFE` | 1.53:1 | 3:1 | **FAIL** |
| RV dot sev2 fill boundary vs chip (lite BOTTOM stop 0.84) (`#F0A030`) | rvChipBottom | `#CBDBF4` | `#FCFDFE` | 2.10:1 | 3:1 | **FAIL** |
| RV dot sev3 fill boundary vs chip (lite BOTTOM stop 0.84) (`#F2792B`) | rvChipBottom | `#CBDBF4` | `#FCFDFE` | 2.73:1 | 3:1 | **FAIL** |
| RV dot sev4 fill boundary vs chip (lite BOTTOM stop 0.84) (`#E85638`) | rvChipBottom | `#CBDBF4` | `#FCFDFE` | 3.54:1 | 3:1 | PASS |
| RV dot sev5 fill boundary vs chip (lite BOTTOM stop 0.84) (`#D92D20`) | rvChipBottom | `#CBDBF4` | `#FCFDFE` | 4.73:1 | 3:1 | PASS |
| legend swatch heat1 boundary vs own 0.82 surface (HeatmapLegend.tsx:45,87) (`#fde047`) | legendSurface | `#dc2626` | `#F9D8D8` | 1.01:1 | 3:1 | **FAIL** |
| legend swatch heat2 boundary vs own 0.82 surface (`#fb923c`) | legendSurface | `#000000` | `#D1D1D1` | 1.48:1 | 3:1 | **FAIL** |
| legend swatch heat3 boundary vs own 0.82 surface (`#f97316`) | legendSurface | `#000000` | `#D1D1D1` | 1.84:1 | 3:1 | **FAIL** |
| legend swatch heat4 boundary vs own 0.82 surface (`#ef4444`) | legendSurface | `#000000` | `#D1D1D1` | 2.47:1 | 3:1 | **FAIL** |
| legend swatch heat5 boundary vs own 0.82 surface (`#dc2626`) | legendSurface | `#000000` | `#D1D1D1` | 3.17:1 | 3:1 | PASS |
| native callout title textStrong 14pt bold (PlatformMap.tsx:304) (`#222`) | calloutNative | `#fff` | `#FFFFFF` | 15.91:1 | 4.5:1 | PASS |
| native callout meta textMuted 11pt/600 (PlatformMap.tsx:310) (`#666`) | calloutNative | `#fff` | `#FFFFFF` | 5.74:1 | 4.5:1 | PASS |
| native callout description color.text 12pt (PlatformMap.tsx:317) (`#333`) | calloutNative | `#fff` | `#FFFFFF` | 12.63:1 | 4.5:1 | PASS |
| web popup meta literal #666 11px/600 (PlatformMap.web.tsx:388) (`#666`) | popupWeb | `#FFFFFF` | `#FFFFFF` | 5.74:1 | 4.5:1 | PASS |
| web popup title/desc leaflet default #333 (PlatformMap.web.tsx:379,406) (`#333`) | popupWeb | `#FFFFFF` | `#FFFFFF` | 12.63:1 | 4.5:1 | PASS |
| Home pill placeholder textMuted 16pt regular (HomeScreen.tsx:393) (`#666`) | homePill | `#f7f9fc` | `#FEFEFE` | 5.69:1 | 4.5:1 | PASS |
| Home pill active label textStrong (HomeScreen.tsx:394) (`#222`) | homePill | `#f7f9fc` | `#FEFEFE` | 15.76:1 | 4.5:1 | PASS |
| Home pill Search 18px + clear X 16px icons textMuted (HomeScreen.tsx:221,236 — 1.4.11) (`#666`) | homePill | `#f7f9fc` | `#FEFEFE` | 5.69:1 | 3:1 | PASS |
| Manage chip label #0E4499 on own #EEF4FE fill (MapScreen.tsx:1492,2412,2414) (`#0E4499`) | manageChipFill | `#000000` | `#EEF4FE` | 8.24:1 | 4.5:1 | PASS |
| '+ Save current' add pill color.brand 12pt bold on color.surface (MapScreen.tsx:2769) (`#1466E0`) | addPillFill | `#fff` | `#FFFFFF` | 5.24:1 | 4.5:1 | PASS |
| pin 2.5px white ring vs tile extremes (PlatformMap.web.tsx:122 — 1.4.11) (`#FFFFFF`) | tileExtremes | `#FFFFFF` | `#FFFFFF` | 1.00:1 | 3:1 | **FAIL** |
| pin sev1 fill vs tile extremes (1.4.11) (`#F7C948`) | tileExtremes | `#FFFFFF` | `#FFFFFF` | 1.57:1 | 3:1 | **FAIL** |
| pin sev2 fill vs tile extremes (1.4.11) (`#F0A030`) | tileExtremes | `#FFFFFF` | `#FFFFFF` | 2.15:1 | 3:1 | **FAIL** |
| pin sev3 fill vs tile extremes (1.4.11) (`#F2792B`) | tileExtremes | `#FFFFFF` | `#FFFFFF` | 2.78:1 | 3:1 | **FAIL** |
| pin sev4 fill vs tile extremes (1.4.11) (`#E85638`) | tileExtremes | `#FFFFFF` | `#FFFFFF` | 3.61:1 | 3:1 | PASS |
| pin sev5 fill vs tile extremes (1.4.11) (`#D92D20`) | tileExtremes | `#000000` | `#000000` | 4.35:1 | 3:1 | PASS |
| anon pin gray fill vs tile extremes (PlatformMap.tsx:228 — 1.4.11) (`#9CA3AF`) | tileExtremes | `#FFFFFF` | `#FFFFFF` | 2.54:1 | 3:1 | **FAIL** |

### dark

| pair | surface | worst base | resulting bg | ratio | min | verdict |
|---|---|---|---|---|---|---|
| RV dot digit 12pt bold white on sev1 (mode-independent) (`#FFFFFF`) | sevDot1 | `#F7C948` | `#F7C948` | 1.57:1 | 4.5:1 | **FAIL** |
| RV dot digit 12pt bold white on sev2 (mode-independent) (`#FFFFFF`) | sevDot2 | `#F0A030` | `#F0A030` | 2.15:1 | 4.5:1 | **FAIL** |
| RV dot digit 12pt bold white on sev3 (mode-independent) (`#FFFFFF`) | sevDot3 | `#F2792B` | `#F2792B` | 2.78:1 | 4.5:1 | **FAIL** |
| RV dot digit 12pt bold white on sev4 (mode-independent) (`#FFFFFF`) | sevDot4 | `#E85638` | `#E85638` | 3.61:1 | 4.5:1 | **FAIL** |
| RV dot sev1 fill boundary vs dark chip (lite TOP stop 0.94) (`#F7C948`) | rvChipTop | `#1B2940` | `#343844` | 7.42:1 | 3:1 | PASS |
| RV dot sev2 fill boundary vs dark chip (lite TOP stop 0.94) (`#F0A030`) | rvChipTop | `#1B2940` | `#343844` | 5.41:1 | 3:1 | PASS |
| RV dot sev3 fill boundary vs dark chip (lite TOP stop 0.94) (`#F2792B`) | rvChipTop | `#1B2940` | `#343844` | 4.18:1 | 3:1 | PASS |
| RV dot sev4 fill boundary vs dark chip (lite TOP stop 0.94) (`#E85638`) | rvChipTop | `#1B2940` | `#343844` | 3.22:1 | 3:1 | PASS |
| RV dot sev5 fill boundary vs dark chip (lite TOP stop 0.94) (`#D92D20`) | rvChipTop | `#1B2940` | `#343844` | 2.41:1 | 3:1 | **FAIL** |
| RV dot sev1 fill boundary vs dark chip (lite BOTTOM stop 0.88) (`#F7C948`) | rvChipBottom | `#1B2940` | `#343945` | 7.39:1 | 3:1 | PASS |
| RV dot sev2 fill boundary vs dark chip (lite BOTTOM stop 0.88) (`#F0A030`) | rvChipBottom | `#1B2940` | `#343945` | 5.39:1 | 3:1 | PASS |
| RV dot sev3 fill boundary vs dark chip (lite BOTTOM stop 0.88) (`#F2792B`) | rvChipBottom | `#1B2940` | `#343945` | 4.16:1 | 3:1 | PASS |
| RV dot sev4 fill boundary vs dark chip (lite BOTTOM stop 0.88) (`#E85638`) | rvChipBottom | `#1B2940` | `#343945` | 3.21:1 | 3:1 | PASS |
| RV dot sev5 fill boundary vs dark chip (lite BOTTOM stop 0.88) (`#D92D20`) | rvChipBottom | `#1B2940` | `#343945` | 2.39:1 | 3:1 | **FAIL** |
| legend swatch heat1 boundary vs own 0.82 surface (pinned light in dark) (`#fde047`) | legendSurface | `#dc2626` | `#F9D8D8` | 1.01:1 | 3:1 | **FAIL** |
| legend swatch heat2 boundary vs own 0.82 surface (pinned) (`#fb923c`) | legendSurface | `#000000` | `#D1D1D1` | 1.48:1 | 3:1 | **FAIL** |
| legend swatch heat3 boundary vs own 0.82 surface (pinned) (`#f97316`) | legendSurface | `#000000` | `#D1D1D1` | 1.84:1 | 3:1 | **FAIL** |
| legend swatch heat4 boundary vs own 0.82 surface (pinned) (`#ef4444`) | legendSurface | `#000000` | `#D1D1D1` | 2.47:1 | 3:1 | **FAIL** |
| legend swatch heat5 boundary vs own 0.82 surface (pinned) (`#dc2626`) | legendSurface | `#000000` | `#D1D1D1` | 3.17:1 | 3:1 | PASS |
| native callout title dark textStrong (ThemeContext.tsx:42) (`#f5f5f5`) | calloutNative | `#1E1E22` | `#1E1E22` | 15.24:1 | 4.5:1 | PASS |
| native callout meta dark textMuted (ThemeContext.tsx:44) (`#aaa`) | calloutNative | `#1E1E22` | `#1E1E22` | 7.15:1 | 4.5:1 | PASS |
| native callout description dark color.text (ThemeContext.tsx:43) (`#ddd`) | calloutNative | `#1E1E22` | `#1E1E22` | 12.23:1 | 4.5:1 | PASS |
| web popup meta literal #666 — leaflet chrome stays white in dark (PlatformMap.web.tsx:385-388) (`#666`) | popupWeb | `#FFFFFF` | `#FFFFFF` | 5.74:1 | 4.5:1 | PASS |
| web popup title/desc leaflet default #333 (white chrome in dark) (`#333`) | popupWeb | `#FFFFFF` | `#FFFFFF` | 12.63:1 | 4.5:1 | PASS |
| Home pill placeholder dark textMuted 16pt regular (HomeScreen.tsx:393) (`#aaa`) | homePill | `#121214` | `#141414` | 7.95:1 | 4.5:1 | PASS |
| Home pill active label dark textStrong (HomeScreen.tsx:394) (`#f5f5f5`) | homePill | `#121214` | `#141414` | 16.95:1 | 4.5:1 | PASS |
| Home pill Search + clear X icons dark textMuted (1.4.11) (`#aaa`) | homePill | `#121214` | `#141414` | 7.95:1 | 3:1 | PASS |
| Manage chip label #0E4499 on own #EEF4FE fill (pinned in dark) (`#0E4499`) | manageChipFill | `#000000` | `#EEF4FE` | 8.24:1 | 4.5:1 | PASS |
| '+ Save current' add pill dark color.brand 12pt bold on dark color.surface (ThemeContext.tsx:51,32) (`#4E89EF`) | addPillFill | `#1E1E22` | `#1E1E22` | 4.86:1 | 4.5:1 | PASS |

---

## §D — FINDING-WORTHY ITEMS (all ratios [arbiter-measured] unless tagged)

1. **[HIGH] RecentlyViewedRow white digit fails AA on severity fills 1–4 — measured 1.57 / 2.15 /
   2.78 / 3.61 vs 4.5, both modes.** The dot digit is `color.textOnBrand` white at 12pt bold
   (RecentlyViewedRow.tsx:139, 202-204) over `severityColor(f.severity)` — the exact white-on-midramp
   pattern the system already forked away everywhere else (`severity[n].textOnColor`, shipped
   `92a2be6`; SeverityBadge, Map sev pills, action-bar quick chip all carry ink `#0F1B2D` on 1–4).
   This is the last holdout. Sev1 measures **1.57** — materially worse than the honesty ledger's
   quoted 2.1–3.4 prose range (ledger item 4). Not CRITICAL only because the row is auth-gated
   (ProfileScreen.tsx:1319) and each chip's accessible name carries the severity as a number
   (RecentlyViewedRow.tsx:130-133); visually it is the chip's primary severity signal for signed-in
   users. Evidence: §C rows 1-4 (light+dark); `assets/arbiter/audit-stacks-output.txt`.
2. **[MEDIUM] RV severity-dot boundary sub-3:1 — light sev1–3 (1.53–2.75 across both engineered
   arms) and, newly discovered, dark sev5 (2.41 / 2.39).** The 24px dot has no edge hairline; in
   light mode the yellow/amber dots melt into the near-white chip, and in dark the sev5 red melts
   into the dark chip. Compounding: on light sev1 the digit (1.57) AND the disc edge (1.55) fail
   together, so the severity cue visually dissolves for low-vision users. Tempering: the digit is
   the identifier where it passes, and the chip label + SR name carry meaning (1.4.11 posture
   arguable). Evidence: §C boundary rows.
3. **[MEDIUM] HeatmapLegend color-key swatches heat1–4 fail 3:1 against the legend's own surface —
   1.01 / 1.48 / 1.84 / 2.47; heat5 passes at 3.17 (itself only +0.17).** Worst case for heat1 is
   the legend floating over a sev5-red heat cell (composite `#F9D8D8` vs `#fde047` = **1.01:1** —
   invisible exactly where the map is hottest). The 10×10 swatches are borderless
   (HeatmapLegend.tsx:87-91) and ARE the disclosure surface Jordan required. Tempering: each swatch
   is adjacent to "N Label" text and the SR label names the colors (HeatmapLegend.tsx:28, 46).
   Fix-shaped precedent the system already ratified for this exact problem: the 1px `#0F1B2D`
   hairline union (cluster rings, heat badges) — a Part 3 proposal, not applied here.
4. **[HIGH] Map pin boundaries fail on light tiles: white 2.5px ring 1.00, sev1–3 fills 1.57–2.78,
   anon gray 2.54 vs 3.0 (worst base `#FFF`).** Pins are tappable components (1.4.11 applies), and
   GLASS.md §12 rule 4's own law — "a white ring vanishes on white tiles… use regime-decomposed
   unions" — was applied to clusters and heat badges but never to the pins themselves; no shipped
   set declares any pin pair. Internal-consistency gap as much as a WCAG one. Caveats: web tiles are
   always dark (`dark_all` — the ring measures 21:1 there; every pin pair passes vs `#000`); the
   `#FFF` arm models iOS Apple light tiles = NEEDS-SKY-DEVICE; the decorative blue glow
   (`shadow.pin`) is not credited. Evidence: §C tileExtremes rows.
5. **[LOW — near-miss watch list] Map set canaries sit within 0.15 of floor (re-run-confirmed): heat
   badge sev4 ink 4.59 (margin 0.09) and cluster white ring vs dark-regime `#A4922E` 3.12 (margin
   0.12).** Identical to the shipped report's canary values — stable measurement, no drift. Any
   future darkening of `severity[4]`/`heatmapSeverity` or lightening of the heat ramp breaks these
   first; they should ride along in any Part 3 severity-color proposal. Evidence:
   `assets/arbiter/rerun-map.txt`.
6. **[LOW] W2 `_doc` prose contradicts its own pairs on the delete-account fork:** prose says
   "deleteAccountText error(light)/errorFg(dark)"; the declared pairs AND shipped code are `errorFg`
   in **both** themes (ProfileScreen.tsx:2589-2597 — the code comment states both `error` tones fail
   on the stage). The measured proof is valid (pairs match shipped); the prose would mislead a future
   maintainer reconstructing the fork. [code-read]
7. **[LOW — latent, not shipped-active] Heat-badge "density" mode would ship a dark-mode AA breach if
   its config knob is ever flipped:** `DEFAULT_HEATMAP_MODE = 'gradient'` (heatmap.ts:204, pinned at
   MapScreen.tsx:174), but the density branch inks the badge always-white over `color.brand` fill
   (PlatformMap.web.tsx:651, 657 / PlatformMap.tsx:175, 182) — dark brand `#4E89EF` + white measures
   **3.42** vs the 4.5 badge-text floor (13pt/700); light `#1466E0` passes at 5.24. Excluded from
   audit-stacks.json to keep declared == shipped-active; recorded here so the knob doesn't get
   flipped blind.
8. **[LOW] Stale contrast prose in app code:** theme.ts:80 annotates `brand #1466E0` as "~3:1 on
   white" — the tool measures **5.24**. The value shipped is fine; the wrong number in the comment
   could steer a future ink-fork decision (same class as the ledger's 2.1–3.4 digit range vs the
   measured 1.57–3.61 in item 1). [arbiter-measured, prose-only]

No CRITICAL: all four SHIPPED proof sets re-verify exit 0 — nothing shipped-and-declared is in AA
breach on its declared surfaces. Every failure found lives in coverage the shipped sets never claimed.

---

## §E — Files created by this stage

| Path | What |
|---|---|
| `design-reviews/fable-audit/tools/audit-stacks.json` | audit-owned extension declaration (65 pairs, real shipped values, file:line cites in `_doc`) |
| `design-reviews/fable-audit/assets/arbiter/rerun-tasks.txt` | verbatim re-run, tasks set — exit 0, 100 pairs |
| `design-reviews/fable-audit/assets/arbiter/rerun-w1.txt` | verbatim re-run, wave1 set — exit 0, 56 pairs |
| `design-reviews/fable-audit/assets/arbiter/rerun-w2.txt` | verbatim re-run, wave2 set — exit 0, 34 pairs |
| `design-reviews/fable-audit/assets/arbiter/rerun-map.txt` | verbatim re-run, map set — exit 0, 70 pairs |
| `design-reviews/fable-audit/assets/arbiter/audit-stacks-output.txt` | verbatim extension run — exit 1 (expected), 36 PASS / 29 FAIL |
| `design-reviews/fable-audit/partials/arbiter.md` | this file |
| (appended) `design-reviews/fable-audit/01_render-index.md` | one row per new `assets/arbiter/` file, at end |
