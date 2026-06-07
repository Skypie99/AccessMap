# AccessMap — AUDIT_MAP (Deep Bug & Functionality Hardening Pass)

**Date:** 2026-06-07 · **Branch:** `audit/accessmap-deep-2026-06-07` (from `main` @ `cbf9a3b`)
**Baseline:** `npm run typecheck` → exit 0 (clean); 95 test suites / 1,564 tests green; 80% coverage gate.

This is the foundation document for the bulk-bug audit: the whole-system inventory, the
dependency/data-flow map, the tech-debt catalog, and the ranked roadmap. The **verified
findings list** is appended at the bottom after the Phase 2 hunt completes.

---

## 1. INVENTORY — every screen + interactive element

### Navigation shell
- **Stack:** React Navigation v7 bottom-tabs (`src/navigation/RootNavigator.tsx`). Tabs:
  **Map · Tasks · Profile · Settings · Admin** (Admin only when `is_admin === true`).
- **Deep link:** `accessmap://flag/{flagId}` → Map tab, flag focused.
- **Shared modal pool** (`src/lib/sharedModalsContext.tsx`): one slot
  (`help | changelog | feedback | myFeedback | null`), mounted once at root via
  `<SharedModalsHost />`; Profile/Settings call `setOpen()` instead of mounting their own.
- **App gates** (`App.tsx`): `FirstLaunchGate` (onboarding) → `Gate` (auth/guest) →
  `SignedInArea` (reads default tab, points flash) → `RootNavigator`. Each renders `null`
  while an async read resolves (white-screen-hang risk surface).

### Screens / modals (16) and their controls

| Screen | File | Key interactive elements |
|---|---|---|
| Map | `src/screens/MapScreen.tsx` (2.3k L) | long-press→Report; tap cluster/marker→callout; filter chips (category/severity/distance/heatmap); FAB "+", search, nearby, refresh, my-location, legend; callout Verify/Resolve/Details |
| Tasks | `src/screens/TasksScreen.tsx` (1.7k L) | mine-only toggle; severity chips; category filter; sort dropdown; debounced search; SectionList(open/verified); tap card→Map; long-press→bulk select; bulk action bar |
| Profile | `src/screens/ProfileScreen.tsx` (2.4k L) | edit name/avatar; realtime/streak toggles; points history; activity feed; my reports/watched; achievements; leaderboard; sign-out |
| Settings | `src/screens/SettingsScreen.tsx` | theme; default-tab; push toggle; notif prefs; export data; help/feedback/changelog/about; sign-out |
| Admin | `src/screens/AdminScreen.tsx` | recent-flags FlatList; per-row delete/ban/reject; confirm dialogs |
| SignIn | `src/screens/SignInScreen.tsx` | email/password; Sign In; Sign Up; Continue as Guest |
| Report | `src/screens/ReportFlagModal.tsx` | category picker; severity slider; description; photo gallery (camera/library); context-tag chips (≤5); template dropdown; Submit |
| Flag detail | `src/components/FlagDetailModal.tsx` | status actions; edit; photo gallery; tags; comments thread; watch toggle; delete; share; view-on-map; reopen form |
| Onboarding | `src/components/OnboardingCards.tsx` / `src/screens/OnboardingModal.tsx` | 4-card carousel; Done |
| Leaderboard | `src/screens/LeaderboardScreen.tsx` | ranked list; user rank highlight |
| About / HowToHelp / Resources | `src/screens/{AboutScreen,HowToHelpScreen,ResourcesScreen}.tsx` | scroll + close |
| Legend | `src/screens/LegendModal.tsx` | severity ramp + category list |
| Nearby | `src/screens/NearbyFlagsModal.tsx` | category chips; search; flag list |
| Notif prefs | `src/screens/NotificationPreferencesScreen.tsx` + `src/components/NotificationPrefsModal.tsx` | 4 toggles |
| Pooled modals | `src/components/{FeedbackModal,HelpModal,ChangelogModal,MyFeedbackModal}.tsx` | forms / search / lists |
| Other modals | `src/components/{ActivityFeedModal,PhotoLightboxModal,StatusHistoryModal,AchievementsModal,AddressSearchModal,SavedPlacesModal,FilterPresetsModal,MyReportsModal,MyWatchedModal}.tsx` | per-feature |

### Map rendering
- Native: `react-native-maps` + `react-native-map-clustering` (`PlatformMap.tsx`).
- Web: `react-leaflet` 5 + `supercluster` + OSM tiles (`PlatformMap.web.tsx`).
- Both expose `{ animateTo, showCallout }` imperative handle. Markers: severity teardrops,
  clusters, heat polygons (k≥3 privacy filter), user-location dot.

---

## 2. DEPENDENCY / DATA-FLOW MAP

