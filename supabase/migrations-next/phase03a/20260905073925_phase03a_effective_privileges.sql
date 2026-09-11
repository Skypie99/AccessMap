-- FDA-012 effective application privileges. UNACCEPTED LOCAL CANDIDATE.
-- Seventh step after the six preserved Phase03A artifacts. No production authority.
-- Object owner stays postgres; managed supabase_admin defaults are an explicit residual.
BEGIN;

DO $backup$ BEGIN
  IF to_regclass('"public"."bk_2026_08_22_flag_comments"') IS NOT NULL THEN
    REVOKE ALL ON TABLE "public"."bk_2026_08_22_flag_comments" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE SELECT ("content", "created_at", "flag_id", "id", "user_id") ON TABLE "public"."bk_2026_08_22_flag_comments" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE INSERT ("content", "created_at", "flag_id", "id", "user_id") ON TABLE "public"."bk_2026_08_22_flag_comments" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE UPDATE ("content", "created_at", "flag_id", "id", "user_id") ON TABLE "public"."bk_2026_08_22_flag_comments" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE REFERENCES ("content", "created_at", "flag_id", "id", "user_id") ON TABLE "public"."bk_2026_08_22_flag_comments" FROM PUBLIC, "anon", "authenticated", "service_role";
  END IF;
END $backup$;
DO $backup$ BEGIN
  IF to_regclass('"public"."bk_2026_08_22_flag_edit_history"') IS NOT NULL THEN
    REVOKE ALL ON TABLE "public"."bk_2026_08_22_flag_edit_history" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE SELECT ("changed_fields", "created_at", "flag_id", "id", "new_values", "old_values", "user_id") ON TABLE "public"."bk_2026_08_22_flag_edit_history" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE INSERT ("changed_fields", "created_at", "flag_id", "id", "new_values", "old_values", "user_id") ON TABLE "public"."bk_2026_08_22_flag_edit_history" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE UPDATE ("changed_fields", "created_at", "flag_id", "id", "new_values", "old_values", "user_id") ON TABLE "public"."bk_2026_08_22_flag_edit_history" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE REFERENCES ("changed_fields", "created_at", "flag_id", "id", "new_values", "old_values", "user_id") ON TABLE "public"."bk_2026_08_22_flag_edit_history" FROM PUBLIC, "anon", "authenticated", "service_role";
  END IF;
END $backup$;
DO $backup$ BEGIN
  IF to_regclass('"public"."bk_2026_08_22_flag_photos"') IS NOT NULL THEN
    REVOKE ALL ON TABLE "public"."bk_2026_08_22_flag_photos" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE SELECT ("alt_text", "created_at", "flag_id", "id", "position", "url") ON TABLE "public"."bk_2026_08_22_flag_photos" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE INSERT ("alt_text", "created_at", "flag_id", "id", "position", "url") ON TABLE "public"."bk_2026_08_22_flag_photos" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE UPDATE ("alt_text", "created_at", "flag_id", "id", "position", "url") ON TABLE "public"."bk_2026_08_22_flag_photos" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE REFERENCES ("alt_text", "created_at", "flag_id", "id", "position", "url") ON TABLE "public"."bk_2026_08_22_flag_photos" FROM PUBLIC, "anon", "authenticated", "service_role";
  END IF;
END $backup$;
DO $backup$ BEGIN
  IF to_regclass('"public"."bk_2026_08_22_flag_status_history"') IS NOT NULL THEN
    REVOKE ALL ON TABLE "public"."bk_2026_08_22_flag_status_history" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE SELECT ("created_at", "flag_id", "from_status", "id", "to_status", "user_id") ON TABLE "public"."bk_2026_08_22_flag_status_history" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE INSERT ("created_at", "flag_id", "from_status", "id", "to_status", "user_id") ON TABLE "public"."bk_2026_08_22_flag_status_history" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE UPDATE ("created_at", "flag_id", "from_status", "id", "to_status", "user_id") ON TABLE "public"."bk_2026_08_22_flag_status_history" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE REFERENCES ("created_at", "flag_id", "from_status", "id", "to_status", "user_id") ON TABLE "public"."bk_2026_08_22_flag_status_history" FROM PUBLIC, "anon", "authenticated", "service_role";
  END IF;
