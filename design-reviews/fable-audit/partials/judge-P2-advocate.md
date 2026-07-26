# Judge P2 — ADVOCATE (disabled-user lived-experience proxy)

**Panel:** P2 · **Role:** advocate · **Subject:** AccessMap slate v2 (S1–S20) @ `main 82e738b`
**Date:** 2026-07-04 · **Lens:** GOAL 1 above all — can a person WITH a disability actually FIND / trust / CONTRIBUTE via VoiceOver/TalkBack, ×2 Dynamic Type, one hand, limited dexterity, low vision? Secondary axes (cohesion, ethos) scored but never allowed to outrank a real access win.

Personas: **R1** wheelchair/risk-reading · **R2** blind/SR · **R3** low-vision/large-type · **R4** one-handed/limited-dexterity · **R5** craft-trust proxy (not disabled — cohesion signal) · **R6** first-timer/cognitive-load.

**Scoring axes (1–5, integers):**
- **impact** = disabled-user impact (GOAL 1) — the axis I weight hardest.
- **cohesion** = trust + one-material read (GOAL 2).
- **ethos** = fidelity to Deep-Field restraint + access-first distinctiveness.

I score with spread on purpose. The slate is strong, but a flat 4–5 wall would betray the personas — a curb-cut that ends a stranding (S4, S5) is not the same size of win as a casing sweep (S20). My impact column runs the full 2→5 range.

---

## The advocate's calibration frame

The six blinded reads converge on one verdict: **half this app was built for disabled users, half betrays them.** The half they trust — the Nearby list, plain-language severity, the anon banner, honest empty-filters — is real. The betrayals cluster at exactly five places a disabled user's *core job* dies:

