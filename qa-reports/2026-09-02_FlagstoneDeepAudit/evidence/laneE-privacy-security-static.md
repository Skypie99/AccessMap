# Lane E — Privacy / security static review (source-level)

Status: COMPLETE (18 candidates; written incrementally — sections appended in order).
Reviewer: Lane E read-only subagent. Worktree `/Users/skypie/AccessMap-deep-audit-20260902`.
CURRENT_MAIN = origin/main `70b52a30`. SUBMITTED_BUILD_33 = `f5594171` (113 commits ahead of main, not in main).
Production facts relied on (captured read-only by the lead, 2026-09-02): deployed Edge Functions = `send-push-notification`, `notify-flag-status`, `delete-account` (v4, 2026-05-31) ONLY. `delete-flag` and `account-deletion-*` NOT deployed. Applied migrations end at `20260830130000_promptb_media_key_read_contract`; `mod1*` (20260828040000–080000) and `d1f4r3_fix2` (20260828020000) NOT applied. `public.flags` still has `admin delete any flag` + `flags delete own` + `flags_user_scoped` FOR ALL; authenticated and anon hold the full default grant set on `flags`. authenticated has SELECT on `users.is_admin`, NO SELECT on `users.email`.

## Method + files read

- All reads via `git -C <worktree> show <sha>:<path>` / `sed` on the checked-out main worktree. No checkout, no network, no MCP, no production access.
- Line numbers cite the file at the named commit (`main:` = 70b52a30, `b33:` = f5594171). Snippets quoted ≤6 lines.
- Secrets policy: no secret values printed anywhere in this file; only file:line + pattern type.
- `.env` in the worktree is untracked (`git ls-files .env` → nothing; `.gitignore` lists `.env`), and contains only the two `EXPO_PUBLIC_*` keys (names checked, values not read).

Files read (running list, appended as reviewed):
- main: `supabase/schema.sql` (484 lines, full); ALL 56 files under `supabase/migrations/` (full) incl. `*_PROPOSED`, `*_APPLIED`, `2026-07-27_drift_capture_*`, `2026-08-18/22` data ops; `supabase/realtime.sql.deprecated-*`; `supabase/functions/{delete-account,notify-flag-status,send-push-notification}/index.ts` + `notify-flag-status/config.toml`.
- main client: `src/lib/{supabase.ts,auth.tsx,admin.ts,account.ts,photos.ts,location.ts,links.ts,analytics.ts,pushNotifications.ts,errors.ts,postgrestErrors.ts,users.ts,anonRateLimit.ts,shareFlag.ts,dataExport.ts,flags.ts(1810 lines, full)}`; repo-wide greps over `src/**` + `App.tsx` for `.from(`/`.rpc(`/`functions.invoke(`/`storage.from(`/`channel(`, `console.*`, AsyncStorage keys, Sentry/analytics SDKs, Linking/deep-link, ImagePicker/ImageManipulator/EXIF, expo-location, expo-notifications.
- config: `app.json`, `eas.json`, `vercel.json`, `public/sw.js`, `.env.example`, `.gitignore`, `docs/SUPABASE_SECURITY.md`; secret-pattern grep (`eyJ…`, `sk_live/test`, `service_role`, `password=`, `Bearer …`, PEM headers) over both trees with values redacted; reviewer-credential grep (locations only).
- (continued below as Build 33 files are read)

## RLS / grant matrix as declared in SOURCE — CURRENT_MAIN (with Build 33 differences)

Legend: S/I/U/D = SELECT/INSERT/UPDATE/DELETE. "—" = no policy in source (default deny under RLS). File refs are `main:` paths under `supabase/` unless noted; `b33:` = f5594171.

| Table / object | RLS on? | anon S/I/U/D | authenticated S/I/U/D | admin / maintainer exception | source (main) | Build 33 differences |
|---|---|---|---|---|---|---|
| `public.users` | yes (`schema.sql:326`) | S: table SELECT revoked from anon (`migrations/2026-05-27_users_email_privacy.sql:175`); I/U/D — | S: policy `using(true)` (`schema.sql:333-336`) but **column grant only** `(id, display_name, avatar_url, points, created_at)` (`…users_email_privacy.sql:177-180`); `is_admin` column grant is described as live since 2026-08-18 (`src/lib/admin.ts:40-41`) but **no main migration file records it**; I — (trigger `handle_new_user` SECURITY DEFINER, `schema.sql:92-113`); U: own row, `is_admin` pinned (`…2026-05-30_admin_role.sql:34-43`); D — | none; `users_self_email` view exposes own email (`…users_email_privacy.sql:198-206`) | as cited | b33 adds `migrations/20260818211920_reconcile_oob_grant_select_is_admin_for_replay_20260829.sql` (records the is_admin grant) |
| `public.flags` | yes (`schema.sql:327`) | S: `using(true)` (`…2026-05-29_anon_flags_select.sql:106-111`); I: `user_id is null and photo_url is null` (`…2026-05-30_anon_flag_reporting_photo_fix.sql:100-106`; plus `status='open'` per note `…2026-06-01_flags_policy_consolidation.sql:58-60`); U/D — | S: `using(true)` (`schema.sql:353-356`); I: `uid = user_id` (`…2026-05-23_rls_initplan…sql:57-61`); U: (a) `flags owner edit open` — owner, `status='open'`, immutable cols pinned (`…2026-05-25_flag_edit_rls_replacement.sql:114-136`; live body has the self-correlation defect, `…2026-07-27_drift_capture_flags_owner_edit_open_policy.sql:47-55`), (b) `flags status update by any authenticated` `using(true) with check(true)` (`…2026-06-01_flags_policy_consolidation.sql:41-46`) + BEFORE UPDATE trigger `enforce_flag_status_only_for_non_owner` reverting non-status columns for non-owners (`…2026-05-23_status_update_trigger_proposal.sql:83-115`; does NOT revert `context_tags`/`photo_alt`/`reopen_requests` — `…flags_policy_consolidation.sql:73-75`) + transition guard (`…2026-08-19_flag_status_transition_guard_APPLIED.sql:43-73`); D: own (`schema.sql:397-400`) | `admin delete any flag` (`…2026-05-30_admin_role.sql:20-26`); admin-only `resolved->rejected` (`…transition_guard_APPLIED.sql:59-63`) | as cited | b33 `migrations/20260727075512_a4_3_owner_edit_subquery_alias_fix_20260727.sql` (alias fix — absent from main), `20260727075605_a2_1_nonowner_revert_context_tags…` (adds context_tags to trigger revert list — absent from main), `20260602053522_restore_flags_auth_user_only_triage_unblock…`; `nonmanaged/proposed/…d1f4r3_fix2…` + `live-out-of-band/2026-08-27_d1sa_deployed_security_containment.sql` touch flags DELETE (NOT applied per lead). **Lead's live facts: a `flags_user_scoped` FOR ALL policy still exists — it appears in NO main migration file (see CAND below).** |
| `public.push_tokens` | yes (`schema.sql:414`) | policies have no `TO` clause → apply to anon too but `auth.uid()` is null → 0 rows | S/I/U/D own (`schema.sql:418-436`) | none | as cited | same |
| `public.feedback` | yes (`…2026-05-23_feedback_table.sql:83`) | I: allowed (no `TO`; `user_id is null or = uid`, `:88-94`) → **anon INSERT open**; S/U/D — | I own-or-null; S own (`:99-105`); D own (`:121-127`); U — | maintainer SELECT keyed on hard-coded `auth.email() = 'skylerhalisky@gmail.com'` (`:112-117`) | as cited | b33 `20260727075623_a2_2_feedback_anon_throttle_20260727.sql` (anon throttle) |
| `public.flag_status_history` | yes (`…2026-05-24_status_history_table.sql:167`) | table SELECT revoked (`:210`) | table SELECT revoked (`:210`); reads via view `flag_status_history_public` (no `user_id`, `:225-232`); I `with check(false)` (`:196-201`); U/D — | maintainer SELECT by email (`:177-180`) | as cited | b33 `20260727075651_a4_1_status_history_view_grant_fix…`; `fork2_oa…plus_status_history` |
| `public.flag_edit_history` | yes (`…2026-05-25_flag_edit_history_table.sql:134`) | revoked (`:173`) | I by flag owner (`:139-147`); reads via view `flag_edit_history_public` (`:183-190`); U/D — | maintainer SELECT by email (`:150-156`) | as cited | same |
| `public.flag_comments` | yes (`…2026-05-30_flag_comments.sql:34`) | — | S all (`:37-41`); I own (`:44-48`); D own (`:51-55`); U — | none in main | as cited; `ALTER PUBLICATION supabase_realtime ADD TABLE public.flag_comments` (`:62`) = full-row realtime broadcast | b33 `20260727075638_sr001_admin_delete_comment_20260727.sql` |
| `public.flag_photos` | yes (`…2026-05-30_flag_photos_junction.sql:36`) | — (main); b33 makes anon explicit (`sr024`) | S all (`:39-42`); **I `with check(true)`** (`:47-50`) — the tightened URL-scoped policy is `…2026-06-01_flag_photos_insert_guard.sql:42-49` **marked PROPOSE-ONLY**; D/U flag owner (`:53-69`) | none in main | as cited | b33 files this under `nonmanaged/proposed/` (= NOT applied); b33 adds `sr024` (anon explicit), `sr050` (admin delete flag photo), `20260830130000_promptb_media_key_read_contract.sql` (applied per lead) |
| `public.point_events` | yes (`…2026-05-30_trust_score_system.sql:39`) | — | S own (`:41-45`); no writes (trigger-only) | none | as cited | same |
| `public.flag_verifications` | yes (`:61`) | — | S own (`:63-67`); I own & not flag owner (`:69-76`; null-unsafe for anon flags — `verifier_id <> NULL` = NULL) ; U/D — | none | as cited | b33 `20260727075327_sr009_flag_verifications_null_safe…` |
| `public.comment_votes` | yes (`:86`) | — | S own (`:88-92`); I own (`:94-98`); **D own (`:100-104`)**; U — | none | as cited | same |
| `public.realtime_subscribe_log` | yes (`…2026-05-28_d4_realtime_flags_filtered.sql:77`) | — | I own (`:79-83`) via RPC `log_realtime_event` (`:91-116`); S/U/D — | none | as cited | same |
| `public.notification_preferences` | yes (`…2026-05-25_notification_preferences_proposal.sql:41`) — PROPOSAL | — | S/I/U own (`:44-66`) | none | as cited | b33 files it under `nonmanaged/manual/…draft.sql` (not in managed chain) |
| `storage.buckets.flag-photos` | public bucket (`schema.sql:459-461`) | object bytes world-readable by URL (public bucket); no LIST (no SELECT policy, `:462-466`) | I path-scoped `<uid>/…` (`:468-475`); D owner (`:477-484`) | admin delete policy applied live 2026-07-29 per `src/lib/flags.ts:1384-1388` — **no main migration file** | as cited | b33 `20260729053159_sr050_admin_delete_flag_photo_20260729.sql`; `promptb_media_key_read_contract` |
| Realtime publication | — | `public.flags (id, status)` column-filtered (`…d4_realtime_flags_filtered.sql:55`); `public.flag_comments` full row (`…flag_comments.sql:62`) | same | — | as cited | same |

