-- ============================================================================
-- FILE:    2026-07-27_drift_capture_flag_verifications_insert_policy.sql
-- BANKED BY: SHIP-READY Phase-3 prep (2026-07-27), at Sky's explicit direction
--   during the Job 1 SQL-slate review, in response to 04b §C-2 (SR-009).
--
-- WHAT: Captures the LIVE body of "flag_verifications own insert" verbatim,
--   read via pg_policy (roles, command, using, with check) on 2026-07-27,
--   BEFORE 04b §C-2's null-safe fix is applied. This is NOT a behaviour
--   change -- running the DDL below reproduces the exact policy already
--   live. It exists so the fix's rollback restores the body that was
--   ACTUALLY live, not 04b's hand-written "as shipped" text (04b's C-2
--   rollback was reconstructed from the original migration file; it never
--   queried live for this table).
--
-- WHY: 04b §C-5 (a sibling artifact, reviewed the same session) was found
--   to have exactly this failure mode -- its assumed "shipped" body did not
--   match what was actually live, discovered only by a read-only diff right
--   before apply. C-2's captured body below WAS independently verified to
--   match 04b's assumed text (read-only check, 2026-07-27) -- so there is
--   no known drift here today. This file is banked as the durable,
--   versioned source of truth regardless, per Sky's standing instruction:
--   don't rely on an ephemeral chat-only comparison alone.
--
-- STATUS: Documentation / provenance artifact. Not run through the normal
--   apply pipeline (it would be a safe no-op if it were -- it reasserts the
--   identical policy verbatim). C-2's actual fix, and its rollback (which
--   points back to this file), are tracked and gated separately -- same
--   per-statement Sky's-yes discipline as every other Job 1 item.
-- ============================================================================

-- Captured verbatim via (read-only; nothing was modified to produce this):
--   select c.relname, p.polname, p.polcmd, p.polpermissive, roles,
--          pg_get_expr(p.polqual, p.polrelid), pg_get_expr(p.polwithcheck, p.polrelid)
--     from pg_policy p join pg_class c on c.oid = p.polrelid
--    where c.relname = 'flag_verifications';
--
-- Result (2026-07-27):
--   policy: "flag_verifications own insert" | command: INSERT | permissive: true | roles: {authenticated}
--     using:      (none -- INSERT policies only carry WITH CHECK)
--     with check: ((( SELECT auth.uid() AS uid) = verifier_id) AND (verifier_id <> ( SELECT flags.user_id
--                   FROM flags WHERE (flags.id = flag_verifications.flag_id))))
--   policy: "flag_verifications readable" | command: SELECT | permissive: true | roles: {authenticated}
--     using: (verifier_id = ( SELECT auth.uid() AS uid))
--     -- Untouched by C-2's fix. Captured here for context only -- no DDL below for it.

drop policy if exists "flag_verifications own insert" on public.flag_verifications;
create policy "flag_verifications own insert"
  on public.flag_verifications for insert
  to authenticated
  with check (
    (select auth.uid()) = verifier_id
    and verifier_id <> (select flags.user_id from public.flags where flags.id = flag_verifications.flag_id)
  );

-- ============================================================================
-- USE: this file IS the corrected rollback for 04b §C-2's null-safe fix.
-- Re-running it (the drop+create above) restores the exact pre-fix state --
-- supersedes 04b's own hand-written rollback text.
-- ============================================================================
