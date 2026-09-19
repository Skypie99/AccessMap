# R11 pg_net safety-control flow

## Before R11

`read retained pg_net history` -> `compare total count and full-table SHA-256 to one historical snapshot` -> `false HOLD when terminal old rows expire`

## After R11

`BEGIN TRANSACTION READ ONLY` -> `capture database T0 and pg_net.ttl` -> `require TTL > 600s` -> `require request queue = 0` -> `freeze T0 in entry envelope` -> `bind the same T0 into entry, monitoring, server adjudication, post-apply, exit, and post-exit SQL` -> `require queue = 0 and new responses since T0 = 0 at every checkpoint`

Total response count and fingerprint remain captured for diagnosis only. No equality comparison against historical response history participates in authorization.
