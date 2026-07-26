# Adversarial Skeptic Verdict — S13

**Proposal:** S13 — "Free the Tasks card actions from the accessible-parent trap (native VoiceOver #1)"
**Resolves:** L6-04 (HIGH — the audit's named "single most important VoiceOver device-check")
**Effort:** M · **Tier:** Meaningful · **FORKS-TO-SKY:** none
**VERDICT: KEEP**

---

## Attack log (default-skeptic; tried to kill it)

### 1. Is the mechanism real, or a plausible-sounding fabrication? — REAL (code-confirmed)
Read `TasksScreen.tsx` directly:
- **Line 1591** `<Pressable>` is the card root: `accessibilityRole={selectionActive ? 'checkbox' : 'button'}` (1597), `accessibilityLabel={a11yLabel}` (1601) — i.e. **accessible-by-default** (RN makes any View with an accessibilityRole/Label an accessibility element; `accessible` is implicitly true).
- **Lines 1528-1567** define the four `CardAction`s: Verify / Resolved / Reject / Details — exactly as claimed.
- **Lines 1574-1588** `renderAction` returns a `PressableScale` with its own `accessibilityRole="button"` + label + hint.
- **Lines 1752-1763** render `renderAction(leadAction …)` + `restActions.map(renderAction …)` **inside** the outer Pressable (which closes at **1778**) and inside `<GlassSurface variant="row">` (closes at 1777).
So four interactive buttons are genuine descendants of an accessible parent Pressable. On iOS `accessible` collapses the subtree into one VoiceOver leaf → descendant buttons unfocusable. **The finding's core claim holds in code.** (Line-ref drift is trivial: slate cites :1595-1607 / :1528-1590; actual :1591-1607 / :1528-1588 — ±4, not a fabrication.)

### 2. Is this the `announceForAccessibility`-is-a-no-op-on-web trap (rail 4 / 5)? — NO
The hard rail warns that any fix "resolving L6-01/L6-03 by announcing on web" is dead on arrival. **S13 announces nothing.** Its fix is a native a11y-**tree restructure** (`accessible={false}` on the card + a labeled inner summary node, or lift the action row to a sibling). No `announceForAccessibility` / `setAccessibilityFocus` anywhere. The no-op trap does not touch this proposal.

### 3. Does the `react-native-web drops accessibilityState.selected` fact (rail 4) sink it? — NO, wrong finding
That RN-web shear is **L6-01** (a separate CRITICAL, owned by a different slate entry — confirmed in `L6.md:63-68` and `slate-draft-access.md:4`). L6-04 does not depend on `.selected` translating; the card's selection state uses `checked` (checkbox role, `TasksScreen.tsx:1599`), and S13's fix is about **focusability of nested buttons**, not state exposure. Distinct mechanism, distinct fix.

### 4. Is the web half a real in-harness-verifiable win, or hand-waving? — REAL
The nested-`<button>`-inside-`<button>` invalidity with double-activation ambiguity is confirmed in the banked tree `tasks__light__390.txt:30-59` (cited in 02_findings L6-04). That is a DOM-tree defect the harness CAN see, and the same restructure (buttons no longer nested under an accessible parent that RN-web renders as a `<div role=button>` / button) resolves it. Field (7)'s "A11y-tree (web): nested-button invalidity resolved" is a legitimate, non-device verification. Not a web-announcement claim.

### 5. GLASS.md law (rail 3) — UNTOUCHED
- **No color / floor / severity value changes** → arbiter rail N/A (correctly set true). No eye-tuned floor introduced.
- **Blur budget intact:** intensities unchanged (GLASS.md:88 row=12/chrome=24/banner=12/bulk=24). The restructure moves the action-row *grouping*; `GlassSurface variant="row"` and its `forceEngineered={glassLite}` thread are untouched.
- **GlassSurface.tsx not edited/forked** — the fix lives entirely in `TasksScreen.tsx`'s card JSX; GlassSurface "carries material only" (per the in-file comment at 1608-1612) and the restructure lifts/regroups the interactive layer above it.
- **box-none gesture law, windowSize / removeClippedSubviews virtualization** — not in scope, not touched.
- **Precedent for the exact fix technique exists in-repo:** GLASS.md:115 — "The long-press wrapper is `accessible={false}` (taps and the SR tree are unchanged)." The `accessible={false}` + summary approach is the same ratified class, so the fix threads existing convention rather than inventing.

### 6. PROTECT claims (rail — verified, not trusted)
- **Bulk-select flow preserved:** the sibling bulk bar (`:422,1298`) whose buttons are already reachable siblings is genuinely independent of the card subtree; regrouping the per-card action row does not touch it. Field (6)'s "preserves the bulk-select flow" is TRUE. The `!selectionActive` guard (1746) already hides per-card actions in selection mode, so the two paths stay cleanly separated.
- **PROTECT-1 (NearbyFlagsModal twin):** not touched — S13 is Tasks-card only.
- **PROTECT-12 (accessibility.ts hook suite / centralization):** extended, not regressed — this is exactly the "adoption/restructure, not redesign" the merged list nominates.
- No crown jewel regresses. No hidden access regression dressed as polish (rail: accessNotTradedForPolish) — this is a **pure access GAIN** with zero visual/token/gesture change (field 5 confirms, code confirms).

### 7. WCAG floor (rail 2) — IMPROVED
This IS the floor fix: WCAG 4.1.2 (Name/Role/Value) — the descendant buttons regain focusable button roles on the primary triage surface. Access is not traded for polish; it is the entire point. HARD FLOOR moves up.

---

## The one honest caveat (does NOT drop a rail)
L6-04 is `code-inferred + NEEDS-SKY-DEVICE` — the iOS flattening is the documented RN pattern but is **not proven on the audited surface** (dispositions.md ④; 02_findings L6-04 evidence line). S13 discloses this fully and correctly in field (7) ("Device (the gate): iOS VoiceOver … the audit's #1 device check, NEEDS-SKY-DEVICE") and sequences the code fix to land now, confirmation on device after the ONE EAS TestFlight build. That is the correct posture for a device-conditional native finding — the restructure is safe and standards-grounded regardless of the device result (it also fixes the code-confirmed web nested-button defect), so shipping the code is justified even pre-confirmation. **No fixCondition required** — the disclosure is already present and complete.

---

## Per-rail verdict
| Rail | Verdict | Basis |
|---|---|---|
| tracesToFinding | **true** | Sole owner of L6-04 (HIGH); mechanism code-verified in TasksScreen.tsx:1591/1528-1588/1752-1778 |
| wcagFloorHeld | **true** | WCAG 4.1.2 floor fix — descendant buttons regain focusable roles; access improved |
| glassLawHeld | **true** | No color/floor; blur budget intact (12/24); GlassSurface.tsx untouched; box-none & virtualization untouched; `accessible={false}` technique is a ratified in-repo pattern (GLASS.md:115) |
| protectPreserved | **true** | Bulk-select flow, NearbyFlagsModal twin (PROTECT-1), hook suite (PROTECT-12) all verified intact; grouping-only change |
| rnExpoFeasible | **true** | Native a11y-tree restructure — no `announceForAccessibility`/web-announcement; no CSS-only trick; no blur change |
| accessNotTradedForPolish | **true** | Pure access gain, zero visual/token/gesture change (field 5 + code) |
| arbiterReRunPresent | **true** | Touches no color/floor/severity value → rail is N/A → true (proposal correctly claims "No arbiter") |

**fixConditions:** none — clean KEEP. (Note for the build agent, not a gate: land the code fix now; the iOS-VoiceOver flattening confirmation rides the consolidated NEEDS-SKY-DEVICE pass on the ONE TestFlight build, as the proposal already states.)
