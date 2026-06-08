# AccessMap — Deep Bug & Functionality Hardening Audit

**Date:** 2026-06-07
**Branch:** `audit/accessmap-deep-2026-06-07` (from `main` @ `cbf9a3b`) — **NOT merged; main stays Sky's gate.**
**Status:** typecheck ✅ exit 0 · tests ✅ 97 suites / 1,575 passing (+11 new) · lint ✅ 0 errors (60 pre-existing warnings).
**Method:** whole-app map → adversarial bulk defect hunt (49 agents, every finding skeptic-verified) → root-cause fixes (one focused commit each) → full re-verify → second sweep.

---

## DECISIONS FOR SKY

Nothing here was forced. These are propose-only items, judgment calls, and the known
backend list — all reversible, none applied to the live DB.

### 1. PRIVACY — a real GPS leak was found and FIXED (F1, critical)
On the **web** build, EXIF stripping was **fail-open** for WEBP/HEIC photos: if the
browser couldn't re-encode the image (most realistically a **HEIC photo, which browsers
can't decode** → `img.onerror`), `stripExifWeb` returned the *original* bytes, and the
verifier only scanned for JPEG metadata markers — so a photo with embedded **GPS
coordinates** could upload to public Storage. Same path existed for **avatar** uploads
(home-location selfies). **Fixed:** `stripExifWeb` is now fail-**closed** (returns null on
every failure) and the upload aborts, matching the native path. This is on the branch and
reversible; flagging because it's privacy-load-bearing and worth your awareness.

