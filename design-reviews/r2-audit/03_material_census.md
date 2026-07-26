# Fable Audit ROUND 2 — AccessMap — Part 2: THE MATERIAL CENSUS

Every post-onboarding surface, classified at HEAD. This file + `04_material_migration_spec.md`
+ `tools/r2-material-stacks.json` are Part 2's complete deliverable set; Part 3 slates from
them alone. Method: code-spine census (every row verified by direct read at HEAD, file:line
cited), corroborated where useful by Part 1's banked render index (`01_feel_render-index.md`)
— no new captures were required for classification. Nothing outside `design-reviews/r2-audit/`
was modified.

## §0 Baseline (the fence) — ADOPTED from Part 1

Part 1's `01_feel_orientation.md` §0 was banked at the SAME HEAD as this run, so per the
pre-flight its fence baseline is adopted verbatim (logged here as the reuse record):

- **Date (Part 2):** 2026-07-10 · **Model:** Claude Fable 5 (`claude-fable-5`), max effort;
  all sub-agents (completeness critic + skeptics) run Fable 5 per Sky's standing directive.
- **HEAD:** `a8549ff3d6d15ed4410b71d803d50a130613d3d0` · **Branch:** `bench/4-quality` —
  verified identical to Part 1's §0 at Part-2 start. HEAD never moved; no branch switched.
- **Baseline markers (re-verified at Part-2 start):** `PHOTO_MAX_DIMENSION` in
  `src/lib/flags.ts` + its test (BENCH-4/B8) ✓ · `src/components/LiveStatusRegion.tsx`
  exists (uplift P5/S10) ✓ · `variant="bulk"` at `src/screens/NearbyFlagsModal.tsx:202`
  (BENCH-3/B4e) ✓.
