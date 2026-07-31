# LENS 2 — SCREEN READER SEMANTICS (banked 2026-07-31; touchables sub-sweep appended when it lands)

Method: house a11y infra read line-by-line by the auditor (accessibility.ts, announce.ts, A11yLiveRegion, LiveStatusRegion, App.tsx, RootNavigator.tsx); two agent evidence sweeps (dismissables/escape-law · announce coverage) with every load-bearing verdict re-judged by the auditor. Evidence tag per finding.

## Verified sound (the baseline the estate keeps)

- **Escape law: 36/36 live dismissables carry the handler on the containment View** (never `<Modal>`), with `onRequestClose` byte-parity and RM-gated `animationType` class-wide. Guard B2 re-verified against RN 0.81.5's actual allowlist (`Modal.js:326-347`) — the law is true, and guarded. programmatic.
- **AVM containment** present on every transparent modal; the four pageSheets (Terms, Privacy, Resources, HowToHelp) skip AVM by documented design (own UIKit scene). programmatic.
- **G5 focus-return**: 3 `useSurfaceTrigger` adoptions (Nearby, Report, Legend) + drawer's own mechanism, guard J pins the count, drawer props frozen by guard H, 12-case drawer focus test. programmatic.
- **Web z-order law** intact (DrawerHost before SharedModalsHost, `RootNavigator.tsx:189-206`). programmatic.
- **Announce infra**: native real API; web shim + always-mounted polite `A11yLiveRegion` (ZWSP re-announce); `LiveStatusRegion` announces on every platform and is RM-decoupled (PROTECT-7). **Premise correction banked:** FlashBanner DOES announce on web via the shim (`FlashBanner.tsx:73-77` → monkey-patched singleton) — its own conditional live-region wrapper is the only unreliable half. programmatic.
- 55 announcement call sites inventoried (full table in the sweep record, preserved below in §Inventory-ref).

## FINDINGS

### High

- **A11Y-201 (High · 2.4.3/SR flow · programmatic + NEEDS-SKY-DEVICE for runtime severity): focus-in absent on 29 of 36 dismissables.** Only 7 surfaces adopt `useFocusOnOpen` (FlagDetail, Drawer, ReportContent, Sheet primitive→Changelog+Tasks filter, Legend, NotificationPreferencesScreen, ReportFlag). The house's own doctrine (`accessibility.ts:92-106`) says absence strands the SR cursor on the control behind the modal. Every missing surface already has an `accessibilityRole="header"` title to attach to — the fix is mechanical. Full 29-file list in the sweep record. *Ledger check (post-distillation): this is **SR-070 re-surfaced** — found by ship-ready, DEFERRED with a G4 label (never refused), then counted at "26"; this audit re-measures it at 29 of 36 and re-tiers it High. G5 covered the return half only.*
- **A11Y-202 (High · 2.4.3 · programmatic): NearbyFlagsModal — the app's flagship SR alternative — hands focus back on dismissal but never moves it in on open** (`NearbyFlagsModal.tsx:199`, title at `:222` has no ref), **including the screen-reader auto-open path** (`MapScreen.tsx:561-573`) where the sheet presents with no user press at all. The one surface that exists FOR screen-reader users lacks the entry half of the focus contract.
- **A11Y-203 (High · 3.3.1 + 4.1.3 · programmatic): Sign-in client-side validation errors are silent on iOS and web.** `SignInScreen.tsx:45-52` sets `validationError` with no announce; the error row (`:187-196`) is conditionally rendered with `accessibilityLiveRegion="assertive"` (Android-only in RN) and node-inserts on web. Only the server-failure branch (`:69`) announces. Cohort: every iOS/web user who mistypes an email or short password — the front door of the app. Fix pattern exists in the same file.

### Medium

