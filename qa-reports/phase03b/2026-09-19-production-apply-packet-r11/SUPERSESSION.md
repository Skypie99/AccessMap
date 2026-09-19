# R11 supersession boundary

R11 supersedes only R10's volatile full-table pg_net response-history equality gate. It preserves R10's validation-order repair and every accepted R9/R8/R7 control.

All three historical response fingerprints remain in `HISTORICAL_PGNET_FINGERPRINTS.json` as `DIAGNOSTIC_HISTORY_ONLY`. They cannot authorize or block a cutover. The executable safety invariant is now run-relative: immutable database T0, TTL greater than 600 seconds, queue zero, and no response row created at or after T0 at every existing checkpoint.

The frozen candidate and exact two migration files are unchanged. R11 is non-applying and carries no production authority. Under the program convergence rule, observations that do not demonstrate a concrete executable production-safety defect are deferred hardening, not grounds for another packet generation.

If fresh independent R11 review accepts the contract, the sequence is owner-controlled live read-only preflight, exact one-run production apply, independent post-apply verification, and Phase 03B closure.
