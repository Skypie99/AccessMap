# UI_PLAN — Pre-Ship UI/UX Polish — 2026-08-01

**Branch:** `ui-polish/accessmap-preship-2026-08-01` (base: `sec/phase-b-hardening-2026-07-31` @ `354584c` — contains main `9964f8f` + the 11-commit security hardening train, so the polish ships together with every recent bug fix).
**Goal:** lift every screen to a consistently professional, cohesive standard using the EXISTING design system (extend, never fork), without regressing the locked QA floor.

## Baseline gates (must hold after every step)

| Gate | Command | Baseline |
|---|---|---|
| Types | `npm run typecheck` | 0 errors |
| Lint | `npm run lint` | 0 errors / **80 warnings exact** |
| Tests | `npx jest --ci -w 3` (never `--silent`) | **200 suites · 2923 passed · 84 todo · 0 failed** |
| Arbiter sets | 15 ratified stack files | all exit 0 |

Known machine facts: worker cap `-w 3` is load-bearing; flaky-under-load suites are `ReportFlagModal`, `MyReportsModal`, `flagsStoreSwr`, `HamburgerDrawer.destinations` — a failure there under load is re-run before it is believed.

## The locked QA floor (2026-07-31 a11y train + security Phase B)

Enforced automatically by the suite: `focusOnOpen.guard` · `accessibleParentTrap.guard` · `keyboardAvoidance.guard` · `brandInkAA.guard` · `announceCoverage.guard` · `labelInName.guard` · `toggleStateWeb.guard` · `decorativeHiding.guard` + 15 arbiter contrast proof sets + honesty fences (`copy.test.ts`, `terms.guard`, `privacy.guard`, `blockedTerms`, `hiddenComments.guard`).

Floor rules this pass obeys by construction:
1. **AA contrast everywhere** — new fg/bg pairs only from the token pairings already proven; anything novel gets measured before commit.
2. **Dynamic Type** — text through `AppText` variants (body/bodyMedium uncapped); never pin height on a text container; no new `numberOfLines={1}` on content text.
3. **Labels/roles/states** — visual changes never alter a11y wiring; `labelInName.guard` keeps labels quoting visible copy.
4. **Reduced motion** — every new animation gated on `useReducedMotion()`; durations from `motion.duration`; native driver only; transform/opacity only.
5. **Perf** — blur budget 12 visible panes (never a BlurView outside `GlassSurface`); virtualization defaults untouched; no new mount-time timers beyond what exists.

## HANDS-OFF list (hard, this session)

- `src/components/ui/GlassSurface.tsx` — **0 changed lines** (standing gate).
- `docs/privacy/index.html`, `src/lib/copy.ts`, Terms deletion-location copy — **Sky's in-flight seam** (open Cowork prompt).
- `src/components/ui/Button.tsx` — zero call sites; adopt-or-remove is Sky's logged decision.
- Tab-bar material (`TabBarGlass`) — M-48 killed the "clean-up"; mechanism byte-identical.
- Drawer direction — scheme-bound chrome-Lite is ratified (S-4/F-8); never "restore" always-dark.
- The 3 primary-chrome refresh affordances (Tasks/Profile/Admin) — Sky's mockup gate (A11Y-222).
- `createAnonFlag` filter gap — Sky's moderation-policy call; not this pass.
- ALL existing visible strings — ratified/fenced; **this pass rewords nothing**. New copy only where a state renders nothing today, flagged in DECISIONS FOR SKY.
- Anything data-layer, auth, RLS, notification config, or privacy-sensitive (location/disability data) — out of scope by constitution.
- `A11Y-218` remaining 7 inert labels, `A11Y-225`, `A11Y-227` — PARKED by the a11y train with reasons; stay parked.

## Structural laws to respect while editing

- `onAccessibilityEscape` on the containment node, never on `<Modal>` (silent no-op).
- Images render through `RemoteImage` only (TB-3/IO-3 allow-list).
- DrawerHost mounts before SharedModalsHost (web z-order).
- Text on glass ≥500 weight; on-glass inks only from the arbitrated set (`inkGlassMuted`, `inkOnStage`, `inkSelect`, `inkDetailsGhost`, `ctaFill`, `glassChipInk`, `glassPlaceholder`).
- Map pins/overlays that are always-light stay literal (never themed tokens).
- `severityColor` fills carry ink `#0F1B2D` for 1–4, white only on sev-5.
- Style pattern: `StyleSheet.create` at file bottom; theme-aware via `makeStyles(color)`/`useColor()`.

