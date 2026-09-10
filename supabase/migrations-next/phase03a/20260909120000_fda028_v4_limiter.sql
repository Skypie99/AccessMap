-- PHASE-03A LOCAL CANDIDATE: FDA-028 v4. NOT AUTHORIZED FOR APPLY.
-- Requires accepted Phase 02 applied + adoption baseline. No production change.
-- Exact order/hashes and outstanding gates are declared in candidate-contract.json.
--
-- Closes the three MUST-FIX blockers the independent v3 review left open:
--   B1 complete real path  - derivation + enforcement + the guest INSERT all run
--                            inside ONE transaction in limiter.admit_guest_flag /
--                            limiter.admit_guest_feedback. No ledger-only simulator.
--   B2 lifecycle           - limiter.grant is a CHILD of limiter.bucket by composite
--                            FK ON DELETE CASCADE, so an orphan grant is structurally
--                            impossible and a purged bucket cannot leave spendable
--                            authority behind.
--   B3 key linkability     - forward-secure HMAC ratchet. K_{n+1}=HMAC(K_n,...) is
--                            one-way, so the live key cannot derive ANY expired
--                            window's bucket keys.
BEGIN;

CREATE SCHEMA IF NOT EXISTS limiter;
REVOKE ALL ON SCHEMA limiter FROM PUBLIC;

-- ---------------------------------------------------------------- configuration
-- Thresholds are CONFIGURATION, never architectural constants. Production values
-- are DEFERRED; these defaults exist so a fresh database is inert-but-safe.
CREATE TABLE limiter.config (
  id                 boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled            boolean NOT NULL DEFAULT true,
  normal_allowance   integer NOT NULL DEFAULT 5   CHECK (normal_allowance   > 0),
  bucket_allowance   integer NOT NULL DEFAULT 50  CHECK (bucket_allowance   > 0),
  window_seconds     integer NOT NULL DEFAULT 86400 CHECK (window_seconds   > 0),
  ipv4_prefix        integer NOT NULL DEFAULT 32  CHECK (ipv4_prefix BETWEEN 8  AND 32),
  ipv6_prefix        integer NOT NULL DEFAULT 64  CHECK (ipv6_prefix BETWEEN 32 AND 128),
  require_public_ip  boolean NOT NULL DEFAULT true,
  reseed_interval    integer NOT NULL DEFAULT 7   CHECK (reseed_interval > 0),
  catchup_cap        integer NOT NULL DEFAULT 32  CHECK (catchup_cap > 0),
  retention_windows  integer NOT NULL DEFAULT 1   CHECK (retention_windows >= 0)
);
INSERT INTO limiter.config (id) VALUES (true) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------- key state
-- NON-SECRET epoch bookkeeping only. Key MATERIAL lives in Vault, never here.
CREATE TABLE limiter.key_state (
  id            boolean PRIMARY KEY DEFAULT true CHECK (id),
  epoch         bigint  NOT NULL,
  reseed_anchor bigint  NOT NULL
);
-- Seeded at epoch -1 (meaning "no key yet") ON PURPOSE. The row must exist from
-- the start so SELECT ... FOR UPDATE always has a row to serialise on. Without
-- it, concurrent first-callers each find no row, each generate their OWN random
-- key, and therefore derive DIFFERENT bucket keys for the same network - which
-- silently multiplies the effective allowance.
INSERT INTO limiter.key_state (id, epoch, reseed_anchor) VALUES (true, -1, -1)
  ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------- the ledger
CREATE TABLE limiter.bucket (
  bucket_key     bytea   NOT NULL,
  window_id      bigint  NOT NULL,
  units_consumed integer NOT NULL DEFAULT 0 CHECK (units_consumed >= 0),
  grants_issued  integer NOT NULL DEFAULT 0 CHECK (grants_issued  >= 0),
  PRIMARY KEY (bucket_key, window_id)
);

-- B2: composite FK to the parent bucket, ON DELETE CASCADE. A grant cannot exist
-- without its authority row, and deleting/recreating a bucket destroys every
-- grant that was drawing on it. No timestamp column: validity is window_id, which
-- also denies a ledger reader the mint-time oracle v3 carried in expires_at.
CREATE TABLE limiter.grant (
  grant_id       uuid    PRIMARY KEY,
  bucket_key     bytea   NOT NULL,
  window_id      bigint  NOT NULL,
  allowance      integer NOT NULL CHECK (allowance > 0),
  units_consumed integer NOT NULL DEFAULT 0 CHECK (units_consumed >= 0),
  CONSTRAINT grant_within_allowance CHECK (units_consumed <= allowance),
  CONSTRAINT grant_parent_fk FOREIGN KEY (bucket_key, window_id)
    REFERENCES limiter.bucket (bucket_key, window_id) ON DELETE CASCADE
);
CREATE INDEX grant_parent_idx ON limiter.grant (bucket_key, window_id);

