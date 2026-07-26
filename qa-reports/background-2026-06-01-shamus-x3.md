# Shamus Background Scan — 2026-06-01

**Mode:** BACKGROUND — AUDIT-ONLY  
**Triggered by:** scheduled task `shamus-x3`  
**Time:** 2026-06-01 morning scan

---

## 1. Main Branch State (from PROJECT_STATE.md)

Phase 4 complete. Phase 5 in-progress. Phase 6 (App Store submission) in-progress.

| Check | Status |
|-------|--------|
| TypeScript (`tsc --noEmit`) | ✅ EXIT:0 — clean (Gary overnight scan) |
| Jest (94 suites) | ✅ 1553 passed, 0 failures |
| Recent regressions on main | ✅ None |

---

## 2. Unmerged Branches

Total unmerged branches: **30**

### High Priority (pending merge gate)

| Branch | Feature | Status | Blocker |
|--------|---------|--------|---------|
| `feat/phase5-anon-reporting` | Anon reporting + admin moderation | ✅ QA passed (Gary gate 2026-06-01) | **3 SQL migrations awaiting Sky apply** (see §4) |
| `feat/phase5-trust-score` | Community trust score + leaderboard | ✅ QA passed (Gary gate 2026-06-01) | **1 SQL migration awaiting Sky apply** (`2026-05-30_trust_score_system.sql`) |
| `eas-build-fix` | TestFlight build fixes | 1 commit, ready to evaluate | No gate noted |
| `qa/phase5-trust-anon-gate` | Gary's QA gate report branch | Gate report filed | Awaiting Morgan routing |

### Riley Wave B (feature bundle)

| Branch | Feature | Status | Blocker |
|--------|---------|--------|---------|
| `feat/riley-wave-b-2026-05-30` | F1 NearbyFlagsModal a11y, F3 photo skip, F7 map zoom buttons | Built | Awaiting merge |
| `feat/riley-f8-offline-queue-2026-05-30` | Offline queue | Built | Awaiting merge |
| `feat/riley-f9-severity-guidance-2026-05-30` | Severity guidance | Built | Awaiting merge |
| `a11y/riley-f6-bearing-2026-05-30` | Bearing a11y | Built | Awaiting merge |

### Wave 6 / Design / Perf

| Branch | Feature | Status | Blocker |
|--------|---------|--------|---------|
| `design/wave6-components` | RankBadge, CommentBubble, RealtimePulse shared components + feature flags | Built | Awaiting merge |
| `perf/auto-2026-05-31` | Auto perf scan | Report | Awaiting review |
| `perf/overnight-wave6` | Wave 6 perf spec | Built | Awaiting merge |
| `qa/wave6-test-infra` | Wave 6 test infrastructure | Built | Awaiting merge |
| `content/ux-copy-wave6` | Wave 6 UX copy | Built | Awaiting merge |
| `design/innovation-wave6` | Innovation design wave | Built | Awaiting merge |
| `docs/wave6-a11y-spec` | Wave 6 a11y spec | Docs | Awaiting review |

### Stale / Background Scan Branches (low priority)

| Branch | Notes |
|--------|-------|
| `a11y/overnight-wave6-audit` | Background audit — review pending |
| `a11y/phase3-alex-premerge` | Pre-merge a11y check (older) |
| `docs/phase5-strategy` | Docs only |
| `research/auto-2026-05-29` | Auto research report |
| `privacy/auto-2026-05-30` | Auto privacy scan |

### Likely-superseded / Pending Close

| Branch | Notes |
|--------|-------|
| `feat/sprint3-android-push` | Android push — blocked (google-services.json missing in EAS) |
| `feat/sprint3-design-polish` | Phase 5 design polish — Dani work, likely superseded by merged polish |
| `test/sprint3-coverage` | Coverage branch — may be superseded by Phase 5 QA sweep |
| `fix/expo-doctor` | Expo doctor fix — status unknown |
| `design/riley-wave-b-spec-2026-05-29` | Design spec for Wave B — may be superseded |
| `a11y/riley-wave-a-2026-05-29` | Riley Wave A a11y — older; may be merged into Wave B |
| `dependabot/npm_and_yarn/expo-ecosystem-d866db6920` | Dependabot bump — needs review/merge or close |
| `claude/determined-wescoff-d699d0` | Claude worktree branch — likely orphaned |
| `a11y/phase5-deep-2026-05-31` | Phase 5 deep a11y — MERGED per recent commits on main |

---

## 3. qa-reports/ — 5 Newest Files (last 24h)

| File | Date | Status |
|------|------|--------|
| `background-2026-06-01-gary-shift.md` | 2026-06-01 | ✅ Main branch GREEN — 94/94 tests pass, TS clean |
| `2026-06-01_Gary_TrustScore_AnonReporting_Gate.md` | 2026-06-01 | ⚠️ Gate report — both branches PENDING at gate time; fixes applied before merge |
| `2026-05-31_Alex_Phase5_DeepAudit.md` | 2026-05-31 | ✅ Merged clean (both branches now on main) |
| `2026-06-01_Alex_TrustScoreA11y.md` | 2026-06-01 | ✅ A11y findings on trust-score branch — no regressions on main |
| `2026-06-01_Phase5_QA_Sweep.md` | 2026-06-01 | 🔴 **2 CRITICAL blockers** (Steve) — SQL migrations not applied (see §4) |

### 🔴 Active Blockers from past 24h

From `2026-06-01_Phase5_QA_Sweep.md` (Steve's security section):

1. **CRITICAL-1:** `feat/phase5-anon-reporting` anon INSERT RLS policy is PROPOSE-ONLY — anonymous flag reporting completely non-functional in production until migration applied.
2. **CRITICAL-2:** `feat/phase5-anon-reporting` anon SELECT policy is PROPOSE-ONLY — guest map browse shows blank map until migration applied.

---

## 4. SQL Migrations Awaiting Sky Apply

These files exist in `supabase/migrations/` but have NOT been applied to the live database per Steve's audit:

| Migration | Prerequisite For | Apply Order |
|-----------|-----------------|-------------|
| `2026-05-29_account_deletion_cascade.sql` | Makes `flags.user_id` nullable — prerequisite for anon INSERT | **1st** |
| `2026-05-29_anon_flags_select.sql` | Guest map browse (anon SELECT) | **2nd** |
| `2026-05-30_anon_flag_reporting_photo_fix.sql` | Anon flag submission (anon INSERT) | **3rd** |
| `2026-05-30_trust_score_system.sql` | Trust score / leaderboard feature | Independent |

**Impact:** Phase 5 features (guest browse + anon reporting) are non-functional in production until the first three are applied. Trust score feature is non-functional until the fourth is applied.

**Sky action required:** Apply these four migrations in the Supabase SQL editor in the order listed.

---

## 5. Summary

| Area | Status |
|------|--------|
| Main branch health | ✅ GREEN (TypeScript clean, 94/94 tests) |
| Critical unblocked features | ✅ Trust score + anon reporting QA-passed |
| Production blockers | 🔴 4 migrations awaiting Sky apply |
| Android push | ❌ Blocked (google-services.json not in EAS) |
| App Store screenshots | ❌ Needed (6 required, plan in docs/APP_STORE_SCREENSHOTS.md) |
| Test account for App Store reviewer | ❌ Needed (Sky to create) |

**No code changes made.** Audit-only.
