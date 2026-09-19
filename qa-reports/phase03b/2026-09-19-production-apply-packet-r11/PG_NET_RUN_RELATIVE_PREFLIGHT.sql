-- PROPOSAL ONLY. Read-only pg_net run-relative preflight.
-- The single database statement establishes T0 and observes queue, TTL, and
-- retained response history from the same database-side clock/snapshot.
begin transaction read only;
with clock as (
  select pg_catalog.transaction_timestamp() as database_t0
), settings as (
  select current_setting('pg_net.ttl', true) as pg_net_ttl
)
select jsonb_build_object(
  'receipt','phase03b_pgnet_run_relative_preflight_r11',
  'captured_at_utc',to_char(clock.database_t0 at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'database_t0',to_char(clock.database_t0 at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'transaction_read_only',current_setting('transaction_read_only'),
  'pg_net_ttl',settings.pg_net_ttl,
  'pg_net_ttl_seconds',case when settings.pg_net_ttl is null then null else extract(epoch from settings.pg_net_ttl::interval)::bigint end,
  'http_queue_count',(select count(*) from net.http_request_queue),
  'http_response_count',(select count(*) from net._http_response),
  'http_response_sha256',(select encode(extensions.digest(coalesce(string_agg(coalesce(id::text,'')||E'\t'||to_char(created at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||E'\t'||coalesce(status_code::text,'')||E'\t'||coalesce(timed_out::text,'')||E'\t'||case when error_msg is null then 'NO_ERROR' else 'ERROR' end,E'\n' order by id nulls first,created),''),'sha256'),'hex') from net._http_response),
  'http_response_new_since_t0_count',(select count(*) from net._http_response where created >= clock.database_t0)
) as phase03b_pgnet_run_relative_preflight_r11
from clock, settings;
rollback;