END $backup$;
DO $backup$ BEGIN
  IF to_regclass('"public"."bk_2026_08_22_flag_verifications"') IS NOT NULL THEN
    REVOKE ALL ON TABLE "public"."bk_2026_08_22_flag_verifications" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE SELECT ("created_at", "flag_id", "id", "verifier_id", "weight") ON TABLE "public"."bk_2026_08_22_flag_verifications" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE INSERT ("created_at", "flag_id", "id", "verifier_id", "weight") ON TABLE "public"."bk_2026_08_22_flag_verifications" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE UPDATE ("created_at", "flag_id", "id", "verifier_id", "weight") ON TABLE "public"."bk_2026_08_22_flag_verifications" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE REFERENCES ("created_at", "flag_id", "id", "verifier_id", "weight") ON TABLE "public"."bk_2026_08_22_flag_verifications" FROM PUBLIC, "anon", "authenticated", "service_role";
  END IF;
END $backup$;
DO $backup$ BEGIN
  IF to_regclass('"public"."bk_2026_08_22_flags"') IS NOT NULL THEN
    REVOKE ALL ON TABLE "public"."bk_2026_08_22_flags" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE SELECT ("category", "context_tags", "created_at", "description", "dispute_requests", "dispute_requests_reset_at", "id", "lat", "lng", "photo_alt", "photo_url", "reopen_requests", "reopen_requests_reset_at", "severity", "status", "updated_at", "user_id") ON TABLE "public"."bk_2026_08_22_flags" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE INSERT ("category", "context_tags", "created_at", "description", "dispute_requests", "dispute_requests_reset_at", "id", "lat", "lng", "photo_alt", "photo_url", "reopen_requests", "reopen_requests_reset_at", "severity", "status", "updated_at", "user_id") ON TABLE "public"."bk_2026_08_22_flags" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE UPDATE ("category", "context_tags", "created_at", "description", "dispute_requests", "dispute_requests_reset_at", "id", "lat", "lng", "photo_alt", "photo_url", "reopen_requests", "reopen_requests_reset_at", "severity", "status", "updated_at", "user_id") ON TABLE "public"."bk_2026_08_22_flags" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE REFERENCES ("category", "context_tags", "created_at", "description", "dispute_requests", "dispute_requests_reset_at", "id", "lat", "lng", "photo_alt", "photo_url", "reopen_requests", "reopen_requests_reset_at", "severity", "status", "updated_at", "user_id") ON TABLE "public"."bk_2026_08_22_flags" FROM PUBLIC, "anon", "authenticated", "service_role";
  END IF;
END $backup$;
DO $backup$ BEGIN
  IF to_regclass('"public"."bk_2026_08_22_point_links"') IS NOT NULL THEN
    REVOKE ALL ON TABLE "public"."bk_2026_08_22_point_links" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE SELECT ("flag_id", "point_event_id") ON TABLE "public"."bk_2026_08_22_point_links" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE INSERT ("flag_id", "point_event_id") ON TABLE "public"."bk_2026_08_22_point_links" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE UPDATE ("flag_id", "point_event_id") ON TABLE "public"."bk_2026_08_22_point_links" FROM PUBLIC, "anon", "authenticated", "service_role";
    REVOKE REFERENCES ("flag_id", "point_event_id") ON TABLE "public"."bk_2026_08_22_point_links" FROM PUBLIC, "anon", "authenticated", "service_role";
  END IF;
