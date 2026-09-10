# FDA-028 retained ingestion boundary and architecture hold

Owner decision: **keep the exhausted budget across session resets; retain the architecture hold until a trusted mechanism is approved.** This supersedes the open interpretation of per-session quotas. No limiter, new identity mechanism, staging probe or gateway policy was implemented.

The complete source candidate remains unaccepted. The local FDA012 allowlist deliberately preserves the currently functioning guest flag/feedback paths while the replacement is blocked. Their presence is an open FDA028 dependency, never a bypass-prevention PASS.

| Current path at local source 0a6a6b03fd0cbe72f70f67260f6cab746e098f6a | Current boundary | Required future acceptance |
|---|---|---|
| `src/lib/flags.ts:1735` createAnonFlag; direct INSERT at 1773 | Caller-side pacing plus existing global database emergency cap | Route through the accepted trusted admission/budget check; remove direct guest INSERT only after replacement works |
| `src/lib/flags.ts:1243` createFlag; tagged INSERT at 1295 and fallback at 1309 | Authenticated owner payload; raw REST callers can also submit independent requests | Both payload shapes and any null-owner/anonymous-key route must be assessed against the same guest boundary |
| `src/lib/feedbackStore.ts:52` submitFeedback; guest INSERT at 83 | Write-only guest insertion, no row return | Preserve successful guest/report UX through the gateway and close the direct table route |
| `src/lib/feedbackStore.ts:90` authenticated feedback INSERT | Authenticated or null-owner values are governed by current RLS | Test both identities and null-owner variants; no alternate guest bypass |
| Direct REST table access and any exposed RPC or writable view | Object grants and RLS apply; FDA012 narrows payloads, not client identity | Enumerate and negatively test every alternate path, not only current TypeScript callers |

No existing deployed Edge Function supplies a guest-ingestion route. The approved branch lists notification v6, status notification v8 and deletion v4 with the captured production bundle hashes. Their source reads Authorization or webhook credentials; their manifests do not prove original-client metadata. None was invoked for this task, and their paths were not used for experimental probing.

The existing flag emergency function counts anonymous rows over an hour. The authenticated flag limiter uses its own daily user contract. These functions are preserved, not promoted into proof of independent clients or concurrency-safe new limiter behavior. New column grants prevent clients supplying server IDs/timestamps, but that is only one refusal check.

After a trusted mechanism is approved, the design must specify the provenance/anti-forgery rule, how client continuity survives resets, how new same-network clients retain independent normal budgets, atomic shared storage, time window and retention, operational cleanup, deterministic staging thresholds versus proposed production thresholds, and all bypass/restoration tests. It must not store raw IPs, emit internal or secret-derived bucket identifiers, or add device fingerprinting by implication.

The independent architecture review documents why IP HMAC and freely reissued session tokens do not meet the now-confirmed contract. Anonymous Auth and provider-linked device signals need separate privacy/authorization decisions; they were not adopted. Actual hosted metadata remains unverified. The existing CODE/INT-before-staging order has not been silently changed to deploy a probe.

## DECISIONS FOR SKY

The owner has chosen to retain the strict client-continuity contract and the architecture hold. No further routine permission is requested. The next substantive decision is approval of a specific trusted continuity/admission mechanism and its privacy costs. If such a design needs a pre-CODE metadata probe, its exact synthetic-only source, staging identity gate and removal plan also need an explicit sequencing exception. A general reapproval of staging is unnecessary.

Staging cleanup remains required. Early deletion is not authorized while CODE/INT/STAGE acceptance and the twelve cleanup prerequisites are incomplete. The exact disposable branch remains ctshxbykuemeqnofqcdh / 441acc38-d71c-4a87-883e-61ff87e0c52e. No production authorization packet is issued while these gates are blocked.
