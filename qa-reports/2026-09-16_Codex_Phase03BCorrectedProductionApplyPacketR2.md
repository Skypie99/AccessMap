# Phase 03B corrected production apply / quiescence packet R2

## Verdict

`PHASE03B_CORRECTED_PRODUCTION_APPLY_PACKET_R2: PASS`

`PHASE03B_CORRECTED_PRODUCTION_APPLY_PACKET_INDEPENDENT_REVIEW: READY`

This is a packet repair only. It authorizes no production or staging mutation,
production lock, gate entry, migration apply, mutating smoke test, push, merge,
release, or Phase 03C work. The prior packet is
`SUPERSEDED_NOT_APPLY_READY`. The frozen candidate and both migrations are
unchanged.

## Authority and frozen identity

- Source packet: `b5f5afb558fafcaa492d103781fc7e943ab75c2b`
- Source independent review: `856053f2977e38ae11390afa6a2ece010caf664a`
- Source stopped executor: `cadbd7fe1185cec6e3cf50fa21202b8747b26592`
- Frozen candidate/tree: `9d638456fa8e679678c54f131fe8f0db723eda72` / `cfc76206f7cf7af6a7127a6329620d2ee1dc4da8`
- Production: `kldlwszpfkdmsjrjhjym` (`Accessable City App`, `us-west-2`, PostgreSQL `17.6.1.121`)
- Forbidden staging target: `cepayqmsoqxshsiyqnvz`
- Migration 1: `20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql`, SHA-256 `b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11`
- Migration 2: `20260915210413_phase03b_points_integrity.sql`, SHA-256 `0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5`

Git, source-object, tree, migration-hash, clean-worktree, and interrupted-operation
checks passed before editing. Read-only production checks re-resolved the exact
target before each operation. They found `transaction_read_only=on`, owners
`postgres` for `private` and `public.flags`, no R2 reserved object, and the
accepted 85/85 ledger, zero Phase 03B rows, pg_net `0/6`, and accepted digests.
No production lock or write was issued.

## Corrected invariant and entry boundary

R2 uses the minimum authoritative whole-domain design: a temporary
`ENABLE ALWAYS` `BEFORE INSERT OR DELETE OR UPDATE OF id,status` row trigger on
`public.flags`. It blocks every operation able to change the exact ordered
`flags(id,status)` proof domain: inserts, deletes, primary-key changes, and
actual status changes. An `UPDATE` that merely mentions `id` or `status` but
does not change either is allowed, as are unrelated-column updates.

The authoritative entry is one transaction:

1. set `lock_timeout=5s` and `statement_timeout=30s`;
2. require the exact executor/namespace/table owner and absence of both reserved objects;
3. take `SHARE ROW EXCLUSIVE` on `public.flags`, draining earlier row writers and preventing a new row writer;
4. create the exact function, revoke client/service execution, create the exact trigger, and set it `ENABLE ALWAYS`;
5. derive and compare canonical catalog hashes;
6. capture OIDs, owners, hashes, enable state, ledger/HTTP values, and exact flags/history counts and fingerprints while the lock remains held;
7. commit.

There is therefore no lock-released/gate-not-active or gate-active/baseline-not-
captured gap. The first durable boundary is the successful entry commit. The
trigger prevents every later change to the `flags(id,status)` domain, including
replica-mode writes; the entry and final fingerprints remain independently
checkable. The status-history fingerprint is a corroborating invariant. It is
not substituted for the authoritative flags invariant.

### Insert/delete decision and impact

Both are blocked. New report creation inserts a flag and will fail atomically;
flag deletion (including the admin delete path inside `moderate_report`) will
fail atomically. Both could change the proof domain; delete can cascade into
history and points-claim rows. Allowing either would reintroduce the ambiguity
identified by independent review. Reads, comments, photos on existing flags,
profile operations, and unrelated flag-field updates remain available. User
impact is a short maintenance error for create/delete/status actions, with no
automatic retry and no persistent optimistic state in the inspected Build 33,
pinned web, RPC, or admin paths.

The frozen migration text contains `UPDATE public.flags` and
`DELETE FROM public.flags` only inside newly defined RPC bodies; neither body is
invoked during migration installation. Migration 1's `ALTER TABLE public.flags`
and trigger-definition DDL and migration 2's reads/FKs/backfills do not perform
a blocked flags row operation. Full local replay proved both files apply while
the gate is active.

