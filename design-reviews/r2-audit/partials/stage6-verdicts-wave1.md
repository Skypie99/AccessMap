# Stage 6 — skeptic verdicts, WAVES 1–2 (banked mid-pass; crash insurance)

Six fresh-context skeptics, Fable 5 max, all read-only at HEAD `a8549ff`. Zero decision-level
refutations; one claim-level REFUTED (MP4 ink coverage). Wave 2 (MP3 · MP5 · drawer/media/dialog
stays · semantics/boot/M-48 stays · census-fidelity sweep) crashed on the Fable session limit
mid-run 2026-07-10 and is being resumed; apply-edits pass runs after it lands.

## Verdicts

**S1 — Home stage-adopt (§2d + MP1).** 3 CONFIRMED · 4 ADJUSTED · 0 REFUTED. Decision stands.
Adjustments: (a) MP1 block omits three in-file edits — delete `styles.search` hairline border
(`HomeScreen.tsx:416–:418`) + `styles.listCard` bg/border (`:490–:493`) (variant paints its own
edge/surface, GLASS §7.2); ScreenHeader eyebrow/subtitle → `inkOnStage` via eyebrowColor/
subtitleColor (Profile precedent `ProfileScreen.tsx:898–:901`; textSubtle/textMuted are below AA
on the stage — shipped-stacks doc records textMuted 4.10); rowMeta/searchText gain the on-glass
≥500 weight (Tasks TYPE-LAW precedent `TasksScreen.tsx:2131–:2141`); error/empty swap texts
(`errorText:497`, `emptyText:516`, both textMuted) re-ink to `inkGlassMuted` (existing homeRow
meta pair covers). (b) §2f Home row: worst incl. open AddressSearch bulk sheet = 3 before / 3
after (Δ HOLD unchanged) — state it. (c) PROTECT: S17 suite pins ONLY the suppressAttribution
half; the pointer-inert wrapper has NO unit test — preservation is source-diff (same posture as
the box-none law). (d) §2d.3 "zero legibility cost" survives only via the three added re-inks.

**S2 — scaffold + grammars + budget (§2e/§2a/§2f).** A/B CONFIRMED with wording fixes; C ADJUSTED.
(a) §2e: B4a EDITED the Sheet scaffold (additive glass path) — "consumers-only" is 8/9; add one
written line ratifying Changelog as the lone scaffolded member (no-exception-without-reason);
"avatar headers" → Leaderboard podium avatars/segmented tablist (wording). (b) §2a confirmed;
Settings `SettingsScreen.tsx:449` carries a STALE nav-header comment (S8 removed that header) —
add to MP0 comment hygiene. (c) §2f: Tasks row must state the tab term — worst incl. tab = 12–13
(pre-existing GLASS §3-vs-§12.7 tension, Δ HOLD unaffected); Profile true worst ≈ 6 blur-capable
(hero `:942`, point-history `:1098`, nearest banner `:1234`, 3 Stat cards) + tab = ~7, not ~10
(RecentlyViewedRow + all 3 ReportsBreakdownCard panes are literal `forceEngineered`) — over-count,
safe direction; add Android caveat (variant path always engineered; LEGACY generation + TabBarGlass
still mount BlurViews on Android, per GLASS §5).

