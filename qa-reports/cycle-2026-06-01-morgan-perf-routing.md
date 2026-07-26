---
role: Morgan (PM)
date: 2026-06-01
mode: ACTIVE (direct /morgan, in-session delivery — no iMessage per Sky override 2026-05-28)
trigger: Sky — "get Gary to do P3 if it's a good idea, and have an expert decide for P4 and P1"
model_tier: opus (Sky-initiated, interactive)
coherence_score: 0.95
state_consistency: pass
duplicate_work_detected: no
drift_risk: medium  # live-DB↔repo RLS drift open (Steve); shared-tree churn active across qa-* worktrees
---

# Cycle — Perf roadmap routing (P3 / P4 / P1)

## §1 Dependency Graph
nodes:
- peter/perf#P3-indexes (Peter, DB indexes) — DONE
- peter/perf#P1-thumbnails (Peter, proposal) — needs decision
- peter/perf#P4-rls (Peter, proposal) — handed off
- jordan/p1-photo-privacy (Jordan, privacy gate)
- steve/p4-rls-initplan (Steve, RLS/security)
- sky/p1-paid-tier (Sky, cost decision)
- morgan/relay-peter-report (Morgan, relay)

edges:
- peter/perf#P1-thumbnails → jordan/p1-photo-privacy (gate: privacy review of upload-flow change)
- peter/perf#P1-thumbnails → sky/p1-paid-tier (gate: pay-for-Pro vs build-free fork)
- peter/perf#P4-rls → steve/p4-rls-initplan (gate: fold into qa-steve security migrations)
- steve/p4-rls-initplan → sky/apply-migrations (gate: Sky applies; no live-DB writes by agents)

