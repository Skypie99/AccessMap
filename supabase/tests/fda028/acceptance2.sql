-- PGTAP_KIND: raising-proof
\set ON_ERROR_STOP on
\set QUIET on
CREATE OR REPLACE FUNCTION pass(t text, ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN RAISE NOTICE '%  %', CASE WHEN ok THEN 'ok  ' ELSE 'FAIL' END, t;
  IF NOT ok THEN RAISE EXCEPTION 'FAILED: %', t; END IF; END $$;
DO $blk$
DECLARE
  d text; gr uuid; rem int; fid uuid; n int; bk bytea; g1 uuid; g2 uuid;
  t0 timestamptz := '2026-09-09 12:00:00+00';
  flags0 int; fb0 int;
BEGIN
  -- ===== FAIL CLOSED + FULL INSERT ENFORCEMENT =====
  SELECT count(*) INTO flags0 FROM public.flags;
  SELECT a.decision, a.flag_id INTO d, fid
    FROM limiter.admit_guest_flag_at(NULL, NULL, 1, 2, 'ramp', 3, 'x', t0) a;
  PERFORM pass('fail-closed: missing signal refused', d = 'REFUSED_NO_TRUSTED_SIGNAL');
  PERFORM pass('fail-closed: NO row written on refusal',
    (SELECT count(*) FROM public.flags) = flags0 AND fid IS NULL);

  SELECT a.decision, a.flag_id INTO d, fid
    FROM limiter.admit_guest_flag_at('not-an-ip', NULL, 1, 2, 'ramp', 3, 'x', t0) a;
  PERFORM pass('fail-closed: malformed signal refused', d = 'REFUSED_NO_TRUSTED_SIGNAL');
  PERFORM pass('fail-closed: still no row', (SELECT count(*) FROM public.flags) = flags0);

  SELECT a.decision, a.out_grant, a.flag_id INTO d, gr, fid
    FROM limiter.admit_guest_flag_at('198.51.100.10', NULL, 10.5, 20.5, 'ramp', 3, 'desc', t0) a;
  PERFORM pass('full path: admitted', d = 'ADMITTED');
  PERFORM pass('full path: REAL ROW WRITTEN', fid IS NOT NULL
    AND (SELECT count(*) FROM public.flags WHERE id = fid) = 1);
  PERFORM pass('full path: row has guest shape',
    (SELECT user_id IS NULL AND photo_url IS NULL AND status='open'
       FROM public.flags WHERE id = fid));

  SELECT count(*) INTO fb0 FROM public.feedback;
  SELECT a.decision INTO d FROM limiter.admit_guest_feedback_at('198.51.100.11', NULL, 'bug', 'body', 'ios', t0) a;
  PERFORM pass('feedback: admitted + row written',
    d='ADMITTED' AND (SELECT count(*) FROM public.feedback) = fb0 + 1);
  SELECT a.decision INTO d FROM limiter.admit_guest_feedback_at(NULL, NULL, 'bug', 'body', 'ios', t0) a;
  PERFORM pass('feedback: fail-closed writes nothing',
    d='REFUSED_NO_TRUSTED_SIGNAL' AND (SELECT count(*) FROM public.feedback) = fb0 + 1);

  -- ===== SESSION RESET CONTINUITY (normal=2, bucket=6) =====
  -- one client exhausts its grant
  SELECT a.out_grant INTO g1 FROM limiter.admit_guest_flag_at('203.0.113.50', NULL, 1,2,'ramp',3,'a', t0) a;
  SELECT a.decision INTO d FROM limiter.admit_guest_flag_at('203.0.113.50', g1, 1,2,'ramp',3,'b', t0) a;
  PERFORM pass('reset: second spend admitted', d='ADMITTED');
  SELECT a.decision INTO d FROM limiter.admit_guest_flag_at('203.0.113.50', g1, 1,2,'ramp',3,'c', t0) a;
  PERFORM pass('reset: grant exhausted', d='REFUSED_GRANT');
  -- client discards ALL state and asks again
  SELECT a.decision, a.out_grant INTO d, g2 FROM limiter.admit_guest_flag_at('203.0.113.50', NULL, 1,2,'ramp',3,'d', t0) a;
  PERFORM pass('reset: fresh envelope granted', d='ADMITTED' AND g2 <> g1);
  SELECT units_consumed INTO n FROM limiter.bucket
    WHERE bucket_key = limiter.derive_bucket_key((SELECT epoch_key FROM limiter.current_epoch_key(t0)),
                                                 limiter.normalize_source('203.0.113.50'));
  PERFORM pass('reset: underlying bucket KEPT the spend (3 not 1)', n = 3);
  -- keep resetting; must terminate at bucket_allowance, never beyond
  FOR n IN 1..12 LOOP
    SELECT a.decision INTO d FROM limiter.admit_guest_flag_at('203.0.113.50', NULL, 1,2,'ramp',3,'e', t0) a;
    EXIT WHEN d <> 'ADMITTED';
  END LOOP;
  PERFORM pass('reset: repeated resets terminate', d LIKE 'REFUSED%');
  SELECT units_consumed INTO n FROM limiter.bucket
    WHERE bucket_key = limiter.derive_bucket_key((SELECT epoch_key FROM limiter.current_epoch_key(t0)),
                                                 limiter.normalize_source('203.0.113.50'));
  PERFORM pass('reset: never exceeded BUCKET_ALLOWANCE', n <= 6);
  -- natural window renewal
  -- The anti-backward clamp means the epoch is sticky at the highest reached,
  -- so renewal must advance past every window earlier assertions touched.
  SELECT a.decision INTO d FROM limiter.admit_guest_flag_at('203.0.113.50', NULL, 1,2,'ramp',3,'f', t0 + interval '1200 seconds') a;
  PERFORM pass('reset: natural window renewal restores budget', d='ADMITTED');

  -- ===== CLIENT INDEPENDENCE =====
  SELECT a.out_grant INTO g1 FROM limiter.admit_guest_flag_at('203.0.113.60', NULL, 1,2,'ramp',3,'a', t0) a;
  SELECT a.out_grant INTO g2 FROM limiter.admit_guest_flag_at('203.0.113.60', NULL, 1,2,'ramp',3,'b', t0) a;
  PERFORM pass('independence: two grants on one bucket', g1 <> g2);
  PERFORM limiter.admit_guest_flag_at('203.0.113.60', g1, 1,2,'ramp',3,'c', t0);
  SELECT a.decision INTO d FROM limiter.admit_guest_flag_at('203.0.113.60', g1, 1,2,'ramp',3,'d', t0) a;
  PERFORM pass('independence: A exhausted', d='REFUSED_GRANT');
  SELECT a.decision INTO d FROM limiter.admit_guest_flag_at('203.0.113.60', g2, 1,2,'ramp',3,'e', t0) a;
  PERFORM pass('independence: B still usable', d='ADMITTED');
  -- starvation: many resets must not lock out a brand-new client while units remain
  UPDATE limiter.config SET bucket_allowance = 50;
  FOR n IN 1..5 LOOP
    PERFORM limiter.admit_guest_flag_at('203.0.113.70', NULL, 1,2,'ramp',3,'r', t0);
  END LOOP;
  SELECT a.decision INTO d FROM limiter.admit_guest_flag_at('203.0.113.70', NULL, 1,2,'ramp',3,'new', t0) a;
  PERFORM pass('independence: brand-new client after 5 resets NOT starved', d='ADMITTED');
  UPDATE limiter.config SET bucket_allowance = 6;

  -- ===== ROW GROWTH BOUND =====
  SELECT count(*) INTO n FROM limiter.grant g
    JOIN limiter.bucket b USING (bucket_key, window_id)
   WHERE b.units_consumed < (SELECT bucket_allowance FROM limiter.config WHERE id) + 1;
  PERFORM pass('growth: grant rows never exceed bucket units',
    NOT EXISTS (SELECT 1 FROM limiter.bucket b
                WHERE b.grants_issued > b.units_consumed));
END $blk$;
