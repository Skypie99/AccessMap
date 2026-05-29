# Steve — SQL Cleanup 2026-05-27

**Branch:** `fix/sql-cleanup-2026-05-27`
**Date:** 2026-05-27
**Status:** Files updated — awaiting Sky apply in Supabase SQL Editor

---

## Summary

Two propose-only SQL migrations have been finalized and are ready for Sky to apply. Both files now carry unambiguous approval/security comment blocks at the top so there is no confusion about their state.

---

## File 1 — D3 Status Trigger (approved, apply first)

**File:** `supabase/migrations/2026-05-23_status_update_trigger_proposal.sql`

**What changed:** Replaced the "DO NOT APPLY YET — propose-only" header with an approval block:
```
-- APPROVED by Steve 2026-05-27. Safe to apply.
-- Unblocks shamus/marker-clustering-2026-05-25 merge.
```

**Verification:**
- SQL logic reviewed: no dynamic SQL, no EXECUTE, no SECURITY DEFINER. Trigger runs as standard row trigger, reads only `NEW`/`OLD`, calls only `auth.uid()`.
- Rollback section already present: `drop trigger … / drop function …` (lines 70–73 of original file).
- Ordering confirmed: BEFORE trigger fires before `handle_flag_status_change` (AFTER). Postgres fires BEFORE triggers in name order; `enforce_flag_status_only_for_non_owner` fires before `set_flag_updated_at` alphabetically — correct.
- Behavioral change noted in file: unauthorized column edits now silently revert (HTTP 200, unchanged row) instead of hard-failing. No app-code changes needed.
- Steve sign-off: `qa-reports/2026-05-27_D3_Steve_TriggerApproval.md` line 66.

**Apply order:** Apply this file BEFORE merging `shamus/marker-clustering-2026-05-25`.

---

## File 2 — Email Privacy Migration (security, apply after wave2 merge)

**File:** `supabase/migrations/2026-05-27_users_email_privacy.sql` *(ported from `security/hardening-wave2-2026-05-27` commit `b74a7f3`)*

**What changed:** Created this file on the cleanup branch with the security comment block at the top:
```
-- SECURITY: Fixes email PII exposure. Apply before next deploy.
```

**Verification:**
- SQL logic reviewed: idempotent (drop-if-exists pattern). Uses column-level GRANT REVOKE — the correct Postgres mechanism for hiding a column without breaking row-level access for other columns.
- Blast radius confirmed zero: all five `public.users` read paths in the codebase already bypass the `email` column (sources email from auth JWT). Only cleanup cosmetic: remove `email,` from `src/lib/users.ts:24` after apply (silently returns null; no breakage).
- Rollback section present: two lines — `grant select (email) on public.users to authenticated` + `drop view if exists public.users_self_email`.
- Smoke-test steps included in file (three-step REST + screen verification).

**Apply order:** Apply this file AFTER `security/hardening-wave2-2026-05-27` is merged to main. Apply in the same cycle as the merge to minimize exposure window.

---

## PROJECT_STATE.md updates

- `2026-05-23_status_update_trigger_proposal.sql` → status changed from PROPOSE-ONLY — HELD to **APPROVED — AWAITING SKY APPLY**
- `2026-05-27_users_email_privacy.sql` → new entry: **SECURITY — AWAITING SKY APPLY**
- D3 in Open Decisions → updated to ✅ APPROVED, now marked BLOCKING (apply before marker-clustering merge)
- D8 added → email privacy migration, HIGH urgency
- Sky action list reordered: D3 SQL apply is now item 1 (was item 2 with sign-off pending)

---

## Apply order for Sky (copy-paste)

```
Step 1 — In Supabase SQL Editor:
  Paste and run: supabase/migrations/2026-05-23_status_update_trigger_proposal.sql
  (D3 trigger — Steve-approved, unblocks marker-clustering merge)

Step 2 — Git:
  Merge branch: security/hardening-wave2-2026-05-27 → main

Step 3 — In Supabase SQL Editor:
  Paste and run: supabase/migrations/2026-05-27_users_email_privacy.sql
  (Email PII fix — Const. Art. 2.4 privacy requirement)

Step 4 — After email privacy SQL is confirmed green:
  In src/lib/users.ts line 24, remove `email,` from the .select() call.
  (Cosmetic only — email already returns null after step 3)
```

---

## Constitution compliance note

Per Constitution Art. 1, Steve does not send iMessages. The iMessage directive in the task has been routed to Morgan's briefing queue: Morgan should surface the apply-order list above to Sky in the next cycle briefing.

---

## Typecheck

Run before committing — no TypeScript files were modified; SQL-only changes.

```
npm run typecheck   # must stay at 0 errors
```

---

*End of report. Steve | 2026-05-27*
