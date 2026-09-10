# Phase 03A — persistent resume pointer

**Read this first on any Phase 03A resume.** Machine-readable twin: [state.json](state.json).

## Current generation

`qa-reports/phase03a/2026-09-09-gab3/` — task **F28-A probe + FDA028-GAB-3**, status **COMPLETE — BLOCKED**. F28-A PASS (narrowed). v3 review HOLD, 3 MUST-FIX. Probe REMOVED_VERIFIED.

**NEXT SAFE ACTION: put the three v3 MUST-FIX blockers to Sky and await direction.** FDA-028 gate is **HOLD**. F28-A is PASS; the v3 independent review returned HOLD. No implementation, no v4, no staging mutation.

## Frozen identity

| Item | Value |
|---|---|
| SOURCE_SHA | `0a6a6b03fd0cbe72f70f67260f6cab746e098f6a` |
| SOURCE_TREE | `857411dc733b93686d789a72e461856698bec814` |
| Branch | `repair/flagstone-p03a-backend-foundation-20260903` |
| Worktree | `/Users/skypie/AccessMap-codex/p03a-backend-foundation-20260903` |
| Non-QA files changed by this generation | **0** — every commit is `qa-reports/` only |

## Gates (unchanged by this generation)

BACKEND_FOUNDATION_GATE **BLOCKED** · PHASE_GATE **BLOCKED** · 03A-CODE **HOLD** · INT **NOT_RUN** · STAGE **NOT_RUN** · PRODUCTION **UNTOUCHED / NOT AUTHORIZED** · SAFE_TO_INTEGRATE **NO** · MAIN_MERGE_AUTHORIZED **NO** · PHASE_03B **NOT STARTED**.

All seven findings OPEN: FDA-009, FDA-010, FDA-012, FDA-021, FDA-023, FDA-026, FDA-028.

FDA-012 local subset: 217/217 pgTAP PASS, independently verified (generation `2026-09-05-owner-resume`).

## Owner-locked FDA-028 contract

> "Keep the budget across session resets; retain the architecture hold until a trusted mechanism is approved."

Not open to reinterpretation. Per-session substitution is NOT authorized. **No mechanism is approved yet.**

## FDA-028 recommendation — read in this order

1. **[FDA028_RECOMMENDATION_V2.md](2026-09-09-fda028-recommendation/FDA028_RECOMMENDATION_V2.md)** — the preferred recommendation, `FDA028-GAB-2-20260909`. **This is the live one.**
2. [INDEPENDENT_REVIEW.md](2026-09-09-fda028-recommendation/INDEPENDENT_REVIEW.md) — verdict ACCEPT_WITH_MANDATORY_CHANGES on v1; two claims FALSIFIED.
3. [author-verification-postgres.json](2026-09-09-fda028-recommendation/author-verification-postgres.json) — both falsifications reproduced on PostgreSQL 17.11; corrected design verified.
4. [evidence-platform-and-boundary.json](2026-09-09-fda028-recommendation/evidence-platform-and-boundary.json) — platform trust-input evidence; F28-A still OPEN.
5. [fda028-gate.json](2026-09-09-fda028-recommendation/fda028-gate.json) — machine-readable gate state.
6. [FDA028_RECOMMENDATION.md](2026-09-09-fda028-recommendation/FDA028_RECOMMENDATION.md) — **v1, SUPERSEDED. Do not implement.** Kept byte-identical because the review cites its line numbers.

Artifact hashes: [artifact-hashes.txt](2026-09-09-fda028-recommendation/artifact-hashes.txt).

## Prior FDA-028 evidence (do not re-derive)

- `2026-09-05-owner-resume/FDA028_ARCHITECTURE_REVIEW.md` — platform trust-input evidence; why IP-HMAC and reissuable session tokens fail alone.
- `2026-09-05-owner-resume/FDA028_INGESTION_BOUNDARY.md` — every current guest ingestion path.
- `2026-09-05-owner-resume/owner-rate-limit-decision.json` — the owner decision record.
- `2026-09-05-owner-resume/blocked-handoff.json` — full machine-readable gate state.

## If approved, the bounded scope that becomes authorized

Local-only implementation of `FDA028-GAB-2-20260909` as forward/restoration migration pairs plus one Edge Function, with the full LOCAL_TEST_PLAN — **no** staging mutation, **no** deployment, **no** integration, **no** T1 bypass closure. Staging and T1 are separate later decisions.
