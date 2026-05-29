# 🚀 MERGE WAVE SEQUENCE — AccessMap Monday 2026-05-28

**Authority:** Morgan Standing Approval (Safe + Quality + Forward Momentum)  
**Purpose:** Optimal merge order for 18 unmerged branches to main Monday post-audit synthesis.  
**Execution window:** 90 min sequential (parallel groups noted).

---

## MERGE SEQUENCE (18 branches)

### TIER 1 — Safety/Quality Foundation (merge first, 15 min)

**These have zero dependencies and improve safety/coverage for everything downstream.**

| Priority | Branch | Type | Risk | Time | Reason |
|---|---|---|---|---|---|
| 1.1 | `test/gary-wave2-2026-05-26` | Test coverage | 🟢 SAFE | 3 min | Unit + integration tests; base coverage for merge wave. Gary QA sign-off required. |
| 1.2 | `security/hardening-wave2-2026-05-27` | Security | 🟢 SAFE | 5 min | RLS policy tightening, auth edge-case fixes. Steve review sign-off required. |
| 1.3 | `fix/sql-cleanup-2026-05-27` | Migration | 🟢 SAFE | 2 min | Schema hygiene (triggers, indexes). Rollback plan documented. |
| 1.4 | `design/auto-2026-05-26-linheight-token` | Token | 🟢 SAFE | 3 min | New design token (no component impact). Dani review sign-off required. |
| 1.5 | `a11y/alex-wave2-2026-05-26` | Accessibility | 🟢 SAFE | 2 min | Label, focus, contrast fixes. Alex QA sign-off required. |

### TIER 2 — Design Polish & UX (merge second, 20 min)

**Feature branches depend on design tokens + UX patterns. Merge design before feat.**

| Priority | Branch | Type | Risk | Time | Reason |
|---|---|---|---|---|---|
| 2.1 | `design/creative-polish-2026-05-27` | Design | 🟢 SAFE | 3 min | Component refinement, spacing harmony. Dani + Shamus joint sign-off. |
| 2.2 | `a11y-perf/wave3-2026-05-27` | Perf + a11y | 🟡 REVIEW | 8 min | Performance baselines + a11y regression scan. Alex + Peter joint sign-off. Audit synthesis (Fri EOD) may propose polish loop — apply only if Dani clears. |
| 2.3 | `ui/auto-2026-05-25-dani-warmth` | UI theme | 🟢 SAFE | 4 min | Color palette refinement. Dani sign-off + Alex contrast audit. |
| 2.4 | `design/creative-polish-2026-05-27` | (duplicate check) | — | — | Already listed as 2.1. Skip. |

### TIER 3 — Feature Implementation (merge third, 35 min)

**Now that design/tokens/a11y/perf are established, feature branches are safe.**

| Priority | Branch | Type | Risk | Time | Reason |
|---|---|---|---|---|---|
| 3.1 | `feat/shamus-category-quickfilter-2026-05-26` | Feature | 🟢 SAFE | 5 min | Filter UX; depends on design tokens (✓ Tier 1–2). Gary tests required. |
| 3.2 | `feat/shamus-flag-deeplink-detail-2026-05-27` | Feature | 🟢 SAFE | 4 min | Deep linking; self-contained. Gary tests required. |
| 3.3 | `feat/notify-flag-status-2026-05-27` | Feature + backend | 🟡 REVIEW | 6 min | Notifications + Rory's Edge Function (live post D2). Gary + Rory sign-off. **Blocked until Rory notifications deploy COMPLETE.** |
| 3.4 | `feat/heat-map-severity-2026-05-27` | Feature | 🟡 REVIEW | 8 min | Heatmap visualization; Peter perf audit required (Fri). Conditional merge based on perf sign-off. |
| 3.5 | `feat/tasks-search-2026-05-25` | Feature | 🟢 SAFE | 4 min | Search UX; self-contained. Gary tests required. |

### TIER 4 — Documentation & Release (merge last, 10 min)

**Merges after all features & fixes so changelog is complete.**

| Priority | Branch | Type | Risk | Time | Reason |
|---|---|---|---|---|---|
| 4.1 | `release/auto-2026-05-28` | Release | 🟢 SAFE | 5 min | CHANGELOG.md + version bumps. Rory coordination required (EAS build trigger). |
| 4.2 | `fix/sql-cleanup-2026-05-27` | (if not merged in Tier 1) | — | — | See Tier 1.3. |

---

## CONFLICT SCAN (pre-merge validation)

**Before Monday 9am:** Run this to identify branch conflicts with current main.

```bash
git fetch origin main
for branch in $(git branch --no-merged main | sed 's/^[* ] //'); do
  echo "=== $branch ==="
  git merge-base --is-ancestor main "$branch" && echo "  ✓ linear" || echo "  ⚠ needs rebase"
  git diff --name-only main..."$branch" | head -3
done
```

