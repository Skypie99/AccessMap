# FDA-028 accepted hosted contract

Derived before source edits from the accepted migration artifacts, fresh-stage catalogs/configuration, and the existing successful hosted concurrency and named-probe receipts.

## REAL_FLAG_FIXTURE_CONTRACT

- `public.flags.category` accepts: `no_ramp`, `broken_sidewalk`, `blocked_path`, `missing_signal`, `steep_grade`, `other`.
- Synthetic hosted rows use `no_ramp`; the fixture-only value `ramp` is invalid and must remain a negative control.
- Latitude is within `[-90, 90]`, longitude within `[-180, 180]`, severity within `[1, 5]`, and description length is at most 2000 characters.
- Synthetic sources and descriptions must be deterministic and unique to this harness.

## REAL_WINDOW_CONTRACT

The accepted fresh-stage configuration is:

```text
id = true
enabled = true
catchup_cap = 32
ipv4_prefix = 32
ipv6_prefix = 64
window_seconds = 86400
reseed_interval = 7
bucket_allowance = 50
normal_allowance = 5
require_public_ip = true
retention_windows = 1
```

The hosted suite may establish a smaller bounded configuration only inside its single rollback-only transaction, after proving the limiter ledger is empty. Timing assertions must derive from the active transaction-local configuration. The suite must end with `ROLLBACK`, and the runner must independently verify that the accepted configuration is restored.

## REAL_KEY_CONTRACT

- The accepted hosted path stores limiter key material through Vault and intentionally has no `limiter.dev_key_material` table.
- Tests may prove key existence by row count, byte length, and limiter behavior only.
- Tests must never select, print, copy, persist, hash, or otherwise expose the key value.
- `limiter.read_epoch_key()` and `limiter.current_epoch_key(timestamptz)` are internal SECURITY DEFINER functions and are not executable by `service_role`.

## REAL_INSERT_PATH

The public service entry point is:

```sql
limiter.admit_guest_flag(
  p_source_raw text,
  p_grant uuid,
  p_lat double precision,
  p_lng double precision,
  p_category text,
  p_severity integer,
  p_description text
)
```

It is executable by `service_role` and not by `anon` or `authenticated`.

The deterministic internal test entry point is:

```sql
limiter.admit_guest_flag_at(
  p_source_raw text,
  p_grant uuid,
  p_lat double precision,
  p_lng double precision,
  p_category text,
  p_severity integer,
  p_description text,
  p_now timestamptz
)
```

It is not executable by `service_role`. The hosted harness runs as the database owner and may use this function inside its rollback-only transaction to test deterministic lifecycle behavior.

Other accepted lifecycle functions are `limiter.purge()` for the service role and owner-only `limiter.purge_at(timestamptz)`. The old 600-second purge assumption is invalid against the accepted 86400-second window; purge timing must be computed from the active window and retention settings.

## Existing hosted comparator

The banked fresh-stage evidence remains an independent comparator:

```text
concurrency attempts: 25
configured allowance: 10
admitted: 10
refused: 15
real flags: 10
ledger units: 10
grants: 10
orphans: 0
Vault IO: PASS
```

This evidence establishes accepted hosted behavior but does not substitute for a reproducible committed harness.
