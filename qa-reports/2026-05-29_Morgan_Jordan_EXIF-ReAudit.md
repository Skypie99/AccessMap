# Morgan → Jordan: DELEGATION — EXIF/GPS Privacy Re-Audit (P0)
**Date:** 2026-05-29 | **From:** Morgan (direct `/morgan`) | **To:** Jordan (Legal/Privacy Advisor)
**Model tier:** Sonnet | **Priority:** P0 — pre-launch BLOCKER | **Mode:** AUDIT-ONLY
**Jordan-trigger (Const. Art. 7.6):** LOCATION DATA — fires Phase-0 review before any launch/merge.

## Why you're being routed this (Const. Art. 9.4)
You APPROVED the EXIF privacy gate twice on 2026-05-28 (`2026-05-28_Jordan_ExifPrivacyAudit.md`, `..._ReAudit.md`). The 2026-05-29 Opus 4.8 audit found the implementation those approvals relied on is non-functional, so the approval is void and must be re-issued against the ACTUAL behavior. This is not a re-litigation — it's new evidence (DECISIONS_LOG.md 2026-05-29).

## The privacy exposure to assess
On iOS/Android, a user's photo (flag OR avatar) with embedded GPS EXIF uploads **unstripped** to a **public-read** bucket with a deterministic, user-scoped path. A home selfie avatar therefore publishes the user's home coordinates. Population is disabled users (heightened sensitivity, PIPEDA + Const. Art. 7).

## What I need from you → `qa-reports/2026-05-29_Jordan_EXIF-ReAudit.md`
1. Confirm the data-exposure chain (location data → public URL) and severity rating.
2. **APPROVE-WITH-CONDITIONS or BLOCK** the fix Steve/Shamus will implement (shared strip+verify helper, hard-gated, real-GPS-JPEG test). State the exact conditions (e.g., gate must throw, must cover PNG/WEBP/HEIC, must block upload on any detected marker).
3. Whether existing already-uploaded photos need remediation (were any real user photos uploaded unstripped? — likely none pre-launch, but state it).
4. BLOCK → I surface as DECISION FOR SKY. Note: you are NOT a lawyer; flag if professional legal review is warranted before public launch.

## Guardrails
Read-only. No code, no DB. Findings + conditions only. Privacy-irreversible concerns → Morgan → Sky.
