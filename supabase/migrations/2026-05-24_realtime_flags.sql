-- Enable Supabase Realtime on the flags table.
--
-- The client-side subscription is already wired in src/lib/flagsStore.tsx
-- (channel 'public-flags', listening for INSERT/UPDATE/DELETE on public.flags).
-- It stays quiet until public.flags is added to the realtime publication.
--
-- Apply in: Supabase Dashboard → SQL Editor → Run
-- Rollback:  ALTER PUBLICATION supabase_realtime DROP TABLE public.flags;

ALTER PUBLICATION supabase_realtime ADD TABLE public.flags;
