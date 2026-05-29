---
title: Gary — Release Branch Audit (2026-05-28)
date: 2026-05-28
role: Gary (QA)
branch: release/auto-2026-05-28
---

# Gary — Release Branch Audit

## Verdict: ✅ THUMBS UP — CLEAR FOR MERGE TO MAIN

---

## Test suite

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ 0 errors |
| `npm test` | ✅ 1068/1068 passing, 67 suites |
| FAIL lines | None |
| Open handles warning | Present (pre-existing, Supabase client — not a blocker) |

---

## SQL migration spot-checks

| File | Status | Notes |
|---|---|---|
| `2026-05-25_flag_edit_rls_replacement.sql` | ✅ Clean | Proper PROPOSE-ONLY header. RLS policy replaces "flags update own" with "flags owner edit open". WITH CHECK freezes lat/lng/user_id/created_at/status via correlated subselects. Smoke tests included. Rollback is 3 lines. Jordan-approved. |
| `2026-05-27_users_email_privacy.sql` | ✅ Clean | PROPOSE-ONLY. Two-layer defense: replaces SELECT policy + column-level GRANT revokes email from non-self reads. Steve-approved. Zero app blast radius confirmed. |
| `2026-05-25_push_tokens.sql` | ✅ Clean | `create table if not exists` (idempotent). RLS: owner-only CRUD, service-role bypasses for Edge Function. `updated_at` trigger. No foreign key issues. |
| `2026-05-23_status_update_trigger_proposal.sql` | ✅ Clean | Steve-approved. BEFORE UPDATE trigger replaces fragile column-enumeration RLS. New columns auto-protected. Smoke tests and rollback included. |

All 4 files correctly marked PROPOSE-ONLY — no agent applied them.

---

## Regression scan: high-change screens

| Screen/File | Change type | Regression risk |
|---|---|---|
| `auth.tsx` | Push token registration on `SIGNED_IN` + `INITIAL_SESSION` | ✅ Best-effort, never throws, silent on failure — no UX regression |
| `MapScreen.tsx` | HeatmapLegend import + heatmap toggle chip | ✅ Additive only; existing filter panel unchanged |
| `TasksScreen.tsx` | categoryFilter state + SearchInputRow | ✅ Additive; default state (null / empty string) is identical to pre-change behavior |
| `flags.ts` | EXIF strip functions (stripExifNative, stripExifWeb, verifyExifStripped) | ✅ Export-only additions; existing upload path unchanged |
| `pushNotifications.ts` | savePushToken upsert on `push_tokens` table | ✅ Only runs after user confirms PIPEDA prompt; table is PROPOSE-ONLY so upsert silently fails until Sky applies migration (graceful degradation confirmed in tests) |

---

## What's NOT in this release (correctly excluded)

- `shamus/marker-clustering` — blocked on D1+D3 SQL. Correct.
- `expo-web-vercel` — Sky review pending. Correct.
- `a11y/heatmap-2026-05-28` performance baseline — future-dated commit. Correct to exclude.

---

## Sky action required

```
gh pr merge release/auto-2026-05-28 --merge
```

Then apply SQL migrations (in any order — all idempotent):
1. `2026-05-25_flag_edit_rls_replacement.sql` — unlocks marker-clustering merge
2. `2026-05-23_status_update_trigger_proposal.sql` — also unlocks marker-clustering
3. `2026-05-27_users_email_privacy.sql` — closes email PII exposure
4. `2026-05-25_push_tokens.sql` — enables push notifications end-to-end
