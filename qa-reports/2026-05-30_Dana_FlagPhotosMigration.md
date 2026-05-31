# Dana — Flag Photos Junction Table Migration
**Date:** 2026-05-30  
**Branch:** feat/sprint3-onboarding  
**Severity:** Critical (feature blocked until applied)

---

## What Was Found

Gary's QA flagged that `flag_photos` was missing from the database. The app code (`src/lib/photos.ts`) and TypeScript types (`src/types/database.ts`) were already complete, with a 42P01 graceful-degradation guard so the app doesn't crash — but multi-photo saves silently no-op until the table exists.

The migration file `supabase/migrations/2026-05-30_flag_photos_junction.sql` was already written by Shamus and sitting on disk but **not committed and never applied**. No separate SQL was needed — the file was correct.

---

## Schema Created

**Table:** `public.flag_photos`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | `DEFAULT gen_random_uuid()` |
| `flag_id` | UUID NOT NULL | FK → `public.flags(id) ON DELETE CASCADE` |
| `url` | TEXT NOT NULL | Public Storage URL |
| `position` | INTEGER NOT NULL | `DEFAULT 0 CHECK (position >= 0)` — display order |
| `created_at` | TIMESTAMPTZ NOT NULL | `DEFAULT now()` |

**Index:** `flag_photos_flag_id_position_idx ON (flag_id, position)` — ordered per-flag fetches.

**RLS:** Enabled. Four policies:

| Policy | Operation | Who |
|---|---|---|
| `flag_photos: authenticated read` | SELECT | Any authenticated user |
| `flag_photos: authenticated insert` | INSERT | Any authenticated user (community evidence model) |
| `flag_photos: flag owner delete` | DELETE | Flag owner only (`flags.user_id = auth.uid()`) |
| `flag_photos: flag owner update` | UPDATE | Flag owner only (reorder by position) |

---

## Design Decision: Community vs. Owner-Only INSERT

The migration allows **any** authenticated user to add photos (not just the flag owner), which is more permissive than the original task brief ("users can INSERT photos on flags they own"). This matches the community-evidence philosophy already established in the app: anyone can verify, resolve, or add context to a flag they didn't create. The Storage bucket RLS (`flag-photos` auth upload policy) already enforces that each URL was uploaded by the auth.uid() user, so the URL is implicitly user-anchored. Flag owner retains full DELETE and UPDATE control.

**If Sky wants owner-only INSERT** instead, replace `WITH CHECK (true)` in the insert policy with:
```sql
WITH CHECK ((SELECT user_id FROM public.flags WHERE id = flag_id) = auth.uid())
```

---

## What Was Committed

- `supabase/migrations/2026-05-30_flag_photos_junction.sql` — idempotent DDL (`IF NOT EXISTS`), RLS, index, rollback comment block.

The file was already on disk, untracked. This commit adds it to version control.

---

## Apply to Database — Action Required

**The migration has NOT been applied to the live database.** Docker is not running locally and the Supabase CLI is not authenticated in this session, so programmatic apply was not possible.

**Sky must run this SQL in the Supabase dashboard:**

1. Open the Supabase project dashboard → SQL Editor  
2. Paste and run the full contents of `supabase/migrations/2026-05-30_flag_photos_junction.sql`  
3. Verify: the editor returns "Success" and no error codes.

Once applied, multi-photo saves (`addFlagPhoto`, `batchInsertFlagPhotos`) will work live automatically — no app code change needed, the graceful-degradation guard will simply stop triggering.

---

## Cowork Prompt (Copy-Paste to Apply)

```
Open the Supabase SQL Editor for project kldlwszpfkdmsjrjhjym and run the following SQL to create the flag_photos junction table:

CREATE TABLE IF NOT EXISTS public.flag_photos (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id    UUID    NOT NULL REFERENCES public.flags(id) ON DELETE CASCADE,
  url        TEXT    NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flag_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flag_photos: authenticated read"
  ON public.flag_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "flag_photos: authenticated insert"
  ON public.flag_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "flag_photos: flag owner delete"
  ON public.flag_photos FOR DELETE
  TO authenticated
  USING (
    (SELECT user_id FROM public.flags WHERE id = flag_id) = auth.uid()
  );

CREATE POLICY "flag_photos: flag owner update"
  ON public.flag_photos FOR UPDATE
  TO authenticated
  USING (
    (SELECT user_id FROM public.flags WHERE id = flag_id) = auth.uid()
  )
  WITH CHECK (
    (SELECT user_id FROM public.flags WHERE id = flag_id) = auth.uid()
  );

CREATE INDEX IF NOT EXISTS flag_photos_flag_id_position_idx
  ON public.flag_photos (flag_id, position);
```

---

## Rollback

```sql
DROP INDEX  IF EXISTS flag_photos_flag_id_position_idx;
DROP TABLE  IF EXISTS public.flag_photos;
```

---

## DECISIONS FOR SKY

1. **INSERT policy scope:** Community (any authenticated user, current) vs. flag-owner-only? Current choice is community; see note above if you prefer owner-only.
2. **Apply timing:** This is blocking multi-photo saves. Apply at next Supabase SQL Editor session.
