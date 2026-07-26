# AccessMap — Master QA Sweep (READ-ONLY)
**Date:** 2026-06-23 · **Branch audited:** `main` @ `45bca1a` (live baseline) · **Mode:** strictly read-only — no code changed, no data/auth/DB touched, no live-data tests, no external sends.
**Lenses (full parallel Opus fan-out + live pass):** UI/UX ×3 · Performance ×2 · Safety/Robustness ×2 (privacy + robustness) · **live Chromium pass on the deployed demo** · Accessibility woven through.

> **Coverage & method (honest).** This is the **deep re-run**: six Opus 4.8 sub-agents each deep-read their lens (every line of `MapScreen.tsx`/`TasksScreen.tsx`, all 34 migrations, all 3 edge functions, the full modal set), **plus a live browser pass** against `https://accessmap.skypistudio.com` (real network trace, console, render proof, responsive). Engine per finding is marked: **CODE** (static read), **LIVE-CONFIRMED** (verified in the running browser), or **NEEDS-SKY-DEVICE** (real iPhone/VoiceOver/low-end-Android only). Nothing claimed "passes" on one check is reported as fully verified.

---

## 1. EXECUTIVE SUMMARY

**Overall verdict: SOLID and genuinely well-engineered — no blockers, no crash-class bugs, no data-safety holes. A short, mostly-autonomous fix list stands between it and a flawless demo.** The privacy/security machinery is verified intact across 16 areas; the codebase shows an unusually mature defensive posture (CAS conflict handling, fail-closed EXIF, sequence guards, optimistic-with-rollback, a pre-commit secret scanner). The live demo **mounts clean with zero console errors**, downloads ~0.8 MB (not 4 MB), and renders a polished Home screen.

**Live-verified facts that correct older premises:**
- **Bundle download is fine.** The 4.15 MB `AppEntry.js` is the *uncompressed/parse* size; the server ships it **gzip'd to ~805 KB, downloaded in 0.76 s** (LIVE-CONFIRMED). The real cost is **main-thread parse/execute of one un-split chunk on low-end mobile CPUs**, not download.
- **Fonts are deploy-bloat only.** The browser fetches **exactly 8 font files** (LIVE-CONFIRMED via network trace), not the 48 shipped. The other 40 `.ttf` inflate the deploy artifact but are never downloaded by a visitor.
- **No N+1.** Home issues **one bounded query** (`flags…limit=50`, anon read 200, LIVE-CONFIRMED).
- **The "white-screen first paint" is solved** — `index.html` ships an instant brand splash (LIVE: page mounts cleanly).
- **Phase 7–13 editorial overhaul is already merged to `main`** (the "Phase 7a building" note was stale).

**The blunt "fix these before a TestFlight / recruiter demo" list:**
1. **Hamburger drawer is unreadable in LIGHT mode** — hardcoded near-black panel (`rgba(8,10,20,0.96)`) with theme-light text (~1.3:1). Every menu label invisible to a light-mode user. *(SERIOUS · CODE · autonomous-fixable)*
2. **Points numbers published wrong in the Help FAQ** — `HelpModal` states 5/10/2/5; the live trigger awards 10/15/3/7. Plus the Tasks flash hardcodes the values and `CLAUDE.md` contradicts itself. *(SERIOUS · one source of truth needed)*
3. **GPS / address-search calls can hang forever (no timeout)** — native `getCurrentPositionAsync` and Nominatim fetch have no timeout; the locate/search spinner can spin indefinitely. *(SERIOUS · autonomous-fixable)*
4. **No modal moves screen-reader focus on open (WCAG 2.4.3)** — 0 `setAccessibilityFocus` app-wide; the #1 a11y gap for an accessibility app demoed with VoiceOver. *(SERIOUS · autonomous-fixable, device-verify after)*
5. **ProfileScreen load-error is invisible on web + no retry**; **Report FAB can be permanently dead on web** (gated on a resolved location). *(MODERATE)*
6. **Confirm `context_tags` migration is live** (else the Report form shows "coming soon") and **fix the broken Lighthouse CI path** (`web-build`→`dist`). *(NEEDS-SKY / one-line)*

Everything else is polish or "leave it — it's fine."

---

## 2. COVERAGE PROOF

