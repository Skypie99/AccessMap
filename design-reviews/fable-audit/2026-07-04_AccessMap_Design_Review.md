# Fable Audit — AccessMap — Design Review (Part 3, final)

**Subject:** AccessMap @ `main` `82e738bc177f8a0b14ca0aa978c6ffb92bc5c54b` — the post-glass-chain HEAD (Tasks + Wave 1 + Wave 2 Profile + Map + the locating-spinner fix).
**Date:** 2026-07-04.
**Model provenance (disclosed, not silent):** Parts 1–2 authored on Fable 5 max-effort; on Fable credit-exhaustion mid-skeptic-pass Sky switched to Opus 4.8; Part 3 synthesis (this report) ran on Opus 4.8 max-effort at Sky's explicit direction.

Stack: Expo SDK 54 / React Native 0.81 / React 19.1 / TypeScript strict / Supabase (auth + Postgres + RLS + Storage); react-native-maps (native) / react-leaflet 5 (web). This is a **strict read-only audit** — no app code was edited, no build run, no database touched. Everything below is advisory input to Sky's sequencing decision; every merge and the one TestFlight build remain Sky's.

---

## 1. Executive summary — one screen

**The disabled-user verdict — can each persona do the core jobs (FIND / trust / CONTRIBUTE) *today*?**

- **R1 · wheelchair, route-planning:** FIND **B-** (the list works; the map lies on arrival — SF + false "5 nearby," pins vanish on light tiles). Trust **C** (bets a detour on "verified," which is undefined/undated). CONTRIBUTE **C+**.
- **R2 · blind, VoiceOver:** FIND **C+** native / **D+** web (the a11y engine is unmounted on web — no selection state, no announcements). CONTRIBUTE **D** web ("submitting blind in the worst sense" — can't confirm a single choice). Native **B-**.
- **R3 · low-vision, large-type:** FIND **C** (map is a near-black void with ghost-gray labels in both themes; low-severity pins dissolve). CONTRIBUTE **D** at 2.0× (form shreds mid-word, submit label overflows toward Cancel — unsubmittable).
- **R4 · one-handed / limited-dexterity:** FIND **C** (zoom has no reachable fallback — occluded + pointer-dead on web, no zoom-out on iOS). CONTRIBUTE **A-** (the report sheet "feels designed for me"). The map chrome "feels designed for someone else's other hand."
- **R6 · first-timer, cognitive load:** FIND **C** (map reads as broken; "one thing, four names"). Trust **C-** ("BUMBAKLOT · verified · sev 5" torpedoes the badge economy). CONTRIBUTE **C** (a "black box at a nameless spot"; first-time web guest literally can't submit).
- **R5 · senior craft reviewer:** overall **B-** — "one focused polish pass away from genuinely premium," held back by two header families, raw map chrome, and see-through light sheets.

**The cohesion verdict.** It does *not yet* read as one premium product against GLASS.md — the material system (stage, tiers, arbitrated inks, C-lite parity) is genuinely coherent and worth protecting wholesale, but the strongest seam is **the two header families** (editorial Home/Tasks vs centered-title Map/Profile/Settings — they even stack a double title on signed-in Profile), compounded by the flagship map's raw Leaflet chrome and light-mode sheets that ghost their backdrops.

**The Top-5 do-first** (highest judge finals; three signatures + two must-ship CRITICALs):
1. **S3** — The map pin becomes a doorway: surface the trust ledger where trust is spent. `[L ★SIG]` — final **19.667**
2. **S9** — Mount the accessibility engine on web: adopt the modern RN ≥0.71 a11y dialect. `[L ★SIG]` — final **19.5**
3. **S1** — Wear the severity grammar everywhere severity is spoken (and define "verified" in the same breath). `[M ★SIG]` — final **19.333**
4. **S4** — Honest arrival: kill the "N flags nearby" lie and surface the denied-location banner (CRITICAL). `[M]` — final **18.333**
5. **S6** — Give the map an honest zoom: app-styled 44pt zoom buttons in the overlay bottom (CRITICAL). `[M ★SIG]` — final **17.667**

**The signature thesis.** The app's signature is **the severity grammar — not the glass**: the numbered amber→red disc + plain word + one-line stake, praised independently by all six blinded readers. Make the app *wear it more* (repeat it identically at every decision surface), and **instrument the trust the badge economy needs** (define and reach "verified" where it is spent). That is the through-line of the whole slate.

---

## 2. Orientation digest · render index · baseline persona reads

### Orientation digest

- **HEAD & fence:** `main` @ `82e738b` (`fix(map): clear the locating spinner when permission isn't granted on mount`). Served via `npm run web` (Metro dev, `__DEV__` true, DPR 2). Zero tracked modifications at start; the fence allows only `design-reviews/fable-audit/` additions. Deep Field verified worn (`ScreenStage` ×4 in Tasks, `GlassSurface` ×15 in Map).
- **Architecture (the load-bearing fact):** on web there is **no root sign-in — web IS guest mode** (`App.tsx` Gate: web/native-guest → `RootNavigator` at `initialRouteName "Home"`; native signed-out → `SignInScreen`). Tabs are **Home · Tasks · Profile**; Map (FullMap), Settings, Admin are hidden routes. So every web finding is the *entire first-contact experience*.
- **Severity ramp (`theme.ts severity`, the source of truth):** 1 Minor `#F7C948` · 2 Mild `#F0A030` · 3 Moderate `#F2792B` · 4 Significant `#E85638` · 5 Severe `#D92D20`; `textOnColor` = ink `#0F1B2D` on 1–4, white on 5 only. Descriptions "Inconvenient but usable." … "Impassable. Needs a detour."
- **Engine caveat (repeated because it bounds everything):** every capture is expo-web in Chromium — web tiles are CartoDB `dark_all` **always**, and RN-web resolves `isScreenReaderEnabled` **true for every web user**, so MapScreen's SR auto-open fires on every web arrival (app truth on web, not a harness artifact). True blur/scroll/VoiceOver/haptics/Dynamic-Type/Reduce-Transparency and Apple light tiles are **device-only**.

### Render index reference

`design-reviews/fable-audit/01_render-index.md` — one row per banked capture (410 files, FINAL VERIFY1 PASS: expected == on-disk == indexed, 0 missing / 0 failed / 0 orphan; adversarial completeness critique PASS). The authoritative map of what was captured, at which width/theme/state, with each capture's honesty tag.

### Baseline persona-read digest (verbatim highlights, credited)

- **R6 (first-timer, cognitive load):** "The map looks broken… '5 flags nearby' with only one visible pin." · "Junk content wearing a 'verified' badge… torpedo trust in the entire verify system the app is built on." · "One thing, four names." · On submit: "a black box at a nameless spot." Would file one low-stakes report "as an experiment and quietly watch."
- **R1 (wheelchair, route-planning):** permission-denied "is the one that would strand me… a stale '5 flags nearby' pill actively lying about it." · Pin callout is "a dead end exactly where I need a next step." · "An empty map that's actually a broken map is how you end up stuck at an intersection with no curb cut." · The empty-filters card = "the app's best moment."
- **R4 (one-handed / limited-dexterity):** the report flow "feels designed for me; the map chrome feels designed for someone else's other hand." · Zoom "has no accessible fallback… slivers smaller than a fingertip." · "I'd trust it to file a report; I'd brace myself every time I had to touch the map."
- **R3 (low-vision, large-type):** at 2.0× the submit button label "overflows its pill and bleeds toward Cancel… the app's core action becomes unsubmittable." · The map "is a black rectangle with ghost-gray street names in either theme." · "For an app about accessibility, that stings."
- **R2 (blind, VoiceOver-primary):** the Nearby list "is the best thing in the app… I'd genuinely use this over a raw map app." But "I can't confirm a single selection I make, can't place a pin, and can't even find the report button — so as a contributor I'd be submitting blind in the worst sense."
- **R5 (senior craft reviewer):** "the app reads as two kits stitched together." Strongest screen: How To Help. Weakest: Map (light mode). "It's one focused polish pass — unify the two header families, theme the map chrome, fix the light-mode sheets — away from genuinely premium."

---

## 3. Findings by lens (L1–L8)

Each CRITICAL and HIGH faced an independent adversarial skeptic charged to REFUTE. **Result: 0 REFUTED · 34 CONFIRMED · 2 ADJUSTED across 36 canonical findings** (final ladder: **6 CRITICAL + 30 HIGH**). Annotated PNGs live in `design-reviews/fable-audit/assets/annotated/`. **Honesty caveat — code-/probe-only findings:** for L4-01, L4-02, L6-01, L6-02, L6-04, L7-01, L7-02, L7-03, L3-4, and L8-4a, no single still can carry the defect — the annotated PNG shows the **surface where the defect manifests**, not the defect itself; the primary evidence is the cited code refs + banked probe traces (`partials/verdicts.md` + `01_render-index.md`).

### L1 — First impression / onboarding
*The first five minutes are two products: an excellent pitch, then broken promises.*

- **L1-1 → (merged into L3-2 canonical A) · CRITICAL.** Deny location and the first map is silently the wrong city (San Francisco) under a false "5 flags nearby," no banner, no recovery. R1's #1 stranding friction. Evidence: `states/map__*__permission-denied.png` [web-approximated] + code chain `MapScreen.tsx:123-128/:1039-1060/:1278-1283`. Capture: `assets/annotated/L3-2__lying-arrival.png`.
- **L1-2 · HIGH.** Native first-run funnel: "Open the Map" lands on a sign-in wall; the guest link is a mislabeled footnote ("need an account to report" — false; anon reporting ships), and `guestMode` is un-persisted so the wall returns on every cold start. Also a 2.5.3 Label-in-Name miss. `App.tsx:106-148`, `SignInScreen.tsx:232-245` [code-inferred; native surface — NEEDS-SKY-DEVICE]. Capture (surface): `assets/annotated/L1-2__native-guest-funnel.png`.
- **L1-3 · HIGH.** The location consent slide — the app's most sensitive moment — is the only permission with no visible "not now," and on web "Allow Location" is theater (does nothing, then an unannounced browser prompt later). The respectful pattern ships eight lines away (notifications' "Maybe later"). `OnboardingCards.tsx:91-125/:243-255`. Capture: `assets/annotated/L1-3__consent-slide.png`.
- **L1-4 / L3-9 · HIGH.** On web, "Open full map" never shows a map: the SR auto-list opens full-screen over it for every visitor (RN-web forces `isScreenReaderEnabled` true). The auto-open *intent* is right; the blanket web trigger + unnamed full-viewport presentation are the defect. `MapScreen.tsx:355` + probe. Capture: `assets/annotated/L1-4__auto-list-covers-map.png`.
- **L1-5 → (folded into L8-4/L8-4a) · HIGH.** Guests are offered Verify/Resolve/Reject; every tap must RLS-fail, and the failure message ("updated by someone else") is fabricated.
- **L1-6..L1-17 · MED→POLISH.** SF dark-void Home peek (→S7/S17); Report pill occludes rows (→S16-adjacent); onboarding teaches gestures guests don't have (→S15); carousel exposes all 5 slides to SR at once (→S9-adjacent); white cold-start flash in dark mode; incomplete Android adaptive icon; off-brand notification accent. Full detail in `02_findings.md` §L1.

### L2 — Visual language + glass cohesion
*The material system is coherent and disciplined; the seams are chrome, not glass.*

- **L2-1 / L6-08 / L6-10 · CRITICAL** (canonical C; + parked item ①). White severity digits fail AA on fills 1–4 (**1.57 / 2.15 / 2.78 / 3.61** vs the 4.5 floor) across **seven** render sites, three guest-reachable (auto-opened Nearby list, Report selected chip, Legend). The ratified fork (`severity[n].textOnColor`) already exists and ships correctly elsewhere. [arbiter-measured]. Capture: `assets/annotated/L2-1__white-digit-on-severity.png`. → **S2**.
- **L2-2 / L8-6 · HIGH** (canonical H). Two header families — editorial (Home/Tasks: uppercase eyebrow + display-40 + white-circle actions) vs nav (Map/Profile/Settings: centered bold-16 + rounded-square hamburger + text "Feedback" pill) — and **both stack on signed-in Profile** ("Profile" over "PROFILE"). The strongest cohesion seam; named as the app's own half-executed intent. Capture: `assets/annotated/L2-2__two-header-families.png`. → **S8**.
- **L2-3 → (canonical I = L8-5) · HIGH (web-scoped).** The flagship map ships raw Leaflet zoom rectangles half-buried under the count pill + a full-width web attribution strip. Occlusion on the hero screen + "feels embedded, not built." → **S6/S7**.
- **L2-4..L2-15 · MED→POLISH.** Home un-glassed flat between two luminous tabs; two modal materials (frosted vs opaque) from one header button; light bulk sheet ghosts its backdrop (perception, not AA — **NEEDS-SKY-DEVICE**); four severity grammars (Home breaks number+word law); heat-legend swatches invisible on hot cells; **7 emoji render sites** against DESIGN.md §10; dead-style resurrection traps; `ctaFill` stragglers; icon-container grammar split (squircles vs circles). Detail in `02_findings.md` §L2. **The one-material read: strongest seam = the header split (L2-2)**; the material system itself is worth protecting wholesale.

### L3 — The two core flows
*FIND works on one road (the list); CONTRIBUTE completes for the pre-granted guest and dead-ends for the first-timer.*

- **L3-1 · CRITICAL.** First-time web guest CONTRIBUTE is a dead end: the Home "Report" pill opens the sheet but never kicks a location read, so "Waiting for location…" never resolves and submit stays disabled with no reason. The FAB path fires `requestLocation()` first; the pill path never got the call. `HomeScreen.tsx:348` → `MapScreen.tsx:1043-1061` → `ReportFlagModal.tsx:462-469/:975`. Capture (surface): `assets/annotated/L3-1__guest-contribute-deadend.png`. → **S5**.
- **L3-2 · CRITICAL** (canonical A ← L1-1, L7-04, L8-1). Denied/undetermined Map arrival = silent San Francisco + false "N flags nearby" (`flags.length` is a global geo-unbounded count), the denied banner unreachable on arrival. For a Canadian app with flags in Kelowna, the SF default makes the wrongness maximal. `MapScreen.tsx:123-128/:1043-1061/:2004-2014/:1277-1283`. Capture: `assets/annotated/L3-2__lying-arrival.png`. → **S4**.
- **L3-3 → (canonical B = L5-01) · CRITICAL.** Zoom has no honest affordance: web +/− occluded by the pill at every size; native has no zoom-out button. → **S6**.
- **L3-4 · HIGH.** The points flash lies on anonymous-flag triage: "+3/+7" the DB never awards (actor bonus `auth.uid() <> NEW.user_id` is SQL-NULL for anon flags). `schema.sql:163-165` + `TasksScreen.tsx:760`. **Code-only** — the annotated PNG shows the Tasks flash surface, the mechanism is the SQL three-valued logic. Capture (surface): `assets/annotated/L3-4__points-flash-lies.png`. → **B1 / Sky-fork #2**.
- **L3-5 / L6-03 · HIGH.** Submitting a report confirms nothing: anon success fully silent on web, auth success announce-only. `ReportFlagModal.tsx:314-334/:409-413`. Capture: `assets/annotated/L3-5__silent-submit.png`. → **S10**.
- **L3-8 · HIGH*** (softest; MEDIUM-defensible). The accessible list opens with "Sorted by distance" when it isn't (only sorts by distance when location exists) — contradicting its own honest *visible* notice. `NearbyFlagsModal.tsx:61-75`. Capture: `assets/annotated/L3-8__sorted-distance-false.png`. → **S4** (announce leg native-only).
- **L3-10 · HIGH (web-scoped).** Location personality incoherent: Home ignores a granted location (SF peek) while Tasks fires an uninvited permission prompt on mount. `HomeScreen.tsx:110-117` vs `TasksScreen.tsx:307`. Capture: `assets/annotated/L3-10__location-personality.png`.
- **L3-11 · HIGH.** The report's WHERE is a read-only mono coordinate no one can verify or adjust (no reverse-geocode, no mini-map, no address entry — `AddressSearchModal` exists but isn't wired to the sheet). `ReportFlagModal.tsx:462-469`. Capture: `assets/annotated/L3-11__coords-only-where.png`.
- **L3-12 · HIGH.** The pin callout is a cul-de-sac that promises more: no date, no next step, "Open for details" opens nothing; `FlagDetailModal` exists but is reachable only from Tasks. `PlatformMap.web.tsx:371/:377-409`. Capture: `assets/annotated/L3-12__callout-culdesac.png`. → **S3**.
- **L3-7 · HIGH** (→ canonical J = L7-01). Real data failures fail silently on both FIND surfaces — the designed recovery states never fired in 16 captured failures. → **S11**.
- **L3-13..L3-28 · MED→POLISH.** Viewport under-reports (one pin under "5"); sheet opens pre-decided ("No ramp, sev 3" + asserting ✓); Tasks badge two writers/three meanings; deep-link to deleted flag dies silently; heat-map-on can render nothing; on the Map no tab is selected; SR labels drop status/age; **CLAUDE.md points doc drift** (teaches 5/2/10/5 while the live trigger uses 10/3/15/7); invisible −20 spam penalty; mixed time grammars. Detail in `02_findings.md` §L3.

