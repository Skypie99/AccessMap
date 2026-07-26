# Adversarial Skeptic Verdict — S1

**Proposal:** S1 — "Wear the severity grammar everywhere severity is spoken (and define 'verified' in the same breath)" · ★ SIGNATURE
**Resolves:** L8-2 (UI half), L8-7 (anon pins), L2-7, L6-14, L8-10 (partial)
**Verdict: KEEP** (all 7 rails hold under verification)

---

## What I verified in the actual code (not trusted from the field text)

| S1 claim | Code check | Result |
|---|---|---|
| Anon pin gray-swap in BOTH renderers | `PlatformMap.web.tsx:363` `flagIsAnon ? '#9CA3AF' : severityColor(...)`; `PlatformMap.tsx:228` `pinColor={f.user_id === null ? '#9CA3AF' : severityColor(...)}` + `opacity 0.7` | CONFIRMED — both renderers, native adds opacity as claimed |
| Home leaks raw DB status enum inline AND in SR label | `HomeScreen.tsx:322-334` — meta uses `` `${SEVERITY_LABELS[...]} · ${item.f.status} · ...` `` and the a11y label uses `${item.f.status}` (raw), not `STATUS_LABELS[...]` | CONFIRMED — raw `item.f.status` in both the visible meta and the SR label |
| `STATUS_LABELS` is the existing product label used everywhere else | Imported/used in Profile, Map filter, MyReports, NotificationPrefs, StatusBadge, StatusHistory | CONFIRMED — Home is the outlier; routing through it extends an existing helper |
| Home shows word-only severity, no number | `HomeScreen.tsx` dot + `SEVERITY_LABELS[...]` word; no number visually or in SR | CONFIRMED (L2-7) |
| `severityA11y` exists and yields "severity N of 5, {word}" | `src/lib/a11yText.ts:17-18` returns `` `severity ${severity} of 5, ${SEVERITY_LABELS[severity]}` `` (test-pinned) | CONFIRMED — S1 adopts this, invents no label |
| `statusA11y` exists (used by native pin label) | `a11yText.ts:26` | CONFIRMED |
| `severity[n].textOnColor` ratified token exists (S1 sequences after S2) | `theme.ts:543-547`, AA rationale in `:538-542` (ink #0F1B2D = 8.05/6.21/4.79 on sev2-4) | CONFIRMED |
| Legend defines zero status vocabulary | `LegendModal.tsx` — only a points sentence mentions "verified/resolved"; no status *definition* block | CONFIRMED (the one "verified" hit is the points line, not a legend definition) |
| Anon pins still announce provenance to SR | web `alt` at `:371` ", submitted anonymously"; native label `:238` ", anonymous report" | CONFIRMED — PROTECT-1 SR content survives |
| Existing pin already draws a ring (feasibility of threading a ring) | `pinIcon` `PlatformMap.web.tsx:122` `border:2.5px solid #fff` | CONFIRMED — the web ring threads into an element that already has a ring idiom |
| S1's files do NOT touch `windowSize`/`removeClippedSubviews`/BlurView | grep of PlatformMap(.web).tsx, HomeScreen, LegendModal, NearbyFlagsModal | CONFIRMED — none reference them; map-internal world is SVG/tokens per GLASS §12.6 |

The FORKS-TO-SKY line is faithful: `sky-notes.md #5` is exactly the trust-model / verifier-provenance decision. S1 correctly scopes itself to the severity WORD + legend status-line + anon ring, and leaves verifier COUNT + callout DATE to S3. No data-layer decision is smuggled in.

---

## Per-rail verdict

- **tracesToFinding = true.** Every cited ID resolves to a verified, currently-shipping defect. L8-7 (both renderers), L2-7 (Home breaks theme.ts:526's own number+word law), L6-14 (`severityA11y` under-adopted), L8-2 UI-half (legend has no status definition), L8-10 partial (coverage caveat home). The Home raw-enum leak is a genuine, code-confirmed sub-defect.

- **wcagFloorHeld = true.** Strictly additive to access: the severity WORD is added beside a number the SR label already carries (no loss); the anon ring RESTORES a 1.4.11 non-text-contrast channel the gray swap erased; the legend Status block is the first place "Verified" is defined for a blind / cognitively-loaded user. No floor is traded for polish.

- **glassLawHeld = true.** No eye-tuned floor — the ring's contrast is explicitly arbiter-gated (`contrast-check.mjs` over the 5 tile bases + red heat cell → exit 0), with the *visual* deferred to NEEDS-SKY-DEVICE (the arbiter decides, not the eye). No BlurView is added (map-internal world = SVG/tokens, GLASS §12.6). `windowSize`/`removeClippedSubviews` untouched. `GlassSurface.tsx` not edited. `box-none` gesture law untouched (pins are not the overlay). The ring adopts the §12.4 regime-decomposed paired-ring/union MECHANISM already ratified for cluster rings + heat badges — it THREADS the primitive, does not fork it. Blur intensities are irrelevant (no blur pane involved).

- **protectPreserved = true (verified, not trusted).** PROTECT-4 — extends the grammar using the existing `severityA11y`/`statusA11y`/`textOnColor` (tokens confirmed present); no new token. PROTECT-1 — Nearby row CONTENT is untouched; the word is added via the existing helper and the anon `alt`/label still announces anonymity (verified web `:371`, native `:238`); this is the "fixes touch its endpoints, not content" clause. PROTECT-5 — LegendModal gets an ADDITIVE Status block; the arbitration system is never eye-tuned. PROTECT-16 — CategoryIcon/Wayfinder house style untouched.

- **rnExpoFeasible = true.** No web-announcement no-op is relied upon (S1 makes NO `announceForAccessibility`/`setAccessibilityFocus` claim — the word/legend/Home edits are plain text + `STATUS_LABELS`). The WEB anon ring threads cleanly into the existing `pinIcon` DivIcon. CAVEAT (not a violation): native flag pins render via default `pinColor` (not a custom marker View — the custom View there is inside `<Callout>`, the popup), so a native ring that keeps the severity fill needs a custom marker, a heavier change than a one-token swap. S1 already flags the native anon-ring visual as NEEDS-SKY-DEVICE and scopes the arbiter proof to the ring's contrast regardless, so it is feasible — the native half is merely under-scoped on effort, which is a build note, not a rail failure.

- **accessNotTradedForPolish = true.** Access-positive end to end (restores a color-only-failure channel, speaks the vocabulary law on the SR twin, defines the core trust word). No hidden regression dressed as polish.

- **arbiterReRunPresent = true.** The only color touch is the anon ring; field (7) names the arbiter re-run (`contrast-check.mjs` + `tools/audit-stacks.json`, stack over the 5 tile bases + red heat cell, exit 0) AND adopts existing tokens (no new contrast token invented). Path nit only: the repo's `audit-stacks.json` currently lives under `design-reviews/fable-audit/tools/`, and `contrast-check.mjs` is the Material-Lab shared script GLASS.md mandates (`<lab>/shared/contrast-check.mjs`) whose inputs are the `qa-reports/assets/*-stacks.json` sets — the rail asks that the arbiter re-run be NAMED with the ratified tool, which it is.

---

## Fix conditions
None required for KEEP. Two non-blocking build notes for the assembler/executor:
1. Native anon-ring is heavier than a token swap — native flag pins use default `pinColor`, so keeping the severity fill + adding a ring means a custom marker (with `tracksViewChanges={false}` + content-derived key per GLASS §12.6). Already NEEDS-SKY-DEVICE-gated; call it out in sequencing so it is not mistaken for a one-line change.
2. VERIFICATION path precision — point the arbiter re-run at the ratified Material-Lab `contrast-check.mjs` and add the anon-ring stack to the shipped `*-stacks.json` set (as the glass waves did), not only the audit's capture-tooling `design-reviews/fable-audit/tools/audit-stacks.json`.

## Reasoning (why not FIX or KILL)
Every load-bearing claim is code-true, the fork is honest and correctly scoped, and every rail holds. The proposal's defining virtue is that it EXTENDS the crown-jewel signature (PROTECT-4) with the app's own ratified helpers and puts the anon ring through the arbiter rather than the eye — it is the ethos of this app made literal (a signature that is *more* accessible because it kills a color-only failure). The single soft spot (native ring effort) is already device-gated and rail-clean. KEEP.
