-- PHASE-03A LOCAL CANDIDATE: FDA-010. NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
-- Forward restoration to the pre-03A posture; this restores known weaknesses.
-- Disposable rehearsal only until a separate exact production token authorizes it.
BEGIN;
GRANT EXECUTE ON FUNCTION "public".enforce_flag_photos_object_key_guard() TO "anon";
GRANT EXECUTE ON FUNCTION "public".enforce_flags_photo_object_key_guard() TO "anon";
GRANT EXECUTE ON FUNCTION "public".enforce_users_avatar_object_key_guard() TO "anon";
GRANT EXECUTE ON FUNCTION "public".handle_push_token_updated_at() TO "anon";
GRANT EXECUTE ON FUNCTION "public".set_flag_updated_at() TO "anon";
GRANT EXECUTE ON FUNCTION "public".update_flags_updated_at() TO "anon";
GRANT EXECUTE ON FUNCTION "public".enforce_flag_photos_object_key_guard() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public".enforce_flags_photo_object_key_guard() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public".enforce_users_avatar_object_key_guard() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public".handle_push_token_updated_at() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public".set_flag_updated_at() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public".update_flags_updated_at() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public".enforce_flag_photos_object_key_guard() TO PUBLIC;
GRANT EXECUTE ON FUNCTION "public".enforce_flags_photo_object_key_guard() TO PUBLIC;
GRANT EXECUTE ON FUNCTION "public".enforce_users_avatar_object_key_guard() TO PUBLIC;
GRANT EXECUTE ON FUNCTION "public".handle_push_token_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION "public".set_flag_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION "public".update_flags_updated_at() TO PUBLIC;
COMMIT;