### State providers (React Context — no query library)
- `AuthProvider` (`src/lib/auth.tsx`) — `{ session, user, loading }`; `onAuthStateChange`
  listener; push-token registration on SIGNED_IN / INITIAL_SESSION.
- `FlagsProvider` (`src/lib/flagsStore.tsx`) — central flags list; **SWR** (cold-start cache
  paint + network reconcile, gated by `hasHydratedRef`), **sequence-tag** stale-fetch
  discard (`fetchSeqRef`), ref-based loadMore guard, offline cache (per-user key, 24h TTL),
  **D4 realtime** (opt-in, `[]`-dep mount effect), viewport-gate ref.
- `ThemeProvider` (`src/theme/ThemeContext.tsx`) — dark mode + tokens.
- `SharedModalsProvider` — pooled modal slot.

### Supabase surface (client `src/lib/supabase.ts`; types `src/types/database.ts`)
- **auth:** signInWithPassword, signUp, getSession, onAuthStateChange, signOut, getUser.
- **flags:** listFlagsPage / listFlags / fetchFlagById (read); createFlag / createAnonFlag /
  updateFlagStatus / deleteFlag (write); Storage `flag-photos/<uid>/<ts>.<ext>`.
- **flag_photos / flag_comments / feedback / point_events / flag_status_history /
  push_tokens / realtime_subscribe_log** — all OPTIONAL (graceful degrade if not migrated).
- **users:** profile read/update (display_name ≤60, avatar_url); `is_admin` check.
- **points:** `handle_flag_status_change` trigger awards points; client reads `users.points`
  + last-seen watermark (AsyncStorage) → flash banner.
- **realtime:** channel `flags-status` (opt-in); `flag_comments:<id>` (per detail modal).
- **RPC:** `log_realtime_event` (D4 observability, fire-and-forget).

### Permissions / native APIs
- **Location** (`src/lib/location.ts`): one-shot `requestForegroundPermissionsAsync`
  (Tasks/Map); Profile uses `getForegroundPermissionsAsync` (no auto-prompt, Art. 9.6); web
  `navigator.geolocation`.
- **Camera / Photos** (expo-image-picker): Report + FlagDetail + Profile avatar.
- **Notifications** (expo-notifications, dynamic require): PIPEDA explanation before OS prompt.
- No AppState listeners; no geolocation watchers (one-shot only).

### Listeners / subscriptions / timers (cleanup audit targets)
- Auth `onAuthStateChange` → `subscription.unsubscribe()` on unmount. ✔ check.
- Flags D4 channel → cleanup `unsubscribe().then(log)` + `removeChannel` (double-teardown?).
- Comments channel (`useComments.ts`) → `removeChannel` on unmount / flagId change.
- `AccessibilityInfo.announceForAccessibility` on error string change.
- MapScreen staged `setTimeout` (50/100/350ms) for focus animation — clearTimeout on unmount?
- FlashBanner auto-dismiss timer.

### Navigation paths with params
- Tasks card → Map `{ focusFlag, ts }`; deep link → Map `{ flagId }`; Profile/Tasks →
  FlagDetailModal(flag); Map long-press → ReportFlagModal(coord).

### Async boundaries (loading/error/empty/offline to verify)
- App gates (fonts/onboarded/defaultTab); flags fetch (SWR/offline); every modal that fetches
  (comments, status history, photos, leaderboard, my-reports, feedback list); geocode;
  location; photo upload; data export; status actions.

---

## 3. HIGH-TRAFFIC / HIGH-RISK NODES
1. `src/lib/flagsStore.tsx` — central state, realtime, offline. Highest blast radius.
2. `src/screens/MapScreen.tsx` — staged timeouts, viewport gate, deep-link, filters.
3. `src/screens/ReportFlagModal.tsx` + `src/lib/photos.ts` — photo/EXIF (privacy-critical), submit.
4. `src/components/FlagDetailModal.tsx` + `src/hooks/useComments.ts` — status actions, realtime comments.
5. `src/screens/TasksScreen.tsx` — bulk concurrent writes.
6. `App.tsx` gates — white-screen-hang surface.
7. `src/lib/auth.tsx` — session lifecycle, push registration.
8. `src/lib/location.ts` — permission-denied / web paths.

---

## 4. TECH-DEBT CATALOG (initial; refined by the hunt)
- **`any` boundaries (28 total, mostly justified):** map-clustering callbacks
  (`PlatformMap.tsx`), file/image reader events (`flags.ts`), realtime payload shapes
  (`useComments.ts`). Low risk but each is an unchecked boundary.
- **Large screens:** MapScreen (2.3k), Profile (2.4k), Tasks (1.7k) concentrate logic and
  effects → higher chance of effect/cleanup/closure bugs.
- **Manual server-state caching** (no React Query): every fetch site re-implements
  loading/error/refresh → inconsistency risk; SWR logic concentrated in flagsStore is
  intricate (cache paint vs reconcile ordering).
