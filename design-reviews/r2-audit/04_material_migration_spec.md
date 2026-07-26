# Fable Audit ROUND 2 — AccessMap — Part 2: THE MATERIAL MIGRATION SPEC

The design authority for the "whole overlay" pass BENCH-3 flagged, and the answer to Sky's
mandate: **does the app read as one material world after intro/onboarding — and what should
it be?** Everything here is executable later without this session: a builder (Opus 4.8 at
Sky's direction) works from this file + `tools/r2-material-stacks.json` alone, phase by
phase, with zero design re-derivation. Census authority: `03_material_census.md` (57 rows,
completeness-critic PASS). Arbiter proof at SPEC time: `assets/arbiter/r2-material.txt`
(proposed world, **exit 0, 80 pairs** after the Stage-6 additions) + `assets/arbiter/r2-trials.txt`
(deliberate trials + the shipped-drift record, **exit 1 by design** — the M-48 kill, the M-52
dark drift, and the five Stage-6 drift families). Authored 2026-07-10 on Claude
Fable 5 max effort, at HEAD `a8549ff` (`bench/4-quality`). READ-ONLY part: nothing below
executes in the audit window.

---

## §1 THE READING TEST — where the one-material world breaks today

Walked as a user: live evidence = Part 1's banked captures at this same HEAD
(`01_feel_render-index.md`; static export lifts the lucide boundary — `web-approximated`);
surfaces without banked renders are `code-inferred` from the census's verified mounts.
Each break: census refs + what it feels like.

- **B1 · The two-worlds tab switch (M-06 ↔ M-01).** Home is an opaque `surfaceMuted`
  editorial page; one tab over, Tasks is a luminous Deep Field stage with breathing glass.
  The app's two most-visited surfaces are different worlds — crossing feels like stepping
  from a newspaper into an aquarium. `web-approximated` (`base/home__*` vs `base/tasks__*`,
  both themes).
- **B2 · The leftover pane (M-06).** Home's search pill is the LEGACY 2026-06-17 glass
  generation (`intensity={20}`) — the only glass object on an otherwise print-like page. It
  reads as a souvenir from a different app. `web-approximated` (`base/home__*`).
- **B3 · Glass sheet over a paper page (M-31 over M-06).** Home's search opens
  AddressSearchModal — a bulk-glass sheet frosting… a flat opaque screen. Blur with nothing
  luminous behind it reads as a material-logic error (a shower door installed in a library).
  `web-approximated` (`base/address-search__*` captured over Home).
- **B4 · The grand hall leads into a stockroom (M-19 → M-36).** The map callout — the S3
  doorway on the app's richest surface — opens FlagDetailModal: an opaque `surface` sheet.
  The trust ledger, the app's most important honesty surface, wears the least-considered
  material in the app. `web-approximated` (`base/flagdetail__*` over the map) +
  `code-inferred` (Tasks/Profile entries).
- **B5 · Same break, other doorways (M-01/M-02 → M-36).** Tasks cards and Profile rows —
  glass — open the same opaque sheet. Every S3 path lands on the holdout. `code-inferred`.
- **B6 · One hallway, two buildings (M-02 → M-29 vs M-39/M-40/M-38/M-37/M-42/M-22/M-24).**
  Profile's nav list: "About" opens bulk GLASS (B4); its visual siblings — My Reports, My
  Watched, Activity, Achievements, Notifications, Leaderboard — open OPAQUE sheets. Adjacent
  buttons in one list open two different material worlds. `code-inferred` (fills verified at
  census lines).
- **B7 · The same split inside Settings (M-03 → M-26/M-25/M-29 glass vs M-42/M-24 opaque).**
  Help/Changelog/About are glass; both notification surfaces are opaque — from the same
  settings list. (Stage-6 nuance: at the shipped flag default only M-42's row shows —
  M-24 is hidden behind `PUSH_NOTIF_TYPES_ENABLED=false`; the break is live via M-42 and
  latent via M-24. See the MP3 honesty note.) `code-inferred`.
- **B8 · The boot strobe (native: splash → M-56 → app).** Brand-blue native splash →
  hardcoded `#fff` frame → (in dark mode) a dark stage. The first second of the app strobes
  white for dark-mode users on every launch. `code-inferred` (`App.tsx:186`); the WEB boot
  chrome (M-57) already solved exactly this (scheme-aware pre-paint), so the two platforms
  currently deliver different first impressions.
- **B9 · Drawer siblings, three materials (M-45 → M-04/M-05 vs M-29).** From one menu:
  Resources and How To Help open full Deep Field pageSheet screens; About opens a bulk-glass
  bottom sheet. Two presentation grammars for three siblings — softened by both being
  glass-family, but the shape difference is legible. `web-approximated`
  (`base/resources__*`, `base/drawer-open__*`) + `code-inferred` (About-from-drawer).
- **B10 · The third recipe on the map (M-55 vs M-08/M-09/M-10/M-11).** The filters
  empty-state card is a plain 0.97 `overlay` card floating among engineered row-glass
  chrome — the map's third material recipe (row-glass family · legacy always-light · plain
  overlay). Near in tone, different in grammar (no edge/specular/tier). `code-inferred`.
- **B11 · The one banner not speaking banner (M-52 on M-02).** UpdateBanner is a solid
  `brandSofter` card sitting between glass rows on the Profile stage — the only
  non-urgent banner on a stage not wearing the banner tier (Profile's own nearest-barrier
  banner, same screen, wears `variant="banner"`). `code-inferred`.
- **B12 · The dialog tier reads deliberate (M-20/M-21/M-43/M-44).** All four centered
  dialogs are solid `surface` cards over the same `color.scrim` token — consistent in
  fill/radius/centering/scrim across Map and Profile (Stage-6 precision: shadow.e3 is
  two-of-four — the Map name prompts are shadowless — and entrance motion splits
  fade/slide; recorded intra-tier deltas, §2b). This one is a tier, not a break (ratified
  in §2b) — but M-43's code comment still cites AboutScreen as its pattern-mate, which B4
  has since glassed: the comment is stale even though the design holds. `code-inferred`.
- **B13 · The generation seam on the map (M-12/M-13, and M-14 under Fork 8).** The locating
  banner + heat legend are the LEGACY glass generation pinned always-light — lawful
  (GLASS §12.8) and AA-proven, but in dark mode they are the two brightest objects on the
  map, and in code they are the last legacy `GlassSurface` consumers outside Home.
  `web-approximated` (`glassmode/legend__*`) + `code-inferred`.
- **B14 · The last nav header (M-23/M-49).** Admin still wears the pre-S8 navigation
  header over an opaque `surfaceMuted` wash — the one screen family the editorial-header
  migration never reached. Gated and low-traffic, but it is the only place the old chrome
  survives. `code-inferred`.

**The verdict the system must answer:** the stage world (M-01..M-05) and the shipped bulk
tier (M-25..M-35) are internally coherent; the breaks concentrate in FOUR places — Home
(B1/B2/B3), the un-migrated overlay remainder (B4–B7), the transient/boot edges (B8, B10,
B11), and two deliberate tiers that need RATIFICATION rather than migration (B12 dialogs,
B13 map legacy trio, plus the drawer). That is exactly the migration surface below.

---

## §2 THE UNIFIED MATERIAL SYSTEM

