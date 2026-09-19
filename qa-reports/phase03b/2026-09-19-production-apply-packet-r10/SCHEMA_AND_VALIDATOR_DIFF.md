# R10 validation-order diff

## Before R10

The R9 executable validated transport and extracted the snapshot, then invoked entry classification, comparator-dispatch predicates, apply classification, and policy derivation. Strict snapshot/envelope validation ran only after those decisions were materialized.

## After R10

`validateServerStateSnapshot` is the mandatory boundary for the extracted snapshot. It calls the compiled exact snapshot schema, repeats the imperative exact-key checks for classifier-consumed fields, validates nested backend objects, and rejects gate-absence/object-identity contradictions. It returns only `VALIDATED_R10`.

`classifyValidatedServerState` calls that validator before any classifier, comparator, property-driven state branch, or policy lookup. The executable adjudicator calls only this validated boundary; it no longer directly invokes the entry or apply classifiers.

The final full-envelope validator remains in place as defense in depth.