-- ------------------------------------------------------------ pure primitives
-- Pure and locally testable; no Vault, no I/O.
CREATE FUNCTION limiter.window_of(p_at timestamptz, p_window_seconds integer)
RETURNS bigint LANGUAGE sql IMMUTABLE AS $$
  SELECT floor(extract(epoch FROM p_at) / p_window_seconds)::bigint
$$;

CREATE FUNCTION limiter.ratchet(p_key bytea, p_next_epoch bigint)
RETURNS bytea LANGUAGE sql IMMUTABLE AS $$
  SELECT extensions.hmac(('fda028-ratchet-v1|' || p_next_epoch::text)::bytea,
                         p_key, 'sha256')
$$;

CREATE FUNCTION limiter.derive_bucket_key(p_epoch_key bytea, p_prefix text)
RETURNS bytea LANGUAGE sql IMMUTABLE AS $$
  SELECT substring(
    extensions.hmac(('fda028-bucket-v1|' || p_prefix)::bytea, p_epoch_key, 'sha256')
    FROM 1 FOR 16)
$$;

-- Unwraps every IPv4-embedding IPv6 form this design must not collapse. Returns
-- the embedded IPv4 as inet, or NULL when the address embeds no IPv4.
--   ::ffff:0:0/96  RFC 4291 IPv4-mapped
--   64:ff9b::/96   RFC 6052 well-known NAT64  (live on IPv6-only mobile carriers)
--   64:ff9b:1::/96 RFC 8215 local-use NAT64
--   ::/96          RFC 4291 IPv4-compatible (deprecated, still seen)
-- Masking any of these to /64 would destroy the embedded host bits and collapse
-- unrelated subscribers into one bucket.
CREATE FUNCTION limiter.embedded_ipv4(p_addr inet)
RETURNS inet LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_base inet;
BEGIN
  IF family(p_addr) <> 6 THEN RETURN NULL; END IF;
  IF    p_addr <<= '::ffff:0:0/96'::inet   THEN v_base := '::ffff:0:0'::inet;
  ELSIF p_addr <<= '64:ff9b::/96'::inet    THEN v_base := '64:ff9b::'::inet;
  ELSIF p_addr <<= '64:ff9b:1::/96'::inet  THEN v_base := '64:ff9b:1::'::inet;
  ELSIF p_addr <<= '::/96'::inet           THEN v_base := '::'::inet;
  ELSE  RETURN NULL;
  END IF;
  RETURN '0.0.0.0'::inet + (p_addr - v_base);
EXCEPTION WHEN others THEN
  RETURN NULL;
END $$;