**S3 — Profile list sheets (MP2).** 5 CONFIRMED · claim 3 ADJUSTED. Virtualization safe (FlatLists
live INSIDE bulk GlassSurface in the shipped B4 precedent; material renders as absolute-fill
sibling). Adjustments: (a) `profileSheet` declares the 0.85 blur floor as a conservative lower
bound for the engineered gradient (bench3 discipline, documented in `_doc` item 5) — state
accurately in the recipe (not "layer-by-layer"). (b) GENUINE GAP: MyWatchedModal full-screen
load-error renders BARE `color.error` on the sheet (`MyWatchedModal.tsx:369`, style `:441`) —
spec the sibling errorBanner pattern (solid errorBg + color.error self-contained, as
MyReports/ActivityFeed) for M-40; add `_doc` register note. (c) Name in the block: textSubtle
on-glass sites (MyWatched `rowDate:456`, empty icon `:376`; ActivityFeed `sectionHeaderCount:439`)
fall under muted→inkGlassMuted role mapping; MyWatched rows are TRANSPARENT (inner-cards-keep-
opaque is vacuous for M-40 — its rows re-ink per role); destructive Clear-all chip KEEPS
errorBg+color.error (pill rule — never flatten to brandText); ActivityFeed has no SearchInputRow.
Hygiene flag: MyWatchedModal lacks `accessibilityViewIsModal` today (pre-existing; flag, don't
silently add). ≥500 sites enumerated (MyReports subtitle:387, emptyBody:413/420/427; MyWatched
rowDate:236? [skeptic cited :236 and :456 in different places — verify at edit time], emptySubtitle:379,
errorText:369; ActivityFeed subtitle:276, emptyBody:310, sectionHeaderCount:289).

