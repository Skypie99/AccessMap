-- PHASE-02B replay stub for pg_net. Signature-compatible, behaviour-free.
-- Installing this lets the 71 applied migrations replay VERBATIM — no
-- preprocessing, no skipped lines — which is what makes the replay evidence.
create function net.http_post(
  url text,
  body jsonb default '{}'::jsonb,
  params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb,
  timeout_milliseconds integer default 5000
) returns bigint language sql immutable as $$ select 0::bigint $$;

create function net.http_get(
  url text,
  params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb,
  timeout_milliseconds integer default 5000
) returns bigint language sql immutable as $$ select 0::bigint $$;
