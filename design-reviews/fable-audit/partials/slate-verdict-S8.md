# Adversarial Skeptic Verdict — S8

**Proposal:** S8 — "One editorial header family across every tab" (★ SIGNATURE)
**Resolves (claimed):** L2-2 / L8-6 (canonical H) + double-title-on-signed-in-Profile facet · touches L2-15 (close-affordance grammar) as a sibling normalization
**Effort:** M · **Tier:** Signature · **FORKS-TO-SKY:** none claimed
**Verdict:** **FIX** (sound core; two concrete guardrails required before build)

---

## What I verified against source (not trusted from the write-up)

- **The two-header split is real and current at HEAD.** `RootNavigator.tsx` confirms Home + Tasks carry `headerShown:false` (options at the `Home`/`Tasks` `Tab.Screen`) and render their own editorial `ScreenHeader`; Profile/FullMap/Settings use the nav header via `headerLeft: renderMenuButton` — a **36px rounded-square** hamburger (`width/height:36`, `borderRadius: radius.md`, `backgroundColor: color.headerBtnBg`) + a global `renderHeaderRight` **"Feedback" TEXT pill** (`AppText variant="label"`, `radius.full`). Home/Tasks fold menu+Feedback into `ScreenHeader actions` as **circular** buttons calling `drawer.setOpen(true)` directly. Two grammars for the same two controls — CONFIRMED.
- **The double title on signed-in Profile is real in code.** `ProfileScreen.tsx:878-881` renders `<ScreenHeader eyebrow="PROFILE" title={display_name||'Your profile'} …>` in-body, while Profile is a *visible* tab whose nav header shows the route title "Profile" (centered). So "Profile" (nav) stacks directly above "PROFILE" (eyebrow). The finding's `[code-inferred, auth-gated]` tag is only about *seeing it rendered* (needs an authed session / PROBE-1 composite), not about whether it exists — S8's PROBE-1 gate in field (7) correctly acknowledges this. No overclaim.
- **PROTECT-10 is genuinely EXTENDED, not replaced.** `ScreenHeader.tsx` docstring lines 8-10 say verbatim what S8 quotes ("Profile / Leaderboard / future screens consume it for one consistent type rhythm"); the M18 auto-fit (lines 28-49, `CHAR_WIDTH_RATIO`/`MIN_TITLE_SCALE`/`DISPLAY_MAX_FONT_SCALE`) is the real deterministic web-shrink + native `adjustsFontSizeToFit` backstop. Rolling ScreenHeader onto three more screens uses this backstop — it does not fork a new header. PROTECT-10 preserved.
- **No new color / no floor tuning.** Header inks already pass the arbiter with **0 failures**: A.1 tasks set (100 pairs, exit 0) includes ScreenHeader consumption (`inkGlassMuted`/`inkOnStage`, ScreenHeader.tsx:157-165); A.2 wave1 (56, exit 0) and A.3 wave2 (34, exit 0) include the `inkOnStage` header override at ProfileScreen.tsx:885-886. The nav `headerFg/headerBg` and editorial white-circle/eyebrow inks are shipped-and-passing. S8 adds no token — "No arbiter (both inks already pass)" is accurate.
- **Migration strands nothing.** Neither ProfileScreen nor SettingsScreen sets any per-screen `headerRight`/`headerLeft`/`navigation.setOptions`; the nav header's only content is the global Feedback pill + drawer trigger, both of which the in-body ScreenHeader `actions` slot already carries on Home/Tasks. Setting `headerShown:false` on the three + wiring menu+Feedback into their ScreenHeader is exactly the shipped Home/Tasks pattern. Feasible.
- **S8 touches no glass-law surface.** The S8 section contains no `GlassSurface` / `windowSize` / `removeClippedSubviews` / blur-`intensity` / `BlurView` / `forceEngineered` reference. Blur budget, virtualization, and the DO-NOT-EDIT primitive are untouched.

## Where it is thin (the two guardrails)