Functions / RPCs and their EXECUTE posture (main source):

| Function | SECURITY | search_path | EXECUTE (source) | Called by client? |
|---|---|---|---|---|
| `increment_reopen_request(uuid)` | DEFINER (`schema.sql:304-321`) | `public` | REVOKE public/anon, GRANT authenticated (`…flag_reopen_requests.sql:99-100`) | yes `src/lib/flags.ts:1342` |
| `log_realtime_event(text,text)` | DEFINER | `public` | authenticated only (`…d4…sql:115-116`) | yes `src/lib/realtimeLog.ts:26` |
| `list_monthly_leaderboard(int)` | DEFINER, STABLE | `public` | authenticated (`…2026-06-18_…PROPOSED.sql:70-71`) — PROPOSED | yes `src/lib/users.ts:129` (degrades when absent) |
| `increment_dispute_request(uuid)` | DEFINER | `public` | authenticated (`…2026-07-16_…PROPOSED.sql:62-63`) — PROPOSED in main; b33 applied (`20260727075821`) | yes `src/lib/disputes.ts:55` (gated) |
| `verify_webhook_secret(text)` | DEFINER | `public, vault` | REVOKED from public/anon/authenticated (`schema.sql:265`, `…sr018…sql:32`) | no (Edge Function w/ service role) |
| `handle_new_user`, `handle_flag_status_change`, `handle_flag_reopen_reset`, `notify_flag_status_webhook`, `handle_flag_submitted`, `handle_flag_photo_added`, `handle_comment_added`, `handle_comment_vote_added`, `handle_point_event_streak`, `handle_flag_insert_history`, `check_flag_rate_limit`, `check_flag_creation_rate_limit`, `check_global_anon_rate_limit`, `enforce_flag_status_only_for_non_owner`, `enforce_flag_status_transition` | mostly DEFINER | `public` (webhook: `public, vault, net`) | trigger-only; EXECUTE revoked in source (various) — `enforce_flag_status_transition` has **no REVOKE in its APPLIED file** (`…2026-08-19_flag_status_transition_guard_APPLIED.sql`), `set_flag_updated_at`/`handle_push_token_updated_at` are not DEFINER and have no revoke (harmless) | no |

Additional files read for the Build 33 half (all via `git show f5594171:…`): `supabase/config.toml`; `supabase/functions/_shared/{cors,supabase,accountDeletionReviewCore,accountDeletionWorkerCore}.ts`; `supabase/functions/{delete-account,delete-flag,account-deletion-review,account-deletion-status,account-deletion-worker}/index.ts`; `supabase/schema.sql` (diff); managed migrations absent from main: `20260528180513_d1_flags_rls`, `20260530192824_flag_creation_rate_limit_hardened`, `20260529181141_notify_flag_status_webhook_trigger`, `20260531015433_fix_flag_comments_default_user_id`, `20260602053139/053522/060359` (flags policy trio), `20260603002420_reconcile_oob_verify_webhook_secret…`, `20260727075327…075821` (sr009, fork2_oa, a4_3, sr024, a2_1, a2_2, sr001, a4_1, rls_initplan_consolidated, fork5_w1), `20260729053159_sr050…`, `20260818211920_reconcile_oob_grant_select_is_admin…`, `20260828040000…080000` (MOD1 ×5), `20260830130000_promptb_media_key_read_contract`; `nonmanaged/live-out-of-band/2026-08-27_d1sa_deployed_security_containment.sql` (full); `nonmanaged/proposed/20260828020000_d1f4r3_fix2…` (full) and `2026-08-27_d1f4_async_account_deletion.sql` (policy/grant/RPC statements + lines 268-345); client: `src/lib/{account,accountDeletionAvailability,accountDeletionReceipt,adminReports}.ts` (full), diffs of `src/lib/{auth.tsx,flags.ts,photos.ts,users.ts,location.ts}`, targeted reads of `src/screens/{ReportFlagModal,ProfileScreen,SignInScreen,AdminScreen,TasksScreen}.tsx`, `src/components/FlagDetailModal.tsx`, `app.json` diff.
- Historical cross-refs read: `design-reviews/ship-ready/{01_functionality_findings,04_appstore_readiness,04b_sql_sweep_lens4b_RECOVERED,05_THE_SUBMISSION_GAP_LIST,10_CONSERVATION_TABLE,DECISIONS}.md` (grep-level), `docs/{PRIVACY_POLICY.md,privacy/index.html,ROADMAP.md,DATABASE.md,APP_STORE_REVIEWER_NOTES.md (locations only),SECURITY_INCIDENT_RESPONSE.md,RELEASE_IDENTITY.md}`, `QA_PLAN_SECURITY.md`.

## Client call matrix — CURRENT_MAIN (70b52a30)

"Deployed?" uses the lead's production facts. ✓ = policy/grant found in source AND applied live; ⚠ = applied live but only recorded outside main's migration set (B33 chain or drift-capture); ✗ = not deployed/applied.