### L4 — Motion
*Whisper everywhere, except the one room where it shouts at the people the app is for: the map camera on web.*

- **L4-01 · HIGH.** The web reduce-motion camera gate is **inverted**: `flyTo(…, {duration: reducedMotion ? 0 : 0.6})` — Leaflet treats `0` as falsy → the *default distance-based* flight (~1–4s), so an RM user gets the largest, curviest motion in the app on the FIND payoff. **Code-/probe-only** (library source `leaflet-src.js:3522` + probe intermediate frame @t700). Capture (surface): `assets/annotated/L4-01__rm-camera-inverted.png`. → **S12**.
- **L4-02 · HIGH.** Cluster expansion ignores reduce-motion on both platforms (web literal 0.4s `flyTo`, `ClusteredMarkers` never receives `reducedMotion`; native library default animated `fitToCoordinates`). **Code-/probe-only** (probe intermediate @t120). Capture (surface): `assets/annotated/L4-02__rm-cluster-flight.png`. → **S12** (web) / **B7** (native).
- **L4-03..L4-12 · MED→POLISH.** iOS clustering fires a global `LayoutAnimation` spring on every pan-settle; Leaflet built-ins (zoom tween, popup autoPan) unconditional; **zero RM test enforcement** (how the falsy-zero trap shipped); Home peek is a live map with un-gated motion; tier-fill/dot literals off the token scale; dead RM delays (220ms/350ms) that penalize only RM users. **The Motion Inventory Table is reproduced in §4.**

### L5 — Device integrity
*By code, one of the most disciplined touch-target architectures audited; failures cluster in the web map's imported Leaflet chrome and a few overlay-on-overlay decisions.*

