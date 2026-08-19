# Morgan — EAS Build → TestFlight Readiness Check
**Mode:** Direct `/morgan` (interactive) · **Date:** 2026-07-30 · **delta_vs:** none (first check of this kind)

```yaml
model_tier: Sonnet 5 (direct interactive session)
coherence_score: 0.60
state_consistency: fail
duplicate_work_detected: no
drift_risk: high
```

`state_consistency: fail` because PROJECT_STATE.md / DECISIONS_LOG.md / TASK_GRAPH.json are five+ weeks stale (last touched 2026-06-20) and describe the Phase 7a–13 editorial overhaul as the current frontier — they don't mention the entire r2-audit merge train or any of the three ship-ready runs that have happened since. Everything below comes from live git/eas-cli state, verified today, not from those files.

**LEARNINGS consulted:** LEARNINGS_INDEX.md (52 entries, index itself last regenerated 2026-05-29 — same staleness gap). No entry directly covers EAS build profiles; cited instead: `[[feedback_eas_build_profiles]]` (session memory: use `testflight` profile, not `preview`).

---

## DECISIONS FOR SKY

1. **Which tree do you want this build to represent?** You're currently checked out on `shipready/3-polish-submission` (85 commits / 241 files ahead of `main`, not merged), not `main`. Building from here tests the full Run-3 privacy/moderation/ToS body of work — which is also the concrete way to close out **SR-021** (see §3). Building from `main` gives you a smaller, already-known-good surface. Your call; I haven't switched branches.
2. **Working-tree hygiene before you build (optional but recommended):** one tracked-file deletion (`.claude/launch.json`) and ~258 MB of untracked design-review assets (`design-reviews/*/assets/`, `qa-reports/assets/`, `_to_delete/`) sit in the working directory with no `.easignore` to exclude them. `eas build` archives whatever's on disk minus `.gitignore` matches, so that ~258 MB likely rides along in the upload. Won't break the build, will slow the upload.
3. **State-file refresh** — PROJECT_STATE.md/DECISIONS_LOG.md/TASK_GRAPH.json need a dedicated pass to catch up on ~40 days of work (r2 audit bp1–17/mp0–5, ship-ready runs 1–3). Didn't do it in this cycle — the gap is too large to summarize accurately without a pass built for that purpose, and a rushed rewrite would be worse than the current, clearly-stale version. Say the word and I'll scope it separately.

---

## §1 Dependency Graph

nodes:
- `morgan/eas-readiness#git-state` (Morgan, verify)
- `morgan/eas-readiness#config-check` (Morgan, verify)
- `morgan/eas-readiness#infra-check` (Morgan, verify)
- `morgan/eas-readiness#typecheck` (Morgan, verify)
- `sky/eas-build#run` (Sky, execute)
- `sky/testflight#install-test` (Sky, execute)
- `sky/merge-decision#shipready-3` (Sky, decide)
- `sky/creds#rotate-reviewer` (Sky, execute — separate track)

edges:
- `morgan/eas-readiness#git-state` → `sky/eas-build#run` (gate: confirms which branch/working-tree state actually gets packaged)
- `morgan/eas-readiness#config-check` → `sky/eas-build#run` (gate: `testflight` profile, bundle id, signing target all confirmed correct)
- `morgan/eas-readiness#infra-check` → `sky/eas-build#run` (gate: EAS login live, Supabase prod env present, prior build history proves credentials work)
- `morgan/eas-readiness#typecheck` → `sky/eas-build#run` (gate: current tree compiles clean)
- `sky/eas-build#run` → `sky/testflight#install-test` (gate: build must finish before install)
- `sky/testflight#install-test` → `sky/merge-decision#shipready-3` (gate: device-launch evidence informs whether/when Run 3 merges)

## §2 Reason for Ordering

- Only Sky merges `main` — Const. Art. 1, directly cited in the branch's own doc: `design-reviews/ship-ready/HANDOFF.md:3` ("STOP FOR SKY'S MERGE (Const. Art. 1)"). → governs why `sky/merge-decision#shipready-3` is Sky's node, not mine.
- Agents cannot run EAS — `TASK_GRAPH.json:7` ("Agents CANNOT run EAS"). → governs why `sky/eas-build#run` and `sky/testflight#install-test` are Sky's nodes; my role stops at verification.
- Use the `testflight` build profile, not `preview` (preview is an internal link, not TestFlight) — `[[feedback_eas_build_profiles]]` (session memory, prior correction). → governs the profile-check in `config-check`.
- SR-021 ("no binary-launch evidence exists at all — the first proof this app launches on iOS is Sky's next EAS build") — `design-reviews/ship-ready/HANDOFF.md:75-76`. → governs why `install-test` is framed as the SR-021 unblock, not a separate ask.
- ASSUMPTION: building from `shipready/3-polish-submission` (rather than `main`) is what Sky means by "test the access map current state," since that branch holds all completed-but-unmerged work. Flagged in DECISIONS FOR SKY #1 for her to confirm.

## §3 Blocked / Decision Nodes

