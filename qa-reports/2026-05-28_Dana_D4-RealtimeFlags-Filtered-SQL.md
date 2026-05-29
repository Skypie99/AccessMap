# D4: Realtime Flags — Option 2 Filtered Broadcast
**Role:** Dana (DB/migration specialist)
**Date:** 2026-05-28
**Status:** SQL files written — NOT applied to prod DB (Const. Art. 5)

---

## Policy Explanation

**Option 2 — Filtered Broadcast** was selected by Sky over Option 1 (full-row broadcast).

**How it works:**
Supabase Realtime uses Postgres logical replication (WAL). When we add `public.flags` to the `supabase_realtime` publication with a column filter `(id, status)`, the WAL decoder emits only those two columns in the broadcast payload. The client receives `{id, status}` and then calls the existing RLS-gated `SELECT` endpoint to fetch the full row.

**Why this matters vs. Option 1:**
Option 1 would have broadcast `{id, user_id, lat, lng, category, severity, description, photo_url, status, created_at}` to every subscriber. Even though RLS governs who can *subscribe*, the payload itself would carry sensitive location coordinates and disability-context data (category, description) in the realtime stream, which is harder to audit. Option 2 means `lat/lng`, `category`, `severity`, `description`, `user_id`, and `photo_url` never appear in a broadcast payload — they only travel over the RLS-gated REST endpoint after the client deliberately fetches them.

**Postgres version requirement:**
Column-level publication filters (`ADD TABLE ... (col1, col2)`) require Postgres 15+. Supabase projects created after Dec 2023 run Postgres 15. This project uses Supabase SDK, which targets this version. The feature is confirmed available.

**Supersedes:**
- `supabase/realtime.sql` (Option-1 style, never applied)
- `supabase/migrations/2026-05-24_realtime_flags.sql` (Option-1 style, never applied)

Neither prior file should be applied. This file replaces both.

---

## SQL — Apply

```sql
-- =============================================================================
-- D4: Realtime Flags — Option 2 (Filtered Broadcast)
-- =============================================================================
-- Policy: Supabase Realtime publishes ONLY {id, status} from public.flags.
-- Clients receive the change notification then re-fetch the full row via the
-- existing RLS-gated SELECT endpoint. lat/lng, category, severity, user_id,
-- photo_url, and description NEVER leave the server inside a broadcast payload.
--
-- Option 1 files at supabase/realtime.sql and
-- supabase/migrations/2026-05-24_realtime_flags.sql must NOT be applied
-- alongside this file. This file supersedes both.
-- =============================================================================

-- STEP 1: Drop any Option-1 publication state that may already be live.
do $$
begin
  execute 'alter publication supabase_realtime drop table public.flags';
  raise notice 'Removed public.flags from supabase_realtime (clearing Option-1 state).';
exception
  when undefined_object then
    raise notice 'public.flags was not in supabase_realtime; nothing to drop.';
  when sqlstate '42P17' then
    raise notice 'public.flags was not in supabase_realtime (alt code); nothing to drop.';
end $$;

-- STEP 2: Add public.flags with column-level filter (id, status only).
alter publication supabase_realtime add table public.flags (id, status);

-- STEP 3: Observability log table.
create table if not exists public.realtime_subscribe_log (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references public.users(id) on delete cascade,
  event       text        not null check (event in ('subscribe', 'unsubscribe')),
  channel     text        not null,
  logged_at   timestamptz not null default now()
);

alter table public.realtime_subscribe_log enable row level security;

drop policy if exists "subscribe_log insert own" on public.realtime_subscribe_log;
create policy "subscribe_log insert own"
  on public.realtime_subscribe_log for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create or replace function public.log_realtime_event(
  p_event   text,
  p_channel text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'log_realtime_event requires an authenticated user';
  end if;

  if p_event not in ('subscribe', 'unsubscribe') then
    raise exception 'event must be ''subscribe'' or ''unsubscribe''';
  end if;

  insert into public.realtime_subscribe_log (user_id, event, channel)
  values (auth.uid(), p_event, p_channel);
end;
$$;

revoke execute on function public.log_realtime_event(text, text) from public, anon;
grant  execute on function public.log_realtime_event(text, text) to authenticated;
```

