# AccessMap Rebaseline — 2026-05-29

**Produced by:** Release engineer subagent (read-only, git refs only)
**Supersedes:** PROJECT_STATE.md dated 2026-05-27 (stale after two Rory merge waves)
**Method:** `git log / branch --merged / branch --no-merged / show <ref>:<path> / diff --stat / merge-base` only. No working-tree reads.

---

## 1. CURRENT MAIN HEAD

```
SHA:     0bdc5c1
Date:    2026-05-29 09:31:24 -0700
Subject: docs(qa): Rory merge wave 2 report — 16 branches merged, 1160/1160 tests
Tests:   1160/1160 (per commit subject; PROJECT_STATE.md on main says 1135/1135 / 72 suites — stale, was written at SHA 5698fef before wave 2)
TSC:     0 errors (per last known state; no contradicting evidence in branch history)
```

PROJECT_STATE.md on main is itself one cycle behind — it records SHA `5698fef` and 1135 tests. The commit message at current HEAD records 1160/1160 after wave 2 merges. The state file needs an update by Will.

---

## 2. BRANCH INVENTORY — MERGED vs NOT MERGED

### Branches confirmed MERGED into main (all content on main)

All `backup/pre-merge-*`, `a11y/*`, `feat/*`, `fix/a11y-contrast-*`, `fix/jest-open-handles-*`, `fix/wave4-perf-polish-*`, `fix/restore-a11ytext-*`, `fix/sql-cleanup-*`, `perf/*`, `test/*` branches from 05-25 through 05-28 waves, plus:

- `design/creative-polish-2026-05-27` — MERGED
- `a11y-perf/wave3-2026-05-27` — MERGED
- `shamus/marker-clustering-2026-05-25` — MERGED
- `feat/expo-web-vercel-2026-05-25` — MERGED
- `security/hardening-wave2-2026-05-27` — content absorbed via `cycle/auto-2026-05-28` → main; branch pointer remains but has 0 unique commits vs main

Most branches with large deletion counts in `diff --stat main <branch>` are simply stale (main is far ahead of them); they carry no un-landed work.

### Branches with REAL unique commits NOT on main

