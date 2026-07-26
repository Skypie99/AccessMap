---
role: Morgan (PM)
date: 2026-06-07
title: AccessMap — Consolidated PRE-BUILD / PRE-TESTER Checklist
mode: READ-ONLY (gather + report; no code, DB, merge, or build changes)
trigger: direct request — "one consolidated checklist so the next EAS build is clean and not wasted"
sources: deep audit 2026-06-07 (report + AUDIT_MAP) · EAS_BUILD_CHECKLIST.md · PROJECT_STATE.md · DECISIONS_LOG.md · Rory Security#1 pre-build runbook 2026-06-04 · Morgan security record 2026-06-03 · on-device a11y checklist 2026-06-04 · live git state · eas.json / app.json / .env.example
---

# AccessMap — PRE-BUILD / PRE-TESTER CHECKLIST (single source)

**Goal:** one clean EAS build that boots, has no known dead-ends, and is safe to hand to real
testers — so the next build (after the monthly allotment resets) isn't wasted.

**Bottom line up front:** the build is **GREEN on infrastructure/security** (env vars, eas.json,
app.json, and the backend security gate are all done + verified). The **one real pre-build
decision** is whether to **merge the deep-audit branch** (`audit/accessmap-deep-2026-06-07`) into
main first — it carries 27 verified fixes, including ~10 broken-flow / dead-end bugs that real
testers *would* hit. Everything else is either already done or can wait until after testers.

**Live state at time of writing (verified by git this session):**
- `main` = `origin/main` = **`cbf9a3b`** (synced, pushed; "pre-ship UI finish" merge).
- Deep-audit branch **`audit/accessmap-deep-2026-06-07`** @ `7378be0` — **14 commits, 27 fixes
  (1 critical · 10 high · 9 medium · 7 low), NOT merged into main.** Green: typecheck 0 errors ·
  97 suites / 1,575 tests pass · lint 0 errors (60 pre-existing warnings).

> ⚠️ Anything marked **[RE-CONFIRM]** is from a record I trust but did **not** re-run live this
> session (or is a known doc/live drift). None of them block the build; they're cheap to re-check.

---

## A) DO **BEFORE** BUILDING — blockers & must-dos

### A1. 🟡 DECISION (Sky-only) — merge the deep-audit branch first? **← the main pre-build call**
The deep audit (2026-06-07) is on `audit/accessmap-deep-2026-06-07` and is **not merged**. It fixes
27 verified bugs in one focused-commit-each branch. Many are exactly what testers trip over:
- **F1 (critical, privacy):** EXIF strip now **fail-closed** on web for HEIC/WEBP photos + avatars
  (a HEIC-with-GPS photo could previously upload to public Storage). *Native iOS path already
  aborted; this hardens the shared codebase + web/avatar paths.*
- **F6:** guest → "Create account" no longer **traps the user in the modal on iOS**.
- **F11:** hamburger **"Sign in"** is no longer a dead-end for guests.
- **F10:** the **push-notification-types** screen is now reachable from Settings.
- **F9:** My-Reports no longer **strands an empty list** behind a stale filter.
- **F2:** the Profile **realtime toggle** actually works without an app restart.
- **F3 / F4 / F18:** **double-tap guards** on anon report submit, bulk verify/resolve, admin remove/dismiss.
- **F5 / F20:** "Show intro again" and onboarding replay actually work.
- Plus F7, F12–F17, F19, F21–F27 (races, leaks, rollbacks, partial-fail handling).

**Why it matters for the build:** if you build from `main` as-is (`cbf9a3b`), the tester build
**ships without these fixes** — testers will hit the iOS sign-up trap, dead hamburger sign-in,
unreachable notif screen, etc., and the on-device F-checks in section C below become moot.

**Action (Sky-only merge — Constitution: only Sky merges main):**
```bash
cd ~/AccessMap
git checkout main
git merge --no-ff audit/accessmap-deep-2026-06-07
git push                      # main builds from origin
```
Then re-run the green checks in **A3** on the merged main. **[RE-CONFIRM]** the branch is green
*as of the branch tip*; re-verify after the merge in case of any merge interaction.

> If Sky chooses **NOT** to merge: that's allowed — but note the build then lacks all 27 fixes,
> and section C's F-item device checks don't apply. Recommend merging.

