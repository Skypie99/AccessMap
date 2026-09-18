# R7 validator and restoration-path audit

## Canonical validation order

Every R7 safety envelope follows one path: parse, compiled exact JSON Schema, pinned semantic identity, phase/state proof, contradiction checks, then `VALIDATED_R7`. Any failure becomes `FAIL_CLOSED_INVALID_ENVELOPE` before control-flow use.

`validateR7Envelope` dispatches by the exact phase. `validateEntryEnvelope` is the only entry authorization validator. `validateServerStateEnvelope` is the only server-classification authorization validator. Historical R6/R5/R4 values remain readable evidence but are rejected as runtime inputs.

## Schema exactness

`generate_r7_schema.mjs` is the canonical schema generator. `r7_schema_validator.mjs` compiles `STRICT_R7_ENVELOPE_SCHEMA.json` at module load and validates the actual runtime value. Safety-critical top-level, entry, proof, inventory, deadlines, process receipt, server snapshot, gate state, policy, comparator proof, migration row, and grant objects have explicit required fields and closed additional properties.

The direct matrix tests the compiled validator, including exact acceptance plus top-level unknown, nested unknown, missing nested key, legacy alias, R6 packet version, and wrong schema version rejection.

## Entry receipt

Both captured steps must be exact, target-pinned, successful, not timed out, and not signaled. The entry and immediate proof must contain the same exact gate identities. Candidate, tree, target, producer, run, controller PID, monotonic origin, immutable deadlines, migration inventory, and capture budget are pinned. A raw parsed receipt cannot materialize controller state without this validation.

## Server-state classification

Fresh and reused classifications are validated with the consumer's exact run, process, monotonic origin, apply-spawned state, and validated entry envelope. Definitive classification requires a successful target-pinned read and complete exact server evidence. The validator recomputes gate, entry, apply, policy, and status; it rejects any mismatch. Failed capture has one exact representation and can produce only the fail-closed UNKNOWN state.

## R6-D2 preservation

R7 did not redesign the production controller or the accepted 600-second architecture. The controller retains one restoration dispatcher and one normal exit spawn location. The dispatcher passes the immutable maximum-quiescence deadline to the synchronous spawn primitive; new dispatch at or beyond the boundary remains blocked. Catch, finally, signal, timeout, retry, rollback, and adjudication paths cannot invoke restoration.

Preservation evidence is twofold: all 40 copied R6 branch cases pass in R7, and the untouched source-R6 packet is rerun independently for its complete 137-check replay. Local disposable cleanup is separate from the production controller.
