# SHIP-READY Phase 1 — 02 · UI + A11y, Reviewer-Eyes (Lens 2)

Banked incrementally. Evidence tags per 00 §2 (Dynamic Type / VoiceOver truth / native modal presentation are code-inferred + NEEDS-SKY-DEVICE by law; web proves presence and web-layout only). Verdicts: FINISHED (zero open device rows) vs FINISHED-pending-device.

---

## §T · Tablet / iPad pass (parent, 1024×1366 on the static export — web-approximated)

**Why this section exists:** `supportsTablet: true` means Apple reviews AccessMap on iPad. Nothing in R1/R2/device-tune ever looked at a tablet width, so this is a genuinely fresh surface (not a re-find).

| # | Observation | Tier | Evidence |
|---|---|---|---|
| T-1 | **Phone layout stretched, no max-width container.** At 1024pt: Home's list rows, search field and section headers span the full 1024pt with content hugging the left edge; ~45% of the viewport below the 6 recent rows is empty. Tasks rows and the Nearby sheet are likewise full-bleed. Reads as an iPhone app blown up — the exact impression an iPad reviewer forms in seconds. | MED (HIGH if iPad stays in scope) | web-approximated (1024×1366 capture, both fresh-load and resize) |
| T-2 | **NearbyFlagsModal is full-bleed at tablet width** — no sheet inset/centering; on iPad `pageSheet` would inset natively, so the native result differs from web. Native truth = NEEDS-SKY-DEVICE. | MED | web-approximated + NEEDS-SKY-DEVICE |
| T-3 | Map controls stay phone-anchored at tablet width (chips top-left, zoom bottom-right, List pill) with a very large empty middle. Functional, unrefined. | LOW | web-approximated |
| T-4 | Tab bar spans full 1024pt with three items spread far apart. | LOW | web-approximated |

**Bearing on SR-012 / §A-7:** T-1…T-4 are all *layout-polish* debt, not defects — which is the argument for the cheap ship path (`supportsTablet:false` for v1, iPhone-only distribution; the app still runs on iPad in compatibility mode) over the expensive one (design an iPad layout AND resolve ITMS-90474 AND take on the iPadOS-26 windowing migration). SKY DECISION; recorded here so the choice is made with the visual evidence in hand.

### §T CHECKS-PASSED (things I expected to be broken and measured instead)
- **Map tile coverage at tablet width: CORRECT.** Measured the Home preview's Leaflet container (990pt) against loaded tile extents (−88pt → 1192pt) on both a fresh 1024pt load and after a live resize: fully covered, 5/5 tiles complete. An earlier screenshot appeared to show a grey right-hand band; measurement disproved it. **No finding filed** (recorded because a story would have been easy here).
- All three tabs + Map + GuestProfile render at tablet width with **zero console errors**, light and dark.
- Severity grammar, honesty banner ("Location is off, so the map shows the most recent flags…"), and heat/list affordances survive the width change intact (PROTECT unregressed at this width).

### §T harness artifact (NOT a finding — recorded so nobody files it later)
Direct URL entry to a deep route (e.g. `/Home`) 404s on the audit's `python3 -m http.server`, because that server has no SPA rewrite. Production has one (`vercel.json` rewrites all paths to `/index.html`). In-app navigation works normally. Any walker report of "deep route 404" against this harness is invalid.

---

## §D · Dynamic Type, VoiceOver, RM/RT, contrast (cross-cutting, code-trace) — verdict **FINISHED-pending-device**

All rows code-inferred; Dynamic Type and VoiceOver truth are NEEDS-SKY-DEVICE by law (00 §2). Jest baseline cited, not re-run.

