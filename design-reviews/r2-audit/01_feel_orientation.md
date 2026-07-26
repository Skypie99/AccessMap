# Fable Audit ROUND 2 — AccessMap — Part 1: Feel Orientation (Evidence Base)

Read this FIRST for any Part-1 artifact. It is the map to the R2 feel bank under
`design-reviews/r2-audit/`: `01_feel_render-index.md` (every capture, one row) ·
`01_feel_persona-reads.md` (seven blinded reads + completeness critique) ·
`02_feel_findings.md` (the banked findings, F1–F6) · `partials/` (lens outputs) ·
`assets/<group>/` (PNGs + a11y trees) · `tools/` (the adapted harness). Nothing
outside `design-reviews/r2-audit/` was modified.

## §0 Baseline (the fence)

- **Date:** 2026-07-09 · **Model:** Claude Fable 5 (`claude-fable-5`), max effort; all
  sub-agents (Workflow fan-outs) inherit Fable 5 per Sky's standing directive.
- **HEAD:** `a8549ff3d6d15ed4410b71d803d50a130613d3d0` · **Branch:** `bench/4-quality` —
  exactly the authored tip (main `01f7392` + the four bench tiers stacked). HEAD was
  never moved; no branch was switched.
- **Baseline markers (all three verified at HEAD):** `PHOTO_MAX_DIMENSION` in
  `src/lib/flags.ts` + its test (BENCH-4/B8) · `src/components/LiveStatusRegion.tsx`
  exists (uplift P5/S10) · `variant="bulk"` ×1 inside `src/screens/NearbyFlagsModal.tsx`
  (BENCH-3/B4e).
- **Serve modes (TWO, both recorded per capture row):**
  1. `npm run web` Metro dev server → `http://localhost:8081` (`__DEV__` true) — the
     Round-1 serve mode, kept for parity cross-checks.
  2. **Static export** → `http://localhost:8082` — `npx expo export --platform web
     --output-dir <scratchpad>/web-export` (never into the repo), served by
     `python3 -m http.server 8082` from the scratchpad. Production bundle
     (`__DEV__` false). **★ THE LUCIDE DEV-PREVIEW BOUNDARY LIFTS ON THE EXPORT.**
     `tools/probe-export.mjs` verified live: **TasksScreen RENDERS · MapScreen RENDERS ·
     NearbyFlagsModal (SR auto-open) RENDERS · ReportFlagModal RENDERS.** Per the
     Round-2 brief this is recorded and the evidence re-tagged accordingly: the whole
     Map/Tasks family is capturable as `web-approximated` in Round 2. Primary capture
     source = :8082. (One benign `pageerror` on export: `findNodeHandle is not
     supported on web` — console noise, crashes nothing; see §4.)
- **`git status --porcelain` at start:** 1 deletion line — ` D .claude/launch.json`
  (Sky's pre-existing workspace state; left exactly as found; the dev server was driven
  from the shell, never via a launch.json tool) — plus untracked (`??`) lines only:
  `?? design-reviews/` (contains the pre-existing `fable-audit/` bank and the four
  r2-audit prompt files — IN the baseline) · 46 × `?? qa-reports/<file>.md` · 9 ×
  `?? qa-reports/assets/<dir>/` · 2 × `?? qa-reports/summaries/` files · `?? supabase/.temp/`.
  **Zero tracked modifications; `git diff --stat` empty.** Since `design-reviews/` is
  untracked as a whole, porcelain output is IDENTICAL before/after this audit — the
  end-of-part fence check is: no OTHER line appears, and `git diff --stat` stays empty.
- **`.env` present** (Supabase anon reads power guest browsing — the wave-era read-only
  precedent). Never opened, never printed, never created.
- **Fresh run:** `r2-audit/` held only the four prompt files at start — no resume state.

## §1 The delta digest (what P0–P5 + BENCH 1–4 changed per surface)

*Round 1's capture bank (`fable-audit/assets/`, 410 files) remains citable ONLY for
surfaces this digest shows untouched — every reuse must say so. Sources: the ten
close-out ledgers under `fable-audit/uplift-assets/` + `fable-audit/bench-assets/`,
digested by ten parallel readers and spot-verified by grep at HEAD.*

**Method + full detail:** ten parallel readers (one per ledger), every closed item
grep-spot-verified at HEAD — **70/70 items verified, 0 marker misses**. The complete
per-item digest (what shipped · surfaces · feel relevance · markers) is banked at
`partials/delta-digest-raw.md`; this section is the working summary.

