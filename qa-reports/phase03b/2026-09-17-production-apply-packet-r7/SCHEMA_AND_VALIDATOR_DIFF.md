# R7 schema and validator diff

Comparison base: R6 packet commit `f6d314b6f58c3367d6a5ee0d461c43ef05516e56`.

## Machine-readable schema

R6's `STRICT_R6_ENVELOPE_SCHEMA.json` was an outer contract with open or untyped nested values. R7 replaces it with generated `STRICT_R7_ENVELOPE_SCHEMA.json` and its checked-in generator. The R7 schema closes every safety-critical object, explicitly requires its keys, pins R7 identity, and models phase-specific entry, server-state, post-apply, and post-exit shapes. `r7_schema_validator.mjs` compiles that exact artifact at module load; runtime validation therefore tests the schema rather than visually inspecting it.

The final source comparison is expected to be large because R7 expands the schema from an outer shell into the full nested contract. `git diff --no-index --stat` reported 1,771 insertions and 65 deletions before final regeneration; the artifact manifest pins the final bytes.

## Executable validators

`r7_control_lib.mjs` adds one canonical phase dispatcher and exact validators for entry and server state. The entry validator covers every field emitted by the source SQL, including PostgreSQL decimal-string OIDs, grants, lock evidence, structural snapshot digest, immutable deadlines, and exact captured process receipts. The server validator requires exact consumer context, distinguishes exact success from one exact failed-capture shape, recomputes all classifications and policy, and rejects incompatible truths.

Both fresh and reused server-state files in `execute_cutover_controller.mjs` are validated before their values can affect controller state. `adjudicate_server_state.mjs` builds and validates through the same canonical path before writing evidence.

## Executable regression evidence

`validate_r7_controls.mjs` adds 35 direct R7 validator cases. The packet also reruns the copied 40 R6 branch cases and executes the untouched source-R6 packet's complete 137-check replay. `CONTRADICTION_MATRIX.json` maps each contradiction to its direct test.

No migration or application byte is part of this diff. R6-D2's restoration architecture was not redesigned.
