# R9 normalization flow

`raw CLI bytes` → `JSON parse` → `exact container validation` → `exact one-row cardinality` → `plain row + exact row-key validation` → `snapshot extraction` → `strict R8 snapshot schema` → `semantic identity` → `discriminator/state consistency` → `contradiction rejection` → `classification/control flow`

No classifier or safety decision receives the raw transport. The instrumented `r9t_19_invalidRawTransportCannotReachClassification` regression keeps the classification-call counter at zero when transport validation fails.