- **A11Y-204 (Medium · 4.1.3 · programmatic): iOS VoiceOver never hears filter result counts on the map.** The "Showing N flags" pill rides `accessibilityLiveRegion="polite"` (`MapScreen.tsx:1699-1710`) — Android-only; the zero case is explicitly announced (`:1178`) but non-zero counts are not. The comment at `:1700-1702` claims the live region "ensures AT announces" — false on iOS, and exactly what would wave a future reviewer past the gap. Same class on Tasks: search announces counts (`:311`) but refresh/clear-search/category paths never do (G3).
- **A11Y-205 (Medium · 4.1.3 · programmatic): action-with-no-feedback branches.** (a) Bulk-watch when everything was already watched: `TasksScreen.tsx:601-605` flashes visually, announces nothing — the SR user's action returns silence. (b) Post-action refresh-reconcile failure (`TasksScreen.tsx:552,693`): "Couldn't refresh — pull down to update" is visual-only (the private Tasks flash pill has no announce path; distinct from FlashBanner).
- **A11Y-206 (Medium · 4.1.3 · programmatic): single-flag Watch/Unwatch is silent** (`FlagDetailModal.tsx:356-375`) — label flip is the only signal and VoiceOver does not re-read a focused button's changed label; the bulk path announces. 
- **A11Y-207 (Medium · 4.1.3/house error policy · programmatic): SavedPlacesModal has no announce path at all**; save-failure uses bare `Alert.alert` (`SavedPlacesModal.tsx:144`) — a no-op on web, so a failed user-data save is silent AND invisible there (known F46 class, this instance unledgered). House policy says user-data loss must surface.
- **A11Y-208 (Medium · G5 contract · programmatic): two ReportFlagModal openers never `register()`** — `MapScreen.tsx:1566` (web right-click; inert in practice, web focus-return is stubbed) and `:1575-1578` (native long-press → Alert confirm). On the native path, dismissal restores nothing (armed-latch no-op). Whether the FAB is the right return target for a map-gesture-initiated report is a Phase-B semantics call; today it returns to nothing.

### Low

- **A11Y-209 (Low · hygiene/guard-gap · programmatic): dead `accessibilityViewIsModal` on the `<Modal>` tag** at `ReportFlagModal.tsx:523` (RN drops it; live AVM is correctly on GlassSurface `:540`) — the only such site, and guard B2 bans escape-on-Modal but not AVM-on-Modal; plus the marking comment points at a stale line (`:542` says ":495"). Guard-widening candidate.
- **A11Y-210 (Low · 4.1.3 coverage · programmatic): announcement wiring is behaviorally tested at only 8 of 55 call sites** (6 more have source-text guards that prove existence, not firing). UpdateBanner's only test silences the announce spy without asserting it (`UpdateBanner.test.tsx:46-51`). The train's law — "verified wired, not assumed" — currently rests on 15% of the estate.
- **A11Y-211 (Low · wording coherence · programmatic):** (a) glass toggle announces "reduced/full" while the visible control says "Lite/Full" (`glassMode.ts:80` vs `TasksScreen.tsx:458`); (b) Map load-error banner's accessible name drops the visible "Tap to retry." verb (raw `loadError` at `MapScreen.tsx:2384,2401`) while Tasks composes them to match — the two screens disagree; 2.5.3-adjacent since the banner is pressable.

## Cross-refs

- Per-surface escape/focus tests exist for only 4 surfaces (Sheet, MyWatched containment, Drawer focus, hook units) — everything else rides the class-wide guards. Coverage note for Phase B, folded into A11Y-210's theme.
- Points-away toast (`App.tsx:77-81`) announce is shim-dependent on web signed-in cohort — works today; note only.
- OnboardingCards paging announces "Card N of M" (`OnboardingCards.tsx:192`, untested) — counted in A11Y-210.

## §Inventory-ref

The full 55-row announcement call-site inventory and 37-row dismissable table (with per-cell AVM/escape/focus/test columns) are preserved verbatim in the agent sweep records; master-table rows cite the finding IDs above. Sub-sweep on touchable name/role/state (classes A–G) lands as `lens-2b-touchables.md`.
