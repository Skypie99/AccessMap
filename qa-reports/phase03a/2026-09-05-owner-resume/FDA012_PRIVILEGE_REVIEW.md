# FDA-012 privilege and dependency review

Read-only review of source candidate `6a82b8212a2d0d3de96525d98b5824b4eb7121fb`, receipt HEAD `c794ba8544df2f128269eabf6d87c9ed07a8fd68`, branch `repair/flagstone-p03a-backend-foundation-20260903`. All six existing Phase 03A migration/restoration pairs were read. No repository, hosted system or application rows were changed. This review does not close FDA-012 or accept Phase 03A; the phase remains **BLOCKED**.

The minimum current trusted-server contract is now source-backed: service role needs `SELECT(user_id), UPDATE(user_id)` on `flags`, `SELECT(token,user_id)` on `push_tokens`, and `EXECUTE verify_webhook_secret(text)`. The [deployed server receipt](deployed-server-dependencies.json) captures live source, versions and bundle hashes: delete-account v4 source lines 46–53; send-push-notification v6 lines 149–152; notify-flag-status v8 lines 45 and 123–126. The current repository delete-account source is a later, undeployed asynchronous pipeline and cannot substitute for this evidence.

The full machine-readable proposal is [FDA012_PRIVILEGE_REVIEW.json](FDA012_PRIVILEGE_REVIEW.json). It enumerates 13 active tables, seven backup tables, three views, two sequences and 35 exact function identities after the six migrations. All app objects must remain owned by `postgres`. Owner/admin below are authenticated user personas under RLS; they are different from the database object owner.

## Proposed role/object matrix

`S/I/U/D` mean SELECT/INSERT/UPDATE/DELETE. `I(payload)` and `U(payload)` are explicit column grants listed in JSON. `S(safe)` is the existing column projection. `—` means no rights. All PUBLIC object rights and all client/service grant options are denied. Current broad SELECT sites are bounded by an exact expected column inventory so an added column cannot silently expand the contract.

| Public object | anon | authenticated, including owner/admin | service_role | Basis |
|---|---|---|---|---|
| flags | S, I(payload), transitional | S, I(payload), U(content/status/media/tags), D | S(user_id), U(user_id) | Current app + explicit owner/admin transitional delete + deployed deletion v4 |
| feedback | I(payload), transitional | S, I(payload), D own | — | Guest and own feedback; own-delete policy |
| flag_comments | — | S, I(payload), D own/admin | — | Current comment read/add/delete and contextual author projection |
| comment_votes | — | S own, I(payload), D own | — | Preserved explicit vote/reward policy contract; no current TS call found |
| flag_verifications | — | S own, I(payload) | — | Preserved explicit verification contract; no current TS call found |
| flag_photos | — | S, I(payload), U(url/position/alt_text), D owner | — | Current read plus existing legacy owner photo capabilities |
| flag_edit_history | — | S(six safe columns), I(payload) owner | — | Invoker-view dependency and preserved append-only contract |
| flag_edit_history_public | — | S | — | Preserved invoker projection; no view DML |
| flag_status_history | — | S(five safe columns) | — | Invoker-view dependency; triggers write history |
| flag_status_history_public | — | S | — | Current status-history caller |
| notification_preferences | — | S, I/U(preference payload, including user_id) | — | Preserved own-upsert policy contract; no current TS call found |
| point_events | — | S own | — | Current reward history reader; owner-held triggers write |
| push_tokens | — | S own, I/U(user_id/token/platform), D own | S(token,user_id) | Current token upsert/opt-out + both deployed notification functions |
| realtime_subscribe_log | — | —; use existing RPC | — | Current app only calls log_realtime_event; see explicit historical route note below |
| users | — | S(six profile columns), U(three profile columns) | — | Self profile and avatar fallback; Auth/rewards use owner-held functions |
| users_self_email | — | — | — | No current caller; invoker view already lacks underlying email privilege |
| bk_2026_08_22_flag_comments | — | — | — | Captured backup; owner-only restoration access |
| bk_2026_08_22_flag_edit_history | — | — | — | Same |
| bk_2026_08_22_flag_photos | — | — | — | Same |
| bk_2026_08_22_flag_status_history | — | — | — | Same |
| bk_2026_08_22_flag_verifications | — | — | — | Same |
| bk_2026_08_22_flags | — | — | — | Same |
| bk_2026_08_22_point_links | — | — | — | Same |
| point_events_id_seq | — | — | — | Owner-held reward functions allocate IDs |
| realtime_subscribe_log_id_seq | — | — | — | Owner-held logging RPC allocates IDs |

