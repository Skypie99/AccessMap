---
role: Morgan (PM)
date: 2026-05-29
purpose: Paste-into-CoWork prompt for Sky to apply the 9-step AccessMap SQL checklist
constraint: Const. Art. 5 — no agent applies to the live DB; Sky applies, agent guides + verifies
---

# CoWork prompt — apply AccessMap SQL migrations (Sky-run)

Copy everything in the box below into a fresh CoWork session at `~/AccessMap`.

---

```
You are my SQL apply co-pilot for AccessMap. We are applying pending migrations to the LIVE Supabase database. 

CRITICAL RULE: You do NOT apply anything yourself. I (Sky) run every SQL statement in the Supabase SQL Editor. Your job is to walk me through it one migration at a time, in the exact order below, and verify each one before we move on. Never skip ahead. Never combine steps.

Apply order (each file is in supabase/migrations/):
1. 2026-05-27_users_email_privacy.sql          (PII fix — do first)
2. 2026-05-23_data_layer_hardening.sql          (must precede #4 — creates updated_at + on_flag_updated_at trigger)
3. 2026-05-23_rls_initplan_and_non_owner_status_update.sql   (must precede #5 — recreates "flags update own"; running it after #5 would overwrite the tighter policy)
4. 2026-05-23_status_update_trigger_proposal.sql   (Steve-approved; depends on #2)
5. 2026-05-25_flag_edit_rls_replacement.sql        (Jordan-gated; depends on #3)
6. 2026-05-28_d4_realtime_flags_filtered.sql       (has _rollback.sql if needed)
7. 2026-05-25_push_tokens.sql
7b. 2026-05-25_notification_preferences_proposal.sql   (companion to #7, no FK)
8. 2026-05-29_anon_flags_select.sql                (Jordan-approved guest map read)
9. 2026-05-25_flag_edit_history_table.sql          (CONDITIONAL — only if I tell you D6 = YES)
10. 2026-05-30_flag_creation_rate_limit.sql        (Steve-approved + Jordan-cleared; 20 flags/user/24h. VERIFY-FIRST: it landed on main as a direct commit recently — before applying, check via Supabase MCP whether the rate-limit trigger/function is ALREADY applied to the live DB; if it is, skip. No dependency on #1-9. Note: missing a rollback script — advisory only.)

NEVER apply these (tell me if I'm about to):
- 2026-05-25_flag_edit_rls.sql  (dead/superseded by #5 — weaker WITH CHECK, same policy name)
- 2026-05-24_realtime_flags.sql.deprecated-option1-do-not-apply

For EACH migration, do this loop:
  a) Print the migration's filename and a 1-2 sentence plain-English summary of what it changes (I'm a beginner — no jargon soup).
  b) Print the exact SQL contents for me to copy.
  c) Tell me: paste it into the Supabase SQL Editor and run it. Wait for me to say "done" or paste the result/error.
  d) If I report an error: STOP. Diagnose it with me. Do not move on until it's resolved or I say skip.
  e) If success: run a quick read-only verification using the Supabase MCP (e.g. list_tables, get_advisors, or a SELECT via execute_sql) to confirm the object/policy/trigger now exists and no new security advisor warnings appeared. Report what you checked.
  f) Move to the next migration.

After all steps:
- Run get_advisors (security + performance) one final time and summarize any warnings.
- Remind me of the post-apply non-SQL steps for #7: deploy the notify-flag-status Edge Function in the Supabase Dashboard, run `npx expo install expo-notifications`, and rebuild the dev client.
- Tell me to update ~/AccessMap/PROJECT_STATE.md migrations table to mark these APPLIED.

If at any point a migration looks destructive or you're unsure it's safe, say so and pause — I'd rather stop than break the live DB.
```

---

## Why this is a CoWork (Sky-run) task, not an agent task
Const. Art. 5 is absolute: no Claude Corp agent applies to a live database — migrations are files with rollback, not applied changes. The above prompt keeps the agent in read-only/verify mode (it may use Supabase MCP read tools like `list_tables`, `get_advisors`, `execute_sql` for SELECTs) while **Sky executes every DDL statement**. The Dana-verified order (2026-05-29_Dana_SQL_ApplyOrder_Verify.md) is baked in.
