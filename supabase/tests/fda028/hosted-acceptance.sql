-- PGTAP_KIND: raising-proof
-- PGTAP_EXECUTION: authorized-staging-only
-- FDA-028 hosted acceptance against the accepted real schema and Vault path.
-- This is exactly one prepared statement. Its final required exception carries
-- per-assertion JSON evidence and rolls back every database change atomically.
DO $proof$
DECLARE
  v_constraint text;
  v_invalid_category boolean := false;
  v_purged integer;
  v_result jsonb;
BEGIN
  SET LOCAL statement_timeout = '60s';
  SET LOCAL lock_timeout = '10s';

  CREATE TEMP TABLE fda028_clock AS
  SELECT now() AS live_at, now() - interval '5 minutes' AS old_at;

  CREATE TEMP TABLE fda028_result (
    step integer PRIMARY KEY,
    decision text,
    out_grant uuid,
    remaining integer,
    flag_id uuid
  );

  CREATE TEMP TABLE fda028_assertion (
    number integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    description text NOT NULL UNIQUE,
    passed boolean NOT NULL
  );

  BEGIN
    INSERT INTO public.flags (lat, lng, category, severity, description, photo_url, status)
    VALUES (49.2827, -123.1207, 'ramp', 3, 'fda028-invalid-category-control', NULL, 'open');
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
    v_invalid_category := v_constraint = 'flags_category_check';
  END;
  INSERT INTO fda028_assertion (description, passed) VALUES
    ('fixture: legacy ramp is rejected specifically by flags_category_check', v_invalid_category);

  INSERT INTO fda028_assertion (description, passed) VALUES
    ('key: hosted schema has no fixture-only dev_key_material table',
      to_regclass('limiter.dev_key_material') IS NULL),
    ('key: accepted Vault decrypted view exists',
      to_regclass('vault.decrypted_secrets') IS NOT NULL),
    ('key: exactly one limiter Vault secret is provisioned',
      (SELECT count(*) = 1 FROM vault.secrets WHERE name = 'fda028_limiter_epoch_key')),
    ('key: limiter reads a 32-byte key through the hosted Vault path',
      octet_length(limiter.read_epoch_key()) = 32),
    ('contract: clockless seven-argument flag entry point exists',
      to_regprocedure(
        'limiter.admit_guest_flag(text,uuid,double precision,double precision,text,integer,text)'
      ) IS NOT NULL),
    ('contract: owner-only clocked eight-argument flag entry point exists',
      to_regprocedure(
        'limiter.admit_guest_flag_at(text,uuid,double precision,double precision,text,integer,text,timestamptz)'
      ) IS NOT NULL),
    ('contract: service_role can execute clockless but not clocked flag entry point',
      has_function_privilege(
        'service_role',
        'limiter.admit_guest_flag(text,uuid,double precision,double precision,text,integer,text)',
        'EXECUTE'
      )
      AND NOT has_function_privilege(
        'service_role',
        'limiter.admit_guest_flag_at(text,uuid,double precision,double precision,text,integer,text,timestamptz)',
        'EXECUTE'
      )),
    ('contract: anon and authenticated cannot execute the limiter entry point',
      NOT has_function_privilege(
        'anon',
        'limiter.admit_guest_flag(text,uuid,double precision,double precision,text,integer,text)',
        'EXECUTE'
      )
      AND NOT has_function_privilege(
        'authenticated',
        'limiter.admit_guest_flag(text,uuid,double precision,double precision,text,integer,text)',
        'EXECUTE'
      )),
    ('precondition: disposable fresh stage has no flags',
      (SELECT count(*) = 0 FROM public.flags)),
    ('precondition: limiter bucket ledger is empty',
      (SELECT count(*) = 0 FROM limiter.bucket)),
    ('precondition: limiter grant ledger is empty',
      (SELECT count(*) = 0 FROM limiter.grant));

  UPDATE limiter.config
  SET normal_allowance = 2,
      bucket_allowance = 4,
      window_seconds = 60,
      retention_windows = 1,
      require_public_ip = false
  WHERE id;

  INSERT INTO fda028_assertion (description, passed) VALUES
    ('config: bounded transaction-local limiter configuration is active',
      COALESCE((
        SELECT normal_allowance = 2
          AND bucket_allowance = 4
          AND window_seconds = 60
          AND retention_windows = 1
          AND require_public_ip = false
        FROM limiter.config WHERE id
      ), false)),
    ('timing: test windows derive from the active hosted configuration',
      COALESCE((
        SELECT limiter.window_of(live_at, (SELECT window_seconds FROM limiter.config WHERE id))
          = limiter.window_of(live_at, 60)
        FROM fda028_clock
      ), false));

  INSERT INTO fda028_result
  SELECT 1, a.decision, a.out_grant, a.remaining, a.flag_id
  FROM fda028_clock c
  CROSS JOIN LATERAL limiter.admit_guest_flag_at(
    '203.0.113.240', NULL, 49.2827, -123.1207,
    'no_ramp', 3, 'fda028-hosted-1', c.old_at
  ) a;

  INSERT INTO fda028_assertion (description, passed) VALUES
    ('insert: real clocked full path admits a valid no_ramp flag',
      COALESCE((
        SELECT decision = 'ADMITTED' AND out_grant IS NOT NULL AND flag_id IS NOT NULL
        FROM fda028_result WHERE step = 1
      ), false)),
    ('insert: accepted full path writes the real flags row',
      EXISTS (
        SELECT 1 FROM public.flags f
        JOIN fda028_result r ON r.flag_id = f.id
        WHERE r.step = 1 AND f.category = 'no_ramp' AND f.status = 'open'
      ));

  INSERT INTO fda028_result
  SELECT 2, a.decision, a.out_grant, a.remaining, a.flag_id
  FROM fda028_clock c
  CROSS JOIN LATERAL limiter.admit_guest_flag_at(
    '203.0.113.240', (SELECT out_grant FROM fda028_result WHERE step = 1),
    49.2827, -123.1207, 'no_ramp', 3, 'fda028-hosted-2', c.old_at
  ) a;

  INSERT INTO fda028_assertion (description, passed) VALUES
    ('grant: the real grant admits its second normal unit',
      COALESCE((SELECT decision = 'ADMITTED' FROM fda028_result WHERE step = 2), false));

  INSERT INTO fda028_result
  SELECT 3, a.decision, a.out_grant, a.remaining, a.flag_id
  FROM fda028_clock c
  CROSS JOIN LATERAL limiter.admit_guest_flag_at(
    '203.0.113.240', (SELECT out_grant FROM fda028_result WHERE step = 1),
    49.2827, -123.1207, 'no_ramp', 3, 'fda028-hosted-refused-grant', c.old_at
  ) a;

  INSERT INTO fda028_assertion (description, passed) VALUES
    ('grant: exhausted grant refuses without writing a flag',
      COALESCE((
        SELECT decision = 'REFUSED_GRANT' AND flag_id IS NULL
          AND (SELECT count(*) FROM public.flags) = 2
        FROM fda028_result WHERE step = 3
      ), false));

  INSERT INTO fda028_result
  SELECT 4, a.decision, a.out_grant, a.remaining, a.flag_id
  FROM fda028_clock c
  CROSS JOIN LATERAL limiter.admit_guest_flag_at(
    '203.0.113.240', NULL, 49.2827, -123.1207,
    'no_ramp', 3, 'fda028-hosted-3', c.old_at
  ) a;

  INSERT INTO fda028_result
  SELECT 5, a.decision, a.out_grant, a.remaining, a.flag_id
  FROM fda028_clock c
  CROSS JOIN LATERAL limiter.admit_guest_flag_at(
    '203.0.113.240', (SELECT out_grant FROM fda028_result WHERE step = 4),
    49.2827, -123.1207, 'no_ramp', 3, 'fda028-hosted-4', c.old_at
  ) a;

  INSERT INTO fda028_result
  SELECT 6, a.decision, a.out_grant, a.remaining, a.flag_id
  FROM fda028_clock c
  CROSS JOIN LATERAL limiter.admit_guest_flag_at(
    '203.0.113.240', NULL, 49.2827, -123.1207,
    'no_ramp', 3, 'fda028-hosted-refused-bucket', c.old_at
  ) a;

  INSERT INTO fda028_assertion (description, passed) VALUES
    ('bucket: four real admissions succeed at allowance four',
      (SELECT count(*) = 4 FROM fda028_result
       WHERE step IN (1, 2, 4, 5) AND decision = 'ADMITTED' AND flag_id IS NOT NULL)),
    ('bucket: a new grant is refused after bucket exhaustion',
      COALESCE((
        SELECT decision = 'REFUSED_BUCKET_EXHAUSTED' AND flag_id IS NULL
        FROM fda028_result WHERE step = 6
      ), false)),
    ('bucket: ledger reaches allowance exactly without overshoot',
      (SELECT max(units_consumed) = 4 FROM limiter.bucket)
      AND NOT EXISTS (
        SELECT 1 FROM limiter.bucket b
        JOIN limiter.config c ON c.id
        WHERE b.units_consumed > c.bucket_allowance
      )),
    ('ledger: refused attempts leave four flags and two grants',
      (SELECT count(*) = 4 FROM public.flags)
      AND (SELECT count(*) = 2 FROM limiter.grant)),
    ('lifecycle: no orphan grant exists',
      NOT EXISTS (
        SELECT 1 FROM limiter.grant g
        WHERE NOT EXISTS (
          SELECT 1 FROM limiter.bucket b
          WHERE b.bucket_key = g.bucket_key AND b.window_id = g.window_id
        )
      ));

  DELETE FROM limiter.bucket;
  INSERT INTO fda028_assertion (description, passed) VALUES
    ('lifecycle: deleting buckets cascades every grant',
      (SELECT count(*) = 0 FROM limiter.grant));

  INSERT INTO fda028_result
  SELECT 7, a.decision, a.out_grant, a.remaining, a.flag_id
  FROM fda028_clock c
  CROSS JOIN LATERAL limiter.admit_guest_flag_at(
    '203.0.113.241', (SELECT out_grant FROM fda028_result WHERE step = 1),
    49.2827, -123.1207, 'no_ramp', 3, 'fda028-hosted-stale-grant', c.old_at
  ) a;

  INSERT INTO fda028_assertion (description, passed) VALUES
    ('lifecycle: stale grant is ignored and never resurrected',
      COALESCE((
        SELECT decision = 'ADMITTED'
          AND out_grant IS DISTINCT FROM (SELECT out_grant FROM fda028_result WHERE step = 1)
        FROM fda028_result WHERE step = 7
      ), false));

  DELETE FROM limiter.bucket;
  INSERT INTO fda028_result
  SELECT 8, a.decision, a.out_grant, a.remaining, a.flag_id
  FROM fda028_clock c
  CROSS JOIN LATERAL limiter.admit_guest_flag_at(
    '203.0.113.242', NULL, 49.2827, -123.1207,
    'no_ramp', 3, 'fda028-hosted-purge', c.old_at
  ) a;

  v_purged := limiter.purge_at((SELECT live_at FROM fda028_clock));
  INSERT INTO fda028_assertion (description, passed) VALUES
    ('timing: purge removes retained-old bucket and cascades its grant',
      v_purged > 0
      AND (SELECT count(*) = 0 FROM limiter.grant));

  GRANT INSERT ON TABLE fda028_result TO service_role;
  SET LOCAL ROLE service_role;
  INSERT INTO fda028_result
  SELECT 10, a.decision, a.out_grant, a.remaining, a.flag_id
  FROM limiter.admit_guest_flag(
    '203.0.113.245', NULL, 49.2827, -123.1207,
    'no_ramp', 3, 'fda028-hosted-service-role'
  ) a;
  RESET ROLE;

  INSERT INTO fda028_assertion (description, passed) VALUES
    ('runtime: service_role executes the clockless entry point and writes its flag',
      COALESCE((
        SELECT decision = 'ADMITTED' AND flag_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.flags f
            WHERE f.id = fda028_result.flag_id
              AND f.description = 'fda028-hosted-service-role'
          )
        FROM fda028_result WHERE step = 10
      ), false));

  UPDATE limiter.config SET enabled = false WHERE id;
  INSERT INTO fda028_result
  SELECT 9, a.decision, a.out_grant, a.remaining, a.flag_id
  FROM limiter.admit_guest_flag(
    '203.0.113.243', NULL, 49.2827, -123.1207,
    'no_ramp', 3, 'fda028-hosted-killswitch'
  ) a;

  INSERT INTO fda028_assertion (description, passed) VALUES
    ('killswitch: disabled limiter still writes the real flag row',
      COALESCE((
        SELECT decision = 'ADMITTED_LIMITER_DISABLED' AND flag_id IS NOT NULL
        FROM fda028_result WHERE step = 9
      ), false));
  UPDATE limiter.config SET enabled = true, require_public_ip = true WHERE id;

  INSERT INTO fda028_assertion (description, passed) VALUES
    ('signal: private fails closed and public IPv4 follows the slash-32 contract',
      limiter.normalize_source('10.1.2.3') IS NULL
      AND limiter.normalize_source('203.0.113.244') = 'v4:203.0.113.244/32'),
    ('clock and key: future input is capped and Vault remains one readable 32-byte row',
      (SELECT epoch FROM limiter.current_epoch_key(now() + interval '400 days'))
        <= limiter.window_of(now(), (SELECT window_seconds FROM limiter.config WHERE id)) + 1
      AND octet_length(limiter.read_epoch_key()) = 32
      AND (SELECT count(*) = 1 FROM vault.secrets WHERE name = 'fda028_limiter_epoch_key')),
    ('residue: hosted suite creates no persistent helper function',
      (SELECT count(*) = 0
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'pass'));

  SELECT jsonb_build_object(
    'version', 1,
    'kind', 'main',
    'plan', count(*),
    'assertions', jsonb_agg(jsonb_build_object(
      'number', number,
      'description', description,
      'passed', passed
    ) ORDER BY number)
  )
  INTO v_result
  FROM fda028_assertion;

  IF (v_result ->> 'plan')::integer <> 31 THEN
    RAISE EXCEPTION 'FDA028 harness assertion plan drifted';
  END IF;

  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'FDA028_ROLLBACK_RESULT|' || v_result::text;
END
$proof$;
