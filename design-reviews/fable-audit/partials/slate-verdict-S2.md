# Adversarial Skeptic Verdict — S2

**Proposal:** S2 — "Adopt the ratified `textOnColor` ink at the six un-forked severity-digit sites (CRITICAL)" (resolves L2-1 / L6-08 / L6-10; effort S; tier QuickWin; FORKS-TO-SKY: none).
**Subject:** AccessMap @ `main` `82e738b`.
**Verdict: KEEP** (clean — cosmetic citation nits only, no rail violation).

---

## What I verified against ground truth (not the proposal's own prose)

### The defect is real and CONFIRMED-CRITICAL
- `02_findings.md:26` — L2-1/L6-08 row: "White severity digits fail AA on fills 1–4 (1.57–3.61) in 6 components, 3 guest-reachable · CRIT · CONFIRMED (7 sites; +1 undercount) · **CRITICAL**."
- `02_findings.md:346-358` — canonical C = L2-1, arbiter-measured pairs **1.57 / 2.15 / 2.78 / 3.61** (sev1–4 white-on-fill), fix-shape verbatim: "adopt `severity[n].textOnColor` at all six sites — a mechanical, already-ratified fork."
- Parked item ① (`slate-proposals.md:500`) folds into S2 (RecentlyViewedRow, arbiter §D-1). Correct.

### The token exists exactly as claimed
`src/theme.ts:543-547` — `severity[1..5].textOnColor`: ink `#0F1B2D` on sev1–4, white `#ffffff` on sev5. AA rationale in the comment `:538-542` (white FAILS ~2.1/2.5/3.4 on mid-ramp; ink measures 8.05/6.21/4.79). Ratified `92a2be6`. **No new token invented.**

### The six render sites are real (white-on-fill confirmed in code)
- `src/screens/NearbyFlagsModal.tsx:140` fill + `:144`/`:384` `sevDotText → color.textOnBrand` (white). Auto-opens for every web guest.
- `src/screens/LegendModal.tsx:54` fill + `:200` digit `textOnBrand` (white). The decoder ring itself.
- `src/screens/ReportFlagModal.tsx:607` fill + `:1084` `sevTextActive = color.textOnBrand` (white) + white `Check` glyph `:621-623`. The comment `:1083-1084` literally calls it "legible white-on-fill" — the false-legibility comment S2 flags. Confirmed.
- `src/components/ActivityFeedModal.tsx:156` fill + `textOnBrand` sevDot.
- `src/components/RecentlyViewedRow.tsx:139` fill + `:202` `textOnBrand` (arbiter §D-1).
- `src/components/FlagDetailModal.tsx:834`/`:1066` fills + `:1595` view-chip / `:1798` edit-radio `textOnBrand`.

**Citation nit (non-fatal):** S2's WHAT calls three of these `src/components/…` (NearbyFlagsModal, LegendModal, ReportFlagModal) — they actually live in `src/screens/`. The Part-2 finding cites the correct paths. Cosmetic imprecision in the proposal text; the sites are the right ones.

### Independent contrast computation (I recomputed, did not trust the comment)
Ink `#0F1B2D` vs each fill: **sev1 = 11.03**, sev2 = 8.05, sev3 = 6.21, sev4 = 4.79 (all ≥ 4.5 AA) — and white `#ffffff` on sev5 = 4.83 (≥4.5), while ink on sev5 = 3.58 (would fail). So the token's choice (ink 1–4, white 5) is provably AA at every adopted site. The theme comment's silence on sev1 is harmless — sev1+ink is the *most* legible cell. S2 only swaps sev1–4 to ink and leaves sev5 white; the indexed token `severity[s].textOnColor` handles this by construction — **no blanket-dark-ink trap.**

### The arbiter harness is real and the fills are already staged
- `design-reviews/fable-audit/tools/audit-stacks.json` — carries `sevDot1..4` stacks (bases `#F7C948`…`#E85638`), digit rows at `min:4.5`, boundary rows at `min:3.0`, in BOTH light and dark blocks. The white-on-fill failing pairs are declared here now.
- `GLASS.md:10` — the arbiter is invoked as `node <lab>/shared/contrast-check.mjs <stacks.json>` must exit 0. `contrast-check.mjs` is the Material-Lab script, not a repo-root `tools/` file.
- **Citation nit (non-fatal):** S2's VERIFICATION names `tools/audit-stacks.json`. The real path is `design-reviews/fable-audit/tools/audit-stacks.json`, and `contrast-check.mjs` lives at the lab `<lab>/shared/` path. This `tools/…` shorthand is the **slate-wide convention** — the file header, S1, and S7 all use the identical "`contrast-check.mjs` + `tools/audit-stacks.json`" phrasing. The mechanism is genuinely named and executable; the path is shorthand, not a fabrication.

