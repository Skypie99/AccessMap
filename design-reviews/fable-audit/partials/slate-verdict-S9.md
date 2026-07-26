# Adversarial Skeptic Verdict — S9

**Proposal:** S9 — "Mount the accessibility engine on web: adopt the modern RN ≥0.71 a11y dialect" (resolves L6-01 CRITICAL, L6-02, L6-11, L6-16, L6-17, L6-19, L6-21; effort L; ★SIGNATURE; FORKS-TO-SKY: none).

**Verdict: KEEP** (all 7 rails hold under code-verification, not trust).

This is the strongest-grounded proposal I attacked: every load-bearing feasibility claim was checked against the actual RN-web 0.21.2 source and the actual app source, and each one held. It threads the two rails that kill naive web-a11y fixes (the `announceForAccessibility` no-op trap and the CSS-only-trick trap) precisely.

---

## Per-rail verdict

### tracesToFinding = TRUE
Every cited ID resolves to a confirmed Part-2 finding whose fix-shape matches an S9 facet. Verified in code:
- **L6-01 (CRITICAL)** — `node_modules/react-native-web/dist/modules/createDOMProps/index.js` **never reads `accessibilityState`** (grep for the string exits 1 — the word does not appear in the file). It reads ONLY the flat `aria-selected`/`accessibilitySelected` (`:126,:673-675`) etc. The app sets the *nested* `accessibilityState={{selected|checked|expanded|busy}}` at ~30 sites (confirmed: `ReportFlagModal.tsx:531/578/611/747/805/934/983`, `NearbyFlagsModal.tsx:236/252`, `TasksScreen.tsx:957/967/990/1005/1038/…`, `MapScreen.tsx:1330/1535/1602/1661/1693/1723/1752/1786/1840`, plus Settings/Profile/SignIn). The only `[selected]` in the tree is `@react-navigation/.../BottomTabItem.js:142` `'aria-selected': focused` — proof the FLAT prop is the working dialect. Facet (a) — add the flat `aria-*` beside the existing nested object — is the exact mechanical fix.
- **L6-02 (HIGH)** — `AccessibilityInfo/index.js`: `setAccessibilityFocus: function(reactTag) {}` and `announceForAccessibility: function(announcement) {}` are **literally empty**. The shim (facet b) is warranted.
- **L6-11 (HIGH)** — `accessibility.ts:14-18` `decorativeProps` carries exactly the OLD trio (`accessible:false` + `importantForAccessibility` + `accessibilityElementsHidden`), NO `aria-hidden`. `aria-hidden` IS in the createDOMProps translation table (`:82,:382-384`). Facet (c) correct.
- **L6-16 (HIGH)** — `Modal/ModalContent.js` `_excluded = ["active","children","onRequestClose","transparent"]` (does NOT strip `aria-label`/`accessibilityLabel`); `rest` is spread onto the inner `View` (`:41`), which createDOMProps translates. Passing `aria-label` to `<Modal>` WILL name the dialog. Facet (d) correct.
- **L6-17 (HIGH)** — `ScreenHeader.tsx:124-137` renders the title `<AppText variant="display">` with NO `accessibilityRole="header"`. One-line bundled fix correct (the intended pattern is even shown in `accessibility.ts`'s own docstring).
- **L6-19 (HIGH)** — `SignInScreen.tsx` has **0** `accessibilityViewIsModal`; 26 files elsewhere carry it. Bundled one-prop fix correct.
- **L6-21 (HIGH)** — `LegendModal.tsx:32-42`: the backdrop `Pressable accessibilityLabel="Close legend"` (`:32-35`) **parents** the card `Pressable` (`:38`) which parents all legend rows — exactly the iOS-flattening structure. The sibling-backdrop restructure (same mechanism as S13) is real.

### wcagFloorHeld = TRUE
Purely additive; it MOUNTS 4.1.2 (name/role/value — selection state), 4.1.3 (status messages), 1.1.1 (decorative-hiding), 2.4.6 (heading), and modal containment where the web bundler silently sheared them. Nothing is traded; a live AA/A breach on the only guest surface is closed.

### glassLawHeld = TRUE
Touches ZERO color/floor/ink token, ZERO blur (no expo-blur intensity touched), ZERO `GlassSurface.tsx`, ZERO `windowSize`/`removeClippedSubviews`, ZERO `pointerEvents="box-none"`. No floor exists to eye-tune. VERIFICATION (7) explicitly states the four glass proof-sets stay exit-0 (named to show contrast is undisturbed).

### protectPreserved = TRUE (verified, not trusted)
- **PROTECT-12** — this IS the "adoption, not redesign" the merged list nominates the `accessibility.ts` hook suite / `severityA11y` / `accessibilityViewIsModal`-×25 for. Confirmed 26 files carry `accessibilityViewIsModal`.
- **PROTECT-1** — touches only the Nearby list's tab STATE props (`:236,:252`); the crown-jewel row content (`NearbyFlagsModal.tsx:125-137`) is structurally separate and untouched. Field (6) explicitly says **do NOT "fix" the web auto-open by removing it** — the auto-open protection is honored, not breached.
- **PROTECT-3** — at the report category button (`ReportFlagModal.tsx:578`) BOTH `accessibilityLabel` and `accessibilityState` are present; the fix adds a flat `aria-selected` BESIDE them, altering no label and no liveRegion. The severity live region (`:652` `accessibilityLiveRegion="polite"`) is untouched.
- **PROTECT-6** — the announce+liveRegion dual-wiring stays; the shim is the ADDED web leg (a rendered `aria-live` node), native path unchanged.

### rnExpoFeasible = TRUE
The rail that kills plausible-but-wrong web-a11y proposals — and S9 threads it exactly:
- It does **NOT** announce via the dead `announceForAccessibility` API. Facet (b) routes the existing announce helper through a *rendered* visually-hidden `aria-live="polite"` node — the SAME mechanism that makes the working severity echo line (`ReportFlagModal.tsx:652`, confirmed a real `accessibilityLiveRegion` → `aria-live`) speak on web today. Verified feasible.
- It restores selection state via the flat `aria-selected`/`aria-checked`/`aria-expanded`/`aria-busy` props that createDOMProps provably emits — NOT by relying on the dropped nested `accessibilityState.selected`.
- No CSS-only trick anywhere. All four facets map to props confirmed present in RN-web 0.21.2's `_excluded`/emit pipeline.
- No native regression: the flat props map to the same iOS/Android states the nested object already produced (RN reads both dialects natively).

### accessNotTradedForPolish = TRUE
This is access work end-to-end; no polish layer, no hidden regression dressed as polish. The single risk — regressing the web auto-open (PROTECT-1) — is explicitly forbidden in field (6).

### arbiterReRunPresent = TRUE
S9 touches no color/floor/severity value → the "touches no color/floor ⇒ true" clause applies. It adopts NO new token (it adopts existing `aria-*` prop names + the existing shared `decorativeProps` object + `severityA11y`), and VERIFICATION names the four glass proof-sets staying exit-0 to show contrast is undisturbed. Clean.

---

## fixConditions
None gating. (Advisory, non-gating: the effort-L breadth — ~30 state sites + shared-object edit + ~25 Modal labels — is real and honestly disclosed in field (0); the slate may split the four facets into smaller bites as the field itself offers. The DOM-attribute-dump VERIFICATION instrument, not ariaSnapshot, is the correct proof given RN-web's `aria-modal`-vs-raw-snapshot subtlety. No rail needs a condition.)

## reasoning
Adversarial read: I tried to break the two ways a web-a11y "signature" usually dies — (1) claiming an SR announcement on web (announceForAccessibility is a no-op), and (2) a CSS-only or nested-state fix that RN-web silently drops. S9 survives both. I confirmed in the actual RN-web 0.21.2 source that `createDOMProps` never reads nested `accessibilityState` (so the CRITICAL L6-01 mechanism is genuine and the flat-`aria-*`-beside fix is exactly right), that both announce/focus APIs are empty functions (so the `aria-live` SHIM — not the dead API — is the honest and functional path, matching the already-working severity echo line), and that `aria-hidden`/`aria-label`/`aria-live`/`aria-selected` all live in the translation table (so facets c/d and the shim are feasible). I verified all four bundled native-correctness targets exist as claimed (ScreenHeader missing header role; SignIn missing viewIsModal against 26 that have it; LegendModal backdrop parenting the card). PROTECT claims were checked at the byte level: the fix is additive at labels/liveRegion, touches only tab STATE not row content, and explicitly preserves the web auto-open. No color/floor/blur/GlassSurface/virtualization/box-none surface is touched. Every rail holds. KEEP.
