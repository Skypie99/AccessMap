CREATE SCHEMA limiter;
CREATE TABLE limiter.bucket (
  bucket_key bytea NOT NULL, window_id bigint NOT NULL,
  units_consumed int NOT NULL DEFAULT 0,
  grants_issued  int NOT NULL DEFAULT 0,   -- STATISTIC ONLY, never a refusal condition
  PRIMARY KEY (bucket_key, window_id));
CREATE TABLE limiter.grant (
  grant_id uuid PRIMARY KEY,
  bucket_key bytea NOT NULL, window_id bigint NOT NULL,   -- binding + validity, NO timestamp
  allowance int NOT NULL, units_consumed int NOT NULL DEFAULT 0);
CREATE TABLE limiter.config (id boolean PRIMARY KEY DEFAULT true CHECK (id), enabled boolean NOT NULL DEFAULT true);
INSERT INTO limiter.config (id, enabled) VALUES (true, true);

CREATE FUNCTION limiter.admit(
  p_bucket bytea, p_window bigint, p_grant uuid,
  p_normal int, p_bucket_allow int
) RETURNS TABLE (decision text, out_grant uuid, remaining int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'limiter', 'pg_temp' AS $fn$
DECLARE
  b            limiter.bucket%ROWTYPE;   -- %ROWTYPE, NOT RECORD: a RECORD is
  g            limiter.grant%ROWTYPE;    -- unassigned when the SELECT is skipped
  v_enabled    boolean;
  v_opening    int;
BEGIN
  SELECT enabled INTO v_enabled FROM limiter.config WHERE id;
  IF NOT COALESCE(v_enabled, true) THEN
    RETURN QUERY SELECT 'ADMITTED_LIMITER_DISABLED'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  INSERT INTO limiter.bucket AS t (bucket_key, window_id) VALUES (p_bucket, p_window)
    ON CONFLICT (bucket_key, window_id) DO UPDATE SET units_consumed = t.units_consumed;
  SELECT * INTO b FROM limiter.bucket
    WHERE bucket_key = p_bucket AND window_id = p_window FOR UPDATE;

  IF p_grant IS NOT NULL THEN
    SELECT * INTO g FROM limiter.grant
      WHERE grant_id = p_grant AND bucket_key = p_bucket AND window_id = p_window
      FOR UPDATE;
  END IF;

  IF g.grant_id IS NULL THEN
    -- NO grant-slot cap. The bucket allowance is the ONLY ceiling, so a
    -- resetting client cannot starve later clients of grant slots.
    v_opening := LEAST(p_normal, p_bucket_allow - b.units_consumed);
    IF v_opening <= 0 THEN
      RETURN QUERY SELECT 'REFUSED_BUCKET_EXHAUSTED'::text, NULL::uuid, 0; RETURN;
    END IF;
    INSERT INTO limiter.grant (grant_id, bucket_key, window_id, allowance)
      VALUES (gen_random_uuid(), p_bucket, p_window, v_opening) RETURNING * INTO g;
    UPDATE limiter.bucket SET grants_issued = grants_issued + 1
      WHERE bucket_key = p_bucket AND window_id = p_window;
  END IF;

  IF b.units_consumed >= p_bucket_allow THEN
    RETURN QUERY SELECT 'REFUSED_BUCKET'::text, g.grant_id, 0; RETURN; END IF;
  IF g.units_consumed >= g.allowance THEN
    RETURN QUERY SELECT 'REFUSED_GRANT'::text, g.grant_id, 0; RETURN; END IF;

  UPDATE limiter.bucket SET units_consumed = units_consumed + 1
    WHERE bucket_key = p_bucket AND window_id = p_window;
  UPDATE limiter.grant SET units_consumed = units_consumed + 1
    WHERE grant_id = g.grant_id;
  RETURN QUERY SELECT 'ADMITTED'::text, g.grant_id, g.allowance - g.units_consumed - 1;
END $fn$;