| Lens | Depth | Engine | Confidence |
|---|---|---|---|
| UI/UX — core capture & map | `MapScreen` (all 2,595 lines), Home, Report flow, Legend/Nearby, deep-link, nav, drawer, both PlatformMap | CODE | High |
| UI/UX — engagement/status | Tasks, Profile, Leaderboard, Admin, FlagDetail, the 3 status surfaces | CODE | High |
| UI/UX — secondary/modals/states | 8 screens + Sheet + 17 modals + full states matrix | CODE | High |
| Performance — web | dist sizes, chunk, fonts, index.html, sw.js, lighthouserc, vercel.json, deps | CODE + read-only shell | High |
| Performance — runtime/leaks | MapScreen/Tasks/Profile render, 5 contexts, every timer, realtime teardown | CODE | High |
| Safety — robustness | 202 catch sites, every async path, null-safety, races, timeouts, validation | CODE | High |
| Safety — privacy/security | EXIF chain, 34 migrations, 3 edge fns, RLS, secrets, git history | CODE + git | High (live DB = NEEDS-SKY) |
| **Live demo** | mount, console, network trace, Supabase query, fonts, responsive, render proof | **LIVE (Chrome)** | High (desktop/dark; mobile-viewport not forced) |

**Consolidated NEEDS-SKY-DEVICE / NEEDS-SKY (live state):**
VoiceOver/TalkBack reading order + modal focus-on-open behavior · max Dynamic Type overflow on a narrow phone (map-chrome labels, fixed-height sheets, 40 pt headers) · light-mode drawer visual confirm · contrast over frosted-glass map chrome · PhotoGallery after rotation / iPad split · pinch-zoom desire · low-end-Android frame profiling (MapScreen/FlagCard) · GPS-stall hang repro · live DB confirmation of points-trigger values, `context_tags`, and the `*_PROPOSED` guards · rotate + scrub the reviewer password.

---

## 3. UI/UX FINDINGS

### SERIOUS
- **Hamburger drawer unreadable in LIGHT mode** — `src/components/HamburgerDrawer.tsx:293` panel is hardcoded `rgba(8,10,20,0.96)` (always near-black) but text pulls theme tokens (`:328,:382,:155,:274`). In light mode `color.textStrong=#222`/`textSubtle=#707070` on `#08090F` ≈ **1.3:1 / 2.0:1** — the brand wordmark, every nav label (Resources/Settings/Sign out), close X, and chevrons are effectively invisible. Dark mode is fine. **Fix:** either theme the panel bg, or commit to an always-dark drawer and hardcode light text (`#f5f5f5` / `rgba(255,255,255,.7)`) — the smaller, safer diff matching existing intent. *(CODE; NEEDS-SKY-DEVICE to view in Light.)*
- **Help FAQ publishes wrong point values** — `src/components/HelpModal.tsx:36` says "5… 10… 2… 5"; the **live trigger awards reporter +10/+15, actor +3/+7**. The Tasks flash strings (`TasksScreen.tsx:565/:572`) are correct/live but **hardcoded**, the `2026-05-24_status_history` migration still embeds the old 5/2/10/5 body, and `AccessMap/CLAUDE.md` contradicts itself (Database section vs Recent-QA note). **Fix:** extract the 4 values to one shared const that FAQ + flash + docs read from; correct the FAQ copy. *(CODE; confirm live values — NEEDS-SKY.)*

