# Adversarial Skeptic Verdict — S14

**Proposal:** S14 — "Give map pins the ratified hairline boundary so low-severity barriers stop vanishing on light tiles" (resolves L6-07; effort S–M; tier Meaningful; FORKS-TO-SKY: none).

**VERDICT: FIX** — the idea is a genuine, correctly-scoped WCAG 1.4.11 floor fix on a CONFIRMED arbiter-measured HIGH, it adopts the existing ratified `#0F1B2D` ink and names the arbiter re-run, and it trades no access. But two rails need concrete conditions before it can ship clean: (a) the "replication, not design — the recipe already exists on clusters" framing is **false on the arm that actually fails** (native iOS), and (b) the "preserves" list is **silent on PROTECT-15**, the one crown jewel the native rebuild actually threatens.

---

## Per-rail booleans

| Rail | Verdict | Notes |
|---|---|---|
| tracesToFinding | **true** | L6-07 is CONFIRMED (02_findings.md:50, "numbers reproduced exact"), arbiter-measured HIGH. Numbers reproduce exact against arbiter.md:200-206 and tools/audit-stacks.json:63-69 (ring 1.00, sev1–3 1.57/2.15/2.78, sev4 3.61 PASS, sev5 4.35 PASS, anon 2.54). The fix genuinely addresses the cited finding. |
| wcagFloorHeld | **true** | This IS the floor fix — restores the 3:1 non-text-contrast (1.4.11) boundary on tappable map targets. Improves the floor; never trades it. |
| glassLawHeld | **true (conditional)** | Adopts the ratified `#0F1B2D` ink — arbiter decides, no eye-tuned floor. No BlurView (map-internal world, GLASS §12 rule 6), so blur budget (12/24) untouched. GlassSurface.tsx not edited/forked. box-none and windowSize/removeClippedSubviews untouched. **Condition:** the native rebuild must honor GLASS §12 rule 6 (content-derived snapshot key) + rule 8 (mode-independent always-light literal) — see PROTECT-15 below. |
| protectPreserved | **false (as written)** | Preserves the arbitration system (PROTECT-5) and GlassSurface DO-NOT-EDIT — those claims verify. **But the "preserves" list omits PROTECT-15** (store/marker snapshot discipline), which the native fix directly implicates. Today the native pin (`PlatformMap.tsx:222-238`) is a bare `pinColor` system marker with **no `tracksViewChanges={false}`** and no custom face (only a `<Callout>` popup). The OS draws it, so no snapshot control is needed. The moment S14 adds a `#0F1B2D` hairline on native it must replace that system marker with a custom child-View teardrop (the only mechanism that can carry a hairline) — a per-pan re-rasterizing marker that MUST adopt `tracksViewChanges={false}` + a content-derived key, exactly as the cluster does (`:132,139` `key={cluster-${id}-${count}}`), or it regresses PROTECT-15. The proposal never names this. |
| rnExpoFeasible | **true (but mechanism misdescribed)** | No web-announcement dead-on-arrival problem; it is RN-real and buildable (the native cluster at `:130-158` proves a custom child-View `<Marker>` + `clusterRing`/`#0F1B2D` border is available). **But** "replicate the cluster recipe on the pin renderer in **both** files" is only true for `.web.tsx` (DivIcon HTML — a one-line `box-shadow:0 0 0 1px #0F1B2D` add), and on web pins **already pass** (CARTO `dark_all` always → ring 21:1; arbiter + finding explicitly exempt web). The **failing arm is native iOS light tiles**, where the pin has no ring to thread — so the real fix is a **net-new custom teardrop marker = "design," not "replication,"** and materially larger than the "just replicate the cluster" framing. |
| accessNotTradedForPolish | **true** | Pure access gain — restores a boundary channel that vanishes for low-vision iOS-light-mode users. No hidden regression dressed as polish. |
| arbiterReRunPresent | **true** | VERIFICATION names `contrast-check.mjs` + `tools/audit-stacks.json` (the §C tileExtremes rows — they exist on disk at `tools/audit-stacks.json:63-69`), adopts the existing `#0F1B2D` ink (invents no token), and requires exit-0 on the four proof-sets for no-regression. `contrast-check.mjs` is the slate-wide canonical name for the arbiter checker (identical usage in the preamble + S1/S2/S7/B6), not a S14 fabrication. |

---

## The core skeptic finding (why FIX, not KEEP)

**The proposal papers over an inversion between where the recipe lives and where the failure is.**

