# Adversarial Skeptic Verdict — S15

**Proposal:** S15 — "First-run honesty sweep: retire the four promises the app can't keep in minute one"
**Resolves:** L1-2 (HIGH, copy half), L1-8 (MED), L1-11 (LOW), L8-11 (MED), L8-14 (MED, submit-moment half)
**Verdict: KEEP** (all 7 rails hold under verification)

---

## What I verified in the actual code (not trusted from the field text)

| S15 claim | Code check | Result |
|---|---|---|
| SignInScreen hint "Reporting flags requires an account" is FALSE | `SignInScreen.tsx:239` — verbatim `accessibilityHint="Browse the map without signing in. Reporting flags requires an account."` | CONFIRMED false — anon reporting is shipped |
| SignInScreen note "you'll need an account to report or verify" is false (report half) | `SignInScreen.tsx:243` — verbatim `You can look around, but you'll need an account to report or verify` | CONFIRMED — "report" half false; "verify" half is true (that's L1-5, correctly NOT in S15's scope) |
| Anonymous reporting is a real, shipped, first-class flow | `flags.ts:1270` `export async function createAnonFlag`; wired into the sheet at `ReportFlagModal.tsx:315` `await createAnonFlag({…})`, anon banner `:478-503` | CONFIRMED — the copy S15 corrects is provably false against shipped behavior |
| Onboarding slide 2 teaches a non-existent interaction | `OnboardingCards.tsx:102` — verbatim `Tap where the barrier is, snap a photo if you can, and rate how bad it is.` | CONFIRMED — no plain-tap placement anywhere; anon flow has no photo (`flags.ts:888-891` comment "Photos are not supported for anon submissions") |
| L1-11 replay-tutorial content divergence | `SettingsScreen.tsx:552` mounts `OnboardingModal` (3 cards) not the 5-slide `OnboardingCards`; L1.md:86-91 | CONFIRMED (LOW, copy-consistency) |
| Noun whiplash (barrier/flag/report/task) | onboarding "barrier" (`OnboardingCards.tsx:96,102`), map "flags nearby", Home "reports", `STATUS_LABELS.open = 'Open'` (`flags.ts:1163`) | CONFIRMED (L8-11) |
| No submit-moment "what happens next" line near the CTA | submit button at `ReportFlagModal.tsx:974`; grep for "appears on the map"/"neighbours"/"verify it"/"notify the city" → zero hits in the file | CONFIRMED — L8-14 holds; the sentence does not exist today |
| The privacy-forward exemplar S15 says it preserves is real and untouched | `ReportFlagModal.tsx:488` "Reporting anonymously — your identity is not stored."; `:704` "Your anonymous report still counts." | CONFIRMED — PROTECT-11 exemplar exists; S15 corrects the funnel copy TOWARD it, never edits it |
| "open → unconfirmed" is a SUGGESTION, not a hard status-grammar change | Field-text wording: "*consider* 'open' → 'unconfirmed'" | CONFIRMED — hedged; not a prescribed change that would collide with PROTECT-4 or require an arbiter re-run |
| L8-4 / L8-4a correctness bugs are FORKED, not claimed | S15 resolves-list = {L1-2 copy, L1-8, L1-11, L8-11, L8-14}; L8-4a (the guest-verify fabricated-conflict correctness bug, L8.md:57) is absent; FORKS-TO-SKY names the guest-contract canonical | CONFIRMED — honest scoping; the correctness bug is not smuggled into a copy proposal |

**Fork faithfulness.** `sky-notes.md #3` (THE AUTH WALL & THE GUEST CONTRACT) is exactly the walled-native-CTA + guest-mode-amnesia + L8-4/L8-4a decision. S15's FORKS-TO-SKY line explicitly hands the *structural* half of L1-2 (the sign-in-wall architecture, the un-persisted `guestMode` amnesia at `App.tsx:110`) and the L8-4/L8-4a correctness bugs to that canonical, and keeps only the four copy strings. This matches the S5 fork pattern (S5 also forks the "should web expose sign-in/request location" half of note #3 and keeps only its correctness fix). No data-layer or product-scope decision is prescribed inside S15.

---

## Per-rail verdict

- **tracesToFinding = true.** Every cited ID resolves to a code-confirmed, currently-shipping defect, and S15 resolves the *copy half* of each — which is the half it claims. L1-2c: two false strings at `SignInScreen.tsx:239/:243`, provably false because `createAnonFlag` ships. L1-8: `OnboardingCards.tsx:102` teaches tap-placement + photo that guests do not have. L1-11: replay divergence (`SettingsScreen.tsx:552` → wrong tutorial). L8-11: four display nouns for one object, `STATUS_LABELS.open='Open'` collides with open-for-business. L8-14: no post-submit sentence exists near the CTA (`:974`). The proposal does not overclaim — it explicitly leaves L1-2's structural half and L8-4/L8-4a to the fork.

- **wcagFloorHeld = true.** Strictly access-positive or neutral. Correcting the false a11y hint at `SignInScreen.tsx:239` removes a false statement from the SR experience (WCAG 3.3.2 spirit — the guidance the control gives is now true). The noun canon reduces cognitive load (WCAG 3.1.5 spirit). The submit-moment sentence adds honest process disclosure. Nothing is removed from the accessibility tree; no contrast, target-size, focus, or state mechanism is touched. No floor is traded for polish.

