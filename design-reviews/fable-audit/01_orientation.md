# Fable Audit — AccessMap — Part 1: Orientation (Evidence Base)

Read this FIRST in Parts 2/3. It is the map to everything in `design-reviews/fable-audit/`:
`01_render-index.md` (every capture, one row each) · `01_baseline-reads.md` (six blinded persona
reads + completeness critique) · `assets/<group>/` (PNGs + a11y trees) · `tools/` (the capture
harness — usage lines in §5.9). Nothing outside this folder was modified.

## §0 Baseline (the fence)

- **Date:** 2026-07-04 · **Model:** Claude Fable 5 (`claude-fable-5`), max effort, all sub-agents Fable 5
- **HEAD:** `82e738bc177f8a0b14ca0aa978c6ffb92bc5c54b` — `fix(map): clear the locating spinner when permission isn't granted on mount`
- **Branch:** `main` (exactly the post-glass-rollout HEAD the audit premise requires; chain `f0c47fc → 9758db7/f4e7abc/bcc254f (tasks A–C) → f0c47fc (D) → w1-1..6 → w2-1..4 → map-1..4 → 82e738b` all present in `git log --oneline -30`)
- **Serve mode:** dev server `npm run web` (Metro) → http://localhost:8081, launched via the repo's `.claude/launch.json` `expo-web` config. No static export; `dist/` untouched.
- **git status --porcelain at start (84 lines, all untracked `??`):** `?? design-reviews/` (contains pre-existing `audit-prompts/` — IN the baseline) · 79 × `?? qa-reports/...` files/dirs · `?? supabase/.temp/`. **Zero tracked modifications; `git diff --stat` empty.** Full snapshot saved at session scratchpad `fence-baseline.txt`; the end-of-part fence check diffs against this list + allows only `design-reviews/fable-audit/` additions (note: since `design-reviews/` is untracked as a whole, porcelain output is IDENTICAL before/after — the check is that no OTHER line appears and `git diff --stat` stays empty).
- Deep Field verified worn: `ScreenStage` ×4 in TasksScreen.tsx; `GlassSurface` ×15 in MapScreen.tsx; GLASS.md §8 application map at line 163, §12 live-backdrop addendum at 232.

## §1 Stack + tokens

**Stack (package.json):** expo ~54.0.0 · react 19.1.0 · react-native 0.81.5 · typescript ~6.0.0 · @supabase/supabase-js ^2.106.2 · react-leaflet ^5.0.0 + leaflet ^1.9.4 + supercluster ^8.0.1 (web map) · react-native-maps 1.20.1 (native) · expo-blur ~15.0.8 · expo-linear-gradient ~15.0.8 · expo-location ~19.0.8 · expo-image-picker ~17.0.11 · @react-navigation/bottom-tabs ^7.16.2 · lucide-react-native ^1.17.0.