| Call site (file:line) | Table / RPC / function | Role needed | Policy / grant found in source | Deployed in prod? | Gap? |
|---|---|---|---|---|---|
| `src/lib/account.ts:25` | Edge `delete-account` (POST, no body) | authenticated JWT | handler `getUser()` (`functions/delete-account/index.ts:60-71`) | ✓ v4 (2026-05-31) | leaves Storage/feedback PII behind — CAND-E-08 |
| `src/lib/admin.ts:30-34` | `users.select('is_admin')` own row | authenticated | column grant recorded only in b33 `20260818211920…` | ⚠ | none (grant live) |
| `src/lib/comments.ts:80,132` | `flag_comments` select + `users!flag_comments_user_id_fkey(display_name)` embed | authenticated | read `using(true)` (`…flag_comments.sql:37-41`); users column grant | ✓ | none |
| `src/lib/comments.ts:169` | `flag_comments` insert (no user_id sent) | authenticated | own-insert policy; column default `auth.uid()` only in b33 `20260531015433…` | ⚠ | none |
| `src/lib/comments.ts:193` | `flag_comments` delete | authenticated | own delete; admin delete only in b33 `sr001` | ⚠ | none |
| `src/lib/disputes.ts:55` | RPC `increment_dispute_request` | authenticated | main file is `*_PROPOSED`; applied per b33 `20260727075821…`; D1SA body requires `public.users` row | ⚠ | none |
| `src/lib/feedbackStore.ts:83,90` | `feedback` insert (anon or own) | anon / authenticated | `…feedback_table.sql:88-94`; anon throttle 30/h (b33 `a2_2`) | ✓ | global-cap DoS — CAND-E-14 |
| `src/lib/feedbackStore.ts:148` | `feedback` select own | authenticated | `…feedback_table.sql:99-105` | ✓ | none |
| `src/lib/flags.ts:844-849` | Storage upload `flag-photos/<uid>/<ts>.<ext>` | authenticated | `schema.sql:468-475`; D1SA adds users-row requirement | ✓ | uid in public URL — CAND-E-08/16 |
| `src/lib/flags.ts:957` | Storage remove own paths | authenticated | `schema.sql:477-484` | ✓ | none |
| `src/lib/flags.ts:999,1049,1077,1485,1511,1550`; `userReportStats.ts:62`; `ProfileScreen.tsx:355` | `flags` select (explicit columns) | anon or authenticated | `schema.sql:353-362` | ✓ | none |
| `src/lib/flags.ts:1227,1241` | `flags` insert own (status not sent → default open) | authenticated | `…rls_initplan…sql:57-61` | ✓ | status not pinned server-side — CAND-E-07 |
| `src/lib/flags.ts:1282` | `flags` update content (owner edit) | authenticated owner | `flags owner edit open` (alias fix only in b33 `a4_3`); PLUS live `flags_user_scoped` FOR ALL | ⚠ | owner can bypass open-only — CAND-E-06b |
| `src/lib/flags.ts:1317` | `flags` update status (CAS) | any authenticated | `…flags_policy_consolidation.sql:41-46` + trigger + transition guard | ✓ | anyone can reject — CAND-E-04 |
| `src/lib/flags.ts:1342` | RPC `increment_reopen_request` | authenticated | `…flag_reopen_requests.sql:99-100` | ✓ | no dedupe (known) |
| `src/lib/flags.ts:1413` | `flags` delete `.select('id')` | owner or admin | `schema.sql:397-400`, `…admin_role.sql:20-26`, `flags_user_scoped` | ✓ | none |
| `src/lib/flags.ts:1446-1447` | `flags.photo_url` / `flag_photos.url` select | authenticated | read policies | ✓ | none |
| `src/lib/flags.ts:1695,1715,1730`; `points.ts:95`; `SettingsScreen.tsx:478` | `users` select granted columns | authenticated | column grant `…users_email_privacy.sql:177-180` | ✓ | all-rows enumeration incl. `is_admin` — CAND-E-11 |
| `src/lib/flags.ts:1803` | `flags` insert (anon) | anon | `flags anon insert` (user_id/photo_url null, status open) | ✓ | global cap 100/h — CAND-E-14 |
| `src/lib/photos.ts:34` | `flag_photos` select | authenticated | `…flag_photos_junction.sql:39-42` | ✓ | none |
| `src/lib/photos.ts:73,104` | `flag_photos` insert | authenticated (owner per D1SA) | main source `with check(true)`; live = D1SA owner+own-folder | ⚠ | source/live drift — CAND-E-12 |
| `src/lib/pointEvents.ts:52,100` | `point_events` select own | authenticated | `…trust_score_system.sql:41-45` | ✓ | none |
| `src/lib/pushNotifications.ts:172,196` | `push_tokens` upsert/delete own | authenticated | `schema.sql:418-436` | ✓ | none |
| `src/lib/realtimeLog.ts:26` | RPC `log_realtime_event` | authenticated | `…d4…sql:115-116` | ✓ | none |
| `src/lib/statusHistory.ts:73` | view `flag_status_history_public` | authenticated | `…status_history_table.sql:225-232` + b33 `a4_1` | ✓ | none |
| `src/lib/users.ts:56-61` | `users` update own (display_name, avatar_url) | authenticated | `…admin_role.sql:34-43` (pins is_admin only) | ✓ | points/email writable — CAND-E-05 |
| `src/lib/users.ts:129` | RPC `list_monthly_leaderboard` | authenticated | `*_PROPOSED` (b33: nonmanaged/proposed) | ✗ | client degrades to `[]` (by design) |
| `src/hooks/useComments.ts:160`; `src/lib/flagsStore.tsx:553` | Realtime `flag_comments` (full row) / `flags (id,status)` | authenticated | publication rows | ✓ | none |
| `src/lib/geocode.ts:22-23,47` | external Nominatim search/reverse (User-Agent w/ support email) | — | n/a | n/a | see note in CAND-E-16 |
| `src/lib/feedback.ts:78` | `mailto:` composer | — | n/a | n/a | none |

## Client call matrix — SUBMITTED_BUILD_33 (f5594171) — additions/changes only

| Call site (b33 file:line) | Table / RPC / function | Role needed | Policy / grant found in source | Deployed in prod? | Gap? |
|---|---|---|---|---|---|
| `src/lib/account.ts:19-23` | Edge `delete-account` with `{operationId, receiptSecret}`; expects `status==='requested'` | authenticated | b33 handler → RPC `request_account_deletion` (service_role only; `nonmanaged/proposed/…d1f4…sql:1055,1071`) | ✗ (prod runs v4 which deletes immediately and returns `deleted`) | **CAND-E-01** |
| `src/lib/accountDeletionReceipt.ts:87-91`; `SignInScreen.tsx:99`; `ProfileScreen.tsx:736` | Edge `account-deletion-status` | none (receipt secret) | b33 handler → RPC `account_deletion_receipt_status` (service_role) | ✗ not deployed | status always "unavailable" — CAND-E-01 |
| `src/lib/flags.ts` `deleteFlag` (invoke `delete-flag`); `adminReports.ts:383` | Edge `delete-flag` → RPCs `account_deletion_prepare_flag_delete` / `…finalize…` / `…storage_exact_object` | authenticated owner/admin | `nonmanaged/proposed/20260828010000…:779-780` (service_role) | ✗ not deployed / not applied | **CAND-E-02** |
| `src/lib/flags.ts` `uploadFlagPhoto` / `commitFlagPhotoUpload` / `cancelFlagPhotoUpload`; `photos.ts` `addFlagPhoto`,`batchInsertFlagPhotos` | RPCs `prepare_flag_photo_upload`, `commit_flag_photo_upload`, `cancel_flag_photo_upload` | authenticated | `nonmanaged/proposed/…d1f4…sql:650-750` | ✗ not applied | **CAND-E-03** |
| `src/lib/users.ts` `uploadAvatar` | RPC `prepare_flag_photo_upload(p_kind='avatar')` → fallback legacy path + `users.update({avatar_url, avatar_object_key:null})`; RPC `commit_avatar_photo_upload` | authenticated | fallback keyed on `isFunctionMissing` | ✗ RPC absent → legacy path used | works (fallback); avatar_object_key guard trigger tolerates null→null |
| `src/lib/flags.ts` `FLAG_READ_SELECT` (adds `photo_object_key`); `photos.ts` (adds `object_key`); `users.ts` (adds `avatar_object_key`) | column reads | anon/authenticated | `20260830130000_promptb…sql:66-82` | ✓ applied | none |
| `src/lib/adminReports.ts:102-111` | `feedback.select(...moderation_reviewed_at, moderation_resolution, moderation_action_intent)` | admin | MOD1 `20260828050000…`, `…080000…` | ✗ not applied (42703) | AdminScreen queue errors — CAND-E-03 |
| `src/lib/adminReports.ts:237-247,273-277,305-311` | `feedback.update(moderation_*)` | admin | MOD1 column grants + policies | ✗ | same |
| `src/lib/flags.ts` `updateFlagStatus('rejected')` via `adminReports.rejectFlagReport` | `flags` status update | admin (UI-gated `isAdmin`) | MOD1 admin-only trigger `20260828040000…` | ✗ (prod guard allows anyone) | CAND-E-04 |
| `src/lib/accountDeletionReceipt.ts:58,102` | `expo-secure-store` (receipt secret, subject id) | device | `app.json` plugin `expo-secure-store` (b33 diff) | n/a | fine (native only; web refuses) |

## Candidate findings (most severe first)

