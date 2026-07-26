# Adversarial Skeptic Verdict — S16

**Proposal:** S16 — "Fix the two worst map touch targets: the bare-text 'Clear' and the invisible action-bar overflow" (resolves L5-04, L5-05; effort M; tier Meaningful).
**Reviewer stance:** adversarial skeptic (default to KILL; a plausible-but-wrong proposal must not survive).
**Verdict: KEEP** — all seven rails satisfied; every load-bearing code claim verified to the line; no arbiter obligation triggered.

---

## What S16 claims to do
- **(a)** Give the filter panel's "Clear all filters" `Pressable` the same `minHeight:44` + `hitSlop` treatment its sibling `filterTitleRow` already carries (currently a bare ~34×17pt text target — the only sub-44 *app-authored* control in the census).
- **(b)** Add a visible overflow affordance (fade/gradient edge or persistent "more" indicator, and/or a guaranteed half-button peek) to the 7-button action-bar `ScrollView` so hidden tools (Refresh, Recenter) become discoverable when the viewport shrinks below content width (iPad Split View ~320pt, true-320pt devices, web zoom/DT).

## Verification performed (did not trust the proposal — read the source)

**Findings trace (rail 1).** L5-04 and L5-05 are both **CONFIRMED HIGH** in `02_findings.md:43-44` and detailed in `L5.md:142-154`. Not fabricated, not adjusted-away.

**Code claims — spot-checked to the line, all accurate:**
- `MapScreen.tsx:1544-1552` — the "Clear" control is a bare `<Pressable>` with `accessibilityRole`/`accessibilityLabel` ONLY: **no `style`, no `minHeight`, no `hitSlop`**. Confirmed.
- `clearLink` style at `:2528-2532` — `fontSize: font.size.xs` (12pt), **no minHeight**. Its color is already arbitrated (`brandTextAlt` light / `inkSelect` dark) with the "4.5 floor" breadcrumb comment at `:2526-2527`. Confirmed.
- Sibling `filterTitleRow` at `:2515-2524` — already carries `minHeight:32` + `paddingVertical:4` + `hitSlop={8}` (`:1524`) + the WCAG-breadcrumb comment ("combined with the parent panel padding this gives a comfortable 44pt area"). So the fix is a genuine mechanical replication of an existing in-file pattern, not new design. Confirmed.
- Action bar `ScrollView` at `:1299-1304` — `horizontal showsHorizontalScrollIndicator={false}`, M11 comment "~322pt of targets vs 288pt usable at 320pt". No fade/indicator. Confirmed.
- Report-FAB hint at `:2078-2084` — native branch literally reads "Use the recenter button to turn on location, then report a flag here", confirming Recenter is the *documented* locationless CONTRIBUTE entry point the tray hides. (Proposal cites `:2085`; the hint string is at `:2083`, `:2085` is the `accessibilityState` — a ±2-line drift, immaterial.) Confirmed.

**Glass gesture-law check (rail 3) — the sharpest attack surface for S16(b):**
- The action bar sits inside `overlayTopGroup` (`:1265`, `pointerEvents="box-none"`) inside `overlay` (`:1259`, `pointerEvents="box-none"`), with the explicit law comment at `:1263` ("box-none is mandatory: an opaque-to-touch wrapper would swallow" gestures). A decorative fade edge is `pointerEvents="none"` and adds no opaque-to-touch wrapper → **box-none law intact**.
- `actionBar` is `GlassSurface variant="row" forceEngineered` (`:1292`) — literal engineered gradient, **no BlurView ever mounts** → blur budget untouched; intensities 12/24 not involved. `actionBtn` geometry (`minWidth:44/minHeight:44`, `:2470-2476`) is untouched (affordance added *around* the ScrollView). `GlassSurface.tsx` not edited/forked. Virtualization law (`windowSize`/`removeClippedSubviews`) unrelated. **PASS.**

**PROTECT-2 verification (rail 4) — did not trust "preserves PROTECT-2":**
- The empty-filters recovery card is `accessibilityRole="alert"` (`:1940`), copy "Your filters are hiding everything…" (`:1947`), with a **44pt** `emptyCardBtn` "Reset all filters" (`:1965-1973`; `emptyCardBtn.minHeight:44` at `:2666`).
- This is a **completely separate code block** from the "Clear" link (`:1544-1552`). S16's fix to "Clear" is orthogonal and cannot regress the redundant "Reset all" belt. The proposal's "belt to suspenders" claim is accurate. **PASS.**
- PROTECT-2's `actionBtn` 44×44 geometry likewise untouched.

**Arbiter obligation (rail 7):** S16 touches **no color/floor/severity token**. Adding `minHeight:44 + hitSlop` is pure geometry; `clearLink`'s arbitrated color is left exactly as-is; the overflow fade is chrome, not a contrast token. Per rail 7, "if the proposal touches no color/floor, set true." The VERIFICATION field correctly states "No arbiter." **PASS.** (Honest note: were an implementer to introduce a *new* color constant for the fade tint, that would be a build-time concern — but the proposal specifies the app's own chrome grammar / existing tokens, so no fix-condition is warranted.)

## Per-rail verdict
| Rail | Result | Basis |
|---|---|---|
| tracesToFinding | ✅ true | L5-04/L5-05 confirmed HIGH (`02_findings.md:43-44`); every cited line verified accurate. |
| wcagFloorHeld | ✅ true | Pure floor improvement: WCAG 2.5.5 ("Clear" 34×17→≥44pt) + 1.4.10/1.3.1 (overflow discoverability). |
| glassLawHeld | ✅ true | box-none intact (affordance is `pointerEvents:none` inside box-none groups); `forceEngineered` = no BlurView, blur budget untouched; GlassSurface not edited; virtualization untouched. |
| protectPreserved | ✅ true | PROTECT-2 recovery card (`role=alert`, 44pt Reset-all) is a separate code site; cannot be regressed. actionBtn 44×44 geometry untouched. |
| rnExpoFeasible | ✅ true | Pure RN style/layout + a standard View/gradient affordance; no `announceForAccessibility`, no CSS-only trick, no expo-blur dependency. |
| accessNotTradedForPolish | ✅ true | Access-first hardening; no hidden regression dressed as polish. |
| arbiterReRunPresent | ✅ true | Touches no color/floor/severity value → rail set true by its own clause; VERIFICATION correctly says "No arbiter." |

## Reasoning
S16 is textbook device-integrity hygiene with an unusually clean provenance. Both findings survive as CONFIRMED HIGH in the canonical set, and the fix for each is a mechanical replication of a pattern the same file already uses correctly one sibling away (`filterTitleRow` got the exact `minHeight`+`hitSlop`+WCAG-comment treatment "Clear" was skipped for — a genuine oversight, not a deliberate pattern). The one place a skeptic could break this proposal — S16(b) touching the map overlay and thereby risking the `box-none` gesture law or the blur budget — does not break it: the action bar is `forceEngineered` (budget-free by mechanism) and lives inside two nested `box-none` groups, so a decorative `pointerEvents:none` fade edge respects the law by construction and the proposal explicitly scopes the affordance *around* the ScrollView with buttons untouched. PROTECT-2's "belt" (the 44pt Reset-all in the `role=alert` recovery card) is verified to be an independent code site, so the crown jewel cannot regress. No color/floor/severity token is touched, so the arbiter rail is satisfied without a re-run. Nothing here is plausible-but-wrong; the idea is sound and every rail holds without a condition. **KEEP.**

**fixConditions:** none (all rails satisfied as written).
