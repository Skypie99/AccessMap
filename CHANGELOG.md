# Changelog

All notable changes to Flagstone (repository: AccessMap), in plain language. Newest first.

## [Web release] - 2026-10-25

The web version at [flagstone.skypistudio.com](https://flagstone.skypistudio.com) moved to source
`4a27691`: a lighter, accessible first launch on top of the work merged to `main` since the 4.1.1
build. The iOS app did not change. The
[release receipt](qa-reports/releases/2026-10-25_Flagstone_4.1.1_Build33_OptionB_WebDeployment.md)
records the exact identity, the live checks, the accepted limits and the rollback target.

## [4.1.1] - 2026-09-15

Flagstone 4.1.1 was released on the App Store in the United States and Canada. The release
manifest, [`release/current.json`](release/current.json), records it as iOS build 33; the dated QA,
accessibility and release receipts are in [`qa-reports/`](qa-reports/) and
[`design-reviews/`](design-reviews/). This changelog does not restate the full 4.1.x feature
history.

## [Historical] - 2026-05-30, release/auto-2026-05-30

### Fixed
- **iOS cloud builds no longer fail to compile.** Removed a leftover piece of
  startup code (`sourceURL(for:RCTBridge)`) that an older project template had
  generated. Newer Expo/React Native versions don't expose that piece to Swift
  anymore, so the App Store / TestFlight build was erroring with
  "cannot find type RCTBridge in scope." Deleting the dead code matches what a
  fresh Expo setup produces today and unblocks the build. (cherry-pick of
  `c9b79d7`, AppDelegate.swift only.)

---

## [0.2.0] - historical pre-release line

The 0.2.0 line was the pre-release line (app version 0.2.0). It is kept here as
history, not as a description of the current app. Highlights from that line:

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
- The marketing version lives in `app.json` (`expo.version`) and `package.json`;
  bump both together. The iOS build number comes from EAS
  (`appVersionSource: "remote"`), so `app.json`'s `ios.buildNumber` is
  diagnostic only. See [docs/RELEASE_IDENTITY.md](docs/RELEASE_IDENTITY.md).
- Update this file as part of release prep, alongside `release/current.json`.
- No crash-reporting SDK is installed (checked against `package.json` on
  2026-10-29). Older notes that described Sentry as wired are historical.
