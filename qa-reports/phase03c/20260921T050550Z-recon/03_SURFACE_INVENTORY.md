# 03 — Surface Inventory

Ground truth = `supabase/migrations/` (71 files) **+ confirmed-applied `migrations-next` content** (see `01_GROUND_TRUTH.md`: 5 top-level `2026090*` files + 9 of 10 `phase03a/` files, excluding Stage-B cutover + 2 `phase03b/` files). Rows below marked **[71-only]** come from the spawned DB-surface agent, which scoped to the 71-file layer only — still accurate for that layer. Rows marked **[Stage-A]** / **[03B]** are this session's direct findings from `migrations-next/`, which that agent did not review.

## Tables — anon exposure summary

| Table | anon SELECT | anon INSERT | anon UPDATE/DELETE | Source |
|---|---|---|---|---|
| `public.flags` | **YES**, full row, `using(true)` + restrictive "hide rejected" | YES, `status='open'`/`user_id is null`/`photo_url is null` only | NO | `20260529175842`, `20260602053139`; restrictive policy **[03B]** `phase03b/20260915210256:167-172` |
| `public.users` | NO (table SELECT revoked; column-scoped grant is `authenticated`-only) | NO | NO | `20260529192040_users_email_privacy.sql:6-17` **[71-only, still current]** |
| `public.flag_comments` | NO RLS policy for anon (table GRANT exists **[Stage-A]** `phase03a/20260905073925:222` but no matching policy → effectively blocked) | NO | NO | `20260530192829_flag_comments.sql` |
| `public.flag_photos` | Same pattern: table GRANT exists **[Stage-A]** `phase03a/20260905073925:223`, no anon RLS policy → blocked | NO | NO | `20260531025237_flag_photos_junction.sql` |
| `public.feedback` | NO | **YES** — `user_id, category, body, contact_email, platform` **[Stage-A]** `phase03a/20260905073925:190` | NO | — |
| `public.flag_moderation_events` | NO (authenticated+admin only) | n/a | n/a | **[03B]** `phase03b/20260915210256:136-141` |
| `public.point_events`, `flag_verifications`, `comment_votes`, `push_tokens`, `notification_preferences`, `realtime_subscribe_log` | NO | NO | NO | owner-scoped `authenticated` throughout, **[71-only]** |
| `flag_point_reward_claims`, `comment_reward_daily`, `comment_vote_reward_counts` | NO — `revoke all ... from public, anon, authenticated, service_role` | — | — | **[03B]** `phase03b/20260915210413:21-96` (server-internal reward-integrity tables) |

## Column-level anon exposure detail (`public.flags`, current full column set)

Anon has **table-level** `GRANT SELECT` (`phase03a/20260905073925:205`) — RLS is row-level only, so every current and future column is anon-visible unless separately column-restricted. Current columns: `id, user_id, lat, lng, category, description, severity, photo_url, photo_object_key, photo_alt, status, created_at, updated_at, context_tags, reopen_requests, dispute_requests_reset_at, dispute_requests, last_moderation_reason_code`. Only `UPDATE` on specific columns is column-restricted (`status`, `photo_object_key`, `last_moderation_reason_code`, etc.) — **no column has SELECT restricted**. See `04_EXPOSURE_AUDIT.md` F1 for the one column (`last_moderation_reason_code`) whose anon-readability looks unintentional.

## RLS policies — full list

See the DB-surface agent's §2 table (reproduced faithfully, not re-typed here to avoid transcription drift) for the complete 71-file-layer policy inventory covering `users`, `flags`, `feedback`, `flag_status_history`, `flag_edit_history`, `push_tokens`, `notification_preferences`, `realtime_subscribe_log`, `flag_comments`, `flag_photos`, `point_events`, `flag_verifications`, `comment_votes` — every `USING(true)` policy is called out there. That inventory is accurate and current except where superseded below.

**Superseded/added by Stage-A + Phase03B (not in the 71-file-only inventory):**

| Policy | Table | Cmd | Roles | USING/CHECK | Source |
|---|---|---|---|---|---|
| "flags rejected hidden from anon" | `flags` | SELECT (restrictive) | anon | `status <> 'rejected'` | `phase03b/20260915210256:167-172` |
| "flags rejected hidden from nonadmins" | `flags` | SELECT (restrictive) | authenticated | `status <> 'rejected' or is_admin` | `phase03b/20260915210256:173-177` |
| "flags insert status open only" | `flags` | INSERT (restrictive) | anon, authenticated | `status = 'open'` | `phase03b/20260915210256:178-183` |
| "flags owner edit open" (revised) | `flags` | UPDATE | authenticated | rewritten to avoid recursive self-query (42P17 fix) | `phase03b/20260915210256:222-243` |
| "flag moderation events admin read" | `flag_moderation_events` | SELECT | authenticated | `current_user_is_admin()` | `phase03b/20260915210256:140-155` |
| "feedback_select_report_requires_admin" | `feedback` | SELECT | (unspecified) | admin-gated | `phase03b/20260915210256:257-273` |
| "users update own row" (revised) | `users` | UPDATE | authenticated | adds `is_admin` self-promotion guard via `private.current_user_is_admin()` | `phase03a/20260904000000_adopt_private_admin_helper.sql:47-55` |
| "flag_photos: authenticated insert" (revised) | `flag_photos` | INSERT | authenticated | adds URL-prefix + account-exists check (closes prior unconditional `with check(true)`) | `phase03a/20260904000200_adopt_d1sa_containment.sql:60-79` |
| storage `flag-photos auth upload`/`owner delete` (revised) | `storage.objects` | INSERT/DELETE | authenticated | adds `exists (select 1 from public.users ...)` account check | `phase03a/20260904000200_adopt_d1sa_containment.sql:32-58` |