### A2. ✅ EAS production env vars — the "dead on launch" trap
Last verified **GREEN 2026-06-04** (Rory, read-only `eas env:list --environment production`).
Present in the **production** environment (which both `testflight` and `production` profiles map to):
| Var | Status |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ `https://kldlwszpfkdmsjrjhjym.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ present (masked) |
| `EXPO_PUBLIC_SENTRY_DSN` | ✅ present |
| `GOOGLE_SERVICES_JSON` | ✅ present (Android build only) |

These are **NOT** in `eas.json` and `.env` is gitignored, so the build gets them ONLY from EAS env
vars + the `environment: production` field. Missing them = app launches blank/crashes.
**[RE-CONFIRM] — cheap, do it right before building** (env can change between sessions):
```bash
cd ~/AccessMap
npx eas-cli env:list --environment production
```

### A3. ✅/🟡 Green code checks (run on whatever you're building from)
- `npm run typecheck` → **0 errors** (✅ green on deep-audit branch this session).
- `npm test` → **97 suites / 1,575 pass, 0 fail** (✅ green on deep-audit branch).
- `npm run lint` → **0 errors** (60 advisory warnings). *(Note: CLAUDE.md still says "lint is
  broken on main" — that's **stale**; lint was fixed by the ESLint-v9 pin on 2026-06-01. Minor doc
  fix to do whenever.)* **[RE-CONFIRM]** after the A1 merge.
- `npx expo export --platform ios` → bundles cleanly (this is the same step the cloud build runs;
  last clean export 6.12 MB). **[RE-CONFIRM]** after the A1 merge.
- **Commit everything** — EAS builds from the committed state.

### A4. ✅ Config sanity — `eas.json` (verified correct this session)
- `cli.appVersionSource: "remote"` ✅ (EAS auto-picks the next free build number from App Store
  Connect — prevents the old "build number 15 already used" failure).
- `testflight` profile: `"distribution": "store"` **and** `"environment": "production"` ✅
  (the `environment` is what injects the Supabase vars).
- No `//` comment keys, no duplicate profile keys ✅ (both previously broke every eas command).
- `submit.production.ios`: `appleId` (skylerhalisky@gmail.com) · `ascAppId` **6774709116** ·
  `appleTeamId` **S78F8ZA8QU** ✅.
- Quick validity check: `node -e "JSON.parse(require('fs').readFileSync('eas.json'))" && echo OK`

