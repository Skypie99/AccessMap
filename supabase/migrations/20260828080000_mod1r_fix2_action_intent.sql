-- ============================================================================
-- MOD1R FIX2 — durable PRE-ACTION intent, closing the last independent-
-- acceptance blocker in the moderation retry design.
-- SOURCE FILE ONLY — not applied to any hosted project by this migration.
-- Does not edit 20260828050000_mod1_admin_report_queue.sql or
-- 20260828070000_mod1r_fix1_pending_close_state.sql.
-- ============================================================================
--
-- Independent acceptance found: closeAfterContentAction() (adminReports.ts)
-- runs the content mutation (reject/remove a flag, delete a comment) FIRST,
-- then a BEST-EFFORT markPendingResolution() write, then up to 3 close
-- retries. If markPendingResolution() itself also fails (not just the close
-- retries — the same network blip that sinks the close attempts can just as
-- easily sink this one), NOTHING durable was ever written: reviewed_at,
-- reviewed_by, and resolution all stay null, indistinguishable from a report
-- nobody has touched. A reload then re-offers the original destructive
-- button even though the content action already succeeded — pressing it
-- again re-runs an already-applied destructive step.
--
-- FIX: record intent to perform a specific destructive action BEFORE it
-- runs, in a write the client treats as load-bearing (it throws on failure,
-- so the destructive action is never attempted un-tracked). On reload, a
-- report whose resolution is still null but whose intent is set is
-- reconciled against the LIVE state of its target (see
-- reconcileActionIntent() in src/lib/adminReports.ts) instead of ever being
-- treated as untouched:
--
--   intent flag_rejected + flag now status='rejected'  -> proven succeeded
--   intent flag_removed  + flag now absent              -> proven succeeded
--   intent comment_removed + comment now absent          -> proven succeeded
--   intent set + target unchanged/still present          -> proven NOT run,
--     safe to retry the original action from scratch
--   intent set + target in some other unresolvable state  -> left OPEN;
--     targetAvailable is false in exactly this case, so the existing
--     targetAvailable-gated UI already withholds every destructive button
--     and offers only the non-destructive target-unavailable/no-action close
--     — fail-safe by construction, not a new code path.
--
-- Only the three resolutions that name an actual content mutation are valid
-- intents — 'no_action' and 'target_unavailable' never mutate content, so
-- there's nothing for a pre-action intent to protect there.
alter table public.feedback
  add column if not exists moderation_action_intent text;

alter table public.feedback
  drop constraint if exists feedback_moderation_action_intent_vocabulary;
alter table public.feedback
  add constraint feedback_moderation_action_intent_vocabulary
  check (
    moderation_action_intent is null
    or moderation_action_intent in ('flag_rejected', 'flag_removed', 'comment_removed')
  );

-- Same least-privilege shape as 20260828050000: an admin may write this
-- column on a report row (RLS + the "self-claim only" WITH CHECK on
-- moderation_reviewed_by already cover row-level authorization for that
-- write; this only widens WHICH columns the update grant permits).
grant update (moderation_action_intent) on public.feedback to authenticated;

-- ROLLBACK:
--   revoke update (moderation_action_intent) on public.feedback from authenticated;
--   alter table public.feedback drop constraint if exists feedback_moderation_action_intent_vocabulary;
--   alter table public.feedback drop column if exists moderation_action_intent;
-- ============================================================================
