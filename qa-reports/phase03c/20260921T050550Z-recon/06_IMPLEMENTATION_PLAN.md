# 06 — Implementation Plan (proposed order; NOT executed by this recon)

This recon session performed no implementation per its own instructions. The order below is a recommendation for whoever runs Phase 03C proper.

## 0 — Re-verify ground truth live (read-only), before writing anything

`01_GROUND_TRUTH.md`'s migration-ledger conclusion (Stage A + Phase03B are live; ledger=87, tip=`20260915210413`) rests on report arithmetic across two point-in-time inspections, not a fresh query. Confirm with a read-only `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5` (or equivalent) before relying on it for any migration authorship, so a new file isn't written against a base that's already drifted. Also resolve F5 (account-deletion RPC existence) and F6 (`flags_user_scoped` legacy policy) with a read-only `to_regprocedure()`/`pg_policies` check — both are cheap, both currently rest on inference rather than direct observation.

## 1 — Owner decisions needed before code changes (surface to Sky, don't guess)

- F1: is `flags.last_moderation_reason_code` meant to be anon/public-readable?
- F3: should `flag_photos` (additional photos) be anon-readable to match the primary photo's effective public-ness, or should the primary-photo public-bucket exposure be reconsidered instead? (Two ways to resolve the same inconsistency — this is a real choice, not a bug fix.)

## 2 — Low-risk hygiene, no behavior change

- F2: fix the stale/false privacy comment in `src/lib/flags.ts` above `listFlags()` — it currently claims RLS restricts flags to `authenticated` only, which has been false since `20260529175842`.
- F4: narrow the `flag_photos`/`flag_comments` anon table-level `GRANT SELECT` to `authenticated` only, matching actual RLS intent (removes a latent, currently-inert privilege).

## 3 — Test coverage (do after the F1 decision, since it determines the exact assertion)

Add the pgTAP coverage listed in `05_TEST_INVENTORY.md` — positive anon-read shape on `flags`, negative anon-read on `users`/`flag_comments`/`flag_photos`/`flag_moderation_events`/`feedback`.

## 4 — Only if F5 resolves to "genuinely not applied"

Account-deletion RPCs are a pre-existing gap unrelated to the anon-read contract's own health; note it in `DECISIONS FOR SKY` / surface to Morgan per the standing "Surface Decisions Clearly" practice rather than silently building it as a Phase-03C side quest — it's a different phase's scope (deletion/takedown, not public-read).

## Explicitly not in this plan

- The IP-prefix write rate limiter (FDA-028) — has its own owner-approved track, do not touch under Phase 03C.
- `is_admin` authenticated-wide exposure — already has an owner-approved Stage-A/Stage-B deferral; re-closing it means executing the excluded Stage B, which is its own separately-authorized cutover, not a Phase-03C task.
- Anything requiring `main` merge/push, or live/staging DB contact — per this task's own constraints and Constitution Art. 5/17, that's Sky-only (or the Art. 17 Prompt-Library-only carve-out, which doesn't apply here).