**Exact bounded writes:** flags INSERT uses `user_id,lat,lng,category,severity,description,photo_url,photo_alt,context_tags,status`; UPDATE uses `description,category,severity,status,photo_url,photo_alt,context_tags`. Existing guards/RLS continue to enforce guest null ownership/photo and open status. System IDs, coordinates on UPDATE, ownership, timestamps, counters and canonical object keys do not need client UPDATE. Current UI content/status writes are at `src/lib/flags.ts:1335–1389`; legacy media/tag allowances preserve the existing owner policy rather than creating a new feature. The final affected tests must prove this bounded contract.

The six users SELECT columns are `id,display_name,avatar_url,avatar_object_key,points,created_at`; UPDATE is only `display_name,avatar_url,avatar_object_key` (`src/lib/users.ts:55–60,119–130`). Avatar null-key fallback must survive. The profile guard must continue rejecting actual canonical-key changes. `is_admin`, email, reward values and streak fields remain inaccessible/unwritable except to trusted owner-held internals. The own-comment INSERT returning embed still relies on self-profile SELECT.

**Upsert detail:** `src/lib/pushNotifications.ts:173` submits `user_id,token,platform`; UPDATE must include `user_id` because an ON CONFLICT upsert can update all submitted fields. The existing WITH CHECK keeps ownership. Apply the same rule to the preserved notification-preference payload.

## Function matrix

| Function group | anon/PUBLIC | authenticated | service_role |
|---|---|---|---|
| All 23 existing trigger-returning functions, exact identities in JSON | — | — | — |
| private.current_user_is_admin() | — | EXECUTE | — |
| public.increment_dispute_request(uuid), public.increment_reopen_request(uuid), public.log_realtime_event(text,text) | — | EXECUTE | — |
| public.current_user_can_admin() | — | EXECUTE | — |
| public and private list_public_leaderboard(integer), get_my_leaderboard_rank(), get_comment_author_profiles(uuid[]) | — | EXECUTE | — |
| public.verify_webhook_secret(text) | — | — | EXECUTE |

Authenticated needs private schema USAGE because public invoker wrappers and policies call private helpers (`20260905055633_phase03a_contextual_profiles.sql:13–78`). Service has no current private helper caller. Owner-held definer functions read users/reward tables and write history/points; service grants do not supply that authority (`supabase/schema.generated.sql:338–348,359–388,418–429,492–549,586–640,727–742`). Exact trigger behavior must be tested after revokes; do not count raw function catalog ACLs as runtime proof. PostgreSQL documents trigger creation permissions and FK-trigger behavior in [CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html).

## Necessary removals beyond maintenance privileges

Remove unnecessary table/column DML for every role, all external sequence access, service EXECUTE on the 23 trigger functions and three authenticated-only RPCs, and all unused view DML. In particular: no direct client reward/log/status-history writes, no users INSERT/DELETE, no feedback UPDATE on the accepted baseline, no comment UPDATE, no verification UPDATE/DELETE, no preference DELETE, and no service application-table DELETE/INSERT. Auth cascades are existing managed-owner/FK operations; they do not require the service client to hold child-table DELETE. This must be checked with synthetic local role tests and separately through hosted Auth acceptance.

The six original migrations did not address these remaining capabilities. The current FDA-012 migration explicitly retains DML and service rights at `20260905055636_phase03a_client_privileges.sql:5–6,24–37`. Its narrow revokes are useful inherited work, but they do not establish minimum effective privileges.

## Managed defaults and objective guard

The [fresh defaults receipt](production-defaults-readonly.json) at `2026-09-05 07:23:09.369416+00` records 144 explicit ACL entries: 48 each for postgres/public, postgres/storage and managed supabase_admin/public. The prior 108 count was client/service-only; it excluded the 36 postgres-grantee entries. Managed supabase_admin/public grants include S/U/USAGE on sequences, EXECUTE on functions, and eight table privileges to postgres, anon, authenticated and service_role. All 48 exact managed entries are copied into the review JSON. Executing postgres is nonsuperuser and not a supabase_admin member. The owner-adjudicated residual is documented without role impersonation or escalation.

