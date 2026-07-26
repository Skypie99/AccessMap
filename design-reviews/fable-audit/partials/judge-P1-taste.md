# Judge P1 · role: TASTE — AccessMap Fable Audit Part 3

**Judge:** P1-taste · **Panel:** P1 · **Role:** taste (Sky's taste guardian)
**Subject:** the 20-survivor reconciled slate (`partials/slate-proposals.v2.md`) @ `main` `82e738b`
**Date:** 2026-07-04 · **Read-only.** No code, build, DB, or network touched. One file written (this one).

---

## Lens I judged by

Fidelity to the **Deep-Field ethos**: material depth as hero, used with **restraint** and breathing room; **editorial typography**; **always legible**; WCAG AA as a *floor, not a target*. The enemy is **clutter / occlusion / anything that costs legibility or reachability**. Distinctiveness must come **from** the ethos (the severity grammar, the editorial header, the ratified contrast law, the honest voice) — never by abandoning it.

- **impact** = how much it makes a real disabled user's core job possible/easier.
- **cohesion** = trust + one-material read vs GLASS.md (credibility + "one product" feel).
- **ethos** = Deep-Field fidelity + restraint + access-first distinctiveness.

I scored with deliberate spread. The peak is reserved for the three moves that make AccessMap *more itself* while removing an access failure (S1, S3, S9). The floor (S20) is honest copy hygiene — necessary, least distinctive. Mechanical fixes that **extend the app's own ratified law** (S2, S14) earn top **ethos** even when impact is narrow — that is the cleanest in-ethos move there is. Pure correctness bug-fixes that are "not a moment" (S5) score high on impact, low on ethos, by design.

---

## Scorecard (impact / cohesion / ethos, 1–5)

| ID | impact | cohesion | ethos | note |
|---|---|---|---|---|
| S1 | 4 | 5 | 5 | The named signature, finished. Severity grammar = the crown jewel; anon-ring fixes a safety inversion. |
| S2 | 4 | 4 | 5 | Extends the app's own ratified `textOnColor` law — cleanest possible move; digit narrow, ethos peak. |
| S3 | 5 | 5 | 5 | Adopts a built-and-hidden asset to end the badge-economy dead-end. Most in-ethos signature on the slate. |
| S4 | 5 | 5 | 4 | Kills the highest-frequency lie ("N nearby"); honesty law extended, but state/copy, not a material advance. |
| S5 | 5 | 3 | 3 | The #1 CRITICAL unblocked. A bug fix, "not a moment" — huge impact, thin cohesion/ethos by nature. |
| S6 | 4 | 4 | 5 | Kills occluded, pointer-dead zoom — the enemy incarnate; app chrome claims the surface, opaque ratified ink. |
| S7 | 4 | 5 | 5 | Ends the black-hole tiles + foreign Leaflet chrome; Deep Field carried onto the one surface that escaped it. |
| S8 | 3 | 5 | 5 | Editorial header to completion; kills the "two kits" seam. Cohesion/ethos peak; core-job impact modest. |
| S9 | 5 | 4 | 5 | Mounts the best subsystem where guests live; the promise made true. Deepest access repair on the slate. |
| S10 | 4 | 4 | 4 | Closes the CONTRIBUTE loop via the app's own FlashBanner idiom; supporting act to S5. |
| S11 | 4 | 4 | 4 | Temporal-honesty spine; R1's #1 fear. Mirrors the GPS pattern — honest infra more than a taste moment. |
| S12 | 3 | 4 | 4 | WCAG 2.3.3 correctness; narrow RM cohort, one interaction; extends RM discipline to the last surface. |
| S13 | 4 | 3 | 4 | Frees the trust engine for VoiceOver (audit's #1 device check); single surface, no material read. |
| S14 | 3 | 4 | 5 | Extends the ratified §12.4 hairline-union to pins; arbiter-decided; twin-mitigated impact, ethos peak. |
| S15 | 3 | 4 | 4 | Retires four minute-one lies/whiplash; one noun canon; pure copy in the trust voice, no material advance. |
| S16 | 4 | 3 | 4 | Kills the 34×17 "Clear" + vanishing Recenter (occlusion/reachability); already-patterned, reachability-first. |
| S17 | 4 | 3 | 4 | Removes app-exit-from-a-button off the landing surface; restraint — a few lines kill a class of disorientation. |
| S18 | 4 | 3 | 4 | Fixes shipped 1.4.4 + 2.5.3 on the most important button; copy that sharpens it (verb-forward, honest). |
| S19 | 3 | 3 | 4 | Extends the app's OWN "Maybe later" to its most values-load-bearing consent — very in-ethos for this app. |
| S20 | 3 | 3 | 3 | Repairs the trust-fallback surfaces; casing sweep is the lowest-stakes cohesion. Necessary, least distinctive. |

---

## Rationale (taste read, most-distinctive first)

**The three that make AccessMap *more itself* — S1, S3, S9 (all 5-impact where it counts).**
S1 is Sky's taste anchor by name: all six blinded readers praised the numbered-disc + word + one-line-stake severity grammar, and today it is spoken in full in exactly one place. Repeating it identically at every decision surface, plus restoring the anon-pin's severity *fill* (the gray swap literally inverts the safety encoding), is the signature executed to completion — the "memorable, ownable, in-ethos" move, and it is *more* accessible because it closes a color-only failure. S3 is the most in-ethos signature available: the app already built a full SR-complete trust ledger and hid it three taps deep; wiring the callout + Nearby list into it is owning what you shipped (DESIGN.md rewards exactly this) and makes the central promise word — "verified" — inspectable, which no venue-rater in the meta-table does. S9 makes the app's best-engineered subsystem actually work on the only surface guests have; shipping the web app with its a11y engine sheared off at the bundler is a mission breach, not a polish item.

**The occlusion-killers — S6, S7, S16, S17.** My lens names clutter/occlusion the enemy, and these four remove it. S6 and S7 co-sign the "built, not embedded" win on the flagship: S6 replaces a dead, occluded, pointer-dead zoom with reachable 44pt app chrome in the thumb zone; S7 ends the black-hole tiles (a genuine contrast catastrophe for R3 in light mode) and tames the foreign Leaflet strip. Both adopt ratified tokens and re-run the arbiter — distinctiveness from the ethos, never by abandoning it. S16 and S17 are smaller but clean: S16 fixes the recovery target whose miss *collapses the panel* and the Recenter that silently vanishes; S17 removes app-exit-from-a-button off the landing screen with a `pointerEvents` wrapper — maximal restraint, whole class of disorientation gone.

**The ratified-law extensions — S2, S14 (ethos peak, narrow impact).** These are the cleanest in-ethos moves on the slate: both adopt an *existing* ratified token (`textOnColor`, the `#0F1B2D` hairline-union) and let the arbiter, never the eye, decide the floor. I score their ethos at 5 even though the disabled-user impact is narrower (S2's digit is already in the SR label; S14 is twin-mitigated by the Nearby list) — extending the app's own documented law is precisely the fidelity this lens rewards.

**The honesty spine — S4, S10, S11, S15, S18, S19, S20.** AccessMap's copy voice is a real asset (five of six readers *counted* the honest changelog / privacy microcopy toward trust). S4 kills the highest-frequency lie in the audit; S11 fills the danger-path silence R1 named her #1 fear; S18 fixes a shipped 200% failure *and* a Label-in-Name miss on the most important button with one string; S19 extends the app's own respectful "Maybe later" to its most sensitive consent. These are honest and in-voice, so their ethos sits at 4 — but copy/state fixes don't advance the *material* signature, which is why none reach 5 on my lens. S20 is the floor: correct, necessary, but casing sweeps and FAQ fixes are the least distinctive work here.

**The near-misses on impact.** S5 is the biggest disabled-user unlock on the slate (the whole CONTRIBUTE half, dead on arrival for the anon cohort) — impact 5 — but it is explicitly "a bug fix, not a moment," so cohesion/ethos stay low; that is not a demerit, it is what a parity fix is. S8's impact I hold at 3: removing a double header and unifying chrome is a cohesion/polish win a careful user reads as care, not a core-job unlock — its cohesion and ethos are peak precisely *because* the editorial eyebrow + display type IS AccessMap's chosen identity.

**Taste guardrails I want honored downstream (not scored, but load-bearing).** Every color/floor move on this slate correctly names an arbiter re-run and adopts a ratified token — S6 and S7's reconciliations fixing the "no arbiter" misses is exactly right; the eye must never tune a floor. `GlassSurface.tsx` stays DO-NOT-EDIT; blur stays 12/24; the `box-none` gesture law is written into S6/S8's Map-header constraints. The one place my lens would raise a hand: S8 on FullMap must NOT drop a scrolling display-40 ScreenHeader onto the map canvas — converge chrome grammar only, resolve layout in the mockup/Design-Compiler stage. The reconciliation already says this; I am seconding it as a taste requirement, not re-litigating.

---

## Spread check
Impact ranges 3–5 (three 5s: S3, S5, S9; six 3s). Cohesion 3–5 (five 5s on the signatures; seven 3s on the targeted fixes). Ethos 3–5 (nine 5s — earned by signatures + ratified-law extensions + occlusion-kills; one 3 floor at S20). No axis is clustered at 4–5; the flat slate is deliberate.
