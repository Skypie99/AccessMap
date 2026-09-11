set search_path = public, extensions, pg_temp;
BEGIN;
SELECT plan(25);

-- ===== address classification =====
SELECT ok(limiter.is_public_unicast('203.0.113.9'::inet),            'IPv4 public unicast accepted');
SELECT ok(NOT limiter.is_public_unicast('10.0.0.1'::inet),           'IPv4 RFC1918 is not public');
SELECT ok(NOT limiter.is_public_unicast('127.0.0.1'::inet),          'IPv4 loopback is not public');
SELECT ok(limiter.is_public_unicast('2606:4700:4700::1111'::inet),   'IPv6 global unicast accepted');
SELECT ok(NOT limiter.is_public_unicast('::1'::inet),                'IPv6 loopback is not public');
SELECT ok(NOT limiter.is_public_unicast('fe80::1'::inet),            'IPv6 link-local is not public');
SELECT ok(NOT limiter.is_public_unicast('fc00::1'::inet),            'IPv6 unique-local is not public');

-- ===== IPv4-mapped and NAT64 unwrapping =====
SELECT is(limiter.embedded_ipv4('::ffff:203.0.113.9'::inet), '203.0.113.9'::inet,
          'IPv4-mapped ::ffff: unwraps to the IPv4 address');
SELECT is(limiter.embedded_ipv4('64:ff9b::203.0.113.9'::inet), '203.0.113.9'::inet,
          'NAT64 well-known prefix unwraps to the embedded IPv4');
SELECT is(limiter.rfc6052_ipv4('64:ff9b::cb00:7109'::inet, 96), '203.0.113.9'::inet,
          'RFC6052 /96 extraction returns the embedded IPv4');
SELECT ok(limiter.embedded_ipv4('2606:4700:4700::1111'::inet) IS NULL,
          'a genuine IPv6 address has no embedded IPv4');

-- ===== normalization: the value the limiter actually buckets on =====
SELECT isnt(limiter.normalize_source('203.0.113.9'), NULL, 'IPv4 normalizes to a non-null key');
SELECT isnt(limiter.normalize_source('2606:4700:4700::1111'), NULL, 'IPv6 normalizes to a non-null key');
SELECT is(limiter.normalize_source('::ffff:203.0.113.9'), limiter.normalize_source('203.0.113.9'),
          'an IPv4-mapped address buckets identically to the bare IPv4 -- no dual-family bypass');
SELECT is(limiter.normalize_source('64:ff9b::203.0.113.9'), limiter.normalize_source('203.0.113.9'),
          'a NAT64-translated address buckets identically to the IPv4 -- no NAT64 bypass');

-- /64 grouping: same prefix shares a bucket, different prefix does not
SELECT is(limiter.normalize_source('2001:db8:1:1::1'), limiter.normalize_source('2001:db8:1:1::2'),
          'two addresses in one /64 share a bucket');
SELECT isnt(limiter.normalize_source('2001:db8:1:1::1'), limiter.normalize_source('2001:db8:1:2::1'),
          'addresses in different /64s do NOT share a bucket');
SELECT isnt(limiter.normalize_source('203.0.113.9'), limiter.normalize_source('203.0.113.10'),
          'IPv4 /32 keeps distinct addresses in distinct buckets');

-- ===== refusal surface =====
SELECT ok(limiter.normalize_source(NULL) IS NULL,                 'NULL source refused');
SELECT ok(limiter.normalize_source('') IS NULL,                   'empty source refused');
SELECT ok(limiter.normalize_source('not-an-ip') IS NULL,          'malformed source refused');
SELECT ok(limiter.normalize_source('203.0.113.9, 198.51.100.1') IS NULL,
          'multi-valued XFF-style header refused rather than silently taking one');
SELECT ok(limiter.normalize_source('10.0.0.1') IS NULL,
          'private IPv4 refused while require_public_ip is on');
SELECT ok(limiter.normalize_source('fe80::1') IS NULL,
          'link-local IPv6 refused while require_public_ip is on');

-- ===== NEGATIVE CONTROL: a deliberately wrong expectation MUST fail =====
SELECT is(limiter.normalize_source('203.0.113.9'), limiter.normalize_source('198.51.100.1'),
          'NEGATIVE CONTROL (must FAIL): two different IPv4s must not share a bucket');

SELECT * FROM finish();
ROLLBACK;
