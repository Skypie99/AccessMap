-- ===========================================================================
-- 2026-05-24 — Flag context tags (Dana / backend & database)
-- ===========================================================================
--
-- Adds a `context_tags text[]` column to `public.flags` so reporters can
-- attach context about WHEN / UNDER WHAT CONDITIONS a flag is most relevant
-- (e.g. "high_tide", "morning_rush", "when_wet"). Empty array default means
-- existing rows stay legal without backfill, and a flag with no tags is the
-- same as today's behaviour.
--
-- Why a text[] instead of a separate table:
--   - Tags are a small, controlled vocabulary owned by the app (see
--     CONTEXT_TAGS in src/lib/contextTags.ts). A junction table would buy us
--     nothing for fewer than ~10 values, and the array makes the common read
--     ("show me this flag's tags") a single column fetch, no JOIN.
--   - Postgres' `text[]` + GIN index handles containment queries efficiently,
--     which is exactly the future "show me flags tagged X" query shape.
--
-- Why propose-only:
--   - Per Constitution Art. 5.3, Sky applies live-DB changes — never the agent.
--   - The app's createFlag() will start sending `context_tags` immediately.
--     Until this migration runs, Supabase rejects the unknown column with a
--     PostgREST error; the client wraps the insert and degrades gracefully so
--     the user can still report the flag (tags are silently dropped). See the
--     comments in src/lib/flags.ts → createFlag for the fallback behaviour.
--
-- This file is IDEMPOTENT — running it twice is a no-op.
--
-- =========================================================================
-- HOW TO APPLY (Sky):
-- =========================================================================
--
-- Supabase Dashboard → Project → SQL Editor → New query →
--   paste this whole file → Run.
--
-- Cost: well under 1 second on a small table. No row rewrite — Postgres adds
-- the column with a constant default, which is a metadata-only change in
-- modern Postgres (11+). The GIN index build is also cheap on a small table.
--
-- AFTER APPLYING:
--   1. Dashboard → Database → Tables → public.flags → confirm a
--      `context_tags` column is present (text[], NOT NULL, default '{}').
--   2. Dashboard → Database → Indexes → confirm `flags_context_tags_idx`
--      exists (GIN on context_tags).
--   3. Open the app → Report a flag → tap a few chips in the new
--      "Context (optional)" section → submit. Then look at the flag's row
--      in the Supabase Table Editor: `context_tags` should contain the
--      values you picked (e.g. {high_tide,when_wet}).
--   4. Existing flags should show an empty array `{}` for `context_tags`.
--
-- =========================================================================
-- ROLLBACK (only if something is wrong):
-- =========================================================================
--
--   alter table public.flags drop column if exists context_tags;
--   -- (drop column cascades the GIN index automatically — no separate step.)
--
-- After rollback, the app continues to function: createFlag() will send
-- context_tags but Supabase will reject only that column; the existing
-- fallback in src/lib/flags.ts catches the error and retries without the
-- field. (See `createFlag` for details.)
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. context_tags column — array of short string tags, defaults to empty.
-- ---------------------------------------------------------------------------
--
-- text[] (not a jsonb or enum) so:
--   - the GIN index supports `where 'high_tide' = any(context_tags)` and
--     `where context_tags @> array['high_tide']` queries efficiently
--   - we never store NULL — the empty array is the "no tags" state
--   - adding new tag values in the future is a code-only change; the column
--     accepts any string. Validation lives in src/lib/contextTags.ts
--     (CONTEXT_TAGS + sanitizeTagList) where the vocabulary lives.

alter table public.flags
  add column if not exists context_tags text[] not null default '{}';


-- ---------------------------------------------------------------------------
-- 2. GIN index for tag-containment filtering.
-- ---------------------------------------------------------------------------
--
-- A future "show me flags with tag X" query (e.g. a filter chip on the map)
-- will look like:
--   select * from flags where context_tags @> array['high_tide']::text[]
-- GIN is the right index for that — btree wouldn't help with array
-- containment. The index is cheap on the current table size and pays off as
-- soon as the filter ships.

create index if not exists flags_context_tags_idx
  on public.flags using gin (context_tags);

-- ===========================================================================
-- End of file.
-- ===========================================================================
