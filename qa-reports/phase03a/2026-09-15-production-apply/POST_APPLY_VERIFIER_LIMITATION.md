# Post-apply verifier limitation

The accepted production preflight report query failed read-only after Stage A with PostgreSQL `22P02: invalid input syntax for type bytea`. Its function-definition digest used `pg_get_functiondef(p.oid)::bytea`; the new FDA-028 source includes a regular-expression backslash, which is not a valid bytea escape in that cast.

The corrected retained query changes only the digest input representation to `convert_to(pg_get_functiondef(p.oid), 'UTF8')` and makes the Vault shape aggregation evaluation-safe. It preserves the same metadata, row-count, privilege, function, policy, trigger, and sanitized-output scope. The corrected query completed with `transaction_read_only=on` and returned no secret, endpoint, coordinate, IP address, or application-row identifier.

The immediate pre-apply safe aggregate values were returned by a transaction-read-only query and were identical to the retained earlier production snapshot. The raw wrapper for that immediate query was replaced during query correction before it was committed. The exact counts and this retention limitation are banked in `PRE_APPLY_SAFE_AGGREGATES_OBSERVED.json`. The exact pre-apply ledger and both full pre-apply catalog artifacts remain retained.