- **`[]`-dep realtime effect** in flagsStore: opt-in read once on mount; live-toggle behavior
  must be confirmed (seed finding #1).
- **Gate `return null`** with no timeout/error path in App.tsx (seed finding #4).
- **Graceful-degradation sprawl:** many optional tables return `[]`/skip — correct by design,
  but masks real failures if mis-applied; verify each path distinguishes "not migrated" from
  "genuine error".

---

## 5. RANKED ROADMAP (provisional — finalized against verified findings)
1. **Crash/data-loss/privacy (critical)** first — anything that can throw uncaught, lose a
   user's report, or expose location/disability data.
2. **White-screen hangs** — gate effects that can strand the user.
3. **Realtime correctness** — dead toggle, channel teardown, privacy posture.
4. **Races** — double-submit/double-tap (Report, status actions, bulk, toggles), focus/refetch
   races, out-of-order async, setState-after-unmount.
5. **Leaks** — uncleaned timers/subscriptions.
6. **Dead features / broken flows** — any control that does nothing or flow that can't complete.
7. **Robustness polish** — empty/error/offline states, input validation, `any` boundaries.
8. **Propose-only (DECISIONS FOR SKY):** all DB/RLS/index needs + known backend items.

Related fixes land together per file/feature; typecheck stays green after each; a Jest test
locks crash/race fixes where practical.

---

## 6. VERIFIED FINDINGS (Phase 2)

Hunt method: 13 area buckets, one Sonnet hunt agent each, **every finding adversarially
verified** by an independent skeptic agent against the real code (36 candidates → 28 confirmed
→ deduped to **27 unique**; 8 false positives killed). I then re-verify each at fix time.

**Severity tally:** 1 critical · 10 high · 9 medium · 7 low.

| # | Sev | Cat | Finding | File:lines |
|---|---|---|---|---|
| F1 | **CRIT** | privacy | EXIF D8 fail-**open** for WEBP/custom-PNG on web: `stripExifWeb` 6 fallback paths `resolve(arrayBuffer)` (original), and `verifyExifStripped` only scans JPEG markers → unstripped GPS uploaded | `src/lib/flags.ts:119-245,327-344` |
| F2 | high | dead | Realtime toggle is a session no-op: `flagsStore` reads `loadRealtimeEnabled()` once on `[]` mount (not reactive); provider never remounts on toggle | `src/lib/flagsStore.tsx:414-486` |
| F3 | high | race | Anon report double-submit: `setSubmitting(true)` deferred past `await checkAnonRateLimit()`, no entry guard → duplicate flags + rate-limit bypass | `src/screens/ReportFlagModal.tsx:237-278` |
| F4 | high | race | Bulk Verify/Resolve double-submit: `await confirm()` before `setBulkBusy(true)`; buttons stay enabled during dialog | `src/screens/TasksScreen.tsx:332-401` |
| F5 | high | dead | "Show intro again" clears orphaned per-user key (`clearOnboardingSeen`) not the device key (`clearOnboarded`) App reads → no-op | `src/screens/ProfileScreen.tsx:597-612` |
| F6 | high | dead | Guest → Profile → Create Account traps user in modal on iOS (sign-up success never calls `onClose`, no `presentationStyle`) | `src/screens/ProfileScreen.tsx:747-753` + `SignInScreen.tsx:63-68` |
| F7 | high | dead | Web right-click drop-flag dead for already-signed-in users: contextmenu effect binds before `mapInstance` ready; deps stable for session | `src/components/PlatformMap.web.tsx:526-540` |
| F8 | high | dead | Reopen-request vote count never persisted: `increment_reopen_request` RPC defined but never called; `getTier(null)` always Bronze | `src/components/FlagDetailModal.tsx:470-516` |
| F9 | high | dead | MyReportsModal `statusFilter`/`sortBy` never reset on close → stale filter can yield permanent empty state whose "Tap All" button is hidden | `src/components/MyReportsModal.tsx:58-70,297` |
| F10 | high | dead | NotificationPreferencesScreen unreachable from Settings: `setNotifPrefsOpen(true)` never called (the row opens a different modal) | `src/screens/SettingsScreen.tsx:210,533-536` |
| F11 | high | dead | HamburgerDrawer "Sign in" is a dead-end for guest/web users: `onPress` only closes the drawer; no path to auth | `src/components/HamburgerDrawer.tsx:171-178` |
| F12 | med | race | `loadMore` cursor corrupted by concurrent `setStatuses` (no seq-tag check; writes old-query cursor over fresh one) | `src/lib/flagsStore.tsx:336-363` |
| F13 | med | race | AddressSearch stale geocode: backtracking below 3 chars doesn't `abort()` in-flight fetch → results for old query overwrite reset | `src/components/AddressSearchModal.tsx:67-92` |
| F14 | med | data-loss | SavedPlaces optimistic delete swallows AsyncStorage write failure (empty catch, no rollback) → ghost entry reappears | `src/components/SavedPlacesModal.tsx:142-164` |
| F15 | med | race | useComments stale fetch: flagId A→B, A resolves last → FlagB shows FlagA comments (no generation guard) | `src/hooks/useComments.ts:37-66` |
| F16 | med | data-loss | Comment draft not reset on flag swap → typed text can post to the wrong flag | `src/components/FlagDetailModal.tsx:119-127` |
| F17 | med | dead | Photo thumbnail Pressable intercepts selection-toggle taps in bulk mode (nested Pressable, no `selectionActive` guard) | `src/screens/TasksScreen.tsx:1198-1227` |
| F18 | med | race | Admin action buttons use `accessibilityState.disabled` only (not `disabled`); double-tap before dialog races (Remove+Dismiss on same row) | `src/screens/AdminScreen.tsx:172-196` |
| F19 | med | data-loss | Feedback body truncated to 1800 in mailto while UI allows 5000 → silent text loss in mail composer | `src/lib/feedback.ts:40,55` |
| F20 | med | dead | OnboardingModal replay opens at last-seen card (no `visible→true` reset of index/scroll) | `src/screens/OnboardingModal.tsx` |
| F21 | low | other | FlashBanner auto-dismiss timer resets on `SignedInArea` re-render (inline `onDismiss` not memoized) | `src/components/FlashBanner.tsx:46-50` + `App.tsx:86` |
| F22 | low | leak | Channel double-teardown: `unsubscribe()` + `removeChannel()` both fire → duplicate phx_leave | `src/lib/flagsStore.tsx:472-479` |
| F23 | low | race | tileCache concurrent `setCachedTile` read-modify-write on shared index → orphaned tile data (slow storage leak) | `src/lib/tileCache.ts:142-161` |
| F24 | low | leak | `stripExifWeb` leaks objectUrl when canvas ctx unavailable (no `revokeObjectURL` on early return) | `src/lib/flags.ts:139-146` |
| F25 | low | leak | Web photo picker leaks `<input>` element + Blob URL each upload (never removed/revoked) | `src/components/FlagDetailModal.tsx:224-242` |
| F26 | low | other | LeaderboardScreen: rank-fetch failure clobbers already-loaded entries (single try/catch over two awaits) | `src/screens/LeaderboardScreen.tsx:207-224` |
| F27 | low | race | AdminScreen concurrent `load()` on rapid tab focus → stale response can overwrite newer | `src/screens/AdminScreen.tsx:40-56` |

**False positives killed by verification (no action):** deep-link 700ms timer (cancelled-flag
guard is correct, no setState) ×2; `push_tokens` onConflict (schema = `user_id` PK, "one row
per user" by design); lightbox `Dimensions` (app is `orientation: portrait`-locked);
points.ts "dead" (actually wired in `App.tsx:13,49-79` — independently confirmed); admin
delete RLS (migration `2026-05-30_admin_role.sql` adds "admin delete any flag" policy);
`useIsAdmin` staleness (tree unmounts on sign-out); `relativeTime` 'Invalid Date'
(`created_at` is NOT NULL).

### Ranked fix order (Phase 3)
1. **F1** (privacy critical) — flags.ts EXIF fail-closed + WEBP-aware verify (+F24 same file).
2. **F2, F12, F22** — flagsStore realtime toggle reactive + loadMore seq-guard + single teardown.
3. **F3** — ReportFlagModal anon double-submit guard.
4. **F8, F15, F16, F25** — FlagDetailModal reopen RPC wiring + useComments generation guard + comment-draft reset + web picker cleanup.
5. **F4, F17** — TasksScreen bulk double-submit guard + thumbnail selection guard.
6. **F5, F20, F21, F9, F26** — Profile/onboarding/flash/myreports/leaderboard.
7. **F6, F11** — guest auth: modal escape + hamburger sign-in path.
8. **F10** — Settings notification-prefs entry point.
9. **F18, F27** — Admin double-tap + load race.
10. **F13, F14, F23** — map modals geocode abort + savedplaces rollback + tilecache serialize.
11. **F19** — feedback length alignment.
12. **F7** — web map contextmenu rebind (web-only; verify carefully).

**Propose-only / DECISIONS FOR SKY (not forced):** F8 depends on applying migration
`2026-05-30_flag_reopen_requests.sql` to the live DB (the RPC is wired with graceful
degradation, but the count won't persist until the migration is applied) + the tier-threshold
(`getTier(userPoints)`) is a larger Wave-C change; plus the five known backend items
(points-value drift, duplicate points trigger, RLS `search_path`, webhook secret, flag-photo
bucket INSERT guard).