### D-1 · Dynamic Type — **the app has a real, centralized policy** (this is a positive result)
`AppText` (`ui/AppText.tsx:100-139`) is the shared primitive with a per-variant cap table (`:62-71`): display 1.3 · heading 1.5 · **body/bodyMedium uncapped by law** · label 1.6. `allowFontScaling={false}` appears **zero** times in non-test `src/` — the only suppression app-wide is `tabBarAllowFontScaling:false` (`RootNavigator.tsx:319`), structurally forced by the hard `height: 68` bar and justified in-code. The static guard `src/__tests__/dynamicTypeGuard.test.ts` enforces 6 rules and its **ALLOW_LIST is empty** — every historical exemption was drained by fixing, not silencing.
**Policy gap (what the guard cannot see):** it is a source scan, not a renderer — it never measures overflow at 1.5×/2×/3×; **no rule asserts that a cap exists**, so a new surface omitting `maxFontSizeMultiplier` passes; it cannot see `minHeight` boxes whose contents outgrow them; it does not check `adjustsFontSizeToFit`+`minimumFontScale` pairing; and it is blind to the tab-bar config decision.
**Fixed-height sweep (notable clean result):** all ~76 hard `height:` values in non-test `src/` were classified by reading their style blocks — **every one is a decorative or icon box** except the tab bar and the Report severity buttons. No text row carries a hard height, which is *why* the guard passes non-vacuously.

### D-2 · VoiceOver semantics — **220 interactive sites, 0 have a role without a label, 1 genuine offender**
Per-surface grades: Tasks **A** (richest announce coverage in the app, 11 sites) · Map **A−** · Nearby **A** (PROTECT-1 one-breath row label intact) · Report **A** · Profile **A** · Home **A−** · FlagDetail **A** · Drawer **A** · SignIn/Guest **A** · Onboarding **A** · Tab bar **A** · Legend **B+** · Settings **B**.
**The Tasks 4-actions-per-card question, answered:** properly grouped, not fragmented — the card Pressable sets `accessible={false}` deliberately with a 9-line justification, exposing a labeled summary node *plus* each action independently (`TasksScreen.tsx:1729-1799`). Correct RN pattern, PROTECT-compliant, and it also removes web nested-`<button>` invalidity.
**53 live-announce sites** cover status change, filter apply, locate transitions, empty-filters, bulk actions, selection mode, scope change, comments, glass-mode, store errors, onboarding position — all routed to web through the `announce.ts` shim.

