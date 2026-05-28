# AccessMap — Decisions Log

Structural decisions, append-only. New entries at the top. Do NOT re-litigate entries without Sky approval — conflicts with logged decisions are BLOCKERs (VL Coherence Check 1).

---

## 2026-05-28 — D5 Resolved: Heatmap Severity Gradient Approved

- **Decision:** Use gradient colour ramp (green→yellow→red) for heatmap severity, with numeric labels and HeatmapLegend to satisfy 1.4.1.
- **Rationale:** Sky approved gradient rendering on 2026-05-28. Jordan pre-approved with k≥3 floor and severity disclosure conditions. Alex confirmed WCAG 2.2 AA compliance with numeric cell badges + legend.
- **Supersedes:** D5 (Open Decision — now RESOLVED).
- **Authority:** Sky (approval) + Alex (WCAG gate)

## 2026-05-28 — EXIF Metadata Stripping Added to Photo Upload

- **Decision:** Strip EXIF metadata (GPS, timestamps, camera info) from all flag photos before upload to Supabase Storage, on both native (expo-media-library) and web (Canvas re-encode) platforms.
- **Rationale:** Jordan (2026-05-28) flagged GPS leakage via EXIF as a critical privacy threat. Users with disabilities upload photos; precise GPS in EXIF + public Storage bucket = doxing risk. Steve Option A approved: client-side stripping via native transcode.
- **Supersedes:** Nothing (new capability).
- **Authority:** Jordan (privacy gate) + Steve (security gate) + Sky (implicit — EXIF strip is privacy-mandatory, no Sky reversal needed)

## 2026-05-28 — Steve Security Wave 2 Approved (email PII migration added)

- **Decision:** `2026-05-27_users_email_privacy.sql` approved for Sky to apply. Revokes `email` column from the `authenticated` role's SELECT grant on `public.users`, closing the full-email-dump REST vulnerability.
- **Rationale:** Current RLS policy allows any authenticated client to `SELECT email` from all users. Email + display_name is enough to identify AccessMap users. Steve wave 2 audit confirmed the blast radius is zero (app reads email from JWT, not from public.users for non-self rows).
- **Supersedes:** Nothing (new security migration).
- **Authority:** Steve (security domain gate)

## 2026-05-24 — Bootstrap Velocity Loop State Files

- **Decision:** Create PROJECT_STATE.md, DECISIONS_LOG.md, TASK_GRAPH.json for AccessMap as first-cycle bootstrap.
- **Rationale:** AGENT_OS v1.14 STATE AUTHORITY requires these three files as canonical state authority for all ACTIVE projects. Files were absent; every orchestrator run was rebuilding state from conversation context — a coherence risk. Morgan created them on first post-project audit cycle.
- **Supersedes:** Nothing (first entry).
- **Authority:** Morgan (ACTIVE mode — direct invocation; reversible write to project root per Const. 5.5)