END $backup$;
REVOKE ALL ON TABLE "public"."comment_votes" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("comment_id", "created_at", "voter_id") ON TABLE "public"."comment_votes" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("comment_id", "created_at", "voter_id") ON TABLE "public"."comment_votes" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("comment_id", "created_at", "voter_id") ON TABLE "public"."comment_votes" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("comment_id", "created_at", "voter_id") ON TABLE "public"."comment_votes" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."feedback" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("body", "category", "contact_email", "created_at", "id", "platform", "user_id") ON TABLE "public"."feedback" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("body", "category", "contact_email", "created_at", "id", "platform", "user_id") ON TABLE "public"."feedback" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("body", "category", "contact_email", "created_at", "id", "platform", "user_id") ON TABLE "public"."feedback" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("body", "category", "contact_email", "created_at", "id", "platform", "user_id") ON TABLE "public"."feedback" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."flag_comments" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("content", "created_at", "flag_id", "id", "user_id") ON TABLE "public"."flag_comments" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("content", "created_at", "flag_id", "id", "user_id") ON TABLE "public"."flag_comments" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("content", "created_at", "flag_id", "id", "user_id") ON TABLE "public"."flag_comments" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("content", "created_at", "flag_id", "id", "user_id") ON TABLE "public"."flag_comments" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."flag_edit_history" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("changed_fields", "created_at", "flag_id", "id", "new_values", "old_values", "user_id") ON TABLE "public"."flag_edit_history" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("changed_fields", "created_at", "flag_id", "id", "new_values", "old_values", "user_id") ON TABLE "public"."flag_edit_history" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("changed_fields", "created_at", "flag_id", "id", "new_values", "old_values", "user_id") ON TABLE "public"."flag_edit_history" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("changed_fields", "created_at", "flag_id", "id", "new_values", "old_values", "user_id") ON TABLE "public"."flag_edit_history" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."flag_edit_history_public" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("changed_fields", "created_at", "flag_id", "id", "new_values", "old_values") ON TABLE "public"."flag_edit_history_public" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("changed_fields", "created_at", "flag_id", "id", "new_values", "old_values") ON TABLE "public"."flag_edit_history_public" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("changed_fields", "created_at", "flag_id", "id", "new_values", "old_values") ON TABLE "public"."flag_edit_history_public" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("changed_fields", "created_at", "flag_id", "id", "new_values", "old_values") ON TABLE "public"."flag_edit_history_public" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."flag_photos" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("alt_text", "created_at", "flag_id", "id", "object_key", "position", "url") ON TABLE "public"."flag_photos" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("alt_text", "created_at", "flag_id", "id", "object_key", "position", "url") ON TABLE "public"."flag_photos" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("alt_text", "created_at", "flag_id", "id", "object_key", "position", "url") ON TABLE "public"."flag_photos" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("alt_text", "created_at", "flag_id", "id", "object_key", "position", "url") ON TABLE "public"."flag_photos" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."flag_status_history" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("created_at", "flag_id", "from_status", "id", "to_status", "user_id") ON TABLE "public"."flag_status_history" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("created_at", "flag_id", "from_status", "id", "to_status", "user_id") ON TABLE "public"."flag_status_history" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("created_at", "flag_id", "from_status", "id", "to_status", "user_id") ON TABLE "public"."flag_status_history" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("created_at", "flag_id", "from_status", "id", "to_status", "user_id") ON TABLE "public"."flag_status_history" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."flag_status_history_public" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("created_at", "flag_id", "from_status", "id", "to_status") ON TABLE "public"."flag_status_history_public" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("created_at", "flag_id", "from_status", "id", "to_status") ON TABLE "public"."flag_status_history_public" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("created_at", "flag_id", "from_status", "id", "to_status") ON TABLE "public"."flag_status_history_public" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("created_at", "flag_id", "from_status", "id", "to_status") ON TABLE "public"."flag_status_history_public" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."flag_verifications" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("created_at", "flag_id", "id", "verifier_id", "weight") ON TABLE "public"."flag_verifications" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("created_at", "flag_id", "id", "verifier_id", "weight") ON TABLE "public"."flag_verifications" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("created_at", "flag_id", "id", "verifier_id", "weight") ON TABLE "public"."flag_verifications" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("created_at", "flag_id", "id", "verifier_id", "weight") ON TABLE "public"."flag_verifications" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."flags" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("category", "context_tags", "created_at", "description", "dispute_requests", "dispute_requests_reset_at", "id", "lat", "lng", "photo_alt", "photo_object_key", "photo_url", "reopen_requests", "reopen_requests_reset_at", "severity", "status", "updated_at", "user_id") ON TABLE "public"."flags" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("category", "context_tags", "created_at", "description", "dispute_requests", "dispute_requests_reset_at", "id", "lat", "lng", "photo_alt", "photo_object_key", "photo_url", "reopen_requests", "reopen_requests_reset_at", "severity", "status", "updated_at", "user_id") ON TABLE "public"."flags" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("category", "context_tags", "created_at", "description", "dispute_requests", "dispute_requests_reset_at", "id", "lat", "lng", "photo_alt", "photo_object_key", "photo_url", "reopen_requests", "reopen_requests_reset_at", "severity", "status", "updated_at", "user_id") ON TABLE "public"."flags" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("category", "context_tags", "created_at", "description", "dispute_requests", "dispute_requests_reset_at", "id", "lat", "lng", "photo_alt", "photo_object_key", "photo_url", "reopen_requests", "reopen_requests_reset_at", "severity", "status", "updated_at", "user_id") ON TABLE "public"."flags" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."notification_preferences" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("bulk_watch_alerts", "flag_status_updates", "nearby_flags", "updated_at", "user_id", "watched_flag_updates") ON TABLE "public"."notification_preferences" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("bulk_watch_alerts", "flag_status_updates", "nearby_flags", "updated_at", "user_id", "watched_flag_updates") ON TABLE "public"."notification_preferences" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("bulk_watch_alerts", "flag_status_updates", "nearby_flags", "updated_at", "user_id", "watched_flag_updates") ON TABLE "public"."notification_preferences" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("bulk_watch_alerts", "flag_status_updates", "nearby_flags", "updated_at", "user_id", "watched_flag_updates") ON TABLE "public"."notification_preferences" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."point_events" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("created_at", "delta", "event_type", "flag_id", "id", "user_id") ON TABLE "public"."point_events" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("created_at", "delta", "event_type", "flag_id", "id", "user_id") ON TABLE "public"."point_events" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("created_at", "delta", "event_type", "flag_id", "id", "user_id") ON TABLE "public"."point_events" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("created_at", "delta", "event_type", "flag_id", "id", "user_id") ON TABLE "public"."point_events" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."push_tokens" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("created_at", "platform", "token", "updated_at", "user_id") ON TABLE "public"."push_tokens" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("created_at", "platform", "token", "updated_at", "user_id") ON TABLE "public"."push_tokens" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("created_at", "platform", "token", "updated_at", "user_id") ON TABLE "public"."push_tokens" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("created_at", "platform", "token", "updated_at", "user_id") ON TABLE "public"."push_tokens" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."realtime_subscribe_log" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("channel", "event", "id", "logged_at", "user_id") ON TABLE "public"."realtime_subscribe_log" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("channel", "event", "id", "logged_at", "user_id") ON TABLE "public"."realtime_subscribe_log" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("channel", "event", "id", "logged_at", "user_id") ON TABLE "public"."realtime_subscribe_log" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("channel", "event", "id", "logged_at", "user_id") ON TABLE "public"."realtime_subscribe_log" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."users" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("avatar_object_key", "avatar_url", "created_at", "display_name", "email", "id", "is_admin", "last_active_date", "longest_streak_days", "points", "streak_days") ON TABLE "public"."users" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("avatar_object_key", "avatar_url", "created_at", "display_name", "email", "id", "is_admin", "last_active_date", "longest_streak_days", "points", "streak_days") ON TABLE "public"."users" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("avatar_object_key", "avatar_url", "created_at", "display_name", "email", "id", "is_admin", "last_active_date", "longest_streak_days", "points", "streak_days") ON TABLE "public"."users" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("avatar_object_key", "avatar_url", "created_at", "display_name", "email", "id", "is_admin", "last_active_date", "longest_streak_days", "points", "streak_days") ON TABLE "public"."users" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON TABLE "public"."users_self_email" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE SELECT ("email", "id") ON TABLE "public"."users_self_email" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE INSERT ("email", "id") ON TABLE "public"."users_self_email" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE ("email", "id") ON TABLE "public"."users_self_email" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE REFERENCES ("email", "id") ON TABLE "public"."users_self_email" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON SEQUENCE "public"."point_events_id_seq" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON SEQUENCE "public"."realtime_subscribe_log_id_seq" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "private".current_user_is_admin() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "private".get_comment_author_profiles(uuid[]) FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "private".get_my_leaderboard_rank() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "private".list_public_leaderboard(integer) FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".check_feedback_rate_limit() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".check_flag_creation_rate_limit() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".check_flag_rate_limit() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".check_global_anon_rate_limit() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".current_user_can_admin() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".enforce_flag_photos_object_key_guard() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".enforce_flag_status_only_for_non_owner() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".enforce_flag_status_transition() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".enforce_flags_photo_object_key_guard() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".enforce_users_avatar_object_key_guard() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".get_comment_author_profiles(uuid[]) FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".get_my_leaderboard_rank() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".handle_comment_added() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".handle_comment_vote_added() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".handle_flag_dispute_reset() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".handle_flag_insert_history() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".handle_flag_photo_added() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".handle_flag_reopen_reset() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".handle_flag_status_change() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".handle_flag_submitted() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".handle_new_user() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".handle_point_event_streak() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".handle_push_token_updated_at() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".increment_dispute_request(uuid) FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".increment_reopen_request(uuid) FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".list_public_leaderboard(integer) FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".log_realtime_event(text,text) FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".notify_flag_status_webhook() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".set_flag_updated_at() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".update_flags_updated_at() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public".verify_webhook_secret(text) FROM PUBLIC, "anon", "authenticated", "service_role";