- `{node: sky/merge-decision#shipready-3, why: "85 commits / 241 files ahead of main — moderation (report/hide/dispute), ToS screen, ratified privacy policy v1, takedown flow, a11y focus-return contract — all gated on Sky per Const. Art. 1", unblock: "Sky reviews design-reviews/ship-ready/HANDOFF.md + DECISIONS.md and merges herself (or authorizes Rory)", type: DECISION_FOR_SKY}`
- `{node: r2/bp11-press-vocab, why: "1 commit (8acb184) ahead of main; every sibling in the bp1-bp17 series merged except this one — unclear if deliberately held back or an oversight", unblock: "Sky confirms intent; if it should ship, it's a 1-commit fast-forward", type: MISSING_INPUT}`
- `{node: sky/creds#rotate-reviewer (B-6), why: "reviewer@accessmap.com's old password is in public git history — design-reviews/ship-ready/HANDOFF.md:663", unblock: "Sky rotates the password in Supabase + App Store Connect", type: BLOCKER — scoped to eventual App Store submission / external TestFlight review, NOT to today's internal self-test build}`
- `{node: state-file-refresh, why: "PROJECT_STATE.md/DECISIONS_LOG.md/TASK_GRAPH.json last updated 2026-06-20, predate the entire r2-audit + ship-ready arcs", unblock: "dedicated refresh pass (not bundled into this cycle)", type: MISSING_INPUT}`

## §4 Checkpoint References

- `{name: main-tip, role: Morgan, artifact: commit:512494a, qa-report: "git log main -1 (verified 2026-07-30)"}` — local `main` == `origin/main`, no push lag.
- `{name: shipready-run3-handoff, role: Morgan(observed)/agent-authored, artifact: branch:shipready/3-polish-submission#step-85 (commit:5105e9d), qa-report: "design-reviews/ship-ready/HANDOFF.md:74-77,661-665"}`
- `{name: last-verified-eas-build, role: Morgan, artifact: "EAS build #25, profile=testflight, distribution=store, finished 2026-07-20, commit:d43f867", qa-report: "eas-cli build:list output (verified 2026-07-30, live query)"}`
- `{name: eas-supabase-env-verified, role: Morgan, artifact: "EAS production environment: EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY both present", qa-report: "eas-cli env:list --environment production (verified 2026-07-30, live query)"}` — closes out `TASK_GRAPH.json`'s `sky-verify-eas-supabase-env` pending item.
- `{name: fmt-xcode26-local-only-fix, role: Rory (unmerged, proposed), artifact: branch:fix/fmt-xcode26-local-sim-2026-07-25#step-2 (commit:08f8a69), qa-report: "qa-reports/2026-07-25_Rory_FmtXcode26_LocalSimUnblock.md:82-88 (EAS-parity section)"}` — local Xcode 26.6 simulator issue only; doc's own text confirms `eas.json` untouched and the pipeline unaffected in kind; EAS has kept succeeding through build #25 without this fix.
- `{name: typecheck-clean, role: Morgan, artifact: "tsc --noEmit on shipready/3-polish-submission working tree, 0 errors", qa-report: "verified 2026-07-30, live run"}`

## §5 Duplication Report

No duplications detected this cycle. Note (not a duplication): `shipready/2-blockers-dismissal` (tip f6ac258) is an ancestor of `shipready/3-polish-submission` — sequential continuation, not parallel duplicate work. Candidate for branch cleanup once Sky resolves the Run-3 merge decision (§3); not deleted now since it isn't merged into `main` yet.

## §6 State Snapshot

Not written this cycle — see DECISIONS FOR SKY #3. PROJECT_STATE.md/DECISIONS_LOG.md/TASK_GRAPH.json left as-is rather than partially/inaccurately patched.

## §7 Execution Plan Summary

Not applicable — TASK_GRAPH.json's phase/READY-node structure predates this cycle's findings (see drift note above); a fresh graph should come out of the state-file refresh in DECISIONS FOR SKY #3, not be hand-patched here.

---

## Plain-English summary

**The build itself should work.** Signing/credentials are already provisioned (8+ successful `testflight`-profile builds on record, most recent #25 on 2026-07-20), Supabase's production env vars are confirmed present in EAS (so the app won't launch blank), the `testflight` profile in `eas.json` is configured correctly (`distribution: store`, `autoIncrement`, Release config), and the current working tree typechecks clean. `eas.json`/`app.json` are byte-identical between `main` and `shipready/3-polish-submission`, so this holds regardless of which branch you build from.

**What isn't done is the merge, not the build.** You're sitting on 85 unmerged commits of real ship-ready work (moderation controls, ToS screen, ratified privacy policy, takedown flow) that only you can merge per house rules. That's fine for today's purpose — if "test the current state" means testing that Run-3 work, building straight from this branch is the right move, and it's literally the step that resolves the open **SR-021** item (no on-device launch evidence yet exists for this body of work).

**Commands, once you've picked a branch (DECISIONS FOR SKY #1):**
```bash
npm run build:testflight
```
then, once it finishes:
```bash
eas submit --platform ios --profile production --latest --non-interactive
```
(or `npm run deploy:testflight` to chain both in one shot).

Two known open items are real but don't block today: **B-6** (reviewer account password rotation — matters for App Store submission / external TestFlight review, not for installing on your own device) and the ~258 MB of untracked design-review assets sitting in the working tree (slows upload, doesn't break it).
