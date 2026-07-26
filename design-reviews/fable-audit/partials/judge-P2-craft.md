# Judge P2 — CRAFT lens · AccessMap Fable Audit Part 3

**judgeId:** P2-craft · **panel:** P2 · **role:** craft
**Subject:** the 20-proposal reconciled slate (`partials/slate-proposals.v2.md`) @ `main` `82e738b`.
**Lens:** senior mobile product-craft reviewer. I weight *feasibility, RN/Expo correctness, completeness + durability, and felt-quality-without-new-debt*. Axes scored 1–5 (5 best), integers, deliberately spread. Read-only; no code/build/db/git touched.

---

## How I calibrated (craft priors)

- **impact** (disabled-user job): unblocking a *dead flow* (S5, S9) or ending a *stranding lie* (S4) tops it; pure-copy trust repairs (S15, S20) are real but lower on "job made possible." Native-only wins gated behind the one TestFlight build (S13) are real but currently unverifiable on device — I hold impact honest, not aspirational.
- **cohesion** (one-material read vs GLASS): system-wide grammar unification (S1 severity, S7 tiles, S8 header) tops it; isolated correctness fixes (S5, S13, S17) barely move cohesion and I score them there honestly.
- **ethos** (Deep-Field restraint + access-first distinctiveness): *adopting a ratified token/pattern* (S2 `textOnColor`, S3 "own the FlagDetailModal you already built", S14 `#0F1B2D` hairline-union) scores highest; a *net-new build* that risks the restraint budget (S14 native marker rebuild) I dock a notch even when necessary.

**Craft confidence in the reconciliation:** high. The 8 FIXes are the difference between a slate a mid-level dev would ship into a duplicate-flag incident (S10/S11 pre-fix) and one that survives contact with RN-web reality. Three FIXes in particular are load-bearing and correct: S9 routes announcements through a *rendered* `aria-live` node (not the dead `announceForAccessibility`); S11 splits READ-abort from WRITE-escalate so a slow-but-committed insert can't become a duplicate under the anon 5/day cap; S14 honestly re-tags the native arm as a full custom-marker rebuild with `tracksViewChanges={false}`. That is real mobile literacy, not audit theater.

---

## Scorecard

| ID | impact | cohesion | ethos | craft note (≤15 words) |
|---|---|---|---|---|
| S1 | 4 | 5 | 5 | Severity grammar is THE signature; unifies content layer; adopts existing helpers, invents nothing. |
| S2 | 4 | 4 | 5 | Mechanical token swap, arbiter-proven, extends the app's own ratified law. Cleanest possible fix. |
| S3 | 5 | 4 | 5 | Wires an SR-complete modal the app already built and hid. Real integration, deep payoff. |
| S4 | 5 | 3 | 4 | Ends the #1 stranding lie; the denied/undetermined split FIX averts a fresh first-run lie. |
| S5 | 5 | 2 | 3 | One-line parity fix unblocks the whole guest CONTRIBUTE flow. Low cohesion, huge impact. |
| S6 | 4 | 4 | 4 | 44pt zoom is real device-integrity; the mandatory-arbiter + additive-zoom-method FIX is correct. |
| S7 | 4 | 5 | 4 | Light-tile theming restores map legibility; the union-ring-if-white-fails rail is exactly right. |
| S8 | 2 | 5 | 4 | Strongest chrome-cohesion win; low direct disabled impact; box-none Map-header invariant well-constrained. |
| S9 | 5 | 4 | 5 | Mounts the best-engineered subsystem where guests live; wide but each edit mechanical, rendered-aria-live correct. |
| S10 | 3 | 3 | 4 | Persistent-mount + guest-path FIX is essential; without it SRs miss the node-insert. Solid, not signature. |
| S11 | 4 | 3 | 5 | Mirrors the GPS race; READ-abort/WRITE-escalate split is the sharpest craft call on the slate. |
| S12 | 3 | 3 | 4 | Kills the falsy-zero trap with `{animate:false}`; small, correct, guard-tested. RM cohort served. |
| S13 | 4 | 2 | 4 | The #1 native VoiceOver fix; correct restructure, but impact is device-gated and unconfirmable now. |
| S14 | 3 | 4 | 4 | Honest M re-tag: native is a full marker rebuild; `tracksViewChanges` guard prevents per-pan regress. |
| S15 | 3 | 3 | 4 | Cheap high-signal copy; corrects the false "need an account" that turns away the anon cohort. |
| S16 | 3 | 2 | 3 | Two real 44pt/overflow fixes on FIND; "Clear" adopts the sibling's already-correct pattern. |
| S17 | 3 | 2 | 4 | A `pointerEvents="none"` wrapper removes app-exit-from-a-button. Tidy, high-confidence, low-risk. |
| S18 | 4 | 3 | 4 | "Submit report" relabel buys 40% headroom AND fixes 2.5.3; item-③ correctly hard-dep'd on S8. |
| S19 | 3 | 2 | 4 | Extends the "Maybe later" pattern eight lines away to the most sensitive consent ask. |
| S20 | 2 | 3 | 4 | Copy/link repair of trust-fallback surfaces; the FAQ "verified" def is the only one pre-S1. |

