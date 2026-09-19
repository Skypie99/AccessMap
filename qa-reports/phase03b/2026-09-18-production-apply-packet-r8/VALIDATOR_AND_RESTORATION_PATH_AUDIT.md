# R8 validator and restoration-path audit

## Canonical validation order

Every R8 server-state capture follows: parse CLI JSON, extract exactly one keyed row, require a non-array snapshot object, validate the compiled strict schema, pin semantic identity and context, recompute classification and policy, then return `VALIDATED_R8`. Failure remains `FAIL_CLOSED_INVALID_ENVELOPE`.

## Snapshot disambiguation

The schema uses the required `querySucceeded` discriminator with mutually exclusive constants. The success and failure objects are closed; unknown keys remain rejected. The runtime now prevents a CLI wrapper from being mistaken for the snapshot.

## Preserved R7 controls

The R8 controller retains one restoration dispatcher and the immutable 600-second hard boundary. Catch, finally, signal, retry, rollback, timeout, and adjudication paths do not gain a restoration bypass. The source R7 SQL and control replay is executed untouched; the R8 copy reruns all inherited cases plus the focused R8 schema-repair cases.

No production controller, quiescence, restoration, apply, migration, application, or privacy-sensitive data path was executed during this repair.