- **glassLawHeld = true.** Pure copy. No color/floor/severity token, no `expo-blur` intensity (12/24 budget untouched — no blur pane involved), no `pointerEvents="box-none"` overlay edit, `GlassSurface.tsx` not opened, no `windowSize`/`removeClippedSubviews`/`forceEngineered` surface. The only vocabulary item that brushes the severity/status grammar is "consider open → unconfirmed," which is (a) hedged as a suggestion and (b) a label-string change with no color consequence (the status chip color at `flags.ts:1174` is unaffected by relabeling its text). Nothing eye-tunes a floor.

- **protectPreserved = true (verified, not trusted).**
  - **PROTECT-5 (contrast-arbitration / severity grammar family, per protect-merged.md #4-5):** S15 touches no ink/floor. The "consider open → unconfirmed" note, even if adopted, is a status *word*, not a severity color pairing, and is hedged — it does not weaken the arbitrated ink-on-color rule. (Note: S15's own field-text cites "PROTECT-5" as "the anon-report sheet trust block"; in the merged list the anon-honesty set is PROTECT-8 and the anon exemplar sheet is protected under the trust-voice / honesty-set items. The *substance* of the claim — the anon-report sheet exemplar at `ReportFlagModal.tsx:478-503,704` is untouched and the funnel copy is corrected toward it — is verified true. The PROTECT-number label in the field is imprecise, but the crown jewel it points at is genuinely preserved. This is a citation-nit for the assembler, not a rail failure.)
  - **PROTECT-11 (privacy-forward trust voice, merged #11):** verified — the exemplar strings ("your identity is not stored" `:488`, "Your anonymous report still counts" `:704`) are the target voice; S15 edits the *funnel* copy toward them and leaves the exemplar untouched. The merged list explicitly says "the L1-2/L8-4 copy fixes correct *toward* this truth" — S15 is exactly that.
  - **PROTECT-10 (Home's honesty law, merged #10 / field cites as PROTECT-3):** verified — the noun canon touches *labels* only; it does not touch the never-fabricate-distances logic (`HomeScreen.tsx` LATEST/Recent fallback). Coordinated with S1, which owns routing Home's raw status enum through `STATUS_LABELS` — S15 does not fight S1, it depends on it (sequencing named).
  - **PROTECT-1 (Nearby twin):** not touched by S15's four edits.

- **rnExpoFeasible = true.** No RN/Expo hazard invoked. S15 relies on ZERO `announceForAccessibility`/`setAccessibilityFocus` calls — the corrected a11y hint is a static `accessibilityHint` prop string (`SignInScreen.tsx:239`), which renders identically on native and web (no announce-on-web no-op trap). No CSS-only trick, no nested `accessibilityState` dialect dependency. All four edits are literal string replacements in existing components that already render on both platforms.

- **accessNotTradedForPolish = true.** No hidden access regression. Every edit is either access-positive (removing a false hint, lowering decode tax, disclosing process) or access-neutral (display-noun consistency). Nothing that reads as "polish" costs a screen-reader user information.

- **arbiterReRunPresent = true (vacuously — no color touched).** S15 changes no color, floor, or severity value and invents no token, so the rail's arbiter-re-run requirement is satisfied by "touches no color/floor → true." Field (7) correctly states "No arbiter (copy)." The one status-word suggestion is hedged and colorless.

---

## Fix conditions
None required for KEEP. Two non-blocking notes for the assembler:
1. **PROTECT-number citation cleanup (cosmetic).** Field (6) cites "PROTECT-5" for the anon-report sheet trust block and "PROTECT-3" for Home's honesty law; in the assembled `protect-merged.md` the anon-honesty set is #8, the privacy voice is #11, and Home's honesty law is #10 (PROTECT-3 there is the ReportFlagModal *sheet architecture*, which S15 also does not regress — it adds no structure). The crown jewels S15 points at are all genuinely preserved; only the numbers are off. Have the assembler normalize the PROTECT references. Not a rail failure — verified by reading each referenced item.
2. **Sequencing lock with S1 + S20.** The noun canon and the "consider open → unconfirmed" note ripple across Home/Map/Tasks labels; S1 owns routing Home's status enum through `STATUS_LABELS` and S20 owns casing. S15 already names both — keep them in one copy pass so the noun canon and S1's `STATUS_LABELS` adoption don't double-edit the same Home strings. If "open → unconfirmed" is actually taken up, route it through `STATUS_LABELS.open` (`flags.ts:1163`) as a single-source label change so every surface (Profile, Map filter, StatusBadge, StatusHistory) moves together — do NOT hand-edit individual screens.

## Reasoning (why not FIX or KILL)
Every load-bearing factual claim is code-true: the two "false" SignInScreen strings are verbatim at `:239/:243` and provably false because `createAnonFlag` (`flags.ts:1270`) ships and is wired into the sheet; the onboarding slide-2 promise is verbatim at `:102` and describes an interaction that does not exist for the guest being taught; the submit-moment sentence genuinely does not exist near the CTA at `:974`; the anon exemplar the proposal promises to preserve is real and untouched at `:488/:704`. The proposal is pure copy — it trips no WCAG floor, no GLASS law, no blur budget, no `box-none` gesture law, no arbiter/token requirement, and no RN-web announce no-op. Its scoping is honest: the structural auth-wall/amnesia half of L1-2 and the L8-4/L8-4a *correctness* bugs are explicitly forked to the guest-contract canonical (`sky-notes.md #3`), so a copy proposal is not masquerading as a fix for a data-layer/product decision. The only blemishes are a handful of imprecise PROTECT numbers in field (6) — verified to point at crown jewels that ARE preserved — which is an assembler cleanup, not a defect in the fix. Clean. KEEP.