### CAND-E-01: Build 33 account deletion contradicts the deployed delete-account v4 — account is deleted, user is told the request failed
SEVERITY_GUESS: HIGH
CATEGORY: safety
AFFECTED_STATE: SUBMITTED_BUILD_33 (client) + BACKEND (deployed v4 semantics)
CONFIDENCE: HIGH
CLAIM: The Build 33 client posts a D1F4 receipt to `delete-account` and only accepts `status==='requested'`, but production still runs v4, which anonymises flags, hard-deletes the auth user and returns `{status:'deleted'}` — so the client throws, never signs out, shows "Could not confirm deletion request", keeps a SecureStore receipt, and then polls `account-deletion-status`, which is not deployed.
EVIDENCE: `b33:src/lib/account.ts:19-23`
```
const { data, error } = await supabase.functions.invoke('delete-account', {
  method: 'POST', body: { operationId: receipt.operationId, receiptSecret: receipt.receiptSecret },
});
if (error) throw error;
if (!data || data.status !== 'requested') throw new Error('Deletion request was not accepted.');
```
`main:supabase/functions/delete-account/index.ts:88-91` — `adminClient.auth.admin.deleteUser(userId)` … `return jsonResponse(200, { status: 'deleted' });` (v4 ignores the body). `b33:src/screens/ProfileScreen.tsx:770-774` — generic failure notify "Could not confirm deletion request". `b33:src/lib/accountDeletionReceipt.ts:88-91` → `functions.invoke('account-deletion-status')` (not deployed per lead) → `SignInScreen.tsx:103-105` "status temporarily unavailable" forever.
WHY_IT_MATTERS: A user who deletes their account in Build 33 sees a failure message while their account, push token and profile are already gone; the still-cached session dies on next refresh with no explanation; the "Check status" surface can never confirm. Apple 5.1.1(v) expects a working, truthful deletion flow. Conversely, if the B33 Edge function set were deployed as-is, `delete-account` would 409 on every call (`request_account_deletion` is in `nonmanaged/proposed`, not applied) and nothing would ever be deleted (worker needs an external scheduler + secret: `b33:supabase/functions/account-deletion-worker/index.ts:1-3`).
VERIFICATION_NEEDED: Lead confirms deployed `delete-account` v4 body equals `main:supabase/functions/delete-account/index.ts` (returns `deleted`). Runtime (Sky, throwaway account on Build 33): tap Delete Account → observe alert text, then read-only `select count(*) from auth.users where id = '<uid>'` → expect 0.
HISTORICAL_RELATION: D1 / D1F4 / D1F4R2 / D1F4R3 (Codex 2026-08-27/28 reports), SR-010 (anonymise-not-erase), Prompt B B2-R.

### CAND-E-02: Build 33 flag deletion (owner and admin) depends on the undeployed `delete-flag` Edge route — no report can be deleted from the app
SEVERITY_GUESS: HIGH
CATEGORY: app-store
AFFECTED_STATE: SUBMITTED_BUILD_33 + BACKEND
CONFIDENCE: HIGH
CLAIM: Build 33 replaced the RLS-gated `flags.delete()` with `functions.invoke('delete-flag')`; that function is not deployed and its RPCs (`account_deletion_prepare_flag_delete`, `…finalize…`, `…storage_exact_object`) exist only in `nonmanaged/proposed`, so every owner delete and every admin "Remove" fails.
EVIDENCE: `b33:src/lib/flags.ts` (hunk `@@ -1362,107 +1430,26 @@`, `deleteFlag`):
```
const { data, error } = await supabase.functions.invoke('delete-flag', { body: { flagId } });
if (error) throw error;
if (!data || typeof data !== 'object' || (data as { status?: unknown }).status !== 'deleted') {
  throw new Error('Flag deletion did not reach a confirmed terminal result.');
```
`b33:supabase/functions/delete-flag/index.ts:43-47,64-68` (RPC calls); `b33:supabase/nonmanaged/proposed/20260828010000_d1f4r3_source_closure.sql:779-780` (grants, service_role only); `b33:src/lib/adminReports.ts:377-385` (`removeFlagReport` → `deleteFlag`).
WHY_IT_MATTERS: "Delete a flag — remove any flag you submitted" (`docs/PRIVACY_POLICY.md:129`) and the Apple 1.2(b) takedown lever both become dead controls in the submitted build; users cannot retract a report that exposes their location, admins cannot remove abusive content (only "reject", which is itself broken by the MOD1 gap — see CAND-E-03/04).
VERIFICATION_NEEDED: Runtime on Build 33: FlagDetailModal → Delete on own flag → expect error; lead's function list already shows `delete-flag` absent.
HISTORICAL_RELATION: SR-050 (takedown gap), D1F4R3-FIX2 (`nonmanaged/proposed/20260828020000…:189-200`).

### CAND-E-03: Build 33 client calls RPCs/columns that production does not have (photo upload intents, moderation queue) — photo reports and the admin queue fail
SEVERITY_GUESS: HIGH
CATEGORY: app-store
AFFECTED_STATE: SUBMITTED_BUILD_33 + BACKEND
CONFIDENCE: HIGH
CLAIM: Only `20260830130000_promptb_media_key_read_contract` (columns) is applied; the D1F4 upload-intent RPCs and the MOD1 `feedback.moderation_*` columns are not, so `uploadFlagPhoto` throws before `createFlag` (any report with a photo fails outright), `addFlagPhoto`/`batchInsertFlagPhotos` cannot commit, and `listOpenReports` selects non-existent columns (42703) so the AdminScreen queue never loads.
EVIDENCE: `b33:src/lib/flags.ts` (`uploadFlagPhoto`, hunk `@@ -858,19 +858,61 @@`):
```
const { data, error } = await supabase
  .rpc('prepare_flag_photo_upload', { p_extension: finalExt, p_kind: 'flag_photo' })
  .single();
if (error || !data) throw error ?? new Error('Photo upload could not be prepared.');
```
`b33:src/screens/ReportFlagModal.tsx:716-719` (uploads run BEFORE `createFlag`; the outer `catch` at `:789` fails the whole submit). `b33:src/lib/adminReports.ts:82,103-110` (`REPORT_SELECT` includes `moderation_reviewed_at, moderation_resolution, moderation_action_intent`). `b33:supabase/nonmanaged/proposed/2026-08-27_d1f4_async_account_deletion.sql:650-750` (RPC definitions, proposed only); `b33:supabase/migrations/20260828050000_mod1_admin_report_queue.sql:17-20` (columns, not applied per lead). Avatar upload is the one path with a fallback (`b33:src/lib/users.ts` `isFunctionMissing` → legacy `<uid>/avatar/<ts>` + direct `users.update`).
WHY_IT_MATTERS: Photo evidence is a core report feature; the EXIF-stripping privacy gate now sits behind a call that always fails. The moderation queue (Apple 1.2(b) triage) is inoperable in the build that was submitted. Not a privacy leak, but the lead asked what a Build 33 client does against undeployed routes — this is the complete list with CAND-E-01/02.
VERIFICATION_NEEDED: Runtime on Build 33: Report with one photo → expect failure toast; Admin tab → Reports → expect load error. Lead's applied-migration list already implies both.
HISTORICAL_RELATION: Prompt B B2 (Groups 4/6/7 deferred), MOD1 / MOD1R FIX1/FIX2, D1F4.

### CAND-E-04: Any signed-in user can permanently "reject" any accessibility report — offered on every Tasks card in main; MOD1 admin-only guard not applied
SEVERITY_GUESS: HIGH
CATEGORY: safety
AFFECTED_STATE: BOTH (BACKEND allows it in both; main UI exposes it to everyone, Build 33 UI hides it behind `isAdmin` but REST remains open)
CONFIDENCE: HIGH
CLAIM: The live transition guard permits `open→rejected` and `verified→rejected` for every authenticated user, the status-update policy is `using(true)`, `rejected` is terminal in production (only `resolved→open` reopens), and rejected rows are excluded from every default view — so one account can bury every report on the map with no restore path; main's Tasks screen puts a "Reject" button on every card.
EVIDENCE: `main:supabase/migrations/2026-08-19_flag_status_transition_guard_APPLIED.sql:53-58`
```
if (old.status = 'open'     and new.status in ('verified', 'resolved', 'rejected'))
or (old.status = 'verified' and new.status in ('resolved', 'rejected'))
or (old.status = 'resolved' and new.status = 'open')
```
`main:supabase/migrations/2026-06-01_flags_policy_consolidation.sql:41-46` (`using (true) with check (true)`); `main:src/screens/TasksScreen.tsx:1842-1849` (`key: 'reject' … onSetStatus(flag.id, 'rejected', isOwn)` unconditional) and `src/components/FlagDetailModal.tsx:670` (`canReject = status === 'open' || status === 'verified'`); `main:src/lib/flags.ts:1670` (`DEFAULT_STATUSES = ['open','verified']`). Fix exists only in `b33:supabase/migrations/20260828040000_mod1_moderation_release_safety.sql:7-12,53-61` (NOT applied per lead); Build 33 UI gate: `b33:src/screens/TasksScreen.tsx:1965-1971`, `FlagDetailModal.tsx:1347`.
WHY_IT_MATTERS: Disabled users depend on reports staying visible; a single hostile or careless account can hide all of them (no rate limit on status writes, no audit surfaced to the reporter, no restore transition). Reporter push notification does not fire for `rejected` (`notify-flag-status/index.ts:40,185`), so victims are not even told.
VERIFICATION_NEEDED: Lead: `pg_get_functiondef('public.enforce_flag_status_transition')` on prod — confirm the 2026-08-19 body (no admin check on open/verified→rejected). Runtime: non-admin account, Tasks → Reject on another user's flag → succeeds.
HISTORICAL_RELATION: MOD1 CHECKPOINT A (2026-08-28), Q16/D27 (owner self-triage decision, art-direction build 02 HANDOFF), F53.

