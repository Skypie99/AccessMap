# Fable Audit — Contrast Arbiter (re-arbitration + extension) — 2026-07-04

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
