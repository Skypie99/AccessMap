-- PGTAP_KIND: pgtap
-- PGTAP_EXECUTION: authorized-staging-only
-- FDA-028 hosted acceptance against the accepted real schema and Vault path.
-- Every mutation, including Vault reseeds, is enclosed by this transaction and
-- is discarded by the final ROLLBACK. The runner separately verifies state.
BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '10s';

CREATE TEMP TABLE fda028_harness_clock AS
SELECT now() AS live_at, now() - interval '5 minutes' AS old_at;

CREATE TEMP TABLE fda028_harness_result (
  step integer PRIMARY KEY,
  decision text,
  out_grant uuid,
  remaining integer,
  flag_id uuid
);

CREATE TEMP TABLE fda028_harness_probe (
  key text PRIMARY KEY,
  passed boolean NOT NULL
);

DO $probe$
BEGIN
  BEGIN
    INSERT INTO public.flags (lat, lng, category, severity, description, photo_url, status)
    VALUES (49.2827, -123.1207, 'ramp', 3, 'fda028-invalid-category-control', NULL, 'open');
    INSERT INTO fda028_harness_probe VALUES ('invalid-category-rejected', false);
  EXCEPTION WHEN check_violation THEN
    INSERT INTO fda028_harness_probe VALUES ('invalid-category-rejected', true);
  END;
END
$probe$;

SELECT plan(38);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap'),
  'contract: pgTAP is installed'
);
SELECT ok(
  (SELECT passed FROM fda028_harness_probe WHERE key = 'invalid-category-rejected'),
  'fixture: legacy ramp category is rejected by the real flags schema'
);
SELECT ok(
  to_regclass('limiter.dev_key_material') IS NULL,
  'key: hosted schema has no fixture-only dev_key_material table'
);
SELECT ok(
  to_regclass('vault.decrypted_secrets') IS NOT NULL,
  'key: accepted Vault decrypted view exists'
);
SELECT is(
  (SELECT count(*)::bigint FROM vault.secrets WHERE name = 'fda028_limiter_epoch_key'),
  1::bigint,
  'key: exactly one limiter Vault secret is provisioned'
);
SELECT is(
  octet_length(limiter.read_epoch_key()),
  32,
  'key: limiter reads a 32-byte key through the hosted Vault path'
);
SELECT ok(
  to_regprocedure(
    'limiter.admit_guest_flag(text,uuid,double precision,double precision,text,integer,text)'
  ) IS NOT NULL,
  'contract: clockless seven-argument flag entry point exists'
);
SELECT ok(
  to_regprocedure(
    'limiter.admit_guest_flag_at(text,uuid,double precision,double precision,text,integer,text,timestamptz)'
  ) IS NOT NULL,
  'contract: owner-only clocked eight-argument flag entry point exists'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'limiter.admit_guest_flag(text,uuid,double precision,double precision,text,integer,text)',
    'EXECUTE'
  ),
  'contract: service_role can execute only the clockless flag entry point'
);
SELECT ok(
  NOT has_function_privilege(
    'service_role',
    'limiter.admit_guest_flag_at(text,uuid,double precision,double precision,text,integer,text,timestamptz)',
    'EXECUTE'
  ),
  'contract: service_role cannot supply a clock'
);
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'limiter.admit_guest_flag(text,uuid,double precision,double precision,text,integer,text)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'limiter.admit_guest_flag(text,uuid,double precision,double precision,text,integer,text)',
    'EXECUTE'
  ),
  'contract: anon and authenticated cannot execute the limiter entry point'
);
SELECT is(
  (SELECT count(*)::bigint FROM public.flags),
  0::bigint,
  'precondition: disposable fresh stage has no flags'
);
SELECT is(
  (SELECT count(*)::bigint FROM limiter.bucket),
  0::bigint,
  'precondition: limiter bucket ledger is empty'
);
SELECT is(
  (SELECT count(*)::bigint FROM limiter.grant),
  0::bigint,
  'precondition: limiter grant ledger is empty'
);

UPDATE limiter.config
SET normal_allowance = 2,
    bucket_allowance = 4,
    window_seconds = 60,
    retention_windows = 1,
    require_public_ip = false
WHERE id;

