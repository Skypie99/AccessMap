# Adversarial Skeptic Verdict — S10

**Proposal:** S10 — "Confirm the submit: a visible + live success banner on the CONTRIBUTE finish line"
**Resolves (claimed):** L3-5 / L6-03 (HIGH — silent success on all four platform cells)
**Effort:** M · **Tier:** Meaningful · **Signature:** no · **FORKS-TO-SKY:** none
**VERDICT: FIX** (one rail fails on the mechanism *as written*; the idea is sound and RN-web-feasible with a concrete, already-half-stated remedy)

---

## Per-rail verdict

| Rail | Result | Basis |
|---|---|---|
| tracesToFinding | **true** | Genuine. |
| wcagFloorHeld | **true** | Adds WCAG 4.1.3; nothing traded. |
| glassLawHeld | **true** | No blur, no GlassSurface edit, no color/floor, box-none untouched. |
| protectPreserved | **true** | PROTECT-7 / PROTECT-8 / PROTECT-3 claims all verified against source. |
| rnExpoFeasible | **false** | The named reuse target (FlashBanner) both **conditionally unmounts** and is **mounted only inside `SignedInArea`** — so as written it does not deliver the persistent-mount live region to the anon-web cohort that is S10's own declared point. |
| accessNotTradedForPolish | **true** | Pure access gain. |
| arbiterReRunPresent | **true** | Touches no color/floor; reuses ratified `successStrong`; invents no token. |

---

## What holds (verified against source)

- **Finding trace is real.** `02_findings.md:35` logs L3-5/L6-03 as **CONFIRMED HIGH** ("silent on all 4 platform cells"). Source confirms: anon path (`ReportFlagModal.tsx:314-334`) does `hapticNotify → reset → onCreated → onClose` with the only `notify()` on the failure branch (`:329`); auth path fires `AccessibilityInfo.announceForAccessibility('Report filed.')` (`:409-413`) — SR-only, native-only. `onCreated` (`MapScreen.tsx:2111`) is `refreshFlags().catch(...)` and nothing else — no toast, no pin-center. Rate-limit context true: `anonRateLimit.ts:5` `MAX_PER_WINDOW = 5`. Every factual claim in field (1) checks out.
- **No color / no arbiter.** Field (5)/(7) explicitly say "No color change" / "No arbiter." The banner reuses `theme.ts:132 successStrong: '#1e8449'` — already ratified WCAG-AA green for white text. So the arbiter rail is vacuously satisfied and no new token is introduced. **Correct.**
- **PROTECT-7 (RM discipline — announce decoupled from motion): VERIFIED.** `FlashBanner.tsx:58-62` announces via an effect keyed on `message` with **no `reducedMotion` guard**, while the *animation* effect (`:72-103`) is RM-gated. The announce genuinely is decoupled from motion, exactly as field (6) claims. protect-merged.md:14 names this invariant verbatim.
- **PROTECT-3 (sheet architecture): preserved.** The banner fires after `onClose`; the KAV/footer/severity-button architecture is untouched. No conflict.
- **PROTECT-8 (anonymity honesty): respected.** Field (6) commits to the honest frame ("your report is public and others can verify it") and not over-claiming. Consistent with the crown jewel.
- **RN-web *does* translate the prop.** `react-native-web@0.21.2 createDOMProps/index.js:453-462` maps `accessibilityLiveRegion` → `aria-live`. So this is NOT an `announceForAccessibility` dead-API case — the mechanism family is legitimately web-capable. The skeptic confirms S10 correctly avoided the DOA trap that would have killed it.

## Why rnExpoFeasible fails *as written* (the FIX, not a KILL)

S10's mechanism sentence is internally contradictory. It says the banner is "a **persistent-mounted** `role=alert`/`aria-live` region … a live region **already mounted before its text changes** DOES translate" — and then names the reuse target as "App.tsx has FlashBanner." Two verified problems with that target:

1. **FlashBanner conditionally UNMOUNTS.** `FlashBanner.tsx:105` — `if (!rendered || !display) return null;`. It renders `null` when idle and mounts into the DOM *with its text already present*. That is the opposite of "already mounted before its text changes." A live region inserted into the DOM with content, rather than a mounted-empty region whose text later mutates, is the classic case SRs frequently fail to announce. The precedent S10 leans on — the **severity echo line** (`ReportFlagModal.tsx:648-657`, a genuinely always-mounted `accessibilityLiveRegion="polite"` node) — proves the *right* pattern and, by contrast, indicts FlashBanner as the *wrong* reuse target.

2. **FlashBanner is not mounted on the anon-web path at all.** In `App.tsx` `Gate()`: `if (session) return <SignedInArea …>` — and `<FlashBanner>` is mounted ONLY inside `SignedInArea` (`App.tsx:101`). The web/guest branch is `if (Platform.OS === 'web' || guestMode) return <RootNavigator … />` **with no FlashBanner in the tree.** S10 declares "web IS guest mode … the first time the anonymous cohort gets any signal" — but the component it proposes to reuse never renders for that cohort. As written, the anon web guest (the whole point) would still get nothing.

Neither defect is fatal: the finding is real and worth fixing, the WCAG-4.1.3 gain is genuine, and the persistent-`aria-live`-node mechanism is RN-web-translatable (confirmed above). The remedy is concrete and S10 already gestures at it ("persistent-mounted"). So this is a FIX, not a KILL.

## fixConditions (must be met for KEEP)

1. **Deliver the confirmation through a persistent-mounted live region, NOT the conditionally-unmounting FlashBanner as-is.** Either (a) mirror the always-mounted echo-line pattern (`ReportFlagModal.tsx:648-657`: a node that stays in the DOM and only its *text* changes), or (b) refactor FlashBanner to keep its `aria-live` wrapper `View` always mounted (empty text when idle) so text mutation — not node insertion — is what the SR observes. Remove the reliance on "reuse FlashBanner as-is" from the mechanism.
2. **Ensure the live region is mounted on the web/guest path.** Lift the banner/live-region above the `session` branch in `App.tsx Gate()` (or mount an equivalent inside `RootNavigator`) so the anon-web cohort — S10's stated target — actually receives it. State this explicitly; "App.tsx has FlashBanner" is currently true only for signed-in users.
3. **If the "center the map on the new pin" option is taken, gate the camera move on reduced-motion** (use the existing `animateTo` handle; respect the map-camera RM posture) so it does not become an ungated motion regression. Optional feature — drop it if it complicates the RM story.
4. Keep the verified PROTECT-7 / PROTECT-8 / PROTECT-3 commitments and the "No color / No arbiter" scope unchanged.

## Reasoning (summary)

The finding is real (CONFIRMED HIGH, source-verified), the access win is genuine (WCAG 4.1.3 status message where there is currently silence for the anon cohort), and — crucially — the proposal correctly avoids the `announceForAccessibility`-on-web DOA trap by choosing a rendered `aria-live` node, which RN-web@0.21.2 provably translates. Six of seven rails hold on inspection, including all three "preserves PROTECT-N" claims (verified, not trusted) and the arbiter/token discipline. The single failing rail is rnExpoFeasible, and it fails on the *named mechanism*, not the *idea*: the reuse target (FlashBanner) both conditionally unmounts (contradicting S10's own "persistent-mounted" requirement) and renders only inside `SignedInArea` (never on the anon-web path that S10 declares is the whole point). Both are concrete, verified code facts with a concrete remedy S10 already half-states. → **FIX** with the four conditions above; do not KILL.

---
*Read-only audit. No app code, tests, builds, DB, or git touched. Wrote only this verdict file.*
