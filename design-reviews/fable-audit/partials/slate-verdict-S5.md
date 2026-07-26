# Adversarial Skeptic Verdict — S5

**Proposal:** S5 — "Make the Report pill actually start a report (location parity on the Home-pill path)" (CRITICAL)
**Resolves:** L3-1 (CRITICAL) · touches L3-5 finish-line context
**Verdict: KEEP** (all 7 rails satisfied; one advisory scoping note carried, non-gating)

---

## What I attacked and what the code says

S5 rests on a single load-bearing empirical claim — a "one-line asymmetry" between the FAB path and the Home-pill path. A plausible-but-wrong version of this proposal would (a) cite line numbers that don't hold, (b) rely on a mechanism that is a web no-op, or (c) quietly make a product decision Sky hasn't ratified. I checked all three head-on against `main @ 82e738b`.

**Every factual claim verified true:**

1. **The Home-pill handler does NOT kick location.** `MapScreen.tsx:1093-1097` — the `openReport` effect is exactly `setReportOpen(true)` + `navigation.setParams({ openReport: undefined })`. No location read. (Proposal cites `:1094-1096` = the handler body; trivial off-by-nit, the mechanism is exact.)
2. **The FAB path DOES kick location, and the fix is a verbatim copy of it.** `MapScreen.tsx:2072`: `if (!dropLocation) void requestLocation();` then `setReportOpen(true)`. S5's proposed `openReport` fix — `if (!dropLocation) void requestLocation()` then open — is literally this line. The `!dropLocation` guard (a drop pin overrides GPS) is correctly preserved — a subtle correctness point a sloppy fix would drop.
3. **The author's own comment confirms the parity framing.** `:1238-1243`: "…the tap kicks requestLocation() and opens ReportFlagModal… so the FAB can never dead-end on web." The FAB was deliberately fixed; the Home pill never got the same call. Exactly as S5 argues.
4. **The sheet has no location hook of its own.** `ReportFlagModal.tsx:78` — `location` is a pure prop (`{ visible, location, onClose, onCreated }`). Grep confirms zero `requestLocation`/`useUserLocation`/`getCurrentPosition`/`navigator.geolocation` in the file. So the fix MUST come from the caller — precisely S5's design.
5. **The dead-end symptoms are real.** `:465-467` "Waiting for location…" (renders purely off the `location` prop); `:975` `disabled={submitting || !location}`. Both verbatim.
6. **The mechanism actually resolves the dead-end.** `location` state (`:257`) → `setLocation(coords)` inside `requestLocation` (`:1023`) → `<ReportFlagModal location={dropLocation ?? location}>` (`:2103`). Kicking `requestLocation()` on `openReport` resolves coords → `setLocation` → re-render → the modal's `location` prop flips `null`→coords → line changes + submit enables. Identical to the already-shipped FAB behavior.
7. **Entry point correct.** `HomeScreen.tsx:348`: `navigation.navigate('FullMap', { openReport: true, ts: Date.now() })` → routes to the `openReport` handler S5 patches. Confirmed.
8. **GPS timeout claim plausible.** `location.ts:46` `timeoutMs = 15_000` — consistent with "past the 15s GPS timeout" in the skeptic evidence.

---

## Rail-by-rail