### MODERATE
- **Report FAB can be permanently dead on web** — `MapScreen.tsx:1888-1919` `disabled={!location}`; `location` only resolves via expo-location, whose web path may never resolve `granted`, leaving the primary Report affordance dimmed (long-press drop still works). **Fix:** on web, let the FAB open the modal and resolve location inside it (the modal already shows "Waiting for location…"). *(CODE; NEEDS-SKY-DEVICE web.)*
- **ProfileScreen load-error invisible on web + no retry** — `ProfileScreen.tsx:349` uses `Alert.alert` (a no-op on web) → blank hero, no recovery; native has no retry button either. **Fix:** inline error + "Try again" mirroring LeaderboardScreen (which does it right).
- **Single-tap Verify/Resolve/Reject has no confirm** while bulk/admin/delete all do — `TasksScreen.tsx:1428`, `FlagDetailModal.tsx:1369`. Reject (spam/invalid, admin-reversible) is the one to gate. **Fix:** add `confirm()` to Reject.
- **Optimistic reconcile swallows refresh failures** — `TasksScreen.tsx:446/:580/:599`, `flagsStore.tsx:411`: `refresh().catch(()=>{})` after an awaited status write; on a flaky link the list can drift from server truth silently. **Fix:** surface a soft "couldn't refresh — pull to update."
- **AddressSearch has no error state** — `AddressSearchModal.tsx:85-94` + `geocode.ts`: a stalled/failed search shows a perpetual spinner or a misleading "No matches" (no distinct error/retry). *(See also S2 timeout.)*
- **PhotoGallery lightbox breaks on rotation** — `PhotoGallery.tsx:18` reads `Dimensions.get('window')` once at module load; paging math (`contentOffset`, page index) misaligns after rotate/iPad split. **Fix:** `useWindowDimensions()`. (Single-photo `PhotoLightboxModal` uses `100%` and is immune.) *(CODE; device-confirm.)*
- **"Coming soon" Report-form gate** — `ReportFlagModal.tsx:97-103`: honest degrade when `context_tags` isn't live, but a demo on that backend shows an unfinished control. **NEEDS-SKY:** confirm the migration is applied live.
- **Deep-link callout race** — `MapScreen.tsx:1077` fires `showCallout` on a fixed 700 ms timer not gated on the marker existing; a far/clustered deep-linked flag centers but the bubble silently never opens. **Fix:** retry a couple times ~150 ms apart / open on map-ready. *(MINOR–MODERATE.)*
- **Drawer→hidden-route dead-tap window** — `RootNavigator.tsx:371-381`: if `navigationRef.isReady()` is false, the drawer closes and the navigate is silently dropped (Settings/Admin/Sign-in land nowhere). **Fix:** defer/retry instead of dropping. *(Low frequency.)*