- **Where the recipe lives:** the ratified `#0F1B2D` 1px hairline-union exists on the **web cluster** (`.web.tsx:175` `box-shadow:0 0 0 1px #0F1B2D`) and the **native cluster** (`PlatformMap.tsx:148-149` `clusterRing` wrapper `borderColor:'#0F1B2D'`, snapshotted `tracksViewChanges={false}`). Both are custom child-View / DivIcon renders.
- **Where the failure is:** the arbiter's failing arm is the `#FFF` base = **iOS Apple light tiles** (finding L6.md:109 "Web is exempt in practice… the failing arm models iOS Apple light tiles"; arbiter.md:274 "web tiles are always dark… the `#FFF` arm models iOS Apple light tiles").
- **The gap:** on **web** the pin IS a custom DivIcon (`.web.tsx:116-122`) — trivially threadable — but web pins pass (dark tiles). On **native** the pin is `pinColor` (a system OS teardrop, `PlatformMap.tsx:228`) — there is **no custom face to attach a hairline to.** So the arm that fails is exactly the arm where "replication" is impossible; the native fix is a full custom-marker rebuild.

This does not make S14 infeasible or access-trading — the direction, token, arbiter-gating, and access rationale are all correct, and the cluster proves the native custom-marker pattern is available. It makes S14 **misdescribed** on effort/mechanism and **incomplete** on PROTECT-15. Both are fixable with concrete conditions.

**Coordination note (not a S14 defect):** S1 (the SIGNATURE proposal S14 sequences with) carries the *same* latent native gap — it adds an anon "ring or dashed border" to `PlatformMap.tsx:228`, which is also a `pinColor` system marker. If S1 and S14 are built together in the one coordinated pin-renderer pass they both call for, the native custom-teardrop rebuild is done **once** and both the anon ring (S1) and the severity hairline (S14) compose on it. That shared rebuild is the natural home for the PROTECT-15 snapshot posture. Sequencing S14 with S1 is therefore not just allowed — it is how the effort stays "S–M" instead of two separate native rewrites.

---

## fixConditions

1. **Correct the effort/mechanism claim.** Drop "replication, not design — the recipe already exists on clusters" as the native characterization. State honestly: web = a one-line DivIcon `box-shadow` add (but web pins already pass — cosmetic parity only); **native = replacing the `pinColor` system marker with a custom child-View teardrop** (severity fill + white ring + `#0F1B2D` outer-hairline wrapper View + counter-rotated category glyph + preserve the `<Callout>`, the opacity/focus-dimming, and the anon variant). Re-tag effort M (the native rebuild), not S–M framed as replication.
2. **Add PROTECT-15 to the preserves list, explicitly.** The new native custom marker MUST carry `tracksViewChanges={false}` + a content-derived key (mirroring the cluster's `cluster-${id}-${count}`) so it snapshots and does not re-rasterize every pan, and MUST be a mode-independent always-light literal (GLASS §12 rule 8). State "preserves PROTECT-15 (marker snapshot discipline) and PROTECT-16 (mode-independence)."
3. **Scope the web half honestly.** Note that the web DivIcon hairline is internal-consistency/parity only (web tiles are `dark_all`, ring 21:1, already AA) — the access win lands entirely on native iOS light tiles, which stays NEEDS-SKY-DEVICE for the visual while the arbiter re-run gates the contrast in-harness.
4. **Keep** the arbiter re-run (already present and correct) and the `#0F1B2D`-only token adoption (no new token) — those rails are clean.
5. **Sequence with S1 in one native pin-renderer pass** (already stated) so the custom-teardrop rebuild happens once and the anon ring + severity hairline compose without a second native rewrite.

---

## Reasoning (summary)

S14 is a real, correctly-motivated WCAG 1.4.11 floor fix on a CONFIRMED arbiter-measured HIGH (L6-07), adopting the app's own ratified `#0F1B2D` ink, arbiter-gated with the named `contrast-check.mjs` + `tools/audit-stacks.json` re-run, inventing no token, touching no blur budget / GlassSurface / box-none / virtualization floor, and trading no access — it only restores a boundary channel that vanishes for low-vision iOS-light-mode users, in the safety-critical downward direction. Five of seven rails hold clean. It fails KEEP on two: it **misdescribes the native mechanism** ("replication" when the failing native arm has no custom pin face and needs a full custom-teardrop rebuild — "design"), and its "preserves" list is **silent on PROTECT-15**, the marker-snapshot discipline that the native rebuild directly implicates (the current `pinColor` system marker needs no `tracksViewChanges={false}`; a custom child-View marker does, or it regresses per-pan re-rasterization). Neither is a rail kill — the idea is sound and the native pattern is proven available by the cluster — so the verdict is **FIX** with the effort re-scoped to M, the native mechanism stated honestly, PROTECT-15/16 added to the preserves line, the web half scoped as parity-only, and the build sequenced into S1's one coordinated native pin-renderer pass.