Legitimately owned postgres/application defaults must deny default client/service rights. Include GLOBAL PUBLIC function EXECUTE, since a schema-local revoke cannot cancel a global default grant. Distinguish existing postgres/storage defaults from managed Storage objects and preserve the earlier six artifacts. [PostgreSQL default privilege documentation](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html) explains this composition.

The objective guard must enumerate all app public/private objects and fail unknown names/overloads, kind/owner/column drift, app creation under supabase_admin, missing table RLS, or lost view invoker protection. Only actual extension membership can justify an extension exclusion; no broad name/prefix/owner waiver. Check effective privileges per role with `has_table_privilege`, `has_column_privilege`, `has_sequence_privilege`, `has_function_privilege` and grant-option variants, plus schema CREATE/USAGE and role membership. Column ACL rows alone are insufficient because table grants imply column access, and raw grantee rows miss PUBLIC/inherited privileges. [PostgreSQL privilege inquiry functions](https://www.postgresql.org/docs/current/functions-info.html) document these effective checks.

Mutation tests must make the guard fail for a newly overgranted table/view/sequence/function, missing RLS, ownership mismatch, column-only grants, PUBLIC or inherited-role access, grant options, service broad DML and a new overload. Rehearse only in a disposable local/staging transaction. Preserve the seven real backup objects and rows; only schema/ACL fixture modeling is appropriate locally. Supabase distinguishes object privileges and row access in its [Data API security guide](https://supabase.com/docs/guides/api/securing-your-api).

## Remaining dependencies and decisions

The live service dependency is resolved by the new source receipt, but Auth cascade and REST column-grant behavior still need actual acceptance. Narrowed column INSERTs may invalidate tests that supplied synthetic IDs/timestamps: keep those fixtures owner-created rather than treating a test fixture as proof the client needs system-field rights.

Policy-only retained capabilities are explicitly identified in the matrix. Current source has no direct calls to comment_votes, flag_verifications, notification_preferences or flag_edit_history. The client contract manifest incorrectly points to nonexistent `src/lib/notifications.ts`; current token code is `src/lib/pushNotifications.ts`. Preserve the explicit logical contracts without claiming current app use.

The proposed realtime table narrowing removes a historical direct-own-INSERT and manual service audit route described at `20260529084118_d4_realtime_flags_filtered.sql:74–89`; the actual app uses only the definer RPC. Owner-role manual inspection remains. The final contract should record this explicit route change. Similarly users_self_email is unused and already fails underlying email privilege; do not grant email to make that path usable.

FDA-028 must later remove all direct/alternate guest bypasses after its replacement exists. This FDA-012 proposal deliberately retains current guest flag/feedback insertion. Async deletion, media-intent RPCs, moderation feedback columns and monthly leaderboard absence remain their existing deferred contracts. Do not absorb Phase 04 or create grants for nonexistent objects.

## Gates and trail

Ran read-only git identity/status checks, bounded source searches, all six migration reads, catalog/default/owner summaries and live-server receipt inspection. Initial and final tracked worktree changes were none at review time; main/origin-main local divergence was 0/0. No tests were rerun; the 138 inherited pgTAP assertions remain historical evidence pending the affected final-source rerun. No typecheck/lint/build was appropriate to this read-only proposal. A wrong-directory read and two nonexistent stale source references returned file-not-found and were corrected; no missing file is used as positive caller evidence.

Only these review JSON/Markdown artifacts were written by this reviewer. Parent is sole implementation writer. No finding was closed and no CODE/INT/STAGE gate was independently accepted.

## DECISIONS FOR SKY

No additional owner permission is requested by this bounded review. The already-authorized implementation and independent local/hosted acceptance remain incomplete. Recommendation: use the explicit object matrix and live service dependencies, then require positive behavior and guard-bypass failures on the final candidate. Alternative: retain broad default grants; impact: FDA-012 cannot be accepted under the owner’s effective least-privilege rule. The global phase remains BLOCKED.
