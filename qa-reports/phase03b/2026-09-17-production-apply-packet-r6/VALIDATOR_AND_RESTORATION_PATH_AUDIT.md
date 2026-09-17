# R6 validator and restoration-path audit

## Envelope consumers

- `JSON.parse` sites only create raw values. Entry, server-classifier, post-apply, post-exit, exit-materialization, and final-disposition decisions call the R6 semantic validator or the exact domain validator before using the value.
- Optional/fallback reads in adjudication select fail-closed states such as `OWNER_REQUIRED_FAIL_CLOSED`, `GATE_UNKNOWN`, and `BACKEND_UNKNOWN`; they do not select PASS, exit, retry, or restoration.
- Comparator PASS requires the exact R6 outer keys, producer/version, run identity, expected digests, complete phase-specific proof, exact migration rows, exact normalized structure digest, three successful target-pinned child receipts, and proof-to-entry invariants.
- Legacy R5, R4, bare, alias, partial, extra-key, coerced numeric-exit, wrong producer, wrong run, null proof, empty proof, wrong digest, contradictory status, and malformed-step cases fail closed in the local replay.

## Restoration surfaces

- The controller contains exactly one `dispatchRestoration()` function and exactly one `runCaptured('05-exit/exit', ...)` call, inside that dispatcher.
- `runCaptured` rejects the exit label unless it receives the controller-private restoration token.
- The dispatcher passes the immutable maximum-quiescence deadline into `dispatchRestorationBeforeDeadline()`. That helper evaluates all safety predicates with a fresh monotonic reading and calls `spawn` synchronously only if the reading is strictly below the hard boundary.
- Catch, finally, signal, timeout, adjudication, retry, rollback, and cleanup paths do not call the dispatcher or load the mutating exit SQL template.
- A single atomic exit already spawned below the boundary may resolve. An ambiguous result triggers fail-closed adjudication and never starts a second exit.

Local/disposable test cleanup remains separate from the production controller and may remove only its temporary local PostgreSQL cluster.