SELECT ok(
  (SELECT normal_allowance = 2
          AND bucket_allowance = 4
          AND window_seconds = 60
          AND retention_windows = 1
          AND require_public_ip = false
   FROM limiter.config WHERE id),
  'config: bounded transaction-local limiter configuration is active'
);
SELECT is(
  (SELECT limiter.window_of(live_at, (SELECT window_seconds FROM limiter.config WHERE id))
   FROM fda028_harness_clock),
  (SELECT limiter.window_of(live_at, 60) FROM fda028_harness_clock),
  'timing: test windows derive from the active hosted configuration'
);

INSERT INTO fda028_harness_result
SELECT 1, a.decision, a.out_grant, a.remaining, a.flag_id
FROM fda028_harness_clock c
CROSS JOIN LATERAL limiter.admit_guest_flag_at(
  '203.0.113.240', NULL, 49.2827, -123.1207,
  'no_ramp', 3, 'fda028-hosted-1', c.old_at
) a;

SELECT ok(
  (SELECT decision = 'ADMITTED' AND out_grant IS NOT NULL AND flag_id IS NOT NULL
   FROM fda028_harness_result WHERE step = 1),
  'insert: real clocked full path admits a valid no_ramp flag'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.flags f
    JOIN fda028_harness_result r ON r.flag_id = f.id
    WHERE r.step = 1 AND f.category = 'no_ramp' AND f.status = 'open'
  ),
  'insert: accepted full path writes the real flags row'
);

INSERT INTO fda028_harness_result
SELECT 2, a.decision, a.out_grant, a.remaining, a.flag_id
FROM fda028_harness_clock c
CROSS JOIN LATERAL limiter.admit_guest_flag_at(
  '203.0.113.240', (SELECT out_grant FROM fda028_harness_result WHERE step = 1),
  49.2827, -123.1207, 'no_ramp', 3, 'fda028-hosted-2', c.old_at
) a;

SELECT is(
  (SELECT decision FROM fda028_harness_result WHERE step = 2),
  'ADMITTED',
  'grant: the real grant admits its second normal unit'
);

INSERT INTO fda028_harness_result
SELECT 3, a.decision, a.out_grant, a.remaining, a.flag_id
FROM fda028_harness_clock c
CROSS JOIN LATERAL limiter.admit_guest_flag_at(
  '203.0.113.240', (SELECT out_grant FROM fda028_harness_result WHERE step = 1),
  49.2827, -123.1207, 'no_ramp', 3, 'fda028-hosted-refused-grant', c.old_at
) a;

SELECT ok(
  (SELECT decision = 'REFUSED_GRANT' AND flag_id IS NULL
   FROM fda028_harness_result WHERE step = 3),
  'grant: exhausted grant refuses without writing a flag'
);

INSERT INTO fda028_harness_result
SELECT 4, a.decision, a.out_grant, a.remaining, a.flag_id
FROM fda028_harness_clock c
CROSS JOIN LATERAL limiter.admit_guest_flag_at(
  '203.0.113.240', NULL, 49.2827, -123.1207,
  'no_ramp', 3, 'fda028-hosted-3', c.old_at
) a;

INSERT INTO fda028_harness_result
SELECT 5, a.decision, a.out_grant, a.remaining, a.flag_id
FROM fda028_harness_clock c
CROSS JOIN LATERAL limiter.admit_guest_flag_at(
  '203.0.113.240', (SELECT out_grant FROM fda028_harness_result WHERE step = 4),
  49.2827, -123.1207, 'no_ramp', 3, 'fda028-hosted-4', c.old_at
) a;

INSERT INTO fda028_harness_result
SELECT 6, a.decision, a.out_grant, a.remaining, a.flag_id
FROM fda028_harness_clock c
CROSS JOIN LATERAL limiter.admit_guest_flag_at(
  '203.0.113.240', NULL, 49.2827, -123.1207,
  'no_ramp', 3, 'fda028-hosted-refused-bucket', c.old_at
) a;