**Expected outcome:** Most branches are linear (rebased on main). If conflicts exist:
- **Merge conflict (file content):** escalate to Shamus/Dana to resolve
- **Strategy conflict (two branches edit same token):** escalate to Dani to arbitrate
- **Test conflict:** escalate to Gary to validate merged test coverage

---

## PARALLEL EXECUTION GROUPS

### Monday 10am → 11:30am (90 min wall time, ~65 min critical path)

**Group A (Parallel, no dependencies):**
- T1.1 `test/gary-wave2` (3 min)
- T1.2 `security/hardening` (5 min)
- T1.3 `fix/sql-cleanup` (2 min)
- ↓ These must finish before Tier 2
- **Cumulative:** 10 min (first dependency gate)

**Group B (Parallel, depends on A):**
- T2.1 `design/creative-polish` (3 min)
- T2.2 `a11y-perf/wave3` (8 min) [**conditional: if audit synthesis clears**]
- T2.3 `ui/dani-warmth` (4 min)
- ↓ These must finish before Tier 3
- **Cumulative:** 15 min → total 25 min elapsed

**Group C (Parallel, depends on B):**
- T3.1 `feat/category-quickfilter` (5 min)
- T3.2 `feat/deeplink-detail` (4 min)
- T3.3 `feat/notify-flag-status` (6 min) [**blocked: Rory notifications deploy must finish first**]
- T3.4 `feat/heat-map` (8 min) [**conditional: if Peter perf audit clears**]
- T3.5 `feat/tasks-search` (4 min)
- ↓ These must finish before Tier 4
- **Cumulative:** 27 min → total 52 min elapsed

**Group D (Sequential, depends on C):**
- T4.1 `release/auto-2026-05-28` (5 min)
- ↓ EAS build trigger (Rory coordination)
- **Cumulative:** 5 min → total 57 min elapsed

**Total critical path:** ~57 min. Buffer: 33 min (target end 11:30am).

---

## BLOCKERS & DEPENDENCIES

### Tier 3 Blockers

| Branch | Blocker | Unblock Condition | Owner |
|---|---|---|---|
| `feat/notify-flag-status` | Edge Function live | Rory deploys, tests, reports complete | Rory |
| `feat/heat-map` | Perf audit approval | Peter Fri audit synthesis + Morgan approval | Peter + Morgan |
| `a11y-perf/wave3` | Audit synthesis | Alex/Dani Fri EOD audit + Morgan approval | Alex + Dani + Morgan |

### Portfolio Cascade (in parallel, Thursday EOD)

Phase 1 Portfolio merge to main already executed (Dani→Peter→Will→Gary→Casey→Morgan, 36 min). Design branch `design/portfolio-creative-polish-2026-05-27` is live on main.

Portfolio Monday merge wave (13 branches) sequenced separately — see `2026-05-29_Merge_Wave_Sequence_Portfolio.md`.

---

## AUDIT SYNTHESIS INPUT (Friday EOD → Monday 9am)

Morgan will synthesize 5 parallel audits Friday and issue **MERGE WAVE APPROVAL** Saturday morning with conditional gates:

| Audit | Conditional Gate | Impact |
|---|---|---|
| Alex a11y + Parity | No regressions on 12+ branches | T2.2 `a11y-perf/wave3` conditional |
| Peter perf | Heatmap meets latency target | T3.4 `feat/heat-map` conditional |
| Quinn product | Merge order validated | Updates this sequence if needed |
| Will branch audit | All branches scanned for missing stubs | Raises blockers if found |
| Jordan privacy | No PII/location data leakage | Flags any RLS gaps for Steve |

---

## EXECUTION CHECKLIST (Monday 10am start)

- [ ] Conflict scan PASS (Sat 6pm)
- [ ] Audit synthesis synthesis PASS + MERGE WAVE APPROVAL issued (Sat 9am)
- [ ] Rory notifications deploy COMPLETE (Sun latest, Mon 9am if needed)
- [ ] Test suite PASS across all 18 branches (Sat 6pm)
- [ ] All role sign-offs collected (Gary, Alex, Dani, Peter, Steve, Rory, Dana) (Sat 6pm)
- [ ] Release notes drafted in `release/auto-2026-05-28` (Sat 6pm)
- [ ] 90-min merge window: 10am–11:30am Mon; Rory triggers EAS build 11:35am

---

## STATUS

✅ **APPROVED.** Merge sequence ready. Waiting for:
1. Audit synthesis Friday EOD (conditional gates resolved)
2. Rory notifications deploy Sunday (T3.3 blocker)
3. Conflict scan Saturday 6pm (pre-merge validation)

**Next:** Peter/Alex/Quinn/Will/Jordan execute parallel audits Tue–Thu. Friday EOD synthesis. Saturday morning approval. Monday 10am merge wave start.

---

**Report:** qa-reports/2026-05-28_Merge_Wave_Sequence.md  
**Authority:** Morgan Standing Approval  
**Status:** READY FOR EXECUTION.