### A5. ✅ Config sanity — `app.json` (verified correct this session)
- `ios.bundleIdentifier` = **`com.accessmap.app`** ✅ · `appleTeamId` `S78F8ZA8QU` ✅
- `expo.extra.eas.projectId` = `a7149107-fb9b-4853-a053-648320c05cb6` ✅
- `version` = **3.0.0** ✅ (`buildNumber: "15"` in the file is **ignored** — remote version source
  manages it; you don't touch it).
- iOS permission usage strings present ✅:
  - `NSLocationWhenInUseUsageDescription`, `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`
  - `ITSAppUsesNonExemptEncryption: false` ✅ (avoids the export-compliance prompt)
  - *(No background-location strings — correctly removed per Jordan's 2026-05-29 gate to avoid an
    App Store 5.1.1 rejection. Do not re-add them.)*
- expo-location / expo-image-picker / expo-notifications plugin permission strings present ✅.
- Android `permissions` (coarse/fine location) + `package` `com.accessmap.app` present ✅.

### A6. ✅ Apple-side (already set up — confirm only)
- App Store Connect **API key** is on EAS servers (Key ID `BF8J5TMTQ7`) → no app-specific password.
- App record exists (ASC App ID `6774709116`, "AccessMap – Route Planner").
- Business → Agreements **Active**.

### A7. ✅ Backend / DB blockers — **NONE.** (See section D for the full why.)
The four security items people sometimes still list as "to do" (duplicate points trigger,
flag-photo bucket INSERT guard, RLS `search_path`/EXECUTE hardening, webhook secret rotation) were
**all applied to the live DB on 2026-06-03 by Sky via Cowork and read-only verified.** The
2026-06-07 deep audit re-listed them only because it reads the **`schema.sql` file**, which has
**drifted** from the live DB (file not regenerated after the live applies). **The live DB is
correct — no DB step blocks this build.**

---

## B) THE SINGLE EAS BUILD STEP

Run from **`~/AccessMap`** (never from `~`/home, or you get "EAS project not configured"). Logged in
already (`npx eas-cli login` if not). One at a time:

```bash
cd ~/AccessMap
npx eas-cli build  --platform ios --profile testflight  --non-interactive    # ~15–20 min
npx eas-cli submit --platform ios --profile production --latest --non-interactive
```

- **Agents cannot run these** (Apple creds + cost + external submit are Sky-only — Constitution
  Art. 9). This is the Sky-side step the whole checklist exists to protect.
- Reading a failure: **"Build number N already used"** → the build is fine, just rebuild (remote
  version source auto-picks the next number). **Submit "Something went wrong"** → the real reason is
  on the Expo **submission page** → expand "Upload to App Store Connect". TestFlight builds expire
  after 90 days.

---

## C) VERIFY **ON DEVICE** after the build (real iPhone — and Android if testing it)

Ordered; do the privacy + broken-flow checks first (they're what a wasted build looks like), then
the a11y floor. **F#** items below only apply **if A1 (the deep-audit merge) happened** — they verify
those specific fixes on a real device, which Jest can't exercise.

### C1. Boots with a live backend (the #1 "wasted build" check)
1. Cold-launch the TestFlight build → app reaches the map (not a blank/white screen). Sign in, see flags load. *(If blank → env vars weren't in the build; back to A2.)*

### C2. Privacy — EXIF/GPS photo (F1, critical)
2. Attach a **HEIC photo that has GPS** to a report **and** to a profile avatar → upload must be
   **BLOCKED** with the privacy error (never uploads). Re-pick a normal JPG → uploads fine. Repeat
   the same on the **web** build.

### C3. Broken-flow / dead-end walk (the fixes testers would hit)
3. **Guest → Profile → "Create account"** → after success you can **get back to the map** (not stuck in the modal). *(F6)*
4. **Guest → hamburger → "Sign in"** → reaches the sign-in screen. *(F11)*
5. **Settings → "Push notification types"** → the prefs screen opens. *(F10)*
6. **My Reports** → set a filter → close & reopen → never stranded on a permanent empty list. *(F9)*
7. **Profile → "Show intro again"** → the intro shows on next app open; replay starts at **card 1**. *(F5, F20)*
8. **Web map → right-click** → drop-flag / report prompt appears. *(F7, web only)*

### C4. Double-tap / rapid-tap guards (each must produce exactly ONE action)
9. Anon report **Submit** (F3) · **bulk Verify/Resolve** in Tasks (F4) · Admin **Remove/Dismiss** (F18) — hammer each; no duplicates.
10. Tasks bulk-select: tap a card's **photo thumbnail** in selection mode → it **toggles selection** (not the lightbox). *(F17)*

### C5. Realtime (F2)
11. Profile → toggle **Real-time updates ON** → change a flag from another device → map/Tasks update **live without restarting**. Toggle **OFF** → updates stop.
12. **Reopen a resolved flag** (F8): submit a reopen request → it's accepted with an honest "sent for review" message (no fake tally). *(See D — reopen persistence depends on the RPC being live.)*

### C6. Denied permissions & offline (graceful, no crash)
13. **Deny location** on Map/Tasks/Profile → graceful degradation, no crash.
14. **Deny camera / photos** on a report and on avatar → graceful, no crash.
15. **Cold-start offline** → cached flags show; pull-to-refresh offline → handled; slow geocode + backtrack below 3 chars (F13); switch flags fast on slow network → comments stay correct (F15).
16. **Background/foreground** during a photo upload and during realtime → no stuck spinners.

### C7. Accessibility floor (from the on-device a11y checklist — priority items)
> Setup: iPhone VoiceOver on; Larger Accessibility Sizes → max; Reduce Motion on. (Android: TalkBack / max font + display size / Remove animations.)
17. **Largest font (Dynamic Type)** on Tasks, Profile, Settings, Map filter panel, Report form → **no text cut off** (a word ending "…" mid-sentence is a FAIL). *(highest value)*
18. **Profile "Real-time updates" switch** + **Settings "Push notifications" switch** → each reads label + "switch" + on/off state; double-tap flips it. *(B1, B2)*
19. **Admin Remove / Dismiss** (admin account only) read as **separate** buttons; severity announces as a **number** ("Severity 3"), not a color. *(B3)*
20. **Profile "Recent point activity"** rows each read as one item; divider lines are silent. *(A2)*
21. **Reduce Motion**: open/close a sheet, pull-to-refresh, watch progress bars/placeholders → animations are instant/disabled. *(C2)*
22. **Contrast**: toggle Light then Dark → all text readable in both; focus ring visible on cards/pills in both modes. *(C3)*

**Don't widen to outside testers until:** C1, C2, C3 (the broken-flow walk), C4, and a11y items
17–19 all pass. (Keyboard focus-ring check is optional — needs a Bluetooth keyboard; covered by
code + tests, and touch users never see the ring.)

---

## D) CAN WAIT — after testers / later wave (do **not** over-scope this build)

### D1. Backend security items — ✅ ALREADY DONE LIVE (not a build or tester blocker)
Applied to the live Supabase DB on **2026-06-03** (Sky via Cowork) and read-only verified by
Morgan/Gary against `pg_catalog`. Listed so nobody re-does them:
| Item | Live status |
|---|---|
| Duplicate points trigger | ✅ dropped `trigger_flag_status_change`; only `on_flag_status_change` remains |
| flag-photo bucket INSERT guard (F3) | ✅ `WITH CHECK` path-scoped to caller's own folder (was `true`) |
| RLS `search_path` + EXECUTE hardening (F2) | ✅ `search_path=public` pinned + EXECUTE revoked from public/anon/authenticated on all 4 trigger fns |
| Webhook secret rotation | ✅ moved to Supabase **Vault**; verified **200 ok ×3** |
| `is_admin` bug fix | ✅ `2026-05-30_admin_role.sql` applied (this fixed a *live* reject/reopen error) |
| Reviewer test account | ✅ `reviewer@accessmap.com` exists, `is_admin=false` |

**[RE-CONFIRM] (optional, read-only):** if you want fresh proof against `pg_catalog` right before
building, the read-only SELECTs are in `qa-reports/2026-06-04_Rory_Security1_PreBuild_Runbook.md`
(they mutate nothing). Not required — the 2026-06-03 record already verified all of them.

### D2. 🟡 Points-value drift — DECISION FOR SKY (docs only, non-blocking)
Live trigger awards reporter **+10 verified / +15 resolved**, actor **+3 / +7**. `schema.sql`,
`CLAUDE.md`, and the TasksScreen flash copy say **5/2/10/5**. **No app behavior depends on the exact
values** except the cosmetic flash text. **Decide whenever:** accept live `10/3/15/7` as canonical
(update docs + flash copy) or revert the trigger. **Not a build blocker, not a tester blocker.**
**[RE-CONFIRM]** the live values are from the records, not re-queried this session.

### D3. 🟡 Reviewer-account password rotation — pre-**App-Store**, NOT pre-TestFlight
The reviewer account exists; only the **password** needs refreshing (old value is in public git
history; new one was printed in chat). **Sky-only** (it's a credential — no agent touches it):
generate a fresh one in **Supabase → Auth → Users → `reviewer@accessmap.com`**, enter it **only** in
**App Store Connect → App Review → Demo Account**. Needed before **public App Store** review, **not**
before a TestFlight build or internal testers.

### D4. F8 reopen — verify RPC in prod, then later-wave polish
The reopen flow is **wired** (F8) and **degrades gracefully** if the RPC is missing. The migration
`2026-05-30_flag_reopen_requests.sql` header says applied 2026-05-30. **[RE-CONFIRM] (read-only):**
confirm `increment_reopen_request` exists in prod if you want reopen counts to actually **persist**
(if absent, reopen still shows an honest "sent for review" — no crash, no fake tally). **Later wave
(not now):** per-cycle dedup via `reopen_requests_reset_at` (current guard is conservative
per-device), and tier-aware threshold (`getTier(userPoints)` — threading `users.points` into
FlagDetailModal is a larger Wave-C change; today everyone resolves to Bronze / 3 votes).

### D5. Housekeeping (whenever — none block anything)
- **`supabase/schema.sql` ↔ live DB drift:** schema.sql wasn't regenerated after the 2026-06-03
  live applies. For backend reasoning, trust `get_advisors`/`pg_*`, not `schema.sql`. Reconcile the
  file whenever (repo hygiene).
- **Dead module:** `src/lib/onboarding.ts` (per-user `hasSeenOnboarding` system) is fully orphaned
  after F5 — safe to delete in a small dedicated follow-up (it has its own tests).
- **Android Play submit:** `eas.json → submit.production.android.serviceAccountKeyPath` is still the
  `TODO_PATH_...` placeholder. Only matters when you submit the **Android** build to Play — **does
  not affect iOS/TestFlight**.
- **Pre-existing Supabase advisor WARNs** (post-tester, Dana): `auth_rls_initplan` (wrap
  `auth.<fn>()` as `(select auth.<fn>())`), `multiple_permissive_policies` consolidation, enable
  leaked-password protection. Performance/polish, not blockers.
- **Doc staleness to tidy:** `CLAUDE.md` "lint is broken" note (stale — lint is green); `PROJECT_STATE.md`
  references main `f499fc8` (current main is `cbf9a3b`).

---

## One-line summary for Sky
Infra + security are **GREEN**. The only thing standing between you and a clean tester build is a
**decision: merge `audit/accessmap-deep-2026-06-07` into main** (27 fixes incl. the iOS sign-up
trap, dead hamburger sign-in, unreachable notif screen, and the critical EXIF/GPS privacy fix) →
re-run the green checks → re-confirm `eas env:list --environment production` → run the two EAS
commands → walk section C on the device. Points-drift, reviewer-password, and F8 polish can all wait.
