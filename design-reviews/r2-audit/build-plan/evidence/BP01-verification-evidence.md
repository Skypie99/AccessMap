# BP1 — Verification Evidence — 2026-07-16

**Phase:** `01_preflight-and-callout.md` (VERSION HANDSHAKE + T1 — the map payoff lands true; F2-01 CRITICAL + F3-04/05/06).
**Branch:** `r2/bp1-callout-true` · base `a8549ff` (S-9 default; bench/4-quality tip; bench NOT merged, main `01f7392`) · tip `3d13c8b` (6 commits — 5 plan items + 1 adversarial-verify hardening).
**Provenance (S-10):** phase authored on Fable 5 max effort (2026-07-15); executed on Opus 4.8 ultracode max effort, sub-agents max (Sky-fired, plan-approved in-session). Evidence probes ran on Chromium (Playwright) against the static export — **web-approximated**; native legs **code-inferred**; the device gate is **R2-D12 (NEEDS-SKY-DEVICE)**.

## 1 · Commit map (plan item → commit)

| # | Commit | Item | Shipped |
|---|--------|------|---------|
| 1 | `a80deea` | VERSION HANDSHAKE (no-edit, --allow-empty) | Base designated + 3 markers verified + base gates (typecheck 0 · lint 0/77 · jest run 1 = 2 flaky MyReportsModal fails [async waitFor under parallel load; pass in isolation], run 2 = **1857/0 clean = exact baseline**) + §P entry. Pre-existing ` D .claude/launch.json` worktree dirt recorded, never staged (verified: 0 commits touch it). |
| 2 | `456e5c1` | Web occlusion | MapScreen measures the PERSISTENT band only (mapHeaderRow + `MAP_HEADER_ROW_MARGIN_BOTTOM` + topRow, passive onLayout, state-backed for flexWrap re-measures — skeptic FIX absorbed) → `chromeInsetTop = insets.top + OVERLAY_PADDING + band + 8`. Both variants: prop + `animateTo(region, opts?)`. Web: `<Popup autoPanPaddingTopLeft=[12, clamped]>` (bind-time) + live-instance option stamping (react-leaflet never diffs popup options; Leaflet reads them at open — verified in installed source) + exported `clampChromeInset` (≤45% of live map height) + `instantCut` (THE shared animate:false path BP13/T7 reuses). |
| 3 | `99d35ef` | Native leg | Exported `biasRegionForCallout` (f∈[0.5,0.65], chrome ≤45%, identity when centered pin already clears); `animateTo(…, {calloutClear:true})` at the 4 callout flows; 5 non-callout moves byte-exact; Marker onPress nudge (pointForCoordinate + getMapBoundaries, feature-checked, failures swallowed, current-zoom deltas). detail.test.ts window 320→560 (assertions unchanged). |
| 4 | `5b5663f` | Rhythm | retryShowCallout rung 0 (synchronous same-tick — RM dead beat gone) + export; `createCalloutScheduler` last-tap-wins across ALL FOUR sites (skeptic's blessed hardening; effects keep `cancelled` flags; unmount `cancelPending`); deep-link 800ms clearParamTimer untouched; SR block byte-identical (0 diff lines); CachedTileLayerWrapper add-before-retire ('load' + 2s idempotent fallback, dispose immediate = F31, unmount-only teardown). detail.test.ts pins the new wiring. |
| 5 | `0eb128f` | Guards + evidence | 4 new suites (+54 tests) + **two evidence-driven RM fixes** (§3). |
| 6 | `3d13c8b` | Adversarial-verify hardening | 2 LOW fixes (antimeridian span guard + non-vacuous native nudge test) + 1 documented finding (§7); +2 tests. |

## 2 · Gates (all at tip `3d13c8b`)

- `npm run typecheck` → **0 errors** ✅
- `npm test` → **1913 passed / 0 failed** (84 todo; baseline 1857 + 56 new guards). One transient `MyReportsModal` 2-fail under full-suite parallel load (async `waitFor` timing; passes in isolation + on clean re-run) — the SAME flake recorded at base in §1, not introduced here. ✅
- `npm run lint` → **0 errors / 77 warnings** (= baseline, no new) ✅
- Tracked diff `a8549ff..HEAD` = exactly: PlatformMap.tsx · PlatformMap.web.tsx · MapScreen.tsx · MapScreen.detail.test.ts + 4 new test files — nothing else ✅
- `map-stacks.json` diff: 0 lines ✅ · 6 untracked stacks files sha1s recorded (§6), never edited ✅
- Occlusion close-out (the CRITICAL's gate): **zeroOverlap TRUE, both themes**, measured (§4) ✅
- Blur budget: no GlassSurface anywhere in the diff; the Leaflet popup is plain HTML — pane count unchanged by construction ✅
- Arbiter: N/A — zero ink/color/floor changes (no arbiter sibling needed per phase spec) ✅
- PROTECT byte-proofs: overlay law lines (`styles.overlay` paddingTop line / `overlayTopGroup` box-none) and the SR nested-detail block appear in ZERO diff hunks; the only box-none-adjacent diff lines are the two sanctioned passive `onLayout` additions on the child rows (props preserved verbatim) ✅

## 3 · What the evidence probe REFUTED (and the fixes) — honesty section

The first probe run refuted my initial RM design **twice**; both defects were real and are now fixed + guarded:

1. **Direct-tap gap.** The RM cut originally rode only the imperative `showCallout` path. A DIRECT pin click opens through Leaflet's bound-popup handler and never touches `showCallout` → a real tap under RM stayed occluded (probe: popup at y=18 under the chrome). **Fix:** the cut rides a map-level `popupopen` listener (bound only under RM, F7-rebind) — every open path covered.
2. **Empty-shell under-cut.** With the listener in place the popup still landed at y=53. Trace stamps proved the ref/inset were correct (179/179) at fire time — the cut measured the popup **before react-leaflet portals its content** (its own popupopen listener flips `setOpen(true)`; children mount on the NEXT commit), so the box was an empty shell and the deficit came out ~9px instead of ~144. **Fix:** defer ONE rAF (still a zero-animation cut), measure the popup's REAL rendered rect against the map container (no anchor modeling), read the inset through a ref, guard `isOpen()` for popups closed before the deferred frame.

Also learned + encoded in the probe: the exported map ignores Playwright mouse drags and over-reacts to synthetic events (leaflet KEYBOARD pan is the reliable lever — `diag-pan.mjs`); React Navigation keeps the hidden Home screen mounted, so chrome measurement must filter `checkVisibility()`/aria-hidden and the popup's own controls (`diag-chrome.mjs`); tile throttling needs a subdomain-safe glob.

## 4 · Probe verdicts (final run; `bp01-capture-results.json`)

| Leg | Verdict | Numbers |
|-----|---------|---------|
| light | **zeroOverlap TRUE** | popup top 179.0 vs persistent-chrome bottom 169 (pin engineered to y=185 pre-tap; autoPan glide) |
| dark | **zeroOverlap TRUE** | identical geometry, Dark Matter tiles |
| rm | **zeroOverlap TRUE** | popup top **179.0 at 260ms** — the instant cut lands the SAME clear position the glide produces, with no 500ms window to have glided |
| themeflip | **overlapSeen TRUE · retired TRUE** | throttled tiles: t80 + t400 = old layer **18/18 loaded persisting** beneath incoming **12/0**; t1500 = retired to the dark layer alone. Screenshots: chrome re-inks immediately while light streets stay fully legible → full dark. The map never blanks. |

Captures banked in `evidence/BP01/`: `map__{light,dark}__390__pin-callout.png`, `map__light__390__pin-callout-rm.png`, `themeflip-t{80,400,1500}.png`, results JSON, probe + the two diagnostic scripts. BEFORE frames = the audit's `assets/base/map__{light,dark}__390__pin-callout.png` (callout half-ghosted under the pill/rail). Every visual claim: **web-approximated**.

## 5 · Guard suites added (+54)

- `MapScreen.calloutRhythm.test.ts` — same-tick rung 0 (incl. cancelled + null-map); ladder 250/400/550/700; canceller idempotence; **A→B ~450ms apart yields exactly B with A's 550/700 cancelled**; cross-path last-wins; `cancelPending` mid-ladder; per-call cancellers still valid; handle read at schedule time; wiring invariants (4 schedule sites, 0 raw calls, unmount cancel, 800ms trailing).
- `PlatformMapWeb.calloutClear.test.tsx` — Popup carries `[12, inset]` at bind; 45% clamp; `undefined` (not `[12,0]`) without chrome; autoPan stays RM-gated; re-measure **stamps live popup options**; popupopen listener bound only under RM; cut = setView `{animate:false}` zoom-preserved; deficit geometry (fallback AND real-rect paths); **stale-early-bind closure cannot under-cut (ref read at fire time)**; clear pin → no cut; no chrome → no cut; web animateTo targeting exact with/without opts.
- `PlatformMapWeb.tileFlip.test.tsx` — one layer per scheme (family literally unchanged — never re-litigated); **add-before-remove**; retire on 'load' (once-only); 2s offline fallback (idempotent, handler detached); rapid double-flip chains predecessor-exact; unmount dispose+remove.
- `PlatformMapNative.calloutClear.test.tsx` — bias math table (identity / midline / f-cap / delta defaults); opts-in bias vs byte-exact passthrough; RM duration 0 preserved; pin-press nudge (occluded → biased current-zoom move; clear → none; no chrome → no probe calls; missing APIs → silent; rejecting APIs → swallowed; RM → duration 0).

## 6 · Ledger of immutables (sha1 at phase close — never edited)

```
cbf4ee9d3e8eb7049cebef85307e9ad7064902e5  design-reviews/fable-audit/tools/audit-stacks.json
9d961e6c1aae9b649806b82041c43e8609eb4ac0  design-reviews/fable-audit/tools/p2-material-stacks.json
db892059676bf44bed872986e3006c20af5fe944  design-reviews/fable-audit/tools/bench3-material-stacks.json
6771bc201158592f02115151ecd81d5aa842b7f2  qa-reports/assets/2026-07-03_tasks_glass/shipped-stacks.json
ed555ea9fbcaea24b444003b819335177be8bfb8  qa-reports/assets/2026-07-03_glass_w1/wave1-stacks.json
c4309f8352efd83ebe5c440836193ba7ec7f37e0  qa-reports/assets/2026-07-03_glass_w2/wave2-stacks.json
```

## 7 · Adversarial verify (S-10 ultracode)

Three max-effort Opus 4.8 skeptic lenses (mapscreen-concurrency · web-leaflet-mechanics · native-parity-and-guards) each tasked to REFUTE the diff, reading full files + installed leaflet/react-leaflet internals (503k tokens, 99 tool calls).

- **web-leaflet-mechanics lens (highest-stakes — reads leaflet 1.9.4 + react-leaflet 5 internals): ZERO findings.** The popupopen+rAF cut, option-stamping, clamp, and the add-before-remove tile swap survived the internals audit.
- Three **LOW / `confident:false`** findings total, none blocking:
  1. **Native cold-mount-into-focus + large Dynamic Type → stale `chromeBandPx=0`** (MapScreen.tsx). If Map first mounts already carrying `route.params.focusFlag` (cold start straight into a Tasks-card tap, before any onLayout), the focus effect's biased `animateTo` fires against inset≈0. **Judged not-fixed-in-code, DOCUMENTED:** in *normal* Dynamic Type stale-0 and the measured band produce the IDENTICAL outcome (chrome+`CALLOUT_HEADROOM_PX` < half-height → both center → both clear); they diverge only under large type on that exact cold path, native-only — precisely the native-callout-occlusion case already routed to **R2-D12**. The web leg self-heals via popupopen-per-rung; forcing a native equivalent means adding *unverified* mid-ladder native camera motion to fix an *unverified* gap, disturbing the "one rhythm." The honest close is device verification, not risk. → added to §9.
  2. **Vacuous native integration test** (my test): at the jest window height (1334) the bias clamps to zero, so `region === biasRegionForCallout(…, WIN_H)` couldn't fail on magnitude. **FIXED (commit 6):** added a short-window (700px) integration test asserting a real non-zero southward shift (0.15×latSpan), so a dropped/miswired bias now fails red.
  3. **Antimeridian negative `longitudeDelta`** (PlatformMap.tsx handlePinPress): a date-line-straddling viewport yields a negative span → corrupt MapKit delta. Unreachable in this Kelowna-local app, but **FIXED (commit 6):** guard rejects non-positive lat/lng spans, falling back to the 0.005 focus zoom; latitude bias unaffected. New guard test added.

Commit 6 (`<tip>`) applies fixes 2 + 3; finding 1 is documented, not silently dropped.

## 8 · PROPOSED strings

None — zero user-facing copy in this phase (as specced).

## 9 · NEEDS-SKY-DEVICE (feeds R2-D12)

- Native callout on top-third pins, both themes, RM on/off (the native leg is code-inferred end-to-end: bias math + marker-press nudge; jest pins values, not renderer feel).
- **Native cold-start straight into a focused flag under LARGE Dynamic Type** (adversarial finding 1): confirm the callout still lands clear when Map's first-ever mount already carries `focusFlag` (the measured chrome band hasn't laid out yet). Normal type is unaffected; this is the one native path with no web-style self-heal.
- Rapid Nearby A→B on device yields B only (jest-proven headlessly).
- Theme-flip continuity on device (web-approximated here; native tile handling differs).
- VoiceOver callout→details path (unchanged by BP1 — S3's wiring untouched — but the phase spec lists it).
- Whether `animateToRegion` duration 0 is truly instant on-device (inherited B5 caveat).

## 10 · For Sky to eyeball

- The three callout captures + the flip t-series in `evidence/BP01/` — 30 seconds of eyes.
- The probe's RM story in §3 (two refutations → fixes) — this is why the capture leg exists.
