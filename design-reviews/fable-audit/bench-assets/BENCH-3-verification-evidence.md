# BENCH-3 — Material Unification · Verification Evidence

**Branch:** `bench/3-material`, stacked off the BENCH-2 tip `1682a69` (`bench/2-honesty`). **STOPPED on branch — not merged, not pushed, not built.** Sky merges; one build carries the tier.
**Model:** Opus 4.8, max effort. Arbiter tier: `contrast-check.mjs` decides, not the eye.
**Members:** B4 (Unify the modal layer on one material, L2-5) · B6 (Light bulk-sheet ghosting, L2-6 — device-gated).
**Date:** 2026-07-07.
**Authority:** `2026-07-04_AccessMap_Design_Review.md` (L2-5 @ `02_findings.md:385`, L2-6 @ `:392`; B4/B6 @ `03_improvement-slate.md:610/612`).

---

## Gate status

| Gate | Baseline (`1682a69`) | Final (HEAD `0445efb`) |
|---|---|---|
| `tsc --noEmit` | 0 errors | **0 errors** |
| `eslint src` | 0 errors / 77 warnings | **0 errors / 77 warnings** (no new) |
| `jest` | 1826 pass / 0 fail / 84 todo | **1826 pass / 0 fail / 84 todo** |
| Arbiter — `bench3-material-stacks.json` | (new) | **exit 0 · ALL PASS (26 pairs, 13 light + 13 dark)** |
| Arbiter — 4 shipped proof-sets (260 pairs) | 4× exit 0 | **4× exit 0** (no regression) |

**Diffstat vs `1682a69`:** 11 files, **+200 / −52**. Source: the 10 modal/scaffold files + 1 test-mock line. No glass token, no floor, no `theme.ts`/`GlassSurface.tsx`/`ThemeContext.tsx` touched.

**Commit set (linear off `1682a69`):**
- `3c3d960` B4a — opt-in `glass` prop on the Sheet scaffold + flip Changelog
- `5d659f5` B4b — bulk-glass host-family siblings Help + MyFeedback
- `d513c3e` B4c — bulk-glass guest Map sheets Legend / AddressSearch / SavedPlaces / FilterPresets
- `fe9fe80` B4d — bulk-glass ReportFlagModal (PROTECT-3)
- `0445efb` B4e — bulk-glass Nearby list pageSheet (PROTECT-1; Sky device pick D10)

Rollback anchor: `1682a69`.

---

## B4 — Unify the modal layer on one material (L2-5) — **CLOSED**

**Classification (verify-first).** The finding's two-materials split is **DRIFT**, not a host-vs-peek hierarchy: at HEAD the full-screen form hosts (Report, Nearby) AND the floating sheets (Help, Legend, …) were *all* opaque, while only About + Feedback wore bulk glass. So there was no deliberate opacity tier to preserve — the whole opaque set is un-migrated drift. The one arguable deliberate split (NearbyFlagsModal as a screen, not a sheet) was surfaced to Sky, who chose to glass it (device pick D10).

**What changed — 9 sheets adopted `GlassSurface variant="bulk"` (the ratified 0.85 recipe), consumers-only:**
- **Scaffold (B4a):** added an opt-in `glass` prop to `src/components/ui/Sheet.tsx`. Default `false` renders the existing opaque card byte-identical, so every non-glass consumer + the backdrop's `accessibilityViewIsModal`/`testID` is unchanged (`sharedModalsContext.test` green). ChangelogModal flips to `glass` (its body is all opaque `releaseCard`s → no re-ink).
- **Host-family siblings (B4b):** HelpModal, MyFeedbackModal — container→GlassSurface + shared up-shadow wrapper; Help's on-glass empty-search helper re-inks. This closes the "two products from one header button" finding (Feedback was already glass).
- **Guest Map sheets (B4c):** LegendModal (GlassSurface wrapped *inside* its tap-swallow Pressable so backdrop-dismiss is preserved), AddressSearchModal (e3 shadow via wrapper), SavedPlacesModal, FilterPresetsModal.
- **ReportFlagModal (B4d, PROTECT-3):** material only. The KAV/88%-cap, the sticky opaque footer, the five 44pt severity buttons, and the anon banner are **byte-identical**. Six on-glass inks re-ink.
- **NearbyFlagsModal (B4e, PROTECT-1):** GlassSurface fills the pageSheet edge-to-edge; the SafeAreaView rides transparent on top so the one-breath SR labels, tab chips, 44pt controls, and reset-on-close are **byte-identical**. Only the empty-state subtitle re-inks.

**On-glass re-inks** map every muted body/label/counter to `inkGlassMuted` (`#414B5A`/`#B8BEC9`) and add the ≥500 on-glass weight (`font.family.bodyMedium`, GLASS §2). Titles stay `textStrong`; links resolve to `#0F53BE`/`#84AEF6` (== the arbitrated select ink). **No new token invented** → `theme.ts` untouched.

**Arbiter result (`bench3-material-stacks.json`, exit 0 — declared == shipped):**
- **sheetHost** (Help/Changelog/MyFeedback over app content, W1 chaotic worst case): title 11.24:1, muted 6.24:1 (light).
- **sheetMap** (Report/Legend/AddressSearch/SavedPlaces/FilterPresets/Nearby over map tiles+heat, map-stacks regime): title 11.24:1, body `#333` 8.93:1, muted 6.24:1, link `#0F53BE` **4.95:1** (light) / `#84AEF6` 5.42:1 (dark) — the tightest on-glass pairs, both clear AA.
- Self-contained pins (material-independent, re-declared for completeness): CTA white-on-`#1466E0` 5.24:1; severity ink-on-fill 4.79–11.03:1.
- **Four shipped proof-sets STAY 4× exit 0** — B4 regressed nothing.

