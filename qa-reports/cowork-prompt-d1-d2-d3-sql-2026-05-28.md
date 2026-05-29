# Cowork Prompt — Apply D1/D2/D3 SQL Migrations

Copy everything below and paste into Cowork. It will walk you through applying three database migrations in Supabase SQL Editor.

---

```
Task: Apply three SQL migrations to AccessMap Supabase project.

Context: These migrations unblock two major features (marker-clustering, push notifications) and need to be applied in order. They are idempotent (safe to re-run).

Migrations to apply (in order):

1. D1 — Flag Edit RLS Replacement
File: supabase/migrations/2026-05-25_flag_edit_rls_replacement.sql
Purpose: Tighten RLS policy for flag edits (safer, more restrictive)
Unblocks: shamus/marker-clustering branch merge
Jordan pre-approved this on 2026-05-24

2. D2 — Push Tokens Table
File: supabase/migrations/2026-05-25_push_tokens_table.sql
Purpose: Create schema for push notification tokens
Unblocks: feat/notify-flag-status branch merge + Rory Edge Function deploy
Rory reviewed and approved the SQL

3. D3 — Flag Status Update Trigger
File: supabase/migrations/2026-05-25_flag_edit_trigger.sql
Purpose: Trigger to award points when flags are verified/resolved
Unblocks: Points system on flag status changes
Steve audited and approved this

Steps:
1. Go to Supabase dashboard → SQL Editor
2. Copy full content of D1 migration file (supabase/migrations/2026-05-25_flag_edit_rls_replacement.sql)
3. Paste into SQL Editor
4. Run (execute)
5. Wait for success message
6. Repeat steps 2-5 for D2 migration
7. Repeat steps 2-5 for D3 migration
8. Done — all three applied

Expected output: "Query executed successfully" or similar for each.

If any error: stop and report to Morgan/Rory. These migrations are expert-reviewed and safe, but if something breaks, need immediate diagnosis.

Timeline: 5 minutes total
```

---

Done. Send this prompt directly to Cowork. It handles the rest.
