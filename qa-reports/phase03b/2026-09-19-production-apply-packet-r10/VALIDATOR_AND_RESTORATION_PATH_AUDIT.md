# R10 validator and restoration-path audit

The extracted snapshot must return `VALIDATED_R10` before entry classification, comparator dispatch, apply classification, or policy derivation. Invalid snapshot data cannot produce or advance a safety state.

The controller, restoration dispatcher, timeout latch, SQL gates, partial-apply matrix, post-apply verifier, post-exit verifier, and exit atomicity logic are byte-preserved from R9. Catch, finally, signal, retry, rollback, timeout, and adjudication paths gain no restoration bypass. The immutable 600-second latch and single restoration dispatcher remain mandatory.

No production controller, quiescence, restoration, apply, migration, application, or privacy-sensitive data path is executed by local validation.
