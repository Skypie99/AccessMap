# R7 validator-repair traceability

Source packet: `f6d314b6f58c3367d6a5ee0d461c43ef05516e56`.

Source independent review: Codex rollout `01a0b2b2-cdfa-79e1-9545-c5166ec6940a`; executable probe at custom-tool ordinal 164; HOLD adjudication at assistant-message ordinal 199.

## R7-D1 — JSON Schema exactness

The review proved that an unknown nested proof key remained schema-valid. R7 generates and compiles one canonical schema with explicit required sets and `additionalProperties: false` at every safety-critical object. Direct tests cover exact valid input, top-level and nested extras, missing keys, aliases, R6 packet version, and wrong schema version.

## R7-D2 — ENTRY_RECEIPT executable validator

The review proved that R6 could accept a purportedly successful entry whose nested command receipt said it timed out and was signaled. R7 makes the compiled schema the first validation step, then enforces pinned run/candidate/target/producer identity, exact nested keys, successful process outcome, proof consistency, and immutable deadline relationships before returning `VALIDATED_R7`.

## R7-D3 — SERVER_STATE_CLASSIFICATION executable validator

The review proved that R6 could accept definitive `ENTRY_CONFIRMED_NOT_COMMITTED`, `GATE_ABSENT`, and `APPLY_NOT_STARTED` classifications while `querySucceeded` was false. R7 requires successful, complete server evidence for definitive classifications, recomputes all state and policy fields, and permits unavailable evidence only through the exact fail-closed UNKNOWN state.

## Preserved boundary

R6-D2 remains accepted and was not redesigned. The source R6 replay and its 40 branch cases are rerun from the source packet, while the R7 copy retains the single restoration dispatcher and immutable 600-second deadline behavior.