---

## SQL — Rollback

```sql
-- D4 Rollback: remove column-filtered publication and drop observability log.

-- STEP 1: Remove public.flags from publication.
do $$
begin
  execute 'alter publication supabase_realtime drop table public.flags';
  raise notice 'public.flags removed from supabase_realtime.';
exception
  when undefined_object then
    raise notice 'public.flags was not in supabase_realtime; nothing to drop.';
end $$;

-- STEP 2: Drop observability log infrastructure.
drop policy if exists "subscribe_log insert own" on public.realtime_subscribe_log;
drop function if exists public.log_realtime_event(text, text);
drop table if exists public.realtime_subscribe_log;
```

**Rollback behavior:** Client subscriptions go silent immediately (no client errors). The client falls back to its existing fetch-on-focus behavior. Historical subscribe log data is lost. `realtime_subscribe_log` and `log_realtime_event` are fully removed.

---

## Safeguards

| # | Safeguard | Location | Status |
|---|-----------|----------|--------|
| 1 | Geofence channel | Client-side (see Notes for Shamus) | In-scope for Shamus, NOT in SQL |
| 2 | Per-user opt-in toggle | Client-side: `AsyncStorage` key `realtime_enabled`, default `false` | In-scope for Shamus, NOT in SQL |
| 3 | Observability log | Server-side: `realtime_subscribe_log` table + `log_realtime_event()` RPC | **Baked into this SQL** |
| 4 | 30-day review | Morgan-managed operational concern | Out of scope for SQL |

**Safeguard 1 — Geofence detail:**
Supabase Realtime's `postgres_changes` channel does NOT support server-side geospatial row filters. The `filter` parameter on the client channel is limited to simple equality comparisons (e.g. `filter="status=eq.open"`) evaluated against WAL data — not PostGIS or bounding-box expressions. Geographic bounding is therefore implemented client-side: the subscriber receives `{id, status}`, checks whether the corresponding cached flag coordinate falls within the current map viewport, and discards the event if not. See Notes for Shamus.

