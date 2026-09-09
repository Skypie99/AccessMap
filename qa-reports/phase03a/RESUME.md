# Phase 03A — persistent resume pointer

**Read this first on any Phase 03A resume.** Machine-readable twin: [state.json](state.json).

## Current generation

`qa-reports/phase03a/2026-09-09-fda028-recommendation/` — task **FDA-028 architecture recommendation**, status **IN_PROGRESS**.

## Frozen identity

| Item | Value |
|---|---|
| SOURCE_SHA | `0a6a6b03fd0cbe72f70f67260f6cab746e098f6a` |
| SOURCE_TREE | `857411dc733b93686d789a72e461856698bec814` |
| Branch | `repair/flagstone-p03a-backend-foundation-20260903` |
| Worktree | `/Users/skypie/AccessMap-codex/p03a-backend-foundation-20260903` |
| HEAD at checkpoint | `5d3ed0c8544872756cb99d48c076c0edcad4c529` / tree `3717664ce386850a5fac6a5f2f05ebfa845ef31c` |
| HEAD vs SOURCE | `qa-reports/` only; **0** non-QA changed files |

## Gates (unchanged by this generation)

BACKEND_FOUNDATION_GATE **BLOCKED** · PHASE_GATE **BLOCKED** · 03A-CODE **HOLD** · INT **NOT_RUN** · STAGE **NOT_RUN** · PRODUCTION **UNTOUCHED / NOT AUTHORIZED** · SAFE_TO_INTEGRATE **NO** · MAIN_MERGE_AUTHORIZED **NO** · PHASE_03B **NOT STARTED**.

All seven findings OPEN: FDA-009, FDA-010, FDA-012, FDA-021, FDA-023, FDA-026, FDA-028.

FDA-012 local subset: 217/217 pgTAP PASS, independently verified (generation `2026-09-05-owner-resume`).

## Owner-locked FDA-028 contract

> "Keep the budget across session resets; retain the architecture hold until a trusted mechanism is approved."

Not open to reinterpretation. Per-session substitution is NOT authorized. No trusted mechanism approved yet.

## Prior FDA-028 evidence (do not re-derive)

- `2026-09-05-owner-resume/FDA028_ARCHITECTURE_REVIEW.md` — platform trust-input evidence table; why IP-HMAC and reissuable session tokens fail.
- `2026-09-05-owner-resume/FDA028_INGESTION_BOUNDARY.md` — every current guest ingestion path and its required future acceptance.
- `2026-09-05-owner-resume/owner-rate-limit-decision.json` — the owner decision record.
- `2026-09-05-owner-resume/blocked-handoff.json` — full machine-readable gate state.

## Next safe action

Complete the FDA-028 architecture recommendation. **No implementation.** Owner approval required before any limiter code, migration, staging mutation or deployment.