SELECT is(
  (SELECT count(*)::bigint FROM fda028_harness_result
   WHERE step IN (1, 2, 4, 5) AND decision = 'ADMITTED' AND flag_id IS NOT NULL),
  4::bigint,
  'bucket: four real admissions succeed at allowance four'
);
SELECT ok(
  (SELECT decision = 'REFUSED_BUCKET_EXHAUSTED' AND flag_id IS NULL
   FROM fda028_harness_result WHERE step = 6),
  'bucket: a new grant is refused after bucket exhaustion'
);
SELECT is(
  (SELECT max(units_consumed)::integer FROM limiter.bucket),
  4,
  'bucket: ledger reaches the configured allowance exactly'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM limiter.bucket b
    JOIN limiter.config c ON c.id
    WHERE b.units_consumed > c.bucket_allowance
  ),
  'bucket: no ledger row overshoots its allowance'
);
SELECT is(
  (SELECT count(*)::bigint FROM public.flags),
  4::bigint,
  'insert: refused attempts did not create flags'
);
SELECT is(
  (SELECT count(*)::bigint FROM limiter.grant),
  2::bigint,
  'grant: resetting the client created only the second bounded grant'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM limiter.grant g
    WHERE NOT EXISTS (
      SELECT 1 FROM limiter.bucket b
      WHERE b.bucket_key = g.bucket_key AND b.window_id = g.window_id
    )
  ),
  'lifecycle: no orphan grant exists'
);

DELETE FROM limiter.bucket;
SELECT is(
  (SELECT count(*)::bigint FROM limiter.grant),
  0::bigint,
  'lifecycle: deleting buckets cascades every grant'
);

INSERT INTO fda028_harness_result
SELECT 7, a.decision, a.out_grant, a.remaining, a.flag_id
FROM fda028_harness_clock c
CROSS JOIN LATERAL limiter.admit_guest_flag_at(
  '203.0.113.241', (SELECT out_grant FROM fda028_harness_result WHERE step = 1),
  49.2827, -123.1207, 'no_ramp', 3, 'fda028-hosted-stale-grant', c.old_at
) a;

SELECT ok(
  (SELECT decision = 'ADMITTED' AND out_grant <> (
     SELECT out_grant FROM fda028_harness_result WHERE step = 1
   ) FROM fda028_harness_result WHERE step = 7),
  'lifecycle: stale grant is ignored and never resurrected'
);

DELETE FROM limiter.bucket;
INSERT INTO fda028_harness_result
SELECT 8, a.decision, a.out_grant, a.remaining, a.flag_id
FROM fda028_harness_clock c
CROSS JOIN LATERAL limiter.admit_guest_flag_at(
  '203.0.113.242', NULL, 49.2827, -123.1207,
  'no_ramp', 3, 'fda028-hosted-purge', c.old_at
) a;

SELECT ok(
  limiter.purge_at((SELECT live_at FROM fda028_harness_clock)) > 0,
  'timing: purge removes a retained-old bucket using the active window contract'
);
SELECT is(
  (SELECT count(*)::bigint FROM limiter.grant),
  0::bigint,
  'timing: purge cascades the old grant'
);

UPDATE limiter.config SET enabled = false WHERE id;
INSERT INTO fda028_harness_result
SELECT 9, a.decision, a.out_grant, a.remaining, a.flag_id
FROM limiter.admit_guest_flag(
  '203.0.113.243', NULL, 49.2827, -123.1207,
  'no_ramp', 3, 'fda028-hosted-killswitch'
) a;
SELECT ok(
  (SELECT decision = 'ADMITTED_LIMITER_DISABLED' AND flag_id IS NOT NULL
   FROM fda028_harness_result WHERE step = 9),
  'killswitch: disabled limiter still writes the real flag row'
);
UPDATE limiter.config SET enabled = true, require_public_ip = true WHERE id;

SELECT is(
  limiter.normalize_source('10.1.2.3'),
  NULL::text,
  'signal: private IPv4 fails closed when the real public guard is enabled'
);
SELECT is(
  limiter.normalize_source('203.0.113.244'),
  'v4:203.0.113.244/32',
  'signal: deterministic hosted source follows the accepted IPv4 prefix contract'
);
SELECT ok(
  (SELECT epoch FROM limiter.current_epoch_key(now() + interval '400 days'))
    <= limiter.window_of(now(), (SELECT window_seconds FROM limiter.config WHERE id)) + 1,
  'clock: far-future input cannot advance more than one live window'
);
SELECT is(
  octet_length(limiter.read_epoch_key()),
  32,
  'key: Vault-backed key remains readable after a transaction-local ratchet'
);
SELECT is(
  (SELECT count(*)::bigint FROM vault.secrets WHERE name = 'fda028_limiter_epoch_key'),
  1::bigint,
  'key: ratcheting updates the one provisioned Vault row in place'
);
SELECT is(
  (SELECT count(*)::bigint
   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'pass'),
  0::bigint,
  'residue: hosted suite creates no persistent helper function'
);

SELECT * FROM finish();
ROLLBACK;
