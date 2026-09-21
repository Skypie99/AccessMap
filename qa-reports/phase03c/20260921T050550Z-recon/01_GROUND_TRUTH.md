# 01 — Ground Truth (Phase 03C recon)

## Identity

```
CANONICAL_BASE: origin/main = 6e91ec65bd5f5bdca086fe21949c8477bdc18bac
BRANCH:         recon/flagstone-p03c-20260920
WORKTREE:       /Users/skypie/AccessMap-worktrees/flagstone-p03c-recon-20260920
HEAD:           6e91ec65bd5f5bdca086fe21949c8477bdc18bac  (== CANONICAL_BASE, clean checkout)
TREE:           clean (worktree just created from origin/main; no local edits made by this recon)
```

The primary checkout (`/Users/skypie/AccessMap`) was left untouched — only read-only `git fetch`/`rev-parse`/`worktree list` ran there. All file reads and the new branch live in the worktree above.

## ⚠ Concurrent session

`ListAgents` shows a **separate peer session** in this same environment titled *"Phase 03C anonymous public-read privacy contract"* (short id `b4f9cc`, status `waiting`, started ~11 min before this one). It had **not** created a `phase03c`/`03c`-named branch or worktree at the time this session checked (`git worktree list` / `git branch -a | grep -i 03c` both came back empty before this session created its own). No coordination was attempted with it. Sky should be aware two sessions may be independently reconning the same phase — reconcile before either one proceeds to implementation.

## Migration-ledger ground truth (the single most important resolved fact)

**`supabase/migrations/` alone is stale for reasoning about current production state.** The repo runs two parallel migration trees:

- `supabase/migrations/` — 71 files, `20260523020620` → `20260830130000`. This is the "promoted/canonical" set.
- `supabase/migrations-next/` — a staging tree: 5 top-level files (`20260904000000`–`20260904000400`), `phase03a/` (9 Stage-A files + 1 excluded Stage-B file + fixtures), `phase03b/` (2 files).

**Resolved: as of this task's canonical base, the Stage-A files (all 14: the 5 top-level + 9 of the 10 `phase03a/` files) and both `phase03b/` files ARE live in production. The 10th `phase03a` file (`20260911130000_phase03a_fda026_stage_b_cutover.sql`, "Stage B") is confirmed NOT applied.**

Evidence, evidence-priority order:

1. **Owner decision** — `qa-reports/phase03a/2026-09-15-final-owner-decisions/MF05_AND_PRODUCTION_POLICY_PROPOSAL.md:6-12`: Stage A accepted for rollout; "Stage B remains excluded... requires a later native and pinned-web cutover with separate evidence and owner authorization." Confirms Stage A/Stage B are a real, owner-acknowledged split, and only Stage A is in scope for "applied."
2. **Read-only production inspection, 2026-09-15** — `qa-reports/phase03a/2026-09-15-final-owner-decisions/R02_PRODUCTION_INSPECTION_COMPLETE.md`: `PRODUCTION_LEDGER_COUNT: 71`, `PENDING_STAGE_A_MIGRATIONS: 14`, `STAGE_B_INCLUDED: NO`. At this point Stage A was **still pending** (matches plain `supabase/migrations/` replay = 71 rows).
3. **Independent Phase 03B closure verification, 2026-09-20/21** — `qa-reports/phase03b/2026-09-20-phase03b-closure/CLOSURE_REPORT.md`: post-restoration ledger `ledger_count: 87`, latest two versions `["20260915210256","20260915210413"]` (the two `phase03b/` files), and "Permissions/RLS PASS (structural)" — the whole-catalog structural hash (which explicitly includes `pg_policies`/ACLs/grants, per `scripts/structural-catalog.mjs`) matched the accepted final-state hash exactly.
4. **Arithmetic reconciliation**: 71 (R02 baseline) + 14 (Stage A) + 2 (phase03b) = **87**, exactly matching the Phase 03B closure's independently-observed ledger count. This is not a coincidence — it's the same production ledger, sampled twice, six days apart, with the intervening delta accounted for exactly by the files this task would otherwise dismiss as "unapplied."
5. **Contradicting evidence, correctly discounted**: `supabase/migrations-next/*/README.md` and several per-file header comments (e.g. `supabase/migrations-next/20260904000200_adopt_d1sa_containment.sql:1-4`: "FORWARD-ONLY CANDIDATE — not applied anywhere") say "not applied." These are **static, point-in-time labels that went stale** once Sky authorized and the team executed the Phase03A/03B production-apply packets (a multi-week process visible in `qa-reports/phase03a/` and `qa-reports/phase03b/`, dozens of dry-runs and one authorized live apply). The `supabase/contract/catalog-comparison*.v2.json` captures independently confirm the *timing* of this: they're dated **2026-09-05T04:28Z**, i.e. captured before Stage A applied — at that moment the plain-`migrations/`-only replay matched production **exactly** (`catalog-comparison.v2.json` → `exactAfterAcceptedResiduals: true`), while the migrations-next-inclusive replay did **not** (`catalog-comparison-applied.v2.json` → false, with specific policy/trigger/function/grant deltas showing production hadn't yet received the Stage-A changes). Both captures are correct for their own date; neither is current now.