-- Reviewed caller/policy contract; each column is explicit.
GRANT SELECT, DELETE ON TABLE "public"."comment_votes" TO "authenticated";
GRANT INSERT ("comment_id", "voter_id") ON TABLE "public"."comment_votes" TO "authenticated";
GRANT INSERT ("user_id", "category", "body", "contact_email", "platform") ON TABLE "public"."feedback" TO "anon";
GRANT SELECT, DELETE ON TABLE "public"."feedback" TO "authenticated";
GRANT INSERT ("user_id", "category", "body", "contact_email", "platform") ON TABLE "public"."feedback" TO "authenticated";
GRANT SELECT, DELETE ON TABLE "public"."flag_comments" TO "authenticated";
GRANT INSERT ("flag_id", "user_id", "content") ON TABLE "public"."flag_comments" TO "authenticated";
GRANT SELECT ("id", "flag_id", "changed_fields", "old_values", "new_values", "created_at") ON TABLE "public"."flag_edit_history" TO "authenticated";
GRANT INSERT ("flag_id", "user_id", "changed_fields", "old_values", "new_values") ON TABLE "public"."flag_edit_history" TO "authenticated";
GRANT SELECT ON TABLE "public"."flag_edit_history_public" TO "authenticated";
GRANT SELECT, DELETE ON TABLE "public"."flag_photos" TO "authenticated";
GRANT INSERT ("flag_id", "url", "position", "alt_text") ON TABLE "public"."flag_photos" TO "authenticated";
GRANT UPDATE ("url", "position", "alt_text") ON TABLE "public"."flag_photos" TO "authenticated";
GRANT SELECT ("id", "flag_id", "from_status", "to_status", "created_at") ON TABLE "public"."flag_status_history" TO "authenticated";
GRANT SELECT ON TABLE "public"."flag_status_history_public" TO "authenticated";
GRANT SELECT ON TABLE "public"."flag_verifications" TO "authenticated";
GRANT INSERT ("flag_id", "verifier_id") ON TABLE "public"."flag_verifications" TO "authenticated";
GRANT SELECT ON TABLE "public"."flags" TO "anon";
-- STAGE A COMPATIBILITY GRANTS — removed by 20260911130000_phase03a_fda026_stage_b_cutover.
-- anon is the DEFAULT role for every web session and every native guest
-- (src/screens/GuestProfile.tsx). Production grants all five of these today, and
-- shipped Build 33 reads them without gating on a signed-in user:
--   flag_comments               src/lib/comments.ts (four call sites)
--   flag_photos                 listFlagPhotos(), rendered by FlagDetailModal
--   flag_status_history_public  } security_invoker views: the grant is the only
--   flag_edit_history_public    } thing letting anon reach them at all
--   point_events                retained for production fidelity only; the sole
--                               shipped reader is getPointEventHistory(userId) on
--                               the AUTHENTICATED ProfileScreen, not a guest path
-- Revoking them in Stage A does not degrade a guest to an empty list — the client
-- call THROWS. This is the same class of defect as the is_admin retention above,
-- found by independent review after the first version of this split shipped, and
-- it is retained here for the same reason: the cutover is Stage B's job, not
-- Stage A's.
GRANT SELECT ON TABLE "public"."flag_comments" TO "anon";
GRANT SELECT ON TABLE "public"."flag_photos" TO "anon";
GRANT SELECT ON TABLE "public"."flag_status_history_public" TO "anon";
GRANT SELECT ON TABLE "public"."flag_edit_history_public" TO "anon";
GRANT SELECT ON TABLE "public"."point_events" TO "anon";
GRANT INSERT ("user_id", "lat", "lng", "category", "severity", "description", "photo_url", "photo_alt", "context_tags", "status") ON TABLE "public"."flags" TO "anon";
GRANT SELECT, DELETE ON TABLE "public"."flags" TO "authenticated";
GRANT INSERT ("user_id", "lat", "lng", "category", "severity", "description", "photo_url", "photo_alt", "context_tags", "status") ON TABLE "public"."flags" TO "authenticated";
GRANT UPDATE ("description", "category", "severity", "status", "photo_url", "photo_alt", "context_tags") ON TABLE "public"."flags" TO "authenticated";
GRANT SELECT ("user_id") ON TABLE "public"."flags" TO "service_role";
GRANT UPDATE ("user_id") ON TABLE "public"."flags" TO "service_role";
GRANT SELECT ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT INSERT ("user_id", "flag_status_updates", "nearby_flags", "watched_flag_updates", "bulk_watch_alerts") ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT UPDATE ("user_id", "flag_status_updates", "nearby_flags", "watched_flag_updates", "bulk_watch_alerts") ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT SELECT ON TABLE "public"."point_events" TO "authenticated";
GRANT SELECT, DELETE ON TABLE "public"."push_tokens" TO "authenticated";
GRANT INSERT ("user_id", "token", "platform") ON TABLE "public"."push_tokens" TO "authenticated";
GRANT UPDATE ("user_id", "token", "platform") ON TABLE "public"."push_tokens" TO "authenticated";
GRANT SELECT ("token", "user_id") ON TABLE "public"."push_tokens" TO "service_role";
GRANT SELECT ("id", "display_name", "avatar_url", "avatar_object_key", "points", "created_at") ON TABLE "public"."users" TO "authenticated";
-- STAGE A COMPATIBILITY GRANT — removed by 20260911130000_phase03a_fda026_stage_b_cutover.
-- is_admin is deliberately absent from the secure-end-state list above. It is
-- re-granted here for one reason only: shipped Build 33 (iOS f5594171, pinned web
-- ebf091c2) reads it directly at src/lib/admin.ts:31, and without the grant that
-- read returns 42501, which the shipped catch turns into isAdmin=false. The admin
-- UI then disappears with no error shown to the admin.
--
-- This line is the WHOLE of the is_admin compatibility retention. Stage B revokes
-- exactly it, and public.current_user_can_admin() (Stage A) is the replacement:
-- it answers a boolean about the CALLER without exposing anyone's flag.
GRANT SELECT ("is_admin") ON TABLE "public"."users" TO "authenticated";
GRANT UPDATE ("display_name", "avatar_url", "avatar_object_key") ON TABLE "public"."users" TO "authenticated";
GRANT EXECUTE ON FUNCTION "private".current_user_is_admin() TO "authenticated";
GRANT EXECUTE ON FUNCTION "private".get_comment_author_profiles(uuid[]) TO "authenticated";
GRANT EXECUTE ON FUNCTION "private".get_my_leaderboard_rank() TO "authenticated";
GRANT EXECUTE ON FUNCTION "private".list_public_leaderboard(integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public".current_user_can_admin() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public".get_comment_author_profiles(uuid[]) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public".get_my_leaderboard_rank() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public".increment_dispute_request(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public".increment_reopen_request(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public".list_public_leaderboard(integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public".log_realtime_event(text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public".verify_webhook_secret(text) TO "service_role";

-- Future application objects require opt-in grants, including service role.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON TABLES FROM PUBLIC, "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON SEQUENCES FROM PUBLIC, "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE ALL ON FUNCTIONS FROM PUBLIC, "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public, private, storage REVOKE ALL ON TABLES FROM PUBLIC, "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public, private, storage REVOKE ALL ON SEQUENCES FROM PUBLIC, "anon", "authenticated", "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public, private, storage REVOKE ALL ON FUNCTIONS FROM PUBLIC, "anon", "authenticated", "service_role";
COMMIT;
