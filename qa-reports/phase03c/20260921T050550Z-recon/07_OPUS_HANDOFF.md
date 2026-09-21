# 07 — Opus Handoff

```
CANONICAL_BASE: origin/main = 6e91ec65bd5f5bdca086fe21949c8477bdc18bac
BRANCH: recon/flagstone-p03c-20260920
WORKTREE: /Users/skypie/AccessMap-worktrees/flagstone-p03c-recon-20260920
HEAD: 6e91ec65bd5f5bdca086fe21949c8477bdc18bac
TREE: clean
```

## PUBLIC_SURFACES (must keep working)
1. Anon SELECT `public.flags` (non-rejected rows, full current column set)
2. Anon INSERT `public.flags` (open-status guest report, no user_id/photo)
3. Anon INSERT `public.feedback` (incl. optional `contact_email`)
4. Anon-visible primary flag photo via public `flag-photos` storage bucket
5. Static screens (About/Resources/HowToHelp/Terms/Privacy) — no DB surface at all

## PRIVATE_SURFACES (must keep blocked from anon)
1. `public.users` — all columns, all grains
2. `public.flag_comments`, `public.flag_photos` (table reads)
3. `public.flag_moderation_events`, moderation RPCs (`list_open_moderation_reports`, `moderate_report`, `transition_flag_status`)
4. `flag_status_history`/`flag_edit_history` (raw tables AND their `_public` views — both authenticated-only)
5. `point_events`, `flag_verifications`, `comment_votes`, `push_tokens`, `notification_preferences`, `realtime_subscribe_log`
6. Feedback read-back (write-only for anon, pgTAP-confirmed)

## CONFIRMED_GAPS (6 — see `04_EXPOSURE_AUDIT.md` F1–F6)
- F1: `flags.last_moderation_reason_code` anon-readable, no documented intent
- F2: stale/false privacy comment in `src/lib/flags.ts` (claims anon blocked; false since 2026-05-29)
- F3: primary photo (anon-visible) vs. additional photos (authenticated-only) inconsistency, undocumented
- F4: `flag_photos`/`flag_comments` anon table GRANT with no matching RLS policy (inert, hardening item)
- F5: account-deletion RPC family (11 names) referenced by edge functions, absent from `supabase/migrations/` — best read is "not applied," needs live confirmation
- F6: legacy `flags_user_scoped` PUBLIC-role policy textually never dropped by name; flagged externally as FDA-009, needs a live `pg_policies` check

## AMBIGUITIES (2 high-risk, both resolved in this recon with strong evidence — re-verify live before trusting)
- A1 (= F5): account-deletion RPC live status
- A2: migration-ledger applied state — resolved as "Stage A + Phase03B ARE live" via ledger arithmetic across two Sky-authorized read-only production inspections six days apart (71+14+2=87, exact match); the spawned DB-surface agent reached the opposite conclusion by trusting a stale `migrations-next/` README disclaimer. See `01_GROUND_TRUTH.md` for the full resolution chain. **Re-verify with a fresh read-only ledger query before any migration authorship.**

## FILES_LIKELY_TO_CHANGE
- `src/lib/flags.ts` (F2 comment fix)
- A new migration file for F1's resolution (column SELECT revoke) and/or F4 (grant narrowing)
- `supabase/tests/phase03a-privileges.test.sql` or a new pgTAP file (F1/F5 coverage per `05_TEST_INVENTORY.md`)

## MIGRATIONS_LIKELY_REQUIRED
- 0 or 1 new migration depending on F1's owner decision (`REVOKE SELECT (last_moderation_reason_code) ON flags FROM anon[, authenticated]`)
- Optionally 1 more for F4 (`REVOKE SELECT ON flag_photos, flag_comments FROM anon`) — purely additive hardening, no behavior change, low risk
- Must land in `supabase/migrations-next/` first per this repo's established staging convention (see `01_GROUND_TRUTH.md`), not directly in `supabase/migrations/`

## TESTS_TO_ADD_OR_UPDATE
See `05_TEST_INVENTORY.md` recommendation: positive anon-SELECT-shape test on `flags`; negative anon-SELECT tests on `users`/`flag_comments`/`flag_photos`/`flag_moderation_events`/`feedback`; F1-specific column test once decided.

## LOCAL_DB_TEST_PATH
`supabase/tests/*.test.sql` via `scripts/run-pgtap.mjs` (pgTAP) — this repo's established local verification path; no staging/production contact needed for F1/F2/F4/test-coverage work. F5/F6/A2 verification is READ-ONLY against production per this repo's Constitution Art. 5 (agents never write to live DB; only Sky applies).

## HIGHEST_RISK_DECISIONS
1. A2 (migration-ledger live state) — get this wrong and a new migration could double-apply Stage-A/03B statements or be authored against a base that no longer matches production.
2. F5 (account-deletion) — if it turns out these RPCs ARE live via an undiscovered path, the "not applied" read is wrong and the deletion-promise-vs-actual-behavior gap in the Privacy Policy becomes a real contract violation, not a latent bug.
3. F1 — genuinely a judgment call (public transparency vs. admin-internal), not a technical question.

## IMPLEMENTATION_ORDER
See `06_IMPLEMENTATION_PLAN.md` in full: (0) live re-verify ground truth → (1) owner decisions F1/F3 → (2) hygiene F2/F4 → (3) tests → (4) F5 only if it resolves to a real gap, and even then treat as separate-phase scope.

## THINGS_NOT_TO_REDO
- Do not re-derive the DB grant/RLS inventory from scratch — `03_SURFACE_INVENTORY.md` is current as of canonical base, cross-checked by two independent agents plus direct manual verification.
- Do not re-litigate the founding "flags readable by anon" decision (Jordan gate, 2026-05-29) — it's ratified and still the load-bearing precedent; extend it deliberately for new columns/tables rather than re-approving it.
- Do not re-open the FDA-028 rate limiter's tuning values (MF05) — that's a separate, already-decided track.
- Do not re-open `is_admin`/Stage-B — already has an owner-approved deferral with its own authorization requirements.
- Do not assume `supabase/contract/*.json` reflects current state — it's dated 2026-09-05, pre-Stage-A-apply; useful for historical FDA-numbered finding IDs (F1's citation-worthy pattern) but not as a live-state source.