## Verification strategy

- Per-commit: `npm run typecheck` (fast canary).
- Per-screen-group: targeted jest suites.
- Full gate at milestones + final: lint + full jest `-w 3` on a quiet machine (no parallel agents during the run).
- Visual: web preview (`npm run web`) light + dark, honesty-tagged as Chromium proxy; on-device iOS/Android remains Sky's device script (local sim build impossible on this branch — fmt/Xcode-26 fix is on an unmerged Sky-gated branch).

## Punch lists

### PL-A — Screen-inventory findings (agent A)

**A1. Unthemed raw `ActivityIndicator` (platform-grey) as primary loading UI — 8 sites.** Theme with the token the sibling surfaces use (`color.brand`; `AdminScreen.tsx:107` is the exemplar):
`ProfileScreen.tsx:823` (auth gate) · `ActivityFeedModal.tsx:304` · `FilterPresetsModal.tsx:499` · `HiddenCommentsModal.tsx:371` · `MyFeedbackModal.tsx:234` · `MyReportsModal.tsx:427` · `MyWatchedModal.tsx:413` · `SavedPlacesModal.tsx:418`

**A2. `RefreshControl` missing `tintColor` — 6 sites** (exemplar `AdminScreen.tsx:282` = `color.brand`):
`ProfileScreen.tsx:895` · `TasksScreen.tsx:1294` · `MyReportsModal.tsx:437` · `MyWatchedModal.tsx:451` · `MyFeedbackModal.tsx:226` · `ActivityFeedModal.tsx:323`

**A3. SignInScreen has no safe-area handling at all** (`SignInScreen.tsx` — only full-screen surface without it). Add insets so the hero clears the status bar and the guest/CTA cluster clears the home indicator. First-run surface = highest visibility.

**A4. Safe-area convention split — 10 sheets hard-code bottom padding.** Unify on the house `Math.max(spacing.X, insets.bottom)` pattern (11 siblings already use it):
`ReportFlagModal.tsx:1485` · `LegendModal.tsx:261` · `LeaderboardScreen.tsx:448` · `AboutScreen.tsx:210` · `NotificationPreferencesScreen.tsx:235` · `ChangelogModal.tsx:157` · `HelpModal.tsx:280` · `FeedbackModal.tsx:381` · `AddressSearchModal.tsx:401` · `ReportContentModal.tsx:522`

**A5. AdminScreen fetch failure is Alert-only** (`AdminScreen.tsx:70`) — no persistent inline error card with retry, unlike all 9 sibling list surfaces. Add the sibling-standard error card. (Low prod visibility — A-19 says Admin renders for nobody live — but consistency is cheap.)

**A6 (PROPOSAL ONLY — do not build).** `PhotoGallery.tsx:183` implements a second parallel lightbox alongside `PhotoLightboxModal.tsx`. Consolidation is a refactor, wrong risk profile pre-ship. Log for Sky.

**Do-not-touch confirmed by inventory:** pinned always-light literals in `MapScreen.tsx:3151-3161/3381`, `LegendModal.tsx:301-313`, `PlatformMap.tsx:587-664`, `HeatmapLegend.tsx:70` (arbitrated over live tiles).

### PL-D — Cheap-tells findings (agent D)

**D1. Primary bootstrap spinners (15 sites; superset of A1).** Themed spinner + label floor everywhere; upgrade the 7 shaped list modals to `SkeletonRow` (house primitive, used on Tasks/Home/Leaderboard): MyReports, ActivityFeed, SavedPlaces, FilterPresets, HiddenComments, MyFeedback, MyWatched. Also: `ReportsBreakdownCard.tsx:185`, `NotificationPreferencesScreen.tsx:184`, `NotificationPrefsModal.tsx:198`, `AdminScreen.tsx:107/:231`, `StatusHistoryModal.tsx:171`, `MapScreen.tsx:2524` (locating banner — theme only, pinned-light zone).

**D2. OS-default `Switch` ×3** — no brand track/thumb: `NotificationPrefsModal.tsx:232`, `SettingsScreen.tsx:557`, `NotificationPreferencesScreen.tsx:112`. Exemplar: `ProfileScreen.tsx:1602-1611`. Visual-only; A11Y-212 wiring untouched.

