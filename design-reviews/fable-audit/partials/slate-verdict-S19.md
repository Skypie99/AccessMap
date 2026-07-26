# Adversarial Skeptic Verdict — S19

**Proposal:** S19 — "Give the location consent slide a visible 'Not now' (and stop the web permission theater)"
**Resolves:** L1-3 (HIGH) · Effort S · Tier QuickWin · Signature no
**FORKS-TO-SKY:** Sky-decision note #3 (guest contract) — the "does the guest build request location / expose sign-in at all" question.
**Verdict: KEEP** (all 7 rails satisfied; one non-gating scoping tightening carried for the assembler)

---

## What I attacked and what the code says

S19 rests on empirical claims about `src/components/OnboardingCards.tsx` and a "de-theater the web button" leg that is the only part with any risk of over-reaching into Sky's guest-contract fork. A plausible-but-wrong version would (a) cite the wrong button structure, (b) rely on a web no-op, (c) regress the permission-priming crown jewel, or (d) sneak a guest-location-architecture change into a "correctness" fix. I checked all four against `main @ 82e738b`.

**Every factual claim verified true against the source:**

1. **"Maybe later" is notifications-only.** `OnboardingCards.tsx:216` — `const showMaybeLater = permission === 'notifications' && currentGranted !== true;`. The button renders at `:486-497`, gated on `showMaybeLater`. The location slide (`permission: 'location'`, `:104-110`) never gets it. ✓
2. **The location slide's only forward action in the ungranted first-run state is "Allow Location."** For a permission slide that is not-yet-granted, the render hits the branch at `:428-459` → primary label "Allow Location" (`:456`). The "Continue"/"Next" else-branch (`:463-480`) requires `currentGranted === true` (a RETURNING granted user) — a first-run user never reaches it. Matches the skeptic's L1-3 correction exactly (verdicts.md:92). ✓
3. **Skip abandons the whole tutorial.** `:287` `onPress={onDone}` — the top-right Skip closes onboarding entirely. S19 credits this as the (costly) decline: "must either open the OS dialog just to decline it or quit onboarding." Honors correction #2. ✓
4. **The web button is theater.** `handlePermissionAction :243-247` — `if (Platform.OS === 'web' || currentGranted === true) { goTo(index + 1); return; }`. On web it advances with ZERO permission call. Corroborated on the other side: `HomeScreen.tsx` defers the web ask to a user-initiated "Use my location" tap ("false until the user taps 'Use my location' — gates the OS prompt"), so the onboarding "Allow Location" never fires a geolocation prompt. The double-ask (fake first, real-later-unannounced) is real. ✓
5. **The "eight lines away" framing is fair.** `showMaybeLater` (`:216`) is the exact seam a "Not now" would extend; the pattern to copy (`:486-497`) is a static, motion-free `Pressable`.

