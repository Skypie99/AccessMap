# /new-window Compression Snapshot — 2026-05-29
**Project:** accessmap | **Compiler:** /new-window (Context Compression + Auto-Routing Engine)
**Scope of this session:** overnight Opus 4.8 audit → salvage → Morgan triage → routing. Spans AccessMap + Portfolio; compiled under active project = accessmap.

## 1. CONTEXT SNAPSHOT
Sky spent surplus Opus 4.8 budget on an exhaustive overnight bug + architecture audit of AccessMap and Portfolio. The first all-track workflow hit the account session usage limit mid-run; findings were salvaged from the workflow output JSON and a leaner bug-sweep was re-run. Morgan then compiled the findings into a prioritized to-do list, worked them into both projects' backlogs, surfaced the EXIF/D8 privacy blocker, and routed a re-audit to Steve + Jordan. In parallel, a concurrent agent chain delivered a D8 EXIF fix branch.

## 2. KEY ACTIONS
- Ran 2 Opus 4.8 audit workflows: `w309m0osj` (exhaustive, all tracks — hit session usage limit at ~8M tokens/230 agents) and `wpjzrq5g8` (leaner bug-sweep re-run, 24/19 bugs).
- Salvaged architecture (75) + bug (43) findings deterministically from workflow output JSON.
- Morgan triaged all findings P0/P1/P2 and integrated into backlogs; sent iMessage digest to Sky.
- Routed EXIF re-audit to Steve + Jordan (delegation briefs filed).
- Concurrent chain shipped D8 EXIF fix on `shamus/d8-exif-fix-2026-05-29` + Gary tests + Jordan signoff.

## 3. OUTCOMES
- Reports written: `2026-05-29_OvernightAudit_Opus48.md` (AccessMap + Portfolio), `2026-05-29_CrossProjectArch_AccessMap-Portfolio.md`, `cycle-2026-05-29-morgan-audit-followup.md`, `2026-05-29_Morgan_Steve_EXIF-ReAudit.md`, `2026-05-29_Morgan_Jordan_EXIF-ReAudit.md`.
- Backlogs: AccessMap/FEATURES.md got an "Audit follow-ups" section; Portfolio/FEATURES.md created.
- **D8 EXIF FIXED IN CODE** on `shamus/d8-exif-fix-2026-05-29` (`0969833`): `expo-image-manipulator` re-encode (fail-closed), avatar abort-gate, regression tests. Jordan: CLOSED-IN-CODE, pending real-device exiftool verify (iOS/Android/web) + EAS build before merge.
- Memory: `feedback_overnight_opus_audits.md` updated with the usage-limit scoping lesson.

## 4. DECISIONS MADE
- `[D8-EXIF-REGATE]` EXIF/D8 gate found non-functional by Opus audit; fixed on `shamus/d8-exif-fix-2026-05-29` (expo-image-manipulator + fail-closed avatar gate); Jordan APPROVED pending real-device exiftool verification + EAS build + merge. — 2026-05-29
- `[AUDIT-TODO-PHASING]` Opus audit to-dos triaged P0/P1/P2 and folded into both FEATURES.md backlogs (Phase 0 launch-gates, Phase 1 hardening, Phase 2 tech-debt). — 2026-05-29
- `[PORTFOLIO-LIVE-BLOCKERS]` Portfolio has P0 live-site bugs (basePath 404, wrong metadataBase, dup deploy workflows, missing cert images) → Rory + Shamus. — 2026-05-29
- `[OVERNIGHT-AUDIT-SCOPING]` Exhaustive multi-track Opus audits exceed one session usage limit; scope one track per run, salvage from output JSON. — 2026-05-29

## 5. NEXT ACTIONS
- **Shamus/Sky:** real-device exiftool verify D8 on `shamus/d8-exif-fix-2026-05-29` (iOS+Android+web) → then Sky merges.
- **Sky:** verify current `main` SHA; confirm overnight auto-merge didn't land prelaunch work before the EXIF fix.
- **Steve+Jordan:** reconcile the filed re-audit briefs against the D8 fix branch (the branch likely already satisfies them).
- **Rory+Shamus:** Portfolio live-site P0s (next/link, metadataBase, dedupe deploy workflow, restore cert images).
- **AccessMap P1 hardening:** bare `.select()` columns, realtime inline-merge vs tested fn, savePushToken swallowed error, modal-reset-on-reopen, web blob-URL leaks.
- **Sky:** pending SQL migrations still outstanding (email_privacy, D3 trigger, anon_flags_select, restrict_users_update_columns).

## 6. RISKS
- **Drift HIGH:** PROJECT_STATE was stale (2026-05-27) vs concurrent overnight merges + 2026-05-30 reports; multiple agents editing AccessMap concurrently (DECISIONS_LOG was clobbered once this session — EXIF entry re-inserted).
- **D8 fix is code-complete but UNVERIFIED on real devices;** `verifyExifStripped` remains a JPEG-only heuristic (blind to PNG iTXt/zTXt, WEBP, HEIC). Merging before exiftool real-device test re-risks the GPS leak.
- **Portfolio P0s are on the LIVE site** (push-to-main deploys instantly, no staging).

---

## DECISIONS FOR SKY
1. **Do not merge `shamus/d8-exif-fix-2026-05-29` until real-device `exiftool` verification passes** (iOS + Android + web) — the fix is code-correct and Jordan-approved but unverified on hardware; this is location data on a public bucket.
2. **Confirm current `main` SHA** and whether the overnight Gary→Rory auto-merge landed any prelaunch-blockers work before the EXIF fix existed.
3. **Pending SQL migrations** remain Sky-only: `users_email_privacy`, D3 `status_update_trigger`, `anon_flags_select`, `restrict_users_update_columns`.
4. **Portfolio live-site P0s** affect the deployed site now — approve the Rory/Shamus fix pass.
