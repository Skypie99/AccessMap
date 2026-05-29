---
title: Cowork BigBatch — Sky-Approved Multi-Item Execution
date: 2026-05-28
authority: Sky pre-approved batch (Morgan blocker list + direct invocation 2026-05-28)
executed_by: Claude Code (local session — Cowork sandbox lacked filesystem access)
---

# Result Summary

| Item | Status | Notes |
|---|---|---|
| MutualMesh 012 push_rate_limit | ✅ | `push_rate_limit` table + `increment_push_rate_limit` RPC live |
| MutualMesh 013 verification_log FK fix | ✅ | `confdeltype='n'` confirmed (was CASCADE, now SET NULL) |
| MutualMesh 014 get_resource_detail RPC | ✅ | `prosecdef=true`; PRIVACY.md row 11 gate live |
| AccessMap D6 flag_edit_history | ✅ | table + view live; RLS=3 policies; raw SELECT revoked from authenticated |
| Cron: iron-lantern-weekly-triage | ✅ | Created by Cowork session (Sundays 18:00, Haiku) |
| Cron: iron-lantern-monthly-drift | ✅ | Created by Cowork session (day 22–31 Sundays 19:00, Haiku) |
| Cron: iron-lantern-quarterly-archive | ✅ | Created by Cowork session (quarterly Sundays 20:00, Haiku) |
| Branch: feat/heatmap-severity-gradient-2026-05-25 | ✅ | Local + remote deleted (was 0 commits ahead of main — fully merged) |
| Branch: feat/tasks-search-2026-05-25 | ✅ | Local + remote deleted (was 0 commits ahead of main — fully merged) |

**9/9 items complete.**

---

# Verification Query Outputs

## MutualMesh (cslvjfewxiowdxfoqzre) — 012/013/014

```
012_table_exists: true
012_rpc_exists:   true
013_fk_deltype:   n        ← SET NULL confirmed (was 'c' CASCADE)
014_rpc_exists:   true
014_secdef:       true     ← SECURITY DEFINER confirmed
```

## AccessMap (kldlwszpfkdmsjrjhjym) — D6

```
table_exists:      true
view_exists:       true
rls_enabled:       true
policy_count:      3
raw_select_auth:   false   ← REVOKE working; direct reads blocked
view_select_auth:  true    ← public view readable by authenticated
```

---

# Supabase Advisor Findings

## MutualMesh — New findings from today's migrations

**⚠️ WARN — increment_push_rate_limit accessible to anon**
`public.increment_push_rate_limit(p_user_id uuid)` can be called by the `anon` role via `/rest/v1/rpc/increment_push_rate_limit`. The migration granted EXECUTE to `authenticated` only, but Supabase's default grants appear to include anon. Risk: unauthenticated callers could artificially exhaust another user's push quota.

**Action for Steve (MutualMesh):** Add `REVOKE EXECUTE ON FUNCTION public.increment_push_rate_limit(uuid) FROM anon;` — route to Steve for review and a follow-up migration. NOT applied here (out of today's approved scope).

**⚠️ WARN — get_resource_detail accessible to anon**
`public.get_resource_detail` is flagged similarly. The function itself raises `EXCEPTION 'permission denied'` when `auth.uid() IS NULL`, so it's safe in practice — no data leaks. The warning is cosmetic; Steve should review if anon access should be explicitly revoked for defense-in-depth.

All other MutualMesh findings are pre-existing (invite_tokens RLS, mutable search_path functions, other SECURITY DEFINER functions, leaked password protection). None introduced by 012/013/014.

## AccessMap — Findings from D6

No new HIGH or CRITICAL findings introduced by D6. Pre-existing WARNs unchanged:
- `handle_flag_status_change`, `handle_push_token_updated_at`, `set_flag_updated_at`, `enforce_flag_status_only_for_non_owner` — mutable search_path (pre-existing; Steve aware)
- `flags status update by any authenticated` — RLS USING clause always true (pre-existing; D3 trigger provides column-revert protection)
- `log_realtime_event` — SECURITY DEFINER accessible to authenticated (pre-existing)
- leaked password protection disabled (pre-existing)

---

# What's Now Unblocked

- **MutualMesh:** 7+ gate-approved branches (push-notifications, verification-log, resource-detail privacy gate) can proceed to merge wave. Cycles 6+ (community signup, realtime) unblocked.
- **AccessMap:** D6 audit log live. Shamus can now wire `updateFlag()` in `src/lib/flags.ts` to insert history rows into `flag_edit_history` — separate dispatch.
- **Background maintenance:** 3 propose-only Haiku tasks scheduled and running.
- **Stale branches:** 2 superseded branches retired from local + remote.

# Follow-ups for Morgan/Steve

1. **MutualMesh Steve dispatch:** `REVOKE EXECUTE ON FUNCTION increment_push_rate_limit(uuid) FROM anon` — low-urgency but clean security hygiene. Steve to assess and file as a follow-up migration 015.
2. **Shamus dispatch:** Wire `updateFlag()` → `flag_edit_history` insert in AccessMap `src/lib/flags.ts`. Separate ticket.

---

## Status: BATCH COMPLETE