## Exact safety-object identity

Function:

- schema/name/signature: `private.flagstone_phase03b_block_row_lifecycle_r2()`
- expected owner: `postgres`, matching the live `private` schema and `public.flags` owner
- language/volatility/security: `plpgsql`, `VOLATILE`, `SECURITY INVOKER`
- configuration: `SET search_path = ''`
- execution ACL: owner only; PUBLIC, `anon`, `authenticated`, and `service_role` revoked
- normalized SHA-256: `bbe1c2892c5191e820a36c64933585e5172f5289945540efae79ed0ae5547ae6`

Trigger:

- table/name: `public.flags.aaa_flagstone_phase03b_row_lifecycle_quiescence_r2`
- timing/events/level: `BEFORE INSERT OR DELETE OR UPDATE OF id,status`, `FOR EACH ROW`
- condition: function-level exact-change test; no catalog `WHEN` expression
- enable mode: `ALWAYS`
- table-owner context: `postgres` (PostgreSQL has no separate trigger owner)
- normalized SHA-256: `e89ac15de9a1f20a2bd269289fa3ddf3ef22ff529d8c4b929587da5781995bbf`

Normalization is PostgreSQL 17 `jsonb::text`, SHA-256 via
`extensions.digest`. Function fields are schema, name, identity arguments,
owner, language, security-definer flag, volatility, sorted `proconfig`, sorted
expanded ACL, and `pg_get_functiondef`. Trigger fields are schema/table,
table owner, name, enabled state, `tgtype`, normalized condition,
`pg_get_triggerdef`, and referenced function schema/name/identity arguments.
The checked-in expected values were produced from the exact entry SQL in a
disposable PostgreSQL 17 cluster. Entry refuses a mismatch.

The entry receipt records runtime function and trigger OIDs. The deterministic
exit generator binds those OIDs and the entry counts/fingerprints into a new,
hashed runtime artifact. The exit transaction reacquires the drain lock and
requires exact cardinality, names, OIDs, owners, enable state, approved hashes,
entry-receipt hashes, invariant equality, ledger, structure, authorization,
semantics, and HTTP state before dropping only the two exact objects. It never
uses `IF EXISTS` or broad cleanup. Any mismatch leaves the gate active.

## Timeouts, monitoring, and escalation

Evidence: accepted production dry-run migration planning was `1.912s`; the
strict staging dry-run was `2.763s`; hosted verification suites were
`2.689–3.133s`, with the final snapshot `3.721s`; revised staging applied each
migration in approximately two seconds. The expected normal window is therefore
`45–120s`, including human/tool handoffs; it is an estimate, not a guarantee.

Exact bounds:

- entry and exit lock acquisition: PostgreSQL `lock_timeout=5s`; timeout means the transaction rolls back, no apply starts, and HOLD;
- entry and exit statement timeout: PostgreSQL `statement_timeout=30s`;
- migration database statement timeout: the frozen files do not set one, and CLI 2.116.0's linked `db push` exposes no safe per-session setting. A read-only Management API session currently reports `2min`, but `postgres.rolconfig` does not pin it, so R2 does not misrepresent that observation as a `db push` guarantee. Candidate bytes and production roles are not changed. The enforceable migration bound is the external 180-second wrapper;
- successful-entry-to-CLI-completion wall clock: `180s`;
- post-apply verification: `300s` from trustworthy CLI completion;
- total quiescence maximum: `600s` from entry commit; reaching it mandates owner escalation while the gate remains active.

The bounded wrapper reads the committed entry receipt and schedules `SIGINT`
for the remaining portion of the 180-second entry-to-completion budget,
then `SIGTERM` after 10 seconds and `SIGKILL` after another 10 seconds if still
local. It records exact argv/workdir/target, separate stdout/stderr, timestamps,
exit code, signal, timeout flag, and a five-second local process record. Killing
the local process is never proof the database stopped.

Every `5s` while active, run the target-explicit read-only monitor and record:
local process state; privacy-safe active `postgres` backend metadata (PID,
application name, state, wait event, transaction/query start; never query text);
ledger count and exact Phase 03B versions; gate OID and enable state; elapsed
wall clock. Correlate candidate backends to entry time and the CLI lifecycle.
After local termination, inspect every `5s` for up to `30s`. If a correlated
backend remains active at 30 seconds, escalate; do not call
`pg_terminate_backend` without new authority.

