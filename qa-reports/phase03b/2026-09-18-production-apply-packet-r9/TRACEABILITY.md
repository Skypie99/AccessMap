# R9 server-state transport-exactness traceability

Source R8 packet: `d2632f1dcf9b21f67f95c27fa37794d84dc96391`.

Source independent R8 review: `f7d62d482372ae062b58d1bd240cdc5cc5e229bb`.

## R9-D1 — server-state transport exactness

The independent review proved that R8 `resultRow()` enforced cardinality but not the exact row-wrapper key set. A one-row array or `rows` wrapper containing the expected receipt key plus an unknown sibling was accepted. R8 also accepted a bare keyed object even though the retained owner array fixture and the live CLI capture proved only the array and `boundary`/`rows`/`warning` transports.

R9 keeps those two proven transports. It exact-validates the current object wrapper keys and types, binds `warning` to the 32-character lowercase-hex `boundary`, requires exactly one row, requires a plain row object whose only key is the requested receipt key, and only then returns the snapshot. The bare-object fallback is removed because no current producer or runtime path requires it.

Nineteen focused regressions cover both accepted transports; empty, multi-row, scalar, null, unknown, missing, legacy-alias, malformed-boundary, snapshot-unknown, nested-unknown, contradiction, and bare-object failures; and an instrumented proof that invalid transport cannot reach classification.

The frozen candidate, two migration files, strict R8 envelope schema, classifier, controller, quiescence deadline, latch, restoration dispatcher, and accepted R7/R8 controls are unchanged.