| Branch | Unique commits | Summary | Gate |
|---|---|---|---|
| `shamus/d8-exif-fix-2026-05-29` | 3 | D8 privacy fix: replace saveToLibraryAsync with ImageManipulator, add throw gates in both uploadFlagPhoto and uploadAvatar, add test coverage | **READY — based on current main** |
| `release/0.2.0-version-bump` | 4 | Version bump to 0.2.0 + Lighthouse CI + heatmap Wave 5 tests + PR URL doc | Awaiting launch gate clearance |
| `ci/lighthouse-2026-05-30` | 2 | Lighthouse CI for a11y/perf scoring + heatmap Wave 5 tests | Ready to merge |
| `qa/auto-2026-05-29` | 7 | Security fixes: lat/lng bounds validation, push-notif auth gate, email removed from updateUserProfile select, hardcoded project ref removed, lint fix | Has real security/privacy improvements — review for merge |
| `fix/security-hardening-2026-05-30` | 2 | Flag rate limit migration (20 flags/user/24h) + iOS App Store plist keys | Ready to merge |
| `docs/beta-testing-guide-2026-05-30` | 4 | Beta testing guide + rate limit migration content | Ready |
| `docs/incident-response-2026-05-30-steve` | 5 | Incident response plan + Jordan D5 heatmap disclaimer + rate limit migration | Ready |
| `feat/shared-status-badge-2026-05-30` | 7 | StatusBadge refactor + docs (likely partially absorbed by main's refactor merges — check for true delta) | Review needed |

### Branches with 0 unique commits ahead of main (stale — safe to ignore or delete)

All `backup/pre-merge-*` branches, all `worktree-wf_*` branches, random `claude/*` branches (agitated-archimedes, dreamy-clarke, etc.), `shamus/d5-heatmap-jordan-disclaimer-2026-05-29`, `fix/a11y-serious-2026-05-30`, `fix/edge-function-auth-2026-05-30`, `design/creative-polish-2026-05-27`, `a11y-perf/wave3-2026-05-27`, `shamus/marker-clustering-2026-05-25`, `feat/expo-web-vercel-2026-05-25`.

---

## 3. FATE OF THE 5 SPECIFIED 05-27-ERA BRANCHES

| Branch | Status | Notes |
|---|---|---|
| `security/hardening-wave2-2026-05-27` | **MERGED** (via cycle/auto-2026-05-28) | Content landed on main at commit `f9473af` inside cycle merge. Branch pointer still exists but has 0 unique commits ahead of main. PROJECT_STATE.md was wrong to call this "READY FOR MERGE — not yet merged." |
| `design/creative-polish-2026-05-27` | **MERGED** | Confirmed by `git branch --merged main`. |
| `a11y-perf/wave3-2026-05-27` | **MERGED** | Confirmed by `git branch --merged main`. |
| `shamus/marker-clustering-2026-05-25` | **MERGED** | Confirmed by `git branch --merged main`. The D3 SQL blocker was resolved and the branch merged. |
| `feat/expo-web-vercel-2026-05-25` | **MERGED** | Confirmed by `git branch --merged main`. |

**All 5 branches the stale PROJECT_STATE.md called "BUILT-NOT-MERGED" are now on main.**

---

## 4. LIVE PRIVACY LEAK CONFIRMATION — AVATAR GPS LEAK

### Finding: THE LEAK IS LIVE ON MAIN. PARTIALLY.

**On main (`src/lib/flags.ts` + `src/lib/users.ts`)**:

- `stripExifNative` is defined in `flags.ts`. It uses `MediaLibrary.saveToLibraryAsync(dataUrl)`. The D8 branch's own commit message documents the root cause explicitly: `saveToLibraryAsync` returns `Promise<void>` — it saves to the camera roll, it does not transcode and return bytes. The code casts it `as any` and expects a `.uri` property; that property does not exist on void, so `strippedAsset` is always undefined, the guard `if (!strippedAsset || !strippedAsset.uri)` always fires, and `console.warn` is issued while the **original unstripped buffer is returned silently**.

- **`uploadFlagPhoto` (flags.ts):** After the no-op strip, `verifyExifStripped` runs. If it detects EXIF markers, it **throws** (`Photo privacy check failed`). This means flag photo uploads are blocked (fail-closed) when EXIF is present — correct behavior, even though the strip itself is broken.

- **`uploadAvatar` (users.ts):** After the same no-op strip (imported from flags.ts), `verifyExifStripped` runs. If it detects EXIF markers, it **only `console.warn`s** and proceeds to upload. The avatar with GPS metadata is uploaded to Supabase storage and given a public URL.

**VERDICT: Avatar GPS leak IS live on main right now.**
- Avatars containing GPS EXIF metadata (e.g., selfies taken with location services on) upload successfully with EXIF intact.
- Flag photos are currently blocked on upload if EXIF is detected (a different behavior — users may see errors there until D8 lands).
- The leak affects `uploadAvatar` specifically because it `console.warn`s instead of throwing.

---

## 5. D8 BRANCH READINESS — `shamus/d8-exif-fix-2026-05-29`

```
HEAD:        0969833  2026-05-29 10:00:39 -0700
             Fix EXIF test gaps: D8 privacy gate regression + verification tests
merge-base:  0bdc5c1  (= current main HEAD)
BASED ON CURRENT MAIN: YES — clean fast-forward eligible
```

**D8 is a clean additive fix based on current main HEAD (0bdc5c1). No rebase needed.**

### What D8 fixes (3 commits):

1. **D8-A** (`563401c`): Replace `MediaLibrary.saveToLibraryAsync` with `expo-image-manipulator` (`ImageManipulator.manipulateAsync`) in `stripExifNative`. Re-encode with no transform actions — platform codec writes fresh bytes, EXIF/GPS/IPTC/XMP not carried through. Return `null` on failure (fail-closed signal).

2. **D8-B** (`5cd9af9`): `uploadAvatar` in `users.ts` — change `console.warn` to `throw` when `verifyExifStripped` fails. Add null-check for the new `stripExifNative` return type (null = abort rather than upload original).

3. **D8-C** (`0969833`): Test coverage — 73 additions to `flags.test.ts` + 85 additions to `users.test.ts` covering the new throw behavior and null-return path.

**Diffstat (net vs main):** 20 files changed, 2431 insertions(+), 54 deletions(-)
Core source changes are in `src/lib/flags.ts` (+69/-54 net) and `src/lib/users.ts` (+13 net). The rest are qa-reports added and a few docs/migration file changes (some deletions of docs that already landed on main).

**Assessment:** D8 is ready. It is purely additive on the code path, replaces a broken library call with a real one, and closes the avatar GPS leak by converting a warn-and-continue to a throw. Gary test coverage is included. Sky may merge directly.

---

## 6. TRUE REMAINING PRE-LAUNCH ITEMS ON CURRENT MAIN

### OPEN — Genuine blockers or required actions

| # | Item | Evidence | Action needed |
|---|---|---|---|
| **D8 — PRIVACY BLOCKER** | Avatar GPS leak: `uploadAvatar` on main only warns on EXIF verify failure, uploads anyway | `git show main:src/lib/users.ts` — confirmed console.warn path | Merge `shamus/d8-exif-fix-2026-05-29` (ready, based on current main) |
| **EXIF strip no-op (both paths)** | `stripExifNative` uses `saveToLibraryAsync` which is a void-return no-op; EXIF is never actually stripped on native. Flag photos blocked on upload (throw), avatars leak. | `git show main:src/lib/flags.ts` import + saveToLibraryAsync call | Resolved by D8 merge |
| **SQL migrations unapplied** | Per PROJECT_STATE.md on main: `2026-05-27_users_email_privacy.sql`, `2026-05-23_status_update_trigger_proposal.sql`, `2026-05-24_realtime_flags.sql`, `2026-05-25_flag_edit_rls_replacement.sql`, `2026-05-25_push_tokens.sql` are propose-only/pending | PROJECT_STATE.md section "Migrations" | Sky must apply in Supabase SQL Editor; files have rollback steps |
| **Flag rate limit migration** | `fix/security-hardening-2026-05-30` contains `security: flag creation rate limit migration (20 flags/user/24h)` as a file — not applied | Branch commit `9ffc13d` | Merge branch, then Sky applies migration |
| **iOS App Store plist keys** | `NSCameraUsageDescription` + `NSPhotoLibraryUsageDescription` added in `fix/security-hardening-2026-05-30` | Commit `9eb8d88` | Merge branch; required for App Store submission |
| **Lighthouse CI** | `ci/lighthouse-2026-05-30` not yet on main — a11y/performance scoring on PRs missing | Branch has 2 unique commits | Merge; low risk |
| **Version bump to 0.2.0** | `release/0.2.0-version-bump` not merged | 4 unique commits including version bump | Merge after launch gates clear |
| **`qa/auto-2026-05-29` security fixes** | lat/lng validation, push-notif auth, email removed from updateUserProfile select, hardcoded project ref removed | 7 unique commits | Review and merge; contains real security improvements |

### DONE — Items stale PROJECT_STATE.md listed as open but are now on main

| Item | Evidence |
|---|---|
| `security/hardening-wave2-2026-05-27` (input caps, email validation) | Merged via `cycle/auto-2026-05-28` — on main at `f9473af` |
| `design/creative-polish-2026-05-27` (token sweeps, SignIn rebuild) | Merged — confirmed `git branch --merged main` |
| `a11y-perf/wave3-2026-05-27` (web marker a11y, React.memo) | Merged — confirmed `git branch --merged main` |
| `shamus/marker-clustering-2026-05-25` (marker clustering, flag editing) | Merged — D3 SQL gate resolved |
| `feat/expo-web-vercel-2026-05-25` (Expo web + Vercel config) | Merged |
| MIME magic-byte validation | On main at `38fb21a` / `66ff6ed` |
| Edge Function auth gates | On main (`e84f24d`, `eb2e370`) |
| Dark mode, pagination, push notification client | All on main |
| Service worker, Web Share API, StatusBadge refactor (partial) | On main from Rory wave 2 merges |

---

## SUMMARY TABLE

| Question | Answer |
|---|---|
| Main HEAD | `0bdc5c1` 2026-05-29 09:31 — "Rory merge wave 2 — 16 branches merged, 1160/1160 tests" |
| Avatar GPS leak live on main? | **YES** — `uploadAvatar` warns-and-continues; D8 fix not yet merged |
| Flag photo GPS leak live on main? | BLOCKED on upload (throws on EXIF verify fail) but strip itself is a no-op |
| D8 branch clean + based on main? | **YES** — merge-base equals current main HEAD; 3 additive commits; ready to merge |
| All 5 specified 05-27-era branches merged? | 4 of 5 YES; `security/hardening-wave2-2026-05-27` content merged via cycle (branch pointer stale), design/a11y-perf/marker-clustering/expo-web all merged |
| True remaining pre-launch items | D8 merge, SQL migrations (Sky applies), rate limit migration, iOS plist keys, Lighthouse CI, version bump, qa/auto-2026-05-29 security fixes |
