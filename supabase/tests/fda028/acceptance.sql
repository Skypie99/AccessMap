-- PGTAP_KIND: raising-proof
\set ON_ERROR_STOP on
\pset pager off
\set QUIET on
CREATE OR REPLACE FUNCTION pass(t text, ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN RAISE NOTICE '%  %', CASE WHEN ok THEN 'ok  ' ELSE 'FAIL' END, t;
  IF NOT ok THEN RAISE EXCEPTION 'FAILED: %', t; END IF; END $$;
\set QUIET off

-- Deterministic test thresholds. CONFIGURATION, not production policy.
UPDATE limiter.config SET normal_allowance=2, bucket_allowance=6, window_seconds=60,
       require_public_ip=false, reseed_interval=3, retention_windows=0;

DO $blk$
DECLARE
  d text; gr uuid; rem int; fid uuid; n int; k1 bytea; k2 bytea; e1 bigint; e2 bigint;
  t0 timestamptz := '2026-09-09 12:00:00+00';
  bk bytea; cnt int; g_before uuid;
BEGIN
  -- ===== TRUSTED INPUT =====
  PERFORM pass('normalize: valid IPv4 accepted', limiter.normalize_source('203.0.113.7') IS NOT NULL);
  PERFORM pass('normalize: NULL signal refused', limiter.normalize_source(NULL) IS NULL);
  PERFORM pass('normalize: empty signal refused', limiter.normalize_source('') IS NULL);
  PERFORM pass('normalize: multi-valued refused', limiter.normalize_source('203.0.113.7, 198.51.100.2') IS NULL);
  PERFORM pass('normalize: whitespace refused', limiter.normalize_source(' 203.0.113.7') IS NULL);
  PERFORM pass('normalize: garbage refused', limiter.normalize_source('not-an-ip') IS NULL);
  PERFORM pass('normalize: CIDR (non-host) refused', limiter.normalize_source('10.0.0.0/8') IS NULL);
  PERFORM pass('normalize: injection-ish refused', limiter.normalize_source($x$1.1.1.1'; DROP TABLE x;--$x$) IS NULL);

  -- ===== IPv4 =====
  PERFORM pass('ipv4: deterministic',
    limiter.normalize_source('203.0.113.7') = limiter.normalize_source('203.0.113.7'));
  PERFORM pass('ipv4: distinct sources distinct prefixes',
    limiter.normalize_source('203.0.113.7') <> limiter.normalize_source('203.0.113.8'));

  -- ===== IPv6 =====
  PERFORM pass('ipv6: same /64 groups together',
    limiter.normalize_source('2001:db8:1:2::1') = limiter.normalize_source('2001:db8:1:2:aaaa:bbbb:cccc:dddd'));
  PERFORM pass('ipv6: different /64 separates',
    limiter.normalize_source('2001:db8:1:2::1') <> limiter.normalize_source('2001:db8:1:3::1'));
  PERFORM pass('ipv6: case-insensitive',
    limiter.normalize_source('2001:DB8:1:2::1') = limiter.normalize_source('2001:db8:1:2::1'));
  PERFORM pass('ipv6: compressed == expanded',
    limiter.normalize_source('2001:db8:1:2::1') = limiter.normalize_source('2001:0db8:0001:0002:0000:0000:0000:0001'));
  PERFORM pass('ipv6: malformed refused', limiter.normalize_source('2001:db8:::1') IS NULL);

  -- ===== IPv4-MAPPED IPv6 (the v3 defect) =====
  PERFORM pass('mapped: unwraps to IPv4 namespace',
    limiter.normalize_source('::ffff:203.0.113.7') = limiter.normalize_source('203.0.113.7'));
  PERFORM pass('mapped: distinct mapped addrs do NOT collapse',
    limiter.normalize_source('::ffff:203.0.113.7') <> limiter.normalize_source('::ffff:203.0.113.8'));
  PERFORM pass('mapped: hex form == dotted form',
    limiter.normalize_source('::ffff:cb00:7107') = limiter.normalize_source('::ffff:203.0.113.7'));
  PERFORM pass('mapped: never lands in the v6 namespace',
    limiter.normalize_source('::ffff:203.0.113.7') LIKE 'v4:%');

  -- ===== KEY LIFECYCLE =====
  SELECT epoch, epoch_key INTO e1, k1 FROM limiter.current_epoch_key(t0);
  PERFORM pass('key: seeded', k1 IS NOT NULL AND length(k1)=32);
  SELECT epoch, epoch_key INTO e2, k2 FROM limiter.current_epoch_key(t0);
  PERFORM pass('key: stable within an epoch', k1 = k2 AND e1 = e2);
  SELECT epoch, epoch_key INTO e2, k2 FROM limiter.current_epoch_key(t0 + interval '61 seconds');
  PERFORM pass('key: advances to a new epoch', e2 = e1 + 1);
  PERFORM pass('key: new epoch key differs', k1 <> k2);
  PERFORM pass('key: ratchet is one-way forward',
    limiter.ratchet(k1, e1 + 1) = k2);
  PERFORM pass('key: current key cannot reproduce the prior key',
    limiter.ratchet(k2, e1) <> k1);
  PERFORM pass('key: bucket derivation is epoch-bound',
    limiter.derive_bucket_key(k1,'v4:203.0.113.7/32') <> limiter.derive_bucket_key(k2,'v4:203.0.113.7/32'));
  PERFORM pass('key: bucket derivation deterministic per key',
    limiter.derive_bucket_key(k1,'v4:203.0.113.7/32') = limiter.derive_bucket_key(k1,'v4:203.0.113.7/32'));
  PERFORM pass('key: 16-byte bucket id',
    length(limiter.derive_bucket_key(k1,'v4:203.0.113.7/32')) = 16);
END $blk$;
