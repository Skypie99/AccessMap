# 🎨 DESIGN POLISH LOOP TRIGGER — Conditional Setup

**Authority:** Morgan Standing Approval (Design Compiler Layer 5 — Luxury UI Score)  
**Scope:** AccessMap Monday merge wave  
**Trigger condition:** IF Alex/Dani Friday audit finds Layer 4 (Visual Entropy <75) OR Layer 5 (Luxury UI Score <75) failures with no structural root cause.

---

## WHAT TRIGGERS THE LOOP

The Design Compiler runs **7 layers** on every UI-touching merge. Layers 1–6 are auto-pass/auto-block/auto-polish. **Layer 5 is the trigger for this loop.**

| Layer | Owner | Criterion | Failure → Action |
|---|---|---|---|
| 1. Tokenization | Dani | Zero drift detector violations | BLOCK (fixable on role branch) |
| 2. A11y Parity | Alex | All WCAG 2.2 AA cells PASS | BLOCK (fixable on a11y branch) |
| 3. Component Consistency | Dani | Cohesion ≥15/20 | BLOCK (fixable via polish) |
| 4. Visual Entropy | Dani | Score ≥75/100 | **POLISH if <75** |
| 5. **Luxury UI Score** | Dani | Score ≥75/100 | **POLISH if <75** ← **THIS TRIGGERS THIS LOOP** |
| 6. Regression Safety | Alex + Shamus | No drift on changed surface | BLOCK or ESCALATE |
| 7. Compile Decision | Dani | Aggregate 1–6 | COMMIT / BLOCK / POLISH / ESCALATE |

---

## WHEN THE LOOP RUNS

### Friday EOD: Audit Synthesis

Dani scores the following branches and reports:

1. `design/creative-polish-2026-05-27` (already merged; not in loop)
2. `a11y-perf/wave3-2026-05-27` (touches UI)
3. `feat/heat-map-severity-2026-05-27` (touches map UI)

If **any** of these score <75 on Layer 5 (Luxury UI Score) **and the failure is NOT structural** (e.g., spacing inconsistency, not missing tokens or a11y violations), the loop **activates**.

### Saturday Morning: Morgan Decision

Morgan reviews Dani's compiler result:
- **COMMIT** → no loop, proceed to merge wave.
- **POLISH** → activate this loop (up to 2 iterations, ~2–3 hours total).
- **BLOCK** → don't merge; requires design-system fix.
- **ESCALATE** → involves a11y or tokens; handled separately.

---

## LOOP PHASES

### Phase 1: Detection (30 min, Dani leads)

**Input:** Dani's compiler failure report (e.g., "Spacing inconsistency in heatmap controls: 82 → 78 score").

**Action:**
1. Identify low-scoring sections (list specific components/areas).
2. Classify root cause: token misuse, layout inconsistency, missing component reuse, typography drift, motion overuse.
3. Output: **UI Polish Candidate List** (5–10 items, prioritized by impact).

**Deliverable:** qa-reports/2026-05-28_Dani_Polish_Candidates_<branch>.md (2–3 min to read).

### Phase 2: Diagnosis (30 min, Dani + Shamus joint)

**Input:** UI Polish Candidate List.

**Action:**
1. For each candidate, determine **smallest fix**:
   - Token misuse → update component to use correct token.
   - Layout inconsistency → add margin/padding rule.
   - Missing reuse → consolidate components (if safe).
   - Typography drift → apply $lineheight-body consistently.
   - Motion overuse → reduce animation duration.
2. Output: **Polish Strategy Plan** (per-candidate minimal fix, not redesign).

**Deliverable:** qa-reports/2026-05-28_Dani_Polish_Strategy_<branch>.md.

### Phase 3: Application (45 min, Shamus + Dani joint)

**Input:** Polish Strategy Plan.

**Action:**
1. Shamus applies minimal fixes on `feat/polish-<date>-<surface>` branch (e.g., `feat/polish-2026-05-28-heatmap-spacing`).
2. **Constraints:** ONLY apply the planned fixes. No redesign, no refactoring, no feature additions.
3. Dani validates each change for token compliance (Layer 1).
4. Gary runs test suite (confirm no regressions).

**Deliverable:** Commit log with one-line descriptions per fix.

### Phase 4: Re-Scoring (15 min, Dani leads)

**Input:** Polished branch.

**Action:**
1. Run the Luxury UI Scorecard again (Layer 5).
2. Check that score improved to ≥75.
3. Run full compiler (all 7 layers).
4. Write **Compile Decision: RE-SCORE** with new scores.

**Deliverable:** qa-reports/2026-05-28_DesignCompile_<branch>_Iteration2.md (PASS or FAIL).

---

## ITERATION LIMIT

Max 2 full iterations (Phase 1–4) per trigger. **Why?** After two cycles of polish, if score is still <75, the root cause is likely structural (tokens, patterns, design system). Further polish becomes diminishing returns; escalate to design-system review instead (Dani proposes new tokens/patterns on `design/` branch, Sky approves).

### Iteration 1 Outcome

- **Pass** (score ≥75) → Proceed to merge wave.
- **Fail** (score still <75) → Iteration 2.

### Iteration 2 Outcome

- **Pass** → Proceed to merge wave.
- **Fail** → **ESCALATE** to design-system (new tokens, new patterns, or architecture change needed). Don't merge until reviewed by Sky.

---

## DECISION TREE

```
Friday audit finds Layer 5 score <75?
├─ Yes, structural issue (missing tokens, a11y violation)?
│  └─ BLOCK (don't run loop; fix tokens/a11y first)
├─ Yes, non-structural issue (spacing, motion, reuse)?
│  └─ POLISH (activate this loop)
└─ No, score ≥75?
   └─ COMMIT (merge wave proceeds)
```

---

## TIMELINE

**Friday 4pm:** Dani compiler synthesis starts.  
**Friday 6pm:** Compiler result issued. If POLISH: activate loop.  
**Saturday 10am:** Phase 1 Detection (Dani, 30 min).  
**Saturday 10:30am:** Phase 2 Diagnosis (Dani + Shamus, 30 min).  
**Saturday 11am:** Phase 3 Apply (Shamus + Dani, 45 min).  
**Saturday 11:45am:** Phase 4 Re-Score (Dani, 15 min).  
**Saturday 12:15pm:** Iteration 1 complete. Decide: PASS → merge wave ready. FAIL → Iteration 2.  

**If Iteration 2 needed:**  
**Saturday 12:30pm–1:30pm:** Phases 1–4 again (60 min).  
**Saturday 1:30pm:** Final score. PASS → ready. FAIL → ESCALATE.

**Sunday evening:** Final status to Morgan for Monday readiness.

---

## STATUS

✅ **ARMED.** Loop is passive until Friday compiler result triggers it.

**Conditions to activate:**
1. Friday audit finds Layer 5 <75.
2. Root cause is non-structural (fixable via polish, not design-system work).
3. Morgan approves loop activation (per compiler POLISH result).

**Expected outcome:** Loop runs max 2 iterations Sat morning; branches ready for merge wave Mon 10am.

**Fallback:** If loop fails after 2 iterations, escalate to Morgan/Sky for design-system review (1–2 day fix, delays merge wave).

---

**Report:** qa-reports/2026-05-28_Design_Polish_Loop_Trigger.md  
**Authority:** Morgan Standing Approval  
**Status:** ARMED (awaiting Friday trigger).