### 2. Reopen-request feature (F8) — needs a Sky decision on completeness
The "Request reopen" flow was a dead-end: it computed a vote count locally from an
always-undefined field and **never called** the `increment_reopen_request` RPC, so a
resolved flag could never reopen. I wired the RPC (migration
`2026-05-30_flag_reopen_requests.sql`, header says applied 2026-05-30) and added a
**per-device dedup** so a single user can't spam-reopen a flag (the RPC stores no `user_id`
by Jordan's privacy gate, so the server can't dedup). **Proposed, not done:**
   - **Per-cycle dedup** using `reopen_requests_reset_at` (the migration's intended model) —
     my per-device guard is conservative (never resets; under-counts rather than allows abuse).
   - **Tier-aware threshold:** `getTier(null)` always resolves to Bronze (3 votes) because
     `public.users.points` isn't threaded into FlagDetailModal; Gold/Platinum don't get their
     1-vote fast path. Threading points is a larger Wave-C change.
   - If the RPC is somehow absent on the live DB, the flow degrades gracefully (honest
     "sent for review" message, no fake tally).

### 3. Known backend items (folded in per your instruction — all PROPOSE-ONLY)
Re-confirmed these still apply; not duplicating the existing pre-ship process:
   - **Points-value drift:** live trigger awards 10/3/15/7; `schema.sql` + docs say 5/2/10/5.
     Pick one source of truth and reconcile. (No app code depends on the exact values except
     the TasksScreen flash copy, which is cosmetic.)
   - **Duplicate points trigger** — remove the redundant `handle_flag_status_change` trigger.
   - **RLS hardening** — set `search_path` on SECURITY DEFINER functions; revoke broad EXECUTE.
   - **Webhook secret rotation** — runbook `qa-reports/2026-06-02_Dana_WebhookSecret_Rotation_Runbook.md`.
   - **flag-photo bucket INSERT guard** — tighten Storage INSERT policy.

### 4. Dead module to remove (cleanup, not done)
After F5, `src/lib/onboarding.ts` (the per-user `hasSeenOnboarding`/`markOnboardingSeen`/
`clearOnboardingSeen` system) is **fully orphaned** — nothing in production reads it. Safe to
delete in a follow-up (it has its own tests, so removal is a small dedicated change).

### 5. Pre-build operational check (carry-over, not code)
Verify `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` exist in the EAS
production environment before building, or the app launches blank
(`npx eas-cli env:list --environment production`).

---

## AUDIT_MAP summary
Full inventory + dependency/data-flow map + tech-debt catalog + ranked roadmap live in
`qa-reports/AUDIT_MAP.md` (written before any fix). In brief:
- **Surface:** 16 screens/modals, ~40 components, ~180 lib files; bottom-tab nav
  (Map/Tasks/Profile/Settings/Admin) + deep link `accessmap://flag/{id}`.
- **State:** React Context only (no query lib) — `AuthProvider`, `FlagsProvider`
  (offline cache + SWR + D4 realtime), `ThemeProvider`, `SharedModalsProvider`.
- **Highest-risk nodes:** `flagsStore.tsx`, `MapScreen.tsx`, the photo/EXIF pipeline,
  `FlagDetailModal.tsx` + `useComments.ts`, the `App.tsx` gates, `TasksScreen` bulk actions.
- The app is mature and heavily hardened, so findings were subtle (lifecycle/async/dead-feature),
  not crashes-on-launch.

---

## Verified findings (27 confirmed; 8 false positives killed by verification)

36 candidates → 28 confirmed → **27 unique** (the realtime-toggle was found in two buckets).
Full table with file:line + repro in `AUDIT_MAP.md §6`. Severity: **1 critical · 10 high · 9 medium · 7 low.**

**8 false positives correctly refuted** (no action): deep-link timer (cancelled-flag guard is
correct) ×2; push-token onConflict (schema = `user_id` PK by design); lightbox `Dimensions`
(app is portrait-locked); points.ts "dead" (it's wired in `App.tsx`); admin-delete RLS
(migration adds an admin policy); `useIsAdmin` staleness (tree unmounts on sign-out);
`relativeTime` 'Invalid Date' (`created_at` is NOT NULL).

### What was FIXED (root cause) — by category

**Crashes / privacy / data-loss (critical + data-loss):**
- **F1 (critical, privacy):** EXIF strip fail-**closed** on web for WEBP/HEIC + avatars; upload aborts when stripping can't run. `flags.ts`, `users.ts`. *Test added.*
- **F14:** SavedPlaces optimistic delete now rolls back + alerts on write failure (was a silent ghost). `SavedPlacesModal.tsx`.
- **F16:** comment draft reset on flag swap/close — can't post to the wrong flag. `FlagDetailModal.tsx`.
- **F19:** feedback input capped at the mailto limit so the email copy can't silently truncate. `feedback.ts`, `FeedbackModal.tsx`.

**Races (high/medium/low):**
- **F3:** anon report double-submit guarded with a synchronous ref. `ReportFlagModal.tsx`.
- **F4:** bulk Verify/Resolve (and bulk-watch) double-submit guarded before the confirm dialog. `TasksScreen.tsx`.
- **F12:** `loadMore` sequence guard — a filter change mid-page can't corrupt the cursor. `flagsStore.tsx`.
- **F13:** AddressSearch aborts the in-flight geocode when backtracking below 3 chars. `AddressSearchModal.tsx`.
- **F15:** `useComments` generation guard — flag A's late response can't overwrite flag B's comments. `useComments.ts`.
- **F18:** Admin actions guarded by a per-flag in-flight Set (buttons used a11y-only disable). `AdminScreen.tsx`.
- **F23:** tileCache index writes serialized through a per-user lock (no orphaned tiles). `tileCache.ts`. *Test added.*
- **F27:** Admin `load()` sequence guard against stale tab-focus overwrites. `AdminScreen.tsx`.

**Leaks (low):**
- **F22:** single channel teardown (`removeChannel` only) — no duplicate phx_leave. `flagsStore.tsx`.
- **F24:** revoke blob objectUrl on the canvas-unavailable path. `flags.ts`.
- **F25:** web photo picker removes the `<input>` + revokes the Blob URL. `FlagDetailModal.tsx`.

**Dead features / broken flows (high/medium):**
- **F2:** realtime toggle is now reactive (was a session no-op until restart). `flagsStore.tsx`. *Tests added.*
- **F5:** "Show intro again" clears the device key the app actually reads. `ProfileScreen.tsx`.
- **F6:** sign-up modal closes after the alert — guests aren't trapped on iOS. `SignInScreen.tsx`.
- **F7:** web right-click drop-flag rebinds once the map instance is ready. `PlatformMap.web.tsx`.
- **F8:** reopen-request RPC wired + dedup (see Decision #2). `FlagDetailModal.tsx`, `flags.ts`, `reopenRequests.ts`. *Test added.*
- **F9:** MyReportsModal resets filters on close (no stale empty-state dead-end). `MyReportsModal.tsx`.
- **F10:** push-notification-categories screen now reachable from Settings. `SettingsScreen.tsx`.
- **F11:** hamburger "Sign in" routes guests to the Profile sign-in. `HamburgerDrawer.tsx`, `RootNavigator.tsx`.
- **F17:** bulk-select photo thumbnail no longer a dead spot for selection. `TasksScreen.tsx`.
- **F20:** onboarding replay resets to card 1. `OnboardingModal.tsx`.

**Other (low):**
- **F21:** FlashBanner auto-dismiss timer no longer resets on re-render. `App.tsx`.
- **F26:** Leaderboard rank-fetch failure no longer hides the loaded board. `LeaderboardScreen.tsx`.

### PROPOSED-ONLY (not forced) — see DECISIONS above
Reopen per-cycle dedup + tier threading (F8); the five known backend items; `onboarding.ts`
removal. No new migration files were authored — all 27 fixes were app-side; the only
DB-backed feature (F8) uses an already-applied migration.

---

## Functionality pass (every feature confirmed or flagged)

Confirmed by code-trace + tests (device-only paths flagged for the on-device checklist):
- **Auth:** sign in / sign up (now escapes the modal, F6) / sign out / guest / web — ✅; hamburger sign-in path fixed (F11).
- **Map:** view, filter (category/severity/distance/heatmap), FAB report, search, nearby, legend, my-location — ✅; web right-click report fixed (F7); native long-press report — flag for device check.
- **Report flow:** create (auth + anon, double-submit fixed F3), photo capture/upload (EXIF fail-closed F1), context tags — ✅.
- **Flag detail:** verify/resolve/reject, edit, delete, comments (race fixed F15, draft fixed F16), watch, share, reopen (wired F8) — ✅.
- **Tasks:** triage list, search/filter/sort, tap-to-map, bulk verify/resolve/watch (double-submit fixed F4), selection (thumbnail fixed F17) — ✅.
- **Profile:** stats, points/flash, leaderboard (partial-fail fixed F26), my reports (dead-end fixed F9), my watched, achievements, avatar, realtime toggle (now works F2), show-intro (now works F5) — ✅.
- **Settings:** theme, default tab, push toggle, banner prefs, push-category prefs (now reachable F10), data export, help/feedback/changelog/about — ✅.
- **Admin:** recent-flags list (load race fixed F27), delete/dismiss (double-tap fixed F18) — ✅.
- **Offline / realtime / saved places:** offline cache, realtime opt-in (F2), saved-places delete (rollback F14), tile cache (race F23) — ✅.

No dead buttons or unreachable screens remain among the audited surface.

---

## Re-verify + second sweep
- **Full re-verify:** `npm run typecheck` (0) + `npm test` (97 suites / 1,575 passing, 0 failures) + `eslint` on all changed files (0 errors).
- **Second sweep:** an independent adversarial regression review (13 agents) re-audited all
  12 fix-groups for defects the fixes themselves might have introduced (new effect deps,
  new guards/refs, the `mapReady`/`setMapRef` loop risk, `withIndexLock` deadlock risk, the
  `genRef` logic, ref-reset completeness). It surfaced **exactly one** issue — a *latent* low
  defect in my own F15 fix: the `useComments` generation counter was incremented *after* the
  `if (!flagId) return` guard, so a (currently-unreachable) truthy→null `flagId` transition
  wouldn't invalidate an in-flight fetch. **Fixed** (increment moved before the guard) and
  re-verified green. No other regressions found across the 24 changed files.

---

## Remaining risk going into testing
- **Device-only paths** Jest can't exercise: native map render/clustering, native permission prompts (location/camera/photos/notifications), real Supabase realtime, EAS env wiring. Covered by the on-device checklist below.
- **F8 reopen** is functionally wired but conservative (per-device dedup, Bronze threshold) until the Decision #2 items are chosen.
- The five **known backend items** remain propose-only.

---

## How to review

```bash
git diff main..audit/accessmap-deep-2026-06-07          # 11 focused commits, one per fix-group
git log --oneline main..audit/accessmap-deep-2026-06-07
```

**Proposed migrations to apply (in order) — all propose-only, your call:** no *new* migrations
were authored by this pass. The DB items are the existing pre-ship set: (1) reconcile the
points trigger (points-value drift + duplicate trigger), (2) RLS `search_path`/EXECUTE
hardening, (3) flag-photo bucket INSERT guard, (4) rotate the webhook secret (runbook in
qa-reports). F8's reopen RPC migration (`2026-05-30_flag_reopen_requests.sql`) is already
applied per its header — verify it exists in prod before relying on reopen.

**Fresh EAS build checklist (iOS + Android):**
1. **Privacy (F1):** on web AND a real device, attach a **HEIC photo with GPS** to a report and to an avatar → upload must be **blocked** with the privacy error (never uploaded). Re-pick a normal JPG → uploads fine.
2. **Realtime (F2):** toggle realtime ON in Profile, change a flag from another device → map/tasks update live **without restarting**; toggle OFF → updates stop.
3. **Double-tap / rapid-tap:** anon report submit (F3), bulk Verify/Resolve (F4), Admin Remove/Dismiss (F18) — rapid double-tap must produce exactly one action.
4. **Denied permissions:** deny location (Map/Tasks/Profile), deny camera/photos (report/avatar) → graceful degradation, no crash.
5. **Offline / slow network:** cold-start offline (cached flags show), pull-to-refresh offline, slow geocode + backtrack below 3 chars (F13), switch flags fast on slow net (comments F15).
6. **Dead-feature checks:** "Show intro again" → intro shows next app open (F5); guest → Profile → Create account → can return to map (F6); guest hamburger "Sign in" → reaches sign-in (F11); Settings → "Push notification types" opens (F10); My Reports filter → close/reopen never strands an empty list (F9); onboarding replay starts at card 1 (F20); web right-click on map → report prompt (F7).
7. **Bulk-select:** tap a card's **photo** in selection mode → toggles selection (not lightbox) (F17).
8. **Backgrounding:** background/foreground during a report upload and during realtime; confirm no stuck spinners.

**Stop condition:** whole app mapped, hunted, fixed to a production bar, full suite green;
second-sweep result appended above before sign-off.
