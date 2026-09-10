-- PHASE-03A LOCAL CANDIDATE: FDA-028 v4. NOT AUTHORIZED FOR APPLY.
-- Forward restoration to the pre-v4 posture; this restores known weaknesses:
-- guest ingestion returns to having NO per-client server-side limiter, governed
-- only by the global anonymous emergency caps.
-- Disposable rehearsal only until a separate exact production token authorizes it.
BEGIN;

DROP TRIGGER IF EXISTS guard_window_domain ON limiter.config;
DROP FUNCTION IF EXISTS limiter.guard_window_domain();
DROP FUNCTION IF EXISTS limiter.domain_lock_key();
DROP FUNCTION IF EXISTS limiter.purge();
DROP FUNCTION IF EXISTS limiter.purge_at(timestamptz);
DROP FUNCTION IF EXISTS limiter.admit_guest_feedback(text, uuid, text, text, text);
DROP FUNCTION IF EXISTS limiter.admit_guest_feedback_at(text, uuid, text, text, text, timestamptz);
DROP FUNCTION IF EXISTS limiter.admit_guest_flag(text, uuid, double precision, double precision, text, integer, text);
DROP FUNCTION IF EXISTS limiter.admit_guest_flag_at(text, uuid, double precision, double precision, text, integer, text, timestamptz);
DROP FUNCTION IF EXISTS limiter.admit_at(text, uuid, timestamptz);
DROP FUNCTION IF EXISTS limiter.write_epoch_key(bytea);
DROP FUNCTION IF EXISTS limiter.read_epoch_key();
DROP FUNCTION IF EXISTS limiter.current_epoch_key(timestamptz);
DROP FUNCTION IF EXISTS limiter.normalize_source(text);
DROP FUNCTION IF EXISTS limiter.embedded_ipv4(inet);
DROP FUNCTION IF EXISTS limiter.rfc6052_ipv4(inet, integer);
DROP FUNCTION IF EXISTS limiter.ipv6_hex(inet);
DROP FUNCTION IF EXISTS limiter.is_public_unicast(inet);
DROP FUNCTION IF EXISTS limiter.derive_bucket_key(bytea, text);
DROP FUNCTION IF EXISTS limiter.ratchet(bytea, bigint);
DROP FUNCTION IF EXISTS limiter.window_of(timestamptz, integer);

-- grant is dropped first only for clarity; the FK would cascade regardless.
DROP TABLE IF EXISTS limiter.grant;
DROP TABLE IF EXISTS limiter.bucket;
DROP TABLE IF EXISTS limiter.translation_prefix;
DROP TABLE IF EXISTS limiter.key_state;
DROP TABLE IF EXISTS limiter.config;
-- limiter.dev_key_material is created only by the local test fixture, never by
-- the forward candidate; dropped here so a rehearsed local restoration is total.
DROP TABLE IF EXISTS limiter.dev_key_material;

DROP SCHEMA IF EXISTS limiter;

COMMIT;
