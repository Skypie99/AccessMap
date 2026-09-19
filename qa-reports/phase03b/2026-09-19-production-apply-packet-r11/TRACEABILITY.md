# R11 pg_net run-relative invariant traceability

R11 repairs exactly one authorized root defect: `VOLATILE_PG_NET_RESPONSE_HISTORY_USED_AS_AUTHORIZATION_IDENTITY`.

The old safety flow compared the whole retained `net._http_response` table with one historical count and SHA-256. Because pg_net response history expires under `pg_net.ttl`, safe expiry produced an executable false HOLD.

R11 replaces only that authorization gate. One read-only database transaction captures T0 and TTL before any future mutation. Entry, monitoring, server adjudication, post-apply, exit, and post-exit checkpoints all require the same T0, queue count zero, no response created at or after T0, and TTL greater than the 600-second maximum window. Total response count and fingerprint are still captured, but only as `DIAGNOSTIC_HISTORY_ONLY`.

The 14-case R11 matrix proves the permitted and rejected states, and one additional socket-only SQL check proves database-T0 binding in the gate lifecycle. The local replay also reruns all 217 accepted R10 checks and the preserved R7 suite. Candidate and migration bytes are unchanged.
