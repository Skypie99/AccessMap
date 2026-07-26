# BENCH-4 — Pipeline & Motion Quality — Verification Evidence

**Branch:** `bench/4-quality` @ `a8549ff` (4 commits off BENCH-3 tip `0445efb`).
**Model:** Opus 4.8 ultracode, max effort. **Tier:** bench/polish (EXTEND named excellences).
**Members:** B8 (photo resize on ingest, L7-05) · B5 (motion hygiene + RM regression net, L4-05/07/08/10/11/12).
**Status:** BUILT + green + **STOPPED on branch** — NOT merged, NOT pushed, NOT built (Sky merges; one EAS build carries the tier).

## Commits (stacked on `0445efb`)
| Commit | Item |
|---|---|
| `13ecb3a` | B8 — resize photos on ingest in the EXIF-strip pass (L7-05) |
| `a8549ff` | B8 hygiene — `T[]` not `Array<T>` in `resizeActionFor` (lint parity; folded into B8, separate only because interactive rebase is unavailable here) |
| `f6f28ec` | B5a — gate the dead 220ms RM delay + tokenize the pulse literal (L4-11/L4-10) |
| `c3862a4` | B5b — reduce-motion regression net + native falsy-zero flag (L4-05) |

## Gates (all green)
| Gate | Baseline @ `0445efb` | @ `a8549ff` |
|---|---|---|
| `npm run typecheck` (`tsc --noEmit`) | 0 errors | **0 errors** |
| `npm run lint` (`eslint src`) | 0 err / 77 warn | **0 err / 77 warn** (no new warnings) |
| `npm test` (`jest`) | 1826 pass / 0 fail / 84 todo | **1857 pass / 0 fail / 84 todo** (+31 net-new) |
| `git diff --stat 0445efb..HEAD` | — | 17 files, +772/−29, intended only |

Evidence posture note: the entire `design-reviews/` tree is untracked in the working tree (inherited from the bench branches); this file lives there and travels with the checkout, matching BENCH-1/2/3.

---

## B8 — Photo pipeline: resize on ingest (L7-05) — **CLOSED**

### What shipped
Full-resolution photo originals previously flowed all the way to Supabase Storage. Now a **downscale-only, aspect-preserving, longest-edge cap** rides in the **same pass that strips EXIF** — on native inside the existing `manipulateAsync` re-encode, on web inside the existing canvas re-encode — so the emitted asset is **both resized and metadata-free**, with no path that copies the original.

