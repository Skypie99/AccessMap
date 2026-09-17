# Phase 03B revised production-apply packet — status-write quiescence proposal

## Verdict

`PHASE03B_REVISED_PRODUCTION_APPLY_PACKET_PREPARATION: PASS`

`PHASE03B_REVISED_PRODUCTION_APPLY_PACKET_INDEPENDENT_REVIEW: READY`

This is a proposal and evidence package only. It authorizes no production or
staging mutation, no migration apply, no quiescence entry, no mutating smoke
test, no push/merge/release, and no Phase 03C work.

The minimum safe control is a temporary database-authoritative
`BEFORE UPDATE OF status` trigger on `public.flags`. It is installed in a short
transaction after a `SHARE ROW EXCLUSIVE` lock drains earlier writers, marked
`ENABLE ALWAYS`, independently fingerprinted, retained through both migration
commits and all post-apply verification, and removed only by a fail-closed exit
transaction. PostgreSQL documents that `CREATE TRIGGER` takes this lock class
and that the lock conflicts with row writers; the explicit lock makes the
drain boundary auditable. See the official
[explicit-locking](https://www.postgresql.org/docs/17/explicit-locking.html),
[LOCK](https://www.postgresql.org/docs/17/sql-lock.html), and
[CREATE TRIGGER](https://www.postgresql.org/docs/17/sql-createtrigger.html)
documentation.

## Authority and immutable identity

- Prompt: `FLAGSTONE-P03B-PRODUCTION-APPLY-QUIESCENCE-PACKET-20260916-R1`
- Source independent review: `2583c8fb5bde42127c5711f6a5d453fb0a317074`
- Source dry-run evidence: `7bf05a22bf621fd2b6c2971d1ceb64f28bccc529`
- Accepted HTTP resolution: `96cbfff1da3f527ae038aaf0d2918f84694d40cc`
- Accepted revised staging receipt: `d88bb853b059e54d19cd9549ead4122c63b3ff15`
- Frozen candidate: `9d638456fa8e679678c54f131fe8f0db723eda72`
- Frozen candidate tree: `cfc76206f7cf7af6a7127a6329620d2ee1dc4da8`
- Production: `kldlwszpfkdmsjrjhjym`
- Forbidden staging target: `cepayqmsoqxshsiyqnvz`
- Moderation migration SHA-256:
  `b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11`
- Points migration SHA-256:
  `0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5`

Neither frozen migration was edited. The packet adds only QA/evidence files.

## Exact race demonstrated

Before migration 1, shipped Build 33 and the pinned web build issue direct
authenticated `UPDATE public.flags SET status = ...` writes. Production's
existing transition guards admit the legal community transitions, and the
legacy `handle_flag_status_change()` trigger records history and performs the
old points behavior.

Migration 1 is its own transaction. When it commits, it:

- keeps direct authenticated `UPDATE(status)` for shipped-client compatibility;
- exposes `transition_flag_status()` and `moderate_report()`;
- permits community verify/resolve/reopen through direct writes or the RPC;
- requires audited RPC paths for reject/restore; and
- leaves the inherited points trigger body in place.

Migration 2 is a separate transaction. Only when it commits does it replace the
points trigger body with once-per-flag claims, owner-self-triage zero awards,
and points-neutral reject/restore.

Therefore a verify/resolve between commits can receive repeatable legacy points
instead of claim-once points; owner self-triage can receive legacy points; and
an admin reject can apply the inherited penalty instead of being neutral. A
migration-2 failure could leave that intermediate behavior deployed. This is a
real race for legacy direct writes, the new status RPC, and admin moderation.
It is not cured by applying quickly.

After migration 2 the semantic mismatch is gone, but unblocked writes during
verification would invalidate stable status/history and pg_net evidence.
Quiescence must therefore remain active until all post-apply gates pass.

## Production status-write surface inventory

| Path | Actor / role | Database object | Deployed / normally active | Quiesce | Blocked behavior |
|---|---|---|---|---|---|
| Build 33 single/bulk Verify/Resolve and reopen | signed-in user / `authenticated` | PostgREST direct `public.flags.status` update | deployed and active | yes | trigger raises; transaction fails atomically; generic error; no automatic write retry |
| Pinned web Verify/Resolve and reopen | signed-in user / `authenticated` | same direct update | deployed and active | yes | same; UI patches/removes only after success, so no optimistic inconsistency |
| New client status transition | user/admin / `authenticated` | `public.transition_flag_status()` then `UPDATE public.flags.status` | DB object appears after migration 1; candidate client is not released | yes | trigger aborts the RPC transaction; generic error; no automatic retry |
| Legacy admin Reject/Restore | admin / `authenticated` direct update | `public.flags.status` | admin surface exists; direct reject/restore becomes intentionally incompatible after migration 1 | yes | gate fails first; UI updates only after success and shows an error |
| Revised admin Reject/Restore/Verify/Resolve | admin / `authenticated` | `transition_flag_status()` | candidate client not released; RPC appears after migration 1 | yes | RPC transaction aborts; no audit/status/points row persists |
| Report-driven reject | admin / `authenticated` | `moderate_report()` → `transition_flag_status()` → `public.flags` | RPC appears after migration 1 | yes | nested status update raises and the entire report decision rolls back |
| Existing status/history/points/reset/webhook triggers | table owner execution context | reactive triggers on `public.flags` | deployed and active | no independent writer | blocker is alphabetically first and aborts before AFTER effects; no history, points, or webhook side effect |
| `notify-flag-status` Edge Function | service role for preference reads | reads preference, delegates push; does not update `flags.status` | deployed | not a writer | no status webhook is produced while writes are blocked |
| Scheduled/background jobs | n/a | repository and accepted deployed inventory contain no `flags.status` writer | none found | n/a | none |
| Service/server status writer | service role | none found in repository or accepted deployed inventory | none found | n/a | any future direct table update would still meet the ALWAYS trigger |
| Dashboard/manual SQL | privileged operator | direct `public.flags.status` update | possible operational path, not an app workflow | yes | ALWAYS trigger blocks origin and replica-mode writes unless an operator deliberately drops/disables the gate |

Non-status report closure, comment removal, flag deletion, and reopen/dispute
counter increments are not status transitions and do not execute the legacy
points-status handler. They are outside this narrow gate. Any flag deletion
during the window changes the status fingerprint and forces STOP before exit;
the production executor must then obtain an owner disposition rather than
silently accepting drift.

## Shipped-client behavior

Build 33 and pinned web call the database before changing local list state.
A blocked single action displays the existing generic “Couldn't update this
flag”/error alert and clears its busy state. A blocked bulk action records each
failure, displays the existing failure summary, then refreshes. No inspected
status path automatically retries a failed mutation. The current RPC client has
the same post-success-only state update and generic error path. This is a
temporary retryable operation from the user's perspective, rendered as the
existing generic error rather than a purpose-built maintenance message.

There is no corrupt client state, irreversible user-visible inconsistency, or
retry storm. Reads and non-status app features remain available. The two
migrations can briefly contend for table DDL locks, but this is not a planned
full-service outage.

## Proposed gate artifacts

- `qa-reports/phase03b/2026-09-16-production-apply-quiescence-packet/PROPOSED_QUIESCENCE_ENTER.sql`
  drains prior writers, installs the trigger, verifies it, captures a privacy-safe
  status/history boundary, and commits.
- `qa-reports/phase03b/2026-09-16-production-apply-quiescence-packet/PROPOSED_QUIESCENCE_VERIFY.sql`
  is read-only and captures gate identity, ACLs, status/history counts, and
  fingerprints.
- `qa-reports/phase03b/2026-09-16-production-apply-quiescence-packet/PROPOSED_QUIESCENCE_EXIT.sql`
  reacquires the drain lock, refuses exit on gate/ledger/authorization/
  moderation/points/HTTP mismatch, captures the last quiesced state, then drops
  exactly the temporary trigger and function.
- `qa-reports/phase03b/2026-09-16-production-apply-quiescence-packet/prepare_apply_workspace.mjs`
  constructs the exact 85-ledger-plus-two-candidate workspace locally from a
  read-only production snapshot and refuses identity, hash, order, duplicate,
  or existing-output-path mismatches.
- `qa-reports/phase03b/2026-09-16-production-apply-quiescence-packet/validate_quiescence_local.mjs`
  validates the proposal against a disposable Unix-socket-only PostgreSQL 17
  replay and accepts no hosted address or credential.

The blocker function is `SECURITY INVOKER`, has an empty search path, performs
no DML, and has client/service execution revoked. The trigger fires only when
`status` actually changes and is `ENABLE ALWAYS`; it does not block migration
DDL. Neither frozen migration drops the reserved trigger or calls a status
update as part of its DDL.

## Exact future protocol

Every command below is a future command only. Nothing in this packet authorizes
running it against production.

### 1. Re-establish local and target identity

Require the candidate object/tree, both migration hashes, CLI `2.116.0`, packet
commit, clean executor worktree, target ref, and absence of the staging ref as
the resolved target. Stop on any mismatch. Inspect the current Supabase
changelog before execution; the 2026-09-16 preparation scan found no
`db push`/migration change that invalidates CLI 2.116.0, but execution-time
platform drift must be reviewed again.

```bash
git rev-parse 9d638456fa8e679678c54f131fe8f0db723eda72^{tree}
```

```bash
shasum -a 256 supabase/migrations-next/phase03b/20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql supabase/migrations-next/phase03b/20260915210413_phase03b_points_integrity.sql
```

```bash
supabase --version
```

### 2. Capture immediate pre-quiescence state

Run the accepted read-only snapshot against only
`kldlwszpfkdmsjrjhjym`. Require the known 85-row/85-unique ledger with latest
`20260911120000`, no Phase 03B rows, ledger digest
`811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec`,
structural checksum
`2d533d8f8bfb827fe6b63f4fb6f17035afd55b8d474260a51a20fe2c004bda01`,
Edge Function identity SHA-256
`276dcb14c85ca75955058b10ebb38d9d633fc29a21062fbcc181b502db7c2d70`,
HTTP queue `0`, response count `6`, and fingerprint
`709e04c5b05c3fb7986689366b007591ba9ca0740256358bbfe864314c59a2e8`.
Any unexplained drift is HOLD.

```bash
supabase db query --linked --project-ref kldlwszpfkdmsjrjhjym --file qa-reports/phase03b/2026-09-16-revised-production-dry-run/snapshot.sql --output-format json
```

### 3. Enter and prove quiescence

Execute the exact entry SQL only under a later production-write authorization.
Its explicit lock waits at most five seconds for prior row writers. Failure to
acquire the lock means the gate was not entered and production remains
unchanged; STOP. Exit zero plus the committed receipt establishes the boundary.

```bash
supabase db query --linked --project-ref kldlwszpfkdmsjrjhjym --file qa-reports/phase03b/2026-09-16-production-apply-quiescence-packet/PROPOSED_QUIESCENCE_ENTER.sql --output-format json
```

Immediately run the read-only proof query. Require exactly one trigger,
`trigger_enabled = A`, exactly one function, the exact entry definition hashes,
no PUBLIC/anon/authenticated/service-role function execution, and identical
status/history counts and fingerprints to the entry boundary.

```bash
supabase db query --linked --project-ref kldlwszpfkdmsjrjhjym --file qa-reports/phase03b/2026-09-16-production-apply-quiescence-packet/PROPOSED_QUIESCENCE_VERIFY.sql --output-format json
```

The in-flight proof is the combination of: (a) successful acquisition of a
lock that conflicts with row writers before trigger creation, so earlier
writers drained; (b) a committed ALWAYS trigger, so later status writers fail;
and (c) identical table-status and status-history fingerprints after commit.
Do not issue a mutating probe in production.

### 4. Build and freeze the exact apply workspace

The path must not already exist. The builder uses the immediate read-only
snapshot, maps every remote ledger version to one unique local frozen source,
adds only the two frozen candidate migrations, validates order/hashes, and
writes a manifest.

```bash
node qa-reports/phase03b/2026-09-16-production-apply-quiescence-packet/prepare_apply_workspace.mjs --snapshot=/absolute/evidence/PRE_QUIESCENCE_STATE.json --output=/tmp/flagstone-p03b-production-apply-9d638456
```

Require 87 workspace migrations and only these pending files, in order:

1. `20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql`
2. `20260915210413_phase03b_points_integrity.sql`

### 5. Re-prove the gate and apply once

Run the proof query again immediately before apply. If its hashes or
status/history fingerprints differ, STOP and keep the gate active.

The exact future apply command is:

```bash
supabase db push --workdir /tmp/flagstone-p03b-production-apply-9d638456 --linked --project-ref kldlwszpfkdmsjrjhjym --skip-vault --include-all --yes --output-format json
```

Why this is not merely the dry-run command with one flag deleted:

- CLI source tag `v2.116.0` (commit `997a1e69`) and installed help were
  independently inspected.
- `--project-ref` is honored only with the explicit `--linked` target.
- `--skip-vault` prevents Vault resolution/synchronization; Vault is outside
  Phase 03B.
- `--include-all` preserves the accepted reconciliation behavior, while the
  frozen workspace makes the only absent migrations the exact pair.
- `--yes` removes an interactive confirmation boundary so the captured command
  is deterministic after owner authorization.
- No roles or seed flags are present.
- CLI 2.116.0 applies migration files serially. Each frozen file contains its
  own `BEGIN`/`COMMIT`; they remain separate commits. The quiescence trigger is
  therefore the cross-commit control.

Preserve stdout, stderr, start/end timestamps, exit code, signal, and timeout.
The CLI emits each `Applying migration ...` line; preserve that as the only
between-migration observation. Do not split the accepted plan merely to obtain
an intermediate snapshot. A nonzero or ambiguous exit does not authorize a
rerun.

### 6. Verify while the gate remains active

Do not exit quiescence on command exit alone. Capture a fresh snapshot and gate
proof, then require:

- ledger count `87`, unique count `87`, exactly the two new versions in order,
  latest `20260915210413`, and no unexpected version;
- the exact expected candidate objects: grants, RLS, policies, triggers,
  routines, constraints, indexes, moderation tables, and points tables;
- authenticated direct status compatibility retained, anon denied;
- `transition_flag_status()` and `moderate_report()` exact security/ACL bodies;
- rejected-row visibility policies and admin boundary exact;
- repaired non-owner `photo_alt` atomic denial and no sibling authorization gap;
- points handler references claim-once storage, owner-zero logic, neutral
  reject/restore, caps, and one-way voting; inherited penalty absent;
- Build 33, pinned web, and new RPC structural contracts still supported;
- `notify-flag-status` metadata/identity unchanged and no function deployment;
- HTTP queue `0`, response count `6`, exact accepted fingerprint; no row cleared;
- gate trigger/function still exact; and
- status/history counts and fingerprints still byte-identical to the entry
  boundary.

Run the accepted snapshot and the proof query as separate read-only captures.
Normalize the structural comparison by excluding only the exact temporary gate
trigger/function; do not exclude any other difference.

No production behavior mutation is needed. Revised staging already exercised
the exact final behavior, while production verification can prove the deployed
definitions, ACLs, trigger wiring, and immutable status/history window.

### 7. Exit quiescence only after every gate passes

The external verifier must first compare the final proof receipt with the entry
receipt and record exact equality. Then run the exit SQL. It takes the drain
lock again, repeats core fail-closed ledger/authorization/semantics/HTTP checks,
captures the last still-quiesced fingerprints, and drops only the reserved
trigger/function.

```bash
supabase db query --linked --project-ref kldlwszpfkdmsjrjhjym --file qa-reports/phase03b/2026-09-16-production-apply-quiescence-packet/PROPOSED_QUIESCENCE_EXIT.sql --output-format json
```

Exit success requires a subsequent read-only catalog query proving both
reserved objects absent and all intended status grants/RPC execution grants/
triggers still present. A mutating Verify/Resolve smoke test is not authorized
or required. Ordinary user writes may naturally occur after exit, so the entry
status fingerprint is no longer an invariant after the exit commit.

## Exact exit conditions

All must be PASS: target/candidate identity, two-row ledger delta, normalized
structural identity, authorization boundary, Build 33/pinned web/new RPC
compatibility, moderation semantics, points semantics, function identity, HTTP
baseline, unchanged status/history fingerprints while quiesced, exact gate
identity, no unexpected production mutation, and no rollback condition. Any
unknown is HOLD; the gate remains active.

## Failure and rollback matrix

Rollback source of truth, in reverse order only after an explicit owner
decision:

- points restoration:
  `supabase/migrations-next/phase03b/rollback/20260915210413_phase03b_points_integrity.rollback.sql`,
  SHA-256 `f4da0362fb6f2e7258268e0bfee8dc10b2cf330bd447144e8362e170d1197149`;
- moderation restoration:
  `supabase/migrations-next/phase03b/rollback/20260915210256_phase03b_moderation_semantics_compatibility_bridge.rollback.sql`,
  SHA-256 `7e748e636e408415fe0d0161a800a57683e43a310a3cb6a49b67cdf7ca595a6b`.

Staging validated these as safe compensating restorations. Production rollback
under this gate has not been independently proven, so readiness is
`REQUIRES_OWNER_DECISION`; no failure below auto-runs rollback.

| Case | STOP and gate state | Rollback disposition | Owner decision |
|---|---|---|---|
| A. Entry cannot acquire lock/create objects | STOP; transaction rolls back; gate is not active | none | required before retry |
| B. Entry committed but proof fails | STOP; treat gate state as unknown; do not apply | none until exact state is read | required |
| C. Drift after entry | STOP; keep gate active | no automatic rollback | required disposition of drift |
| D. Migration 1 fails | STOP; keep gate active; inspect ledger/catalog | use exact moderation restoration only if partial committed state is proven | required |
| E. Migration 1 succeeds, migration 2 fails | STOP; keep gate active; no legacy-points writes can occur | prefer diagnosis/authorized migration-2 retry; reverse restorations only if owner selects rollback | required |
| F. Apply exit is ambiguous | STOP; keep gate active; do not rerun | fresh read-only ledger/catalog decides state | required |
| G. Ledger differs | STOP; keep gate active | never repair ledger by inference; correlate stored rows and catalog first | required |
| H. Structural verification fails | STOP; keep gate active | exact reverse restorations are candidates, not automatic | required |
| I. Authorization verification fails | STOP; keep gate active | same | required |
| J. Compatibility verification fails | STOP; keep gate active | same | required |
| K. Points verification fails | STOP; keep gate active | same; points restoration first if selected | required |
| L. HTTP baseline changes | STOP; keep gate active; preserve rows/queue | do not clear pg_net | required investigation |
| M. Exit SQL fails | STOP; transaction rolls back; gate remains active | none | required before another exit attempt |
| N. Post-exit structural restoration check fails | STOP; do not run mutating probes | fail-safe re-entry requires explicit scope in the future apply authorization; otherwise no new mutation | required immediately |

For case E, the gate removes the original transient-risk urgency: production
can remain safely status-frozen while the owner chooses between a diagnosed
second-migration retry and the validated staging restoration sequence.

## Evidence package required from the future executor

Preserve privacy-safe artifacts, append-only, with UTC timestamps and command
receipts:

1. owner authority and zero-broader-authority declaration;
2. Git/candidate/tree/worktree/CLI identity;
3. exact migration and rollback hashes;
4. target metadata naming production and excluding staging;
5. discovery and immediate pre-quiescence snapshots;
6. quiescence-entry raw output, transaction id, boundary timestamp, and SQL hash;
7. post-commit gate proof and entry-equality comparison;
8. no-in-flight proof statement tying lock acquisition to identical fingerprints;
9. pre-apply snapshot/proof;
10. apply-workspace manifest and complete inventory;
11. raw apply stdout/stderr/process receipt;
12. preserved per-migration CLI progress as the between-migration trace;
13. post-command ledger/catalog/gate snapshots while still quiesced;
14. normalized structural, authorization, compatibility, moderation, points,
    function, and HTTP comparison results;
15. final pre-exit equality comparison;
16. exit raw output and last-quiesced receipt;
17. post-exit reserved-object absence and intended-grant restoration proof;
18. final state receipt, privacy scan, artifact manifest, byte counts, and SHA-256.

Do not capture customer row bodies, coordinates, emails, user ids, push tokens,
secrets, connection strings, authorization headers, or database credentials.
The status/history evidence is count plus ordered SHA-256 only.

The previously missing evidence was an authoritative entry boundary, proof that
earlier writers drained, proof that later writers were blocked, and stable
status/history evidence across both migration commits and verification. These
artifacts supply that missing chain.

## Downtime and observability

Affected: Verify, Resolve, Reopen, Reject, and Restore status transitions from
legacy direct clients, the new RPC, admin moderation, service-role/manual SQL,
and any unknown future table writer.

Unaffected by the gate: reads, sign-in, map/list browsing, flag creation,
content edits that do not change status, comments, votes, watches, preferences,
and non-status counters. Migration DDL can briefly wait/block operations on the
altered relations.

`EXPECTED_QUIESCENCE_WINDOW: UNKNOWN`. The accepted remote dry-run took 1.912
seconds but did not execute DDL; the local replay is not production-duration
evidence; post-apply human-independent comparison time has not been measured.
The window is bounded by protocol stages, not by an unsupported time promise.
On failure it intentionally extends until an owner decision because releasing
writes into an unverified intermediate state is less safe.

Read-only proof during the window is: exact ALWAYS gate identity, stable
`public.flags(id,status)` count/fingerprint, stable complete status-history
count/fingerprint, stable HTTP baseline, and final ledger/catalog identity.
The entry lock is the in-flight-writer drain proof. Database/application logs
may supplement this evidence but are not required to establish enforcement.

## Local validation and source review

The socket-only PostgreSQL 17 harness passed:

- gate entered and reported `tgenabled = A`;
- direct status update blocked before migration 1;
- a `session_replication_role = replica` bypass attempt blocked;
- both exact frozen migrations applied while the gate remained active;
- authenticated `transition_flag_status()` blocked between commits;
- direct status update blocked after migration 2;
- status and history stayed unchanged while quiesced;
- fail-closed exit checks passed against the accepted ledger/HTTP model;
- exact gate objects were removed; and
- a normal status update succeeded after exit and wrote one history row.

The disposable cluster disabled TCP, accepted no production input, and was
destroyed. Result:
`qa-reports/phase03b/2026-09-16-production-apply-quiescence-packet/LOCAL_QUIESCENCE_VALIDATION.json`.

The local workspace builder was also run against the accepted read-only
production snapshot and produced exactly 87 files with only the frozen ordered
pair pending; its disposable output was moved to Trash after validation.

Installed CLI `2.116.0`, its tag source, and the official
[Supabase db push reference](https://supabase.com/docs/reference/cli/supabase-db-push)
were inspected. The CLI tracks each successful migration in
`supabase_migrations.schema_migrations`, applies files serially, and honors the
flags used above. The current Supabase changelog was scanned for relevant
breaking changes; none changed this design. Execution-time review remains
mandatory because platform state can drift.

## Gates run for this packet

- candidate object/tree/ancestry: PASS;
- frozen migration hashes: PASS;
- rollback hashes: PASS;
- repository status: isolated packet files only;
- installed CLI/version/help inspection: PASS, `2.116.0`;
- upstream CLI tag/source inspection: PASS, commit `997a1e69`;
- current official Supabase changelog scan: PASS for this design;
- status-writer source inventory: PASS;
- shipped Build 33 and pinned-web post-failure UI inspection: PASS;
- socket-only full-lineage quiescence replay: PASS;
- local exact-workspace builder: PASS, 87 files / exact pending pair;
- product tests/build: not rerun because candidate/product bytes were untouched;
- privacy scan: PASS, zero credential/customer-PII matches; the two email-shaped
  strings are reserved `example.invalid` local fixtures;
- artifact manifest: PASS, 8/8 entries matched byte counts and SHA-256;
- manifest checksum: the first check from the repository root could not resolve
  the checksum file's intentional basename-relative path; rerunning from the
  packet directory returned `ARTIFACT_MANIFEST.json: OK`.

## What changed

Only this QA packet, three proposed SQL files, two local-only evidence helpers,
and one local validation result were added. No product source, migration,
rollback, test, function, production, or staging state changed.

## What's left

The proposed packet needs a separate independent review. It is not an apply
authorization. Production remains unchanged; accessibility remains an accepted
later-device gate; Phase 03C remains closed.

## Governance receipt

- Production mutations: `NONE`
- Staging mutations: `NONE`
- Production apply executed: `NO`
- Production apply authorized: `NO`
- Function deployment: `NONE`
- Vault changes: `NONE`
- Notifications/webhooks/external sends: `NONE`
- Pushes: `NONE`
- Main merges: `NONE`
- Client release: `NONE`
- Candidate bytes changed: `NO`
- Phase 03C started: `NO`

## DECISIONS FOR SKY

Decision: whether to authorize an independent review of this proposed revised
production-apply packet.

Recommendation: authorize independent review of the packet evidence commit
only; continue to withhold production-apply authority.

Why: the database gate closes the exact cross-commit status race locally and
the future protocol is fail-closed, but the packet author is not its independent
acceptor and production rollback under this gate remains owner-controlled.

Alternative: keep Phase 03B on HOLD, or redesign the frozen migration packaging
and repeat the affected candidate/staging/dry-run gates.

Impact: independent acceptance can prepare a later, separately explicit owner
decision about production execution; it does not itself change production.