- **tracesToFinding — TRUE.** Genuinely resolves L3-1 (CRITICAL #1), every cited line verified. L3-5 correctly framed as *context* (finish-line), not a claimed resolution — L3-5 is owned by S10. No overclaim.
- **wcagFloorHeld — TRUE (improves).** The disabled-submit `accessibilityHint`/visible reason is a real WCAG 3.3.1 / 1.3.1 gain; the retry inherits the 44pt grammar. No AA regression.
- **glassLawHeld — TRUE.** Touches no color/floor/severity token (verified across MapScreen + ReportFlagModal). `GlassSurface.tsx` untouched. Blur budget untouched (intensities 12/24 not involved). `pointerEvents="box-none"` overlay untouched — the fix lives in the `openReport` handler + sheet body, not the map overlay. Virtualization law untouched.
- **protectPreserved — TRUE (verified, not trusted):**
  - **PROTECT-3** (sheet architecture): fix adds a location kick in the *parent* handler + a location-line/disabled-reason inside the existing body; does NOT move the sticky footer (`:965`) or replace the 5 discrete severity buttons. Intact.
  - **PROTECT-8** (anonymity honesty set): the anon banner `alert` (`:477-500`) with the Sign-in link deliberately OUTSIDE the alert element is untouched. Intact.
  - **PROTECT-6** (locating spine): `requestLocation` (`:988-1023`) reuses `getCurrentPositionWithTimeout` (`:1015`) + `getLastKnownPositionAsync`; NO `watchPositionAsync`, no new watcher/interval. The retry routes through the same `requestLocation`. Intact.
- **rnExpoFeasible — TRUE.** This is the axis a lazy proposal fails, and S5 passes it cleanly. The fix does NOT depend on `announceForAccessibility`/`setAccessibilityFocus` (web no-ops per the RN/Expo hard-fact rail). Its mechanism is prop-driven and renders real DOM: the visible location line flips and submit enables on web via `setLocation`→prop. The `accessibilityHint` upgrade is a *rendered* prop, not the dead announce API. The FAB already proves this exact mechanism works on web.
- **accessNotTradedForPolish — TRUE.** Pure access + correctness gain; unblocks the entire anonymous CONTRIBUTE flow for the exact cohort the app was built for. No hidden regression dressed as polish.
- **arbiterReRunPresent — TRUE (vacuous).** S5 touches no color/floor/severity value; per the rail, no-color ⇒ true. S5's own VERIFICATION correctly states "No arbiter (no color)."

---

## FORKS-TO-SKY honesty check (does the core pre-empt Sky-decision note #3?)

Sky-note #3 (guest contract) asks, in part, whether the web build "should request location and expose a real sign-in path at all." A dishonest proposal would sneak that product call into a "correctness" fix. S5 does **not**:

- The app **already** requests location on web today — the FAB fires `requestLocation()` on web (`:2072`) and the recenter button does too (`:1409`). S5 makes the Home pill behave identically to the already-shipped FAB. It introduces **no new** product behavior — it aligns two entry points to one already-live behavior.
- The half that genuinely forks (should web expose sign-in / prompt for location *at onboarding*) is correctly carved out in S5's FORKS-TO-SKY line and left to Sky.

The FORKS framing is honest and correctly scoped.

---

## The one legitimate caveat (advisory, non-gating)

S5 frames the whole change as "one-line." The **core** (the `requestLocation()` kick) truly is one line and is provably correct. But honesty-upgrade **(a)** — the in-sheet "Use my location" retry on *failure/denied* — needs a signal the sheet does not currently receive: `permissionDenied` is tracked in `MapScreen` (`:999`) but is NOT among `ReportFlagModal`'s props (`:71-76`). So (a) requires threading a new prop + a retry callback into the sheet. This is still small and purely **additive** (so PROTECT-3 stays intact), but the effort is slightly more than "one line," and the build should scope it honestly rather than discover it mid-implementation.

This is a scoping precision, not a rail violation — it does not change the verdict. The core CRITICAL fix stands entirely on its own; the retry is a bounded, safe add.

**fixConditions (advisory, carry to assembler):** Keep as-is. When built: (1) ship the core `openReport` location kick first — it closes L3-1 by itself and mirrors the FAB verbatim; (2) scope honesty-upgrade (a) as a *new prop* into `ReportFlagModal` (`permissionDenied` or a `locationState` enum) + a retry callback — additive only, footer/severity buttons/anon banner untouched (PROTECT-3/8); (3) route the retry through the existing `requestLocation` (no new watcher — PROTECT-6); (4) no arbiter needed (no color/floor). Effort tag is fair at S for the core; the (a) upgrade nudges it toward S+ but stays a QuickWin.
