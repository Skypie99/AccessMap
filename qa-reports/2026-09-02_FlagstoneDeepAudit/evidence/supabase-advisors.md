# Supabase advisors (production, read-only, 2026-09-02 ~18:27 PDT)

## Security advisor
| level | lint | object | note |
|---|---|---|---|
| WARN | anon_security_definer_function_executable | public.enforce_flag_photos_object_key_guard(), enforce_flags_photo_object_key_guard(), enforce_users_avatar_object_key_guard() | trigger functions (RETURNS trigger) with EXECUTE granted to PUBLIC/anon/authenticated (from 20260830130000 promptb media-key migration). Direct RPC invocation of a trigger function fails in Postgres ("trigger functions can only be called as triggers"), so exploitability is nil, but the grant is unnecessary and trips the linter. |
| WARN | authenticated_security_definer_function_executable | same three + increment_dispute_request, increment_reopen_request, log_realtime_event | the last three are intentional client RPCs (D1S-A hardened them to require a users row). |
| WARN | auth_leaked_password_protection | Auth | HaveIBeenPwned leaked-password check is DISABLED (dashboard toggle). |
| INFO | rls_enabled_no_policy | 7 × bk_2026_08_22_* backup tables | intentional lock-down (D1S-A F1). |

## Performance advisor
| level | lint | object | note |
|---|---|---|---|
| WARN | auth_rls_initplan | flags.flags_user_scoped | legacy FOR ALL policy uses bare `auth.uid()` (re-evaluated per row). Every other policy uses `(select auth.uid())`. |
| WARN | multiple_permissive_policies | flags (anon INSERT/SELECT; authenticated SELECT/INSERT/UPDATE/DELETE), users (authenticated SELECT), feedback (SELECT ×5 roles), flag_comments (DELETE), flag_edit_history / flag_status_history (SELECT) | `flags_user_scoped` overlaps every flags policy; it is the policy D1F4R3-FIX2 intended to drop (never applied). |
| INFO | unused_index | flags_context_tags_idx, feedback_category_idx, flags_reopen_requests_idx, realtime_subscribe_log_user_id_idx, comment_votes_voter_id_idx, flag_comments_user_id_idx, flag_edit_history_user_id_idx, flag_status_history_user_id_idx, flag_verifications_verifier_id_idx | never used (dataset is tiny: 21 flags / 5 users). |
| INFO | no_primary_key | 7 × bk_2026_08_22_* | backup tables. |
| INFO | auth_db_connections_absolute | Auth | fixed 10 connections. |

## Data scale (read-only counts)
flags total 21 (12 anonymous), statuses open/rejected/resolved/verified; users 5 (1 admin). Performance findings must be judged against this tiny dataset — none of the index/initplan warnings is user-visible today.
