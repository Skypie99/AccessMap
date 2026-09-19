# Raw snapshot control-flow audit

Searched the R10 packet for direct entry/apply classifier calls in the executable adjudicator, comparator predicates before the validated boundary, direct property reads from `extractedSnapshot`, fallback classification, and continuation after validator failure.

The executable adjudicator has one call to `classifyValidatedServerState` and no direct call to `classifyEntryState` or `classifyServerState`. The boundary source orders `validateSnapshot` before entry classification, comparator dispatch, apply classification, and policy lookup. `extractedSnapshot` has no property dereference before validation. Validator failure throws into the outer fail-closed catch and cannot continue through the success path.

`RAW_SNAPSHOT_CONTROL_FLOW_BYPASS: NONE`
