# HANDOFF — Map + Sheet Gestures Spec Run

**Run:** 2026-08-12 · Fable 5 max effort · single phase · SPEC ONLY (zero app code changes, zero commits)
**Output dir:** `~/AccessMap/design-reviews/map-gestures/2026-08-12/`
**Repo base state:** `main` @ `07f82bc` (= the merged map-chrome compaction; dirty with untracked design-review artifacts only)

## STATUS: ✅ COMPLETE — awaiting Sky's ruling. Nothing left for a successor to do in this run.

All sections banked, in order:
1. `00_INVENTORY.md` — Step-0 ground truth: map stack (pinch = Case A, already native), gesture infra (RNGH 2.28 installed / zero consumers / NO GestureHandlerRootView / no Reanimated), escape law (AVM = accessibilityViewIsModal), the dismissal-standard guard laws A–J, the 16-surface dismissible census with per-surface receipts, the grabber-affordance gap, the pageSheet finding (RN defaults `modalInPresentation=YES`; `allowSwipeDismissal={true}` = the one-prop native unlock, receipts in RN source).
2. `SPEC.md` — the build contract: §1 pinch (verdict: verification + 2 taste knobs, not code) · §2 pull-to-dismiss per class (MAP never / pageSheet Tier 1 one-prop / half-sheet Tier 2 `SheetPull` primitive with exact thresholds: arm 16pt-at-top, commit max(120pt, 30%) or vy>700, spring-back `motion.spring.sheet`, RM instant settles) · §3 escape-law + a11y invariants, THE LAW-F AMENDMENT (Sky-gated), guard-test specs, platform boundaries, device-pass rows.
3. `diagrams/gesture-flows.html` — state machine + dismiss-vs-scroll arbitration (rendered, verified in browser).
4. `INTEGRATION-MAP.md` — commit slices G0–G-final, file:line touch table, chrome-overlap flags, PROTECT union, consolidated device-pass checklist, gate law.
5. `QUESTIONS.md` — 9 banked rulings; **Q3 = the mechanism ruling that doubles as the law-F sign-off**.
6. `CLOSEOUT.md` — the summary Sky reads first.

## If a successor ever reopens this
- Verify the repo before trusting ANY memory line (this run caught two stale claims: chrome "unbuilt" → actually merged; RNGH "in use" → actually zero consumers).
- The spec is against `07f82bc`; if main has moved, re-verify the line anchors in INTEGRATION-MAP §2 and the guard text at `src/__tests__/dismissalStandard.guard.test.ts:359-375` before building.
- House rules stand: UNATTENDED (bank, don't ask) · zero commits from agent runs · Sky merges · guards land before code.
