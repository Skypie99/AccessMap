# D1F4R2 source-repair preflight — blocked pending fresh privacy/auth approval

**Date:** 2026-08-28
**Worktree:** `/Users/skypie/AccessMap-codex/d1f4-source-repair-r2`
**Branch:** `codex/d1f4-source-repair-r2`
**Base / starting HEAD:** `6ed37396cb4f7b6e0285c821441a20ae48b89ccb`
**Required D1 baseline ancestor:** `cf2b7f8c0c8b5b941d49fd4eae97d955a350478e`
**Required previous-repair ancestor:** `64236920efaf239a44dbbde73b06491107c0902b`

## Outcome

**D1F4R2 REPAIR BLOCKED — SOURCE FINDINGS REMAIN**

No privacy-, authentication-, account-deletion-, or Storage-deletion source
was changed. The estate safety gate rejected the first proposed source edit:
this repair would directly alter Auth deletion/reconciliation, authoritative
Storage ownership metadata, and deletion of user-uploaded content. The
project's `AGENTS.md` hard rule requires a fresh, explicit Sky decision after
that risk is surfaced before an agent makes such a change. This report is the
safe reversible handoff; it is not a completion claim.

## What changed

- Created the requested isolated local worktree and branch from the supplied
  rejected-repair commit.
- Created this QA handoff only.
- Did **not** alter source, migrations, dependency pins, tests, configuration,
  Supabase state, Auth, Storage, a scheduler, Vault, EAS, deployment, or any
  remote system.

## Preflight verification

| Check | Result |
| --- | --- |
| Existing audited worktree HEAD | `6ed37396cb4f7b6e0285c821441a20ae48b89ccb` — MATCH |
| Existing audited worktree state | Clean — MATCH |
| Correct D1 baseline ancestry | Present — MATCH |
| Previous repair ancestry | Present — MATCH |
| New worktree branch/base | `codex/d1f4-source-repair-r2` at `6ed3739…` — MATCH |
| Primary checkout | Dirty as expected; not modified or used as a worktree |
| Frozen containment migration SHA-256 | `d131d76929bae33051b7a3fcacb8852d58b38fda951f1c57b95aac227e85c68d` — MATCH |
| Frozen Option-A migration SHA-256 | `a01142702609c2c32cce252f979e2ffc3ee6aa90b91030332fe1ceb287c83e01` — MATCH |

## Confirmed source blockers (read-only audit)

| W-D1F4R finding | Current evidence | Closure state |
| --- | --- | --- |
| P1-1 canonical report deletion | `src/lib/flags.ts` collects only `photo_url`/legacy junction URLs; it deletes the relational flag before a best-effort Storage removal. Canonical `photo_object_key`/`flag_photos.object_key` are not collected. | NOT CLOSED |
| P1-2 Auth ambiguity liveness | The retry threshold moves `AUTH_RECONCILIATION` work to `FAILED_REVIEW_REQUIRED` while clearing `resume_from`; review requeues into `CLEANING`. This can require a vanished `public.users` row/lock after an Auth side effect. | NOT CLOSED |
| P1-3 historical evidence | The current review guard does not capture legacy avatar evidence and does not durably preserve retained `bk_2026_08_22_flag_photos` associations before the purge removes them. | NOT CLOSED |
| P1-4 Storage metadata boundary | `account-deletion-worker` calls `admin.schema('storage').from('objects')` for exact lookups and owner inventory. | NOT CLOSED |
| P1-5 pagination/review scale | Storage and evidence pages use offset `.range()` without deterministic ordering; the review endpoint rejects more than 500 keys or 250 ambiguous intents. | NOT CLOSED |
| P1-6 stale-worker Storage lease | A lease renewal precedes exact reads, but no final lease proof is performed immediately before each external `Storage.remove` batch. | NOT CLOSED |
| P1-7 web recovery copy | A web user can open the destructive confirmation that says the device will show completion; secure receipt storage rejects only after confirmation. | NOT CLOSED |
| P1-8 anonymous `photo_alt` | The anonymous-insert policy checks URL/object/uploader fields but not `photo_alt`. | NOT CLOSED |
| P1-9 Storage owner typing | SQL owner comparisons cast persisted `owner_id::uuid`; the worker compares case-insensitively rather than exact trusted UUID text. | NOT CLOSED |
| P1-10 Edge dependencies | The four D1F4 Edge handlers import floating `https://esm.sh/@supabase/supabase-js@2`; the root package declaration is also range-pinned. | NOT CLOSED |

## Gates and checks

No test/build gate was run after the source-edit rejection; reporting a prior
branch's green tests as proof for this blocked repair would be misleading.

Read-only checks performed:

- Git worktree, branch, head, clean-state, and ancestry verification.
- Frozen-file SHA-256 verification.
- Scoped source audit of the deletion worker, review endpoint, deletion UI,
  ordinary report-delete path, D1F4 migration, existing guards, and source
  dependency declarations.
- Supabase source guidance review. Its current guidance reinforces fixed
  `search_path`, explicit function privilege revocation, no use of mutable
  user metadata for authorization, and exact least-privilege boundaries for
  any security-definer function.

## Staging-only holds (after source repair)

- PostgreSQL MVCC and stale-snapshot behavior.
- Hosted Storage metadata representation, RPC privileges, and materialization.
- Edge/Deno import graph and deployed function gateway/CORS behavior.
- Auth-provider lost response and real two-worker timing faults.
- Scheduler invocation and any review-secret operational path.

## DECISIONS FOR SKY

1. **Decision:** give a fresh, direct approval for the agent to modify the
   authentication-, account-deletion-, Storage-metadata-, and privacy-sensitive
   source paths listed in the D1F4R2 repair brief.
   **Recommendation:** approve the constrained local-only repair on this
   already-created branch, while retaining the explicit prohibition on remote
   SQL, deployment, Storage/Auth mutation, scheduler/Vault work, EAS, merge,
   and push. **Why:** all ten P1 findings are confirmed source defects and the
   requested repair is intentionally designed to fail closed. **Alternative:**
   leave the candidate rejected and send the same bounded repair to a
   human-owned change lane. **Impact:** without this decision, the required
   repair and behavioral proof cannot safely start.

2. **Decision:** choose whether review resolution should be represented as
   durable, server-owned review items with one bounded item action per request.
   **Recommendation:** approve that design. **Why:** it removes the 500-key and
   250-intent dead ends without accepting an unbounded client truth set.
   **Alternative:** retain bulk request arrays and raise the limits. **Impact:**
   raising limits preserves a permanent large-account deletion failure mode.

## Exact next recommendation

After fresh approval, resume only in this worktree. Make one forward-only
D1F4R2 migration, route the worker through narrow service-role-only metadata
RPCs, repair the report-delete and web paths, add behavioral/state-machine/
database-contract tests, then run the required focused adversarial suite and
full local gates. Do not merge, push, deploy, apply SQL, or create hosted
infrastructure.
