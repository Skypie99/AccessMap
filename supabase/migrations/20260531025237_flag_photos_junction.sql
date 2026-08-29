-- =============================================================================
-- flag_photos junction table: stores multiple photos per flag.
-- Referenced by src/lib/photos.ts and src/types/database.ts.
--
-- DESIGN:
--   Each row links a flag_id to a public Storage URL with an integer
--   display position. The table intentionally has no user_id column because
--   multiple community members can add evidence photos to any flag (same
--   philosophy as flag status updates: crowdsourced). The Storage RLS policy
--   already ensures each URL was uploaded by auth.uid() (path must start
--   with the uploader's own UUID), so the URL is implicitly user-anchored.
--
-- RLS SUMMARY:
--   SELECT  — any authenticated user (photos are community-visible)
--   INSERT  — any authenticated user (community can add evidence photos)
--   DELETE  — flag owner only (owner curates their flag's photo set)
--   UPDATE  — flag owner only (owner can reorder photos)
--
-- GRACEFUL DEGRADATION:
--   src/lib/photos.ts catches PostgreSQL error 42P01 (relation does not
--   exist) and returns [] silently, so the app works before this migration
--   is applied. Once applied, multi-photo features become live automatically.
--
-- IDEMPOTENCY:
--   All DDL uses IF NOT EXISTS / CREATE OR REPLACE — safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.flag_photos (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id    UUID    NOT NULL REFERENCES public.flags(id) ON DELETE CASCADE,
  url        TEXT    NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flag_photos ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read photos on any flag (community-visible).
CREATE POLICY "flag_photos: authenticated read"
  ON public.flag_photos FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can add photos (community evidence model).
-- Storage bucket RLS (flag-photos auth upload policy) already enforces
-- that each URL belongs to the uploader's own folder.
CREATE POLICY "flag_photos: authenticated insert"
  ON public.flag_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only the flag owner can delete photos from their flag.
CREATE POLICY "flag_photos: flag owner delete"
  ON public.flag_photos FOR DELETE
  TO authenticated
  USING (
    (SELECT user_id FROM public.flags WHERE id = flag_id) = auth.uid()
  );

-- Only the flag owner can reorder photos (position UPDATE).
CREATE POLICY "flag_photos: flag owner update"
  ON public.flag_photos FOR UPDATE
  TO authenticated
  USING (
    (SELECT user_id FROM public.flags WHERE id = flag_id) = auth.uid()
  )
  WITH CHECK (
    (SELECT user_id FROM public.flags WHERE id = flag_id) = auth.uid()
  );

-- Fast per-flag lookup ordered by display position.
CREATE INDEX IF NOT EXISTS flag_photos_flag_id_position_idx
  ON public.flag_photos (flag_id, position);

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP INDEX  IF EXISTS flag_photos_flag_id_position_idx;
-- DROP TABLE  IF EXISTS public.flag_photos;
-- =============================================================================
