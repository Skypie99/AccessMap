# Tasks Liquid-Glass Elevation — Pass 1: The Material Lab (Direction Report)

**Date:** 2026-07-02 · **Pass:** read-only design lab (zero app code touched) · **Branch read:** `fix/visual-sweep`
**Live mockups:** `/Users/skypie/AccessMap-material-lab/2026-07-02/` (outside the repo, on purpose)
**Status: COMPLETE.** Built, AA-verified (scripted), perf-proxied, board assembled — and now **adversarially gate-checked** (three independent checkers, 1.4M tokens of hostile auditing, one real blocker caught and fixed) **+ blind-squint-judged**. Full verdicts in §10 (the addendum).

---

## 1. TL;DR + Recommendation

Three genuinely different liquid-glass material systems for the whole Tasks screen are live, scrollable, and fully gated: **A · Cast Light** (zero live blur — glass painted with light), **B · Canopy** (ONE real blur pane over the chrome; everything scrolls beneath it), **C · Deep Field** (true blur everywhere it earns it — the measured ceiling). All three pass every WCAG-AA pair by script (73 pairs each, light + dark), all three scroll at 60fps in the web proxy, all three ship designed reduce-transparency states.

**My recommendation: B · Canopy.** It buys the most *felt* liquid glass per unit of risk: one real pane that the entire list visibly frosts beneath — unmistakable the moment you scroll — while the cards stay calm porcelain (your restraint anchor). Its blur cost is O(1), not O(rows); it maps 1:1 onto the existing `GlassSurface`; Android degrades gracefully to A's engineered chrome. **A** is the safe, zero-risk beauty — but it's the closest to the before at a squint, and this pass exists because the app doesn't look different enough. **C** is the most breathtaking and the most honest about its costs: its row-blur personality is iOS-only and carries the one real perf question. If you fall for C, the pre-approved fallback is **C-lite** (B's architecture wearing C's richer stage) — that dial is yours in §7.

**You choose by eye.** One command:

```bash
cd /Users/skypie/AccessMap-material-lab/2026-07-02 && python3 -m http.server 8090
```

then open **http://localhost:8090/** — the hub links the board and all three live pages. **Scroll them. Liquid is judged in motion.**

---

## 2. How to view the lab

| What | URL (server running per command above) |
|---|---|
| Hub | http://localhost:8090/ |
| **The choice board** (before + 3, light/dark/fallback strips) | http://localhost:8090/board/board.html |
| A · Cast Light — live hero | http://localhost:8090/candidate-a-cast-light/hero.html |
| B · Canopy — live hero | http://localhost:8090/candidate-b-canopy/hero.html |
| C · Deep Field — live hero | http://localhost:8090/candidate-c-deep-field/hero.html |
| Material swatch close-ups | `candidate-*/swatches.html` per candidate |
| Content-under-chrome proofs | `candidate-*/under-chrome.html` per candidate |

Every hero page has a control strip (outside the phone) toggling **dark · reduce-transparency · reduced-motion · 320 · ×1.6 type · select-mode · empty · loading** — each is a designed state, not an afterthought. Judged in Chromium; **true blur *feel* on device is NEEDS-SKY-DEVICE** (§9).

---

## 3. The before (honest baseline)

Captured live from the running app (expo web, guest mode, real Supabase data, 375×812 light+dark): `assets/2026-07-02_material_lab/before-light-375-top.png` / `before-dark-375-top.png`.

**Exact data (SAME-DATA rule):** 4 real flags (1 open "Blocked path" sev-4 + 3 verified), zero photos, captured verbatim off the wire and tiled ×N to 50 rows for the scroll demo. Every candidate renders the identical array — **material is the only variable.**

**Baseline read:** clean, disciplined, completely flat. One grey-blue wash; a monoculture of identical `#eef1f5` pills (search, chips, sort, buttons — nothing ranks above anything); white slab cards with a 6%-opacity whisper of shadow. Competent, legible, and utterly generic — the editorial type is doing all the work and the surfaces contribute nothing. Dark mode is the same composition in grey-on-black. Forgettable at a squint — which is the problem this lab exists to solve.