## §2 Reason for Ordering
- **P3 needs no further work / no Gary.** Index migrations already applied to the live DB (Sky via Cowork) + recorded as `supabase/migrations/2026-06-01_perf_fk_covering_indexes.sql` on `qa-peter/accessmap-2026-06-01` (verified via `git show`); advisors `duplicate_index` + `unindexed_foreign_keys` cleared. Gary owns QA scope/testing (Const. 9.4 routing table) — **not** DB migrations (that's Dana). Peter already ran the full jest gate green (94/94 suites, 1553 passed). No QA deliverable exists for P3 → dispatching Gary would be no-op work.
- **P4 → Steve** (Const. 9.4: Security/RLS → Steve). `auth_rls_initplan` + `multiple_permissive_policies` are RLS-policy changes. Steve's `qa-steve/accessmap-2026-06-01` is active (tip `34d70e3`, "final pre-tester security/robustness QA report") and already flags a HIGH on the **same** `flags_auth_user_only` policy family with propose-only migrations awaiting Sky → P4 folds into that set, no new branch.
- **P1 → Jordan + Sky.** Jordan-trigger (Const. 7.6): the upload-time-thumbnail path touches photo handling + new data persistence (`photo_thumb_url`) → Jordan reviews. Precedent: Jordan owns this surface (`qa-reports/INDEX.md` → 2026-05-28 Jordan EXIF Privacy Audit ✅ APPROVE). The paid Supabase-Pro transform path is a **cost** decision → Sky only (not delegable; Const. 9.4 — Sky is backstop for spend).
- **Worktree isolation upheld.** All three audits (qa-peter/qa-steve/qa-alex) on separate branches + worktrees — LEARNINGS:2026-05-25 — Concurrent agent commits to the same branch (use worktree isolation, distinct branch names). Honored.

## §3 Blocked Nodes
- {node: sky/p1-paid-tier, why: "Supabase Storage image transforms require a paid Pro upgrade — spend decision", unblock: "Sky chooses Pro-transform (paid) vs upload-time-thumbnail (free)", type: DECISION_FOR_SKY}
- {node: jordan/p1-photo-privacy, why: "free thumbnail path adds an upload-flow step + a stored thumb URL", unblock: "Jordan privacy sign-off (expected APPROVE — resize of already-EXIF-stripped image, no new collection)", type: BLOCKER}
- {node: steve/p4-rls-initplan, why: "RLS rewrite is Steve's domain; lands in his propose-only migration set", unblock: "Steve adds (select auth.uid()) rewrite + policy consolidation to qa-steve; Sky applies", type: BLOCKER}
- {node: gary/p3, why: "P3 already complete + out of Gary's domain", unblock: "N/A — closed, do not dispatch", type: MISSING_INPUT}

## §4 Checkpoint References
- {name: P3 indexes recorded, role: Peter, artifact: branch:qa-peter/accessmap-2026-06-01 (commit:9a2befb), qa-report: qa-reports/2026-06-01_Performance_QA_Report.md}
- {name: Perf audit gate green, role: Peter, artifact: commit:95ef434 (C1) + jest 94/94 suites 1553 passed, qa-report: qa-reports/2026-06-01_Performance_QA_Report.md}
- {name: Security audit + RLS HIGH, role: Steve, artifact: branch:qa-steve/accessmap-2026-06-01 (commit:34d70e3), qa-report: see qa-steve security report}
- {name: A11y audit, role: Alex, artifact: branch:qa-alex/accessmap-2026-06-01, qa-report: qa-reports/ (Alex final pre-tester)}

## §5 Duplication Report
- {agents: [Peter, Steve], overlap: "RLS auth_rls_initplan + flags policies (P4)", resolution: "Peter flagged + explicitly deferred (did not touch schema.sql); Steve owns. Clean handoff, NOT duplicate work — Steve keeps it."}

## §6 State Snapshot
- Perf audit (Peter): COMPLETE — branch `qa-peter/accessmap-2026-06-01` not merged; gate green; report + plan + P3 migration committed. Awaits `/morgan` relay (this) + Sky merge.
- Routing assigned: P4 → Steve (fold into qa-steve); P1 → Jordan (privacy) + Sky (cost). P3 → CLOSED (done; no Gary).
- **PROJECT_STATE.md / DECISIONS_LOG.md / TASK_GRAPH.json updates DEFERRED** this cycle: the main working tree is currently checked out on `qa-steve` with those three files mid-edit by the concurrent security agent (`git status` dirty). Editing them now would clobber in-flight work (Const. 10 cross-role conflict; LEARNINGS:2026-05-25 concurrent-tree collision). Durable snapshot is this report; state files reconcile post-merge. Surfaced, not silently omitted.

## §7 Execution Plan Summary
- READY: jordan/p1-photo-privacy (async gate), steve/p4-rls-initplan (async gate, into existing branch).
- LOCKED: sky/p1-paid-tier (Sky), sky/apply-migrations (Sky).
- CLOSED: gary/p3, peter/perf#P3-indexes.
- Critical path: none blocks testers — all items are post-launch scale work. acyclic: true.

## DECISION UPDATE (Sky, in-session 2026-06-01)
- **P1 = FREE PATH** (upload-time thumbnail). Paid Pro-transform path dropped. sky/p1-paid-tier → RESOLVED (chose free).
- **Jordan privacy gate DISPATCHED (async, Sonnet tier).** Scope: review the upload-time-thumbnail approach. Morgan pre-assessment = LOW risk, expected APPROVE WITH CONDITIONS:
  1. Generate the thumbnail from the **already-EXIF-stripped** buffer (not the original) — `uploadFlagPhoto` strips EXIF pre-upload; the thumb must derive from the stripped bytes so no GPS/metadata leaks. (Const. 7.6 location/PII trigger.)
  2. Store under the same owner-scoped path `<userId>/...` so Storage RLS still holds (load-bearing gotcha #4).
  3. No new PII — thumb is a downscale of already-approved content. Precedent: Jordan EXIF Privacy Audit ✅ APPROVE (qa-reports/INDEX.md 2026-05-28).
- **Build staged BEHIND Jordan's gate** (post-launch; does not block testers):
  - dana/p1-thumb-schema: propose-only migration FILE adding `photo_thumb_url` (or `flag_photos.thumb_url`) — not applied to live DB.
  - shamus/p1-thumb-build: in `uploadFlagPhoto` resize via expo-image-manipulator (already a dep) → upload thumb → store URL; render thumb in callouts/Tasks/Profile, full image only in lightbox. Targets [PlatformMap.tsx:233] + [flags.ts:364].
- Edges: shamus/p1-thumb-build → jordan/p1-photo-privacy (gate: APPROVE) → dana/p1-thumb-schema (gate: column exists). Models: Jordan/Dana/Shamus = Sonnet (Const. Art. 1.5) — NOT Opus.

## P2 SEQUENCING (Sky, in-session 2026-06-01) — "P2, Gary can do this after that is fixed"
- **P2 = viewport/bbox flag query. SCHEDULED AFTER P1** (do not start concurrently — Sky directive + avoids touching flagsStore/MapScreen while P1's thumbnail build is in flight). Gate: `peter/perf#P1-thumbnails` DONE/merged.
- Role split (P2 IS a real behavior change → unlike P3, Gary has a genuine deliverable here):
  - dana/p2-bbox-index: propose-only migration FILE — bbox composite index (lightweight) OR PostGIS geography + GiST + `flags_in_view` RPC (scalable). Not applied to live DB.
  - peter+shamus/p2-viewport-fetch: debounced fetch-by-map-region in `flagsStore.tsx`/`MapScreen.tsx` (.gte/.lte lat/lng or rpc('flags_in_view')).
  - **gary/p2-qa-gate**: test coverage for the new viewport query (bbox-filter correctness, debounce, no regression of the recency feed) + suite green. This is Gary's correct role — QA gate, not the build.
- Jordan-trigger (Const. 7.6): P2 reads flags by LOCATION (map region) → location-data trigger → Jordan confirms the viewport query exposes no more than the existing feed (likely trivial — same RLS-gated rows, just bbox-filtered).
- Edges: gary/p2-qa-gate → peter+shamus/p2-viewport-fetch (gate: behavior built) → dana/p2-bbox-index (gate: index/RPC exists); whole P2 chain → P1 DONE. Models: all Sonnet/Haiku — NOT Opus.