### Information is never lost (the "passing text twin" claim holds)
- NearbyFlagsModal: disc is `accessibilityElementsHidden`; meta line `:167` speaks "Severity {n} · {status} · {time}". ✓
- LegendModal: disc `accessibilityElementsHidden`; visible "`{s} — {label}`" text + full SR sentence `:63-72`. ✓
- ReportFlagModal: digit capped, `accessibilityLabel` = `Severity {s}: {LABEL} — {DESCRIPTION}`; Check is `no-hide-descendants` (redundant). ✓
The primary *visual* mark is what fails; the swap fixes it without touching any SR content.

---

## Per-rail adjudication

| Rail | Verdict | Basis |
|---|---|---|
| tracesToFinding | **TRUE** | Resolves L2-1/L6-08/L6-10 = CONFIRMED CRITICAL (`02_findings.md:26,346-358`) + parked ①. |
| wcagFloorHeld | **TRUE** | Closes a live 1.4.3 breach; independently recomputed ink AA on sev1–4 (11.03/8.05/6.21/4.79), white correct on sev5 (4.83). Improves the floor. |
| glassLawHeld | **TRUE** | Adopts an already-arbitrated token (GLASS §7.1 "extends the law, touches no floor"); no eye-tuning; no blur/box-none/GlassSurface/virtualization surface touched. |
| protectPreserved | **TRUE** | PROTECT-4 (extends the severity grammar via the existing fork, no new token) and PROTECT-5 (never eye-tunes a floor; runs the arbiter) verified. PROTECT-1 not regressed (Nearby discs already a11y-hidden; meta line untouched). |
| rnExpoFeasible | **TRUE** | Pure token/color swap. No `announceForAccessibility`, no web-announcement, no CSS-only trick, no blur intensity. Trivially RN/Expo-real. |
| accessNotTradedForPolish | **TRUE** | This IS the access fix; no hidden regression; text twin verified at every checked site. |
| arbiterReRunPresent | **TRUE** | VERIFICATION field (7) names the arbiter re-run AND adopts the existing `severity[n].textOnColor` token (no new token). Harness + stacks exist; path uses the slate's `tools/` shorthand. |

---

## Fix conditions

None blocking. Two optional tidy-ups for the assembler (cosmetic, not rail conditions):
1. Correct the three `src/components/…` paths in the WHAT to `src/screens/…` (NearbyFlagsModal, LegendModal, ReportFlagModal) to match the Part-2 finding.
2. In the build, apply the ink via the **indexed** `severity[s].textOnColor` read per-render (as SeverityBadge/Map sev pills already do), since the current `sevTextActive` StyleSheet entry is a static `textOnBrand` with no severity index — S2 already implies this ("swap the hardcoded `sevTextActive` white for `severity[s].textOnColor`"). Not a defect; just the correct pattern to name so the sev5 case stays white.

## Reasoning (one paragraph)
S2 is the cleanest proposal archetype on the slate: a mechanical adoption of an already-ratified, already-arbiter-proven token (`severity[n].textOnColor`, theme.ts:543-547) at the six render sites that skipped the `92a2be6` fork, closing a CONFIRMED #3-CRITICAL WCAG 1.4.3 breach on the app's core safety datum. I attacked it on all seven rails and each holds against ground truth: the defect is real and confirmed (verified the white-on-fill token usage in all six files), the fix invents no new token, my own contrast recomputation proves the ink is AA on sev1–4 while white is correctly retained on sev5 (so the indexed token is sev5-safe by construction), no GLASS/PROTECT invariant is touched (no floor is eye-tuned; the arbiter decides; no SR content changes), and it is trivially RN/Expo-feasible (a color swap, no dead web API). The only blemishes are two cosmetic citation imprecisions — three component paths written as `src/components/` instead of `src/screens/`, and the arbiter path given as the slate-wide `tools/` shorthand rather than the full `design-reviews/fable-audit/tools/` path — neither of which is a rail violation, since the finding IDs, the token, the sites, and the arbiter mechanism are all genuine and named. KEEP.