**Found in passing (pre-existing app defects, chips filed):**
1. **Dark-mode FlagCard title is near-invisible** (dark text on dark card — the description themes correctly, the title doesn't). Visible in the before-dark capture.
2. **SeverityBadge white text fails AA on severities 2–4** (#F0A030 ~2.1:1, #F2792B ~2.5:1, #E85638 ~3.4:1 vs the 4.5 floor). All three candidates fix it with the sev-1 ink `#0F1B2D` — measured in their tables.

---

## 4. The candidates

Common to all three: FlagCard composition untouched (the locked 6 elements + tiered compact action row) · type scale untouched · tab bar untouched (i=24 frost is the harmonization anchor) · elevation tier order preserved (stage < rows e1 < chrome < overlay) · section headers stay type-only · no text under 12pt/500-weight on glass · reduce-transparency = designed opaque state · **zero new dependencies** — everything maps to expo-blur + expo-linear-gradient + an extended `GlassSurface`.

### A · CAST LIGHT — *zero live blur*
> Glass as a **rendered** material: every highlight painted by one fixed light source ("north light, upper left"). Translucency runs down to the stage, never over content. Feels like: Linear's panels / a product-render of etched glass.

- **Stage:** vertical `#ECF3FD → #F5F8FD → #FBFCFE` + one elliptical white light pool at (20%, −5%). No noise — A is the crisp one. Dark: `#10131A → #121214` + a faint `#A8C0E0`-derived pool (luminosity, not shadow).
- **Rows:** `rgba(255,255,255,0.76)` over the stage + specular top hairline `rgba(255,255,255,0.90)` + 14px inner highlight + e1. The stage subtly shifts each row's tone by scroll position — glass without a single blur.
- **Chrome:** near-opaque gradient panel (retuned 0.95→0.90 during the AA pass) ending in a **32px feathered dissolve** (widened from the brief's 16px during build — softer content hand-off, no AA impact; the RN build contract inherits the shipped numbers) — content slides under a fade, not a pane edge. **Banner:** brandSoft-as-glass 0.75. **Bulk bar** 0.94 + specular.
- **Dark:** luminous steel-blue edge hairlines (`rgba(168,192,224,0.22–0.35)`) + inner glow; shadows retired. Verified in captures — and its dark card titles are properly white (better than the live app).
- **Blur budget: 0.** **RN mapping:** `GlassSurface mode:"engineered"` + `edge` prop; new `ScreenStage` (LinearGradient + one SVG radial — react-native-svg already in the repo). **Android: pixel-identical — A's trump card.**
- **Gates:** AA — **73/73 PASS** (`candidate-a-cast-light/contrast-result.txt`; forks: eyebrow ink `#566274` on chrome, sev-2–4 ink, dark active-chip ink `#0B1524` on `#4E89EF` — A darkens *ink* on dark brand). Perf proxy: **p95 16.7→17.6ms, 0 long frames**. On-paper RN: ~3 composited quads/row ≈ today's solid cards. **Risk: LOW.** Effort: **S**.

### B · CANOPY — *hybrid: one shared pane* ★ recommended
> ONE real pane of glass — the chrome canopy — and you live *under* it: cards, badges, and photos genuinely frost as they scroll beneath. Rows stay quiet opaline porcelain so the single blur reads as luxury, not noise. Feels like: iOS large-title frosting / a visionOS window's chrome.

- **Stage:** `#F7FAFE → #F8FAFC` + a radial brand pool `rgba(20,102,224,0.10)` parked exactly under the chrome (so the frost has something to eat) + 2% fractal noise. Dark: `#101318 → #121214`, pool `rgba(78,137,239,0.10)` — the canopy glows from behind.
- **Chrome:** full-width true-blur canopy (≈ expo-blur **i=24**, same as the tab bar), floor tuned `0.80 → 0.85` *by the contrast script*, luminous pane bottom-edge (white glow over `rgba(20,60,120,0.08)` line). The mid-scroll captures show cards visibly frosting under it — the money shot.
- **Rows ("opaline"):** micro-gradient `0.92 → 0.84`, hairline, **no** inner glow (the canopy carries the story), e1. **Banner:** *pre-frosted* — a static frost simulation (brandSoft + 3% noise + top sheen) that scrolls for free. **Bulk bar:** the second, conditional true-blur pane (select mode only).
- **Blur budget: 1 always + 1 conditional** (+ existing tab bar). **RN mapping:** `GlassSurface variant: "chrome" | "row" | "banner" | "overlay"` presets; `TabBarGlass` can later collapse into `variant="chrome"`. **Android:** canopy degrades to A-style engineered chrome by default; single-pane `dimezisBlurView` is a Sky fork (§7).
- **Gates:** AA — **ALL PASS** (`candidate-b-canopy/contrast-result.txt`; forks: canopy floor 0.85, `ink.onGlassMuted #4A5361` eyebrow). Perf proxy: **p95 17.6ms, 1 long frame** (max 33ms once). On-paper RN: blur cost is O(1) — one static UIVisualEffectView spanning ~180pt; exactly the pattern every stock iOS header uses. **Risk: LOW-MED iOS (canopy *feel* NEEDS-SKY-DEVICE), LOW Android.** Effort: **M**.

### C · DEEP FIELD — *maximum, the measured ceiling*
> True material everywhere it earns its cost: rows are real panes floating in a luminous field. Exists to measure the ceiling honestly. Feels like: visionOS Control Center / iOS-26 liquid glass.

- **Stage** (richest — blur is invisible over a flat wash): diagonal `#E7F0FD → #F6F9FE → #F1F5FB` + brand pool `rgba(46,124,246,0.12)` top-left + counter-pool bottom-right + 2.5% noise. Dark: `#0E1220 → #14151A` + glowing brand pool — the field itself is the light source.
- **Rows:** true blur ≈ **i=12**, floor `rgba(255,255,255,0.70)`, specular hairline, minimal e1. What rows blur is the stage's pools and noise sliding beneath. **Chrome:** true blur i=24, floor 0.75 — the most see-through of the three (its under-chrome ghosting is gorgeous and honest). **Banner:** a *scrolling* BlurView i=12 (explicitly costed). **Bulk bar** i=24.
- **Blur budget: ≤12 concurrent panes** (~9–10 visible rows + chrome + banner), enforced with `windowSize` + `removeClippedSubviews`; spec token `glass.maxLivePanes = 12`.
- **RN mapping:** the same extended `GlassSurface` (`variant="row"`, i=12) — C is a *configuration*, not a new primitive. **Android: rows/banner always engineered — "C-on-Android = B", stated plainly: C's full personality is iOS-only.**
- **Gates:** AA — **ALL PASS** (`candidate-c-deep-field/contrast-result.txt`) with the most interesting forks, all script-arbitrated: `ink.glassMuted #414B5A` (the `#707070` eyebrow measures 2.69:1 over worst-case chrome — killed), `ink.onStage #525C6B` (section headers over the pool's darkest point), select-ink `#0F53BE`, and **Verify-fill pinned mode-independent `#1466E0`** (dark brand `#4E89EF` + white = 3.4:1 — fails; a finding that matters beyond this screen). Perf proxy: p95 17.7ms, 1 long frame — Chromium absorbs 50 backdrop-filter rows, which is directional but **not** RN evidence. On-paper RN: effect-view mount/unmount thrash in virtualized cells is the known killer. **Risk: HIGH pending Sky's device test** — K3 pre-authorizes folding to **C-lite** (B's architecture + C's stage/floors). Effort: **L**.

**Squint identities:** A = warm printed page with bright card edges · B = frosted band over a cool pool · C = luminous blue field with floating panes.

---

## 5. The board + squint test

- **Choice board:** `board/board.html` — before + three candidates side by side: light top, light mid-scroll (content-under-chrome), dark, dark mid, reduce-transparency. Copies in `assets/2026-07-02_material_lab/`.
- **Squint strip:** `assets/2026-07-02_material_lab/squint-labeled.png` — phone-scale thumbnails, bezel/status-bar tells cropped out so only material differentiates. An **unlabeled** shuffled version exists for the blind judge (`board/squint-strip.png` + sealed order file); the judge's blind read lands in the addendum.
- My non-blind read, for what it's worth: B and C are unmistakable at thumbnail size (B's frosted band + pool; C's luminous field). A differentiates by air and banner more than by material — the honest risk with A is precisely the K2 question.

---

## 6. Tradeoffs matrix

| | A · Cast Light | B · Canopy ★ | C · Deep Field |
|---|---|---|---|
| Boldness | quiet luxury | confident, felt glass | maximum statement |
| "Finally looks different" | at close range; subtle at squint | yes, on first scroll | yes, at a glance |
| Perf headroom | infinite (0 blur) | huge (O(1) blur) | the open question (≤12 panes) |
| Android grace | pixel-identical | graceful (engineered chrome) | = B (rows never blur) |
| Dark grace | verified, edge-lit | glowing canopy | luminous field |
| iOS-only personality? | no | no | **yes** (rows) |
| Sky device test needed | no | feel-check only | **required before commit** |
| Build effort | S | M | L |

---

## 7. DECISIONS FOR SKY

1. **The pick** — A, B, or C (or C-lite = B's blur architecture + C's stage/floors). Choose on the board, by eye, in motion.
2. **Stage intensity dial** — every candidate's stage can be turned up/down ~30% without re-gating (the AA floors were measured at the *darkest* stop). Want B with C's richer field? That's C-lite.
3. **Banner treatment** — engineered tint (A) / pre-frosted static (B) / true scrolling blur (C). Independent of the main pick.
4. **Section-header weight** — all three kept them type-only (restraint). Option: add a hairline rule or count-pill glass in the Build pass.
5. **Empty-state art direction** — all three currently reuse the row material at radius 20. Option: a stage-lit "spotlight" treatment in Build.
6. **`ui/Button.tsx` adopt-or-remove** — zero call sites app-wide. Material-relevant now: the winner's Build pass will touch every action pill on this screen. *Recommendation: adopt* (it's the clean 44pt reference and its gradient-self-round pattern matches DESIGN.md §12); adopt-in-place during the Build pass, else delete it to stop the drift.
7. **Android canopy fork (B/C)** — ship engineered-chrome degradation (default, safe) or enable `experimentalBlurMethod="dimezisBlurView"` on the single static canopy only.
8. **C's device test** — if C (or its stage) tempts you: one TestFlight-free check is possible in Expo Go on your iPhone; say the word and the Build pass starts with the 50-row device demo before any commitment.
9. **Dark-brand ink policy** — A darkens the ink on dark-brand fills (`#0B1524` on `#4E89EF`); C pins the fill mode-independent (`#1466E0` + white). Both pass; they feel different. The winner's spec adopts one **app-wide** rule.

---

## 8. Build-contract skeleton (for the winner's Build pass)

1. `contrast-check.mjs` (shipped in the lab, reusable) passes against the **shipped** token values — the mock's passing floors ARE the spec.
2. **Zero new dependencies** in package.json diff.
3. `GlassSurface` extended (`mode`/`variant`/`edge` per winner) — **no parallel primitive**; `ScreenStage` is the only new component (A) or none (B/C).
4. Reduce-transparency renders the **designed** opaque state on device (not a smear); reduced-motion kills any added motion.
5. Elevation tier order (stage < rows e1 < chrome < overlay) holds in light, dark, AND reduce-transparency.
6. FlagCard renders the same locked 6 elements before/after (snapshot test) — material-only diff.
7. Max concurrent BlurViews ≤ the winner's budget (0 / 2 / 12), asserted in dev builds (`glass.maxLivePanes`).
8. Android build screenshot shows the *declared* degradation, not an accident.
9. Tab bar block in `RootNavigator.tsx` untouched (git diff clean there).
10. Sky device scroll test on the chosen candidate: 50-row Tasks list, no visible hitching; the dark strip reads as the same material in moonlight.
11. Material fidelity to the LIVE mock at retina scale — the mock is the contract, swatches are the per-surface spec.
12. Stage portability documented: the winner's stage recipe stated for Map / Home / Profile (application map below).

**Application map (how the winner generalizes):** Map's five existing `GlassSurface` sites (status pill, action bar, filter panel, locating banner, heatmap legend) adopt the winner's chrome/overlay recipes untouched-in-composition; Home's search pill upgrades to the winner's chrome material and Home's wash adopts the stage; Profile adopts stage + row recipes on its cards. The tab bar already speaks this language (i=24 + floor) — B literally unifies it under `variant="chrome"`.

---

## 9. Honesty / coverage appendix

- **Blur approximation:** `backdrop-filter: blur(20px) saturate(160%)` ≈ expo-blur i=24 (anchored to the app's own web tab bar CSS); `blur(10px) saturate(140%)` ≈ i=12. Marked via `data-honesty` on every surface.
- **NEEDS-SKY-DEVICE:** true-blur *feel* and scroll smoothness (B's canopy, C's rows), Safari/WebKit rendering, VoiceOver pass. The web perf numbers are Chromium proxies — directional, not RN evidence.
- **Fonts:** mockups embed the app's actual bundled TTFs (Plus Jakarta 700/800, Public Sans 400/500/600, JetBrains Mono 400/600) — a fidelity step up from prior passes' system-font fallback.
- **Data:** 4 real rows tiled ×N to 50 (documented in `before/capture-notes.md`); no photos exist in the real data, so heroes are photo-less (faithful); the photo-under-glass worst case is covered mathematically (floors composited over `#000`) and visually via labeled SYNTHETIC strips in `under-chrome.html`.
- **AA method:** scripted WCAG relative-luminance compositing over worst-case backdrops (chaotic surfaces over `#000`/`#D92D20`/`#0B3D8F`; deterministic surfaces over each stage's darkest stop). Conservative by construction (blur can only average toward lighter than the worst single color).
- **Chromium-only** for all captures; 320/×1.6 states verified as class toggles per hero.
- **Process note / kill log:** no candidate hit K1–K4 kill criteria; C carries the pre-authorized C-lite fold if its device test disappoints. Builders were interrupted twice by session usage caps; all artifacts on disk were independently re-verified by the orchestrator (contrast re-run, perf re-run, fresh captures). Two builder-side defects were found and fixed post-mortem: C's header title wrapped (nowrap + the app's 6px action gap restored — geometry, not material) and the tab badge count drifted between candidates (aligned to 13). ⏳ **Addendum pending:** per-candidate adversarial gate-check + blind squint-judge read (fresh agents, queued behind the usage-cap reset; will be appended with verdicts and any rework).

**Assets:** `qa-reports/assets/2026-07-02_material_lab/` (board strips, squint strips, before + candidate captures). Full lab incl. live HTML: `/Users/skypie/AccessMap-material-lab/2026-07-02/`.

---

## 10. ADDENDUM — adversarial verification + the blind squint read

Three fresh-eyes gate-checkers (one per candidate, instructed to *break* the work, not bless it) + bounded rework loops + a blind judge. 12 agents, 354 tool calls. Every checker independently re-ran the contrast script, re-measured scroll perf, took its own screenshots of all eight states, and audited declared-vs-shipped values.

### Gate verdicts

**A · Cast Light — REWORK → fixed → clean.** The checker caught a real blocker everyone (builders, two rework loops, and me) had missed: the etched **"Resolved" pill never received its declared ink** — `stacks.json` declared `#333`/`#ddd`, but no CSS rule applied it, so it rendered browser-default black in both modes ≈ **1.5:1 black-on-near-black in dark mode** on the lead action of every verified row. A textbook declared-but-not-shipped catch. *Resolved by the architect post-escalation:* one CSS line (`.act.etch span { color: var(--c-text); }`), computed-style verified (`#333` light / `#ddd` dark), contrast script re-run (exit 0), dark captures re-shot and visually confirmed. Checker's verdict otherwise, verbatim: *"architecturally sound and honest… at retina scale the material genuinely reads as rendered glass: crisp specular top hairline, 14px inner light wash, luminous dark-mode edges with shadows properly retired."* K1 PASS (complete pair list, conservative floors) · K3 **CLOSES, LOW risk** (grep-verified zero blur; p95 17.6ms) · K4 PASS ("a designed state, not a broken smear"). Logged minors: dissolve shipped 32px vs brief's 16px (now reconciled in §4); light chrome zone is A's quietest delta at squint (optional polish fork).

**B · Canopy — PASS.** One rework (44px sort-chip floor, fixed in-loop), then: *"I tried hard to break Canopy and couldn't find anything above a minor."* K1 PASS (all 67 pairs re-verified) · K3 **CLOSES** (p95 17.5ms; blur budget confirmed: exactly one always-on pane + one conditional) · K4 PASS (runtime-probed designed state). Its four remaining minors were documentation-integrity nits — a 0.06-vs-0.07 sheen value and a true-worst-case declaration — *all fixed and re-verified*: the shipped values now match the declarations exactly, and the newly-declared dark-row worst case measures **6.56:1 / 6.80:1 PASS**, matching the checker's independent recomputation to the decimal.

**C · Deep Field — PASS.** One rework (fs160 title combo, fixed in-loop). K1 PASS (all pairs re-run) · K3 **closes on paper** — with the honest framing that C's web proxy rides *at* the frame budget rather than under it, and the real verdict remains NEEDS-SKY-DEVICE · K4 PASS both modes. Minors: five skeleton cards were missing honesty tags (*fixed — all six now tagged*), and a title mid-word-break note logged for the eventual RN build (composition locked, so mockup untouched).

### The blind squint read (K2 / K5) — the honest part

The judge saw ONE image: four unlabeled 90px thumbnails (top-of-screen, bezels/status-bars cropped), order sealed as **C · before · A · B**. The result was the most useful failure of the pass:

- **The judge could not identify the before** — it guessed position 1 (which is actually Deep Field) and described the real before as "the most systematized — crisp hairline-bordered white card."
- **It called A "a near-clone" of C at this size** and flagged `threeDistinctPersonalities: false` — while singling out **position 4 (Canopy) as "the airiest,"** the one clearly distinct thumbnail.

Said plainly, as the brief demands: **at static, top-of-screen, phone-scale thumbnails, no candidate screams "different" — and A and C's chrome zones converge with each other.** Three caveats keep this from being a kill: (1) the strip crops to exactly the zone where A is *deliberately* quietest and C's field is least visible — the material identities live at mid-scroll and in motion (canopy frosting, row translucency), which all three checkers independently confirmed at retina scale; (2) C's banner wraps to two lines in the thumbnail, a layout tell that made it read "cramped/before-like"; (3) a 90px static crop cannot show blur, which is two of three candidates' entire thesis. **What survives the caveats: the squint result independently reinforces the §1 recommendation — Canopy is the candidate whose difference survives even a hostile thumbnail.** If you pick A, take its optional chrome-polish fork (§7.2 stage-intensity dial or the checker's etch-depth bump) so the top zone earns its keep at a glance.

### Cross-candidate note, ratified in practice

All three candidates fork the severity-badge ink (sev 2–4 white → `#0F1B2D`) because the script proved the live app's white text mathematically unfixable on those fills. You've already ratified this app-side: it shipped tonight as `fix/severity-badge-aa` (commit `92a2be6`, verified live both themes) — the mockups and the app now agree.

### Final proof

- Contrast arbiter: **exit 0 on all three candidates** after every fix (tables regenerated in each `candidate-*/contrast-result.txt`).
- Repo: branch `fix/visual-sweep`, working tree clean; this pass added only `qa-reports/` files (+ the separately-authorized `fix/severity-badge-aa` branch). Zero app-code changes from the lab itself.
- The scheduled overnight run is superseded by this addendum (plan upgrade unblocked the fleet early); if a stray wakeup fires, it will no-op.

**Win condition check:** three live scrollable pages ☑ · real tokens/fonts/data ☑ · AA measured not eyeballed ☑ · perf architecture solved per candidate ☑ · fallbacks designed ☑ · benchmark application map ☑ · zero code touched ☑ (final `git status` proof in addendum) · Sky chooses by eye → **your move.**
