-- ============================================================================
-- MOD1R FIX1 CHECKPOINT B — a durable "pending close" state, so a report
-- whose content action succeeded but whose close write failed never needs
-- its destructive content action repeated.
-- SOURCE FILE ONLY — not applied to any hosted project by this migration.
-- Does not edit 20260828050000_mod1_admin_report_queue.sql.
-- ============================================================================
--
-- Independent acceptance found: adminReports.ts's closeAfterContentAction()
-- runs the content mutation (reject/remove a flag, delete a comment) FIRST,
-- then retries closeReport() up to 3 times. If all 3 retries are exhausted,
-- the report is left with reviewed_at/reviewed_by/resolution all still NULL —
-- there is no way to record "the content action already happened" durably,
-- because feedback_moderation_review_pairing requires reviewed_at and
-- resolution to be null-together or set-together. A second press therefore
-- re-runs the ALREADY-SUCCEEDED content action: for a reject, the flag's own
-- CAS trigger turns that into a confusing conflict error; for a comment
-- (already deleted), removeCommentReport's existence check reports
-- 'target_unavailable' — silently overwriting the true 'comment_removed'
-- outcome the first press already earned.
--
-- FIX: allow resolution (+ reviewed_by) to be recorded BEFORE reviewed_at —
-- a "pending close" state distinct from OPEN. The one direction that must
-- stay impossible is unchanged: a row cannot be marked reviewed (reviewed_at
-- set) without a resolution.
--
--   OPEN            reviewed_at = null,     resolution = null
--   PENDING CLOSE    reviewed_at = null,     resolution = <original outcome>
--   CLOSED           reviewed_at = <time>,   resolution = <original outcome>
--
-- listOpenReports() already selects moderation_resolution and already filters
-- on `moderation_reviewed_at IS NULL` — both OPEN and PENDING CLOSE rows keep
-- surfacing in the queue with no query change; the client tells them apart by
-- whether `resolution` is null.
alter table public.feedback
  drop constraint if exists feedback_moderation_review_pairing;
alter table public.feedback
  add constraint feedback_moderation_review_pairing
  check (
    moderation_reviewed_at is null
    or moderation_resolution is not null
  );

-- ROLLBACK:
--   alter table public.feedback drop constraint if exists feedback_moderation_review_pairing;
--   alter table public.feedback add constraint feedback_moderation_review_pairing
--     check ((moderation_reviewed_at is null) = (moderation_resolution is null));
-- ============================================================================
