# R9 transport validator diff

Comparison base: R8 packet commit `d2632f1dcf9b21f67f95c27fa37794d84dc96391`.

## Smallest safe repair

Only the transport-normalization boundary in `r8_control_lib.mjs` changes. The strict R8 snapshot/envelope schema is preserved byte-for-byte.

R8 accepted any row object containing the requested key and retained a direct keyed-object fallback. R9 accepts only:

1. an array containing exactly one plain row object; or
2. a plain object containing exactly `boundary`, `rows`, and `warning`, with one row and a warning bound to the exact boundary.

In both forms, the sole row key must equal the requested receipt key. Unknown keys, missing keys, aliases, coercion, and bare keyed objects fail before snapshot extraction.

## Validation order

Raw CLI text is parsed; the exact transport form, cardinality, and row key set are validated; the snapshot is extracted; the strict R8 snapshot schema and semantic identity are validated; contradictions are rejected; and only then may classification run.

## Regression evidence

`LOCAL_R9_CONTROL_VALIDATION.json` records the 19/19 R9 transport cases plus all preserved R8 controls. `LOCAL_VALIDATION_RECEIPT.json` aggregates the full R9/R8 replay with the untouched R7 replay.