**One agent spawned by this session (`DB privacy/RLS surface` research) built its entire grant/RLS inventory from `supabase/migrations/` alone, explicitly excluding `migrations-next/` on the strength of the stale README disclaimer.** That agent's report is accurate for the 71-file-only state but **misses every Stage-A and Phase-03B change** — including the `is_admin` Stage-A compat-grant, the `flags rejected hidden from anon` restrictive policy, the moderation-events admin-only lockdown, and the `flags`/`flag_photos`/`flag_comments`/`feedback` anon table grants from `20260905073925_phase03a_effective_privileges.sql`. This recon's `03_SURFACE_INVENTORY.md` and `04_EXPOSURE_AUDIT.md` fold that agent's (still generally accurate for the 71-file layer) findings together with the migrations-next material this session verified directly.

**Residual uncertainty (flagged, not guessed):** this conclusion rests on report arithmetic across two independently-authored, Sky-authorized, read-only production inspections — it is not a live query run by this session (this session made zero production/staging contact, per its own constraints). **The single highest-value next step before any implementation is a fresh read-only `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 3` (or equivalent) to confirm the ledger tip is still `20260915210413` and count is still 87** — six days have passed since the last capture and this is a very actively-worked repo (see the "concurrent session" note above and the dozens of other idle Phase-03B peer sessions).

## Guest/anon auth mechanism (confirmed)

- No call to `supabase.auth.signInAnonymously()` anywhere in `src/` or `supabase/functions/` (repo-wide grep, confirmed independently by this session and the client-surface agent).
- `App.tsx` `Gate()` (`App.tsx:107-164`): `guestMode` is in-memory React state only (never persisted). `if (Platform.OS === 'web' || guestMode) return <RootNavigator .../>` — **web renders the full app unconditionally**, regardless of session; native requires an explicit "browse as guest" tap on `SignInScreen`.
- Net effect: a guest holds **no Supabase session** — requests hit PostgREST as the genuine Postgres `anon` role (no JWT), not `authenticated`-via-anonymous-sign-in. This is the narrower, safer of the two designs Jordan's founding gate considered (`qa-reports/2026-05-29_Jordan_GuestSigninPrivacyGate.md`, "Option A" vs "Option B" — Option A/true-anon was chosen).

## Founding decision vs. current schema — a scope trap

`qa-reports/2026-05-29_Jordan_GuestSigninPrivacyGate.md` and its resulting migration `supabase/migrations/20260529175842_anon_flags_select.sql` are the **only explicit privacy-officer sign-off** on anon read access in the whole history. They approved anon SELECT on `public.flags` when the table had ~9 columns and no sibling tables (`flag_photos`, `flag_comments`, `comment_votes`, `feedback`, `flag_verifications`, `flag_edit_history`, `flag_status_history`, `flag_moderation_events` did not exist yet). **That approval's "no PII" reasoning does not automatically extend to columns/tables added afterward** (`photo_object_key`, `photo_alt`, `context_tags`, `reopen_requests`, `dispute_requests`, `last_moderation_reason_code`, etc.) — each later addition either inherited exposure silently (full-table `GRANT SELECT ... TO anon` catches every future column) or was independently reasoned about in its own migration comment (e.g. `20260830130000_promptb_media_key_read_contract.sql:14-24` explicitly re-derives anon visibility for the new photo-key columns). See `04_EXPOSURE_AUDIT.md` for the column-by-column result.