**D3. Press-feedback vocabulary completion (the bp11 residuals).** Static-style Pressables with zero pressed state → add `style={({pressed}) => …}` using existing pressed tokens (`headerBtnBgPressed` for header/X buttons, `borderPressed` neutral, `ctaFillPressed` brand fills, `errorPressed` destructive) + `hapticSelection` only where the house pattern already does:
- Modal ✕ close buttons ×14: HowToHelp:123 · Terms:93 · Privacy:99 · NotificationPreferences:162 · About:78 · MyReports:300,311 · MyWatched:323,334 · ActivityFeed:241,252 · MyFeedback:149 · AddressSearch:215 · HiddenComments:348 · SavedPlaces:289 · FilterPresets:403 · Profile tier-explainer:1906
- Primary/high-stakes: Profile Sign out:1697 · Delete Account entry:1719 · Save display name:1528
- Form buttons: ReportContentModal:436,448,460 · FilterPresets:459 · SavedPlaces:378 · Feedback:326,336
- Retry buttons ×5: MyReports:414 · FilterPresets:427 · MyWatched:422 · SavedPlaces:315 · ActivityFeed:291 (exemplars: Leaderboard:373, AddressSearch:317)
- NOTE: Terms/Privacy ✕ = leg-critical surfaces — pressed STYLE only, zero copy/wiring changes; guards read the md source, unaffected by style.

**D4. Uppercase tracking drift** — adopt `font.tracking.loose` (exists for exactly this): About:279/311 · LegendModal:266 · FlagDetailModal:1985/2056/2244/2450 · ProfileScreen:2457 (has NO letterSpacing at all).

**D5. Hand-rolled heavy shadows** — SignInScreen:414 (0.55, heaviest in app) + OnboardingCards:428/639/772 (0.55/0.35/0.45) → `shadow.glowBrand` / e-tiers.

**D6. Off-grid spacing (~28 real sites, mostly `10`)** — normalize to `spacing` tokens per-site; SKIP LeaderboardScreen:533/537 & :556/:605 zone (commented "intentional off-grid for density") and all pinned-light map literal zones.

**D7. Emoji glyph** — MyWatchedModal:438 `🔎` → Lucide `Search` (matches AddressSearch/MyFeedback empty states). Kills the app's last UI emoji.

**D8. Empty-state consistency** — add hero-size Lucide icon (decorative-hidden) + unify title to `variant="heading"` on the 6 iconless/label-variant sites: NearbyFlags:316 · MyReports:443-473 (3 branches) · ActivityFeed:329 · SavedPlaces:421 · FilterPresets:502. No copy changes.

**D9. PhotoGallery lightbox page-counter `bottom: 48` hardcoded** (`PhotoGallery.tsx:404`) — the one true home-indicator collision risk; derive from insets.

**Deliberately NOT doing (logged):**
- Alert.alert conversions — CLAUDE.md error-tier policy blesses them; a11y train already converted the sites that mattered.
- The 16-file duplicated modal-header shadow ternary → shared helper: zero visual delta, 16-file churn pre-ship. PROPOSAL.
- `useNativeDriver:false` width bars ×2 (Profile tier bar, onboarding dots) — documented, fire once, layout props can't ride the native driver; converting to scaleX risks radius distortion for no perceptible gain.
- PlatformMap raw `<Text>` ×2 (cluster count :332, heat badge :394) — inside snapshot-frozen native markers (`tracksViewChanges` law); font swap is unverifiable without a device. PROPOSAL for the device-pass build.
- Prompt assumed Reanimated; project uses classic `Animated` (RM-gated) — staying on the house API, no new dependency.

### PL-B — Token/theme findings (agent B)

**B1 (REAL DARK-MODE BUG, fix first).** `STATUS_COLORS` (`lib/flags.ts:1650`) is a static light-only copy of the status pairings; consumed directly by `ProfileScreen.tsx:1262` (status breakdown pills) and `MyReportsModal.tsx:389` (status filter chips) → wrong colors in dark mode. Fix consumers to `useColor()` tokens (pattern: `StatusBadge.tsx`). Leave the export in place (other call sites/tests may pin it); add a pointer comment.

**B2. Bulk-glass up-shadow duplicated in 16 files** (~112 raw shadow props, 15 of 17 pure-`#000` hits). Hoist to a `bulkGlassShadow(color)` helper in `theme.ts`; adopt in the 15 byte-identical sites + `Sheet.tsx` canonical. TasksScreen's 8/{0,-2}/8 variant is deliberate — leave.

