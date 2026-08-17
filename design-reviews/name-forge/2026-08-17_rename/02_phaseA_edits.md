# 02 · PHASE A EDITS — every file touched, and why
**Branch:** `rename/flagstone` · **Base:** `main` = `origin/main` = `d2a0991` · **2026-08-17**
36 files changed, 112 insertions, 104 deletions. `main` never checked out for writing.

---

## A2 · App identity — `app.json` (9 strings)
| Key | Now reads | Why |
|---|---|---|
| `expo.name` | `Flagstone` | the home-screen label; 9 chars, renders whole under the icon |
| `ios.infoPlist.NSLocationWhenInUseUsageDescription` | `Flagstone uses your location to show nearby…` | OS permission dialog, must match the icon label |
| `ios.infoPlist.NSCameraUsageDescription` | `Flagstone uses the camera to capture photos…` | same |
| `ios.infoPlist.NSPhotoLibraryUsageDescription` | `Flagstone needs photo access to attach images…` | same |
| `web.name`, `web.shortName` | `Flagstone` | PWA install identity |
| `plugins → expo-location.locationWhenInUsePermission` | matches infoPlist byte for byte | `appConfig.guard.test.ts:85` pins the pair |
| `plugins → expo-image-picker.photosPermission` | matches infoPlist byte for byte | `appConfig.guard.test.ts:86` |
| `plugins → expo-image-picker.cameraPermission` | matches infoPlist byte for byte | `appConfig.guard.test.ts:87` |

**Verified untouched in the same file:** `slug: accessmap` · `scheme: accessmap` · `ios.bundleIdentifier` / `android.package: com.accessmap.app` · `extra.eas.projectId` · `privacyPolicyUrl`. Proof: `git diff -- app.json | grep -E 'slug|scheme|bundleIdentifier|package|projectId|privacyPolicyUrl'` returns nothing. JSON re-parsed clean with `node -e require`.

## A2b · Web identity
- `public/manifest.json` — `name`, `short_name` → `Flagstone`. Re-parsed clean.
- `public/index.html` — `og:site_name`, `og:title`, `og:image:alt`, `twitter:title`, and the pre-JS loading splash `<p class="am-name">`. The two `[AccessMap SW]` console prefixes stay (dev console, not a user surface), as do `canonical` / `og:url` / `og:image` (URLs).

## A3 · In-app strings — 33 across 22 files
Grouped by what a person actually sees:

**The wordmark, three places.** `SignInScreen.tsx:171` · `HamburgerDrawer.tsx:335` · `LogoMark.tsx` `accessibilityLabel` on both mark variants, which is the brand as VoiceOver speaks it.

**First run.** `OnboardingModal.tsx` title + aria-label · `OnboardingCards.tsx` title, aria-label, and the closing hint "Closes the introduction and opens Flagstone".

**About and Settings.** `AboutScreen.tsx` aria-label, page heading, and the "built with Expo" paragraph · `ProfileScreen.tsx` About row label, title, subtitle, and the launch-tab hint · `SettingsScreen.tsx` changelog subtitle and About row title.

**Body copy.** `HowToHelpScreen.tsx` ("Share Flagstone with neighbours…", "Flagstone is built by people like you…") · `ResourcesScreen.tsx` ("Flagstone is community-powered…") · `ReportFlagModal.tsx` ("Flagstone doesn't notify the city") · `FeedbackModal.tsx` ("what you wish Flagstone did").

**The feedback hint, five identical copies.** `RootNavigator.tsx:263` · `MapScreen.tsx:1801` · `HomeScreen.tsx:352` · `TasksScreen.tsx:902` · `HeaderActions.tsx:65`. All five now read "Opens a form to email feedback to the Flagstone owner". Verified no sixth copy survives.

**Text that leaves the app.** `shareFlag.ts:66` share footer, now `Open in Flagstone: accessmap://flag/<id>` / `Reported via Flagstone.` — **the `accessmap://` scheme inside it is deliberately unchanged**, so every existing deep link still resolves · `feedback.ts` email subject base (`Flagstone feedback`), body footer (`Sent from Flagstone on <os>`), and the fallback alert title (`Email Flagstone`) · `dataExport.ts:98` export header.

## A3b · Paired tests — updated with the strings, never skipped or deleted
| Test file | Assertions moved |
|---|---|
| `src/lib/__tests__/shareFlag.test.ts` | 12 · footer literals; the 8 `accessmap://` scheme assertions left intact |
| `src/lib/__tests__/feedback.test.ts` | 3 · subject base, subject-with-category, body footer |
| `src/lib/__tests__/dataExport.test.ts` | 2 · export header line |

