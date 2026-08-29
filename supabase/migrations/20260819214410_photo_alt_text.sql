-- ============================================================================
-- APPLIED TO LIVE 2026-08-19 (via Supabase MCP, Sky-approved).
-- Photo alt text for screen-reader users.
--
-- WHY: Apple's VoiceOver evaluation criteria (Accessibility Nutrition Labels)
-- state that if an app lets users upload media, users need a way to include a
-- description so VoiceOver can speak it. Flagstone's photos previously fell
-- back to a generic "Flag photo" label. For this app's audience that gap
-- matters more than usual.
--
-- WHAT:
--   flags.photo_alt        — alt text for the reporter's primary photo
--   flag_photos.alt_text   — alt text for community evidence photos
-- Both nullable + optional, char_length <= 200 (client caps at the same).
--
-- RLS: no changes. The columns are written on the same INSERTs the existing
-- policies already govern, and read via the same SELECTs.
--
-- ROLLBACK:
--   alter table public.flags drop column if exists photo_alt;
--   alter table public.flag_photos drop column if exists alt_text;
-- ============================================================================

alter table public.flags
  add column if not exists photo_alt text
  check (photo_alt is null or char_length(photo_alt) <= 200);

alter table public.flag_photos
  add column if not exists alt_text text
  check (alt_text is null or char_length(alt_text) <= 200);