-- Canonical network normalization. Returns NULL for anything unusable, so every
-- caller fails closed. IPv4-mapped IPv6 is unwrapped BEFORE any generic IPv6
-- prefixing, so ::ffff:192.0.2.1 and ::ffff:192.0.2.99 cannot collapse together.
CREATE FUNCTION limiter.normalize_source(p_raw text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_addr   inet;
  v_embedded inet;
  v_cfg    limiter.config%ROWTYPE;
BEGIN
  IF p_raw IS NULL THEN RETURN NULL; END IF;
  -- Single-valued only: a comma or any whitespace means this is not the trusted
  -- single-value shape cf-connecting-ip is measured to have.
  IF p_raw ~ '[,[:space:]]' OR p_raw = '' THEN RETURN NULL; END IF;

  SELECT * INTO v_cfg FROM limiter.config WHERE id;

  BEGIN
    v_addr := p_raw::inet;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  -- A masked value such as 10.0.0.0/8 is not a host address.
  -- NOTE: written without an inline CASE on purpose. PL/pgSQL's IF parser stops
  -- at the first THEN at paren depth 0, so a bare CASE..THEN inside an IF
  -- condition silently truncates the expression.
  IF (family(v_addr) = 4 AND masklen(v_addr) <> 32)
     OR (family(v_addr) = 6 AND masklen(v_addr) <> 128) THEN
    RETURN NULL;
  END IF;

  -- Every IPv4-embedding IPv6 form -> unwrap FIRST, before any /64 masking.
  IF family(v_addr) = 6 THEN
    v_embedded := limiter.embedded_ipv4(v_addr);
    IF v_embedded IS NOT NULL THEN
      v_addr := v_embedded;
    END IF;
  END IF;

  IF COALESCE(v_cfg.require_public_ip, true) AND NOT limiter.is_public_unicast(v_addr) THEN
    RETURN NULL;
  END IF;

  -- network() is required, NOT host(): host() strips the netmask but KEEPS the
  -- host bits, so host(set_masklen(addr,64)) returns the full address and every
  -- /64 would be its own bucket. network() zeroes the host bits and renders the
  -- prefix length, which is what makes prefix grouping actually group.
  IF family(v_addr) = 4 THEN
    RETURN 'v4:' || network(set_masklen(v_addr, COALESCE(v_cfg.ipv4_prefix, 32)))::text;
  END IF;
  RETURN 'v6:' || network(set_masklen(v_addr, COALESCE(v_cfg.ipv6_prefix, 64)))::text;
END $$;

CREATE FUNCTION limiter.is_public_unicast(p_addr inet)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE family(p_addr)
    WHEN 4 THEN NOT (p_addr <<= '0.0.0.0/8'      OR p_addr <<= '10.0.0.0/8'
                  OR p_addr <<= '127.0.0.0/8'    OR p_addr <<= '169.254.0.0/16'
                  OR p_addr <<= '172.16.0.0/12'  OR p_addr <<= '192.168.0.0/16'
                  OR p_addr <<= '100.64.0.0/10'  OR p_addr <<= '224.0.0.0/4'
                  OR p_addr <<= '240.0.0.0/4')
    ELSE          NOT (p_addr <<= '::/128'        OR p_addr <<= '::1/128'
                  OR p_addr <<= 'fe80::/10'      OR p_addr <<= 'fc00::/7'
                  OR p_addr <<= 'ff00::/8')
  END
$$;

COMMIT;

BEGIN;

-- ------------------------------------------------------------- epoch key I/O
-- Key MATERIAL is held in Vault. Where Vault is absent (a disposable local test
-- database) the same shipped code falls through to limiter.dev_key_material,
-- a table this migration deliberately does NOT create - the local test fixture
-- does. In any environment where Vault exists the Vault branch is taken, so the
-- fallback is unreachable in production rather than merely discouraged. If
-- neither is available the function RAISES: fail closed, never silently keyless.
CREATE FUNCTION limiter.current_epoch_key(p_now timestamptz)
RETURNS TABLE (epoch bigint, epoch_key bytea)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'limiter', 'extensions', 'pg_temp' AS $$
DECLARE
  v_cfg    limiter.config%ROWTYPE;
  v_state  limiter.key_state%ROWTYPE;
  v_target bigint;
  v_key    bytea;
  v_steps  integer := 0;
BEGIN
  SELECT * INTO v_cfg FROM limiter.config WHERE id;
  v_target := limiter.window_of(p_now, v_cfg.window_seconds);

  -- Fast path: no lock while the stored epoch is already current.
  SELECT * INTO v_state FROM limiter.key_state WHERE id;
  IF v_state.epoch = v_target THEN
    RETURN QUERY SELECT v_state.epoch, limiter.read_epoch_key(); RETURN;
  END IF;

  -- Slow path: take the row lock, then RE-CHECK. Another session may have
  -- advanced the epoch while this one waited.
  SELECT * INTO v_state FROM limiter.key_state WHERE id FOR UPDATE;
  IF v_state.epoch = v_target THEN
    RETURN QUERY SELECT v_state.epoch, limiter.read_epoch_key(); RETURN;
  END IF;

  IF v_state.epoch < 0 THEN
    -- First ever key for this database.
    v_key := extensions.gen_random_bytes(32);
    v_state.epoch := v_target;
    v_state.reseed_anchor := v_target;
  ELSE
    v_key := limiter.read_epoch_key();
    -- A caller cannot force advancement: the target epoch is a pure function of
    -- request time. Advance forward only, never backward.
    WHILE v_state.epoch < v_target LOOP
      v_steps := v_steps + 1;
      IF v_steps > v_cfg.catchup_cap THEN
        -- Too stale to ratchet economically. Re-seeding only DESTROYS more history.
        v_key := extensions.gen_random_bytes(32);
        v_state.epoch := v_target;
        v_state.reseed_anchor := v_target;
        EXIT;
      END IF;
      v_state.epoch := v_state.epoch + 1;
      IF v_state.epoch - v_state.reseed_anchor >= v_cfg.reseed_interval THEN
        -- Periodic re-seed bounds how far an OLD leaked key can ratchet forward.
        v_key := extensions.gen_random_bytes(32);
        v_state.reseed_anchor := v_state.epoch;
      ELSE
        v_key := limiter.ratchet(v_key, v_state.epoch);
      END IF;
    END LOOP;
  END IF;

  UPDATE limiter.key_state
     SET epoch = v_state.epoch, reseed_anchor = v_state.reseed_anchor WHERE id;
  PERFORM limiter.write_epoch_key(v_key);
  RETURN QUERY SELECT v_state.epoch, v_key;
END $$;

CREATE FUNCTION limiter.read_epoch_key()
RETURNS bytea LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'limiter', 'extensions', 'pg_temp' AS $$
DECLARE v_txt text;
BEGIN
  IF to_regclass('vault.decrypted_secrets') IS NOT NULL THEN
    EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1'
      INTO v_txt USING 'fda028_limiter_epoch_key';
    IF v_txt IS NULL THEN
      RAISE EXCEPTION 'FDA028: limiter epoch key absent' USING ERRCODE = 'P0001';
    END IF;
    RETURN decode(v_txt, 'hex');
  END IF;
  IF to_regclass('limiter.dev_key_material') IS NOT NULL THEN
    EXECUTE 'SELECT k FROM limiter.dev_key_material WHERE id' INTO v_txt;
    IF v_txt IS NULL THEN
      RAISE EXCEPTION 'FDA028: limiter epoch key absent' USING ERRCODE = 'P0001';
    END IF;
    RETURN decode(v_txt, 'hex');
  END IF;
  RAISE EXCEPTION 'FDA028: no key store available' USING ERRCODE = 'P0001';
END $$;

CREATE FUNCTION limiter.write_epoch_key(p_key bytea)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'limiter', 'extensions', 'pg_temp' AS $$
DECLARE v_id uuid;
BEGIN
  IF to_regclass('vault.decrypted_secrets') IS NOT NULL THEN
    EXECUTE 'SELECT id FROM vault.secrets WHERE name = $1'
      INTO v_id USING 'fda028_limiter_epoch_key';
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'FDA028: limiter epoch key secret not provisioned'
        USING ERRCODE = 'P0001';
    END IF;
    -- update_secret OVERWRITES in place: the prior key value is destroyed
    -- without needing a delete API, which Supabase Vault does not document.
    EXECUTE 'SELECT vault.update_secret($1, $2)' USING v_id, encode(p_key, 'hex');
    RETURN;
  END IF;
  IF to_regclass('limiter.dev_key_material') IS NOT NULL THEN
    EXECUTE 'UPDATE limiter.dev_key_material SET k = $1 WHERE id'
      USING encode(p_key, 'hex');
    RETURN;
  END IF;
  RAISE EXCEPTION 'FDA028: no key store available' USING ERRCODE = 'P0001';
END $$;

COMMIT;

BEGIN;

-- ------------------------------------------------- admission core (shared)
-- Returns the decision and the grant. The CALLER performs the guest write in the
-- SAME transaction, so admission and the write cannot be separated.
CREATE FUNCTION limiter.admit_at(p_source_raw text, p_grant uuid, p_now timestamptz)
RETURNS TABLE (decision text, out_grant uuid, remaining integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'limiter', 'extensions', 'pg_temp' AS $$
DECLARE
  v_cfg     limiter.config%ROWTYPE;
  v_prefix  text;
  v_epoch   bigint;
  v_key     bytea;
  v_bucket  bytea;
  v_window  bigint;
  b         limiter.bucket%ROWTYPE;   -- %ROWTYPE, never RECORD: a RECORD is
  g         limiter.grant%ROWTYPE;    -- unassigned when its SELECT is skipped
  v_opening integer;
BEGIN
  SELECT * INTO v_cfg FROM limiter.config WHERE id;
  IF NOT COALESCE(v_cfg.enabled, true) THEN
    RETURN QUERY SELECT 'ADMITTED_LIMITER_DISABLED'::text, NULL::uuid, NULL::integer;
    RETURN;
  END IF;

  -- FAIL CLOSED on a missing or unusable trusted signal. No fallback to any
  -- caller-controlled header, and no fallback to a weaker shared pool.
  v_prefix := limiter.normalize_source(p_source_raw);
  IF v_prefix IS NULL THEN
    RETURN QUERY SELECT 'REFUSED_NO_TRUSTED_SIGNAL'::text, NULL::uuid, 0; RETURN;
  END IF;

  SELECT epoch, epoch_key INTO v_epoch, v_key FROM limiter.current_epoch_key(p_now);
  v_window := limiter.window_of(p_now, v_cfg.window_seconds);
  v_bucket := limiter.derive_bucket_key(v_key, v_prefix);

  INSERT INTO limiter.bucket AS t (bucket_key, window_id) VALUES (v_bucket, v_window)
    ON CONFLICT (bucket_key, window_id) DO UPDATE SET units_consumed = t.units_consumed;
  SELECT * INTO b FROM limiter.bucket
    WHERE bucket_key = v_bucket AND window_id = v_window FOR UPDATE;

  IF p_grant IS NOT NULL THEN
    SELECT * INTO g FROM limiter.grant
      WHERE grant_id = p_grant AND bucket_key = v_bucket AND window_id = v_window
      FOR UPDATE;
  END IF;

  IF g.grant_id IS NULL THEN
    -- No grant-slot cap. BUCKET_ALLOWANCE is the sole authority, so a resetting
    -- client cannot starve later clients while units remain. Row growth is
    -- bounded because a mint with no remaining capacity is refused BEFORE any
    -- row is created, and every successful mint spends a unit in this same call.
    v_opening := LEAST(v_cfg.normal_allowance, v_cfg.bucket_allowance - b.units_consumed);
    IF v_opening <= 0 THEN
      RETURN QUERY SELECT 'REFUSED_BUCKET_EXHAUSTED'::text, NULL::uuid, 0; RETURN;
    END IF;
    INSERT INTO limiter.grant (grant_id, bucket_key, window_id, allowance)
      VALUES (extensions.gen_random_uuid(), v_bucket, v_window, v_opening)
      RETURNING * INTO g;
    UPDATE limiter.bucket SET grants_issued = grants_issued + 1
      WHERE bucket_key = v_bucket AND window_id = v_window;
  END IF;

  IF b.units_consumed >= v_cfg.bucket_allowance THEN
    RETURN QUERY SELECT 'REFUSED_BUCKET'::text, g.grant_id, 0; RETURN; END IF;
  IF g.units_consumed >= g.allowance THEN
    RETURN QUERY SELECT 'REFUSED_GRANT'::text, g.grant_id, 0; RETURN; END IF;

  UPDATE limiter.bucket SET units_consumed = units_consumed + 1
    WHERE bucket_key = v_bucket AND window_id = v_window;
  UPDATE limiter.grant SET units_consumed = units_consumed + 1
    WHERE grant_id = g.grant_id;

  RETURN QUERY SELECT 'ADMITTED'::text, g.grant_id, g.allowance - g.units_consumed - 1;
END $$;

-- -------------------------------------------- COMPLETE PATH: admit AND write
-- OWNER-ONLY. Takes an explicit clock for tests and operations. Never granted to
-- service_role, anon or authenticated: a caller-supplied clock can force a key
-- ratchet, which orphans every live bucket in the current window and hands the
-- next request a brand-new fully-funded bucket.
CREATE FUNCTION limiter.admit_guest_flag_at(
  p_source_raw  text,
  p_grant       uuid,
  p_lat         double precision,
  p_lng         double precision,
  p_category    text,
  p_severity    integer,
  p_description text,
  p_now         timestamptz
) RETURNS TABLE (decision text, out_grant uuid, remaining integer, flag_id uuid)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'limiter', 'public', 'extensions', 'pg_temp' AS $$
DECLARE d text; gr uuid; rem integer; new_id uuid;
BEGIN
  SELECT a.decision, a.out_grant, a.remaining INTO d, gr, rem
    FROM limiter.admit_at(p_source_raw, p_grant, p_now) a;

  IF d NOT IN ('ADMITTED', 'ADMITTED_LIMITER_DISABLED') THEN
    RETURN QUERY SELECT d, gr, rem, NULL::uuid; RETURN;
  END IF;

  INSERT INTO public.flags (lat, lng, category, severity, description, photo_url, status)
  VALUES (p_lat, p_lng, p_category, p_severity, p_description, NULL, 'open')
  RETURNING id INTO new_id;

  RETURN QUERY SELECT d, gr, rem, new_id;
END $$;

-- OWNER-ONLY, same reasoning as limiter.admit_guest_flag_at.
CREATE FUNCTION limiter.admit_guest_feedback_at(
  p_source_raw text,
  p_grant      uuid,
  p_category   text,
  p_body       text,
  p_platform   text,
  p_now        timestamptz
) RETURNS TABLE (decision text, out_grant uuid, remaining integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'limiter', 'public', 'extensions', 'pg_temp' AS $$
DECLARE d text; gr uuid; rem integer;
BEGIN
  SELECT a.decision, a.out_grant, a.remaining INTO d, gr, rem
    FROM limiter.admit_at(p_source_raw, p_grant, p_now) a;
  IF d NOT IN ('ADMITTED', 'ADMITTED_LIMITER_DISABLED') THEN
    RETURN QUERY SELECT d, gr, rem; RETURN;
  END IF;
  INSERT INTO public.feedback (user_id, category, body, contact_email, platform)
  VALUES (NULL, p_category, p_body, NULL, p_platform);
  RETURN QUERY SELECT d, gr, rem;
END $$;

-- ------------------------------------------------------------------ retention
-- Deletes buckets; grants cascade with their parent, so no orphan can survive.
CREATE FUNCTION limiter.purge_at(p_now timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'limiter', 'pg_temp' AS $$
DECLARE v_cfg limiter.config%ROWTYPE; v_cutoff bigint; v_live bigint; v_n integer;
BEGIN
  SELECT * INTO v_cfg FROM limiter.config WHERE id;
  -- STRICTLY less-than, and hard-floored at the live window. With
  -- retention_windows = 0 the previous form deleted the CURRENT window, zeroing
  -- a live ledger mid-window and letting BUCKET_ALLOWANCE be exceeded outright.
  v_live   := limiter.window_of(now(), v_cfg.window_seconds);
  v_cutoff := LEAST(limiter.window_of(p_now, v_cfg.window_seconds) - v_cfg.retention_windows,
                    v_live);
  DELETE FROM limiter.bucket WHERE window_id < v_cutoff;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;

-- ------------------------------------------------- GUEST-FACING ENTRY POINTS
-- These take NO clock. Time comes from now() inside the database, so a caller
-- cannot influence the epoch, the window, or the ratchet. These are the ONLY
-- limiter functions granted to service_role.
CREATE FUNCTION limiter.admit_guest_flag(
  p_source_raw  text,
  p_grant       uuid,
  p_lat         double precision,
  p_lng         double precision,
  p_category    text,
  p_severity    integer,
  p_description text
) RETURNS TABLE (decision text, out_grant uuid, remaining integer, flag_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'limiter', 'pg_temp' AS $$
  SELECT * FROM limiter.admit_guest_flag_at(p_source_raw, p_grant, p_lat, p_lng,
                                            p_category, p_severity, p_description, now())
$$;

CREATE FUNCTION limiter.admit_guest_feedback(
  p_source_raw text,
  p_grant      uuid,
  p_category   text,
  p_body       text,
  p_platform   text
) RETURNS TABLE (decision text, out_grant uuid, remaining integer)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'limiter', 'pg_temp' AS $$
  SELECT * FROM limiter.admit_guest_feedback_at(p_source_raw, p_grant, p_category,
                                                p_body, p_platform, now())
$$;

CREATE FUNCTION limiter.purge()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path TO 'limiter', 'pg_temp' AS $$
  SELECT limiter.purge_at(now())
$$;

-- ------------------------------------------------------------------ privileges
-- No precedent exists in this codebase for an Edge Function reaching Postgres as
-- any role other than service_role, so v4 uses service_role rather than a bespoke
-- role whose connection path is unproven. anon and authenticated get nothing.
REVOKE ALL ON ALL TABLES    IN SCHEMA limiter FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA limiter FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA limiter TO service_role;
-- Only the clockless entry points are reachable. The *_at variants stay
-- owner-only so no caller can supply a clock.
GRANT EXECUTE ON FUNCTION
  limiter.admit_guest_flag(text, uuid, double precision, double precision, text, integer, text),
  limiter.admit_guest_feedback(text, uuid, text, text, text),
  limiter.purge()
TO service_role;

COMMIT;
