# P1 (Access CRITICALs) — verification evidence

Branch `uplift/p1-access` (6 commits off `uplift/p0-copy@b7a2e81`, itself 8 off `main@82e738b`). Web-verified in the Expo-web dev preview (Chromium — **not** Safari/WebKit); native paths tagged NEEDS-SKY-DEVICE. Model: Opus 4.8 ultracode, max effort.

## Build gate (final) — PASS
- **typecheck:** 0 errors.
- **lint:** 77 problems (0 errors, **77 warnings = the exact baseline, 0 new**).
- **jest:** 1758 passed / 84 todo / **1 pre-existing failure** — `TasksScreenFlagCard.test.tsx` `/ago$/` relative-time assertion, which fails **identically on pristine `main@82e738b`** (date-dependent flake, owned by the separate `fix/tasksflagcard-date-flake` task). P1 adds +17 tests (a11yToggle ×5, decorativeProps aria-hidden ×2, S13 ×3, S4 arrival ×9 — minus overlaps) and touches this file only for the S13 assertions; the flake line is left as-is.
- `git diff uplift/p0-copy..HEAD` = **47 files, 629+/178−**, intended files only.

## ⚠️ Web DOM re-walk — environment limitation (pre-existing, NOT a P1 regression)
The `accessmap-web` preview runs `expo start --web` in **dev mode with `lazy=true`**. On this build the **Map and Tasks screens (and heavy-lucide modals) crash into the ErrorBoundary** with a Metro lazy-load module-resolution error (`createLucideIcon.default is not a function` / `Requiring unknown module "1200"` — Metro's own hint: "try restarting Metro"). **This reproduces identically on the pristine `uplift/p0-copy` base with none of the P1 changes** (verified by checking out the base and repeating the navigation), so it is a dev-preview bundling limitation, not caused by this phase. It blocks the *live* DOM re-walk of the report-form chips, the map/tasks filter panels, and the Tasks card — those are covered by unit tests + code + the rn-web dialog mechanism below, and remain real-web / NEEDS-SKY-DEVICE for a live-render confirmation.

## What WAS web-verified (Home + app-root, which render)

### S9-b — announce-shim (the hardest new mechanism) · web-verified ✅
- The persistently-mounted **`<A11yLiveRegion/>` is present at the app root**: a11y query for `[aria-live]` returns a node with `aria-live="polite"`, **empty (`textLen 0`) at rest** — exactly the sr-only live region.
- **End-to-end proof it speaks:** after a navigation that fired `AccessibilityInfo.announceForAccessibility(...)` (the S4 `requestLocation` denial announce), the same node's text became *"Location is off, so the map shows the mo…"*. So `installWebAnnounceShim()` successfully overrode rn-web's no-op and routed the announcement into the rendered region — the ~50 call sites now speak on web, unchanged.

### S4 — honest arrival · web-verified ✅
- **Denied banner** renders on the Map surface with the re-worded, FINDING-oriented, web-safe copy: *"Location is off, so the map shows the most recent flags, not ones near you. Turn on location access to find flags nearby."* (a11y tree node [417]) — no "device Settings", no "to report".
- **Pill** copy change (`"N flags nearby"` → `"Showing N flags"`) is unit-pinned (`MapScreen.arrival.test.ts`) + code-verified; the pill is a `polite` live-region so the honest string carries web SR.

### Home guest surface · web-verified ✅
- Renders as guest (web IS guest mode): "5 barriers / Most recent barriers" (P0 copy), the CartoDB `dark_all` mini-map peek, RECENT rows exposed as **labeled buttons** ("Other, Minor, open", "No ramp, Significant, verified"), tab bar with native `aria-selected` (Home=false / Tasks=true / Profile=false). Screenshot captured.

### S9-d — dialog naming mechanism · code-confirmed ✅
- rn-web's `ModalContent` renders `React.createElement(View, _extends({}, rest, { "aria-modal": true, role: active ? 'dialog' : null }))` — so the `aria-label` passed to every `<Modal>` flows through `rest` onto the dialog node → `<div role="dialog" aria-modal="true" aria-label="…">`. Verified by reading `node_modules/react-native-web/dist/exports/Modal/ModalContent.js`. All 29 modal files carry `aria-label`; typecheck confirms the prop is accepted on native `<Modal>` too.

## Verified by unit test + code (surfaces blocked by the dev-preview crash)
- **S9-a flat aria** — `a11yToggle` unit tests (each state key → its aria alias; `accessibilityState` preserved). Applied at ~100 sites (typecheck 0). The report-form category/severity chips + map/tasks filter chips get `aria-selected`/`aria-checked`/`aria-expanded`/`aria-busy`/`aria-disabled` on web — live render deferred (preview crash).
- **S9-c decorativeProps** — test pins the 4th key `aria-hidden: true`; the two Tasks photo thumbnails also gain `aria-hidden` (they used ad-hoc `accessible={false}`) so Tasks stops opening on "image."
- **S13** — composition test: the header is a distinct **labeled summary button**, each action fires independently (an action tap does NOT also open the card), tap-anywhere-to-open preserved, selection-mode checkbox intact. Native VoiceOver focus order = **D1 device gate**.
- **S4 gate** — `arrivalPermissionDenied()` unit tests: denied→true, **undetermined/granted/unknown→false** (the reconciled first-run-safe gate); source invariants for the pill, the helper-gated mount, the FINDING copy, and the location-gated Nearby announce.

## Glass arbiter — exit-0 by construction
The P1 range touches **zero** glass/token/color/blur code (`git diff uplift/p0-copy..HEAD` grep = 0 hits for `GlassSurface`/`theme.ts`/`#hex`/`overlayTint`/`solidColor`/`edgeColor`/`blur`). S9/S13/S4 change a11y props only, so the four shipped glass proof-sets are unchanged from HEAD.

## NEEDS-SKY-DEVICE (native truths — code lands here, device confirms)
- **D1 (the audit's #1):** iOS VoiceOver — are Verify/Resolve/Reject/Details focusable from a Tasks card, and is the header summary the card's representative? (S13)
- **D2:** SignIn `accessibilityViewIsModal` containment. **D3:** LegendModal backdrop no longer traps focus (native).
- S9 native SR feel; S4 first-run *feel*; the report-form / filter-panel / Tasks live DOM on real web (blocked here by the dev-preview Metro bug).