**Safeguard 3 — Design rationale for function-based vs. trigger-based logging:**
A Postgres trigger on the publication or WAL would require superuser or `pg_monitor` privileges and operates at a layer below RLS. Instead, clients call the `log_realtime_event()` RPC on subscribe and unsubscribe. This is:
- Simpler (no special privileges required)
- Auditable (each row is tied to `auth.uid()`)
- Controllable (the SECURITY DEFINER function validates input; the RLS policy prevents spoofing other users' rows)
- Honest about what's being logged (client intent, not server delivery guarantee)

The tradeoff: if a client crashes before calling `unsubscribe`, the log won't have that row. This is acceptable for a usage-pattern audit; it's not a security log.

---

## Cowork Prompt for Sky (Step 3 — Apply to Prod DB)

```
Open https://supabase.com/dashboard in a browser (sign in if needed).
Navigate to the AccessMap project → SQL Editor → "+ New query".
Paste the following SQL into the editor and click Run:

-- =============================================================================
-- D4: Realtime Flags — Option 2 (Filtered Broadcast)
-- =============================================================================
-- Policy: Supabase Realtime publishes ONLY {id, status} from public.flags.
-- Clients receive the change notification then re-fetch the full row via the
-- existing RLS-gated SELECT endpoint. lat/lng, category, severity, user_id,
-- photo_url, and description NEVER leave the server inside a broadcast payload.
--
-- Option 1 files at supabase/realtime.sql and
-- supabase/migrations/2026-05-24_realtime_flags.sql must NOT be applied
-- alongside this file. This file supersedes both.
-- =============================================================================

-- STEP 1: Drop any Option-1 publication state that may already be live.
do $$
begin
  execute 'alter publication supabase_realtime drop table public.flags';
  raise notice 'Removed public.flags from supabase_realtime (clearing Option-1 state).';
exception
  when undefined_object then
    raise notice 'public.flags was not in supabase_realtime; nothing to drop.';
  when sqlstate '42P17' then
    raise notice 'public.flags was not in supabase_realtime (alt code); nothing to drop.';
end $$;

-- STEP 2: Add public.flags with column-level filter (id, status only).
alter publication supabase_realtime add table public.flags (id, status);

-- STEP 3: Observability log table.
create table if not exists public.realtime_subscribe_log (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references public.users(id) on delete cascade,
  event       text        not null check (event in ('subscribe', 'unsubscribe')),
  channel     text        not null,
  logged_at   timestamptz not null default now()
);

alter table public.realtime_subscribe_log enable row level security;

drop policy if exists "subscribe_log insert own" on public.realtime_subscribe_log;
create policy "subscribe_log insert own"
  on public.realtime_subscribe_log for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create or replace function public.log_realtime_event(
  p_event   text,
  p_channel text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'log_realtime_event requires an authenticated user';
  end if;

  if p_event not in ('subscribe', 'unsubscribe') then
    raise exception 'event must be ''subscribe'' or ''unsubscribe''';
  end if;

  insert into public.realtime_subscribe_log (user_id, event, channel)
  values (auth.uid(), p_event, p_channel);
end;
$$;

revoke execute on function public.log_realtime_event(text, text) from public, anon;
grant  execute on function public.log_realtime_event(text, text) to authenticated;

When it completes successfully, you should see "Success. No rows returned" or a small results panel with the DO block notices.

Take a screenshot of the result and confirm back: "D4 applied".

If you see any error, STOP. Copy the error message verbatim and report it back. Do NOT attempt to fix or retry.
```

---

## Verification Queries

Run these after the apply SQL completes to confirm correct state.

**1. Confirm public.flags is in the publication with column filter:**

```sql
SELECT pubname, schemaname, tablename, attnames
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename = 'flags';
```

Expected result: 1 row. The `attnames` column should contain `{id,status}` or similar (column order may vary). If `attnames` is null/empty, Option-1 (full-row) inadvertently got applied — run rollback, investigate, re-apply.

**2. Confirm observability table exists with correct RLS:**

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'realtime_subscribe_log';
```

Expected: 1 row, `rowsecurity = true`.

**3. Confirm no other sensitive tables inadvertently added:**

```sql
SELECT schemaname, tablename, attnames
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public';
```

Should list only `flags` (and any other intentionally added tables). No `users` row should appear.

---

## Risk Notes

| Risk | Severity | Reversible? | Notes |
|------|----------|-------------|-------|
| Wrong Postgres version (< 15) | High | Yes — DO block will error cleanly | Supabase projects post-Dec 2023 run PG15. If the dashboard shows an older version, stop and escalate. |
| Option-1 file applied before this file | Medium | Yes — Step 1 DO block handles it | Drop-first guard handles this case idempotently. |
| `attnames` null after apply (full-row accidentally) | Medium | Yes — rollback + re-apply | Would mean column-level filter syntax not supported; verify Postgres version. |
| Clients receive {id, status} but fetch endpoint is slow | Low | N/A — operational | Re-fetch latency is a UX concern for Shamus; DB is unaffected. |
| Subscribe log not called by client on crash | Low | N/A | Acceptable gap; log captures intent not delivery. |
| 30-day unchecked growth of subscribe log | Low | Yes — truncate or drop table | Morgan should schedule a review. At single-digit users it's negligible. |

**Irreversible elements:** None. Both the publication change and the table creation are fully reversible via the rollback file.

---

## Notes for Shamus

**Channel name and payload shape:**

Subscribe to `postgres_changes` on schema `public`, table `flags`. The broadcast payload will be:

```json
{
  "schema": "public",
  "table": "flags",
  "commit_timestamp": "...",
  "eventType": "INSERT" | "UPDATE" | "DELETE",
  "new": { "id": "<uuid>", "status": "<string>" },
  "old": { "id": "<uuid>" }
}
```

On INSERT: `new` has `{id, status}`. On UPDATE: `new` has `{id, status}`, `old` has `{id}`. On DELETE: `old` has `{id}`, `new` is empty.

**Client-side wiring:**

```typescript
// Suggested channel name
const CHANNEL = 'flags-status';

supabase
  .channel(CHANNEL)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'flags' },
    async (payload) => {
      // payload.new only has {id, status} — never lat/lng/category
      const flagId = payload.new?.id ?? payload.old?.id;
      if (flagId) {
        // Re-fetch the full row via RLS-gated endpoint
        await refetchFlag(flagId);
      }
    }
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      logRealtimeEvent('subscribe', CHANNEL);
    }
  });

