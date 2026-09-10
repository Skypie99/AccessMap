-- Local disposable schema/ACL model only. NEVER apply this fixture hosted.
-- Seven captured historical backups; no rows, private values, indexes or constraints copied.
BEGIN;
CREATE TABLE "public"."bk_2026_08_22_flag_comments" (
  "id" "pg_catalog"."uuid",
  "flag_id" "pg_catalog"."uuid",
  "user_id" "pg_catalog"."uuid",
  "content" "pg_catalog"."text",
  "created_at" "pg_catalog"."timestamptz"
);
ALTER TABLE "public"."bk_2026_08_22_flag_comments" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."bk_2026_08_22_flag_comments" FROM PUBLIC, "anon", "authenticated", "service_role";
GRANT DELETE ON TABLE "public"."bk_2026_08_22_flag_comments" TO "service_role";
GRANT INSERT ON TABLE "public"."bk_2026_08_22_flag_comments" TO "service_role";
GRANT MAINTAIN ON TABLE "public"."bk_2026_08_22_flag_comments" TO "service_role";
GRANT REFERENCES ON TABLE "public"."bk_2026_08_22_flag_comments" TO "service_role";
GRANT SELECT ON TABLE "public"."bk_2026_08_22_flag_comments" TO "service_role";
GRANT TRIGGER ON TABLE "public"."bk_2026_08_22_flag_comments" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."bk_2026_08_22_flag_comments" TO "service_role";
GRANT UPDATE ON TABLE "public"."bk_2026_08_22_flag_comments" TO "service_role";
CREATE TABLE "public"."bk_2026_08_22_flag_edit_history" (
  "id" "pg_catalog"."uuid",
  "flag_id" "pg_catalog"."uuid",
  "user_id" "pg_catalog"."uuid",
  "changed_fields" "pg_catalog"."text"[],
  "old_values" "pg_catalog"."jsonb",
  "new_values" "pg_catalog"."jsonb",
  "created_at" "pg_catalog"."timestamptz"
);
ALTER TABLE "public"."bk_2026_08_22_flag_edit_history" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."bk_2026_08_22_flag_edit_history" FROM PUBLIC, "anon", "authenticated", "service_role";
GRANT DELETE ON TABLE "public"."bk_2026_08_22_flag_edit_history" TO "service_role";
GRANT INSERT ON TABLE "public"."bk_2026_08_22_flag_edit_history" TO "service_role";
GRANT MAINTAIN ON TABLE "public"."bk_2026_08_22_flag_edit_history" TO "service_role";
GRANT REFERENCES ON TABLE "public"."bk_2026_08_22_flag_edit_history" TO "service_role";
GRANT SELECT ON TABLE "public"."bk_2026_08_22_flag_edit_history" TO "service_role";
GRANT TRIGGER ON TABLE "public"."bk_2026_08_22_flag_edit_history" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."bk_2026_08_22_flag_edit_history" TO "service_role";
GRANT UPDATE ON TABLE "public"."bk_2026_08_22_flag_edit_history" TO "service_role";
CREATE TABLE "public"."bk_2026_08_22_flag_photos" (
  "id" "pg_catalog"."uuid",
  "flag_id" "pg_catalog"."uuid",
  "url" "pg_catalog"."text",
  "position" "pg_catalog"."int4",
  "created_at" "pg_catalog"."timestamptz",
  "alt_text" "pg_catalog"."text"
);
ALTER TABLE "public"."bk_2026_08_22_flag_photos" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."bk_2026_08_22_flag_photos" FROM PUBLIC, "anon", "authenticated", "service_role";
GRANT DELETE ON TABLE "public"."bk_2026_08_22_flag_photos" TO "service_role";
GRANT INSERT ON TABLE "public"."bk_2026_08_22_flag_photos" TO "service_role";
GRANT MAINTAIN ON TABLE "public"."bk_2026_08_22_flag_photos" TO "service_role";
GRANT REFERENCES ON TABLE "public"."bk_2026_08_22_flag_photos" TO "service_role";
GRANT SELECT ON TABLE "public"."bk_2026_08_22_flag_photos" TO "service_role";
GRANT TRIGGER ON TABLE "public"."bk_2026_08_22_flag_photos" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."bk_2026_08_22_flag_photos" TO "service_role";
GRANT UPDATE ON TABLE "public"."bk_2026_08_22_flag_photos" TO "service_role";
CREATE TABLE "public"."bk_2026_08_22_flag_status_history" (
  "id" "pg_catalog"."uuid",
  "flag_id" "pg_catalog"."uuid",
  "user_id" "pg_catalog"."uuid",
  "from_status" "pg_catalog"."text",
  "to_status" "pg_catalog"."text",
  "created_at" "pg_catalog"."timestamptz"
);
ALTER TABLE "public"."bk_2026_08_22_flag_status_history" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."bk_2026_08_22_flag_status_history" FROM PUBLIC, "anon", "authenticated", "service_role";
GRANT DELETE ON TABLE "public"."bk_2026_08_22_flag_status_history" TO "service_role";
GRANT INSERT ON TABLE "public"."bk_2026_08_22_flag_status_history" TO "service_role";
GRANT MAINTAIN ON TABLE "public"."bk_2026_08_22_flag_status_history" TO "service_role";
GRANT REFERENCES ON TABLE "public"."bk_2026_08_22_flag_status_history" TO "service_role";
GRANT SELECT ON TABLE "public"."bk_2026_08_22_flag_status_history" TO "service_role";
GRANT TRIGGER ON TABLE "public"."bk_2026_08_22_flag_status_history" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."bk_2026_08_22_flag_status_history" TO "service_role";
GRANT UPDATE ON TABLE "public"."bk_2026_08_22_flag_status_history" TO "service_role";
CREATE TABLE "public"."bk_2026_08_22_flag_verifications" (
  "id" "pg_catalog"."uuid",
  "flag_id" "pg_catalog"."uuid",
  "verifier_id" "pg_catalog"."uuid",
  "weight" "pg_catalog"."numeric",
  "created_at" "pg_catalog"."timestamptz"
);
ALTER TABLE "public"."bk_2026_08_22_flag_verifications" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."bk_2026_08_22_flag_verifications" FROM PUBLIC, "anon", "authenticated", "service_role";
GRANT DELETE ON TABLE "public"."bk_2026_08_22_flag_verifications" TO "service_role";
GRANT INSERT ON TABLE "public"."bk_2026_08_22_flag_verifications" TO "service_role";
GRANT MAINTAIN ON TABLE "public"."bk_2026_08_22_flag_verifications" TO "service_role";
GRANT REFERENCES ON TABLE "public"."bk_2026_08_22_flag_verifications" TO "service_role";
GRANT SELECT ON TABLE "public"."bk_2026_08_22_flag_verifications" TO "service_role";
GRANT TRIGGER ON TABLE "public"."bk_2026_08_22_flag_verifications" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."bk_2026_08_22_flag_verifications" TO "service_role";
GRANT UPDATE ON TABLE "public"."bk_2026_08_22_flag_verifications" TO "service_role";
CREATE TABLE "public"."bk_2026_08_22_flags" (
  "id" "pg_catalog"."uuid",
  "user_id" "pg_catalog"."uuid",
  "lat" "pg_catalog"."float8",
  "lng" "pg_catalog"."float8",
  "category" "pg_catalog"."text",
  "description" "pg_catalog"."text",
  "severity" "pg_catalog"."int2",
  "photo_url" "pg_catalog"."text",
  "status" "pg_catalog"."text",
  "created_at" "pg_catalog"."timestamptz",
  "updated_at" "pg_catalog"."timestamptz",
  "context_tags" "pg_catalog"."text"[],
  "reopen_requests" "pg_catalog"."int4",
  "reopen_requests_reset_at" "pg_catalog"."timestamptz",
  "dispute_requests" "pg_catalog"."int4",
  "dispute_requests_reset_at" "pg_catalog"."timestamptz",
  "photo_alt" "pg_catalog"."text"
);
ALTER TABLE "public"."bk_2026_08_22_flags" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."bk_2026_08_22_flags" FROM PUBLIC, "anon", "authenticated", "service_role";
GRANT DELETE ON TABLE "public"."bk_2026_08_22_flags" TO "service_role";
GRANT INSERT ON TABLE "public"."bk_2026_08_22_flags" TO "service_role";
GRANT MAINTAIN ON TABLE "public"."bk_2026_08_22_flags" TO "service_role";
GRANT REFERENCES ON TABLE "public"."bk_2026_08_22_flags" TO "service_role";
GRANT SELECT ON TABLE "public"."bk_2026_08_22_flags" TO "service_role";
GRANT TRIGGER ON TABLE "public"."bk_2026_08_22_flags" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."bk_2026_08_22_flags" TO "service_role";
GRANT UPDATE ON TABLE "public"."bk_2026_08_22_flags" TO "service_role";
CREATE TABLE "public"."bk_2026_08_22_point_links" (
  "point_event_id" "pg_catalog"."int8",
  "flag_id" "pg_catalog"."uuid"
);
ALTER TABLE "public"."bk_2026_08_22_point_links" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."bk_2026_08_22_point_links" FROM PUBLIC, "anon", "authenticated", "service_role";
GRANT DELETE ON TABLE "public"."bk_2026_08_22_point_links" TO "service_role";
GRANT INSERT ON TABLE "public"."bk_2026_08_22_point_links" TO "service_role";
GRANT MAINTAIN ON TABLE "public"."bk_2026_08_22_point_links" TO "service_role";
GRANT REFERENCES ON TABLE "public"."bk_2026_08_22_point_links" TO "service_role";
GRANT SELECT ON TABLE "public"."bk_2026_08_22_point_links" TO "service_role";
GRANT TRIGGER ON TABLE "public"."bk_2026_08_22_point_links" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."bk_2026_08_22_point_links" TO "service_role";
GRANT UPDATE ON TABLE "public"."bk_2026_08_22_point_links" TO "service_role";
COMMIT;