**Per-surface delta (what Round 2 must recapture and judge fresh):**

- **MapScreen / FullMap — the most-changed surface.** S4 denied-arrival banner +
  "Showing N flags" pill (a polite live region); S6 two 48pt ctaFill zoom buttons +
  `topRow` repaired to `box-none`; S7 scheme-branched tiles (Positron light / dark_all
  dark) + hairline attribution; S8 editorial "MAP / Explore" chip + HeaderActions
  circles (nav header gone); S1+S14 pins re-rendered (severity-grammar callout meta,
  `#0F1B2D` hairline union, anon **double concentric ring** replacing the gray swap,
  native custom teardrop); S3 callout gains "Reported {relativeTime}" + "Open details"
  → **FlagDetailModal newly reachable from the Map** (and StatusHistoryModal above it);
  S16 Clear-all-filters ≈48pt effective + action-bar right-edge gradient fade
  (conditional on overflow); S11 "Loading flags…"/"Updating…" split; B7a heat
  "No heat zones qualify yet" companion line; B10 web locate-failure → LiveStatusRegion
  with self-clearing Retry; B9 offline banner states data AGE; B11-B `ctaFill` on the
  empty-card "Reset all" + Save buttons; B11-C 500-weight `savedEmptyText` +
  `statusHint`×4; B4c LegendModal/AddressSearch/SavedPlaces/FilterPresets → bulk glass.
