-- PGTAP_KIND: raising-proof
\set ON_ERROR_STOP on
\set QUIET on
CREATE OR REPLACE FUNCTION pass(t text, ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN RAISE NOTICE '%  %', CASE WHEN ok THEN 'ok  ' ELSE 'FAIL' END, t;
  IF NOT ok THEN RAISE EXCEPTION 'FAILED: %', t; END IF; END $$;
DO $blk$
DECLARE
  d text; gr uuid; g1 uuid; n int; bk bytea; w bigint; orphan int;
  t0 timestamptz := '2026-09-09 12:00:00+00';
BEGIN
  -- ===== BUCKET / GRANT LIFECYCLE (v3 blocker 2) =====
  SELECT a.out_grant INTO g1 FROM limiter.admit_guest_flag_at('203.0.113.90', NULL, 1,2,'ramp',3,'a', t0) a;
  SELECT limiter.derive_bucket_key((SELECT epoch_key FROM limiter.current_epoch_key(t0)),
                                   limiter.normalize_source('203.0.113.90')) INTO bk;
  -- window_id IS the epoch now, so read it from the same source the
  -- admission path used rather than recomputing it from the clock.
  SELECT epoch INTO w FROM limiter.current_epoch_key(t0);
  PERFORM pass('lifecycle: grant exists under its bucket',
    (SELECT count(*) FROM limiter.grant WHERE grant_id=g1 AND bucket_key=bk AND window_id=w)=1);

  DELETE FROM limiter.bucket WHERE bucket_key=bk AND window_id=w;
  SELECT count(*) INTO orphan FROM limiter.grant WHERE grant_id=g1;
  PERFORM pass('lifecycle: bucket delete CASCADES the grant away', orphan = 0);
  PERFORM pass('lifecycle: no orphan grant anywhere',
    NOT EXISTS (SELECT 1 FROM limiter.grant g
                WHERE NOT EXISTS (SELECT 1 FROM limiter.bucket b
                                  WHERE b.bucket_key=g.bucket_key AND b.window_id=g.window_id)));

  -- recreated bucket cannot be paired with the stale grant
  SELECT a.decision INTO d FROM limiter.admit_guest_flag_at('203.0.113.90', g1, 1,2,'ramp',3,'b', t0) a;
  PERFORM pass('lifecycle: stale grant cannot bind to a recreated bucket', d='ADMITTED');
  SELECT count(*) INTO n FROM limiter.grant WHERE grant_id=g1;
  PERFORM pass('lifecycle: stale grant id was NOT resurrected', n = 0);
  SELECT units_consumed INTO n FROM limiter.bucket WHERE bucket_key=bk AND window_id=w;
  PERFORM pass('lifecycle: recreated bucket starts from clean authority', n = 1);

  -- orphan insertion is structurally impossible
  BEGIN
    INSERT INTO limiter.grant (grant_id, bucket_key, window_id, allowance)
      VALUES (extensions.gen_random_uuid(), '\xdeadbeef'::bytea, 999999, 5);
    PERFORM pass('lifecycle: orphan grant insert REJECTED', false);
  EXCEPTION WHEN foreign_key_violation THEN
    PERFORM pass('lifecycle: orphan grant insert REJECTED', true);
  END;

  -- purge removes buckets and cascades grants
  PERFORM limiter.admit_guest_flag_at('203.0.113.91', NULL, 1,2,'ramp',3,'a', t0);
  SELECT limiter.purge_at(t0 + interval '600 seconds') INTO n;
  PERFORM pass('lifecycle: purge removed old buckets', n > 0);
  PERFORM pass('lifecycle: purge left no orphan grants',
    NOT EXISTS (SELECT 1 FROM limiter.grant g
                WHERE NOT EXISTS (SELECT 1 FROM limiter.bucket b
                                  WHERE b.bucket_key=g.bucket_key AND b.window_id=g.window_id)));

  -- ===== KILL SWITCH =====
  UPDATE limiter.config SET enabled=false;
  SELECT a.decision, a.flag_id INTO d, gr FROM limiter.admit_guest_flag_at('203.0.113.92', NULL, 1,2,'ramp',3,'a', t0) a;
  PERFORM pass('killswitch: admits and STILL writes the row',
    d='ADMITTED_LIMITER_DISABLED' AND gr IS NOT NULL);
  UPDATE limiter.config SET enabled=true;

  -- ===== FAILURE MODES =====
  -- expired window / stale grant from a previous window
  SELECT a.out_grant INTO g1 FROM limiter.admit_guest_flag_at('203.0.113.93', NULL, 1,2,'ramp',3,'a', t0) a;
  SELECT a.decision INTO d FROM limiter.admit_guest_flag_at('203.0.113.93', g1, 1,2,'ramp',3,'b', t0 + interval '3600 seconds') a;
  PERFORM pass('failure: stale grant from an old window ignored, fresh envelope issued', d='ADMITTED');

  -- key store unavailable -> fail closed, no row
  SELECT count(*) INTO n FROM public.flags;
  UPDATE limiter.dev_key_material SET k = NULL;
  BEGIN
    PERFORM limiter.admit_guest_flag_at('203.0.113.94', NULL, 1,2,'ramp',3,'a', t0 + interval '7200 seconds');
    PERFORM pass('failure: absent key material RAISES', false);
  EXCEPTION WHEN sqlstate 'P0001' THEN
    PERFORM pass('failure: absent key material RAISES (fail closed)', true);
  END;
  PERFORM pass('failure: no row written when key unavailable',
    (SELECT count(*) FROM public.flags) = n);
  -- Restore the key store: epoch -1 makes the next call re-seed cleanly, so this
  -- destructive failure-mode test cannot poison anything that follows it.
  UPDATE limiter.key_state SET epoch = -1, reseed_anchor = -1;
  PERFORM pass('failure: key store recovers after re-seed',
    (SELECT epoch_key FROM limiter.current_epoch_key(now())) IS NOT NULL);
END $blk$;

-- ===== REGRESSIONS FROM THE INDEPENDENT V4 REVIEW =====
DO $blk$
DECLARE d text; n int; u1 int; u2 int; e1 bigint; e2 bigint;
  t0 timestamptz := '2026-09-09 12:00:00+00';
BEGIN
  -- REV-1: guest entry points must NOT accept a caller clock.
  -- pg_get_function_identity_arguments includes PARAMETER NAMES, so match on
  -- arity instead of a bare type list.
  PERFORM pass('rev1: clockless admit_guest_flag exists (7 args, no clock)',
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n2 ON n2.oid=p.pronamespace
            WHERE n2.nspname='limiter' AND p.proname='admit_guest_flag' AND p.pronargs=7));
  PERFORM pass('rev1: clocked variant is a SEPARATE 8-arg function',
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n2 ON n2.oid=p.pronamespace
            WHERE n2.nspname='limiter' AND p.proname='admit_guest_flag_at' AND p.pronargs=8));
  PERFORM pass('rev1: NO limiter function granted to service_role accepts a timestamptz',
    NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n2 ON n2.oid=p.pronamespace
      WHERE n2.nspname='limiter'
        AND has_function_privilege('service_role', p.oid, 'EXECUTE')
        AND 'timestamptz'::regtype = ANY (p.proargtypes::oid[])));
  PERFORM pass('rev1: clocked variant is NOT granted to service_role',
    NOT has_function_privilege('service_role',
      'limiter.admit_guest_flag_at(text, uuid, double precision, double precision, text, integer, text, timestamptz)',
      'EXECUTE'));
  PERFORM pass('rev1: clockless variant IS granted to service_role',
    has_function_privilege('service_role',
      'limiter.admit_guest_flag(text, uuid, double precision, double precision, text, integer, text)',
      'EXECUTE'));
  PERFORM pass('rev1: purge_at not granted, purge() is',
    NOT has_function_privilege('service_role','limiter.purge_at(timestamptz)','EXECUTE')
    AND has_function_privilege('service_role','limiter.purge()','EXECUTE'));
  PERFORM pass('rev1: anon and authenticated get NOTHING',
    NOT has_function_privilege('anon',
      'limiter.admit_guest_flag(text, uuid, double precision, double precision, text, integer, text)','EXECUTE')
    AND NOT has_function_privilege('authenticated',
      'limiter.admit_guest_flag(text, uuid, double precision, double precision, text, integer, text)','EXECUTE'));

  -- REV-2: IPv4-embedding IPv6 forms must not collapse.
  PERFORM pass('rev2: NAT64 64:ff9b:: distinct addrs do NOT collapse',
    limiter.normalize_source('64:ff9b::203.0.113.1') <> limiter.normalize_source('64:ff9b::203.0.113.99'));
  PERFORM pass('rev2: NAT64 unwraps into the v4 namespace',
    limiter.normalize_source('64:ff9b::203.0.113.1') LIKE 'v4:%');
  PERFORM pass('rev2: NAT64 equals the bare IPv4',
    limiter.normalize_source('64:ff9b::203.0.113.1') = limiter.normalize_source('203.0.113.1'));
  PERFORM pass('rev2: RFC 8215 local-use NAT64 also unwraps',
    limiter.normalize_source('64:ff9b:1::203.0.113.1') = limiter.normalize_source('203.0.113.1'));
  PERFORM pass('rev2: genuine IPv6 still uses the v6 namespace',
    limiter.normalize_source('2001:db8:1:2::1') LIKE 'v6:%');

  -- REV-3: purge must never delete the LIVE window.
  UPDATE limiter.config SET retention_windows = 0, bucket_allowance = 4, normal_allowance = 2,
         window_seconds = 86400, require_public_ip = false;
  DELETE FROM limiter.bucket;
  PERFORM limiter.admit_guest_flag('203.0.113.140', NULL, 1,2,'ramp',3,'a');
  PERFORM limiter.admit_guest_flag('203.0.113.140', NULL, 1,2,'ramp',3,'b');
  SELECT units_consumed INTO u1 FROM limiter.bucket LIMIT 1;
  SELECT limiter.purge() INTO n;
  SELECT count(*) INTO u2 FROM limiter.bucket;
  PERFORM pass('rev3: purge with retention_windows=0 does NOT delete the live bucket',
    u2 = 1 AND n = 0);
  PERFORM limiter.admit_guest_flag('203.0.113.140', NULL, 1,2,'ramp',3,'c');
  PERFORM limiter.admit_guest_flag('203.0.113.140', NULL, 1,2,'ramp',3,'d');
  SELECT a.decision INTO d FROM limiter.admit_guest_flag('203.0.113.140', NULL, 1,2,'ramp',3,'e') a;
  PERFORM pass('rev3: BUCKET_ALLOWANCE still enforced after a purge attempt', d LIKE 'REFUSED%');
  SELECT units_consumed INTO u2 FROM limiter.bucket LIMIT 1;
  PERFORM pass('rev3: never exceeded allowance', u2 <= 4);
