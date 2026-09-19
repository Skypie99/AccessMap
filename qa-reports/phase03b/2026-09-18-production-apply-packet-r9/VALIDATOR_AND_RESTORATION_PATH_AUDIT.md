# R9 validator and restoration-path audit

## Canonical validation order

Every R9 server-state capture follows: parse CLI JSON; exact-validate transport container, cardinality, row object, and row key set; extract the snapshot; validate the compiled strict R8 schema; pin semantic identity and context; recompute classification and policy; then return `VALIDATED_R8`. Failure remains `FAIL_CLOSED_INVALID_ENVELOPE`.

## Preserved R8 and R7 controls

The strict R8 envelope schema remains closed and mutually exclusive. The R9 controller copy retains one restoration dispatcher and the immutable 600-second hard boundary. Catch, finally, signal, retry, rollback, timeout, and adjudication paths do not gain a restoration bypass. The accepted 182-check R8 replay and untouched 172-check source R7 replay remain mandatory.

No production controller, quiescence, restoration, apply, migration, application, or privacy-sensitive data path is executed by the local validation.