- **L5-01 · CRITICAL** (canonical B ← L3-3, L6-20). Map zoom lockout: web +/− occluded by the pill **and** pointer-dead (taps die on the un-guarded `topRow` wrapper, not `box-none` — even visible pixels don't respond); iOS has no single-pointer zoom-out. WCAG 2.5.7. Capture: `assets/annotated/L5-01__zoom-lockout.png`. → **S6**.
- **L5-02 · HIGH (demoted from CRITICAL).** Home Report pill occludes Recent-row targets at 375/390 (covers the last row's redundant chevron; recoverable by 1px scroll). Capture: `assets/annotated/L5-02__report-pill-occlusion.png`.
- **L5-03 · CRITICAL.** Web 200% zoom breaks CONTRIBUTE: the submit label overflows its pill toward Cancel, the anonymity banner shreds mid-word, the header collides ("MapFeedback"). WCAG 1.4.4/1.4.10 on the shipped guest surface. Capture: `assets/annotated/L5-03__zoom200-breaks-contribute.png`. → **S18**.
- **L5-04 · HIGH.** The filter panel's "Clear all" is the app's only bare-text `Pressable` (~34×17pt) — the *recovery* target for "my filters hid everything," where a miss collapses the panel. Capture: `assets/annotated/L5-04__clear-subtarget.png`. → **S16**.
- **L5-05 · HIGH.** The 7-button action bar silently scrolls its last tools (Refresh, **Recenter**) out of reach at ≤320pt / DT, with no affordance — and Recenter is the documented CONTRIBUTE entry for locationless users. Capture: `assets/annotated/L5-05__actionbar-scroll.png`. → **S16**.
- **L5-06 · HIGH.** Home map peek is a live map that steals taps/scroll and — via live Leaflet attribution links — can exit the app from inside a button. Capture: `assets/annotated/L5-06__home-peek-live-map.png`. → **S17**.
- **L5-07 · HIGH.** Native Dynamic-Type walls gate essential info below 2.0 (NearbyModal meta at 1.4). Capture: `assets/annotated/L5-07__dt-walls.png`.

### L6 — Accessibility as the product
*The accessibility layer is the app's single best-engineered subsystem — written fluently in the pre-0.71 RN a11y dialect that `react-native-web@0.21.2` no longer translates. Four of six subsystems are silently sheared off at the web bundler, and web is the only surface a guest has.*

- **L6-01 · CRITICAL.** A web SR user cannot confirm any category/filter selection: RN-web 0.21.2 drops the nested `accessibilityState` dialect (only react-navigation's tab bar, which uses flat `aria-selected`, shows `[selected]`). Category selection is unconfirmable; all panel selection is stateless. **Code-/DOM-only.** Capture (surface): `assets/annotated/L6-01__rnweb-state-drop.png`. → **S9**.
- **L6-02 · HIGH.** `announceForAccessibility`/`setAccessibilityFocus` are literally empty on web, so ~50 announce sites (auto-list count, "Report filed.", filter confirmations) are no-ops. **Code-only.** Capture (surface): `assets/annotated/L6-02__announce-silent-web.png`. → **S9** (aria-live shim).
- **L6-04 · HIGH.** Tasks card actions nested in an `accessible` parent → SR-unreachable on native (each card is one VoiceOver leaf; Verify/Resolve/Reject/Details not focusable). **The single most important VoiceOver device-check in the audit.** **Code-only + device-conditional.** Capture (surface): `assets/annotated/L6-04__nested-actionable.png`. → **S13**.
- **L6-05 · HIGH.** The accessible list's only action dead-ends in the visual callout layer (no focus target, `setAccessibilityFocus` is a web no-op). `FlagDetailModal` is the fix. Capture: `assets/annotated/L6-05__list-action-deadends.png`. → **S3**.
- **L6-07 · HIGH.** Pin boundaries fail on light tiles (ring **1.00:1**, sev1–3 **1.57–2.78**) — iOS light-mode low-vision users lose the low-severity pins into the tile, skewing perceived risk *downward*. [arbiter-measured] — but the on-device Apple-light-tile view is **device-only**. Capture (surface): `assets/annotated/L6-07__pin-boundary-light-tiles.png`. → **S14**.
- **L6-11..L6-22 · MED→POLISH.** Decorative images announce "image" (Tasks *opens* on "image"); unnamed dialogs; page titles not headings; bare-number severity in the list; no tab selected on Map; attribution noise mid-traversal; SignIn missing `accessibilityViewIsModal`; legend backdrop flattening. Most fold into **S9**.

### L7 — Felt performance
*Unusually disciplined engineering; the hole is temporal honesty under degraded network — R1's stated fear.*

- **L7-01 · HIGH.** No data-layer timeout on any Supabase fetch — the loading window is unbounded and message-less under poor signal (the GPS layer got a 15s race; Supabase never did). On poor signal "Loading flags…" / em-dash skeletons persist until the OS socket gives up. Plus a rider: the Map offline error renders raw "Unknown error" instead of the friendly `errors.ts` copy. **Code-/probe-only** (honest state @t30). Capture (surface): `assets/annotated/L7-01__no-timeout.png`. → **S11**.
- **L7-02 · HIGH.** Offline capability silently excludes guests (cache written signed-in-only), and "saved data" never states its age (`cachedAt` already exists). **Code-only.** Capture (surface): `assets/annotated/L7-02__offline-honesty.png`. → **B9 / Sky-fork #4**.
- **L7-03 · HIGH.** Map data is a global most-recent-50 page — no pan, and no "Refresh," ever re-queries the viewed area; the realtime viewport gate reads a stale region. **Code-/probe-only** (empty viewport under "5 nearby"). Capture (surface): `assets/annotated/L7-03__global-page-no-rescope.png`. → **S4 (copy half) / Sky-fork #1 (data)**.
- **L7-04 → (folded into L3-2).** Permission-already-denied arrival: no banner, SF map, "5 flags nearby."
- **L7-05..L7-12 · MED→LOW.** Full-resolution photo originals into thumbnails (→B8); offline tile cache web-only/signed-in-only; silent web locate failure (→B10); nothing queued offline; two live map instances stay mounted; blur-budget paper arithmetic vs the §12.7 tab-bar rule; heat-map "no zones" silence (→B7); cold start stacks three blocking gates.

### L8 — Distinctiveness + signature + trust
*Closer to memorable than it knows, and less credible than it deserves. The signature is the severity grammar (not the glass); what undercuts it is trust instrumentation.*

- **L8-1 · CRITICAL** (→ canonical A = L3-2). The "N flags nearby" pill makes a proximity claim the data layer doesn't support; the permission-denied state proves it false on screen. "The trust equivalent of a broken odometer." → **S4**.
- **L8-2 · HIGH.** "Verified" — the core trust word — is never defined, counted, or dated at any decision point, while a full trust ledger (`StatusHistoryModal`, `FlagDetailModal`) sits built but unreachable from the map. The provenance UI already exists — an information-architecture problem, not a build one. Capture: `assets/annotated/L8-2__verified-undefined.png`. → **S1 (define) + S3 (reach)**.
- **L8-3 · HIGH.** Untrusted content ("BUMBAKLOT · verified · sev 5") wears full institutional confidence with no in-place counter-affordance; moderation lives only on the auth-gated Tasks tab behind a paid one-tap trigger. Capture: `assets/annotated/L8-3__untrusted-full-confidence.png`. → **S3 (read side) / Sky-fork #5 (write side)**.
- **L8-4 · HIGH.** The guest↔auth cliff is silent, unsold, and mis-documented (How To Help tells everyone to "Tap + Report… Add a photo" — affordances guests lack). Capture: `assets/annotated/L8-4__guest-cliff-docs.png`. → **S15 (copy) / Sky-fork #3 (contract)**.
- **L8-4a · HIGH (new, SPLIT).** Guest triage buttons render → RLS refuses (0 rows) → the app reports a **fabricated** "changed by someone else" error (an authz denial mis-mapped to the stale-snapshot message). Correctness bug. **Code-only** (RLS refusal proven from the policy set, not a live mutation). Capture (surface): `assets/annotated/L8-4a__fabricated-conflict.png`. → Sky-fork #3 / bulk-watch gate exemplar.
- **L8-5 / L2-3 · HIGH (web-scoped).** The namesake surface still reads embedded-not-built: raw Leaflet chrome, occluded zoom, web attribution strip, `dark_all` tiles hard-coded in light mode (R6's "the map failed to load"). Capture: `assets/annotated/L8-5__flagship-raw-chrome.png`. → **S6/S7**.
- **L8-7 · HIGH.** Anonymous pins render **gray** → severity color (the safety encoding) erased; the gray pin is defined nowhere. Inverts both of the app's own laws for the reports its proudest feature produces. **Code-only** (no live anon flag in the demo viewport — device-only sighting). Capture (surface): `assets/annotated/L8-7__anon-pins-gray.png`. → **S1**.
- **L8-8..L8-22 · MED→POLISH.** Four brand glyphs (the ownable Wayfinder mark on only two surfaces — →B3); Tasks badge two writers; "0 flags nearby" reads surveyed-and-clear not no-coverage; one thing four names; Help FAQ partially wrong about the shipped app; stale changelog (one entry, three visual eras ago); About virtue claims without anchors; light-mode sheet ghosting; four dismissal idioms; emoji; invented "1+" glyph; product-name collision with accessmap.io. Most → **S15/S20**; the meta-calibration table is reproduced in §4.

---

## 4. Reference tables — motion inventory · meta-calibration · PROTECT · parked · Sky decisions

### The motion inventory table (reproduced from `02_findings.md` §L4)

Every `Animated` system in `src/` is gated on `useReducedMotion()`; the failure is concentrated in the map camera on web. "Whisper" = exemplary/gated; "Noise" = un-gated or inverted for RM users.

| # | What | File:line | RM-gated? | Verdict |
|---|---|---|---|---|
| 1 | Button press-scale (0.97) | `ui/Button.tsx:69–90,131` | Yes — early return | Whisper — exemplary |
| 2 | PressableScale press-scale | `ui/PressableScale.tsx:53–78` | Yes — springs skipped | Whisper — exemplary |
| 3 | FlagCard press sheen | `TasksScreen.tsx:1459–1481,1594–1639` | Yes — **unmounted** under RM/RT/C-lite | Whisper — exemplary |
| 4 | Skeleton loading pulse | `ui/Skeleton.tsx:37–53` | Yes — static at 0.5 | Whisper (literal duration, L4-10) |
| 5 | Tasks in-screen flash pill | `TasksScreen.tsx:448–462,1058–1077` | Yes — `setValue(1)` snap | Whisper |
| 6 | FlashBanner app-level toast | `FlashBanner.tsx:45–123` | Yes — snap; SR announce fires regardless | Whisper — exemplary |
| 7 | Profile tier-progress fill | `ProfileScreen.tsx:782–800,1017–1030` | Yes — snap | Whisper visually; 600ms literal + JS thread (L4-07) |
| 8 | Hamburger drawer slide + scrim | `HamburgerDrawer.tsx:67–103,141–152` | Yes — snap; Modal always `none` | Whisper |
| 9 | Onboarding pager (5 slides) | `OnboardingCards.tsx:184–306` | Yes — `animated:!reduceMotion` | Whisper |
| 10 | Onboarding dot pills | `OnboardingCards.tsx:156–175,373–387` | Yes — `setValue` snap | Whisper (literals + JS driver, L4-08) |
| 11 | Onboarding Modal fade-in | `OnboardingCards.tsx:263` | Yes — `'none'` under RM | Whisper |
| 12 | Replay-tutorial pager | `OnboardingModal.tsx:63–148` | Yes — both gated | Whisper |
| 13 | Modal/Sheet family (32 sites) | grep-verified across `src/` | Yes — **all 32** ternary-gated | Whisper — systematic |
| 14 | Map camera `animateTo` — NATIVE (7 triggers) | `PlatformMap.tsx:88–108` | Yes — `animateToRegion(…, reducedMotion ? 0 : 600)`; instant on device | Whisper under RM; NEEDS-SKY-DEVICE for feel |
| 15 | Map camera `animateTo` — WEB | `PlatformMap.web.tsx:619–634` | **BROKEN-INVERTED** — Leaflet reads `duration:0` as falsy → default flight | **Noise for RM users (L4-01)** |
| 16 | Web cluster-expansion fly | `PlatformMap.web.tsx:340–346` | **NO** — `ClusteredMarkers` gets no `reducedMotion` | **Noise (L4-02)** |
| 17 | Native cluster-expansion fit | library `ClusteredMapView.js:157–174` | **NO** — library default animated | **Noise (L4-02)** — NEEDS-SKY-DEVICE |
| 18 | iOS cluster split/merge spring | library `ClusteredMapView.js:41–141` | **NO** — global `LayoutAnimation.spring` per pan-settle | **Noise (L4-03)** — NEEDS-SKY-DEVICE |
| 19 | Leaflet built-in zoom/fade/autoPan | `PlatformMap.web.tsx:638–643` + `leaflet.css` | **NO** — no `prefers-reduced-motion` block | Noise-adjacent (L4-04) |
| 20 | Home map-peek (live mini-map) | `HomeScreen.tsx:257–269` | **NO** (inherits un-gated paths) | Noise-adjacent (L4-06) |
| 21 | ActivityIndicator spinners (21 files) | grep-verified | No — conventional exemption | Whisper — accepted convention |
| 22 | Web splash loading dots (pre-bundle) | `public/index.html:97–125` | **Yes** — RM media query before JS parses | Whisper — exemplary |
| 23 | Tab switches | bottom-tabs v7 default `animation='none'` | n/a — no motion exists | Whisper — silence |
| 24 | `requestAnimationFrame` nav retry | `RootNavigator.tsx:411` | n/a — scheduling, no visual | Not motion (completeness) |

*Completeness: no reanimated/lottie/moti; no `LayoutAnimation` in app code (only via library #18); no CSS keyframes/`.gif` in `src/`; `GlassSurface`/`ScreenStage` carry no `Animated` — "the glass itself carries no motion" holds at the primitive level.*

### Meta-calibration map (reproduced from `02_findings.md` §L8) [text-inferred — model knowledge, no web access]

| App | Where AccessMap converges | Where it diverges |
|---|---|---|
| **Wheelmap** (venue wheelchair crowdsourcing) | color-coded map + list, plain vocab, civic tone | street-level *barriers* not venues; 5-step severity with stakes; a status *lifecycle*; no "unknown" state (L8-10) |
| **AccessNow** (venue statuses + partnerships) | pin-first crowdsourcing, category tags | barrier-first; **anonymous reporting as a designed right**; open verification queue (Tasks) vs curation |
| **Google Maps a11y layers** | map-first UI, POI iconography, routing users will expect | severity + freshness + verification **on every card**; human plain-language defs; a moderation loop a user can join |
| **Apple Maps a11y** (the material bar Deep Field is judged against) | material-refinement ambition (glass, depth) | community data with visible status; material in service of *civic* legibility (arbitrated AA floors are law, not vibes) |
| **AXS Map** (venue star ratings, mapathons) | civic-volunteer ethos ("help your neighbourhood") | barriers not venues; safety-stakes severity; in-app verification vs star averaging |
| **SeeClickFix / 311** (closest *flow* relative) | category+photo+severity report; open→resolved lifecycle | community-verified, **not** city-acknowledged — honest in Resources, silent at submit (L8-14) |
| **AccessMap (accessmap.io, UW Taskar Center)** | same name, same niche (sidewalk accessibility) | Sky's product reports/verifies barriers; theirs routes around them — L8-18 name collision |

**Divergence verdict:** the divergence is real, legible, and defensible — but the two mechanics that carry it (verification, coverage honesty) are the two the UI under-instruments (L8-2, L8-10). *The divergence is defensible only while the badge means something.*

### Merged PROTECT list — all 17 (from `02_findings.md` §Merged PROTECT). Fixes must EXTEND these, never regress.

**★ Protected by 5+ lenses:**
1. **The Nearby list / NearbyFlagsModal as the map's accessible twin** — one-breath SR row labels (category + severity-number + word + spoken distance + status + description), role=tab chips with counts, 44pt controls, filter-reset-on-close, honest no-location notice. Every blinded reader called it the best thing in the app. Fixes touch its *trigger* or *endpoints*, never this content.
2. **The empty-filters recovery card** — "Your filters are hiding everything" + per-axis one-tap fixes, role=alert (`MapScreen.tsx:1929-1975`). R1: "the app's best moment." The template for every failure state.
3. **The ReportFlagModal sheet architecture** — KAV at the backdrop, 88% cap, sticky 44pt footer, five discrete 44pt severity buttons with live inline definitions. Held its footer at 200%. No redesign moves the footer or replaces the buttons.

**★ Protected by 2–3 lenses — the trust + discipline spine:**
4. **The severity grammar** — the calibrated amber→red ramp + number + word + stakes-line, identical across legend/list/report/heat, with the arbitrated ink-on-color rule. **The signature.** (S1 extends the law; S2 makes the holdouts obey the existing `textOnColor` fork — never weaken it.)
5. **The contrast-arbitration system itself** — floors/inks as script-proven tokens; four shipped proof sets re-verified exit 0 at HEAD; `contrast-check.mjs` decides, never the eye. DO-NOT-EDIT `GlassSurface.tsx`.
6. **The locating fix + its tests + battery/thermal posture** — `initialLocationAction` clearing the spinner on non-granted mount (pinned by `location.test.ts`), the 15s GPS race, ZERO `watchPositionAsync`/intervals anywhere. Closed the only prior CRITICAL-class hang.
7. **Reduce-motion discipline outside the map camera** — all 32 Modal sites gated, the FlagCard sheen *unmounted* under RM/RT/C-lite, the web splash RM media query before the JS bundle parses. The L4 fixes bring web *up to* this standard.
8. **`POINTS` single-source-of-truth + the anonymity honesty set** — the anon banner as a real `alert` node with the Sign-in link deliberately *outside* it; the truthful post-EXIF-strip announcement gated on the strip succeeding.

**★ Single-lens nominations worth carrying:**
9. **Web-as-guest-mode** — no root sign-in wall on web; a new user reaches real barrier data in zero taps. Any future growth-wall is a mission regression.
10. **Home's honesty law** — distances never fabricated from a fallback point; no-center → LATEST/"Most recent". Fix the SF *peek* without touching this.
11. **The privacy-forward trust voice** — "your identity is not stored," the k≥3 heat caveat, "your email is never shown publicly." A competitive moat; the copy fixes correct *toward* this.
12. **`src/lib/accessibility.ts` hook suite + `severityA11y`/`statusA11y` centralization + `accessibilityViewIsModal` across ~25 sheets** — the natural seam for the web-dialect fixes (S9); adoption, not redesign.
13. **The DT guard suite + AppText's uncapped body law** — the reason this audit found reflow, not carnage, at 1.3×.
14. **The Map blur-budget CUT via literal `forceEngineered`** — worst simultaneous state 4 incl. tab bar; never touch `windowSize`/`removeClippedSubviews`.
15. **Store fetch discipline + marker snapshot discipline + cold-start weight controls** — SWR cache paint gated to cold start, `fetchSeqRef` stale-discard, `tracksViewChanges={false}` + content-derived keys, the lucide deep-import plugin (web chunk 4.15→2.28MB).
16. **The bespoke `CategoryIcon` set + the Wayfinder mark + "Wayfinder Blue" `ctaFill` mode-independence** — a real house style; wear it MORE (B3), never replace it.
17. **"Back. Disabled on first card."** — the best disabled-state label in the audit; the pattern to copy wherever a control is conditionally disabled.

*Also re-affirmed untouched: the map overlay's `pointerEvents="box-none"` gesture law, the hardened guard tests, `GlassSurface.tsx` (DO-NOT-EDIT), the shipped glass tokens + GLASS.md arbitrated floors, and every merged 2026-07-01→04 sweep fix.*

### Parked-item dispositions — all 6 (from `02_findings.md` §Parked-item dispositions)

1. **① RecentlyViewedRow severity-dot white-digit** → **CONFIRM (now in scope).** Arbiter measured it head-on (white digit 1.57/2.15/2.78/3.61; disc boundary melt). Site 5 of the seven white-digit sites in canonical L2-1. **Resolved by S2** (the `textOnColor` adoption); auth-gated, so lower-priority than the guest sites. [arbiter-measured]
2. **② Stage lower-right light pool `stagePoolB`** (`theme.ts:202`) → **PARK (Sky's taste call).** Sub-perceptual at 390 (0.06 alpha, card stack covers its footprint); dark correctly has none. Serves restraint, costs nothing legible; killing it would be imperceptible. A judgment offered, not a finding. [web-approximated] → Fork 7.
3. **③ Deferred dark-themed saved-place-chips** → **PARK.** The chip row is auth-gated (guests never see it, no live capture); the shipped always-light chips are AA-by-construction (arbiter exit 0). The dark-over-dark-tiles variant is unbuilt; its "over LIGHT Apple tiles" read is device-only. No audit evidence forces the decision. [arbiter-measured + code-inferred; NEEDS-SKY-DEVICE] → Fork 8.
4. **④ Deferred EXIF-strip + VoiceOver device checks** → **PARK → NEEDS-SKY-DEVICE.** The audit CODE-CONFIRMS the strip-by-re-encode exists (`manipulateAsync(uri, [], {compress:0.9})`, empty actions → EXIF dropped) but cannot verify on-device GPS removal (auth-only photo path, inside the never-signed-in fence). VoiceOver truth is device-only — most importantly **L6-04** (= S13) flattening, plus L6-19 SignIn containment. [code-inferred + NEEDS-SKY-DEVICE]
5. **⑤ `ui/Button` adopt-or-remove** (zero call sites) → **CONFIRM (standing Sky decision).** Grep at HEAD: zero `<Button` call sites app-wide — only the barrel re-export. Not a defect — a one-line Sky call (adopt per the lab's recommendation, or delete). Carried forward so it is not lost. [code-verified] → Fork 9.
6. **⑥ Map wave's deferred `bodyMedium` (≥500-weight-on-glass)** → **PARK + one undisclosed sibling.** The disclosed Map deferral (`savedEmptyText` + `statusHint`×4) plus the undisclosed Tasks `emptyBody` sibling are the material-haze ≥500 law (GLASS §2), NOT a contrast breach (every ink passed the arbiter). B11 carries the mechanical ≥500 bump; the haze *feel* is **NEEDS-SKY-DEVICE**. [code-verified; NEEDS-SKY-DEVICE]

### Sky-decision notes — the fenced backend / data / privacy / scope observations (from `02_findings.md` §Sky-decision notes)

```
DECISIONS FOR SKY (fenced — observed, not prescribed; several are the load-bearing
questions behind the CRITICAL/HIGH findings and cannot be resolved by a UI fix alone)

1. PROXIMITY ARCHITECTURE (behind CRITICAL L3-2, HIGH L7-03). The "N flags nearby" pill and
   the whole FIND promise assume a geo-scoped query, but every flag fetch is a global
   most-recent page with NO lat/lng predicate (flags.ts:606-615/:652-671) and no viewport
   re-scope. This is a DATA-LAYER decision, not a copy fix: does AccessMap add bounded/
   `ST_DWithin`-style spatial queries + a region-change fetch, or does the UI stop claiming
   "nearby" until it can? At 5 flags it is invisible; at real scale, pin-absence reads as
   barrier-absence — the mission's dangerous failure mode.

2. THE POINTS ECONOMY & ITS HONESTY (behind HIGH L3-4). The actor-bonus trigger condition
   `auth.uid() <> NEW.user_id` (schema.sql:163-165) is SQL-NULL, not TRUE, for anonymous flags
   — so triaging an anon report awards 0 while the UI flashes "+3/+7". The fix is a one-line
   trigger change (`IS DISTINCT FROM`) — a DB migration, Sky-applied, never auto-run — OR a UI
   suppression. Also: CLAUDE.md's "Database" section still teaches the OLD 5/2/10/5 values while
   the live trigger + UI use 10/3/15/7 (schema.sql:112 carries an unresolved "DECISION PENDING
   (Sky)"); the doc drift invites a future regression of the honesty chain.

3. THE AUTH WALL & THE GUEST CONTRACT (behind CRITICAL L3-1, HIGH L8-4/L8-4a/L1-2). The product
   ships THREE silently-different guest capability cliffs (no FAB, no photo, no saved places,
   no quick-fill) AND documentation that contradicts the shipped gates. Guests are even shown
   Verify/Resolve/Reject buttons the RLS deterministically refuses, with a fabricated "changed
   by someone else" error. The cross-cutting question is a PRODUCT one: what is the guest
   contract, and should the web build (which IS guest mode) request location and expose a real
   sign-in path at all? UI fixes follow from that decision; they cannot precede it.

4. K-ANONYMITY / HEATMAP POSTURE. The heatmap's k>=3 protection + the user-scoped offline cache
   (a deliberate privacy choice — Jordan Condition 2) are sound; the audit did not undermine
   them. Two observations only: the "Show saved data" banner never states data AGE (L7-02), and
   the k-anonymity caveat copy is honest but terse. The cache-scope decision (guests get no
   offline resilience) is a privacy-vs-utility call worth a conscious ratification.

5. CATEGORY TAXONOMY & VERIFICATION/TRUST MECHANICS (behind HIGH L8-2, L8-3). "Verified" — the
   core trust word — is never defined at any point of decision, never shows a verifier count,
   and the built trust ledger (flag_verifications, flag_status_history, StatusHistoryModal) is
   unreachable from the map. And untrusted content ("BUMBAKLOT · verified · sev 5") wears full
   institutional confidence with no in-place report/flag-as-wrong affordance. Surfacing the
   ledger + a counter-affordance is a TRUST-MODEL scope decision (how much provenance to expose,
   and whether guests can flag content) with UI consequences, not the reverse.

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

## 5. The improvement slate — ranked, tiered, phased

**20 canonical proposals survive** (S1–S20), every one traced to Part-2 finding IDs. **0 killed, 0 backfilled.** Skeptic outcome: 12 KEEP + 8 FIX (each FIX tightened scope; none added a feature) + 0 KILL. Both floors pass (20 survivors ≥10; 7 signature ≥3). Ambition mix: 7 QuickWin (S), 8 Meaningful (M), 3 Signature-tagged M (S1/S6/S7), 2 Larger (L). **6 CRITICALs covered:** L3-1→S5, L3-2→S4, L2-1→S2, L5-01→S6, L5-03→S18, L6-01→S9.

### Ranked ordering (best first) — canonical

Scoring: two judge panels (P1, P2), three judges each (advocate/craft/taste); `composite = impact*2 + cohesion + ethos` (0–20); panel score = mean of 3; **final = mean(P1, P2)**; ties broken by smaller effort, then lower ID.

| rank | id | title | effort | tier | final | top5 |
|---|---|---|---|---|---|---|
| 1 | S3 | The map pin becomes a doorway | L | Signature ★ | **19.667** | ★TOP-5 |
| 2 | S9 | Mount the a11y engine on web | L | Signature ★ | **19.5** | ★TOP-5 |
| 3 | S1 | Wear the severity grammar everywhere | M | Signature ★ | **19.333** | ★TOP-5 |
| 4 | S4 | Honest arrival (CRITICAL) | M | Meaningful | **18.333** | ★TOP-5 |
| 5 | S6 | Give the map an honest zoom (CRITICAL) | M | Signature ★ | **17.667** | ★TOP-5 |
| 6 | S2 | Adopt `textOnColor` at six digit sites (CRITICAL) | S | QuickWin | **17.5** | |
| 7 | S7 | Claim the flagship map (web-scoped) | M | Signature ★ | **17.167** | |
| 8 | S5 | Make the Report pill start a report (CRITICAL) | S | QuickWin | **16.5** | |
| 9 | S18 | "Submit report" label + 200% reflow (CRITICAL) | S | QuickWin | **16.167** | |
| 10 | S11 | Data-layer timeout + "still trying" | M | Meaningful ★ | **15.667** | |
| 11 | S13 | Free the Tasks card actions (VoiceOver #1) | M | Meaningful | **15.5** | |
| 12 | S8 | One editorial header family | M | Signature ★ | **15.333** | |
| 13 | S10 | Confirm the submit (success banner) | M | Meaningful | **15.167** | |
| 14 | S14 | Ratified pin hairline boundary | M | Meaningful | **14.833** | |
| 15 | S12 | Web map camera reduce-motion parity | M | Meaningful | **14.667** | |
| 16 | S15 | First-run honesty copy sweep | S | QuickWin | **14.167** | |
| 17 | S16 | Two worst map touch targets | M | Meaningful | **14.167** | |
| 18 | S17 | Contain the Home map peek | S | QuickWin | **14** | |
| 19 | S19 | Location consent "Not now" + de-theater | S | QuickWin | **13.333** | |
| 20 | S20 | Repair the trust-fallback surfaces | S | QuickWin | **11.833** | |

*Where the panels split: S16 widest (P1 15.67 vs P2 12.67, effort tiebreak drops it below S15); the copy-sweep trio (S15/S19/S20) read lower-ethos to P2-taste. S1 and S6 converged exactly on both panels — part of why they sit so confidently in the top-5.*

### The phases (build-units; the ranking sets priority, the phase decides what is mocked/arbitrated/built as one coherent unit)

**Phase dependency spine:** `0 (copy/parity) → 1 (a11y floor) → 2 (material board, arbiter) → 3 (trust routing, needs 1+2) → 4 (motion) ∥ 5 (resilience)`. Phases 4–5 parallelize after 1; Phase 3 needs both 1 and 2. **Phase 2 is the only arbiter-gated phase.** The 6 CRITICALs spread across 0 (S5, S18) / 1 (S4, S9) / 2 (S2, S6) — front-loaded, as the ranking floats them.

---

### PHASE 0 — Copy & mechanical honesty (no arbiter, no mockup-compile)
*Pure string/label/link/logic-parity edits the app already contradicts itself on. Shippable first, lowest risk.* Members: S15, S20, S19, **S5 (CRITICAL)**, **S18 ①② (CRITICAL)**.

#### S5 — Make the Report pill actually start a report (location parity on the Home-pill path) · CRITICAL · QuickWin (S) · rank 8
- **Resolves:** L3-1 (CRITICAL) · touches L3-5. **FORKS-TO-SKY:** note #3 (guest contract), but S5's core is a pure correctness fix that stands alone.
- **(1) WHAT.** A first-time web guest taps "Allow Location" (a web no-op), lands on Home, taps the advertised "Report" pill, and gets "Waiting for location…" over a permanently-disabled submit (byte-identical open vs t+25s, past the 15s GPS timeout). One-line asymmetry: the FAB path fires `void requestLocation()` before opening; the Home-pill `openReport` handler (`MapScreen.tsx:1094-1096`) only opens. **Fix:** on `openReport`, `if (!dropLocation) void requestLocation()` then open — turning "Waiting…" into a real in-flight request that enables submit. Plus two honesty upgrades: an in-sheet **"Use my location" retry** on failure/deny, and an `accessibilityHint`/visible reason on the disabled submit.
- **(2) WHY.** CRITICAL #1 — a first-time web guest literally cannot file a report, dead on arrival for the exact anonymous cohort the flow was built for. A *parity* fix — the FAB already solved this; the pill never got the call.
- **(3) PERSONA IMPACT.** R6: the advertised Report button stops leading to a dead form. R2: the disabled-submit reason is announced. R4: in-sheet retry means recovery doesn't require abandoning the flow.
- **(4) TRUST + COHESION.** Closes the #1 CRITICAL; the two report entry-points finally behave identically.
- **(5) A11Y.** WCAG 3.3.1/1.3.1 — the disabled control now explains its state; retry inherits the 44pt grammar. No color change.
- **(6) DEPENDENCIES.** Preserves PROTECT-3 (sheet architecture — footer/severity buttons untouched), PROTECT-8 (anonymity set), PROTECT-6 (reuses the locating spine). Pairs with S10 (finish line) and S18 (both touch the submit).
- **(7) VERIFICATION.** No arbiter. Manual: fresh web context WITHOUT geolocation grant → pill → sheet resolves + submit enables; deny → in-sheet retry + reason. FAB/auth paths unchanged.

#### S15 — First-run honesty sweep: retire the four promises the app can't keep in minute one · QuickWin (S) · rank 16
- **Resolves:** L1-2 (copy half), L1-8, L1-11, L8-11, L8-14 (submit-moment half). **FORKS-TO-SKY:** note #3 (the structural auth-wall halves are Sky's; S15 takes only copy).
- **(1) WHAT.** Four copy edits: (1) **noun canon** — pick *barrier* (human) + *flag* (system), retire "reports/tasks" as display nouns, consider "open"→"unconfirmed"; (2) correct the **factually-wrong guest copy** ("need an account to report" is false — anon reporting ships); (3) soften the **onboarding photo/tap promise** guests don't have; (4) add the **submit-moment sentence** ("Your report appears on the map now; neighbours can verify it. AccessMap doesn't notify the city — see Resources.").
- **(2) WHY.** L1-2 is HIGH; the bundle are the minute-one contradictions three readers caught cold — trust withdrawals at the moments trust is decided. Every edit in the privacy-forward voice; the anon-report-sheet exemplar is untouched, funnel copy corrected *toward* it.
- **(3) PERSONA IMPACT.** R6: the four-name whiplash + black-box submit resolve. R2: the false "need an account to report" (which would make them abandon the flow they *can* use) is corrected. R1: the submit-moment sentence states exactly what publishing does.
- **(4) TRUST + COHESION.** Corrects the contradictions that make the first impression "two products"; one noun canon across surfaces.
- **(5) A11Y.** Pure copy; the corrected a11y hint *removes* a false statement; noun canon reduces cognitive load (WCAG 3.1.5 spirit).
- **(6) DEPENDENCIES.** Preserves PROTECT-5/11/3. Coordinate the noun canon with S1 (`STATUS_LABELS`) and S20 (casing).
- **(7) VERIFICATION.** No arbiter. Render + a11y-tree: corrected copy; the SignIn hint no longer states the false claim.

#### S18 — "Submit report" label + 200%-zoom reflow guards · CRITICAL · QuickWin (S) · rank 9
> **⟢ RECONCILED (FIX):** (1) WCAG 2.5.3 — when renaming, **align the accessible name so the visible text is contained** (visible "Submit report" + a11y "Submit report anonymously"), turning a pre-existing miss into a PASS. (2) The header-collision leg (item ③) lives on the react-navigation nav header for Map/Profile/Settings, so it is a **hard dependency on S8** (or apply an equivalent shrink/truncate directly). Items ①② ship standalone.
- **Resolves:** L5-03 (CRITICAL, WCAG 1.4.4 at 200%) · L3-27 · the "Report anonymously as a label" copy observation.
- **(1) WHAT.** Browser zoom is *the* low-vision mechanism on web (a first-class guest surface). At 2.0×: the submit label overflows its pill toward Cancel, the anonymity banner shreds mid-word, the header collides ("MapFeedback"). Biggest lever: rename the 19-char "Report anonymously" button to **"Submit report"** (title + anon banner still state anonymity), aligning the a11y name to contain the visible text — buys ~40% width headroom AND fixes 2.5.3. Bundle two reflow guards: banner wraps on word boundaries; the header title truncates/yields (item ③, via S8). Submit stays reachable throughout (sticky footer) — strictly legibility, not reachability.
- **(2) WHY.** CRITICAL #5 — the shipped web app fails WCAG 1.4.4 at 200% on CONTRIBUTE. A copy change that also sharpens the button (verb-forward, honest).
- **(3) PERSONA IMPACT.** R3: the label fits, the banner wraps, the header stops colliding — the report flow completes at 200%. R2: a voice-control user who says "Submit report" now activates the button (the v1 mismatch would have broken this). R6: h1/button no longer merge.
- **(4) TRUST + COHESION.** Closes a shipped WCAG failure AND a Label-in-Name miss on the app's most important button; extends ScreenHeader's deterministic auto-fit (not the RN-web-no-op `adjustsFontSizeToFit`).
- **(5) A11Y.** WCAG 1.4.4 + 1.4.10 + 2.5.3. No color change.
- **(6) DEPENDENCIES.** Preserves PROTECT-3/4/10/8. **Item ③ is a HARD DEPENDENCY on S8**; ①② standalone. Coordinate with S5/S10.
- **(7) VERIFICATION.** No arbiter. SC test: web @ 390 @ zoom 2.0 → label inside pill, banner wraps on word boundaries, header no longer "MapFeedback" (item ③ after S8). A11y-tree: accessible name contains the visible "Submit report." Native capped 1.5–1.6 DT stays NEEDS-SKY-DEVICE.

#### S19 — Give the location consent slide a visible "Not now" (and stop the web permission theater) · QuickWin (S) · rank 19
- **Resolves:** L1-3 (HIGH). **FORKS-TO-SKY:** note #3 (does the guest build request location / expose sign-in at all).
- **(1) WHAT.** The location slide is the most sensitive consent moment and the only permission slide with no visible decline (slide 4 notifications models "Maybe later" perfectly, `OnboardingCards.tsx:216`). **Fix:** add a visible "Not now" to the location slide (extend the pattern eight lines away). Second leg (web): "Allow Location" performs no permission action and just advances — theater — then the real prompt appears later, unannounced; wire it or relabel so it doesn't masquerade as the grant. Denial never blocks; the UI just hides that, which is the dark-pattern *shape*.
- **(2) WHY.** L1-3 is HIGH — consent in an app mapping disability must be genuinely optional and honestly presented. Extends the app's own respectful pattern.
- **(3) PERSONA IMPACT.** R6 (hesitated, nearly bailed): the toll-to-continue framing ends. R1 (privacy-cautious core audience): an honest decline instead of forcing the OS dialog to say no. R2: the web theater is de-mystified.
- **(4) TRUST + COHESION.** Repairs the highest-stakes consent moment; both permission slides finally offer the same decline.
- **(5) A11Y.** WCAG 3.3.4-spirit / consent integrity; de-theatering removes a misleading control state (4.1.2). New button inherits gated motion.
- **(6) DEPENDENCIES.** Preserves the L1 permission-priming architecture + RM discipline. Pairs with S5 and S15.
- **(7) VERIFICATION.** No arbiter. Render: the slide shows "Not now" in the ungranted first-run state; "Allow Location" wired/relabeled. Native slide *feel* NEEDS-SKY-DEVICE.

#### S20 — Repair the trust-fallback surfaces (Help FAQ accuracy, stale changelog, About anchors, casing sweep) · QuickWin (S) · rank 20
- **Resolves:** L8-12 (Help FAQ), L8-13 (stale changelog), L8-14 (About half) · casing/title-agreement. **FORKS-TO-SKY:** none required (all copy/link).
- **(1) WHAT.** Surfaces consulted at the moment trust is already strained, partially wrong about the shipped app. (1) **Help & FAQ** — fix "Open the Map tab" (no Map tab), "tap '＋ Report'" (auth-only — name the guest path), "magnifying glass → filters" (magnifier is address search; filters are sliders), "Resolved appear in a different color" (they keep severity color + gain a checkmark). This page also holds the only definition of "verified" until S1. (2) **Changelog** — one entry dated 2026-05-23, three visual eras stale; add the v3-era entries. (3) **About anchors** — "open source" under a SOURCE CODE heading with no link/license; add or soften. (4) **Casing sweep** — one casing rule so every title agrees with the row that opens it.
- **(2) WHY.** MEDIUM but load-bearing — wrong copy reads as inattention exactly where the app is otherwise unusually honest. The changelog's candid bullets are the model to extend.
- **(3) PERSONA IMPACT.** R6: the FAQ that would misdirect becomes accurate; the guest CONTRIBUTE path is finally documented. R2: the "verified" definition is corrected and reachable. R3: the casing papercut is removed.
- **(4) TRUST + COHESION.** Repairs the strained-trust surfaces; every title agrees with its opening row.
- **(5) A11Y.** Pure copy/link; accurate FAQ improves the SR experience.
- **(6) DEPENDENCIES.** Preserves PROTECT-11/10. The About "logged, visible" claim is cashed by **S3** (land after, or soften if S3 deferred); casing coordinates with S8/S15.
- **(7) VERIFICATION.** No arbiter. Render + a11y-tree: corrected copy; FAQ names the guest report path; navigation guidance matches the real tab structure.

---

### PHASE 1 — Access CRITICALs (no arbiter — a11y-tree / DOM / device)
*The must-ship WCAG breaches on the surface guests actually use.* Members: **S9 (CRITICAL)**, S13, **S4 (CRITICAL)**.

#### S4 — Honest arrival: kill the "N flags nearby" lie and surface the denied-location banner · CRITICAL · Meaningful (M) · rank 4 · ★TOP-5
> **⟢ RECONCILED (FIX):** gate the arrival banner on the raw `status === 'denied'` **only** — `initialLocationAction` collapses `undetermined` (first run, prompt deferred to onboarding) and `denied` into one `'clear'` result, so gating on the whole branch would tell a never-asked user "access is off." The guard test pins the denied banner AND that a first-run `undetermined` arrival asserts no false claim.
- **Resolves:** L3-2 (CRITICAL), L7-03 (copy half), L3-13, L3-8. **FORKS-TO-SKY:** note #1 (proximity architecture) — S4 takes the "stop claiming 'nearby' until the query can back it" UI-only half; it does NOT touch `flags.ts` fetch scope.
- **(1) WHAT.** Denied/undetermined Map arrival shows a citywide **San Francisco** map, zero pins, and "5 flags nearby" — no banner, no recovery. Two fixes, **neither touches the query:** **(a) truthful copy** — the pill's `flags.length` is a global geo-unbounded count, so change the label to "N reports loaded" / "Showing most recent"; make the L3-8 open-announcement conditional on `location` (native SR; the visible string carries web). **(b) reachable denied banner** — on the mount 'clear' path, gate the banner on the raw `status === 'denied'` captured at `:1045` (NOT the whole branch); for `undetermined`, render nothing or a status-neutral first-run-safe line. Re-word the banner (the blocked job is FINDING, and on web it's the *browser's* site permission, not device Settings).
- **(2) WHY.** CRITICAL #2 — the FIND surface lies on arrival for any location-cautious user (this app's core audience). Extends Home's honesty law to the Map pill.
- **(3) PERSONA IMPACT.** R1: the #1 stranding friction ends; arrival explains itself. R6 (denies location as a cautious disabled user would): an honest empty state, and a never-asked first-run user is NOT told they "turned off" access. R2: the honest string reaches them via the persistent live-region pill.
- **(4) TRUST + COHESION.** Repairs the single highest-frequency trust hit in the audit; aligns the pill to the list's honest voice.
- **(5) A11Y.** The L3-8 leg stops a false SR announcement (native); the banner gives blind/low-vision users the recovery path sighted users get. No color change.
- **(6) DEPENDENCIES.** Preserves PROTECT-6 (the locating fix — the mount change only *adds* a `status`-gated setter, reads the raw status already destructured; `location.test.ts` untouched), PROTECT-1, PROTECT-10. Coordinate with S3/S5/S6/S16 (`MapScreen.tsx`) and S1/S2/S3/S9 (`NearbyFlagsModal.tsx`).
- **(7) VERIFICATION.** No arbiter. Render: `permission-denied` reproduction → banner on arrival for **denied**, pill no longer says "nearby"; a first-run **undetermined** arrival shows NO "access is off" claim. Guard test pins both. Native first-run *feel* NEEDS-SKY-DEVICE.

#### S9 — Mount the accessibility engine on web: adopt the modern RN ≥0.71 a11y dialect · CRITICAL · Signature · Larger (L) · rank 2 · ★TOP-5
- **Resolves:** L6-01 (CRITICAL), L6-02, L6-11, L6-16, L6-17 (heading half), L6-19 (SignIn containment), L6-21 (legend backdrop) · names the mechanism behind L6-13, L6-18.
- **(1) WHAT.** The app's a11y layer is its single best-engineered subsystem — but written in the pre-0.71 RN dialect `react-native-web@0.21.2` no longer translates; four of six subsystems are sheared off at the web bundler, and web is the ONLY surface a guest has. One additive seam-level fix, four independently-shippable facets: **(a)** flat `aria-selected/checked/expanded/busy` **beside** the existing `accessibilityState` at ~30 state sites [the L6-01 CRITICAL core] — only the tab bar (`aria-selected` directly) shows `[selected]` today; **(b)** a visually-hidden `aria-live` **announce-shim** so the ~50 no-op `announceForAccessibility` sites speak (call sites unchanged); **(c)** `aria-hidden:true` in the shared `decorativeProps` so decorative images stop announcing "image" (Tasks literally opens on "image"); **(d)** `aria-label` per `<Modal>`. Plus bundled native-correctness one-liners: `accessibilityRole="header"` on ScreenHeader (L6-17); `accessibilityViewIsModal` on the SignIn root (L6-19); the LegendModal backdrop made an absolute sibling (L6-21).
- **(2) WHY.** CRITICAL #6 — a web SR user cannot confirm any category/filter selection on the only surface guests have. For a "born accessible" product, shipping the web app without its a11y engine mounted is a *mission breach*, not a polish item — R2's "submitting blind in the worst sense."
- **(3) PERSONA IMPACT.** R2 (blind, web SR — the whole point): selection state, announcements, decorative-hiding, dialog labels all mount; Tasks stops opening on "image." R6: confirmations they rely on finally speak. R3: heading-rotor reaches the editorial screens.
- **(4) TRUST + COHESION.** The deepest access repair on the slate; web and native a11y stories converge.
- **(5) A11Y.** WCAG 4.1.2 + 4.1.3 + 1.1.1 + 2.4.6 + modal containment, at scale. No native regression (flat props map to the same states). RN hard-fact honored: routes through a *rendered* `aria-live` node, not the dead API.
- **(6) DEPENDENCIES.** Preserves PROTECT-12 (this IS "adoption, not redesign"), PROTECT-1/3/6. **Do NOT remove the native SR auto-open.** The S3 SR-branch + S13's restructure use the same a11y model. Coordinate `accessibility.ts` (with S13), `ScreenHeader.tsx` (with S8), the ~30 state-prop sites.
- **(7) VERIFICATION.** DOM re-walk (the L6 PROBE): shipped-DOM attribute dump of report form + filter panel; Tasks no longer opens on "image"; the `aria-live` node updates on a filter change. Four glass proof-sets stay exit-0. Native VoiceOver (SignIn containment, legend backdrop) NEEDS-SKY-DEVICE, unchanged by construction.

#### S13 — Free the Tasks card actions from the accessible-parent trap (native VoiceOver #1) · Meaningful (M) · rank 11
- **Resolves:** L6-04 (HIGH — "the single most important VoiceOver device-check in the audit").
- **(1) WHAT.** Each Tasks card is a bare `<Pressable>` (accessible-by-default) that WRAPS four `PressableScale` action buttons — on iOS `accessible` makes the card one VoiceOver leaf and its buttons are not focusable, so a blind user's path to verifying collapses to the bulk bar or nothing. **Fix (structural, known):** lift the action row OUT as a sibling row, OR set `accessible={false}` on the card with a labeled inner summary node — so both the summary and each action are independently focusable. (Same restructure fixes the web nested-`<button>` invalidity.)
- **(2) WHY.** L6-04 is HIGH and the audit's #1 device check. The trust engine (verify/resolve/reject) must be operable by blind users on the surface built for it, or the badge economy is sighted-only. A structural fix that respects the card's visual layout entirely.
- **(3) PERSONA IMPACT.** R2 (blind, iOS VoiceOver): each action becomes an independently focusable button. R6: the trust engine they rely on becomes operable.
- **(4) TRUST + COHESION.** Makes the trust engine accessible; the card's a11y grouping joins the app's careful pattern.
- **(5) A11Y.** WCAG 4.1.2 on the primary triage surface. Bulk-select stays the multi-select path; touches only grouping.
- **(6) DEPENDENCIES.** Preserves the bulk-select flow + the card's visual layout. Same flattening mechanism as S9's LegendModal-backdrop fix — coordinate. **Best sequenced behind the ONE EAS TestFlight build** (the confirmation gate; code lands before, verified after). Coordinate `TasksScreen.tsx` FlagCard with S1/S2.
- **(7) VERIFICATION.** Device (the gate): iOS VoiceOver — are Verify/Details focusable from a card? A11y-tree (web): nested-button invalidity resolved. No arbiter.

---

### PHASE 2 — Material cohesion (GLASS §9 recipe — mockup → **arbiter** → staged build → report)
*The one arbiter-gated phase. Every surface composites app-owned ink over live map tiles (or unifies the chrome that frames them). Mock the whole material system as one board.* Members: S1, **S2 (CRITICAL)**, **S6 (CRITICAL)**, S7, S14, S8, S18③.
**One coordinated map-renderer pass:** S1 (anon ring) + S2 (digit ink) + S6 (zoom chrome + `topRow`) + S7 (tiles + attribution) + S14 (pin hairline) + S17-instance all touch `PlatformMap.tsx`/`.web.tsx`/the overlay. The native pin is rebuilt as a custom teardrop **once** (S14) and the anon ring (S1) composes onto that rebuild. **Order inside Phase 2:** S2 (ink) → S1 (word + ring) → S14 (hairline, native rebuild) → S6/S7 (zoom + tiles) → one arbiter run over the composed board → staged commits → one rollout report.

#### S2 — Adopt the ratified `textOnColor` ink at the six un-forked severity-digit sites · CRITICAL · QuickWin (S) · rank 6
- **Resolves:** L2-1 / L6-08 / L6-10 (canonical C; + parked ①; arbiter §D-1/D-2).
- **(1) WHAT.** The system already retired white-on-severity-fill (`92a2be6`) and ratified the fix as `severity[n].textOnColor` (`theme.ts:543-547`) — ink `#0F1B2D` on 1–4, white on 5 only (rationale in the comment: ink measures 8.05/6.21/4.79). SeverityBadge, Map sev pills, action-bar chip already obey it. **Swap** the hardcoded white for `severity[s].textOnColor` at the seven sites the arbiter measured at **1.57/2.15/2.78/3.61** (sev1–4) and flip the paired white Check glyph. Sites: `NearbyFlagsModal.tsx:140/144`, `LegendModal.tsx:66/70`, `ReportFlagModal.tsx:607/637/1081-1084`, `ActivityFeedModal.tsx:156/162`, `RecentlyViewedRow.tsx:139/145`, `FlagDetailModal.tsx:1066/1076` + view-mode chip `:834/839`. No new token, no geometry change.
- **(2) WHY.** The audit's #3 CRITICAL and a shipped WCAG 1.4.3 breach on the safety datum; three sites guest-reachable (a sev-1 disc reads as a blank yellow dot on the one list every web guest sees). Extends the app's own ratified law rather than weakening it.
- **(3) PERSONA IMPACT.** R3: the severity number becomes legible on every disc. R1: the datum they base a detour on stops disappearing into its fill. R2: unaffected (number already in the SR label).
- **(4) TRUST + COHESION.** The six holdouts finally obey the fork the crown jewel ratifies; the material system stops contradicting its own AA rationale.
- **(5) A11Y.** This IS the floor fix — closes a live AA breach. Every site keeps a passing text twin; information is never lost, the primary visual mark is what fails.
- **(6) DEPENDENCIES.** Preserves PROTECT-4/5. **Ships *before* S1** (S1's word rides on the corrected digit). Coordinate `NearbyFlagsModal.tsx`/`LegendModal.tsx`/`ReportFlagModal.tsx` with S1/S3/S9/S16/S5/S18.
- **(7) VERIFICATION.** **Arbiter re-run (required):** `tools/audit-stacks.json` through `contrast-check.mjs` with a stack per site → exit 0 (the transferable pairs already prove ink = 8.05/6.21/4.79). Touches no floor.

#### S1 — Wear the severity grammar everywhere severity is spoken (and define "verified" in the same breath) · Signature · Meaningful (M) · rank 3 · ★TOP-5
- **Resolves:** L8-2 (UI half — callout omits the word), L8-7 (anon pins erase color), L2-7 (four grammars), L6-14 (bare "severity 4" in SR), L8-10 (partial). **FORKS-TO-SKY:** the verifier-*count* + callout-*date* half of L8-2 depends on note #5 → those live in S3; S1 takes only the WORD, the legend status-line, the anon ring.
- **(1) WHAT.** The signature is the severity grammar, spoken in full only on the Report form and truncated at every *decision* surface. Following the GLASS §9 recipe, repeat it identically: (a) the pin callout + each Nearby row gain the WORD beside the number ("Severity 4 of 5 · Significant · Verified") via the existing `severityA11y`; (b) Home's Recent rows gain the *number* and route the raw lowercase DB enum through `STATUS_LABELS` (R6 read "open" as business hours); (c) the anonymous pin keeps its severity FILL and carries provenance as a **ring/dashed border** instead of the gray swap that erases severity; (d) the Map legend gains a one-line **Status block** ("Open = reported · Verified = another person checked the spot and confirmed the issue is real · Resolved = fixed") reusing the FAQ's sentence, plus legend entries for the anon ring + resolved checkmark. Any anon-ring color is arbiter-proven over the tile bases before build.
- **(2) WHY.** Severity is THE trust datum; resolving L2-7, L6-14, L8-7, and the legend gaps in one move. A civic product's core datum must read identically on every screen. R1: "I could judge risk from this alone." R6: "exactly what the rest of the app was missing." A signature that is *more* accessible because it stops a color-only failure is the ethos made literal.
- **(3) PERSONA IMPACT.** R1: the anon-pin fix ends the betrayal where an impassable anonymous barrier renders quieter than a trivial authed one. R2: the accessible twin finally speaks "severity 4 of 5, Significant." R6: the four-grammar decode tax collapses to one. R3: number+word redundancy survives one channel being hard to resolve.
- **(4) TRUST + COHESION.** The strongest cohesion win on the *content* layer; repairs the deepest trust wound (an undefined "Verified") by defining it on the legend.
- **(5) A11Y.** Adopts the existing `severityA11y`/`statusA11y` (PROTECT-4/12); the anon ring restores a 1.4.11 non-text channel the gray swap erased; the Status block is the first place "Verified" is defined. No AA regression — the word is *added*.
- **(6) DEPENDENCIES.** Preserves PROTECT-4/1/5/16. Lands *after* S2. Coordinate the native pin renderer with **S14** (one pass), `LegendModal.tsx` with S9/S20, `NearbyFlagsModal.tsx` with S3/S9/S16.
- **(7) VERIFICATION.** **Arbiter re-run (required):** anon-pin ring over the five tile bases + red heat cell → exit 0. A11y-tree: rows show "severity N of 5, {word}"; the legend renders a Status section. Anon-pin-on-light-tile *visual* NEEDS-SKY-DEVICE.

#### S6 — Give the map an honest zoom: app-styled 44pt zoom buttons in the overlay bottom · CRITICAL · Signature · Meaningful (M) · rank 5 · ★TOP-5
> **⟢ RECONCILED (FIX):** (1) field (7) now requires a **MANDATORY arbiter re-run** (GLASS §12 LIVE-BACKDROP). (2) adopt existing ratified tokens (`ctaFill`+`textOnBrand` / `forceEngineered` chrome), invent none, pin the buttons **opaque** (⇒ tiles unreachable). (3) wiring needs an additive zoom method on `PlatformMapHandle` (or drive the existing Leaflet `mapRef`/native `animateCamera`) — NOT a primitive fork.
- **Resolves:** L5-01 (CRITICAL).
- **(1) WHAT.** The defining device-integrity defect: an interactive control occluded at *every* size. On web, Leaflet's 26–30px zoom buttons render top-left, are covered by the count pill/action bar, and — worse — taps die on the un-guarded `topRow` wrapper (even visible pixels are pointer-dead). On iOS there are no zoom buttons; double-tap zooms *in* single-fingered — the real gap is single-pointer **zoom-OUT** (WCAG 2.5.7). **Fix:** on web, `zoomControl={false}` + app-styled **44pt** zoom +/− buttons in the overlay's *bottom* zone, wired to the map's imperative zoom; on iOS, the same 44pt buttons. Pinned opaque with `ctaFill`+`textOnBrand`, mounted in a `box-none`-respecting group so their hit region isn't stolen by the same wrapper.
- **(2) WHY.** CRITICAL #4 — zoom is locked out on the flagship map for one-handed/low-dexterity users. Zoom is how a wheelchair user reads block-level detail. An ownable "this map was built, not embedded" moment.
- **(3) PERSONA IMPACT.** R4: a 44pt one-thumb zoom appears in the reachable bottom zone. R1: can zoom to read block-level detail. R3: zoom-in is finally a reliable button.
- **(4) TRUST + COHESION.** Co-signature with S7 — the flagship stops looking like a widget with dead controls.
- **(5) A11Y.** WCAG 2.5.5 (target size) + 2.5.7 (single-pointer zoom-out). Buttons are keyboard-focusable AND pointer-operable (the path that died on `topRow`). The opaque `ctaFill` glyph pairing is arbiter-proven.
- **(6) DEPENDENCIES.** Preserves the `box-none` gesture law (the new group is itself `box-none`; this *repairs* `topRow`), `GlassSurface.tsx` DO-NOT-EDIT (the zoom-method add is additive). S6's `zoomControl={false}` supersedes the Leaflet control, so **S7 drops its redundant `.leaflet-control-zoom` restyle.** Land S6's `topRow` fix + S7's chrome in one overlay pass. Coordinate with S3/S4/S7/S17.
- **(7) VERIFICATION.** **Arbiter re-run (required — reconciled):** button edge/hairline vs tile extremes `#000`/`#FFF` (1.4.11, min 3.0) + glyph vs fill (1.4.3, min 4.5) → exit 0. Manual (web): 44pt, bottom-anchored, clickable, map pans still work. iOS single-pointer zoom-out + pinch/VoiceOver NEEDS-SKY-DEVICE.

#### S7 — Claim the flagship map: theme the tiles, tame the third-party chrome (web-scoped) · Signature · Meaningful (M) · rank 7
> **⟢ RECONCILED (FIX):** (1) the arbiter re-run is **MANDATORY** over the map-WORLD inks on the NEW light CARTO tile family — the white pin ring (`:122`) fails on near-white tiles by construction. (2) if the white ring fails, adopt the already-ratified paired light+dark ring UNION. (3) PROTECT citation corrected to the GLASS §12 always-light-overlay discipline. (4) S7 keeps ONLY the tile-theme + attribution restyle and **DROPS** the redundant `.leaflet-control-zoom` restyle (S6 removes that control).
- **Resolves:** L8-5 / L2-3 (canonical I) · absorbs L1-6 (dark-void Home slice) + L5-16 (attribution) · pairs with S17 (peek instance).
- **(1) WHAT.** The namesake screen "feels embedded, not built" and is the *first* surface every web guest touches. Following the GLASS §9 recipe: (1) the CARTO basemap is `dark_all` **unconditionally** (`PlatformMap.web.tsx:531`), so light mode renders near-black — branch the tile URL on `color.scheme` so light mode gets a light-family basemap; (2) the full-width Leaflet/OSM/CARTO attribution strip — style/condense it to the app's hairline voice, **kept never removed** (legally required). The light-tile choice triggers the MANDATORY arbiter re-run; if the white pin ring fails, adopt the ratified union ring. Pinned-always-light overlays (legend, locating banner, place-chip literals) stay AA-by-construction.
- **(2) WHY.** HIGH and web-scoped, but web IS the only guest surface — first-contact, not dev convenience. R5 friction #1; R6 nearly quit at the black hole.
- **(3) PERSONA IMPACT.** R3: theming the tiles is what makes the light-mode map *legible at all*; the arbiter re-run guarantees the pins stay visible (union ring if needed). R6: the black-hole first impression is gone. R1: a legible, owned map to read routes on.
- **(4) TRUST + COHESION.** Co-signature with S8 — the strongest "one product" win on the FIND half.
- **(5) A11Y.** Theming restores light-mode map legibility (a de-facto contrast fix); the MANDATORY arbiter re-run is the floor guard. No AA floor traded.
- **(6) DEPENDENCIES.** Preserves the GLASS §12 always-light-overlay discipline + real PROTECT-9 (web-as-guest) + PROTECT-5. Coordinate with S6 (one overlay pass; S7 does NOT restyle the zoom control), S1/S14 (pin inks re-checked over light tiles in one arbiter pass), S17 (peek inherits the light tile).
- **(7) VERIFICATION.** **Arbiter re-run (required — reconciled):** the light CARTO tile family as a base regime covering the white pin ring, each severity + `#9CA3AF` anon fill, cluster + heat-badge boundaries (1.4.11 min 3.0) → exit 0; union ring adopted + re-checked if the white ring fails. Render: FullMap + Home peek light/dark; the near-black is gone in light, dark unchanged, pins remain visible. iOS light-tile visual NEEDS-SKY-DEVICE.

#### S14 — Give map pins the ratified hairline boundary so low-severity barriers stop vanishing on light tiles · Meaningful (M) · rank 14
> **⟢ RECONCILED (FIX):** (1) effort S–M → **M** — on WEB the pin is a custom `DivIcon` (a one-line `box-shadow` add, and web already passes), but on NATIVE it is a bare `pinColor` system marker with no face — the fix is a **net-new custom child-View teardrop marker** (design, not replication). (2) that native marker MUST carry `tracksViewChanges={false}` + a content-derived key (PROTECT-15) and be a mode-independent always-light literal (PROTECT-16). (3) web half scoped parity-only; the access win is native iOS light tiles. (5) sequence with S1 in the ONE native pin-renderer pass.
- **Resolves:** L6-07 (HIGH, arbiter-measured).
- **(1) WHAT.** GLASS §12 rule 4 ("a white ring vanishes on white tiles → regime-decomposed unions") is applied to clusters and heat badges but **never to pins**. The arbiter measured the gap: the 2.5px white ring reads **1.00:1** on Apple light tiles; sev1–3 fills read **1.57/2.15/2.78** — an iOS light-mode low-vision user loses the low-severity pins, skewing perceived risk *downward*. Apply the ratified 1px `#0F1B2D` hairline-union: on web a one-line `box-shadow` parity add; on native a custom child-View teardrop marker (fill + white ring + `#0F1B2D` outer hairline + counter-rotated glyph) preserving the Callout, opacity dimming, and anon variant.
- **(2) WHY.** HIGH and arbiter-measured. The severity ramp's low end vanishing first *downward*-skews risk on a safety map — the most dangerous direction. Replicate the ratified union the app already trusts on clusters.
- **(3) PERSONA IMPACT.** R3 (low-vision, iOS light mode): the hairline restores the boundary on any tile. R1: the pin they judge a route by stops disappearing. (HIGH not CRITICAL because the Nearby list carries severity non-visually.)
- **(4) TRUST + COHESION.** Completes the GLASS §12.4 union law across every color-bearing map element; pins finally match clusters and heat badges.
- **(5) A11Y.** WCAG 1.4.11 on interactive map targets. Adopts the existing ink `#0F1B2D`, invents no token. The native rebuild preserves PROTECT-15/16.
- **(6) DEPENDENCIES.** Preserves the GLASS §12.4 union law, `GlassSurface.tsx` DO-NOT-EDIT, PROTECT-15/16. **Overlaps S1's anon-pin ring — sequence together in the ONE native pin-renderer pass** so the teardrop rebuild happens once. Coordinate `PlatformMap.tsx`/`.web.tsx` with S1/S3/S6/S7/S17.
- **(7) VERIFICATION.** **Arbiter re-run (required):** the §C tileExtremes rows must show the pin ring/fill boundary clearing 3:1 on light tiles; exit-0 on the four proof-sets confirms no regression. Native marker sets `tracksViewChanges={false}` + content-derived key. On-device Apple-light-tile visual NEEDS-SKY-DEVICE.

#### S8 — One editorial header family across every tab · Signature · Meaningful (M) · rank 12
> **⟢ RECONCILED (FIX):** (1) the L2-15 close-affordance convergence is constrained — keep every close control's programmatic name and do NOT flatten PROTECT-1's Nearby "Close" pill or PROTECT-3's sheet close. (2) the `box-none` gesture invariant is written into the FullMap header constraint — the Map header converges chrome grammar only (or places any in-overlay title so no `box-none` region becomes touch-opaque); resolve the exact Map layout in the mockup/Design-Compiler stage, NOT by dropping a scrolling display-40 ScreenHeader onto the map canvas.
- **Resolves:** L2-2 / L8-6 (canonical H) · absorbs the double-title facet · touches L2-15 (constrained).
- **(1) WHAT.** The seam a user crosses on *every* tab switch. Home/Tasks wear the editorial header; Profile/FullMap/Settings wear the shared nav header (centered bold-16 + rounded-square hamburger + text "Feedback" pill); on signed-in Profile the two **stack** ("Profile" over "PROFILE"). **Fix:** roll `ScreenHeader` onto Profile/FullMap/Settings (its docstring already declares the intent), set `headerShown:false` on those routes (killing the double title), unify the drawer trigger to ONE shape and Feedback to ONE treatment, and converge the modal close-affordance grammar on a single idiom (constrained — see the reconciliation note). On FullMap the treatment respects the full-bleed map's `box-none` overlay.
- **(2) WHY.** HIGH — the named strongest seam. Trust-through-polish; the editorial eyebrow + display type is AccessMap's chosen identity, executed to completion instead of half-migrated.
- **(3) PERSONA IMPACT.** R2: removing the double header removes a redundant title from Profile traversal; the constrained convergence keeps every close control's name. R6: one header idiom to re-learn. R3: consistent header type/size aids orientation.
- **(4) TRUST + COHESION.** The single strongest cohesion win on the *chrome* layer; the seam on every tab switch closes.
- **(5) A11Y.** Zero AA cost (both families' inks pass) while *improving* structure; the FullMap `box-none` invariant guarantees the map stays grabbable (WCAG 2.5.1).
- **(6) DEPENDENCIES.** Preserves PROTECT-10/1/3 + the `box-none` gesture law. Coordinate with S9 (header-role a11y) and S20 (casing). **S18's header-collision leg (item ③) is a hard dependency on this migration.** Coordinate `RootNavigator.tsx`, `ScreenHeader.tsx` (with S9/S18), the screen bodies.
- **(7) VERIFICATION.** No arbiter (both inks pass). Render: five headers read as one family; signed-in Profile shows ONE title (device or composited lab-mockup); on FullMap the map still pans/zooms under the unified header. A11y-tree: no double-announce; every converged close control keeps a programmatic name; PROTECT-1/3 unchanged.

*(S18 item ③ — the header-title × Feedback-pill collision guard — rides this S8 migration; the label + banner-wrap legs shipped in Phase 0.)*

---

### PHASE 3 — Trust instrumentation (no arbiter — routing / a11y-tree)
*Make the trust the app already built reachable at the point of decision. Depends on Phase 1's a11y model.* Member: S3 (ranked #1, built after the a11y floor + the material board it decorates — the ranking sets priority, the dependency sets the slot).

#### S3 — The map pin becomes a doorway: surface the trust ledger where trust is spent · Signature · Larger (L) · rank 1 · ★TOP-5
- **Resolves:** L3-12 (callout cul-de-sac), L6-05 (accessible list's verb dead-ends), L8-2 (UI read-half), L8-3 (partial — read side). **FORKS-TO-SKY:** note #5 — (a) whether to *display* a verifier COUNT rides the callout; (b) L8-3's guest "flag as wrong" write side. S3 scopes only the *read* side (surface the receipt).
- **(1) WHAT.** The cruelest finding on the trust axis: the app *already built* a full trust ledger — `FlagDetailModal` (SR-complete: `useFocusOnOpen`, `accessibilityViewIsModal`, `severityA11y`, a real "Reported on {date}", photo gallery, `StatusHistoryModal` "Foundational for trust") — and hid every one three taps deep, never reachable from the callout or Nearby list where a user bets an outing on a badge. **The fix is one wiring change with two entry points** (MapScreen doesn't currently import FlagDetailModal — a real integration): (1) the pin callout gains a real **"Open details"** affordance that opens FlagDetailModal, *and* the callout gains the `created_at`/`relativeTime` line so even the quick glance shows freshness; (2) **when the screen reader is on**, route the Nearby list's terminal verb `onSelectFlag` to open FlagDetailModal (a focus-managed sheet with a real heading) instead of silently centering a map they can't perceive. This cashes the "Open for details" over-promise (L3-12), ends the accessible dead-end (L6-05), and surfaces the ledger read-half (L8-2/L8-3).
- **(2) WHY.** Resolves a HIGH cul-de-sac, a HIGH accessible dead-end, and the read-half of two HIGH trust gaps by *adopting an asset the app already built and hides* — the most in-ethos move available. The difference between "this app finds barriers" and "this app helps me act on them." A civic move no venue-rater makes: the central promise word becomes *inspectable*.
- **(3) PERSONA IMPACT.** R1: the FIND decision step finally has a next action — open the receipt, judge freshness, decide. R2: the accessible twin stops dead-ending its only verb; under SR the list row opens a focus-managed sheet. R6: "Verified 29d ago" gives the badge a receipt.
- **(4) TRUST + COHESION.** The deepest trust repair on the slate — provenance becomes reachable at the point of decision; the callout/list join the modal-detail idiom.
- **(5) A11Y.** Routes the accessible list into a surface with `useFocusOnOpen` + `accessibilityViewIsModal` + `severityA11y` — a managed focus target replacing a focus-nowhere dead-end. It is a Modal (not `announceForAccessibility`), so it works cross-platform.
- **(6) DEPENDENCIES.** Preserves PROTECT-1 (adds an *endpoint* to the Nearby list, never touches row content), the `box-none` gesture law, PROTECT-3. Pairs with S1; if S9 ships, the SR-branch uses the same `screenReaderOn` signal. Coordinate `MapScreen.tsx` (imports FlagDetailModal) with S4/S5/S6/S16, the callout with S1/S7/S14/S17.
- **(7) VERIFICATION.** No arbiter. Manual: tap a pin → callout shows a date + "Open details" → FlagDetailModal opens with focus on its title. SR re-walk: selecting a Nearby row opens the detail sheet, focus lands on the title. Native focus traversal NEEDS-SKY-DEVICE.

*(S20's About "logged, visible to other users" claim cashes here.)*

---

### PHASE 4 — Motion parity (no arbiter — reduce-motion guard test)
*Bring the last surface that escaped the app's reduce-motion discipline up to the native standard.* Member: S12 (standalone; a self-contained WCAG 2.3.3 correctness fix with its own guard test; coordinates with S17 on `PlatformMap.web.tsx` config but doesn't depend on it).

#### S12 — Bring the web map camera up to the native reduce-motion standard (kill the falsy-zero trap) · Meaningful (M) · rank 15
- **Resolves:** L4-01 (primary), L4-02 (web cluster leg), L4-04 (Leaflet built-ins under RM), L4-09 (the stale doc-comment that seeded the hole).
- **(1) WHAT.** A user who asked their OS for less motion gets the **largest, curviest, longest** motion in the app — Leaflet's signature arc, ~1–4s — on the FIND payoff (probe caught a genuine intermediate zoom at t700, flight still running at t1600). The cause is a two-character trap: `flyTo(…, {duration: reducedMotion ? 0 : 0.6})` — Leaflet treats `0` as falsy → the distance-based default. Native already does this right. **Fix:** under RM pass Leaflet **`{ animate: false }`** (short-circuits to instant `setView`) instead of a falsy duration; apply the same to the cluster `flyTo` (and thread `reducedMotion` into `ClusteredMarkers`); set `zoomAnimation/fadeAnimation:false` + popup `autoPan:false` under RM. Same PR fixes the `accessibility.ts:95` doc comment (the lie that rationalized "why gate what can't fire?") and rewrites the `:625` comment to name the falsy-zero trap.
- **(2) WHY.** A confirmed WCAG 2.3.3 failure on the core FIND flow — the app's *worst* motion inflicted on the users who explicitly asked for less. Bring web *up to* the native camera standard; touch neither the native path nor its intent.
- **(3) PERSONA IMPACT.** R5 / vestibular & motion-sensitive users: the camera cuts instantly. R1 (uses RM for focus): the FIND payoff stops being a nauseating arc.
- **(4) TRUST + COHESION.** Removes an outright contradiction of the app's praised motion discipline; web and native cameras finally behave identically under RM.
- **(5) A11Y.** This IS the WCAG 2.3.3 compliance. Non-RM users untouched (the 0.6s flight stays). Extends the RM discipline to the last surface that escaped it.
- **(6) DEPENDENCIES.** Preserves PROTECT-7 + the `box-none` gesture law. Coordinate with S17 (both touch `PlatformMap.web.tsx` config); ship its own `flyTo(animate:false)` guard test regardless.
- **(7) VERIFICATION.** No arbiter. **Guard test (required — this is how the trap shipped):** mock `useReducedMotion`, assert `flyTo` called with `animate:false` under RM. Probe: re-run `rm-flight` → an instant cut, no intermediate frame. On-device *feel* NEEDS-SKY-DEVICE.

---

### PHASE 5 — Felt-performance & resilience (no arbiter — guard test / render-state / device)
*Danger-path honesty and device-integrity hygiene.* Members: S11, S10, S16, S17.
S11 + S10 are the temporal-honesty + finish-line pair and **share the persistent-mounted `aria-live` mechanism** (establish it once — the always-mounted node the severity echo line proves, NOT the conditionally-unmounting FlashBanner). S16 + S17 are device-integrity hygiene on the same MapScreen/Home surfaces.

#### S11 — Data-layer timeout + honest "still trying" escalation (the danger-path silence fix) · Signature · Meaningful (M) · rank 10
> **⟢ RECONCILED (FIX):** scope the HARD abort to **READS only**. For WRITES (`createFlag`/`createAnonFlag`/`uploadFlagPhoto`), do NOT abort the in-flight insert — a committed-but-slow write would surface a false "still trying" and invite a duplicate resubmit (which the anon 5/day limit punishes). Instead escalate via OVERLAY while the write continues (or pair any abort with idempotency/dedup). The read/write split is explicit in fields (1) and (6); a guard test asserts a post-threshold write does not double-insert.
- **Resolves:** L7-01 (primary) + the rider (raw "Unknown error") + the "Loading flags…" copy observation.
- **(1) WHAT.** The GPS layer got a 15s race; the Supabase layer never did. On clean offline the honest states fire in ~5–30s; on **poor signal** (one bar, packet loss, captive portal — the field case) the request pends until the OS gives up (~60s iOS, minutes web) with no escalation. R1 converts exactly this into the mission's most dangerous misreading: "an empty map reads as 'no barriers.'" **Fix, split by read vs write:** **READS** race a timeout and at a threshold surface a calm **"Still trying — check your signal"** (a persistent-mounted live region) with retry, before the OS gives up; a read may hard-abort at the ceiling. **WRITES** escalate via overlay while continuing (never abort a possibly-committed insert). Bundle two copy fixes: route the offline-abort path through `errors.ts` (kill the raw "Unknown error"); split **"Loading flags…"** (cold) from **"Updating…"** (revalidating over data).
- **(2) WHY.** HIGH and R1's stated #1 fear — a danger-path honesty gap on a safety product. Makes the app's own documented GPS principle true of the data layer too. Mirror the shape the app already chose; do not invent a new pattern.
- **(3) PERSONA IMPACT.** R1 (field use, poor signal): "Still trying" makes the difference between working and dead legible. R2: hears "still trying" instead of an infinite silent spinner. R6: "Updating…" vs "Loading" tells them stale vs nothing; a slow *submit* no longer risks a punished duplicate.
- **(4) TRUST + COHESION.** The temporal-honesty spine — the app stops presenting "stalled" as "empty"; the data layer inherits the GPS honesty posture. The read/write split keeps the fix from manufacturing a duplicate-flag failure.
- **(5) A11Y.** The escalation is a persistent-mount `role=alert`/`aria-live` (mount-timed live regions on web don't reliably fire). No AA color traded; retry inherits the 44pt grammar.
- **(6) DEPENDENCIES.** Preserves PROTECT-8/6/15/2. Read half may hard-abort; write half escalates-not-abort. The persistent-live-region mechanism is shared with S10/S12 — establish it once. Coordinate `supabase.ts`/`flags.ts`/`flagsStore.tsx` + `MapScreen.tsx`/`HomeScreen.tsx`.
- **(7) VERIFICATION.** **Guard test (two legs):** (a) a read racing a timeout surfaces "still trying" at the threshold; (b) a write resolving AFTER the threshold does NOT double-insert. Manual: the escalation appears before the OS gives up, announces, offers retry; the offline error shows the friendly copy; "Updating…" over live data, "Loading flags…" only cold; a slow submit lands exactly one flag. Poor-signal minute-plus ceiling NEEDS-SKY-DEVICE.

#### S10 — Confirm the submit: a visible + live success banner on the CONTRIBUTE finish line · Meaningful (M) · rank 13
> **⟢ RECONCILED (FIX):** deliver via a **PERSISTENT-MOUNTED `aria-live` region**, NOT the conditionally-unmounting FlashBanner (which mounts into the DOM with text already present — the case SRs frequently fail to announce). Mirror the always-mounted severity-echo-line pattern (TEXT MUTATION, not node insertion). **Mount the live region on the web/guest path** — only `SignedInArea` mounts FlashBanner today, so S10's declared audience (anon-web) never sees it; lift it above the session branch. If the optional "center map on new pin" is taken, gate the camera move on reduced-motion.
- **Resolves:** L3-5 / L6-03 (HIGH, silent success on all four platform cells).
- **(1) WHAT.** The CONTRIBUTE flow ends with the sheet simply closing (web-anon silent, web-auth silent, native-anon haptic-only, native-auth SR-hears-only). The only `notify()` is the *failure* branch; `announceForAccessibility('Report filed.')` is a web no-op; `onCreated` merely refreshes and lands the user on the stale Nearby list. **Fix (SR-safe):** a **visible** success confirmation ("Report filed — thanks for flagging this barrier") that is *also* a **persistent-mounted `role=alert`/`aria-live`** (the wrapper stays mounted, empty when idle, so the SR observes a text mutation). Mount it **above the session branch** so the anonymous cohort actually gets it. Optionally center the map on the new pin — RM-gated.
- **(2) WHY.** HIGH — the finish line confirms nothing. The emotional close of "I helped" is what brings contributors back. Reuse the app's own flash idiom, refactored to the persistent-mount mechanism.
- **(3) PERSONA IMPACT.** R2 (blind, web): the first time the anonymous cohort's SR gets any signal the submit succeeded. R6: the black-box submit gets a visible, honest close. R4: the confirmation prevents the doubt-resubmit the rate limit would punish.
- **(4) TRUST + COHESION.** Closes the loop on the app's central action; the submit joins the FlashBanner idiom (on the persistent-mount mechanism).
- **(5) A11Y.** WCAG 4.1.3 via a *rendered, always-mounted* live region — explicitly NOT `announceForAccessibility` and NOT a mount-with-text node. Announce decoupled from motion; optional camera-center RM-gated. No color change.
- **(6) DEPENDENCIES.** Preserves PROTECT-7/8/3. The finish line of the flow **S5** unblocks — ship after or with S5. Must stand alone on the persistent-mount mechanism (do not depend on S9). Coordinate `MapScreen.tsx` (`onCreated`) + `App.tsx`/FlashBanner (lift above the session branch).
- **(7) VERIFICATION.** No arbiter. Manual (web): submit anon on the guest path → a visible banner appears AND a screen reader hears it (persistent live region whose text mutates). DOM: the `aria-live` wrapper is present (empty) before submit, gains text on submit, is mounted in the guest branch. RM: the optional camera-center is skipped/instant under RM. On-device VoiceOver timing NEEDS-SKY-DEVICE.

#### S16 — Fix the two worst map touch targets: the bare-text "Clear" and the invisible action-bar overflow · Meaningful (M) · rank 17
- **Resolves:** L5-04 (HIGH, ~34×17pt "Clear"), L5-05 (HIGH, action-bar tools scroll out of reach).
- **(1) WHAT.** Two named offenders on the core FIND surface. **(a)** "Clear all filters" is the app's only bare-text `Pressable` (~34×17pt), adjacent to the 48pt collapse chevron — and it is the *recovery* action for "my filters hid everything" (R1's most-praised flow), so a miss *collapses the panel* instead. Fix: give it the same `minHeight:44` + `hitSlop` the sibling `filterTitleRow` got. **(b)** the 7-button action bar is a horizontal `ScrollView` with no indicator; below content width (iPad Split View ~320pt, true 320pt, web zoom) the LAST buttons — Refresh and **Recenter** — silently vanish. Recenter is the documented CONTRIBUTE entry for locationless users. Fix: add a visible overflow affordance (fade/gradient edge or "more" indicator) and/or a half-button peek.
- **(2) WHY.** Both HIGH. The FIND surface's recovery and the documented CONTRIBUTE entry must stay reachable. The fix is already patterned — the sibling `filterTitleRow` got exactly this treatment; "Clear"'s omission is a genuine oversight.
- **(3) PERSONA IMPACT.** R4: both become 44pt/discoverable. R3 (DT/zoom stress): the overflow becomes visible instead of eating Recenter. R1: the "my filters hid everything" recovery stays escapable.
- **(4) TRUST + COHESION.** Hardens the two worst targets on the flagship surface; "Clear" joins the sibling's correct pattern.
- **(5) A11Y.** WCAG 2.5.5 (target size) + 1.4.10/1.3.1 (the overflow affordance makes hidden controls discoverable). No color change.
- **(6) DEPENDENCIES.** Preserves PROTECT-2 ("Clear"'s fix must not regress the redundant "Reset all") + the 44×44 button geometry + the virtualization law. Coordinate `MapScreen.tsx` filter panel + action bar with S1/S3/S4/S6.
- **(7) VERIFICATION.** No arbiter. Manual: "Clear" ≥44pt (inspector); at DT 1.3×/2.0× and ~320pt the action bar shows a discoverability affordance and Recenter is reachable. Split View / true-320pt NEEDS-SKY-DEVICE.

#### S17 — Contain the Home map peek: one clean button, no tap-theft, no app-exit · QuickWin (S) · rank 18
- **Resolves:** L5-06 (HIGH — live map inside the "Open the full map" button steals taps/scroll and can exit the app) · L4-06 (motion facet).
- **(1) WHAT.** Home's map peek is announced as ONE button but its interior is a *live* map with three conflicting behaviors. The probe was decisive: a wheel/scroll over the peek zoomed the *preview* instead of scrolling the page; and on web the peek embeds Leaflet's zoom buttons *and* attribution anchors — so "Leaflet / OpenStreetMap / CARTO" are **live links that navigate the browser away from the app.** For a tremor user, exiting the app from a mis-tap inside a *button* is the most disorienting failure available. **Fix:** wrap the peek's `<PlatformMap>` in a `pointerEvents="none"` layer so the tile region is inert and only the parent Pressable receives the tap; on the web peek, also `zoomControl={false}` and relocate/suppress the attribution (the *full* map keeps its legally-required attribution — this is only the decorative peek).
- **(2) WHY.** HIGH. The landing surface must not exit the app on a mis-tap. A few lines that remove an entire class of the most disorienting failure from the first screen. Also removes the L4-06 motion facet.
- **(3) PERSONA IMPACT.** R4 (tremor): the peek becomes inert and only the parent button fires. R2: the peek is announced as one button and now *behaves* as one. R6: the tap-to-open contract becomes reliable.
- **(4) TRUST + COHESION.** Removes the most disorienting failure from the first screen; the peek becomes strictly non-interactive (the safe direction), matching its "one button" announcement.
- **(5) A11Y.** The peek's announced role finally matches its behavior (WCAG 4.1.2 / 2.5.1 — no hidden interior gestures). No color change; the full Map's attribution/gesture behavior untouched.
- **(6) DEPENDENCIES.** Preserves PROTECT-10 (Home's honesty law — the peek still shows the map, it just stops stealing gestures) + the full Map's behavior + `GlassSurface.tsx`. Coordinate with S7 (peek inherits the light tile) and S12 (both touch `PlatformMap.web.tsx` config).
- **(7) VERIFICATION.** No arbiter. Manual (web): wheel/scroll over the peek scrolls the page; tapping opens the full map; no Leaflet zoom buttons or live attribution links inside it. Native tap-to-open + drag behavior NEEDS-SKY-DEVICE.

---

### Sky-decision taste / scope forks (from `slate-integration.md` §2)

Each is a crisp **either/or** only Sky can settle — the UI proposals scope only their own half. Framed, never prescribed.

- **Fork 1 — Proximity architecture** *(behind S4 · L3-2, L7-03).* Every flag fetch is a global most-recent page (no `lat/lng` predicate, no `onRegionChange` re-scope). **(A)** build the geo query (`ST_DWithin` + region-change re-fetch, keep "nearby") — a data-layer feature, Sky-applied; the FIND promise becomes literally true. **(B)** stop claiming "nearby" (S4's UI-only honesty) and defer the query — zero backend risk now. *At real scale, pin-absence reads as barrier-absence — the mission's dangerous failure mode.* S4 ships (B)'s UI half regardless.
- **Fork 2 — Points-economy honesty** *(behind bench B1 · L3-4).* The actor-bonus trigger is SQL-NULL for anon flags → 0 awarded while the UI flashes "+3/+7." **(A)** fix the trigger (one-line `IS DISTINCT FROM` DB migration, Sky-applied, never auto-run) + correct the CLAUDE.md doc drift (still teaches 5/2/10/5 vs the live 10/3/15/7). **(B)** suppress the UI flash when `item.user_id === null` (no migration). *Either way, resolve the CLAUDE.md doc drift.*
- **Fork 3 — Auth-wall & guest contract** *(behind S5 · L3-1; S15/S19; L8-4/L1-2).* Three silently-different guest cliffs + docs that contradict the gates + RLS-refused triage buttons with a fabricated error. **(A)** web openly requests location + exposes a real sign-in path; document the contract; hide the RLS-refused buttons from guests. **(B)** keep web deliberately minimal (view+report only). *A product question, not a UI fix — S5/S15/S19 all follow from it.*
- **Fork 4 — K-anonymity / cache-scope** *(behind bench B9 · L7-02).* The `k≥3` heat protection + user-scoped offline cache are sound. **(A)** ratify guests-get-no-offline-resilience as a conscious privacy choice. **(B)** extend a scoped/anonymized offline cache to guests. *Independently: the "saved data" banner never states data AGE (B9's UI half) — shippable under either branch.*
- **Fork 5 — Trust-model scope** *(behind S3 · L8-2, L8-3).* "Verified" is never defined/counted at a decision point; untrusted content wears full confidence with no counter-affordance. **(A)** expose the ledger fully — S3's receipt + a verifier COUNT on the callout + guests can flag-content-as-wrong. **(B)** expose the receipt only (status history, no raw count, no guest write). *S3 scopes only the read side (B by default); the count + guest-write side are this fork.*
- **Fork 6 — Product-name collision** *(behind L8-18).* "AccessMap" collides with accessmap.io (UW Taskar Center) in the same niche. **(A)** rename/differentiate. **(B)** keep the name. *A brand-strategy call outside this audit's scope.*
- **Fork 7 — `stagePoolB` keep/kill** *(parked ② · `theme.ts:202`).* Sub-perceptual at 390. **(A)** keep (serves restraint). **(B)** kill (imperceptible either way). *A judgment offered, not a finding.*
- **Fork 8 — Dark saved-place-chips** *(parked ③).* Auth-gated (guests never see it); shipped always-light chips are AA-by-construction. **(A)** keep the ratified always-light chips. **(B)** build the deferred dark-over-dark-tiles variant (its "over LIGHT Apple tiles" read is device-only). *No audit evidence forces the decision.* NEEDS-SKY-DEVICE.
- **Fork 9 — `ui/Button` adopt-or-remove** *(parked ⑤).* Zero `<Button` call sites app-wide. **(A)** adopt it per the lab's recommendation. **(B)** delete it + the barrel export. *Not a defect — a standing housekeeping decision.*

### Consolidated NEEDS-SKY-DEVICE list (from `slate-integration.md` §3)

**The gate — D0: the ONE EAS TestFlight build.** Every glass wave + this audit converge here. The command is Sky's: `cd ~/AccessMap && npx eas-cli build --platform ios --profile testflight --non-interactive`. **Sky's build, Sky's merge — never auto-run.** Everything below is what that one build lets Sky settle.

- **D1 — L6-04 Tasks-card-action flattening (S13)** — *the single highest-stakes check.* Are Verify/Resolve/Reject/Details independently focusable from a Tasks card, or does the `accessible` parent collapse them to one leaf? Confirms the trust engine is not sighted-only.
- **D2 — L6-19 SignIn `accessibilityViewIsModal` (S9)** — does the lone SignIn modal root now contain VoiceOver focus?
- **D3 — Native VoiceOver truth broadly (S9)** — the ~30 state sites, the announce dual-wiring, the legend backdrop sibling (L6-21), every RN-web-artifact caveat R2 raised — confirm the native leg is unregressed.
- **D4 — EXIF-strip GPS removal (parked ④)** — the audit CODE-CONFIRMS the strip-by-re-encode exists but cannot verify on-device GPS removal (auth-only photo path, inside the never-signed-in fence). Confirm a real photo's GPS is gone after upload.
- **D5 — L4 native reduce-motion (S12 + native camera baseline)** — the *felt* result: instant cut vs swooping arc on the FIND payoff. Correctness is probe-proven; the feel is device.
- **D6 — Reduce Transparency posture** — the glass surfaces' C-lite fallback under iOS Reduce Transparency.
- **D7 — Real Dynamic Type** — the native per-variant DT caps (~1.5–1.6): does the header collide at the capped size (S18 ③)? do the on-glass ≥500-weight deferrals read as haze (D9)?
- **D8 — iOS light Apple-tile pin/ring visuals (S1 anon ring · S14 pin hairline · L6-07/L8-7)** — the arbiter gates contrast in-harness, but the on-device Apple-light-tile visual (do low-severity pins stay visible? does the anon ring read? does the `#0F1B2D` hairline hold?) is device-only. (Also the deferred dark-chips-over-light-Apple-tiles read, Fork 8.)
- **D9 — `bodyMedium` ≥500-weight-on-glass haze (parked ⑥)** — every ink passes the arbiter; this is the GLASS §2 material-haze *feel*. The disclosed Map deferral + the undisclosed Tasks `emptyBody` sibling. B11 carries the mechanical bump; the feel is device.
- **D10 — L2-6 true-blur feel (bench B6)** — do the high-contrast backdrop shapes ghost through About/Feedback body text over busy backdrops? Every ink passes the arbiter. Any floor change MUST re-run `contrast-check.mjs`.
- **D11 — Real-tile / runtime states on device** — S6 iOS single-pointer zoom-out + pinch/VoiceOver; S16 Split View / true-320pt (does the overflow eat Recenter?); S17 react-native-maps tap-swallow; S10 on-device VoiceOver announcement timing; S11 poor-signal minute-plus ceiling; S3 native focus traversal into `FlagDetailModal`; S4 native first-run deny→arrival feel.

*One-line summary: D1 (Tasks-card flattening) is the highest-stakes single check; D4 (EXIF GPS) is the privacy gate; D8 (iOS light tiles) is the map's visual regime; D5–D7/D9–D10 are the felt truths the harness cannot render; D11 folds every per-proposal runtime-state device leg. All wait on D0.*

### Runner-up bench (ranked, best first — for backfill; 0 promoted, no floor breached)

1. **B1 — Points flash lies on anon triage (L3-4, HIGH).** The highest-value bench entry. FORKS-TO-SKY #2 — the real fix is a one-line migration (`IS DISTINCT FROM`, Sky-applied); the UI half is a clean **S** flash-suppression. Benched as a data-honesty fork, not for weakness; promote if Sky prefers the UI suppression.
2. **B2 — Retire the seven UI emoji for Lucide (L2-9, MED).** DESIGN.md §10 violated at 7 sites; the W1 pass restyled the chips but kept the emoji on the new material. Clean **S** law-restoring swap.
3. **B3 — Wear the Wayfinder mark (L8-8, MED).** Retire the three stock intro glyphs (compass, MapPin, "A" tile) for the on-mission mark. Pure asset-swap **S**; supports the S1/S8 signature system.
4. **B4 — Unify the modal layer on one material (L2-5, MED).** Extend the bulk-glass recipe to the opaque host siblings + guest-critical Map sheets. **M**; every newly-glassed sheet arbiter-checks its inks.
5. **B5 — Motion hygiene sweep + RM regression test (L4-05/07/08/10/11/12).** Gate the dead 220ms/350ms RM delays, tokenize the literals, and add the RM guard tests that would have caught the falsy-zero trap. **M**; the RM-test leg pairs with S12.
6. **B6 — Light bulk-sheet ghosting decision (L2-6, device-gated).** Raise the light bulk floor a step OR scrim the backdrop — **NEEDS-SKY-DEVICE**; any floor change MUST re-run `contrast-check.mjs`. **S–M.**
7. **B7 — Heat-map "no zones in view" companion + iOS cluster-spring gate (L7-11 + L4-03 + L4-02-native).** Close the on/empty/broken ambiguity + gate the un-gated iOS spring. **S–M**, iOS amplitude NEEDS-SKY-DEVICE.
8. **B8 — Photo pipeline: resize on ingest (L7-05).** Add a `resize` to the `manipulateAsync` that already strips EXIF (the GPS strip is preserved). **S**, pure client-side.
9. **B9 — Data-age on the offline banner + Home refresh-failure surfacing (L7-02).** Read `cachedAt` and state it. **S.** FORKS-TO-SKY #4 (guest-cache-scope is a privacy ratification).
10. **B10 — Web locate-failure gets a visible/spoken outcome (L7-07).** Replace the web no-op `Alert.alert` with a persistent `role=alert` + retry. **S**, distinct from S4.
11. **B11 — Resurrection-trap + ctaFill + ≥500-weight hygiene sweep (L2-12/L2-13/L2-10).** Delete seven dead styles, adopt `ctaFill` at the two white-on-brand stragglers, bump the 400-weight on-glass text to ≥500. **S**; ≥500 leg NEEDS-SKY-DEVICE for the haze *feel*.

### Parked-reconciliation (6 rows — where each lands)

| # | Parked item | Disposition |
|---|---|---|
| ① | RecentlyViewedRow severity-dot white-digit | **→ S2 (in-scope).** Site 5 of the seven white-digit sites; resolved by the `textOnColor` adoption. Auth-gated. |
| ② | Stage `stagePoolB` | **Sky-fork (PARK — taste, Fork 7).** Sub-perceptual; a judgment offered, not a slate entry. |
| ③ | Dark saved-place-chips | **PARK-hold (Fork 8).** Auth-gated; no audit evidence forces the decision; NEEDS-SKY-DEVICE. |
| ④ | EXIF-strip + VoiceOver checks | **PARK → NEEDS-SKY-DEVICE.** S13 codes the L6-04 fix; the confirmation is the device pass (D1/D4). |
| ⑤ | `ui/Button` adopt-or-remove | **CONFIRM (standing Sky call, Fork 9).** Zero call sites; a one-line decision, not a slate proposal. |
| ⑥ | Map wave's `bodyMedium` ≥500-on-glass | **PARK-hold.** Material-haze law, not a contrast breach; B11 carries the mechanical half; the *feel* is NEEDS-SKY-DEVICE (D9). |

*No parked row changed disposition in v2 — the skeptic pass produced no KILL and touched no parked item.*

---

## 6. Copy-observations appendix

*A rail, not a rewrite — copy-level observations gathered by each lens (from `02_findings.md` §Copy-observations index). Grouped by lens; the slate's copy proposals (S1, S4, S15, S20) draw from here.*

**L1.** One thing, four names in the first minute: "barrier" → "flags" → "reports" → "Tasks"; slide 3's "Show flags near you" introduces the term with zero definition (R6's #3 friction). · Two different location-privacy contracts (onboarding "never tracked or stored on our servers" vs sign-in "only used when you place a flag"); one canonical sentence would be stronger and truer. · "Open the Map" never opens the map (→ Home/sign-in; replay → Settings). · SignIn guest note "need an account to report" contradicts the shipped anonymous flow. · "1 / 5" announces as "one slash five" (the replay modal uses the better "Step N of M"). · "Next. Card 1 of 5." labels the current card, not the destination. · Stale comment: `MapScreen.tsx:1041` says the first-time prompt is deferred to card 4 — it's card 3.

**L2.** Raw status enum leaks on Home: rows print `item.f.status` lowercase ("Minor · open") while every pill uses `STATUS_LABELS` (R6 read "open" as business hours). · Casing drift: "How To Help" vs "About the App" vs "Resources"; "What's New" (modal) vs "What's new" (Settings row). · Date grammar mix in Nearby: "29d ago" vs "Jun 2, 2026" in one list. · Tab badge reads 2 on Home/Profile/Map but 5 on Tasks (R6/R2/R5 all tripped). · "1+" toolbar glyph is opaque pre-Legend to every fresh reader. · "Made with ♥ in Canada" — a unicode heart inside prose reads as voice, not iconography (leave it alone).

**L3.** One thing, four names — pick "barrier" for people, keep "flag" as the verb. · "Nearby" is doing unpaid work: `N flags nearby` and "Sorted by distance" are global-count/global-order claims; say "N reports loaded" / "Showing most recent first." · "Open" reads as open-for-business on first contact. · The denied banner points the wrong way ("to report barriers near you" while the blocked job is FINDING; "device Settings" is wrong on web). · "Never tracked or stored on our servers" sits one sentence from "place your reports accurately" — the adjacency invites a false generalization; suggest "Your reports store only the pin you place." · The map has two names before you reach it ("Open the Map" then "Open full map"). · Rate-limit copy has two sources (lib string always re-skinned by the modal). · The disabled FAB explains itself only to screen readers (good copy sighted users never see). · Callout severity speaks numbers only while Home speaks words — the decoder lives everywhere except where map users decide.

**L4.** `accessibility.ts:95` "Web/unsupported platforms quietly resolve to `false`" is factually wrong for this RN-web version and actively dangerous (seeds L4-01). · `PlatformMap.web.tsx:625` "Instant jump when Reduce Motion is on" describes intent, not behavior; name the falsy-zero trap when fixed. · `DESIGN.md:279` "the bottom-sheet slide and drawer are the only longer moves" is stale (map camera 600ms + tier fill 600ms are longer). · `01_render-index.md:371–378` rm rows' "test-inferred" tag overstates — no reduced-motion test exists.

**L5.** "Report anonymously" as a button label is 19 characters doing the work of 6 — the direct driver of the zoom-2.0 pill overflow; "Submit report" would buy ~40% width headroom (→ S18). · The status pill keeps asserting "5 flags nearby" in permission-denied and stale-region states — make the copy state-aware (→ S4). · Sort labels "Newest / Oldest / Severity" truncate to single letters at high zoom; one-word labels that stay distinct at 4 chars would keep the control legible.

**L7.** "N flags nearby" — "nearby" is false-by-construction (the query is a global page; the pill keeps the claim over the SF fallback). The most load-bearing dishonest word in the app. · "Showing saved data — connect for the latest." — good voice; missing the one fact that changes decisions: **age** ("saved 2 h ago"); `cachedAt` already exists. · "Loading flags…" replaces the count during *every* refresh — reserve it for first load, use "Updating…" over data. · "Finding your location…" has no failure-side twin on web (L7-07). · The denied banner copy is exactly right; it just never fires on arrival. · Heat disclaimer is honest about the rule, silent about the outcome; needs a "No zones qualify in view yet" companion. · Error terminal copy is a strength ("Couldn't load reports." + Try again; "Couldn't refresh — pull down to update.").

**L8.** Keep verbatim: "Impassable. Needs a detour." · "Reporting anonymously — your identity is not stored." · "Your anonymous report still counts. Sign in to add a photo and help verifiers act faster." (the template for selling auth everywhere else) · "To protect reporters, heat zones only appear where at least 3 flags have been submitted." · "Flagging a barrier is the first step. These resources help get it fixed…". · The two heat-map caveats are complementary, not duplicated (map toast = data quality; legend = privacy) — but only heatmap users see either; the coverage line deserves a home on the default map (L8-10). · Define "verified" in the legend in one line — the FAQ already wrote it. · Noun canon needed (L8-11): pick *barrier* (human) + *flag* (system); also "open" → "unconfirmed"/"reported". · Submit-moment sentence missing (L8-14). · Fix the Help FAQ ("Map tab" → real navigation; magnifier → sliders; "+ Report" needs the guest path; "different color" for resolved → "a checkmark"). · Stale changelog (L8-13); align "What's New"/"What's new". · Casing sweep. · Onboarding slide 2 is doing the trust-system's best teaching ("Other people verify your report…") — echo it at verify (Tasks) and at submit.

---

## 7. Honest coverage statement

**What was rendered vs inferred vs device-only.** This audit ran on **expo-web in Chromium** (dev-mode Metro, `__DEV__` true, DPR 2). That surface is the app's *actual* guest experience (web IS guest mode), so the web findings are first-class — but three constraints bound what the harness can see:

- **Web tiles are CartoDB `dark_all` always.** So "pins over light tiles," the heat legend over light tiles, the locating banner over light tiles, and the anon-ring visual were **never captured** — they are code-inferred + arbiter-measured and carried as **NEEDS-SKY-DEVICE (D8)**. The iOS Apple-light-tile regime that follows the OS is the map's device-only visual regime.
- **RN-web resolves `isScreenReaderEnabled` true for every web user.** So the SR auto-open fires on every web arrival (app truth, not artifact), and the ~30 selection-state / ~50 announce sites were verified by **code + DOM read**, not by a live VoiceOver session. The whole native VoiceOver truth — most importantly the **L6-04 Tasks-card flattening (D1)**, SignIn containment (D2), and the legend backdrop (D3) — is device-only.
- **True blur, scroll smoothness, haptics, real Dynamic Type, and Reduce Transparency do not exist in Chromium.** So the light bulk-sheet ghosting (L2-6 / D10), the ≥500-weight-on-glass haze (D9), the reduce-transparency C-lite fallback (D6), the native per-variant DT caps (D7), and the *felt* reduce-motion result (L4-01 correctness is probe-proven; the feel is D5) are all **device-only**.

**Code-/probe-only findings** (the annotated PNG shows the *surface*, not the defect): L4-01, L4-02 (RM probe traces are the evidence), L6-01, L6-02, L6-04, L7-01, L7-02, L7-03, L3-4 (SQL trigger), L8-4a (RLS refusal proven from the policy set, not a live mutation). For these, the primary evidence is the cited code refs + banked probe traces in `partials/verdicts.md` + `01_render-index.md`.

**Unreached states (audit rail — mutation-adjacent and auth-gated paths fenced).** Post-submit states were never triggered — every post-submit judgment (L3-5, L3-16, S10) is code-inferred and tagged. The **signed-in Profile branch** and the **admin surfaces** were not rendered (web guest = the signed-out Profile branch; Admin is `is_admin`-gated and guest-unreachable) — so the double-header (L2-2), the auth-only severity-digit sites (L2-1 sites 4–6), and the tier-fill motion (L4-07) are code-inferred/auth-gated, confirmable only via an authed session or a composited lab mockup. Guest-triage taps (L8-4a) were **never executed** — the RLS refusal is proven from the policy set. EXIF GPS removal (D4) is inside the never-signed-in photo fence.

**Where the audit is thinner than it should be.** (1) The **native platform** is judged largely from code + the installed library sources (`react-native-maps`, `react-native-map-clustering`, `leaflet`) — every native-feel claim carries a NEEDS-SKY-DEVICE flag, and the whole slate converges on **the one TestFlight build (D0)** to settle them. (2) **Tablet (834pt)** is honest but shallow — captured, verified current (L8-22), but the full layout treatment is deferred to a size/layout pass. (3) The **iPad multitasking posture** (Split View ~320pt panes, where the action-bar overflow silently engages — L5-05 / S16) is undecided and unaudited on device. (4) The **product-name collision** (L8-18) and the **model knowledge** behind the meta-calibration table are `text-inferred` (no web access) — verify before acting. (5) Two probe requests were resolved with real deterministic captures (the locating-hang stub, the RM-flight/cluster traces); the balance of the native runtime-state legs (D11) remain code-inferred pending the device pass.

**What the audit did NOT do (by design).** No app code was edited, no build or EAS run, no database touched, no external send, no git operation. The build remains Sky's, as does every merge (Sky-note 7). This document is advisory input to Sky's sequencing decision; the phase plan follows the ranked slate, never the reverse.

---

*Assembled 2026-07-04 from the frozen Part-1/Part-2 partials under `design-reviews/fable-audit/`. Ranking is read-only; the order is advisory input to Sky's sequencing decision. Model provenance: Parts 1–2 on Fable 5 (33 of 36 skeptic verifications on Opus 4.8 after Sky's direct model switch at Fable credit-exhaustion); Part 3 synthesis on Opus 4.8 at Sky's explicit direction — disclosed, not silent.*
