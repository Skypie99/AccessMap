# Phase 03B production-apply packet R6 — two-defect traceability

Source R5 packet: `aeab11d6dedb6a6789abe1d3bb47b7bc9c89cf23`

Independent R5 review: `cbd32a182cd4c89f7d3ea5d110b119e48fa72930`

Root-defect count: **2**

| ID | Source evidence | Exact executable defect | Root cause | R6 repair and acceptance | Local tests | Candidate change |
|---|---|---|---|---|---|---|
| R6-D1 | R5 review lines 31–76; `r5_control_lib.mjs:206-236,466-475`; R5 controller `385-390` | A comparator can claim PASS with null or incomplete proof and wrong pinned digests, then drive exit or completion. | R5 checks outer and phase key sets, not exact expected values, full nested proof, step receipts, or proof-to-entry invariants. | Exact R6 envelope and phase validator pin producer/run/candidate/target, full proof keys and values, migrations, digests, structure, successful steps, and entry invariants. Every malformed, legacy, contradictory, or drifted form fails closed. | `d1_01`–`d1_25` | NO |
| R6-D2 | R5 review lines 78–116; R5 controller `129-146,421-428` | The final guard can pass below 600 seconds while the actual exit spawn occurs after 600 because its deadline is recomputed from the later clock. | Eligibility and spawning are separate, and the spawn primitive is not bound to the immutable maximum. | One restoration dispatcher performs all predicates and the immutable-deadline check in the same synchronous primitive that calls `spawn`. Direct exit-helper use is rejected; catch/finally/signal/retry/rollback/restart paths cannot restore. | `d2_01`–`d2_15` | NO |

R5-D2 entry ambiguity and R5-D4 hash-pinned server classification remain preserved controls, not R6 root-defect entries.