For any timeout, disconnect, terminal crash, lost output, non-trustworthy exit,
or server continuation: **state is unknown until proven by database evidence**.
Do not retry. Keep the gate active. Re-read backend activity, ledger, exact
catalog state, invariant, and HTTP baseline. Classify zero/one/two ledger rows
and structural reality. Escalate on lock timeout, 180-second apply timeout,
backend activity after 30 seconds, partial/unexpected ledger, ambiguous
structure, 600-second gate age, HTTP drift, gate identity drift, invariant
drift, or exit/restoration failure.

## Exact future command and workspace

Installed and source-inspected CLI: `2.116.0`. The current Supabase changelog
was checked on 2026-09-17; no listed `db push` change invalidated the reviewed
contract. CLI source sorts pending migrations by version, applies each file in
turn, resets session state before each, and inserts migration history only
through its migration apply path. `--skip-vault` bypasses Vault work; no
`--include-seed` or `--include-roles` is present.

Reuse the prior packet's locally safe workspace builder
`qa-reports/phase03b/2026-09-16-production-apply-quiescence-packet/prepare_apply_workspace.mjs`.
It requires the frozen candidate/tree/hashes, consumes a read-only exact-target
snapshot, maps all 85 ledger rows to one source each, creates a new path, and
adds only the two frozen pending files. Require 87 migration files total, with
the exact pair last and pending in the required order. Re-run a target-explicit
`db push --dry-run`; any plan other than exactly the pair is STOP.

The exact future apply command, executed only through
`execute_apply_bounded.mjs`, is:

```bash
supabase db push --workdir /tmp/flagstone-p03b-production-apply-9d638456 --linked --project-ref kldlwszpfkdmsjrjhjym --skip-vault --include-all --yes --output-format json
```

The exact wrapper invocation is:

```bash
node qa-reports/phase03b/2026-09-16-corrected-production-apply-packet-r2/execute_apply_bounded.mjs --entry=/absolute/evidence/ENTRY_RECEIPT.json --evidence=/absolute/new/APPLY_EVIDENCE
```

Immediately before entry, revalidate candidate/tree and hashes, exact target,
CLI contract, clean executor workspace, 85/85 ledger/latest/digest, zero Phase
03B rows, accepted structural/function identities, pg_net `0/6` and fingerprint,
and zero reserved object counts. Immediately before apply, re-prove the gate
and run the dry-run. Any drift affecting safety or plan is STOP.

## Post-apply verification while quiesced

Within 300 seconds require 87 unique ledger versions, exactly the two additions
in order and no extras; the complete accepted normalized structural snapshot;
Build 33 and pinned-web direct-update compatibility; the new RPC contract;
photo-alt cross-owner denial without sibling omissions; admin-only
reject/restore; anonymous denial; exact moderation objects/semantics; exact
staged points objects, handler, trigger and claim-once/owner-zero/neutral
reject-restore semantics; unchanged Edge Function identity; pg_net `0/6` and
accepted fingerprint; exact gate OIDs/owners/hashes/enable state; and exact
entry flags/history invariants. The packet's compact exit guard is not a
replacement for these full external evidence suites.

No mutating production smoke test is required. Revised staging exercised the
behavior; production can prove the exact deployed definitions, ACLs, wiring,
ledger, and uninterrupted quiescence invariant without creating user data or
invoking HTTP.

## Partial-apply failure matrix

Automated retry is forbidden in every state below. Rollback remains
`REQUIRES_OWNER_DECISION`; no destructive or automatic rollback is introduced.

