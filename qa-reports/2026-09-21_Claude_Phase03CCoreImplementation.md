# 2026-09-21 — Phase 03C Core Implementation (anon public-read contract)

**Status: LOCAL_CANDIDATE_READY_FOR_INDEPENDENT_ACCEPTANCE.** Not merged, not pushed, no
production/staging contact.

Full detail: `qa-reports/phase03c/20260921T053411Z-opus-core/` (Opus core: recon challenge,
architecture decision, implementation results, Sonnet handoff) and
`qa-reports/phase03c/20260921T060125Z-sonnet-completion/FINAL_LOCAL_ACCEPTANCE.md` (this
completion pass's full local acceptance evidence).

## One-line summary

Production's existing anonymous-read database boundary already matched the intended Phase 03C
contract. No migration was needed. Phase 03C added executable proof of that boundary (an
85-assertion pgTAP suite, 208/208 combined with the unchanged Phase 03B suites) and fixed one
inaccurate privacy comment in the client (`src/lib/flags.ts`, line-neutral, no behavior change).

## Decisions for Sky (copied verbatim from `09_PRIVACY_ARCHITECTURE_DECISION.md` §7 — not
re-decided here)

- **D-1** — Guests see only the primary flag photo, not the full gallery. Recommendation: keep
  as-is (more private; broadening it would widen anon access). Not blocking.
- **D-2** — Optional defense-in-depth DB policies around the Stage-A compatibility grants.
  Recommendation: leave for Stage B rather than a standalone apply. Not blocking.
- **D-3** — Any signed-up (free) account can map a report's pseudonymous `user_id` to a display
  name, which is broader than the founding "anon can't" premise. Routed to Jordan for
  confirmation/scheduling, not silently changed. Not blocking.
- **D-4** — The repo's newer `delete-account` client source must not be deployed before its
  required RPCs exist in production. Operational constraint; no deployment authorized here.
  Not blocking.

## Acceptance evidence (this pass)

- 208/208 SQL privacy/regression assertions pass on a local, socket-only, TCP-disabled disposable
  Postgres cluster (pgTAP hash-pinned and re-verified).
- Phase 03B regression (forward/rollback/reapply) passes unchanged.
- `npx tsc --noEmit` clean; `npm run lint` 0 errors; `npm run contract:check` current.
- Full Jest: 297/297 suites, 4390 passed, 32 todo, 0 failed (reproduced twice after diagnosing one
  transient parallel-worker flake in two unrelated UI test files — see the full report for detail).

## Next step

An independent fresh reviewer should accept this exact candidate
(`0224ef20ac6a2824c4e06e83ab68ff6c615a40a6`) before Sky's own merge decision. Sky alone merges.
