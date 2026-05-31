# AccessMap — Project State

> **2026-05-30 — Phase 4 MERGED to main ✅** (merge commit `f637653`)
> Multi-photo gallery, flag comments, and accessibility polish, merged via `--no-ff`.
> Verified: full Jest suite green (1329 tests / 87 suites). Supabase migrations
> `supabase/migrations/2026-05-30_flag_comments.sql` and `..._flag_reopen_requests.sql`
> ship with this merge as **PROPOSE-ONLY — AWAITING SKY APPLY**.
> Remote branch `feat/phase4-multi-photo` deleted post-merge.

---


**Updated:** 2026-05-29 (Phase 2 Track A quality gates wired; Phase 1 complete)
**Source:** qa-reports/2026-05-29_Rory_LighthouseCI_VersionBump.md | qa-reports/2026-05-29_Shamus_Wave2QuickWins.md | PROJECT_STATE housekeeping
**Current Branch SHA:** `374f1bb` · Tests: 1160/1160 · TSC errors: 0 · Test suites: 72

---

## Current Status

**Phase:** Phase 1 COMPLETE → Phase 2 STARTED (2026-05-29)

**Phase 2 Active Branches:**

| Branch | Purpose |
|---|---|
| `phase2/track-a-quality-gates` | CI quality gates (lint, coverage, Lighthouse, search path hardening) |
| `phase2/track-b-infrastructure` | Infrastructure hardening track |
| `feat/wave2-quick-wins` | Wave 2 UX + performance quick wins |
| `fix/expo-notifications-and-plist` | Expo notifications wiring + plist fixes |

**Phase 1 Summary:** All Phase 1 work landed. Test suite grew from 922→1160. Rory wired CI gates in one commit (58e7f75). Dana search path hardening SQL migration written (`supabase/migrations/2026-05-29_function_search_path_hardening.sql`). QA reports from Steve, Shamus, Dana, Rory filed 2026-05-29.

**SQL migrations remain AWAITING SKY APPLY** — not touched by agents.

**Coherence:** 0.94 (security + CI on main; privacy commits live; SQL migrations remain only open gate)

---

## Features — LIVE (on main, shipped)

| Feature | Notes |
|---|---|
| Photo thumbnails in triage | FlagCard inline photo → PhotoLightboxModal; onError graceful degradation |
| Offline tile cache | `src/lib/tileCache.ts` TTL 7d, LRU 50 MB, user-keyed; sign-out clear wired |
| My Flags toggle | "All / Mine" chip in TasksScreen; AsyncStorage-persisted |
| Status history UI | FlagDetailModal "History" tab; graceful degradation if migration not yet applied |
| flagsMap O(1) lookups | `useMemo` Map in FlagsContext; replaces O(n) `find()` in TasksScreen |
| renderItem memoization | `useCallback` in TasksScreen; React.memo on FlagCard now effective |
| 3 a11y residuals (Wave 5) | MapScreen announceForAccessibility; useReducedMotion both PlatformMap variants; web photo alt text |
| ESLint + Prettier | `eslint.config.js`, `.prettierrc.json`, lint/format npm scripts |
| Jest open-handles fix | `jest.mock('../supabase')` in filterSets + mapFilters test files |
| GitHub Actions CI | typecheck + test on push/PR |
| Offline flags cache | AsyncStorage 24h TTL, user-scoped, stale-while-revalidate, offline banner |
| Push notification client | Token storage, settings toggle, sign-out clear, Edge Function written — awaiting Sky DB steps |
| Dark mode | useColor() + ThemeContext, all 8 token categories |
| Flag pagination | Cursor-based Load More |
| Activity Feed, Watched Flags, Saved Places, Visit Streak, Achievements | Stable |
| Address search, Open in Maps, Feedback flow, Help/FAQ, About, What's New | Stable |
| Text search (NFC), Notification prefs, Tasks sort, Map long-press, Nearest flag jump | Stable |
| Realtime flags (client wired) | Subscription wired; awaiting DB migration to go live |

---

## Features — BUILT-NOT-MERGED (pending Sky action)

| Branch | What | Gate |
|---|---|---|
| `design/creative-polish-2026-05-27` | Creative UI polish — SignInScreen rebuild, token sweeps (modals, map pins, ProfileScreen hero, TasksScreen, AchievementsModal), category quickfilter, leaderboard a11y | Sky review + merge BEFORE wave3 (wave3 forked from this) |
| `a11y-perf/wave3-2026-05-27` | A11y+Perf Wave 3 — web marker alt/title, ReportFlagModal containment+44pt, React.memo on PlatformMap variants, initialRegion memoization | **Merge AFTER** `design/creative-polish-2026-05-27` · tsc 0 errors · 922 tests pass |
| `security/hardening-wave2-2026-05-27` | Steve security wave 2 — input caps, email validation, PII migration (users.email RLS) | **READY FOR MERGE** — no migration dependency; apply 2026-05-27_users_email_privacy.sql after merge |
| `origin/shamus/marker-clustering-2026-05-25` | Marker clustering + flag editing UI; Gary's 20 `updateFlagContent` tests; Alex 5 a11y fixes | **BLOCKED** on D3 SQL apply; unblocks after Steve-approved `2026-05-23_status_update_trigger_proposal.sql` is applied |
| `origin/feat/expo-web-vercel-2026-05-25` | Expo Web build + Vercel deployment config | Sky review — no migration dependency; low risk |

