# D1F4R2 source repair — local-only QA handoff

## Outcome

**D1F4R2 source repair is complete.** This is local source, automated
regression, and database-contract evidence only. It does not claim that any
migration has been applied, Edge Function has been deployed, or TestFlight
binary has been accepted.

The sensitive repair used Sky's explicit authorization for this exact
worktree. No Supabase project, Storage bucket, Auth tenant, migration history,
remote branch, deployment, build service, or App Store resource changed.

## Repository identity

- Worktree: /Users/skypie/AccessMap-codex/d1f4-source-repair-r2
- Branch: codex/d1f4-source-repair-r2
- Source implementation commit: 3e03afcbbdd4bccbe5e6a9e12b0957c82f613abb
- Starting audited repair: 90a218b91db1ea5503704e9aa8c5792380a24ea4
- Frozen predecessor hashes:
  - D1S-A containment: d131d76929bae33051b7a3fcacb8852d58b38fda951f1c57b95aac227e85c68d
  - Option A deletion: a01142702609c2c32cce252f979e2ffc3ee6aa90b91030332fe1ceb287c83e01

## Source repairs

### P1-1 — canonical ordinary report deletion

- The report-delete path collects primary photo_object_key, gallery
  object_key, and safe legacy paths before relational deletion.
- Canonical keys are never reconstructed from public URLs.
- A canonical uploader mismatch fails closed before Storage cleanup or row
  deletion.
- Exact cleanup runs before relational deletion; a non-missing Storage error
  is returned instead of becoming a successful takedown.
- Missing exact objects are idempotent.

Behavioral tests cover primary plus multi-gallery canonical deletion, mixed
legacy/canonical content, exact key set, unrelated-key exclusion, foreign
uploader refusal, and cleanup ordering.

### P1-2, P1-3, P1-5, P1-6, and P1-9 — deletion lifecycle and Storage evidence

- The new forward-only migration is
  supabase/migrations/20260828000000_d1f4r2_source_repair.sql.
- Durable server-owned review items preserve legacy avatar/primary/gallery
  evidence, backup photos, unresolved upload intents, exact Storage records,
  and thresholded Auth ambiguity.
- Review operates one server-created item at a time; the caller cannot submit
  a bulk key or intent inventory.
- review_resume_from preserves AUTH_RECONCILIATION through review. No review
  action can jump to COMPLETE.
- Fixed-bucket, service-role-only RPCs replace all D1F4 worker
  admin.schema('storage') use.
- Owner checks use exact text equality. Null, malformed, or foreign values
  fail closed.
- Owner inventory is keyset-paged at 100 with duplicate/non-advancing-page
  rejection. Adversarial tests cover 99, 100, 101, 199, 200, 201, and 501
  records.
- Exact reads are followed by a final lease renewal immediately before every
  real Storage remove batch. A lost lease prevents the batch.
- Historical evidence is captured before purge. Final Auth reconciliation
  repeats the durable Storage plan and every known-key check before COMPLETE.

### P1-4 — narrow privileged metadata boundary

- Metadata RPCs have a fixed flag-photos bucket, validated key/cursor, bounded
  page size, read-only behavior, and service_role-only grants.
- The older unbounded review RPC is revoked from service_role.
- The review Edge Function now accepts only operation id, evidence digest,
  server-created review-item id, and one action.

### P1-7 — truthful web entry

- Web is blocked before confirmation and before deleteAccount is reachable.
- The user is told no deletion request was made and to use Flagstone on iOS.
- Native confirmation behavior is unchanged.

### P1-8 and P1-10

- A forward-only anonymous photo-free constraint and matching policy require
  photo_url, photo_object_key, photo_uploader_id, and photo_alt to be null.
- The four D1F4 Edge Functions import one shared exact Supabase dependency
  pin: npm:@supabase/supabase-js@2.106.2.
- The matching root package and lockfile dependency are exact 2.106.2.

## P0 preservation

The accepted request fence, writer-drain barrier, trusted canonical-provenance
commit, foreign-owner refusal, and Auth-last requirements remain. The two
frozen migrations were not modified; the required SHA-256 values were
verified.

## Automated gates

| Gate | Result |
|---|---|
| Focused D1F4R2 and compatibility Jest suites | PASS — 7 suites, 148 tests |
| Full Jest suite | PASS — 260 suites, 3,801 passing; 32 existing TODO tests |
| npm run typecheck | PASS |
| npm run lint | PASS — 0 errors; 90 pre-existing warnings |
| git diff --check | PASS |
| staged git diff --cached --check | PASS |
| Frozen migration SHA-256 checks | PASS |
| Root function configuration and Edge import guard | PASS |
| Changed-source credential/privacy scan | PASS — only environment variable names and pre-existing synthetic test values; no secret value was read or recorded |

The full Jest run emitted its existing force-exited-worker warning after all
tests passed. That is a test-teardown warning, not a failed assertion.

## Verification unavailable here

- Supabase db lint --local exited with status 137 and no diagnostics.
- Deno and psql are not installed, so no Deno typecheck or local SQL parser
  run was possible.
- No local or hosted migration application was attempted.
- No deployed Edge Function, Storage metadata, Auth provider, or physical
  device behavior was probed.

## What remains

1. Sky-controlled review of the forward migration and its apply/rollback plan.
2. Authorized staging application, catalog/grant inspection, and adversarial
   Storage/Auth denial-control probes.
3. A fresh final binary followed by the designated WORK-U1+ TestFlight,
   VoiceOver, Dynamic Type, theme, motion, and deletion acceptance sequence.
4. Any merge, push, deployment, migration application, TestFlight upload, or
   App Store submission.

## DECISIONS FOR SKY

### 1. Staging application

- **Decision:** whether to apply the R2 forward migration in an authorized
  staging environment.
- **Recommendation:** review and apply only forward, then run catalog/grant
  and adversarial denial/control probes.
- **Why:** source contracts are green, but SECURITY DEFINER, Storage owner
  metadata, and grant behavior need hosted evidence.
- **Alternative:** hold the migration and ship none of the new
  source-dependent deletion behavior.
- **Impact:** until applied, the new worker RPCs are unavailable and this
  source repair is not deployable.

### 2. Deno and SQL verification

- **Decision:** whether to provision and run Deno/SQL checks locally or in the
  authorized staging lane.
- **Recommendation:** run Deno checks for all four D1F4 Edge Functions and
  parse/apply the migration only in the approved staging lane.
- **Why:** this machine lacks Deno and psql; local Supabase lint exited without
  diagnostics.
- **Alternative:** rely on the passing TypeScript/web tests and source guards.
- **Impact:** Edge/SQL parser evidence remains explicitly unavailable here.

### 3. Final physical acceptance

- **Decision:** when to rebuild and enter the single WORK-U1+ TestFlight
  acceptance window.
- **Recommendation:** do so after staging evidence and on a fresh binary;
  repeat every affected deletion and accessibility acceptance check.
- **Why:** local Jest cannot prove deployed semantics or physical-device
  behavior.
- **Alternative:** accept this branch as source-ready only.
- **Impact:** this work is ready for source review, not App Store submission.
