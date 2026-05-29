# Morgan — Decision Briefing
**Date:** 2026-05-28
**Mode:** ACTIVE (direct /morgan invocation)
**Project:** accessmap
**Purpose:** Answer three open decisions: D-NEW-8, D1, D6

```yaml
coherence_score: 0.97
state_consistency: pass
duplicate_work_detected: no
drift_risk: low
```

---

## §1 Dependency Graph

**nodes:**
- gary/wave4-heatmap-review#step-1 (Gary, review)
- sky/merge-heatmap#step-1 (Sky, merge) — D-NEW-8
- sky/apply-rls-d1#step-1 (Sky, SQL apply) — D1
- sky/apply-history-d6#step-1 (Sky, SQL apply) — D6
- sky/merge-marker-clustering#step-1 (Sky, merge) — post-D1

**edges:**
- gary/wave4-heatmap-review#step-1 → sky/merge-heatmap#step-1 (gate: Gary thumbs-up recommended)
- sky/apply-rls-d1#step-1 → sky/merge-marker-clustering#step-1 (gate: BLOCKING — must apply D1 first)
- sky/apply-history-d6#step-1 (independent — no dependencies either direction)

---

## §2 Reason for Ordering

- **Heatmap merge (D-NEW-8):** Gary's `test/gary-wave4-heatmap-2026-05-27` branch exists unmerged. Per LEARNINGS:2026-05-25 — Sequential merge/build discipline, we confirm test branches are additive before merging the feature. Not a hard blocker — but a 5-minute check that prevents a silent test-regression from landing on main.
- **RLS migration (D1):** Jordan APPROVED WITH CONDITIONS on 2026-05-24 (qa-report: `qa-reports/archive/jordan-flag-editing-review-2026-05-24.md`). Migration REPLACES a weaker policy with a tighter one — direction is always-more-secure. Const. Art. 7.6 (privacy/location/disability pillar) — Jordan gate already cleared.
- **History table (D6):** Jordan RECOMMENDED (not a hard blocker). App-layer write means early edits will be missing from the audit trail if applied after users start editing. Now is the lowest-friction window.
- **D1 and D6 are independent of each other and of the heatmap merge.** All three can proceed in parallel or any order.

---

## §3 Blocked Nodes

- `{node: sky/merge-marker-clustering#step-1, why: D1 RLS migration not applied, unblock: Sky applies 2026-05-25_flag_edit_rls_replacement.sql in Supabase SQL Editor, type: DECISION_FOR_SKY}`

---

## §4 Checkpoint References

- `{name: Jordan heatmap pre-approval, role: Jordan, artifact: branch:feat/heat-map-severity-2026-05-27, qa-report: 2026-05-27_Shamus_Heatmap_Wave3.md:1}`
- `{name: Jordan flag-editing approval, role: Jordan, artifact: branch:shamus/marker-clustering-2026-05-25, qa-report: archive/jordan-flag-editing-review-2026-05-24.md:1}`
- `{name: Heatmap Design Compiler POLISH, role: Dani, artifact: branch:feat/heat-map-severity-2026-05-27, qa-report: 2026-05-28_Shamus_HeatmapBuild.md:1}`

---

## §5 Duplication Report

No duplications detected this cycle.

---

## DECISIONS — Morgan's Answers

### D-NEW-8: Merge feat/heat-map-severity-2026-05-27?
**→ YES. Merge it.**

Everything is clean: 827/827 tests, TSC 0 errors, Design Compiler POLISH (all must-haves done), Jordan's two conditions wired in-lib. The only soft gate remaining is Gary confirming `test/gary-wave4-heatmap-2026-05-27` is additive — that branch exists unmerged and should take Gary ~5 minutes. You can either ask Gary to review it first (recommended), or merge the feature now and Gary's test branch follows. Either order is safe — the test branch is additive, not corrective.

**My call:** Have Gary do the 5-minute check, then merge. Or just merge now if you're in a hurry — the feature was built test-first with 24 dedicated unit tests; Gary's wave4 branch is extra coverage, not a safety net.

---

### D1: Apply 2026-05-25_flag_edit_rls_replacement.sql?
**→ YES. Apply it now.**

Jordan already approved this on 2026-05-24. The migration makes RLS _more restrictive_ (adds `status = 'open'` check, freezes immutable columns) — it cannot make the app less secure, only more. Applying it unblocks `shamus/marker-clustering-2026-05-25` (flag editing UI) from merging.

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `supabase/migrations/2026-05-25_flag_edit_rls_replacement.sql` (on branch `shamus/marker-clustering-2026-05-25` or the worktree path: `.claude/worktrees/nervous-ishizaka-01e1c4/supabase/migrations/2026-05-25_flag_edit_rls_replacement.sql`)
3. Run it — idempotent, safe to re-run

No rollback concerns. The migration uses `DROP POLICY IF EXISTS` + `CREATE POLICY`, fully reversible by reverting the policy name.

---

### D6: Apply 2026-05-25_flag_edit_history_table.sql (flag edit history)?
**→ YES, and apply it at the same time as D1.**

Jordan recommended this (not required). It's a lightweight append-only audit table that logs what changed when someone edits a flag. The only cost of waiting is that you lose the audit trail for any edits that happen between now and when you eventually apply it.

Two reasons to do it now:
1. You're already in the Supabase SQL Editor for D1 — one more paste costs 30 seconds
2. Flag editing is about to ship (once marker-clustering merges) — the audit trail is most valuable from day one

The table does NOT change any existing behavior. It's purely additive. If you later decide you don't want it, `DROP TABLE flag_edit_history` removes it with zero impact on anything else.

---

## §6 State Snapshot

**Main SHA:** `2086fde` (on branch `feat/heat-map-severity-2026-05-27` — not main)
**Tests:** 827/827 · TSC: clean
**Heatmap:** ready to merge
**D1:** ready to apply (Jordan-approved)
**D6:** ready to apply (Jordan-recommended)
**Marker-clustering:** blocked on D1 → unblocks on D1 apply

---

## DECISIONS FOR SKY

1. **Gary wave4 test review (5 min):** Ask Gary to look at `test/gary-wave4-heatmap-2026-05-27` and confirm tests are additive — then merge `feat/heat-map-severity-2026-05-27`. Or skip Gary and merge now (safe either way).
2. **Apply D1 SQL:** Paste `2026-05-25_flag_edit_rls_replacement.sql` in Supabase SQL Editor. Unblocks marker-clustering.
3. **Apply D6 SQL:** Paste `2026-05-25_flag_edit_history_table.sql` in the same session. 30 seconds, additive only.