### D-3 · RM/RT contract — **VERIFIED UNREGRESSED at `512494a`, all 6 RM layers + all 5 RT consumers**
| Layer | State | Guard |
|---|---|---|
| 1 · Modal `animationType` | every site RM-gated (drawer's `"none"` is the designed exception; the null-stub has none) | `reduceMotion.modalGate.test.ts` is a **tree walk, not a list** — a newly added Modal cannot escape it |
| 2 · Primitives | Skeleton static, Button/PressableScale springs gated; **press-dim fill-swap survives RM by construction** | `reduceMotion.primitives.test.tsx` ×4 |
| 3 · Drawer | RM snap sets the latch false **same-tick, zero timers**; single latch-release point | `reduceMotion.drawer.test.tsx` proves zero timers in both modes |
| 4 · Map camera | native `duration:0` jump · web `{animate:false}` (never numeric 0) · cluster gated | 3 files, incl. an explicit "no camera path ever passes duration: 0" assertion (the web falsy-zero trap) |
| 5 · Banners | announce effect **separate** from the motion effect; RM path uses `setValue` | impl verified; **FlashBanner has no dedicated test** → SR-082 |
| 6 · Web pre-JS | `public/index.html:138` verbatim as specified | static |
**RT:** GlassSurface owns RT centrally; only **two raw `BlurView` sites exist app-wide** and both are RT-gated. Every other glass surface routes through GlassSurface. One gap found → SR-073.

### D-4 · Contrast (75 token pairs + 7 map-stack pairs, computed) — **68/75 pass; all 7 flags are worst-case composites that pass on the designed stage**
Independent reproduction of the shipped arbitration (a genuine drift tripwire result): **severity ink-on-color 1→5 = 11.03 / 8.05 / 6.21 / 4.79 / 4.83 — all pass**, matching `theme.ts:555-559` exactly (**PROTECT severity grammar UNREGRESSED**); tab inactive **4.65** on the 0.82 glass floor and **5.92** on the RT surface, matching `theme.ts:189` to 2 d.p. (T15 arbitration reproduced); `white on ctaFill` **5.24**, exact match to `theme.ts:249` (**PROTECT contrast system UNREGRESSED**).
The 7 sub-floor pairs are muted inks on the row-glass tier over a pure-black/white extremum; each passes on its designed stage (e.g. light `textMuted` 2.72 worst-case → **5.44** on stage). **The one place the extremum is genuinely reachable is the map filter panel over live dark tiles**: body ink clears at 7.67 but `textMuted`/`inkDetailsGhost` sit at 3.18–4.25 → ROUTED to Phase 2 as "verify with the arbiter." **No token change proposed** (GlassSurface is DO-NOT-EDIT; the arbiter law owns that space).

### Findings

| SR | Tier | Evidence | Where | What |
|---|---|---|---|---|
| **SR-072** | MED | code-inferred | `LegendModal.tsx:49-56` | The card-shell tap-swallower `<Pressable onPress={()=>{}}>` has no role, no label, and no a11y opt-out — **the app's only unlabeled interactive element**. Its sibling backdrop (`:42-48`) *is* correctly `aria-hidden`. On web it becomes a focusable unlabeled `div` wrapping the whole dialog. |
| **SR-073** | MED | code-inferred | `SignInScreen.tsx:306`, `OnboardingCards.tsx:671` | Two raw CSS `backdropFilter: blur()` sites bypass GlassSurface and are **not** gated on `useReduceTransparency` — unlike `HamburgerDrawer.tsx:501-502`, which is. Web-cohort only today, but a live RT-bypass if the signal ever lands. |
| **SR-074** | MED | code-inferred + NEEDS-SKY-DEVICE | app-wide (0 occurrences) | `accessibilityActions`/`onAccessibilityAction` are used **nowhere**. Multi-action rows (Tasks cards, 4 buttons each) are correctly grouped but cost a VoiceOver user ~5 swipes per row; the rotor custom-actions menu — iOS's native answer to exactly this shape — is unadopted. |
| **SR-075** | MED | code-inferred + NEEDS-SKY-DEVICE | `ActivityFeedModal.tsx:156`, `LegendModal.tsx:82`, `NearbyFlagsModal.tsx:154` | Three `SeverityDisc` call sites pass no `maxFontSizeMultiplier` (inheriting label's 1.6) while the other four pin 1.3 with justification. The 28pt disc at ActivityFeed is tightest — digit box ≈19pt inside a 28pt circle at 1.6×. |
| **SR-076** | MED | code-inferred | `TasksScreen.tsx:1434,:1459,:1490,:1506` | The four bulk-action labels (Verify/Resolve/Watch/Cancel — terminal trust actions) rely on `adjustsFontSizeToFit`, which **rn-web does not implement** (the codebase documents this at `ScreenHeader.tsx:31-35`), so on web at large type they ellipsize to "Verif…"/"Resolv…". |
| **SR-077** | LOW | code-inferred | `theme.ts:253-256` | The `ctaFillPressed` comment claims 7.5:1; computed **7.00:1**. Passes AA comfortably either way — a stale documented figure in a file whose comments are treated as arbitrated record. |
| **SR-078** | LOW | code-inferred + NEEDS-SKY-DEVICE | `RootNavigator.tsx:319` + `:301` | `tabBarAllowFontScaling:false` is the app's only total scaling suppression — structurally justified by the hard bar height and documented, but there is **no middle path** (e.g. a 1.2× ceiling with a taller bar). At 3× system type the tab bar is the one surface that doesn't respond at all. Bears on whether the "Larger Text" nutrition label can be declared (§A-6). |
| **SR-079** | LOW | code-inferred | `SettingsScreen.tsx` (0 announce sites) | Settings carries the app's toggles yet never announces a state change, relying solely on `Switch` + `a11yToggle` traits — defensible, but inconsistent with the app's own established voice (cf. `ProfileScreen.tsx:645` "Real-time flag updates enabled"). |
| **SR-080** | LOW | code-inferred | `PhotoGallery.tsx:97,:201` | Photo alt text is positional only ("Photo 2 of 3") — never descriptive of the barrier. The lightbox does better (`caption ?? 'Flag photo'`). A data-model limit (no caption source for gallery items), not a coding miss. |
| **SR-081** | LOW | code-inferred + NEEDS-SKY-DEVICE | `SeverityBadge.tsx:60-75` | With `showLabel`, the row-direction pill has no `flexShrink`/wrap and `alignSelf:'flex-start'`; at 2× inside a constrained Tasks card header it can push the sibling title out rather than wrapping. The badge itself is correctly padding-sized — the risk is its effect on siblings. |
| **SR-082** | INFO | code-inferred | missing test file | RM layer 5 (banner announce decoupled from motion) is the only one of six with **no dedicated guard test** — `UpdateBanner` and `LiveStatusRegion` have them, `FlashBanner` does not. Implementation correct at HEAD; the invariant is simply unpinned. |

### CHECKS-PASSED (selected — 20 recorded in full in the agent's return)
Zero `allowFontScaling={false}` app-wide · AppText body/bodyMedium remain uncapped (**PROTECT unregressed**) · guard ALLOW_LIST empty · no text row carries a hard height · 220 interactive sites with 0 role-without-label · all 5 a11y opt-outs deliberate and correct · Tasks card grouping PROTECT-compliant · `a11yToggle` adopted in 24 files with **zero** raw `accessibilityState=` bypasses · all Modal animation sites RM-gated with a non-staleable tree-walk guard · RM layers 1–4 and 6 each have a live guard test whose assertions were read · both raw BlurView sites RT-gated · severity + tab-bar + CTA contrast reproduced to the shipped figures · PROTECT-1 Nearby one-breath label intact · web announce shim covers all 53 sites · `ScreenHeader` DT-hardened (2-line wrap, 0.6 shrink floor, scale-aware estimator).

### NEEDS-SKY-DEVICE → maps directly onto the Accessibility Nutrition Label (§A-6)
| Check | Unlocks |
|---|---|
| D-A1 Walk Home→Map→Tasks→Profile→Report at **AX5** max text; photograph anything clipped | **Larger Text** |
| D-A2 Tab bar at AX5 (labels frozen at 12pt by design — does it read as intentional?) | Larger Text |
| D-A3 The three uncapped SeverityDisc sites at AX5 (SR-075) | Larger Text |
| D-A4 `SeverityBadge showLabel` inside a Tasks card header at AX5 (SR-081) | Larger Text |
| D-A5 VoiceOver: traverse ≥5 Tasks cards, count swipes per row (SR-074) | **VoiceOver** |
| D-A6 VoiceOver: Map Legend — does the unlabeled shell take focus on native? (SR-072) | VoiceOver |
| D-A7 VoiceOver: two-finger scrub on any modal — expect failure today (SR-063) | VoiceOver |
| D-A8 VoiceOver rotor: Headings navigation per screen | VoiceOver |
| D-A9 **Reduce Motion + native map pan/zoom — confirm the camera JUMPS** (`duration:0` may read as falsy→default on react-native-maps; the one RM claim jest cannot prove) | **Reduced Motion** |
| D-A10 Reduce Transparency: Tasks glass, tab bar, drawer, Feedback chips go opaque per GLASS.md §6 | **Reduced Transparency** |
| D-A11 Reduce Transparency at Sign-in + Onboarding (SR-073) | Reduced Transparency |
| D-A12 Differentiate-Without-Color: severity reads via number+word everywhere | **Differentiate Without Color** |
| D-A13 VoiceOver: change a status + apply a filter — confirm the announces actually speak (jest proves the call, not the utterance) | VoiceOver |

### ROUTED
~126 bare `accessibilityElementsHidden`/`importantForAccessibility` sites vs only 8 `aria-hidden` → **F-22** (cited, not re-found; `decorativeProps` in `accessibility.ts:14-23` is the ready-made fix pattern, adopted by only 4 files). The 7 worst-case glass composites + 5 map-panel pairs → **Phase 2 "verify with the arbiter."** 0/32 escape → SR-063. Name-this AVM → SR-065. No 44pt automated guard → SR-034 (confirmed absent).

### Open questions
1. Is `LegendModal.tsx:49` intentional (AVM makes it moot on native) or an oversight that forgot web? 2. Should `accessibilityActions` be adopted for Tasks cards — ~5× cheaper VO traversal, but it touches a PROTECT-adjacent deliberate shape (Dani/Sky judgment, not an audit verdict). 3. Should the SeverityDisc 1.3 cap move into the primitive's default rather than being per-call-site? 4. Does `glassMapWash` need re-arbitration for muted inks over dark tiles? (Only the arbiter's real-tile proof-set can settle it.) 5. Does one frozen surface (the tab bar) disqualify an app-wide "Larger Text" nutrition-label claim?

### §D NOT-VERIFIED (honest gaps — cut short by an API error, reported rather than inferred)
1. `ui/Input.tsx` reviewed only at `:95-125` (cap 1.5, label, a11yToggle, placeholder colour, error-as-hint all confirmed); focus-ring vs `a11y.focusRingWidth/Offset` tokens and web label association not checked. 2. No `LegendModal` test file exists (glob confirmed), but the broader test tree wasn't searched for coverage of that shape under another name — SR-072's test-coverage status is unknown. 3. F-22 residue has aggregate counts (126 bare / 8 `aria-hidden` / 4 `decorativeProps` importers) but no complete per-file enumeration — belongs to F-22 anyway. 4. **`adjustsFontSizeToFit` + `minimumFontScale` pairing not fully audited** — `ProfileScreen.tsx:1294` and `:1993` appear to omit the floor (would let native shrink text arbitrarily small); unconfirmed, not filed. 5. Dark-palette comment-vs-computed claims not systematically checked — there may be more stale figures in SR-077's class (e.g. a `textMuted '~6.7:1 on #111'` comment where the surface is now `#1E1E22`).

### §D-closure · Parent closures of the five NOT-VERIFIED items (recovery window, 2026-07-26 — all code-inferred/computed)

1. **Input.tsx — CLOSED, no finding.** Label association PRESENT: the visible label renders via AppText (`ui/Input.tsx:83-85`) and is duplicated into the field as `accessibilityLabel={accessibilityLabel ?? label}` (`:111`) — on web that emits `aria-label`, which covers AT association without `htmlFor`. Focus indication PRESENT: `borderWidth = focused || hasError ? 2 : 1` (`:77`) plus left-icon tint swap to brand (`:102`); the 2px value equals `a11y.focusRingWidth` (`theme.ts:512`) in effect, though the token is not consumed literally — recorded as a token-adoption nit, not a finding (brand `#1466E0` ≈3:1 on white meets 1.4.11 non-text).
2. **LegendModal coverage — CLOSED: no coverage under any other name.** Test-tree grep for `LegendModal|Legend` hits only `dynamicTypeGuard.test.ts`, `bp3TrustEngineGuards`, `bp10SeverityGrammarGuards` (token/grammar guards, not modal behavior). SR-072's shape is untested; the SR stands as filed.
3. **F-22 residue — no closure needed**; aggregate counts suffice, per-file enumeration belongs to F-22 (parked). Cited, not re-opened.
4. **Pairing sweep — CONFIRMED, now filed as SR-091.** All seven `adjustsFontSizeToFit` sites in non-test `src/` read in context: TasksScreen `:1153` + the four bulk labels `:1434/:1459/:1490/:1506` pair `minimumFontScale={0.8}` ✓ · LeaderboardScreen `:289` pairs 0.8 ✓ · ScreenHeader `:194` pairs `MIN_TITLE_SCALE` ✓ · **ProfileScreen `:1293` (status-pill label) and `:1993` (stat-card label) omit the floor** — native may shrink those labels arbitrarily small at large type.
5. **Dark-palette comment sweep — CLOSED, safe direction throughout.** Every claimed pair computed against the REAL current surfaces: textStrong 15.24 · text 12.23 · textMuted **7.15** (claim 6.7 — better than claimed) · textSubtle 4.81 on `#1E1E22` (claim ~4.8 — exact) · placeholder 6.27 on `#28282C`-class · accentOrange 7.68 (claim 6.3, understated) · accentPurple 5.70 ✓ · successStrong 4.72 ✓. **All pass AA on the lifted surfaces.** Two doc-nits only: the section header still says "checked ≥ 4.5:1 on **#111** surface" (surface is `#1E1E22` since the elevation rework), and `ThemeContext.tsx:188` repeats the stale `7.5:1` ctaFillPressed figure (computed 7.00) — added as a second location under **SR-077**.

| SR | Tier | Evidence | Where | What |
|---|---|---|---|---|
| **SR-091** | LOW | code-inferred + NEEDS-SKY-DEVICE | `ProfileScreen.tsx:1293`, `:1993` | The app's only two unpaired `adjustsFontSizeToFit` sites — no `minimumFontScale` floor, so native can shrink the status-pill and stat-card labels arbitrarily small at large Dynamic Type (every sibling site pairs 0.8/MIN_TITLE_SCALE). One-line fix each. |

*(SR-077 evidence extended: second stale-figure location `ThemeContext.tsx:188` + the stale `#111` header note. SR-id ledger: next free block starts SR-092.)*

## §S · Per-screen visual sweep, both themes (phone) — verdict **FINISHED, all 11 surface groups** (4 findings: 2 MED, 2 LOW)

Method: fresh contexts 375×812@2x on the export, `colorScheme` emulation verified; **31 new PNGs at `assets/visual/`** (full dark sweep + light gaps incl. the `settings_light.png` the Settings agent flagged); reused the other agents' banked light captures. Brink held (Report sheet cancelled unfilled; zero Nominatim). Only console noise: the known-benign `findNodeHandle` pageerror.

### Per-surface verdicts
Home · FullMap (panel/legend/Nearby) · Report sheet · Tasks (sheet/select/empty/error) · FlagDetail (+history) · Profile+Sign-in · Settings · Drawer+About/HowToHelp/Resources · Help/Changelog/Feedback/MyFeedback · Onboarding · chunk-fail boundary — **all FINISHED in both themes**. Loading/empty/error moments read designed wherever reached (anatomy-mirroring skeletons, icon+title+guidance empty cards, banner+card+Retry error pattern; Tasks error dark twin captured). **Dark-mode completeness is otherwise excellent** — every swept surface themes; the only scheme-invariant surfaces are so by documented design (below).

### Findings

| SR | Tier | Theme | Evidence | Where | What |
|---|---|---|---|---|---|
| **SR-111** | MED (taste-ratify) | light | web-approximated + code-inferred | `SignInScreen.tsx:97-98, 260` (pattern twin `OnboardingCards.tsx:281-283`) | Sign-in is a hardcoded always-dark cover (`signin_dark.png` == `signin_light.png`, md5-proven). Internally polished + AA-tuned, and consistent with Onboarding's identical deliberate #070b18 cover — an "entry surfaces are brand-dark" pattern; but in light mode the Profile→Sign-in transition is a hard theme cut. **Sky ratifies the pattern or asks for a light variant — taste, not a bug.** |
| **SR-112** | MED | dark | web-approximated + code-inferred | `HomeScreen.tsx:709,757,779` · `FlagDetailModal.tsx:1700,1747,1818,1842,1924` · `NearbyFlagsModal.tsx:460` · `ReportFlagModal.tsx:1229,1429` | **Two different "primary blues" coexist in dark**: pre-glass surfaces fill primary controls with `color.brand`+`textOnBrand` (#4E89EF+white — the exact pair GLASS.md's ctaFill law rejects at ~3.4:1) while glass surfaces keep ctaFill #1466E0 (e.g. Tasks Verify vs FlagDetail footer Verify). Contrast dimension **ROUTED→Phase 2 arbiter** (no token proposal filed per the arbiter law); the coherence drift is the visual observation. |
| **SR-113** | LOW | dark | web-approximated | Tasks bulk bar | Disabled bulk trio dims unevenly — Watch's purple (#7c3aed) stays near-full-chroma while Verify/Resolve recede. WCAG-exempt (disabled); polish. |
| **SR-114** | LOW | dark | web-approximated (web-engine-specific) | `PlatformMap.web.tsx` / Leaflet | Leaflet's attribution strip keeps its default light background over the dark basemap — the one light artifact on an otherwise complete dark map scene. Web cohort only. |
| — | INFO | both | provenance | Home mini-map | Can capture as a gray card while tiles race (two banked home captures show it); loads fine settled — **capture caveat for the registry, not a defect**. Same class: `profile/01_guest_profile.png` shows serif fallback type (font-load race; settled re-shoot proves the brand fonts correct); `home/onboarding_card1.png`'s gray field is a mid-fade artifact. |

### CHECKS-PASSED (incl. the PROTECT presence confirmations)
- **Severity grammar UNREGRESSED both themes**: numbered disc + word everywhere it should be (Home rows, Tasks badges, FlagDetail, Nearby "Severity 3 of 5 · Moderate", Legend "1 — Minor … 5 — Severe", Report picker, heat legend). Dark ink table intact: #0F1B2D on sev 1–4 fills, white only on sev 5.
- **Honesty overlays PRESENT both themes**: "Reporting anonymously — your identity is not stored." · map "Location is off…" banner · Nearby location warning (proper dark amber pair) · onboarding permission-card honesty · sign-in privacy footer · About YOUR PRIVACY prose.
- **Glass tiers correct**: dark is luminosity-led as specced (no shadow ring, lifted floors, cool hairlines); stage pools render; heat legend's light chip in dark is **deliberate** ("pinned ALWAYS-LIGHT", `HeatmapLegend.tsx:57`).
- Stacked card actions at 375pt = designed `compactActions` mode (`TasksScreen.tsx:2280-2283`) — the other agents' 390pt one-row captures are the other intentional mode. · Guest-disabled bulk Watch is a real disabled state, not a contrast bug. · ErrorBoundary fully token-themed (dark twin safe by code).

### NEEDS-SKY-DEVICE
True blur/vibrancy of glass tiers + e1 lifts (web approximates tints, never BlurView) · native map dark appearance (Leaflet-specific truths here) · sign-in/onboarding gradient banding on device · frosted tab bar over real scrolling content · Dynamic Type × `compactActions` interplay.

### ROUTED
Brand-fill dark contrast family → **Phase 2 arbiter**. Copy drifts visually confirmed but owned by **BP16** (its existing §A picks, now live-confirmed): "Resolved" (card/detail) vs "Resolve" (bulk) · "Colour" (filter heat hint) vs "colors" (legend subtitle) · "My Feedback" title vs "My feedback history" row. Cited, not re-found: SR-064/099 (re-confirmed incidentally — Help's close X unreachable made the close click time out), SR-092's error state (judged: reads designed), SR-100, SR-041, map overlap (SR-106), changelog clip, tablet debt (§T).

### §NOT-VERIFIED
Home refresh-fail visuals (stale banner `HomeScreen.tsx:520`, settled error card `:753-765`) never visually reached — offline tab-roundtrip was a md5-proven no-op (no focus refetch) and route-abort held the skeleton; code-inferred only. Tasks skeleton dark twin (tokens code-inferred). Heat zones over dark tiles (no ≥3-flag cluster in the fallback viewport; legend+hint judged). FeedbackModal active-chip token line (pattern-matched, line not pinned).