**Skeptic-correction compliance (verdicts.md:92):** S19 pins the headline to "the ungranted first-run state" (correction #1 ✓) and credits Skip as a real decline (correction #2 ✓). Correction #3 ("lead with the web-theater leg — it's load-bearing") is only *partially* honored: S19 leads with the missing-decline leg and labels the web-theater the "Second leg." This is an emphasis choice, not a rail issue — both legs are covered and correctly called severable.

**No test invariant is at risk.** The only onboarding-adjacent test is `pushPermission.test.ts`, which tests the `pushNotifications.ts` *helpers* used by onboarding — not the `OnboardingCards` button structure or `handlePermissionAction`. Adding a "Not now" `Pressable` and relabeling the web button touch no pinned behavior.

---

## Rail-by-rail

- **tracesToFinding — TRUE.** Genuinely resolves L1-3 (HIGH · CONFIRMED · reframe REJECTED, verdicts.md:91-92; calibration.md:18; 02_findings.md:31). Both fixed legs (per-slide decline + web de-theater) are L1-3's two documented legs. No overclaim — it resolves only L1-3 and names its facets honestly.
- **wcagFloorHeld — TRUE (improves).** A visible decline is a WCAG 3.3.4-spirit / consent-integrity gain; de-theatering removes a misleading control state (a button announcing "Allow Location" that performs no action) — a real 4.1.2 name/role/value improvement. No AA floor is touched or traded (no color/contrast surface).
- **glassLawHeld — TRUE (not applicable, verified so).** `OnboardingCards` is NOT a glass surface: it uses its own hardcoded dark `LinearGradient` (`:266-271`) and a web-only `backdropFilter: blur(20px)` card style (`:603-605`) that is neither expo-blur nor a `GlassSurface` variant — entirely outside GLASS.md's jurisdiction (which governs `GlassSurface`/expo-blur i=12/24). No `GlassSurface.tsx` edit, no expo-blur intensity, no `box-none` map overlay, no `windowSize`/`removeClippedSubviews`. A new `Pressable` inherits the same non-glass chrome. Nothing in the glass law is engaged.
- **protectPreserved — TRUE (verified, not trusted):**
  - **PROTECT-1-of-L1** (permission-priming architecture, L1.md:139 = explain → check silently → prompt on tap → denial never blocks): the "Not now" button is purely *additive*. It does not alter `handlePermissionAction` (`:243-255`), the no-prompt status check (`:221-238`), or the "denial never blocks" property. It EXTENDS the pattern to the more sensitive permission exactly as L1-3 asks — never dilutes it. Intact.
  - **PROTECT-7-of-L1** (RM discipline in both carousels, L1.md:145): the Modal `animationType` is RM-gated (`:263`), dot springs RM-gated (`:160-175`), paging RM-gated (`:188`). A static "Not now" `Pressable` mirroring the motion-free "Maybe later" (`:486-497`) adds no animation and inherits the gated environment. Intact.
  - No other PROTECT item (of the 17 merged crown jewels or the L-lens nominations) is touched.
- **rnExpoFeasible — TRUE.** This is a plain `Pressable` UI control + a label change — NOT an `announceForAccessibility`/`setAccessibilityFocus` call, so no web no-op trap (S19 states this explicitly). The "Maybe later" pattern it copies already ships and works on web. No CSS-only trick. The web leg is offered as "wire it OR relabel it" — the relabel path is pure-safe RN.
- **accessNotTradedForPolish — TRUE.** No hidden access regression dressed as polish. Net access + consent-dignity gain: a first-class decline on the app's most sensitive ask, and de-mystification of a misleading control for SR users (R2). Nothing a user relied on is removed.
- **arbiterReRunPresent — TRUE (vacuous).** S19 touches no color/floor/severity value; field (7) correctly states "No arbiter." Per the rail, no-color ⇒ true. It adopts no token and needs none.

---

## FORKS-TO-SKY honesty check (does S19 pre-empt Sky-decision note #3?)

Sky-note #3 (guest contract) asks, in part, whether the web build "should request location and expose a real sign-in path at all." S19's FORKS line names note #3 and scopes S19 to "only the decline affordance and de-theaters the web button," leaving "the larger web-guest-location architecture" to Sky. Correct in the main.

**The one tension (non-gating):** field (1) offers TWO ways to de-theater the web button — "wire it, or relabel it so it doesn't masquerade as the grant." Option **"wire it"** (make the onboarding button actually perform the web geolocation ask) IS a guest-location-architecture change: it would move the browser prompt from Home's user-initiated "Use my location" back to onboarding — the very thing note #3 reserves for Sky, and it would also contradict the HomeScreen fence comment ("never prompt on mount/focus"; the web geolocation path always prompts). The **"relabel"** path (e.g. make the web forward button read "Continue"/"Not now" so it stops masquerading as a grant) fully satisfies the finding's "make the first ask honest" requirement WITHOUT pre-empting the fork. So the proposal is sound, but its *default* implementation should be the relabel, not the wire — the wire option should be struck (or explicitly deferred behind the note-#3 fork).

This is a scoping precision, not a rail violation: S19 already carries the correct FORKS line, the relabel path leaves every rail TRUE, and the fix closes L1-3 either way. It does not change the verdict.

---

## Verdict rationale

All 7 rails are satisfied. The idea is sound, cheap (the correct pattern lives ~8 lines away), improves the floor, and preserves both nominated crown jewels — verified in code, not trusted. The single caveat is a fork-hygiene tightening on the web leg's implementation choice, which is advisory (the proposal is already fork-aware and the relabel path keeps all rails green). Under the verdict rule, FIX is reserved for when a rail *needs* a condition to be satisfiable; here no rail needs it — every rail passes as written. Therefore **KEEP**, with the scoping note carried to the assembler.

**fixConditions (advisory, carry to assembler — non-gating):** (1) For the web de-theater leg, default to the **relabel** path (make the web forward button stop masquerading as a grant — e.g. "Continue"/"Not now" on web) and STRIKE the "wire it" option, or explicitly defer wiring behind Sky-decision note #3 — wiring a new web geolocation prompt is itself the guest-location-architecture change the FORKS line reserves for Sky, and contradicts the HomeScreen "never prompt on mount/focus" fence. (2) Prefer leading with the web-theater leg per the L1-3 skeptic correction #3 (load-bearing), though this is presentation only. (3) Implement the decline as a static `Pressable` mirroring the existing motion-free "Maybe later" (`:486-497`) so PROTECT-7-of-L1's RM discipline is inherited by construction. (4) No arbiter needed (no color/floor). Effort tag S / QuickWin is fair.