## A3c · Comments that quoted a changed literal — 11
Listed with their quotes in `01_inventory.md` §1g. Every other comment mentioning AccessMap was left alone: roughly 60 of them, describing the project rather than quoting a live string.

## A4 · Published pages — 22 hits, text only
| File | Hits | Note |
|---|---|---|
| `docs/privacy/index.html` | 6 | **the live policy.** Fetch-verified today as the page behind `skypie99.github.io/AccessMap/privacy/` (title, logo, `Last updated: July 31, 2026`, intro sentence all matched this file and not its sibling) |
| `docs/privacy-policy.html` | 6 | older published duplicate, `Last updated: May 30, 2026`. See BQ-4 |
| `docs/support.html` | 10 | published support page, incl. the `About Flagstone` heading |

Titles, logo divs, body prose, footers, copyright lines. **No `href`, `src`, path, or `mailto:` changed** — the one diff line matching `mailto` is a paragraph that merely contains a mailto link; the link itself is byte-identical on both sides.

⚠ These three pages now say Flagstone while the in-app policy and terms still say AccessMap. That is BQ-1, and it is the one thing to settle before merging.

## A5 · Project docs, light hand
| File | Edit |
|---|---|
| `README.md` | title → `# Flagstone`, plus one provenance blockquote naming the working title, the one-line name story, and the four identifiers that deliberately keep the old name |
| `CLAUDE.md` | title + one paragraph so every future agent knows the rename, which identifiers must never be "fixed", and that `design-reviews/` `qa-reports/` `security-audit/` say AccessMap on purpose |
| `PROJECT_STATE.md` | header → Flagstone + one line noting the body predates the rename. Its own banner says the snapshot is frozen, so the body was left frozen |
| `docs/APP_STORE_LISTING.md` | one SUPERSEDED pointer at the top to the new store sheet. Body left as the v0.2.0 record. This file is what a future agent would otherwise paste the *old* name into App Store Connect from |

Deliberately not swept: `ARCHITECTURE.md`, `DESIGN.md`, `GLASS.md`, `FEATURES.md`, `GOVERNANCE.md`, `docs/CONTRIBUTING.md`, the runbooks, the `specs/ready/` set, and the rest of `docs/`. Engineering archaeology, not product branding; full list in `01_inventory.md` §4.

---

## A6 · THE GATES — all three green, outputs verbatim

### 1 · `npm run typecheck`
```
> accessmap@0.2.0 typecheck
> tsc --noEmit
```
Clean. No diagnostics, no output after the banner.

### 2 · `npx jest --ci -w 3`
```
Test Suites: 204 passed, 204 total
Tests:       32 todo, 2971 passed, 3003 total
Snapshots:   0 total
Time:        38.848 s
Ran all test suites.
```
204 of 204 suites pass. 2,971 passing, 0 failing. Matches the cold-clone baseline of 2,971 exactly, so the rename cost nothing and skipped nothing.

### 3 · `npm run lint`
```
✖ 74 problems (0 errors, 74 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```
**0 errors**, which is the repo's documented standard (`CLAUDE.md`: "npm run lint runs cleanly (0 errors)").

On the 74 warnings: they are pre-existing and cannot be from this diff. Every one is `@typescript-eslint/no-explicit-any`, `no-console`, or `react-hooks/exhaustive-deps`. This branch changed string literals, comment text, JSON values, Markdown, and HTML text nodes only. None of those three rules can be triggered by that class of edit, and none of the warnings sits on a changed line.

## Fences, verified rather than asserted
| Fence | Proof |
|---|---|
| `main` untouched | all work on `rename/flagstone`; `main` never checked out for writing |
| identifiers unchanged | `git diff -- app.json` contains no `slug` / `scheme` / `bundleIdentifier` / `package` / `projectId` / `privacyPolicyUrl` line |
| history immutable | `git status --porcelain` for `design-reviews/` (minus this run's new folder), `qa-reports/`, and `security-audit/` returns nothing modified |
| live database untouched | no migration written or applied, no Supabase tool called; auth email templates are numbered manual steps in `CLOSE-OUT.md` |
| no external side effect | no submission, no purchase, no send; the one network call this run made was a read-only `WebFetch` of the already-public privacy page |
| no credentials | none read, printed, or committed |
