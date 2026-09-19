# R9 server-state transport contract

The retained owner capture proves a one-row JSON array. The linked production Supabase CLI 2.116.0 capture proves a top-level plain object with exactly `boundary`, `rows`, and `warning`.

The accepted forms are therefore:

- `[{ "<requested receipt key>": <snapshot> }]`
- `{ "boundary": "<32 lowercase hex>", "rows": [{ "<requested receipt key>": <snapshot> }], "warning": "...contains <same boundary>..." }`

Both forms require exactly one row. The row must be a plain object with exactly one key, and that key must be the requested receipt key. Unknown or missing wrapper keys, unknown or missing row keys, legacy aliases, scalars, null, zero rows, multiple rows, and bare keyed objects are rejected without coercion.

Expected transport row key sets are dynamic and exact: each caller supplies one receipt key such as `phase03b_server_state_r8`, `phase03b_monitor_r8`, `phase03b_quiescence_entry_r3`, or `phase03b_quiescence_proof_r3`; the row must contain that key and no other.