## SECURITY DEFINER functions — additions beyond the 71-file inventory

| Function | Purpose | Grant | Source |
|---|---|---|---|
| `private.current_user_is_admin()` | Central admin check, replaces inline `(select is_admin from users where id=auth.uid())` pattern everywhere | `authenticated` only; `anon`/`public` explicitly revoked | `phase03a/20260904000000:31-43` |
| `public.transition_flag_status(...)` | Canonical status-transition entrypoint (moderation) | `authenticated` (revoked from anon/public) | `phase03b/20260915210256:541-559` |
| `public.list_open_moderation_reports(integer)` | Admin report queue | `authenticated` (RLS/internal admin-gated) | `phase03b/20260915210256:584-597` |
| `public.moderate_report(...)` | Admin moderation action | `authenticated` (internal admin-gated) | `phase03b/20260915210256:794-797` |
| `public.handle_comment_added()` / `handle_comment_vote_added()` / `handle_flag_status_change()` (revised) | Points-integrity rewrite | trigger-only, all revoked from anon/authenticated/public | `phase03b/20260915210413` |
| `limiter.admit_at(...)`, `limiter.derive_bucket_key(...)`, etc. | FDA-028 anon write rate limiter | schema `limiter` — `REVOKE ALL ... FROM PUBLIC` at schema level | `phase03a/20260909120000_fda028_v4_limiter.sql:19` |
| `public.check_global_anon_rate_limit()` | Anon insert throttle trigger | `service_role` only | `phase03a/20260904000300_adopt_live_insert_throttles.sql:39-66` |

For the full 71-file-layer SECURITY DEFINER inventory (points triggers, `handle_new_user`, `notify_flag_status_webhook` — **note: this one embeds a hardcoded plaintext secret and has no `SET search_path`, a pre-existing finding, not new to this recon** — `check_flag_creation_rate_limit`, `enforce_flag_status_transition`, object-key guards), see the DB-surface agent's §3, which is complete and not repeated here.

## Views

| View | security_invoker | anon SELECT | authenticated SELECT |
|---|---|---|---|
| `flag_status_history_public` | true | No | Yes |
| `flag_edit_history_public` | true | No | Yes |
| `users_self_email` | true, `where id=auth.uid()` | No | Yes (own row only) |

No view is anon-reachable.

## Storage

- Bucket `flag-photos`: **`public = true`** (`20260523020620_accessmap_schema.sql:145-147`), never flipped. Object bytes are servable via the public URL regardless of any `storage.objects` RLS — confirmed the one-time "flag-photos public read" SELECT policy was deliberately dropped one migration later (`20260523021433_accessmap_security_hardening.sql:12`) with the comment that it only enabled *listing*, and public-URL fetches don't need it.
- Net effect: the **primary** flag photo (`flags.photo_object_key`) is anon-visible via `getPublicUrl()` (client: `src/lib/flags.ts:1051`) even though the `flag_photos` **table** (additional/junction photos) is not anon-queryable. Two different read paths for what looks like "the same feature" — see `04_EXPOSURE_AUDIT.md` F3.
- Upload/delete: `authenticated` only, own-UUID-prefixed path, tightened by Stage-A to also require a live `public.users` row (`phase03a/20260904000200_adopt_d1sa_containment.sql:32-58`).

## RPCs callable via `supabase.rpc(...)`

| RPC | anon EXECUTE | authenticated EXECUTE | Notes |
|---|---|---|---|
| `log_realtime_event(text,text)` | No | Yes | requires `auth.uid()` inside body too |
| `increment_reopen_request(uuid)` | No | Yes | no ownership check inside body |
| `increment_dispute_request(uuid)` | No | Yes | no ownership check inside body |
| `verify_webhook_secret(text)` | No | No | `service_role` only (historically anon+authenticated — closed, see DB agent §1) |
| `get_comment_author_profiles(...)` | Unverified — called from guest-reachable `FlagDetailModal`/`useComments` path (`src/lib/comments.ts:64-66`) but not found defined in `supabase/migrations/`; only appears under `migrations-next/phase03b` scope per client-surface agent §3g | — | **Needs live verification** — flagged in `06_IMPLEMENTATION_PLAN.md` |
| `transition_flag_status`, `list_open_moderation_reports`, `moderate_report` | No (authenticated + internal admin-gated) | Yes (admin-gated internally) | **[03B]**, see above |
| Account-deletion RPC family (`request_account_deletion`, `claim_next_account_deletion_operation`, etc. — 11 names referenced by `supabase/functions/*`) | n/a (edge-function/service-role only, not client-callable) | n/a | **Not found in `supabase/migrations/` at all**; DB agent found them only under `supabase/nonmanaged/proposed/`. Directly relevant to threat-audit item "deletion/takedown state" — see `04_EXPOSURE_AUDIT.md` F5 |