**B3. Token-family fills (additive, then consumed opportunistically):**
- `font.lineHeight` — add sm/md/xl/xxl (×1.4 body family) + h2/h1/display (×~1.25 display family).
- `font.tracking.eyebrow = 1.2` — tokenize the SHARED header's established eyebrow look (`ScreenHeader.tsx:28` local `EYEBROW_TRACKING = 1.2`); the editorial look is the practice, the token follows it. `loose 0.4` stays for pill/badge caps.
- Barrel: add `ScreenStage`, `ScreenHeader`, `HeaderActions`, `PressableScale`, `RemoteImage` to `ui/index.ts` (additive only).

**B4. Literal→token swaps where the surface is THEMED chrome (not pinned):** OnboardingCards `#60a5fa`×4 (= dark tabBarActiveTint — pick the right semantic token per site) + `#FBB024` (= goldAccent); spinner `#fff` on brand fills → `color.textOnBrand` (ProfileScreen:1799, SignInScreen:229, LegendModal:146); `HeatmapLegend.tsx:70` `#414B5A` stays LITERAL (pinned-light zone — matches its in-file law; do NOT import the token there).

**B5. NOT doing (logged with reasons):** zIndex scale conversion (web modal stacking is load-bearing; wrong risk pre-ship — PROPOSAL) · app.json brand-hex tie-back test (PROPOSAL) · `PlatformMap*` literals (sanctioned) except noting off-scale radii 14/15 (device-verification territory — PROPOSAL) · ProfileScreen/MapScreen raw fontSize/fontWeight sweep folded into P8 only where sites are already being touched; full 34-file lineHeight adoption is follow-up, not this pass.

**Reference set:** 32 zero-drift files (all primitives + AdminScreen/HomeScreen/Settings/Terms/Privacy/etc.) — replicate their pattern; drift is concentrated in ProfileScreen, MapScreen, PlatformMap*, SignInScreen, OnboardingCards + the shadow block.

### PL-E — Map findings (agent E)

**E1. Callout/popup parity (the signature moment).** Native: 6px severity accent bar + bare text-link CTA. Web: no bar + filled 44pt CTA button. Unify BOTH to: severity accent bar + filled `ctaFill` CTA pill. Styles only (tap target is the whole callout via `Callout.onPress`/`onClick` — unaffected). Web verifiable in preview; native flagged NEEDS-DEVICE.

**E2. True-zero empty state.** `showEmptyCard` gated on `filtersActive` (`MapScreen.tsx:1197`) — an unfiltered, genuinely-empty area shows nothing but "Showing 0 flags". Add the sibling card reusing the existing empty-card material within the box-none overlay law (no ScreenStage — GLASS.md §12.1). Minimal new copy → DECISIONS FOR SKY.

**E3. Zoom-buttons grouping.** `zoomGroup` (2 unlabeled circles) floats ungrouped above the labeled FABs. If clean, group into one engineered row-tier tray matching the action bar (literal `forceEngineered` = budget-free). Inspect first; skip if it ripples.

**E4. Locating-banner spinner** (`MapScreen.tsx:2524`) — unthemed grey in a pinned-always-light banner → literal dark ink matching the banner's own pinned ink set (NOT a theme token).

**Map do-not-touch (beyond the pinned-literal zones):** the privacy gate triple (`initialLocationAction` / `requireExistingPermission` / OnboardingCards check-only mount — prompt fires ONLY from user taps) · `pinKey()` snapshot law (focus dim rides live `opacity`; nothing time-derived enters the key) · `tracksViewChanges={false}` on all three marker types · heat disclaimer `#1a1a1a` fill/ink (window-rule arbitrated; only spacing/radius/type harmonization allowed) · `LiveStatusRegion` placement (PROTECT-18, BP12 deferred Map) · action-bar width/overflow contract at ≤320pt (no visible-label additions this pass — PROPOSAL).

**Map PROPOSALS (device-pass territory):** focused-pin positive emphasis via a live prop · cluster-size parity native vs web · quick-cycle visible labels · pinned-light patchwork re-theme (needs live-tile arbiter runs) · heat-disclaimer glass redesign (needs new arbitrated pair set) · PlatformMap raw `<Text>`×2 → AppText (marker snapshot semantics).

### PL-C — Component-library findings (agent C)

**C1. Haptic silence in shared chrome.** `HeaderActions` (5 screens) + `HamburgerDrawer`'s `DrawerItem` have zero haptics while `TabBarButton` fires `hapticSelection()` on every press. Add `hapticSelection` to both (2 files, app-wide effect). Keep their existing bg-swap pressed visuals.

