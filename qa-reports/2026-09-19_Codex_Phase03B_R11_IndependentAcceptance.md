# Flagstone Phase 03B R11 Independent Acceptance Review

## Outcome

`PASS`.

The exact R11 packet at `cf683eac2f50a284d8dc897db98a91290e9b6bc0` correctly replaces the volatile whole-table pg_net fingerprint authorization gate with a run-relative invariant. One database-issued timestamp is captured before any mutation and bound into entry, monitoring, server adjudication, post-apply verification, exit, and post-exit verification. Every safety checkpoint requires queue count zero, no response created at or after that timestamp, and `pg_net.ttl` greater than the 600-second maximum-quiescence window.

The three historical response fingerprints remain present only in diagnostic evidence. None remains in production authorization, safe-exit, restoration, or fail-closed control flow. Old response-row expiry therefore cannot block or authorize cutover.

No production or staging mutation, quiescence, controller execution, migration apply, push, merge, release, or Phase 03C action occurred.

## What changed

- Added only this independent-review report.
- Did not change the R11 packet, application source, candidate, migrations, controller, SQL templates, or saved evidence.

## Branch + SHA

- Review branch: `codex/flagstone-p03b-r11-independent-review-20260919`
- Reviewed R11 packet commit: `cf683eac2f50a284d8dc897db98a91290e9b6bc0`
- Source R10 packet commit: `0ba40b4ff027e043edf441ea24fe2be1eae5f9bc`
- pg_net provenance evidence commit: `64ee3b24e270a590656590e55312a1dd7326ab88`
- Candidate: `9d638456fa8e679678c54f131fe8f0db723eda72`
- Candidate tree: `cfc76206f7cf7af6a7127a6329620d2ee1dc4da8`

## Independent findings

- R11 root defect count: `1` — `VOLATILE_PG_NET_RESPONSE_HISTORY_USED_AS_AUTHORIZATION_IDENTITY`, repaired by this packet.
- Historical fingerprints are diagnostic only. Static search found them in history, fixtures, summaries, and the negative control-flow test, not in an authorization equality check.
- Database T0 is immutable and used end-to-end. `PG_NET_RUN_RELATIVE_PREFLIGHT.sql` obtains it from `transaction_timestamp()` in a read-only transaction; the controller freezes the validated context and materializes all later SQL from that exact value.
- A nonzero queue, any response created at or after T0, missing/invalid T0, or TTL at or below 600 seconds fails closed.
- Old response expiry, response-count decrease, and historical fingerprint change are accepted when the run-relative invariant remains satisfied.
- Continuous monitoring plus entry, post-apply, exit, and post-exit checks preserve observability. Accepted TTL exceeds both the 600-second cutover boundary and every unchecked interval, so a new response cannot expire before the next required checkpoint.
- Pre-classification snapshot validation, the irreversible maximum-quiescence latch, the single restoration dispatcher, exact two-migration inventory, partial-apply handling, quiesced post-apply verification, atomic exit, and restored-write verification remain intact.
- Restoration dispatch at or after 600 seconds remains blocked. An already-dispatched pre-deadline transaction may resolve once; it does not authorize a second dispatch.
- Candidate bytes are unchanged. Exactly the two frozen Phase 03B migrations remain, with the required SHA-256 values.

## Gates

### Focused R11 and preserved-control replay

Command:

```bash
node qa-reports/phase03b/2026-09-19-production-apply-packet-r11/validate_r8_controls.mjs
```

Result: exit `0`; `PASS`; every boolean true; 210 checks; R11 pg_net matrix `14/14`; R10 validation-order matrix `16/16`; invalid-snapshot classifier, comparator, consumed-result, and controller-transition counts all `0`; temporary validation data destroyed.

### Disposable PostgreSQL 17 lifecycle replay

Command:

```bash
node qa-reports/phase03b/2026-09-19-production-apply-packet-r11/validate_quiescence_local.mjs
```

Result: exit `0`; `PASS`; 22/22 checks; database-issued T0 confirmed; `pg_net.ttl=6h`; queue/new-response checks executable; gate entered `ALWAYS`; row/identity/status/TRUNCATE bypass attempts blocked; both migrations replayed; identity-drift exit failed closed; gate removal atomic; post-exit proof executable; writes restored only after exit; disposable cluster destroyed.

Combined independent local replay: `232/232` checks.

### Fresh live read-only pg_net preflight

Command:

```bash
supabase db query --linked --project-ref kldlwszpfkdmsjrjhjym --file qa-reports/phase03b/2026-09-19-production-apply-packet-r11/PG_NET_RUN_RELATIVE_PREFLIGHT.sql --output-format json
```

Result: exit `0`; target-pinned query; `transaction_read_only=on`; database T0 `2026-09-19T18:45:24.645549Z`; queue `0`; `pg_net.ttl=6 hours` / `21600` seconds; responses created at or after T0 `0`; retained response count `3` and fingerprint `14d0617d38d7625f9470ed931c4c7e849bba5d9472bc8e39983dd1a359118dfd` recorded as diagnostic only; explicit rollback in the reviewed SQL.

Target lookup returned exact project ref `kldlwszpfkdmsjrjhjym`, region `us-west-2`, status `ACTIVE_HEALTHY`.

### Candidate freeze

Commands:

```bash
find supabase/migrations-next/phase03b -maxdepth 1 -type f -name '*.sql' -print | sort
```

```bash
shasum -a 256 supabase/migrations-next/phase03b/*.sql
```

```bash
git diff --exit-code 9d638456fa8e679678c54f131fe8f0db723eda72 -- supabase/migrations-next/phase03b/20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql supabase/migrations-next/phase03b/20260915210413_phase03b_points_integrity.sql
```

Result: exactly two SQL files; SHA-256 values `b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11` and `0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5`; candidate diff exit `0`.

### Packet integrity

Command, run from the R11 packet directory:

```bash
shasum -a 256 -c ARTIFACT_MANIFEST.sha256
```

Result: exit `0`; all 65 listed artifacts `OK`.

The first manifest attempt was run from the repository root even though the manifest paths are packet-relative; it failed to open the listed files. Re-running from the packet directory succeeded completely. This was an invocation-path error, not an artifact mismatch.

### Patch hygiene

Command:

```bash
git diff --check 0ba40b4ff027e043edf441ea24fe2be1eae5f9bc..cf683eac2f50a284d8dc897db98a91290e9b6bc0
```

Result: exit `0`, no output.

## What's left

- Production apply remains unexecuted and unauthorized.
- The one-run authorization remains unused.
- Phase 03C has not started.

## DECISIONS FOR SKY

- **Decision:** Whether to issue a separate exact one-run production-apply authorization for R11 packet commit `cf683eac2f50a284d8dc897db98a91290e9b6bc0` against target `kldlwszpfkdmsjrjhjym`.
  - **Recommendation:** If you want Phase 03B applied, authorize exactly that packet, candidate, target, and one controller run in a separate owner decision.
  - **Why:** The non-applying independent gate is now `PASS / READY`; no current authorization permits production mutation.
  - **Alternative:** Leave the one-run authorization unused and make no production change.
  - **Impact:** Until the separate authorization is issued, production remains unchanged and Phase 03B remains unapplied.
