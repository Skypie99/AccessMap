# R8 schema and validator diff

Comparison base: R7 packet commit `4dd4ebd7ae6295c8ebb204583f42932db7fb4c95`.

## Exact schema path and branches

The affected path is `#/$defs/serverObserved/properties/snapshot/oneOf` in `STRICT_R8_ENVELOPE_SCHEMA.json`.

- Branch A references `serverSnapshotFailure`, a closed object requiring exactly `querySucceeded: false` and non-empty `captureError`.
- Branch B references `serverSnapshotSuccess`, a closed object requiring `querySucceeded: true` and the exact read-only server-state keys. `structureExact` is the only optional key.

The discriminator is `querySucceeded`; its `false` and `true` constants make the branches mutually exclusive. R8 retains `oneOf`, closed objects, exact required sets, and contradiction rejection.

## Root cause and smallest safe repair

The failing live CLI shape was an array containing one keyed row. R7's extractor returned that array unchanged. The schema error listed `must have type object` for both branches, proving zero matches rather than overlap.

R8 changes only the extractor contract: legacy array wrapper, current `rows` wrapper, and direct keyed row are accepted only when they resolve to exactly one object containing the requested key. Ambiguous and malformed wrappers are rejected. `adjudicate_server_state.mjs` also asserts that the extracted snapshot is a non-array object before adding the local `querySucceeded` discriminator.

## Regression evidence

`LIVE_READ_ONLY_SERVER_STATE_CLI_ARRAY_FIXTURE.json` is the exact privacy-safe owner capture. Ten focused tests prove exact-one success, missing-discriminator rejection, contradictory-property rejection, branch separation, top-level and nested unknown-key rejection, raw-array rejection, current-wrapper compatibility, and multi-row rejection.

No application or migration byte changed.
