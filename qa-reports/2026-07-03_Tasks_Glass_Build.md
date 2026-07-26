# Tasks Liquid-Glass Elevation — Pass 2: BUILD (Candidate C "Deep Field")

**Date:** 2026-07-03 · **Branch:** `overhaul/tasks-glass` (off `fix/visual-sweep` @ `92a2be6`) · **STOPPED, not merged**
**Commits:** `9758db7` (A: stage + tokens) → `f4e7abc` (B: GlassSurface variants + chrome) → `bcc254f` (C: row material + 50-row sanity) → `f0c47fc` (D: C-lite switch + pin tests + GLASS.md)
**Status: BUILD COMPLETE.** Gates green (typecheck 0 · **1737 passed / 108 suites**, both brittle guards UNEDITED · lint 0 errors / 77 warnings = baseline parity · `npx expo export --platform web` exit 0). Contrast arbiter on SHIPPED values: **exit 0, 100/100 pairs** (66 spec + 34 C-lite mirrors). The screen is Candidate C made real; **waiting on Sky's device gate.**

**DO NOT-list honored:** no merge, no push, no build, no `main`, tab bar untouched, zero data/auth/EXIF/RLS/engine changes, zero handler changes.

---

## 1. Pre-flight record

- `fix/severity-badge-aa` was **already merged** when the pass started — its tip IS `92a2be6`, the HEAD of `fix/visual-sweep` (Sky's prior FF authorization, executed before this session). No action needed; the build agrees with the ratified sev-ink fork.
- Baseline gates on `fix/visual-sweep`: typecheck 0 · 1702 passed / 106 suites · lint 0 errors / **77 warnings** (the plan's "87" was stale — 77 is the real baseline and the shipped branch matches it exactly).

## 2. Contract conformance (the 10 points)

| # | Contract point | How verified | Verdict |
|---|---|---|---|
| 1 | **Material fidelity** to C's live mockup | Stage-by-stage render-compare against `candidate-c-deep-field/shots/final-*.png` (same 4 real flags, same 375×812@2x Chromium method as the lab); final strips in `assets/2026-07-03_tasks_glass/final/`. Stage/pools/grain, chrome frosting, chip tints, row glass, banner, bulk, dark luminosity all read as the mockup. | **PASS** (web); *feel* = device gate |
| 2 | **Blur budget counted** == declared | Source inventory: true blur ONLY via `GlassSurface` variants — chrome ×1 (i=24) + banner ×1 (i=12) + row per visible card (i=12) + empty ×1 + skeletons ×6 (loading) + bulk ×1 conditional (i=24). Only other BlurView in the app = the untouched tab bar. `glass.maxLivePanes = 12` token + `__DEV__` counter (warn-only) + visible-panes framing in GLASS.md §3. 50-row run confirmed default virtualization bounds mounted rows (~34/50 mounted). | **PASS** |
| 3 | **AA on glass, worst-case, declared == shipped** | Shipped tokens ARE the mock's arbitrated values by construction; re-ran `contrast-check.mjs` against `shipped-stacks.json` (C's full 66-pair set — SeverityBadge 1–5, StatusBadge, meta-on-row/selected included — **plus 34 new C-lite engineered pairs**): **exit 0, ALL PASS** (`shipped-contrast-result.txt`). | **PASS** |
| 4 | **×1.6 Dynamic Type holds** | Binding check = jest (`isCompactLayout(390, 1.6) → compact stack`, the M16 reflow) + all type on new surfaces uses tokens/AppText caps (guard Rule 2 active, suite green). Web capture can't set RN fontScale — visual ×1.6 is on the device gate. | **PASS (logic)** / device for visual |
| 5 | **Reduce-transparency designed state + reduced-motion** | Designed RT states per tier (overlay 0.97 + borderStrong; banner → brandSofter + brand; chips → surfaceNeutral; ctaFill stays) implemented in `GlassSurface` + `makeStyles(color, reduceTransparency)`, wired via `useReduceTransparency()` (AccessibilityInfo listener, iOS). Pinned by unit tests (BlurView ABSENT under RT; banner RT fill/border asserted). RM: press sheen + skeleton pulse gated by `useReducedMotion()`. Web can't reach RT — on-device check listed in §6. | **PASS (code+test)** / device for visual |
| 6 | **FlagCard composition locked** | Material-only diff: 6 elements + tiered action row + handlers untouched (fence shows zero handler changes); **the composition pin test the contract required now EXISTS** — `TasksScreenFlagCard.test.tsx`, 17 structural assertions (elements, tiering incl. compact stack + verified-lead, handler wiring byte-identical, select mode, C-lite material swap, ×1.6 threshold). | **PASS** |
| 7 | **Tab bar untouched** | `RootNavigator.tsx` absent from `git diff 92a2be6..HEAD` (13 files, none outside the fence). | **PASS** |
| 8 | **The stage built per C + portability documented** | `ScreenStage` (165° gradient + 2 SVG pools + 2.5% grain, dark = single-pool luminous variant); portability + application map + rollout recipe in GLASS.md §8–9. | **PASS** |
| 9 | **Dark = luminosity-led per the dark strip** | Dark floors lift, edges are `#A8C0E0`-family hairlines, drop shadows retired (bulk up-shadow = the mockup's one deliberate exception); dark captures compare to `final-dark-*.png`. Bonus: the before's invisible dark card title is FIXED (`cardTitle` → `textStrong`). | **PASS** |
| 10 | **C-lite switch present, documented, demonstrably working** | `src/lib/glassMode.ts` (persisted, SR-announced, NOT `__DEV__`-gated) + header long-press 600ms + haptic + flash. **Demonstrated live:** `final/built-light-375-clite-on.png` ("Glass effects: Lite" flash, engineered rows) → `clite-mid` → `clite-flipped-back.png` ("Glass effects: Full"). Defaults to full C. 9 store tests. | **PASS** |

## 3. Defaulted forks (Section-7 — every one a one-line reversible)

1. **Stage intensity** = mockup exact (the dial's ±30% headroom untouched).
2. **Banner treatment** = C's true scrolling i=12 blur (not A-tint / B-prefrost).
3. **Section headers** = type-only, 600 weight, `inkOnStage` (no rule/glass added).
4. **Empty state** = mockup's g-row pane @ radius 20 + 64pt gold disc (gold only for the true "All caught up" branch — F40/F41 logic untouched; neutral disc otherwise).
5. **Drama dial** = mockup default everywhere.
6. **Press sheen** = included (mockup shows it), 120ms, RM/RT/C-lite-gated, linear-wash translation.
7. **Dark-brand ink policy** = C's: `ctaFill #1466E0` MODE-INDEPENDENT (Verify, active chips, bulk Verify) — the candidate app-wide rule; A's darken-the-ink alternative not taken.
8. **Android** = all-engineered ("C-on-Android = B"); `dimezisBlurView` chrome fork NOT taken.
9. **Load-more pill** = chip tint + brand edge + `inkSelect` (mockup has no load-more — interpretation).
10. **Grain blend** = plain-alpha 2.5% (not mix-blend overlay).
11. **`ui/Button.tsx` = LEFT + FLAGGED** (zero call sites; adopt-or-remove is Sky's — lab recommended adopt).
12. **C-lite affordance** = Tasks header long-press 600ms (kept the fence to Tasks files; Settings/About untouched).

## 4. Honesty register — web vs device

- **Blur approximation:** all captures are Chromium `backdrop-filter`; expo-blur has no `saturate()` (i=12/24 only — the mockup's own declared mapping). True material feel = device.
- **Perf is a proxy:** 50-row scroll (real render path, Supabase response tiled ×50 via Playwright interception, zero app-code change): light `p50 16.7 / p95 18.4 / max 33.3ms / 3 long frames` over 10,660px — same band as the mockup's own proxy (17.7/27.5/1), riding AT the frame budget. **NOT RN evidence.** (`stageC/perf-50row-light.json`; the dark run was skipped — same DOM, no new signal.)
- **×1.6 / RT / empty-gold:** ×1.6 visual + RT visual are device-only on RN-web (logic/unit-covered here); the captured empty state is the search-no-match variant (live guest data is non-empty) — the gold branch is code-inspected + logic-untouched.
- **Android degradation:** enforced by an explicit `Platform.OS === 'android'` branch + unit-tested engineered path; no Android screenshot exists (no emulator on this machine) — the declared mapping is code + test, not accident.
- **1px hairline Views** stand in for CSS inset shadows; per-chip specular omitted; sheen is linear not radial (GLASS.md §10 has the full register).

## 5. Evidence inventory

- `qa-reports/assets/2026-07-03_tasks_glass/final/` — built strips: light top/mid/select/empty-search, dark top/mid, 320 top, **C-lite flip trio**. Compare against `…material-lab/2026-07-02/candidate-c-deep-field/shots/final-*.png` (the contract) and `…/before/before-*.png` (the transformation).
- `stageA/ stageB/ stageC/` — per-stage convergence captures (incl. the two caught-and-fixed web bugs below).
- `shipped-stacks.json` + `shipped-contrast-result.txt` — the arbiter proof (exit 0).
- `stageC/perf-50row-light.json` — the honest scroll numbers.
- Capture tooling lives in the lab (`tools/build-capture.mjs`, `tools/perf-scroll-app.mjs`) — outside the repo, on purpose.

## 6. ★ NEEDS-SKY-DEVICE — THE HARD GATE

1. **Real scroll smoothness with FULL C on your iPhone — THE gate.** 50 rows if you can seed them; the real 4-row list at minimum. If it hitches or feels heavy: **long-press the Tasks header title (hold ~1s)** → "Glass effects: Lite" → re-feel. The choice persists; flip back the same way.
2. **True blur/material feel**, light AND dark (dark in a dark room — the field should glow, not glare).
3. **VoiceOver order**: header → notices → select-entry → search → chips → sort → banner → cards; the C-lite flip announces "Glass effects reduced/full".
4. **The 320pt + ×1.6 extreme**: chrome grows, list padding follows (onLayout), action rows stack — no clipped labels.
5. **Reduce Transparency ON** (Settings → Accessibility → Display): every pane goes designed-opaque (banner = soft blue card w/ blue border), zero smears.
6. Pull-to-refresh spinner lands below the chrome, not under it.

**THEN:** Sky merges (`git merge overhaul/tasks-glass` onto `fix/visual-sweep`), and the ONE TestFlight build ships the visual sweep + the glass together, checked against the consolidated device list (this + the sweep's + the EXIF/VoiceOver deferred items).

## 7. Reality-vs-plan deltas (honest notes)

- **Two web-only rendering bugs caught by stage render-compare, fixed in-pass:** (1) RNW ignores `Image resizeMode="repeat"` — the stage grain rendered as one corner tile; web now uses the mockup's exact feTurbulence SVG data-URI (native keeps the PNG). (2) Bare react-native-svg icons are position-static on web and painted UNDER the glass floor (the banner's pin ghosted) — `GlassSurface` variants now force a stacking context (outer `zIndex:0`, material layer `-1`).
- **A mid-build session break left a half-applied Stage-D edit** (the C-lite long-press wrapper opened but unclosed) — metro's TransformError caught it on the next render-verify; closed + gates re-run before anything else. Recovery cost: one fix, no reverts.
- **Doc corrections:** the direction report's "73 pairs" is actually 66 for C (33×2 — `contrast-result.txt` is authoritative); lint baseline is 77 warnings, not 87; CLAUDE.md's "~1575 tests" is long stale (1737 now).
- The lab's `windowSize + removeClippedSubviews` budget-enforcement note was superseded by the task's stronger law (virtualization untouched); GLASS.md records the ratified rule.
- Loading/error/offline notices live INSIDE the chrome pane (the pane's measured height absorbs them); the first-load skeleton state now renders UNDER the chrome (the old early-return was headerless — mockup-faithful now).

## 8. DECISIONS FOR SKY

1. **The device gate** (§6) — the only judgment no agent can render. If full C disappoints → C-lite is one long-press away; the losing mode gets a cleanup commit later.
2. **`ui/Button.tsx`** — adopt (lab's recommendation) or delete; zero call sites today.
3. **Android chrome fork** — all-engineered shipped; `dimezisBlurView` on the single chrome pane remains available if Android ever deserves the frost.
4. Optional later: collapse `TabBarGlass` into `variant="chrome"`; roll Deep Field to Home/Profile/Map via the GLASS.md §9 recipe.

**Win condition check:** stage lit ☑ chrome deep (content visibly frosts) ☑ rows liquid (i=12 panes in the field) ☑ mockup-faithful strips ☑ contrast-proven at shipped values, both modes, exit 0 ☑ RT/Android/C-lite fallbacks designed + working ☑ benchmark written into law (GLASS.md + recipe) ☑ guards unedited, fence clean, gates green ☑ — **waiting only on Sky's thumb on her own glass.**
