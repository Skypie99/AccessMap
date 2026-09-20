# Phase 03B migration-ledger statement identity contract

## Root cause

Supabase CLI `2.116.0` does not record each migration file as one statement. Its
`NewMigrationFromFile` path calls `parser.SplitAndTrim`, executes the resulting
ordered statements, and inserts that exact `[]string` as the ledger `text[]`.
The old recovery comparator instead expected one whole-file statement and
hashed only `statements[1]`. The versions and names were correct; the expected
statement representation was not.

## Independent expected side

The expected side is derived only from the two frozen migration files and the
pinned official CLI source at tag `v2.116.0`, commit
`997a1e69a4a83466964ed874d3a604c88a7b3866`. Source-file identities and the
derived rows are recorded in `EXPECTED_PHASE03B_STATEMENT_IDENTITY.json`.
Production ledger rows are not inputs to this derivation.

The parser contract preserves comments and internal whitespace, splits only at
the CLI finite-state machine's statement boundaries, removes trailing
semicolons, and trims surrounding Unicode whitespace. No additional
normalization is allowed.

## Ordered-array digest

For every statement in ordinal order, encode:

`<UTF-8 byte length>:<exact statement UTF-8 bytes>`

Concatenate those encodings without a separator and SHA-256 the result. The
length prefix makes the representation unambiguous. The production read-only
SQL applies the same algorithm through `unnest(statements) with ordinality`.
`NULL` arrays or `NULL` elements yield a non-valid digest and therefore HOLD.

## Fail-closed boundary

The comparator requires exactly two rows in exact version order, exact names,
positive exact counts, and exact ordered-array digests. JSON object member order
is immaterial; the allowed key set and each typed value remain exact. Missing, extra,
duplicated, reordered, renamed, or modified rows/statements HOLD. The installed
CLI must report exactly `2.116.0`, and the embedded parser provenance must match
the pinned source identities. The strict R8 envelope schema is unchanged.

The original `ARTIFACT_MANIFEST` remains an immutable record of the pre-repair
R11 packet. The separate ledger-identity repair manifest under the recovery
evidence root covers this repair, both local validation checkpoints, and the
single live read-only attempt.
