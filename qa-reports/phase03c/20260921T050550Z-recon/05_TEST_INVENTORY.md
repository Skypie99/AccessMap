# 05 — Test Inventory

## Jest — naming trap

`src/__tests__/privacy.guard.test.ts` (237 lines, read in full) **does not test RLS, anon access, or data exposure at all.** It's a copy-drift tripwire proving the in-app Privacy Policy screen renders `design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md` verbatim (paragraph equality, `[V:...]` marker stripping, three-surface reachability). Do not cite it as access-control coverage.

Real Jest coverage relevant to this contract:
- `src/lib/__tests__/createAnonFlag.test.ts` — unit tests (mocked client) confirming the anon-insert payload excludes `user_id` and forces `photo_url: null`. Strongest direct-code proof the anonymous-insert contract is implemented as documented.
- `src/lib/__tests__/anonRateLimit.test.ts` — tests the **client-only** `AsyncStorage` counter in isolation. Confirms it exists; does **not** prove server-side rate limiting (there is a separate server-side trigger, `check_global_anon_rate_limit()`, Stage-A — the client counter is a UX nicety, trivially bypassed, not a security control; don't conflate the two).
- `src/screens/__tests__/guestReviewGating.guard.test.ts` — source-text assertions that write-path auth guards (`if (!user)`) sit before mutation calls in `TasksScreen`/`FlagDetailModal`/`MapScreen`. Proves guard *ordering* in source, not runtime RLS behavior.
- `src/screens/__tests__/{GuestProfile,MapScreen.guestHandoff,TasksScreen.guestHandoff}.test.tsx` — guest-mode UX/navigation tests, not data-exposure tests.

## pgTAP — the real access-control proof, and its gap

`supabase/tests/phase03a-privileges.test.sql` (`plan(79)`) is the closest thing to a formal anon-boundary proof:
- Confirms `anon` **cannot**: `TRUNCATE flags`, create a `REFERENCES` FK to `flags`, call `nextval`/`setval` on internal sequences, backdate a flag insert's `created_at`, `SELECT`/`UPDATE` `feedback` (write-only proof, lines 180/182).
- Confirms `authenticated` **cannot** overwrite server-owned `flags` columns (`id`, `user_id`, `lat`, `lng`, `created_at`, `updated_at`, `reopen_requests`, `dispute_requests`, `photo_object_key`) via UPDATE.
- **Gap: no positive assertion that `anon` CAN `SELECT` from `flags` and get back a specific expected column shape/row count.** The anon-read side of the contract is currently proven only by the RLS policy text existing, not by a pgTAP row-returned check. A schema drift that accidentally dropped or narrowed `"flags readable by anon"` would not be caught by any test in this repo.
- **Gap: no pgTAP test asserts `anon` gets *zero* rows from `flag_comments`/`flag_photos`/`users`** (the negative space of the contract) — currently true only by the absence of a permissive policy, unverified by an executable test.

`supabase/tests/phase03b-moderation.test.sql:104-105` — sets `role anon`, asserts `SELECT count(*) FROM flags WHERE status='rejected'` returns `0`. This is the one existing positive-shape anon-read assertion, and it only covers the rejected-hiding behavior, not the base anon-read grant.

`supabase/tests/phase03a-foundation.test.sql:242` — `lives_ok` for an anonymous open-status flag insert. Confirms the write side works; not a read test.

## Recommendation (feeds `06_IMPLEMENTATION_PLAN.md`)

Add pgTAP coverage, under `role anon`, asserting:
1. `SELECT` from `flags` (non-rejected) returns the expected row/columns (positive).
2. `SELECT` from `users`, `flag_comments`, `flag_photos`, `flag_moderation_events`, `feedback` all return **zero rows or throw** (negative space, currently untested).
3. Whatever F1's owner decision resolves to for `last_moderation_reason_code`.