---

## Migrations — Status Summary

| File | Status | Notes |
|---|---|---|
| `2026-05-27_users_email_privacy.sql` | **PROPOSE-ONLY — AWAITING SKY APPLY** | Fixes `public.users.email` PII exposure (Const. 2.4). Apply after wave2 branch merge. Idempotent, rollback 2-line, smoke-test steps included. |
| `2026-05-23_status_update_trigger_proposal.sql` | **APPROVED — AWAITING SKY APPLY** | Steve sign-off 2026-05-27. BEFORE UPDATE trigger `enforce_flag_status_only_for_non_owner()`. No SQL injection risk, proper role isolation, correct trigger ordering. **CRITICAL PATH** — apply before merging marker-clustering. |
| `2026-05-23_data_layer_hardening.sql` | PENDING (file only) | Sky applies via Supabase SQL Editor |
| `2026-05-23_feedback_table.sql` | APPLIED | `public.feedback` table live |
| `2026-05-23_rls_initplan_and_non_owner_status_update.sql` | PENDING (file only) | Sky applies via SQL Editor |
| `2026-05-24_flag_context_tags.sql` | APPLIED | `context_tags` column live |
| `2026-05-24_realtime_flags.sql` | PENDING (file only) | Unlocks Supabase Realtime |
| `2026-05-24_status_history_table.sql` | APPLIED | `flag_status_history` table + trigger live |
| `2026-05-25_flag_edit_history_table.sql` | PROPOSE-ONLY — CONDITIONAL | Apply only if Sky answers YES to D6 |
| `2026-05-25_flag_edit_rls_replacement.sql` | PROPOSE-ONLY — BLOCKING | Must apply before `shamus/marker-clustering-2026-05-25` merges |
| `2026-05-25_push_tokens.sql` | PROPOSE-ONLY | Pair with Edge Function deploy + `expo-notifications` install |

---

## Open Decisions for Sky (critical path)

| # | Decision | Status | Impact |
|---|---|---|---|
| **Wave 2** | Merge `security/hardening-wave2-2026-05-27` | READY — no dependencies | Enables email privacy migration same-cycle |
| **Email Privacy** | Apply `2026-05-27_users_email_privacy.sql` in Supabase SQL Editor | PROPOSE-ONLY — closes Const. 2.4 PII leak | Addresses privacy incident; apply same-cycle as wave2 merge |
| **D3** | Apply `2026-05-23_status_update_trigger_proposal.sql` in Supabase SQL Editor | **APPROVED by Steve** — CRITICAL PATH | Unblocks `shamus/marker-clustering-2026-05-25` merge |
| **D1** | Apply `2026-05-25_flag_edit_rls_replacement.sql` in Supabase SQL Editor | PROPOSE-ONLY — BLOCKING | Before marker-clustering merges |
| **D5** | Heat-map severity-colour rendering: gradient yes or no | PENDING (Jordan pre-approved) | Unblocks Shamus heatmap build |
| **D2** | Apply `2026-05-25_push_tokens.sql` + deploy Edge Function + install `expo-notifications` | FULLY BUILT — awaiting sequential apply | Zero user value until applied |
| **D4** | Apply remaining batch: `data_layer_hardening`, `rls_initplan`, `realtime_flags` | PROPOSE-ONLY — ~15 min | Unlocks realtime flags |
| **D6** | Flag edit history audit table: conditional apply yes or no | PROPOSE-ONLY — LOW PRIORITY | Decision pending |

---

## What Sky Needs To Do Before Next Sprint (ordered)

1. **[IMMEDIATE]** Merge `security/hardening-wave2-2026-05-27` (no dependencies, ready now)
2. **[IMMEDIATE]** Apply `2026-05-27_users_email_privacy.sql` in Supabase SQL Editor (PII fix, same-cycle)
3. Apply `2026-05-23_status_update_trigger_proposal.sql` in Supabase SQL Editor (D3 Steve-approved)
4. Apply `2026-05-25_flag_edit_rls_replacement.sql` in Supabase SQL Editor → merge `origin/shamus/marker-clustering-2026-05-25`
5. Merge `design/creative-polish-2026-05-27` → then merge `a11y-perf/wave3-2026-05-27` (order matters)
6. Merge `origin/feat/expo-web-vercel-2026-05-25` (low risk, ready for review)
7. Answer D5 (heatmap colour decision) to unblock Shamus build
8. Apply `2026-05-25_push_tokens.sql` in Supabase SQL Editor
9. Deploy `notify-flag-status` Edge Function via Supabase Dashboard
10. Run `npx expo install expo-notifications` in Terminal at ~/AccessMap and rebuild dev client
11. Apply remaining batch: `data_layer_hardening`, `rls_initplan`, `realtime_flags` (~15 min)
12. Delete stale branches: `a11y/residual-2026-05-25`, `docs/learnings-sequential-merge-2026-05-25`, `sync/local-main-to-origin`

---

**Last compiled by:** housekeeping update (2026-05-29) — SHA + test count + Phase 2 branches