// On channel teardown
channel.unsubscribe().then(() => logRealtimeEvent('unsubscribe', CHANNEL));
```

**Per-user opt-in toggle (Safeguard #2):**

Key: `realtime_enabled` in `AsyncStorage`, default `false`. Expose a toggle in ProfileScreen. Only call `.subscribe()` when `realtime_enabled === 'true'`. When the user disables it mid-session, call `.unsubscribe()` immediately.

**Geofence filter (Safeguard #1):**

Supabase Realtime does not support server-side bounding-box filters. The `filter` parameter on the channel only supports equality (`eq`, `neq`, `lt`, `gt`), not geographic predicates. Implement client-side:

```typescript
// In the payload handler, after re-fetching the flag:
const flag = await refetchFlag(flagId);
if (flag && isOutsideViewport(flag.lat, flag.lng, currentMapBounds)) {
  return; // Discard — outside current viewport
}
// Otherwise update local state
```

`isOutsideViewport` can use `MapScreen`'s existing region state or the `PlatformMap` ref's current region.

**Observability RPC (Safeguard #3):**

```typescript
// Call on subscribe and unsubscribe
async function logRealtimeEvent(event: 'subscribe' | 'unsubscribe', channel: string) {
  await supabase.rpc('log_realtime_event', { p_event: event, p_channel: channel });
}
```

---

## Notes for Jordan

**Privacy posture this implements:**

This is a privacy-protective migration relative to Option 1. Under Option 2:

- `lat`, `lng`, `category`, `severity`, `description`, `user_id`, `photo_url`, and `created_at` are NOT included in the Realtime broadcast payload. They exist only in the database and are served exclusively via the RLS-gated REST `SELECT` endpoint, which has always been the exposure surface.
- The broadcast carries only `{id, status}` — the minimum needed for a subscriber to know "something changed" and then fetch the full row with proper RLS enforcement.
- This means Realtime does not open any new data surface for location or disability-context data beyond what the existing REST API already provides.

**Observability log schema for audit:**

Table: `public.realtime_subscribe_log`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint` (identity) | Auto-increment PK |
| `user_id` | `uuid` | FK to `public.users(id)`, not `auth.users` directly |
| `event` | `text` | `'subscribe'` or `'unsubscribe'` |
| `channel` | `text` | Client-provided channel name string |
| `logged_at` | `timestamptz` | Server `now()` at insert time |

**RLS posture:** Authenticated users can INSERT their own rows (`auth.uid() = user_id` check). No SELECT policy exists for authenticated users — reads require `service_role`. This means:
- Users cannot read other users' subscribe history.
- Users cannot read their own history via the client (by design — it's an audit log, not a UI feature).
- The Supabase dashboard (service_role) can query the full table for audit purposes.

**Caveat for audit purposes:** The log records *client intent* (when the client called the RPC), not server delivery. A client crash or offline event may result in a missing `unsubscribe` row. This is an audit-quality log, not a cryptographic delivery proof.

**30-day review:** Morgan has flagged a 30-day check-in for subscription volume and any unexpected usage patterns. No action required from Jordan at this time.