---

## Rationale for the notable spreads (craft view)

**Top impact (5):** S3, S4, S5, S9 — each either unblocks a dead flow or ends a stranding lie for the exact cohort. S3 and S9 are the two I'd fight hardest for: both *cash assets the app already shipped* (a hidden SR-complete modal; a best-in-class a11y subsystem one bundler-dialect gap from working). That is the highest-leverage, lowest-invention craft on the slate.

**Low impact, high cohesion (S8 = 2/5, S18-adjacent):** S8 is the single strongest "one product" chrome win and I scored cohesion 5 — but a header-family unification does *not* make a disabled user's core job possible in the way S3/S5/S9 do (the only real access legs are the Profile double-header removal and the constrained close-affordance names). Scoring its impact 4-5 would flatten the slate dishonestly. Same discipline on S16/S17/S19/S20: genuine hardening, but their disabled-impact is narrower than the flagship unblocks, so they sit at 3 and I did not inflate them.

**Ethos ceiling (5) reserved for token/pattern adoption:** S1, S2, S3, S9, S11. Each *extends the app's own ratified law* (severity grammar, `textOnColor`, the FlagDetailModal, the a11y hook suite, the GPS-race shape) rather than importing a new idiom — the purest expression of Deep-Field restraint. S14 is the instructive counter-case: it adopts the ratified `#0F1B2D` ink (good) but on native must *build a net-new custom-View teardrop marker* — necessary and well-guarded, but a rebuild spends restraint budget, so ethos 4 not 5.

**Where craft docks the score:**
- **S13 impact 4 (not 5):** the fix is correct and the restructure stands on the documented RN flattening pattern, but the payoff is iOS-VoiceOver-only and *unconfirmable until the one TestFlight build*. I score the code quality high and the realized impact honestly — it is the audit's #1 device check precisely because it isn't proven yet.
- **S14 impact 3:** twin-mitigated (the Nearby list carries severity non-visually — the reason the finding is HIGH not CRITICAL), and the win lands only on native Apple light tiles (NEEDS-SKY-DEVICE). Real, but not a flow-unblock.
- **S16/S20 cohesion 2-3:** two-target hardening and copy repair don't materially advance the one-material read; I refuse to reward them there.

**No new-debt flags.** Every FIX narrows scope; none adds a feature. The reconciliation explicitly protects `GlassSurface.tsx` (DO-NOT-EDIT, threaded not forked), the `box-none` gesture law (written into S6/S8/S17 constraints), `tracksViewChanges` virtualization discipline (S14), and the anon rate-limit footgun (S10/S11). From a durability standpoint this slate raises felt quality without seeding the next audit's findings — which is the bar.

**One craft caveat for the assembler (not a scoring deduction):** S6, S7, S8, S12, S17 all touch `PlatformMap.web.tsx` / the Map overlay region, and S1/S3/S14 all touch the native pin renderer. The slate already flags the "one map-overlay pass" and "one native pin-renderer pass" sequencing — honor it, or these otherwise-clean fixes will collide in the working tree. That is an execution-ordering note, correctly surfaced in the proposals themselves.
