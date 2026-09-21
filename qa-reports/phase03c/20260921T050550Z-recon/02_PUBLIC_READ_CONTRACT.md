# 02 — Public (Anonymous) Read Contract

Derived from, in priority order: the ratified Privacy Policy (§SKY-8, `design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md`) → the founding Jordan gate + its migration → current RLS/grants (incl. Stage A + Phase03B, see `01_GROUND_TRUTH.md`) → current client code.

## What must work for an unauthenticated user (confirmed intentional)

| Capability | Evidence |
|---|---|
| Browse the live flag map / list, read-only | Privacy Policy: "You can browse the map and submit barrier reports anonymously." `src/lib/flags.ts:1042-1080` (`listFlags`/`listFlagsPage`), backed by RLS policy `"flags readable by anon"` (`using (true)`, `to anon`) |
| See individual flag detail (location, category, severity, description, status, created_at, primary photo) | Same `FLAG_READ_SELECT` column list backs the detail view; primary photo via `flags.photo_object_key` → public-bucket URL (no auth needed) |
| **Not** see rejected flags | `"flags rejected hidden from anon"` restrictive policy, `supabase/migrations-next/phase03b/20260915210256_...sql:167-172` — `to anon`, hides `status='rejected'` rows. (Applies only to `anon`; a separate restrictive policy hides them from non-admin `authenticated` too.) |
| Submit a barrier report anonymously | Privacy Policy: "submit barrier reports anonymously... not linked to you." RLS `"flags anon insert"` (`to anon`, `with check (user_id is null and photo_url is null and status='open')`, `supabase/migrations/20260602053139_...sql:15-22`). Client: `src/lib/flags.ts` `createAnonFlag` (~line 1786), no `user_id` in payload. |
| Submit anonymous feedback / "report this content" (write-only) | RLS grants anon INSERT on `feedback` including `contact_email` (`supabase/migrations-next/phase03a/20260905073925_...sql:190`); confirmed write-only by pgTAP under the `anon` role: `supabase/tests/phase03a-privileges.test.sql:180` (`SELECT body FROM public.feedback` → `42501`) and `:182` (`UPDATE ... SET body` → `42501`) |
| Static content: About, Resources, How-To-Help, Terms, Privacy screens | No Supabase calls at all (client-surface agent, §2) |
| Reporting-anonymous UX affordances (no submit gate flash, dedicated copy) | `ReportFlagModal.tsx` first-class `isAnon` branch |

## What must NOT work for an unauthenticated user (confirmed by RLS/grants)

| Capability | Why blocked |
|---|---|
| Read `public.users` in any form (email, display_name, points, is_admin, anything) | Table SELECT revoked from `anon` entirely; only a caller-scoped view (`users_self_email`, requires `auth.uid()`) exists, unreachable without a session |
| Read `flag_comments` | Only SELECT policy is `to authenticated` (`supabase/migrations/20260530192829_flag_comments.sql`); no `to anon` policy anywhere |
| Read `flag_photos` (the multi-photo junction table) | Same pattern — `to authenticated` only. (Note: the **primary** photo on `flags.photo_object_key` is separately anon-visible via the public storage bucket — see the "public-safe ≠ anon-safe" trap below) |
| Read `flag_status_history` / `flag_edit_history` (even the "_public" sanitized views) | Both `*_public` views are granted to `authenticated` only, never `anon` |
| Read `flag_moderation_events`, call `list_open_moderation_reports`/`moderate_report` | Phase03B: table SELECT `to authenticated` restricted to admins by RLS; RPCs `SECURITY DEFINER` with admin check inside, EXECUTE granted to `authenticated` only |
| Write/verify/resolve/dispute/reopen a flag, vote, comment | All gated `to authenticated`, most also check `auth.uid()` ownership |
| Read own or others' points, activity feed, leaderboard | `ProfileScreen` early-returns to `GuestProfile` (no Supabase calls) before any of these mount; `point_events`/`comment_votes` RLS is owner-scoped `authenticated` only |
| Read back submitted feedback / contact_email | No anon SELECT policy on `feedback`; pgTAP-confirmed write-only |

## The "public-safe ≠ anon-safe" vocabulary trap

This codebase uses "public" / "\*_public" as a name for **"safe to show any authenticated user, not just the row owner,"** not "safe to show anon." `flag_status_history_public`, `flag_edit_history_public` (both comment: *"Public-safe projection... omits user_id"*) are granted to `authenticated` only. A future reader (including an implementer) must not assume a `_public`-suffixed view is anon-reachable — none currently are.

## Confirmed gap in this contract (needs an owner decision, not a code guess)

`public.flags.last_moderation_reason_code` (added by Phase03B) has its **UPDATE** revoked from anon/authenticated/public but **no SELECT restriction** — it inherits the blanket `GRANT SELECT ON TABLE flags TO anon`. No document found stating whether moderation-reason codes are meant to be public-facing transparency or admin-internal. See `04_EXPOSURE_AUDIT.md` finding F1.

## Not in scope for this contract (adjacent, do not fold in)

The IP-prefix rate limiter for anon flag/feedback writes (`limiter` schema, FDA-028, `MF05_AND_PRODUCTION_POLICY_PROPOSAL.md`) governs **write abuse**, not read privacy. It has its own owner-approved posture (`S3_LIMITER_PRESENT_BYPASS_OPEN` accepted for Stage A) and its own separate authorization track. Do not re-litigate it under Phase 03C.