| Case | Expected ledger / gate / writes | Evidence and disposition |
|---|---|---|
| A lock timeout | 85 rows; no committed gate; writes normal | entry stderr/exit/timing, reserved-object absence; HOLD and owner decision before retry |
| B entry fails before commit | 85; transaction rollback; no gate; writes normal | transaction error plus object absence; HOLD |
| C gate committed, apply never starts | 85; gate active; lifecycle writes blocked | entry receipt/OIDs/hashes, invariant, no CLI start; owner chooses verified exit or later action |
| D migration 1 fails before commit | normally 85; gate active | CLI streams/exit, backend state, ledger/catalog/invariant; no blind retry; owner decision |
| E migration 1 commits, migration 2 fails | 86 with only `20260915210256`; gate active | exact ledger and intermediate structure; fail closed; owner chooses diagnosis/authorized completion or rollback |
| F 180s timeout | 85/86/87 unknown; gate active | signals, backend observations, ledger/catalog/invariant; wait 30s then escalate if backend persists |
| G ambiguous client exit | unknown until DB proof; gate active | separate stdout/stderr, backend, ledger, catalog, invariant; no retry; owner decision |
| H both ledger rows, structural failure | 87; gate active | full normalized diff and migration outputs; owner decision |
| I invariant mismatch | any; gate active if identity exact | counts/fingerprints and gate identity; do not exit; owner decision |
| J gate identity changes | any; gate treated compromised/unknown | names/cardinality/OIDs/owners/hashes/enable state; do not drop; owner decision |
| K HTTP baseline changes | any; gate active | queue/count/fingerprint and retention evidence; do not exit unless separately adjudicated |
| L exit identity guard fails | 87 expected; gate remains active | exit stderr and fresh catalog proof; owner decision |
| M exact object removal fails | 87; exit transaction rolls back; gate remains active | transaction receipt/catalog; no cleanup; owner decision |
| N post-exit restoration proof fails | 87; gate state unknown until catalog read | object absence/presence, final grants/RLS/triggers/HTTP; owner decision and no mutating probe |

## Blocked-attempt observability

The trigger returns SQLSTATE `P0001` to the caller. Existing database logs may
show failed statements, but log access/retention is not an independently stable
counter and query text can contain sensitive data. R2 adds no production
instrumentation. Blocked attempts are not gate failures; the authoritative
proof is that no prohibited change committed. Monitoring therefore captures
only privacy-safe activity metadata and the invariant.

## Packet artifacts

- `PROPOSED_QUIESCENCE_ENTER.sql`: atomic install, identity verification, and entry receipt.
- `PROPOSED_QUIESCENCE_VERIFY.sql`: read-only identity/invariant receipt.
- `PROPOSED_QUIESCENCE_EXIT_TEMPLATE.sql` plus `generate_exit_sql.mjs`: receipt-bound exact exit.
- `MONITOR_READ_ONLY.sql`: five-second privacy-safe server observation.
- `execute_apply_bounded.mjs`: exact 180-second local command wrapper and evidence capture.
- `validate_quiescence_local.mjs` / `LOCAL_QUIESCENCE_VALIDATION.json`: disposable PostgreSQL 17 replay.
- `SUPERSESSION.md`, privacy scan, and artifact manifests: lineage and integrity.

## What changed

Only the R2 QA/evidence report and packet directory were added. No frozen
migration or application file changed. R2 broadens temporary quiescence to the
complete invariant domain, pins owners/OIDs/catalog hashes, binds exit to the
entry receipt, and adds bounded execution/monitoring/escalation controls.

## Branch + SHA

Branch: `codex/flagstone-p03b-production-apply-packet-r2-20260916`.
Base: `b5f5afb558fafcaa492d103781fc7e943ab75c2b`.
The containing evidence commit is reported in the final owner receipt.

## Gates

- `git` repository/base/source/candidate/tree/worktree/operation checks: PASS.
- frozen migration `shasum -a 256`: PASS.
- live target/owner/baseline/reserved-object checks in read-only transactions: PASS; one malformed read-only catalog probe failed on removed `pg_database.datconfig`, then the corrected read-only probe passed; neither could mutate.
- Supabase CLI `2.116.0` help/source and current changelog review: PASS.
- frozen migration row-write inspection: function bodies contain row DML but installation invokes none; full replay is controlling proof.
- `node .../validate_quiescence_local.mjs`: PASS, socket-only PostgreSQL 17, temporary cluster destroyed.
- candidate-byte diff and privacy scan: recorded in packet manifests.

## What's left

A genuinely fresh independent reviewer must validate this exact evidence commit.
Only after PASS may Sky separately authorize a target-specific production apply.
Production rollback remains an owner decision. Native accessibility/device
residual remains `ACCEPTED_LATER_GATE`; Phase 03B is not closed.

## DECISIONS FOR SKY

Decision: whether to authorize a genuinely fresh independent review of this R2
evidence commit. Recommendation: authorize only that review next, because all
three packet gaps now have local proof but independence is still mandatory.
Alternative: keep the production apply on HOLD. Impact: no production behavior
changes either way; applying remains prohibited until a later explicit decision.

No other decision is requested by this preparation run.
