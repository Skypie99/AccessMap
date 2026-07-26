# AccessMap UPLIFT — P1: Access CRITICALs — RESULT

**Date:** 2026-07-05 · **Branch:** `uplift/p1-access` (6 commits off `uplift/p0-copy@b7a2e81`) · **Model:** Opus 4.8 ultracode, max effort
**Design authority:** `design-reviews/fable-audit/2026-07-04_AccessMap_Design_Review.md` (Phase 1) + `02_findings.md`
**Status:** ✅ **All three members CLOSED. STOPPED on the branch — NOT merged, NOT pushed, NOT built.** Sky merges; one EAS build carries everything; the device gate is hers.

---

## Pre-flight gate — PASS
Branched off the P0 tip `b7a2e81`. Green base re-confirmed before the first edit: typecheck 0 · lint 0 errors/77 warns · jest 1740 pass + the 1 pre-existing `/ago$/` date-flake (fails identically on `main`, owned by `fix/tasksflagcard-date-flake`).

## Build gate (final) — PASS
- **typecheck 0** · **lint 77 (0 errors / 77 warns = exact baseline, 0 new)** · **jest 1758 pass / 84 todo / 1 pre-existing flake** (+17 new tests).
- `git diff uplift/p0-copy..HEAD` = **47 files, 629+/178−**, intended files only. No glass/token/color touched → four glass proof-sets **arbiter exit-0 by construction**.

## Sky decisions taken this session
- **S9 breadth = FULL APP SWEEP** — `a11yToggle` at all ~100 `accessibilityState` sites + `aria-label` on all 29 modal files.
- **S4 pill copy = "Showing N flags"** (drops "nearby", no recency claim).

---

## Per-member results

### S9 — Mount the accessibility engine on web · CRITICAL · rank 2 ★TOP-5
Five additive facets, committed separately. Touches a11y props only (PROTECT-12 adoption); native SR auto-open preserved.

- **S9-a `55b9ecc`** — new `a11yToggle()` in `accessibility.ts` returns the original `accessibilityState` PLUS the flat `aria-selected/checked/expanded/busy/disabled` aliases rn-web renders; applied via `{...a11yToggle({…})}` at **~100 sites** across every screen, modal, and the Button/Input primitives. Two module mocks gained the real helper; the qaMerge source-scanner updated to the wrapped form. **Verified:** a11yToggle unit tests; typecheck 0.
- **S9-b `fd8bf96`** — new `announce.ts` overrides rn-web's no-op `announceForAccessibility` (web-only, idempotent, try/catch fallback) to publish into a persistently-mounted visually-hidden `aria-live` region (`<A11yLiveRegion/>`, mounted at the app root above the session branch). Call sites unchanged. **Web-verified end-to-end:** the live-region node is present (empty at rest) and **captured a real announcement's text** in the preview → the ~50 sites now speak on web. Also the persistent live region S10/S11 will reuse.
- **S9-c `0df2508`** — `decorativeProps` gains `aria-hidden: true` (covers dots/cluster/rail); the two Tasks photo thumbnails (ad-hoc `accessible={false}`) also gain it → **Tasks stops opening on "image."** Test updated 3→4 keys.
- **S9-d + native `59e44f7`** — `aria-label` on **all 29 `<Modal>`s** (rn-web forwards it onto `role="dialog"` — source-confirmed) with each modal's real title; `accessibilityRole="header"` on ScreenHeader (L6-17); `accessibilityViewIsModal` on SignIn root (L6-19/D2); LegendModal backdrop restructured to an absolute **sibling** of the card, hidden from the web a11y tree (L6-21/D3).

### S13 — Free the Tasks card actions · rank 11 · (VoiceOver #1) · `4c71e24`
Approach B, **zero layout change**: `accessible={false}` on the outer card Pressable; its role/label/state/hint move to the **`cardHeader` summary node** (which wraps only non-interactive badges, so it nests no button). Actions + photo become independently focusable; web nested-`<button>` invalidity gone; tap-anywhere-to-open preserved (handlers stay on the outer Pressable). Bulk-select unchanged. **Verified (web/JS):** +3 assertions (labeled summary is a distinct button; an action tap fires only that action; tap-anywhere preserved) + selection-mode checkbox + locked-6 composition green. **iOS VoiceOver focus order = D1 (the audit's #1 device check).**

### S4 — Honest arrival · CRITICAL · rank 4 ★TOP-5 · `267610c`
UI/copy half only — **FORK 1** (geo query scope + SF `DEFAULT_REGION`) left for Sky; `flags.ts` untouched.
- **Pill:** `"N flags nearby"` → **"Showing N flags"** (filtered branch was already honest; loading branch unchanged).
- **Reachable denied banner:** new pure `arrivalPermissionDenied()` gates on the **raw** status; the mount `'clear'` path now sets the banner **only for a genuine prior `'denied'`** — a never-asked first-run `undetermined` user makes **no false claim**. `initialLocationAction` + `location.test.ts` untouched (PROTECT-6).
- **Copy re-word** (banner + its `requestLocation` announce): FINDING-oriented, web-safe (no "device Settings"/"to report") — **SKY-EDITABLE**.
- **L3-8:** NearbyFlagsModal's open-announce + the List trigger hint only claim "nearby / sorted by distance" when a location backs it.
- **Guard test** `MapScreen.arrival.test.ts` (+9): unit-pins the gate (denied=true, undetermined/granted/unknown=false) + source invariants (pill no-"nearby", helper-gated mount, FINDING copy, location-gated announce). **Web-verified:** the re-worded banner renders on the Map surface (a11y-tree).

---

## Verification note (honest coverage)
The `expo start --web` **dev preview crashes Map/Tasks/heavy-lucide modals** on a pre-existing Metro `lazy=true` module-resolution bug — **reproduced identically on the pristine base** (`uplift/p0-copy`), so it is an environment limitation, not a P1 regression. It blocked the *live* DOM re-walk of the report-form chips, filter panels, and Tasks card; those are covered by unit tests + code + the rn-web dialog mechanism, and remain real-web/device for a live-render confirmation. Full log: `design-reviews/fable-audit/uplift-assets/P1-verification-evidence.md`.

## DECISIONS FOR SKY (nothing silently dropped)
- **FORK 1 (S4 data half):** does AccessMap add a bounded/`ST_DWithin` geo-scoped query (+ region-change fetch) so the FIND promise is real, or keep the UI honest as shipped here? The SF `DEFAULT_REGION` (where a no-location user's map centers) rides this decision — untouched by P1.
- **SKY-EDITABLE copy:** the S4 denied-banner wording is drafted in the app's voice; adjust freely (e.g. platform-branch the "how" clause: browser site settings on web / device settings on native).
- **Device gates (NEEDS-SKY-DEVICE), confirm after the one build:** **D1** Tasks-card VoiceOver flattening (S13, the #1 check) · **D2** SignIn containment · **D3** Legend backdrop · S9 native SR feel · S4 first-run feel · the report-form / filter-panel / Tasks live web DOM (blocked here by the dev-preview Metro bug).

## Next
STOP on `uplift/p1-access`. Per the phase spine, Phase 2 (material cohesion — S1/S2/S6/S7/S14/S8, the one arbiter-gated phase) branches off this tip when Sky sequences it.
