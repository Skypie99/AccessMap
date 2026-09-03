# DB PROOF — public.flags delete authorization (PRODUCTION, read-only)

Project: Supabase "Accessable City App" ref kldlwszpfkdmsjrjhjym (us-west-2, Postgres 17.6) — the only app project in the org (the other, "studio-archive", is unrelated).
Method: read-only `execute_sql` SELECTs against pg_policies / information_schema / pg_class via the Supabase MCP, 2026-09-02 ~17:20 PDT. No writes were performed.

## pg_policies for public.flags (9 policies)

| policy | cmd | roles | qual | with_check |
|---|---|---|---|---|
| flags_user_scoped | ALL | {public} | user_id = auth.uid() | user_id = auth.uid() |
| admin delete any flag | DELETE | {authenticated} | (SELECT users.is_admin FROM users WHERE users.id = (SELECT auth.uid())) | — |
| flags delete own | DELETE | {authenticated} | (SELECT auth.uid()) = user_id | — |
| flags anon insert | INSERT | {anon} | — | user_id IS NULL AND photo_url IS NULL AND status = 'open' |
| flags insert own | INSERT | {authenticated} | — | (SELECT auth.uid()) = user_id |
| flags readable by anon | SELECT | {anon} | true | — |
| flags readable by authenticated | SELECT | {authenticated} | true | — |
| flags owner edit open | UPDATE | {authenticated} | owner AND status='open' | owner AND lat/lng/user_id/created_at/status unchanged (self-subselects) |
| flags status update by any authenticated | UPDATE | {authenticated} | EXISTS(users account WHERE account.id = auth.uid()) | same |

## information_schema.role_table_grants for public.flags

authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE (full default grant set)
anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE (full default grant set; RLS is the only guard)
service_role / postgres: all.

## Column grants on public.users

users.is_admin: authenticated has SELECT (plus INSERT/UPDATE/REFERENCES); anon has INSERT/UPDATE/REFERENCES but NOT SELECT.
users.email: authenticated has NO SELECT (privacy hardening holds); service_role/postgres have SELECT.

## RLS status (public schema, all relkind='r')

All 20 tables have rowsecurity=true, none forced. Seven `bk_2026_08_22_*` backup tables (flags, flag_comments, flag_edit_history, flag_photos, flag_status_history, flag_verifications, point_links) have RLS enabled with ZERO policies (locked, service-role-only) — leftovers of the 2026-08-22 junk takedown.

## supabase_migrations.schema_migrations (applied set, 71 rows)

Last applied versions: … 20260727075821 fork5_w1_dispute_counter, 20260729053159 sr050_admin_delete_flag_photo, 20260819204409 flag_status_transition_guard, 20260819214410 photo_alt_text, 20260830130000 promptb_media_key_read_contract.
NOT present: 20260828020000 d1f4r3_fix2 (flag DELETE revoke), 20260828040000–080000 mod1* (moderation/admin report queue), d1/d1f4 account-deletion pipeline migrations. (The Build 33 tree keeps d1/d1f4 under supabase/nonmanaged/proposed — "LOCAL SOURCE ONLY".)

## Deployed Edge Functions (production)

send-push-notification (v6, verify_jwt=false), notify-flag-status (v8, verify_jwt=false), delete-account (v4, verify_jwt=true, last updated 2026-05-31).
NOT deployed: delete-flag, account-deletion-review, account-deletion-status, account-deletion-worker (all present as source in the Build 33 tree under supabase/functions/).

## Conclusion for §29.4

ADMIN_DELETE_DB_AUTHORIZATION (direct Data API DELETE by an authenticated is_admin user): **YES** — grant present, permissive DELETE policy `admin delete any flag` present, `users.is_admin` SELECT grant present for the RLS subselect.
Therefore a CURRENT_MAIN client (`supabase.from('flags').delete().eq('id', …).select('id')`) is authorized at the DB layer (subject to FK/trigger checks recorded separately).
Whether the SUBMITTED_BUILD_33 client uses that path or the undeployed `delete-flag` Edge Function is recorded in evidence/build33-delete-path.md.

## Addendum — FK / trigger / users-policy proof for a direct DELETE (read-only, 2026-09-02 18:2x PDT)

FKs referencing public.flags: flag_comments, flag_edit_history, flag_photos, flag_status_history, flag_verifications → ON DELETE CASCADE; point_events.flag_id → ON DELETE SET NULL. No FK blocks a flag delete.
Triggers on public.flags: 15, all INSERT/UPDATE (rate limits, status guards, points, updated_at, webhook, media-key guards). **No DELETE trigger.**
public.users policies: `users readable by authenticated` (SELECT, qual true) — so the `admin delete any flag` subselect on users.is_admin evaluates for any signed-in caller; `users own row full select`; `users update own row` WITH CHECK pins is_admin via `private.current_user_is_admin()`.
Conclusion: a CURRENT_MAIN-style direct `DELETE … RETURNING id` by an authenticated is_admin user is fully authorized and unobstructed at the database layer. Remaining risk for main = none at DB layer; owner path likewise (`flags delete own` + `flags_user_scoped`).
