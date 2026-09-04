# Codex D1F4R Source Repair Report — 2026-08-28

## DECISIONS FOR SKY

- [ ] **Authorize the next independent Work source-acceptance pass** — This repair is ready for a fresh independent source review, not deployment.
  - **Recommended:** Review `codex/d1f4-source-repair` against `960fbcc8d194910760e55106445c2a5595fd5cf5`, then preserve the remaining hosted-runtime tests as staging evidence gates.
  - **Alternative:** Hold the branch without review.
  - **Impact:** No migration, Edge function, Storage, Auth, Cron, Vault, EAS, deployment, merge, or push was performed. Local source evidence is complete; hosted PostgreSQL and Edge-runtime evidence is intentionally still required.

## BLOCKERS / FAIL_FAST

- **STAGING REQUIRED, not a source blocker** — The local host has no `psql`, Docker, or Deno executable. Therefore actual PostgreSQL MVCC concurrency and Edge import-graph execution were not run. The source ordering and source-level regression guards pass, but hosted/staging validation must exercise those semantics before release.

## Summary

Repaired the rejected D1F4 candidate in a new isolated worktree from the supplied rejected candidate SHA. The repair closes the anonymous provenance forgery path, adds the Transaction-A fence mutation, makes finalization ambiguity durable, binds destructive work to renewable leases, paginates complete Storage-owner inventory, and restores truthful native-only receipt recovery. The repair remains source-only and preserves the two frozen predecessor migrations byte-for-byte.

## Branch + Base + Head

- Branch: `codex/d1f4-source-repair`
- Worktree: `/Users/skypie/AccessMap-codex/d1f4-source-repair`
- Base and repair start: `960fbcc8d194910760e55106445c2a5595fd5cf5`
- Source repair commit: `6423692bdbbbc02c62fce6bc102495bf3933656c`
- Correct underlying D1 baseline: `cf2b7f8c0c8b5b941d49fd4eae97d955a350478e`
- Older noncanonical branch consulted read-only: `8376c0dd085903153fe6977add73d8044e18959b`

## What Changed

- `supabase/migrations/2026-08-27_d1f4_async_account_deletion.sql`
  - Added database-side provenance triggers, transaction-local trusted-finalization marker, strict anonymous photo/provenance null policy, `owner_id::uuid` comparisons, durable `AMBIGUOUS` outcomes, exact review cancellation checks, operation-lifetime reviewed-key retention, `resume_from`, lease renewal/resume, and lease-bound purge.
  - Transaction A now inserts `REQUESTED` and performs the non-key `deletion_fence_version` update without acquiring Transaction B's full `FOR UPDATE` drain lock. Transaction B remains responsible for draining pre-admitted writers and committing `LOCKED`.
- `supabase/functions/account-deletion-worker/index.ts`
  - Replaced capped/evidence-incomplete cleanup logic with explicit paginated queries, complete subject-owner inventory, exact object-owner rechecks immediately before removal, lease renewal before every destructive Storage/Auth call, phase-preserving retry, and final inventory verification before `COMPLETE`.
- `supabase/config.toml`, `supabase/functions/_shared/cors.ts`, and browser-facing function handlers
  - Added root authoritative function configuration, deleted obsolete nested D1F4 configs, and added explicit `OPTIONS`/CORS responses while each handler preserves its own authentication or capability/secret checks.
- Client receipt and UI files
  - Web now explicitly declines account-deletion receipt recovery instead of emulating secure storage. Native receipts are operation-keyed, collision-safe, and individually dismissible. Signed-in Profile presents a truthful status-recovery action after an ambiguous request response; sign-in supports terminal receipt dismissal.
- Tests
  - Expanded D1F4 source guards and receipt/avatar coverage. Added the WCAG 2.5.3 label-in-name correction for the new unavailable-receipt control.

## P0 / P1 Outcomes

- **Anonymous provenance forgery:** Database triggers reject direct provenance writes except within the trusted finalization transaction; anonymous report insertion requires `user_id`, legacy photo URL, canonical object key, and uploader id all to be null. The worker treats exact Storage owner metadata, not application uploader fields, as the deletion authority.
- **Stale snapshot fence:** Transaction A increments the server-managed user fence in the same transaction as `REQUESTED`; Transaction B retains the exclusive writer drain and durable `LOCKED` transition.
- **Storage owner type:** All D1F4 SQL owner comparisons use `owner_id::uuid`; worker inventory uses exact owner equality and authoritative Storage metadata.
- **Ambiguous finalization:** Missing or mismatched exact Storage ownership persists `AMBIGUOUS` and returns a safe result rather than raising inside the same transaction.
- **Cancellation / terminality:** Review records the exact key before any terminal intent resolution. `CANCELLED` requires an authoritative same-resolution exact-object absence check; historic review requires exact-key inventory cardinality and ownership validation.
- **Inventory / pagination:** All evidence queries use explicit page ranges. Unknown subject-owned Storage objects and foreign-owned canonical keys route to review; final inventory is repeated after Auth reconciliation and before `COMPLETE`.
- **Retry / lease:** `resume_from` rehydrates only the safe phase, and cleanup cannot jump straight from `RETRY_REQUIRED`. Lease-token validation occurs in destructive transitions and purging; worker renews before paginated scans and irreversible Storage/Auth calls.
- **Auth-last:** The source retains `READY_FOR_AUTH_DELETE → Auth deletion → reconciliation → AUTH_DELETED → final inventory → COMPLETE`; subject redaction remains only in `COMPLETE`.