- **`git status --porcelain` at Part-2 start:** identical in shape to Part 1's §0 —
  ` D .claude/launch.json` (Sky's pre-existing workspace state, left as found) + untracked
  (`??`) lines only: `?? design-reviews/` (now containing the fable-audit bank + the four
  r2 prompt files + Part 1's banked artifacts — all inside the audit fence) ·
  46 × `?? qa-reports/<file>.md` · 9 × `?? qa-reports/assets/<dir>/` · 2 ×
  `?? qa-reports/summaries/` files · `?? supabase/.temp/`. Zero tracked modifications;
  `git diff --stat` empty. Because `design-reviews/` is untracked as a whole, porcelain
  output is IDENTICAL before/after this part — the end-of-part fence check is: no OTHER
  line appears, and `git diff --stat` stays empty.
- **Serve mode (Part 2):** none required for the census (the spine is code + the arbiter).
  The reading test (Stage 2, in `04`) cites Part 1's banked captures, whose §0 records the
  two serve modes — including that **the lucide boundary LIFTS on the static export**
  (Map/Tasks-family renders on the :8082 production bundle, `web-approximated`).
- **`.env` present** (guest anon reads) — never opened, never printed, never created.
- **Fresh run:** `03`/`04`/`tools/r2-material-stacks.json` did not exist at start — no
  resume state. Immutable prior stacks records checksummed at start (MD5, for the
  end-of-part sibling-rule diff-check):
  `audit-stacks.json e4d746fe27bac829d67498dd9c32eeb1` ·
  `p2-material-stacks.json 072c5c7a81f56e54cc092ca5910c5fee` ·
  `bench3-material-stacks.json 396b94ff97e3d71bd2debd214e6fff2c` ·
  `shipped-stacks.json 1437fafd0d55459406f26bdb880b9b4c` ·
  `wave1-stacks.json 31b90284dd85009ee57d5aeabd51bdeb` ·
  `wave2-stacks.json 34736f25f794cbebc282c405f75aa1d1` ·
  `map-stacks.json c2fb955eb64043130f71de7120df4b77`.

## §1 Method + enumeration walk

Walked `App.tsx` (FirstLaunchGate → Gate → RootNavigator; A11yLiveRegion + LiveStatusRegion
mounted above the session branch, FlashBanner inside `SignedInArea` — `App.tsx:103`,
signed-in branch only; Stage-6 correction) → `src/navigation/RootNavigator.tsx`
(3 visible tabs Home/Tasks/Profile, hidden FullMap/Settings/Admin, `SharedModalsHost`,
`DrawerHost`, `TabBarGlass`, the nav-header screenOptions) → every `<Modal` mount in
`src/components/` + `src/screens/` (33 mounts) → every `<GlassSurface` mount (51 real JSX
mounts non-test; 67 textual occurrences incl. 16 comment/docstring mentions — Stage-6
recount corrected the earlier "60") → every `ScreenStage` consumer (5 screens) →
banner/pill/overlay styles per screen. Classification per GLASS.md §2 tiers + the legacy-generation contract in
`GlassSurface.tsx`'s docstring. All line numbers verified at HEAD `a8549ff` by direct read.

Classifications: **liquid-glass(variant)** = Deep Field GlassSurface variant path ·
**legacy-glass** = the no-variant 2026-06-17 GlassSurface generation (byte-stable, i=24
default / overlayGlass floor) · **opaque** = solid token fill, no glass generation ·
**mixed** = one surface carrying more than one material generation · **map-world** = live
tiles as stage (GLASS.md §12) · **media-world** = photo/black-immersive content-as-surface.
Backdrop families: **stage-det** (deterministic: composites over ScreenStage's darkest
stops) · **tile-chaotic** (over live tiles: #000+#FFF+saturants, regime-decomposed) ·
**app-chaotic** (over arbitrary app content/photos behind a scrim: the wave1 `bulkSheet`
worst case) · **photo** (over user photos: #000/#FFF extremes) · **self** (composites over
its own opaque fill — material-independent).

## §2 The census — 57 surfaces

### A. Deep Field stage screens (5)

| ID | Surface | Material mount (file:line) | Entry | Current material | Class | Backdrop | PROTECT | Notes |
|---|---|---|---|---|---|---|---|---|
| M-01 | TasksScreen | `src/screens/TasksScreen.tsx:804` (ScreenStage), `:811` (chrome), `:1127` (the "suggested task" banner — `suggestedRow`), `:1182` (empty row), `:1286` (bulk), `:1613` (FlagCard rows), `:1819` (skeleton rows) | Tab 2 | Full Deep Field: stage + chrome i=24 + rows/banner i=12 (`forceEngineered={glassLite}` threaded) + conditional bulk i=24; flash pill solid `successStrong` `:1072/:1902`; offline banner solid `warningBg` | liquid-glass (all four variants) | stage-det (rows/banner); app-chaotic under chrome (scrolling photos) | C-lite long-press host (GLASS §4); S13 card SR (D1); press sheen RM-gated | The reference screen — the recipe (§9) source. Budget: ~9–10 rows + chrome + banner = 12; select swaps action rows for ONE bulk pane |
| M-02 | ProfileScreen (incl. loading + signed-out guest states + the guest sign-in HOST modal) | `src/screens/ProfileScreen.tsx:813/:824/:882` (ScreenStage ×3 states), rows `:920,:942,:1098,:1234,:1986`, engineered-literal rows `:1373–:1522` (×7 nav btns), `:1661–:1705` (×3 about rows); guest sign-in host Modal `:835` (full-screen, non-transparent — its CONTENT, SignInScreen, is boundary); `RecentlyViewedRow.tsx:99`; `ReportsBreakdownCard.tsx:172/:203/:246` | Tab 3 | Deep Field: stage + scrolling editorial `ScreenHeader` (**NO chrome pane** — `:877–:880` "mirrors Wave-1 Settings") + row/banner panes; nav-button + about rows are **literal `forceEngineered`** (never blur); hero/stats/history thread `glassLite` | liquid-glass (row/banner) | stage-det | UpdateBanner `:913` | ~20 row panes; the two inline dialogs are censused separately (M-43/M-44) |
| M-03 | SettingsScreen | `src/screens/SettingsScreen.tsx:453` (ScreenStage), `:465` (ScreenHeader), rows `:109` (SettingRow) `:516` (pushRow) | Drawer → hidden route | Deep Field: stage + scrolling editorial header (**explicit NO-chrome note `:450`**) + rows (`glassLite` threaded) | liquid-glass (row) | stage-det | — | Openers for Help/Changelog/Feedback/MyFeedback `:557–:602`; mounts M-24/M-29/M-42 + OnboardingModal (boundary) |
| M-04 | ResourcesScreen | `src/screens/ResourcesScreen.tsx:116` (pageSheet Modal), `:124` (ScreenStage), `:130` (chrome pane), rows `:202/:207` | Drawer (hosted at `HamburgerDrawer.tsx:245`) | Deep Field inside a pageSheet Modal: stage + chrome i=24 + rows | liquid-glass (chrome/row) | stage-det | — | A full stage screen presented modally — census-relevant architecture |
| M-05 | HowToHelpScreen | `src/screens/HowToHelpScreen.tsx:85` (pageSheet Modal), `:93` (ScreenStage), `:99` (chrome), rows `:134/:161` | Drawer (hosted `:249`) | Same recipe as M-04 | liquid-glass (chrome/row) | stage-det | — | — |

### B. Mixed (1) — the headline drift

| ID | Surface | Material mount | Entry | Current material | Class | Backdrop | PROTECT | Notes |
|---|---|---|---|---|---|---|---|---|
| M-06 | HomeScreen | `src/screens/HomeScreen.tsx:403` (screen `surfaceMuted`), `:183` (ScreenHeader + `surface` circle buttons `:405`), `:220` (**LEGACY GlassSurface `intensity={20}`** search pill), `:259` (map peek, `surfaceSoft` base `:452`), `:467` (offline banner `warningBg`), `:488` (list card `surface`), `:517` (Report pill `brand` + glowBrand), `:430` (locate btn `brandSofter`) | Tab 1 (default) | **MIXED**: opaque editorial wash + ONE legacy-generation glass pane + a live map-world peek + opaque `surface` list card | mixed (opaque + legacy-glass + map peek) | n/a (opaque wash); the legacy pill sits over the wash (deterministic) | S17 peek pointer-inert + suppressAttribution (PROTECT-10: peek still SHOWS the map); list card carries 3 state swaps (error+retry `:315`, 4× SkeletonRow `:330`, empty `:339`) | GLASS.md §8 says "search pill upgrades to chrome material; the screen wash adopts ScreenStage" — **shipped truth disagrees on both counts**. §8's Home line is aspirational (pre-flight note); the drift is census input. Opens AddressSearchModal (M-31): a bulk-GLASS sheet over an OPAQUE screen |

### C. Map-world (16) — MapScreen and its overlay population

| ID | Surface | Material mount | Entry | Current material | Class | Backdrop | PROTECT | Notes |
|---|---|---|---|---|---|---|---|---|
| M-07 | MapScreen shell (tiles + box-none overlay) | `src/screens/MapScreen.tsx` (`mapHeaderRow` box-none `:1429`; `topRow` box-none `:1454`; overlay column) | Hidden FullMap route: Home "Open full map"/peek/Report pill, Tasks/Profile focus links, deep link | Live tiles ARE the stage (no ScreenStage — GLASS §12.1; Sky picked NO scrim) | map-world | tile-chaotic | **box-none gesture law (comment-enforced, no unit test)**; PROTECT-8 honest-arrival set | Tiles ≠ theme: web CartoDB Positron light / dark_all; iOS Apple tiles follow OS |
| M-08 | Map editorial chip + HeaderActions | `:1430` (chip `variant="row" forceEngineered`), `HeaderActions.tsx:36/:45` (44pt `surface` circles) | on M-07 | Engineered row-tier chip (literal — never blurs) + opaque circles | liquid-glass(row, engineered-literal) | tile-chaotic | box-none row | S8's "MAP / Explore" treatment (ii) |
| M-09 | Status pill ("Showing N flags") | `:1455` (`variant="row" forceEngineered`, `radius.circle`) | on M-07 | Engineered row tier, literal | liquid-glass(row, engineered-literal) | tile-chaotic | PROTECT-8 (honesty pill — byte-asserted in BENCH-3) | Live region (polite) |
| M-10 | Action bar (filter/legend/heat/etc.) | `:1481` (`variant="row" forceEngineered`, `radius.circle`) | on M-07 | Engineered row tier, literal | liquid-glass(row, engineered-literal) | tile-chaotic | box-none | — |
| M-11 | Filter panel | `:1712` (`variant="row" forceEngineered={glassLite}` + `overlayTint=glassMapWash`) | Action bar | The ONE Map blur pane in full mode (i=12); engineered under C-lite; wash never painted under RT | liquid-glass(row + wash) | tile-chaotic | — | GLASS §12.5: blur only where backdrop quasi-static |
| M-12 | Locating banner | `:2195` (LEGACY GlassSurface, pinned always-light literals: `tint="light"`, floor 0.82, RT 0.95) | on M-07 while locating | Legacy-glass, ALWAYS-LIGHT (mounts a real BlurView — the accepted legacy cost) | legacy-glass (always-light) | tile-chaotic | Always-light pins are literals by law (GLASS §12.8) | One of the three legacy stragglers |
| M-13 | HeatmapLegend | `src/components/HeatmapLegend.tsx:20` (LEGACY GlassSurface, same always-light literals); slot `MapScreen.tsx:2274` | Heat layer on | Legacy-glass, always-light (BlurView mounts) | legacy-glass (always-light) | tile-chaotic | — | Straggler #2 |
| M-14 | Saved-place chips + manage chip | `:1676–:1704` (mounts), styles `:2719–:2741` (literal fills: white 0.95 / `#EEF4FE`; inks `#0E4499`/`#1466E0`) | Saved places exist | Opaque always-light literal chips (no blur) | opaque (always-light literal) | tile-chaotic | — | **Fork 8 owns the dark variant** — censused, not decided. Straggler #3 |
| M-15 | Permission-denied arrival banner (S4) | `:2218` (render), fill `overlaySoft` `:2936–:2944` | Arrival with denied permission | Solid themed overlay (0.95) | opaque | tile-chaotic | PROTECT-8-adjacent (honest-arrival: byte-preserved meaning) | "Semantic alert banners stay solid" (GLASS §12.8) |
| M-16 | Heatmap disclaimer (Jordan Art. 7) + "no heat zones qualify" notice | `:2235` (disclaimer render; style ref `:2237`) + `:2255` (the on+empty complementary notice — same `heatmapDisclaimer` style), fill literal `#1a1a1a` | Heat layer on | Solid dark literal (WCAG-motivated comment in place); TWO conditional mounts, one style | opaque (always-dark literal) | tile-chaotic | Privacy disclaimer copy — meaning byte-preserved | Critic fold: the second mount is part of this row |
| M-17 | Map offline banner | `:1634` (render), fill `warningBg` `:2663` | Offline cache serve | Solid semantic warning | opaque (semantic) | tile-chaotic | — | Parity family with Home/Tasks offline banners (M-53) |
| M-18 | Zoom buttons + Report FAB + List FAB | zoom `:2283/:2291` (48pt, `ctaFill`), FAB tray styles ~`:3084` | on M-07 | Solid controls: `ctaFill` + white; List FAB 0.97 overlay + brand ink (map-stacks canary) | opaque (control) | self / tile-chaotic (edges) | S6 zoom shipped set | — |
| M-19 | Map-internal world (pins/teardrops, cluster discs, NATIVE Callout bubble + web Leaflet popups, heat badges, attribution hairline) | `PlatformMap.tsx:301–:305` (native Callout — the designed floating bubble + S3 doorway), `PlatformMap.web.tsx:428–:453` (Leaflet popup — chrome always white, static `#666` meta), heat badges `PlatformMap.tsx:256–:257` (+styles `:517–:536`) / `PlatformMap.web.tsx:82–:88` + `~:780–:796` (`HeatmapLayer.tsx` is the `useHeatCells` hook only — Stage-6 correction), S14 teardrops | on M-07 | Tokens/inks only — NEVER a BlurView (GLASS §12.6); mode-independent literals + regime-decomposed ring unions | map-world (internal) | tile-chaotic (regime bases) | PROTECT-15/16 snapshot discipline; severity grammar (PROTECT-4) | Callout is the doorway to M-36 (S3) |
| M-20 | "Name this filter" prompt | `:2583` (Modal), card `surface` `:3172` | Save filter set | Centered opaque dialog card | opaque (dialog) | app-chaotic (over map, behind `nameBackdrop` = `color.scrim` 0.4 light / 0.6 dark — the SAME token as the Profile dialog pair; Stage-6 correction of "scrim-less") | — | Cross-platform Alert.prompt replacement |
| M-21 | "Name this preset" prompt | `:2498` (Modal), same `nameCard` | Save preset | Same as M-20 | opaque (dialog) | app-chaotic | — | — |
| M-55 | Map filters empty-state card | `:2150` (render; condition `showEmptyCard` `:1022`), fill `color.overlay` (0.97) | Filters narrow the map to zero results | Opaque floating card (title + quick-clear chips + reset CTA), floats above map below FABs | opaque | tile-chaotic | — | **Critic find #1** — the Map analogue of Tasks' empty card (M-01), on a different material |

### D. Opaque screens (3)

| ID | Surface | Material mount | Entry | Current material | Class | Backdrop | PROTECT | Notes |
|---|---|---|---|---|---|---|---|---|
| M-22 | LeaderboardScreen | `src/screens/LeaderboardScreen.tsx:273` (Modal), card `surface` `:427` | Profile `:1875` | Opaque bottom-sheet card (podium tints inside) | opaque | app-chaotic (over Profile stage behind scrim) | — | A "screen" by name, a sheet by architecture |
| M-23 | AdminScreen (incl. loading + access-denied states) | `src/screens/AdminScreen.tsx` (`surfaceMuted` `:271/:279`; loading spinner `:73–:78`; Lock + "Admin access required" `:81–:92`), nav header `RootNavigator.tsx:371–:381` + header style `:259–:278` | Drawer (admin-gated) | Opaque wash + the LAST nav-header surface (editorial light `headerBg` / always-dark `#0d1829` in dark); two distinct centered state compositions | opaque | n/a | Admin gate (defense-in-depth) | Seed adjustment: S8 removed the nav header from Settings — **only Admin still wears it** (P2 evidence: "Admin keeps the nav header — flagged follow-up") |
| M-24 | NotificationPreferencesScreen | `src/screens/NotificationPreferencesScreen.tsx:134` (Modal), card `surface` `:218` | Settings `:652` (flag-gated `pushNotifTypesEnabled`) | Opaque bottom-sheet card | opaque | app-chaotic (over Settings stage) | — | Distinct from M-42 (NotificationPrefsModal) — two notification surfaces exist. **Unreachable at HEAD:** `PUSH_NOTIF_TYPES_ENABLED` defaults false (`featureFlags.ts:34`; Sky Decision 2 Option B "hide, don't wire"; `setFlag` is `__DEV__`-only) — Stage-6 finding |

### E. Bulk-glass sheets (11) — the BENCH-3 unified tier

| ID | Surface | Material mount | Entry | Current material | Class | Backdrop | PROTECT | Notes |
|---|---|---|---|---|---|---|---|---|
| M-25 | ChangelogModal | via `ui/Sheet` glass path — `Sheet.tsx:140` (bulk), consumer `ChangelogModal.tsx:91` | SharedModalsHost; opener Settings `:565` | Bulk glass via the Sheet scaffold (its ONLY consumer; Sheet's opaque default path `Sheet.tsx:145` has ZERO live consumers) | liquid-glass(bulk) | app-chaotic | — | The scaffold split (1 Sheet-consumer vs 10 hand-rolls) = Stage-2e subject |
| M-26 | HelpModal | `src/components/HelpModal.tsx:115` (bulk) | SharedModalsHost; Settings `:557` | Hand-rolled `<Modal>`+bulk | liquid-glass(bulk) | app-chaotic | — | — |
| M-27 | FeedbackModal | `src/components/FeedbackModal.tsx:183` (bulk) | SharedModalsHost; header buttons everywhere | Hand-rolled bulk (the B4 exemplar) | liquid-glass(bulk) | app-chaotic | — | — |
| M-28 | MyFeedbackModal | `src/components/MyFeedbackModal.tsx:126` (bulk) | SharedModalsHost; Settings `:602` | Hand-rolled bulk | liquid-glass(bulk) | app-chaotic | — | — |
| M-29 | AboutScreen | `src/screens/AboutScreen.tsx:51` (bulk) | Drawer `:253`, Settings `:641`, Profile `:1862` | Hand-rolled bulk | liquid-glass(bulk) | app-chaotic | — | — |
| M-30 | LegendModal | `src/screens/LegendModal.tsx:56` (bulk) | Map action bar | Hand-rolled bulk (inside its tap-swallow Pressable) | liquid-glass(bulk) | tile-chaotic (sheetMap regime) | — | — |
| M-31 | AddressSearchModal | `src/components/AddressSearchModal.tsx:210` (bulk) | Map + **Home `:392`** | Hand-rolled bulk | liquid-glass(bulk) | tile-chaotic AND over opaque Home | — | The Home entry = a glass sheet over an opaque screen (reading-test exhibit) |
| M-32 | SavedPlacesModal | `src/components/SavedPlacesModal.tsx:256` (bulk) | Map | Hand-rolled bulk | liquid-glass(bulk) | tile-chaotic | — | — |
| M-33 | FilterPresetsModal | `src/components/FilterPresetsModal.tsx:354` (bulk) | Map | Hand-rolled bulk | liquid-glass(bulk) | tile-chaotic | — | — |
| M-34 | ReportFlagModal | `src/screens/ReportFlagModal.tsx:503` (bulk, `accessibilityViewIsModal`) | Map Report FAB; Home Report pill (via FullMap `openReport`) | Hand-rolled bulk; KAV/88%-cap/sticky opaque footer/anon banner BYTE-IDENTICAL (B4d) | liquid-glass(bulk) | tile-chaotic | **PROTECT-3** (architecture) + **PROTECT-8** (anon banner `brandSofter`/`brandOnSoft`, opaque) | Hosts PhotoGallery `:964` |
| M-35 | NearbyFlagsModal | `src/screens/NearbyFlagsModal.tsx:202` (bulk fills the pageSheet) | Map (SR auto-open path) | Bulk glass edge-to-edge under a transparent SafeAreaView (B4e, Sky device pick D10) | liquid-glass(bulk) | tile-chaotic | **PROTECT-1** (one-breath SR labels, tab chips, 44pt controls, reset-on-close — byte-identical) | — |

### F. The opaque modal tier (9) — the bench-flagged "secondary list-modal tier" + kin

| ID | Surface | Material mount | Entry | Current material | Class | Backdrop | PROTECT | Notes |
|---|---|---|---|---|---|---|---|---|
| M-36 | FlagDetailModal | `src/components/FlagDetailModal.tsx:732` (Modal), card `surface` `:1495–:1496` (82 KB file) | Map callout `:2397` · Tasks `:1404` · Profile `:1852` · over Nearby (P3) | Opaque full sheet | opaque | tile-chaotic (over map) AND app-chaotic (over Tasks/Profile stages) | S3 trust-ledger read half (Fork 5 decision half is Sky's); PROTECT-7 modal RM gate; hosts StatusHistory `:1479` + PhotoGallery `:834` + CommentBubble `:1326` | **The biggest holdout** — the doorway surface every S3 path lands on |
| M-37 | AchievementsModal | `src/components/AchievementsModal.tsx:187`, card `surfaceMuted` `:74–:75` | Profile `:1869` | Opaque sheet (muted wash) | opaque | app-chaotic | — | — |
| M-38 | ActivityFeedModal | `src/components/ActivityFeedModal.tsx:216`, card `surfaceMuted` `:335–:336` | Profile `:1844` | Opaque sheet (muted wash) | opaque | app-chaotic | — | — |
| M-39 | MyReportsModal | `src/components/MyReportsModal.tsx:263`, card `surface` `:449–:450` | Profile `:1822` | Opaque sheet | opaque | app-chaotic | — | — |
| M-40 | MyWatchedModal | `src/components/MyWatchedModal.tsx:273`, sheet `surface` `:429–:430` | Profile `:1836` | Opaque sheet | opaque | app-chaotic | — | — |
| M-41 | StatusHistoryModal | `src/components/StatusHistoryModal.tsx:134`, card `surface` `:222–:223` | FlagDetail `:1479` | Opaque sheet — a modal over a modal | opaque | app-chaotic (over M-36) | Ledger content meaning byte-preserved (honesty surface) | — |
| M-42 | NotificationPrefsModal | `src/components/NotificationPrefsModal.tsx:145`, card `surface` `:258–:259` | Profile `:1877` + Settings `:640` | Opaque sheet | opaque | app-chaotic | — | Sibling of M-24 |
| M-43 | Reputation-tier explainer (inline) | `src/screens/ProfileScreen.tsx:1901` (Modal), `tierSheet` `surface` `:2242` | Profile tier chip | Opaque centered card | opaque (dialog) | app-chaotic | — | Code comment `:1895–:1900` says it "matches the visual pattern of AboutScreen" — **AboutScreen has since been glassed (B4); the pattern claim is now stale** |
| M-44 | Delete-account confirmation (inline) | `src/screens/ProfileScreen.tsx:1760` (Modal), `deleteSheet` `surface` `:2629` | Profile danger zone | Opaque centered card, destructive two-button | opaque (dialog) | app-chaotic | Destructive-confirm pattern (confirm outside scroll, M7) | — |

### G. Deliberate-opaque candidates (3)

| ID | Surface | Material mount | Entry | Current material | Class | Backdrop | PROTECT | Notes |
|---|---|---|---|---|---|---|---|---|
| M-45 | HamburgerDrawer | `src/components/HamburgerDrawer.tsx:143` (Modal), panel `:303–:315` — ALWAYS-DARK literals `rgba(13,18,32,0.94)` / RT `#0D1220`, `drawerLip` `:329`, always-light item inks `:282–:290` | DrawerHost (menu buttons on Home/Tasks/Profile/Map/Settings) | Near-opaque solid documented across TWO comments (`:161–:168` "NO GlassSurface/BlurView by design" — native-scoped: web ships `backdropFilter` deliberately `:324–:326`; `:309–:311` "the spec's blessed bulk-Lite fallback"); a re-tokenize (`271e8ec`) broke light mode and was functionally reverted inside `9f3657e` (Stage-6 receipts) | opaque (deliberate, always-dark, Deep-Field-family tone) | app-chaotic (slides over any screen) | shadow.e3 invariant (comment) | Ratify-or-reclassify in Stage 2b — the rationale is written IN the code |
| M-46 | PhotoLightboxModal | `src/components/PhotoLightboxModal.tsx:38` (Modal), backdrop `backdropStrong` `:115–:117`, overlay buttons `overlayBtn` | Tasks card thumbnails `:1790` | Black-immersive: content IS the surface | media-world | photo | — | — |
| M-47 | PhotoGallery lightbox | `src/components/PhotoGallery.tsx:160` (sibling Modal), backdrop `rgba(0,0,0,0.92)` `:329–:331` | Inside FlagDetail `:834` + ReportFlag `:964` | Same media-world pattern, paged | media-world | photo | — | — |

### H. Glass chrome (2)

| ID | Surface | Material mount | Entry | Current material | Class | Backdrop | PROTECT | Notes |
|---|---|---|---|---|---|---|---|---|
| M-48 | Bottom tab bar | `RootNavigator.tsx:133–:145` (TabBarGlass: BlurView i=24 + `tabBarGlassFloor`, RT-aware), mount `:284`; web = CSS `backdrop-filter` `:295–:299` | Always (3 tabs) | Frosted chrome-family bar OUTSIDE the GlassSurface primitive (own BlurView — invisible to `__getLiveBlurPaneCount`, counted manually per GLASS §12.7) | liquid-glass (chrome-family, non-primitive) | app-chaotic (any screen scrolls under) | GLASS §8: "a later cleanup can collapse TabBarGlass into variant=chrome — untouched by this pass" | The standing +1 on every screen's budget |
| M-49 | Navigation header (Admin only) | `RootNavigator.tsx:259–:278` (style), `:371–:381` (Admin registration keeps it) | Admin route | Opaque editorial `headerBg` (light) / always-dark `#0d1829` (dark palette) | opaque (editorial chrome) | n/a | — | Everywhere else S8 replaced it with ScreenHeader/chip families |

### I. Transient + system surfaces (7)

| ID | Surface | Material mount | Entry | Current material | Class | Backdrop | PROTECT | Notes |
|---|---|---|---|---|---|---|---|---|
| M-50 | FlashBanner (app-level) + Tasks reward pill | `src/components/FlashBanner.tsx:126` (pill; fills `successStrong`/`brand` `:157–:158`), mount `App.tsx:103` (inside `SignedInArea` — signed-in branch only; the guest/web branch renders without it); Tasks inline pill `TasksScreen.tsx:1072` (`successStrong` `:1902`, muted `backdropCaption`) | Points events (signed-in) | Solid semantic pills | opaque (semantic) | app-chaotic (floats over anything) | — | Solid-by-design candidates (semantic urgency) |
| M-51 | LiveStatusRegion | `src/components/LiveStatusRegion.tsx:113` (pill; `successStrong`/`brand` `:161–:162`; action chip `rgba(255,255,255,0.22)` `:176`), mount `App.tsx:227` | S10/S11 statuses | Solid semantic pill + action | opaque (semantic) | app-chaotic | P5/S10-S11 shipped set (persistent-mounted, guest-web audience) | — |
| M-52 | UpdateBanner | `src/components/UpdateBanner.tsx:53` (banner; `brandSofter`) mount `ProfileScreen.tsx:913` | Watched-flag updates | Solid brand-soft banner | opaque (semantic-soft) | stage-det (on Profile stage) | — | Sits ON a Deep Field stage — the one non-glass, non-semantic-urgent banner on a stage |
| M-53 | Offline/error banner family | Home offline `:285` + stale-refresh `:298` (both `warningBg` `:467`) · Tasks offline (`warningBg`) · Map offline `:1634` (`warningBg` `:2663`) · Map load-error retry banner `:2115` (`color.error` solid, tappable, spinner state) | Offline cache / failed refresh / load error | Solid semantic warning + error family | opaque (semantic) | per-host | — | GLASS §12.8 reaffirmed: semantic banners stay solid. One family row so the ratification is stated once; the Map error banner is explicitly a member (critic fold) |
| M-54 | ErrorBoundary fallback + ScreenFallback | `src/components/ErrorBoundary.tsx` (container `surface` + brand button; app `App.tsx:214`, screen-variant per tab `RootNavigator.tsx:257`); lazy `ScreenFallback` `RootNavigator.tsx:47–:54` (`surfaceMuted` + spinner) | Crash / chunk load | Opaque system surfaces (both boundary variants + the lazy fallback) | opaque (system) | n/a | — | Safety net, "not a feature surface" (its own docstring) |
| M-56 | FirstLaunchGate boot frame | `App.tsx:186` — full-screen `View`, hardcoded `backgroundColor: '#fff'` | EVERY app launch (~50ms while the onboarded flag loads; longer on slow devices) | Opaque hardcoded-white frame — **flashes white before a dark-mode app** | opaque (system, literal) | n/a | — | **Critic find #2** — the first painted frame after the native splash; no token, no scheme awareness. Contrast M-57: the WEB boot chrome already solved this exact problem |
| M-57 | Boot/launch chrome (web splash + native splash config) | Web: `public/index.html:66–153` (`#am-splash` — brand pin SVG, wordmark, tagline, dot loader, byline; own hardcoded palette `#1466E0`/`#2B3A55`/`#44546F`/`#0E57C2` + full dark-mode variant + reduced-motion override + theme-harmonised pre-paint background) · also in that file: the global `:focus-visible` ring `:54–:65` (hardcoded `#1466E0`) and the `noscript` line `:131–:133` · Native: `app.json:7–11` (app icon on `#1466E0`) | Every web cold load / PWA launch; every native launch (config splash) | Designed opaque boot chrome, ~10 hand-tracked hex literals OUTSIDE the token system; web variant is scheme-aware (no white flash), native config is brand-solid | opaque (boot chrome, literal palette) | n/a | — | **Critic find #3 (round 2)** — the only fully designed surface living outside `theme.ts` entirely |

## §3 Boundary appendix (the fence is explicit)

OUT of scope per the Part-2 boundary (`FirstLaunchGate`/`Gate` pre-onboarding surfaces):
**OnboardingCards** (`App.tsx:190`, first-launch) · **OnboardingModal**
(`src/screens/OnboardingModal.tsx` — including its Settings "replay tutorial" mount at
`SettingsScreen.tsx:650`, which re-presents the same pre-onboarding surface) ·
**SignInScreen** (`App.tsx:150` and its post-onboarding host, the Profile guest sign-in
Modal `ProfileScreen.tsx:835` — the HOST modal is in scope as part of M-02's guest state;
the SignInScreen content it presents is not). Also non-visual: **A11yLiveRegion**
(`src/components/A11yLiveRegion.tsx:42–:56` — 1px sr-only clip region; no material to
census).

## §4 Seed-vs-HEAD adjustments (discrepancies investigated, per the census rule)

1. **"Settings/Admin nav header" (seed) → Admin ONLY (HEAD).** S8 (P2 train) set
   `headerShown:false` on Settings (`RootNavigator.tsx:361–:370`); Admin alone keeps the
   nav header (`:371–:381`) — recorded in P2's evidence as a flagged follow-up. M-23/M-49.
2. **Leaderboard/NotificationPreferences are Modal sheets, not pushed screens** — "opaque
   screens" in the seed, architecturally bottom-sheet Modals at HEAD (M-22/M-24). Their
   census class is unchanged (opaque); their migration shape (sheet-family) differs.
3. **The opaque modal tier is NINE surfaces, not seven** — the seed's six named + the two
   inline ProfileScreen dialogs (M-43 tier explainer, M-44 delete-account) + Map's two name
   prompts (M-20/M-21, censused in the map family). The tier-explainer's own comment still
   claims it matches AboutScreen — stale since B4 glassed About (M-43 note).
4. **Profile hero/stat/history cards thread `glassLite`, but its 7 nav-button rows + 3
   about rows are literal `forceEngineered`** (`:1373–:1522`, `:1661–:1705`) — a shipped
   budget-restraint choice the seed's "~20 row panes" undercounts in detail. Wave-2
   evidence matches.
5. **`ui/Sheet`'s opaque default path has zero live consumers** — Changelog (glass) is the
   scaffold's only consumer at HEAD; every other sheet hand-rolls. Sharpens Stage 2e.

## §5 Completeness critic — banked verdicts (three rounds, fresh context each, Fable 5)

The census is declared complete per the Part-2 rule: iterate until a fresh context-free
critic finds nothing new.

- **Round 1 — FAIL (2 misses, both incorporated):** ① the Map filters empty-state card
  (`MapScreen.tsx:2150`, condition `:1022`) → **M-55**; ② the FirstLaunchGate boot frame
  (`App.tsx:186`, hardcoded `#fff`) → **M-56**. Six judgment calls folded: the second
  heat notice into M-16; the Map error-retry banner named in M-53; Home's stale-refresh
  banner named in M-53; the guest sign-in HOST modal named in M-02; the per-tab
  ErrorBoundary screen variant named in M-54; M-01's "banner" labelled as the suggested
  banner.
- **Round 2 — FAIL (1 miss, incorporated):** the web boot splash `public/index.html:66–153`
  (+ the `:focus-visible` ring `:54–:65`, the `noscript` line, and the native splash config
  `app.json:7–11`) → **M-57**. Judgment calls folded: Admin loading/denied states named in
  M-23; Home list-card state swaps named in M-06.
- **Round 3 — PASS.** All 33 Modal mounts (Stage-6 recount; "34" was a §5 transcription slip), 23 GlassSurface host files, every BlurView,
  every absolute overlay, all 16 screens + 41 components, src/lib, web chrome (sw.js /
  manifest / favicons checked — no designed offline page), and app.json config surfaces
  map to census rows or declared exclusions. Final judgment calls recorded, no row
  changes needed: ScreenStage is a shared MATERIAL folding into its host screens (named
  in M-01..M-05); the native Callout bubble now named in M-19; the SignInScreen ROUTE
  (native signed-out) is excluded with its content per the boundary; M-56's `#fff` is an
  audit finding on a censused row, not a miss.

**Census status: COMPLETE at 57 rows — critic PASS banked 2026-07-10.**

## §6 Stage-6 fidelity corrections (adversarial skeptic pass, 2026-07-10)

A dedicated census-fidelity skeptic re-verified every row not already covered by the block
skeptics (24 rows clean at exact cited lines) and recounted the §1 architecture numbers.
Corrections applied above, all marked "Stage-6": M-19's heat-badge FILE attribution
(HeatmapLayer.tsx is the hook; badges render in the PlatformMap pair — every material claim
held); §1's GlassSurface count 60 → **51 real JSX mounts** (67 textual incl. comments; Modal
33 ✓, ScreenStage 5 ✓ as censused); FlashBanner's tree position (inside `SignedInArea`, not
above the session branch); §5's "34 Modal mounts" → 33; M-20's backdrop is `color.scrim`,
NOT scrim-less (strengthens the dialog-tier ratification); M-45's comment cites spliced +
native-scoped; M-16/M-53 ±1–2-line cite nits; M-43's comment range `:1895–:1900`; M-24
recorded as unreachable at the shipped flag default. Classification and material claims
survived on all 57 rows — zero rows re-classified.