**S5 — trust ledger (MP4).** 1/2/5 CONFIRMED · 3+4 ADJUSTED · 6 REFUTED (ink-coverage half).
THE FIND: `reopenBtnText` `FlagDetailModal.tsx:1945–:1946` — `color.accentOrange` (#f1a520) 14px
semibold TEXT directly on the card ("Still broken? Request reopen", shows for every non-reporter
on any resolved flag). Already 2.07:1 on light `surface` at HEAD (live AA drift, M-52-class,
independent of migration); would drop to ~1.47:1 on light glass. Fix: block adds explicit
disposition — reopen TEXT + border re-ink → `brandText` (links/actions rule; pair already banked
on detailSheet 4.95/5.42; add a dedicated labeled pair) + record the CURRENT light drift in the
trials file (declared==shipped convention). Also `coordsCopyGlyph` (`:966`/`:1658`) `color.brand`
interactive icon — add pin pair at min 3.0 on detailSheet (3.71 light / ~3.5 dark, passes).
Other adjustments: "Reported {relativeTime}" lives in `PlatformMap.tsx:330`/`.web.tsx:455`
(pinned by MapScreen.detail.test.ts:120/:135) — preserved by file-disjointness, restate bullet;
StatusHistory has NO date/mono element (entries are single `entryLine` textStrong 600 —
they STAY textStrong; only loadingText:254/emptyBody:268 re-ink) — fix bullet (c) so the ledger
line is never down-inked; `description` is `textStrong` at HEAD (`:1614`) — stays (no down-ink);
ink-site magnitude ~60 to classify / ~12–16 re-ink (restate size rationale; single-window holds);
card gains `overflow:'hidden'` (shipped clip pattern; no shadow to relocate — none at HEAD);
name the ≥500 weight vector in the PROTECT "only-changes" phrasing.

**S6 — MP0 trio (M-56/M-55/M-52 + M-43).** A 3/3, B 5/5, C 6/6 CONFIRMED · D ADJUSTED.
FirstLaunchGate is inside ThemeProvider (`App.tsx:216→:218`) — the load-bearing claim holds;
record residual: ThemeProvider's persisted override loads async → OS-light/app-dark users get one
light-surfaceMuted frame (testable statement unchanged). M-55 dark rows 8.31/6.67/4.85 also pass
(cite alongside light); target = family union (panel tint recipe + pill literal mechanism), not
byte-copy of one sibling. M-52 drift independently recomputed 3.4154 (correct 4.5 floor — 14px
w700 below WCAG large); 4.42 keep-trial reproduced to arbiter rounding. D: the M-43 comment
physically spans `:1895–:1900` (spec/census say :1896) — fix both.

**S11 — train integrity.** 1–6 CONFIRMED · 7 REFUTED: MP5 block field 8 lacks a rollback anchor —
append "· rollback = MP5 tip revert". Cosmetic: census section headers "C. Map-world (15)" → (16)
and "I. Transient + system (5)" → (7) (stale after critic adds; row total 57 unchanged). Also
verified: partition 15/15 exact; file-disjointness holds (UpdateBanner pure-presentation — mount
passes no style prop; M-55 MapScreen-local); all 7 gates present; 7 immutable stacks MD5s match
census §0; FlagDetailModal exactly 82,337 B; branch names + stop language airtight.

## WAVE 2 verdicts (arriving; banked as they land)

**S4 — MP3 overlay remainder.** 1/2/4 CONFIRMED · 5/6 ADJUSTED · **3 REFUTED (ink coverage)**.
Finds: (1) M-22 `stateHint` = textSubtle DIRECTLY on glass (`LeaderboardScreen.tsx:563–:568`;
states `:359` error / `:383` all-time empty) ≈3.5:1 both modes — extend the shared-recipe role
map: textSubtle-class hints → `inkGlassMuted`, sites named. (2) M-22 empty Trophy `goldAccent`
icon `:375` on glass ~1.3:1 light — decorative-paired; ADD to `_doc` NOT-DECLARED register.
(3) M-37 `rowDimmed:{opacity:0.7}` (`:126`, applied `:248`) — locked rows are whole-subtree
translucent; "inner cards keep opaque tokens" is FALSE for that state; locked rowDesc textMuted
already ≈3.0 light on the opaque card TODAY (pre-existing sub-AA, SR-mitigated), ≈2.9 on glass —
block carries the fact + SKY either/or (accept-and-record vs re-spec locked styling); register
entry. (4) goldChip prose 4.34 → **4.15** (banked value; recomputed). (5) `_doc`'s "decorative
accentOrange icons" is a phantom — neither notif file has one; the real accentOrange is a notice
BORDER on opaque warningBg (`NotificationPrefsModal.tsx:286`, `NotificationPreferencesScreen.tsx:263`)
— fix wording. (6) M-42 default-color ActivityIndicator on glass `:190` — re-ink `color.text`
(M-24's own pattern `:177–:182`). Pin-class shipped drifts to record in trials `_doc` (M-52 class):
M-22 retry `:573/:583` + active segment `:486/:495–:499` = the SAME #fff-on-#4E89EF pairing as
brandBtn dark (3.42); rankTop dark `#4E89EF` on tierGoldBg `#2d2509` ≈4.45 (`:519`) — add ONE
rankTop trials pair + recurrence note. Claim 5: shared copy = exactly ONE string
("Sign in to save notification preferences.", `:186`==`:173`) — fix the testable statement.
Claim 6: **M-24 is UNREACHABLE at HEAD** (PUSH_NOTIF_TYPES_ENABLED default false,
`featureFlags.ts:34`, Sky Decision 2 Option B "hide, don't wire"; `__DEV__`-only setFlag) —
add honesty line to MP3 block + census M-24 note + B7 wording nuance; migrating it anyway is
coherent (flag-flip lands inside the one-material world).

**S8 — drawer/media/dialog stays.** A/C SURVIVE (wording) · B survives as a class with riders.
A: quote is SPLICED (`:161–:168` + `:309–:315`) and "NO blur" is NATIVE-scoped (web ships
backdropFilter by design — `:324–:326`); revert embedded in `9f3657e` (no dedicated revert
commit); STRONGER budget wording: live-glass drawer = +1 visible pane while open → 13>12 ceiling
breach over Tasks' shipped worst; tone claim byte-true (0.94 = glassBulkLite RGB family; lip =
glassChromeLip). B: **M-46 dark-mode chrome REFUTED** — X `:102` / empty `:130` / caption `:142`
inked `color.surface` (#1E1E22 dark) → ≈1.36 / 1.24 / 1.6:1 (invisible); M-47 ships the correct
`textOnBrand` idiom (≈12.6:1). Fix: MP0 gains an in-tier ink repair block-let (M-46 chrome
`color.surface` → `color.textOnBrand`, 3 sites; NOT a material migration — conservation
unchanged); trials file records the CURRENT dark pairs (expected FAIL); material file adds the
proposed textOnBrand pairs on the lightbox composites. Three-blacks drift: backdropStrong
0.75/0.85 (token, M-46) vs literal 0.92 (M-47) — theme.ts:136's comment proves the token was
meant to own lightbox backdrops → §6 either/or (tokenize M-47 vs record deliberate deeper black).
C: tier definition corrected — fill/radius/centering/scrim four-for-four (census M-20
"scrim-less" is WRONG: `nameBackdrop` carries `color.scrim`, same token as the Profile pair —
fix census row, strengthens the tier), but shadow.e3 two-of-four (nameCard shadowless) + motion
fade-vs-slide split + padding deltas → §2b records the deltas honestly (the "zero code, already
consistent" line is overstated); completeness CONFIRMED (no fifth dialog; confirm() renders no
custom card).

**S10 — census fidelity sweep.** 24 rows clean at exact cited lines (M-14..M-18, M-20/21,
M-26..M-33, M-45..M-47, M-49..M-51, M-53/M-54) + all entry-path/host/architecture claims.
Census defects to fix: (1) M-19 heat-badge mounts mis-attributed to `HeatmapLayer.tsx` (hook
only) — badges live in `PlatformMap.tsx:256–:257` (+styles `:517–:536`) and
`PlatformMap.web.tsx:82–:88`/`~:780–:796`; all material claims hold (zero BlurView in the three
map-internal files — §12.6 intact). (2) §1 "60 GlassSurface mounts (non-test)" → TRUE count
**51** real JSX mounts (67 textual incl. 16 comment mentions; no scope yields 60). (3) §1's
"FlashBanner + A11yLiveRegion + LiveStatusRegion above the session branch" — FlashBanner
actually mounts INSIDE `SignedInArea` (`App.tsx:103`, signed-in only; guest/web branch lacks
it); the other two are above (`:223`/`:227`) — fix §1 wording + note on M-50's entry. (4) §5
"All 34 Modal mounts" vs §1's correct **33** (true count 33) — fix §5. Bonus: M-20/M-21
nameBackdrop = `color.scrim` re-confirmed (S8's census fix corroborated).

**S9 — semantics/system/boot/M-48.** A.1/A.2/C CONFIRMED · A.3 REFUTED · B.2 ADJUSTED ·
D kill SURVIVES with narrative corrections + one REFUTED sub-claim.
A cite nits: M-16 first mount `:2235` (not :2237) · Home offline `:285` (not :286).
**A.3 — M-51 LiveStatusRegion drift (M-52-class, LIVE on web locate-failure `MapScreen.tsx:1115`):**
action-chip white text on `rgba(255,255,255,0.22)` chip → 3.21 over successStrong / 3.54 over
brand light / 2.54 over brand dark (all FAIL 4.5 at 14px); info-tone dark BASE text = white on
#4E89EF = 3.42 (the M-52 pair verbatim). Fix (MP0 in-tier ink repair, PROTECT semantics
byte-identical): info fill `brand` → `ctaFill` (the recorded M-52 fork; white 5.24 both modes =
ctaSolid pair) · chip bg → `rgba(0,0,0,0.25)` (white text ≈7.1 over successStrong / ≈8.2 over
ctaFill — declare both pairs). **B.2:** ErrorBoundary renders through a ThemeProvider crash via
ThemeContext's TOTAL lightColor default (`ErrorFallback` calls `useColor()`; boundary sits
outside ThemeProvider `App.tsx:213–:231`; dark users get a light crash screen — cosmetic) —
reword §2b's "zero theme dependencies" + note the non-throwing default as a PROTECT-worthy
invariant for Part 3. **C:** all ranges/values exact; exactly 10 distinct non-white hexes
(~20 occurrences); pre-paint near-misses (#111111 vs #121214 etc.) STRENGTHEN §6.6.
**D:** trial floors honest == glassChromeFloor; ratios reproduce (exit 1). Corrections:
(1) `tabBarGlassFloor` = **0.82 light** (`theme.ts:178`); 0.92 = `tabBarBg` (RT/web surface) —
fix everywhere the kill is quoted (trials `_doc` + spec §4). (2) `overlayTint` IS a lawful
floor-thickener (dark rescuable at ≈0.30–0.35 tint → 4.95–5.12); adoption still dies on the
LIGHT INACTIVE ink (#6B7280 needs ≥0.967 effective white = optically dead glass) → kill stands
on corrected ground; re-inks numerically viable but fail restraint — and one (darker light
inactive) is obligatory anyway per (3), so stop counting it as adoption-only cost.
(3) **D.4 REFUTED — NEW shipped drift: the shipped bar's light-mode inactive 12px label fails
4.5 on every translucent state** (0.82 glass over #000 → 3.17; 0.92 RT/web over #000 → 4.04;
theme's "~4.8 on white" measured an unreachable state; dark passes everywhere). Fix requires
theme.ts (forbidden in this train) → record in trials + name for Part 3's slate.
Trials additions: M-48 shipped light-inactive pairs (3.17/4.04) · M-51 chip current pairs
(3.21/3.54/2.54) + `_doc` recurrence note for the 3.42 info-dark (same pairing as brandBtn).
Material additions: M-51 fix pairs (white on 0.25-black over successStrong / over ctaFill).
MP3 absorbs Leaderboard's drift re-inks (retry + active segment `brand`→`ctaFill`; `rankTop`
→ `brandText`, declare on podiumGold both modes ≈5.4/6.6) — the file is already in MP3's scope.

## Edit plan (apply after wave 2)

03: section headers C→(16), I→(7) · M-43 note range → `:1895–:1900`.
04: §2a Settings stale-comment note → MP0 hygiene · §2e wording (8/9 consumers-only; B4a additive
scaffold edit; Changelog lone-exception line; drop "avatar headers") · §2f Tasks row +tab term
12–13 + Home row sheet-open 3/3 + Profile ~7 + Android caveat · §2d.3 wording (cost covered by
added re-inks) · MP1 block += 3 edit groups + PROTECT S17-half fix · MP2 block += M-40 errorBanner
pattern, textSubtle/transparent-rows/Clear-all-pill/no-SearchInputRow-in-M-38 notes, hygiene flag
(accessibilityViewIsModal), recipe line: profileSheet floor = conservative lower bound (bench3
discipline) · MP4 block += reopen re-ink disposition (brandText + SKY-FLAG line: orange affordance
retired for AA) + coordsCopyGlyph pin + PROTECT bullet fixes (relativeTime location; StatusHistory
anatomy; ≥500 vector named) + description-stays-textStrong + ink magnitude ~60/~12–16 +
overflow:'hidden' note · MP5 block += rollback anchor · §6 += MyWatched containment-gap hygiene
item · §7 MP1 size-rationale line stays true after MP1 block fix; MP0 scope += Settings comment ·
§8 += full skeptic log + halt/resume provenance (2 Fable halts: credit exhaustion at Stage-6
launch, killed 3 agents pre-verdict; session limit mid-wave-2, killed 5; Sky resumed both times;
all scopes re-run to completion on Fable 5).
stacks: r2-material-stacks.json += detailSheet pairs (M-36 reopen re-ink → brandText, text 4.5;
M-36 coordsCopyGlyph → color.brand, min 3.0, both modes) + `_doc` iteration item (3) ·
r2-trials-stacks.json += M-36 CURRENT reopen accentOrange on color.surface light (expected FAIL
~2.07; dark analogue included, passes) + header update (M-48 kill + M-52 dark drift + M-36 reopen
light drift). RE-RUN arbiter on both; re-bank outputs (material expect exit 0; trials expect
exit 1 by design).