1. **CONTRIBUTE is dead on arrival** for the anonymous web guest (R2, R6) — S5, and confirmed by S9 (can't confirm what you submit), S10 (no confirmation it landed), S18 (can't read the button at 200%).
2. **FIND lies on arrival** when location is denied (R1's #1 stranding, R6's quit-risk) — S4.
3. **The severity datum — the whole trust economy — is illegible or inverted** (R1's BUMBAKLOT collapse, R3's yellow-on-yellow) — S2, S1, S14.
4. **The map locks out one-handed / low-vision users** (R4's occluded zoom, R3's black-void tiles) — S6, S7.
5. **The SR engine is sheared off on the only surface guests have** (R2's "submitting blind") — S9, S13, S3.

My highest impact scores go where a disabled user's *job becomes possible where it was impossible*. My lowest go to genuine-but-secondary polish. Cohesion/ethos ride second — I will not inflate a copy-cohesion win into a 5 on the impact axis just because it reads nicely.

A note on R5: R5 is the craft/trust proxy, not a disability persona. Where a proposal's whole value is "the app reads as one built product" (S8), the *disabled*-user impact is real but indirect (orientation load, one less relearn), so its impact score sits below the proposals that unlock a blocked task — even though its cohesion score is top-tier. This is the advocate lens doing its job: cohesion is GOAL 2, and I refuse to let it masquerade as GOAL 1.

---

## Scorecard

| ID | impact | cohesion | ethos | personasServed | note |
|---|---|---|---|---|---|
| S1 | 5 | 5 | 5 | R1,R2,R3,R6 | Severity is THE trust datum; anon-ring fix un-inverts the safety encoding R1 met head-on. |
| S2 | 5 | 4 | 5 | R1,R3 | Live AA breach on the safety number, 3 guest-reachable sites; R3 finally reads the disc. |
| S3 | 5 | 5 | 4 | R1,R2,R6 | The FIND decision finally has a next action; ends R2's accessible dead-end, R1's cul-de-sac. |
| S4 | 5 | 4 | 5 | R1,R2,R6 | Kills R1's #1 stranding lie; honest denied banner + first-run-safe split is exactly right. |
| S5 | 5 | 3 | 4 | R2,R4,R6 | CRITICAL #1 — the anon cohort literally cannot file; this makes CONTRIBUTE reachable on web. |
| S6 | 5 | 4 | 5 | R1,R3,R4 | R4's zoom has no accessible fallback today; 44pt one-thumb zoom-out is a pure gesture-alt win. |
| S7 | 4 | 5 | 4 | R1,R3,R6 | Light-tile theme makes the map legible for R3 at all; arbiter guards the pins. Below unlock-tier. |
| S8 | 3 | 5 | 5 | R2,R3,R6 | Strongest chrome-cohesion win, but disabled impact is indirect (orientation load, double-header). |
| S9 | 5 | 5 | 5 | R2,R3,R6 | Mounts the whole SR engine where guests live; ends R2's "submitting blind." Deepest access repair. |
| S10 | 4 | 4 | 4 | R2,R4,R6 | Silent submit breeds doubt-resubmits the rate limit punishes; persistent live-region fix is correct. |
| S11 | 4 | 4 | 4 | R1,R2,R6 | R1's most-dangerous misread (stalled reads as empty) on the danger path; read/write split is sound. |
| S12 | 4 | 3 | 5 | R1 | Confirmed WCAG 2.3.3 — RM users get the biggest swoop in the app; narrow cohort, exact fix. |
| S13 | 4 | 3 | 4 | R2 | Native VoiceOver #1 — the trust engine is sighted-only if flattening confirms; device-gated but load-bearing. |
| S14 | 3 | 4 | 4 | R1,R3 | Low-severity pins vanish on light tiles, skewing risk DOWN; twin-mitigated by the list (HIGH not CRIT). |
| S15 | 4 | 4 | 5 | R1,R2,R6 | Corrects the FALSE "can't report without account" that turns the anon cohort away; cheap, high-signal. |
| S16 | 4 | 3 | 4 | R1,R3,R4 | Two worst targets on FIND: the recovery-Clear that collapses the panel + the vanishing Recenter. |
| S17 | 3 | 4 | 4 | R2,R4,R6 | Ends app-exit-from-a-button on the landing peek — worst failure for a tremor user; tidy contained fix. |
| S18 | 5 | 4 | 4 | R2,R3,R6 | CRITICAL #5 — R3 can't submit at 200% (mid-word shred); label + aligned a11y name also fixes 2.5.3. |
| S19 | 3 | 3 | 5 | R1,R2,R6 | Consent dignity on the most sensitive ask; benign behavior but dark-pattern shape. Values-load-bearing. |
| S20 | 2 | 4 | 4 | R2,R3,R6 | Trust-fallback copy accuracy; the FAQ "verified" def matters, but lowest direct-job impact on the slate. |

---

## Rationale for the spread (why each impact score, advocate-weighted)

**Impact = 5 (a blocked disabled-user job becomes possible, or a safety-datum betrayal ends):**
- **S1** — Severity number+word everywhere, and the anon-pin ring. R1 met "impassable anonymous barrier reads quieter than trivial authed one" — the safety encoding *inverted*. R2 decodes severity from the list without memorizing the legend. This is the crown datum made honest on every screen. Advocate's top pick on content.
- **S2** — A *live, shipped* WCAG 1.4.3 breach on the safety number, three sites a guest with no account reaches. R3: "I can't read the number on the yellow one." A sub-AA safety datum is the definition of a GOAL-1 failure. 5.
- **S3** — The FIND loop's terminal step. R1: "a dead end exactly where I need a next step." R2's only list verb stops dead-ending into a map they can't perceive and opens a focus-managed sheet. Turns "finds barriers" into "helps me act." 5.
- **S4** — R1's *#1 stranding friction*: trust "5 nearby," find nothing, or quit. The reconciled denied/undetermined split is exactly the honesty a first-run user needs (never told they "denied" when never asked). 5.
- **S5** — CRITICAL #1. The anonymous cohort the app was *built for* cannot file a report on web — the CONTRIBUTE half is dead on arrival. Making the pill kick a location read is the single highest-leverage unlock. 5.
- **S6** — CRITICAL #4. R4: "zoom has no accessible fallback." A 44pt single-pointer zoom-OUT where only pinch existed is a WCAG 2.5.7 win for R4's exact population; R3 gets a reliable enlarge. 5.
- **S9** — CRITICAL #6. Four of six a11y subsystems sheared off at the web bundler, on the ONLY surface a guest has. R2 goes from "submitting blind in the worst sense" to confirmable selection + announcements + labeled dialogs. The deepest access repair on the slate. 5.
- **S18** — CRITICAL #5. R3's 2.0× reality: the submit label shreds mid-word and bleeds toward Cancel — "I could not tell whether I was about to tap Report or Cancel." The label change *also* fixes the 2.5.3 voice-control miss for R2. Core action becomes submittable. 5.

**Impact = 4 (materially advances a disabled-user job / closes a confirmed floor breach, but twin-mitigated or narrower cohort):**
- **S7** — Theming light tiles is what makes the map legible *at all* for R3 (a near-black map in light mode is a contrast catastrophe). Just below unlock-tier because the *list* already carries the data non-visually; this fixes the visual map, which R3/R6 need but R2 routes around.
- **S10** — The silent finish breeds the doubt-resubmit the 5/day rate limit punishes; the persistent-mounted live region is the first signal the anon SR cohort gets. Strong supporting act to S5, not itself the unlock.
- **S11** — R1's stated #1 fear: a stalled fetch reading as "no barriers, safe to proceed" on the danger path. The read/write split keeps the fix from manufacturing a duplicate-flag failure. Field-critical but the honest terminal states already fire on clean offline — this closes the *poor-signal middle*.
- **S12** — A *confirmed* WCAG 2.3.3 failure: RM users get the largest, longest motion in the app on the core FIND payoff. Exact, correct fix — but the cohort is the RM subset, so impact sits at 4 not 5.
- **S13** — The audit's named #1 device check. If flattening confirms, community moderation (the trust engine) is sighted-only on the surface built for it. 4 not 5 only because it is device-gated (confirmation pending) and the bulk-bar is a degraded fallback path that exists today.
- **S15** — Corrects the FALSE "you'll need an account to report" that would turn the anon cohort away before they try — a direct GOAL-1 copy defect (R2 abandons a flow they *can* use). Cheapest high-signal win; 4 because it is copy, not the mechanism (S5 is the mechanism).
- **S16** — The recovery "Clear" that *collapses the panel* on a miss (R1's most-praised flow becomes a trap) and the Recenter that silently vanishes (the documented CONTRIBUTE entry, lost for R3 at 1.3×). Two real HIGH target failures on FIND.

**Impact = 3 (real disabled-user benefit, but indirect / secondary-path / twin-mitigated):**
- **S8** — The strongest *cohesion* win on the slate, and I score cohesion 5 for it. But the disabled-user *impact* is indirect: less to relearn per screen (R6), a removed double-title on Profile (R2), consistent header position (R3). Nobody's blocked task is unblocked. Advocate honesty: cohesion ≠ impact.
- **S14** — Low-severity pins dissolve on iOS light tiles, skewing perceived risk *downward* (the dangerous direction) for R3. Held at 3 because the finding itself is HIGH-not-CRITICAL precisely because the Nearby list carries severity non-visually — the twin mitigates the betrayal for the SR path, and this is native-iOS-light-tile-only.
- **S17** — Ends the app-exit-from-inside-a-button on the landing peek — genuinely the most disorienting failure for a tremor user (R4). Scored 3 because it is a contained, single-surface hardening (the peek), not a core-flow unlock, and the tap-to-open still works for most.
- **S19** — Consent dignity on the app's most sensitive ask (R1, the privacy-cautious core audience; R6 nearly bailed). The behavior is *benign* (denial never blocks) — the defect is the dark-pattern *shape*, so the real-world harm is lower than a functional lockout. Values-load-bearing, hence ethos 5, but impact 3.

**Impact = 2 (real gap, lowest direct-job impact on the slate):**
- **S20** — Trust-fallback surfaces (Help FAQ accuracy, stale changelog, About anchors, casing). The FAQ *is* the only "verified" definition until S1's legend block, and the wrong report path misdirects R6 — so it is not a 1. But among 20 proposals this is the furthest from unblocking a disabled user's core FIND/CONTRIBUTE task; it repairs the periphery consulted when trust is already strained. 2 is the honest advocate floor here.

---

## Cross-cutting advocate observations (for the report writer)

- **The unlock cluster is S5 + S9 + S4 + S18 + S2.** If the slate could ship only five things for disabled users, these are they: they take core FIND/CONTRIBUTE jobs from *impossible* to *possible* for R2/R3/R6 and end R1's #1 stranding. The advocate's ranking puts these at the top regardless of effort.
- **S1/S2/S14 are one severity-integrity arc.** Ship them together (S2 ink → S1 word+ring → S14 hairline) — the datum R1's whole trust judgment rests on. Fragmenting them leaves the crown jewel half-honest.
- **S9 is the force-multiplier.** S3, S10, S11, S13 all lean on the same persistent-live-region / a11y-model mechanism S9 establishes. For the disabled user, S9 is the substrate that makes the others *actually announce* on web.
- **Device-gated ≠ deprioritize.** S13 (VoiceOver #1) and the native legs of S14/S6 are NEEDS-SKY-DEVICE, but the advocate weights them as real: the fix codes now, the confirmation is the device pass. Do not let "unverified on device" demote a fix that unblocks R2's trust engine.
- **The one I'd fight for out of proportion to its tier:** S15's false-"can't-report" copy. It is a QuickWin (S), MEDIUM-ish findings — but it *turns the anonymous cohort away at the door* before S5 even gets a chance to work. Copy that lies about who can contribute is a GOAL-1 defect wearing a POLISH costume.

**Read-only audit — no code, builds, DB, or git touched. Wrote exactly this one file.**