**Token system:** `src/theme.ts` = light palette + spacing (4pt grid) + radius + font + shadow (e1/e2/e3 cool-tinted #0F1B2D) + gradient (mode-independent brand/gold) + `export const glass = { maxLivePanes: 12, intensity: { row: 12, chrome: 24, banner: 12, bulk: 24 } }` + motion + a11y (minTargetSize 44, focusRing 2/2) + icon sizes + severity + heatmapSeverity. `src/theme/ThemeContext.tsx` = dark mirror (`satisfies typeof lightColor` — token parity enforced by types) + ThemeProvider. **Theme mode:** `'system'` default, follows `useColorScheme()`; Settings → Appearance = Light/Dark/System segmented control; persisted `AsyncStorage['accessmap:appearance']` (NOT the `@accessmap/` prefix family).

**Type:** display = Plus Jakarta Sans (800/700), body = Public Sans (400/500/600), mono = JetBrains Mono. **Glass type law: body text on glass ≥500 weight (`font.family.bodyMedium`)** — GLASS.md §2. Sizes 11→72; tracking negative at display sizes.

**Motion tokens:** duration instant/fast 120/base 180/slow 320; easing standard/decelerate/accelerate; springs press/pressOut/sheet/drawer. DESIGN.md §8 law ≤200ms micro-interactions; ALL non-trivial motion gated by `useReducedMotion()`.

**Severity ramp (theme.ts `severity`, THE source of truth):** 1 Minor `#F7C948` · 2 Mild `#F0A030` · 3 Moderate `#F2792B` · 4 Significant `#E85638` · 5 Severe `#D92D20`. `textOnColor`: ink `#0F1B2D` on 1–4, white on 5 only (shipped `92a2be6` — white fails 2.1–3.4:1 on the mid-ramp). Descriptions (flags.ts): 1 "Inconvenient but usable." … 5 "Impassable. Needs a detour." Color names for SR: yellow/amber/orange/deep orange/red. **Heatmap ramp is DISTINCT** (`heatmapSeverity`): `#fde047/#fb923c/#f97316/#ef4444/#dc2626`, labels derive from `severity`.

**Status vocab:** open/verified/resolved/rejected → "Open/Verified/Resolved/Rejected", tinted bg+fg pairs (`STATUS_COLORS`, AA-checked). **Categories (6):** no_ramp "No ramp" · broken_sidewalk "Broken sidewalk" · blocked_path "Blocked path" · missing_signal "Missing signal" · steep_grade "Steep grade" · other "Other" (+ one-line descriptions in `CATEGORY_DESCRIPTIONS`).

## §2 Screen + route map

**Architecture:** `App.tsx`: fonts gate → ErrorBoundary → SafeArea → ThemeProvider → AuthProvider → **FirstLaunchGate** (device-wide; shows `components/OnboardingCards.tsx` 5-slide carousel if `@accessmap/onboarded_v1` unset — runs BEFORE auth) → **Gate**: signed-in → SignedInArea; **web OR native-guest → RootNavigator directly (initialRouteName "Home")**; native signed-out → `SignInScreen` (with the `onGuest` "Browse without an account →" affordance). **⚠ On web there is NO root sign-in screen — web IS guest mode.** SignInScreen on web is reachable only as Profile's modal (no guest affordance there — `onClose` only).

**Tab set (Phase 7a): Home · Tasks · Profile** (3 visible tabs). Hidden tab routes: **FullMap** (= MapScreen; from Home "Open full map", flag-row focus links, `accessmap://flag/{id}` deep link, Home's Report pill with `openReport:true`) · **Settings** (from drawer) · **Admin** (drawer, only registered when `is_admin` — guest-unreachable). Tab bar: light frosted (web: CSS `backdrop-filter blur(20px) saturate(160%)` + `tabBarBg` 0.92; native: BlurView i=24 + floor, RT-aware) — the "+1 pane invisible to `__getLiveBlurPaneCount`".

Screens/surfaces (~16 + modals), entry paths:
| Surface | File | Entry (guest web) |
|---|---|---|
| Onboarding (first-launch, 5 slides) | components/OnboardingCards.tsx | clear `@accessmap/onboarded_v1` + reload |
| Home ("Nearby" editorial) | screens/HomeScreen.tsx | default tab |
| Full Map | screens/MapScreen.tsx | Home → map peek "Open full map" |
| — LegendModal · NearbyFlagsModal · SavedPlacesModal · FilterPresetsModal · ReportFlagModal | screens/*.tsx | Map action bar / places row / filter panel / FAB |
| — AddressSearchModal | components/ | Home search pill or Map "Search by address" |
| Tasks ("Review barriers") | screens/TasksScreen.tsx | tab |
| Profile (signed-out variant) | screens/ProfileScreen.tsx | tab; "Sign in to your account" opens SignInScreen modal |
| Sign-In (modal form) | screens/SignInScreen.tsx | Profile → sign-in CTA (also drawer "Sign in" → Profile) |
| Settings | screens/SettingsScreen.tsx | drawer → Settings (lazy chunk) |
| — OnboardingModal (3-card replay) | screens/OnboardingModal.tsx | Settings → "Replay tutorial" |
| About / How To Help / Resources | screens/*.tsx (Modals) | drawer items |
| Hamburger drawer | components/HamburgerDrawer.tsx | menu button (all headers) |
| Help / Changelog / Feedback / MyFeedback | components/*Modal.tsx (SharedModalsHost) | header "Feedback"; Settings rows |
| Leaderboard / NotificationPreferences / Admin / My Reports / Watched / Activity / Achievements | various | **auth-gated (Profile rows / flag) — UNREACHABLE as guest, code-read only** |

Headers: Home + Tasks render their own light editorial `ScreenHeader` (menu + Feedback inside; `headerShown:false`); Profile/FullMap/Settings use the shared nav header (light editorial light-mode / dark navy dark-mode, headerLeft = menu, headerRight = Feedback pill).

## §3 The two core-flow maps

**FIND** (guest-complete on web):
1. Launch → (first launch only: OnboardingCards 5 slides — Skip or Next×4/permission slides/"Open the Map") → **Home**: barrier count headline, glass search pill, "Use my location" (opt-in prompt), map peek, offline banner (if cache-serving), Closest/Recent list (6 rows: severity dot + category + severity·status·distance), Report pill.
2. Home → **FullMap**: full map (CartoDB dark tiles on web) + overlay (`pointerEvents="box-none"` — the gesture law): top group = status pill (flag count) + saved-places chip row + action bar (`Search by address · Map legend · Toggle filters · Refresh flags · Recenter on me`), all `variant="row" forceEngineered`.
3. Perceive: severity-colored teardrop pins (white ring, category glyph, anon = gray); cluster bubbles (count, ctaFill); heatmap rectangles + count badges (toggle INSIDE filter panel: "Show neighbourhood heat map"; legend = HeatmapLegend, legacy always-light).
4. Filter panel (Toggle filters; true-blur i=12 — the ONE Map frost moment, threads `forceEngineered={glassLite}`): category chips w/ live counts · min severity 1–5 · status · context tags ("barriers affecting") · presets (save/load → FilterPresetsModal) · Clear all.
5. Trust/understand: pin tap → Leaflet popup callout (category, "Severity N · status", photo, description) · "Open nearby flags list" → NearbyFlagsModal · Map legend → LegendModal (categories + severity + status vocab).
6. Decision states: empty (filters match nothing → "No flags match your active filters" + Reset all) · offline banner · locating banner ("Finding your location…", pinned-light) · permission-denied banner (the `82e738b` fix territory) · load error.
**Failure/edge:** offline (cache banner on Home/Tasks/Map + tile cache) · permission denied (banner; list falls back to Recent ordering on Home) · zero flags in area · load error + retry.

**CONTRIBUTE** (guest = anonymous path, web-complete up to submit):
1. Entry — **auth-dependent**: the Map FAB "Report a flag here" renders ONLY for signed-in users (`MapScreen.tsx:2059` `{authUser && …}` — Jordan Condition 2). Guests enter via Home's "**Report a barrier**" pill → FullMap `openReport:true` (handled unconditionally, `MapScreen.tsx:1094`) or map long-press/right-click drop-flag. **A guest standing on the Map screen has no visible report affordance** (only "List").
2. **ReportFlagModal** (bottom sheet): title "Report anonymously" (guest) / "Report a flag" (auth). Guest sees anon banner "Reporting anonymously — your identity is not stored." + Sign in link; quick-fill templates are auth-only.
3. Category (6 chips) → 4. Severity 1–5 (each chip: `Severity N: Label — description`; selected shows "Label — description" line) → 5. Description (2000-char counter) → 6. Photo — **AUTH-ONLY: the anonymous flow has NO photo affordance**; guests see the nudge "Your anonymous report still counts. Sign in to add a photo…" (the EXIF-strip note "Location data is automatically removed…" is on the auth photo path — code-read for guests) → 7. Location (raw coordinates shown in the sheet header, e.g. "at 49.88740, -119.49250") → 8. **Submit affordance: visible button "Report anonymously" (a11y label "Submit anonymous flag report") / auth "Submit flag report"** — audit STOPS at the enabled button, never presses. Anon rate limit (`checkAnonRateLimit`) fires at submit — never reached.
9. Post-submit (CODE-INFERRED only): success confirmation + points flash (auth; via TasksScreen flash pattern `+N points`), anon success alert; error path `Alert`/inline (F46 web-visible).

## §4 Glass state (GLASS.md digest + per-screen conformance)

Digest of the law: luminous gradient **stage** (`ScreenStage`: 165° 3-stop light / 2-stop dark, pools A+B light / A-only dark, 2.5% grain — web = SVG feTurbulence data-URI) · **row** panes i=12 (radius.lg, full hairline + specular) · **chrome** pane i=24 (radius 0, bottom edge + lip) · **banner** i=12 scrolls with list · **bulk** i=24 conditional · engineered **chip tints** (never blur) · budget `maxLivePanes=12` counted at worst simultaneous state + tab bar manually · C-lite runtime (`glassMode` 'full'/'lite': rows/banner/empty/skeletons → engineered `*Lite`; chrome+bulk keep blur) · Android = all-engineered · RT = designed opaque states (banner → brandSofter + brand border) · dark = luminosity-led, shadows retired (bulk up-shadow + drawer e3 the two deliberate exceptions) · arbitrated inks (`inkGlassMuted/inkOnStage/inkSelect/inkDetailsGhost/ctaFill` mode-independent `#1466E0`, `glassPlaceholder`, chip ink forks) · ≥500-weight body on glass · live-backdrop rules §12 (no stage on map screens; literal `forceEngineered` for pan-time chrome; blur only for quasi-static sheets; always-light pins are literals).

Conformance (verified by grep at HEAD; arbiter stacks = the four JSONs below):
| Surface | Material | Notes |
|---|---|---|
| Tasks | ScreenStage + chrome pane (abs, onLayout reserve) + row cards/empty/skeletons + banner (nearest-open) + bulk (select mode) | the worked example; C-lite flip = header title long-press 600ms |
| Map | NO stage (live tiles = stage). Status pill + action bar = row-tier **literal forceEngineered**; filter panel = row-tier true blur i=12 threading `forceEngineered={glassLite}`; locating banner + heat legend + saved-place chips = **LEGACY always-light** (pinned literals, still mount BlurView — accepted cost); map-internal (pins/cluster/callout/heat badge) = tokens only | GLASS.md §8+§12 |
| Profile | ScreenStage + hero/stats/activity/siblings/nearest rows + completions (w2-1..4) | RecentlyViewedRow = row-tier `forceEngineered` literal |
| Home | legacy GlassSurface search pill (i=20) — GLASS.md §8 planned "chrome material + ScreenStage" NOT yet applied | wash = `surfaceMuted`, not stage — expected per §8 "Home" being future work |
| Settings | ScreenStage + ~11 row panes + engineered segment control | via drawer |
| W1 set (About/Resources/HowToHelp/Feedback/Drawer) | Deep Field per w1-1..6; drawer = always-dark near-opaque solid (deliberate non-GlassSurface) | |
| Tab bar | i=24 + floor (native) / CSS backdrop-filter (web); RT-aware | the invisible +1 pane |
| SignIn / Onboarding | forced-dark gradient surfaces w/ CSS backdrop-filter cards (web) — pre-Deep-Field idiom, deliberate fixed-background exceptions | |

Shipped arbiter stacks (the AA proof sets): `qa-reports/assets/2026-07-03_tasks_glass/shipped-stacks.json` · `qa-reports/assets/2026-07-03_glass_w1/wave1-stacks.json` · `qa-reports/assets/2026-07-03_glass_w2/wave2-stacks.json` · `qa-reports/assets/2026-07-04_glass_map/map-stacks.json`. Verify: `node ~/AccessMap-material-lab/2026-07-02/shared/contrast-check.mjs <stacks.json>` must exit 0.

## §5 How-to-reach ledger (web reproduction manual)

Harness defaults (every capture): chromium via Playwright (lab install), DPR 2, geolocation `{lat 49.8874, lng -119.4925}` + `permissions:['geolocation']` (≈480 m from the live "Blocked path" flag → nearest-barrier banner renders), `addInitScript` seeds `localStorage['@accessmap/onboarded_v1']='1'`, `colorScheme` emulation for theme (app follows OS via `useColorScheme`), viewport per device size, `goto http://localhost:8081`, wait for text `Tasks`.

1. **Home**: land after load. States: "Use my location" visible until geolocation resolves; offline banner via CDP offline after first load.
2. **Tasks**: click tab text `Tasks` (`.last()`); wait "Review barriers". Mid-scroll = set the biggest scrollable div's scrollTop. Select mode: click "Select multiple" → click a card → bulk bar. Empty: fill search `zzzz-no-match-zzzz`. Sort/scope/category chips clickable by their labels.
3. **Map**: from Home click "Open full map" (the map-peek overlay label; a11y label "Open the full map"). Filter panel = click "Toggle filters". Heatmap = panel → "Show neighbourhood heat map". Legend = "Map legend". Nearby list = "Open nearby flags list". Callout = click a pin (`.accessmap-pin`); cluster = `.accessmap-cluster`. Saved places: "Save a place" chip → SavedPlacesModal. Locating banner: fresh context, geolocation granted, capture within the fetch window (transient — may need `getCurrentPosition` delay emulation); permission-denied: context WITHOUT geolocation permission (Chromium auto-denies) → banner at rest.
4. **ReportFlagModal (guest)**: Home → click a11y label "Report a barrier" (the pill) → FullMap opens with the sheet up (`openReport:true`). The Map FAB path is auth-only. Photo step: N/A for guests (no affordance — sign-in nudge instead); the harness's file-chooser handler exists for any auth-path rerun. **NEVER click the submit button ("Report anonymously" / a11y "Submit anonymous flag report").**
5. **Profile (signed-out)**: click tab `Profile`. Sign-in modal: click "Sign in to your account" → SignInScreen (modal variant, no guest affordance — `onClose` only).
6. **Drawer**: click "Open navigation menu" → items by label (Resources / How To Help / About the App / Settings / Sign in).
7. **Settings**: drawer → Settings (lazy — wait for "Appearance"). Replay tutorial → OnboardingModal. Appearance control = the in-app theme UI (captures use OS emulation; the control itself is photographed).
8. **Onboarding (first-launch)**: context WITHOUT the onboarded seed (+ `localStorage.clear()` guard) → 5 slides; advance via "Next"/"Continue"/"Maybe later"/"Open the Map"; permission slides on web just advance (no OS prompt).
9. **Glass C-lite**: seed `localStorage['@accessmap/glass_mode_v1']='lite'` (values `'full'|'lite'`, raw string) in addInitScript; fallback = long-press Tasks header title (`click({delay:900})` on "Review barriers"). Affects Tasks/Settings/Profile rows + Map filter panel; chrome/bulk keep blur.
10. **Theme**: `colorScheme:'dark'` emulation (mode 'system' follows it). Alternative (unused): seed `accessmap:appearance`.
11. **Reduced motion**: `emulateMedia({reducedMotion:'reduce'})` — RN-web maps `AccessibilityInfo.isReduceMotionEnabled` to the media query (verified empirically at capture; noted in §7 if divergent).
12. **Offline / load-error**: true cold-offline is un-emulatable on a dev server (context-offline blocks the Metro bundle itself — ledger). Two honest substitutes: (a) `blockSupabase` route-abort → the real data-load failure state ("Couldn't load reports." + Try again); (b) `setOffline(true)` AFTER load → Map "Refresh flags" failure.
13. **DT proxy**: `document.body.style.zoom = 1.3 / 2.0` [web-approximated layout stress; RN-web ignores browser font prefs].
14. **A11y tree**: `page.locator('body').ariaSnapshot()` → `assets/a11y-tree/*.txt` (the RN-web-emitted ARIA tree).

**UNREACHABLE as guest (code-read pointers; never faked):** signed-in Profile hero/stats/activity/achievements/leaderboard/watched/reports modals (`ProfileScreen.tsx:812` `if (!user)` branch is what web renders) · **RecentlyViewedRow** (mounts only signed-in — `ProfileScreen.tsx:1319`; parked-item evidence = code-read + lab-mockup probe, §7) · **the saved-places chip row + SavedPlacesModal** (whole row is `{authUser && …}` — `MapScreen.tsx:1440`; parked-item-3 evidence = code-read + the arbiter's chip pairings in `qa-reports/assets/2026-07-04_glass_map/map-stacks.json`) · the Map Report FAB (`MapScreen.tsx:2059`) · Admin (`RootNavigator.tsx:364` gated on `is_admin`) · NotificationPreferencesScreen (feature-flag `PUSH_NOTIF_TYPES_ENABLED` default false — `SettingsScreen.tsx:471` — unreachable for EVERYONE) · post-submit confirmations (§3) · native-only: root SignInScreen guest affordance, TabBarGlass BlurView, haptics, Reduce Transparency (iOS API — `accessibility.ts` optional-chains it; web resolves false), Apple light tiles, true Dynamic Type.

### §5.9 Harness usage (for Part 2 re-probes)

```
cd ~/AccessMap/design-reviews/fable-audit/tools
node capture.mjs --manifest <file>.json     # runs every job not already on disk (skip-if-exists)
node capture.mjs --list <manifest>          # print jobs + which exist
node verify1.mjs                            # matrix ↔ index ↔ disk reconciliation
node make-test-photo.mjs                    # regenerate the neutral photo PNG
```
Manifest job fields: `{ id, group, screen, theme, width, height, state, nav:[steps], seedOnboarded, glassLite, geolocation, offline, reducedMotion, zoom, a11yTree, tag, note }` — see `manifests/*.json` for the shipped matrix. Server must be up first: `npm run web` in `~/AccessMap` (port 8081).

## §6 A11y infrastructure inventory

- **Hooks (`src/lib/accessibility.ts`):** `useScreenReader` (MapScreen auto-opens list view for SR users) · `useReducedMotion` (WCAG 2.3.3; gates drawer/onboarding/map fly-to/sheet/skeleton/sheen motion) · `useReduceTransparency` (iOS-only API; GlassSurface opaque designed states) · `useFocusOnOpen` (modal focus move, WCAG 2.4.3) · `decorativeProps`.
- **glassMode (`src/lib/glassMode.ts`):** runtime C-lite store, persisted, `AccessibilityInfo.announceForAccessibility('Glass effects reduced/full')` on flip (WCAG 4.1.3); long-press wrapper `accessible={false}`.
- **haptics (`@/lib/haptics`):** selection/medium wrappers (native-only effect).
- **confirm (`src/lib/confirm.ts`):** platform-aware confirm/notify (window.confirm on web — Alert.alert is a web no-op; the error-handling-tier law).
- **AppText (`ui/AppText`):** brand fonts + variants; `maxFontSizeMultiplier` caps at known break points (tab labels `allowFontScaling:false`; RecentlyViewedRow dot 1.3; SignIn inputs 1.4).
- **Severity redundancy law (DESIGN.md §1 + theme.ts):** color NEVER the only signal — number AND word everywhere (SeverityBadge, SR labels "severity N", color names spoken).
- **Guard tests (jest — the hardened invariants, DO NOT REGRESS):** `ui/__tests__/AppText.dynamicType.test.tsx` (DT law) · `ui/__tests__/GlassSurface.test.tsx` (legacy byte-stability + variants) · `lib/__tests__/glassMode.test.ts` (9) · `lib/__tests__/accessibility.test.ts` · `screens/__tests__/TasksScreenFlagCard.test.tsx` (FlagCard composition pin, 17 structural assertions incl. isCompactLayout ×1.6) · `screens/__tests__/MapScreen.{deeplink,heatmap,setMenu}.test` · `screens/__tests__/ReportFlagModal.test.tsx` · `components/__tests__/` (HeatmapLayer/Legend, CachedTileLayer, wave6…) · `__tests__/MapClustering.test.tsx` + `OfflineIndicator` + `WatchedFlagsSearch` · `lib` suite (~60 files: flags/anon/heatmap/tasksSort/savedPlaces/theme…). Gesture law: map overlay `box-none` (MapScreen.tsx:1259) — protected invariant.
- **jest scale:** ~1741 tests / 109 suites green at merge (per the merge report).

## §7 Honesty ledger (append-only)

1. **Everything captured here is `web-approximated` by default** — expo web (RN-web + Chromium): true blur feel, scroll smoothness, haptics, VoiceOver/TalkBack, real Dynamic Type, Reduce Transparency, Apple tiles are all device-only (**NEEDS-SKY-DEVICE**).
2. Web tiles are **CartoDB `dark_all` ALWAYS** (`PlatformMap.web.tsx:531`) — "pins over LIGHT tiles" / "chips over light tiles" are iOS-light-mode states: **code-inferred + NEEDS-SKY-DEVICE**; web captures show the dark-tile family only. (Tiles ≠ theme — GLASS.md §12.)
3. **Reduce Transparency states: not renderable on web** (`accessibility.ts` — `isReduceTransparencyEnabled?.()` doesn't exist on web → false). Evidence = code-read of GlassSurface's `material === 'opaque'` designed states + GLASS.md §6 table (`test-inferred` via GlassSurface.test).
4. **RecentlyViewedRow (parked item 1): auth-gated** (`ProfileScreen.tsx:1319`), cannot render as guest. Code evidence banked: dot bg = `severityColor(f.severity)`, digit = `color.textOnBrand` (WHITE) at 12pt bold on ALL severities (`RecentlyViewedRow.tsx:139,202`) — white measured 2.1–3.4:1 on sev 1–4 fills in the SeverityBadge AA audit (`92a2be6`). Visual = `lab-mockup` probe (probes/ group).
5. **Signed-in states** (Profile hero/points/admin/post-submit): code-inferred only — the auth fence (never sign in) is absolute.
6. Landscape: **N/A-by-design** — app.json locks `"orientation": "portrait"` (root + iOS). Tablet 834×1194 still captured portrait.
7. Dynamic Type: browser zoom proxy tagged `web-approximated`; the REAL axis is code-read (`maxFontSizeMultiplier` caps + DT guard tests) + NEEDS-SKY-DEVICE.
8. `npm run web` dev server = dev-mode bundle (`__DEV__` true): the glass pane-budget warnings are active; visuals match the wave-era captures (same serve mode as all four glass reports — apples-to-apples).
9. Locating banner ("Finding your location…") is transient (clears once position resolves ~instantly with an emulated position) — captured via a context whose geolocation resolves slowly or within the first frames; if not caught, honest note + code-read (`MapScreen.tsx:258,1982-2000`).
10. Supabase reads are live anon-key guest reads (the wave-era precedent). Flag data in captures is real user-generated content — it stays inside this folder and is quoted only as the UI shows it.
11. `useReducedMotion` on web: verified empirically during Stage 3 (RN-web maps it to `prefers-reduced-motion`) — see rm/ group notes in the render index.
12. Appearance control: captures use OS-level `colorScheme` emulation with mode 'system' (the app's default); the Settings control itself is photographed but not used for theming captures.
13. **R5 persona packet cap (Stage 4):** base set given at 390 + 834 widths both themes; 375/430 omitted from R5's packet as near-duplicates (R4 covers the size axis) — a stated cap, not silent.
14. **Playwright chromium DPR-2 emulation** on a Mac renders with the same WebKit-free Chromium as the wave captures — Safari/WebKit CSS deltas are NOT covered (known limitation of the whole harness family).
15a. **Parked item 3 (always-light saved-place chips over live tiles): the entire chip row is auth-gated** (`MapScreen.tsx:1440` `{authUser && …}`) — guests never see it, so no live capture exists. Evidence = code-read (always-light literal styles at `placeChip*`) + **arbiter-measured** chip pairings in `map-stacks.json` (AA-by-construction over #000/#FFF bases) + the guest closeup shots proving absence. The "over LIGHT tiles" visual remains NEEDS-SKY-DEVICE; the deferred dark-chips idea (GLASS.md §8/§12) stays a live parked question.
15. **PROBED FACT (tools/probe-sr.mjs, headed + headless, zero AT signals):** RN-web resolves `AccessibilityInfo.isScreenReaderEnabled` **true for every web user**, so MapScreen's SR auto-open (`MapScreen.tsx:355`) fires on EVERY web Map arrival — NearbyFlagsModal opens over the map. This is APP TRUTH on web, not a harness artifact. Captured as base state `map__*__first-arrival-auto-list`; all other map states close the list first (as a real user would). The `report` flow shots truthfully show the sheet stacked over the auto-opened list (the real Home-pill guest path). On iOS/Android the hook reflects real VoiceOver/TalkBack state — device behavior differs (NEEDS-SKY-DEVICE for the native truth).

## §8 Capture-time observations (pre-flags for Part 2 — observations, NOT findings)

1. **Web = everyone is a screen-reader user:** the Nearby-list auto-open fires for all web visitors (ledger #15). Double-edged evidence: web-sighted users get an unexpected modal over the map; SR users get a genuinely accessible list-first map. Part 2 should judge both directions (L2/L3/L6 territory).
2. **Guest Map has no report entry:** the Report FAB is auth-gated (`MapScreen.tsx:2059`); a guest ON the map must go back Home for the "Report a barrier" pill (or know the hidden long-press/right-click). Discoverability question for Part 2.
3. **Anonymous reports cannot attach photos** — the anon sheet replaces the photo step with a sign-in nudge. Mission-relevant trade-off (verification photos vs privacy/abuse control).
4. **Home ignores granted location until opt-in (web):** even with geolocation granted, Home renders "LATEST/Most recent reports" until "Use my location" is tapped (the probe is opt-in by design on web, `HomeScreen.tsx:113`). Honest, but the map peek then shows the San-Francisco fallback region while the user is in Kelowna — spatial mismatch worth a look.
5. **Raw coordinates as location confirmation:** the report sheet shows "at 49.88740, -119.49250" (mono) — precise but low-affordance for non-technical users; no reverse-geocoded name in the sheet.
6. **The report sheet stacks over the auto-opened Nearby list** on the guest path (Home pill): three layers (map → list modal → sheet) exist simultaneously; closing the sheet lands on the list, not the map.
7. **Guests have no saved-places feature at all** (row auth-gated, `MapScreen.tsx:1440`) — coherent with reporting being auth/anon-gated, but it means THREE map affordances differ silently between guest and signed-in (FAB, saved places, quick-fill templates). Part 2 should judge the guest↔auth capability cliff as a designed communication problem.
8. **Tasks consumes the granted location immediately** (nearest-barrier banner + real distances render for guests) while Home ignores it until opt-in — an intra-app inconsistency in location posture (observation #4's counterpart).
9. **R4 spotted a "square lightning-bolt button over the Home tab" on dark Home @375** — most plausibly dev-mode chrome from the Metro dev server (ledger #8: all captures are `npm run web` dev-mode, `__DEV__` true), NOT app UI. Part 2 must classify before judging: check `base/home__dark__375__at-rest.png` and whether the element exists in a release/export build.
10. **Persona-read caveat for R2 (Part 2 weighing):** the trees are the RN-WEB-emitted ARIA — several findings (password textbox not secure, tab selected-state gaps on map screens, dialogs unnamed) may be RN-web translation artifacts that differ under native VoiceOver. They are TRUE for the web app as shipped; native truth stays NEEDS-SKY-DEVICE. Conversely R2's "no Report button in any map tree" is the GUEST truth (FAB auth-gated) — a signed-in SR user would find the FAB.
