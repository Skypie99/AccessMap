# Fable Audit ROUND 2 — AccessMap — Part 1: FEEL FINDINGS (the banked base)

**Subject:** AccessMap @ `bench/4-quality` `a8549ff3d6d15ed4410b71d803d50a130613d3d0` — the
post-uplift (P0–P5, S1–S20) + post-bench (BENCH 1–4, B1–B11) tree, exactly as Sky left it.
**Dates:** Stages 0–3 run 2026-07-09; Stages 4–5 run 2026-07-10 (the session-limit halt+resume is
recorded at orientation §4.11 — no model change). **Model:** Claude Fable 5 max effort, all
stages, all sub-agents.
**Inputs:** `01_feel_orientation.md` (baseline · delta digest · feel inventory · how-to-reach ·
honesty ledger) · `01_feel_render-index.md` (186 banked evidence rows; VERIFY1 PASS ×3;
completeness-critique PASS) · `01_feel_persona-reads.md` (seven blinded reads + critique) ·
`partials/F1–F6.md` (the six lens documents, amended post-verification) · `partials/verdicts.json`
(all 16 skeptic verdicts with attack logs) · `partials/delta-digest-raw.md`.
**Engine caveat (bounds everything):** every capture is the STATIC EXPORT (`__DEV__` false) in
Chromium at DPR 2 — the lucide dev-preview boundary LIFTED, so the whole Map/Tasks family is live
`web-approximated` evidence this round. True blur feel, scroll smoothness, VoiceOver/TalkBack,
haptics, real Dynamic Type, Reduce Transparency, and Apple light tiles remain DEVICE-ONLY; web
tiles are CARTO always; auth-gated and post-submit states are code-inferred (the fence never
signed in, never pressed submit).
**Method:** delta-first orientation (ten ledger digests, 70/70 grep-verified at HEAD) → 170-file
capture matrix + 16 annotated/corrected top-ups (critique-driven) → seven blinded personas → six
feel lenses → one adversarial skeptic per CRITICAL/HIGH → this assembly. **Tags:**
`web-approximated` · `code-inferred` · `test-inferred` · `arbiter-measured` · `lab-mockup` ·
`NEEDS-SKY-DEVICE`. **Severity scale (Round 1's, verbatim):** CRITICAL = an access failure on a
core flow, a trust-breaking defect, or overlap/clip/occlusion at any size · HIGH = materially
impairs a disabled user's job or the cohesion/trust mission · MEDIUM · LOW · POLISH; at equal
tier, access failures outrank aesthetic ones. **Finding format:** `F{n}-{seq}` · Where · What ·
Why it matters · Evidence (+tags) · Severity, with the inline RESTRAINT verdict on every
finding-with-a-direction and the skeptic verdict block on every CRITICAL/HIGH.

---

## §Calibration & verification

**Skeptic outcome: 16 verified · 4 CONFIRMED · 12 ADJUSTED · 0 REFUTED.** Every adjustment is
surgical (evidence relabels, scope cuts, mechanism corrections); two findings demoted a tier
(F4-01, F5-01 → MEDIUM). Full rationales + attack logs: `partials/verdicts.json`; each verdict
also sits inline under its finding below.

| id | filed | verdict | final | one-line note |
|---|---|---|---|---|
| F2-01 | CRITICAL | ADJUSTED | **CRITICAL** | evidence citation fixed (z-order refs); the occlusion itself re-verified on both themes |
| F1-01 | HIGH | ADJUSTED | HIGH | ":804/:861/:991" are tag chips, not photo controls; PhotoGallery tiles already carry the dim — "entirely dead" holds for the GUEST sheet |
| F1-02 | HIGH | CONFIRMED | HIGH | the RM-hole in PressableScale is code-solid; B5's test asserts spring-skip only |
| F1-03 | HIGH | ADJUSTED | HIGH | severity picks DO announce via a live-region hint; the corrected harm is AX-tree state-drop on role="button" chips (CDP-probe-verified) + silent map-panel chips |
| F1-04 | HIGH | ADJUSTED | HIGH | wording fixes; the focus-ring token's absence from shipped controls stands |
| F2-02 | HIGH | CONFIRMED | HIGH | numberOfLines={1} clips the editorial headline at 200% |
| F2-03 | HIGH | ADJUSTED | HIGH | evidence description fixes; the screen-blind absolute placement stands |
| F2-04 | HIGH | ADJUSTED | HIGH | "permanent guest state" → "default guest state (sign-in exists via the header action)" |
| F3-01 | HIGH | ADJUSTED | HIGH | void scoped to FIRST Settings mount per JS context; the raw interstitial stands |
| F4-01 | HIGH | ADJUSTED | **MEDIUM** | the banked trees are Playwright ariaSnapshot output, not the computed AX tree — the spoken-prose loss over-claimed |
| F4-02 | HIGH | CONFIRMED | HIGH | the FlagCard spoken layer's double-speak/orphaned-context is real at HEAD |
| F4-03 | HIGH | ADJUSTED | HIGH | mechanism hedge resolved half-against: the pill/banner voice split stands, scoped |
| F5-01 | HIGH | ADJUSTED | **MEDIUM** | the "stuck loading" engine-bug framing deleted — the ladder's own constants explain the window; the em-dash/no-words presentation remains (→ F5-02) |
| F5-02 | HIGH | CONFIRMED | HIGH | display-size em-dash + Loading/Updating copy mechanics verified |
| F5-03 | HIGH | ADJUSTED | HIGH | "no designed moment at all" cut — the undetermined arrival has one designed beat; the silent-SF frame stands |
| F6-01 | HIGH | ADJUSTED | HIGH | direction's "one component swap" corrected; the grammar-goes-quiet defect stands |

**Dedup / cross-reference map (one defect counted once — 73 filed → 65 canonical):**

| canonical | absorbs | the one defect |
|---|---|---|
| F2-03 | F5-04 · F5-08 | LiveStatusRegion/FlashBanner screen-blind absolute top placement colliding with headers |
| F2-04 | F5-06 | the signed-out Profile void (early-return screen) |
| F3-01 | F5-07 | the drawer→Settings lazy-mount spinner void (first mount per context) |
| F3-03 | F4-05 | the Tasks tab badge disagreeing with the list header across the tab cut |
| F5-01 | F4-12 | the Home first-load/failure headline window |
| F6-02 | F2-09 | Home Recent rows' 11px unnumbered severity dot (grammar gap + optical facet) |
| F1-10 | F2-10 | the floating Home Report pill/FAB over live list rows (near-miss class) |

**THE FINAL FEEL LADDER (canonical, post-verification — what Part 3 walks):**

- **CRITICAL (1):** F2-01 — the pin callout composites under the map chrome (the S3 trust doorway,
  the signature text itself occluded).
- **HIGH (13):** F1-01 report-sheet press silence (guest flow) · F1-02 PressableScale's RM
  feedback hole across ~20 controls · F1-03 selection-state drop for web SR on button-role chips ·
  F1-04 the unreached focus-ring token · F2-02 Home headline clips at 200% · F2-03 LiveStatusRegion
  placement collisions (≡F5-04/08) · F2-04 the signed-out Profile void (≡F5-06) · F3-01 the
  drawer→Settings spinner void (≡F5-07) · F4-02 FlagCard's spoken double-speak/orphaned actions ·
  F4-03 the no-location arrival's split voice · F5-02 the em-dash first-load headline +
  Loading/Updating split · F5-03 the silent San-Francisco default frame · F6-01 the detail sheet
  speaks a third of the grammar.
- **MEDIUM (26):** F1-05..09 · F2-05..08 · F3-02 · F3-03 (≡F4-05) · F4-01 (demoted) · F4-04 ·
  F4-06..11 · F5-01 (demoted, ≡F4-12) · F5-05 · F6-02 (≡F2-09) · F6-03..06.
- **LOW (18):** F1-10 (≡F2-10) · F1-11 · F1-12 · F1-14 · F2-11 · F3-04..06 · F4-13..19 · F6-07..09.
- **POLISH (7):** F1-13 · F2-12 · F2-13 · F3-07 · F4-20 · F5-09 · F5-10.

**Annotated evidence:** every surviving CRITICAL/HIGH carries an annotated capture in
`assets/annotated/` (indexed), except the two whose defect no still can carry — F1-03 (the AX-tree
state drop; evidence = the CDP probe + `a11yToggle` source excerpt in its finding) and F4-02 (the
spoken layer; evidence = the tree excerpts quoted in its finding).

---