**The design in one paragraph.** After onboarding, AccessMap is ONE Deep Field world with
three deliberate non-glass tiers. (1) THE GLASS WORLD: every screen is the stage (or the
map — the stage's live twin) and every overlay is the bulk tier; rows/banners/chrome follow
GLASS §2 exactly as Tasks ships them. (2) THE DELIBERATE-OPAQUE TIER, each member with a
written reason: solid-by-semantics (urgent/status/destructive surfaces that must read
instantly over anything), the centered DIALOG tier (decision moments; keyboard input),
the always-dark drawer rail, system-integrity surfaces (error boundaries), and boot chrome.
(3) THE MEDIA-WORLD: photos are the surface; nothing tints them. Glass stays the STAGE and
never the actor: no severity/status/honesty signal ever rides on translucency.

### §2a The glass world — variants, and the two header grammars

- **Row** (`variant="row"`, i=12): floating panes over a stage or tiles — cards, list
  cards, floating map chrome (the Map precedent: literal `forceEngineered` where the pane
  persists during pan). **Banner** (i=12): brand-soft informational moments that scroll
  with content. **Chrome** (i=24, radius 0): a fixed header ZONE content visibly scrolls
  beneath. **Bulk** (i=24, radius 0 top-sheet): the overlay tier — every sheet.
- **Two header grammars, both ratified as design:** list-class screens whose content
  scrolls beneath a fixed header zone wear the CHROME PANE (Tasks M-01, Resources M-04,
  HowToHelp M-05); document-class screens whose header scrolls away with the page wear the
  in-flow editorial `ScreenHeader` on the stage (Profile M-02 — `:877–:880` "mirrors
  Wave-1 Settings" — and Settings M-03, whose `:450` comment records the choice). The
  grammar is keyed to CONTENT BEHAVIOR, not to screen identity — that is a system, not a
  drift. Home (M-06) joins the second grammar (its header already scrolls).
- **Engineered-first restraint rule (extends the Map precedent app-wide):** true blur is
  reserved for panes whose backdrop visibly moves beneath them while they are up (stage
  rows under scroll; the Map filter panel over quasi-static tiles). Panes over mostly
  occluded or static backdrops ship `forceEngineered` — identical declared floors, zero
  budget cost. This single rule is what lets the whole overlay remainder migrate without
  ever touching the ≤12 pane law (§2f).

### §2b The deliberate-opaque tier — ratify or reclassify

- **HamburgerDrawer (M-45) — RATIFIED, stays.** The code states the design ("Deep-field
  dark OVERLAY material as a near-opaque solid… the spec's blessed bulk-Lite fallback…
  NO GlassSurface/BlurView by design", `HamburgerDrawer.tsx:303–:315`) and carries the
  empirical receipt: re-tokenizing it (`271e8ec`) broke light mode and was functionally
  reverted inside `9f3657e` ("theme tokens went invisible in light mode" — Stage-6 git
  receipt). The rationale survives testing: the drawer is the app's navigation RAIL — an
  always-dark anchor that must read identically over any host screen, the inverse twin of
  the map's always-light law; its tone IS the dark bulk-Lite family byte-for-byte (0.94
  fill = the glassBulkLite RGB triplet; lip = glassChromeLip), so it is IN the material
  system, not outside it. Reclassifying it to live glass would cost +1 concurrently-visible
  pane whenever the drawer opens over any host — including Tasks' shipped 12-pane worst
  case, i.e. a budget-ceiling breach — plus the iOS shadow invariant (a transparent panel
  bg suppresses shadow.e3), for zero legibility gain. (Scope note: "NO GlassSurface/
  BlurView" is native-scoped — the web build deliberately ships a faint CSS backdropFilter
  behind the same solid, `:324–:326`.) Stays, as design.
- **PhotoLightboxModal (M-46) + PhotoGallery lightbox (M-47) — RATIFIED media-world, with
  two Stage-6 riders.** Content IS the surface; black immersion maximizes photo legibility;
  any glass would tint evidence photos (an honesty cost — the restraint check kills it).
  Rider 1 (live drift, repaired in MP0): M-46's chrome inks use the `color.surface` legacy
  idiom, which inverts to `#1E1E22` in dark mode — close X / empty text / caption compute
  ≈1.36 / 1.24 / 1.6:1 on the dark composites (functionally invisible); M-47 already ships
  the correct mode-independent `textOnBrand` idiom (≈12.6:1). The black-immersion legibility
  claim is true only after the MP0 in-tier ink repair. Rider 2 (framed, §6): the two
  lightboxes run different blacks — M-46 `backdropStrong` (0.75/0.85 token) vs M-47's
  literal 0.92; `theme.ts:136`'s own comment says the token was meant to own lightbox
  backdrops — tokenize-or-record is Sky's call.
- **The centered DIALOG tier (M-20, M-21, M-43, M-44) — RATIFIED opaque, as a tier.**
  Four solid `surface` cards, radius.xl, e3, centered: decision/input moments. Reasons:
  (1) figure-ground — a decision point wants maximum separation from context, not
  continuity with it; (2) two of the four carry TextInputs (name prompts) and text fields
  on translucency is a legibility risk the chip law already gestures at; (3) the
  delete-account dialog is DESTRUCTIVE — solidity is gravity; glass would aestheticize a
  data-loss moment (honesty cost). The tier is consistent where it matters — fill, radius,
  centering, and one shared `color.scrim` backdrop token, four-for-four (Stage-6 verified;
  the census's "scrim-less" note was wrong, in the tier's favor) — with two recorded
  intra-tier deltas that are craft nits, not material work: shadow.e3 rides only the
  Profile pair (the Map name prompts are shadowless) and entrance motion splits fade
  (Map) vs slide (Profile). The MATERIAL coherence win is zero code; the deltas are
  Part-3 slate material, not this train's. M-43's stale "matches AboutScreen" comment gets
  a one-line hygiene correction in MP0 (comment only; the design stands).
- **Solid-by-semantics (M-15, M-16, M-17, M-50, M-51, M-53) — RATIFIED.** GLASS §12.8
  ("semantic alert banners stay solid") extended app-wide: urgency and status must read
  instantly over ANY backdrop with zero compositing dependence. The map-stacks F4 canary
  documents the same posture for the list FAB.
- **System-integrity surfaces (M-54) — RATIFIED, mechanism stated precisely (Stage-6).**
  Error boundaries and chunk fallbacks must render even when the material system itself is
  the crasher. The property HOLDS but not via "zero theme dependencies": `ErrorFallback`
  calls `useColor()`, and what saves it is (1) the app boundary mounts OUTSIDE
  ThemeProvider (`App.tsx:213–:231`), and (2) `ThemeContext` carries a TOTAL lightColor
  default (`ThemeContext.tsx:218`) — so a ThemeProvider crash renders the fallback on the
  light palette (dark users get a light crash screen; cosmetic only). No glass or stage
  dependency anywhere. That non-throwing context default is load-bearing for the safety
  net — flagged for Part 3's PROTECT-list update (converting `useColor` to a throwing hook
  would silently break the boundary). "The safety net, not a feature surface."
- **Boot chrome (M-57 — RATIFIED with a maintenance note; M-56 — MIGRATES).** The web
  splash is deliberate, scheme-aware, RM-safe boot design (ratified; its ~10 hex literals
  are a hand-tracked sync risk — noted in the open-question register). The native boot
  frame M-56 is NOT design — it is a hardcoded `#fff` that strobes dark-mode launches;
  it migrates to the themed wash (§3).
- **Everything else that stays opaque has its rationale in the §4 ledger** — any opaque
  row without a written reason would be drift by definition; there are none.

### §2c Map-world composition — the stage's live twin

RATIFIED as shipped, with one member joining the family (M-55). The tiles are the live
stage (no ScreenStage, no scrim — Sky picked none); persistent chrome is engineered
row-tier (budget-free by mechanism); the ONE frost moment is the filter panel; map-internal
surfaces are tokens/inks only under the §12.6 law; always-light overlays are literal-pinned
(§12.8). The legacy-generation pair (M-12 locating banner, M-13 HeatmapLegend) is RATIFIED
as the always-light tier's current implementation — the always-light LAW is the design; the
legacy GlassSurface generation is its accepted implementation cost (each mounts a real
BlurView). An optional literal-engineered swap (same 0.82/0.95 literals as a flat
fill + RT branch, no BlurView, no visual change over light tiles, a subtler frost loss over
dark tiles) is FRAMED for Sky in §6 — not specced, because the frost-feel half of that
trade is device-read territory. M-14 saved-place chips: censused, always-light literals,
**Fork 8 owns the dark variant — untouched here.** M-55 (the empty-state card) migrates
INTO the row+wash family it floats among (§3) — closing B10 and reducing the map to two
material grammars (row-glass family + always-light law), which is what "one hand" means on
a live-tile screen.

### §2d HOME, resolved as a design decision — STAGE-ADOPT

Home joins the Deep Field stage. Argued, not assumed:

1. **From the thesis:** B1 is the loudest material break in the app, and it sits on the
   default tab. "One material world after intro" is false at the first tab switch; no
   other single migration buys more unity.
2. **From the law:** GLASS §8 already prescribes it ("the screen wash adopts ScreenStage;
   the search pill upgrades") — shipped Home simply predates the rollout. This spec is the
   §8 line finally landing, with one correction from the Map learnings: the pill upgrades
   to the ROW tier (floating-pane shape), not chrome (a structural-shape tier — radius-0
   header zones), and it ships engineered-literal (nothing scrolls beneath a pill that
   scrolls WITH the page; blur would be a budget spend with no visible return — §2a rule).
3. **From the restraint check:** zero legibility cost — true only because the MP1 block
   covers EVERY ink the stage exposes (Stage-6 adjusted: the block now includes the
   ScreenHeader eyebrow/subtitle → `inkOnStage` re-ink, the on-glass ≥500 weight rule for
   rowMeta/searchText, and the swap-state text re-inks; every proposed ink is
   arbiter-passed at spec time — `r2-material.txt` homeRow/homeRowLite/homeRowRT blocks,
   worst 5.44:1, most ≥8:1); zero reachability change (materials move no targets); zero
   honesty change (the offline/error banners stay solid semantic; the honest
   NEARBY/LATEST copy logic is untouched).
4. **The editorial identity is kept, not lost:** the ScreenHeader grammar, the type scale,
   and the peek stay; the stage replaces only the flat wash, and the list card gains the
   row material Tasks rows already wear. Deliberately-editorial was the strongest
   counter-argument (Home as a calm "print cover" before the glass app) — it dies on B3:
   the moment ANY sheet opens over Home, the print metaphor breaks anyway, and the app
   already refuses print everywhere else post-onboarding.
5. **GLASS.md §8 doc-drift, flagged both ways:** until MP1 lands, §8's Home line remains
   aspirational (census input, per the pre-flight); after MP1 it becomes true except the
   chrome-vs-row pill correction, which needs a one-line §8 edit — ownership framed in §6.

### §2e The scaffold question — RATIFIED: hand-roll is the tier's idiom

One bulk recipe, two architectures (Sheet's glass path: 1 consumer; hand-rolls: 10).
Decision: **ratify the hand-roll as the overlay tier's idiom; do not unify onto Sheet.**
Reasons: (1) B4's own worked precedent — nine sheets migrated with every bespoke a11y
architecture (KAV, pageSheet, tap-swallow backdrops, focus management) byte-identical
(Stage-6 precision: 8 of 9 were consumers-only; B4a additionally added Sheet's glass path
as an ADDITIVE scaffold edit, opaque default untouched); two of those architectures are
PROTECT-frozen (PROTECT-1/-3), so a scaffold unification would churn frozen ground for
zero user-visible gain — the restraint check kills it. (2) The migrating tier below has
bespoke internals (search rows, filter/sort chip bands, MyWatched's three-element header,
Leaderboard's auto-fit title + segmented tablist + podium avatars) that Sheet's fixed
title-plus-one-slot header does not model — adoption would also regress 44pt close targets
to Sheet's 40pt and drop per-modal close hints; forcing them in is restructuring, not
material work. Recorded exception (Stage-6, per this spec's own no-exception-without-reason
rule): ChangelogModal stays the tier's ONE scaffolded member — its Sheet glass path emits
the identical B4 recipe, and un-scaffolding it would be churn for zero gain. The B4 recipe (container→`GlassSurface variant="bulk"` + outer up-shadow
wrapper + on-glass re-inks) IS the unification — of material, not scaffolding.
`ui/Sheet`'s opaque default path (zero consumers) is a dead-code discovery for Sky's
adopt-or-remove family — framed in §6, never decided here.

### §2f The blur-budget consequence (worst SIMULTANEOUS state, tab bar counted)

| Screen / stack | Before (worst) | After (worst) | Δ |
|---|---|---|---|
| Home | legacy search blur 1 + tab 1 = **2** (3 with the AddressSearch bulk sheet open) | list card 1 (full mode; engineered under C-lite) + pill 0 (engineered-literal) + tab 1 = **2** (3 with the sheet open — before AND after) | HOLD |
| Tasks (+ any sheet over it) | rows ~9–10 + chrome + banner = **12** (+ tab = 12–13 — the shipped pre-existing worst; GLASS §3's arithmetic predates §12.7's manual-tab rule, a tension this spec reports rather than hides); sheets today opaque +0 | unchanged; ALL migrated sheets are engineered-literal (+0) — FlagDetail over the full Tasks stack adds nothing | HOLD |
| Profile (+ its sheets) | 6 blur-capable panes (hero, point-history, nearest banner, 3 stat cards) + tab 1 = **~7** — the census's ~20 row panes are mostly literal-engineered (nav/about rows, RecentlyViewedRow, all 3 ReportsBreakdownCard panes; Stage-6 recount corrected the earlier "~10", error in the safe direction) | unchanged; M-52 ships engineered-literal (+0); all Profile-family sheets +0 | HOLD |
| Map | filter panel 1 + locating 1 + legend 1 + tab 1 = **4** (the engineered-cut precedent, down from 6) | unchanged **4**; M-55 engineered (+0); name prompts opaque | HOLD |
| Settings / Resources / HowToHelp | shipped counts | unchanged; sheets over them +0 | HOLD |
| Admin (MP5) | 0 + tab 1 = **1** | stage (0 panes) + engineered rows (0) + tab 1 = **1** | HOLD |

The whole migration adds **zero live blur panes anywhere** — the engineered-first rule is
the entire budget story, citing the Map engineered-cut precedent (restraint CAN mean fewer
live panes). The ceiling of 12 is never approached beyond Tasks' shipped worst case.
(Android caveat, Stage-6: the VARIANT path is always engineered on Android; the LEGACY
generation — Home's pill today, the map's pinned pair — and TabBarGlass still mount real
BlurViews there, exactly as GLASS §5 records. The table's arithmetic is the iOS worst case.)
(M-52's sibling nearest-banner threads `glassLite` and blurs in full mode — shipped
behavior, untouched; M-52 itself ships literal-engineered specifically so Profile's worst
case cannot creep to the ceiling. Recorded as a deliberate mechanism difference between
two same-variant banners on one screen; Sky's one-prop lever exists both directions.)

### §2g Target ledger — conservation (every census row, one target)

**MIGRATE (15):** M-06 · M-22 · M-23 · M-24 · M-36 · M-37 · M-38 · M-39 · M-40 · M-41 ·
M-42 · M-49 · M-52 · M-55 · M-56.
**RATIFIED-STAYS (42):** M-01 M-02 M-03 M-04 M-05 (stage world) · M-07 M-08 M-09 M-10
M-11 M-12 M-13 M-14 M-15 M-16 M-17 M-18 M-19 M-20 M-21 (map-world + dialog + semantics) ·
M-25 M-26 M-27 M-28 M-29 M-30 M-31 M-32 M-33 M-34 M-35 (the shipped bulk tier) · M-43
M-44 (dialog tier; M-43 gets a comment-only hygiene fix) · M-45 M-46 M-47 (drawer +
media-world) · M-48 (glass-mechanism adoption KILLED by trial — see §4) · M-50 M-51 M-53
M-54 (semantic + system solids) · M-57 (boot chrome, with note).
15 + 42 = **57 ✓** (census total).

---

## §3 MIGRATION BLOCKS (8 fields each; inks cite `tools/r2-material-stacks.json` pairs)

**Shared recipe for every sheet block (M-22/24/36/37/38/39/40/41/42) — "the B4 recipe,
engineered":** container View → `<GlassSurface variant="bulk" borderRadius={0}
forceEngineered style={styles.card}>` with the up-shadow moved to an outer wrapper
(overflow:hidden clips its own shadow — GlassSurface docstring); backdrop/scrim, a11y
props, focus management, testIDs, and ALL content composition byte-identical; on-glass
re-inks ONLY, mapped by ROLE not token (Stage-6): muted/meta/counters/dates/hints —
`textMuted`, `textMutedAlt`, AND `textSubtle`-class sites — → `inkGlassMuted` (GLASS §7.4
bans both muted faces on glass), links/clear → `brandText` (== the arbitrated select ink),
titles stay `textStrong`, body stays `color.text`, on-glass body text gains ≥500 weight
(`font.family.bodyMedium`) where it is 400 today; self-contained chips/pills/inner cards
keep their opaque tokens (declared as pins) — and SEMANTIC pills keep their semantic
tokens (a destructive chip stays `errorBg`+`color.error`; never flatten to brandText).
Declaration note: the profileSheet/detailSheet stacks declare the blur-tier 0.85 floor as
a CONSERVATIVE LOWER BOUND covering both mechanisms (every engineered stop is thicker —
the bench3 discipline, stacks `_doc` item 5), not a layer-by-layer engineered match. RT =
the variant's designed state (overlay 0.97 + `borderStrong` top edge) — automatic from the
primitive; C-lite = engineered already (below the chrome+bulk-keep-blur law by LITERAL
`forceEngineered`, the Map pill/bar precedent — variant-agnostic, budget-free). Effort/risk
per block below. **Zero `theme.ts` edits anywhere in this train; `GlassSurface.tsx` is
never touched.**

### MP0 blocks

**M-56 — FirstLaunchGate boot frame → themed wash.**
1. `App.tsx:186` · target: `color.surfaceMuted` via `useColor()` (FirstLaunchGate mounts
   inside ThemeProvider) · why: B8 — kills the dark-mode white strobe on every launch.
2. Backdrops: n/a (opaque fill, no content).
3. Inks: none (blank frame). Existing token only.
4. RT: n/a. 5. C-lite: n/a.
6. Budget: 0 → 0.
7. PROTECT: none. Testable: the frame renders `surfaceMuted` in both palettes; no white
   literal remains at `App.tsx:186`. (Stage-6 verified: FirstLaunchGate mounts INSIDE
   ThemeProvider — `App.tsx:216→:218` — so `useColor()` is legal there. Recorded residual:
   ThemeProvider's persisted in-app override loads async, so an OS-light/app-dark user gets
   one light-`surfaceMuted` frame; the B8 cohort — OS-dark — gets the dark wash on frame 1.)
8. Effort **S** · risk MINIMAL · rollback = MP0 branch tip revert.

**M-55 — Map filters empty-state card → row+wash family.**
1. `MapScreen.tsx:2150` (+styles `emptyCard`) · target: `<GlassSurface variant="row"
   forceEngineered overlayTint={color.glassMapWash} borderRadius={radius.lg}>` · why: B10 —
   the card joins the exact grammar of the chrome it floats among (M-09/M-10/M-11).
2. Worst-case backdrops: the map regime — `#000`+`#FFF`+the 5 heat saturants
   (`mapEmptyWash`/`mapEmptyWashLite` declarations, copied from the shipped map-stacks
   discipline).
3. Inks: title `textStrong` (9.65 light / 8.31 dark) · body `textMuted` → **`color.text`**
   (7.67 / 6.67) · icon `textSubtle` → **`inkGlassMuted`** (5.36 / 4.85, 1.4.11 at min 3.0)
   · quick-clear chips keep `surfaceNeutral`+`brandText` (pin 6.18/5.69) · reset CTA keeps
   `ctaFill`+white (5.24 both). (Stage-6 note: the target is a FAMILY UNION — the filter
   panel's tint recipe + the status pill's literal-engineered mechanism; no single shipped
   mount carries all four props at once, and the mechanism delta is deliberate per field 5.)
4. RT: variant designed state (overlay 0.97 + borderStrong) — automatic; the wash is never
   painted under RT (primitive contract; the shipped filter-panel precedent).
5. C-lite: engineered-literal always (no mode branch).
6. Budget on Map: 4 → 4 (engineered, +0).
7. PROTECT: none touched; the live-region announce + alert role byte-identical. Testable:
   `accessibilityLabel` string and announce effect unchanged by diff.
8. Effort **S** · risk LOW · rollback = MP0 tip.

**M-52 — UpdateBanner → banner tier (+ the drift fix).**
1. `UpdateBanner.tsx:53` (+styles) · target: `<GlassSurface variant="banner"
   forceEngineered borderRadius={radius.md}>` · why: B11 — the one non-urgent banner on a
   stage joins the banner grammar its same-screen sibling already speaks.
2. Backdrops: stage-deterministic — the shipped pre-composited pool-over-stage stop
   (`updateBanner`/`updateBannerLite` declarations = the shipped banner stack verbatim).
3. Inks: text `brandTextAlt` → **`brandOnSoft`** (the banner grammar's designated ink —
   the keep-trial FAILED dark C-lite 4.42, iteration log in the stacks `_doc`; brandOnSoft
   5.41/6.72 blur · passes Lite both modes) · dismiss X → `brandOnSoft` · **View button
   `color.brand`+white → `ctaFill`+white** — the trials file records the CURRENT dark
   button at **3.42 FAIL** (a live AA drift on shipped Profile, surfaced by
   declared==shipped); ctaFill is 5.24 both modes.
4. RT: banner designed state — `brandSofter` fill + 1px `brand` border (automatic).
5. C-lite: engineered-literal always (deliberate: §2f — Profile's ceiling margin).
6. Budget on Profile: ~10 → ~10 (+0 by mechanism).
7. PROTECT: none; the announce-once effect + dismiss/mark-seen semantics byte-identical.
8. Effort **S** · risk LOW (one component) · rollback = MP0 tip.

**M-43 hygiene line (NOT a material change — M-43 stays ratified-opaque):** correct the
stale comment `ProfileScreen.tsx:1895–:1900` ("matches the visual pattern of AboutScreen"
— About is now bulk glass; the tier explainer deliberately stays the DIALOG tier per §2b;
Stage-6 corrected the range — the comment OPENS at `:1895`). Same hygiene class, same
phase: `SettingsScreen.tsx:449`'s stale "The nav header above is the shared dark chrome"
clause (S8 removed that header — `RootNavigator.tsx:361–:370`). Comment-only edits, zero
rendered output change.

**M-46 — PhotoLightbox chrome ink repair (in-tier repair, NOT a migration — M-46 stays
ratified media-world; conservation unchanged).**
1. `PhotoLightboxModal.tsx` — close X `:102`, empty text `:130`, caption `:142` · target:
   `color.surface` → **`color.textOnBrand`** (mode-independent `#fff`, M-47's shipped
   idiom) · why: §2b Rider 1 — the surface idiom inverts in dark mode (≈1.36 / 1.24 /
   1.6:1 — chrome functionally invisible; Stage-6 find).
2. Backdrops: the lightbox composites — chip `rgba(255,255,255,0.2)` over `backdropStrong`
   (0.75 light / 0.85 dark) over `#000`+`#FFF` photos; caption `backdropCaption` (0.65 /
   0.75) over the same; empty text on bare `backdropStrong`.
3. Inks: the three sites → `textOnBrand` (declared: `lightboxChip` ≥4.8 light / ≥8.1 dark;
   `lightboxCaption` ≥7.2 / ≥10.7; `lightboxBackdrop` ≥10.7 / ≥15 — all pass, banked).
   CURRENT dark state recorded in the trials file (findings record).
4. RT: n/a (no glass). 5. C-lite: n/a. 6. Budget: 0 → 0.
7. PROTECT: none; the SR caption-dedup comment `:75–:80` and `aria`/labels byte-identical.
8. Effort **XS** (3 ink sites, one file) · risk MINIMAL · rollback = MP0 tip.

**M-51 — LiveStatusRegion ink repair (in-tier repair, NOT a migration — M-51 stays
ratified solid-by-semantics; conservation unchanged).**
1. `LiveStatusRegion.tsx` — info-tone fill `:162` + action chip `:176` · targets: info
   fill `color.brand` → **`ctaFill`** (the recorded M-52 fork — dark white-on-brand is the
   3.42 pair verbatim) · chip bg `rgba(255,255,255,0.22)` → **`rgba(0,0,0,0.25)`** · why:
   Stage-6 find — the chip's white text computes 3.21 over successStrong / 3.54 over brand
   light / 2.54 over brand dark, LIVE on the web locate-failure path (`MapScreen.tsx:1115`,
   info + Retry).
2. Backdrops: self (solid pill fills).
3. Inks: white base text on ctaFill = the banked ctaSolid pair (5.24); chip white text
   declared over both fills (`statusChipSuccess` ≈7.1, `statusChipInfo` ≈8.2 — banked).
   Success-tone base text (4.72 on successStrong) unchanged.
4. RT: n/a. 5. C-lite: n/a. 6. Budget: 0 → 0.
7. PROTECT: **P5/S10-S11 shipped surface — announce/dismiss/action SEMANTICS byte-identical**
   (ink-and-fill-only diff; the live-region role, timing, and strings untouched — testable
   by diff + the existing S10/S11 suites staying green).
8. Effort **XS** (2 style values, one file) · risk LOW · rollback = MP0 tip.

### MP1 block

**M-06 — HomeScreen joins the stage.**
1. `HomeScreen.tsx` (single file) · targets: screen root `backgroundColor: color.stage1` +
   `<ScreenStage />` first child (replacing the `surfaceMuted` wash, `:403`) · search pill
   `:220`: legacy `intensity={20}` → `variant="row" forceEngineered
   borderRadius={radius.md}` (kills the app's last legacy pane outside the map's pinned
   pair) · list card `:488`: opaque `surface` card → `variant="row"
   forceEngineered={glassLite}` (ONE pane for the whole six-row card, threading
   `useGlassMode()` like Tasks rows; inner hairline separators kept) · empty/skeleton/error
   swap states ride the same card (their inner Skeleton bars keep `surfaceNeutral`) ·
   header buttons `:405`, locate btn, peek, offline banners, Report pill, section label:
   UNCHANGED (already correct tiers: opaque circles on stage = HeaderActions grammar;
   solid semantics; media peek; CTA) — except the section label ink `textSubtle` →
   **`inkOnStage`** (the stage's arbitrated section-header ink, GLASS §2; shipped-proven,
   re-declared not needed — identical token+backdrop as Tasks/Profile section headers).
   Why: B1/B2/B3 + §2d. **Stage-6 additions (all in-file; the block now enumerates every
   re-ink):** (iv) delete `styles.search`'s hairline `borderWidth/borderColor` (`:416–:418`)
   and `styles.listCard`'s `backgroundColor` + border (`:490–:493`) — the row variant
   paints its own edge and surface (GlassSurface docstring; GLASS §7.2 — double edges and
   opaque fills defeat the material); (v) ScreenHeader eyebrow/subtitle →
   **`inkOnStage`** via the `eyebrowColor`/`subtitleColor` props — the shipped Profile
   precedent verbatim (`ProfileScreen.tsx:898–:901`: "textSubtle/textMuted are below AA
   there"; shipped-stacks records textMuted at 4.10 on the stage); (vi) `rowMeta` (`:366`,
   `:515`) and `searchText` (`:428`) gain the on-glass ≥500 weight
   (`font.family.bodyMedium` — the Tasks TYPE-LAW precedent `TasksScreen.tsx:2131–:2141`);
   (vii) the swap-state texts riding the now-glass card — `errorText` (`:497`) and
   `emptyText` (`:516`), both `textMuted` — → **`inkGlassMuted`** (covered by the banked
   homeRow meta pair 8.01/8.32; GLASS §7.4 bans textMuted on glass).
2. Backdrops: stage-deterministic — `homeRow` bases = the shipped pre-composited darkest
   stops (`#CBDBF4/#D1E2FC/#E7F0FD` light · `#1B2940/#14223A/#0F1F3F/#14151A` dark),
   copied verbatim from shipped-stacks.
3. Inks (all arbitrated, `r2-material.txt`): row titles `textStrong` (14.43/14.24) · row
   meta `textMuted` → **`inkGlassMuted`** (8.01/8.32) · chevron `textSubtle` →
   **`inkGlassMuted`** (1.4.11) · search placeholder `textMuted` → **`glassPlaceholder`**
   (5.44/9.92) · search icon → **`inkGlassMuted`** · search active text `textStrong` ·
   severity dots unchanged (redundant signal — the S1 meta text carries severity; stacks
   `_doc` records the non-declaration reason).
4. RT: rows/pill → overlay 0.97 + borderStrong (automatic); the STAGE STAYS under RT
   (GLASS §6 — only glass goes opaque).
5. C-lite: list card threads `glassLite` → engineered `*Lite`; pill is engineered-literal.
6. Budget: 2 → 2 (§2f).
7. PROTECT: **PROTECT-10/S17** — the peek stays pointer-inert with `suppressAttribution`
   and still SHOWS the live map. Testable, stated precisely (Stage-6): the S17 suite
   (`PlatformMapWeb.reduceMotion.test.tsx:321–:346`) pins the suppressAttribution HALF
   only; the pointer-inert wrapper (`pointerEvents="none"`, `HomeScreen.tsx:270`) has NO
   unit test — its preservation is the source-diff check ("prop present and unchanged"),
   the same comment-enforced posture as the map's box-none law. Honest NEARBY/LATEST +
   no-fabricated-distance logic byte-identical.
8. Effort **M** · risk MED-LOW (one file, no data paths) · rollback = MP1 tip.

### MP2 blocks (Profile list sheets — one recipe, three files)

**M-39 MyReportsModal · M-40 MyWatchedModal · M-38 ActivityFeedModal → bulk (engineered).**
1. `MyReportsModal.tsx:263/:449` · `MyWatchedModal.tsx:273/:429` ·
   `ActivityFeedModal.tsx:216/:335` · target: the shared B4-engineered recipe (header
   block) · why: B6 — Profile's sheet family converges on the About/Feedback material.
2. Backdrops: `profileSheet` — the wave1 bulkSheet app-chaotic worst case
   (`#000/#D92D20/#0B3D8F` light · `#fff/#D92D20/#0B3D8F` dark).
3. Inks (arbitrated): titles `textStrong` (11.24/11.14) · body `color.text` (8.93/8.94) ·
   counters/empty/meta `textMuted`/`textMutedAlt` → **`inkGlassMuted`** (6.24/6.51) ·
   links → **`brandText`** (4.95/5.42) · inner row cards keep opaque
   `surface`/`surfaceMuted` fills where they exist (the B4e Nearby precedent: cards stay
   opaque ON the glass sheet) · status pills keep their own bg/fg (pin `statusOpen`
   5.47/6.23) · SearchInputRow (M-39/M-40 only — M-38 has none) keeps its opaque input
   field (text-input-on-glass is banned by §2b's dialog logic; the input keeps
   `surfaceSoft`). **Stage-6 site-naming (the role map's textSubtle clause applies):**
   MyWatched's rows are TRANSPARENT — not inner cards — so its row inks are genuinely
   on-glass: `rowDate` (`:236` render / `:456` style, textSubtle) → `inkGlassMuted` +
   ≥500; the empty-state Star icon (`:376`, textSubtle) → `inkGlassMuted` (1.4.11);
   ActivityFeed `sectionHeaderCount` (`:439`, textSubtle) → `inkGlassMuted`. MyWatched's
   destructive **Clear-all chip keeps `errorBg`+`color.error`** (semantic pill rule —
   never flatten to brandText). **M-40's full-screen load-error** (`:369`, style `:441`)
   currently renders BARE `color.error` text on the sheet — it adopts the sibling
   errorBanner pattern (self-contained solid `errorBg`+`color.error` banner, as MyReports
   and ActivityFeed already ship) instead of bare error-on-glass; no new pair needed
   (self-contained pin class, registered in the stacks `_doc`).
4. RT: designed bulk state (overlay 0.97 + borderStrong top edge) — automatic.
5. C-lite: engineered-literal always.
6. Budget: +0 anywhere (engineered).
7. PROTECT: none frozen on these three; testable statements — each modal's aria-label,
   `SearchInputRow` behavior (M-39/M-40), empty-state semantics, and watch/unwatch actions
   byte-identical; only container material + the named ink styles + the on-glass ≥500
   weight rule change. Hygiene flag for Sky (pre-existing, NOT introduced or silently
   fixed here): **MyWatchedModal lacks `accessibilityViewIsModal` today** — the app-wide
   containment blanket misses this one sheet; the byte-identical rule carries the gap
   forward; §6 register item.
8. Effort **M** (3 files, mechanical) · risk LOW · rollback = MP2 tip.

### MP3 blocks (the overlay remainder)

**M-37 AchievementsModal · M-22 LeaderboardScreen · M-42 NotificationPrefsModal ·
M-24 NotificationPreferencesScreen → bulk (engineered).**
1. `AchievementsModal.tsx:187/:74` · `LeaderboardScreen.tsx:273/:427` ·
   `NotificationPrefsModal.tsx:145/:258` · `NotificationPreferencesScreen.tsx:134/:218` ·
   target: the shared recipe · why: B6/B7 — the remainder of the overlay tier converges;
   Achievements/ActivityFeed lose their `surfaceMuted` wash variant (one sheet material,
   not two).
2. Backdrops: `profileSheet` (all four host over Profile/Settings stacks).
3. Inks (arbitrated): the shared set, plus per-sheet pins — Achievements earned icon
   `goldDark` on `achievementEarnedBg` (pin, 1.4.11 — **4.15**/8.59 vs 3.0 floor,
   Stage-6-corrected figure; the icon is paired with its own text labels) · Leaderboard
   podium rows keep their tier washes (pin `podiumGold` 12.15/11.20; silver/bronze are
   higher-contrast neutrals of the same family — opaque hexes both themes) · the
   notification sign-in notices keep their `accentOrange` BORDER on opaque `warningBg`
   (Stage-6 correction: neither file has accentOrange ICONS — the earlier `_doc` wording
   was a phantom). **Stage-6 site-naming + drift re-inks:** M-22 `stateHint`
   (`:563–:568`; error `:359` + all-time-empty `:383` states) is textSubtle DIRECTLY on
   glass (~3.5:1) → **`inkGlassMuted`** (the role map's textSubtle clause); the
   empty-state Trophy `goldAccent` icon (`:375`) is decorative-paired → registered in the
   `_doc` NOT-DECLARED list; M-42's default-colored ActivityIndicator (`:190`) →
   **`color.text`** (M-24's own inked-spinner pattern `:177–:182`). Leaderboard also
   absorbs three shipped-drift re-inks the sweep surfaced (M-52 class, file already in
   scope): retry button (`:573/:583`) and active segment (`:486/:495–:499`) fills
   `color.brand`+white → **`ctaFill`**+white (the dark pairing is the recorded 3.42 FAIL
   verbatim); `rankTop` (`:519`) `color.brand` on tierGoldBg (dark ≈4.45 FAIL) →
   **`brandText`** (declared on podiumGold: ≈5.4 light / ≈6.6 dark, banked).
   **M-37 locked-row translucency (Stage-6 find, framed not decided):** `rowDimmed:
   {opacity: 0.7}` (`:126`, applied `:248`) makes every unearned row a 30%-translucent
   pane — the "inner cards stay opaque" premise is FALSE for that state, and locked
   `rowDesc` (textMuted) is already ≈3.0:1 light on the OPAQUE card today (pre-existing
   sub-AA, SR-mitigated by the row-level label `:243–:250`), drifting to ≈2.9 over glass.
   Sky's either/or (§6): accept-and-record the dimmed idiom, or re-spec locked styling
   (e.g. explicit muted inks at opacity 1). The block ships accept-and-record by default —
   the drift is a pre-existing legibility posture, not a migration regression.
4. RT: automatic designed state. 5. C-lite: engineered-literal.
6. Budget: +0.
7. PROTECT: none frozen; testable — Leaderboard podium ORDER/labels (pure index functions,
   `:29–:34`/`:161–:163`), notification toggle semantics, Achievements earned/locked logic
   byte-identical; the ONE genuinely shared M-42/M-24 string ("Sign in to save
   notification preferences.", `:186`==`:173`) plus each surface's own copy byte-identical
   (Stage-6 precision: the surfaces deliberately differ everywhere else — titles,
   subtitles, footers, disjoint toggle sets). Executor guard: Leaderboard's shipped
   `removeClippedSubviews`/`initialNumToRender` (`:394–:395`) stays — no mid-recipe
   "cleanup". **Honesty line (Stage-6):** M-24 is default-hidden behind
   `PUSH_NOTIF_TYPES_ENABLED=false` (Sky Decision 2 Option B, "hide, don't wire") —
   unreachable in production at HEAD; it migrates anyway so the eventual flag-flip lands
   inside the one-material world.
8. Effort **M-L** (4 files) · risk LOW-MED (Leaderboard has the densest inner styling) ·
   rollback = MP3 tip.

### MP4 blocks (the trust ledger — hardest, PROTECT-heavy)

**M-36 FlagDetailModal · M-41 StatusHistoryModal → bulk (engineered).**
1. `FlagDetailModal.tsx:732/:1495` (82 KB) · `StatusHistoryModal.tsx:134/:222` · target:
   the shared recipe · why: B4/B5 — every S3 doorway lands on the one-material world; the
   trust ledger finally wears it.
2. Backdrops: `detailSheet` — the UNION regime (hosts span Map callout + Tasks + Profile +
   over-Nearby): sheetMap's regime-diluted tile bases + the app-chaotic set, both modes —
   the widest base list in the corpus (14 bases).
3. Inks (arbitrated on the union): titles `textStrong` (11.24/11.14) · body `color.text`
   (8.93/8.94) — **`description` is textStrong at HEAD (`:1614`) and STAYS textStrong**
   (Stage-6: no down-ink) · meta/timestamps/ledger muted → **`inkGlassMuted`** (6.24/6.51)
   · links/actions → **`brandText`** (4.95/5.42) · photo strip (PhotoGallery) untouched —
   inner media cards opaque; comment bubbles keep `surfaceNeutral` fills; severity/status
   badges keep their own arbitrated fills+`textOnColor` (PROTECT-4); the edit-mode
   severity buttons byte-identical. **Stage-6 REFUTED-and-repaired coverage gap — the
   reopen button:** `reopenBtnText` + `reopenBtn` border (`:1936–:1946`, the F10 "Still
   broken? Request reopen" outlined action, shown to every non-reporter on any resolved
   flag) are `color.accentOrange` TEXT at 14px semibold directly on the card — **already
   2.07:1 on light `surface` at HEAD** (a live shipped AA drift, recorded in the trials
   file) and ≈1.47:1 on the light glass composite. Disposition: text + border re-ink →
   **`brandText`** (the links/actions rule; dedicated pair banked on detailSheet
   4.95/5.42). ⚑ SKY-FLAG: this retires the orange affordance on that one button for AA —
   the orange is affordance flair, not the severity grammar (PROTECT-4 rides badges);
   veto-able at merge. Also pinned: `coordsCopyGlyph` (`:966`/`:1658`) `color.brand`
   interactive icon → declared at the 3.0 icon floor on detailSheet (3.71 light / ≈3.5
   dark, banked; SR label present).
4. RT: automatic designed bulk state per sheet.
5. C-lite: engineered-literal (both sheets, all hosts).
6. Budget: +0 — including the deepest stack (Tasks worst-12 → FlagDetail → StatusHistory
   = still 12; both sheets engineered). This is WHY the tier is engineered-literal.
7. PROTECT (testable statements, each verified at the phase gate; Stage-6-corrected
   anatomy):
   - **S3 read half byte-preserved:** the in-file ledger CONTENT — "Reported by" /
     "Reported anonymously" / "Reported on {date}" (`:913/:917/:936`), status
     announcements (`:429–:435`), status-history entries, verifier semantics — renders the
     same strings; the changes are container material + the named ink styles + the
     on-glass ≥500 weight rule, nothing else. ("Reported {relativeTime}" lives in
     `PlatformMap.tsx:330` / `PlatformMap.web.tsx:455`, pinned by
     `MapScreen.detail.test.ts:120/:135` — preserved by file-disjointness, not by this
     block.) Fork 5's decision half untouched (no count, no guest flag-as-wrong).
   - **PROTECT-7:** the modal reduced-motion gate (`animationType` RM branch, both files)
     unchanged.
   - **StatusHistoryModal's ledger meaning unrestyled:** entry dots keep their status
     colors; each entry is ONE `entryLine` (`:307–:311`, textStrong 600) and **STAYS
     textStrong** — only `loadingText` (`:254`) and `emptyBody` (`:268`) re-ink to
     `inkGlassMuted` (Stage-6: the earlier "date/mono text" bullet described anatomy the
     file doesn't have; followed literally it would have down-inked the honesty surface).
   - The `:356` `visible={false}` placeholder Modal untouched.
   - PhotoGallery/PhotoLightbox (M-46/M-47) untouched by MP4 — media-world ratified
     (M-46's chrome ink repair rides MP0, a different file).
8. Effort **L** (one 82 KB file — Stage-6-honest magnitude: ~60 ink sites to CLASSIFY
   on-glass vs inner-opaque, of which ~12–20 actually re-ink; the block's ink map + the
   pre-passed union declaration keep it single-window) · risk MED — highest-value,
   most-visited sheet; mitigations: material-only diff discipline (B4d precedent held for
   PROTECT-3), the union declaration, the phase's own arbiter re-run, and the shipped clip
   pattern (the card gains `overflow:'hidden'`; no shadow to relocate — the card has none
   at HEAD) · rollback = MP4 tip (independent revert).

### MP5 blocks (chrome completion — optional caboose)

**M-23 AdminScreen + M-49 the last nav header → editorial stage family.**
1. `AdminScreen.tsx` + `RootNavigator.tsx:371–:381` · target: Admin adopts
   `headerShown:false` + in-screen editorial `ScreenHeader` (menu action via
   `HeaderActions` — the S8 Settings pattern verbatim, `SettingsScreen.tsx:231–:232` /
   `:465–:477`, all imports landing in AdminScreen.tsx), root `stage1` + `<ScreenStage />`,
   section cards → `variant="row" forceEngineered` (utilitarian list → engineered, §2a
   rule) · why: B14 — the S8 header family reaches its last screen; the nav-header code
   path retires app-wide. **Stage-6 grammar note (recorded exception):** Admin is a
   FlatList (list-class content; its shipped header is a fixed zone), so §2a's default key
   says chrome-pane — the block instead mounts ScreenHeader as the FlatList's
   **`ListHeaderComponent`**, making the header scroll away (document-grammar behavior BY
   CONSTRUCTION). Chosen deliberately: a chrome pane would move Admin's budget 1→2 for a
   gated, low-traffic utility screen; the mount point is pinned so no third
   fixed-View-above-list pattern appears. **Escape affordance (Stage-6):** today's escape
   is the drawer menu + tab bar (bottom-tab headers have no back button); the
   loading/denied states ALSO render the ScreenHeader + HeaderActions above their centered
   comps so the drawer stays reachable in all three states (tab-bar escape remains
   regardless).
2. Backdrops: stage-deterministic (`homeRow` declarations cover the row material; the
   stage-direct set is shipped-arbitrated — inkOnStage/textStrong/`#333`-text pairs in the
   shipped + wave2 sets, noted in the stacks `_doc`).
3. Inks: titles/body per the standard arbitrated set; `sevPill` fills keep
   severity+`textOnColor` (PROTECT-4 pins); error/action buttons keep semantic solids
   (retry `error`+`textOnBrand`, dismiss `surfaceNeutral`+`text` — self-contained).
   **Stage-6 enumeration (the stage-direct re-inks the earlier draft compressed away —
   light `textMuted`-on-stage is the documented 4.10 AA-fork loser):** denied body (`:88`)
   · list-header meta (`:245`) · empty body (`:257`) — all textMuted → **`inkOnStage`**;
   Lock icon (`:84`, textMuted) + empty Inbox icon (`:253`, textSubtle) → **`inkOnStage`**
   (1.4.11 icon posture; the M-55 precedent). Dark mode is a no-op (dark textMuted ≡ dark
   inkOnStage `#AAAAAA`). Spinners stay `brand` (non-text, transient, ≥3.0 both modes —
   registered).
4. RT: automatic. 5. C-lite: engineered-literal rows.
6. Budget: 1 → 1 (Stage-6 verified: the tab bar DOES render on the Admin route —
   `tabBarButton: () => null` hides only Admin's own button; AdminScreen pads for the
   visible bar via `useBottomTabBarHeight`).
7. PROTECT: the admin GATE (defense-in-depth check) byte-identical — testable: the
   `isAdmin` branch logic (`:37/:73/:81`; core in `src/lib/admin.ts`, a third file this
   phase never touches) + denied-state copy (`:86/:89`) unchanged; only presentation moves.
8. Effort **M** · risk LOW (gated, low-traffic) · **Sky may skip this phase entirely** —
   it is last and self-contained; skipping leaves B14 as a recorded, deliberate exception
   (and the executed conservation count reads 13/15, absorbed by that same clause) ·
   rollback = MP5 tip revert.

---

## §4 RATIFIED-STAYS ledger (42 rows — the written reasons)

- **M-01 Tasks · M-02 Profile · M-03 Settings · M-04 Resources · M-05 HowToHelp** — the
  shipped stage world; the two header grammars are design (§2a).
- **M-07..M-11, M-18, M-19** — map-world composition as shipped (§2c; §12 law).
- **M-12 locating banner · M-13 HeatmapLegend** — the always-light LAW is the design
  (§12.8); legacy implementation ratified as its accepted cost; optional swap framed in §6.
- **M-14 saved-place chips** — always-light literals; **Fork 8 owns the dark half** —
  frame-only.
- **M-15 denied banner · M-16 heat disclaimers · M-17 map offline** — solid-by-semantics
  (§2b).
- **M-20/M-21 name prompts · M-43 tier explainer · M-44 delete-account** — the DIALOG
  tier (§2b): decision/input moments; destructive gravity; text-input legibility. (M-43:
  comment hygiene in MP0.)
- **M-25..M-35** — the BENCH-3 unified bulk tier: the closed baseline this spec extends;
  their blur-vs-engineered mechanism is Sky's standing one-prop lever (B4 flag #2),
  framed in §6, never re-litigated here.
- **M-45 drawer · M-46/M-47 lightboxes** — deliberate-opaque + media-world (§2b).
- **M-48 tab bar** — **glass-mechanism adoption KILLED by trial** (`r2-trials.txt`,
  exit 1): on the true chrome floor the tab inks fail 4/4 — light active **3.82**,
  light inactive **2.64**, dark active **3.99**, dark inactive **4.35** (floor 4.5; the
  trial's floors are honest == `glassChromeFloor`, Stage-6 reproduced). Stage-6 corrected
  the kill's ground on three points: (1) the bar's own glass floor is
  **`tabBarGlassFloor` 0.82 light / 0.85 dark** — the earlier-quoted 0.92 is `tabBarBg`,
  the RT/web surface; (2) the primitive DOES offer a lawful floor-thickener
  (`overlayTint`) — a ≈0.30–0.35 tint would rescue DARK adoption (4.95–5.12) — but LIGHT
  adoption dies regardless: the shipped light inactive `#6B7280` needs ≥0.967 effective
  white (optically dead glass ≈ the RT overlay), so no prop set passes both modes with
  shipped inks; (3) re-inked labels are numerically viable but fail the restraint check
  (four new arbitrated inks + a visible identity change to the app's most persistent
  chrome, for a pure mechanism swap) — noting that ONE of those re-inks is obligatory
  anyway per the drift below, so it is not an adoption-only cost. The kill STANDS on the
  corrected ground. **New shipped-truth drift (Stage-6, M-52 class, recorded in the trials
  file):** the shipped bar's light-mode INACTIVE 12px label fails 4.5 on every translucent
  state — 3.17 on the 0.82 glass floor / 4.04 on the 0.92 RT+web surface over the `#000`
  worst case (dark passes everywhere; `theme.ts:181`'s "~4.8 on white" measured a state
  the translucent bar never reaches; the failing case is live — dark photos under the bar,
  the always-dark web map tiles). The fix needs a theme.ts ink token — outside this
  train (§6); Part 3 slates it. TabBarGlass is RATIFIED as the documented chrome-family
  sibling (RT-aware, i=24, counted manually per §12.7). GLASS §8's "later cleanup" line
  should gain a pointer to this kill (doc edit, §6).
- **M-49** — migrates with M-23 (listed in §2g under migrate; here only for
  completeness of the header story).
- **M-50 FlashBanner/reward pill · M-51 LiveStatusRegion · M-53 offline/error family** —
  solid-by-semantics (§2b); LiveStatusRegion additionally P5-shipped PROTECT surface.
- **M-54 error boundaries + ScreenFallback** — system-integrity tier (§2b).
- **M-56** — migrates (MP0); listed in §2g under migrate.
- **M-57 web splash + focus ring + noscript** — deliberate boot design, scheme-aware,
  RM-safe; ratified with the hex-sync maintenance note (§6). Stage-6 precision: exactly
  **10 distinct non-white hexes (~20 occurrences)** + 1 in app.json; the focus ring
  `#1466E0` == brand/ctaFill today (drift-safe); the pre-paint backgrounds are already
  near-miss adrift by design (`#111111` vs app `#121214`, `#ffffff` vs `#f7f9fc`) —
  imperceptible, but proof the sync is manual: §6.6's note is justified, not cosmetic.

*(M-06, M-22, M-23, M-24, M-36..M-42, M-52, M-55 — see §3 migration blocks.)*

## §5 DEPENDENCY GRAPH (acyclic; the train is linear on top of it)

- **File-coupling:** MP0 touches `App.tsx`, `MapScreen.tsx`, `UpdateBanner.tsx`,
  `PhotoLightboxModal.tsx`, `LiveStatusRegion.tsx`, `ProfileScreen.tsx` +
  `SettingsScreen.tsx` (comments only) — disjoint from MP1 (`HomeScreen.tsx`), MP2 (3
  modal components), MP3 (4 modal components/screens), MP4 (2 modal components), MP5
  (`AdminScreen.tsx` + `RootNavigator.tsx`). **No two phases share a file** (Stage-6
  verified, including the subtle cases: UpdateBanner is pure-presentation — its
  ProfileScreen mount passes no style prop; M-55's styles are MapScreen-local).
- **Recipe maturity (soft ordering):** MP2 → MP3 → MP4 apply the same sheet recipe in
  rising complexity — the 82 KB FlagDetail goes LAST among sheets so the recipe is proven
  on six simpler sheets first (hardest/riskiest last, per the train law).
- **Backdrop families:** MP2/MP3 share `profileSheet`; MP4 uses the union `detailSheet`;
  MP0/MP1 use the stage + map families; MP5 the stage family. The spec-level stacks file
  covers all — no phase needs a new declaration unless its diff drifts from spec (gate 4).
- **No cycles:** MP0 ← nothing; MP1 ← nothing (MP0 ordering is taste: first-frame fix
  ships first); MP2 ← nothing; MP3 ← MP2 (recipe); MP4 ← MP3 (recipe); MP5 ← nothing
  (placed last by value). Linear execution order: MP0 → MP1 → MP2 → MP3 → MP4 → MP5.

## §6 OPEN-QUESTION REGISTER (framed for Sky — never decided here)

1. **Fork 8 (unchanged):** saved-place chips' dark variant — the chips are censused
   (M-14) and ratified as-is; the dark-mode half remains entirely Sky's.
2. **The map's legacy always-light pair (M-12/M-13):** (a) KEEP the legacy GlassSurface
   implementation (default — ratified above; zero change, keeps the two accepted
   BlurViews), or (b) swap to always-light LITERAL engineered fills (same 0.82/0.95
   literals as flat fills + the RT branch; kills 2 map BlurViews; the frost-over-dark-tiles
   feel is the cost, and frost feel is device-read territory). Either/or; (b) would be a
   one-phase addendum if chosen.
3. **Mechanism uniformity across the bulk tier:** the NINE B4 sheets ship live blur; the
   NINE newly-migrating sheets ship engineered-literal (the budget law forces it for the
   Tasks-hosted FlagDetail, and §2a's rule generalizes it). Sky's standing one-prop lever
   (B4 flag #2) can later flip either family to match the other after the on-device
   frost/perf read. Frame only — the arbiter floors cover both mechanisms everywhere.
4. **`ui/Sheet`'s opaque default path (zero consumers):** adopt-for-something vs remove —
   the Fork-9-adjacent adopt-or-remove family. This spec ships hand-roll (§2e) and leaves
   Sheet untouched.
5. **GLASS.md doc refresh ownership:** after the train lands, §8's Home line needs the
   chrome→row pill correction; §8's tab-bar "later cleanup" line should cite the M-48
   kill table; the drawer + dialog-tier ratifications deserve one-line §7/§8 notes. Doc
   edits — does the EXECUTOR land them as the train's final commit, or does Sky?
6. **M-57 hex-sync note:** add a "keep in sync with theme.ts" comment block to
   `public/index.html`'s splash styles (a comment-only hygiene edit), or leave the file
   untouched. Trivial either/or.
7. **MP5 (Admin) include/skip:** self-contained caboose; skipping records B14 as a
   deliberate exception rather than a migration.
8. **M-37 locked-row idiom (Stage-6):** Achievements' `rowDimmed {opacity: 0.7}` makes
   unearned rows translucent over the new glass, and locked `rowDesc` is ≈3.0:1 light
   TODAY on the opaque card (pre-existing, SR-mitigated). Accept-and-record (the block's
   default) vs re-spec locked styling (explicit muted inks at opacity 1) — Sky's call.
9. **MyWatchedModal containment gap (Stage-6, pre-existing):** the one sheet missing
   `accessibilityViewIsModal`; the app-wide blanket covers every other sheet. Fix is a
   one-prop hygiene change OUTSIDE this material train — Sky's call where it lands.
10. **The lightbox blacks (Stage-6):** M-47's literal `rgba(0,0,0,0.92)` vs the
    `backdropStrong` token that `theme.ts:136` says should own lightbox backdrops —
    tokenize M-47 (visible change: 0.92 → 0.85/0.75) vs record the deeper black as
    deliberate for paged viewing. Either/or.
11. **Dialog-tier craft deltas (Stage-6, Part-3 material):** shadow.e3 two-of-four +
    fade/slide entrance split across the ratified dialog tier — unify or record; not
    material work, listed here so Part 3 sees it.
12. **M-48 light inactive ink (Stage-6 drift):** fixing the shipped tab bar's light
    inactive AA failure (3.17/4.04) needs a darker inactive token in `theme.ts` — outside
    this train by the zero-theme-edits rule; Part 3 slates it (a `#3F4854`-class ink also
    happens to be the one that would survive the chrome floor, per the M-48 kill record).

**Zero new tokens are proposed anywhere in this spec** — every ink maps to an existing
arbitrated token; `theme.ts` and `GlassSurface.tsx` are untouched by the entire train.

## §7 THE MP TRAIN (Sky-gated, Opus-executable, stop-on-branch)

Convention: linear train, each branch cut from the prior phase's tip (Round-1 uplift
convention); every phase ends **built + green + STOPPED** — not merged, not pushed, not
device-built. Sky merges; Sky owns D-gates. GATES (all hard, every phase): `npm run
typecheck` 0 · `npm test` green (count recorded in the phase report) · `npm run lint`
clean (0 errors, no new warnings) · the phase's arbiter declaration exit 0 — the spec-level
`tools/r2-material-stacks.json` covers every phase; a phase re-runs it verbatim and adds a
sibling `tools/r2-mp{n}-stacks.json` ONLY if its shipped values drift from spec (drift =
re-declare == re-run) · the §3 PROTECT statements for its blocks re-verified by diff ·
RT + C-lite behavior implemented as specced, not deferred · the seven immutable prior
stacks files untouched (diff-check).

| Phase | Branch | Scope (M-ids) | Size rationale (one Opus window) |
|---|---|---|---|
| **MP0 — first frame + cheap coherence** | `r2/mp0-first-frame` (cut from the train's base — the tree Sky designates; this spec was authored at `a8549ff`) | M-56 · M-55 · M-52 · (+M-46 and M-51 in-tier ink repairs — Stage-6 drift fixes, not migrations · +M-43/Settings comment hygiene) | 7 files, 5 S/XS-size mechanical blocks + 2 comments; the highest feel-per-line phase |
| **MP1 — Home joins the stage** | `r2/mp1-home-stage` (from MP0 tip) | M-06 | 1 file; the §3 block enumerates every mount + every re-ink (Stage-6-completed: border/fill deletes, header re-ink, ≥500 weight, swap-state inks); no data paths |
| **MP2 — Profile list sheets** | `r2/mp2-profile-lists` (from MP1 tip) | M-39 · M-40 · M-38 | 3 files, one shared recipe applied three times |
| **MP3 — overlay remainder** | `r2/mp3-overlay-rest` (from MP2 tip) | M-37 · M-22 · M-42 · M-24 | 4 files, same recipe; Leaderboard is the dense one — still material-only |
| **MP4 — the trust ledger** | `r2/mp4-trust-ledger` (from MP3 tip) | M-36 · M-41 | 2 files; ONE is 82 KB with ~15–20 ink sites — the spec's ink map + the union declaration make it single-window; hardest last |
| **MP5 — Admin editorial (optional)** | `r2/mp5-admin-editorial` (from MP4 tip) | M-23 · M-49 | 2 files; self-contained; skippable by Sky |

Every migrating M-id appears in exactly one phase: MP0 {52,55,56} · MP1 {06} · MP2
{38,39,40} · MP3 {22,24,37,42} · MP4 {36,41} · MP5 {23,49} — 15/15 ✓. **The train never
executes in the audit window.** Execution model note: any capable model executes from this
file + the stacks JSON with zero design re-derivation; per Sky's norms the likely executor
is Opus 4.8, phase by phase, each phase a separate Sky-gated window.

## §8 PROCESS LOG

- **Census:** 3 completeness-critic rounds (2 misses R1, 1 miss R2, PASS R3) — banked in
  `03_material_census.md` §5.
- **Arbiter iterations (Stage 4):** draft 1 ran 70 pairs, 7 FAILs → (i) goldChip probe
  corrected (mis-declared bg + floor; not an app drift), (ii) M-52 keep-trial ink killed by
  the dark C-lite pair (4.42) → uniform `brandOnSoft` re-ink, (iii) the two deliberate
  trials split to `r2-trials-stacks.json` (exit-1-by-design findings record: the M-48 kill
  4/4 + the M-52 dark View-button drift 3.42). Proposed world at Stage 4: 64 pairs, exit 0.
- **Skeptic verdicts (Stage 6) — 11 fresh-context adversarial skeptics, Fable 5 max, two
  waves; raw digests banked at `partials/stage6-verdicts-wave1.md`:**
  - S1 Home stage-adopt: 3 CONFIRMED · 4 ADJUSTED — decision stands; MP1 block completed
    (border/fill deletes, eyebrow/subtitle → inkOnStage, ≥500 weight, swap-state inks) and
    the S17-half PROTECT wording corrected.
  - S2 scaffold + grammars + budget: A/B CONFIRMED (8/9 consumers-only precision;
    Changelog lone-exception line added; Settings `:449` stale comment → MP0) · C ADJUSTED
    (Tasks +tab term 12–13; Profile true worst ~7; Android caveat).
  - S3 Profile list sheets: 5 CONFIRMED · 1 ADJUSTED — virtualization safe on the shipped
    B4 precedent; M-40 error-state gap closed (errorBanner pattern); textSubtle role-map
    clause + destructive-pill guard added; MyWatched containment gap flagged (§6.9).
  - S4 MP3 overlay remainder: 3 REFUTED (ink coverage) → repaired: M-22 stateHint
    textSubtle re-ink + Trophy register entry + rowDimmed either/or (§6.8) + goldChip
    4.15 correction + accentOrange phantom fixed + M-42 spinner ink; M-24 unreachability
    honesty line added; Leaderboard drift re-inks absorbed (retry/segment → ctaFill,
    rankTop → brandText).
  - S5 trust ledger (MP4): claim 6 REFUTED → the reopen-button accentOrange find (2.07
    light at HEAD; disposition brandText + SKY-FLAG); coordsCopyGlyph pinned; PROTECT
    anatomy corrected (relativeTime lives in PlatformMap; StatusHistory's entryLine stays
    textStrong); description stays textStrong; honest ink magnitude ~60/~12–20.
  - S6 MP0 trio: A/B/C fully CONFIRMED (FirstLaunchGate is inside ThemeProvider; the
    M-52 3.42 drift independently recomputed; the 4.42 keep-trial reproduced) · D
    ADJUSTED (M-43 comment range `:1895–:1900`).
  - S7 Admin (MP5): 4 CONFIRMED · 2 ADJUSTED — grammar exception recorded
    (ListHeaderComponent mount; budget-motivated), escape affordance pinned for all three
    states, the 4–5 stage-direct re-inks enumerated (light textMuted-on-stage = the 4.10
    fork loser).
  - S8 drawer/media/dialog stays: A/C survive with stronger wording (the 13>12 ceiling
    argument; the dialog tier's real deltas recorded; census "scrim-less" corrected in the
    tier's favor) · B's M-46 dark-chrome claim REFUTED → the MP0 in-tier ink repair +
    the three-blacks either/or (§6.10).
  - S9 semantics/system/boot/M-48: A.3 REFUTED → the M-51 chip/info drift (MP0 repair);
    B.2 mechanism corrected (ThemeContext's total default is load-bearing — flagged for
    Part 3's PROTECT update); C confirmed exactly (10 hexes); D — the M-48 kill SURVIVES
    on corrected ground (floor 0.82 not 0.92; overlayTint could rescue dark only; the
    light inactive ink is the killer) + D.4 REFUTED → the shipped bar's own light-inactive
    drift (3.17/4.04) recorded for Part 3 (§6.12).
  - S10 census fidelity sweep: 24 remaining rows clean at exact lines; 3 census defects
    fixed (M-19 attribution; GlassSurface count 51; FlashBanner tree position) + the §5
    "34" slip; zero rows re-classified.
  - S11 train integrity: 6 CONFIRMED · 1 REFUTED → MP5's rollback anchor added; census
    section headers corrected; partition 15/15, file-disjointness, gates, gate-checksums
    all verified.
  **Verdict-application arbiter re-run (Stage 4 re-entry):** every Stage-6 repair declared
  and re-run — proposed world now **80 pairs, exit 0**; the trials file grew into the
  shipped-drift record (**exit 1 by design**: the M-48 kill + SIX shipped-drift families —
  M-52 View 3.42 · M-36 reopen 2.07 · M-48 light-inactive 3.17/4.04 · M-51 chip
  3.21/3.54/2.54 · M-22 rankTop 4.46 · M-46 dark chrome 1.31/1.26/1.10). Both banked
  under `assets/arbiter/` with fresh headers.
- **Model provenance + halts (disclosed, never silent):** the entire part ran on Claude
  Fable 5 max effort, all sub-agents included. TWO Fable availability halts interrupted
  Stage 6, per the audit's halt protocol: (1) credit exhaustion at the first skeptic
  launch — three agents terminated before any verdict landed; (2) the session limit
  mid-wave-2 — five agents terminated with partial progress. Sky resumed the session both
  times ("resume"); every skeptic scope re-ran to completion on Fable 5 (wave-2 agents
  resumed from their own transcripts). No verdict in this log came from a degraded model.
