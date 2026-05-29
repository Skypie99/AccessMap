---
role: Morgan (PM)
mode: ACTIVE (direct /morgan)
date: 2026-05-29
model_tier: Opus (Sky-initiated)
coherence_score: 0.82
state_consistency: pass
duplicate_work_detected: yes
drift_risk: high
---

# AccessMap — 05-30 unmerged branch triage (propose-only)

Scope: the newer unmerged branch set NOT on the 2026-05-29 ToDo tracker. Morgan-level triage only (minimal staged list per AGENT_OS — no implementation expansion). Reviewer routing recommended; no merges, no deletions (these aren't merged, so housekeeping delete authority does not apply).

## §5 Duplication Report (lead — this is the headline)
Duplicate HEAD commits — same work under multiple branch names:
- {agents: [claude/exciting-satoshi-25772e, feat/shared-status-badge-2026-05-30], overlap: identical tip 2a6361b, resolution: keep feat/shared-status-badge, retire the other}
- {agents: [fix/token-adoption-sprint2, feat/status-badge-callsites-2026-05-30], overlap: identical tip fbd3d68, resolution: keep feat/status-badge-callsites, retire the other}
- {agents: [docs/readme-v020-2026-05-30, docs/incident-response-2026-05-30], overlap: identical tip a0c6992, resolution: pick one canonical, retire the other}
Also: branch names mismatch their HEAD subjects across the set (e.g. docs/incident-response tip is a StatusBadge feat commit). **Recommendation: do NOT merge piecemeal — consolidate first.**

## Clusters (feature · status · blocker · suggested reviewer)
1. **StatusBadge shared component** — not merged — blocker: 3 duplicate branches, pick canonical — reviewer: Shamus (build) + Alex (a11y) + Gary (tests)
2. **v0.2.0 release/docs** (readme, release-notes, version-bump, beta-testing-guide) — not merged — blocker: overlaps StatusBadge tips; sequence after feature merges — reviewer: Will (docs) + Rory (version bump/release)
3. **Security hardening** (fix/security-hardening: flag rate-limit migration + iOS App Store plist keys; incident-response-steve: P0–P3 + GDPR playbook) — not merged — blocker: Jordan privacy review required — reviewer: Steve + Jordan
4. **D5 heatmap** (shamus/d5-heatmap-2026-05-29-new, qa/heatmap-test-plan, ci/lighthouse perf test) — not merged — blocker: none (D5 approved 2026-05-29) — reviewer: Shamus (build) + Peter (perf) + Gary (tests); Jordan pre-cleared
5. **D8 EXIF fix** (shamus/d8-exif-fix) — not merged — blocker: Sky device test (tracked) — reviewer: Steve + Jordan
6. **Guest UX** (fix/guest-ux) — not merged — blocker: Jordan check if auth/session touched — reviewer: Shamus + Jordan
7. **Chore** (chore/remove-stray-root-docs) — not merged — blocker: none, 1 commit, low risk — reviewer: Morgan housekeeping

## Jordan Phase-0 triggers (Const. Art. 7.6) — fire BEFORE merge
- Cluster 3 (security): RLS/rate-limit + GDPR notification → **Jordan required**
- Cluster 4 (heatmap): aggregate location display → Jordan **pre-cleared** (D5 spec)
- Cluster 5 (D8 EXIF): location metadata stripping → **Jordan required** (already in flight)
- Cluster 6 (guest UX): possible auth/session change → **Jordan check needed**

## Launch relevance
- **Launch-relevant:** Cluster 5 (D8 — the gate), Cluster 3 (iOS plist keys needed for App Store submission; rate-limit migration is a FILE for Sky to apply), Cluster 4 (D5, just approved).
- **Parallel / post-launch:** Clusters 1, 2, 6, 7 — useful but not gating.

## Morgan recommendation
1. Launch path is UNCHANGED and still gated only on D8 device test + SQL applies (both Sky). Do those first.
2. Treat the 05-30 set as a **consolidation pass, not a merge queue** — it needs duplicate-branch retirement before anything merges.
3. Sequence the two launch-relevant clusters (D5 heatmap, security/iOS-plist) for role review next; defer the docs/release/StatusBadge tangle to post-launch.
4. Morgan cannot retire the duplicate branches (they're unmerged — outside housekeeping delete authority). That retirement is a Sky/Rory action.