1. **FullMap has no scroll body for an editorial header — and field (6) never names the `box-none` gesture law.** `MapScreen.tsx` is a full-bleed `<PlatformMap>` (line 1247) with a floating `<View pointerEvents="box-none" style={styles.overlay}>` (line 1259) carrying the "N flags nearby" pill + action tray. There is no in-flow header region as on Profile/Settings. The finding *does* demand Map join the editorial family ("the editorial family IS the brand — the nav-header screens dilute it precisely on the flagship Map"), so including FullMap traces correctly — but the honest resolution is either (a) converge the *chrome grammar* (hamburger→circle, Feedback→icon) as S8 also says, and/or (b) an in-overlay editorial title that MUST NOT convert any `box-none` region to touch-opaque, or map pan/zoom dies. S8 gates the layout behind a mockup + Design-Compiler pass, which is the right process, but the box-none invariant must be written into the constraint, not left implicit.
2. **The L2-15 close-affordance rider can regress PROTECT-1 / PROTECT-3.** S8 wants to "converge the modal close-affordance grammar … on a single close idiom." The Nearby modal's close is a **labeled bordered "Close" pill** (`NearbyFlagsModal.tsx:188-194`, `accessibilityLabel="Close nearby flags list"`) — part of the PROTECT-1 accessible twin. Flattening it to a bare-X icon (one of the three idioms L2-15 lists) would strip the visible label from a crown-jewel control; likewise the ReportFlagModal close sits on PROTECT-3's sheet. L2-15 is only LOW severity and is a rider here, so the safe move is to constrain the convergence: keep an accessible name on every close control, converge on the *labeled/circle-wash* idiom (never bare-X on the protected sheets), and leave PROTECT-1/PROTECT-3 close controls' labels intact.

## Per-rail

| Rail | Verdict | Note |
|---|---|---|
| tracesToFinding | ✅ true | L2-2/L8-6 CONFIRMED HIGH + double-Profile facet (code-verified) + L2-15 rider; FullMap inclusion demanded by the finding text. |
| wcagFloorHeld | ✅ true | Header inks all pass arbiter (0 fails, 260 pairs); removing the double header improves SR structure. Only risk = L2-15 rider, fenced below. |
| glassLawHeld | ✅ true | No color/floor tuning, no GlassSurface/blur/windowSize touch. Box-none not violated by the written scope; fix condition makes the Map-header case explicit. |
| protectPreserved | ✅ true* | PROTECT-10 genuinely extended (verified). *Conditioned:* the L2-15 close-affordance convergence must preserve PROTECT-1 (labeled Nearby "Close") and PROTECT-3 (ReportFlagModal sheet) close controls. |
| rnExpoFeasible | ✅ true | Pure RN nav/layout change — the exact `headerShown:false` + in-body ScreenHeader pattern Home/Tasks already ship. No web-announce, no CSS-only trick, no dead API. |
| accessNotTradedForPolish | ✅ true | Core is a net SR win (kills the redundant double title). Only hidden-regression vector is the L2-15 rider → covered by the protectPreserved condition. |
| arbiterReRunPresent | ✅ true | Touches no color/floor/severity token → "set true" clause; S8 adopts no new token and correctly names no arbiter run. |

## fixConditions

1. **Constrain the L2-15 close-affordance convergence:** every close control keeps a programmatic accessible name; converge on the labeled / circle-wash idiom, and do **not** flatten PROTECT-1's labeled Nearby "Close" pill or touch PROTECT-3's ReportFlagModal sheet close. (L2-15 is LOW and a rider — it must not become a lever that regresses a crown jewel.)
2. **Write the `box-none` invariant into the FullMap header constraint:** because the map is full-bleed with a `box-none` overlay (`MapScreen.tsx:1259`) and no scroll body, the editorial-header treatment on Map must either converge chrome grammar only (hamburger→circle, Feedback→icon) or place any in-overlay title so that no `box-none` region becomes touch-opaque — map pan/zoom gestures must still pass through. Resolve the exact Map layout in the mockup stage (Design Compiler / Dani), not by literally dropping a display-40 scrolling ScreenHeader onto the canvas.

## Reasoning (summary)

The core claim — one editorial header family, `headerShown:false` on Profile/FullMap/Settings, menu+Feedback folded into `ScreenHeader actions`, killing the redundant signed-in-Profile double title — is verified in source, traces cleanly to a CONFIRMED HIGH finding, extends PROTECT-10 exactly as the audit prescribes, adds zero AA cost (all header inks arbiter-pass), and is RN-real (it is the pattern Home/Tasks already ship). It is not KILL-worthy: no rail is fundamentally unsatisfiable. It is not clean KEEP either, because two edges are under-specified in a way that could nick crown jewels: the L2-15 close-affordance rider could strip the label from PROTECT-1's Nearby "Close" control, and the FullMap header lacks a named box-none guardrail on a screen that has no scroll body for an editorial header. Both are addressable with tight constraints rather than redesign → **FIX**.