## Older-Branch Safety Reconciliation

| Older safety property | Result | Repair treatment |
| --- | --- | --- |
| Provenance trigger and trusted marker | PORTED | Ported as targeted database triggers plus transaction-local marker; no wholesale merge/cherry-pick. |
| Transaction-A fence update | PORTED | REQUESTED now includes non-key fence mutation; Transaction B remains the writer drain. |
| Exact absence before cancellation | PORTED | Review first retains key, then queries exact Storage absence before `CANCELLED`. |
| Complete owner review inventory | REPLACED WITH STRONGER DESIGN | Worker performs paginated authoritative owner inventory; review also compares exact supplied inventory cardinality and owner evidence. |
| Guard tests | REPLACED WITH CURRENT TARGETED GUARDS | The candidate's current guard suite preserves prior assertions and adds repaired-architecture checks. |

## Frozen Migration Result

- `2026-08-27_d1sa_deployed_security_containment.sql`: `d131d76929bae33051b7a3fcacb8852d58b38fda951f1c57b95aac227e85c68d` — MATCH
- `2026-08-27_d1_option_a_account_deletion.sql`: `a01142702609c2c32cce252f979e2ffc3ee6aa90b91030332fe1ceb287c83e01` — MATCH

## Gates

| Gate | Result |
| --- | --- |
| Focused D1F4 + dependent tests | PASS — 8 suites, 126 tests |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — 0 errors; 90 pre-existing repository warnings remain |
| `npx --no-install jest --ci --no-watchman -w 3` | PASS — 257 suites, 3,782 passing tests, 32 existing todos |
| `git diff --check` | PASS |
| Implementation-range inspection (`960fbcc…` to repair worktree) | PASS — scoped to D1F4 migration, Edge handlers/config, receipts/UI, and tests |
| Frozen migration SHA-256 recheck | PASS — both expected hashes match |
| Repair-delta secret/privacy scan | PASS — no credential values added; only expected configuration identifier references found |
| PostgreSQL MVCC concurrency test | SKIPPED — local PostgreSQL/Docker unavailable; staging required |
| Deno / Edge import graph | SKIPPED — Deno unavailable; staging required |

## Known Limitations and Staging Holds

- **LOCAL POSTGRES CONCURRENCY — STAGING REQUIRED:** Validate all four writer orderings under real PostgreSQL isolation levels: pre-request admitted writer completion, fresh-writer denial after Transaction A, stale pre-request `REPEATABLE READ` gate failure, and Transaction-B writer drain before `LOCKED`.
- **HOSTED STORAGE OWNER INVENTORY — STAGING REQUIRED:** Confirm `storage.objects` owner representation/query permissions, >100-row pagination, exact deletion rechecks, foreign-key review routing, and final owner-inventory absence in the configured hosted project.
- **DENO / EDGE IMPORT GRAPH — STAGING OR DEPLOYMENT HOLD:** Deno was unavailable locally. Validate root function configuration, browser preflight, shared CORS imports, authentication/capability boundaries, worker-secret/review-secret boundaries, and the deployment gateway behavior in staging only.
- **NO RUNTIME CLAIM:** No Supabase project, Auth user, Storage object, database migration, scheduler, Cron, Vault, deployment, EAS build, production record, merge, or push was touched.

## Process Self-Check

### Efficiency Check

The repair began from the supplied candidate SHA and used the older D1F4 branch only as read-only property evidence. No primary checkout or prior branch was modified.

### Overlap Check

No concurrent writer was used in this worktree. The primary checkout was treated as off-limits and was not inspected for uncommitted content.

### Simplification Opportunities

A single global receipt slot or browser localStorage would have reduced code, but would violate the required collision resistance and receipt confidentiality. A single capped Storage query would have reduced worker code, but would not establish complete ownership evidence.

## How to Review

```bash
git -C /Users/skypie/AccessMap-codex/d1f4-source-repair diff 960fbcc8d194910760e55106445c2a5595fd5cf5...codex/d1f4-source-repair
```

```bash
git -C /Users/skypie/AccessMap-codex/d1f4-source-repair show --check --stat HEAD
```

```bash
git -C /Users/skypie/AccessMap-codex/d1f4-source-repair status --short --branch
```

## Next Recommended Action

Run the authorized independent Work source-acceptance pass against this repair branch; if it accepts the source, prepare staging-only PostgreSQL, Storage, Edge, and browser-preflight evidence before any release decision.