**C2. Input consistency (targeted, not the full adoption refactor):**
- `placeholderTextColor` wrong token ×9 (`textMuted` → `placeholderText`): ReportFlagModal:837 · MapScreen:2925,3014 · FilterPresets:247,445 · SavedPlaces:368 · FlagDetail:1307,1432,1754. (SignIn's rgba + Tasks' glassPlaceholder are sanctioned.)
- `FlagDetailModal.tsx:2360` commentInput `minHeight: 40` → 44 (the TasksScreen:2473 class; SR-034's standing gap).
- FlagDetail same-file border-token split (`border` ×2 vs `borderStrong` ×1) → unify on `borderStrong` (the compose-field standard).
- `AddressSearchModal` input: add `minHeight: 44`.
- Focus cue (borderColor → `color.brand` on focus, width unchanged = zero layout shift) on the 4 compose fields only: ReportFlag description, Feedback message + email, FlagDetail comment. Full 17-site adoption → PROPOSAL.
- `SheetHeader` close button 40×40 → 44×44 (2 consumers; effective target already ≥44 via hitSlop — this is visual-standard parity).
- ReportContentModal reason field: NO changes (fenced surface; adding a placeholder = new copy).

**C3. Icon convention naming.** De facto standard is `size 18 / strokeWidth 2.2` (108 sites); `icon.*` tokens {16,20,24,48} have 0 adopters. Add `icon.inline: 18` + `icon.stroke: 2.2` to theme (name reality), adopt opportunistically in touched files, and normalize only same-glyph outliers where context-identical (X-close variants → 18/2.2 unless hero-scale). NO app-wide re-size sweep (visual churn, device-unverifiable).

**C4. MyReportsModal severity dot** (`styles.sevDot`, bare colored View) → `SeverityDisc size={24}` matching MyWatched/RecentlyViewed. Improves 1.4.1 redundancy (numbered disc), aligns 3 of the row variants.

**C5. SignInScreen second brand gradient** `['#4E89EF','#1466E0','#0F53BE']` → `gradient.brandHero` token (closest 3-stop). Part of the SignIn mini-pass (safe-area + shadow 0.55→`glowBrand` + spacing 15→token + gradient).

**C6. PROPOSALS (logged, not built pre-ship):** Sheet adoption beyond the 2 consumers (DESIGN.md: new sheets only) · shared Chip primitive (13 hand-rolled sets) · FlagCard unification (5 variants; NearbyFlags' distinct a11y structure is deliberate) · thumb-size unification (80/64/56 — layout ripple) · `Button`/`Card` primitives adopt-or-remove (Sky's logged decision; Card also 0 usages) · `SkeletonCard` dead export · `@expo/vector-icons` unused dependency removal · full Input adoption · EmptyState primitive.

## Build order (the commit train)

| # | Commit | Contents | Risk |
|---|---|---|---|
| BP-1 | `theme/system` | bulkGlassShadow helper · lineHeight fills · tracking.eyebrow · icon.inline/stroke · barrel exports ×5 · ScreenHeader consumes tracking.eyebrow · STATUS_COLORS pointer comment | none (additive) |
| BP-2 | `dark-status-bug` | STATUS_COLORS consumers → themed tokens (Profile pills, MyReports chips) | low |
| BP-3 | `loading-states` | SkeletonRow bootstraps ×7 modals · themed spinners (full D1 list) · RefreshControl tints ×6 · spinner-on-brand → textOnBrand ×3 | low |
| BP-4 | `press-vocabulary` | pressed states: ✕ ×14, primary ×3, form ×7, retry ×5 · HeaderActions + DrawerItem haptics | low |
| BP-5 | `safe-areas` | SignInScreen insets · 10 sheets → Math.max pattern · PhotoGallery counter | low |
| BP-6 | `inputs-switches` | C2 input fixes · Switch theming ×3 | low |
| BP-7 | `empty-states` | icons + heading ×6 · 🔎→Search · MyReports dot→SeverityDisc | low-med |
| BP-8 | `normalization` | bulkGlassShadow adoption ×16 · tracking.loose (D4) · off-grid spacing (D6) · Onboarding/SignIn literals+shadows (D5/C5/B4) · icon outliers (C3) | med (wide) |
| BP-9 | `admin-error-card` | AdminScreen inline error card + retry | low |
| BP-10 | `map-polish` | callout parity (E1) · true-zero empty card (E2) · locating spinner ink (E4) · zoom tray if clean (E3) | med |

Gates: typecheck per commit · targeted jest per commit · full `npx jest --ci -w 3` + lint after BP-5, BP-8, BP-10, and after the second sweep. Web-preview visual verification (light+dark) after BP-8 and BP-10.