### MINOR
- **PhotoLightbox / PhotoGallery have no pinch-zoom** (deferred) — for an accessibility app whose photos document curb height/ramp slope, low-vision users can't magnify the evidence. Highest-value a11y polish for the audience (`react-native-gesture-handler` already installed). *(NEEDS-SKY-DEVICE.)*
- **Map-chrome labels lack `maxFontSizeMultiplier`** — `MapScreen.tsx:2222/:2268` status pill + action-bar can overflow at XXL Dynamic Type; small-width (≤320 pt) bottom bar (legend + FAB column, `:2472`) can collide. *(NEEDS-SKY-DEVICE.)*
- **Sheet primitive adopted by ~1 of 17 modals** — only `ChangelogModal` uses `Sheet`; the rest hand-roll, giving 3 close-button shapes, divergent title sizes (`xl`/`xxl`/`lg`), and the drag-handle on exactly one modal. Consolidation opportunity (incrementally adoptable).
- **Inconsistent modal heights** — `'80%'`/`'85%'`/`'90%'` and several **fixed** `height:'85%'` (`MyReportsModal:452`, ActivityFeed, Achievements) → short lists show empty whitespace. Prefer `maxHeight` everywhere.
- **Dev/stale copy:** `FilterPresetsModal.tsx:292` "Wiring next release" (verify all call-sites pass `onApply`); dead `: 'Flag reopened'` branch `FlagDetailModal.tsx:409`; unused `Text` imports `MapScreen.tsx:11`/`ReportFlagModal.tsx:11`; offline-banner copy/punctuation differs across Home/Map/Nearby.
- **OnboardingCards locks swipe under Reduce Motion** (`:298 scrollEnabled={!reduceMotion}`) — inconsistent with `OnboardingModal` (which doesn't). Keep swipe, just drop the animation.
- **SavedPlaces empty-name keyboard-submit shows nothing on web** (`:283` → `Alert.alert` no-op); **AchievementsModal earned-wash** hardcoded `#fff3d1` may wash out in dark mode (`:140`); **StatusHistoryModal** uses raw numeric literals off-token (`:218-305`); **LeaderboardModal** `as unknown as number` cast (`:257`).

### Verified genuinely fine (don't spend time)
No orphaned screens / no dead controls (LegendModal `onPress={()=>{}}` is a correct tap-swallow). Leaderboard states are a model (loading/error+retry/category-aware empty). Admin gate triple-enforced. ResourcesScreen complete. ReportFlagModal robustness strong (sync `submittingRef`, orphan-photo cleanup, blob-URL revocation). CAS conflict UX honest across all 3 surfaces. Modal dismissal return-targets + modal-over-modal stacking correct. Reduced-motion honored 17/17 modals. Web `Alert.alert` no-op defended in all important paths (SignIn/Settings/destructive via `confirm()`/`notify()`).

**States matrix takeaways:** "offline-distinct" messaging is generic almost everywhere (acceptable); AddressSearch is the one modal with a genuinely missing error state; the two notification-pref surfaces are weakest on save-failure feedback.

---

## 4. PERFORMANCE FINDINGS (ranked by user-perceived impact)

1. **[TOP] Single un-split 4.15 MB JS chunk → parse/execute is the real TTI cost.** `AppEntry.js` = 4,145,870 B uncompressed, **~805 KB on the wire (LIVE-CONFIRMED, 0.76 s)**. Zero code-splitting; `RootNavigator` statically imports every screen + all 25 modals + Leaflet, so an anonymous map-viewer parses Admin/Settings/ReportFlow too. **Fix:** `React.lazy()`+`Suspense` on gated surfaces (Admin 12 KB, Settings 29 KB, ReportFlagModal 55 KB, heavy modals) + enable Metro web async chunking (config is bare default). **Payoff:** ~30–40 % parse off the critical path. **NEEDS-SKY-DEVICE** for scripting-ms on mid-tier hardware.
2. **[P1 runtime] `MapScreen` rebuilds its entire ~70-object StyleSheet every render** — `MapScreen.tsx:196 const styles = makeStyles(color)` (not memoized); MapScreen re-renders per filter toggle / per keystroke in prompts. **Fix (one line):** `useMemo(()=>makeStyles(color),[color])`. Same pattern unmemoized at `TasksScreen:88`, `ProfileScreen:150`, and **`FlagCard:1263`** (per-card). Free, obviously correct.
3. **[P2 runtime] `FlagCard` memo defeated** — `TasksScreen.tsx:638-671` `renderFlagItem` passes an inline `onPress` and depends on `selection`/`busyId`, so a new handler identity flows to every visible card on selection/triage → **all visible cards re-render**. **Fix:** hoist `onPress` into a stable `useCallback`. Collapses a full-list re-render into one card.
4. **Font deploy-bloat (not a download cost)** — 48 `.ttf` (4.13 MB) shipped, **only 8 fetched (LIVE-CONFIRMED)**. ~3.4 MB orphan files inflate the deploy + SW pre-cache surface. **Fix:** import per-weight subpaths or a post-export prune. **Payoff:** lighter deploy/cache; ~zero first-paint change.
5. **Lighthouse CI is silently broken** — `.lighthouserc.js:4` serves `web-build`; expo outputs `dist`. The `accessibility ['error',0.9]` gate tests nothing. **Fix (one line):** `web-build`→`dist`. Cheapest way to get real Core Web Vitals + the a11y gate back.
6. **`auth.tsx` context value not memoized** — `auth.tsx:81` returns a fresh object every `setSession`, re-rendering all `useAuth()` consumers — including on the **hourly `TOKEN_REFRESHED`**. App.tsx already keys effects on `userId` to dodge the symptom. **Fix:** `useMemo` the value.
7. **`HamburgerDrawer` timer leak** — `:109 setTimeout(()=>setSubScreen(...),220)` has no `clearTimeout` and calls setState — the **one genuine setState-without-cleanup timer** (corrected count: 10 app timers, not 20; the rest are test flushers). **Fix:** ref + clear on unmount.
8. **Service-worker stale-shell window** — `sw.js` SWR on `'/'` serves the old `index.html` (old bundle hash) for one load after each deploy; `CACHE_VERSION='v1'` never bumped. **Fix:** `NetworkFirst` for navigation docs; keep SWR for hashed assets.
9. **Lucide icons may over-ship** — 5,783 SVG `d:"…"` paths in the bundle vs 44 icons imported; possible tree-shake miss. **NEEDS-LIVE** source-map-explorer to apportion the exact byte slice. **Payoff:** potentially 10–40 KB gz if confirmed.
10. **Hashed assets served `cache-control: max-age=0, must-revalidate`** (LIVE) — immutable hashed JS could cache far longer (the SW partly compensates). Minor repeat-load win.

**Already optimal — leave it:** list virtualization/clustering/pagination/SWR store; MapScreen's *data* memoization (`mapFlags`/`heatCells`/`filteredFlags`) + the native `PlatformMap` memo are real and effective; realtime teardown is **SOUND** (FIFO teardown-await chain, never wedges); heatmap O(n) memoized + off-path short-circuit; App.tsx startup async-gated; images well-optimized (og 96 KB, icons tiny); first-paint splash excellent.

---

## 5. SAFETY / ROBUSTNESS FINDINGS

### Robustness (new ground)
- **[SERIOUS] GPS read can hang forever — no timeout** — `location.ts:134` & `MapScreen.tsx:963` call `getCurrentPositionAsync` with no `timeout`; if no fix is ever obtained (indoors/weak signal) and there's no cached fix, the promise never settles → the distance-sort/locate spinner spins forever and `refresh()` can't recover. The **web** path correctly passes `{timeout:10_000}` — native just lacks it. **Fix:** `Promise.race` a 15 s timeout, treat as the existing error branch, both sites. *(NEEDS-SKY-DEVICE to repro.)*
- **[SERIOUS] Address search can hang — no fetch timeout** — `geocode.ts:89/:115` pass an AbortSignal but no timeout; a stalled Nominatim request leaves `AddressSearchModal` spinning until close/retype. **Fix:** `AbortSignal.timeout(8000)` combined with the caller signal; the `AbortError→[]` handling already does the rest.
- **[MODERATE] Notification-pref write swallows even the warn** — `useNotificationPreferences.ts:145` persists a deliberate toggle fire-and-forget with no surface and no `console.warn`; a failed write silently vanishes on next mount. **Fix:** at least add the warn; ideally a soft toast. *(Borderline tier call — flag for Sky/Jordan.)*
- **[MINOR] No crash telemetry** — `ErrorBoundary.tsx:84` only `console.error`s (Sentry removed). App-wide + per-screen boundaries prevent white-screen, so **acceptable for a demo**; wiring PostHog/Sentry is post-demo.
- **[MINOR] Offline sign-out impossible by design** — `supabase.ts:84+` honestly surfaces the failure rather than faking success. Known, honest edge case.
- **[MINOR] `getForegroundPermissionsAsync().then()` without `.catch`** (`MapScreen.tsx:992`, `OnboardingCards.tsx:225`) — theoretical unhandled rejection; trivial `.catch`. Per-tile web fetch (`PlatformMap.web.tsx:488`) has no timeout but degrades gracefully to Leaflet's direct `img.src`.

**Swallowed-catch verdict:** the codebase is **exceptionally hardened** — of 202 catch sites, the only GENUINE (minor) swallows are the notification-pref write (M1) and the optimistic reconcile (m1, pre-known); every other catch is INTENTIONAL-SAFE (documented degrade with warn/fallback). Input validation, null-safety (all 18 `JSON.parse` guarded; `(data ?? [])`/`maybeSingle()`), races (sequence tags, sync refs, mounted guards), and optimistic-with-rollback are all SOLID.

### Privacy / Security verification verdict: **SOUND / INTACT** (16 areas re-verified)
- **EXIF/GPS strip + verify — INTACT.** `uploadStrippedImage` (`flags.ts:445`) full fail-closed gate; `verifyExifStripped` runs on the **stripped** bytes (reassign `:493`/`:504` before `:508`); both `uploadFlagPhoto` and `uploadAvatar` route through it. No bypass.
- **Owner-scoped RLS — INTACT** across `point_events` (no client write policy), `flag_photos` (folder-scoped insert), `feedback`, `flag_comments`, `push_tokens`, `notification_preferences`, and both history tables (raw SELECT revoked, public read via `user_id`-omitting SECURITY INVOKER views).
- **Points unforgeable — INTACT.** All trigger fns `SECURITY DEFINER` + `search_path=public` + `REVOKE EXECUTE FROM public/anon/authenticated`; point writes are definer-only.
- **Storage RLS — INTACT** for both `<uid>/<ts>` and `<uid>/avatar/<ts>` via `foldername(name)[1] = auth.uid()`. Admin self-promotion blocked (`WITH CHECK` pin). Account deletion anonymizes flags before delete, preserves anonymized audit trails.
- **Edge functions — INTACT.** delete-account (JWT verify + anonymize-before-delete), notify-flag-status (webhook secret via Vault RPC + enumeration-oracle fix), send-push (Bearer + token-oracle fix); secrets from `Deno.env`, never logged.
- **Secrets / email-PII / analytics — INTACT.** Only `EXPO_PUBLIC_*` client-side; email excluded from selects; analytics `console.log`s `__DEV__`-gated; a `.husky/pre-commit` hook scans for hardcoded passwords. Secret sweep across `src/`+`supabase/`+`docs/` clean.

**Real gaps (2):**
1. **Reviewer plaintext password committed — MEDIUM, NEEDS-SKY.** At HEAD in `docs/APP_STORE_REVIEWER_NOTES.md:8` + git history (`9fd1cd9`); the migration's own claim that it's "never committed" is contradicted by that file. **Sharpest fix: rotate the `reviewer@accessmap.app` password in Supabase** (instantly neutralizes the leaked value), then optionally scrub history. *(Literal not reproduced here.)*
2. **DB-level `status_transition_guard` is NOT live — LOW/defense-in-depth, NEEDS-SKY.** `2026-06-09_status_transition_guard_PROPOSED.sql` isn't applied, so a hand-rolled REST client could write an illegal transition (e.g. `resolved→verified`). The **shipped app is protected** by the F53 client compare-and-set, so not exploitable through the app — but the server-side guard is absent. Same NEEDS-SKY note for confirming the several hardening migrations whose stale `PROPOSE-ONLY` headers belie that they're live per the reconciled `schema.sql`.

---

## 6. ★ ACCESSIBILITY REPORT (final gate)

**Strong baseline** (~1,400+ a11y props, documented status-color contrast pairs, reduced-motion gated 17/17 modals, severity/status as number+word+icon, Dynamic-Type caps via `AppText`, ≥44 pt targets nearly everywhere) — with **one systemic code gap** plus device-only items.

- **WCAG 2.4.3 / 3.2.x — SERIOUS — no modal moves SR focus to its title on open.** `setAccessibilityFocus` = **0 occurrences** (CODE-confirmed). All modals trap focus (`accessibilityViewIsModal`) but never place initial focus → first VoiceOver swipe lands unpredictably. **Fix:** add `AccessibilityInfo.setAccessibilityFocus` on the title ref — centralize in `Sheet.tsx`, migrate hand-rolled modals. *(Code-fixable; certify with VoiceOver → NEEDS-SKY-DEVICE.)*
- **WCAG 2.5.5 — MINOR — residual sub-44 targets** (`TasksScreen:~1550 minHeight:40`, LegendModal close-row). Bump to 44.
- **WCAG 1.4.3/1.4.11 — contrast over frosted-glass map chrome — VERIFIED-BY-DESIGN, NEEDS-SKY-DEVICE to measure** (`GlassSurface` drops blur under Reduce Transparency + keeps an AA floor; `theme.ts` documents ~6–7:1 status pairs).
- **WCAG 1.4.4 — Resize/Reflow — NEEDS-SKY-DEVICE.** `allowFontScaling=false` 0× (good); the untested failure mode is max-Dynamic-Type overflow on a narrow device — map-chrome labels, fixed-height sheets, the `numberOfLines={1}` 40 pt display title (`ScreenHeader`).
- **WCAG 4.1.3 — Status Messages — VERIFIED (code) / device behavior NEEDS-SKY** — verify/resolve announce via `announceForAccessibility` + `accessibilityLiveRegion="polite"`.
- **WCAG 2.3.3 / 1.4.1 — VERIFIED** — reduced-motion gating + rest states correct; color never sole carrier (number+word+icon; remove-color check passes).
- **Low-vision photo zoom — gap** — no pinch-zoom on evidence photos (see UI/UX MINOR); the highest-value a11y polish for the target audience.

**Blunt AA-claim verdict:** *"Provably AA" is not yet honest end-to-end, but the gap is narrow.* One code fix (modal focus-move) + one TestFlight VoiceOver pass over every screen×state×theme at max Dynamic Type + a contrast measurement over the glass chrome makes the AA claim credible.

---

## 7. THE PRIORITIZED FIX PLAN  (severity × user-impact ÷ effort)

### AUTONOMOUS-FIXABLE (provable-safe, presentation/logic-only; none touch the fenced data layer — branch from `main`, run `npm run typecheck` + `npm test` before merge)
| # | Fix | Sev | Effort | Location |
|---|---|---|---|---|
| A1 | Light-mode drawer: theme the panel or hardcode light text | SERIOUS | S | `HamburgerDrawer.tsx:293,328,382,155,274` |
| A2 | One source of truth for point values; correct Help FAQ copy | SERIOUS | S | `HelpModal.tsx:36`, `TasksScreen.tsx:565`, shared const |
| A3 | Timeout on native GPS + geocode fetch (race a 15 s/8 s reject) | SERIOUS | S | `location.ts:134`, `MapScreen.tsx:963`, `geocode.ts:89/115` |
| A4 | Modal SR focus-move on open (centralize in `Sheet.tsx`) | SERIOUS | M | `ui/Sheet.tsx` + hand-rolled modals |
| A5 | `React.lazy` Admin/Settings/ReportFlow/heavy modals + Metro web chunking | MODERATE | M–L | `RootNavigator.tsx`, `metro.config.js` |
| A6 | `useMemo(makeStyles)` ×4 + hoist `FlagCard` `onPress` to `useCallback` | MODERATE | S | `MapScreen:196`,`Tasks:88/638`,`Profile:150`,`FlagCard:1263` |
| A7 | ProfileScreen inline error + Try-again | MODERATE | S | `ProfileScreen.tsx:349` |
| A8 | Lighthouse path `web-build`→`dist` | MODERATE | XS | `.lighthouserc.js:4` |
| A9 | Web Report-FAB: open modal + resolve location inside | MODERATE | S | `MapScreen.tsx:1888` |
| A10 | AddressSearch error state + retry; surface optimistic-refresh failure | MODERATE | S | `AddressSearchModal`, `TasksScreen:446/580` |
| A11 | `HamburgerDrawer` timer cleanup; `auth.tsx` value `useMemo`; SW `NetworkFirst` for nav docs | MINOR | S | `:109`, `auth.tsx:81`, `sw.js` |
| A12 | Confirm-dialog on Reject; PhotoGallery `useWindowDimensions`; prune dead fonts; touch targets→44; dead-code/copy cleanup | MINOR | S | as cited |

### NEEDS-SKY (device / judgment / live state / fenced layer)
| # | Item |
|---|---|
| N1 | Confirm **live** points-trigger values, then A2 fix; reconcile `CLAUDE.md` |
| N2 | Confirm `context_tags` migration is applied live (else demo shows "coming soon") |
| N3 | **Rotate** the reviewer Supabase password + scrub `docs/APP_STORE_REVIEWER_NOTES.md` + history |
| N4 | Confirm applied-vs-proposed migrations; decide whether to apply the DB `status_transition_guard` (defense-in-depth) |
| N5 | TestFlight VoiceOver/TalkBack pass: every screen×state×theme at max Dynamic Type (certifies A4, the AA claim, drawer light-mode, glass contrast, GPS-stall) |
| N6 | Pinch-zoom on evidence photos (low-vision) — product call |
| N7 | Low-end-Android profiling of MapScreen/FlagCard (quantifies A5/A6) |

### LEAVE IT — it's fine
Instant-paint splash · list virtualization/clustering/SWR · realtime teardown · EXIF chain + all RLS + secrets + dev-only analytics · reduced-motion gating · color-not-alone · Dynamic-Type caps · Leaderboard states · Admin gate · ResourcesScreen · LegendModal tap-swallow · ErrorBoundary (demo-sufficient) · offline sign-out · location one-shot · images.

---

*Read-only sweep — no files modified except this report. Live pass was read-only navigation/measurement of the public demo (no writes, no auth actions). No data/auth/DB touched, no live-data tests, no external sends. Branches untouched. Fixes are a separate, Sky-dispatched pass.*
