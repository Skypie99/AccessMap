\set ON_ERROR_STOP on
\set QUIET on
DO $blk$
DECLARE
  d text; gr uuid; g1 uuid; n int; bk bytea; w bigint; orphan int;
  t0 timestamptz := '2026-09-09 12:00:00+00';
BEGIN
  -- ===== BUCKET / GRANT LIFECYCLE (v3 blocker 2) =====
  SELECT a.out_grant INTO g1 FROM limiter.admit_guest_flag('203.0.113.90', NULL, 1,2,'ramp',3,'a', t0) a;
  SELECT limiter.derive_bucket_key((SELECT epoch_key FROM limiter.current_epoch_key(t0)),
                                   limiter.normalize_source('203.0.113.90')) INTO bk;
  SELECT limiter.window_of(t0,(SELECT window_seconds FROM limiter.config WHERE id)) INTO w;
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
  SELECT a.decision INTO d FROM limiter.admit_guest_flag('203.0.113.90', g1, 1,2,'ramp',3,'b', t0) a;
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
  PERFORM limiter.admit_guest_flag('203.0.113.91', NULL, 1,2,'ramp',3,'a', t0);
  SELECT limiter.purge(t0 + interval '600 seconds') INTO n;
  PERFORM pass('lifecycle: purge removed old buckets', n > 0);
  PERFORM pass('lifecycle: purge left no orphan grants',
    NOT EXISTS (SELECT 1 FROM limiter.grant g
                WHERE NOT EXISTS (SELECT 1 FROM limiter.bucket b
                                  WHERE b.bucket_key=g.bucket_key AND b.window_id=g.window_id)));

  -- ===== KILL SWITCH =====
  UPDATE limiter.config SET enabled=false;
  SELECT a.decision, a.flag_id INTO d, gr FROM limiter.admit_guest_flag('203.0.113.92', NULL, 1,2,'ramp',3,'a', t0) a;
  PERFORM pass('killswitch: admits and STILL writes the row',
    d='ADMITTED_LIMITER_DISABLED' AND gr IS NOT NULL);
  UPDATE limiter.config SET enabled=true;

  -- ===== FAILURE MODES =====
  -- expired window / stale grant from a previous window
  SELECT a.out_grant INTO g1 FROM limiter.admit_guest_flag('203.0.113.93', NULL, 1,2,'ramp',3,'a', t0) a;
  SELECT a.decision INTO d FROM limiter.admit_guest_flag('203.0.113.93', g1, 1,2,'ramp',3,'b', t0 + interval '3600 seconds') a;
  PERFORM pass('failure: stale grant from an old window ignored, fresh envelope issued', d='ADMITTED');

  -- key store unavailable -> fail closed, no row
  SELECT count(*) INTO n FROM public.flags;
  UPDATE limiter.dev_key_material SET k = NULL;
  BEGIN
    PERFORM limiter.admit_guest_flag('203.0.113.94', NULL, 1,2,'ramp',3,'a', t0 + interval '7200 seconds');
    PERFORM pass('failure: absent key material RAISES', false);
  EXCEPTION WHEN sqlstate 'P0001' THEN
    PERFORM pass('failure: absent key material RAISES (fail closed)', true);
  END;
  PERFORM pass('failure: no row written when key unavailable',
    (SELECT count(*) FROM public.flags) = n);
END $blk$;