END $blk$;

-- ===== REGRESSIONS FROM THE V4-R2 RE-REVIEW =====
DO $blk$
DECLARE d text; e1 bigint; e2 bigint; u int;
BEGIN
  -- R2-A2: RFC 6052 Network-Specific Prefixes at every standard length.
  INSERT INTO limiter.translation_prefix (prefix, plen, note)
    VALUES ('2001:db8:aa::/56'::inet, 56, 'test NSP') ON CONFLICT DO NOTHING;
  PERFORM pass('r2a2: /56 NSP distinct hosts do NOT collapse',
    limiter.normalize_source('2001:0db8:00aa:00cb:0000:7101:0000:0000')
    <> limiter.normalize_source('2001:0db8:00aa:00cb:0000:7163:0000:0000'));
  PERFORM pass('r2a2: /56 NSP extracts the true IPv4',
    limiter.normalize_source('2001:0db8:00aa:00cb:0000:7101:0000:0000')
     = limiter.normalize_source('203.0.113.1'));
  PERFORM pass('r2a2: rfc6052 /96 extraction correct',
    limiter.rfc6052_ipv4('64:ff9b::cb00:7101'::inet, 96) = '203.0.113.1'::inet);
  PERFORM pass('r2a2: rfc6052 /64 extraction correct',
    limiter.rfc6052_ipv4('2001:0db8:00aa:00bb:00cb:0071:0100:0000'::inet, 64) = '203.0.113.1'::inet);
  PERFORM pass('r2a2: rfc6052 /32 extraction correct',
    limiter.rfc6052_ipv4('2001:db8:cb00:7101::'::inet, 32) = '203.0.113.1'::inet);
  PERFORM pass('r2a2: reserved u-octet must be zero',
    limiter.rfc6052_ipv4('2001:0db8:00aa:00cb:ff00:7101:0000:0000'::inet, 56) IS NULL);
  PERFORM pass('r2a2: hex expander round-trips a compressed address',
    limiter.ipv6_hex('2001:db8::1'::inet) = '20010db8000000000000000000000001');
  PERFORM pass('r2a2: hex expander handles a dotted tail',
    limiter.ipv6_hex('::ffff:203.0.113.1'::inet) = '00000000000000000000ffffcb007101');
  PERFORM pass('r2a2: genuine IPv6 outside every declared prefix stays v6',
    limiter.normalize_source('2600:1f18:1:2::5') LIKE 'v6:%');
  DELETE FROM limiter.translation_prefix WHERE prefix = '2001:db8:aa::/56'::inet;

  -- R2-A1: the CLOCKED path itself must now resist an absurd clock.
  SELECT epoch INTO e1 FROM limiter.key_state;
  PERFORM limiter.admit_guest_flag_at('203.0.113.201', NULL, 1,2,'ramp',3,'a', now() + interval '400 days');
  SELECT epoch INTO e2 FROM limiter.key_state;
  PERFORM pass('r2a1: far-future clock cannot jump more than one window', e2 - e1 <= 1);
  SELECT epoch INTO e1 FROM limiter.key_state;
  PERFORM limiter.admit_guest_flag_at('203.0.113.202', NULL, 1,2,'ramp',3,'b', now() - interval '900 days');
  SELECT epoch INTO e2 FROM limiter.key_state;
  PERFORM pass('r2a1: far-past clock cannot ratchet backward', e2 >= e1);
  PERFORM pass('r2a1: bucket window is bound to the epoch, never derived separately',
    NOT EXISTS (SELECT 1 FROM limiter.bucket b
                WHERE b.window_id > (SELECT epoch FROM limiter.key_state)));
END $blk$;