### CAND-E-05: `users.points` / `streak_days` / `email` remain client-writable on the user's own row (SR-048 / R-10 still open; fix migration named in ROADMAP was never committed)
SEVERITY_GUESS: HIGH
CATEGORY: data-integrity
AFFECTED_STATE: BOTH + BACKEND (unfixed in either tree; B33's proposed D1F4 rewrite still does not pin points)
CONFIDENCE: HIGH
CLAIM: The `users update own row` policy pins only `is_admin`; the 2026-05-27 grant work scoped SELECT only, and no migration in either tree revokes/limits UPDATE columns, so `PATCH /rest/v1/users?id=eq.<me> {"points":999999}` forges leaderboard rank, tier, achievements and streaks (and lets a user rewrite the `public.users.email` mirror).
EVIDENCE: `main:supabase/migrations/2026-05-30_admin_role.sql:34-43`
```
CREATE POLICY "users update own row" ON public.users FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id
    AND is_admin IS NOT DISTINCT FROM (SELECT is_admin FROM public.users WHERE id = (SELECT auth.uid())))
```
`main:supabase/migrations/2026-05-27_users_email_privacy.sql:175-180` (SELECT-only column scoping); grep of both trees for `grant update|revoke update` on `public.users` → none; `docs/ROADMAP.md:68` references `2026-05-29_restrict_users_update_columns.sql` — `git log --all --diff-filter=A -- '*restrict_users_update_columns*'` returns nothing; `b33:supabase/nonmanaged/proposed/2026-08-27_d1f4_async_account_deletion.sql:280-289` pins `is_admin`, `avatar_url`, `avatar_object_key` only.
WHY_IT_MATTERS: The public leaderboard, monthly board (when applied) and "spam penalty" mechanics become meaningless; `point_events` will contradict totals. Not a privacy leak, but a trivially exploitable integrity hole in a community-trust system.
VERIFICATION_NEEDED: Lead (read-only): `select column_name from information_schema.column_privileges where table_name='users' and grantee='authenticated' and privilege_type='UPDATE'` (expect all columns) and `pg_policies` `with_check` for "users update own row". No live write test.
HISTORICAL_RELATION: SR-048 (HIGH, `design-reviews/ship-ready/01_functionality_findings.md:144`), R-10 (`05_THE_SUBMISSION_GAP_LIST.md:35`), ROADMAP "Points Self-Write RLS".

### CAND-E-06: Un-versioned live `flags_user_scoped` FOR ALL policy lets owners edit ANY column of their own flags after verification, defeating the "owner edit open-only / immutable lat-lng" contract
SEVERITY_GUESS: MEDIUM
CATEGORY: data-integrity
AFFECTED_STATE: BACKEND (live) — absent from CURRENT_MAIN source; recorded in Build 33's reconstructed chain; only Build 33's un-applied migrations drop it
CONFIDENCE: HIGH (logic) / MEDIUM (exact live body — lead saw the policy exists; body per B33 reconstruction and DECISIONS.md)
CLAIM: `flags_user_scoped` (`FOR ALL USING/WITH CHECK user_id = auth.uid()`) is OR-ed with `flags owner edit open`, so the owner-edit restrictions (status must be `open`; lat/lng/user_id/created_at/status pinned) are bypassable for any own row; the non-owner revert trigger exempts owners and the transition guard checks only status.
EVIDENCE: `b33:supabase/migrations/20260528180513_d1_flags_rls.sql:13-16`
```
CREATE POLICY "flags_user_scoped" ON public.flags
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```
Contract it defeats: `main:supabase/migrations/2026-05-25_flag_edit_rls_replacement.sql:114-136`; owner exemption: `main:supabase/migrations/2026-05-23_status_update_trigger_proposal.sql:90-92`; main never drops it (only `flags_auth_user_only` at `2026-06-01_flags_policy_consolidation.sql:48`); `design-reviews/ship-ready/DECISIONS.md:30` graded it PASS as "owner-scoped" without considering the OR with the open-only policy. Build 33 drops it only in `schema.sql:359` and `nonmanaged/proposed/…fix2…:198` (not applied).
WHY_IT_MATTERS: A verified/resolved report can be silently relocated or re-described by its owner via REST (`flag_edit_history` is never written by any client — grep shows no writer), undermining community verification; a fresh bootstrap from main cannot reproduce live behaviour either way (see CAND-E-14).
VERIFICATION_NEEDED: Lead: `pg_get_expr(polqual/polwithcheck)` for `flags_user_scoped` on prod (confirm `user_id = auth.uid()`, cmd `*`). Runtime (throwaway data): owner PATCHes `lat` on own `verified` flag → expect success.
HISTORICAL_RELATION: SR-039 / §C-0a / R-4 (`04_appstore_readiness.md:175-176,252`), J3-3, SR-090 (A4-3).

### CAND-E-07: Points economy is farmable through dead-but-writable tables, uncapped triggers and owner self-triage
SEVERITY_GUESS: MEDIUM
CATEGORY: data-integrity
AFFECTED_STATE: BOTH + BACKEND
CONFIDENCE: HIGH (source logic; no client writer exists, but REST with a user JWT suffices)
CLAIM: (a) `comment_votes` allows own delete + re-insert and `handle_comment_vote_added` counts only current rows, so one sock-puppet vote can be cycled to award the author +2 indefinitely; (b) `handle_comment_added` awards +1 per comment with no cap/dedupe and comments are self-deletable; (c) an owner may Verify/Resolve their own flag (UI offers it; policy is `using(true)`), earning the reporter +10/+15 with no second party; (d) `increment_reopen_request` has no per-user dedupe, so resolved→open→resolved cycles re-award (documented as open).
EVIDENCE: `main:supabase/migrations/2026-05-30_trust_score_system.sql:100-104` (delete own vote) and `:291-297`
```
SELECT COUNT(*) INTO total_votes FROM public.comment_votes WHERE comment_id = NEW.comment_id;
IF total_votes <= 10 THEN
  UPDATE public.users SET points = points + 2 WHERE id = comment_author;
```
`:247-270` (comment +1, no cap); `main:supabase/schema.sql:154-158,178-184` (reporter bonus keyed on `new.user_id` only) with `src/components/FlagDetailModal.tsx:668-669` (`canVerify = status === 'open'` — no `isOwn` check) and `src/screens/TasksScreen.tsx:1823-1841`; `main:supabase/migrations/2026-08-19_flag_status_transition_guard_APPLIED.sql:31-36` (reopen farming acknowledged).
WHY_IT_MATTERS: Leaderboard/tier/achievement integrity; cheap to exploit, hard to detect (point_events dedupe absent). Compounds CAND-E-05.
VERIFICATION_NEEDED: Lead: confirm live bodies of `handle_comment_vote_added` / `handle_comment_added` match source (`pg_get_functiondef`). Owner self-verify reachability is a shipped decision (Q16) — no test needed.
HISTORICAL_RELATION: SW-53 (schema.sql:124-136), SR-085 / SR-098 / A7-1 (comment_votes dead table), Q16/D27, P2/P12 (`qa-reports/qa-2026-08-18-deep-sweep.md`).

### CAND-E-08: Authenticated INSERT can create a flag directly in `verified`/`resolved`/`rejected` — status is pinned only for anon; MOD1R FIX1 restrictive policy not applied
SEVERITY_GUESS: MEDIUM
CATEGORY: data-integrity
AFFECTED_STATE: BOTH + BACKEND
CONFIDENCE: HIGH
CLAIM: `flags insert own` checks only `uid = user_id`; the transition guard is `BEFORE UPDATE OF status`, so a REST INSERT with `status:'verified'` lands as community-verified without any verifier; only the anon policy pins `status='open'`.
EVIDENCE: `main:supabase/migrations/2026-05-23_rls_initplan_and_non_owner_status_update.sql:57-61` (`with check ((select auth.uid()) = user_id)`); `b33:supabase/migrations/20260602053139_flags_policy_consolidation_20260601.sql:15-22` (anon pins `status='open'`); fix only in `b33:supabase/migrations/20260828060000_mod1r_fix1_report_and_insert_authz.sql:63-66` (`flags_insert_status_open_only … as restrictive for insert with check (status = 'open')`) — not applied per lead.
WHY_IT_MATTERS: Fake "verified" barriers (or pre-rejected spam that never appears in Tasks) corrupt the trust signal the Tasks triage flow exists to produce; `flag_status_history` records `from_status NULL → verified` as if genuine.
VERIFICATION_NEEDED: Lead: `pg_policies` on `public.flags` for cmd INSERT (confirm no restrictive status policy). No live write test.
HISTORICAL_RELATION: MOD1R FIX1 Blocker 3.

### CAND-E-09: Account deletion (deployed v4 / main) leaves Storage photos, avatar selfies and `feedback.contact_email` behind, and the anonymised flags keep the deleted user's UUID in `photo_url`
SEVERITY_GUESS: MEDIUM
CATEGORY: privacy
AFFECTED_STATE: CURRENT_MAIN + BACKEND (this is what runs today; Build 33's D1F4 worker would fix it but is not deployed)
CONFIDENCE: HIGH
CLAIM: v4 only nulls `flags.user_id` and deletes the auth user; nothing removes `flag-photos/<uid>/…` objects (public bucket), the avatar object(s), or `feedback.contact_email`; every anonymised flag's `photo_url` still embeds `<uid>/`, re-linking all of a deleted person's "anonymous" reports to one stable identifier, and the published policy promises more than the code does.
EVIDENCE: `main:supabase/functions/delete-account/index.ts:79-89` (only `flags.update({user_id:null})` then `deleteUser`); `main:src/lib/flags.ts:869` (`${uid}/${Date.now()}.${finalExt}`) and `src/lib/users.ts:96` (`${uid}/avatar/${Date.now()}`); `main:supabase/schema.sql:459-461` (bucket `public: true`); `main:supabase/migrations/2026-05-23_feedback_table.sql:62,65-68` (`user_id … on delete set null`, `contact_email` retained); `docs/PRIVACY_POLICY.md:132` — "This deletes your email, display name, avatar, all your flags, and all associated photos" (flags are anonymised, photos/avatars persist); the published page is more honest (`docs/privacy/index.html:134` "Photos attached to your reports may remain").
WHY_IT_MATTERS: PIPEDA right-to-erasure: a selfie avatar and barrier photos stay world-readable at their old URLs indefinitely; the uid folder makes "anonymous" reports groupable (pattern-of-life over a person's neighbourhood). Old avatars are also never deleted on change (each upload is a new timestamped object).
VERIFICATION_NEEDED: Lead (read-only): count `storage.objects` whose `(storage.foldername(name))[1]` has no matching `public.users.id`; sample `flags.photo_url` where `user_id is null`.
HISTORICAL_RELATION: SR-010, D1 Option A / D1F4 (`b33:supabase/functions/_shared/accountDeletionWorkerCore.ts:103-116` storage plan), R-1 (server-side sweep).

### CAND-E-10: A 64-hex webhook shared secret is committed verbatim in Build 33's managed migration chain
SEVERITY_GUESS: MEDIUM (HIGH if the Vault `webhook_secret` was never rotated after the 2026-06-03 Vault move)
CATEGORY: security
AFFECTED_STATE: SUBMITTED_BUILD_33 (tree); not present in CURRENT_MAIN
CONFIDENCE: HIGH (literal present) / LOW (whether still valid)
CLAIM: `20260529181141_notify_flag_status_webhook_trigger.sql` — "exact hosted-recorded SQL, verbatim" — carries the original `X-Webhook-Secret` value inline; whoever holds the current value can call `notify-flag-status` (verify_jwt=false) and push arbitrary "verified/resolved" notifications to any `user_id` with a token.
EVIDENCE: `b33:supabase/migrations/20260529181141_notify_flag_status_webhook_trigger.sql:19-24` (value not reproduced here; 64 hex chars; present in exactly one file in the B33 tree, zero in main)
```
PERFORM net.http_post(
  url     := 'https://kldlwszpfkdmsjrjhjym.supabase.co/functions/v1/notify-flag-status',
  headers := jsonb_build_object('Content-Type','application/json','X-Webhook-Secret', '<64-hex literal>'),
```
`main:supabase/migrations/2026-06-01_flags_policy_consolidation.sql:65-68` (follow-up #1: "Hardcoded webhook secrets … Rotate both + move to Vault"); current design reads Vault (`main:supabase/schema.sql:275-276`, `functions/notify-flag-status/index.ts:61-81`).
WHY_IT_MATTERS: Push-notification spam/social-engineering vector against every opted-in user; repo history is durable even if the file is later removed.
VERIFICATION_NEEDED: Lead (read-only, no value printed): confirm `vault.decrypted_secrets` `webhook_secret` was rotated after 2026-06-03 (compare length/prefix hash offline, or confirm rotation in `security-audit/2026-07-31/phase-b/FORK_S1_credential_rotation.md` outcome). If not rotated: rotate.
HISTORICAL_RELATION: SR-018 / S-6 / IO-4 / X-2 (verify_webhook_secret oracle), FORK_S1 credential rotation, "FOLLOW-UPS DISCOVERED 1" (2026-06-01).

### CAND-E-11: App Store reviewer test-account credentials committed in both trees (locations only)
SEVERITY_GUESS: MEDIUM
CATEGORY: security
AFFECTED_STATE: BOTH (DOCS + SQL)
CONFIDENCE: HIGH (present) / UNKNOWN (whether the account exists with that password)
CLAIM: The reviewer account e-mail and password appear in tracked files; if the account was created as instructed, anyone with repo access can sign in as it (and it has `authenticated` privileges, i.e. every write path above).
EVIDENCE: `main:supabase/migrations/2026-05-31_reviewer_test_account.sql:9-10` (email + `Password …` line; value suppressed); `b33:supabase/nonmanaged/destructive-data/2026-05-31_reviewer_test_account.sql` (same); `docs/APP_STORE_REVIEWER_NOTES.md:8,25`; ~40 further qa-report/design-review lines (grep `reviewer.{0,40}password`, list in method).
WHY_IT_MATTERS: A live shared credential in source; also the seeded reviewer flags include a fixed display name that appears on the public leaderboard.
VERIFICATION_NEEDED: Lead (read-only): `select 1 from auth.users where email = 'reviewer@accessmap.com'`; confirm rotation per `qa-reports/PROMPT_0.1_credential_rotation.md`.
HISTORICAL_RELATION: PROMPT_0.1 credential rotation, S-1/S-2 (LENS1 secrets exposure).

### CAND-E-12: Any signed-in user can enumerate all users and identify admins (`is_admin` column grant + `using(true)` row policy)
SEVERITY_GUESS: MEDIUM
CATEGORY: privacy
AFFECTED_STATE: BOTH + BACKEND
CONFIDENCE: HIGH
CLAIM: `GET /rest/v1/users?select=id,display_name,avatar_url,created_at,points,is_admin&is_admin=eq.true` works for every authenticated user, exposing who the moderators are — the exact targeting risk W6-1 was written to prevent for verifiers.
EVIDENCE: `main:supabase/schema.sql:333-336` (`users readable by authenticated … using (true)`); `main:src/lib/admin.ts:40-41` and `b33:supabase/migrations/20260818211920_reconcile_oob_grant_select_is_admin_for_replay_20260829.sql:57` (`grant select (is_admin) on public.users to authenticated;` — table-wide, not own-row); `main:src/lib/flags.ts:1683-1688` (W6-1 rationale).
WHY_IT_MATTERS: Admins can be singled out for harassment or targeted with abusive reports; full user-directory enumeration (ids, names, avatars, join dates) is also more than the leaderboard needs.
VERIFICATION_NEEDED: Lead: `information_schema.column_privileges` for `users.is_admin` (already known granted) — the row policy is the other half; runtime REST query as a non-admin.
HISTORICAL_RELATION: W6-1 (leaderboard verifier identity), A1 (device-fixes 2026-08-18 is_admin grant).

### CAND-E-13: `zz_backup_*_20260818` purge snapshots may still exist in `public` without RLS (PostgREST-exposed to anon/authenticated)
SEVERITY_GUESS: LOW (MEDIUM if present)
CATEGORY: privacy
AFFECTED_STATE: BACKEND / UNKNOWN
CONFIDENCE: LOW (existence unverified; the sibling `bk_2026_08_22_*` set was contained out-of-band)
CLAIM: The 2026-08-18 purge created seven `create table … as select *` snapshots in `public` (flags with user_ids, status history with user_ids, point_events, comments); Supabase's default grants expose `public` tables to PostgREST unless RLS is enabled, and the only recorded containment (D1SA) covers the `bk_2026_08_22_*` set, not these.
EVIDENCE: `main:supabase/migrations/2026-08-18_purge_test_flags.sql:19-25` (`create table if not exists public.zz_backup_flags_20260818 as select * from public.flags; …`) and `:82-87` (drop step optional/deferred); `main:supabase/migrations/2026-08-22_takedown_junk_flags_APPLIED.sql:335-337` ("These bk_* tables live in the public schema, so PostgREST will expose them unless RLS denies"); `b33:supabase/nonmanaged/live-out-of-band/2026-08-27_d1sa_deployed_security_containment.sql:34-53` (RLS+revokes for `bk_2026_08_22_*` only).
WHY_IT_MATTERS: Historical per-user rows (including deleted/rejected flags with `user_id`) would be readable by any anon-key client.
VERIFICATION_NEEDED: Lead: `select relname, relrowsecurity from pg_class where relname like 'zz_backup%' or relname like 'bk_2026%'` plus `information_schema.role_table_grants` for anon/authenticated on them.
HISTORICAL_RELATION: D1S-A F1.

### CAND-E-14: CURRENT_MAIN's migration set no longer reproduces the live posture (fresh bootstrap from main is less secure/buggier than prod)
SEVERITY_GUESS: LOW
CATEGORY: security
AFFECTED_STATE: CURRENT_MAIN (source) / DOCS_ONLY for prod
CONFIDENCE: HIGH
CLAIM: main lacks files for objects that are live: the `flags owner edit open` alias fix (SR-090), `context_tags` revert in the non-owner trigger, `flag_photos` anon-explicit and owner-scoped INSERT (D1SA), admin comment delete, admin Storage delete, `is_admin` column grant, dispute counter, `flag_comments.user_id` default, D1SA account-row gates, `bk_*` containment; and `main:supabase/migrations/2026-06-01_flag_photos_insert_guard.sql` is still labelled PROPOSE-ONLY while `schema.sql`'s own header warns it is unsafe to re-run.
EVIDENCE: `main:supabase/migrations/2026-07-27_drift_capture_flags_owner_edit_open_policy.sql:57-73` (broken body captured, fix absent — fix is `b33:…20260727075512_a4_3…`); `main:supabase/migrations/2026-05-30_flag_photos_junction.sql:47-50` (`with check (true)`) vs live `b33:…d1sa…sql:98-115`; `main:supabase/schema.sql:4-11` (do-not-re-run warning); Build 33 carries the reconciled managed chain (`git diff --stat` shows 40+ reconstructed files).
WHY_IT_MATTERS: Disaster recovery / staging from main would resurrect SQLSTATE-21000 owner edits, the flag_photos URL-injection hole and the verify_webhook_secret oracle-free state only by luck; audits reasoning from main's tree (as this one must) cannot see live protections.
VERIFICATION_NEEDED: none beyond the lead's applied-migration list; optionally confirm live `flag_photos` INSERT `with_check` matches D1SA.
HISTORICAL_RELATION: F3 (2026-06-01), SR-090/A4-3, A2-1, SR-024, SR-001, SR-050, D1S-A, migration-history truth repair (2026-08-28).

### CAND-E-15: Global anonymous caps (100 flags/h, 30 feedback/h) are single-attacker denial-of-service switches for all guests
SEVERITY_GUESS: LOW
CATEGORY: safety
AFFECTED_STATE: BOTH + BACKEND
CONFIDENCE: HIGH
CLAIM: Server-side anon limits are global counters keyed on nothing (no IP/device by Jordan constraint), and the per-device 5/24h limit is AsyncStorage-only; one script can exhaust both caps every hour, blocking every guest report and every guest abuse-report (the report modal then degrades to mailto).
EVIDENCE: `main:supabase/migrations/2026-07-27_drift_capture_live_flag_insert_throttles.sql:103-111` (`WHERE user_id IS NULL AND created_at > NOW() - INTERVAL '1 hour' … >= 100 → raise`); `b33:supabase/migrations/20260727075623_a2_2_feedback_anon_throttle_20260727.sql:20-27` (30/h global); `main:src/lib/anonRateLimit.ts:3-5` (client-only 5/24h); `main:src/lib/reports.ts:226-232` (report insert IS the channel; `skipped → failed`).
WHY_IT_MATTERS: Availability of the guest reporting path App Review exercises first; abuse reports from guests can be suppressed by flooding.
VERIFICATION_NEEDED: none (design trade-off recorded); optionally Supabase dashboard per-IP rate limits on `/rest/v1/flags` POST.
HISTORICAL_RELATION: SR-007 / C-5 / C-7, Jordan hard constraints (no IP/device ID).

### CAND-E-16: Web build caches every `*.supabase.co` GET (including `/auth/v1/user` with e-mail) in Cache Storage; purge depends on `signOut()` running; CSP is report-only
SEVERITY_GUESS: LOW
CATEGORY: privacy
AFFECTED_STATE: WEB_BUILD
CONFIDENCE: MEDIUM
CLAIM: The service worker NetworkFirst rule stores successful Supabase GETs keyed by URL only; `signOut()` sweeps `accessmap-*` caches, but a session that expires or a tab that is simply closed leaves the previous user's `/auth/v1/user` (id, email) and per-user rows available to the offline fallback on a shared browser; `Content-Security-Policy-Report-Only` enforces nothing.
EVIDENCE: `main:public/sw.js:106-120` (`url.hostname.endsWith('.supabase.co') … cache.put(request, response.clone())`); `main:src/lib/supabase.ts:101-130` (purge only inside `signOut`); `main:vercel.json:20-21` (`Content-Security-Policy-Report-Only`).
WHY_IT_MATTERS: Shared/public computers; low likelihood, contained blast radius (own identity/rows only).
VERIFICATION_NEEDED: Runtime (web): sign in, go offline without signing out, sign in as another user → check DevTools Cache Storage for `/auth/v1/user`.
HISTORICAL_RELATION: PL-2 / IO-5 (partially fixed), PL-5, IO-2 (PKCE).

### CAND-E-17: Published/repo privacy and security docs make claims the code does not implement (or implements more safely)
SEVERITY_GUESS: LOW
CATEGORY: app-store
AFFECTED_STATE: DOCS_ONLY
CONFIDENCE: HIGH
CLAIM: `docs/PRIVACY_POLICY.md` (repo copy) says deletion removes flags and photos (`:132`; code anonymises and keeps photos — CAND-E-09), says "if processing fails, we keep the original photo" (`:228`; code is fail-closed — `src/lib/flags.ts:797-800`), promises retention jobs that do not exist in source ("Notifications 30 days", "Audit logs 30 days", "flags resolved + 90 days archived", `:178-181`; also `docs/privacy/index.html:188-190`); `docs/SUPABASE_SECURITY.md:57` asks to "verify uploaded photos don't expose user identity in their URL" while object keys are `<uid>/…` (`src/lib/flags.ts:869`), and `:87` names a `NOTIFY_WEBHOOK_SECRET` env var the code no longer uses (Vault RPC, `functions/notify-flag-status/index.ts:58-60`); `app.json:5` privacy URL points at the new host while `docs/privacy/index.html` (old GitHub Pages copy) still ships in the repo with divergent text.
EVIDENCE: lines cited inline above.
WHY_IT_MATTERS: App Review and regulators compare the policy to behaviour; "Data Retention" rows that name jobs which do not exist are the riskiest. The published page correctly states no analytics/crash reporting (`docs/privacy/index.html:84`) — true: `src/lib/analytics.ts` is a `__DEV__`-only stub and `package.json` has no Sentry/analytics SDK.
VERIFICATION_NEEDED: Lead: fetch the live `https://skypistudio.com/flagstone/privacy/` text and diff against `docs/PRIVACY_POLICY.md` claims above (network step, not done here).
HISTORICAL_RELATION: C-2 (lens-9 claims, 2026-07-31), Jordan privacy conditions, §SKY-6.

### CAND-E-18: Hygiene notes (no single fix; grouped)
SEVERITY_GUESS: NOTE
CATEGORY: security
AFFECTED_STATE: BOTH unless stated
CONFIDENCE: HIGH
CLAIM/EVIDENCE:
- `main:supabase/functions/delete-account/index.ts:93-96` returns the raw upstream error message to the client (`error: message`) — leaks Postgres/GoTrue wording; B33 handlers return opaque bodies.
- `main:supabase/functions/send-push-notification/index.ts:62-64` compares `SEND_PUSH_SECRET` with `===` (non-constant-time); B33 review/worker use a digest compare (`account-deletion-worker/index.ts:317-323`).
- `main:src/lib/supabase.ts:11-14,25-29` persists the Supabase session (refresh token) in AsyncStorage (plaintext file in the app sandbox) on native; B33 adds `expo-secure-store` for deletion receipts only.
- `main:src/lib/errors.ts:86-97` passes unrecognised server messages verbatim to alerts (constraint/trigger names surface; B33 hardens only the location path — `b33:src/lib/location.ts` `locationErrorMessage`).
- Maintainer personal e-mail is hard-coded as an authorization key in SQL policies (`main:supabase/migrations/2026-05-23_feedback_table.sql:116`, `2026-05-24_status_history_table.sql:180`, `2026-05-25_flag_edit_history_table.sql:155`) and appears in `eas.json:68`; Nominatim `User-Agent` carries the support address (`src/lib/geocode.ts:28`).
- `supabase/.temp/linked-project.json` and `.temp/cli-latest` are tracked (project ref only — public in URLs anyway).
- `main:supabase/schema.sql:246-256,265` + `2026-06-03_verify_webhook_secret.sql:32` — main's own tree still contains the superseded `GRANT … TO anon, authenticated` (commented as superseded) — bootstrap order risk only.
- `notify_flag_status_webhook` posts the full old/new flag row (lat/lng/description) to the Edge Function over pg_net — same project, HTTPS; acceptable but worth knowing (`main:supabase/schema.sql:281-287`).
- B33 `supabase/config.toml:9-10` sets `verify_jwt = false` for `delete-account`; the handler self-validates (`b33:supabase/functions/delete-account/index.ts:22-26`), so no gap, but the gateway layer is deliberately removed.
- `.husky/pre-commit:50-52` scans for `service_role`+`eyJ` only; a hex webhook secret (CAND-E-10) or a reviewer password would pass it.
WHY_IT_MATTERS: Defence-in-depth and incident-response friction; none individually exploitable.
VERIFICATION_NEEDED: none.
HISTORICAL_RELATION: F63/F50 (sign-out), S-2, IO-2.

## Main vs Build 33 security delta (summary + file list)

`git diff --stat origin/main f5594171 -- supabase src/lib src/moderation` → 152 files, +11 558 / −1 071 (functions + src/lib subset: 35 files, +4 105 / −1 064).

Posture Build 33 has that main lacks (source-level; deployment status per lead in brackets):
- Reconciled managed migration chain (`supabase/migrations/2026MMDDhhmmss_*`) that matches the hosted ledger through `20260830130000` [applied], incl. the 2026-07-27 hardening set (sr009 null-safe verifications, fork2 OA actor guard + history insert, a4_3 owner-edit alias fix, sr024 flag_photos anon explicit, a2_1 context_tags revert, a2_2 feedback anon throttle, sr001 admin delete comment, a4_1 view grant fix, initplan consolidation, fork5 W1 dispute), sr050 admin Storage delete, is_admin grant reconciliation, verify_webhook_secret reconciliation, promptb media-key read contract [all applied].
- `nonmanaged/live-out-of-band/2026-08-27_d1sa_deployed_security_containment.sql` [live per its own header; not in ledger]: RLS+revokes on `bk_2026_08_22_*`, users-row requirement on Storage upload/delete, owner-scoped `flag_photos` INSERT, account-row gate on status triage and counter RPCs, EXECUTE revoke on the transition guard.
- MOD1/MOD1R (`20260828040000…080000`) [NOT applied]: admin-only reject/restore, restrictive `[REPORT]` read policy, `flags_insert_status_open_only`, moderation queue columns/grants, pending-close + pre-action intent.
- D1F4 async account deletion (`nonmanaged/proposed/*d1f4*`, Edge `delete-account` v-next, `account-deletion-{status,worker,review}`, `delete-flag`) [NOT applied / NOT deployed]: server-owned photo provenance, upload intents, canonical Storage-first deletion, receipt capability, review pipeline, account write fence (`current_account_can_write()`), Auth deletion last.
- Client: `SecureStore`-held deletion receipts (`accountDeletionReceipt.ts`), web deletion refusal (`accountDeletionAvailability.ts`), push-education gating (`auth.tsx`), `FLAG_READ_SELECT` omitting `photo_uploader_id`, display-URL derivation from server keys (no URL parsing), admin `Reject` gated by `isAdmin`, `locationErrorMessage` hardening, `adminReports.ts` queue, Edge CORS/opaque-error discipline, constant-time secret compares in new functions.

Posture main has that Build 33 lacks:
- A working (if privacy-incomplete) deletion path against the deployed backend (`src/lib/account.ts` ↔ v4) and working owner/admin flag delete via RLS (`src/lib/flags.ts:1401-1424`) and working photo upload/junction insert (`src/lib/photos.ts:72-76,104`) — Build 33 trades all three for undeployed server routes (CAND-E-01/02/03).
- The drift-capture provenance files under `supabase/migrations/2026-07-27_drift_capture_*` remain in both trees (B33 moves them to `nonmanaged/rollback-recovery/`).
- Main's tree contains no literal webhook secret (CAND-E-10) and no `supabase/config.toml` disabling gateway JWT verification.

Key files (B33 additions): `supabase/config.toml`; `supabase/functions/_shared/{cors,supabase,accountDeletionReviewCore,accountDeletionWorkerCore}.ts`; `supabase/functions/{account-deletion-review,account-deletion-status,account-deletion-worker,delete-flag}/index.ts`; rewritten `supabase/functions/delete-account/index.ts`; `supabase/migrations/2026052…20260830…` (reconstructed chain); `supabase/nonmanaged/{proposed,live-out-of-band,manual,destructive-data,rollback-recovery}/…`; `supabase/tests/*.sql`; `src/lib/{accountDeletionAvailability,accountDeletionReceipt,adminReports}.ts`; modified `src/lib/{account,auth.tsx,flags,photos,users,location,copy}.ts`; `src/types/database.ts` (+95).

## Things that look fine (brief)
- Secrets: no JWTs/service-role keys/PEM blobs in either tracked tree (grep with redaction); `.env` untracked and git-ignored; `.husky/pre-commit` secret scan present; Edge Functions read keys from `Deno.env` only; anon key is public-by-design.
- `users.email` column privacy: revoked for anon/authenticated, own-row view `users_self_email`; client never selects `email` (`src/lib/users.ts:50-55`).
- Webhook chain: `verify_webhook_secret` EXECUTE revoked from anon/authenticated (`schema.sql:265`, sr018) and reconciled in B33; `notify-flag-status` validates via service-role RPC, returns a uniform `ok` (no oracle), forwards only to `send-push-notification` which requires `SEND_PUSH_SECRET`, never logs tokens, caps title/body/data sizes.
- Photo pipeline (both trees): scheme allow-list, extension allow-list, 10 MB cap, magic-byte sniff, fail-closed EXIF strip (native re-encode / web canvas), byte-level APP1/APP9/APP13/eXIf splice, structural post-strip verifier, MIME/extension derived from bytes, `upsert:false` (`src/lib/flags.ts:740-854`); avatar uses the same helper (`src/lib/users.ts:87-102`); only `ph://`/`file://`-class URIs accepted, `http(s)` refused.
- Location: foreground-only permission, `Accuracy.Balanced`, passive surfaces never prompt (`src/lib/location.ts:133-149,207-232`), no background location plugin (`app.json:131-132`), share/export round to 5–6 decimals of the *flag* coordinate; `reverseGeocode` (`src/lib/geocode.ts:108`) has zero callers in either tree, so the published "never your GPS location" Nominatim claim holds for shipped paths.
- Analytics/telemetry: `src/lib/analytics.ts` is a `__DEV__` console stub with a PII denylist; no Sentry/PostHog/Firebase in `package.json`; `eas.json` `SENTRY_DISABLE_AUTO_UPLOAD` is vestigial.
- AsyncStorage at rest holds preferences, per-user ids, the 24 h offline flags cache (public rows, user-scoped key, cleared on sign-out) and the push-enabled flag — no e-mail/password/tokens beyond the Supabase session itself.
- Deep links: `accessmap://flag/{id}` and the https twin carry only a flag id; invalid ids are swallowed (`src/screens/MapScreen.tsx:1415-1446`); web PKCE closes the hash-injection sign-in (`src/lib/supabase.ts:32-60`).
- Abuse reporting: single sheet for flags/comments, guest-capable, envelope parsed by tests, no contact e-mail collected, raw PostgREST text never rendered (`src/lib/reports.ts:234-240`, `ReportContentModal.tsx:215-217`); content filter applied on flag description, comment, display name (client-side, documented as bypassable).
- Duplicate-submission guards: 20/24 h per-user triggers (two redundant), global anon cap, CAS on status updates (F53), `deleteFlag` proves effect via `.select('id')` (main), reopen/dispute client dedupe.
- Realtime: `flags` publication column-filtered to `(id, status)`; comments realtime is RLS-gated to authenticated.
- Vercel headers: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` restricting camera/geolocation to self.
- `app.json` privacy manifest: tracking false, collected types (precise location, email, name, photos, user content, user id, device id/push token) match actual collection; usage strings present for location/camera/photo library; Android permissions limited to location.
- B33 deletion design itself (if deployed with its migrations): receipt secret hashed server-side, subject derived from verified JWT, service-role-only RPCs, constant-time secret compare, Storage-first with exact-owner checks, Auth deletion last, web refused.

## Coverage gaps
- No production catalog read (by rule): live policy bodies for `flags_user_scoped`, `flag_photos` INSERT, `bk_*`/`zz_backup_*` RLS, Vault secret rotation, `auth.users` reviewer account, and `verify_jwt` settings of deployed functions are inferred from source + the lead's facts (verification steps listed per candidate).
- `src/screens/*` and `src/components/*` were read only at targeted lines (deletion, triage, report, deep-link, export); a full UI-text sweep for PII in `console.*` calls outside `src/lib` was grep-level only (37 files with `console.*`, none matched PII keys except `analytics.ts:142` in `__DEV__`).
- Build 33 `nonmanaged/proposed/2026-08-27_d1f4_async_account_deletion.sql` (1 093 lines), `20260828000000_d1f4r2_source_repair.sql` (522) and `20260828010000_d1f4r3_source_closure.sql` (794) were read at grep/statement level for grants, policies and client-facing RPCs, not line-by-line; `2026-08-27_d1_option_a_account_deletion.sql` (rejected predecessor) not read. None are applied, so no live exposure is claimed from them.
- `supabase/tests/*.sql` and `src/__tests__/*` guard tests not reviewed.
- `docs/PRIVACY_POLICY.md` vs the *live* skypistudio.com page not compared (no network).
- Historical ID mapping relies on greps of `design-reviews/ship-ready/*` and code comments; `security-audit/2026-07-31/00_MASTER_TABLE.md` referenced by other docs is not present in main (only `phase-b/*`), so S-/IO-/PL-/TB-/X- ids are cited only where code comments name them.
- Web-only surfaces (`PlatformMap.web.tsx`, `public/index.html`, `manifest.json`) were not reviewed beyond `sw.js`/`vercel.json`.