**Tags:** contrast = `web-verified` (arbiter). True gaussian-blur frost feel over the live/moving map = **★ NEEDS-SKY-DEVICE** (Chromium `backdrop-filter` ≠ native i=24; preview is Chromium-only). Native pageSheet blur behind Nearby = **★ NEEDS-SKY-DEVICE**. Submit-button glow under the card's new `overflow:hidden` = clip-safe by math (glowBrand radius 16 + offset 6 ≈ 22px < the footer's `spacing.xxl` bottom inset) — confirm on device.

**CONFIRM B4 CLOSED:** ✓ 9 sheets on one material · ✓ arbiter exit 0, declared == shipped · ✓ 4 shipped proof-sets exit 0 · ✓ PROTECT-1/3/8 content byte-identical · ✓ green gates.

---

## B6 — Light bulk-sheet ghosting (L2-6) — **CLOSED (no-fix, Sky device read D10)**

Sky read the light bulk sheet on-device and confirmed it reads clean as-is; every ink already passes the arbiter. Per the rails, B6 takes **no code change**.
- **Verify-first:** `git diff main..HEAD -- src/theme.ts src/components/ui/GlassSurface.tsx src/theme/ThemeContext.tsx` = **empty** across the whole stack → the light-bulk material (`glassBulkFloor 0.85`, `glassBulkSpecular 0.80`, `glassBulkLite0/1 0.95/0.90`, `intensity.bulk 24`) is byte-identical to what shipped, before B4.
- **Post-B4 proof:** the same diff is still empty at HEAD `0445efb` → B4 moved no bulk-material byte, so Sky's device read stays valid.

**CONFIRM B6 CLOSED-no-fix:** ✓ light-bulk material byte-unchanged (pre and post B4) · ✓ no floor raised, no scrim added, no glass token touched · ✓ D10 device pick preserved. Any future floor change MUST re-run `contrast-check.mjs` (GLASS §7.1).

---

## PROTECT list — no regressions

- **PROTECT-5 (contrast-arbitration system):** `GlassSurface.tsx` DO-NOT-EDIT — untouched; the four shipped proof sets re-verified 4× exit 0 (260 pairs); the arbiter decided every new ink.
- **PROTECT-3 (ReportFlagModal architecture):** KAV-at-backdrop, 88% cap, sticky 44pt footer, five 44pt severity buttons — byte-identical; only the card material + 6 on-glass inks changed.
- **PROTECT-1 (Nearby accessible twin):** one-breath SR row labels, role=tab chips + counts, 44pt controls, filter-reset-on-close — byte-identical; material only.
- **PROTECT-8 (anonymity honesty set):** the Report anon banner (`brandSofter`/`brandOnSoft`, alert node with the Sign-in link outside it) — text + tokens byte-unchanged, and re-arbitrated here (6.33:1 light / 8.51:1 dark). The MapScreen honest-arrival banner (solid) + "Showing N flags" pill (row glass) — NOT re-glassed; byte-asserted via `git diff` (not in this branch's changed files).
- **PROTECT-4 (severity grammar):** the calibrated ramp + `textOnColor` fork — untouched; re-declared in the proof-set for completeness.
- Glass tokens + arbitrated floors, box-none map-overlay gesture law, virtualization, native-marker discipline — untouched (B4 changed no map-overlay chrome, no store/query/schema).

**Fork discipline:** UI/read half only. No DB / schema / RLS / trigger / query-scope change; no external send; no autonomous mutation.

---

## Flags for Sky

1. **Device gate (D10 + material feel):** the arbiter proves every ink; the true i=24 gaussian frost over the live map (Report/Legend/AddressSearch/SavedPlaces/FilterPresets/Nearby) and the pageSheet blur behind Nearby are **web-approximated only** → confirm the frost reads as cohesive luxury (not bleed-through) on device, and that the Report submit-button glow isn't clipped.
2. **Map-sheet blur cost:** the six Map sheets ship **live blur** (matching the Feedback exemplar), each = 1 live pane over the forceEngineered map chrome (well under `maxLivePanes 12`). If on-device perf over moving tiles regresses, the fix is `forceEngineered` on those sheets (still declared at the conservative 0.85 floor) — a one-prop change, no arbiter delta.
3. **Nearby (device pick D10):** glassed per your call. It's a pageSheet, so the frost is subtle (behind the opaque header/chips/cards); if you'd prefer it stay an opaque screen, B4e reverts cleanly on its own commit.
4. **Secondary list modals left opaque (named-scope decision):** MyReports, MyWatched, StatusHistory, ActivityFeed, Achievements, NotificationPrefs — a later pass if you want the *whole* overlay tier on one material.

---

## Artifacts
- Proof-set: `design-reviews/fable-audit/tools/bench3-material-stacks.json`
- Banked arbiter run: `design-reviews/fable-audit/assets/arbiter/rerun-bench3.txt` (+ the 4 shipped `rerun-*.txt` re-verified exit 0)
- Modal board (light/dark) for Sky's eye: `design-reviews/fable-audit/bench-assets/` (see BENCH-3-modal-board)