- `PHOTO_MAX_DIMENSION = 2048` (**Sky-chosen 2026-07-07**).
- `resizeActionFor(w, h)` — pure. Returns `[{ resize: { width|height: 2048 } }]` capping the **longer** edge, or `[]` when the source already fits **or dims are unknown** (never upscales, never distorts). Fed as the `actions` array of the existing `manipulateAsync` — **`compress: 0.9` and `format` (PNG-stays-PNG else JPEG) left untouched** so quality stays predictable.
- `scaledCanvasDims(w, h)` — the web analog; sets the canvas dims for `stripExifWeb`'s draw (guest-mode parity, PROTECT #9). Uses `img.width/height` (true decoded dims).
- Picker dims (`result.assets[0].width/height`) threaded through `uploadFlagPhoto` / `uploadAvatar` / `addFlagPhoto` and the three native ingest screens. In `ReportFlagModal` (PROTECT #3) the dims ride a side `photoDimsRef` keyed by uri — `photoUris` stays a `string[]` and the sheet architecture / PhotoGallery mapping are **byte-untouched**. Dims optional everywhere → a no-dims path falls back to re-encode-only (zero regression).

### Why 2048 (the flagged number, verify-first)
The **largest** display of a photo is full-screen `resizeMode="contain"` in `PhotoGallery.tsx` (lightbox, sized to `useWindowDimensions()`) and `PhotoLightboxModal.tsx` — never larger than one device screen. Thumbnails are 80–96px. So the cap is sized to the full-screen lightbox, not the thumbnail:

| Display site | Size | Constrains the cap? |
|---|---|---|
| PhotoGallery lightbox / PhotoLightboxModal | full screen, `contain` | **yes** — the largest use |
| PhotoGallery thumb | 96×96 `cover` | no |
| Tasks FlagCard thumb (`size.thumb`) | 80×80 | no |
| map callout / list-row thumbs | ≤ ~64px | no |

2048px on the long edge stays crisp full-screen on the largest phones (~1290×2796 physical) with legibility headroom for barrier evidence, while cutting a 12 MP (~4000px) camera original to ~¼ the pixels. Alternatives offered to Sky: 1600 (leaner) / 2560 (max-quality). **2048 chosen.**

### Guard test — GPS gone from the FINAL EMITTED file, WITH resize in the same pass
`src/lib/__tests__/flags.test.ts` (+11 tests), reusing the existing `verifyExifStripped` JPEG/PNG fixtures:
- **Integration:** `stripExifNative(bytes, 'jpg', uri, 4000, 3000)` → asserts (1) `manipulateAsync` was called **once** with `actions = [{ resize: { width: 2048 } }]` on the same call that re-encodes (strips), and (2) the fetched-back **emitted** bytes pass `verifyExifStripped` — i.e. GPS is gone from the file that actually gets uploaded, **not merely "manipulateAsync was called."** A guard asserts the gate is real (an APP1/EXIF JPEG is rejected, the clean one passes), so the assertion is not vacuous.
- Portrait `(3000,4000)` → caps the **height** edge. Small `(800,600)` → **no resize** (empty actions — never upscaled). Pure-function coverage for `resizeActionFor` (5) + `scaledCanvasDims` (3), incl. zero/negative/NaN fail-safe.
- The existing no-dims P3 test still asserts `actions=[]` unchanged.

**Honest tags:** unit tests prove the pipeline **structure** (resize action coupled to the strip in one pass; emitted bytes pass the `verifyExifStripped` gate before upload; no original-copy path) — **web-verified** via jest/typecheck/lint. Actual pixel-downscale + native-codec EXIF removal on a real photo, and the resized barrier photo's legibility at full-screen, are **NEEDS-SKY-DEVICE** (the existing D8 device posture).

**CONFIRM B8 CLOSED.**

---

## B5 — Motion hygiene sweep + RM regression net (L4-05/07/08/10/11/12) — **CLOSED**

### Edits (B5's own — every RM branch un-trap-able; each covered by a new test)
- **L4-11 — dead 220ms delay GATED.** `HamburgerDrawer.tsx`: `setTimeout(() => setSubScreen(screen), reducedMotion ? 0 : 220)` (+ dep). Under RM the drawer already snaps closed instantly, so the 220ms wait was dead time for exactly the users who asked for less motion. `setTimeout(fn, 0)` is a genuine next-tick — **not** a falsy-default API — so no falsy-zero trap is introduced.
- **L4-10 — pulse literal TOKENIZED.** New `motion.duration.pulse = 700`; the two `Skeleton.tsx` pulse half-cycles reference it (value-preserving 700→700). Documented as a deliberate off-scale ambient loop.

### Flagged, NOT snapped (brief: tokenize ONLY where value-preserving)
No matching token exists for these, so they are **flagged, never snapped** (snapping to a different value silently retimes the feel):
- **L4-07** `ProfileScreen` tier-bar `duration: 600` (auth-only surface).
- **L4-08** `OnboardingCards` dot spring `{speed:18, bounciness:3}` (near `spring.sheet` but bounciness ≠ 4 → not value-preserving).
- Native map `300/600` (device-tuned camera feel — see native flag).

### L4-12 (350ms) — **ALREADY CLOSED** (discovery)
The 350ms fixed Nearby-select callout delay the review cited (`MapScreen.tsx:2179`) no longer exists — it was replaced by the `retryShowCallout` race-ladder during the uplift (`MapScreen.tsx:159`; comment at :2474 confirms "vs the old single fixed 350ms timeout"). The ladder handles a genuine pin-not-yet-mounted race (the web map recomputes its cluster/pin set on zoom/move-end), independent of motion — **left untouched** (gating it would reintroduce the race it exists to solve).

### The RM regression net (the high-value half — 21 tests, NO overlap with S12/B7)
The motion law (DESIGN.md §8) had **zero test enforcement** — exactly how the falsy-zero trap (L4-01/02) shipped. New coverage over the **enumerable** Animated paths that S12 (web camera) and B7 (native cluster spring) do **not** cover:

| # | Path | File | Asserts under RM | Off-RM |
|---|---|---|---|---|
| 1 | **`useReducedMotion` hook** (the L4-05 named gap) | `lib/__tests__/accessibility.test.ts` (+7) | probe / live-subscribe / unmount / `.catch→false` | mirrors `useReduceTransparency` |
| 2 | **Native map** `animateTo` / `zoomBy` | `PlatformMapNative.reduceMotion.test.tsx` (new, 4) | `animateToRegion(r, 0)` / `animateCamera({duration:0})` | 600 / 300 |
| 3 | **Web** `zoomBy` (the S12 gap) | `PlatformMapWeb.reduceMotion.test.tsx` (+2) | `setZoom(z, {animate:false})` | `{animate:true}` |
| 4 | **Skeleton** loop + pulse token | `reduceMotion.primitives.test.tsx` (new) | no `Animated.loop` (static 0.5) | loops; `duration = pulse` |
| 5 | **Button** / **PressableScale** press | `reduceMotion.primitives.test.tsx` | no `Animated.spring` on press | springs |
| 6 | **PROTECT #7** — no ungated animated `<Modal>` | `reduceMotion.modalGate.test.ts` (new, 2) | static guard: 0 bare `slide`/`fade` literals in `src` | — |
| 7 | **HamburgerDrawer** 220 handoff (B5's own edit) | `reduceMotion.drawer.test.tsx` (new, 2) | scheduled delay `0`, never `220` | `220` |

The **PROTECT #7** guard proves the ~30-strong gated-Modal fleet cannot silently shrink — any future `animationType="slide"` (bare literal) fails CI.

### Native falsy-zero flag (the trap's native analog) — **NEEDS-SKY-DEVICE**
`PlatformMap.tsx:122,136` pass literal `0` to react-native-maps under RM (`animateToRegion(region, 0)` / `animateCamera({duration:0})`) — the shape the web code (S12) deliberately avoids (`{animate:false}`). Whether RN-maps honours `0` as a genuine instant jump or as falsy→its ~500ms default is **device-only**. The new native test **pins the value the app passes (0)**; it does not — and cannot in Jest — prove the native renderer treats 0 as instant. **If the device shows a default-length animation under RM, the un-trap fix is a non-falsy sentinel (`reducedMotion ? 1 : N`), mirroring S12.** Not changed blind (would risk retiming feel without verification).

**Device-only (never claimed covered):** native map motion feel, the library `LayoutAnimation.spring` amplitude (B7 covers the prop gate, not feel), OS Modal transition feel, iOS spring feel.

**CONFIRM B5 CLOSED.**

---

## CLOSE-OUT LEDGER — the bench tier (B1–B11) is COMPLETE

| Item | Theme | Status | Where |
|---|---|---|---|
| **B1** | Points flash lies on anon triage (L3-4) | **FORK #2 — surfaced, never built** | UI-suppression is a bench-able **S**; the real fix is a Sky-applied `IS DISTINCT FROM` migration + the CLAUDE.md doc-drift correction (teaches 5/2/10/5 vs live 10/3/15/7). Open for Sky. |
| **B2** | Retire 7 UI emoji for Lucide (L2-9) | DONE | bench/1-housestyle |
| **B3** | Wear the Wayfinder mark (L8-8) | DONE | bench/1-housestyle |
| **B4** | Unify modal material — 9 sheets (L2-5) | DONE | bench/3-material |
| **B5** | Motion hygiene + RM regression net (L4-05/07/08/10/11/12) | **DONE** | **bench/4-quality** |
| **B6** | Light bulk-sheet ghosting (L2-6) | CLOSED no-fix (Sky D10) | bench/3-material (evidence) |
| **B7** | Heat companion + iOS cluster-spring gate (L7-11/L4-03) | DONE | bench/2-honesty |
| **B8** | Photo resize on ingest (L7-05) | **DONE** | **bench/4-quality** |
| **B9** | Offline data-age + Home refresh-fail (L7-02) | DONE (FORK #4 open) | bench/2-honesty |
| **B10** | Web locate-failure outcome (L7-07) | DONE | bench/2-honesty |
| **B11** | Dead-styles / ctaFill / ≥500 sweep (L2-12/13/10) | DONE | bench/1-housestyle |

**Tally:** 9 built (B2/B3/B11 · B7/B9/B10 · B4 · B5/B8) + B6 closed-no-fix + B1 forked-to-Sky = **all 11 resolved.**

### Cross-tier discoveries (each marked closed / forked / open-for-Sky)
- **BENCH-1:** `CATEGORY_ICONS` dead export (`flags.ts`) — *open, recommend delete*; `searchClearText` dead style (`SearchInputRow.tsx:119`) — *open*; `blocked_path` per-template icon collision (⛔/🚗 share the category) — *open for Sky's eye*.
- **BENCH-2:** heat "no zones" copy is Sky-tunable — *open*; native `fitToCoordinates` cluster-expansion leg (L4-02-native) — *device-deferred*.
- **BENCH-3:** secondary list-modal tier left opaque (a later "whole overlay" pass) — *deferred*; Nearby-glass reverts cleanly if Sky prefers opaque — *open*; map-sheet blur cost → `forceEngineered` if perf regresses — *device-deferred*.
- **BENCH-4:** L4-12 350ms delay **already-closed** (retryShowCallout) — *closed*; `OnboardingCards` re-implements RM detection locally instead of `useReducedMotion()` — *open, optional unify*; native `PlatformMap` falsy-zero — *NEEDS-SKY-DEVICE*; off-scale `600/300`/onboarding-spring literals — *flagged, left un-snapped*; web resize parity — *shipped in B8*.

### Forks open for Sky
Fork 2 (B1 points-economy + doc drift), Fork 4 (B9 guest cache-scope), Forks 1/3/5/6, taste forks 7 (`stagePoolB`), 8 (dark saved-place chips), 9 (`ui/Button` adopt-or-remove).

### Device gates — all converge on the ONE EAS TestFlight build (D0)
B8 resized-photo legibility · native falsy-zero (0 vs default) · native map feel · D9 ≥500 haze (B11-C) · D10 true-blur (B6/B4) · iOS cluster-spring amplitude (B7-B) · review D1–D11.

---

**Next initiative:** with the bench tier complete, the next step is the UI/design-refinement audit meta-prompt.
