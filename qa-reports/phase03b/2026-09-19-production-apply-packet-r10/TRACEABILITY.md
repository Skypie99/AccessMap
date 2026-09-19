# R10 pre-classification snapshot-validation traceability

R10 repairs exactly one authorized root defect: `PRE_CLASSIFICATION_SNAPSHOT_VALIDATION_ORDER`.

## R10-D1

The independent R9 review at commit `097e5a6acbf8d78e54d94032b9b2d5edc90760eb` proved that the packet at `28f54e37ae018ab33fe8326a556cd1209794e484` exact-validated transport, then passed the extracted snapshot through entry classification, comparator-dispatch predicates, apply classification, and policy derivation before strict snapshot validation.

R10 adds an executable validated boundary. `validateServerStateSnapshot` exact-validates top-level and nested keys, semantic receipt/read-only identity, discriminator exclusivity, and snapshot contradictions. Only a `VALIDATED_R10` return allows `classifyEntryState`, comparator dispatch, `classifyServerState`, or `statePolicy` to run.

The candidate and both frozen migrations remain byte-identical. R9 transport normalization is preserved unchanged.
