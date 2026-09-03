# EVIDENCE GAP — Dynamic Type (XXXL) cannot be exercised on this simulator

Date: 2026-09-02 ~23:55 PDT. Devices: "Flagstone Audit iPhone 17 Pro" F6B9246F (iOS 26.5) and "Flagstone Audit B33 iPhone 17 Pro" FAA0564B (iOS 26.5). Host Xcode 26.6 / 27.0-beta.

## What was attempted
1. `xcrun simctl ui <udid> content_size …` → **unsupported on this Xcode** (`simctl ui` help lists only `appearance`).
2. `xcrun simctl spawn <udid> defaults write -g UIPreferredContentSizeCategoryName -string UICTContentSizeCategoryAccessibilityExtraExtraExtraLarge`, app terminated and relaunched → pref reads back correctly, but Flagstone's Home rendered pixel-identically to the default-size capture (compare screenshots/main-xxxl-02-home.png vs main-home-resume-02-light.png; b33-xxxl-02-home.png vs b33-home-guest-02-light.png).
3. `xcrun simctl spawn <udid> notifyutil -p com.apple.UIKit.contentSizeCategoryChanged` → no effect.
4. iOS **Settings → Accessibility → Display & Text Size** showed **Larger Text: On**, and **Larger Text → Larger Accessibility Sizes: ON** with the slider parked around position 3 of 12; dragging the slider to the maximum did not move it (screenshots/ctrl-larger-text.png, ctrl-larger-text-max.png).

## The decisive control
**Apple's own Settings app renders at DEFAULT text size** in every one of those states (screenshots/ctrl-settings-xxxl.png, ctrl-a11y-menu.png, ctrl-display-text.png, ctrl-larger-text.png). If Dynamic Type were being applied, Apple's first-party UI would scale first. Therefore the failure is in the simulator runtime, **not in Flagstone**.

## Conclusion
DYNAMIC TYPE (XXXL) RUNTIME VERIFICATION: **EVIDENCE_GAP — ENVIRONMENT**, for BOTH lineages. No Dynamic Type finding may be raised or cleared from this session's simulator captures. The audit deliberately records NO pass and NO fail for large-text rendering.

## What IS known about Dynamic Type, from source (not runtime)
- `allowFontScaling={false}` appears **0 times** in src/ (both lineages) — nothing opts out of scaling outright.
- `maxFontSizeMultiplier` appears 35 times; Lane D found every cap in the signed-in scope is **≥ 1.3**, i.e. none clamps below the accessibility floor the project set itself.
- Build 33 carries a large body of XXXL-specific repairs that CURRENT_MAIN lacks (severity `scaleWithType`, un-clamped descriptions, Leaderboard/Watched AX recompose, heat-notice and callout chrome caps, `Sheet presentation="expanded"` with 17 opt-ins) — see evidence/b33-design-intent-source-map.md row (s). Those are the fixes that most need runtime proof and are precisely what could not be proven here.

## How to close this gap
A real device with Settings → Accessibility → Display & Text Size → Larger Text at maximum, or a simulator on a host where `simctl ui <udid> content_size accessibility-extra-extra-extra-large` is supported (Xcode 15.0+ normally supports it; this host does not). Priority surfaces: Report flow, Flag Details, Tasks cards, Legend, Filter, Leaderboard, Watched, Profile.
