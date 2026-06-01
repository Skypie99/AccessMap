# Changelog

All notable changes to AccessMap, in plain language. Newest first.

## [Unreleased] — release/auto-2026-05-30

### Fixed
- **iOS cloud builds no longer fail to compile.** Removed a leftover piece of
  startup code (`sourceURL(for:RCTBridge)`) that an older project template had
  generated. Newer Expo/React Native versions don't expose that piece to Swift
  anymore, so the App Store / TestFlight build was erroring with
  "cannot find type RCTBridge in scope." Deleting the dead code matches what a
  fresh Expo setup produces today and unblocks the build. (cherry-pick of
  `c9b79d7`, AppDelegate.swift only.)

---

## [0.2.0] — already on `main`

The 0.2.0 line is what's currently on `main` (app version 0.2.0). Highlights
that shipped in this line, for reference:

- Crowdsourced accessibility flags: drop a pin, pick a category + severity, add
  a photo, and others can verify / resolve / reject it.
- Points for reporting and for verifying/resolving other people's flags.
- Map filter panel (category chips + minimum severity).
- Tap a Tasks card to jump to that flag on the map with its callout open.
- Web build via react-leaflet + OpenStreetMap.
- Release plumbing on `main`: CI (typecheck + lint + tests + perf budget),
  manual-only EAS build workflow, approval-gated TestFlight submit workflow with
  a privacy guard, and Lighthouse CI on PRs.

---

### Notes for maintainers
- Versions live in `app.json` (`expo.version` + `ios.buildNumber`) and
  `package.json`. Bump both together when cutting a release.
- This file is updated by Rory (release engineering) as part of release prep.
- Sentry crash reporting is wired but stays silent until the
  `EXPO_PUBLIC_SENTRY_DSN` secret is added via `eas secret:create`.
