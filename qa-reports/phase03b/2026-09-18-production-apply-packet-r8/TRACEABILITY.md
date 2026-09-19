# R8 server-state snapshot repair traceability

Source R7 packet: `4dd4ebd7ae6295c8ebb204583f42932db7fb4c95`.

Source independent R7 review: `f39e126f7573d8e218e0fbbf49326c395cb301e2`.

## R8-D1 — CLI row-container extraction

The owner evidence retained at `/tmp/flagstone-p03b-r7-owner-readonly-preflight-20260918/server-state/server-state.stdout.log` is a one-element JSON array whose only row contains `phase03b_server_state_r7`. R7 `resultRow()` did not unwrap this form and returned the array. The full schema then correctly rejected `observed.snapshot`: both `oneOf` branches require an object, so zero branches matched.

The branches were not overlapping. Failure requires `querySucceeded: false` and `captureError`; success requires `querySucceeded: true` and the exact 63-field read-only snapshot. Both are closed with `additionalProperties: false`.

R8 repairs the extraction boundary. It accepts exactly one row from the observed owner array wrapper, the current CLI `rows` wrapper, or a direct keyed row. Missing keys, non-object rows, and multiple rows fail before the snapshot can enter classification.

## Valid and invalid states

Valid states are one exact success snapshot or one exact failed-capture snapshot. Invalid states include a missing discriminator, both success and failure properties, an unextracted array, unknown top-level or nested keys, and any wrapper containing zero or multiple rows.

## Preserved boundary

The candidate, two migration files, classifier, controller, quiescence deadline, latch, restoration dispatcher, and contradiction checks are unchanged except for the R8 identity bump and the row extractor. The untouched R7 local replay runs independently beside the R8 replay.
