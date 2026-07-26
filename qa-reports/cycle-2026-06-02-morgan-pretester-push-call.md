---
role: Morgan (PM)
date: 2026-06-02
trigger: direct /morgan ("what do you think") — in-session delivery (no iMessage per Sky override 2026-05-28)
model_tier: (Sky-initiated session)
coherence_score: 0.96
state_consistency: pass
duplicate_work_detected: no
drift_risk: low
---

# Morgan briefing — AccessMap pre-tester state + GitHub push call

## DECISIONS FOR SKY (lead)

1. **Push local `main` → GitHub?** — **HELD. The repo is PUBLIC (`Skypie99/AccessMap`)
   and the push would publish the hardcoded reviewer test password (`AccessMap2026!`,
   `supabase/migrations/2026-05-31_reviewer_test_account.sql`).** Build automation is safe
   (`eas-build.yml` + `eas-testflight-submit.yml` are `workflow_dispatch`-only; TestFlight
   gated behind `release-approval` env w/ Sky as required reviewer; push triggers only
   `ci.yml`) — so no accidental ship. But content exposure on a public repo is the gate.
   Secret scan of the 72-commit delta = clean EXCEPT that one test password (.env not
   tracked, no JWT/service_role keys, husky pre-commit secret-scan present). **Recommend:
   rotate the reviewer account to a fresh dashboard-set password so the committed string is
   dead, redact the file, THEN push.** type: DECISION_FOR_SKY. (Const. Art. 9 + "publishing
   may be cached/indexed even if later deleted".)
2. **Anon precise lat/lng on the public map** — privacy sign-off still pending (Jordan
   pre-approved, not legal). Jordan-trigger: LOCATION DATA. type: DECISION_FOR_SKY.
3. **Live-DB follow-ups (Dana, your approval to apply):** F2 then F3 migrations
   (dry-run on preview first); rotate 2 hardcoded webhook secrets; drop the duplicate
   `AFTER UPDATE OF status` trigger (double-points). None block the code/push.

## §1 Dependency Graph
nodes:
- gary/qa-merge#consolidate (Gary, merge) — DONE
- gary/map-pill-fix (Gary, fix) — DONE
- sky/push-origin (Sky/Gary, publish) — READY (Sky go)
- ondevice/a11y-smoke (Alex+Sky device, verify) — READY
- dana/f2-f3-migrations (Dana, apply) — BLOCKED (Sky approval)
- dana/secret-rotation+dup-trigger (Dana, apply) — BLOCKED (Sky approval)
edges:
- ondevice/a11y-smoke → gary/qa-merge#consolidate (gate: 2 HIGH fixes are SR-operability, only confirmable on-device)
- testers/release → ondevice/a11y-smoke (gate: device pass)
- testers/release → dana/f2-f3-migrations (gate: security hardening live)

## §2 Reason for Ordering
- Push is safe NOW because EAS build + TestFlight are dispatch-only — encodes
  `LEARNINGS:2026-05-28 — no unattended builds` (the workflow comments cite this rule).
- Push stays Sky's trigger per **Const. Art. 9** (only Sky external side effects / merges).
- Device a11y smoke gates testers, not the push: the 2 HIGH fixes (`1b53c9a` switches,
  `1afbb15` admin) are screen-reader OPERABILITY — a screenshot/unit test can't confirm a
  double-tap actually flips the control; cite `qa-reports/2026-06-01_Accessibility_UX_QA_Report.md`.
- F2/F3 + secret rotation are live-DB → **Const. Art. 5** (never auto-apply to prod) → Dana + Sky.

## §3 Blocked Nodes
- {node: dana/f2-f3-migrations, why: live-DB change, unblock: Sky approval + preview dry-run, type: DECISION_FOR_SKY}
- {node: dana/secret-rotation+dup-trigger, why: live-DB + secrets, unblock: Sky approval, type: DECISION_FOR_SKY}
- {node: testers/release, why: on-device a11y + security hardening not yet done, unblock: device pass + F2/F3, type: BLOCKER}

## §4 Checkpoint References
- {name: QA consolidation, role: Gary, artifact: commit:db7d1c6 (tag qa-merge-2026-06-02), qa-report: qa-reports/2026-06-02_Final_QA_Merge_Report.md}
- {name: Map pill fix, role: Gary, artifact: commit:708e23f, qa-report: this file}
- {name: Verification, role: Gary, artifact: full suite 1564/0, 95 suites; typecheck clean; lint 0 err; iOS+Android bundles}

## §5 Duplication Report
No duplications detected this cycle. (Gary correctly SKIPPED stale qa-steve — its security
work was already in main per `git cherry`; merging would have duplicated Alex's a11y commits.)

## §6 State Snapshot
- main: 708e23f (72 ahead of origin, NOT pushed). Revert anchor: abdc25c. Tag: qa-merge-2026-06-02.
- Open branches integrated: qa-peter, qa-alex (via qa-merge). qa-steve intentionally not merged.
- Propose-only (NOT live): F2 function_exec_and_search_path_hardening → F3 flag_photos_insert_guard.
- Verdict: CODE READY. Tester release gated on device-a11y + security follow-ups, not on the push.

## UPDATE (same cycle) — push done + 3 gates complete
- **Pushed:** redacted reviewer password (c51c46a), fixed eas.json duplicate profiles (0908dc5); `origin/main` now at 0908dc5 (repo is PUBLIC — published the redacted tree; reviewer account must be provisioned with a fresh password).
- **Dana gate** (qa-reports/2026-06-02_Dana_PreTester_Security_Gate.md): READY-TO-APPLY. Verified live read-only: F2 gap (proconfig NULL ×2), F3 gap (flag_photos WITH CHECK true), webhook secret in pg_trigger.tgargs on notify-flag-status, duplicate trigger trigger_flag_status_change (double-points), reviewer account = 0 rows. Apply order: rotate-secret → F2 (preview→prod) → F3 → drop dup trigger → provision reviewer. ALL live = Sky.
- **Alex gate** (qa-reports/2026-06-02_Alex_PreTester_A11y_Gate.md): code-side PASS (12 fixes confirmed); device VoiceOver/TalkBack script ready → Sky runs on real iPhone+Android.
- **Rory pre-flight** (qa-reports/2026-06-02_Rory_EAS_TestFlight_PreFlight.md): BLOCKED→ BLOCK1 (eas.json dupes) FIXED+pushed (0908dc5). BLOCK2 (submit workflow hardcodes --profile production, testflight profile not offered) FLAGGED — off critical path (local-CLI path works; the GitHub submit workflow is not-yet-armed). WARN: `eas secret:list` before build. All else PASS (ASC 6774709116, Team S78F8ZA8QU, ios/ gitignored CNG no-drift, Sentry removed, dispatch-only, typecheck 0).
- **Build-ready verdict:** GREEN via local CLI (`eas build --profile testflight` → `eas submit --profile production`) after `eas secret:list` + the Dana/Alex gates. BLOCK2 = fix before arming the GitHub submit workflow (route to Rory).

## UPDATE 2 — security gate progress (live)
- ✅ **Duplicate trigger DROPPED + Morgan-verified live** (2026-06-02): Sky ran it via Cowork; read-only `pg_trigger` query confirms exactly one `on_flag_status_change` remains on `public.flags`. Double-points bug resolved (forward-looking; pre-tester data volume so historical impact negligible). 1 of 5 Dana items done.
- Remaining Sky-hands items: Step 0 webhook-secret rotation (then Morgan/Dana hands the trigger-recreate SQL), F2 (preview→prod), F3 (preview→prod), reviewer account. Plus Alex device a11y pass + the EAS build. All HARD-GATED to Sky (live DB / credentials / app-store submit).

## UPDATE 3 — security steps delegated (Const. 9.4 routing)
- **Dana (Backend)** — DISPATCHED: prep the Vault-based webhook-secret rotation (trigger-recreate SQL w/o inline literal + any Edge-Function edit + ordered Sky runbook). Lead on SQL + read-only verification after each apply. → 2026-06-02_Dana_WebhookSecret_Rotation_Runbook.md
- **Steve (Security)** — DISPATCHED: sign-off on the rotation design + F2/F3, incl. the critical check that F2's EXECUTE revoke won't break trigger firing. → 2026-06-02_Steve_PreTester_Security_SignOff.md
- **Jordan (Privacy)** — light-touch: F2/F3 are access-TIGHTENING (privacy-positive, no new data). Not a Const-7.6 build-feature, so no Phase-0 block; formal pass on request or if Steve flags.
- **Sky** — executes the live applies + secret generation + reviewer account (hard gate). **Morgan** — consolidates Dana+Steve into one turnkey runbook + tracks.
