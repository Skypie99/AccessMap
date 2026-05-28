# Task: Alex — Comprehensive A11y Audit on 12+ Branches

**Assigned:** 2026-05-28 by Morgan  
**Deadline:** Friday 2026-05-29 EOD  
**Authority:** Const. 9.4 (Alex domain expert — accessibility)  
**Unblocks:** A11y sign-off before merge wave

---

## Task

Comprehensive accessibility audit of all 12+ uncharted branches for WCAG 2.1 AA compliance:

### Audit Checklist

**Visual Design**
- [ ] Color contrast ratio ≥ 4.5:1 (text vs. background)
- [ ] Focus states visible (keyboard nav shows clear outline)
- [ ] Touch targets ≥ 44pt (mobile)
- [ ] Text resizing works (no hardcoded font sizes that break at zoom)

**Screen Reader**
- [ ] Semantic HTML (buttons, headings, landmarks)
- [ ] aria-labels where needed (icon buttons have labels)
- [ ] Form labels associated (label → input via htmlFor)
- [ ] Hidden decorative content marked (aria-hidden on icons)
- [ ] List/table semantics intact (proper nesting)

**Keyboard Navigation**
- [ ] Tab order logical (left-to-right, top-to-bottom)
- [ ] No keyboard traps (can tab out of modals, inputs)
- [ ] Focusable elements reachable (all interactive elements keyboard-accessible)

**Regressions**
- [ ] Compare to baseline before changes (did we break anything?)
- [ ] New a11y debt introduced? (technical debt tracked)

---

## Output

Create a11y audit report:
```markdown
## A11y Audit Summary

### ✅ WCAG 2.1 AA PASS
- feat/notify-flag-status-2026-05-27 (compliant, good label practice)
- test/gary-wave4-heatmap-2026-05-27 (legend accessible, color blind safe)

### ⚠️ MINOR ISSUES (Fix Before Ship)
- design/creative-polish-2026-05-27
  - Issue: New button color (hover state) is 3.8:1 contrast (need 4.5:1)
  - Fix: Adjust color or add background color boost
  - Timeline: 30 min fix

- feat/tasks-search-2026-05-25
  - Issue: Search input missing aria-label
  - Fix: Add aria-label="Search tasks"
  - Timeline: 5 min fix

### 🚫 REGRESSION DETECTED
- [none — all branches maintain baseline accessibility]

## Action Items
1. Design: adjust button contrast on polish branch
2. Shamus: add aria-label to search input
3. Post-launch: monitor for real-world a11y complaints (gather data for future improvements)

## Sign-Off
All branches accessible with minor fixes. No regressions detected.
```

File: `qa-reports/a11y-audit-report-2026-05-29.md`

---

**Timeline:** Can execute Friday morning or later (less critical than Friday EOD due to Design Compiler pre-gates existing)