- **ReportFlagModal.** S5 "Use my location" 44pt in-sheet retry + spoken disabled-submit
  reason; S18 visible "Submit report" (a11y name contains it) + anon-banner word-wrap
  at 200%; S15 submit-moment sentence ("…AccessMap doesn't notify the city — see
  Resources."); S2 severity digit ink + white Check glyph; B2-ii template chips →
  bespoke CategoryIcon (glyph field retired); B4d card → bulk glass (6 inks re-inked;
  footer/severity buttons byte-identical, PROTECT-3); S11 slow-submit in-sheet overlay;
  S10 "Report filed — thanks for flagging this barrier" via LiveStatusRegion +
  RM-gated recenter on the new pin.
- **NearbyFlagsModal.** S1 visible meta "Severity N of 5 · {word} · {Status} · {time}";
  S2 digit ink; S3 SR-path row-select opens the focus-managed detail sheet NESTED over
  the open list + honest hint "Opens this flag's details"; B4e glass edge-to-edge
  (empty-state subtitle re-inked; PROTECT-1 row labels byte-identical).
- **TasksScreen.** S13 FlagCard recomposed (outer pressable `accessible={false}`,
  labeled header summary button, four independent actions — visually unchanged);
  S9-c photo thumbnails carry `aria-hidden`; B11-C empty-card body ≥500; B2 emoji →
  Lucide; B9 offline banner age copy.
- **HomeScreen.** S15 "Most recent barriers"; S1 Recent rows gain severity number +
  `STATUS_LABELS`; S17 peek wrapped `pointerEvents="none"` + `suppressAttribution`
  (0 live links, 0 zoom controls in the peek); B9a offline age; B9b NEW inline
  "Couldn't refresh — showing older data. Tap to try again." live notice.
- **Profile / Settings.** S8 editorial headers via HeaderActions (double title killed;
  Settings gains a ScreenHeader).
- **Onboarding (Cards + replay Modal).** S15 slide-2 copy; S19 web CTA "Continue" +
  "Not now" decline (native keeps "Allow Location" — a deliberate platform fork);
  B3 slide-1 LogoMark (Compass/MapPin retired).
- **HamburgerDrawer.** B3 white LogoMark in the blue tile; B5 the 220ms sub-screen
  delay now RM-gated to 0.
- **LegendModal.** S1 NEW Status block (defines Open/Verified/Resolved) + anon-ring +
  resolved-check entries; S2 digit ink; B4c bulk glass.
- **Help / MyFeedback / Feedback / AddressSearch / Changelog.** S20 FAQ fact-checked
  (real tab names; resolved = checkmark + kept severity color); B2-i all 8 decorative
  emoji → Lucide (chips tint on select); B4a/b Changelog + Help + MyFeedback → bulk
  glass.
- **App-level plumbing every lens rides:** S9 web a11y engine mounted (`a11yToggle`
  flat-aria at ~100 sites · `installWebAnnounceShim` + persistent A11yLiveRegion ·
  `decorativeProps` aria-hidden · aria-label on all 29 modals); S10/S11 the shared
  persistent LiveStatusRegion; S12 web RM camera fixed (`{animate:false}` on all 5
  paths, 10 guard tests); B5 21 RM regression tests + `motion.duration.pulse` token +
  static PROTECT-7 guard; B7b iOS cluster spring gated (`animationEnabled={!reducedMotion}`);
  B8 photo resize-on-ingest (2048 cap, fused with the EXIF strip).

**Pre-spotted (recorded here so lenses cite, not re-discover):**
- L4-12's fixed 350ms callout delay NO LONGER EXISTS — replaced during the uplift by
  the `retryShowCallout` race-ladder (`MapScreen.tsx:159`). Already closed; judging the
  ladder's FEEL is fair game, re-finding the delay is not.
- The digest readers spotted two candidate micro-nits Round 1 never filed (fair game as
  NEW findings if a lens confirms): "colour" (LegendModal) vs "color" (HelpModal)
  spelling drift · the platform-forked consent CTA ("Continue" web vs "Allow Location"
  native — deliberate per S19, but a voice-consistency seam worth one look).
- BENCH discoveries that are SKY'S, never re-derived: `CATEGORY_ICONS` dead export
  (`flags.ts:1188`) · `searchClearText` dead style (`SearchInputRow.tsx:119`) ·
  blocked_path per-template icon collision · heat "no zones" copy tuning ·
  OnboardingCards' local RM detection.

**Stale-captures verdict (union of all ten ledgers, 60 entries — full list in
`partials/delta-digest-raw.md`):** effectively EVERY guest surface changed. Round-1
base captures remain citable ONLY for: **AboutScreen · ResourcesScreen ·
HowToHelpScreen · the web SignIn modal variant** (S15's sign-in copy fix is
native-only). Everything else — Map (every state), Report sheet, Nearby, Legend, Home,
Tasks, Profile, Settings, Onboarding, drawer, Help/Feedback family, FlagDetailModal —
is **stale → Stage 2 recaptures fresh**. Behavioral/RM captures are additionally stale
app-wide (S12/B5/B7b changed the motion contract). Round 2's "delta-first" therefore
resolves to a full fresh capture pass — made feasible by the lifted lucide boundary
(§0).

## §2 The feel inventory (the audit's raw nerves, verified at HEAD)

**Press-feedback primitives**
- `src/components/ui/PressableScale.tsx` — the adopted press-scale primitive
  (RM-gated springs). Adopters: 4 non-test files (F1 censuses every interactive
  element and maps the PressableScale / pressed-style / dead-to-the-hand distribution).
- `src/components/ui/Button.tsx` — **0 call sites app-wide (re-verified at HEAD)**.
  Fork 9 (adopt-or-remove) is Sky's; Part 1 censuses only, never re-litigates.
- `src/lib/haptics.ts` — the THREE-word haptic vocabulary: `hapticSelection()` (:46),
  `hapticImpact(style)` (:57), `hapticNotify(type)` (:73). No-ops on web; F1 judges
  whether the vocabulary is used semantically (selection vs impact vs notify).
- Raw `Pressable` pressed-style patterns — per-screen, uncensused until F1.

**Motion**
- `src/theme.ts:462` `export const motion` — duration `instant 0 / fast 120 / base 180 /
  slow 320` **+ `pulse: 700`** (:469, the looped skeleton-shimmer half-cycle); easing
  standard/decelerate/accelerate; springs press/pressOut/sheet/drawer. DESIGN.md §8 law:
  ≤200ms micro-interactions; all non-trivial motion gated by `useReducedMotion()`
  (`src/lib/accessibility.ts`).
- The drawer's RM-gated 220ms sub-screen delay — `HamburgerDrawer.tsx:119`
  (`setTimeout(..., reducedMotion ? 0 : 220)`); the drawer Modal itself is always
  `animationType="none"` (slide is hand-animated; BENCH-4/B5 added the 220-gate test).
- **Modal `animationType` census at HEAD: ~25 mounts across 30 files, EVERY ONE an
  RM-gated ternary** (`reducedMotion ? 'none' : 'slide'|'fade'`). Fade family:
  MapScreen ×2, PhotoLightboxModal, PhotoGallery, OnboardingCards; slide = everything
  else. F3 inventories each as a designed moment.

**Voice**
- `src/lib/copy.ts` — the shared strings (offline banners, load errors).
- `src/lib/a11yText.ts` — `severityA11y` (:17), `statusA11y` (:26) — SR prose
  single-source.
- `src/lib/announce.ts` — **NEW since Round 1** (uplift P1/S9's announce leg): a real
  web announce shim — `announce()`, `subscribeAnnounce()`, `installWebAnnounceShim()` —
  replacing the dead `announceForAccessibility` web no-op. F4 reads announced copy AS
  PROSE; F5 judges announced moments as designed beats.
- Everything else is inline JSX per component — that dispersion is itself feel-relevant
  (F4 sweeps inline strings).

**States**
- `src/components/LiveStatusRegion.tsx` — the persistent-mounted live region
  (S10 "Report filed" + S11 "Still trying" beats).
- `src/components/FlashBanner.tsx` — app-level toast (announce decoupled from motion).
- `src/components/ui/Skeleton.tsx` — content-shaped placeholders; static at RM/RT/C-lite.
- The empty-filters recovery card — **`MapScreen.tsx:2161`** ("Your filters are hiding
  everything. Clear just the one in the way, or reset them all.") — PROTECT-2, "the
  app's best moment," THE bar every state is judged against. (Line drifted from Round
  1's ~:1929 — content intact; see §3 drift log.)
- ErrorBoundary variants + offline banners (`copy.ts`).

**Signature**
- The severity grammar single-source: `src/theme.ts:533` `export const severity`
  (ramp `#F7C948 → #D92D20`, labels Minor→Severe, stakes-lines, `textOnColor` ink fork)
  + `SeverityBadge.tsx` + `severityColor()`. **The signature — Round 1's thesis, intact.**
- The Wayfinder mark (`src/components/LogoMark.tsx`) + "Wayfinder Blue" `ctaFill`
  `#1466E0` mode-independent (BENCH-1/B3 wore the mark on more surfaces — see §1).
- The bespoke `CategoryIcon.tsx` set (PROTECT-16).

## §3 How-to-reach ledger

**Adopted wholesale from Round 1:** `design-reviews/fable-audit/01_orientation.md` §5
(the web reproduction manual — harness defaults, per-surface nav steps, seeds, states,
UNREACHABLE list). Everything below is drift + extension against that ledger at HEAD.

**Drift log (verified 2026-07-09):**
1. `MapScreen.tsx` empty-filters card: ~:1929 → **:2161** (uplift/bench line drift;
   copy verbatim-intact).
2. **Serve mode:** primary base URL is now `http://localhost:8082` (static export —
   §0). Round-1 nav steps reproduce unchanged on the export; **five ledger rows
   re-verified live by `tools/probe-export.mjs`:** (1) Home lands · (2) Tasks tab →
   "Review barriers" · (3) Home → "Open the full map" → Map · (4) NearbyFlagsModal
   auto-open on Map arrival (SR-true-on-web, app truth) · (5) Home "Report a barrier"
   pill → ReportFlagModal (guest sheet). Row (6), the C-lite localStorage seed, is
   verified by Stage 2's glassmode captures (index rows are the proof).
3. Map/Tasks-family rows in Round 1 were dev-server-unreachable at the end (the lucide
   boundary post-dated nothing — it was the P1+ dev-preview state). On the export they
   are all reachable again; the dev server (:8081) is NOT used for Map/Tasks-family
   captures.

**Extensions for Part 1's new states:**
- C-lite flip: seed `localStorage['@accessmap/glass_mode_v1']='lite'` (raw string) in
  addInitScript; fallback = long-press Tasks header title.
- Onboarding: capture context WITHOUT `@accessmap/onboarded_v1` (+`localStorage.clear()`
  guard).
- Geolocation seed: the wave coords `49.8874, -119.4925` (≈480 m from the live
  "Blocked path" flag → nearest-barrier banner renders).
- The drawer's 220ms sub-screen swap: open drawer → tap a sub-item → pull frames at
  ~t0/t120/t260 (before/during/after the delay gate); RM pass expects the 0ms path.
- LiveStatusRegion beats: "Report filed" requires submit → **code-read only** (fence).
  "Still trying" requires a read stalled past the threshold → attempt via route-abort
  /delayed-route on the flags fetch after load; if not triggerable read-only, code-read
  + honesty-ledger entry.
- Action-bar fade / Clear ≥44pt (P5/S16): filter panel open → the Clear-all control;
  action bar at narrow widths for the fade affordance.
- Static-export console noise: expect the benign `findNodeHandle` pageerror on every
  load (§4) — not an app state.

## §4 Honesty ledger (append-only)

1. **Round 1's ledger is inherited wholesale** (`fable-audit/01_orientation.md` §7,
   items 1–15a) and still true at HEAD: everything captured is `web-approximated` by
   default; true blur feel / scroll smoothness / haptics / VoiceOver / real DT / Reduce
   Transparency / Apple light tiles are device-only; web tiles are CartoDB `dark_all`
   ALWAYS; RT designed states are code-/test-inferred (iOS-only API); the auth fence is
   absolute (signed-in states code-read); RN-web resolves `isScreenReaderEnabled` true
   for every web user → the Nearby auto-open on Map arrival is APP TRUTH on web;
   landscape N/A-by-design (portrait-locked); Supabase reads are live anon guest reads —
   real user content stays inside this folder, quoted only as the UI shows it.
2. **NEW — the static export (:8082) is the primary capture source.** Same code at the
   same HEAD, production bundle (`__DEV__` false): the glass pane-budget dev telemetry
   (`__getLiveBlurPaneCount` warn) is INACTIVE, and no dev overlays exist. Serve-mode
   deltas vs Round-1 dev captures are named per comparison, never silent. The export
   lifted the lucide boundary (probe banked: `tools/probe-export.mjs`; result recorded
   §0/§3) — Map/Tasks-family evidence in Round 2 is therefore live `web-approximated`,
   not code-inferred, except where a state stays fenced (submit, auth).
3. The export throws a benign `findNodeHandle is not supported on web` pageerror
   (RN-web API gap, non-fatal). Recorded so no reader mistakes it for an app defect
   found by this audit; its *feel* consequence (if any control depends on it) is F1/F3
   territory judged from code, not from the console line.
4. The Metro dev server (:8081) stayed up for parity; the Map/Tasks dev crash was NOT
   re-tested (the pre-existing Round-1 record stands — it is a dev-bundler limitation,
   not an app bug, and not a finding).
5. Post-submit states (incl. LiveStatusRegion "Report filed") and all auth-gated
   surfaces remain code-inferred — the fence never bends. The CONTRIBUTE flow is
   exercised up to the enabled submit affordance and no further.
6. Sky's device reads D9 (≥500-on-glass weight) and D10 (B6 light bulk sheet) are
   SETTLED (Sky's word, 2026-07-09) and not re-opened here; Part 3 writes the D9
   closure into the refreshed device-gate ledger.
7. `qa-reports/` untracked files, `design-reviews/`, `supabase/.temp/`, and the
   launch.json deletion are IN the baseline (§0) — pre-existing, not this audit's.
8. **The "success-register" moment is unreachable BY LAW, not by oversight** (the
   completeness critic, context-free, suggested capturing a feedback-modal submit):
   every submit affordance is fenced — zero Supabase writes. All success beats
   ("Report filed", feedback thanks, points flash) are code-inferred. Permanent.
9. **R7's persona packet is the C-LITE capture set** — under real iOS Reduce
   Transparency the bulk sheets go OPAQUE (designed states, GLASS §6), while under
   C-lite chrome+bulk deliberately KEEP blur (GLASS §4). R7's "sheets bleed through"
   reaction is therefore evidence about the C-LITE experience, not the RT one — the
   lenses and Part 3 must weigh it against that design intent, not as an RT failure.
10. **Web Modal presentation is an open engine question raised by the transition
    frames:** report opening-t150/t400/settled captured pixel-identical — either the
    slide completes <150ms or RN-web does not animate `animationType="slide"` at all.
    F3 must code-/probe-verify before judging sheet arrival; if RN-web skips the
    animation, the WEB app is cuts-only and the designed slide is native-only
    (NEEDS-SKY-DEVICE).
11. **Model-provenance note (halt + resume):** the six-lens Stage-4 fan-out hit the
    Fable 5 session usage limit late 2026-07-09 (all six agents errored before doing
    work); the session limit reset at midnight and the run RESUMED 2026-07-10, still
    on Claude Fable 5 max effort — no model fallback occurred, no downgrade. Stages
    0–3 completed 2026-07-09; Stages 4–5 completed 2026-07-10.
12. **Font-race artifact risk:** persona readers report an apparent serif/system
    fallback face in isolated panes (dark C-lite filter panel; one light-theme race).
    Each fresh Playwright context loads fonts cold — a capture taken before the
    Public Sans/Jakarta faces resolve can show the fallback. Any type-face finding
    must be re-verified (re-render with a settle, or code-read the family) before it
    survives — skeptics: attack these first.
